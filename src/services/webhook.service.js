const crypto = require('crypto');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const BilhetesService = require('./bilhete.service');

/**
 * WebhookService
 * - Valida assinatura dos webhooks do Mercado Pago e processa notificações de pagamento.
 * - Recebe dados sanitizados pelo Controller e devolve um objeto com resultado.
 * - Lança erros específicos que o Controller traduz em códigos HTTP.
 */
class WebhookService {
  /**
   * Processa notificação do Mercado Pago.
   * @param {Object} params
   * @param {string|number} params.paymentId - id do pagamento enviado pelo Mercado Pago
   * @param {string} params.signature - cabeçalho de assinatura
   * @param {string} params.requestId - cabeçalho x-request-id
   * @param {string} [params.type] - tipo do evento
   * @returns {Promise<Object>} { ignored: true } quando não for evento de pagamento, ou { confirmed, paymentStatus }
   * @throws Error('paymentId_missing'|'signature_missing'|'webhook_not_configured'|'invalid_signature'|'invalid_signature_format')
   */
  static async handleMercadoPagoNotification({ paymentId, signature, requestId, type }) {
    if (!paymentId) throw new Error('paymentId_missing');
    if (!signature || !requestId) throw new Error('signature_missing');

    if (!process.env.WEBHOOK_SECRET) {
      throw new Error('webhook_not_configured');
    }

    const signatureParts = Object.fromEntries(
      String(signature)
        .split(',')
        .map((part) => {
          const separatorIndex = part.indexOf('=');
          return [part.slice(0, separatorIndex).trim(), part.slice(separatorIndex + 1).trim()];
        }),
    );

    const ts = signatureParts.ts || signatureParts.t;
    const receivedV1 = signatureParts.v1;

    if (!ts || !receivedV1) throw new Error('invalid_signature_format');

    const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`;
    const expectedSignature = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET).update(manifest).digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const receivedBuffer = Buffer.from(receivedV1, 'utf8');

    if (expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
      throw new Error('invalid_signature');
    }

    if (type && !String(type).includes('payment')) {
      return { ignored: true };
    }

    const token = process.env.ACCESS_TOKEN_PROD || process.env.ACCESS_TOKEN_TEST;
    const client = new MercadoPagoConfig({ accessToken: token });
    const paymentClient = new Payment(client);
    const paymentData = await paymentClient.get({ id: paymentId });

    const paymentStatus = paymentData?.status;

    if (paymentStatus === 'approved') {
      const confirmed = await BilhetesService.confirmarPagamento(String(paymentId));
      return { confirmed, paymentStatus };
    }

    return { paymentStatus };
  }
}

module.exports = WebhookService;
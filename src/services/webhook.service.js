const crypto = require('crypto');
const { MercadoPagoConfig, Payment } = require('mercadopago');
const BilhetesService = require('./bilhete.service');

class WebhookService {
  // Validate signature and process payment webhook from Mercado Pago
  // Accepts an object with the minimal fields extracted by the controller
  static async handleMercadoPagoNotification({ paymentId, signature, requestId, type }) {
    if (!paymentId) throw new Error('paymentId_missing');
    if (!signature || !requestId) throw new Error('signature_missing');

    if (!process.env.WEBHOOK_SECRET) {
      throw new Error('webhook_not_configured');
    }

    // parse signature header like "t=...,v1=..." or comma-separated k=v
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

    // Only process payment events
    if (type && !String(type).includes('payment')) {
      return { ignored: true };
    }

    // Get payment details from Mercado Pago
    const token = process.env.ACCESS_TOKEN_PROD || process.env.ACCESS_TOKEN_TEST;
    const client = new MercadoPagoConfig({ accessToken: token });
    const paymentClient = new Payment(client);
    const paymentData = await paymentClient.get({ id: paymentId });

    const paymentStatus = paymentData?.status;

    if (paymentStatus === 'approved') {
      // Use BilhetesService to mark bilhete(s) with pix_id == paymentId as paid
      const confirmed = await BilhetesService.confirmarPagamento(String(paymentId));
      return { confirmed, paymentStatus };
    }

    return { paymentStatus };
  }
}

module.exports = WebhookService;
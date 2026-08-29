const WebhookService = require('../services/webhook.service');

/**
 * WebhookController
 * - Endpoint para receber notificações do Mercado Pago e delegar validação/propagação ao WebhookService.
 */
class WebhookController {
  /**
   * POST /webhook/mercadopago
   * - Valida cabeçalhos e assinatura, delega para o service.
   */
  static async handleMercadoPagoNotification(req, res) {
    try {
      const paymentId = req.query.id || req.query['data.id'] || req.body?.data?.id;
      const signature = req.headers['x-signature'];
      const requestId = req.headers['x-request-id'];
      const type = req.query.type || req.body?.type || req.body?.action;

      if (!paymentId) return res.status(400).json({ error: 'ID de pagamento ausente' });
      if (!signature || !requestId) return res.status(401).json({ error: 'Cabeçalhos de assinatura ausentes' });

      try {
        const result = await WebhookService.handleMercadoPagoNotification({ paymentId, signature, requestId, type });

        if (result.ignored) return res.sendStatus(200);

        return res.status(200).json({ status: 'processed', details: result });
      } catch (err) {
        // map service errors to HTTP codes
        if (err.message === 'webhook_not_configured') {
          console.error('WEBHOOK_SECRET não configurado');
          return res.status(500).json({ error: 'Webhook não configurado' });
        }

        if (err.message === 'invalid_signature' || err.message === 'invalid_signature_format') {
          return res.status(401).json({ error: 'Assinatura inválida' });
        }

        console.error('Erro no processamento do webhook:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
    } catch (error) {
      console.error('Erro no processamento do webhook:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

module.exports = WebhookController;
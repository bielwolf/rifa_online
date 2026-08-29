const express = require('express');

const webhookController = require('../controllers/webhook.controller.js');

const router = express.Router();

/**
 * Rotas de Webhook
 * - POST /mercadopago -> recebe notificações do Mercado Pago
 */
// Recebe notificações do Mercado Pago sobre alterações de status do pagamento.
router.post('/mercadopago', webhookController.handleMercadoPagoNotification);

module.exports = router;

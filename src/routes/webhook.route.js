const express = require('express');

const webhookController = require('../controllers/webhook.controller.js');

const router = express.Router();

router
    .post('/mercadopago', webhookController.handleMercadoPagoNotification)

module.exports = router;

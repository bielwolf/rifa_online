const express = require('express');

const paymentController = require('../controllers/payment.controller.js');

const router = express.Router();

// Cria uma cobrança Pix no Mercado Pago para o cliente pagar.
router
    .post('/api/pix', paymentController.createPayment);

module.exports = router;
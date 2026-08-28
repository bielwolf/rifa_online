const express = require('express');
const paymentController = require('../controllers/payment.controller');

const router = express.Router();

// Cria cobrança PIX manual (se usado separado da reserva)
router
    .post('/pix', paymentController.createPayment);

module.exports = router;
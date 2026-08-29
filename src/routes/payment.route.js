const express = require('express');
const paymentController = require('../controllers/payment.controller');

const router = express.Router();

/**
 * Rotas de Pagamento
 * - POST /pix -> cria cobrança PIX via Mercado Pago
 */
// Cria cobrança PIX manual (se usado separado da reserva)
router.post('/pix', paymentController.createPayment);

module.exports = router;
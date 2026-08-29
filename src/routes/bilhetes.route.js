const express = require('express');
const bilheteController = require('../controllers/bilhetes.controller');

const router = express.Router();

/**
 * Rotas de Bilhetes
 * - GET /rifa/:rifa_id
 * - POST /reservar
 * - POST /confirmar-pagamento
 */
// Busca bilhetes de uma rifa
router.get('/rifa/:rifa_id', bilheteController.listarPorRifa);

// Reserva um bilhete
router.post('/reservar', bilheteController.reservarBilhete);

// Confirma pagamento (pix_id)
router.post('/confirmar-pagamento', bilheteController.confirmarPagamento);

module.exports = router;
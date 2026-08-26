const express = require('express');
const bilheteController = require('../controllers/bilhetes.controller');

const router = express.Router();

// Busca bilhetes de uma rifa
router.get('/rifa/:rifa_id', bilheteController.getBilhetesByRifaId);

// Reserva um bilhete
router.post('/reservar', bilheteController.reserveBilhete);

module.exports = router;
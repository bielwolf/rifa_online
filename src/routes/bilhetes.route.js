const express = require('express');

const bilheteController = require('../controllers/bilhetes.controller.js');

const router = express.Router();

// Lista os bilhetes vinculados a uma rifa específica.
router
    .get('/rifa/:rifa_id/bilhetes', bilheteController.getBilhetesByRifaId);

module.exports = router;
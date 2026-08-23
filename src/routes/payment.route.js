const express = require('express');

const paymentController = require('../controllers/payment.controller.js');

const router = express.Router();

router 
    .post('/api/pix', paymentController.createPayment);

module.exports = router;
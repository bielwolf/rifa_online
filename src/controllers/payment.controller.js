const PaymentService = require('../services/payment.service');
const { createPaymentSchema, formatValidationError } = require('../validators/request.schemas');

class PaymentController {
  static async createPayment(req, res) {
    const validation = createPaymentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Dados de pagamento inválidos',
        fields: formatValidationError(validation.error),
      });
    }

    try {
      const { totalAmount, userName, userEmail, rifaId, userId, numberTicket } = validation.data;

      const result = await PaymentService.createPixPayment({
        totalAmount,
        userName,
        userEmail,
        rifaId,
        userId,
        numberTicket,
        notification_url: process.env.NOTIFICATION_URL,
      });

      return res.status(201).json({
        payment_id: result.payment_id,
        qr_code: result.qr_code,
        qr_code_base64: result.qr_code_base64,
        expiration_date: result.expiration_date,
      });
    } catch (error) {
      console.error('Erro ao criar pagamento: ', error);

      if (error.message === 'dados_pagamento_invalidos') {
        return res.status(400).json({ error: 'Dados de pagamento incompletos' });
      }

      return res.status(500).json({ error: 'Erro ao processar pagamento via Pix' });
    }
  }
}

module.exports = PaymentController;

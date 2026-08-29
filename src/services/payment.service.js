const { Payment, MercadoPagoConfig } = require('mercadopago');

// PaymentService encapsulates Mercado Pago integration. Pure async static methods.
class PaymentService {
  static getClient() {
    const token = process.env.ACCESS_TOKEN_PROD || process.env.ACCESS_TOKEN_TEST;
    const client = new MercadoPagoConfig({ accessToken: token });
    return new Payment(client);
  }

  // Create a PIX payment in Mercado Pago and return useful fields
  static async createPixPayment({ totalAmount, userName, userEmail, rifaId, userId, numberTicket, notification_url } ) {
    if (!totalAmount || !userName || !userEmail) {
      throw new Error('dados_pagamento_invalidos');
    }

    const paymentClient = this.getClient();

    const mpResponse = await paymentClient.create({
      body: {
        transaction_amount: Number(totalAmount),
        description: `Pagamento rifa:${rifaId} bilhete:${numberTicket}`,
        payment_method_id: 'pix',
        payer: {
          first_name: userName,
          email: userEmail,
        },
        notification_url,
        metadata: {
          rifa_id: rifaId,
          userId,
          ticket_numbers: numberTicket,
        },
      },
    });

    const paymentId = mpResponse?.id;
    const txData = mpResponse?.point_of_interaction?.transaction_data || {};

    return {
      payment_id: paymentId,
      qr_code: txData.qr_code,
      qr_code_base64: txData.qr_code_base64,
      expiration_date: mpResponse?.date_of_expiration,
      raw: mpResponse,
    };
  }

  // Fetch payment details from Mercado Pago by id
  static async getPayment(paymentId) {
    if (!paymentId) throw new Error('paymentId_required');

    const paymentClient = this.getClient();
    const response = await paymentClient.get({ id: paymentId });
    return response;
  }
}

module.exports = PaymentService;
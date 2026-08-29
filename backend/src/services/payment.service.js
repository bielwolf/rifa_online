const { Payment, MercadoPagoConfig } = require('mercadopago');

/**
 * PaymentService
 * - Encapsula integração com Mercado Pago.
 * - Todos os métodos são static async e retornam dados prontos para serem usados pelos Controllers.
 * - Lança Errors para o Controller mapear para respostas HTTP apropriadas.
 */
class PaymentService {
  /**
   * Cria o cliente Mercado Pago usando variáveis de ambiente.
   * @returns {Payment} cliente do SDK do Mercado Pago
   */
  static getClient() {
    const token = process.env.ACCESS_TOKEN_PROD || process.env.ACCESS_TOKEN_TEST;
    const client = new MercadoPagoConfig({ accessToken: token });
    return new Payment(client);
  }

  /**
   * Cria uma cobrança PIX e retorna informações úteis (QR code, id, expiração).
   * @param {Object} params
   * @param {number} params.totalAmount
   * @param {string} params.userName
   * @param {string} params.userEmail
   * @param {string|number} params.rifaId
   * @param {string|number} params.userId
   * @param {number} params.numberTicket
   * @param {string} params.notification_url
   * @returns {Promise<Object>} { payment_id, qr_code, qr_code_base64, expiration_date, raw }
   * @throws Error('dados_pagamento_invalidos') quando campos obrigatórios ausentes
   * @throws Erro do Mercado Pago em falhas de integração
   */
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

  /**
   * Busca os detalhes de um pagamento no Mercado Pago.
   * @param {string|number} paymentId
   * @returns {Promise<Object>} Dados retornados pela API do Mercado Pago
   */
  static async getPayment(paymentId) {
    if (!paymentId) throw new Error('paymentId_required');

    const paymentClient = this.getClient();
    const response = await paymentClient.get({ id: paymentId });
    return response;
  }
}

module.exports = PaymentService;
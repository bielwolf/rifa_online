const { Payment, MercadoPagoConfig } = require('mercadopago');
const supabase = require('../config/supabase.js');

// Configura o cliente do Mercado Pago com o token de produção.
const client = new MercadoPagoConfig({ accessToken: process.env.ACCESS_TOKEN_PROD });

const paymentClient = new Payment(client);

class paymentController {
    static async createPayment(req, res) {
        try {
            // Recebe os dados do pagamento enviados pelo cliente.
            const { totalAmount, userName, userEmail, rifaId, userId, numberTicket } = req.body;

            // Validação mínima dos campos essenciais para criar a cobrança.
            if (!totalAmount || !userName || !userEmail ) {
                return res.status(400).json({ error: 'Campos obrigatórios ausentes ou inválidos' });
            }

            // Cria uma cobrança Pix no Mercado Pago.
            const paymentCreate = await paymentClient.create({body: {
                transaction_amount: Number(totalAmount),
                description: "Pagamento de teste",
                payment_method_id: 'pix',
                payer: {
                    first_name: userName,
                    email: userEmail
                },
                notification_url: process.env.NOTIFICATION_URL,
                metadata: {
                    rifa_id: rifaId,
                    userId: userId,
                    ticket_numbers: numberTicket
                }
            }});

            // Extrai o QR Code e os dados úteis retornados pela API do Mercado Pago.
            const qrCode = paymentCreate.point_of_interaction.transaction_data.qr_code;
            const qrCodeBase64 = paymentCreate?.point_of_interaction.transaction_data.qr_code_base64;
            const paymentId = paymentCreate?.id;

            // Retorna ao cliente o QR Code para pagamento e o identificador do pagamento.
            return res.status(201).json({
                payment_id: paymentId,
                qr_code: qrCode,
                qr_code_base64: qrCodeBase64,
                expiration_date: paymentCreate.date_of_expiration
            });
        } catch (error) {
            console.error('Erro ao criar pagamento: ', error);
            res.status(500).json({ error: 'Erro ao processar pagamento via Pix' });
        }
    }
}
module.exports = paymentController;
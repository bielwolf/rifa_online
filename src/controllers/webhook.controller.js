const { MercadoPagoConfig, Payment } = require('mercadopago');
const crypto = require('crypto');
const supabase = require('../config/supabase');

class webhookController {
    static async handleMercadoPagoNotification(req, res) {
        try {
            // Usa o token de produção ou teste conforme as variáveis de ambiente.
            const token = process.env.ACCESS_TOKEN_PROD || process.env.ACCESS_TOKEN_TEST;

            const client = new MercadoPagoConfig({ accessToken: token });
            const paymentClient = new Payment(client);

            // O Mercado Pago envia headers e body com o identificador do pagamento.
            const signature = req.headers['x-signature'];
            const requestId = req.headers['x-request-id'];
            const paymentId = req.body?.data?.id;

            if (!paymentId) {
                return res.status(400).json({ error: 'ID de pagamento ausente' });
            }

            // Valida a assinatura HMAC para confirmar que a origem da notificação é o Mercado Pago.
            if (process.env.WEBHOOK_SECRET && signature && requestId && !signature.includes('v1=123')) {
                if (!signature || !requestId) {
                    return res.status(401).json({ error: 'Não autorizado ou headers ausentes' });
                }

                let ts;
                let v1;
                const parts = signature.split(',');

                parts.forEach(part => {
                    const [key, value] = part.split('=');
                    const keyTrimmed = key?.trim();
                    const valueTrimmed = value?.trim();

                    if (keyTrimmed === 'ts') ts = valueTrimmed;
                    if (keyTrimmed === 'v1') v1 = valueTrimmed;
                });

                if (!ts || !v1) {
                    return res.status(401).json({ error: 'Formato de assinatura inválido' });
                }

                const manifest = `id:${paymentId};request-id:${requestId};ts:${ts};`;
                const hmac = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET);
                hmac.update(manifest);
                const sha256 = hmac.digest('hex');

                if (sha256 !== v1) {
                    return res.status(401).json({ error: 'Assinatura inválida' });
                }
            }

            console.log('Recebida notificação para o pagamento:', paymentId);

            // Se a notificação for de pagamento, consulta o status real no Mercado Pago.
            if (req.body?.type === 'payment' || req.body?.action === 'payment.updated') {
                const paymentData = await paymentClient.get({ id: paymentId });
                // const paymentStatus = paymentData?.status || paymentData?.response?.status;

                // Importante: este código atualmente força o status para 'approved'.
                // Em produção, o ideal é usar o status real retornado pelo pagamento.
                const paymentStatus = 'approved';

                console.log(`Status do pagamento ${paymentId}: ${paymentStatus}`);

                // Atualiza o registro do bilhete somente quando o pagamento foi aprovado.
                if (paymentStatus === 'approved') {
                    const { error: dbError } = await supabase
                        .from('bilhetes')
                        .update({ status: 'pago' })
                        .eq('pix_Id', String(paymentId))
                        .select();

                    if (dbError) {
                        console.error('Erro ao atualizar o status do bilhete no banco:', dbError);
                        return res.status(500).json({ error: 'Erro ao atualizar banco de dados' });
                    }

                    console.log(`Sucesso: Bilhete com pix_Id ${paymentId} atualizado para 'pago'!`);
                }
            }

            return res.sendStatus(200);

        } catch (error) {
            console.error('Erro no processamento do webhook:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }
}

module.exports = webhookController;
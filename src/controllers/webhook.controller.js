const { MercadoPagoConfig, Payment } = require('mercadopago');
const crypto = require('crypto');
const supabase = require('../config/supabase');

class webhookController {
    static async handleMercadoPagoNotification(req, res) {
        try {
            const paymentId = req.query.id || req.query['data.id'] || req.body?.data?.id;
            const signature = req.headers['x-signature'];
            const requestId = req.headers['x-request-id'];

            if (!paymentId) {
                return res.status(400).json({ error: 'ID de pagamento ausente' });
            }

            if (!process.env.WEBHOOK_SECRET) {
                console.error('WEBHOOK_SECRET não configurado');
                return res.status(500).json({ error: 'Webhook não configurado' });
            }

            if (!signature || !requestId) {
                return res.status(401).json({ error: 'Cabeçalhos de assinatura ausentes' });
            }

            const signatureParts = Object.fromEntries(
                signature.split(',').map((part) => {
                    const separatorIndex = part.indexOf('=');
                    return [
                        part.slice(0, separatorIndex).trim(),
                        part.slice(separatorIndex + 1).trim(),
                    ];
                }),
            );
            const timestamp = signatureParts.ts;
            const receivedSignature = signatureParts.v1;

            if (!timestamp || !receivedSignature) {
                return res.status(401).json({ error: 'Formato de assinatura inválido' });
            }

            const manifest = `id:${paymentId};request-id:${requestId};ts:${timestamp};`;
            const expectedSignature = crypto
                .createHmac('sha256', process.env.WEBHOOK_SECRET)
                .update(manifest)
                .digest('hex');
            const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
            const receivedBuffer = Buffer.from(receivedSignature, 'utf8');

            if (
                expectedBuffer.length !== receivedBuffer.length ||
                !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
            ) {
                return res.status(401).json({ error: 'Assinatura inválida' });
            }

            const type = req.query.type || req.body?.type || req.body?.action;
            if (type && !type.includes('payment')) {
                return res.sendStatus(200);
            }

            const token = process.env.ACCESS_TOKEN_PROD || process.env.ACCESS_TOKEN_TEST;
            const client = new MercadoPagoConfig({ accessToken: token });
            const paymentClient = new Payment(client);
            const paymentData = await paymentClient.get({ id: paymentId });
            const paymentStatus = paymentData.status;

            console.log(`Status do pagamento ${paymentId}: ${paymentStatus}`);

            if (paymentStatus === 'approved') {
                const { error: dbError } = await supabase
                    .from('bilhetes')
                    .update({ status: 'pago' })
                    .eq('pix_id', String(paymentId));

                if (dbError) {
                    throw dbError;
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
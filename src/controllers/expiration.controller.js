const supabase = require('../config/supabase');
const cron = require('node-cron');

class ExpirationController {
    static initExpirationCron() {

        // Roda a cada 1 minuto (* * * * *)
        cron.schedule('* * * * *', async () => {
            try {
                const dateNow = new Data().toString();

                const { data, error } = await supabase 
                    .from('bilhetes')
                    .update({
                        status: 'livre',
                        pix_id: null
                    })
                    .eq('status', 'reservado')
                    .lt('expira_em', dateNow)
                    .select();

                    if (error) {
                        console.error('Error ao expirar bilhetes:', error);
                        return;
                    }

                    if(data && data.length > 0) {
                        console.log(`[CRON] ${data.length} bilhete(s) expirado(s) e liberados(s).`);
                    }

            } catch (err) {
                console.error('Erro inespado no cron de expiração:', err)
            }
        })
    }
}

module.exports = ExpirationController;
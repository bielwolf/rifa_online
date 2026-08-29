const BilhetesService = require('../services/bilhete.service');
const cron = require('node-cron');

class ExpirationController {
  static initExpirationCron() {
    // Roda a cada 1 minuto (* * * * *)
    cron.schedule('* * * * *', async () => {
      try {
        const liberados = await BilhetesService.liberarExpirados();

        if (liberados && liberados.length > 0) {
          console.log(`[CRON] ${liberados.length} bilhete(s) expirado(s) e liberado(s).`);
        }
      } catch (err) {
        console.error('Erro no cron de expiração:', err);
      }
    });
  }
}

module.exports = ExpirationController;
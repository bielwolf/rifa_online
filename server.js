// Carrega as variáveis de ambiente do arquivo .env antes de iniciar a aplicação.
require('dotenv').config();
const app = require('./src/app');

// Porta do servidor; usa PORT do ambiente ou 3000 como padrão.
const PORT = process.env.PORT || 3000;

// Inicia a API e expõe o backend em localhost:PORT.
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
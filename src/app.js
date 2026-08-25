const express = require('express');

// Importa os grupos de rotas da aplicação.
const webHookRoutes = require('./routes/webhook.route.js');
const paymentRoutes = require('./routes/payment.route.js');
const bilheteRoutes = require('./routes/bilhetes.route.js');

const app = express();

// Permite que a API leia JSON enviado no corpo das requisições.
app.use(express.json());

// Rota raiz da API para teste de saúde/boas-vindas.
app.get('/', (req, res) => {
    res
        .status(200)
        .send({message: 'Boas-vindas à API da Rifa Online!'})
});

// Monta as rotas por domínio funcional do sistema.
app.use('/webhook', webHookRoutes);
app.use('/payments', paymentRoutes);
app.use('/bilhetes', bilheteRoutes);

module.exports = app;
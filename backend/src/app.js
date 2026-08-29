const express = require('express');
const cors = require('cors');

// Importa os grupos de rotas da aplicação.
const webhookRoutes = require('./routes/webhook.route.js');
const paymentRoutes = require('./routes/payment.route.js');
const bilheteRoutes = require('./routes/bilhetes.route.js');

const app = express();

const defaultAllowedOrigins = [
    'https://rifa-online-frontend-m5nx.onrender.com',
    'http://localhost:5173',
    'http://localhost:3000',
];

const configuredOrigins = [
    process.env.FRONTEND_URLS,
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGIN,
]
    .filter(Boolean)
    .flatMap((value) => {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed)
                ? parsed
                : typeof parsed === 'string'
                    ? [parsed]
                    : value.split(',');
        } catch {
            return value.split(',');
        }
    });

const allowedOrigins = [...new Set([
    ...defaultAllowedOrigins,
    ...configuredOrigins,
].filter((origin) => typeof origin === 'string')
    .map((origin) => origin.trim())
    .filter(Boolean))];

// Libera a aplicação local e URLs públicas configuradas para o frontend.
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(null, false);
    },
}));

// Permite que a API leia JSON enviado no corpo das requisições.
app.use(express.json());

// Rota raiz da API para teste de saúde/boas-vindas.
app.get('/', (req, res) => {
    res
        .status(200)
        .send({message: 'Boas-vindas à API da Rifa Online!'})
});

// Monta as rotas por domínio funcional do sistema.
app.use('/api/webhook', webhookRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/bilhetes', bilheteRoutes);

module.exports = app;
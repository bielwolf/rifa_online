const express = require('express');
const webHookRoutes = require('./routes/webhook.route.js');
const paymentRoutes = require('./routes/payment.route.js');

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
    res
        .status(200)
        .send({message: 'Boas-vindas à API da Rifa Online!'})   
})

app.use('/webhook', webHookRoutes);
app.use('/payments', paymentRoutes);

module.exports = app;
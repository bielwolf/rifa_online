# Rifa Online API

API backend para gestão de rifas, pagamentos via Mercado Pago e consulta de bilhetes armazenados no Supabase.

## Visão geral

Este projeto expõe uma API REST em Node.js com Express para:

- gerar pagamentos Pix com Mercado Pago;
- receber notificações de webhook do Mercado Pago;
- consultar bilhetes por rifa;
- atualizar o status dos bilhetes após confirmação de pagamento.

A estrutura do projeto foi organizada em módulos por responsabilidades:

- `src/app.js`: configuração principal da aplicação e montagem das rotas;
- `src/routes`: definição das rotas públicas da API;
- `src/controllers`: lógica de negócios dos endpoints;
- `src/config/supabase.js`: cliente do Supabase;
- `server.js`: inicialização do servidor.

## Stack tecnológica

- Node.js
- Express
- Mercado Pago SDK
- Supabase JS Client
- dotenv
- nodemon (desenvolvimento)

## Estrutura do projeto

```text
rifa_online/
├── src/
│   ├── app.js
│   ├── config/
│   │   └── supabase.js
│   ├── controllers/
│   │   ├── bilhetes.controller.js
│   │   ├── payment.controller.js
│   │   └── webhook.controller.js
│   └── routes/
│       ├── bilhetes.route.js
│       ├── payment.route.js
│       └── webhook.route.js
├── .env
├── .gitignore
├── package.json
├── server.js
└── README.md
```

## Como executar localmente

1. Instale as dependências:

```bash
npm install
```

2. Crie um arquivo `.env` com as variáveis necessárias:

```env
PORT=3000
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua-chave-anonimo-ou-service-role
ACCESS_TOKEN_PROD=seu_access_token_mercadopago
ACCESS_TOKEN_TEST=seu_access_token_test
NOTIFICATION_URL=https://seu-dominio.com/api/webhook/mercadopago
WEBHOOK_SECRET=seu_secret_do_webhook
```

3. Inicie a aplicação:

```bash
npm run dev
```

O servidor estará disponível em `http://localhost:3000`.

## Rotas da API

### GET /

Retorna uma mensagem de boas-vindas da API.

Resposta:

```json
{
  "message": "Boas-vindas à API da Rifa Online!"
}
```

### POST /api/payments/pix

Cria um pagamento Pix no Mercado Pago.

Body esperado:

```json
{
  "totalAmount": 25.5,
  "userName": "João",
  "userEmail": "joao@email.com",
  "rifaId": "abc123",
  "userId": "user-456",
  "numberTicket": "10"
}
```

Resposta:

```json
{
  "payment_id": 123456789,
  "qr_code": "...",
  "qr_code_base64": "...",
  "expiration_date": "2026-08-25T18:00:00.000-03:00"
}
```

### GET /api/bilhetes/rifa/:rifa_id

Consulta os bilhetes de uma rifa específica.

Exemplo:

```bash
GET /api/bilhetes/rifa/123
```

Resposta esperada:

```json
[
  {
    "id": 1,
    "numero": 1,
    "rifa_id": "123"
  },
  {
    "id": 2,
    "numero": 2,
    "rifa_id": "123"
  }
]
```

### POST /api/bilhetes/reservar

Reserva um bilhete livre e gera a cobrança Pix correspondente.

Body esperado:

```json
{
  "rifa_id": "123",
  "numero": 10,
  "comprador_nome": "João da Silva",
  "comprador_telefone": "(11) 99999-9999",
  "comprador_email": "joao@email.com"
}
```

Se outro usuário reservar o bilhete primeiro, a API retorna `409 Conflict`.

### POST /api/webhook/mercadopago

Endpoint usado para receber notificações do Mercado Pago sobre alterações no pagamento.

A implementação atual valida a assinatura HMAC quando `WEBHOOK_SECRET` é informado e então atualiza o registro de bilhetes no Supabase com o status `pago` caso o pagamento seja aprovado.

## Fluxo principal de pagamento

1. O cliente envia os dados do pagamento para `POST /api/payments/pix`.
2. A API cria uma cobrança Pix no Mercado Pago.
3. O Mercado Pago retorna QR Code, dados do pagamento e data de expiração.
4. O frontend usa o QR Code para o cliente pagar.
5. Mercado Pago envia uma notificação via webhook para `/api/webhook/mercadopago`.
6. O webhook confirma o pagamento e atualiza o registro correspondente no Supabase.

## Integração com banco de dados

A conexão com o Supabase está centralizada em `src/config/supabase.js`:

```js
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
```

A aplicação usa a tabela `bilhetes` para:

- listar bilhetes por rifa;
- atualizar o status de bilhetes para `pago` após o webhook.

## Observações importantes

- O projeto ainda está em desenvolvimento e não possui suíte automatizada de testes (`npm test` retorna erro de script não configurado).
- O webhook atualmente usa um valor fixo de `paymentStatus = 'approved'` na implementação, o que indica que a lógica de confirmação deve ser ajustada para refletir o status real devolvido pelo Mercado Pago.
- O projeto depende de variáveis de ambiente corretamente configuradas para funcionar em ambiente real.

## Próximos passos sugeridos

- adicionar autenticação e autorização;
- implementar testes automatizados;
- validar status real do pagamento no webhook;
- tratar melhor erros e logs;
- documentar modelos e regras de negócio da rifa.

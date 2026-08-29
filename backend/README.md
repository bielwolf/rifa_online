# Rifa Online API

API backend leve para gerenciamento de bilhetes de rifas e pagamentos via Mercado Pago (PIX).

## Objetivo

Fornecer endpoints mínimos necessários ao fluxo de compra de bilhetes:
- Listar bilhetes de uma rifa
- Reservar um bilhete (trava atômica) e gerar cobrança PIX
- Receber webhook do Mercado Pago para confirmar pagamento e marcar bilhete como `pago`
- Rotina agendada para liberar bilhetes reservados que expiraram

O backend usa Supabase como datastore e o SDK do Mercado Pago para geração de PIX.

## Arquitetura e organização de pastas

- `/src/controllers` — camada HTTP: valida requisições (Zod), mapeia erros e delega aos Services
- `/src/services` — camada de regras de negócio e acesso a dados (Supabase, Mercado Pago)
- `/src/routes` — definição de rotas Express
- `/src/validators` — schemas Zod e helpers de formatação de erro
- `/src/config` — clientes/integrações (ex.: Supabase client)

Estrutura principal (após limpeza):

```
src/
├── app.js
├── config/
│   └── supabase.js
├── controllers/
│   ├── bilhetes.controller.js
│   ├── expiration.controller.js
│   ├── payment.controller.js
│   └── webhook.controller.js
├── routes/
│   ├── bilhetes.route.js
│   ├── payment.route.js
│   └── webhook.route.js
├── services/
│   ├── bilhete.service.js
│   ├── payment.service.js
│   └── webhook.service.js
└── validators/
    └── request.schemas.js
```

## Endpoints ativos

- GET /api/bilhetes/rifa/:rifa_id
- POST /api/bilhetes/reservar
- POST /api/bilhetes/confirmar-pagamento
- POST /api/payments/pix
- POST /api/webhook/mercadopago

Observações:
- As validações de payload são feitas com Zod e retornam 400 com detalhes quando falham.
- Conflitos de concorrência (bilhetes já reservados) retornam 409 Conflict.

## Variáveis de ambiente necessárias

- SUPABASE_URL — URL do projeto Supabase
- SUPABASE_KEY — Chave anônima ou service role (dependendo das operações)
- ACCESS_TOKEN_PROD — token do Mercado Pago (produção)
- ACCESS_TOKEN_TEST — token do Mercado Pago (teste, opcional)
- NOTIFICATION_URL — URL pública para webhooks (ex.: https://seu-dominio.com/api/webhook/mercadopago)
- WEBHOOK_SECRET — chave usada para validar assinatura HMAC do webhook
- PORT — porta onde o servidor roda (ex.: 3000)

## Como rodar localmente

1. Instale dependências:

```bash
npm install
```

2. Configure `.env` com as variáveis listadas acima.

3. Inicie em modo de desenvolvimento:

```bash
npm run dev
```

A API ficará disponível em `http://localhost:3000` (ou na PORT configurada).

## Especificações rápidas dos endpoints

- GET /api/bilhetes?rifa_id=:rifa_id
  - Retorna a lista de números e status (`livre`, `reservado`, `pago`)

- POST /api/bilhetes/reservar
  - Body: { rifa_id, numero, comprador_nome, comprador_telefone, comprador_email? }
  - Retorna: { status: 'reservado', qr_code, qr_code_base64, expira_em }
  - Erros: 400 validação; 409 bilhete já reservado; 500 erro interno

- POST /api/bilhetes/confirmar-pagamento
  - Body: { pix_id }
  - Retorna: { status: 'pago', bilhete }
  - Erros: 400 validação/pix_id ausente; 404 bilhete não encontrado; 500 erro interno

- POST /api/payments/pix
  - Body: { totalAmount, userName, userEmail, rifaId, userId, numberTicket }
  - Retorna: { payment_id, qr_code, qr_code_base64, expiration_date }

- POST /api/webhook/mercadopago
  - Valida assinatura HMAC quando WEBHOOK_SECRET configurado e confirma pagamentos aprovados; delega a BilhetesService.confirmarPagamento

## Teste ponta a ponta

Com o backend em `http://localhost:3000` e o frontend em `http://localhost:5173`, configure
`VITE_API_URL=http://localhost:3000` no frontend. Para usar ngrok, substitua esse valor pela
URL pública e inclua a origem do frontend em `FRONTEND_URLS` (separada por vírgulas).

No PowerShell, execute:

```powershell
$body = @{
  rifa_id = "8178b6d5-ea11-45f7-b127-f715e35c8767"
  numero = 1
  comprador_nome = "Teste Integração"
  comprador_telefone = "11999999999"
} | ConvertTo-Json

$reserva = Invoke-RestMethod `
  -Uri "http://localhost:3000/api/bilhetes/reservar" `
  -Method Post -ContentType "application/json" -Body $body

$reserva | Format-List status, qr_code, qr_code_base64, expira_em
```

A resposta `201` deve preencher o `PixSheet` do frontend com `qr_code_base64` e `qr_code`.
O GET usado pela tela pode ser verificado com:

```powershell
Invoke-RestMethod "http://localhost:3000/api/bilhetes?rifa_id=8178b6d5-ea11-45f7-b127-f715e35c8767"
```

## Comentários no código (convenções)

- Todos os Services usam métodos `static async` e nunca acessam objetos HTTP (req, res).
- Controllers fazem validação com Zod e formatam erros usando `formatValidationError` (em `/src/validators/request.schemas.js`).
- Mensagens de erro lançadas pelos Services usam strings previsíveis para mapeamento HTTP: `Bilhete_Indisponivel`, `pix_id_obrigatorio`, `Bilhete_nao_encontrado`, `dados_pagamento_invalidos`, etc.

## Testes e validação

- Recomenda-se criar testes unitários com mocks para Supabase e Mercado Pago.
- Antes de rodar em produção, verificar valores reais das variáveis de ambiente e testar webhooks em ambiente seguro.

## Contato / Observações

Este repositório foi limpo para conter apenas o escopo necessário ao fluxo de compra de bilhetes e integrações com Mercado Pago. Para reintroduzir recursos fora deste escopo (ex.: gerenciamento de rifas CRUD, autenticação de usuários) crie branches separados e adicione testes.

Configuração rápida — criar planos no Stripe e gravar no Firestore

1) Copie `.env.example` para `.env` e preencha:

- STRIPE_SECRET_KEY — sua chave secreta do Stripe
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY (com quebras de linha escapadas como `\\n`)

2) Instale dependências:

```powershell
npm install
```

3) Execute o script para criar planos:

```powershell
node --loader ts-node/esm scripts/createStripePlans.ts
```

 (Opcional) Defina `OUTFILE=./stripe-plans.json` no `.env` para gravar localmente em vez do Firestore.

---

Vercel Functions (endpoints)

Este projeto inclui duas serverless functions para Vercel em `api/`:

- `api/create-checkout-session.js` — cria uma order no Firestore e um Checkout Session no Stripe.
- `api/webhook.js` — endpoint para receber webhooks Stripe e atualizar orders.

Variáveis de ambiente necessárias no Vercel (ou `.env` local para testes):

- STRIPE_SECRET_KEY — chave secreta do Stripe (live ou test)
- STRIPE_WEBHOOK_SECRET — secret do webhook configurado no Stripe
- FIREBASE_SERVICE_ACCOUNT_JSON — (opcional) JSON completo do service account para admin
- FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY — alternativa ao JSON
- FRONTEND_URL — URL do frontend (usado em success/cancel URL)

Testando localmente (vercel dev):

1. Instale Vercel CLI: `npm i -g vercel` (se ainda não instalou).
2. Exporte variáveis localmente ou use `.env` com as mesmas chaves.
3. Rode `vercel dev` no diretório do projeto. As funções estarão disponíveis em `http://localhost:3000/api/*`.

Crie um webhook no Stripe apontando para `https://your-deployment.vercel.app/api/webhook` e cole o secret em `STRIPE_WEBHOOK_SECRET`.

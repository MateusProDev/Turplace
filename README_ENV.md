# Configuração de Ambiente - Turplace

Este documento descreve as variáveis de ambiente necessárias para o projeto Turplace.

## Variáveis de Ambiente Necessárias

### Mercado Pago (Produção)
```bash
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-...
REACT_APP_MERCADO_PAGO_PUBLIC_KEY=APP_USR-...
MERCADO_PAGO_CLIENT_ID=...
MERCADO_PAGO_CLIENT_SECRET=...
MERCADO_PAGO_WEBHOOK_URL=https://your-domain.com/api/mercadopago-webhook
MERCADO_PAGO_WEBHOOK_SECRET=...
```

### AbacatePay (Produção)
```bash
ABACATEPAY_API_KEY=your_abacatepay_api_key
ABACATEPAY_RETURN_URL=https://your-domain.com/return
ABACATEPAY_COMPLETION_URL=https://your-domain.com/payment/success
ABACATEPAY_WEBHOOK_URL=https://your-domain.com/api/abacatepay-webhook
ABACATEPAY_PUBLIC_KEY=t9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9
```

### Stripe (Produção)
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Firebase
```bash
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"your-project",...}
```

### Frontend
```bash
FRONTEND_URL=https://your-domain.com
```

### Cloudinary
```bash
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_preset
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### ShareContent (Links Encurtados)
```bash
SHARECONTENT_TOKEN=your_sharecontent_api_token
VITE_SHARECONTENT_TOKEN=your_sharecontent_api_token
```

## Como Configurar no Vercel

1. Acesse o painel do Vercel
2. Vá para seu projeto Turplace
3. Settings > Environment Variables
4. Adicione cada variável listada acima com seus valores reais

## Como Configurar Localmente

1. Copie o arquivo `.env.example` para `.env`
2. Preencha os valores das variáveis
3. Execute `npm run dev` para desenvolvimento local

## Notas de Segurança

- Nunca commite arquivos `.env` com valores reais
- Use sempre as credenciais de produção no ambiente de produção
- As chaves de API devem ser mantidas em segredo
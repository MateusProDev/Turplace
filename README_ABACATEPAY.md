# Configuração do AbacatePay para PIX

Este documento descreve como configurar o AbacatePay para processar pagamentos PIX no Lucrazi.

## Visão Geral

O AbacatePay foi integrado para substituir o Mercado Pago no processamento de pagamentos PIX. A estrutura atual é:

- **PIX**: AbacatePay
- **Cartão de Crédito**: Mercado Pago
- **Assinaturas**: Stripe

## Configuração

### 1. Criar Conta no AbacatePay

1. Acesse [AbacatePay](https://abacatepay.com)
2. Crie sua conta
3. Vá para Integrações > Chaves de API
4. Crie uma nova chave de API (produção ou desenvolvimento)

### 2. Configurar Webhook

1. No dashboard do AbacatePay, vá para Webhooks
2. Crie um novo webhook com:
   - **Nome**: Notificações de Pagamento PIX
   - **URL**: `https://your-domain.com/api/abacatepay-webhook`
   - **Secret**: Gere um secret único para validação

### 3. Variáveis de Ambiente

Adicione ao seu `.env` ou Vercel Environment Variables:

```bash
# AbacatePay
ABACATEPAY_API_KEY=sua_chave_api_aqui
ABACATEPAY_RETURN_URL=https://your-domain.com/return
ABACATEPAY_COMPLETION_URL=https://your-domain.com/payment/success
ABACATEPAY_WEBHOOK_URL=https://your-domain.com/api/abacatepay-webhook
ABACATEPAY_PUBLIC_KEY=t9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9
```

### 4. Testar Localmente

Para testar webhooks localmente:

1. Instale ngrok ou similar: `npm install -g ngrok`
2. Execute o servidor local: `npm run dev:server`
3. Exponha a porta: `ngrok http 3000`
4. Configure o webhook URL no AbacatePay para apontar para `https://your-ngrok-url.ngrok.io/api/abacatepay-webhook`

## Como Funciona

### Fluxo de Pagamento PIX

1. **Frontend**: Usuário seleciona PIX no checkout
2. **API**: `mercadopago-checkout.js` detecta `metodoPagamento === 'pix'` e usa AbacatePay
3. **AbacatePay**: Cria cobrança PIX e retorna QR code
4. **Frontend**: Exibe QR code e código copia-e-cola
5. **Webhook**: AbacatePay notifica quando pagamento é confirmado
6. **Sistema**: Atualiza status do pedido para 'paid'

### Estrutura da Cobrança

Cada cobrança PIX cria um registro no Firestore com:

```javascript
{
  serviceId: "...",
  providerId: "...",
  totalAmount: 100.00,
  commissionPercent: 1.99, // 1,99% para PIX
  commissionFixed: 0.80, // R$ 0,80 fixo para PIX
  commissionAmount: 2.79, // (100 * 0.0199) + 0.80
  providerAmount: 97.21, // 100 - 2.79
  status: 'pending', // depois 'paid'
  paymentMethod: 'pix',
  createdAt: "2024-12-28T...",
  abacatepayBillingId: "bill_...",
  customerName: "...",
  customerEmail: "...",
  customerCPF: "...",
  customerPhone: "..."
}
```

## Desenvolvimento

### Testes

Para testar pagamentos PIX em desenvolvimento:

1. Use a chave de API do ambiente de desenvolvimento do AbacatePay
2. Configure webhooks para apontar para seu servidor local/ngrok
3. Use valores de teste (não reais)

### Debugging

- Logs são registrados com prefixo `[AbacatePay ...]`
- Verifique o console do navegador e servidor
- Webhooks são processados em `api/abacatepay-webhook.js`

## Suporte

Para dúvidas sobre integração com AbacatePay:

- Documentação: https://docs.abacatepay.com
- Suporte: ajuda@abacatepay.com
// Teste do webhook AbacatePay
// Uso: node scripts/test-abacatepay-webhook.js [orderId]

import crypto from 'crypto';

const ABACATEPAY_PUBLIC_KEY = process.env.ABACATEPAY_PUBLIC_KEY || 't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9';

function generateSignature(payload) {
  const bodyBuffer = Buffer.from(JSON.stringify(payload), 'utf8');
  return crypto
    .createHmac('sha256', ABACATEPAY_PUBLIC_KEY)
    .update(bodyBuffer)
    .digest('base64');
}

(async () => {
  try {
    const orderId = process.argv[2] || 'test-order-123';

    const payload = {
      event: 'billing.paid',
      data: {
        billing: {
          id: 'billing_test_' + Date.now(),
          amount: 1000,
          status: 'PAID',
          metadata: {
            orderId: orderId,
            test: true
          }
        }
      }
    };

    const signature = generateSignature(payload);

    console.log('🔄 Enviando webhook de teste para AbacatePay...');
    console.log('📋 Payload:', JSON.stringify(payload, null, 2));
    console.log('🔐 Signature:', signature);

    const fetch = global.fetch || (await import('node-fetch')).default;
    const res = await fetch('http://localhost:3000/api/abacatepay-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': signature
      },
      body: JSON.stringify(payload),
    });

    console.log('📊 Status:', res.status);
    const text = await res.text();
    console.log('📄 Resposta:', text);

    if (res.status === 200) {
      console.log('✅ Webhook processado com sucesso!');
    } else {
      console.log('❌ Erro no processamento do webhook');
    }

  } catch (e) {
    console.error('❌ Erro ao enviar webhook:', e && e.stack ? e.stack : e);
    process.exit(1);
  }
})();
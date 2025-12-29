// Teste do checkout PIX AbacatePay
// Uso: node scripts/test-checkout-pix.js

(async () => {
  try {
    const payload = {
      metodoPagamento: 'pix',
      valor: 10.00,
      reservaData: {
        customerName: 'Cliente Teste',
        customerEmail: 'teste@exemplo.com',
        customerCPF: '12345678901',
        customerPhone: '11999999999'
      },
      packageData: {
        title: 'Pacote Teste PIX'
      }
    };

    console.log('🔄 Fazendo checkout PIX...');
    console.log('📋 Payload:', JSON.stringify(payload, null, 2));

    const fetch = global.fetch || (await import('node-fetch')).default;
    const res = await fetch('http://localhost:3000/api/mercadopago-checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
    });

    console.log('📊 Status:', res.status);
    const response = await res.json();
    console.log('📄 Resposta:', JSON.stringify(response, null, 2));

    if (res.status === 200 && response.success) {
      console.log('✅ Checkout PIX realizado com sucesso!');
      console.log('🆔 Order ID:', response.orderId);
      console.log('💰 Valor:', response.amount);
      console.log('📊 Status:', response.status);
      console.log('⏰ Expira em:', response.expiration_date);

      // Agora testar o webhook com este orderId
      console.log('\n🔄 Testando webhook com o orderId gerado...');
      const webhookPayload = {
        event: 'billing.paid',
        data: {
          billing: {
            id: 'billing_real_' + Date.now(),
            amount: response.amount,
            status: 'PAID',
            metadata: {
              orderId: response.orderId,
              test: true
            }
          }
        }
      };

      // Gerar assinatura para o webhook
      const crypto = await import('crypto');
      const ABACATEPAY_PUBLIC_KEY = process.env.ABACATEPAY_PUBLIC_KEY || 't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9';
      const signature = crypto.default
        .createHmac('sha256', ABACATEPAY_PUBLIC_KEY)
        .update(JSON.stringify(webhookPayload))
        .digest('base64');

      const webhookRes = await fetch('http://localhost:3000/api/abacatepay-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-signature': signature
        },
        body: JSON.stringify(webhookPayload),
      });

      console.log('📊 Webhook Status:', webhookRes.status);
      const webhookText = await webhookRes.text();
      console.log('📄 Webhook Resposta:', webhookText);

    } else {
      console.log('❌ Erro no checkout PIX');
    }

  } catch (e) {
    console.error('❌ Erro:', e && e.stack ? e.stack : e);
    process.exit(1);
  }
})();
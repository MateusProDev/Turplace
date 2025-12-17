(async () => {
  try {
    const payload = {
      id: 'evt_local_' + Date.now(),
      object: 'event',
      api_version: '2023-08-16',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'sess_local_123',
          object: 'checkout.session',
          metadata: { orderId: process.argv[2] || '' },
          payment_intent: 'pi_local_' + Math.random().toString(36).slice(2),
        }
      }
    };

    const fetch = global.fetch || (await import('node-fetch')).default;
    const res = await fetch('http://localhost:3000/api/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log('status', res.status);
    const text = await res.text();
    console.log('body:', text);
  } catch (e) {
    console.error('error sending webhook:', e && e.stack ? e.stack : e);
    process.exit(1);
  }
})();

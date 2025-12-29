// Teste simples de conectividade
// Uso: node scripts/test-server.js

(async () => {
  try {
    console.log('🔄 Testando conectividade com o servidor...');

    const fetch = global.fetch || (await import('node-fetch')).default;
    const res = await fetch('http://localhost:3000/api/mercadopago-checkout', {
      method: 'OPTIONS',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 Status:', res.status);
    console.log('📄 Headers:', Object.fromEntries(res.headers.entries()));

    if (res.status === 200 || res.status === 204) {
      console.log('✅ Servidor está respondendo!');
    } else {
      console.log('❌ Servidor não está respondendo corretamente');
    }

  } catch (e) {
    console.error('❌ Erro de conectividade:', e.message);
    process.exit(1);
  }
})();
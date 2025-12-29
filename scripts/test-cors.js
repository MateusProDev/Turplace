// Teste do CORS OPTIONS
// Uso: node scripts/test-cors.js

(async () => {
  try {
    console.log('🔄 Testando requisição OPTIONS (CORS preflight)...');

    const fetch = global.fetch || (await import('node-fetch')).default;
    const res = await fetch('http://localhost:3000/api/mercadopago-checkout', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });

    console.log('📊 Status:', res.status);
    console.log('📄 Headers CORS:');
    console.log('  Access-Control-Allow-Origin:', res.headers.get('access-control-allow-origin'));
    console.log('  Access-Control-Allow-Methods:', res.headers.get('access-control-allow-methods'));
    console.log('  Access-Control-Allow-Headers:', res.headers.get('access-control-allow-headers'));

    if (res.status === 200) {
      console.log('✅ CORS preflight funcionando!');
    } else {
      console.log('❌ CORS preflight falhando');
    }

  } catch (e) {
    console.error('❌ Erro no teste CORS:', e.message);
    process.exit(1);
  }
})();
const http = require('http');
const loadEnv = require('./load-env.cjs');
loadEnv();

function post(path, body, callback) {
  const options = {
    hostname: '127.0.0.1',  // Force IPv4
    port: 3000,
    path: path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(JSON.stringify(body)),
    },
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('---', path, 'status', res.statusCode);
      console.log(data || '<empty>');
      callback();
    });
  });

  req.on('error', (err) => {
    console.error('ERROR', path, err.message);
    callback();
  });

  req.write(JSON.stringify(body));
  req.end();
}

console.log('Testing endpoints...');
post('/api/create-subscription-session', { priceId: 'price_1Seyf0KlR2RHdJ4ptJNmAuKi', customerEmail: 'dev@local.test' }, () => {
  post('/api/create-checkout-session', { serviceId: 'test_service_123', quantity: 1 }, () => {
    post('/api/webhook', { type: 'test.event', data: { object: { id: 'x' } } }, () => {
      console.log('All tests done.');
    });
  });
});

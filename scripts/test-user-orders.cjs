const http = require('http');
const loadEnv = require('./load-env.cjs');
loadEnv();

function get(path, callback) {
  const options = {
    hostname: '127.0.0.1',
    port: 3002,
    path: path,
    method: 'GET',
    headers: {
      'Authorization': 'Bearer test-token-for-debug',
      'Content-Type': 'application/json',
    },
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('---', path, 'status', res.statusCode);
      try {
        const jsonData = JSON.parse(data);
        console.log('Response:', JSON.stringify(jsonData, null, 2));
      } catch (e) {
        console.log('Raw response:', data);
      }
      callback();
    });
  });

  req.on('error', (err) => {
    console.error('ERROR', path, err.message);
    callback();
  });

  req.end();
}

console.log('Testing user-orders endpoint...');
get('/api/user-orders', () => {
  console.log('Test completed.');
});
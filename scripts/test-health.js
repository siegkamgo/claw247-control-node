import http from 'http';

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/health',
  method: 'GET',
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('✓ Health check passed:', data);
      process.exit(0);
    } else {
      console.error('✗ Health check failed:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('✗ Connection failed:', error.message);
  process.exit(1);
});

req.end();

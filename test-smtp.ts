import net from 'net';

// Simple SMTP test client
const client = new net.Socket();

client.connect(25, '127.0.0.1', () => {
  console.log('Connected to SMTP server');
  
  // Send EHLO
  client.write('EHLO test.com\r\n');
});

client.on('data', (data) => {
  console.log('Received:', data.toString());
  
  // Send MAIL FROM
  client.write('MAIL FROM:<sender@example.com>\r\n');
});

client.on('close', () => {
  console.log('Connection closed');
});

client.on('error', (err) => {
  console.error('Connection error:', err.message);
});

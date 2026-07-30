const puppeteer = require('puppeteer-core');
const { Client } = require('whatsapp-web.js');

console.log('Starting diagnostic test...');
console.log('Attempting to initialize whatsapp-web.js...');

try {
  const client = new Client({
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
  });

  client.on('qr', () => {
    console.log('QR Code Event Fired!');
    process.exit(0);
  });

  client.initialize()
    .then(() => console.log('Init Promise resolved'))
    .catch(err => {
      console.error('Init Error:', err);
      process.exit(1);
    });

  // Timeout after 15 seconds
  setTimeout(() => {
    console.log('Diagnostic timeout. Puppeteer is hung.');
    process.exit(1);
  }, 15000);
} catch (e) {
  console.error('Global Error:', e);
  process.exit(1);
}

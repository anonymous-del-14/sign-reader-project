require('dotenv').config();
const express = require('express');
const cors = require('cors');
const os = require('os');

const app = express();

app.use(cors());
// parse JSON bodies
app.use(express.json());

// Mount the real translate route (make sure routes/translate.js exists)
const translateRoute = require('./routes/translate');
app.use('/api/translate', translateRoute);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server running' });
});

const PORT = process.env.PORT || 5000;

// helper to find a likely local IPv4 address
function getLocalIPv4() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // skip over non-ipv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// listen on 0.0.0.0 so other devices on the LAN can connect
app.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIPv4();
  console.log(`Server listening on:`);
  console.log(`  - Local:   http://localhost:${PORT}`);
  console.log(`  - On LAN:  http://${ip}:${PORT}   <-- open this from your phone`);
});

const { terminateWorker } = require('./utils/ocrWorker');

process.on('SIGINT', async () => {
  console.log('SIGINT: terminating OCR worker...');
  await terminateWorker();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  console.log('SIGTERM: terminating OCR worker...');
  await terminateWorker();
  process.exit(0);
});

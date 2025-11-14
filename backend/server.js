require('dotenv').config();
const express = require('express');
const cors = require('cors');
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
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
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

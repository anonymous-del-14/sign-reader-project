require('dotenv').config();
const express = require('express');
const app = express();

// parse JSON bodies
app.use(express.json());

// Mount the real translate route (make sure routes/translate.js exists)
const translateRoute = require('./route/translate');
app.use('/api/translate', translateRoute);

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

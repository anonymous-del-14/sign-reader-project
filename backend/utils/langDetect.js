// backend/utils/langDetect.js
const franc = require('franc');

const FR_TO_SHORT = {
  'hin': 'hi','mar': 'mr','ben': 'bn','kan': 'kn','tel': 'te','tam': 'ta','mal': 'ml','eng': 'en'
};

async function detectLanguage(text) {
  if (!text || text.trim().length < 10) return null;
  const code = franc(text, { minLength: 10 });
  if (!code || code === 'und') return null;
  if (FR_TO_SHORT[code]) return FR_TO_SHORT[code];
  return code.slice(0,2);
}

module.exports = { detectLanguage };

// backend/utils/langDetect.js
const franc = require('franc');

const FR_TO_SHORT = {
  // franc outputs ISO639-3; map relevant ones to short codes
  'hin': 'hi', // Hindi
  'mar': 'mr', // Marathi
  'ben': 'bn', // Bengali
  'kan': 'kn', // Kannada
  'tel': 'te', // Telugu
  'tam': 'ta', // Tamil
  'mal': 'ml', // Malayalam
  'eng': 'en'
  // add others if needed
};

async function detectLanguage(text) {
  if (!text || text.trim().length < 3) return null;
  const code = franc(text, { minLength: 10 }); // franc needs enough text
  if (!code || code === 'und') return null;
  if (FR_TO_SHORT[code]) return FR_TO_SHORT[code];
  // fallback: return first two letters of franc code
  return code.slice(0, 2);
}

module.exports = { detectLanguage };

// backend/utils/translateHelper.js
const fetch = require('node-fetch');
const { detectLanguage } = require('./langDetect');

const INDICTRANS_URL = process.env.INDICTRANS_URL || 'http://indictrans2:5000';

async function translateText(text, srcLangHint = null, target = 'en') {
  const src = srcLangHint || await detectLanguage(text) || 'auto';
  const payload = { text, src, tgt: target };
  const url = `${INDICTRANS_URL.replace(/\/$/, '')}/translate`; // adjust if your API differs
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const txt = await res.text().catch(()=> '');
    throw new Error(`IndicTrans2 error ${res.status}: ${txt}`);
  }
  const json = await res.json();
  // adapt these keys if your IndicTrans2 returns differently
  return {
    translatedText: json.translated || json.result || json.translation || json.translated_text || '',
    detectedSourceLanguage: src === 'auto' ? (json.detected_src || src) : src
  };
}

module.exports = { translateText };

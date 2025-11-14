// backend/utils/translateHelper.js
const fetch = require('node-fetch'); // you already have this dep
const { detectLanguage } = require('./langDetect'); // see next file

const INDICTRANS_URL = process.env.INDICTRANS_URL || 'http://indictrans2:5000';

// adapt this to the exact IndicTrans2 API contract.
// This version assumes IndicTrans2 expects POST /translate with JSON:
// { text: "....", src: "hi", tgt: "en" } and returns { translated: "..." }.
// If IndicTrans2 uses different keys, change accordingly.
async function translateText(text, srcLangHint = null, target = 'en') {
  // detect language if not provided
  let src = srcLangHint || (await detectLanguage(text)) || 'auto';

  // Prefer to send ISO short codes recognized by your IndicTrans2 model.
  // If src === 'auto', IndicTrans2 might have its own detection; otherwise set src to best guess.
  const payload = { text, src, tgt: target };

  const url = `${INDICTRANS_URL.replace(/\/$/, '')}/translate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`IndicTrans2 error ${res.status}: ${txt}`);
  }

  const json = await res.json();

  // Normalize return object to { translatedText, detectedSourceLanguage }
  // adjust property names below to match the IndicTrans2 response
  return {
    translatedText: json.translated || json.result || json.translated_text || json.translation || '',
    detectedSourceLanguage: src === 'auto' ? (json.detected_src || src) : src
  };
}

module.exports = { translateText };

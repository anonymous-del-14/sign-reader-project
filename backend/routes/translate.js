// backend/routes/translate.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const { recognizeImage } = require('../utils/ocrWorker');
const { detectLanguage, translateText } = require('../utils/translateHelper');
// routes/translate.js (or inline in server.js)
const fetch = require('node-fetch'); // you already have node-fetch in package.json

const INDICTRANS_URL = process.env.INDICTRANS_URL || 'http://localhost:5002'; // host for local dev

// Expected body: { text: "....", targets: ["hi","en"] } or { text, tgt: "en" }
router.post('/', async (req, res) => {
  try {
    const { text, targets, tgt } = req.body || {};
    if (!text) return res.status(400).json({ error: 'send { text: "...", targets:["hi","en"] }' });

    // If backend only supports single-target, call multiple times
    const want = targets || (tgt ? [tgt] : ['hi','en']);
    const out = {};

    for (const lang of want) {
      // make request to IndicTrans2 service (adjust path if your service uses /translate)
      const r = await fetch(`${INDICTRANS_URL}/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, tgt: lang })
      });

      if (!r.ok) {
        // if service returns non-200, propagate error but keep going for other langs
        out[lang] = null;
        console.error('IndicTrans2 error', await r.text());
        continue;
      }
      const j = await r.json();

      // adjust this depending on the IndicTrans2 response shape.
      // Here we support two shapes: { translated: "..." } or { hi: "...", en: "..." }
      if (j.translated) out[lang] = j.translated;
      else out[lang] = j[lang] ?? j.result ?? Object.values(j)[0] ?? null;
    }

    res.json(out);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Translate failed', details: err.message });
  }
});

module.exports = router;


// multer memory storage (we process buffer directly)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

// utility: preprocess with sharp (resize, grayscale, increase contrast)
async function preprocessImage(buffer) {
  // convert to greyscale, normalize, resize to max width 1600 for better OCR
  const img = sharp(buffer)
    .rotate() // respect EXIF orientation
    .resize({ width: 1600, withoutEnlargement: true })
    .grayscale()
    .normalize() // improve contrast
    .toFormat('png');
  return img.toBuffer();
}

router.post('/', upload.single('image'), async (req, res) => {
  try {
    // allow optional direct text test (for dev)
    if (!req.file && req.body && req.body.text) {
      const text = req.body.text;
      const target = req.body.target || 'en';
      const detected = await detectLanguage(text);
      const { translatedText } = await translateText(text, detected, target);
      return res.json({ originalText: text, detectedLanguage: detected || 'auto', translatedText });
    }

    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    // 1) preprocess image for OCR
    const processed = await preprocessImage(req.file.buffer);

    // 2) OCR with tesseract.js
    // You may pass lang codes like 'eng', 'hin', etc. For now use 'eng' as default.
    const ocrResult = await recognizeImage(processed, 'eng');
    // ocrResult has .text and other metadata
    const extractedText = (ocrResult && ocrResult.text) ? ocrResult.text.trim() : '';

    if (!extractedText) {
      return res.json({ originalText: '', detectedLanguage: null, translatedText: '' , message: 'No text detected' });
    }

    // 3) detect language (optional, libretranslate can auto-detect too)
    const detected = await detectLanguage(extractedText);
    const target = req.body.target || 'en';

    // 4) translate
    const { translatedText, detectedSourceLanguage } = await translateText(extractedText, detected, target);

    // 5) respond
    res.json({
      originalText: extractedText,
      detectedLanguage: detectedSourceLanguage || detected || 'auto',
      translatedText
    });
  } catch (err) {
    console.error('Translate route error:', err);
    res.status(500).json({ error: 'Server error', details: err.message || String(err) });
  }
});

module.exports = router;

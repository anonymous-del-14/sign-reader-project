// backend/server.js
require('dotenv').config();
const path = require('path');
const express = require('express');
const multer = require('multer');
const cors = require('cors');

const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB
const app = express(); // <-- app must be defined before routes


app.use(cors());
app.use(express.json());

// serve static frontend if present
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// health
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Backend server running' });
});

/**
 * Try to require OCR and translation helpers if available.
 * If they are missing, route will return a demo response instead of throwing.
 */
let recognizeImage = null;
let translateText = null;
try {
  // These files are optional during early development — add them when ready
  // backend/utils/ocrWorker.js should export { recognizeImage }
  // backend/utils/translateHelper.js should export { translateText }
  const ocrWorker = require('./utils/ocrWorker');
  recognizeImage = ocrWorker.recognizeImage;
} catch (e) {
  console.warn('ocrWorker not available:', e?.message || e);
}
try {
  const t = require('./utils/translateHelper');
  translateText = t.translateText;
} catch (e) {
  console.warn('translateHelper not available:', e?.message || e);
}

const sharp = (() => {
  try { return require('sharp'); } catch (e) { console.warn('sharp not available'); return null; }
})();

/**
 * /api/translate
 * Accepts multipart/form-data with field 'image' (file) and optional 'targets' (comma separated) or 'target'
 * Responds JSON: { originalText, detectedLanguage, translatedText: { en: "...", hi: "..." } }
 */
app.post('/api/translate', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });

    // Preprocess image if sharp is available, else use raw buffer
    let imgBuffer = req.file.buffer;
    if (sharp) {
      imgBuffer = await sharp(imgBuffer)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: 'inside' })
        .grayscale()
        .toFormat('jpeg')
        .toBuffer();
    }

    // If OCR helper present, use it; otherwise return demo text
    let extracted = '';
    if (typeof recognizeImage === 'function') {
      try {
        const langs = (process.env.TESS_LANGS || 'eng').split(',').map(s => s.trim()).join('+');
        const ocrResult = await recognizeImage(imgBuffer, langs);
        extracted = (ocrResult && (ocrResult.text || ocrResult.data?.text)) ? (ocrResult.text || ocrResult.data?.text) : (ocrResult?.text || '');
      } catch (e) {
        console.warn('OCR failed, falling back to empty text:', e?.message || e);
        extracted = '';
      }
    } else {
      extracted = 'demo extracted text (ocrWorker missing)';
    }

    // prepare targets
    const tbody = req.body || {};
    const rawTargets = tbody.targets || tbody.target || 'en';
    const targets = String(rawTargets).split(',').map(s=>s.trim()).filter(Boolean);

    // translation step
    const translations = {};
    if (extracted && typeof translateText === 'function') {
      for (const tgt of targets) {
        try {
          const out = await translateText(extracted, null, tgt);
          translations[tgt] = out?.translatedText || out?.translation || out || '';
        } catch (e) {
          console.warn('translation error for', tgt, e?.message || e);
          translations[tgt] = '';
        }
      }
    } else {
      // fallback/demo translations
      targets.forEach(t => translations[t] = `[demo ${t}] ${extracted}`);
    }

    return res.json({
      originalText: extracted,
      detectedLanguage: null,
      translatedText: translations
    });

  } catch (err) {
    console.error('/api/translate error:', err);
    return res.status(500).json({ error: 'Server error', details: String(err.message || err) });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));

const translateRouter = require('./routes/translate');
app.use('/translate', translateRouter);

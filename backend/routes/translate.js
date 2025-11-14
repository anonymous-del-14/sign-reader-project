// backend/routes/translate.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const sharp = require('sharp');
const { recognizeImage } = require('../utils/ocrWorker');
const { detectLanguage, translateText } = require('../utils/translateHelper');

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

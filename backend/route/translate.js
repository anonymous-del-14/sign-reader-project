const express = require('express');
const router = express.Router();
const multer = require('multer');
const Tesseract = require('tesseract.js');

const upload = multer({ storage: multer.memoryStorage() });

// THIS VERSION ONLY DOES OCR (reads text). No AI translation yet.
router.post('/', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image uploaded" });
        }

        // OCR: extract text from the uploaded image
        const result = await Tesseract.recognize(req.file.buffer, 'eng');
        const extractedText = result.data.text.trim();

        res.json({
            originalText: extractedText,
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "OCR failed", detail: err.message });
    }
});

module.exports = router;


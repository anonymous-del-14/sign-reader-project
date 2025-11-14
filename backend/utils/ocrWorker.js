// backend/utils/ocrWorker.js
const { createWorker } = require('tesseract.js');

let worker = null;
let initializing = null;

const DEFAULT_LANGS = ['eng','hin','ben','kan','tel','mar','tam','mal']; // default set

function envLangs() {
  const s = process.env.TESS_LANGS; // e.g. "eng,hin,ben"
  if (!s) return DEFAULT_LANGS;
  return s.split(',').map(x => x.trim()).filter(Boolean);
}

async function initWorker() {
  if (worker) return worker;
  if (initializing) return initializing;

  initializing = (async () => {
    worker = createWorker({
      logger: m => { /* uncomment to debug: console.log('TESS', m) */ },
    });

    await worker.load();

    // load each language traineddata; tesseract.js can accept combined initialize
    const langs = envLangs(); // array
    // ensure traineddata for each will be fetched/available
    for (const l of langs) {
      try {
        await worker.loadLanguage(l);
      } catch (e) {
        console.warn(`Failed to load language ${l}:`, e.message || e);
      }
    }

    // initialize with plus-joined languages for recognition
    const langKey = langs.join('+');
    await worker.initialize(langKey);

    return worker;
  })();

  return initializing;
}

async function recognizeImage(buffer, langFallback = null) {
  const w = await initWorker();

  // If caller supplied a desired language code (single), try switching for better accuracy
  if (langFallback && typeof langFallback === 'string') {
    try {
      // make sure it's loaded (loadLanguage is idempotent)
      await w.loadLanguage(langFallback);
      await w.initialize(langFallback); // re-initialize to single language
    } catch (e) {
      console.warn('Could not initialize fallback language', langFallback, e.message || e);
    }
  }

  const { data } = await w.recognize(buffer);
  return data;
}

async function terminateWorker() {
  if (!worker) return;
  try { await worker.terminate(); } catch (e) {}
  worker = null;
}

module.exports = { initWorker, recognizeImage, terminateWorker };

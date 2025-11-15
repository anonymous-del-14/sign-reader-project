// backend/utils/ocrWorker.js
const path = require('path');
let TesseractModule;
try { TesseractModule = require('tesseract.js'); } catch (e) { TesseractModule = null; }

let createWorkerFn = null;
if (TesseractModule) createWorkerFn = TesseractModule.createWorker || TesseractModule.default?.createWorker || null;

async function useFallbackRecognize(buffer, lang) {
  if (!TesseractModule || typeof TesseractModule.recognize !== 'function') {
    throw new Error('No usable tesseract API found (neither createWorker nor recognize).');
  }
  const res = await TesseractModule.recognize(buffer, lang || 'eng');
  return res.data || res;
}

let worker = null;
let initializing = null;

async function initWorker(langs = ['eng']) {
  if (worker) return worker;
  if (initializing) return initializing;

  initializing = (async () => {
    if (!createWorkerFn) throw new Error('createWorker function not available in tesseract.js module.');
    worker = createWorkerFn();
    if (typeof worker.load !== 'function') throw new Error('Created worker does not have load() method.');
    await worker.load();
    for (const l of langs) {
      try { await worker.loadLanguage(l); } catch (e) { console.warn(`failed to load ${l}:`, e.message||e); }
    }
    await worker.initialize(langs.join('+'));
    return worker;
  })();

  return initializing;
}

async function recognizeImage(buffer, lang = 'eng') {
  if (createWorkerFn) {
    try {
      const w = await initWorker(Array.isArray(lang) ? lang : String(lang).split('+'));
      try { await w.loadLanguage(lang); await w.initialize(lang); } catch (e) {}
      const { data } = await w.recognize(buffer);
      return data;
    } catch (e) {
      console.warn('Worker path failed, falling back:', e.message || e);
    }
  }
  return useFallbackRecognize(buffer, lang);
}

async function terminateWorker() {
  if (!worker) return;
  try { if (typeof worker.terminate === 'function') await worker.terminate(); } catch (e) {}
  worker = null;
}

module.exports = { recognizeImage, initWorker, terminateWorker };

// frontend/app.js - mobile-first capture + compress + upload
const startBtn = document.getElementById('startBtn');
const snapBtn  = document.getElementById('snapBtn');
const fileInput = document.getElementById('fileInput');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const preview = document.getElementById('preview');
const status = document.getElementById('status');
const detectedEl = document.getElementById('detected');
const originalEl = document.getElementById('original');
const translationEl = document.getElementById('translation');
const targetSel = document.getElementById('target');

let stream = null;
function setStatus(s){ status.textContent = s; }

async function startCamera(){
  try {
    setStatus('Requesting camera...');
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    video.srcObject = stream;
    video.hidden = false;
    preview.hidden = true;
    await video.play();
    setStatus('Camera active — frame the sign and tap Capture');
  } catch (err) {
    setStatus('Camera error: ' + (err.message || err));
    alert('Camera access failed: ' + (err.message || err));
  }
}

async function stopCamera(){
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
    video.srcObject = null;
    video.hidden = true;
  }
}

function dataURLToBlob(dataurl){
  const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]); let n = bstr.length; const u8arr = new Uint8Array(n);
  while(n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], {type:mime});
}

async function compressImage(blob, maxWidth=1200, quality=0.75){
  const img = await createImageBitmap(blob);
  const scale = Math.min(1, maxWidth / img.width);
  const width = Math.round(img.width * scale);
  const height = Math.round(img.height * scale);
  const off = new OffscreenCanvas(width, height);
  const ctx = off.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);
  const out = await off.convertToBlob({ type: 'image/jpeg', quality });
  return out;
}

async function captureFrame(){
  const w = video.videoWidth || 1280, h = video.videoHeight || 720;
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, w, h);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
  preview.src = dataUrl; preview.hidden = false;
  video.hidden = true;
  return dataURLToBlob(dataUrl);
}

async function uploadAndTranslate(fileBlob){
  try {
    setStatus('Preparing image...');
    const small = await compressImage(fileBlob, 1200, 0.75);
    setStatus('Uploading — please wait...');
    const fd = new FormData();
    fd.append('image', small, 'capture.jpg');
    fd.append('target', targetSel.value);

    const BACKEND = window.BACKEND_URL || 'http://localhost:5000';
    const res = await fetch(BACKEND + '/api/translate', { method: 'POST', body: fd });
    const json = await res.json();

    if (!res.ok) {
      setStatus('Server error');
      originalEl.textContent = JSON.stringify(json);
      detectedEl.textContent = '';
      translationEl.textContent = '';
      return;
    }

    setStatus('Done');
    detectedEl.textContent = 'Detected language: ' + (json.detectedLanguage || json.detectedLanguage || 'auto');
    originalEl.textContent = json.originalText || json.original || '';
    translationEl.textContent = json.translatedText || json.translated_text || '';
  } catch (e) {
    console.error(e);
    setStatus('Network or processing error: ' + (e.message || e));
  }
}

startBtn.addEventListener('click', startCamera);
snapBtn.addEventListener('click', async () => {
  if (!stream) {
    await startCamera();
    await new Promise(r => setTimeout(r, 500)); // let autofocus
  }
  setStatus('Capturing...');
  const blob = await captureFrame();
  await uploadAndTranslate(blob);
});

fileInput.addEventListener('change', async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  preview.src = URL.createObjectURL(f); preview.hidden = false;
  await uploadAndTranslate(f);
});

window.addEventListener('beforeunload', stopCamera);

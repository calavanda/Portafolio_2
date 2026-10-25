/**
 * Ejercicio 2: Captura de Medios con Cámara Web/Móvil
 * Autor: calavanda
 */

// DOM Elements
const videoFeed = document.getElementById('videoFeed');
const photoCanvas = document.getElementById('photoCanvas');
const videoPlaceholder = document.getElementById('videoPlaceholder');
const canvasPlaceholder = document.getElementById('canvasPlaceholder');
const shutterFlash = document.getElementById('shutterFlash');
const streamOverlay = document.getElementById('streamOverlay');
const overlayResolution = document.getElementById('overlayResolution');
const overlayFacingMode = document.getElementById('overlayFacingMode');

const cameraStatusBadge = document.getElementById('cameraStatusBadge');
const canvasStatusBadge = document.getElementById('canvasStatusBadge');
const cameraErrorBox = document.getElementById('cameraErrorBox');

const btnStartCamera = document.getElementById('btnStartCamera');
const btnStopCamera = document.getElementById('btnStopCamera');
const btnSwitchCamera = document.getElementById('btnSwitchCamera');
const btnSnapPhoto = document.getElementById('btnSnapPhoto');

const btnDownloadPhoto = document.getElementById('btnDownloadPhoto');
const btnCopyPhoto = document.getElementById('btnCopyPhoto');
const btnClearCanvas = document.getElementById('btnClearCanvas');

const cameraSelect = document.getElementById('cameraSelect');
const filterSelect = document.getElementById('filterSelect');

const photoInfoBox = document.getElementById('photoInfoBox');
const photoResolution = document.getElementById('photoResolution');
const photoTimestamp = document.getElementById('photoTimestamp');
const galleryThumbnails = document.getElementById('galleryThumbnails');
const galleryCounter = document.getElementById('galleryCounter');

// State
let currentStream = null;
let currentFacingMode = 'user'; // 'user' (front) or 'environment' (back)
let capturedPhotos = [];
const ctx = photoCanvas.getContext('2d');

// Web Audio API Shutter Click Effect
function playShutterSound() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.09);
  } catch (e) {
    // Audio context may be restricted by browser policy
  }
}

// ==========================================
// 1. Detect & Enumerate Available Cameras
// ==========================================
async function populateCameraDevices() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    return;
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(d => d.kind === 'videoinput');

    cameraSelect.innerHTML = '';
    if (videoDevices.length === 0) {
      cameraSelect.innerHTML = '<option value="">No se detectaron cámaras</option>';
      cameraSelect.disabled = true;
      return;
    }

    videoDevices.forEach((device, index) => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.textContent = device.label || `Cámara ${index + 1} (${device.deviceId.slice(0, 6)}...)`;
      cameraSelect.appendChild(option);
    });

    cameraSelect.disabled = false;
    btnSwitchCamera.disabled = videoDevices.length <= 1;
  } catch (err) {
    console.warn('Error al enumerar dispositivos de video:', err);
  }
}

// ==========================================
// 2. Start & Stop Camera (getUserMedia)
// ==========================================
async function startCamera(deviceId = null) {
  stopCamera(); // Stop any existing stream
  cameraErrorBox.style.display = 'none';

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showError('Tu navegador no soporta navigator.mediaDevices.getUserMedia.');
    return;
  }

  // Constraints
  const constraints = {
    audio: false,
    video: deviceId 
      ? { deviceId: { exact: deviceId } } 
      : { 
          facingMode: currentFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    currentStream = stream;
    videoFeed.srcObject = stream;

    // Wait for video metadata to render proper aspect ratio
    videoFeed.onloadedmetadata = () => {
      videoPlaceholder.style.opacity = '0';
      setTimeout(() => { videoPlaceholder.style.display = 'none'; }, 200);

      streamOverlay.style.display = 'flex';
      overlayResolution.textContent = `${videoFeed.videoWidth} x ${videoFeed.videoHeight}`;
      overlayFacingMode.textContent = currentFacingMode === 'user' ? 'Cámara Frontal' : 'Cámara Trasera';

      cameraStatusBadge.textContent = 'En Vivo';
      cameraStatusBadge.className = 'badge badge-emerald';

      btnStartCamera.disabled = true;
      btnStopCamera.disabled = false;
      btnSnapPhoto.disabled = false;
      btnSwitchCamera.disabled = false;

      // Re-populate devices once permission has been granted so labels become visible
      populateCameraDevices();
    };
  } catch (err) {
    console.error('Error al iniciar cámara:', err);
    let msg = 'No se pudo acceder a la cámara.';
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      msg = '🚫 Permiso denegado para acceder a la cámara. Por favor autoriza el permiso en el navegador.';
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      msg = '📷 No se encontró ningún dispositivo de cámara conectado al equipo.';
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      msg = '⚠️ La cámara está siendo utilizada por otra aplicación o pestaña del sistema.';
    }
    showError(msg);
  }
}

function stopCamera() {
  if (currentStream) {
    currentStream.getTracks().forEach(track => {
      track.stop();
    });
    currentStream = null;
  }

  videoFeed.srcObject = null;
  videoPlaceholder.style.display = 'flex';
  videoPlaceholder.style.opacity = '1';
  streamOverlay.style.display = 'none';

  cameraStatusBadge.textContent = 'Cámara Apagada';
  cameraStatusBadge.className = 'badge badge-rose';

  btnStartCamera.disabled = false;
  btnStopCamera.disabled = true;
  btnSnapPhoto.disabled = true;
}

function showError(msg) {
  cameraErrorBox.style.display = 'block';
  cameraErrorBox.innerHTML = `<strong>Aviso:</strong> ${msg}`;
}

// ==========================================
// 3. Capture Photo to HTML Canvas
// ==========================================
function capturePhoto() {
  if (!currentStream || !videoFeed.videoWidth) return;

  // Visual flash effect and sound
  shutterFlash.classList.remove('flash-active');
  void shutterFlash.offsetWidth; // Trigger reflow
  shutterFlash.classList.add('flash-active');
  playShutterSound();

  const width = videoFeed.videoWidth || 640;
  const height = videoFeed.videoHeight || 480;

  photoCanvas.width = width;
  photoCanvas.height = height;

  // Apply selected visual filter onto canvas context
  const selectedFilter = filterSelect.value;
  ctx.filter = selectedFilter;

  // Draw current video frame to canvas
  ctx.drawImage(videoFeed, 0, 0, width, height);

  // Optional: Add custom subtle watermark
  ctx.filter = 'none';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(10, height - 38, 220, 28);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('calavanda • PWA Cam', 20, height - 20);

  // Update UI
  canvasPlaceholder.style.display = 'none';
  canvasStatusBadge.textContent = 'Foto Capturada';
  canvasStatusBadge.className = 'badge badge-emerald';

  btnDownloadPhoto.disabled = false;
  btnCopyPhoto.disabled = false;
  btnClearCanvas.disabled = false;

  // Info details
  photoInfoBox.style.display = 'block';
  photoResolution.textContent = `${width} x ${height} px`;
  const now = new Date();
  photoTimestamp.textContent = now.toLocaleTimeString() + ' (' + now.toLocaleDateString() + ')';

  // Save to thumbnail gallery
  const dataUrl = photoCanvas.toDataURL('image/png');
  addToGallery(dataUrl);
}

function addToGallery(dataUrl) {
  capturedPhotos.unshift(dataUrl);
  galleryCounter.textContent = `${capturedPhotos.length} fotos`;

  const emptyMsg = galleryThumbnails.querySelector('.empty-gallery-msg');
  if (emptyMsg) emptyMsg.remove();

  const img = document.createElement('img');
  img.src = dataUrl;
  img.className = 'gallery-thumb';
  img.title = 'Click para cargar en el visor principal';
  img.addEventListener('click', () => {
    const tempImage = new Image();
    tempImage.onload = () => {
      photoCanvas.width = tempImage.naturalWidth;
      photoCanvas.height = tempImage.naturalHeight;
      ctx.drawImage(tempImage, 0, 0);
      canvasPlaceholder.style.display = 'none';
    };
    tempImage.src = dataUrl;
  });

  galleryThumbnails.prepend(img);
}

// Download image as file
function downloadPhoto() {
  const dataUrl = photoCanvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `captura-pwa-calavanda-${Date.now()}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Copy image to clipboard
async function copyPhotoToClipboard() {
  try {
    photoCanvas.toBlob(async (blob) => {
      if (!blob) return;
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      const originalText = btnCopyPhoto.textContent;
      btnCopyPhoto.textContent = '✅ ¡Copiado!';
      setTimeout(() => { btnCopyPhoto.textContent = originalText; }, 2000);
    });
  } catch (err) {
    console.warn('Error al copiar al portapapeles:', err);
    alert('La API del portapapeles no permitió copiar la imagen directamente.');
  }
}

function clearCanvas() {
  ctx.clearRect(0, 0, photoCanvas.width, photoCanvas.height);
  canvasPlaceholder.style.display = 'flex';
  canvasStatusBadge.textContent = 'Sin Captura';
  canvasStatusBadge.className = 'badge badge-amber';
  photoInfoBox.style.display = 'none';
  btnDownloadPhoto.disabled = true;
  btnCopyPhoto.disabled = true;
  btnClearCanvas.disabled = true;
}

// ==========================================
// Event Listeners & Bootstrapping
// ==========================================
btnStartCamera.addEventListener('click', () => {
  const selectedDeviceId = cameraSelect.value || null;
  startCamera(selectedDeviceId);
});

btnStopCamera.addEventListener('click', () => {
  stopCamera();
});

btnSwitchCamera.addEventListener('click', () => {
  currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
  startCamera();
});

btnSnapPhoto.addEventListener('click', () => {
  capturePhoto();
});

btnDownloadPhoto.addEventListener('click', () => {
  downloadPhoto();
});

btnCopyPhoto.addEventListener('click', () => {
  copyPhotoToClipboard();
});

btnClearCanvas.addEventListener('click', () => {
  clearCanvas();
});

filterSelect.addEventListener('change', () => {
  videoFeed.style.filter = filterSelect.value;
});

cameraSelect.addEventListener('change', () => {
  if (currentStream && cameraSelect.value) {
    startCamera(cameraSelect.value);
  }
});

// Initialization
window.addEventListener('DOMContentLoaded', () => {
  populateCameraDevices();
});

// Clean up video stream if user leaves page
window.addEventListener('beforeunload', () => {
  stopCamera();
});

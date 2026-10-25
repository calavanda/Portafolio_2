/**
 * Ejercicio 1: Permisos y Geolocalización
 * Autor: calavanda
 */

// DOM Elements
const permissionBadge = document.getElementById('permissionBadge');
const permissionStateText = document.getElementById('permissionStateText');
const permissionExplanation = document.getElementById('permissionExplanation');
const apiSupportBadge = document.getElementById('apiSupportBadge');
const btnCheckPermission = document.getElementById('btnCheckPermission');

const btnGetLocation = document.getElementById('btnGetLocation');
const btnToggleWatch = document.getElementById('btnToggleWatch');
const btnCenterMap = document.getElementById('btnCenterMap');

const locationLoader = document.getElementById('locationLoader');
const locationErrorBox = document.getElementById('locationErrorBox');
const mapStatusSubtitle = document.getElementById('mapStatusSubtitle');

const valLatitude = document.getElementById('valLatitude');
const valLongitude = document.getElementById('valLongitude');
const valAccuracy = document.getElementById('valAccuracy');
const valAltitude = document.getElementById('valAltitude');
const valTimestamp = document.getElementById('valTimestamp');

// State variables
let watchId = null;
let map = null;
let currentMarker = null;
let currentAccuracyCircle = null;
let lastCoords = null;

// ==========================================
// 1. Permissions API Check
// ==========================================
async function checkGeolocationPermission() {
  if (!('permissions' in navigator)) {
    apiSupportBadge.textContent = 'No soportado';
    apiSupportBadge.className = 'badge badge-rose';
    permissionStateText.textContent = 'No disponible';
    permissionExplanation.textContent = 'La Permissions API no está disponible en este navegador.';
    return;
  }

  try {
    const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
    updatePermissionUI(permissionStatus.state);

    // Dynamic listener for permission change
    permissionStatus.onchange = () => {
      console.log('Permiso de geolocalización modificado a:', permissionStatus.state);
      updatePermissionUI(permissionStatus.state);
    };
  } catch (error) {
    console.warn('Error al consultar permisos de geolocalización:', error);
    permissionBadge.textContent = 'Desconocido';
    permissionBadge.className = 'badge badge-amber';
    permissionStateText.textContent = 'Error al consultar';
  }
}

function updatePermissionUI(state) {
  permissionStateText.textContent = state.toUpperCase();

  switch (state) {
    case 'granted':
      permissionBadge.textContent = 'Concedido';
      permissionBadge.className = 'badge badge-emerald';
      permissionExplanation.textContent = 'El acceso a la geolocalización está concedido. Puedes obtener las coordenadas de inmediato.';
      break;
    case 'prompt':
      permissionBadge.textContent = 'Preguntar';
      permissionBadge.className = 'badge badge-amber';
      permissionExplanation.textContent = 'El navegador solicitará confirmación al usuario al intentar obtener la ubicación.';
      break;
    case 'denied':
      permissionBadge.textContent = 'Denegado';
      permissionBadge.className = 'badge badge-rose';
      permissionExplanation.textContent = 'El acceso fue bloqueado en la configuración del navegador. Debes cambiarlo en el candado de la URL para habilitarlo.';
      break;
    default:
      permissionBadge.textContent = state;
      permissionBadge.className = 'badge badge-cyan';
  }
}

// ==========================================
// 2. Interactive Map Initialization (Leaflet)
// ==========================================
function initMap(lat = 19.4326, lng = -99.1332, zoom = 4) {
  if (typeof L === 'undefined') {
    document.getElementById('leafletMap').innerHTML = '<div style="padding: 2rem; color: #94a3b8; text-align: center;">Cargando motor de mapas Leaflet...</div>';
    return;
  }

  if (map) return;

  // Initialize Leaflet map
  map = L.map('leafletMap', {
    zoomControl: true,
    scrollWheelZoom: true
  }).setView([lat, lng], zoom);

  // High quality dark/modern OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
}

function updateMapPosition(lat, lng, accuracy) {
  initMap(lat, lng, 16);

  if (!map) return;

  map.setView([lat, lng], 16);

  // Custom pulsing map marker icon
  const customIcon = L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div style="
      width: 22px; 
      height: 22px; 
      background: #38bdf8; 
      border: 3px solid #ffffff; 
      border-radius: 50%; 
      box-shadow: 0 0 16px rgba(56, 189, 248, 0.9);
      animation: pulseMarker 1.8s infinite;
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });

  if (currentMarker) {
    currentMarker.setLatLng([lat, lng]);
  } else {
    currentMarker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
  }

  currentMarker.bindPopup(`
    <div style="font-family: sans-serif; color: #0f172a; padding: 4px;">
      <strong style="color: #0284c7;">📍 Tu Ubicación Actual</strong><br>
      <span style="font-size: 12px;">Lat: ${lat.toFixed(6)}<br>Lng: ${lng.toFixed(6)}<br>Precisión: ±${Math.round(accuracy)}m</span>
    </div>
  `).openPopup();

  // Accuracy circle
  if (currentAccuracyCircle) {
    currentAccuracyCircle.setLatLng([lat, lng]);
    currentAccuracyCircle.setRadius(accuracy);
  } else {
    currentAccuracyCircle = L.circle([lat, lng], {
      radius: accuracy,
      color: '#6366f1',
      fillColor: '#818cf8',
      fillOpacity: 0.2,
      weight: 1.5
    }).addTo(map);
  }

  btnCenterMap.disabled = false;
  mapStatusSubtitle.textContent = `Ubicación sincronizada (Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)})`;
}

// ==========================================
// 3. Geolocation API Access
// ==========================================
function handleLocationSuccess(position) {
  locationLoader.style.display = 'none';
  locationErrorBox.style.display = 'none';

  const { latitude, longitude, accuracy, altitude, heading, speed } = position.coords;
  lastCoords = { latitude, longitude, accuracy };

  valLatitude.textContent = `${latitude.toFixed(6)}°`;
  valLongitude.textContent = `${longitude.toFixed(6)}°`;
  valAccuracy.textContent = `± ${Math.round(accuracy)} m`;

  const altStr = altitude !== null ? `${altitude.toFixed(1)}m` : 'N/D';
  const headStr = heading !== null ? `${Math.round(heading)}°` : 'N/D';
  valAltitude.textContent = `${altStr} / ${headStr}`;

  const date = new Date(position.timestamp);
  valTimestamp.textContent = date.toLocaleTimeString() + ' (' + date.toLocaleDateString() + ')';

  // Update map
  updateMapPosition(latitude, longitude, accuracy);

  // Refresh permissions UI as browser now has user response
  checkGeolocationPermission();
}

function handleLocationError(error) {
  locationLoader.style.display = 'none';
  locationErrorBox.style.display = 'block';

  let msg = 'Error desconocido al solicitar geolocalización.';
  switch (error.code) {
    case error.PERMISSION_DENIED:
      msg = '🚫 Permiso denegado por el usuario o por la política del navegador.';
      break;
    case error.POSITION_UNAVAILABLE:
      msg = '📡 La información de ubicación no está disponible actualmente en el hardware.';
      break;
    case error.TIMEOUT:
      msg = '⏱️ Se agotó el tiempo de espera para obtener la posición satelital.';
      break;
  }

  locationErrorBox.innerHTML = `<strong>Error de Geolocalización:</strong> ${msg} <br><small>Código: ${error.code} - ${error.message}</small>`;
  checkGeolocationPermission();
}

const geoOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0
};

function requestCurrentLocation() {
  if (!('geolocation' in navigator)) {
    locationErrorBox.style.display = 'block';
    locationErrorBox.textContent = 'La Geolocation API no está soportada en este navegador.';
    return;
  }

  locationErrorBox.style.display = 'none';
  locationLoader.style.display = 'flex';

  navigator.geolocation.getCurrentPosition(handleLocationSuccess, handleLocationError, geoOptions);
}

function toggleWatchLocation() {
  if (!('geolocation' in navigator)) return;

  if (watchId !== null) {
    // Stop watching
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    btnToggleWatch.textContent = '📡 Monitoreo en Vivo (Watch)';
    btnToggleWatch.className = 'btn btn-secondary';
    locationLoader.style.display = 'none';
  } else {
    // Start watching
    locationLoader.style.display = 'flex';
    locationLoader.querySelector('span').textContent = 'Monitoreando cambios de posición en tiempo real...';
    btnToggleWatch.textContent = '🛑 Detener Monitoreo';
    btnToggleWatch.className = 'btn btn-danger';

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        handleLocationSuccess(pos);
      },
      handleLocationError,
      geoOptions
    );
  }
}

// ==========================================
// Event Listeners & Bootstrapping
// ==========================================
btnCheckPermission.addEventListener('click', () => {
  checkGeolocationPermission();
});

btnGetLocation.addEventListener('click', () => {
  requestCurrentLocation();
});

btnToggleWatch.addEventListener('click', () => {
  toggleWatchLocation();
});

btnCenterMap.addEventListener('click', () => {
  if (lastCoords && map) {
    map.setView([lastCoords.latitude, lastCoords.longitude], 17);
  }
});

// Initial boot
window.addEventListener('DOMContentLoaded', () => {
  checkGeolocationPermission();
  initMap(); // Default initial view
});

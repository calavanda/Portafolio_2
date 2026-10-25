/**
 * Ejercicio 3: Notificaciones Push Locales desde el Service Worker
 * Autor: calavanda
 */

// DOM Elements
const swStatusBadge = document.getElementById('swStatusBadge');
const notifPermissionBadge = document.getElementById('notifPermissionBadge');
const swScopeText = document.getElementById('swScopeText');
const supportBadge = document.getElementById('supportBadge');
const permAdvice = document.getElementById('permAdvice');

const btnRequestPermission = document.getElementById('btnRequestPermission');
const notifForm = document.getElementById('notifForm');
const templateSelect = document.getElementById('templateSelect');
const notifTitle = document.getElementById('notifTitle');
const notifBody = document.getElementById('notifBody');
const notifVibration = document.getElementById('notifVibration');
const notifDelay = document.getElementById('notifDelay');

const countdownBox = document.getElementById('countdownBox');
const countdownText = document.getElementById('countdownText');

const previewTitle = document.getElementById('previewTitle');
const previewBody = document.getElementById('previewBody');
const notifHistoryList = document.getElementById('notifHistoryList');
const btnClearHistory = document.getElementById('btnClearHistory');

// State
let swRegistration = null;
let historyRecords = [];

// ==========================================
// 1. Service Worker Registration
// ==========================================
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    supportBadge.textContent = 'Sin SW';
    supportBadge.className = 'badge badge-rose';
    swStatusBadge.textContent = 'No soportado';
    swStatusBadge.className = 'badge badge-rose';
    return;
  }

  try {
    const reg = await navigator.serviceWorker.register('./sw.js', { scope: './' });
    swRegistration = reg;
    swScopeText.textContent = reg.scope;

    if (reg.installing) {
      swStatusBadge.textContent = 'Instalando';
      swStatusBadge.className = 'badge badge-amber';
    } else if (reg.waiting) {
      swStatusBadge.textContent = 'En espera';
      swStatusBadge.className = 'badge badge-cyan';
    } else if (reg.active) {
      swStatusBadge.textContent = 'SW Activo';
      swStatusBadge.className = 'badge badge-emerald';
    }

    reg.onupdatefound = () => {
      const installingWorker = reg.installing;
      installingWorker.onstatechange = () => {
        if (installingWorker.state === 'activated') {
          swStatusBadge.textContent = 'SW Activo';
          swStatusBadge.className = 'badge badge-emerald';
        }
      };
    };
  } catch (error) {
    console.error('Error al registrar Service Worker:', error);
    swStatusBadge.textContent = 'Error Registro';
    swStatusBadge.className = 'badge badge-rose';
  }
}

// ==========================================
// 2. Notification Permission Management
// ==========================================
function updatePermissionStatusUI() {
  if (!('Notification' in window)) {
    notifPermissionBadge.textContent = 'No soportado';
    notifPermissionBadge.className = 'badge badge-rose';
    btnRequestPermission.disabled = true;
    return;
  }

  const perm = Notification.permission;
  notifPermissionBadge.textContent = perm;

  switch (perm) {
    case 'granted':
      notifPermissionBadge.className = 'badge badge-emerald';
      permAdvice.textContent = '✅ Permiso concedido. Las notificaciones locales se mostrarán nativamente en el sistema operativo.';
      btnRequestPermission.textContent = '🔔 Permiso ya Concedido';
      btnRequestPermission.className = 'btn btn-secondary';
      btnRequestPermission.disabled = true;
      break;
    case 'prompt':
    case 'default':
      notifPermissionBadge.className = 'badge badge-amber';
      permAdvice.textContent = '⚠️ Permiso no solicitado aún. Haz click en el botón superior para autorizar.';
      btnRequestPermission.textContent = '🔔 Solicitar Permiso de Notificación';
      btnRequestPermission.className = 'btn btn-primary';
      btnRequestPermission.disabled = false;
      break;
    case 'denied':
      notifPermissionBadge.className = 'badge badge-rose';
      permAdvice.textContent = '🚫 Permiso denegado por el usuario. Para reactivarlo, haz click en el candado / configuración de sitio en tu navegador y cambia Notificaciones a Permitir.';
      btnRequestPermission.textContent = '🚫 Permiso Denegado (Ver candado)';
      btnRequestPermission.className = 'btn btn-danger';
      btnRequestPermission.disabled = true;
      break;
  }
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    alert('Tu navegador no cuenta con soporte para Notification API.');
    return;
  }

  try {
    const result = await Notification.requestPermission();
    updatePermissionStatusUI();

    if (result === 'granted') {
      // Trigger a subtle welcome notification right away
      triggerLocalNotification('🎉 ¡Permisos Concedidos!', 'El Service Worker ahora puede enviar notificaciones locales.');
    }
  } catch (err) {
    console.error('Error al solicitar permiso:', err);
  }
}

// ==========================================
// 3. Dispatch Notification via Service Worker
// ==========================================
const vibrationPatterns = {
  standard: [200, 100, 200, 100, 200],
  double: [400, 200, 400],
  quick: [100, 50, 100, 50, 100],
  none: [0]
};

async function triggerLocalNotification(title, body) {
  if (Notification.permission !== 'granted') {
    alert('Primero debes conceder el permiso de notificación.');
    return;
  }

  const selectedVibeKey = notifVibration.value || 'standard';
  const vibeArray = vibrationPatterns[selectedVibeKey] || [200, 100, 200];

  const notificationOptions = {
    body: body,
    icon: '../icons/icon.svg',
    badge: '../icons/badge.svg',
    vibrate: vibeArray,
    tag: 'pwa-local-calavanda-' + Date.now(),
    renotify: true,
    data: {
      url: window.location.href,
      author: 'calavanda',
      timestamp: Date.now()
    },
    actions: [
      { action: 'open_app', title: '👀 Ver Portafolio' },
      { action: 'dismiss', title: '❌ Descartar' }
    ]
  };

  try {
    // Priority: Trigger via Service Worker registration
    if (swRegistration && swRegistration.showNotification) {
      await swRegistration.showNotification(title, notificationOptions);
    } else {
      // Wait for SW ready if needed
      const readyReg = await navigator.serviceWorker.ready;
      await readyReg.showNotification(title, notificationOptions);
    }

    addHistoryRecord(title, body);
  } catch (err) {
    console.warn('Fallo al disparar con SW, intentando fallback nativo:', err);
    try {
      new Notification(title, notificationOptions);
      addHistoryRecord(title, body);
    } catch (fallbackErr) {
      alert('Error al disparar la notificación: ' + fallbackErr.message);
    }
  }
}

function addHistoryRecord(title, body) {
  const time = new Date().toLocaleTimeString();
  historyRecords.unshift({ title, body, time });

  const emptyText = notifHistoryList.querySelector('.empty-history-text');
  if (emptyText) emptyText.remove();

  const item = document.createElement('div');
  item.className = 'history-item';
  item.innerHTML = `
    <div class="history-item-top">
      <span>${escapeHtml(title)}</span>
      <span class="history-item-time">${time}</span>
    </div>
    <div style="color: #cbd5e1;">${escapeHtml(body)}</div>
  `;

  notifHistoryList.prepend(item);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Preset templates
const templates = {
  custom: {
    title: '🚀 Notificación PWA Local',
    body: 'Notificación local ejecutada a través del Service Worker. Autor: calavanda.'
  },
  alert: {
    title: '⚠️ Alerta de Sistema PWA',
    body: 'Se ha detectado un cambio en los recursos locales. Sincronización requerida.'
  },
  sync: {
    title: '🔄 Sincronización Exitosa de Datos',
    body: 'Todos los registros locales de IndexedDB fueron validados correctamente.'
  },
  reminder: {
    title: '⏰ Recordatorio de Calificación',
    body: 'El portafolio de calavanda cumple con las 5 especificaciones académicas de PWA.'
  }
};

// ==========================================
// Event Listeners
// ==========================================
btnRequestPermission.addEventListener('click', () => {
  requestNotificationPermission();
});

// Update mockup preview in real time
notifTitle.addEventListener('input', () => {
  previewTitle.textContent = notifTitle.value || 'Sin título';
});

notifBody.addEventListener('input', () => {
  previewBody.textContent = notifBody.value || 'Sin contenido';
});

templateSelect.addEventListener('change', () => {
  const chosen = templates[templateSelect.value];
  if (chosen) {
    notifTitle.value = chosen.title;
    notifBody.value = chosen.body;
    previewTitle.textContent = chosen.title;
    previewBody.textContent = chosen.body;
  }
});

notifForm.addEventListener('submit', (e) => {
  e.preventDefault();

  if (Notification.permission !== 'granted') {
    requestNotificationPermission();
    return;
  }

  const title = notifTitle.value.trim();
  const body = notifBody.value.trim();
  const delaySeconds = parseInt(notifDelay.value, 10) || 0;

  if (delaySeconds === 0) {
    triggerLocalNotification(title, body);
  } else {
    // Show countdown so user can minimize/switch tabs to see the native OS alert
    countdownBox.style.display = 'flex';
    let remaining = delaySeconds;
    countdownText.textContent = `Disparando en ${remaining} segundos... ¡Puedes minimizar el navegador para verla en tu sistema!`;

    const timer = setInterval(() => {
      remaining--;
      if (remaining > 0) {
        countdownText.textContent = `Disparando en ${remaining} segundos... ¡Puedes minimizar el navegador para verla en tu sistema!`;
      } else {
        clearInterval(timer);
        countdownBox.style.display = 'none';
        triggerLocalNotification(title, body);
      }
    }, 1000);
  }
});

btnClearHistory.addEventListener('click', () => {
  historyRecords = [];
  notifHistoryList.innerHTML = '<p class="empty-history-text">No has emitido notificaciones en esta sesión aún.</p>';
});

// Initialization
window.addEventListener('DOMContentLoaded', () => {
  registerServiceWorker();
  updatePermissionStatusUI();
});

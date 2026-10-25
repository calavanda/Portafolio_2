/**
 * Ejercicio 5: Estrategia de Caché Dinámica con Fallback a IndexedDB / Network-First
 * Autor: calavanda
 */

import { apiCacheDB } from './db.js';

// DOM Elements
const networkDot = document.getElementById('networkDot');
const networkStatusText = document.getElementById('networkStatusText');
const networkSubtext = document.getElementById('networkSubtext');

const sourceDot = document.getElementById('sourceDot');
const currentSourceBadge = document.getElementById('currentSourceBadge');
const sourceLatencyText = document.getElementById('sourceLatencyText');

const lastSyncTimeText = document.getElementById('lastSyncTimeText');
const syncStoreSubtext = document.getElementById('syncStoreSubtext');

const apiEndpointSelect = document.getElementById('apiEndpointSelect');
const btnFetchData = document.getElementById('btnFetchData');
const btnToggleSimulatedOffline = document.getElementById('btnToggleSimulatedOffline');
const btnClearCache = document.getElementById('btnClearCache');
const simulatedOfflineNotice = document.getElementById('simulatedOfflineNotice');

const apiLoader = document.getElementById('apiLoader');
const fallbackNotice = document.getElementById('fallbackNotice');
const fallbackNoticeDetails = document.getElementById('fallbackNoticeDetails');
const itemsContainer = document.getElementById('itemsContainer');
const resultsCountSubtitle = document.getElementById('resultsCountSubtitle');
const renderSourceBadge = document.getElementById('renderSourceBadge');

const jsonViewer = document.getElementById('jsonViewer');
const btnCopyJson = document.getElementById('btnCopyJson');

// State
let isSimulatedOffline = false;
let currentPayload = null;

// Endpoints catalog
const ENDPOINTS = {
  products: {
    url: 'https://dummyjson.com/products?limit=6',
    cacheKey: 'cached_products',
    label: 'Productos DummyJSON'
  },
  posts: {
    url: 'https://jsonplaceholder.typicode.com/posts?_limit=6',
    cacheKey: 'cached_posts',
    label: 'Publicaciones JSONPlaceholder'
  },
  quotes: {
    url: 'https://dummyjson.com/quotes?limit=6',
    cacheKey: 'cached_quotes',
    label: 'Citas DummyJSON'
  }
};

// ==========================================
// 1. Network Status Monitoring
// ==========================================
function updateNetworkStatus() {
  const isOnline = navigator.onLine && !isSimulatedOffline;

  if (isOnline) {
    networkDot.className = 'status-indicator status-online';
    networkStatusText.textContent = 'En Línea (Online)';
    networkSubtext.textContent = 'navigator.onLine = true';
  } else {
    networkDot.className = 'status-indicator status-offline';
    networkStatusText.textContent = isSimulatedOffline ? 'Offline (Simulado)' : 'Desconectado (Offline)';
    networkSubtext.textContent = isSimulatedOffline ? 'Simulación forzada activa' : 'navigator.onLine = false';
  }
}

window.addEventListener('online', updateNetworkStatus);
window.addEventListener('offline', updateNetworkStatus);

btnToggleSimulatedOffline.addEventListener('click', () => {
  isSimulatedOffline = !isSimulatedOffline;
  if (isSimulatedOffline) {
    btnToggleSimulatedOffline.textContent = '🟢 Desactivar Simulación Offline';
    btnToggleSimulatedOffline.className = 'btn btn-primary';
    simulatedOfflineNotice.style.display = 'flex';
  } else {
    btnToggleSimulatedOffline.textContent = '🔌 Simular Desconexión (Offline)';
    btnToggleSimulatedOffline.className = 'btn btn-secondary';
    simulatedOfflineNotice.style.display = 'none';
  }
  updateNetworkStatus();
});

// ==========================================
// 2. Service Worker Registration
// ==========================================
async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('./sw.js', { scope: './' });
      console.log('[E5] Service Worker registrado para Caché Dinámica');
    } catch (e) {
      console.warn('[E5] Error registrando SW:', e);
    }
  }
}

// ==========================================
// 3. Network-First Execution Strategy
// ==========================================
async function executeNetworkFirst() {
  const endpointKey = apiEndpointSelect.value;
  const config = ENDPOINTS[endpointKey];
  const startTime = performance.now();

  apiLoader.style.display = 'flex';
  fallbackNotice.style.display = 'none';
  renderSourceBadge.textContent = 'Cargando...';
  renderSourceBadge.className = 'badge badge-amber';

  let resultData = null;
  let dataSource = null;
  let cachedRecord = null;

  // Step 1: Check if offline or simulation is active
  if (!navigator.onLine || isSimulatedOffline) {
    console.log('[Network-First] Dispositivo offline o simulación activa. Activando Fallback directo a IndexedDB...');
    try {
      cachedRecord = await apiCacheDB.getApiResponse(config.cacheKey);
      if (cachedRecord && cachedRecord.data) {
        resultData = cachedRecord.data;
        dataSource = 'indexeddb-fallback';
      } else {
        throw new Error('No existe copia local almacenada previamente en IndexedDB para este endpoint.');
      }
    } catch (fallbackError) {
      handleCompleteFailure(fallbackError.message);
      return;
    }
  } else {
    // Step 2: Device is online -> Attempt remote fetch first
    try {
      const response = await fetch(config.url, {
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000) // 5s timeout
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      resultData = json;
      dataSource = 'network-fresh';

      // Save/update sync copy in IndexedDB
      await apiCacheDB.saveApiResponse(config.cacheKey, json, config.url);
      console.log('[Network-First] Respuesta de red sincronizada exitosamente en IndexedDB.');
    } catch (networkError) {
      console.warn('[Network-First] Fallo de red. Iniciando Fallback automático a IndexedDB...', networkError);
      
      // Step 3: Network failed -> Fallback to IndexedDB
      try {
        cachedRecord = await apiCacheDB.getApiResponse(config.cacheKey);
        if (cachedRecord && cachedRecord.data) {
          resultData = cachedRecord.data;
          dataSource = 'indexeddb-fallback';
        } else {
          throw new Error('Fallo de red y no se encontró copia previa en IndexedDB. ' + networkError.message);
        }
      } catch (fallbackError) {
        handleCompleteFailure(fallbackError.message);
        return;
      }
    }
  }

  const duration = Math.round(performance.now() - startTime);
  apiLoader.style.display = 'none';

  // Render results
  currentPayload = resultData;
  displayResults(resultData, endpointKey, dataSource, duration, cachedRecord);
  updateLastSyncDisplay(config.cacheKey);
}

// Display results in UI
function displayResults(data, endpointKey, source, duration, cachedRecord) {
  sourceLatencyText.textContent = `Latencia: ${duration} ms`;

  if (source === 'network-fresh') {
    sourceDot.className = 'status-indicator status-online';
    currentSourceBadge.textContent = '🌐 Red en Vivo (Online)';
    renderSourceBadge.textContent = 'Network Fresh';
    renderSourceBadge.className = 'badge badge-emerald';
    fallbackNotice.style.display = 'none';
  } else {
    sourceDot.className = 'status-indicator status-warning';
    currentSourceBadge.textContent = '💾 Fallback a IndexedDB';
    renderSourceBadge.textContent = 'IndexedDB Offline';
    renderSourceBadge.className = 'badge badge-amber';

    const syncDate = cachedRecord ? new Date(cachedRecord.timestamp).toLocaleTimeString() : 'Previa';
    fallbackNotice.style.display = 'flex';
    fallbackNoticeDetails.textContent = `No hubo conexión a la red. Se desplegó automáticamente la copia local sincronizada a las ${syncDate}.`;
  }

  // Populate Raw JSON Inspector
  jsonViewer.textContent = JSON.stringify(data, null, 2);

  // Render cards
  itemsContainer.innerHTML = '';

  if (endpointKey === 'products' && data.products) {
    resultsCountSubtitle.textContent = `${data.products.length} productos renderizados`;
    data.products.forEach(prod => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <img src="${prod.thumbnail || 'https://picsum.photos/seed/' + prod.id + '/300/200'}" alt="${prod.title}" class="card-img" loading="lazy">
        <div class="card-body">
          <span class="card-tag">${prod.category}</span>
          <h4 class="item-title">${escapeHtml(prod.title)}</h4>
          <p class="item-desc">${escapeHtml(prod.description)}</p>
          <div class="item-footer">
            <span class="item-price">$${prod.price}</span>
            <span class="item-rating">⭐ ${prod.rating || '4.5'}</span>
          </div>
        </div>
      `;
      itemsContainer.appendChild(card);
    });
  } else if (endpointKey === 'posts' && Array.isArray(data)) {
    resultsCountSubtitle.textContent = `${data.length} publicaciones renderizadas`;
    data.forEach(post => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <div class="card-body">
          <span class="card-tag">Post #${post.id}</span>
          <h4 class="item-title">${escapeHtml(post.title)}</h4>
          <p class="item-desc">${escapeHtml(post.body)}</p>
          <div class="item-footer">
            <span style="font-size: 0.75rem; color: #94a3b8;">User ID: ${post.userId}</span>
            <span class="badge badge-purple">Artículo</span>
          </div>
        </div>
      `;
      itemsContainer.appendChild(card);
    });
  } else if (endpointKey === 'quotes' && data.quotes) {
    resultsCountSubtitle.textContent = `${data.quotes.length} citas renderizadas`;
    data.quotes.forEach(quote => {
      const card = document.createElement('div');
      card.className = 'product-card';
      card.innerHTML = `
        <div class="card-body">
          <span class="card-tag">Cita #${quote.id}</span>
          <p class="item-desc" style="font-size: 0.95rem; color: #f8fafc; font-style: italic;">“${escapeHtml(quote.quote)}”</p>
          <div class="item-footer">
            <strong style="color: #38bdf8;">— ${escapeHtml(quote.author)}</strong>
          </div>
        </div>
      `;
      itemsContainer.appendChild(card);
    });
  }
}

function handleCompleteFailure(errorMessage) {
  apiLoader.style.display = 'none';
  sourceDot.className = 'status-indicator status-offline';
  currentSourceBadge.textContent = '❌ Error de Carga';
  renderSourceBadge.textContent = 'Sin Datos';
  renderSourceBadge.className = 'badge badge-rose';

  itemsContainer.innerHTML = `
    <div class="empty-state" style="grid-column: 1 / -1;">
      <div class="empty-icon" style="color: #f87171;">⚠️</div>
      <h4 style="color: #f87171;">Fallo de Conexión y sin Copia Local</h4>
      <p>${escapeHtml(errorMessage)}</p>
      <small style="color: #94a3b8;">Conéctate a la red una vez para que el sistema descargue y guarde la copia en IndexedDB.</small>
    </div>
  `;

  jsonViewer.textContent = JSON.stringify({ error: errorMessage, timestamp: new Date().toISOString() }, null, 2);
}

async function updateLastSyncDisplay(cacheKey) {
  try {
    const record = await apiCacheDB.getApiResponse(cacheKey);
    if (record) {
      const date = new Date(record.timestamp);
      lastSyncTimeText.textContent = date.toLocaleTimeString();
      syncStoreSubtext.textContent = `Guardado: ${date.toLocaleDateString()}`;
    } else {
      lastSyncTimeText.textContent = 'Sin registro';
      syncStoreSubtext.textContent = 'Store: api_cache vacío';
    }
  } catch (e) {
    lastSyncTimeText.textContent = 'Error consulta';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// ==========================================
// 4. Cache Clearing & Utilities
// ==========================================
btnClearCache.addEventListener('click', async () => {
  const endpointKey = apiEndpointSelect.value;
  const config = ENDPOINTS[endpointKey];

  await apiCacheDB.clearApiCache(config.cacheKey);
  alert(`Caché local de IndexedDB para '${config.label}' ha sido limpiada.`);
  updateLastSyncDisplay(config.cacheKey);
});

btnCopyJson.addEventListener('click', async () => {
  if (!currentPayload) {
    alert('No hay JSON disponible para copiar.');
    return;
  }
  await navigator.clipboard.writeText(JSON.stringify(currentPayload, null, 2));
  const oldText = btnCopyJson.textContent;
  btnCopyJson.textContent = '✅ Copiado';
  setTimeout(() => { btnCopyJson.textContent = oldText; }, 1800);
});

btnFetchData.addEventListener('click', executeNetworkFirst);
apiEndpointSelect.addEventListener('change', () => {
  const config = ENDPOINTS[apiEndpointSelect.value];
  updateLastSyncDisplay(config.cacheKey);
});

// Initialization
window.addEventListener('DOMContentLoaded', async () => {
  await apiCacheDB.init();
  registerServiceWorker();
  updateNetworkStatus();

  const config = ENDPOINTS[apiEndpointSelect.value];
  updateLastSyncDisplay(config.cacheKey);
});

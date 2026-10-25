/**
 * Ejercicio 4: Persistencia de Datos Asíncrona con IndexedDB
 * Autor: calavanda
 */

import { dbManager } from './db.js';

// DOM Elements
const recordForm = document.getElementById('recordForm');
const editRecordId = document.getElementById('editRecordId');
const recordTitle = document.getElementById('recordTitle');
const recordCategory = document.getElementById('recordCategory');
const recordPriority = document.getElementById('recordPriority');
const recordDescription = document.getElementById('recordDescription');

const formHeaderTitle = document.getElementById('formHeaderTitle');
const editModeBadge = document.getElementById('editModeBadge');
const btnSubmitRecord = document.getElementById('btnSubmitRecord');
const btnCancelEdit = document.getElementById('btnCancelEdit');

const searchInput = document.getElementById('searchInput');
const filterCategory = document.getElementById('filterCategory');
const recordsContainer = document.getElementById('recordsContainer');

const statTotalRecords = document.getElementById('statTotalRecords');
const statEstimatedSize = document.getElementById('statEstimatedSize');

const btnLoadSeed = document.getElementById('btnLoadSeed');
const btnExportJson = document.getElementById('btnExportJson');
const btnClearAll = document.getElementById('btnClearAll');

// State
let allRecords = [];

// ==========================================
// 1. Data Loading & Rendering
// ==========================================
async function refreshRecords() {
  try {
    allRecords = await dbManager.getAllRecords();
    statTotalRecords.textContent = allRecords.length;

    renderFilteredRecords();
    updateStorageEstimate();
  } catch (err) {
    console.error('Error al consultar registros de IndexedDB:', err);
    recordsContainer.innerHTML = `<div class="empty-state"><p style="color: #f87171;">Error al acceder a IndexedDB: ${err.message}</p></div>`;
  }
}

function renderFilteredRecords() {
  const query = searchInput.value.toLowerCase().trim();
  const selectedCat = filterCategory.value;

  const filtered = allRecords.filter(item => {
    const matchesQuery = item.titulo.toLowerCase().includes(query) || 
                         item.descripcion.toLowerCase().includes(query);
    const matchesCat = (selectedCat === 'all') || (item.categoria === selectedCat);
    return matchesQuery && matchesCat;
  });

  if (filtered.length === 0) {
    recordsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📂</div>
        <h3>No se encontraron registros</h3>
        <p>${allRecords.length === 0 ? 'La base de datos está vacía. Agrega uno o carga datos de muestra.' : 'Ningún registro coincide con los filtros de búsqueda.'}</p>
      </div>
    `;
    return;
  }

  recordsContainer.innerHTML = '';
  filtered.forEach(record => {
    const el = document.createElement('div');
    el.className = 'record-item';

    const priorityBadgeClass = 
      record.prioridad === 'Crítica' ? 'badge-rose' :
      record.prioridad === 'Alta' ? 'badge-amber' : 'badge-emerald';

    const dateFormatted = new Date(record.fecha).toLocaleString();

    el.innerHTML = `
      <div class="record-header-row">
        <div>
          <span class="record-id-tag">ID: #${record.id}</span>
          <h4 class="record-title-text">${escapeHtml(record.titulo)}</h4>
        </div>
        <div class="record-badges">
          <span class="badge ${priorityBadgeClass}">${record.prioridad}</span>
          <span class="badge badge-purple">${record.categoria}</span>
        </div>
      </div>
      <p class="record-desc">${escapeHtml(record.descripcion)}</p>
      <div class="record-footer-row">
        <span>🕒 ${dateFormatted}</span>
        <div class="record-actions">
          <button class="btn-icon" data-action="edit" data-id="${record.id}" title="Editar este registro">✏️ Editar</button>
          <button class="btn-icon delete" data-action="delete" data-id="${record.id}" title="Eliminar de IndexedDB">🗑️ Eliminar</button>
        </div>
      </div>
    `;

    recordsContainer.appendChild(el);
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text || '';
  return div.innerHTML;
}

// Storage estimate (Quota API)
async function updateStorageEstimate() {
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const usageKB = Math.round((estimate.usage || 0) / 1024);
      statEstimatedSize.textContent = `${usageKB} KB en uso`;
    } catch (e) {
      statEstimatedSize.textContent = `${allRecords.length * 0.4} KB aprox`;
    }
  } else {
    statEstimatedSize.textContent = `${allRecords.length * 0.4} KB aprox`;
  }
}

// ==========================================
// 2. Insert & Update Handling
// ==========================================
recordForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = editRecordId.value;
  const recordData = {
    titulo: recordTitle.value.trim(),
    categoria: recordCategory.value,
    prioridad: recordPriority.value,
    descripcion: recordDescription.value.trim()
  };

  try {
    if (id) {
      // Mode: Edit / Update
      await dbManager.updateRecord(id, recordData);
      cancelEditMode();
    } else {
      // Mode: Insert new record
      await dbManager.insertRecord(recordData);
      recordForm.reset();
    }
    await refreshRecords();
  } catch (err) {
    alert('Error al persistir en IndexedDB: ' + err.message);
  }
});

// Switch to Edit Mode
function startEditMode(record) {
  editRecordId.value = record.id;
  recordTitle.value = record.titulo;
  recordCategory.value = record.categoria;
  recordPriority.value = record.prioridad;
  recordDescription.value = record.descripcion;

  formHeaderTitle.textContent = `Editar Registro #${record.id}`;
  editModeBadge.style.display = 'inline-flex';
  btnSubmitRecord.textContent = '💾 Actualizar Registro';
  btnCancelEdit.style.display = 'inline-flex';

  window.scrollTo({ top: 180, behavior: 'smooth' });
}

function cancelEditMode() {
  editRecordId.value = '';
  recordForm.reset();
  formHeaderTitle.textContent = 'Nuevo Registro Local';
  editModeBadge.style.display = 'none';
  btnSubmitRecord.textContent = '💾 Guardar en IndexedDB';
  btnCancelEdit.style.display = 'none';
}

btnCancelEdit.addEventListener('click', cancelEditMode);

// ==========================================
// 3. Actions on Items (Edit, Delete)
// ==========================================
recordsContainer.addEventListener('click', async (e) => {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  const action = target.getAttribute('data-action');
  const id = Number(target.getAttribute('data-id'));

  if (action === 'delete') {
    if (confirm(`¿Deseas eliminar permanentemente el registro #${id} de IndexedDB?`)) {
      await dbManager.deleteRecord(id);
      await refreshRecords();
    }
  } else if (action === 'edit') {
    const item = allRecords.find(r => r.id === id);
    if (item) {
      startEditMode(item);
    }
  }
});

// ==========================================
// 4. Batch Operations (Seed, Export, Clear)
// ==========================================
const sampleSeedRecords = [
  {
    titulo: 'Calibración de Sensor de Geolocalización',
    categoria: 'Hardware',
    prioridad: 'Alta',
    descripcion: 'Verificación de coordenadas GPS de alta precisión con navigator.geolocation en exteriores.'
  },
  {
    titulo: 'Auditoría de Service Worker Offline',
    categoria: 'PWA',
    prioridad: 'Crítica',
    descripcion: 'Validación del Cache Storage precacheando recursos estáticos sin conexión a internet.'
  },
  {
    titulo: 'Prueba de Captura de Fotografía Móvil',
    categoria: 'Hardware',
    prioridad: 'Normal',
    descripcion: 'Snapshot de 1280x720 transferido exitosamente a un elemento HTML Canvas.'
  }
];

btnLoadSeed.addEventListener('click', async () => {
  for (const item of sampleSeedRecords) {
    await dbManager.insertRecord(item);
  }
  await refreshRecords();
});

btnExportJson.addEventListener('click', () => {
  if (allRecords.length === 0) {
    alert('No hay registros para exportar.');
    return;
  }

  const jsonStr = JSON.stringify(allRecords, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `portafolio-indexeddb-calavanda-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

btnClearAll.addEventListener('click', async () => {
  if (confirm('⚠️ ¿Estás seguro de que deseas eliminar TODOS los registros del Object Store?')) {
    await dbManager.clearAll();
    cancelEditMode();
    await refreshRecords();
  }
});

// Search & Filter listeners
searchInput.addEventListener('input', renderFilteredRecords);
filterCategory.addEventListener('change', renderFilteredRecords);

// Initialization
window.addEventListener('DOMContentLoaded', async () => {
  await dbManager.init();
  await refreshRecords();
});

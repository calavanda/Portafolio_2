/**
 * Módulo IndexedDB para Almacenamiento Dinámico de Caché de API
 * Base de Datos: PortafolioPWA_DB
 * Store: api_cache
 * Autor: calavanda
 */

const DB_NAME = 'PortafolioPWA_DB';
const DB_VERSION = 2; // Incremented for api_cache store
const STORE_NAME = 'api_cache';

class ApiCacheDB {
  constructor() {
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log(`[IndexedDB Cache] Actualizando esquema a v${DB_VERSION}`);

        // Maintain registros store from Ejercicio 4 if present
        if (!db.objectStoreNames.contains('registros')) {
          const store = db.createObjectStore('registros', { keyPath: 'id', autoIncrement: true });
          store.createIndex('by_titulo', 'titulo');
          store.createIndex('by_categoria', 'categoria');
          store.createIndex('by_fecha', 'fecha');
        }

        // Create api_cache store for Ejercicio 5
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          console.log(`[IndexedDB Cache] Object Store '${STORE_NAME}' creado.`);
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject(event.target.error);
      };
    });
  }

  /**
   * Guarda una respuesta JSON de la API en IndexedDB
   */
  async saveApiResponse(key, data, url) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const record = {
        key: key,
        data: data,
        url: url,
        timestamp: Date.now(),
        dateFormatted: new Date().toLocaleString()
      };

      const request = store.put(record);
      request.onsuccess = () => resolve(record);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Recupera el último JSON almacenado en caso de fallback offline
   */
  async getApiResponse(key) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Limpia la caché local de API en IndexedDB
   */
  async clearApiCache(key = null) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = key ? store.delete(key) : store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  }
}

export const apiCacheDB = new ApiCacheDB();

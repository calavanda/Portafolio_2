/**
 * Módulo de Persistencia Asíncrona con IndexedDB Nativo
 * Base de Datos: PortafolioPWA_DB
 * Store: registros
 * Autor: calavanda
 */

const DB_NAME = 'PortafolioPWA_DB';
const DB_VERSION = 1;
const STORE_NAME = 'registros';

class IndexedDBManager {
  constructor() {
    this.db = null;
  }

  /**
   * Abre o crea la base de datos y define los Object Stores e Índices
   */
  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      // Migraciones / Creación de estructura inicial
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log(`[IndexedDB] Creando o actualizando estructura de base de datos a versión ${DB_VERSION}`);

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true
          });

          // Índices para consultas eficientes
          store.createIndex('by_titulo', 'titulo', { unique: false });
          store.createIndex('by_categoria', 'categoria', { unique: false });
          store.createIndex('by_fecha', 'fecha', { unique: false });
          console.log(`[IndexedDB] Object Store '${STORE_NAME}' creado exitosamente.`);
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log(`[IndexedDB] Base de datos '${DB_NAME}' abierta correctamente.`);
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('[IndexedDB] Error al abrir base de datos:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Inserta un nuevo registro en el Object Store
   */
  async insertRecord(record) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const recordWithTimestamp = {
        ...record,
        fecha: record.fecha || new Date().toISOString()
      };

      const request = store.add(recordWithTimestamp);

      request.onsuccess = (e) => {
        resolve({ id: e.target.result, ...recordWithTimestamp });
      };

      request.onerror = (e) => {
        reject(e.target.error);
      };
    });
  }

  /**
   * Obtiene todos los registros guardados
   */
  async getAllRecords() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        // Retornar ordenados de más reciente a más antiguo
        const results = request.result || [];
        results.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        resolve(results);
      };

      request.onerror = (e) => {
        reject(e.target.error);
      };
    });
  }

  /**
   * Actualiza un registro existente por su ID
   */
  async updateRecord(id, updatedFields) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const getReq = store.get(Number(id));
      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (!existing) {
          reject(new Error(`Registro con ID ${id} no encontrado.`));
          return;
        }

        const merged = { ...existing, ...updatedFields, id: Number(id) };
        const putReq = store.put(merged);

        putReq.onsuccess = () => resolve(merged);
        putReq.onerror = (e) => reject(e.target.error);
      };

      getReq.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Elimina un registro por su ID
   */
  async deleteRecord(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(Number(id));

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Elimina todos los registros de la colección
   */
  async clearAll() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Cuenta total de elementos
   */
  async count() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }
}

// Export singleton instance
export const dbManager = new IndexedDBManager();

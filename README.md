# Portafolio PWA Avanzado — 5 Ejercicios Prácticos

**Autor:** `calavanda`  
**Tecnologías:** HTML5, CSS3 Moderno (Vanilla CSS), JavaScript ES Modules, Service Workers, Permissions API, Geolocation API, MediaDevices (getUserMedia), HTML5 Canvas, Notifications API, IndexedDB Nativo, Cache Storage API, Leaflet.js.

---

## 📁 Estructura del Proyecto

Cada ejercicio se encuentra organizado de forma **autónoma e independiente** dentro de su propia carpeta, cumpliendo estrictamente con el requerimiento:

```text
Portafolio2/
│
├── Ejercicio_1/                 # Ejercicio 1: Permisos y Geolocalización
│   ├── index.html               # Interfaz interactiva y visor de mapa Leaflet
│   ├── styles.css               # Estilos específicos del ejercicio
│   └── app.js                  # navigator.permissions.query + navigator.geolocation
│
├── Ejercicio_2/                 # Ejercicio 2: Captura de Medios con Cámara
│   ├── index.html               # Visor en directo <video> y snapshot en <canvas>
│   ├── styles.css               # Estilos de cámara, shutter flash y galería
│   └── app.js                  # navigator.mediaDevices.getUserMedia + Canvas 2D
│
├── Ejercicio_3/                 # Ejercicio 3: Notificaciones Push Locales
│   ├── index.html               # Interfaz de solicitud y constructor de notificaciones
│   ├── styles.css               # Mockup del sistema operativo e historial
│   ├── sw.js                    # Service Worker con registro y notificationclick
│   └── app.js                  # Notification.requestPermission + SW showNotification
│
├── Ejercicio_4/                 # Ejercicio 4: Persistencia Asíncrona con IndexedDB
│   ├── index.html               # Interfaz CRUD offline, búsqueda y filtros reactivos
│   ├── styles.css               # Estilos de tarjetas de registros y panel de almacenamiento
│   ├── db.js                    # Wrapper transaccional nativo (Object Store 'registros')
│   └── app.js                  # Lógica de inserción, consulta, edición y eliminación
│
├── Ejercicio_5/                 # Ejercicio 5: Caché Dinámica Network-First & Fallback
│   ├── index.html               # Consola con selector de API y visor de payload JSON
│   ├── styles.css               # Estilos de estados de red, latencia y badges
│   ├── db.js                    # Object Store 'api_cache' para respuestas JSON
│   ├── sw.js                    # Service Worker con estrategia Network-First
│   └── app.js                  # Fetch remoto, guardado en IndexedDB y fallback offline
│
├── common/
│   └── design-system.css        # Tokens de diseño compartidos (modo oscuro premium)
│
├── icons/
│   ├── icon.svg                 # Icono vectorial de la PWA
│   └── badge.svg                # Icono monocromático para notificaciones
│
├── index.html                   # Hub central del portafolio con diagnóstico en vivo
├── manifest.webmanifest         # Manifiesto PWA para instalación standalone
├── package.json                 # Scripts de arranque y autor: calavanda
├── server.mjs                   # Servidor HTTP nativo Node.js con MIME types PWA
└── sw.js                        # Service Worker raíz
```

---

## 🚀 Cómo Ejecutar el Proyecto Localmente

1. Abre una terminal en la raíz del proyecto (`d:\Projects\Guillermo\Portafolio2`).
2. Ejecuta el servidor local:
   ```bash
   npm run dev
   # o bien:
   node server.mjs
   ```
3. Abre tu navegador web en:
   **[http://localhost:8080](http://localhost:8080)**

---

## 📋 Especificaciones Cumplidas por Ejercicio

### 📍 Ejercicio 1: Consulta de Permisos y Geolocalización
- [x] Verificación del estado de permisos con `navigator.permissions.query({ name: 'geolocation' })`.
- [x] Detección reactiva de cambios de permiso mediante `permissionStatus.onchange`.
- [x] Solicitud de coordenadas con `navigator.geolocation.getCurrentPosition` (con alta precisión satelital).
- [x] Modo de monitoreo continuo en vivo con `navigator.geolocation.watchPosition`.
- [x] Despliegue de métricas: Latitud, Longitud, Precisión en metros, Altitud, Rumbo y Timestamp.
- [x] Mapa interactivo renderizado con **Leaflet.js** y OpenStreetMap, con marcador de ubicación y radio de precisión.

### 📷 Ejercicio 2: Captura de Medios con Cámara Web/Móvil
- [x] Detección y enumeración de hardware de video con `navigator.mediaDevices.enumerateDevices()`.
- [x] Acceso al flujo de video mediante `navigator.mediaDevices.getUserMedia`.
- [x] Renderizado continuo en vivo en elemento HTML `<video autoplay playsinline muted>`.
- [x] Captura de instantáneas estáticas en un elemento HTML `<canvas>` con resolución nativa.
- [x] Soporte para alternar cámaras (frontal / trasera con `facingMode`), apagar stream y liberar tracks de hardware.
- [x] Efecto de sonido y flash óptico, filtros CSS en tiempo real, descarga de fotografía en PNG y galería de capturas.

### 🔔 Ejercicio 3: Notificaciones Push Locales desde el Service Worker
- [x] Solicitud explícita de permisos con `Notification.requestPermission()`.
- [x] Verificación del estado: `default`, `granted` o `denied` con avisos de configuración.
- [x] Registro y control inmediato del Service Worker (`self.skipWaiting()`, `clients.claim()`).
- [x] Disparo de notificaciones locales a través de `self.registration.showNotification(title, options)`.
- [x] Opciones avanzadas: patrón de vibración (`vibrate: [200, 100, 200]`), icono, badge, tag, acciones y temporizador con cuenta regresiva.
- [x] Manejo de eventos `notificationclick` en `sw.js` para enfocar la pestaña activa.

### 🗄️ Ejercicio 4: Persistencia de Datos Asíncrona con IndexedDB
- [x] Apertura y creación de base de datos (`PortafolioPWA_DB`) y Object Store (`registros`) con JavaScript nativo.
- [x] Clave primaria auto-incremental (`keyPath: 'id'`, `autoIncrement: true`).
- [x] Índices para consultas eficientes: `by_titulo`, `by_categoria` y `by_fecha`.
- [x] Interfaz CRUD completa: insertar registros, consultar/listar, editar y eliminar sin internet.
- [x] Filtro de texto y categoría en tiempo real, cálculo de almacenamiento estimado (`navigator.storage.estimate`), carga de datos muestra y exportación a JSON.

### 🔄 Ejercicio 5: Estrategia de Caché Dinámica con Fallback a IndexedDB / Network-First
- [x] Consumo de APIs REST remotas mediante `fetch` (DummyJSON y JSONPlaceholder).
- [x] **Estrategia Network-First**: Intento prioritario por red; al recibir el JSON exitoso, almacena una copia local en IndexedDB (Object Store `api_cache`) y en Cache API.
- [x] **Fallback Automático**: Si el dispositivo pierde la conexión o la petición falla, captura el error y recupera de forma transparente el último JSON almacenado en IndexedDB.
- [x] Simulador de desconexión interactivo para probar el fallback sin desconectar el Wi-Fi físico.
- [x] Indicador visual de origen de datos: `Red en Vivo (Online)` vs `Fallback a IndexedDB (Offline)`, latencia y visor de JSON.

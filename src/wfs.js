/**
 * wfs.js — Fetcher WFS genérico con caché en IndexedDB y reintentos
 *
 * Soporta múltiples servidores WFS — la URL base se pasa como parámetro
 * en cada llamada, leída de window.SOURCES según la fuente de cada capa.
 *
 * Caché en IndexedDB (no localStorage) — sin límite de tamaño práctico,
 * permite cachear capas pesadas como ign:provincia (106MB).
 *
 * Estrategia de caché:
 *   - TTL: 24 horas
 *   - Clave: hash(wfsBase) + typename + hash(cqlFilter)
 *   - Si el WFS falla, intenta devolver la caché aunque esté vencida
 *   - Deduplicación: dos requests simultáneos a la misma capa comparten la Promise
 *
 * Reintentos:
 *   - Hasta 3 intentos con backoff exponencial (2s, 4s, 8s)
 *   - Timeout por intento: 45s
 */

window.WFS = (() => {

  const CACHE_TTL    = 24 * 60 * 60 * 1000;
  const DB_NAME      = 'sm_wfs_cache';
  const DB_VERSION   = 1;
  const STORE_NAME   = 'layers';
  const MAX_RETRIES  = 3;
  const TIMEOUT_MS   = 45000;

  // ── IndexedDB ─────────────────────────────────────────────────

  let _db = null;

  function openDB() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      req.onsuccess = e => { _db = e.target.result; resolve(_db); };
      req.onerror   = e => reject(e.target.error);
    });
  }

  async function cacheGet(key) {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx  = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(key);
        req.onsuccess = e => {
          const record = e.target.result;
          if (!record) return resolve(null);
          if (Date.now() - record.ts > CACHE_TTL) return resolve({ stale: true, data: record.data });
          resolve({ stale: false, data: record.data });
        };
        req.onerror = () => resolve(null);
      });
    } catch { return null; }
  }

  async function cacheSet(key, data) {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx  = db.transaction(STORE_NAME, 'readwrite');
        const req = tx.objectStore(STORE_NAME).put({ key, ts: Date.now(), data });
        req.onsuccess = () => resolve(true);
        req.onerror   = () => resolve(false);
      });
    } catch { return false; }
  }

  async function clearAllCache() {
    try {
      const db = await openDB();
      return new Promise((resolve) => {
        const tx  = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve(true);
        tx.onerror    = () => resolve(false);
      });
    } catch { return false; }
  }

  // ── Hash djb2 ─────────────────────────────────────────────────

  function hashStr(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h) ^ str.charCodeAt(i);
      h = h >>> 0;
    }
    return h.toString(36);
  }

  function cacheKey(wfsBase, typename, cqlFilter) {
    const serverHash = hashStr(wfsBase);
    const filterPart = cqlFilter ? '_' + hashStr(cqlFilter) : '';
    return `${serverHash}_${typename.replace(':', '_')}${filterPart}`;
  }

  // ── Constructor de URL WFS ────────────────────────────────────

  function buildUrl(wfsBase, typename, wfsVersion, cqlFilter, maxFeatures, bbox) {
    const params = new URLSearchParams({
      service:      'WFS',
      version:      wfsVersion || '1.1.0',
      request:      'GetFeature',
      typename,
      outputFormat: 'application/json',
      srsName:      'EPSG:4326'
    });
    if (maxFeatures) params.set('maxFeatures', maxFeatures);
    if (cqlFilter)   params.set('CQL_FILTER', cqlFilter);
    // bbox como parámetro nativo WFS — más compatible que BBOX() en CQL
    if (bbox)        params.set('bbox', `${bbox.minX},${bbox.minY},${bbox.maxX},${bbox.maxY},EPSG:4326`);
    return `${wfsBase}?${params.toString()}`;
  }

  // ── Fetch con reintentos ──────────────────────────────────────

  async function fetchConReintentos(url, intento = 1) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (resp.status === 503 || resp.status === 502) throw new Error(`HTTP ${resp.status}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status} (sin reintentos)`);
      const geojson = await resp.json();
      if (!geojson.features) throw new Error('Respuesta WFS inválida');
      return geojson;
    } catch (err) {
      if (err.message.includes('sin reintentos')) throw err;
      if (intento < MAX_RETRIES) {
        const espera = Math.pow(2, intento) * 1000;
        console.warn(`[WFS] Intento ${intento} falló (${err.message}). Reintentando en ${espera/1000}s...`);
        await new Promise(r => setTimeout(r, espera));
        return fetchConReintentos(url, intento + 1);
      }
      throw err;
    }
  }

  // ── Deduplicación de requests en vuelo ───────────────────────
  const _inFlight = new Map();

  // ── Fetch principal ───────────────────────────────────────────

  async function fetchLayer(typename, options = {}) {
    const {
      wfsBase,
      wfsVersion   = '1.1.0',
      cqlFilter,
      maxFeatures,
      bbox,
      forceRefresh
    } = options;

    if (!wfsBase) throw new Error(`[WFS] wfsBase requerido para "${typename}". Verificá que la capa tenga "source" y que esté definido en window.SOURCES.`);

    const bboxStr = bbox ? `${bbox.minX},${bbox.minY},${bbox.maxX},${bbox.maxY}` : '';
    const key = cacheKey(wfsBase, typename, (cqlFilter || '') + bboxStr);

    // 1. Caché fresca en IndexedDB
    if (!forceRefresh) {
      const cached = await cacheGet(key);
      if (cached && !cached.stale) {
        console.log(`[WFS] Caché fresca: ${typename}`);
        return cached.data;
      }
    }

    // 2. Si ya hay un fetch en vuelo para esta clave, reutilizarlo
    if (_inFlight.has(key)) {
      console.log(`[WFS] Reutilizando fetch en vuelo: ${typename}`);
      return _inFlight.get(key);
    }

    // 3. Fetch con reintentos
    const url = buildUrl(wfsBase, typename, wfsVersion, cqlFilter, maxFeatures, bbox);
    console.log(`[WFS] Fetching: ${typename}${cqlFilter ? ' | ' + cqlFilter : ''}${bbox ? ' | bbox' : ''} (${wfsBase})`);

    const fetchPromise = fetchConReintentos(url)
      .then(async geojson => {
        await cacheSet(key, geojson);
        console.log(`[WFS] OK: ${typename} → ${geojson.features.length} features`);
        return geojson;
      })
      .catch(async err => {
        console.warn(`[WFS] Todos los intentos fallaron para ${typename}: ${err.message}`);
        const stale = await cacheGet(key);
        if (stale) {
          console.warn(`[WFS] Usando caché vencida para ${typename}`);
          window.TOAST?.warning('Sin conexión, usando caché.');
          return stale.data;
        }
        throw new Error(`No se pudo obtener "${typename}" (${err.message}). El servidor puede estar caído, intentá en unos minutos.`);
      })
      .finally(() => {
        _inFlight.delete(key);
      });

    _inFlight.set(key, fetchPromise);
    return fetchPromise;
  }

  // ── API pública ───────────────────────────────────────────────

  return {
    fetch: fetchLayer,
    filterEqual: (campo, valor) => `${campo}='${valor.replace(/'/g, "''")}'`,
    clearCache: async () => {
      await clearAllCache();
      console.log('[WFS] Caché IndexedDB limpiada');
    }
  };

})();

/**
 * wfs.js — Fetcher WFS genérico con caché en localStorage y reintentos
 *
 * Soporta múltiples servidores WFS — la URL base se pasa como parámetro
 * en cada llamada, leída de window.SOURCES según la fuente de cada capa.
 *
 * Estrategia de caché:
 *   - TTL por defecto: 24 horas
 *   - Clave: wfsBase + typename + filtro CQL
 *   - Si el WFS falla, intenta devolver la caché aunque esté vencida
 *
 * Reintentos:
 *   - Hasta 3 intentos con backoff exponencial (2s, 4s, 8s)
 *   - Timeout por intento: 45s (capas pesadas como area_protegida lo necesitan)
 */

window.WFS = (() => {

  const CACHE_TTL       = 24 * 60 * 60 * 1000; // 24 h en ms
  const CACHE_PREFIX    = 'sm_wfs_';
  const MAX_RETRIES     = 3;
  const TIMEOUT_MS      = 45000;
  const CACHE_MAX_BYTES = 8 * 1024 * 1024;

  // ── Helpers de caché ──────────────────────────────────────────

  // Hash djb2: clave única y estable para typename + filtro + servidor
  function hashFilter(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h) ^ str.charCodeAt(i);
      h = h >>> 0;
    }
    return h.toString(36);
  }

  function cacheKey(wfsBase, typename, cqlFilter) {
    // Incluir el servidor en la clave para que distintos WFS no colisionen
    const serverHash = hashFilter(wfsBase);
    const filterPart = cqlFilter ? '_' + hashFilter(cqlFilter) : '';
    return CACHE_PREFIX + serverHash + '_' + typename.replace(':', '_') + filterPart;
  }

  function cacheGet(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL) return { stale: true, data };
      return { stale: false, data };
    } catch { return null; }
  }

  function cacheSet(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
    } catch {
      cleanOldCache();
      try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch {}
    }
  }

  function cleanOldCache() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));

    keys.forEach(k => {
      try {
        const { ts } = JSON.parse(localStorage.getItem(k));
        if (Date.now() - ts > CACHE_TTL) localStorage.removeItem(k);
      } catch { localStorage.removeItem(k); }
    });

    const remaining = Object.keys(localStorage)
      .filter(k => k.startsWith(CACHE_PREFIX))
      .map(k => {
        try { return { k, ts: JSON.parse(localStorage.getItem(k)).ts, size: localStorage.getItem(k).length }; }
        catch { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => a.ts - b.ts);

    let totalBytes = remaining.reduce((acc, e) => acc + e.size, 0);
    for (const entry of remaining) {
      if (totalBytes <= CACHE_MAX_BYTES) break;
      localStorage.removeItem(entry.k);
      totalBytes -= entry.size;
    }
  }

  // ── Constructor de URL WFS ────────────────────────────────────

  function buildUrl(wfsBase, typename, wfsVersion, cqlFilter, maxFeatures) {
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
    return `${wfsBase}?${params.toString()}`;
  }

  // ── Fetch con reintentos ──────────────────────────────────────

  async function fetchConReintentos(url, intento = 1) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });

      if (resp.status === 503 || resp.status === 502) {
        throw new Error(`HTTP ${resp.status}`);
      }
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

  // ── Fetch principal ───────────────────────────────────────────

  /**
   * fetch(typename, options)
   * options:
   *   wfsBase      {string}  URL base del servidor WFS — requerido, viene de window.SOURCES
   *   wfsVersion   {string}  versión del protocolo WFS (default: '1.1.0')
   *   cqlFilter    {string}  filtro CQL
   *   maxFeatures  {number}  límite de features
   *   forceRefresh {boolean} ignorar caché
   */
  async function fetchLayer(typename, options = {}) {
    const {
      wfsBase,
      wfsVersion   = '1.1.0',
      cqlFilter,
      maxFeatures,
      forceRefresh
    } = options;

    if (!wfsBase) throw new Error(`[WFS] wfsBase requerido para "${typename}". Verificá que la capa tenga "source" y que esté definido en window.SOURCES.`);

    const key = cacheKey(wfsBase, typename, cqlFilter);

    // 1. Caché fresca
    if (!forceRefresh) {
      const cached = cacheGet(key);
      if (cached && !cached.stale) {
        console.log(`[WFS] Caché fresca: ${typename}`);
        return cached.data;
      }
    }

    // 2. Fetch con reintentos
    const url = buildUrl(wfsBase, typename, wfsVersion, cqlFilter, maxFeatures);
    console.log(`[WFS] Fetching: ${typename}${cqlFilter ? ' | ' + cqlFilter : ''} (${wfsBase})`);

    try {
      const geojson = await fetchConReintentos(url);
      cacheSet(key, geojson);
      console.log(`[WFS] OK: ${typename} → ${geojson.features.length} features`);
      return geojson;

    } catch (err) {
      console.warn(`[WFS] Todos los intentos fallaron para ${typename}: ${err.message}`);

      // 3. Fallback: caché vencida
      const stale = cacheGet(key);
      if (stale) {
        console.warn(`[WFS] Usando caché vencida para ${typename}`);
        window.TOAST?.warning('Sin conexión, usando caché.');
        return stale.data;
      }

      throw new Error(`No se pudo obtener "${typename}" (${err.message}). El servidor puede estar caído, intentá en unos minutos.`);
    }
  }

  // ── API pública ───────────────────────────────────────────────

  return {
    fetch: fetchLayer,
    filterEqual: (campo, valor) => `${campo}='${valor.replace(/'/g, "''")}'`,
    clearCache: () => {
      Object.keys(localStorage)
        .filter(k => k.startsWith(CACHE_PREFIX))
        .forEach(k => localStorage.removeItem(k));
      console.log('[WFS] Caché limpiada');
    }
  };

})();

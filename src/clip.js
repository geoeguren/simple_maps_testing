/**
 * clip.js — Ejecutor de instrucciones WFS
 *
 * Recibe una instrucción { layerKey, filtro, descripcion } ya armada por Gemini
 * y devuelve un GeoJSON listo para renderizar.
 *
 * Estrategias de recorte (definidas en layers.js):
 *   null        → fetch directo con filtro CQL (o sin filtro)
 *   'attribute' → filtro CQL (ya viene en inst.filtro, se usa tal cual)
 *   'spatial'   → el filtro CQL puede venir vacío o parcial;
 *                 si además hay una provincia en el filtro, se hace recorte espacial
 *
 * Para capas con clipStrategy:'spatial', si el filtro incluye una provincia
 * extraemos el polígono provincial y recortamos geométricamente.
 * Si no hay provincia en el filtro, se usa el filtro CQL puro (más rápido).
 */

window.CLIP = (() => {

  const EDGE_FN_URL = '/api/clip';

  /**
   * ejecutar(instruccion)
   * instruccion: { layerKey, filtro, descripcion }
   * Devuelve GeoJSON FeatureCollection
   */
  async function ejecutar(instruccion) {
    const { layerKey, filtro } = instruccion;
    const layerDef = window.LAYERS[layerKey];
    if (!layerDef) throw new Error(`Capa desconocida: ${layerKey}`);

    const cqlFilter = (filtro || '').trim();

    // ── Capas con recorte espacial ────────────────────────────
    if (layerDef.clipStrategy === 'spatial') {
      // Intentar extraer provincia del filtro CQL para recorte geométrico
      const provincia = extraerProvinciaDelFiltro(cqlFilter);

      if (provincia) {
        // Recorte espacial: bbox con el polígono de la provincia
        const provFilter  = `strToLowerCase(nam)='${normalizar(provincia)}'`;
        const provGeoJSON = await WFS.fetch('ign:provincia', { cqlFilter: provFilter });

        if (!provGeoJSON.features?.length) {
          throw new Error(`No se encontró la provincia: "${provincia}"`);
        }

        // Filtro sin la condición de provincia (para no duplicar)
        const filtroSinProv = removerCondicionProvincia(cqlFilter);
        const layerGeoJSON  = await WFS.fetch(layerDef.typename, {
          cqlFilter: filtroSinProv || undefined
        });

        try {
          return await clipViaEdgeFunction(layerGeoJSON, provGeoJSON);
        } catch (edgeErr) {
          console.warn('[CLIP] Edge Function falló, usando Turf.js:', edgeErr.message);
          return clipWithTurf(layerGeoJSON, provGeoJSON);
        }
      }

      // Sin provincia → fetch directo con el filtro CQL tal cual
      return WFS.fetch(layerDef.typename, { cqlFilter: cqlFilter || undefined });
    }

    // ── Capas con filtro por atributo o sin estrategia ────────
    return WFS.fetch(layerDef.typename, { cqlFilter: cqlFilter || undefined });
  }

  // ── Edge Function ─────────────────────────────────────────────

  async function clipViaEdgeFunction(layerGeoJSON, maskGeoJSON) {
    const resp = await fetch(EDGE_FN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ layer: layerGeoJSON, mask: maskGeoJSON }),
      signal:  AbortSignal.timeout(25000)
    });
    if (!resp.ok) throw new Error(`Edge Function HTTP ${resp.status}`);
    return resp.json();
  }

  // ── Fallback Turf.js ──────────────────────────────────────────

  function clipWithTurf(layerGeoJSON, maskGeoJSON) {
    if (typeof turf === 'undefined') throw new Error('Turf.js no disponible');
    const mask    = maskGeoJSON.features[0];
    const clipped = [];

    layerGeoJSON.features.forEach(feat => {
      try {
        const geom = feat.geometry.type;
        if (geom === 'Point' || geom === 'MultiPoint') {
          if (turf.booleanPointInPolygon(feat, mask)) clipped.push(feat);
        } else if (geom === 'LineString' || geom === 'MultiLineString') {
          const inter = turf.bboxClip(feat, turf.bbox(mask));
          if (inter?.geometry?.coordinates?.length > 0)
            clipped.push({ ...inter, properties: feat.properties });
        } else if (geom === 'Polygon' || geom === 'MultiPolygon') {
          const inter = turf.intersect(feat, mask);
          if (inter) { inter.properties = feat.properties; clipped.push(inter); }
        }
      } catch {}
    });

    return { type: 'FeatureCollection', features: clipped };
  }

  // ── Helpers para analizar el filtro CQL ──────────────────────

  /**
   * Intenta extraer el nombre de provincia de un filtro CQL.
   * Busca patrones como: strToLowerCase(nam)='santa cruz'
   * o strToLowerCase(nom_pcia)='buenos aires'
   */
  function extraerProvinciaDelFiltro(cql) {
    if (!cql) return null;
    const camposProv = ['nam', 'nom_pcia', 'prov', 'provincia'];
    for (const campo of camposProv) {
      // Patrón: strToLowerCase(campo)='valor' o campo='valor'
      const re = new RegExp(
        `(?:strToLowerCase\\(${campo}\\)|${campo})\\s*(?:LIKE\\s*'%([^%']+)%'|=\\s*'([^']+)')`,
        'i'
      );
      const m = cql.match(re);
      if (m) return m[1] || m[2];
    }
    return null;
  }

  /**
   * Remueve la condición de provincia del CQL para evitar duplicar el filtro
   * cuando ya se hace recorte espacial.
   */
  function removerCondicionProvincia(cql) {
    if (!cql) return '';
    const camposProv = ['nam', 'nom_pcia', 'prov', 'provincia'];
    let result = cql;
    for (const campo of camposProv) {
      const re = new RegExp(
        `\\s*(?:AND\\s*)?(?:strToLowerCase\\(${campo}\\)|${campo})\\s*(?:LIKE\\s*'[^']*'|=\\s*'[^']*')\\s*(?:AND\\s*)?`,
        'gi'
      );
      result = result.replace(re, ' ');
    }
    return result.replace(/^\s*(AND|OR)\s*/i, '').replace(/\s*(AND|OR)\s*$/i, '').trim();
  }

  function normalizar(texto) {
    if (!texto) return '';
    return texto.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  return { ejecutar };

})();

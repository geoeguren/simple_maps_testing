/**
 * clip.js — Ejecutor de instrucciones WFS
 *
 * Recibe una instrucción { layerKey, filtro, descripcion } ya armada por el LLM
 * y devuelve un GeoJSON listo para renderizar.
 *
 * Lee la fuente de cada capa desde layerDef.source → window.SOURCES,
 * de modo que wfs.js no necesita saber a qué servidor apuntar.
 *
 * Estrategias de recorte (definidas en layers/):
 *   null        → fetch directo con filtro CQL (o sin filtro)
 *   'attribute' → filtro CQL (ya viene en inst.filtro, se usa tal cual)
 *   'spatial'   → si hay una unidad administrativa en el filtro, recorte geométrico;
 *                 si no, fetch directo
 */

window.CLIP = (() => {

  const EDGE_FN_URL = '/api/clip';

  /**
   * Resuelve la fuente de una capa desde window.SOURCES.
   * Retorna el objeto fuente o un fallback al IGN si no está definido.
   */
  function resolverFuente(layerDef) {
    const sourceKey = layerDef.source;
    const source    = sourceKey && window.SOURCES?.[sourceKey];
    if (!source) {
      throw new Error(`[CLIP] Fuente "${sourceKey}" no encontrada en window.SOURCES. Verificá que esté definida en layers/sources.js.`);
    }
    return source;
  }

  /**
   * ejecutar(instruccion)
   * instruccion: { layerKey, filtro, descripcion }
   * Devuelve GeoJSON FeatureCollection
   */
  async function ejecutar(instruccion) {
    const { layerKey, filtro } = instruccion;
    const layerDef = window.LAYERS[layerKey];
    if (!layerDef) throw new Error(`Capa desconocida: ${layerKey}`);

    const source    = resolverFuente(layerDef);
    const cqlFilter = (filtro || '').trim();

    // Opciones base para WFS.fetch — incluyen el servidor correcto para esta capa
    const wfsOpts = {
      wfsBase:    source.wfsBase,
      wfsVersion: source.wfsVersion || '1.1.0',
    };

    // ── Capas con recorte espacial ────────────────────────────
    if (layerDef.clipStrategy === 'spatial') {
      const provincia = extraerProvinciaDelFiltro(cqlFilter);

      if (provincia) {
        // Buscar el polígono de recorte usando la capa y campo definidos en la fuente
        const provFilter  = `strToLowerCase(${source.clipField})='${normalizar(provincia)}'`;
        const provGeoJSON = await window.WFS.fetch(source.clipLayer, {
          ...wfsOpts,
          cqlFilter: provFilter
        });

        if (!provGeoJSON.features?.length) {
          throw new Error(`No se encontró la unidad administrativa: "${provincia}"`);
        }

        const filtroSinProv = removerCondicionProvincia(cqlFilter);
        const layerGeoJSON  = await window.WFS.fetch(layerDef.typename, {
          ...wfsOpts,
          cqlFilter: filtroSinProv || undefined
        });

        try {
          return await clipViaEdgeFunction(layerGeoJSON, provGeoJSON);
        } catch (edgeErr) {
          console.warn('[CLIP] Edge Function falló, usando Turf.js:', edgeErr.message);
          return clipWithTurf(layerGeoJSON, provGeoJSON);
        }
      }

      // Sin provincia → fetch directo
      return window.WFS.fetch(layerDef.typename, {
        ...wfsOpts,
        cqlFilter: cqlFilter || undefined
      });
    }

    // ── Capas con filtro por atributo o sin estrategia ────────
    return window.WFS.fetch(layerDef.typename, {
      ...wfsOpts,
      cqlFilter: cqlFilter || undefined
    });
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

  function extraerProvinciaDelFiltro(cql) {
    if (!cql) return null;
    const camposProv = ['nam', 'nom_pcia', 'prov', 'provincia'];
    for (const campo of camposProv) {
      const re = new RegExp(
        `(?:strToLowerCase\\(${campo}\\)|${campo})\\s*(?:LIKE\\s*'%([^%']+)%'|=\\s*'([^']+)')`,
        'i'
      );
      const m = cql.match(re);
      if (m) return m[1] || m[2];
    }
    return null;
  }

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

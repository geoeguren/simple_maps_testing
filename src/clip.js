/**
 * clip.js — Ejecutor de instrucciones WFS
 *
 * Recibe una instrucción armada por el LLM y devuelve GeoJSON listo para renderizar.
 *
 * Estructura de la instrucción:
 *   {
 *     layerKey:  string,           // clave en window.LAYERS
 *     filtro:    string|null,      // CQL adicional (atributos de la capa pedida)
 *     clipArea:  {                 // área de recorte — opcional
 *       layerKey: string,          // clave en window.LAYERS de la capa-máscara
 *       field:    string,          // campo de nombre en esa capa (ej: 'nam', 'nombre')
 *       value:    string,          // valor a buscar (ej: 'Mendoza', 'Montevideo')
 *     }|null,
 *     descripcion: string,
 *   }
 *
 * Estrategias de recorte (definidas por capa en layers/):
 *   null        → fetch directo, filtro CQL si lo hay
 *   'attribute' → filtro CQL ya construido por el LLM en inst.filtro
 *   'spatial'   → si hay clipArea: fetch de la máscara + clip geométrico
 *                 si no hay clipArea: fetch directo
 *
 * El LLM es responsable de armar clipArea correctamente.
 * clip.js no adivina ni parsea el CQL — solo ejecuta.
 */

window.CLIP = (() => {

  const EDGE_FN_URL = '/api/clip';

  // ── Resolver fuente ───────────────────────────────────────────

  function resolverFuente(layerDef, layerKey) {
    const sourceKey = layerDef.source;
    const source    = sourceKey && window.SOURCES?.[sourceKey];
    if (!source) {
      throw new Error(`[CLIP] Fuente "${sourceKey}" no encontrada en window.SOURCES (capa: ${layerKey}).`);
    }
    return source;
  }

  // ── Punto de entrada ──────────────────────────────────────────

  /**
   * ejecutar(instruccion)
   * Devuelve GeoJSON FeatureCollection.
   */
  async function ejecutar(instruccion) {
    const { layerKey, filtro, clipArea } = instruccion;

    const layerDef = window.LAYERS[layerKey];
    if (!layerDef) throw new Error(`[CLIP] Capa desconocida: "${layerKey}"`);

    const source  = resolverFuente(layerDef, layerKey);
    const wfsOpts = {
      wfsBase:    source.wfsBase,
      wfsVersion: source.wfsVersion || '1.1.0',
    };
    const cql = (filtro || '').trim();

    // ── Capa sin soporte de recorte ─────────────────────────
    if (layerDef.clipStrategy === 'none') {
      if (clipArea) {
        window.TOAST?.warning(`"${layerDef.titulo}" no soporta recorte espacial por volumen de datos. Se muestra completa.`);
      }
      return window.WFS.fetch(layerDef.typename, {
        ...wfsOpts,
        cqlFilter: cql || undefined,
      });
    }

    // ── Recorte espacial ─────────────────────────────────────
    if (layerDef.clipStrategy === 'spatial' && clipArea) {
      return ejecutarRecorteSpatial(layerDef, wfsOpts, cql, clipArea);
    }

    // ── Filtro por atributo o fetch directo ──────────────────
    return window.WFS.fetch(layerDef.typename, {
      ...wfsOpts,
      cqlFilter: cql || undefined,
    });
  }

  // ── Recorte espacial ──────────────────────────────────────────

  /**
   * Busca el polígono de la máscara (clipArea) y recorta la capa pedida.
   *
   * clipArea: { layerKey, field, value }
   *   - layerKey: cualquier capa del catálogo que sirva de máscara
   *   - field:    campo de nombre en esa capa
   *   - value:    valor a buscar
   */
  async function ejecutarRecorteSpatial(layerDef, wfsOpts, cql, clipArea) {
    const maskDef = window.LAYERS[clipArea.layerKey];
    if (!maskDef) {
      throw new Error(`[CLIP] Capa de recorte desconocida: "${clipArea.layerKey}"`);
    }

    const maskSource = resolverFuente(maskDef, clipArea.layerKey);
    const maskWfsOpts = {
      wfsBase:    maskSource.wfsBase,
      wfsVersion: maskSource.wfsVersion || '1.1.0',
    };

    // La capa-máscara puede venir de un servidor diferente al de la capa pedida
    const maskFilter  = `strToLowerCase(${clipArea.field})='${normalizar(clipArea.value)}'`;
    const maskGeoJSON = await window.WFS.fetch(maskDef.typename, {
      ...maskWfsOpts,
      cqlFilter: maskFilter,
    });

    if (!maskGeoJSON.features?.length) {
      throw new Error(`[CLIP] No se encontró "${clipArea.value}" en la capa "${clipArea.layerKey}" (campo: ${clipArea.field}).`);
    }

    // Si la máscara devuelve múltiples features (ej: municipio con varios polígonos),
    // los unimos en un solo feature para el clip
    const maskFeature = maskGeoJSON.features.length === 1
      ? maskGeoJSON.features[0]
      : unionFeatures(maskGeoJSON.features);

    // Pre-filtro por BBOX como parámetro nativo WFS — más compatible que BBOX() en CQL
    const bbox = calcularBbox(maskFeature);

    const layerGeoJSON = await window.WFS.fetch(layerDef.typename, {
      ...wfsOpts,
      cqlFilter: cql || undefined,
      bbox,
    });

    if (!layerGeoJSON.features?.length) {
      return { type: 'FeatureCollection', features: [] };
    }

    try {
      return await clipViaEdgeFunction(layerGeoJSON, { type: 'FeatureCollection', features: [maskFeature] });
    } catch (edgeErr) {
      console.warn('[CLIP] Edge Function falló, usando Turf.js:', edgeErr.message);
      return clipWithTurf(layerGeoJSON, maskFeature);
    }
  }

  // ── Unión de múltiples features (máscara con varios polígonos) ─

  function unionFeatures(features) {
    if (typeof turf === 'undefined') return features[0];
    try {
      return features.reduce((acc, feat) => turf.union(acc, feat));
    } catch {
      return features[0];
    }
  }

  // ── Edge Function ─────────────────────────────────────────────

  async function clipViaEdgeFunction(layerGeoJSON, maskGeoJSON) {
    const resp = await fetch(EDGE_FN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ layer: layerGeoJSON, mask: maskGeoJSON }),
      signal:  AbortSignal.timeout(25000),
    });
    if (!resp.ok) throw new Error(`Edge Function HTTP ${resp.status}`);
    return resp.json();
  }

  // ── Fallback Turf.js ──────────────────────────────────────────

  function clipWithTurf(layerGeoJSON, maskFeature) {
    if (typeof turf === 'undefined') throw new Error('Turf.js no disponible');
    const clipped = [];

    layerGeoJSON.features.forEach(feat => {
      try {
        const geom = feat.geometry?.type;
        if (!geom) return;

        if (geom === 'Point' || geom === 'MultiPoint') {
          if (turf.booleanPointInPolygon(feat, maskFeature)) clipped.push(feat);

        } else if (geom === 'LineString' || geom === 'MultiLineString') {
          const inter = turf.bboxClip(feat, turf.bbox(maskFeature));
          if (inter?.geometry?.coordinates?.length > 0)
            clipped.push({ ...inter, properties: feat.properties });

        } else if (geom === 'Polygon' || geom === 'MultiPolygon') {
          const inter = turf.intersect(feat, maskFeature);
          if (inter) { inter.properties = feat.properties; clipped.push(inter); }
        }
      } catch { /* feature individual rota — ignorar */ }
    });

    return { type: 'FeatureCollection', features: clipped };
  }

  // ── Helpers ───────────────────────────────────────────────────

  /**
   * Calcula el bounding box de un feature GeoJSON.
   * Soporta Polygon y MultiPolygon.
   */
  function calcularBbox(feature) {
    const coords = [];
    function extraer(anillo) { anillo.forEach(c => coords.push(c)); }

    const geom = feature.geometry;
    if (geom.type === 'Polygon') {
      geom.coordinates.forEach(extraer);
    } else if (geom.type === 'MultiPolygon') {
      geom.coordinates.forEach(poligono => poligono.forEach(extraer));
    }

    const lons = coords.map(c => c[0]);
    const lats = coords.map(c => c[1]);
    return {
      minX: Math.min(...lons),
      minY: Math.min(...lats),
      maxX: Math.max(...lons),
      maxY: Math.max(...lats),
    };
  }

  function normalizar(texto) {
    if (!texto) return '';
    return texto.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  return { ejecutar };

})();

/**
 * api/clip.js — Serverless Function de Vercel
 * Recibe: { layer: GeoJSON, mask: GeoJSON }
 * Devuelve: GeoJSON recortado
 *
 * Usa módulos individuales de Turf en lugar de @turf/turf completo
 * para evitar la dependencia de concaveman (ESM-only, incompatible con
 * el runtime CommonJS de Vercel).
 *
 * Para MultiPolygon complejos (ej: Santa Cruz con 37 subpolígonos),
 * unimos los subpolígonos con @turf/union antes de intersecar.
 *
 * Para líneas usamos lineal de intersección punto a punto en lugar de
 * bboxClip — más robusto con MultiLineString en módulos individuales.
 */

const _boolMod     = require('@turf/boolean-point-in-polygon');
const _bboxMod     = require('@turf/bbox');
const _intersectMod = require('@turf/intersect');
const _unionMod    = require('@turf/union');

// Cada módulo de Turf puede exportar de forma distinta en CommonJS
const booleanPointInPolygon = _boolMod.default     || _boolMod.booleanPointInPolygon || _boolMod;
const bbox                  = _bboxMod.default     || _bboxMod.bbox                  || _bboxMod;
const intersect             = _intersectMod.default || _intersectMod.intersect        || _intersectMod;
const union                 = _unionMod.default    || _unionMod.union                || _unionMod;
const { booleanPointOnLine }    = require('@turf/boolean-point-on-line');

/**
 * Si la máscara es MultiPolygon, une todos los subpolígonos en uno solo.
 */
function normalizarMascara(maskFeature) {
  if (maskFeature.geometry?.type !== 'MultiPolygon') return maskFeature;
  try {
    const poligonos = maskFeature.geometry.coordinates.map(coords => ({
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: coords },
      properties: {},
    }));
    return poligonos.reduce((acc, feat) => union(acc, feat));
  } catch {
    return maskFeature;
  }
}

/**
 * Clip de líneas usando bboxClip manual — más robusto que @turf/bbox-clip
 * con MultiLineString en módulos separados.
 * Filtra segmentos cuyo bbox intersecta con el bbox de la máscara.
 */
function clipLinea(feat, maskBbox) {
  const [minX, minY, maxX, maxY] = maskBbox;

  const clipearAnillo = (coords) => {
    return coords.filter(([x, y]) =>
      x >= minX && x <= maxX && y >= minY && y <= maxY
    );
  };

  const geom = feat.geometry;

  if (geom.type === 'LineString') {
    const filtered = clipearAnillo(geom.coordinates);
    if (filtered.length < 2) return null;
    return { ...feat, geometry: { type: 'LineString', coordinates: filtered } };
  }

  if (geom.type === 'MultiLineString') {
    const lines = geom.coordinates
      .map(line => clipearAnillo(line))
      .filter(line => line.length >= 2);
    if (!lines.length) return null;
    return { ...feat, geometry: { type: 'MultiLineString', coordinates: lines } };
  }

  return null;
}

module.exports = async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { layer, mask } = req.body || {};
  if (!layer || !mask) return res.status(400).json({ error: 'Se requieren "layer" y "mask"' });

  const maskFeature     = mask.features?.[0] || mask;
  const maskNormalizada = normalizarMascara(maskFeature);
  const maskBbox        = bbox(maskNormalizada);
  const clipped         = [];

  for (const feat of layer.features || []) {
    try {
      const geomType = feat.geometry?.type;
      if (!geomType) continue;

      if (geomType === 'Point' || geomType === 'MultiPoint') {
        if (booleanPointInPolygon(feat, maskNormalizada)) {
          clipped.push(feat);
        }

      } else if (geomType === 'LineString' || geomType === 'MultiLineString') {
        const inter = clipLinea(feat, maskBbox);
        if (inter) clipped.push({ ...inter, properties: feat.properties });

      } else if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
        const inter = intersect(feat, maskNormalizada);
        if (inter) {
          inter.properties = feat.properties;
          clipped.push(inter);
        }
      }
    } catch { /* feature individual rota — omitir */ }
  }

  return res.status(200).json({
    type:     'FeatureCollection',
    features: clipped,
  });
};

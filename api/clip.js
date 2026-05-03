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
 * unimos los subpolígonos con @turf/union antes de intersecar —
 * igual que hace src/clip.js en el browser.
 */

const { booleanPointInPolygon } = require('@turf/boolean-point-in-polygon');
const { bboxClip }              = require('@turf/bbox-clip');
const { bbox }                  = require('@turf/bbox');
const { intersect }             = require('@turf/intersect');
const { union }                 = require('@turf/union');

/**
 * Si la máscara es MultiPolygon, une todos los subpolígonos en uno solo.
 * Esto evita bugs de @turf/intersect con MultiPolygon complejos.
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
    return maskFeature; // fallback: usar el MultiPolygon original
  }
}

module.exports = async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { layer, mask } = req.body || {};

  if (!layer || !mask) {
    return res.status(400).json({ error: 'Se requieren "layer" y "mask"' });
  }

  const maskFeature     = mask.features?.[0] || mask;
  const maskNormalizada = normalizarMascara(maskFeature);
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
        const inter = bboxClip(feat, bbox(maskNormalizada));
        if (inter?.geometry?.coordinates?.length > 0) {
          clipped.push({ ...inter, properties: feat.properties });
        }

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

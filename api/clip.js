/**
 * api/clip.js — Serverless Function de Vercel
 * Recibe: { layer: GeoJSON, mask: GeoJSON }
 * Devuelve: GeoJSON recortado
 *
 * Usa @turf/turf instalado como dependencia npm
 */

const turf = require('@turf/turf');

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

  const maskFeature = mask.features?.[0] || mask;
  const clipped = [];

  for (const feat of layer.features || []) {
    try {
      const geomType = feat.geometry?.type;
      if (!geomType) continue;

      if (geomType === 'Point' || geomType === 'MultiPoint') {
        if (turf.booleanPointInPolygon(feat, maskFeature)) {
          clipped.push(feat);
        }

      } else if (geomType === 'LineString' || geomType === 'MultiLineString') {
        const inter = turf.bboxClip(feat, turf.bbox(maskFeature));
        if (inter?.geometry?.coordinates?.length > 0) {
          clipped.push({ ...inter, properties: feat.properties });
        }

      } else if (geomType === 'Polygon' || geomType === 'MultiPolygon') {
        const inter = turf.intersect(feat, maskFeature);
        if (inter) {
          inter.properties = feat.properties;
          clipped.push(inter);
        }
      }
    } catch (e) {
      // feature con geometría problemática: omitir
    }
  }

  return res.status(200).json({
    type:     'FeatureCollection',
    features: clipped
  });
};

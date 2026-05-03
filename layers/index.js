/**
 * layers/index.js — Punto de entrada del catálogo de capas
 *
 * Único archivo de capas que carga index.html (con type="module").
 * Para agregar un país nuevo:
 *   1. Crear layers/[pais]/index.js con sus capas
 *   2. Importarlo acá y agregarlo a window.LAYERS
 *   3. index.html no cambia nunca
 */

import { AR_LAYERS, AR_GEO_MAPS } from './ar/index.js';
import { UY_LAYERS, UY_GEO_MAPS } from './uy/index.js';
// Futuro:
// import { CL_LAYERS, CL_GEO_MAPS } from './cl/index.js';

window.LAYERS = {
  ...AR_LAYERS,
  ...UY_LAYERS,
  // Futuro: ...CL_LAYERS,
};

/**
 * Umbrales de features por estrategia de clip.
 * Centralizado acá — no hardcodeado en cada capa.
 *
 * clip.js los lee para decidir si un recorte es viable:
 *   featureCount <= CLIP_THRESHOLD_SPATIAL  → clipStrategy: 'spatial' permitido
 *   featureCount >  CLIP_THRESHOLD_SPATIAL  → tratar como 'none' (sin recorte)
 *
 * Ajustar cuando haya más presupuesto/infraestructura.
 */
window.CLIP_THRESHOLDS = {
  spatial: 3000,   // máximo features para recorte geométrico
};

window.PROVINCIAS_MAP = AR_GEO_MAPS.provincias;

/**
 * GEO_MAPS — mapas de normalización de unidades administrativas por país.
 *
 * Estructura de cada entrada:
 *   [tipo]: {
 *     valores:  { 'nombre normalizado': 'Valor Exacto', ... },
 *     layerKey: clave en window.LAYERS de la capa que representa esta unidad,
 *     tipo:     nombre del tipo geográfico ('provincia', 'departamento', etc.)
 *   }
 *
 * intent.js itera dinámicamente sobre todos los países y tipos —
 * al agregar un país nuevo acá, aparece automáticamente en intent.js.
 */
window.GEO_MAPS = {
  ar: {
    provincias: {
      valores:  AR_GEO_MAPS.provincias,
      layerKey: 'provincia_ar',
      tipo:     'provincia',
    },
  },
  uy: {
    departamentos: {
      valores:  UY_GEO_MAPS.departamentos,
      layerKey: 'departamento_uy',
      tipo:     'departamento',
    },
  },
  // Futuro — al agregar Ecuador:
  // ec: {
  //   provincias: {
  //     valores:  EC_GEO_MAPS.provincias,
  //     layerKey: 'provincia_ec',
  //     tipo:     'provincia',
  //   },
  // },
};

console.log(
  '[layers] Catálogo cargado: ' + Object.keys(window.LAYERS).length + ' capas' +
  ' de ' + Object.keys(window.SOURCES || {}).length + ' fuentes'
);

/**
 * layers/ar/index.js — Barrel de Argentina
 *
 * Para agregar un nuevo organismo:
 *   1. Crear layers/ar/indec.js con sus capas
 *   2. Importarlo acá y agregarlo al spread
 */

import { IGN_AR, PROVINCIAS_MAP_AR } from './ign.js';

export const AR_LAYERS = {
  ...IGN_AR,
  // Futuro: ...INDEC_AR, ...INTA_AR
};

export const AR_GEO_MAPS = {
  provincias: PROVINCIAS_MAP_AR,
};

/**
 * src/layers/ar/index.js — Barrel de Argentina
 *
 * Junta todas las fuentes de datos de Argentina en AR_LAYERS.
 * Para agregar un nuevo organismo:
 *   1. Crear src/layers/ar/indec.js (o inta.js, etc.)
 *   2. Importarlo acá y agregarlo al spread de AR_LAYERS
 */

import { IGN_AR, PROVINCIAS_MAP_AR } from './ign.js';

export const AR_LAYERS = {
  ...IGN_AR,
  // Futuro: ...INDEC_AR, ...INTA_AR, etc.
};

export const AR_GEO_MAPS = {
  provincias: PROVINCIAS_MAP_AR,
};

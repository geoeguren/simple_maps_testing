/**
 * layers/uy/index.js — Barrel de Uruguay
 *
 * Para agregar un nuevo organismo:
 *   1. Crear layers/uy/mvotma.js (u otro) con sus capas
 *   2. Importarlo acá y agregarlo al spread
 */

import { IGM_UY, DEPARTAMENTOS_MAP_UY } from './igm.js';

export const UY_LAYERS = {
  ...IGM_UY,
  // Futuro: ...MVOTMA_UY, ...INE_UY
};

export const UY_GEO_MAPS = {
  departamentos: DEPARTAMENTOS_MAP_UY,
};

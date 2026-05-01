/**
 * src/layers/index.js — Punto de entrada del catálogo de capas
 *
 * Este es el ÚNICO archivo de capas que carga index.html.
 * Importa todos los países y organismos, los combina,
 * y los expone en window.LAYERS y window.PROVINCIAS_MAP
 * para que el resto del código (clip.js, llm.js, app.js)
 * los encuentre exactamente igual que antes.
 *
 * Para agregar un nuevo país:
 *   1. Crear src/layers/[pais]/index.js con sus capas
 *   2. Importarlo acá y agregarlo al spread de LAYERS
 *   3. Agregar su fuente en sources.js
 *   4. Nada más — index.html no cambia
 */

import { AR_LAYERS, AR_GEO_MAPS } from './ar/index.js';
// Futuro:
// import { CL_LAYERS, CL_GEO_MAPS } from './cl/index.js';
// import { CO_LAYERS, CO_GEO_MAPS } from './co/index.js';

// ── Catálogo global de capas ──────────────────────────────────
// Todas las capas de todos los países, indexadas por su clave única.
// Misma estructura que antes — el resto del código no cambia.
window.LAYERS = {
  ...AR_LAYERS,
  // Futuro: ...CL_LAYERS, ...CO_LAYERS,
};

// ── Mapas de normalización geográfica ────────────────────────
// Mantiene compatibilidad con el uso actual de window.PROVINCIAS_MAP
// en clip.js. En el futuro se puede expandir por país.
window.PROVINCIAS_MAP = AR_GEO_MAPS.provincias;

// Registro completo por país (para uso futuro en clip.js y llm.js)
window.GEO_MAPS = {
  ar: AR_GEO_MAPS,
  // cl: CL_GEO_MAPS,
};

console.log(
  `[layers] Catálogo cargado: ${Object.keys(window.LAYERS).length} capas`,
  `de ${Object.keys(window.SOURCES || {}).length} fuentes`
);

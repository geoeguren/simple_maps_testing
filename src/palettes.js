/**
 * palettes.js — Paletas de color para clasificación de capas
 *
 * Fuente única de verdad. Consumido por:
 *   app.js (renderMap, applyClassifyPlan)
 *   layers-panel.js (clasificación interactiva)
 */

window.PALETTES = {
  qualitative: ['#4e79a7','#f28e2b','#e15759','#76b7b2','#59a14f','#edc948','#b07aa1','#ff9da7'],
  blues:       ['#deebf7','#c6dbef','#9ecae1','#6baed6','#4292c6','#2171b5','#08519c','#08306b'],
  greens:      ['#e5f5e0','#c7e9c0','#a1d99b','#74c476','#41ab5d','#238b45','#006d2c','#00441b'],
  oranges:     ['#feedde','#fdd0a2','#fdae6b','#fd8d3c','#f16913','#d94801','#a63603','#7f2704'],
  purples:     ['#f2f0f7','#dadaeb','#bcbddc','#9e9ac8','#807dba','#6a51a3','#54278f','#3f007d'],
  redblue:     ['#b2182b','#d6604d','#f4a582','#fddbc7','#d1e5f0','#92c5de','#4393c3','#2166ac'],
  browngreen:  ['#8c510a','#bf812d','#dfc27d','#f6e8c3','#c7eae5','#80cdc1','#35978f','#01665e'],
};

window.PALETTE_LABELS = {
  qualitative: 'Cualitativa',
  blues:       'Azules',
  greens:      'Verdes',
  oranges:     'Naranjas',
  purples:     'Púrpuras',
  redblue:     'Rojo → Azul',
  browngreen:  'Marrón → Verde',
};

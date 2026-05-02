/**
 * sources.js — Registro de fuentes de datos geoespaciales
 *
 * Cada fuente define un organismo o servicio WFS.
 * Las capas en layers/[pais]/[organismo].js referencian su fuente
 * por clave (ej: 'ign_ar') para que wfs.js y clip.js sepan
 * a qué servidor ir y cómo hacer recortes espaciales.
 *
 * Para agregar una fuente nueva:
 *   1. Agregar su entrada acá
 *   2. Crear layers/[pais]/[organismo].js con las capas
 *   3. Importarlo en layers/[pais]/index.js
 *   4. No tocar nada más
 */

window.SOURCES = {

  ign_ar: {
    label:       'Instituto Geográfico Nacional',
    country:     'ar',
    countryLabel:'Argentina',
    wfsBase:     'https://wms.ign.gob.ar/geoserver/ows',
    wfsVersion:  '1.1.0',
    // Capa usada para recortes espaciales (clip.js la busca cuando
    // clipStrategy === 'spatial' y hay una provincia en el pedido)
    clipLayer:   'ign:provincia',
    clipField:   'nam',            // campo de nombre normalizado (lowercase)
    attribution: '© Instituto Geográfico Nacional (Argentina)',
    url:         'https://www.ign.gob.ar',
  },

  igm_uy: {
    label:        'Instituto Geográfico Militar',
    country:      'uy',
    countryLabel: 'Uruguay',
    wfsBase:      'https://sig.igm.gub.uy/geoserver/wfs',
    wfsVersion:   '1.1.0',
    clipLayer:    'LimitesDepartamentalesA:LimitesDepartamentalesA',
    clipField:    'depto',         // valores en MAYÚSCULAS — normalizar al consultar
    attribution:  '© Instituto Geográfico Militar (Uruguay)',
    url:          'https://www.igm.gub.uy',
  },

  // ── Futuras fuentes ───────────────────────────────────────────
  // Descomentar y completar cuando se agreguen:
  //
  // ide_cl: {
  //   label:       'IDE Chile',
  //   country:     'cl',
  //   countryLabel:'Chile',
  //   wfsBase:     'https://www.ide.cl/geoserver/ows',
  //   wfsVersion:  '2.0.0',
  //   clipLayer:   'ide:region',
  //   clipField:   'nombre',
  //   attribution: '© IDE Chile',
  //   url:         'https://www.ide.cl',
  // },
  //
  // igac_co: {
  //   label:       'IGAC Colombia',
  //   country:     'co',
  //   countryLabel:'Colombia',
  //   wfsBase:     'https://...',
  //   ...
  // },

};

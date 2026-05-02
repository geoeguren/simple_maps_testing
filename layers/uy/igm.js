/**
 * layers/uy/igm.js — Capas del IGM Uruguay
 *
 * Instituto Geográfico Militar — https://sig.igm.gub.uy/geoserver/wfs
 * Un único WFS en /geoserver/wfs sirve todos los workspaces.
 *
 * Convenciones:
 *  - Todas las keys llevan sufijo _uy para consistencia entre países.
 *  - special: false          → capa general de uso público
 *  - special: 'historico'    → límites según leyes históricas (1835–1934)
 *  - titulo y keywords en español — llm.js traduce al idioma del usuario.
 *
 * Campos descartados por ser internos/técnicos:
 *  objectid_1, sde_state_id, shape_star, shape_stle, shape_leng,
 *  st_area_shape, st_perimeter, globalid_1, acc, bst, fcode, f_code,
 *  nm3, nm4, mn3, mn4, escala, hoja, loc, txt, obs, use_, [typename]Type
 */

export const IGM_UY = {

  // ── División político-administrativa ──────────────────────────

  departamento_uy: {
    source:       'igm_uy',
    typename:     'LimitesDepartamentalesA:LimitesDepartamentalesA',
    titulo:       'Departamentos de Uruguay',
    geomType:     'polygon',
    labelField:   'depto',
    clipStrategy: null,           // Uruguay es pequeño — se carga completo
    special:      false,
    keywords:     ['departamento', 'departamentos', 'división política', 'límite departamental', 'uruguay'],
    attributes: [
      { campo: 'depto',      label: 'Nombre' },
      { campo: 'codigo',     label: 'Código ISO' },
      { campo: 'descripcio', label: 'Descripción' },
      { campo: 'def',        label: 'Definición' },
    ]
  },

  municipio_uy: {
    source:       'igm_uy',
    typename:     'LimitesMunicipales250:LimitesMunicipales',
    titulo:       'Municipios de Uruguay',
    geomType:     'polygon',
    labelField:   'nombre',
    clipStrategy: null,
    special:      false,
    keywords:     ['municipio', 'municipios', 'ciudad', 'localidad', 'división municipal', 'uruguay'],
    attributes: [
      { campo: 'nombre',      label: 'Nombre' },
      { campo: 'codigo',      label: 'Código' },
      { campo: 'cod',         label: 'Código departamento' },
      { campo: 'poblacion',   label: 'Población', numeric: true },
      { campo: 'descriptio',  label: 'Descripción' },
      { campo: 'alias',       label: 'Alias' },
    ]
  },

  seccion_judicial_uy: {
    source:       'igm_uy',
    typename:     'SeccionalesJudiciales250:SeccionesJudiciales',
    titulo:       'Secciones judiciales de Uruguay',
    geomType:     'polygon',
    labelField:   'numero',
    clipStrategy: null,
    special:      false,
    keywords:     ['sección judicial', 'secciones judiciales', 'judicial', 'jurisdicción', 'juzgado', 'uruguay'],
    attributes: [
      { campo: 'numero',     label: 'Número de sección', numeric: true },
      { campo: 'depto',      label: 'Departamento' },
      { campo: 'localidad',  label: 'Localidad' },
      { campo: 'descriptio', label: 'Descripción' },
    ]
  },

  // ── Límites nacionales ────────────────────────────────────────

  limite_terrestre_uy: {
    source:       'igm_uy',
    typename:     'LimitesNacionalesTerrestres:LimitesNacionalesTerrestres',
    titulo:       'Límites nacionales terrestres de Uruguay',
    geomType:     'line',
    labelField:   'def',
    clipStrategy: null,
    special:      false,
    keywords:     ['límite', 'límite nacional', 'frontera', 'límite terrestre', 'uruguay'],
    attributes: [
      { campo: 'def', label: 'Definición' },
      { campo: 'obs', label: 'Observación' },
    ]
  },

  limite_marino_uy: {
    source:       'igm_uy',
    typename:     'LimitesNacionalesMarinos250:LimitesNacionalesMarinos',
    titulo:       'Límites nacionales marinos de Uruguay',
    geomType:     'line',
    labelField:   'def',
    clipStrategy: null,
    special:      false,
    keywords:     ['límite marino', 'límite marítimo', 'mar territorial', 'zona económica exclusiva', 'uruguay'],
    attributes: [
      { campo: 'def', label: 'Definición' },
      { campo: 'obs', label: 'Tipo de límite', classifiable: true },
    ]
  },

  // ── Hidrografía ───────────────────────────────────────────────

  rio_area_uy: {
    source:       'igm_uy',
    typename:     'Hidrografia250:RioArroyoA_250K',
    titulo:       'Ríos y arroyos de Uruguay (área)',
    geomType:     'polygon',
    labelField:   'nam',
    clipStrategy: null,
    special:      false,
    keywords:     ['río', 'ríos', 'arroyo', 'arroyos', 'cañada', 'hidrografía', 'agua', 'cuenca', 'uruguay'],
    attributes: [
      { campo: 'nam',        label: 'Nombre' },
      { campo: 'descriptio', label: 'Tipo', classifiable: true },
      { campo: 'depto',      label: 'Departamento' },
      { campo: 'wid',        label: 'Ancho (m)', numeric: true },
    ]
  },

  rio_linea_uy: {
    source:       'igm_uy',
    typename:     'Hidrografia250:RioArroyoL_250K',
    titulo:       'Ríos y arroyos de Uruguay (línea)',
    geomType:     'line',
    labelField:   'nam',
    clipStrategy: null,
    special:      false,
    keywords:     ['río', 'ríos', 'arroyo', 'arroyos', 'cañada', 'hidrografía', 'agua', 'cuenca', 'uruguay'],
    attributes: [
      { campo: 'nam',        label: 'Nombre' },
      { campo: 'descriptio', label: 'Tipo', classifiable: true },
      { campo: 'depto',      label: 'Departamento' },
      { campo: 'tiporio',    label: 'Tipo de río', classifiable: true },
    ]
  },

  // ── Históricos ────────────────────────────────────────────────
  // Límites departamentales según distintas leyes históricas.
  // Área (polígono) y Línea para cada período.

  limite_hist_1835_area_uy: {
    source:       'igm_uy',
    typename:     'Limites_Administrativos_Historicos_A:LimiteA_Ley84_28AGO1835',
    titulo:       'Límites departamentales históricos 1835 (área)',
    geomType:     'polygon',
    labelField:   'nam',
    clipStrategy: null,
    special:      'historico',
    keywords:     ['límite histórico', 'departamento histórico', '1835', 'ley 84', 'historia uruguay'],
    attributes: [
      { campo: 'nam',        label: 'Nombre' },
      { campo: 'departamen', label: 'Departamento' },
    ]
  },

  limite_hist_1835_linea_uy: {
    source:       'igm_uy',
    typename:     'Limites_Administrativos_Historicos_L:Limite_Ley84_28AGO1835',
    titulo:       'Límites departamentales históricos 1835 (línea)',
    geomType:     'line',
    labelField:   'def',
    clipStrategy: null,
    special:      'historico',
    keywords:     ['límite histórico', '1835', 'ley 84', 'historia uruguay'],
    attributes: [
      { campo: 'def',  label: 'Definición' },
      { campo: 'use_', label: 'Tipo', classifiable: true },
    ]
  },

  limite_hist_1837_area_uy: {
    source:       'igm_uy',
    typename:     'Limites_Administrativos_Historicos_A:LimiteA_Ley158_14JUN1837',
    titulo:       'Límites departamentales históricos 1837 (área)',
    geomType:     'polygon',
    labelField:   'nam',
    clipStrategy: null,
    special:      'historico',
    keywords:     ['límite histórico', 'departamento histórico', '1837', 'ley 158', 'historia uruguay'],
    attributes: [
      { campo: 'nam',        label: 'Nombre' },
      { campo: 'departamen', label: 'Departamento' },
    ]
  },

  limite_hist_1837_linea_uy: {
    source:       'igm_uy',
    typename:     'Limites_Administrativos_Historicos_L:Limite_Ley158_14JUN1837',
    titulo:       'Límites departamentales históricos 1837 (línea)',
    geomType:     'line',
    labelField:   'def',
    clipStrategy: null,
    special:      'historico',
    keywords:     ['límite histórico', '1837', 'ley 158', 'historia uruguay'],
    attributes: [
      { campo: 'def',  label: 'Definición' },
      { campo: 'use_', label: 'Tipo', classifiable: true },
    ]
  },

  limite_hist_1856_area_uy: {
    source:       'igm_uy',
    typename:     'Limites_Administrativos_Historicos_A:LimiteA_Ley493_10JUL1856',
    titulo:       'Límites departamentales históricos 1856 (área)',
    geomType:     'polygon',
    labelField:   'nam',
    clipStrategy: null,
    special:      'historico',
    keywords:     ['límite histórico', '1856', 'ley 493', 'historia uruguay'],
    attributes: [
      { campo: 'nam',        label: 'Nombre' },
      { campo: 'departamen', label: 'Departamento' },
    ]
  },

  limite_hist_1856_linea_uy: {
    source:       'igm_uy',
    typename:     'Limites_Administrativos_Historicos_L:Limite_Ley493_10JUL1856',
    titulo:       'Límites departamentales históricos 1856 (línea)',
    geomType:     'line',
    labelField:   'def',
    clipStrategy: null,
    special:      'historico',
    keywords:     ['límite histórico', '1856', 'ley 493', 'historia uruguay'],
    attributes: [
      { campo: 'def',  label: 'Definición' },
      { campo: 'use_', label: 'Tipo', classifiable: true },
    ]
  },

  limite_hist_1880_area_uy: {
    source:       'igm_uy',
    typename:     'Limites_Administrativos_Historicos_A:LimiteA_Ley1474_7JUL1880',
    titulo:       'Límites departamentales históricos 1880 (área)',
    geomType:     'polygon',
    labelField:   'nam',
    clipStrategy: null,
    special:      'historico',
    keywords:     ['límite histórico', '1880', 'ley 1474', 'historia uruguay'],
    attributes: [
      { campo: 'nam',        label: 'Nombre' },
      { campo: 'departamen', label: 'Departamento' },
    ]
  },

  limite_hist_1880_linea_uy: {
    source:       'igm_uy',
    typename:     'Limites_Administrativos_Historicos_L:Limite_Ley1474_7JUL1880',
    titulo:       'Límites departamentales históricos 1880 (línea)',
    geomType:     'line',
    labelField:   'def',
    clipStrategy: null,
    special:      'historico',
    keywords:     ['límite histórico', '1880', 'ley 1474', 'historia uruguay'],
    attributes: [
      { campo: 'def',  label: 'Definición' },
      { campo: 'use_', label: 'Tipo', classifiable: true },
    ]
  },

  limite_hist_1884_area_uy: {
    source:       'igm_uy',
    typename:     'Limites_Administrativos_Historicos_A:LimiteA_Ley1757_1OCT1884',
    titulo:       'Límites departamentales históricos 1884 (área)',
    geomType:     'polygon',
    labelField:   'nam',
    clipStrategy: null,
    special:      'historico',
    keywords:     ['límite histórico', '1884', 'ley 1757', 'historia uruguay'],
    attributes: [
      { campo: 'nam',        label: 'Nombre' },
      { campo: 'departamen', label: 'Departamento' },
    ]
  },

  limite_hist_1884_linea_uy: {
    source:       'igm_uy',
    typename:     'Limites_Administrativos_Historicos_L:Limite_Ley1757_1OCT1884',
    titulo:       'Límites departamentales históricos 1884 (línea)',
    geomType:     'line',
    labelField:   'def',
    clipStrategy: null,
    special:      'historico',
    keywords:     ['límite histórico', '1884', 'ley 1757', 'historia uruguay'],
    attributes: [
      { campo: 'def',  label: 'Definición' },
      { campo: 'use_', label: 'Tipo', classifiable: true },
    ]
  },

  limite_hist_1885_area_uy: {
    source:       'igm_uy',
    typename:     'Limites_Administrativos_Historicos_A:LimiteA_Ley1854_30DIC1885',
    titulo:       'Límites departamentales históricos 1885 (área)',
    geomType:     'polygon',
    labelField:   'nam',
    clipStrategy: null,
    special:      'historico',
    keywords:     ['límite histórico', '1885', 'ley 1854', 'historia uruguay'],
    attributes: [
      { campo: 'nam',        label: 'Nombre' },
      { campo: 'departamen', label: 'Departamento' },
    ]
  },

  limite_hist_1885_linea_uy: {
    source:       'igm_uy',
    typename:     'Limites_Administrativos_Historicos_L:Limite_Ley1854_30DIC1885',
    titulo:       'Límites departamentales históricos 1885 (línea)',
    geomType:     'line',
    labelField:   'def',
    clipStrategy: null,
    special:      'historico',
    keywords:     ['límite histórico', '1885', 'ley 1854', 'historia uruguay'],
    attributes: [
      { campo: 'def',  label: 'Definición' },
      { campo: 'use_', label: 'Tipo', classifiable: true },
    ]
  },

  limite_hist_1927_area_uy: {
    source:       'igm_uy',
    typename:     'Limites_Administrativos_Historicos_A:LimiteA_Ley8187_15DIC1927',
    titulo:       'Límites departamentales históricos 1927 (área)',
    geomType:     'polygon',
    labelField:   'nam',
    clipStrategy: null,
    special:      'historico',
    keywords:     ['límite histórico', '1927', 'ley 8187', 'historia uruguay'],
    attributes: [
      { campo: 'nam',        label: 'Nombre' },
      { campo: 'departamen', label: 'Departamento' },
    ]
  },

  limite_hist_1927_linea_uy: {
    source:       'igm_uy',
    typename:     'Limites_Administrativos_Historicos_L:Limite_Ley8187_15DIC1927',
    titulo:       'Límites departamentales históricos 1927 (línea)',
    geomType:     'line',
    labelField:   'def',
    clipStrategy: null,
    special:      'historico',
    keywords:     ['límite histórico', '1927', 'ley 8187', 'historia uruguay'],
    attributes: [
      { campo: 'def',  label: 'Definición' },
      { campo: 'use_', label: 'Tipo', classifiable: true },
    ]
  },

  limite_hist_1934_area_uy: {
    source:       'igm_uy',
    typename:     'Limites_Administrativos_Historicos_A:LimiteA_RinconDeManeco_10AGO1934',
    titulo:       'Límites históricos Rincón de Maneco 1934 (área)',
    geomType:     'polygon',
    labelField:   'nam',
    clipStrategy: null,
    special:      'historico',
    keywords:     ['límite histórico', '1934', 'rincón de maneco', 'historia uruguay'],
    attributes: [
      { campo: 'nam',        label: 'Nombre' },
      { campo: 'departamen', label: 'Departamento' },
    ]
  },

  limite_hist_1934_linea_uy: {
    source:       'igm_uy',
    typename:     'Limites_Administrativos_Historicos_L:Limite_RinconDeManeco_10Ago1934',
    titulo:       'Límites históricos Rincón de Maneco 1934 (línea)',
    geomType:     'line',
    labelField:   'def',
    clipStrategy: null,
    special:      'historico',
    keywords:     ['límite histórico', '1934', 'rincón de maneco', 'historia uruguay'],
    attributes: [
      { campo: 'def',  label: 'Definición' },
      { campo: 'use_', label: 'Tipo', classifiable: true },
    ]
  },

};

export const DEPARTAMENTOS_MAP_UY = {
  'artigas':          'ARTIGAS',
  'canelones':        'CANELONES',
  'cerro largo':      'CERRO LARGO',
  'colonia':          'COLONIA',
  'durazno':          'DURAZNO',
  'flores':           'FLORES',
  'florida':          'FLORIDA',
  'lavalleja':        'LAVALLEJA',
  'maldonado':        'MALDONADO',
  'montevideo':       'MONTEVIDEO',
  'paysandú':         'PAYSANDÚ',
  'paysandu':         'PAYSANDÚ',
  'río negro':        'RÍO NEGRO',
  'rio negro':        'RÍO NEGRO',
  'rivera':           'RIVERA',
  'rocha':            'ROCHA',
  'salto':            'SALTO',
  'san josé':         'SAN JOSÉ',
  'san jose':         'SAN JOSÉ',
  'soriano':          'SORIANO',
  'tacuarembó':       'TACUAREMBÓ',
  'tacuarembo':       'TACUAREMBÓ',
  'treinta y tres':   'TREINTA Y TRES',
};

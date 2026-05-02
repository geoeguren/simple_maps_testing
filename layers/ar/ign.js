/**
 * layers/ar/ign.js — Capas del IGN Argentina
 *
 * Instituto Geográfico Nacional — https://wms.ign.gob.ar/geoserver/ows
 * Catálogo completo: 193 capas del catálogo IGN enriquecido.
 *
 * Convenciones:
 *  - Keys con sufijo _ar para consistencia entre países.
 *  - special: false          → capa general de uso público
 *  - special: 'historico'    → datos de períodos pasados
 *  - special: 'cartografico' → grillas, geodesia, gravimetría, nivelación
 *  - special: 'catastral'    → parcelas, nomenclatura catastral
 *  - special: 'administrativo' → regionalizaciones internas de organismos
 *  - special: 'auxiliar'     → capas de soporte sin valor semántico directo
 *  - special: 'raster'       → MDT, MDE, modelos de elevación
 *  - visible: true  → se muestra por defecto en el catálogo de la UI
 *  - visible: false → disponible para el LLM, oculta en la UI por defecto
 *  - titulo y keywords en español — llm.js traduce al idioma del usuario.
 */

export const IGN_AR = {

  // ── División político-administrativa ────────────────────────────

  provincia_ar: {
    source:       'ign_ar',
    typename:     'ign:provincia',
    titulo:       'Provincias de Argentina',
    geomType:     'polygon',
    labelField:   'nam',
    clipStrategy: null,
    special:      false,
    visible:      true,
    keywords:     ['provincia', 'provincias', 'división política', 'límite provincial', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre completo' },
      { campo: 'nam', label: 'Nombre corto' },
      { campo: 'in1', label: 'Código', numeric: true },
      { campo: 'gna', label: 'Tipo' },
    ]
  },

  departamento_ar: {
    source:       'ign_ar',
    typename:     'ign:departamento',
    titulo:       'Departamentos de Argentina',
    geomType:     'polygon',
    labelField:   'nam',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['departamento', 'partido', 'municipio', 'departamentos', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre completo' },
      { campo: 'nam', label: 'Nombre corto' },
      { campo: 'in1', label: 'Código', numeric: true },
      { campo: 'gna', label: 'Tipo' },
    ]
  },

  municipio_ar: {
    source:       'ign_ar',
    typename:     'ign:municipio',
    titulo:       'Municipios de Argentina',
    geomType:     'polygon',
    labelField:   'nam',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['municipio', 'municipios', 'ejido', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre completo' },
      { campo: 'nam', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo' },
      { campo: 'in1', label: 'Código', numeric: true },
    ]
  },

  gobierno_local_ar: {
    source:       'ign_ar',
    typename:     'ign:gobiernoslocales_2022',
    titulo:       'Gobiernos locales de Argentina',
    geomType:     'polygon',
    labelField:   'nam',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['gobierno local', 'comuna', 'comisión municipal', 'junta de gobierno', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre completo' },
      { campo: 'nam', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo' },
      { campo: 'tgl', label: 'Tipo gobierno local', classifiable: true },
      { campo: 'nam_prov', label: 'Provincia' },
      { campo: 'in1', label: 'Código', numeric: true },
    ]
  },

  localidad_ar: {
    source:       'ign_ar',
    typename:     'ign:localidad_bahra',
    titulo:       'Localidades de Argentina',
    geomType:     'point',
    labelField:   'fna',
    geoFields:    { provincia: 'nom_pcia', departamento: 'nom_depto' },
    clipStrategy: 'attribute',
    clipField:    'nom_pcia',
    special:      false,
    visible:      true,
    keywords:     ['localidad', 'localidades', 'ciudad', 'pueblo', 'poblado', 'asentamiento', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'tipo_asent', label: 'Tipo de asentamiento', classifiable: true },
      { campo: 'nom_pcia', label: 'Provincia' },
      { campo: 'nom_depto', label: 'Departamento' },
    ]
  },

  paraje_ar: {
    source:       'ign_ar',
    typename:     'ign:bahra_paraje',
    titulo:       'Parajes de Argentina',
    geomType:     'point',
    labelField:   'fna',
    geoFields:    { provincia: 'nom_pcia', departamento: 'nom_depto' },
    clipStrategy: 'attribute',
    clipField:    'nom_pcia',
    special:      false,
    visible:      true,
    keywords:     ['paraje', 'parajes', 'lugar rural', 'topónimo rural', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'tipo_asent', label: 'Tipo', classifiable: true },
      { campo: 'nom_pcia', label: 'Provincia' },
      { campo: 'nom_depto', label: 'Departamento' },
    ]
  },

  sublocalidad_ar: {
    source:       'ign_ar',
    typename:     'ign:sublocalidad_entidad_bahra',
    titulo:       'Sublocalidades de Argentina',
    geomType:     'point',
    labelField:   'fna',
    geoFields:    { provincia: 'nom_pcia', departamento: 'nom_depto' },
    clipStrategy: 'attribute',
    clipField:    'nom_pcia',
    special:      false,
    visible:      false,
    keywords:     ['sublocalidad', 'entidad rural', 'paraje', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'tipo_asent', label: 'Tipo', classifiable: true },
      { campo: 'nom_pcia', label: 'Provincia' },
      { campo: 'nom_depto', label: 'Departamento' },
    ]
  },

  pais_ar: {
    source:       'ign_ar',
    typename:     'ign:pais',
    titulo:       'País — Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: null,
    special:      'auxiliar',
    visible:      false,
    keywords:     ['argentina', 'país', 'límite nacional'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo' },
    ]
  },

  plataforma_continental_ar: {
    source:       'ign_ar',
    typename:     'ign:plataforma_continental',
    titulo:       'Plataforma continental argentina',
    geomType:     'polygon',
    labelField:   null,
    clipStrategy: null,
    special:      false,
    visible:      true,
    keywords:     ['plataforma continental', 'argentina', 'mar', 'límite marítimo'],
    attributes: []
  },

  mar_territorial_ar: {
    source:       'ign_ar',
    typename:     'ign:mar_territorial_argentino',
    titulo:       'Mar territorial argentino',
    geomType:     'polygon',
    labelField:   null,
    clipStrategy: null,
    special:      false,
    visible:      true,
    keywords:     ['mar territorial', 'argentina', 'mar', 'límite marítimo'],
    attributes: []
  },

  zona_contigua_ar: {
    source:       'ign_ar',
    typename:     'ign:zona_contigua_argentina',
    titulo:       'Zona contigua argentina',
    geomType:     'polygon',
    labelField:   null,
    clipStrategy: null,
    special:      false,
    visible:      false,
    keywords:     ['zona contigua', 'argentina', 'mar', 'límite marítimo'],
    attributes: []
  },

  zee_ar: {
    source:       'ign_ar',
    typename:     'ign:zona_economica_exclusiva_argentina',
    titulo:       'Zona económica exclusiva argentina',
    geomType:     'polygon',
    labelField:   null,
    clipStrategy: null,
    special:      false,
    visible:      true,
    keywords:     ['zona económica exclusiva', 'ZEE', 'argentina', 'mar', 'límite marítimo'],
    attributes: []
  },

  millas_antartico_ar: {
    source:       'ign_ar',
    typename:     'ign:doscientas_millas_sector_antartico',
    titulo:       '200 millas sector antártico',
    geomType:     'polygon',
    labelField:   null,
    clipStrategy: null,
    special:      false,
    visible:      false,
    keywords:     ['200 millas', 'sector antártico', 'antártida', 'argentina'],
    attributes: [
      { campo: 'objeto', label: 'Objeto' },
    ]
  },


  // ── Límites ─────────────────────────────────────────────────────

  limite_internacional_ar: {
    source:       'ign_ar',
    typename:     'ign:linea_de_limite_FA004',
    titulo:       'Límites internacionales de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: null,
    special:      false,
    visible:      true,
    keywords:     ['límite internacional', 'frontera', 'límite', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  limite_provincial_ar: {
    source:       'ign_ar',
    typename:     'ign:linea_de_limite_070111',
    titulo:       'Límites provinciales de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: null,
    special:      false,
    visible:      true,
    keywords:     ['límite provincial', 'límite interprovincial', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  limite_departamental_ar: {
    source:       'ign_ar',
    typename:     'ign:linea_de_limite_070110',
    titulo:       'Límites departamentales de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: null,
    special:      false,
    visible:      false,
    keywords:     ['límite departamental', 'límite interdepartamental', 'partido', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  limite_area_protegida_ar: {
    source:       'ign_ar',
    typename:     'ign:linea_de_limite_070114',
    titulo:       'Límites de áreas protegidas de Argentina',
    geomType:     'line',
    labelField:   null,
    clipStrategy: null,
    special:      'auxiliar',
    visible:      false,
    keywords:     ['límite área protegida', 'argentina'],
    attributes: [
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  limite_maritimo_ar: {
    source:       'ign_ar',
    typename:     'ign:linea_limite_maritimos',
    titulo:       'Límites marítimos de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: null,
    special:      false,
    visible:      true,
    keywords:     ['límite marítimo', 'mar territorial', 'zona económica', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  hito_internacional_ar: {
    source:       'ign_ar',
    typename:     'ign:hitos_internacionales',
    titulo:       'Hitos internacionales de Argentina',
    geomType:     'point',
    labelField:   'nombre',
    clipStrategy: null,
    special:      false,
    visible:      true,
    keywords:     ['hito', 'hito fronterizo', 'frontera', 'límite internacional', 'argentina'],
    attributes: [
      { campo: 'nombre', label: 'Nombre' },
      { campo: 'pais', label: 'País limítrofe', classifiable: true },
      { campo: 'seccion', label: 'Sección' },
      { campo: 'codigo', label: 'Código' },
    ]
  },

  hito_interprovincial_ar: {
    source:       'ign_ar',
    typename:     'ign:hitos_interprovinciales',
    titulo:       'Hitos interprovinciales de Argentina',
    geomType:     'point',
    labelField:   'nombre',
    clipStrategy: null,
    special:      'auxiliar',
    visible:      false,
    keywords:     ['hito interprovincial', 'límite provincial', 'argentina'],
    attributes: [
      { campo: 'nombre', label: 'Nombre' },
    ]
  },

  circulo_polar_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_terrestres_070401',
    titulo:       'Círculos polares',
    geomType:     'line',
    labelField:   null,
    clipStrategy: null,
    special:      'cartografico',
    visible:      false,
    keywords:     ['círculo polar', 'paralelo', 'cartografía'],
    attributes: [
      { campo: 'objeto', label: 'Objeto' },
    ]
  },

  tropico_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_terrestres_070402',
    titulo:       'Trópicos',
    geomType:     'line',
    labelField:   null,
    clipStrategy: null,
    special:      'cartografico',
    visible:      false,
    keywords:     ['trópico', 'paralelo', 'cartografía'],
    attributes: [
      { campo: 'objeto', label: 'Objeto' },
    ]
  },

  ecuador_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_terrestres_070403',
    titulo:       'Ecuador',
    geomType:     'line',
    labelField:   null,
    clipStrategy: null,
    special:      'cartografico',
    visible:      false,
    keywords:     ['ecuador', 'paralelo', 'cartografía'],
    attributes: [
      { campo: 'objeto', label: 'Objeto' },
    ]
  },


  // ── Transporte vial ─────────────────────────────────────────────

  vial_nacional_ar: {
    source:       'ign_ar',
    typename:     'ign:vial_nacional',
    titulo:       'Red vial nacional de Argentina',
    geomType:     'line',
    labelField:   'rtn',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['ruta', 'rutas', 'red vial', 'vial', 'carretera', 'camino nacional', 'argentina'],
    attributes: [
      { campo: 'rtn', label: 'Número de ruta', numeric: true },
      { campo: 'typ', label: 'Tipo de vía', classifiable: true },
      { campo: 'rst', label: 'Estado', classifiable: true },
    ]
  },

  vial_provincial_ar: {
    source:       'ign_ar',
    typename:     'ign:vial_provincial',
    titulo:       'Red vial provincial de Argentina',
    geomType:     'line',
    labelField:   'rtn',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['ruta provincial', 'rutas provinciales', 'vial provincial', 'camino provincial', 'argentina'],
    attributes: [
      { campo: 'rtn', label: 'Número de ruta', numeric: true },
      { campo: 'typ', label: 'Tipo de vía', classifiable: true },
      { campo: 'rst', label: 'Estado', classifiable: true },
    ]
  },

  vial_terciario_ar: {
    source:       'ign_ar',
    typename:     'ign:vial_terciaria',
    titulo:       'Red vial terciaria de Argentina',
    geomType:     'line',
    labelField:   'fna1',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['camino', 'caminos', 'camino rural', 'vial terciario', 'acceso rural', 'argentina'],
    attributes: [
      { campo: 'fna1', label: 'Nombre' },
      { campo: 'gna1', label: 'Tipo', classifiable: true },
      { campo: 'rst', label: 'Estado', classifiable: true },
    ]
  },

  huella_ar: {
    source:       'ign_ar',
    typename:     'ign:vial_AP010',
    titulo:       'Huellas de Argentina',
    geomType:     'line',
    labelField:   null,
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['huella', 'huellas', 'camino de tierra', 'argentina'],
    attributes: [
      { campo: 'objeto', label: 'Objeto', classifiable: true },
      { campo: 'caa', label: 'Ancho', numeric: true },
    ]
  },

  senda_ar: {
    source:       'ign_ar',
    typename:     'ign:vial_AP050',
    titulo:       'Sendas rurales de Argentina',
    geomType:     'line',
    labelField:   null,
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['senda', 'sendas', 'senda rural', 'argentina'],
    attributes: [
      { campo: 'objeto', label: 'Objeto', classifiable: true },
      { campo: 'caa', label: 'Ancho', numeric: true },
    ]
  },

  puente_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_de_cruces_y_enlaces_AQ040',
    titulo:       'Puentes de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['puente', 'puentes', 'viaducto', 'cruce', 'enlace', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
      { campo: 'tup', label: 'Uso', classifiable: true },
    ]
  },

  puente_punto_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_cruces_y_enlaces_AQ040',
    titulo:       'Puentes (punto) de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      'auxiliar',
    visible:      false,
    keywords:     ['puente', 'puentes', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  alcantarilla_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_cruces_y_enlaces_AQ065',
    titulo:       'Alcantarillas de Argentina',
    geomType:     'point',
    labelField:   null,
    clipStrategy: 'spatial',
    special:      'auxiliar',
    visible:      false,
    keywords:     ['alcantarilla', 'alcantarillas', 'argentina'],
    attributes: [
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  tunel_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_cruces_y_enlaces_AQ130',
    titulo:       'Túneles de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['túnel', 'túneles', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  vado_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_cruces_y_enlaces_BH070',
    titulo:       'Vados de Argentina',
    geomType:     'point',
    labelField:   null,
    clipStrategy: 'spatial',
    special:      'auxiliar',
    visible:      false,
    keywords:     ['vado', 'vados', 'cruce de agua', 'argentina'],
    attributes: [
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },


  // ── Transporte aéreo ────────────────────────────────────────────

  aeropuerto_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_transporte_aereo_GB005',
    titulo:       'Aeropuertos de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['aeropuerto', 'aeropuertos', 'aeródromo', 'terminal aérea', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'nam', label: 'Nombre corto' },
    ]
  },

  aerodromo_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_transporte_aereo_GB001',
    titulo:       'Aeródromos de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['aeródromo', 'aeródromos', 'pista de aterrizaje', 'aviación', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'nam', label: 'Nombre corto' },
    ]
  },

  helipuerto_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_transporte_aereo_GB035',
    titulo:       'Helipuertos de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['helipuerto', 'helipuertos', 'helicóptero', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
    ]
  },

  pista_aerea_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_de_transporte_aereo_GB055',
    titulo:       'Pistas aéreas de Argentina',
    geomType:     'line',
    labelField:   null,
    clipStrategy: 'spatial',
    special:      'auxiliar',
    visible:      false,
    keywords:     ['pista', 'pista aérea', 'aeropuerto', 'argentina'],
    attributes: [
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },


  // ── Transporte ferroviario ──────────────────────────────────────

  ferrocarril_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_de_transporte_ferroviario_AN010',
    titulo:       'Red ferroviaria de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['ferrocarril', 'tren', 'red ferroviaria', 'vía férrea', 'ramal', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'fun', label: 'Función', classifiable: true },
      { campo: 'rgc', label: 'Trocha', classifiable: true },
    ]
  },

  estacion_ferroviaria_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_transporte_ferroviario_AN070',
    titulo:       'Estaciones ferroviarias de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['estación de tren', 'estación ferroviaria', 'ferrocarril', 'tren', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'nam', label: 'Nombre corto' },
    ]
  },


  // ── Transporte marítimo y fluvial ───────────────────────────────

  puerto_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_puertos_y_muelles_BB005',
    titulo:       'Puertos de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['puerto', 'puertos', 'muelle', 'muelles', 'terminal portuaria', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  muelle_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_de_puertos_y_muelles_BB190',
    titulo:       'Muelles de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['muelle', 'muelles', 'embarcadero', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  rompeolas_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_de_puertos_y_muelles_BB041',
    titulo:       'Rompeolas de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      'auxiliar',
    visible:      false,
    keywords:     ['rompeolas', 'escollera', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  rompeolas_punto_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_puertos_y_muelles_BB041',
    titulo:       'Rompeolas (punto) de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      'auxiliar',
    visible:      false,
    keywords:     ['rompeolas', 'escollera', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },


  // ── Pasos y controles fronterizos ───────────────────────────────

  pasos_frontera_ar: {
    source:       'ign_ar',
    typename:     'ign:pasos_de_fronteras_internacionales',
    titulo:       'Pasos de frontera de Argentina',
    geomType:     'point',
    labelField:   'nom_pfi',
    geoFields:    { provincia: 'prov', pais: 'pvecino' },
    clipStrategy: 'attribute',
    clipField:    'prov',
    special:      false,
    visible:      true,
    keywords:     ['paso', 'pasos', 'frontera', 'paso fronterizo', 'paso internacional', 'argentina'],
    attributes: [
      { campo: 'nom_pfi', label: 'Nombre' },
      { campo: 'cruce_pfi', label: 'Tipo de cruce', classifiable: true },
      { campo: 'pvecino', label: 'País vecino', classifiable: true },
      { campo: 'prov', label: 'Provincia' },
      { campo: 'hab_migr', label: 'Habilitación migratoria' },
    ]
  },

  complejo_fronterizo_ar: {
    source:       'ign_ar',
    typename:     'ign:complejos_fronterizos',
    titulo:       'Complejos fronterizos de Argentina',
    geomType:     'point',
    labelField:   'nom_cf',
    clipStrategy: null,
    special:      false,
    visible:      true,
    keywords:     ['complejo fronterizo', 'frontera', 'paso fronterizo', 'aduana', 'argentina'],
    attributes: [
      { campo: 'nom_cf', label: 'Nombre' },
      { campo: 'nom_pfi', label: 'Paso internacional' },
      { campo: 'cod_cf', label: 'Código' },
    ]
  },

  aduana_ar: {
    source:       'ign_ar',
    typename:     'ign:controles_AH070',
    titulo:       'Aduanas y puestos de control de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['aduana', 'control fronterizo', 'puesto de control', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },


  // ── Infraestructura de transporte ───────────────────────────────

  terminal_omnibus_ar: {
    source:       'ign_ar',
    typename:     'ign:infraestructura_de_transporte_AQ125',
    titulo:       'Terminales de ómnibus de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['terminal de buses', 'terminal de ómnibus', 'colectivo', 'transporte', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  estacion_servicio_ar: {
    source:       'ign_ar',
    typename:     'ign:infraestructura_de_transporte_AQ170',
    titulo:       'Estaciones de servicio de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['estación de servicio', 'nafta', 'combustible', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  peaje_ar: {
    source:       'ign_ar',
    typename:     'ign:infraestructura_de_transporte_030801',
    titulo:       'Estaciones de peaje de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['peaje', 'autopista', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  pesaje_ar: {
    source:       'ign_ar',
    typename:     'ign:infraestructura_de_transporte_AQ180',
    titulo:       'Estaciones de pesaje de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      'auxiliar',
    visible:      false,
    keywords:     ['pesaje', 'control de camiones', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  indicador_km_ar: {
    source:       'ign_ar',
    typename:     'ign:infraestructura_de_transporte_030803',
    titulo:       'Indicadores de kilómetros de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      'auxiliar',
    visible:      false,
    keywords:     ['kilómetro', 'indicador vial', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
    ]
  },


  // ── Hidrografía ─────────────────────────────────────────────────

  rio_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_de_aguas_continentales_perenne',
    titulo:       'Ríos y corrientes de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['río', 'ríos', 'arroyo', 'arroyos', 'corriente', 'hidrografía', 'curso de agua', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'nam', label: 'Nombre corto' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  rio_area_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_aguas_continentales_BH140',
    titulo:       'Ríos principales (área) de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['río', 'ríos', 'corriente de agua', 'hidrografía', 'cauce', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  rio_intermitente_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_de_aguas_continentales_intermitentes',
    titulo:       'Ríos intermitentes de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['río intermitente', 'arroyo intermitente', 'corriente temporal', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  espejo_agua_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_aguas_continentales_perenne',
    titulo:       'Espejos de agua de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['laguna', 'lagunas', 'espejo de agua', 'cuerpo de agua', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  lago_embalse_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_aguas_continentales_BH130',
    titulo:       'Lagos y embalses de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['lago', 'lagos', 'embalse', 'embalses', 'represa', 'dique', 'laguna grande', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  laguna_intermitente_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_aguas_continentales_intermitente',
    titulo:       'Lagunas intermitentes de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['laguna intermitente', 'espejo de agua temporal', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  canal_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_de_aguas_continentales_BH020',
    titulo:       'Canales de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['canal', 'canales', 'irrigación', 'riego', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  canal_area_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_aguas_continentales_BH020',
    titulo:       'Canales (área) de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['canal', 'canales', 'irrigación', 'riego', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  acequia_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_de_aguas_continentales_BH030',
    titulo:       'Acequias y zanjas de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['acequia', 'zanja', 'riego', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  acueducto_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_de_aguas_continentales_BH010',
    titulo:       'Acueductos de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['acueducto', 'conducto de agua', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  muro_embalse_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_de_aguas_continentales_BI020',
    titulo:       'Muros de embalse de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      'auxiliar',
    visible:      false,
    keywords:     ['muro de embalse', 'represa', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  dique_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_aguas_continentales_BH051',
    titulo:       'Diques de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['dique', 'presa', 'represa', 'embalse', 'diques', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  cascada_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_aguas_continentales_BH180',
    titulo:       'Cascadas y saltos de agua de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['cascada', 'salto de agua', 'catarata', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  fuente_natural_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_aguas_continentales_BH170',
    titulo:       'Fuentes naturales de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['fuente natural', 'manantial', 'vertiente', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  embalse_rural_area_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_aguas_continentales_041101',
    titulo:       'Embalses rurales (área) de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['embalse rural', 'jagüel', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  embalse_rural_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_aguas_continentales_041101',
    titulo:       'Embalses rurales de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['embalse rural', 'jagüel', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  marea_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_de_mareas_y_corrientes_040601',
    titulo:       'Mareas y corrientes de Argentina',
    geomType:     'line',
    labelField:   null,
    clipStrategy: null,
    special:      false,
    visible:      false,
    keywords:     ['marea', 'corriente marina', 'batimetría', 'argentina'],
    attributes: [
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  mareografo_ar: {
    source:       'ign_ar',
    typename:     'ign:mareas_y_corrientes_BG020',
    titulo:       'Mareógrafos de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      'auxiliar',
    visible:      false,
    keywords:     ['mareógrafo', 'medición mareas', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },


  // ── Glaciología ─────────────────────────────────────────────────

  glaciar_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_glaciologia_BJ030',
    titulo:       'Glaciares de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['glaciar', 'glaciares', 'hielo', 'patagonia', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  barrera_hielo_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_glaciologia_050705',
    titulo:       'Barreras de hielo de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: null,
    special:      false,
    visible:      true,
    keywords:     ['barrera de hielo', 'glaciar', 'antártida', 'hielo', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  morena_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_glaciologia_BJ020',
    titulo:       'Morrenas de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['morrena', 'glaciar', 'geomorfología', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },


  // ── Zona costera y marítima ─────────────────────────────────────

  costa_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_de_zona_costera_BA040',
    titulo:       'Zona costera de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['costa', 'litoral', 'accidente costero', 'punta', 'bahía', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  isla_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_zona_costera_BA030',
    titulo:       'Islas de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: null,
    special:      false,
    visible:      true,
    keywords:     ['isla', 'islas', 'archipiélago', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  playa_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_zona_costera_playa_areana',
    titulo:       'Playas de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['playa', 'playas', 'costa', 'litoral', 'arena', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  playa_grava_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_zona_costera_playa_grava',
    titulo:       'Playas de grava de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['playa', 'playa de grava', 'costa', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  restinga_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_zona_costera_playa_restinga',
    titulo:       'Restingas de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['restinga', 'playa', 'costa', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  faro_ar: {
    source:       'ign_ar',
    typename:     'ign:ayuda_a_la_navegacion_BC050',
    titulo:       'Faros de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['faro', 'faros', 'navegación', 'costa', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  boya_ar: {
    source:       'ign_ar',
    typename:     'ign:ayuda_a_la_navegacion_BC020',
    titulo:       'Boyas de Argentina',
    geomType:     'point',
    labelField:   null,
    clipStrategy: 'spatial',
    special:      'auxiliar',
    visible:      false,
    keywords:     ['boya', 'boyas', 'navegación', 'argentina'],
    attributes: [
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  baliza_ar: {
    source:       'ign_ar',
    typename:     'ign:ayuda_a_la_navegacion_BC101',
    titulo:       'Balizas de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      'auxiliar',
    visible:      false,
    keywords:     ['baliza', 'señalización', 'navegación', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  roca_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_obstrucciones_BD130',
    titulo:       'Rocas en zonas costeras de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      'auxiliar',
    visible:      false,
    keywords:     ['roca', 'obstáculo navegación', 'costa', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },


  // ── Geomorfología ───────────────────────────────────────────────

  cordillera_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_de_geomorfologia_050205',
    titulo:       'Cordilleras de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['cordillera', 'sierra', 'montaña', 'geomorfología', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  sierra_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_de_geomorfologia_050204',
    titulo:       'Sierras de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['sierra', 'sierras', 'cordón serrano', 'geomorfología', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  cordon_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_de_geomorfologia_050206',
    titulo:       'Cordones montañosos de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['cordón', 'serranía', 'montaña', 'geomorfología', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  cuchilla_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_de_geomorfologia_050207',
    titulo:       'Cuchillas y lomas de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['cuchilla', 'loma', 'geomorfología', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  cuesta_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_de_geomorfologia_050208',
    titulo:       'Cuestas de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['cuesta', 'relieve', 'geomorfología', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  filo_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_de_geomorfologia_CA020',
    titulo:       'Filos y crestas de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['filo', 'cresta', 'divisoria de aguas', 'geomorfología', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  valle_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_de_geomorfologia_CA025',
    titulo:       'Valles de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['valle', 'valles', 'geomorfología', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  lugar_geomorf_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_de_geomorfologia_DB001',
    titulo:       'Lugares geomorfológicos de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['pampa', 'llanura', 'lugar geomorfológico', 'geomorfología', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  quebrada_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_de_geomorfologia_DB200',
    titulo:       'Quebradas y cañadones de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['quebrada', 'cañadón', 'garganta', 'geomorfología', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  barranca_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_de_geomorfologia_barranca',
    titulo:       'Barrancas de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['barranca', 'zanjón', 'geomorfología', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  curva_nivel_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_de_geomorfologia_CA010',
    titulo:       'Curvas de nivel de Argentina',
    geomType:     'line',
    labelField:   null,
    clipStrategy: 'spatial',
    special:      'cartografico',
    visible:      false,
    keywords:     ['curva de nivel', 'isohipsa', 'topografía', 'altitud', 'argentina'],
    attributes: [
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  meseta_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_geomorfologia_050202',
    titulo:       'Mesetas de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['meseta', 'mesetas', 'altiplano', 'puna', 'geomorfología', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  medano_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_geomorfologia_DB560',
    titulo:       'Médanos y dunas de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['médano', 'duna', 'arenal', 'médanos', 'geomorfología', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  pico_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_geomorfologia_NA100',
    titulo:       'Picos y cumbres de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['pico', 'cumbre', 'cerro', 'montaña', 'cima', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'nam', label: 'Nombre corto' },
      { campo: 'alt', label: 'Altitud', numeric: true },
    ]
  },

  abra_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_geomorfologia_DB120',
    titulo:       'Abras y pasos de montaña de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['abra', 'paso de montaña', 'collado', 'portezuelo', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'nam', label: 'Nombre corto' },
    ]
  },

  mogote_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_geomorfologia_050203',
    titulo:       'Mogotes de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['mogote', 'cerro', 'geomorfología', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
    ]
  },

  punto_acotado_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_geomorfologia_CA030',
    titulo:       'Puntos acotados de Argentina',
    geomType:     'point',
    labelField:   null,
    clipStrategy: 'spatial',
    special:      'cartografico',
    visible:      false,
    keywords:     ['punto acotado', 'cota', 'altitud', 'topografía', 'argentina'],
    attributes: [
      { campo: 'alt', label: 'Altitud', numeric: true },
    ]
  },

  area_montana_ar: {
    source:       'ign_ar',
    typename:     'ign:area_de_montana',
    titulo:       'Áreas de montaña de Argentina',
    geomType:     'polygon',
    labelField:   null,
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['montaña', 'alta montaña', 'cordillera', 'argentina'],
    attributes: [
      { campo: 'cam', label: 'Categoría', classifiable: true },
      { campo: 'provincia', label: 'Provincia' },
    ]
  },


  // ── Edafología y cobertura del suelo ────────────────────────────

  salina_ar: {
    source:       'ign_ar',
    typename:     'ign:edafologia_salina',
    titulo:       'Salinas y salares de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['salina', 'salar', 'sal', 'salitral', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  afloramiento_ar: {
    source:       'ign_ar',
    typename:     'ign:edafologia_afloramiento_rocoso',
    titulo:       'Afloramientos rocosos de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['afloramiento rocoso', 'roca', 'geología', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  arenal_ar: {
    source:       'ign_ar',
    typename:     'ign:edafologia_arenal',
    titulo:       'Arenales de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['arenal', 'arena', 'desierto', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  barrial_ar: {
    source:       'ign_ar',
    typename:     'ign:edafologia_barrial_barrizal',
    titulo:       'Barriales de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['barrial', 'bañado', 'terreno anegado', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  cumbre_rocosa_ar: {
    source:       'ign_ar',
    typename:     'ign:edafologia_cumbre_rocosa',
    titulo:       'Cumbres rocosas de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['cumbre rocosa', 'roca', 'montaña', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  pedregal_ar: {
    source:       'ign_ar',
    typename:     'ign:edafologia_pedregal',
    titulo:       'Pedregales de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['pedregal', 'roca', 'terreno pedregoso', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  sedimento_fluvial_ar: {
    source:       'ign_ar',
    typename:     'ign:edafologia_sedimento_fluvial',
    titulo:       'Sedimentos fluviales de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['sedimento fluvial', 'aluvión', 'planicie aluvial', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  desmonte_ar: {
    source:       'ign_ar',
    typename:     'ign:sin_vegetacion_061001',
    titulo:       'Desmontes de Argentina',
    geomType:     'polygon',
    labelField:   null,
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['desmonte', 'deforestación', 'sin vegetación', 'argentina'],
    attributes: [
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },


  // ── Vegetación ──────────────────────────────────────────────────

  bosque_ar: {
    source:       'ign_ar',
    typename:     'ign:vegetacion_arborea_EC015',
    titulo:       'Bosques y selvas de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['bosque', 'selva', 'monte', 'vegetación', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  monte_ar: {
    source:       'ign_ar',
    typename:     'ign:vegetacion_arborea_060302',
    titulo:       'Monte bajo de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['monte', 'monte bajo', 'vegetación', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  bosque_artificial_ar: {
    source:       'ign_ar',
    typename:     'ign:vegetacion_arborea_060301',
    titulo:       'Bosques artificiales de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['bosque artificial', 'forestación', 'eucaliptos', 'pinos', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  parque_artificial_ar: {
    source:       'ign_ar',
    typename:     'ign:vegetacion_arborea_AK120',
    titulo:       'Parques y arboledas de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['parque', 'arboleda', 'vegetación urbana', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  estepa_ar: {
    source:       'ign_ar',
    typename:     'ign:vegetacion_arbustiva_EB015',
    titulo:       'Estepas arbustivas de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['estepa', 'arbustal', 'matorral', 'vegetación', 'patagonia', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  pajonal_ar: {
    source:       'ign_ar',
    typename:     'ign:vegetacion_hidrofila_ED020',
    titulo:       'Pajonales y juncales de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['pajonal', 'juncal', 'totoral', 'bañado', 'vegetación hidrófila', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  plantacion_ar: {
    source:       'ign_ar',
    typename:     'ign:plantacion_permanente_KB025',
    titulo:       'Plantaciones permanentes de Argentina',
    geomType:     'polygon',
    labelField:   null,
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['plantación', 'viñedo', 'frutales', 'cultivo permanente', 'argentina'],
    attributes: [
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  cultivo_ar: {
    source:       'ign_ar',
    typename:     'ign:terreno_para_cultivo_EA010',
    titulo:       'Terrenos de cultivo de Argentina',
    geomType:     'polygon',
    labelField:   null,
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['cultivo', 'chacra', 'campo sembrado', 'argentina'],
    attributes: [
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },


  // ── Áreas protegidas ────────────────────────────────────────────

  area_protegida_ar: {
    source:       'ign_ar',
    typename:     'ign:area_protegida',
    titulo:       'Áreas protegidas de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['área protegida', 'áreas protegidas', 'reserva', 'parque nacional', 'parque', 'reserva natural', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'tap', label: 'Tipo área protegida' },
      { campo: 'jap', label: 'Jurisdicción' },
    ]
  },


  // ── Energía ─────────────────────────────────────────────────────

  central_electrica_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_energia_AD010',
    titulo:       'Centrales eléctricas de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['central eléctrica', 'central térmica', 'central hidroeléctrica', 'energía', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  subestacion_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_energia_AD030',
    titulo:       'Subestaciones eléctricas de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['subestación', 'transformador', 'energía eléctrica', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  linea_alta_tension_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_de_energia_AT030',
    titulo:       'Líneas de alta tensión de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['línea eléctrica', 'alta tensión', 'tendido eléctrico', 'energía', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  ducto_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_de_estructura_asociada_ducto_subterraneo',
    titulo:       'Ductos subterráneos de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['ducto', 'gasoducto', 'oleoducto', 'infraestructura', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },


  // ── Telecomunicaciones ──────────────────────────────────────────

  antena_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_comunicacion_AT010',
    titulo:       'Antenas de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['antena', 'telecomunicaciones', 'torre de comunicación', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  torre_telecomunicacion_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_comunicacion_AT080',
    titulo:       'Torres de telecomunicaciones de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['torre de telecomunicaciones', 'antena', 'radio', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },


  // ── Salud ───────────────────────────────────────────────────────

  salud_ar: {
    source:       'ign_ar',
    typename:     'ign:salud_020801',
    titulo:       'Establecimientos de salud de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['hospital', 'clínica', 'centro de salud', 'sanatorio', 'salud', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'nam', label: 'Nombre corto' },
    ]
  },


  // ── Educación y ciencia ─────────────────────────────────────────

  educacion_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_ciencia_y_educacion_020601',
    titulo:       'Establecimientos educativos de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['escuela', 'colegio', 'jardín de infantes', 'educación', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'nam', label: 'Nombre corto' },
    ]
  },

  universidad_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_ciencia_y_educacion_020602',
    titulo:       'Universidades de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['universidad', 'facultad', 'instituto', 'educación superior', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'nam', label: 'Nombre corto' },
    ]
  },

  observatorio_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_ciencia_y_educacion_AL295',
    titulo:       'Observatorios e institutos científicos de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['observatorio', 'instituto científico', 'ciencia', 'investigación', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'nam', label: 'Nombre corto' },
    ]
  },


  // ── Cultura, religión y patrimonio ──────────────────────────────

  cultura_ar: {
    source:       'ign_ar',
    typename:     'ign:cultura_y_religion_AL021',
    titulo:       'Edificios culturales de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['biblioteca', 'museo', 'teatro', 'centro cultural', 'cultura', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  iglesia_ar: {
    source:       'ign_ar',
    typename:     'ign:cultura_y_religion_AL330',
    titulo:       'Edificios religiosos de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['iglesia', 'templo', 'catedral', 'capilla', 'religión', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  monumento_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_equipamiento_AL130',
    titulo:       'Monumentos de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['monumento', 'monumentos', 'estatua', 'memorial', 'patrimonio', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  ruina_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_asentamientos_y_edificios_ruina',
    titulo:       'Ruinas de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['ruina', 'ruinas', 'patrimonio', 'historia', 'argentina'],
    attributes: [
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },


  // ── Equipamiento urbano ─────────────────────────────────────────

  cementerio_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_equipamiento_AL030',
    titulo:       'Cementerios de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['cementerio', 'cementerios', 'panteón', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  cementerio_area_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_equipamiento_AL030',
    titulo:       'Cementerios (área) de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      'auxiliar',
    visible:      false,
    keywords:     ['cementerio', 'cementerios', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  espacio_verde_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_equipamiento_AL170',
    titulo:       'Espacios verdes de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['parque', 'plaza', 'espacio verde', 'jardín', 'paseo', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  deporte_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_recreacion_AK040',
    titulo:       'Instalaciones deportivas de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['estadio', 'instalación deportiva', 'deporte', 'cancha', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  ski_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_recreacion_020401',
    titulo:       'Centros de esquí de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['esquí', 'centro de ski', 'nieve', 'deportes de invierno', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  refugio_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_equipamiento_AH030',
    titulo:       'Refugios de montaña de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['refugio', 'refugio de montaña', 'trekking', 'montaña', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  sitio_interes_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_asentamientos_y_edificios_AL201',
    titulo:       'Sitios de interés de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['sitio de interés', 'atracción turística', 'turismo', 'punto de interés', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  edificio_gubernamental_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_asentamientos_y_edificios_020101',
    titulo:       'Edificios gubernamentales de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['municipalidad', 'edificio gubernamental', 'gobierno', 'intendencia', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  correo_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_asentamientos_y_edificios_020102',
    titulo:       'Correos de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['correo', 'correo argentino', 'oficina postal', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  planta_urbana_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_asentamientos_y_edificios_020105',
    titulo:       'Plantas urbanas de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['área urbana', 'ciudad', 'planta urbana', 'ejido urbano', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  edificacion_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_asentamientos_y_edificios_AL015',
    titulo:       'Edificaciones de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      'auxiliar',
    visible:      false,
    keywords:     ['edificación', 'construcción', 'puesto', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  tapera_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_asentamientos_y_edificios_020108',
    titulo:       'Taperas de Argentina',
    geomType:     'point',
    labelField:   null,
    clipStrategy: 'spatial',
    special:      'auxiliar',
    visible:      false,
    keywords:     ['tapera', 'ruinas', 'construcción abandonada', 'argentina'],
    attributes: [
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  tanque_agua_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_almacenamiento_y_logistica_AM080',
    titulo:       'Tanques de agua de Argentina',
    geomType:     'point',
    labelField:   null,
    clipStrategy: 'spatial',
    special:      'auxiliar',
    visible:      false,
    keywords:     ['tanque de agua', 'depósito de agua', 'argentina'],
    attributes: [
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  tanque_combustible_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_almacenamiento_y_logistica_AM070',
    titulo:       'Tanques de combustible de Argentina',
    geomType:     'point',
    labelField:   null,
    clipStrategy: 'spatial',
    special:      'auxiliar',
    visible:      false,
    keywords:     ['tanque de combustible', 'depósito de combustible', 'argentina'],
    attributes: [
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },


  // ── Seguridad ───────────────────────────────────────────────────

  instalacion_militar_ar: {
    source:       'ign_ar',
    typename:     'ign:instalacion_militar_SU001',
    titulo:       'Instalaciones militares de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['instalación militar', 'cuartel', 'base militar', 'ejército', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  bomberos_ar: {
    source:       'ign_ar',
    typename:     'ign:estructuras_operativas_y_defensivas_090102',
    titulo:       'Cuarteles de bomberos de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['bomberos', 'cuartel de bomberos', 'emergencias', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  seguridad_ar: {
    source:       'ign_ar',
    typename:     'ign:estructuras_operativas_y_defensivas_FA517',
    titulo:       'Edificios de seguridad de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['policía', 'seguridad', 'comisaría', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  carcel_ar: {
    source:       'ign_ar',
    typename:     'ign:estructuras_operativas_y_defensivas_090101',
    titulo:       'Instituciones penitenciarias de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['cárcel', 'penitenciaría', 'centro de detención', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },


  // ── Minería y extracción ────────────────────────────────────────

  cantera_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_extraccion_AA010',
    titulo:       'Canteras y minas de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['cantera', 'mina', 'minería', 'extracción mineral', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'nam', label: 'Nombre corto' },
    ]
  },

  cantera_area_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_extraccion_AA012',
    titulo:       'Canteras (área) de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['cantera', 'mina', 'minería', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  pozo_hidrocarburo_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_extraccion_AA050',
    titulo:       'Pozos de hidrocarburos de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      true,
    keywords:     ['pozo petrolífero', 'pozo de gas', 'hidrocarburos', 'petróleo', 'gas', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  yacimiento_hidrocarburo_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_extraccion_AA052',
    titulo:       'Yacimientos de hidrocarburos de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['yacimiento', 'yacimiento petrolífero', 'hidrocarburos', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  zona_minera_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_estructura_asociada_010601',
    titulo:       'Zonas de extracción minera de Argentina',
    geomType:     'polygon',
    labelField:   null,
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['zona minera', 'minería', 'extracción', 'argentina'],
    attributes: [
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },


  // ── Industria y servicios ───────────────────────────────────────

  fabrica_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_fabricacion_y_procesamiento_AC000',
    titulo:       'Fábricas de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['fábrica', 'industria', 'planta industrial', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  parque_industrial_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_fabricacion_y_procesamiento_AC070',
    titulo:       'Parques industriales de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['parque industrial', 'zona industrial', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  potabilizadora_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_fabricacion_y_procesamiento_BH220',
    titulo:       'Plantas potabilizadoras de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['planta potabilizadora', 'agua potable', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
    ]
  },

  potabilizadora_area_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_fabricacion_y_procesamiento_BH220',
    titulo:       'Plantas potabilizadoras (área) de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['planta potabilizadora', 'agua potable', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  depuradora_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_fabricacion_y_procesamiento_AC507',
    titulo:       'Plantas depuradoras de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['planta depuradora', 'tratamiento de efluentes', 'cloacas', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
    ]
  },

  depuradora_area_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_fabricacion_y_procesamiento_AC507',
    titulo:       'Plantas depuradoras (área) de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['planta depuradora', 'tratamiento de efluentes', 'cloacas', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  planta_residuos_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_gestion_de_residuos_AB030',
    titulo:       'Plantas de tratamiento de residuos de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['planta de residuos', 'basura', 'reciclaje', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
    ]
  },

  planta_residuos_area_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_gestion_de_residuos_AB030',
    titulo:       'Plantas de tratamiento de residuos (área) de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['planta de residuos', 'basura', 'reciclaje', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  relleno_sanitario_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_gestion_de_residuos_relleno_sanitario',
    titulo:       'Rellenos sanitarios de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['relleno sanitario', 'basural', 'residuos', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  basural_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_gestion_de_residuos_AB000',
    titulo:       'Basurales de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['basural', 'vertedero', 'residuos', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  establecimiento_agropecuario_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_actividad_agropecuaria_AL270',
    titulo:       'Establecimientos agropecuarios de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['establecimiento agropecuario', 'campo', 'estancia', 'chacra', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  invernadero_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_actividad_agropecuaria_AJ110',
    titulo:       'Invernaderos y viveros de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['invernadero', 'vivero', 'huerta', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo', classifiable: true },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  invernadero_area_ar: {
    source:       'ign_ar',
    typename:     'ign:areas_de_actividad_agropecuaria_AJ110',
    titulo:       'Invernaderos y viveros (área) de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    visible:      false,
    keywords:     ['invernadero', 'vivero', 'huerta', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  molino_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_actividad_agropecuaria_AJ050',
    titulo:       'Molinos de viento de Argentina',
    geomType:     'point',
    labelField:   null,
    clipStrategy: 'spatial',
    special:      'auxiliar',
    visible:      false,
    keywords:     ['molino de viento', 'molino', 'bomba de agua', 'argentina'],
    attributes: [
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  camara_valvulas_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_estructura_asociada_AA051',
    titulo:       'Cámaras de válvulas de Argentina',
    geomType:     'point',
    labelField:   null,
    clipStrategy: 'spatial',
    special:      'auxiliar',
    visible:      false,
    keywords:     ['cámara de válvulas', 'infraestructura hidráulica', 'argentina'],
    attributes: [
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  planta_bombeo_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_estructura_asociada_AQ116',
    titulo:       'Plantas de bombeo de agua de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      'auxiliar',
    visible:      false,
    keywords:     ['planta de bombeo', 'infraestructura hidráulica', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },

  galpon_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_estructura_asociada_AJ080',
    titulo:       'Galpones y tinglados de Argentina',
    geomType:     'point',
    labelField:   null,
    clipStrategy: 'spatial',
    special:      'auxiliar',
    visible:      false,
    keywords:     ['galpón', 'tinglado', 'depósito', 'argentina'],
    attributes: [
      { campo: 'objeto', label: 'Objeto', classifiable: true },
    ]
  },


  // ── Antártica ───────────────────────────────────────────────────

  base_antartica_ar: {
    source:       'ign_ar',
    typename:     'ign:bahra_base_antartica',
    titulo:       'Bases antárticas de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: null,
    special:      false,
    visible:      true,
    keywords:     ['base antártica', 'antártida', 'base', 'antártico', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'tipo_asent', label: 'Tipo', classifiable: true },
      { campo: 'nom_depto', label: 'Departamento' },
    ]
  },


  // ── Cartográfico y geodésico ────────────────────────────────────

  cartas_50000_ar: {
    source:       'ign_ar',
    typename:     'ign:cartas_50000',
    titulo:       'Cartas topográficas 1:50.000 de Argentina',
    geomType:     'polygon',
    labelField:   'nombre',
    clipStrategy: null,
    special:      'cartografico',
    visible:      false,
    keywords:     ['carta topográfica', 'hoja topográfica', '1:50000', 'cartografía', 'argentina'],
    attributes: [
      { campo: 'nombre', label: 'Nombre' },
      { campo: 'carac', label: 'Nomenclatura' },
      { campo: 'num_faja', label: 'Faja', numeric: true },
      { campo: 'fecha_edic', label: 'Fecha edición' },
    ]
  },

  cartas_100000_ar: {
    source:       'ign_ar',
    typename:     'ign:cartas_100000',
    titulo:       'Cartas topográficas 1:100.000 de Argentina',
    geomType:     'polygon',
    labelField:   'nombre',
    clipStrategy: null,
    special:      'cartografico',
    visible:      false,
    keywords:     ['carta topográfica', 'hoja topográfica', '1:100000', 'cartografía', 'argentina'],
    attributes: [
      { campo: 'nombre', label: 'Nombre' },
      { campo: 'carac', label: 'Nomenclatura' },
      { campo: 'num_faja', label: 'Faja', numeric: true },
      { campo: 'fecha_edic', label: 'Fecha edición' },
    ]
  },

  cartas_250000_ar: {
    source:       'ign_ar',
    typename:     'ign:cartas_250000',
    titulo:       'Cartas topográficas 1:250.000 de Argentina',
    geomType:     'polygon',
    labelField:   'nombre',
    clipStrategy: null,
    special:      'cartografico',
    visible:      false,
    keywords:     ['carta topográfica', 'hoja topográfica', '1:250000', 'cartografía', 'argentina'],
    attributes: [
      { campo: 'nombre', label: 'Nombre' },
      { campo: 'carac', label: 'Nomenclatura' },
      { campo: 'num_faja', label: 'Faja', numeric: true },
      { campo: 'fecha_edic', label: 'Fecha edición' },
    ]
  },

  cartas_500000_ar: {
    source:       'ign_ar',
    typename:     'ign:cartas_500000',
    titulo:       'Cartas topográficas 1:500.000 de Argentina',
    geomType:     'polygon',
    labelField:   'nombre',
    clipStrategy: null,
    special:      'cartografico',
    visible:      false,
    keywords:     ['carta topográfica', 'hoja topográfica', '1:500000', 'cartografía', 'argentina'],
    attributes: [
      { campo: 'nombre', label: 'Nombre' },
      { campo: 'carac', label: 'Nomenclatura' },
      { campo: 'num_faja', label: 'Faja', numeric: true },
      { campo: 'fecha_edic', label: 'Fecha edición' },
    ]
  },

  ramsac_ar: {
    source:       'ign_ar',
    typename:     'ign:ramsac',
    titulo:       'Red RAMSAC de Argentina',
    geomType:     'point',
    labelField:   null,
    clipStrategy: null,
    special:      'cartografico',
    visible:      false,
    keywords:     ['RAMSAC', 'red geodésica', 'GPS', 'georreferenciación', 'argentina'],
    attributes: [
      { campo: 'codigo_estacion', label: 'Código' },
      { campo: 'tipo_estacion', label: 'Tipo' },
      { campo: 'estado', label: 'Estado' },
    ]
  },

  ramsac_ntrip_ar: {
    source:       'ign_ar',
    typename:     'ign:ramsac_ntrip',
    titulo:       'Red RAMSAC NTRIP de Argentina',
    geomType:     'point',
    labelField:   null,
    clipStrategy: null,
    special:      'cartografico',
    visible:      false,
    keywords:     ['RAMSAC', 'NTRIP', 'red geodésica', 'GPS', 'argentina'],
    attributes: [
      { campo: 'fun', label: 'Función' },
      { campo: 'cer', label: 'Código' },
    ]
  },

  nivelacion_topografica_ar: {
    source:       'ign_ar',
    typename:     'ign:nivelacion_topografica',
    titulo:       'Nivelación topográfica de Argentina',
    geomType:     'point',
    labelField:   null,
    clipStrategy: null,
    special:      'cartografico',
    visible:      false,
    keywords:     ['nivelación', 'topografía', 'red de nivelación', 'argentina'],
    attributes: [
      { campo: 'nomenclatura', label: 'Nomenclatura' },
      { campo: 'red', label: 'Red' },
      { campo: 'cota', label: 'Cota', numeric: true },
    ]
  },

  nivelacion_alta_precision_ar: {
    source:       'ign_ar',
    typename:     'ign:nivelacion_alta_precision',
    titulo:       'Nivelación de alta precisión de Argentina',
    geomType:     'point',
    labelField:   null,
    clipStrategy: null,
    special:      'cartografico',
    visible:      false,
    keywords:     ['nivelación', 'alta precisión', 'geodesia', 'argentina'],
    attributes: [
      { campo: 'nomenclatura', label: 'Nomenclatura' },
      { campo: 'red', label: 'Red' },
      { campo: 'cota', label: 'Cota', numeric: true },
    ]
  },

  nivelacion_precision_ar: {
    source:       'ign_ar',
    typename:     'ign:nivelacion_precision',
    titulo:       'Red de nivelación de precisión de Argentina',
    geomType:     'point',
    labelField:   null,
    clipStrategy: null,
    special:      'cartografico',
    visible:      false,
    keywords:     ['nivelación', 'precisión', 'geodesia', 'argentina'],
    attributes: [
      { campo: 'nomenclatura', label: 'Nomenclatura' },
      { campo: 'red', label: 'Red' },
      { campo: 'cota', label: 'Cota', numeric: true },
    ]
  },

  red_posgar_densif_ar: {
    source:       'ign_ar',
    typename:     'ign:red_densificacion_posgar',
    titulo:       'Red de densificación POSGAR de Argentina',
    geomType:     'point',
    labelField:   null,
    clipStrategy: null,
    special:      'cartografico',
    visible:      false,
    keywords:     ['POSGAR', 'red geodésica', 'datum', 'argentina'],
    attributes: [
      { campo: 'nomenclatura', label: 'Nomenclatura' },
      { campo: 'red', label: 'Red' },
    ]
  },

  red_pasma_ar: {
    source:       'ign_ar',
    typename:     'ign:red_pasma',
    titulo:       'Red PASMA de Argentina',
    geomType:     'point',
    labelField:   null,
    clipStrategy: null,
    special:      'cartografico',
    visible:      false,
    keywords:     ['PASMA', 'red geodésica', 'argentina'],
    attributes: [
      { campo: 'nomenclatura', label: 'Nomenclatura' },
      { campo: 'red', label: 'Red' },
    ]
  },

  red_posgar_ar: {
    source:       'ign_ar',
    typename:     'ign:red_posgar',
    titulo:       'Red POSGAR de Argentina',
    geomType:     'point',
    labelField:   null,
    clipStrategy: null,
    special:      'cartografico',
    visible:      false,
    keywords:     ['POSGAR', 'red geodésica', 'datum', 'argentina'],
    attributes: [
      { campo: 'nomenclatura', label: 'Nomenclatura' },
      { campo: 'red', label: 'Red' },
    ]
  },

  red_provincial_ar: {
    source:       'ign_ar',
    typename:     'ign:red_provincial',
    titulo:       'Red geodésica provincial de Argentina',
    geomType:     'point',
    labelField:   null,
    clipStrategy: null,
    special:      'cartografico',
    visible:      false,
    keywords:     ['red provincial', 'geodesia', 'argentina'],
    attributes: [
      { campo: 'nomenclatura', label: 'Nomenclatura' },
      { campo: 'red', label: 'Red' },
    ]
  },

  gravimetria_bacara_ar: {
    source:       'ign_ar',
    typename:     'ign:gravimetria_bacara',
    titulo:       'Red gravimétrica BACARA de Argentina',
    geomType:     'point',
    labelField:   null,
    clipStrategy: null,
    special:      'cartografico',
    visible:      false,
    keywords:     ['gravimetría', 'BACARA', 'red gravimétrica', 'argentina'],
    attributes: [
      { campo: 'nomenclatura', label: 'Nomenclatura' },
      { campo: 'red', label: 'Red' },
    ]
  },

  gravimetria_igsn71_ar: {
    source:       'ign_ar',
    typename:     'ign:gravimetria_igsn71',
    titulo:       'Red gravimétrica IGSN71 de Argentina',
    geomType:     'point',
    labelField:   null,
    clipStrategy: null,
    special:      'cartografico',
    visible:      false,
    keywords:     ['gravimetría', 'IGSN71', 'red gravimétrica', 'argentina'],
    attributes: [
      { campo: 'nomenclatura', label: 'Nomenclatura' },
      { campo: 'red', label: 'Red' },
    ]
  },

  gravimetria_raga_ar: {
    source:       'ign_ar',
    typename:     'ign:gravimetria_raga',
    titulo:       'Red gravimétrica RAGA de Argentina',
    geomType:     'point',
    labelField:   null,
    clipStrategy: null,
    special:      'cartografico',
    visible:      false,
    keywords:     ['gravimetría', 'RAGA', 'red gravimétrica', 'argentina'],
    attributes: [
      { campo: 'nomenclatura', label: 'Nomenclatura' },
      { campo: 'red', label: 'Red' },
    ]
  },

  gravimetria_rpo_ar: {
    source:       'ign_ar',
    typename:     'ign:gravimetria_rpo',
    titulo:       'Red gravimétrica RPO de Argentina',
    geomType:     'point',
    labelField:   null,
    clipStrategy: null,
    special:      'cartografico',
    visible:      false,
    keywords:     ['gravimetría', 'RPO', 'red gravimétrica', 'argentina'],
    attributes: [
      { campo: 'nomenclatura', label: 'Nomenclatura' },
      { campo: 'red', label: 'Red' },
    ]
  },

  gravimetria_rso_ar: {
    source:       'ign_ar',
    typename:     'ign:gravimetria_rso',
    titulo:       'Red gravimétrica RSO de Argentina',
    geomType:     'point',
    labelField:   null,
    clipStrategy: null,
    special:      'cartografico',
    visible:      false,
    keywords:     ['gravimetría', 'RSO', 'red gravimétrica', 'argentina'],
    attributes: [
      { campo: 'nomenclatura', label: 'Nomenclatura' },
      { campo: 'red', label: 'Red' },
    ]
  },

  gravimetria_rto_ar: {
    source:       'ign_ar',
    typename:     'ign:gravimetria_rto',
    titulo:       'Red gravimétrica RTO de Argentina',
    geomType:     'point',
    labelField:   null,
    clipStrategy: null,
    special:      'cartografico',
    visible:      false,
    keywords:     ['gravimetría', 'RTO', 'red gravimétrica', 'argentina'],
    attributes: [
      { campo: 'nomenclatura', label: 'Nomenclatura' },
      { campo: 'red', label: 'Red' },
    ]
  },

  mde_ar: {
    source:       'ign_ar',
    typename:     'ign:mde',
    titulo:       'Modelos digitales de elevación de Argentina',
    geomType:     'polygon',
    labelField:   'nombre',
    clipStrategy: null,
    special:      'raster',
    visible:      false,
    keywords:     ['modelo de elevación', 'MDT', 'MDE', 'topografía', 'argentina'],
    attributes: [
      { campo: 'nombre', label: 'Nombre' },
      { campo: 'proyecto', label: 'Proyecto' },
      { campo: 'archivo', label: 'Archivo' },
    ]
  },

  vuelos_dsr_ar: {
    source:       'ign_ar',
    typename:     'ign:area_vuelos_dsr_sig',
    titulo:       'Áreas de vuelos fotogramétricos del IGN',
    geomType:     'polygon',
    labelField:   null,
    clipStrategy: null,
    special:      'cartografico',
    visible:      false,
    keywords:     ['vuelo fotogramétrico', 'ortofoto', 'fotografía aérea', 'argentina'],
    attributes: [
      { campo: 'num_proyec', label: 'N° Proyecto' },
      { campo: 'nombre_ign', label: 'Nombre' },
      { campo: 'sector', label: 'Sector' },
      { campo: 'fecha_vuel', label: 'Fecha vuelo' },
    ]
  },

  vuelos_vant_ar: {
    source:       'ign_ar',
    typename:     'ign:area_vuelos_vant_sig',
    titulo:       'Áreas de vuelos VANT del IGN',
    geomType:     'polygon',
    labelField:   null,
    clipStrategy: null,
    special:      'cartografico',
    visible:      false,
    keywords:     ['vuelo dron', 'VANT', 'UAV', 'fotogrametría', 'argentina'],
    attributes: [
      { campo: 'num_proyec', label: 'N° Proyecto' },
      { campo: 'nombre_ign', label: 'Nombre' },
      { campo: 'sector', label: 'Sector' },
      { campo: 'fecha_vuel', label: 'Fecha vuelo' },
    ]
  },

};

export const PROVINCIAS_MAP_AR = {
  'buenos aires': 'Buenos Aires',
  'bsas': 'Buenos Aires',
  'caba': 'Ciudad Autónoma de Buenos Aires',
  'ciudad autónoma': 'Ciudad Autónoma de Buenos Aires',
  'ciudad de buenos aires': 'Ciudad Autónoma de Buenos Aires',
  'catamarca': 'Catamarca',
  'chaco': 'Chaco',
  'chubut': 'Chubut',
  'córdoba': 'Córdoba',
  'cordoba': 'Córdoba',
  'corrientes': 'Corrientes',
  'entre ríos': 'Entre Ríos',
  'entre rios': 'Entre Ríos',
  'formosa': 'Formosa',
  'jujuy': 'Jujuy',
  'la pampa': 'La Pampa',
  'la rioja': 'La Rioja',
  'mendoza': 'Mendoza',
  'misiones': 'Misiones',
  'neuquén': 'Neuquén',
  'neuquen': 'Neuquén',
  'río negro': 'Río Negro',
  'rio negro': 'Río Negro',
  'salta': 'Salta',
  'san juan': 'San Juan',
  'san luis': 'San Luis',
  'santa cruz': 'Santa Cruz',
  'santa fe': 'Santa Fe',
  'santiago del estero': 'Santiago del Estero',
  'tierra del fuego': 'Tierra del Fuego',
  'tucumán': 'Tucumán',
  'tucuman': 'Tucumán',
};

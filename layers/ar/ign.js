/**
 * layers/ar/ign.js — Capas del IGN Argentina
 *
 * Instituto Geográfico Nacional — https://wms.ign.gob.ar/geoserver/ows
 * Un único WFS, todas las capas disponibles acá.
 *
 * Convenciones:
 *  - Todas las keys llevan sufijo _ar para consistencia entre países.
 *  - special: false             → capa general de uso público
 *  - special: 'historico'       → límites o datos de épocas pasadas
 *  - special: 'cartografico'    → uso técnico/cartográfico (grillas, índices)
 *  - special: 'tecnico'         → capas internas sin valor semántico directo
 *  - titulo y keywords en español — llm.js traduce al idioma del usuario.
 */

export const IGN_AR = {

  // ── División político-administrativa ──────────────────────────

  provincia_ar: {
    source:       'ign_ar',
    typename:     'ign:provincia',
    titulo:       'Provincias de Argentina',
    geomType:     'polygon',
    labelField:   'nam',
    clipStrategy: null,
    special:      false,
    keywords:     ['provincia', 'provincias', 'división política', 'límite provincial', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre completo' },
      { campo: 'nam', label: 'Nombre corto' },
      { campo: 'in1', label: 'Código provincia', numeric: true },
      { campo: 'gna', label: 'Tipo' }
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
    keywords:     ['departamento', 'partido', 'comuna', 'municipio', 'departamentos', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre completo' },
      { campo: 'nam', label: 'Nombre corto' },
      { campo: 'in1', label: 'Código', numeric: true },
      { campo: 'gna', label: 'Tipo' }
    ]
  },

  localidad_ar: {
    source:        'ign_ar',
    typename:      'ign:localidad_bahra',
    titulo:        'Localidades de Argentina',
    geomType:      'point',
    labelField:    'fna',
    geoFields:     { provincia: 'nom_pcia', departamento: 'nom_depto' },
    clipStrategy:  'attribute',
    clipField:     'nom_pcia',
    clipFieldCode: 'cod_pcia',
    special:       false,
    keywords:      ['localidad', 'localidades', 'ciudad', 'pueblo', 'poblado', 'asentamiento', 'argentina'],
    attributes: [
      { campo: 'fna',        label: 'Nombre' },
      { campo: 'tipo_asent', label: 'Tipo de asentamiento', classifiable: true },
      { campo: 'nom_pcia',   label: 'Provincia' },
      { campo: 'nom_depto',  label: 'Departamento' }
    ]
  },

  // ── Transporte ────────────────────────────────────────────────

  vial_nacional_ar: {
    source:       'ign_ar',
    typename:     'ign:vial_nacional',
    titulo:       'Red vial nacional de Argentina',
    geomType:     'line',
    labelField:   'rtn',
    clipStrategy: 'spatial',
    special:      false,
    keywords:     ['ruta', 'rutas', 'red vial', 'vial', 'carretera', 'camino nacional', 'argentina'],
    attributes: [
      { campo: 'rtn', label: 'Número de ruta', numeric: true },
      { campo: 'typ', label: 'Tipo de vía',    classifiable: true },
      { campo: 'rst', label: 'Estado',         classifiable: true }
    ]
  },

  puentes_ar: {
    source:       'ign_ar',
    typename:     'ign:lineas_de_cruces_y_enlaces_AQ040',
    titulo:       'Puentes de Argentina',
    geomType:     'line',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    keywords:     ['puente', 'puentes', 'viaducto', 'cruce', 'enlace', 'argentina'],
    attributes: [
      { campo: 'fna',    label: 'Nombre' },
      { campo: 'objeto', label: 'Tipo' },
      { campo: 'tup',    label: 'Uso' }
    ]
  },

  puertos_ar: {
    source:       'ign_ar',
    typename:     'ign:puntos_de_puertos_y_muelles_BB005',
    titulo:       'Puertos de Argentina',
    geomType:     'point',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    keywords:     ['puerto', 'puertos', 'muelle', 'muelles', 'terminal portuaria', 'argentina'],
    attributes: [
      { campo: 'fna',    label: 'Nombre' },
      { campo: 'gna',    label: 'Tipo' },
      { campo: 'objeto', label: 'Objeto' }
    ]
  },

  pasos_frontera_ar: {
    source:       'ign_ar',
    typename:     'ign:pasos_de_fronteras_internacionales',
    titulo:       'Pasos de frontera internacionales de Argentina',
    geomType:     'point',
    labelField:   'nom_pfi',
    geoFields:    { provincia: 'prov', pais: 'pvecino' },
    clipStrategy: 'attribute',
    clipField:    'prov',
    special:      false,
    keywords:     ['paso', 'pasos', 'frontera', 'paso fronterizo', 'paso internacional', 'argentina'],
    attributes: [
      { campo: 'nom_pfi',   label: 'Nombre' },
      { campo: 'cruce_pfi', label: 'Tipo de cruce',  classifiable: true },
      { campo: 'pvecino',   label: 'País vecino',    classifiable: true },
      { campo: 'prov',      label: 'Provincia' },
      { campo: 'hab_migr',  label: 'Habilitación migratoria' }
    ]
  },

  // ── Medio ambiente ────────────────────────────────────────────

  area_protegida_ar: {
    source:       'ign_ar',
    typename:     'ign:area_protegida',
    titulo:       'Áreas protegidas de Argentina',
    geomType:     'polygon',
    labelField:   'fna',
    clipStrategy: 'spatial',
    special:      false,
    keywords:     ['área protegida', 'areas protegidas', 'reserva', 'parque nacional', 'parque', 'reserva natural', 'argentina'],
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo de área',       classifiable: true },
      { campo: 'tap', label: 'Tipo área protegida' },
      { campo: 'jap', label: 'Jurisdicción' }
    ]
  },

  // ── Especiales ────────────────────────────────────────────────

  base_antartica_ar: {
    source:       'ign_ar',
    typename:     'ign:bahra_base_antartica',
    titulo:       'Bases antárticas de Argentina',
    geomType:     'point',
    labelField:   'fna',
    geoFields:    { departamento: 'nom_depto' },
    clipStrategy: null,
    special:      false,
    keywords:     ['base antártica', 'antártida', 'base', 'antártico', 'argentina'],
    attributes: [
      { campo: 'fna',        label: 'Nombre' },
      { campo: 'tipo_asent', label: 'Tipo' },
      { campo: 'nom_depto',  label: 'Departamento' }
    ]
  },

};

export const PROVINCIAS_MAP_AR = {
  'buenos aires':           'Buenos Aires',
  'bsas':                   'Buenos Aires',
  'caba':                   'Ciudad Autónoma de Buenos Aires',
  'ciudad autónoma':        'Ciudad Autónoma de Buenos Aires',
  'ciudad de buenos aires': 'Ciudad Autónoma de Buenos Aires',
  'catamarca':              'Catamarca',
  'chaco':                  'Chaco',
  'chubut':                 'Chubut',
  'córdoba':                'Córdoba',
  'cordoba':                'Córdoba',
  'corrientes':             'Corrientes',
  'entre ríos':             'Entre Ríos',
  'entre rios':             'Entre Ríos',
  'formosa':                'Formosa',
  'jujuy':                  'Jujuy',
  'la pampa':               'La Pampa',
  'la rioja':               'La Rioja',
  'mendoza':                'Mendoza',
  'misiones':               'Misiones',
  'neuquén':                'Neuquén',
  'neuquen':                'Neuquén',
  'río negro':              'Río Negro',
  'rio negro':              'Río Negro',
  'salta':                  'Salta',
  'san juan':               'San Juan',
  'san luis':               'San Luis',
  'santa cruz':             'Santa Cruz',
  'santa fe':               'Santa Fe',
  'santiago del estero':    'Santiago del Estero',
  'tierra del fuego':       'Tierra del Fuego',
  'tucumán':                'Tucumán',
  'tucuman':                'Tucumán',
};

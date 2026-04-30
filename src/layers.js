/**
 * layers.js — Catálogo de capas IGN
 * Fuente: IGN Argentina, WFS https://wms.ign.gob.ar/geoserver/ows
 *
 * Cada capa define:
 *   typename       → nombre técnico para la petición WFS
 *   titulo         → nombre legible
 *   geomType       → polygon | line | point
 *   clipStrategy   → 'attribute' si tiene campo de provincia/departamento
 *                    'spatial'   si hay que recortar con otra capa
 *   clipField      → campo a filtrar (solo para attribute)
 *   clipFieldProv  → campo de código de provincia (para filtros exactos)
 *   keywords       → palabras que la IA puede usar para identificar la capa
 *   defaultStyle   → estilos iniciales
 *   attributes     → campos disponibles (para editor y clasificación)
 */

window.LAYERS = {

  provincia: {
    typename:      'ign:provincia',
    titulo:        'Provincias',
    geomType:      'polygon',
    labelField:    'nam',
    clipStrategy:  null,          // es la capa de recorte base
    keywords:      ['provincia', 'provincias', 'división política', 'límite provincial'],
    defaultStyle: {
      fillColor:   '#c8622a',
      fillOpacity: 0.12,
      color:       '#c8622a',
      weight:      1.5,
      opacity:     1
    },
    attributes: [
      { campo: 'fna', label: 'Nombre completo' },
      { campo: 'nam', label: 'Nombre corto' },
      { campo: 'in1', label: 'Código provincia', numeric: true },
      { campo: 'gna', label: 'Tipo' }
    ]
  },

  departamento: {
    typename:      'ign:departamento',
    titulo:        'Departamentos',
    geomType:      'polygon',
    labelField:    'nam',
    clipStrategy:  'spatial',     // no tiene campo de provincia → recorte espacial
    keywords:      ['departamento', 'partido', 'comuna', 'municipio', 'departamentos'],
    defaultStyle: {
      fillColor:   '#4a7fa5',
      fillOpacity: 0.10,
      color:       '#4a7fa5',
      weight:      1,
      opacity:     0.8
    },
    attributes: [
      { campo: 'fna', label: 'Nombre completo' },
      { campo: 'nam', label: 'Nombre corto' },
      { campo: 'in1', label: 'Código', numeric: true },
      { campo: 'gna', label: 'Tipo' }
    ]
  },

  localidad_bahra: {
    typename:      'ign:localidad_bahra',
    titulo:        'Localidades',
    geomType:      'point',
    labelField:    'fna',
    geoFields:     { provincia: 'nom_pcia', departamento: 'nom_depto' },
    clipStrategy:  'attribute',
    clipField:     'nom_pcia',
    clipFieldCode: 'cod_pcia',
    keywords:      ['localidad', 'localidades', 'ciudad', 'pueblo', 'poblado', 'asentamiento'],
    defaultStyle: {
      color:       '#2d6a4f',
      fillColor:   '#52b788',
      fillOpacity: 0.85,
      radius:      5,
      weight:      1.5,
      opacity:     1
    },
    attributes: [
      { campo: 'fna',        label: 'Nombre' },
      { campo: 'tipo_asent', label: 'Tipo de asentamiento', classifiable: true },
      { campo: 'nom_pcia',   label: 'Provincia' },
      { campo: 'nom_depto',  label: 'Departamento' }
    ]
  },

  vial_nacional: {
    typename:      'ign:vial_nacional',
    titulo:        'Red vial nacional',
    geomType:      'line',
    labelField:    'rtn',
    clipStrategy:  'spatial',     // no tiene campo de provincia → recorte espacial
    keywords:      ['ruta', 'rutas', 'red vial', 'vial', 'carretera', 'camino nacional'],
    defaultStyle: {
      color:   '#d4720f',
      weight:  2,
      opacity: 0.85
    },
    attributes: [
      { campo: 'rtn', label: 'Número de ruta', numeric: true },
      { campo: 'typ', label: 'Tipo de vía',    classifiable: true  },
      { campo: 'rst', label: 'Estado',         classifiable: true  }
    ]
  },

  area_protegida: {
    typename:      'ign:area_protegida',
    titulo:        'Áreas protegidas',
    geomType:      'polygon',
    labelField:    'fna',
    clipStrategy:  'spatial',
    keywords:      ['área protegida', 'areas protegidas', 'reserva', 'parque nacional', 'parque', 'reserva natural'],
    defaultStyle: {
      fillColor:   '#40916c',
      fillOpacity: 0.25,
      color:       '#1b4332',
      weight:      1.2,
      opacity:     0.9
    },
    attributes: [
      { campo: 'fna', label: 'Nombre' },
      { campo: 'gna', label: 'Tipo de área', classifiable: true },
      { campo: 'tap', label: 'Tipo área protegida' },
      { campo: 'jap', label: 'Jurisdicción' }
    ]
  },

  pasos_frontera: {
    typename:      'ign:pasos_de_fronteras_internacionales',
    titulo:        'Pasos de frontera internacionales',
    geomType:      'point',
    labelField:    'nom_pfi',
    geoFields:     { provincia: 'prov', pais: 'pvecino' },
    clipStrategy:  'attribute',
    clipField:     'prov',
    keywords:      ['paso', 'pasos', 'frontera', 'paso fronterizo', 'paso internacional', 'frontera internacional'],
    defaultStyle: {
      color:       '#6a0572',
      fillColor:   '#c77dff',
      fillOpacity: 0.9,
      radius:      6,
      weight:      1.5,
      opacity:     1
    },
    attributes: [
      { campo: 'nom_pfi',   label: 'Nombre' },
      { campo: 'cruce_pfi', label: 'Tipo de cruce', classifiable: true },
      { campo: 'pvecino',   label: 'País vecino',   classifiable: true },
      { campo: 'prov',      label: 'Provincia' },
      { campo: 'hab_migr',  label: 'Habilitación migratoria' }
    ]
  },

  puertos: {
    typename:      'ign:puntos_de_puertos_y_muelles_BB005',
    titulo:        'Puertos',
    geomType:      'point',
    labelField:    'fna',
    clipStrategy:  'spatial',
    keywords:      ['puerto', 'puertos', 'muelle', 'muelles', 'terminal portuaria'],
    defaultStyle: {
      color:       '#023e8a',
      fillColor:   '#4cc9f0',
      fillOpacity: 0.9,
      radius:      6,
      weight:      1.5,
      opacity:     1
    },
    attributes: [
      { campo: 'fna',    label: 'Nombre' },
      { campo: 'gna',    label: 'Tipo' },
      { campo: 'objeto', label: 'Objeto' }
    ]
  },

  bahra_antartica: {
    typename:      'ign:bahra_base_antartica',
    titulo:        'Bases antárticas',
    geomType:      'point',
    labelField:    'fna',
    geoFields:     { departamento: 'nom_depto' },
    clipStrategy:  null,
    keywords:      ['base antártica', 'antártida', 'base', 'antártico'],
    defaultStyle: {
      color:       '#03045e',
      fillColor:   '#90e0ef',
      fillOpacity: 0.9,
      radius:      7,
      weight:      2,
      opacity:     1
    },
    attributes: [
      { campo: 'fna',        label: 'Nombre' },
      { campo: 'tipo_asent', label: 'Tipo' },
      { campo: 'nom_depto',  label: 'Departamento' }
    ]
  },

  puentes: {
    typename:      'ign:lineas_de_cruces_y_enlaces_AQ040',
    titulo:        'Puentes',
    geomType:      'line',
    labelField:    'fna',
    clipStrategy:  'spatial',
    keywords:      ['puente', 'puentes', 'viaducto', 'cruce', 'enlace'],
    defaultStyle: {
      color:   '#5a5650',
      weight:  3,
      opacity: 0.85
    },
    attributes: [
      { campo: 'fna',    label: 'Nombre' },
      { campo: 'objeto', label: 'Tipo' },
      { campo: 'tup',    label: 'Uso' }
    ]
  }

};

/**
 * Provincias argentinas para resolución de nombres
 * Clave: variantes de nombre → valor: nombre oficial IGN (campo nom_pcia / nam)
 */
window.PROVINCIAS_MAP = {
  'buenos aires':            'Buenos Aires',
  'caba':                    'Ciudad Autónoma de Buenos Aires',
  'ciudad autónoma':         'Ciudad Autónoma de Buenos Aires',
  'catamarca':               'Catamarca',
  'chaco':                   'Chaco',
  'chubut':                  'Chubut',
  'córdoba':                 'Córdoba',
  'corrientes':              'Corrientes',
  'entre ríos':              'Entre Ríos',
  'formosa':                 'Formosa',
  'jujuy':                   'Jujuy',
  'la pampa':                'La Pampa',
  'la rioja':                'La Rioja',
  'mendoza':                 'Mendoza',
  'misiones':                'Misiones',
  'neuquén':                 'Neuquén',
  'río negro':               'Río Negro',
  'salta':                   'Salta',
  'san juan':                'San Juan',
  'san luis':                'San Luis',
  'santa cruz':              'Santa Cruz',
  'santa fe':                'Santa Fe',
  'santiago del estero':     'Santiago del Estero',
  'tierra del fuego':        'Tierra del Fuego',
  'tucumán':                 'Tucumán'
};

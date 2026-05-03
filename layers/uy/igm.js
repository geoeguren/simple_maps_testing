/**
 * layers/uy/igm.js — Capas del IGM Uruguay
 *
 * Instituto Geográfico Militar — https://sig.igm.gub.uy/geoserver/wfs
 * Un único WFS en /geoserver/wfs sirve todos los workspaces.
 *
 * Convenciones:
 *  - Keys con sufijo _uy para consistencia entre países.
 *  - special: false          → capa general de uso público
 *  - special: 'historico'    → límites según leyes históricas (1835–1934)
 *  - special: 'administrativo' → regionalizaciones internas (secciones judiciales)
 *  - visible: true  → se muestra por defecto en el catálogo de la UI
 *  - visible: false → disponible para el LLM, oculta en la UI por defecto
 *  - titulo y keywords en español — llm.js traduce al idioma del usuario.
 */

export const IGM_UY = {

  // ── División político-administrativa ──────────────────────────────────────────

  departamento_uy: {
    source:       'igm_uy',
    typename:     'LimitesDepartamentalesA:LimitesDepartamentalesA',
    titulo:       'Departamentos de Uruguay',
    geomType:     'polygon',
    labelField:   'depto',
    clipStrategy: null,
    special:      false,
    visible:      true,
    keywords:     ['departamento', 'departamentos', 'división política', 'límite departamental', 'uruguay', 'isla brasileña (contestada)', 'rincón de maneco (contestado)'],
    attributes: [
      { campo: 'depto',      label: 'Nombre' },
      { campo: 'codigo',     label: 'Código ISO' },
      { campo: 'descripcio', label: 'Descripción' },
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
    visible:      true,
    keywords:     ['municipio', 'municipios', 'ciudad', 'localidad', 'división municipal', 'uruguay'],
    attributes: [
      { campo: 'nombre',     label: 'Nombre' },
      { campo: 'codigo',     label: 'Código' },
      { campo: 'cod',        label: 'Código departamento' },
      { campo: 'poblacion',  label: 'Población', numeric: true },
      { campo: 'descriptio', label: 'Descripción' },
      { campo: 'alias',      label: 'Alias' },
    ]
  },

  // ── Administrativo ────────────────────────────────────────────────────────────

  seccion_judicial_uy: {
    source:       'igm_uy',
    typename:     'SeccionalesJudiciales250:SeccionesJudiciales',
    titulo:       'Secciones judiciales de Uruguay',
    geomType:     'polygon',
    labelField:   'numero',
    clipStrategy: null,
    special:      'administrativo',
    visible:      false,
    keywords:     ['sección judicial', 'secciones judiciales', 'judicial', 'jurisdicción', 'juzgado', 'uruguay'],
    attributes: [
      { campo: 'numero',     label: 'Número de sección', numeric: true },
      { campo: 'depto',      label: 'Departamento' },
      { campo: 'localidad',  label: 'Localidad' },
      { campo: 'descriptio', label: 'Descripción' },
    ]
  },

  // ── Límites nacionales ────────────────────────────────────────────────────────

  limite_terrestre_uy: {
    source:       'igm_uy',
    typename:     'LimitesNacionalesTerrestres:LimitesNacionalesTerrestres',
    titulo:       'Límites nacionales terrestres de Uruguay',
    geomType:     'line',
    labelField:   'def',
    clipStrategy: null,
    special:      false,
    visible:      true,
    keywords:     ['límite', 'límite nacional', 'frontera', 'límite terrestre', 'uruguay', 'cuchilla negra', 'cuchilla santa ana', 'rivera - livramento'],
    attributes: [
      { campo: 'def', label: 'Definición' },
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
    visible:      true,
    keywords:     ['límite marino', 'límite marítimo', 'mar territorial', 'zona económica exclusiva', 'uruguay', 'arroyo chuy', 'arroyo de la mina', 'arroyo san luis (parte norte)', 'arroyo san luis (parte sur)', 'arroyo san miguel', 'arroyo yaguarón chico', 'cañada del cementerio', 'franja costera y jurisdicción exclusiva', 'isla brasileña (contestada)', 'laguna merín', 'límite del lecho y subsuelo', 'límite exterior del río de la plata', 'límite exterior mar terriorial', 'límite exterior zona contigua', 'límite lateral marítimo', 'límite lateral marítimo brasil - uruguay', 'rincón de maneco (contestado)', 'río yaguarón (bajo yaguarón)', 'río yaguarón (yaguarón medio)', 'traza del río uruguay', 'álveo río cuareim'],
    attributes: [
      { campo: 'def', label: 'Definición' },
      { campo: 'obs', label: 'Tipo de límite', classifiable: true },
    ]
  },

  // ── Hidrografía ───────────────────────────────────────────────────────────────

  rio_area_uy: {
    source:       'igm_uy',
    typename:     'Hidrografia250:RioArroyoA_250K',
    titulo:       'Ríos y arroyos de Uruguay (área)',
    geomType:     'polygon',
    labelField:   'nam',
    clipStrategy: null,
    special:      false,
    visible:      true,
    keywords:     ['río', 'ríos', 'arroyo', 'arroyos', 'cañada', 'hidrografía', 'agua', 'cuenca', 'uruguay', 'ao . veras', 'ao. bequeló', 'ao. del ceibo', 'ao. del tala', 'ao. maldonado', 'ao. salsipuedes', 'ao. sarandí de la horqueta', 'ao. solís grande', 'ao. tacuarembó chico', 'ao. tropa vieja', 'ao. yaguarí', 'brazo arapey grande', 'brazo de la fea', 'brazo de la la enramada', 'brazo de las cañas', 'brazo de las conchas', 'brazo de los laureles', 'brazo de los negros', 'brazo de los perros', 'brazo del  achar', 'brazo del  arroyo grande', 'brazo del boycuá', 'brazo del carpintería', 'brazo del espinillar', 'brazo del guayabos', 'brazo del itapebí chico', 'brazo del itapebí grande', 'brazo del laureles', 'brazo del medio', 'brazo del palomas grande', 'brazo del rolón', 'brazo del río yí', 'brazo del salsipuedes grande', 'brazo del san josé', 'brazo del sarandí', 'brazo del sauce', 'brazo del sauce grande', 'brazo del sauzal', 'brazo del tala', 'brazo del tigre', 'brazo del tres árboles', 'cda. marrero', 'océano atlántico', 'río arapey grande', 'río cebollatí', 'río daymán', 'río de la plata', 'río negro', 'río queguay grande', 'río san luis', 'río san salvador', 'río santa lucía', 'río uruguay', 'río uruguay (entero)', 'río yaguarón', 'río yí'],
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
    visible:      true,
    keywords:     ['río', 'ríos', 'arroyo', 'arroyos', 'cañada', 'hidrografía', 'agua', 'cuenca', 'uruguay', 'ao. agua dulce', 'ao. algarrobos', 'ao. aparicio', 'ao. arazá', 'ao. averías', 'ao. bolas grande', 'ao. bopicua', 'ao. canelón grande', 'ao. carpintería', 'ao. catalán chico', 'ao. catalán grande', 'ao. catalán seco', 'ao. ceballitos', 'ao. ceballos grande', 'ao. ceibal', 'ao. chiflero', 'ao. cochengo', 'ao. colorado chico', 'ao. corral de piedra', 'ao. cuaró chico', 'ao. cuaró grande', 'ao. cueva del tigre', 'ao. curupí', 'ao. de chamangá', 'ao. de florencio', 'ao. de gaspar', 'ao. de la azotea', 'ao. de la casa de piedra', 'ao. de la charqueada', 'ao. de la invernada', 'ao. de la isleta', 'ao. de la perdíz', 'ao. de la piedra sola', 'ao. de la raposa', 'ao. de la tuna', 'ao. de las cañas', 'ao. de las pajas blancas', 'ao. de las palmas', 'ao. de las pavas', 'ao. de lemos', 'ao. de los caraguatás', 'ao. de los ceibos', 'ao. de los juncos', 'ao. de los molles', 'ao. de los molles del sauce', 'ao. de los padres', 'ao. de los perros', 'ao. de melilla', 'ao. de pintos', 'ao. del  arenal chico', 'ao. del  sauce', 'ao. del arbolito', 'ao. del avestruz', 'ao. del bagre', 'ao. del catalancito', 'ao. del colorado', 'ao. del corral de piedra', 'ao. del cortado', 'ao. del descarnado', 'ao. del gato', 'ao. del gigante', 'ao. del horno', 'ao. del medio', 'ao. del miguelete', 'ao. del pedernal chico', 'ao. del pescador', 'ao. del renegado', 'ao. del sarandí', 'ao. del sauce', 'ao. del tala', 'ao. del tigre', 'ao. del totoral', 'ao. don esteban chico', 'ao. duraznito', 'ao. durazno', 'ao. durán', 'ao. falso mandiyú', 'ao. frasquito', 'ao. guaviyú', 'ao. hernández', 'ao. juan fernández', 'ao. juncal', 'ao. la pedrera', 'ao. la rambla', 'ao. lenguazo', 'ao. maletas chico', 'ao. manantiales', 'ao. mandiyú', 'ao. maneco', 'ao. manga', 'ao. molles', 'ao. navarro', 'ao. palma sola grande', 'ao. pantanoso', 'ao. patitas', 'ao. pauni', 'ao. pedregal', 'ao. pelado', 'ao. pichinango', 'ao. piedras de espinosa', 'ao. pilatos', 'ao. pintadito', 'ao. polancos', 'ao. polonia', 'ao. porongos', 'ao. quebracho', 'ao. quintón', 'ao. ramiréz grande', 'ao. retobadas', 'ao. san carlos', 'ao. san gregorio', 'ao. san luis', 'ao. sarandí', 'ao. sarandí chico', 'ao. sauce', 'ao. sauce chico', 'ao. sauce de macedo', 'ao. sauce de pintos', 'ao. sauce grande', 'ao. sepulturas', 'ao. sequeira', 'ao. solís grande', 'ao. talita', 'ao. toribio de la llana', 'ao. tres cruces chico', 'ao. tres cruces grande', 'ao. tres árboles', 'ao. trillo', 'ao. tropa vieja', 'ao. vejigas', 'ao. viraró', 'ao. yacaré chico', 'ao. yacaré grande', 'ao. yacot', 'ao. yucutujá', 'cda. arazá', 'cda. arbolito', 'cda. atolladero', 'cda. atolladora', 'cda. bellaca', 'cda. blanquillo', 'cda. bonilla', 'cda. capivara', 'cda. cardozo', 'cda. clarín', 'cda. colorada', 'cda. cortinas', 'cda. cueva del tigre', 'cda. curupí', 'cda. de anselmo', 'cda. de baldoino', 'cda. de bolivar', 'cda. de eleuterio', 'cda. de hackembruck', 'cda. de la barrera', 'cda. de la canelera', 'cda. de la concha', 'cda. de la divisa', 'cda. de la enramada', 'cda. de la horqueta', 'cda. de la isla', 'cda. de la laguna', 'cda. de la lana', 'cda. de la manga de terrón', 'cda. de la pedrera', 'cda. de la piedra redonda', 'cda. de la pierna de palo', 'cda. de la pulpería', 'cda. de la quinta', 'cda. de la quisilla', 'cda. de la rata', 'cda. de la tapera', 'cda. de la totora', 'cda. de la zanja', 'cda. de la zanja honda', 'cda. de las barrancas negras', 'cda. de las canteras', 'cda. de las chacras', 'cda. de las conchas', 'cda. de las conchillas', 'cda. de las nutrias', 'cda. de las pajas', 'cda. de las piedras', 'cda. de las piedritas', 'cda. de las rosas', 'cda. de los burros', 'cda. de los chachos', 'cda. de los corrales', 'cda. de los fuentes', 'cda. de los manantiales', 'cda. de los negros', 'cda. de los padres', 'cda. de los perros', 'cda. de mendoza', 'cda. de modesto', 'cda. de paraso', 'cda. de pascual', 'cda. de rocha', 'cda. de valdez', 'cda. del balta', 'cda. del bolocuá', 'cda. del capitan', 'cda. del catalán', 'cda. del ceibal', 'cda. del cementerio', 'cda. del cerro', 'cda. del chaná', 'cda. del convoy', 'cda. del guaviyú', 'cda. del horno', 'cda. del indio muerto', 'cda. del juncal', 'cda. del junco', 'cda. del medio', 'cda. del negro', 'cda. del negro paciencia', 'cda. del pedregal', 'cda. del perro muerto', 'cda. del pesquero', 'cda. del portero', 'cda. del rodeo', 'cda. del sarandí', 'cda. del sauce', 'cda. del sauce solo', 'cda. del sauzal', 'cda. del tajamar', 'cda. del tala', 'cda. del tigre', 'cda. del totoral', 'cda. del turumán', 'cda. del viejo sebastián', 'cda. del yacaré', 'cda. del ñandubay seco', 'cda. divisa', 'cda. divisoria pando san jacinto', 'cda. don fidel', 'cda. espinillos', 'cda. feliciano', 'cda. gadea', 'cda. garcía', 'cda. grande', 'cda. honda', 'cda. la barra', 'cda. la lorenza', 'cda. lisboa', 'cda. luzardo', 'cda. machín', 'cda. manantial', 'cda. marrero', 'cda. martínez', 'cda. mataojo', 'cda. medina', 'cda. moreira', 'cda. ojos de agua', 'cda. pajas blancas', 'cda. pantanosa', 'cda. pantanoso', 'cda. pereira', 'cda. piedra del toro', 'cda. piedras blancas', 'cda. prudencia', 'cda. sauzal de la divisa', 'cda. sotelo', 'cda. talita', 'cda. uña de gato', 'cda. varela', 'cda. velázquez', 'cda. venezuela', 'cda. vera', 'cda. viraró', 'cda. vázquez', 'cda. yacaré', 'gajo del sarandí', 'zja. aguapey', 'zja. carpinchos', 'zja. de la cerrillada', 'zja. de la estancia', 'zja. de la media luna', 'zja. de la totora', 'zja. de las orejanas', 'zja. de las tunas', 'zja. de los carpinchos', 'zja. de los juncos', 'zja. de los novios', 'zja. de los talas', 'zja. de taboada', 'zja. del ceibo', 'zja. del cerro grande', 'zja. del duraznal', 'zja. del espinillar', 'zja. del potrero', 'zja. del sauce', 'zja. del sauzal grande', 'zja. del tigre', 'zja. fea', 'zja. honda'],
    attributes: [
      { campo: 'nam',        label: 'Nombre' },
      { campo: 'descriptio', label: 'Tipo', classifiable: true },
      { campo: 'depto',      label: 'Departamento' },
      { campo: 'tiporio',    label: 'Tipo de río', classifiable: true },
    ]
  },

  // ── Históricos ────────────────────────────────────────────────────────────────

  limite_hist_1835_area_uy: {
    source:       'igm_uy',
    typename:     'Limites_Administrativos_Historicos_A:LimiteA_Ley84_28AGO1835',
    titulo:       'Límites departamentales históricos 1835 (área)',
    geomType:     'polygon',
    labelField:   'nam',
    clipStrategy: null,
    special:      'historico',
    visible:      false,
    keywords:     ['límite histórico', 'departamento histórico', '1835', 'ley 84', 'historia uruguay', 'canelones', 'cerro largo', 'colonia', 'maldonado', 'montevideo', 'paysandú', 'san josé', 'soriano'],
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
    visible:      false,
    keywords:     ['límite histórico', '1835', 'ley 84', 'historia uruguay', 'canelones', 'cerro largo', 'durazno', 'maldonado', 'montevideo', 'paysandú', 'san josé', 'soriano'],
    attributes: [
      { campo: 'def', label: 'Definición' },
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
    visible:      false,
    keywords:     ['límite histórico', 'departamento histórico', '1837', 'ley 158', 'historia uruguay', 'canelones', 'cerro largo', 'colonia', 'maldonado', 'minas', 'montevideo', 'paysamdú', 'salto', 'san josé', 'soriano', 'tacuarembó'],
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
    visible:      false,
    keywords:     ['límite histórico', '1837', 'ley 158', 'historia uruguay', 'canelones', 'cerro largo', 'colonia', 'durazno', 'maldonado', 'minas', 'montevideo', 'paysandú', 'salto', 'san josé', 'soriano', 'tacuarembó'],
    attributes: [
      { campo: 'def', label: 'Definición' },
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
    visible:      false,
    keywords:     ['límite histórico', '1856', 'ley 493', 'historia uruguay', 'canelones', 'cerro largo', 'colonia', 'durazno', 'florida', 'maldonado', 'minas', 'paysandú', 'salto', 'san josé', 'soriano', 'tacuarembó'],
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
    visible:      false,
    keywords:     ['límite histórico', '1856', 'ley 493', 'historia uruguay', 'canelones', 'cerro largo', 'colonia', 'durazno', 'florida', 'maldonado', 'minas', 'montevideo', 'paysandú', 'salto', 'san josé', 'soriano', 'tacuarembó'],
    attributes: [
      { campo: 'def', label: 'Definición' },
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
    visible:      false,
    keywords:     ['límite histórico', '1880', 'ley 1474', 'historia uruguay', 'canelones', 'cerro largo', 'colonia', 'florida', 'maldonado', 'minas', 'montevideo', 'paysandú', 'río negro', 'salto', 'san josé', 'soriano', 'tacuarembó'],
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
    visible:      false,
    keywords:     ['límite histórico', '1880', 'ley 1474', 'historia uruguay', 'canelones', 'cerro largo', 'colonia', 'durazno', 'florida', 'maldonado', 'minas', 'montevideo', 'paysandú', 'rocha', 'río negro', 'salto', 'san josé', 'soriano', 'tacuarembó'],
    attributes: [
      { campo: 'def', label: 'Definición' },
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
    visible:      false,
    keywords:     ['límite histórico', '1884', 'ley 1757', 'historia uruguay', 'artigas', 'canelones', 'cerro largo', 'colonia', 'florida', 'maldonado', 'minas', 'montevideo', 'paysandú', 'rivera', 'río negro', 'salto', 'san josé', 'soriano', 'tacuarembó', 'treinta y tres'],
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
    visible:      false,
    keywords:     ['límite histórico', '1884', 'ley 1757', 'historia uruguay', 'artigas', 'canelones', 'cerro largo', 'colonia', 'durazno', 'florida', 'maldonado', 'minas', 'montevideo', 'paysandú', 'rivera', 'rocha', 'río negro', 'salto', 'san josé', 'soriano', 'tacuarembó', 'treinta y tres'],
    attributes: [
      { campo: 'def', label: 'Definición' },
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
    visible:      false,
    keywords:     ['límite histórico', '1885', 'ley 1854', 'historia uruguay', 'artigas', 'canelones', 'cerro largo', 'colonia', 'florida', 'maldonado', 'minas', 'montevideo', 'paysandú', 'rivera', 'río negro', 'salto', 'san josé', 'soriano', 'tacuarembó', 'treinta y tres'],
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
    visible:      false,
    keywords:     ['límite histórico', '1885', 'ley 1854', 'historia uruguay', 'artigas', 'canelones', 'cerro largo', 'colonia', 'durazno', 'flores', 'florida', 'maldonado', 'minas', 'montevideo', 'paysandú', 'rivera', 'rocha', 'río negro', 'salto', 'san josé', 'soriano', 'tacuarembó', 'treinta y tres'],
    attributes: [
      { campo: 'def', label: 'Definición' },
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
    visible:      false,
    keywords:     ['límite histórico', '1927', 'ley 8187', 'historia uruguay', 'artigas', 'canelones', 'cerro largo', 'colonia', 'flores', 'florida', 'lavalleja', 'maldonado', 'montevideo', 'paysandú', 'rivera', 'río negro', 'salto', 'san josé', 'soriano', 'tacuarembó', 'treinta y tres'],
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
    visible:      false,
    keywords:     ['límite histórico', '1927', 'ley 8187', 'historia uruguay', 'artigas', 'canelones', 'cerro largo', 'colonia', 'durazno', 'flores', 'florida', 'lavalleja', 'maldonado', 'montevideo', 'paysandú', 'rivera', 'rocha', 'río negro', 'salto', 'san josé', 'soriano', 'tacuarembó', 'treinta y tres'],
    attributes: [
      { campo: 'def', label: 'Definición' },
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
    visible:      false,
    keywords:     ['límite histórico', '1934', 'rincón de maneco', 'historia uruguay', 'artigas', 'canelones', 'cerro largo', 'colonia', 'flores', 'florida', 'lavalleja', 'maldonado', 'montevideo', 'paysandú', 'rivera', 'río negro', 'salto', 'san josé', 'soriano', 'tacuarembó', 'treinta y tres'],
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
    visible:      false,
    keywords:     ['límite histórico', '1934', 'rincón de maneco', 'historia uruguay', 'artigas', 'canelones', 'cerro largo', 'colonia', 'durazno', 'flores', 'florida', 'lavalleja', 'maldonado', 'montevideo', 'paysandú', 'rincón de artigas  (constestado)', 'rivera', 'rocha', 'río negro', 'salto', 'san josé', 'soriano', 'tacuarembó', 'treinta y tres'],
    attributes: [
      { campo: 'def', label: 'Definición' },
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

/**
 * intent.js — Motor híbrido de resolución de pedidos
 *
 * Intercepta pedidos simples antes de llamar al LLM.
 * Si puede resolver el pedido con certeza, devuelve una instrucción directa.
 * Si no puede (ambigüedad, pedido complejo, conversación en curso), devuelve null
 * y el flujo continúa hacia el LLM normalmente.
 *
 * Casos que resuelve:
 *   - Capa sin área:    "glaciares"            → { layerKey: 'glaciar_ar' }
 *   - Capa + spatial:   "rutas de mendoza"     → { layerKey, clipArea: {...} }
 *   - Capa + attribute: "localidades de córdoba" → { layerKey, filtro: "..." }
 *
 * Casos que NO resuelve (van al LLM):
 *   - Múltiples capas: "rutas y puertos de mendoza"
 *   - Estilos: "mostralo en azul"
 *   - Clasificaciones: "clasificá por tipo"
 *   - Score bajo o empate entre capas
 *   - Conversación en curso (historial con el LLM)
 *   - Preguntas que no son pedidos de capas
 */

window.INTENT = (() => {

  // ── Configuración ─────────────────────────────────────────────

  // Score mínimo para considerar que encontramos la capa correcta
  const MIN_SCORE = 6;

  // Si el segundo mejor score es >= este porcentaje del mejor, hay empate → LLM
  const EMPATE_RATIO = 0.85;

  // Stopwords que no aportan al matching
  const STOPWORDS = new Set([
    'de','del','los','las','una','con','por','que','para','entre',
    'en','el','la','al','quiero','ver','mapa','mostrar','dame','muéstrame',
    'mostrame','poneme','cargame','carga','muestra','necesito','quiero',
    'todos','todas','el','la','un','una','los','las',
  ]);

  // Señales de pedidos que NO son de capas → siempre al LLM
  const PATRON_NO_CAPA = /\b(export|exporta|descarga|qué es|qué son|cuánto|cuántos|explicame|explicá|contame|ayuda|help|borrá|limpiar|limpiar|vaciar|cambiar|cambio|color|estilo|clasificá|clasificar)\b/i;

  // Señales de múltiples capas → siempre al LLM
  const PATRON_MULTIPLE = /\b(y|más|también|junto|además)\b/i;

  // ── Normalización ─────────────────────────────────────────────

  function normalizar(texto) {
    if (!texto) return '';
    return texto.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim();
  }

  function tokenizar(textoNorm) {
    return textoNorm.split(/\s+/).filter(p => p.length > 2 && !STOPWORDS.has(p));
  }

  // ── Detección de área geográfica ──────────────────────────────

  /**
   * Busca en GEO_MAPS si el texto menciona una unidad administrativa conocida.
   * Devuelve { tipo, valorNorm, valorOriginal, layerKey, field } o null.
   *
   * Estrategia: buscar frases de 1, 2 y 3 palabras en los mapas de normalización.
   * Prioriza frases más largas (ej: "san josé" antes que "san" o "josé").
   */
  function detectarArea(textoNorm) {
    const geoMaps = window.GEO_MAPS || {};
    const palabras = textoNorm.split(/\s+/);

    // Probar frases de hasta 3 palabras, de más larga a más corta
    for (let largo = 3; largo >= 1; largo--) {
      for (let i = 0; i <= palabras.length - largo; i++) {
        const frase = palabras.slice(i, i + largo).join(' ');

        // Iterar dinámicamente sobre todos los países y tipos en GEO_MAPS
        // Al agregar un país nuevo en layers/index.js, aparece aquí automáticamente
        for (const [pais, tipos] of Object.entries(geoMaps)) {
          for (const [, mapaMeta] of Object.entries(tipos)) {
            const valorOriginal = mapaMeta.valores?.[frase];
            if (valorOriginal) {
              const layerKey = mapaMeta.layerKey;
              return {
                tipo:          mapaMeta.tipo,
                pais,
                valorNorm:     frase,
                valorOriginal,
                layerKey,
                field:         window.LAYERS?.[layerKey]?.labelField || null,
              };
            }
          }
        }
      }
    }

    return null;
  }

  // ── Búsqueda de capa ──────────────────────────────────────────

  /**
   * Busca la capa más relevante para el texto dado.
   * Excluye palabras del área ya detectada para no contaminar el score.
   * Devuelve { key, capa, score } o null si no supera el umbral.
   */
  function buscarCapa(textoNorm, area) {
    const layers = window.LAYERS || {};

    // Remover palabras del área del texto para buscar solo la capa
    let textoSinArea = textoNorm;
    if (area) {
      textoSinArea = textoNorm.replace(area.valorNorm, '').trim();
    }

    const tokens = tokenizar(textoSinArea);
    if (!tokens.length) return null;

    const resultados = Object.entries(layers).map(([key, capa]) => {
      // Si el área es de un país conocido, excluir capas de otros países
      if (area?.pais) {
        const sourceCountry = window.SOURCES?.[capa.source]?.country;
        if (sourceCountry && sourceCountry !== area.pais) {
          return { key, capa, score: 0 };
        }
      }

      const textoCapa = normalizar([
        capa.titulo || '',
        key,
        (capa.keywords || []).join(' '),
      ].join(' '));

      let score = 0;

      // Match exacto del texto completo
      if (textoCapa.includes(textoSinArea)) score += 10;

      // Match por tokens individuales — palabras completas + normalización de plural
      const matchPalabraCompleta = (texto, palabra) => {
        const re = new RegExp('(?:^|\\s)' + palabra + '(?:\\s|$)');
        return re.test(texto);
      };

      for (const token of tokens) {
        if (matchPalabraCompleta(textoCapa, token)) {
          score += 2;
        } else {
          // Intentar singular si el token termina en 's' (parques → parque, nacionales → nacional)
          const singular = token.endsWith('es') ? token.slice(0, -2)
                         : token.endsWith('s')  ? token.slice(0, -1)
                         : null;
          if (singular && singular.length >= 4 && matchPalabraCompleta(textoCapa, singular)) score += 2;
        }
      }

      return { key, capa, score };
    }).filter(r => r.score > 0).sort((a, b) => b.score - a.score);

    if (!resultados.length) return null;

    // Boost por visibilidad y tipo: capas públicas (visible:true, special:false)
    // ganan sobre auxiliares/ocultas en caso de empate
    const prioridad = (r) => {
      let p = 0;
      if (r.capa.visible !== false) p += 2;
      if (r.capa.special === false) p += 1;
      return p;
    };

    // Re-ordenar: primero por score, luego por prioridad como desempate
    resultados.sort((a, b) => b.score !== a.score ? b.score - a.score : prioridad(b) - prioridad(a));

    const mejor = resultados[0];

    // Score mínimo
    if (mejor.score < MIN_SCORE) return null;

    // Detectar empate — si el segundo tiene score muy cercano Y misma prioridad → LLM
    if (resultados.length > 1) {
      const segundo = resultados[1];
      if (segundo.score >= mejor.score * EMPATE_RATIO) {
        // Si el mejor tiene más prioridad que el segundo, puede ganar igual
        if (prioridad(mejor) > prioridad(segundo)) {
          console.log(`[INTENT] Desempate por prioridad: ${mejor.key}(${mejor.score}) sobre ${segundo.key}(${segundo.score})`);
        } else {
          console.log(`[INTENT] Empate: ${mejor.key}(${mejor.score}) vs ${segundo.key}(${segundo.score}) → LLM`);
          return null;
        }
      }
    }

    return mejor;
  }

  // ── Construcción de instrucción ───────────────────────────────

  /**
   * Arma la instrucción final según clipStrategy de la capa y el área detectada.
   *
   * clipStrategy: null      → fetch directo, sin área
   * clipStrategy: 'attribute' → filtro CQL usando geoFields/clipField
   * clipStrategy: 'spatial'   → clipArea como objeto
   * clipStrategy: 'none'    → fetch directo aunque haya área (lo manejará clip.js)
   */
  function construirInstruccion(layerKey, capa, area, textoOriginal) {
    const instruccion = {
      layerKey,
      filtro:      '',
      clipArea:    null,
      descripcion: textoOriginal,
    };

    if (!area) return instruccion;

    const strategy = capa.clipStrategy;

    if (strategy === 'attribute') {
      // Buscar el campo correcto en geoFields según el tipo de área
      const geoFields = capa.geoFields || {};
      const campo = geoFields[area.tipo] || capa.clipField;

      if (campo) {
        instruccion.filtro = `strToLowerCase(${campo})='${normalizar(area.valorOriginal)}'`;
      }

    } else if (strategy === 'spatial') {
      instruccion.clipArea = {
        layerKey: area.layerKey,
        field:    area.field,
        value:    area.valorOriginal,
      };

    }
    // null y 'none' → no modificar, clip.js lo maneja

    return instruccion;
  }

  // ── Punto de entrada ──────────────────────────────────────────

  /**
   * resolver(textoUsuario, historial)
   *
   * Devuelve una instrucción { layerKey, filtro, clipArea, descripcion }
   * o null si no puede resolver (va al LLM).
   *
   * historial: array de mensajes { role, content }
   * Si hay mensajes previos del asistente, es conversación en curso → LLM.
   */
  function resolver(textoUsuario, historial = []) {
    // ── Guardianes ────────────────────────────────────────────

    // Si hay conversación real del LLM en curso, el contexto importa → LLM
    // Los mensajes generados por intent (prefijo [intent]) no cuentan
    const mensajesLLM = (historial || []).filter(
      m => m.role === 'assistant' && !m.content?.startsWith('[intent]')
    );
    if (mensajesLLM.length > 0) {
      console.log('[INTENT] Conversación LLM en curso → LLM');
      return null;
    }

    const textoNorm = normalizar(textoUsuario);

    // Pedidos que no son de capas
    if (PATRON_NO_CAPA.test(textoUsuario)) {
      console.log('[INTENT] Pedido no-capa detectado → LLM');
      return null;
    }

    // Múltiples capas
    if (PATRON_MULTIPLE.test(textoUsuario)) {
      console.log('[INTENT] Múltiples capas detectadas → LLM');
      return null;
    }

    // ── Detección ─────────────────────────────────────────────

    const area   = detectarArea(textoNorm);
    const resultado = buscarCapa(textoNorm, area);

    if (!resultado) {
      console.log('[INTENT] Sin capa con score suficiente → LLM');
      return null;
    }

    const { key, capa } = resultado;
    const instruccion = construirInstruccion(key, capa, area, textoUsuario);

    console.log(`[INTENT] Resuelto: ${key}${area ? ' + ' + area.valorOriginal : ''} (score: ${resultado.score})`);

    return instruccion;
  }

  return { resolver };

})();

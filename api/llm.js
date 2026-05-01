/**
 * api/llm.js — Proxy LLM con streaming y fallback automático
 *
 * Orden: Cerebras → Groq → Gemini
 * Usa Server-Sent Events (SSE) para streaming de tokens al browser
 */

const CEREBRAS_URL   = 'https://api.cerebras.ai/v1/chat/completions';
const CEREBRAS_MODEL  = 'qwen-3-235b-a22b-instruct-2507';
const GROQ_URL       = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL     = 'llama-3.3-70b-versatile';
const GEMINI_URL     = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Tiempo máximo por proveedor antes de hacer fallback (ms)
const PROVIDER_TIMEOUT_MS = 15000;

// ── Búsqueda semántica local ──────────────────────────────────────

function normalizar(texto) {
  if (!texto) return '';
  return texto.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ').trim();
}

function buscarCapasRelevantes(textoUsuario, layers, max = 5) {
  const norm = normalizar(textoUsuario);
  const stopwords = ['de','del','los','las','una','con','por','que','para','entre','en','el','la','al','quiero','ver','mapa','mostrar','dame'];
  const palabras = norm.split(/\s+/).filter(p => p.length > 2 && !stopwords.includes(p));
  if (!palabras.length) return Object.entries(layers).slice(0, max).map(([k, v]) => ({ key: k, ...v }));
  return Object.entries(layers)
    .map(([key, capa]) => {
      const textoCapa = normalizar([capa.titulo, capa.abstract || '', key,
        (capa.keywords || []).join(' '),
        (capa.attributes || []).map(a => (a.label || '') + ' ' + (a.campo || '')).join(' ')
      ].join(' '));
      let score = 0;
      if (textoCapa.includes(norm)) score += 10;
      for (const p of palabras) {
        if (textoCapa.includes(p)) score += 2;
        if (textoCapa.split(/\s+/).some(w => w.startsWith(p))) score += 1;
      }
      return { key, capa, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(r => ({ key: r.key, ...r.capa }));
}

function capasAContexto(capas) {
  const excluir = ['gid','fdc','sag','entidad','objeto'];
  return capas.map(c => {
    const attrs = (c.attributes || [])
      .filter(a => !excluir.includes(a.campo))
      .map(a => `    ${a.campo}: ${a.label}`)
      .join('\n');
    return `  ${c.key} — ${c.titulo} (${c.geomType})${attrs ? '\n' + attrs : ''}`;
  }).join('\n\n');
}

function buildSystemPrompt(capasRelevantes, todasLasCapas, tone, activeMap) {
  const toneInstructions = {
    default:    'Dialogá con el usuario, hacé preguntas cuando haya ambigüedad, tono cálido y natural.',
    eficiente:  'Sé muy breve y directo. Máximo 1-2 oraciones antes de generar el mapa. No hagas preguntas salvo que sea absolutamente necesario. Priorizá la velocidad.',
    amigable:   'Tono cálido, empático y cercano. Usá lenguaje coloquial rioplatense. Celebrá los pedidos del usuario. Podés hacer alguna pregunta para afinar el mapa.',
    detallista: 'Explicá en profundidad cada capa, sus atributos, fuentes de datos y limitaciones. Dá contexto geográfico e histórico cuando sea relevante. Sé exhaustivo.',
    creativo:   'Sugerí combinaciones de capas no obvias, hacé preguntas interesantes sobre el territorio, proponé perspectivas alternativas. Pensá fuera de lo convencional.'
  };
  const toneGuide = toneInstructions[tone] || toneInstructions.default;
  const listaCompleta = Object.entries(todasLasCapas).map(([k,v]) => `${k}:${v.titulo}`).join(', ');
  const activeMapContext = activeMap
    ? `\nMAPA ACTIVO EN ESTE MOMENTO:\nTítulo: ${activeMap.titulo}\nCapas: ${activeMap.capas}\nCualquier pedido de cambio de estilo, nombre o eliminación de capa se refiere a ESTE mapa.\n`
    : '';

  return `Sos el asistente de Simple Maps, una herramienta para generar mapas de Argentina.${activeMapContext}
Tu personalidad: curioso, amigable, conversacional. Te interesa entender bien qué quiere el usuario antes de generar el mapa. Hacés preguntas cuando algo no está claro. Respondés en español rioplatense, de forma natural y cálida — como si fuese una conversación real.

CAPAS DISPONIBLES: ${listaCompleta}

CAPAS RELEVANTES PARA ESTA CONSULTA (con atributos):
${capasAContexto(capasRelevantes)}

Cuando tengas suficiente información para generar el mapa, respondé con tu mensaje + estos bloques al final:
\`\`\`map
[{"layerKey":"...","filtro":"CQL o vacío","clipArea":"provincia en minúsculas sin tildes, o vacío","descripcion":"texto breve"}]
\`\`\`
\`\`\`chat-title
Título geográfico del mapa: qué capas y/o qué lugar. Máximo 6 palabras. Ejemplos: "Puertos y rutas de Santa Cruz", "Áreas protegidas de Patagonia", "Pasos fronterizos con Chile". NUNCA uses el texto del usuario como título — siempre describí el contenido del mapa.
\`\`\`

REGLAS DE FILTROS CQL:
- Sin filtro: ""
- Texto: strToLowerCase(campo)='valor_sin_tildes_minusculas'
- LIKE: strToLowerCase(campo) LIKE '%valor%'
- Combinado: strToLowerCase(pvecino)='chile' AND strToLowerCase(prov)='santa cruz'
- Numéricos sin strToLowerCase
- Si no corresponde a ninguna capa: [{"error":"No tengo datos para esa consulta"}]

REGLA DE RECORTE GEOGRÁFICO:
Algunas capas tienen campos propios para filtrar por área (provincia, departamento, etc.) — usá filtro CQL.
  localidad_bahra: usar nom_pcia para provincia, nom_depto para departamento
  pasos_frontera:  usar prov para provincia, pvecino para país vecino
Otras capas NO tienen esos campos — usá "clipArea" con el área en minúsculas sin tildes y dejá "filtro" vacío:
  vial_nacional, area_protegida, puertos, puentes → recorte espacial automático
  Ejemplo: {"layerKey":"puertos","filtro":"","clipArea":"santa cruz","descripcion":"Puertos de Santa Cruz"}
NUNCA inventes un filtro CQL por nombre de feature para intentar filtrar geográficamente.

Cuando el usuario pida cambiar el estilo de una capa existente en el mapa, respondé con texto + bloque style:
\`\`\`style
[{"layerKey":"...","color":"#hex","fillColor":"#hex","fillOpacity":0.5,"weight":2,"opacity":1,"radius":6}]
\`\`\`
Solo incluí los campos que el usuario quiera cambiar. layerKey es la clave de la capa (ej: puertos, vial_nacional).
Parámetros disponibles: color (borde), fillColor (relleno), fillOpacity (0-1), weight (grosor borde), opacity (0-1), radius (solo puntos).

Cuando el usuario pida clasificar una capa por un atributo, respondé con texto + bloque classify:
\`\`\`classify
[{"layerKey":"...","type":"categorized","field":"campo","palette":"qualitative"}]
\`\`\`
O para graduado:
\`\`\`classify
[{"layerKey":"...","type":"graduated","field":"campo_numerico","palette":"blues","method":"jenks","classes":5}]
\`\`\`
type puede ser "categorized" o "graduated". palette: qualitative, blues, greens, oranges, purples, redblue, browngreen.
method (solo graduated): jenks, equal, quantile.

No apresures el bloque map — primero asegurate de entender bien el pedido. Si hay ambigüedad, preguntá.

EXPORTACIÓN DE MAPAS:
Cuando el usuario pida exportar a un formato específico, respondé con texto breve + bloque export:
\`\`\`export
{"format":"pdf"}
\`\`\`
Formatos válidos: "pdf", "jpeg", "geojson", "html"
Ejemplos: "exportar en pdf", "quiero la imagen", "bajar el geojson", "exportar como html"

Cuando el usuario pida exportar sin especificar el formato, respondé con texto + bloque export-choice (sin contenido):
\`\`\`export-choice
\`\`\`
Ejemplo: "quiero exportar el mapa", "cómo descargo esto", "exportar"`;
}

// ── Streaming con OpenAI-compatible API (Cerebras/Groq) ───────────

async function streamOpenAI(url, model, apiKey, systemPrompt, messages, res) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(PROVIDER_TIMEOUT_MS),
    body: JSON.stringify({
      model,
      temperature: 0.7,
      max_tokens: 2048,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
      ]
    })
  });

  if (resp.status === 429 || resp.status === 503) {
    throw Object.assign(new Error(`Rate limit HTTP ${resp.status}`), { rateLimit: true });
  }
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`HTTP ${resp.status}: ${err}`);
  }

  // Leer el stream de SSE con buffer acumulativo para no partir líneas
  const reader = resp.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: false });
  let fullText = '';
  let lineBuffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    // decode sin stream:true para evitar corrupción de caracteres UTF-8 en límites de chunk
    lineBuffer += decoder.decode(value, { stream: true });
    const lines = lineBuffer.split('\n');
    // La última "línea" puede estar incompleta — guardarla para el próximo chunk
    lineBuffer = lines.pop();
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (!data || data === '[DONE]') continue;
      try {
        const json = JSON.parse(data);
        const token = json.choices?.[0]?.delta?.content || '';
        if (token) {
          fullText += token;
          res.write(`data: ${JSON.stringify({ token })}\n\n`);
        }
      } catch {}
    }
  }
  // Procesar cualquier dato restante en el buffer
  if (lineBuffer.startsWith('data: ')) {
    const data = lineBuffer.slice(6).trim();
    if (data && data !== '[DONE]') {
      try {
        const json = JSON.parse(data);
        const token = json.choices?.[0]?.delta?.content || '';
        if (token) { fullText += token; res.write(`data: ${JSON.stringify({ token })}\n\n`); }
      } catch {}
    }
  }
  return fullText;
}

// ── Gemini (no streaming, fallback) ──────────────────────────────

async function callGemini(apiKey, systemPrompt, messages) {
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));
  const resp = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
    })
  });
  if (resp.status === 429 || resp.status === 503) {
    throw Object.assign(new Error(`Gemini rate limit ${resp.status}`), { rateLimit: true });
  }
  if (!resp.ok) throw new Error(`Gemini HTTP ${resp.status}`);
  const data = await resp.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ── Handler ───────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const cerebrasKey = process.env.CEREBRAS_API_KEY;
  const groqKey     = process.env.GROQ_API_KEY;
  const geminiKey   = process.env.GEMINI_API_KEY;

  if (!cerebrasKey && !groqKey && !geminiKey) {
    return res.status(500).json({ error: 'No hay API keys configuradas' });
  }

  const { messages, layers, model, tone, activeMap } = req.body || {};
  if (!messages?.length) return res.status(400).json({ error: 'Se requiere messages' });

  const textoUsuario    = messages.filter(m => m.role === 'user').map(m => m.content).join(' ');
  const capasRelevantes = buscarCapasRelevantes(textoUsuario, layers || {});
  const systemPrompt    = buildSystemPrompt(capasRelevantes, layers || {}, tone || 'conversacional', activeMap);

  // Configurar SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Intentar proveedores según selección del usuario
  const proveedores = [];
  if (model === 'cerebras' && cerebrasKey) {
    proveedores.push({ nombre: 'Cerebras', fn: () => streamOpenAI(CEREBRAS_URL, CEREBRAS_MODEL, cerebrasKey, systemPrompt, messages, res) });
  } else if (model === 'groq' && groqKey) {
    proveedores.push({ nombre: 'Groq', fn: () => streamOpenAI(GROQ_URL, GROQ_MODEL, groqKey, systemPrompt, messages, res) });
  } else if (model === 'gemini') {
    // Gemini directo sin streaming local
  } else {
    // Auto: Cerebras → Groq con fallback
    if (cerebrasKey) proveedores.push({ nombre: 'Cerebras', fn: () => streamOpenAI(CEREBRAS_URL, CEREBRAS_MODEL, cerebrasKey, systemPrompt, messages, res) });
    if (groqKey)     proveedores.push({ nombre: 'Groq',     fn: () => streamOpenAI(GROQ_URL, GROQ_MODEL, groqKey, systemPrompt, messages, res) });
  }

  let fullText = '';
  let success  = false;
  let usedModel = 'auto';

  for (const p of proveedores) {
    try {
      fullText = await p.fn();
      success  = true;
      usedModel = p.nombre.toLowerCase();
      console.log(`[llm] Streaming OK: ${p.nombre}`);
      break;
    } catch (err) {
      const isRetriable = err.rateLimit || err.name === 'TimeoutError' || err.name === 'AbortError';
      if (isRetriable) { console.warn(`[llm] ${p.nombre} no disponible (${err.message}), probando siguiente...`); continue; }
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
      return;
    }
  }

  // Fallback Gemini (sin streaming) — también cuando se selecciona explícitamente
  if ((!success || model === 'gemini') && geminiKey && !success) {
    try {
      fullText = await callGemini(geminiKey, systemPrompt, messages);
      // Simular streaming para Gemini: enviar de a chunks de chars
      // (no por palabras, para no cortar tokens ni bloques de código)
      const CHUNK = 8;
      for (let i = 0; i < fullText.length; i += CHUNK) {
        res.write(`data: ${JSON.stringify({ token: fullText.slice(i, i + CHUNK) })}\n\n`);
        await new Promise(r => setTimeout(r, 15));
      }
      success   = true;
      usedModel = 'gemini';
    } catch (err) {
      res.write(`data: ${JSON.stringify({ error: 'Límite alcanzado en todos los proveedores. Esperá unos segundos.' })}\n\n`);
      res.end();
      return;
    }
  }

  // Enviar el texto completo al final para que el cliente lo procese
  res.write(`data: ${JSON.stringify({ done: true, fullText, model: usedModel })}\n\n`);
  res.end();
};

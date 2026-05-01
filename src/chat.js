/**
 * chat.js — Chat con streaming de tokens y persistencia en Firestore
 */

window.CHAT = (() => {

  let history       = [];
  let currentChatId = null;
  let isStreaming   = false;
  let _lastModel         = null;
  let _pendingChatTitle  = null;

  // ── Sanitizar historial para el LLM ──────────────────────────
  //
  // Los mensajes del asistente se guardan con los bloques de código
  // (```map, ```style, etc.) incluidos — necesarios para Firestore y
  // para restaurar el estado. Pero enviárselos al LLM consume tokens
  // innecesarios y puede confundirlo en conversaciones largas.
  // Esta función devuelve una copia del historial con esos bloques
  // eliminados solo de los mensajes del asistente.

  function sanitizeHistoryForLLM(messages) {
    return messages.map(m => {
      if (m.role !== 'assistant') return m;
      const clean = m.content
        .replace(/```map[\s\S]*?```/g, '')
        .replace(/```style[\s\S]*?```/g, '')
        .replace(/```classify[\s\S]*?```/g, '')
        .replace(/```chat-title[\s\S]*?```/g, '')
        .replace(/```export-choice[\s\S]*?```/g, '')
        .replace(/```export[\s\S]*?```/g, '')
        .trim();
      return { ...m, content: clean };
    });
  }

  // ── Enviar mensaje ────────────────────────────────────────────

  async function send(userText) {
    if (isStreaming) return;

    // Requerir sesión iniciada
    if (!window.AUTH?.currentUser()) {
      TOAST.info('Iniciá sesión para chatear.');
      // Abrir el dropdown de settings desde el avatar
      const userBtn = document.getElementById('sb-user-row-btn');
      if (userBtn) SETTINGS.openFromBtn(userBtn);
      return;
    }

    history.push({ role: 'user', content: userText, time: new Date().toISOString() });
    UI.addMessage('user', userText, { time: new Date() });
    UI.showThinking();
    isStreaming = true;
    UI.setSendEnabled(false);

    try {
      const activeLayers = window.MAP?.getActiveLayers?.() || {};
      const activeLayersSummary = Object.entries(activeLayers).map(([k, v]) => 
        `${k}: ${v.titulo} (${v.geomType})`
      ).join(', ');

      const resp = await fetch('/api/llm', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          messages: sanitizeHistoryForLLM(history),
          layers:   window.LAYERS,
          sources:  window.SOURCES,
          userLang: navigator.language || null,
          model:    window.SETTINGS?.get('model') || 'auto',
          tone:     window.SETTINGS?.get('tone')  || 'default',
          activeMap: Object.keys(activeLayers).length ? {
            titulo:  window.APP?.getCurrentPlan?.()?.titulo || '',
            capas:   activeLayersSummary
          } : null
        })
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      UI.hideThinking();
      const msgEl = UI.addMessage('assistant', '');

      const reader  = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = '';
      let fullText  = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (!data) continue;

          try {
            const json = JSON.parse(data);

            if (json.error) {
              UI.setMessageText(msgEl, json.error);
              throw new Error(json.error);
            }

            if (json.token) {
              fullText += json.token;
              // Eliminar bloques completos y también bloques incompletos (abiertos)
              const display = fullText
                .replace(/```map[\s\S]*?```/g, '')
                .replace(/```chat-title[\s\S]*?```/g, '')
                .replace(/```style[\s\S]*?```/g, '')
                .replace(/```classify[\s\S]*?```/g, '')
                .replace(/```export-choice[\s\S]*?```/g, '')
                .replace(/```export[\s\S]*?```/g, '')
                .replace(/```export-choice`{0,2}/g, '')  // bloque vacío o mal cerrado
                .replace(/```\w*[\s\S]*$/g, '')  // bloque abierto sin cerrar
                .trimEnd();
              UI.setMessageText(msgEl, display || '');

            }

            if (json.done) {
              _lastModel = json.model || null;
              fullText = json.fullText || fullText;
              const mapPlan      = extractMapPlan(fullText);
              const stylePlan    = extractStylePlan(fullText);
              const classifyPlan = extractClassifyPlan(fullText);
              const chatTitle    = extractChatTitle(fullText);
              if (chatTitle) _pendingChatTitle = chatTitle;
              const displayText = fullText
                .replace(/```map[\s\S]*?```/g, '')
                .replace(/```style[\s\S]*?```/g, '')
                .replace(/```classify[\s\S]*?```/g, '')
                .replace(/```chat-title[\s\S]*?```/g, '')
                .replace(/```export-choice[\s\S]*?```/g, '')
                .replace(/```export[\s\S]*?```/g, '')
                .replace(/```export-choice`{0,2}/g, '')  // bloque vacío o mal cerrado
                .trim();

              UI.setMessageText(msgEl, displayText || '');
              const msgTime = new Date();
              UI.setMessageMeta(msgEl, { time: msgTime, model: _lastModel });
              history.push({ role: 'assistant', content: fullText, time: msgTime.toISOString(), model: _lastModel });

              // classifyPlan se aplica siempre que venga (no depende del mapa)
              if (classifyPlan?.length) window.APP?.applyClassifyPlan?.(classifyPlan);

              const exportPlan  = extractExportPlan(fullText);
              const exportChoice = extractExportChoice(fullText);
              if (exportPlan) {
                const fmt = exportPlan.format;
                if      (fmt === 'pdf')     window.EXPORT?.toPDF?.();
                else if (fmt === 'jpeg')    window.EXPORT?.toJPEG?.();
                else if (fmt === 'geojson') window.EXPORT?.toGeoJSON?.();
                else if (fmt === 'html')    window.EXPORT?.toHTML?.();
              } else if (exportChoice) {
                UI.showExportChoice(msgEl);
              }

              if (mapPlan) {
                if (mapPlan[0]?.error) {
                  UI.addMessage('assistant', mapPlan[0].error);
                } else {
                  const plan = {
                    titulo:        chatTitle || generarTitulo(userText),
                    instrucciones: mapPlan
                  };

                  // Si viene style junto al map, guardarlo en las instrucciones
                  // para que renderMap lo aplique después de cargar las capas
                  if (stylePlan?.length) {
                    plan.instrucciones = plan.instrucciones.map(inst => {
                      const s = stylePlan.find(st => st.layerKey === inst.layerKey);
                      if (s) {
                        const { layerKey: _lk, ...styleChanges } = s;
                        return { ...inst, style: styleChanges };
                      }
                      return inst;
                    });
                  }

                  UI.showMapReady(plan);
                  const mapPanel = document.getElementById('map-panel');
                  if (mapPanel && mapPanel.style.display !== 'none') {
                    await window.APP.renderMap(plan);
                  }
                  await saveToFirestore(userText, plan);
                  return;
                }
              }

              // stylePlan sin mapPlan = cambio de estilo sobre capas existentes
              if (stylePlan?.length) window.APP?.applyStylePlan?.(stylePlan);

              await saveToFirestore(userText, null);
            }
          } catch (e) {
            if (e.message !== data) console.warn('[CHAT] Parse error:', e.message);
          }
        }
      }

    } catch (err) {
      UI.hideThinking();
      UI.addMessage('assistant', `Hubo un error: ${err.message}. Intentá de nuevo.`);
      console.error('[CHAT]', err);
      history.pop();
    } finally {
      isStreaming = false;
      UI.setSendEnabled(true);
    }
  }

  // ── Guardar en Firestore ──────────────────────────────────────

  async function saveToFirestore(userText, mapPlan) {
    try {
      const user = window.AUTH?.currentUser();
      if (!user) return;

      // Usar título sugerido por el LLM, o el texto del usuario como fallback
      const titulo = _pendingChatTitle
        || (userText.length > 50 ? userText.slice(0, 50) + '\u2026' : userText);
      _pendingChatTitle = null;

      if (!currentChatId) {
        currentChatId = await window.FB.createChat(user.uid, titulo);
        SIDEBAR.setChatId(currentChatId);
        window.history.replaceState(null, '', `/#chat=${currentChatId}`);
        SIDEBAR.refreshChats();
        // Mostrar título en la barra superior
        if (window.APP?.setChatHeader) window.APP.setChatHeader(titulo);
      }

      const data = { messages: history };
      // Usar currentPlan de APP si existe (preserva título y nombres editados por el usuario)
      const planToSave = mapPlan
        ? (window.APP?.getCurrentPlan?.() || mapPlan)
        : null;
      if (planToSave) data.lastMap = planToSave;

      await window.FB.updateChat(user.uid, currentChatId, data);
    } catch (err) {
      console.warn('[CHAT] No se pudo guardar:', err.message);
    }
  }

  // ── Restaurar chat desde Firestore ────────────────────────────

  function restore(chat) {
    history       = chat.messages || [];
    currentChatId = chat.id;
    window.history.replaceState(null, '', `/#chat=${chat.id}`);
  }

  // ── Helpers ───────────────────────────────────────────────────

  function extractMapPlan(text) {
    const match = text.match(/```map\s*([\s\S]*?)```/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[1].trim());
      return Array.isArray(parsed) ? parsed : null;
    } catch { return null; }
  }

  function extractChatTitle(text) {
    const match = text.match(/```chat-title\s*([\s\S]*?)```/);
    return match ? match[1].trim() : null;
  }

  function extractStylePlan(text) {
    const match = text.match(/```style\s*([\s\S]*?)```/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[1].trim());
      return Array.isArray(parsed) ? parsed : null;
    } catch { return null; }
  }

  function extractClassifyPlan(text) {
    const match = text.match(/```classify\s*([\s\S]*?)```/);
    if (!match) return null;
    try {
      const parsed = JSON.parse(match[1].trim());
      return Array.isArray(parsed) ? parsed : null;
    } catch { return null; }
  }

  function extractExportPlan(text) {
    const match = text.match(/```export\s*([\s\S]*?)```/);
    if (!match) return null;
    try { return JSON.parse(match[1].trim()); } catch { return null; }
  }

  function extractExportChoice(text) {
    return /```export-choice[\s\S]*?```/.test(text);
  }

  function generarTitulo(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  function reset() {
    history       = [];
    currentChatId = null;
    window.history.replaceState?.(null, '', '/');
  }

  function getChatId()  { return currentChatId; }
  function getHistory() { return history; }

  return { send, reset, restore, getChatId, getHistory };

})();

// ── UI ────────────────────────────────────────────────────────────

window.UI = (() => {

  const $msgs = () => document.getElementById('chat-messages');
  let thinkingEl = null;

  function addMessage(role, text, meta) {
    if (role === 'user') {
      // Wrapper for bubble + meta outside
      const wrap = document.createElement('div');
      wrap.className = 'msg-user-wrap';

      const el = document.createElement('div');
      el.className = 'msg user';
      if (text) setMessageText(el, text, true);
      wrap.appendChild(el);
      // meta SOLO afuera del globo, nunca adentro
      if (meta?.time) {
        const m = document.createElement('div');
        m.className = 'msg-meta msg-meta-user';
        m.textContent = formatTime(meta.time);
        wrap.appendChild(m);
      }
      $msgs().appendChild(wrap);
      scrollBottom();
      return wrap; // return wrap so setMessageMeta can append to it
    }

    const el = document.createElement('div');
    el.className = `msg ${role}`;
    if (text) setMessageText(el, text);
    if (meta?.time) {
      const m = document.createElement('div');
      m.className = 'msg-meta';
      const modelNames = { cerebras: 'qwen-3-235b', groq: 'llama-3.3-70b-versatile', gemini: 'gemini-2.5-flash' };
      const parts = [formatTime(meta.time)];
      if (meta.model) parts.push(modelNames[meta.model] || meta.model);
      m.textContent = parts.join(' · ');
      el.appendChild(m);
    }
    $msgs().appendChild(el);
    scrollBottom();
    return el;
  }

  function setMessageText(el, text, collapse) {
    const isUser = el.classList.contains('user') ||
                   el.closest?.('.msg-user-wrap') !== null;

    const escape = s => s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');

    const fullHTML = isUser ? escape(text) : renderMarkdown(text);

    if (!collapse) {
      el.innerHTML = fullHTML;
      scrollBottom();
      return;
    }

    // Estimar líneas: contar saltos explícitos + líneas visuales por longitud
    // Ancho del bubble aprox 400px, font-size 16px → ~28 chars por línea
    const CHARS_PER_LINE = 28;
    const MAX_LINES      = 9;
    const lines = text.split('\n');
    let totalLines = 0;
    for (const line of lines) {
      totalLines += Math.max(1, Math.ceil((line.length || 1) / CHARS_PER_LINE));
      if (totalLines > MAX_LINES) break;
    }
    const needsCollapse = totalLines > MAX_LINES;

    el.innerHTML = fullHTML;

    if (!needsCollapse) {
      scrollBottom();
      return;
    }

    // Calcular previewHTML: primeras MAX_LINES líneas visuales
    let previewLines = [];
    let count = 0;
    for (const line of lines) {
      const visual = Math.max(1, Math.ceil((line.length || 1) / CHARS_PER_LINE));
      if (count + visual > MAX_LINES) {
        // Cortar la línea parcialmente si hace falta
        const remaining = MAX_LINES - count;
        const chars = remaining * CHARS_PER_LINE;
        previewLines.push(line.slice(0, chars) + (line.length > chars ? '…' : ''));
        break;
      }
      previewLines.push(line);
      count += visual;
      if (count >= MAX_LINES) break;
    }
    const previewHTML = escape(previewLines.join('\n'));

    function renderCollapsed() {
      el.innerHTML = '';
      el.style.position = '';
      el.style.maxHeight = '';
      el.style.overflow  = '';

      const wrap = document.createElement('div');
      wrap.className = 'msg-collapse-wrap';

      const content = document.createElement('div');
      content.className = 'msg-collapse-content';
      content.innerHTML = previewHTML;

      const fade = document.createElement('div');
      fade.className = 'msg-collapse-fade';

      const btn = document.createElement('button');
      btn.className = 'msg-expand-btn msg-expand-collapsed';
      btn.textContent = 'Mostrar más';
      btn.addEventListener('click', renderExpanded);

      wrap.appendChild(content);
      wrap.appendChild(fade);
      wrap.appendChild(btn);
      el.appendChild(wrap);
    }

    function renderExpanded() {
      el.innerHTML = '';
      el.style.position = '';
      const content = document.createElement('span');
      content.innerHTML = fullHTML;
      const btn = document.createElement('button');
      btn.className = 'msg-expand-btn msg-expand-expanded';
      btn.textContent = 'Mostrar menos';
      btn.addEventListener('click', renderCollapsed);
      el.appendChild(content);
      el.appendChild(btn);
    }

    renderCollapsed();
    scrollBottom();
  }

    function formatTime(date) {
    return date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + 
           ' ' + date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
  }

  function setSendEnabled(enabled) {
    document.querySelectorAll('.prompt-send').forEach(b => { b.disabled = !enabled; });
  }

  function scrollBottom() {
    const msgs  = document.getElementById('chat-messages');
    const panel = document.getElementById('chat-panel');
    if (msgs)  msgs.scrollTop  = msgs.scrollHeight;
    if (panel) panel.scrollTop = panel.scrollHeight;
  }

  function setMessageMeta(el, meta) {
    const container = el;
    let m = container.querySelector('.msg-meta');
    if (!m) {
      m = document.createElement('div');
      m.className = container.classList.contains('msg-user-wrap')
        ? 'msg-meta msg-meta-user'
        : 'msg-meta';
      container.appendChild(m);
    }
    const modelNames = {
      cerebras: 'qwen-3-235b',
      groq:     'llama-3.3-70b-versatile',
      gemini:   'gemini-2.5-flash'
    };
    const parts = [formatTime(meta.time)];
    if (meta.model) parts.push(modelNames[meta.model] || meta.model);
    m.textContent = parts.join(' · ');
  }

  function showThinking() {
    hideThinking();
    thinkingEl = document.createElement('div');
    thinkingEl.className = 'msg thinking';
    $msgs()?.appendChild(thinkingEl);
    scrollBottom();
  }

  function hideThinking() {
    thinkingEl?.remove();
    thinkingEl = null;
  }

  function showErrorCard(titulo, layerKey) {
    const el = document.createElement('div');
    el.className = 'msg-error-card';
    el.innerHTML = `
      <div class="error-card-left">
        <span class="material-icons error-card-icon">cloud_off</span>
        <div class="error-card-info">
          <span class="error-card-title">${titulo}</span>
          <span class="error-card-desc">El servidor no respondió después de varios intentos.</span>
        </div>
      </div>
      <button class="error-card-btn" data-layer="${layerKey || ''}">
        REINTENTAR
      </button>
    `;
    el.querySelector('.error-card-btn').addEventListener('click', () => {
      const input = document.getElementById('chat-input');
      if (input) {
        input.value = `Intentá cargar ${titulo} de nuevo`;
        input.focus();
        input.dispatchEvent(new Event('input'));
      }
    });
    $msgs()?.appendChild(el);
    scrollBottom();
  }

  function showMapReady(plan) {
    const capas = (plan.instrucciones || [])
      .filter(i => i.descripcion)
      .map(i => i.descripcion)
      .join('\n');

    const el = document.createElement('div');
    el.className = 'msg-map-card';
    el.innerHTML = `
      <div class="map-card-left">
        <span class="material-icons map-card-icon">map</span>
        <div class="map-card-info">
          <span class="map-card-title">${plan.titulo || 'Mapa'}</span>
          <span class="map-card-layers">${capas}</span>
        </div>
      </div>
      <button class="map-card-btn" data-plan='${JSON.stringify(plan).replace(/'/g, "&#39;")}'>
        VER
      </button>
    `;
    el.querySelector('.map-card-btn').addEventListener('click', e => {
      const p = JSON.parse(e.currentTarget.dataset.plan.replace(/&#39;/g, "'"));
      window.APP.renderMap(p);
    });
    $msgs()?.appendChild(el);
    scrollBottom();
  }

  // ── Markdown ──────────────────────────────────────────────────
  function renderMarkdown(text) {
    if (typeof marked === 'undefined') {
      // Fallback si marked no cargó: solo escapar y saltos de línea
      return text
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
    }
    marked.setOptions({
      breaks: true,    // \n → <br> dentro de párrafos
      gfm: true,
      mangle: false,
      headerIds: false
    });
    return marked.parse(text);
  }

  function showExportChoice(msgEl) {
    const card = document.createElement('div');
    card.className = 'msg-export-choice';

    const labels = {
      geojson: 'Capa vectorial',
      jpeg:    'Imagen',
      pdf:     'Archivo portable',
      html:    'Embebido',
    };

    const exports = [
      { key: 'geojson', label: 'Capa vectorial', sub: 'geojson' },
      { key: 'jpeg',    label: 'Imagen',          sub: 'jpeg'    },
      { key: 'pdf',     label: 'Archivo portable', sub: 'pdf'    },
      { key: 'html',    label: 'Embebido',         sub: 'html'   },
    ];

    card.innerHTML = exports.map(e => `
      <button class="export-choice-btn" data-fmt="${e.key}">
        <span class="export-choice-label">${e.label}</span>
        <span class="export-choice-sub">${e.sub}</span>
      </button>`).join('');

    card.querySelectorAll('.export-choice-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const fmt = btn.dataset.fmt;

        const confirm = document.createElement('div');
        confirm.className = 'msg assistant msg-export-confirm';
        confirm.textContent = `Exportando como ${labels[fmt] || fmt}…`;
        card.replaceWith(confirm);

        try {
          if      (fmt === 'pdf')     await window.EXPORT?.toPDF?.();
          else if (fmt === 'jpeg')    await window.EXPORT?.toJPEG?.();
          else if (fmt === 'geojson') await window.EXPORT?.toGeoJSON?.();
          else if (fmt === 'html')  { window.EXPORT?.toHTML?.(); return; } // modal: no confirmar

          confirm.textContent = `${labels[fmt]} exportado.`;
        } catch {
          confirm.textContent = `Error al exportar ${labels[fmt].toLowerCase()}.`;
          confirm.style.color = 'var(--color-error, #c08080)';
        }
      });
    });

    if (msgEl) msgEl.after(card);
    else $msgs()?.appendChild(card);
    scrollBottom();
  }

  return { addMessage, setMessageText, setMessageMeta, showThinking, hideThinking, showMapReady, showErrorCard, showExportChoice, setSendEnabled };

})();

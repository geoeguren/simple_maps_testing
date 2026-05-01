/**
 * app.js — Orquestación principal
 *
 * Depende de: window.MAP, window.CHAT, window.UI, window.SIDEBAR,
 *             window.AUTH, window.FB, window.CLIP, window.TOAST,
 *             window.THEME, window.SETTINGS, window.SEARCH,
 *             window.LAYERS_PANEL, window.MAP_CONTROLS, window.CHAT_HEADER
 */

// ── Toast ─────────────────────────────────────────────────────────

window.TOAST = (() => {
  let timer = null;

  // Duraciones por tipo (ms). 0 = sin auto-cierre.
  const DURATIONS = {
    success: 3000,
    info:    4000,
    warning: 5000,
    error:   0,
    loading: 0
  };

  // Tipos que muestran botón X
  const HAS_CLOSE = new Set(['warning', 'error']);

  // Clases semánticas válidas
  const TYPES = new Set(['success', 'info', 'warning', 'error', 'loading']);

  function _getTopOffset() {
    // Si el mapa está visible, anclar al topbar del mapa.
    // Si no, anclar al topbar del chat.
    const mapPanel = document.getElementById('map-panel');
    const mapVisible = mapPanel && mapPanel.style.display !== 'none';
    if (mapVisible) {
      const topbar = document.getElementById('map-topbar');
      if (topbar) return topbar.getBoundingClientRect().bottom + 12;
    }
    const chatHeader = document.getElementById('chat-header-bar');
    if (chatHeader && chatHeader.style.display !== 'none') {
      return chatHeader.getBoundingClientRect().bottom + 12;
    }
    return 64; // fallback
  }

  function hide() {
    const el = document.getElementById('toast');
    if (!el) return;
    clearTimeout(timer);
    timer = null;
    el.classList.remove('show');
  }

  /**
   * show(msg, type, duration)
   *   msg      — texto del toast
   *   type     — 'success' | 'info' | 'warning' | 'error' | 'loading'
   *   duration — ms de override (0 = sin auto-cierre). Si omitido, usa el default del tipo.
   */
  function show(msg, type = 'info', duration) {
    const el = document.getElementById('toast');
    if (!el) return;

    // Normalizar tipo
    if (!TYPES.has(type)) type = 'info';

    // Limpiar clases anteriores
    TYPES.forEach(t => el.classList.remove('toast--' + t));
    el.classList.add('toast--' + type);

    // Posición dinámica
    el.style.top = _getTopOffset() + 'px';

    // Contenido
    const closeBtn = HAS_CLOSE.has(type)
      ? `<button class="toast-close" aria-label="Cerrar">✕</button>`
      : '';
    el.innerHTML = `<span class="toast-msg">${msg}</span>${closeBtn}`;

    // Botón de cierre
    el.querySelector('.toast-close')?.addEventListener('click', hide);

    // Mostrar
    clearTimeout(timer);
    el.classList.add('show');

    const ms = duration !== undefined ? duration : DURATIONS[type];
    if (ms > 0) {
      timer = setTimeout(hide, ms);
    }
  }

  // Shorthand helpers
  function success(msg, duration) { show(msg, 'success', duration); }
  function info(msg, duration)    { show(msg, 'info',    duration); }
  function warning(msg, duration) { show(msg, 'warning', duration); }
  function error(msg, duration)   { show(msg, 'error',   duration); }
  function loading(msg)           { show(msg, 'loading'); }

  return { show, hide, success, info, warning, error, loading };
})();

// ── Tema ──────────────────────────────────────────────────────────

window.THEME = (() => {
  const KEY = 'sm_theme';
  function isDayHour() { const h = new Date().getHours(); return h >= 7 && h < 20; }
  function apply(mode) {
    document.body.classList.toggle('day', mode === 'day');
    const icon = mode === 'day' ? 'mode_night' : 'light_mode';
    document.querySelectorAll('[id^="theme-icon"]').forEach(el => el.textContent = icon);
    localStorage.setItem(KEY, mode);
  }
  function toggle() { apply(document.body.classList.contains('day') ? 'night' : 'day'); }
  function init() {
    const saved = localStorage.getItem(KEY);
    apply(saved || (isDayHour() ? 'day' : 'night'));
  }
  function applyWithBasemap(mode) {
    apply(mode);
    const curBase = window.MAP?.getCurrentBase?.();
    if (curBase === 'gray' || curBase === 'dark') {
      window.MAP?.setBasemap?.(mode === 'day' ? 'gray' : 'dark');
    }
  }
  return { init, toggle, apply, applyWithBasemap };
})();

// ── APP ───────────────────────────────────────────────────────────

window.APP = (() => {

  let currentPlan = null;

  function init() {
    wireHomeEvents();
    wireWorkEvents();
    wireTextareas();
  }

  // ── Home ──────────────────────────────────────────────────────

  function wireHomeEvents() {
    document.getElementById('btn-send-initial')
      ?.addEventListener('click', sendInitialPrompt);

  }

  function sendInitialPrompt() {
    const ta  = document.getElementById('initial-prompt');
    const txt = ta.value.trim();
    if (!txt) return;
    goToWork(txt);
  }

  // ── Work screen ───────────────────────────────────────────────

  function goToWork(initialPrompt) {
    document.getElementById('screen-home').classList.remove('active');
    document.getElementById('screen-work').classList.add('active');
    window.MAP_CONTROLS.setMapVisible(false);
    if (initialPrompt) {
      window.CHAT.reset();
      document.getElementById('chat-messages').innerHTML = '';
      window.CHAT.send(initialPrompt);
    }
    setTimeout(() => document.getElementById('chat-input')?.focus(), 200);
  }

  // ── Work events ───────────────────────────────────────────────

  function wireWorkEvents() {
    document.getElementById('btn-send-chat')
      ?.addEventListener('click', sendChatMessage);

    document.getElementById('btn-close-map')
      ?.addEventListener('click', () => window.MAP_CONTROLS.setMapVisible(false));

    document.getElementById('btn-refresh-map')
      ?.addEventListener('click', () => {
        if (currentPlan) renderMap(currentPlan);
      });

    document.getElementById('btn-map-layers')
      ?.addEventListener('click', e => {
        e.stopPropagation();
        window.LAYERS_PANEL.toggle();
      });

    document.getElementById('btn-identify')
      ?.addEventListener('click', () => {
        const btn    = document.getElementById('btn-identify');
        const active = !window.MAP.getIdentifyMode();
        window.MAP.setIdentifyMode(active);
        btn.classList.toggle('active', active);
        btn.title = active ? 'Desactivar consulta' : 'Consultar elementos';
      });

    document.getElementById('btn-zoom-in')
      ?.addEventListener('click', () => window.MAP.getInstance()?.zoomIn());
    document.getElementById('btn-zoom-out')
      ?.addEventListener('click', () => window.MAP.getInstance()?.zoomOut());
    document.getElementById('btn-zoom-reset')
      ?.addEventListener('click', () => window.MAP.fitBounds());

    // Scroll to bottom
    const scrollBtn = document.getElementById('btn-scroll-bottom');
    const chatMsgs  = document.getElementById('chat-messages');
    if (chatMsgs && scrollBtn) {
      chatMsgs.addEventListener('scroll', () => {
        const dist = chatMsgs.scrollHeight - chatMsgs.scrollTop - chatMsgs.clientHeight;
        scrollBtn.classList.toggle('visible', dist > 120);
      });
      scrollBtn.addEventListener('click', () => {
        chatMsgs.scrollTo({ top: chatMsgs.scrollHeight, behavior: 'smooth' });
      });
    }

    // Renombrar capas desde la leyenda
    window.MAP.onLayerRename((key, newName) => {
      const panelInput = document.querySelector(`.layers-data-row[data-key="${key}"] .layer-name-input`);
      if (panelInput && panelInput !== document.activeElement) panelInput.value = newName;
      if (currentPlan?.instrucciones) {
        const inst = currentPlan.instrucciones.find(c => c.mapKey === key);
        if (inst) inst.descripcion = newName;
      }
      const user   = window.AUTH?.currentUser();
      const chatId = window.CHAT?.getChatId?.();
      if (user && chatId && currentPlan) {
        window.FB.updateChat(user.uid, chatId, { lastMap: currentPlan })
          .then(() => window.TOAST.success('Nombre guardado.'))
          .catch(() => window.TOAST.error('Error al guardar el nombre.'));
        window.SIDEBAR.updateCachedChat(chatId, { lastMap: currentPlan });
      }
    });

    // Función interna para persistir currentPlan en Firestore
    function _persistPlan(toastMsg) {
      const user   = window.AUTH?.currentUser();
      const chatId = window.CHAT?.getChatId?.();
      if (!user || !chatId || !currentPlan) return;
      window.FB.updateChat(user.uid, chatId, { lastMap: currentPlan })
        .then(() => { if (toastMsg) window.TOAST.success(toastMsg); })
        .catch(e => {
          console.warn('[APP] Error al persistir:', e);
          window.TOAST.warning('No se pudo guardar. Revisá tu conexión a internet.');
        });
      window.SIDEBAR.updateCachedChat(chatId, { lastMap: currentPlan });
    }

    // Persistir preferencias del popup en Firestore
    window.MAP.onPopupPrefsSave((prefs) => {
      const user   = window.AUTH?.currentUser();
      const chatId = window.CHAT?.getChatId?.();
      if (!user || !chatId) return;
      window.FB.updateChat(user.uid, chatId, { popupPrefs: prefs })
        .catch(e => console.warn('[APP] Error al persistir popup prefs:', e));
      window.SIDEBAR.updateCachedChat(chatId, { popupPrefs: prefs });
    });

    // Persistir visibilidad cuando se toggle desde el panel de capas
    window.MAP.onLayerVisibilityChange((key, visible) => {
      if (currentPlan?.instrucciones) {
        const inst = currentPlan.instrucciones.find(c => c.mapKey === key);
        if (inst) inst.visible = visible;
      }
      _persistPlan();
    });

    // Persistir orden cuando se arrastra una capa
    window.MAP.onLayerOrderChange(() => {
      if (!currentPlan?.instrucciones) return;
      const activeKeys = Object.keys(window.MAP.getActiveLayers());
      currentPlan.instrucciones.sort((a, b) =>
        activeKeys.indexOf(a.mapKey) - activeKeys.indexOf(b.mapKey)
      );
      _persistPlan();
    });

    // Título del mapa
    const mapTitleInput = document.getElementById('map-title');
    if (mapTitleInput) {
      mapTitleInput.addEventListener('blur', () => {
        const newTitulo = mapTitleInput.value.trim();
        if (!newTitulo || !currentPlan) return;
        currentPlan.titulo = newTitulo;
        const card = document.querySelector('.msg-map-card');
        if (card) {
          const titleEl = card.querySelector('.map-card-title');
          if (titleEl) titleEl.textContent = newTitulo;
          const btn = card.querySelector('.map-card-btn');
          if (btn) {
            try {
              const plan = JSON.parse(btn.dataset.plan.replace(/&#39;/g, "'"));
              plan.titulo = newTitulo;
              btn.dataset.plan = JSON.stringify(plan).replace(/'/g, '&#39;');
            } catch (e) {}
          }
        }
        const user   = window.AUTH?.currentUser();
        const chatId = window.CHAT?.getChatId?.();
        if (user && chatId) {
          window.FB.updateChat(user.uid, chatId, { lastMap: currentPlan })
            .then(() => window.TOAST.success('Nombre guardado.'))
            .catch(() => window.TOAST.error('Error al guardar el nombre.'));
          window.SIDEBAR.updateCachedChat(chatId, { lastMap: currentPlan });
        }
      });
      mapTitleInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') mapTitleInput.blur();
        if (e.key === 'Escape') mapTitleInput.blur();
      });
    }

    // Export
    document.getElementById('btn-export')
      ?.addEventListener('click', () => {
        const btn = document.getElementById('btn-export');
        const dd  = document.getElementById('export-dropdown');
        const isOpen = dd.classList.toggle('open');
        btn.classList.toggle('open', isOpen);
        if (isOpen) {
          const rect = btn.getBoundingClientRect();
          dd.style.position = 'fixed';
          dd.style.top      = (rect.bottom + 6) + 'px';
          dd.style.left     = '0px'; // temporal para que tenga tamaño
          dd.style.zIndex   = '9999';
          // Medir después de que sea visible
          requestAnimationFrame(() => {
            dd.style.left = (rect.right - dd.offsetWidth) + 'px';
          });
        }
      });
    document.getElementById('export-geojson')
      ?.addEventListener('click', () => {
        document.getElementById('export-dropdown').classList.remove('open');
        document.getElementById('btn-export').classList.remove('open');
        window.EXPORT.toGeoJSON();
      });
    document.getElementById('export-jpeg')
      ?.addEventListener('click', () => {
        document.getElementById('export-dropdown').classList.remove('open');
        document.getElementById('btn-export').classList.remove('open');
        window.EXPORT.toJPEG();
      });
    document.getElementById('export-pdf')
      ?.addEventListener('click', () => {
        document.getElementById('export-dropdown').classList.remove('open');
        document.getElementById('btn-export').classList.remove('open');
        window.EXPORT.toPDF();
      });
    document.getElementById('export-html')
      ?.addEventListener('click', () => {
        document.getElementById('export-dropdown').classList.remove('open');
        document.getElementById('btn-export').classList.remove('open');
        window.EXPORT.toHTML();
      });
    document.addEventListener('click', e => {
      if (!e.target.closest('.export-wrapper')) {
        document.getElementById('export-dropdown')?.classList.remove('open');
        document.getElementById('btn-export')?.classList.remove('open');
      }
    });

    // Chat header events
    window.CHAT_HEADER.wireEvents();
  }

  // ── Textareas ─────────────────────────────────────────────────

  function wireTextareas() {
    const map = {
      'initial-prompt': sendInitialPrompt,
      'chat-input':     sendChatMessage
    };
    Object.entries(map).forEach(([id, fn]) => {
      const ta = document.getElementById(id);
      if (!ta) return;
      ta.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fn(); }
      });
      ta.addEventListener('input', () => autoResize(ta));
    });
  }

  function autoResize(ta) {
    const box = ta.closest('.prompt-box');
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
    if (box) box.classList.toggle('multiline', ta.scrollHeight > 44);
  }

  function sendChatMessage() {
    const ta  = document.getElementById('chat-input');
    const txt = ta.value.trim();
    if (!txt) return;
    ta.value = '';
    ta.style.height = 'auto';
    const box = ta.closest('.prompt-box');
    if (box) box.classList.remove('multiline');
    window.CHAT.send(txt);
  }

  // ── renderMap ─────────────────────────────────────────────────

  async function renderMap(plan) {
    if (!plan?.instrucciones?.length) {
      // Plan vacío explícito → limpiar el mapa
      if (plan && Array.isArray(plan.instrucciones)) {
        window.MAP.clearAll();
        currentPlan = plan;
        window.MAP.updateLegend();
        _persistPlan();
        return;
      }
      window.TOAST.error('El mapa no tiene capas.');
      return;
    }

    currentPlan = plan;

    const titleInput = document.getElementById('map-title');
    if (plan.titulo) titleInput.value = plan.titulo;

    window.MAP_CONTROLS.setMapVisible(true);
    window.MAP.clearAll();

    const refreshBtn = document.getElementById('btn-refresh-map');
    refreshBtn?.classList.add('spinning');

    const emptyEl = document.getElementById('map-empty');
    emptyEl?.classList.remove('hidden');
    if (emptyEl) emptyEl.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32" opacity="0.3" style="animation:spin 1.2s linear infinite">
        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
      </svg>
      <p style="color:var(--cream2);font-size:13px">Cargando capas…</p>
    `;

    if (!document.getElementById('spin-style')) {
      const st = document.createElement('style');
      st.id = 'spin-style';
      st.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
      document.head.appendChild(st);
    }

    const errors = [];

    for (let i = 0; i < plan.instrucciones.length; i++) {
      const inst = plan.instrucciones[i];

      // Saltear capas que ya fallaron en un intento anterior.
      // _failed se persiste en Firestore para que no se reintenten al restaurar el chat.
      // El usuario puede volver a pedirlas explícitamente en el chat.
      if (inst._failed) {
        console.log(`[APP] Saltando capa fallida: ${inst.layerKey}`);
        continue;
      }

      try {
        // Sanear layerKey: en versiones anteriores podía persistirse con el sufijo
        // del mapKey (ej: "pasos_frontera_1" en lugar de "pasos_frontera").
        // Si la clave no existe en LAYERS pero sí existe sin el sufijo _N, corregirla.
        if (!window.LAYERS[inst.layerKey]) {
          const clean = inst.layerKey.replace(/_\d+$/, '');
          if (window.LAYERS[clean]) {
            console.warn(`[APP] layerKey "${inst.layerKey}" corregido a "${clean}"`);
            inst.layerKey = clean;
          }
        }

        const layerDef = window.LAYERS[inst.layerKey];
        if (!layerDef) throw new Error(`Capa desconocida: ${inst.layerKey}`);
        const geojson = await window.CLIP.ejecutar(inst);
        if (!geojson.features?.length) {
          errors.push(`"${inst.descripcion || layerDef.titulo}" no devolvió datos`);
          continue;
        }
        const mapKey = `${inst.layerKey}_${i}`;
        inst.mapKey  = mapKey;

        // Estilo: usa el que mandó el LLM, o un fallback neutro por geometría.
        // El LLM siempre debería mandar estilo — el fallback es red de seguridad.
        const STYLE_FALLBACK = {
          polygon: { fillColor: '#888888', fillOpacity: 0.2,  color: '#555555', weight: 1,   opacity: 0.8 },
          line:    { color: '#555555', weight: 2, opacity: 0.8 },
          point:   { fillColor: '#888888', fillOpacity: 0.85, color: '#555555', radius: 5, weight: 1.5, opacity: 1 },
        };
        const geomType = layerDef.geomType || 'polygon';
        const style    = inst.style ? { ...inst.style } : { ...STYLE_FALLBACK[geomType] };
        window.MAP.addLayer(mapKey, inst.layerKey, geojson, style, inst.titulo || inst.descripcion || layerDef.titulo);
        // Restaurar visibilidad si fue ocultada
        if (inst.visible === false) window.MAP.restoreLayerVisible(mapKey, false);
        // Restaurar clasificación si existe
        if (inst.classification?.field && inst.classification?.type) {
          const cl = inst.classification;
          const paletteColors = cl.paletteColors || window.PALETTES[cl.palette] || window.PALETTES.qualitative;
          window.MAP.applyClassification(mapKey, { ...cl, paletteColors });
        }
      } catch (err) {
        const layerDef = window.LAYERS[inst.layerKey];
        const titulo   = inst.titulo || inst.descripcion || layerDef?.titulo || inst.layerKey;

        // Marcar como fallida para no reintentar automáticamente
        inst._failed = true;

        // Persistir el flag en Firestore
        const plan2  = window.APP?.getCurrentPlan?.() || plan;
        const user   = window.AUTH?.currentUser();
        const chatId = window.CHAT?.getChatId?.();
        if (user && chatId && plan2) {
          window.FB.updateChat(user.uid, chatId, { lastMap: plan2 })
            .catch(e => console.warn('[APP] Error persistiendo _failed:', e));
        }

        // Toast: aviso inmediato
        window.TOAST?.error(`No se pudo cargar "${titulo}".`);

        // Tarjeta de error en chat
        window.UI?.showErrorCard?.(titulo, inst.layerKey);

        errors.push(err.message);
        console.error(`[APP] Error cargando capa ${inst.layerKey}:`, err);
      }
    }

    const activeLayers = window.MAP.getActiveLayers();
    if (Object.keys(activeLayers).length > 0) {
      emptyEl?.classList.add('hidden');
      window.MAP.updateLegend();
      setTimeout(() => {
        window.MAP.getInstance()?.invalidateSize();
        setTimeout(() => window.MAP.fitBounds(), 150);
      }, 200);
    } else if (emptyEl) {
      emptyEl.classList.add('has-error');
      emptyEl.innerHTML = `
        <p style="color:var(--cream2);font-size:13px">No se pudieron cargar las capas.</p>
        <button onclick="window.APP.newMap()" style="
          margin-top:8px; padding:8px 20px; border-radius:30px;
          background:transparent; border:0.5px solid var(--border-md);
          color:var(--cream2); font-family:var(--font-sans); font-size:13px;
          cursor:pointer; pointer-events:auto;
        ">Volver al inicio</button>
      `;
    }

    if (errors.length) window.TOAST.warning(errors.length === 1 ? errors[0] + '.' : `${errors.length} capas tuvieron problemas.`);

    refreshBtn?.classList.remove('spinning');
  }

  // ── Aplicar estilos desde chat ────────────────────────────────

  function applyStylePlan(stylePlan) {
    const activeLayers = window.MAP.getActiveLayers();
    let changed = false;

    for (const s of stylePlan) {
      // Buscar la capa por layerKey
      const entry = Object.entries(activeLayers)
        .find(([, v]) => v.layerKey === s.layerKey);
      if (!entry) continue;

      const [mapKey, layer] = entry;
      const { layerKey: _lk, ...styleChanges } = s;
      const newStyle = { ...layer.style, ...styleChanges };

      window.MAP.updateLayerStyle(mapKey, newStyle);
      layer.style = newStyle;

      // Persistir en el plan
      if (currentPlan?.instrucciones) {
        const inst = currentPlan.instrucciones.find(i => i.mapKey === mapKey);
        if (inst) inst.style = { ...newStyle };
      }
      changed = true;
    }

    if (!changed) return;

    window.MAP.updateLegend();
    _persistPlan('Cambios guardados.');
  }

  // ── Aplicar clasificación desde chat ─────────────────────────

  function applyClassifyPlan(classifyPlan) {
    const activeLayers = window.MAP.getActiveLayers();
    let changed = false;
    for (const c of classifyPlan) {
      const entry = Object.entries(activeLayers).find(([, v]) => v.layerKey === c.layerKey);
      if (!entry) continue;
      const [mapKey] = entry;
      const colors = window.PALETTES[c.palette] || window.PALETTES.qualitative;
      window.MAP.applyClassification(mapKey, { ...c, paletteColors: colors });
      if (currentPlan?.instrucciones) {
        const inst = currentPlan.instrucciones.find(i => i.mapKey === mapKey);
        if (inst) inst.classification = { ...c, paletteColors: colors };
      }
      changed = true;
    }
    if (!changed) return;
    _persistPlan('Cambios guardados.');
  }

  async function restoreChat(chat) {
    // Transición completa de pantalla (antes dependía de goToWork('') para esto,
    // lo que causaba CHAT.reset() y potencial pérdida del chatId si fallaba a mitad)
    document.getElementById('screen-home')?.classList.remove('active');
    document.getElementById('screen-work')?.classList.add('active');
    window.MAP_CONTROLS.setMapVisible(false);
    currentPlan = null;

    window.CHAT.restore(chat);

    const msgs = document.getElementById('chat-messages');
    if (msgs) msgs.innerHTML = '';

    for (const m of (chat.messages || [])) {
      const meta = m.time ? { time: new Date(m.time), model: m.model || null } : null;
      if (m.role === 'user') {
        const el = window.UI.addMessage('user', m.content, meta);
      } else {
        const displayText = m.content
          .replace(/```map[\s\S]*?```/g, '')
          .replace(/```style[\s\S]*?```/g, '')
          .replace(/```classify[\s\S]*?```/g, '')
          .replace(/```chat-title[\s\S]*?```/g, '')
          .trim();
        window.UI.addMessage('assistant', displayText, meta);
      }
    }

    if (chat.lastMap) {
      // Restaurar preferencias de campos del popup desde Firestore
      if (chat.popupPrefs) window.MAP.setPopupPrefs(chat.popupPrefs);
      window.UI.showMapReady(chat.lastMap);
      // Renderizar el mapa automáticamente al restaurar, no solo mostrar la tarjeta
      await renderMap(chat.lastMap);
    }

    window.SIDEBAR.setChatId(chat.id);
    window.CHAT_HEADER.setChatHeader(chat.titulo);
    setTimeout(() => document.getElementById('chat-input')?.focus(), 200);
  }

  // ── Nuevo mapa ────────────────────────────────────────────────

  function newMap() {
    window.MAP.clearAll();
    window.MAP.updateLegend();
    window.CHAT.reset();
    window.MAP_CONTROLS.setMapVisible(false);
    window.MAP_CONTROLS.resetDivider();
    document.getElementById('chat-messages').innerHTML = '';
    document.getElementById('screen-work')?.classList.remove('active');
    document.getElementById('screen-home')?.classList.add('active');
    document.getElementById('initial-prompt').value = '';
    currentPlan = null;
    window.history.replaceState(null, '', '/');
    window.CHAT_HEADER.setChatHeader(null);
  }

  // ── Saludos dinámicos ─────────────────────────────────────────

  function buildGreeting(nombre) {
    const h = new Date().getHours();
    const n = nombre;
    const manana = h >= 6  && h < 12;
    const tarde  = h >= 12 && h < 20;
    const opciones = manana ? [
      n ? `Buenos días, ${n}.`           : 'Buenos días.',
      n ? `Buen día, ${n}.`              : 'Buen día.',
      n ? `Hola, ${n}.`                  : 'Hola.',
      n ? `¡Hola, ${n}! ¿Todo bien?`     : '¡Hola! ¿Todo bien?',
      n ? `¿Cómo amaneciste, ${n}?`      : '¿Cómo amaneciste?',
      n ? `Buen día, ${n}. ¿Arrancamos?` : 'Buen día. ¿Arrancamos?',
    ] : tarde ? [
      n ? `Buenas tardes, ${n}.`          : 'Buenas tardes.',
      n ? `Hola, ${n}.`                   : 'Hola.',
      n ? `¡Qué bueno verte, ${n}!`       : '¡Qué bueno verte!',
      n ? `¿Qué vas a mapear hoy, ${n}?`  : '¿Qué vas a mapear hoy?',
      n ? `Buenas, ${n}. ¿En qué andás?`  : 'Buenas. ¿En qué andás?',
      n ? `Hola, ${n}. ¿Exploramos algo?` : 'Hola. ¿Exploramos algo?',
    ] : [
      n ? `Buenas noches, ${n}.`              : 'Buenas noches.',
      n ? `Hola, ${n}.`                       : 'Hola.',
      n ? `¡Qué bueno verte de nuevo, ${n}!`  : '¡Qué bueno verte de nuevo!',
      n ? `Buenas, ${n}. ¿Un mapa nocturno?`  : 'Buenas. ¿Un mapa nocturno?',
      n ? `Hola, ${n}. Trasnochando un poco.` : 'Hola. Trasnochando un poco.',
    ];
    return opciones[Math.floor(Math.random() * opciones.length)];
  }

  function buildGreetingAnon() {
    const h = new Date().getHours();
    const manana = h >= 6  && h < 12;
    const tarde  = h >= 12 && h < 20;
    const opciones = manana ? [
      'Buenos días. ¿Arrancamos?',
      'Buen día. Iniciá sesión para guardar tus mapas.',
      'Buen día. ¿Por dónde empezamos?',
      'Buenos días. ¿Qué tenemos hoy?',
    ] : tarde ? [
      'Buenas tardes. ¿Qué querés mapear?',
      'Hola. Iniciá sesión para no perder tus mapas.',
      'Buenas. El mapa te está esperando.',
      'Hola. ¿Arrancamos?',
    ] : [
      'Buenas noches. ¿Un mapa nocturno?',
      'Hola. Iniciá sesión para guardar lo que explorés.',
      'Buenas. Todo listo cuando quieras.',
      'Hola de nuevo. ¿Arrancamos?',
    ];
    return opciones[Math.floor(Math.random() * opciones.length)];
  }

  // ── Auth + routing ────────────────────────────────────────────

  function initAuth() {
    const authError = window.AUTH.handleAuthError();
    if (authError) window.TOAST.error('Error de autenticación: ' + authError);

    const newSession = window.AUTH.handleCallback();
    if (newSession) console.log('[APP] Login OK:', newSession.email);

    const user = window.AUTH.currentUser();
    window.SIDEBAR.render();
    window.SIDEBAR.setUser(user);

    const greeting = document.getElementById('home-greeting');
    if (greeting) {
      greeting.textContent = user
        ? buildGreeting(user.name?.split(' ')[0] || null)
        : buildGreetingAnon();
    }

    handleURLRouting();
  }

  async function handleURLRouting() {
    const hash = window.location.hash;
    if (!hash.startsWith('#chat=')) return;
    const chatId = hash.slice('#chat='.length);
    if (!chatId) return;
    const user = window.AUTH.currentUser();
    if (!user) return;
    try {
      // Cargar directamente el chat por ID en vez de descargar todos los chats.
      // Nota: restoreChat maneja su propia transición de pantalla — no llamar
      // goToWork('') antes porque CHAT.reset() borraría el currentChatId
      // y si restoreChat falla a mitad los cambios subsiguientes no se persisten.
      const chat = await window.FB.getChat(user.uid, chatId);
      if (chat) await restoreChat(chat);
    } catch (err) {
      console.warn('[APP] No se pudo cargar el chat desde URL:', err.message);
    }
  }

  // Esperar a que window.LAYERS esté disponible antes de inicializar.
  // Es necesario porque layers/index.js se carga como ES module (asíncrono)
  // y puede no haber terminado cuando DOMContentLoaded dispara.
  function waitForLayers(callback, intentos = 0) {
    if (window.LAYERS && Object.keys(window.LAYERS).length > 0) {
      callback();
    } else if (intentos < 50) {
      setTimeout(() => waitForLayers(callback, intentos + 1), 100);
    } else {
      console.error('[APP] window.LAYERS no disponible después de 5s — verificá layers/index.js');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    window.SETTINGS.init();
    waitForLayers(() => {
      init();
      initAuth();
    });
  });

  return {
    renderMap,
    goToWork,
    newMap,
    restoreChat,
    applyStylePlan,
    applyClassifyPlan,
    setChatHeader: (t) => window.CHAT_HEADER.setChatHeader(t),
    getCurrentPlan: () => currentPlan
  };

})();

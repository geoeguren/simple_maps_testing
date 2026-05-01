/**
 * layers-panel.js — Orquestador del panel de capas
 *
 * Expone: window.LAYERS_PANEL, window.LP_PANEL
 * Depende de (en orden de carga):
 *   layers-panel-utils.js   → window.LP_UTILS
 *   layers-panel-style.js   → window.LP_STYLE
 *   layers-panel-modal.js   → window.LP_MODAL
 *
 * Responsabilidades:
 *   - persistStyle / persistClassification (accedidos por LP_STYLE y LP_MODAL)
 *   - buildLayerRow, renderLayerRows, wireCheckboxes, wireDrag
 *   - toggle / close del dropdown principal
 *
 * API pública: window.LAYERS_PANEL = { toggle, close, geomSVG }
 */

window.LP_PANEL = (() => {

  function persistStyle(mapKey, style) {
    const plan   = window.APP?.getCurrentPlan?.();
    const user   = window.AUTH?.currentUser();
    const chatId = window.CHAT?.getChatId?.();
    if (plan?.instrucciones) {
      const inst = plan.instrucciones.find(c => c.mapKey === mapKey);
      if (inst) inst.style = { ...style };
    }
    if (user && chatId && plan) {
      window.FB.updateChat(user.uid, chatId, { lastMap: plan })
        .catch(e => console.warn('[LAYERS] Error persistiendo estilo:', e));
      window.SIDEBAR?.updateCachedChat(chatId, { lastMap: plan });
    }
  }

  function persistClassification(mapKey, classification) {
    const plan   = window.APP?.getCurrentPlan?.();
    const user   = window.AUTH?.currentUser();
    const chatId = window.CHAT?.getChatId?.();
    if (plan?.instrucciones) {
      const inst = plan.instrucciones.find(c => c.mapKey === mapKey);
      if (inst) inst.classification = classification ? { ...classification } : null;
    }
    if (user && chatId && plan) {
      window.FB.updateChat(user.uid, chatId, { lastMap: plan })
        .catch(e => console.warn('[LAYERS] Error persistiendo clasificación:', e));
      window.SIDEBAR?.updateCachedChat(chatId, { lastMap: plan });
    }
  }

  return { persistStyle, persistClassification };

})();


window.LAYERS_PANEL = (() => {

  const { esc, geomSVG }       = window.LP_UTILS;
  const { closeEditAccordion,
          toggleEditAccordion } = window.LP_STYLE;

  let _layersOnOutside = null;

  // ── Fila de capa ──────────────────────────────────────────────

  function buildLayerRow(k, l) {
    const on = l.visible !== false;
    const r  = document.createElement('div');
    r.className   = 'layers-data-row';
    r.draggable   = true;
    r.dataset.key = k;
    r.innerHTML = `
      <span class="layer-drag-handle material-icons">drag_indicator</span>
      ${geomSVG(l)}
      <input class="layer-name-input" data-key="${esc(k)}"
             value="${esc(l.titulo || k)}"
             title="Click para editar" />
      <button class="layer-edit-btn" data-key="${esc(k)}" title="Editar capa">
        <span class="material-icons">tune</span>
      </button>
      <div class="layer-checkbox ${on ? 'on' : ''}" data-key="${esc(k)}"></div>`;

    const input = r.querySelector('.layer-name-input');
    input.addEventListener('focus', () => {
      input.dataset.original = input.value;
      input.closest('.layers-data-row').draggable = false;
    });
    input.addEventListener('blur', () => {
      input.closest('.layers-data-row').draggable = true;
      const newName  = input.value.trim();
      const original = input.dataset.original || '';
      if (!newName) { input.value = original; return; }
      if (newName === original) return;
      const layers = window.MAP.getActiveLayers();
      if (layers[k]) layers[k].titulo = newName;
      window.MAP.renameLayer(k, newName);
      const legendInput = document.querySelector(`.legend-label-input[data-key="${k}"]`);
      if (legendInput) legendInput.value = newName;
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { input.value = input.dataset.original || input.value; input.blur(); }
    });

    r.querySelector('.layer-edit-btn').addEventListener('click', ev => {
      ev.stopPropagation();
      const sec = ev.currentTarget.closest('.layers-data-section');
      toggleEditAccordion(k, ev.currentTarget, sec);
    });

    return r;
  }

  // ── Render de filas ───────────────────────────────────────────

  function renderLayerRows(sec) {
    closeEditAccordion(sec);
    sec.innerHTML = '<p class="sd-section-label" style="text-transform:none">Capas</p>';
    const nl = window.MAP.getActiveLayers();
    Object.entries(nl).reverse().forEach(([k, l]) => sec.appendChild(buildLayerRow(k, l)));
    wireCheckboxes(sec);
    wireDrag(sec);
    window.MAP.updateLegend();
  }

  function wireCheckboxes(sec) {
    if (!sec) return;
    sec.querySelectorAll('.layer-checkbox').forEach(b => {
      b.addEventListener('click', ev => {
        ev.stopPropagation();
        window.MAP.toggleLayerVisibility(b.dataset.key);
        b.classList.toggle('on');
      });
    });
  }

  function wireDrag(sec) {
    if (!sec) return;
    sec.addEventListener('dragover', e => e.preventDefault());
    sec.querySelectorAll('.layers-data-row').forEach(row => {
      row.addEventListener('dragstart', e => {
        e.dataTransfer.setData('text/plain', row.dataset.key);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => row.classList.add('dragging'), 0);
      });
      row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        sec.querySelectorAll('.layers-data-row').forEach(r => r.classList.remove('drag-over'));
      });
      row.addEventListener('dragenter', e => {
        e.preventDefault();
        const fromKey = e.dataTransfer.getData('text/plain') || '';
        if (row.dataset.key === fromKey) return;
        sec.querySelectorAll('.layers-data-row').forEach(r => r.classList.remove('drag-over'));
        row.classList.add('drag-over');
      });
      row.addEventListener('drop', e => {
        e.preventDefault();
        const fromKey   = e.dataTransfer.getData('text/plain');
        const targetKey = row.dataset.key;
        if (!fromKey || fromKey === targetKey) return;
        sec.querySelectorAll('.layers-data-row').forEach(r => r.classList.remove('drag-over'));
        const keys      = Object.keys(window.MAP.getActiveLayers());
        const targetIdx = keys.indexOf(targetKey);
        window.MAP.moveLayer(fromKey, targetIdx);
        renderLayerRows(sec);
      });
    });
  }

  // ── Toggle del dropdown principal ─────────────────────────────

  function toggle() {
    const btn      = document.getElementById('btn-map-layers');
    const existing = document.getElementById('layers-dropdown');
    if (existing) {
      existing.remove();
      btn?.classList.remove('active');
      if (_layersOnOutside) {
        document.removeEventListener('mousedown', _layersOnOutside);
        _layersOnOutside = null;
      }
      return;
    }

    const layers   = window.MAP.getActiveLayers();
    const basemaps = window.MAP.getBasemaps();
    const curBase  = window.MAP.getCurrentBase();

    const dd = document.createElement('div');
    dd.id        = 'layers-dropdown';
    dd.className = 'settings-dropdown layers-dropdown';

    // Íconos de basemap: se leen del catálogo si tiene propiedad 'icon', con fallback
    const BASE_ICONS = { gray: 'light_mode', dark: 'dark_mode', satellite: 'satellite_alt' };
    let baseHTML = '<div class="sd-section"><p class="sd-section-label" style="text-transform:none">Mapa base</p>';
    Object.entries(basemaps).forEach(([key, def]) => {
      const on   = curBase === key ? 'on' : '';
      const icon = def.icon || BASE_ICONS[key] || 'map';
      baseHTML += `
        <div class="sd-radio-row layers-base-row" data-base="${key}">
          <div class="sd-row-left">
            <span class="material-icons sd-row-icon">${icon}</span>
            <div class="sd-row-text"><span class="sd-row-label">${def.label}</span></div>
          </div>
          <div class="sd-toggle ${on}"></div>
        </div>`;
    });
    baseHTML += '</div>';

    let layersHTML = '';
    if (Object.keys(layers).length) {
      layersHTML = '<div class="sd-section layers-data-section"><p class="sd-section-label" style="text-transform:none">Capas</p>';
      Object.entries(layers).reverse().forEach(([key, layer]) => {
        const checked = layer.visible !== false;
        layersHTML += `
          <div class="layers-data-row" draggable="true" data-key="${esc(key)}">
            <span class="layer-drag-handle material-icons">drag_indicator</span>
            ${geomSVG(layer)}
            <span class="layer-row-name">${esc(layer.titulo || key)}</span>
            <div class="layer-checkbox ${checked ? 'on' : ''}" data-key="${esc(key)}"></div>
          </div>`;
      });
      layersHTML += '</div>';
    }

    dd.innerHTML = baseHTML + layersHTML;
    document.body.appendChild(dd);

    const btnRect = btn.getBoundingClientRect();
    const ddW     = dd.offsetWidth;
    let left      = btnRect.right - ddW;
    left = Math.max(8, left);
    dd.style.top  = (btnRect.bottom + 6) + 'px';
    dd.style.left = left + 'px';

    btn?.classList.add('active');

    dd.querySelectorAll('.layers-base-row').forEach(row => {
      row.style.pointerEvents = 'auto';
      row.addEventListener('click', () => {
        const key = row.dataset.base;
        window.MAP.setBasemap(key);
        dd.querySelectorAll('.layers-base-row .sd-toggle').forEach(t => t.classList.remove('on'));
        row.querySelector('.sd-toggle').classList.add('on');
      });
    });

    const sec = dd.querySelector('.layers-data-section');
    if (sec) renderLayerRows(sec);

    let _isDragging = false;
    dd.addEventListener('dragstart', () => { _isDragging = true; });
    dd.addEventListener('dragend',   () => { _isDragging = false; });

    _layersOnOutside = function(e) {
      if (_isDragging) return;
      if (!dd.contains(e.target) && !btn.contains(e.target)) {
        const activeInput = dd.querySelector('input:focus');
        if (activeInput) activeInput.blur();
        dd.remove();
        btn?.classList.remove('active');
        document.removeEventListener('mousedown', _layersOnOutside);
        _layersOnOutside = null;
      }
    };
    setTimeout(() => document.addEventListener('mousedown', _layersOnOutside), 0);
  }

  function close() {
    const dd = document.getElementById('layers-dropdown');
    if (dd) dd.remove();
    document.getElementById('btn-map-layers')?.classList.remove('active');
    if (_layersOnOutside) {
      document.removeEventListener('mousedown', _layersOnOutside);
      _layersOnOutside = null;
    }
  }

  return { toggle, close, geomSVG };

})();

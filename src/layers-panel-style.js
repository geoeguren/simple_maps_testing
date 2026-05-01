/**
 * layers-panel-style.js — Acordeón de estilo simple y controles clasificados
 *
 * Expone: window.LP_STYLE
 * Depende de: window.LP_UTILS (layers-panel-utils.js)
 * Debe cargarse ANTES de layers-panel.js
 *
 * Contiene: styleControlsHTML, toggleEditAccordion, closeEditAccordion,
 *           wireStyleControls, applySimpleStyle,
 *           buildCatItems, wireClassifiedControls
 */

window.LP_STYLE = (() => {

  const { esc, leaRow, toHex, colorPickerHTML, buildDashSelect, wireCsel, getCselValue, wireSliderTouch, geomSVG } = window.LP_UTILS;

  // ── Estado del acordeón ───────────────────────────────────────

  let _activeEditKey = null;

  function closeEditAccordion(sec) {
    const open = sec?.querySelector('.layer-edit-accordion');
    if (open) open.remove();
    const btn = sec?.querySelector(`.layer-edit-btn[data-key="${_activeEditKey}"]`);
    if (btn) btn.classList.remove('active');
    _activeEditKey = null;
  }

  // ── Constructores de HTML de controles ───────────────────────

  function styleControlsHTML(geom, s, mapKey, prefix = '') {
    let rows = '';
    const p = prefix ? `data-prefix="${prefix}"` : '';
    if (geom === 'point') {
      const radius = s.radius ?? 5;
      rows += leaRow('Tamaño', `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="radius" ${p} type="range" min="1" max="25" step="0.5" value="${radius}" /><span class="lea-val">${radius}</span></div>`);
    }
    if (geom === 'line') {
      const w    = s.weight ?? 2;
      const dash = s.dashArray || 'none';
      rows += leaRow('Grosor', `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="weight" ${p} type="range" min="0" max="10" step="0.5" value="${w}" /><span class="lea-val">${w}</span></div>`);
      rows += leaRow('Color', colorPickerHTML('color', toHex(s.color), p));
      rows += leaRow('Opacidad', `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="opacity" ${p} type="range" min="0" max="1" step="0.05" value="${s.opacity ?? 1}" /><span class="lea-val">${Math.round((s.opacity ?? 1) * 100)}%</span></div>`);
      if (mapKey) rows += leaRow('Patrón de línea', buildDashSelect(dash, `lea-dash-${mapKey}`));
    }
    if (geom === 'point' || geom === 'polygon') {
      const w  = s.weight ?? 1.5;
      const fo = s.fillOpacity ?? 0.5;
      rows += leaRow('Grosor del borde', `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="weight" ${p} type="range" min="0" max="10" step="0.5" value="${w}" /><span class="lea-val">${w}</span></div>`);
      rows += leaRow('Color del borde',   colorPickerHTML('color',     toHex(s.color), p));
      rows += leaRow('Color del relleno', colorPickerHTML('fillColor', toHex(s.fillColor || s.color), p));
      const foVal = Math.round(fo * 100);
      rows += leaRow('Opacidad', `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="fillOpacity" ${p} type="range" min="0" max="1" step="0.05" value="${fo}" /><span class="lea-val">${foVal}%</span></div>`);
    }
    return rows;
  }

  // ── Acordeón ──────────────────────────────────────────────────

  function toggleEditAccordion(k, btnEl, sec) {
    if (_activeEditKey === k) { closeEditAccordion(sec); return; }
    closeEditAccordion(sec);
    _activeEditKey = k;
    btnEl.classList.add('active');

    const l = window.MAP.getActiveLayers()[k];
    if (!l) return;
    const geom = l.geomType || 'polygon';
    const s    = l.style || {};

    const acc = document.createElement('div');
    acc.className  = 'layer-edit-accordion';
    acc.dataset.key = k;

    acc.innerHTML =
      `<div class="lea-mode-content" id="lea-content-${k}"></div>` +
      `<div class="lea-sep"></div>` +
      `<button class="lea-advanced-btn" data-key="${k}"><span class="material-icons">biotech</span>Edición avanzada</button>` +
      `<div class="lea-sep"></div>` +
      `<button class="lea-delete-btn" data-key="${k}"><span class="material-icons">delete</span>Eliminar capa</button>`;

    const row = sec.querySelector(`.layers-data-row[data-key="${k}"]`);
    row?.insertAdjacentElement('afterend', acc);

    const contentEl = acc.querySelector(`#lea-content-${k}`);

    // Render modo simple directamente
    contentEl.innerHTML = styleControlsHTML(geom, s, k);
    _wireStyleControls(contentEl, k, geom, sec);
    if (geom === 'line') wireCsel(contentEl, `lea-dash-${k}`, () => _applySimpleStyle(k, contentEl, sec));

    // Botón edición avanzada → modal
    acc.querySelector('.lea-advanced-btn').addEventListener('click', () => {
      window.LP_MODAL.openAdvancedModal(k, sec);
    });

    // Botón eliminar capa
    acc.querySelector('.lea-delete-btn')?.addEventListener('click', () => {
      window.MAP.removeLayer(k);
      window.MAP.updateLegend();
      closeEditAccordion(sec);
      const rowEl = sec.querySelector(`.layers-data-row[data-key="${k}"]`);
      rowEl?.remove();
      window.TOAST?.success('Capa eliminada.');
      const plan   = window.APP?.getCurrentPlan?.();
      const user   = window.AUTH?.currentUser();
      const chatId = window.CHAT?.getChatId?.();
      if (plan?.instrucciones) {
        plan.instrucciones = plan.instrucciones.filter(i => i.mapKey !== k);
      }
      if (user && chatId && plan) {
        window.FB.updateChat(user.uid, chatId, { lastMap: plan })
          .catch(e => console.warn('[LAYERS] Error al persistir eliminación:', e));
        window.SIDEBAR?.updateCachedChat(chatId, { lastMap: plan });
      }
    });
  }

  // ── Wire de controles simples (internos al acordeón) ─────────

  function _wireStyleControls(container, mapKey, geom, sec) {
    container.querySelectorAll('.lea-range-input').forEach(inp => {
      wireSliderTouch(inp);
      inp.addEventListener('input', e => {
        const val   = parseFloat(e.target.value);
        const prop  = e.target.dataset.prop;
        const valEl = e.target.closest('.lea-slider-wrap')?.querySelector('.lea-val');
        if (valEl) valEl.textContent = prop === 'fillOpacity' ? Math.round(val * 100) + '%' : val;
        _applySimpleStyle(mapKey, container, sec);
      });
    });
    container.querySelectorAll('.lea-color-pick').forEach(pick => {
      pick.addEventListener('input', e => {
        const val  = e.target.value;
        const prop = e.target.dataset.prop;
        e.target.closest('label').style.background = val;
        const hex = container.querySelector(`.lea-hex-input[data-prop="${prop}"]`);
        if (hex) hex.value = val.toUpperCase();
        _applySimpleStyle(mapKey, container, sec);
      });
    });
    container.querySelectorAll('.lea-hex-input').forEach(inp => {
      inp.addEventListener('input', e => {
        const val = e.target.value.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(val)) {
          const prop   = e.target.dataset.prop;
          const swatch = container.querySelector(`.lea-color-pick[data-prop="${prop}"]`)?.closest('label');
          const pick   = container.querySelector(`.lea-color-pick[data-prop="${prop}"]`);
          if (swatch) swatch.style.background = val;
          if (pick)   pick.value = val;
          _applySimpleStyle(mapKey, container, sec);
        }
      });
      inp.addEventListener('change', e => {
        let val = e.target.value.trim();
        if (!val.startsWith('#')) val = '#' + val;
        val = val.slice(0, 7).toUpperCase();
        if (/^#[0-9a-fA-F]{6}$/.test(val)) {
          e.target.value = val;
          const prop   = e.target.dataset.prop;
          const swatch = container.querySelector(`.lea-color-pick[data-prop="${prop}"]`)?.closest('label');
          const pick   = container.querySelector(`.lea-color-pick[data-prop="${prop}"]`);
          if (swatch) swatch.style.background = val;
          if (pick)   pick.value = val;
          _applySimpleStyle(mapKey, container, sec);
        }
      });
    });
  }

  function _applySimpleStyle(mapKey, container, sec) {
    const nl = window.MAP.getActiveLayers()[mapKey];
    if (!nl) return;
    const ns = { ...nl.style };
    container.querySelectorAll('.lea-range-input').forEach(inp => {
      if (inp.dataset.prop) ns[inp.dataset.prop] = parseFloat(inp.value);
    });
    container.querySelectorAll('.lea-hex-input').forEach(inp => {
      const val = inp.value.trim();
      if (inp.dataset.prop && /^#[0-9a-fA-F]{6}$/.test(val)) ns[inp.dataset.prop] = val;
    });
    const dashCsel = getCselValue(container, `lea-dash-${mapKey}`);
    if (dashCsel) ns.dashArray = dashCsel === 'none' ? null : dashCsel;
    window.MAP.updateLayerStyle(mapKey, ns);
    nl.style = ns;
    window.LP_PANEL.persistStyle(mapKey, ns);
    // Actualizar SVG en la fila del panel
    const rowEl = sec.querySelector(`.layers-data-row[data-key="${mapKey}"]`);
    const svg   = rowEl?.querySelector('.layer-geom-svg');
    if (svg) {
      const tmp = document.createElement('div');
      tmp.innerHTML = geomSVG({ ...nl, style: ns });
      const newSvg = tmp.firstChild;
      if (newSvg) svg.replaceWith(newSvg);
    }
    window.MAP.updateLegend();
  }

  // ── Items clasificados (categorías editables en el acordeón) ──

  function buildCatItems(container, mapKey, geom, mode) {
    const nl             = window.MAP.getActiveLayers()[mapKey];
    const classification = nl?.classification;
    if (!classification?.colorMap) return;

    const itemsEl = container.querySelector('.lea-cat-items, .lea-grad-items');
    if (!itemsEl) return;
    itemsEl.innerHTML = '';

    Object.entries(classification.colorMap).forEach(([val, color]) => {
      const baseStyle = nl.style || {};
      const valStyle  = classification.styleMap?.[val] || {};
      const s         = { ...baseStyle, ...valStyle, color, fillColor: color };

      const item = document.createElement('div');
      item.className   = 'lea-cat-item';
      item.dataset.val = val;

      let extraControls = '';
      if (geom === 'point') {
        const radius = s.radius ?? 5;
        const fo     = s.fillOpacity ?? 0.85;
        extraControls += `
          <div class="lea-cat-controls">
            <div class="lea-cat-ctrl-row">${leaRow('Tamaño', `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="radius" type="range" min="1" max="25" step="0.5" value="${radius}" /><span class="lea-val">${radius}</span></div>`)}</div>
            <div class="lea-cat-ctrl-row">${leaRow('Color del borde', colorPickerHTML('color', toHex(s.color)))}</div>
            <div class="lea-cat-ctrl-row">${leaRow('Grosor del borde', `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="weight" type="range" min="0" max="10" step="0.5" value="${s.weight ?? 1.5}" /><span class="lea-val">${s.weight ?? 1.5}</span></div>`)}</div>
            <div class="lea-cat-ctrl-row">${leaRow('Opacidad', `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="fillOpacity" type="range" min="0" max="1" step="0.05" value="${fo}" /><span class="lea-val">${Math.round(fo * 100)}%</span></div>`)}</div>
          </div>`;
      } else if (geom === 'polygon') {
        const fo = s.fillOpacity ?? 0.5;
        extraControls += `
          <div class="lea-cat-controls">
            <div class="lea-cat-ctrl-row">${leaRow('Color del borde', colorPickerHTML('color', toHex(s.color)))}</div>
            <div class="lea-cat-ctrl-row">${leaRow('Grosor del borde', `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="weight" type="range" min="0" max="10" step="0.5" value="${s.weight ?? 1.5}" /><span class="lea-val">${s.weight ?? 1.5}</span></div>`)}</div>
            <div class="lea-cat-ctrl-row">${leaRow('Opacidad', `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="fillOpacity" type="range" min="0" max="1" step="0.05" value="${fo}" /><span class="lea-val">${Math.round(fo * 100)}%</span></div>`)}</div>
          </div>`;
      } else if (geom === 'line') {
        const fo     = s.opacity ?? 1;
        const dash   = s.dashArray || 'none';
        const dashId = `lea-dash-${mapKey}-${val}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        extraControls += `
          <div class="lea-cat-controls">
            <div class="lea-cat-ctrl-row">${leaRow('Grosor', `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="weight" type="range" min="0" max="10" step="0.5" value="${s.weight ?? 2}" /><span class="lea-val">${s.weight ?? 2}</span></div>`)}</div>
            <div class="lea-cat-ctrl-row">${leaRow('Opacidad', `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="opacity" type="range" min="0" max="1" step="0.05" value="${fo}" /><span class="lea-val">${Math.round(fo * 100)}%</span></div>`)}</div>
            <div class="lea-cat-ctrl-row">${leaRow('Patrón de línea', buildDashSelect(dash, dashId))}</div>
          </div>`;
      }

      item.innerHTML = `
        <div class="lea-cat-item-header">
          <label class="lea-color-swatch lea-cat-swatch" style="background:${color}">
            <input class="lea-color-pick lea-cat-pick" type="color" value="${color}" data-val="${val}" />
          </label>
          <span class="lea-cat-label">${val}</span>
          <button class="lea-cat-remove" data-val="${val}" title="Eliminar">✕</button>
          <button class="lea-cat-toggle" data-val="${val}" title="Editar estilo"><span class="material-icons" style="font-size:14px;pointer-events:none">tune</span></button>
        </div>
        <div class="lea-cat-detail hidden">${extraControls}</div>`;

      itemsEl.appendChild(item);

      // Toggle detalle — solo uno abierto a la vez
      item.querySelector('.lea-cat-toggle').addEventListener('click', () => {
        const detail    = item.querySelector('.lea-cat-detail');
        const wasHidden = detail.classList.contains('hidden');
        itemsEl.querySelectorAll('.lea-cat-detail').forEach(d => d.classList.add('hidden'));
        itemsEl.querySelectorAll('.lea-cat-toggle').forEach(b => b.classList.remove('open'));
        if (wasHidden) {
          detail.classList.remove('hidden');
          item.querySelector('.lea-cat-toggle').classList.add('open');
          _wireItemControls(item, val);
        }
      });

      // Color del swatch (relleno) — siempre visible
      item.querySelector('.lea-cat-pick').addEventListener('input', e => {
        const newColor = e.target.value;
        e.target.closest('label').style.background = newColor;
        _updateValStyle(nl, mapKey, val, { fillColor: newColor, color: newColor });
      });

      // Eliminar valor
      item.querySelector('.lea-cat-remove').addEventListener('click', () => {
        if (nl.classification?.colorMap) {
          delete nl.classification.colorMap[val];
          if (nl.classification.styleMap) delete nl.classification.styleMap[val];
          window.MAP.applyClassificationFromData(mapKey, nl.classification);
          window.LP_PANEL.persistClassification(mapKey, nl.classification);
          buildCatItems(container, mapKey, geom, mode);
        }
      });
    });
  }

  function _wireItemControls(item, val) {
    if (item.dataset.wired) return;
    item.dataset.wired = '1';

    const mapKey = item.closest('[data-key]')?.dataset.key || '';
    const nl     = window.MAP.getActiveLayers()[mapKey];

    // Wire dash selector si existe (líneas)
    const dashId = `lea-dash-${mapKey}-${val}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    wireCsel(item, dashId, (dashVal) => {
      _updateValStyle(nl, mapKey, val, { dashArray: dashVal === 'none' ? null : dashVal });
    });

    item.querySelectorAll('.lea-range-input').forEach(inp => {
      wireSliderTouch(inp);
      inp.addEventListener('input', e => {
        const prop  = e.target.dataset.prop;
        const v     = parseFloat(e.target.value);
        const valEl = e.target.closest('.lea-slider-wrap')?.querySelector('.lea-val');
        if (valEl) valEl.textContent = (prop === 'fillOpacity' || prop === 'opacity') ? Math.round(v * 100) + '%' : v;
        _updateValStyle(nl, mapKey, val, { [prop]: v });
      });
    });
    item.querySelectorAll('.lea-color-pick:not(.lea-cat-pick)').forEach(pick => {
      pick.addEventListener('input', e => {
        const prop = e.target.dataset.prop;
        e.target.closest('label').style.background = e.target.value;
        const hex = item.querySelector(`.lea-hex-input[data-prop="${prop}"]`);
        if (hex) hex.value = e.target.value.toUpperCase();
        _updateValStyle(nl, mapKey, val, { [prop]: e.target.value });
      });
    });
    item.querySelectorAll('.lea-hex-input').forEach(inp => {
      inp.addEventListener('change', e => {
        let v = e.target.value.trim();
        if (!v.startsWith('#')) v = '#' + v;
        v = v.slice(0, 7).toUpperCase();
        if (/^#[0-9a-fA-F]{6}$/.test(v)) {
          e.target.value = v;
          const prop   = e.target.dataset.prop;
          const swatch = item.querySelector(`.lea-color-pick[data-prop="${prop}"]`)?.closest('label');
          const pick   = item.querySelector(`.lea-color-pick[data-prop="${prop}"]`);
          if (swatch) swatch.style.background = v;
          if (pick)   pick.value = v;
          _updateValStyle(nl, mapKey, val, { [prop]: v });
        }
      });
    });
  }

  function _updateValStyle(nl, mapKey, v, changes) {
    if (!nl.classification) return;
    if (!nl.classification.styleMap) nl.classification.styleMap = {};
    nl.classification.styleMap[v] = { ...(nl.classification.styleMap[v] || nl.style || {}), ...changes };
    if (changes.fillColor) nl.classification.colorMap[v] = changes.fillColor;
    window.MAP.applyClassificationFromData(mapKey, nl.classification);
    window.LP_PANEL.persistClassification(mapKey, nl.classification);
  }

  // ── Wire de controles clasificados ────────────────────────────

  function wireClassifiedControls(container, mapKey, geom, sec, mode, palId) {
    function applyClassification() {
      const field   = container.querySelector('.lea-field-select')?.value;
      const palette = getCselValue(container, palId) || 'qualitative';
      const method  = container.querySelector('.lea-method-select')?.value || 'jenks';
      const classes = parseInt(container.querySelector('.lea-classes-input')?.value || 5);
      if (!field) return;
      window.MAP.applyClassification(mapKey, { type: mode, field, palette, method, classes,
        paletteColors: window.PALETTES[palette] });
      const nl = window.MAP.getActiveLayers()[mapKey];
      window.LP_PANEL.persistClassification(mapKey, nl?.classification);
      buildCatItems(container, mapKey, geom, mode);
    }

    container.querySelector('.lea-field-select')?.addEventListener('change', applyClassification);
    container.querySelector('.lea-method-select')?.addEventListener('change', applyClassification);
    container.querySelector('.lea-classes-input')?.addEventListener('input', e => {
      const valEl = e.target.closest('.lea-slider-wrap')?.querySelector('.lea-val');
      if (valEl) valEl.textContent = e.target.value;
      applyClassification();
    });

    if (container.querySelector('.lea-field-select')?.value) applyClassification();
  }

  return {
    closeEditAccordion,
    toggleEditAccordion,
    styleControlsHTML,
    buildCatItems,
    wireClassifiedControls
  };

})();

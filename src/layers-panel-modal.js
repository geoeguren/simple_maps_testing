/**
 * layers-panel-modal.js — Modal de edición avanzada (clasificación categorizada / graduada)
 *
 * Expone: window.LP_MODAL
 * Depende de: window.LP_UTILS (layers-panel-utils.js)
 * Debe cargarse ANTES de layers-panel.js
 *
 * Contiene: openAdvancedModal y toda su lógica interna
 */

window.LP_MODAL = (() => {

  const {
    leaRow, toHex, colorPickerHTML, buildDashSelect,
    wireCsel, wireSliderTouch
  } = window.LP_UTILS;

  function openAdvancedModal(k, sec) {
    document.getElementById('adv-modal-backdrop')?.remove();
    document.getElementById('adv-modal')?.remove();

    const l = window.MAP.getActiveLayers()[k];
    if (!l) return;
    const geom          = l.geomType || 'polygon';
    const layerDef      = window.LAYERS[l.layerKey] || {};
    const attrs         = layerDef.attributes || [];
    const allFields     = attrs.filter(a => a.campo);
    const numericFields = attrs.filter(a => a.numeric);

    const initMode               = l.classification?.type || 'single';
    const initField              = l.classification?.field || (allFields[0]?.campo || '');
    const initPalette            = l.classification?.palette || null;
    const initMethod             = l.classification?.method || 'jenks';
    const initClasses            = l.classification?.classes || 5;
    const _savedClassification   = l.classification ? JSON.parse(JSON.stringify(l.classification)) : null;

    // ── Backdrop ──────────────────────────────────────────────────
    const backdrop = document.createElement('div');
    backdrop.id        = 'adv-modal-backdrop';
    backdrop.className = 'adv-modal-backdrop';
    document.body.appendChild(backdrop);

    // ── Modal shell ───────────────────────────────────────────────
    const modal = document.createElement('div');
    modal.id        = 'adv-modal';
    modal.className = 'adv-modal';

    const modes = [
      { mode: 'single',      label: 'Símbolo único' },
      { mode: 'categorized', label: 'Categorizado' },
      { mode: 'graduated',   label: 'Graduado' },
      { mode: 'heatmap',     label: 'Mapa de calor', disabled: true },
    ];
    const pills = modes.map(b =>
      `<button class="adv-pill ${b.mode === initMode ? 'active' : ''}" data-mode="${b.mode}"
               ${b.disabled ? 'disabled title="Próximamente"' : ''}>${b.label}</button>`
    ).join('');

    modal.innerHTML = `
      <div class="adv-modal-header">
        <span class="adv-modal-title">Edición avanzada</span>
        <button class="popup-close-btn" id="adv-close-btn"><span class="material-icons">close</span></button>
      </div>
      <div class="adv-modal-pills">${pills}</div>
      <div class="adv-modal-body" id="adv-modal-body"></div>
      <div class="adv-modal-footer">
        <button class="adv-footer-btn adv-clear" id="adv-clear-btn"
          style="${_savedClassification ? '' : 'visibility:hidden'}">Borrar clasificación</button>
        <div style="flex:1"></div>
        <button class="adv-footer-btn adv-cancel" id="adv-cancel-btn">Cancelar</button>
        <button class="adv-footer-btn adv-accept" id="adv-accept-btn">Aceptar</button>
      </div>`;
    document.body.appendChild(modal);

    const bodyEl     = modal.querySelector('#adv-modal-body');
    let   curMode    = initMode;
    let   selPalette = initPalette;

    // ── Selector de rampa de color ────────────────────────────────

    function buildRampCsel(palKeys, currentPalette, onChange) {
      const wrap = document.createElement('div');
      wrap.className = 'adv-ramp-csel';

      const makeDots = (pk) => (window.PALETTES[pk] || []).slice(0, 8).map(c =>
        `<span class="adv-ramp-dot" style="background:${c}"></span>`
      ).join('');

      const cur = currentPalette || palKeys[0];
      wrap.innerHTML = `
        <div class="adv-ramp-trigger" id="adv-ramp-trigger-${k}">
          <div class="adv-ramp-preview">${makeDots(cur)}</div>
          <span class="adv-ramp-arrow">▾</span>
        </div>
        <div class="adv-ramp-dropdown hidden" id="adv-ramp-dd-${k}">
          ${palKeys.map(pk => `
            <div class="adv-ramp-option ${pk === cur ? 'selected' : ''}" data-pal="${pk}">
              <div class="adv-ramp-option-dots">${makeDots(pk)}</div>
              <span class="adv-ramp-option-label">${window.PALETTE_LABELS[pk] || pk}</span>
            </div>`).join('')}
        </div>`;

      const trigger  = wrap.querySelector(`#adv-ramp-trigger-${k}`);
      const dropdown = wrap.querySelector(`#adv-ramp-dd-${k}`);
      const arrow    = wrap.querySelector('.adv-ramp-arrow');
      const preview  = wrap.querySelector('.adv-ramp-preview');

      trigger.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = !dropdown.classList.contains('hidden');
        dropdown.classList.toggle('hidden', isOpen);
        arrow.classList.toggle('open', !isOpen);
      });

      wrap.querySelectorAll('.adv-ramp-option').forEach(opt => {
        opt.addEventListener('click', e => {
          e.stopPropagation();
          const pk = opt.dataset.pal;
          wrap.querySelectorAll('.adv-ramp-option').forEach(o => o.classList.remove('selected'));
          opt.classList.add('selected');
          dropdown.classList.add('hidden');
          arrow.classList.remove('open');
          preview.innerHTML = makeDots(pk);
          selPalette = pk;
          onChange(pk);
        });
      });

      setTimeout(() => {
        document.addEventListener('click', function handler(e) {
          if (!wrap.contains(e.target)) {
            dropdown.classList.add('hidden');
            arrow.classList.remove('open');
          }
        }, { passive: true });
      }, 0);

      return wrap;
    }

    // ── Selector de campo genérico ────────────────────────────────

    function buildFieldCsel(options, currentValue, onChange) {
      const wrap = document.createElement('div');
      wrap.className = 'adv-ramp-csel adv-field-csel';

      const curOpt   = options.find(o => o.value === currentValue) || options.find(o => !o.disabled) || options[0];
      const curLabel = curOpt?.label || curOpt?.value || '';

      wrap.innerHTML = `
        <div class="adv-ramp-trigger adv-field-trigger">
          <span class="adv-field-selected">${curLabel}</span>
          <span class="adv-ramp-arrow">▾</span>
        </div>
        <div class="adv-ramp-dropdown hidden adv-field-dropdown">
          ${options.map(o => `
            <div class="adv-ramp-option adv-field-option ${o.value === currentValue ? 'selected' : ''} ${o.disabled ? 'adv-field-disabled' : ''}"
                 data-value="${o.value}">
              <span class="adv-ramp-option-label">${o.label}</span>
              ${o.disabled ? '<span class="adv-field-badge">+15</span>' : ''}
            </div>`).join('')}
        </div>`;

      const trigger  = wrap.querySelector('.adv-field-trigger');
      const dropdown = wrap.querySelector('.adv-field-dropdown');
      const arrow    = wrap.querySelector('.adv-ramp-arrow');
      const selected = wrap.querySelector('.adv-field-selected');

      trigger.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = !dropdown.classList.contains('hidden');
        document.querySelectorAll('.adv-field-dropdown:not(.hidden), .adv-ramp-dropdown:not(.hidden)')
          .forEach(d => { d.classList.add('hidden'); d.previousElementSibling?.querySelector('.adv-ramp-arrow')?.classList.remove('open'); });
        dropdown.classList.toggle('hidden', isOpen);
        arrow.classList.toggle('open', !isOpen);
      });

      wrap.querySelectorAll('.adv-field-option:not(.adv-field-disabled)').forEach(opt => {
        opt.addEventListener('click', e => {
          e.stopPropagation();
          wrap.querySelectorAll('.adv-field-option').forEach(o => o.classList.remove('selected'));
          opt.classList.add('selected');
          selected.textContent = opt.querySelector('.adv-ramp-option-label').textContent;
          dropdown.classList.add('hidden');
          arrow.classList.remove('open');
          onChange(opt.dataset.value);
        });
      });

      setTimeout(() => {
        document.addEventListener('click', function handler(e) {
          if (!wrap.contains(e.target)) {
            dropdown.classList.add('hidden');
            arrow.classList.remove('open');
          }
        }, { passive: true });
      }, 0);

      wrap.getValue = () => wrap.querySelector('.adv-field-option.selected')?.dataset.value || currentValue;
      return wrap;
    }

    function deselectRamp() {
      selPalette = null;
      modal.querySelectorAll('.adv-ramp-option').forEach(o => o.classList.remove('selected'));
      const preview = modal.querySelector('.adv-ramp-preview');
      if (preview) preview.innerHTML = '<span style="font-size:11px;color:var(--cream2);font-family:var(--font-sans)">Personalizada</span>';
    }

    // ── Preview en mapa ───────────────────────────────────────────

    function applyPreview() {
      if (curMode === 'single') { window.MAP.clearClassification(k); return; }
      const fieldEl  = bodyEl.querySelector('.adv-field');
      const field    = fieldEl?.getValue ? fieldEl.getValue() : (fieldEl?.value || '');
      const palette  = selPalette || (curMode === 'graduated' ? 'seq_blues' : 'cat_tableau');
      const methodEl = bodyEl.querySelector('.adv-method');
      const method   = methodEl?.getValue ? methodEl.getValue() : (methodEl?.value || 'jenks');
      const classes  = parseInt(bodyEl.querySelector('.adv-classes')?.value || 5);
      if (!field) return;
      window.MAP.applyClassification(k, {
        type: curMode, field, palette, method, classes,
        paletteColors: window.PALETTES[palette]
      });
      buildCatItemsAdv();
    }

    // ── Controles globales (aplican a todas las categorías) ───────

    function updateGlobalStyle(changes) {
      const nl = window.MAP.getActiveLayers()[k];
      if (!nl) return;
      nl.style = { ...(nl.style || {}), ...changes };
      if (nl.classification?.styleMap) {
        Object.keys(nl.classification.styleMap).forEach(val => {
          nl.classification.styleMap[val] = { ...nl.classification.styleMap[val], ...changes };
        });
      }
      window.MAP.applyClassificationFromData(k, nl.classification);
    }

    function buildGlobalControls(container, geom) {
      const nl  = window.MAP.getActiveLayers()[k];
      const s   = nl?.style || {};
      const wrap = document.createElement('div');
      wrap.className = 'adv-global-wrap';

      function addRow(label, controlHTML, prop, isPercent) {
        const row = document.createElement('div');
        row.className = 'adv-body-row';
        row.innerHTML = `<span class="adv-body-label">${label}</span>${controlHTML}`;
        wrap.appendChild(row);

        row.querySelectorAll('.lea-range-input').forEach(inp => {
          wireSliderTouch(inp);
          inp.addEventListener('input', e => {
            const v     = parseFloat(e.target.value);
            const valEl = e.target.closest('.lea-slider-wrap')?.querySelector('.lea-val');
            if (valEl) valEl.textContent = isPercent ? Math.round(v * 100) + '%' : v;
            updateGlobalStyle({ [prop]: v });
          });
        });
        row.querySelectorAll('.lea-color-pick').forEach(pick => {
          pick.addEventListener('input', e => {
            const p2 = e.target.dataset.prop;
            e.target.closest('label').style.background = e.target.value;
            const hex = row.querySelector(`.lea-hex-input[data-prop="${p2}"]`);
            if (hex) hex.value = e.target.value.toUpperCase();
            updateGlobalStyle({ [p2]: e.target.value });
          });
        });
        row.querySelectorAll('.lea-hex-input').forEach(inp => {
          inp.addEventListener('change', e => {
            let v = e.target.value.trim();
            if (!v.startsWith('#')) v = '#' + v;
            v = v.slice(0, 7).toUpperCase();
            if (/^#[0-9a-fA-F]{6}$/.test(v)) {
              e.target.value = v;
              const p2   = e.target.dataset.prop;
              const pick = row.querySelector(`.lea-color-pick[data-prop="${p2}"]`);
              if (pick) { pick.value = v; pick.closest('label').style.background = v; }
              updateGlobalStyle({ [p2]: v });
            }
          });
        });
      }

      if (geom === 'point') {
        const r  = s.radius ?? 5;
        const w  = s.weight ?? 1.5;
        const fo = s.fillOpacity ?? 0.85;
        addRow('Tamaño',
          `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="radius" type="range" min="1" max="25" step="0.5" value="${r}" /><span class="lea-val">${r}</span></div>`,
          'radius', false);
        addRow('Grosor del borde',
          `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="weight" type="range" min="0" max="10" step="0.5" value="${w}" /><span class="lea-val">${w}</span></div>`,
          'weight', false);
        addRow('Opacidad',
          `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="fillOpacity" type="range" min="0" max="1" step="0.05" value="${fo}" /><span class="lea-val">${Math.round(fo * 100)}%</span></div>`,
          'fillOpacity', true);

      } else if (geom === 'line') {
        const w    = s.weight ?? 2;
        const op   = s.opacity ?? 1;
        const dash = nl?.style?.dashArray || 'none';
        const dashId = `adv-global-dash-${k}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        addRow('Grosor',
          `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="weight" type="range" min="0" max="10" step="0.5" value="${w}" /><span class="lea-val">${w}</span></div>`,
          'weight', false);
        addRow('Opacidad',
          `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="opacity" type="range" min="0" max="1" step="0.05" value="${op}" /><span class="lea-val">${Math.round(op * 100)}%</span></div>`,
          'opacity', true);
        const dashRow = document.createElement('div');
        dashRow.className = 'adv-body-row';
        dashRow.innerHTML = `<span class="adv-body-label">Patrón de línea</span>${buildDashSelect(dash, dashId)}`;
        wrap.appendChild(dashRow);
        container.appendChild(wrap);
        wireCsel(wrap, dashId, dashVal => {
          updateGlobalStyle({ dashArray: dashVal === 'none' ? null : dashVal });
        });
        return;

      } else if (geom === 'polygon') {
        const w  = s.weight ?? 1.5;
        const fo = s.fillOpacity ?? 0.5;
        addRow('Grosor del borde',
          `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="weight" type="range" min="0" max="10" step="0.5" value="${w}" /><span class="lea-val">${w}</span></div>`,
          'weight', false);
        addRow('Opacidad',
          `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="fillOpacity" type="range" min="0" max="1" step="0.05" value="${fo}" /><span class="lea-val">${Math.round(fo * 100)}%</span></div>`,
          'fillOpacity', true);
      }

      container.appendChild(wrap);
    }

    // ── Items editables del modal ─────────────────────────────────

    function buildCatItemsAdv() {
      const nl      = window.MAP.getActiveLayers()[k];
      const cl      = nl?.classification;
      const itemsEl = bodyEl.querySelector('.adv-cat-items, .adv-grad-items');
      if (!itemsEl || !cl?.colorMap) return;
      const isGraduated = itemsEl.classList.contains('adv-grad-items');
      itemsEl.innerHTML = '';

      Object.entries(cl.colorMap).forEach(([val, color]) => {
        const item = document.createElement('div');
        item.className   = 'adv-cat-item';
        item.dataset.val = val;

        const header = document.createElement('div');
        header.className = 'adv-cat-header';

        if (!isGraduated) {
          item.draggable = true;
          const handle = document.createElement('span');
          handle.className  = 'adv-cat-drag material-icons';
          handle.textContent = 'drag_indicator';
          handle.title      = 'Arrastrar para reordenar';
          header.appendChild(handle);
        }

        const swatch = document.createElement('label');
        swatch.className      = 'adv-cat-swatch';
        swatch.style.background = color;
        const pick = document.createElement('input');
        pick.type  = 'color';
        pick.value = color;
        pick.addEventListener('input', e => {
          const c = e.target.value;
          swatch.style.background = c;
          deselectRamp();
          updateCatColor(val, c);
        });
        swatch.appendChild(pick);

        const nameInput = document.createElement('input');
        nameInput.type             = 'text';
        nameInput.className        = 'adv-cat-name';
        nameInput.value            = val;
        nameInput.dataset.original = val;
        nameInput.addEventListener('focus', () => { nameInput.dataset.original = nameInput.value; });
        nameInput.addEventListener('blur', () => {
          const newName = nameInput.value.trim();
          const orig    = nameInput.dataset.original;
          if (!newName) { nameInput.value = orig; return; }
          if (newName === orig) return;
          renameCatValue(orig, newName);
        });
        nameInput.addEventListener('keydown', e => {
          if (e.key === 'Enter')  { e.preventDefault(); nameInput.blur(); }
          if (e.key === 'Escape') { nameInput.value = nameInput.dataset.original; nameInput.blur(); }
        });

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'adv-cat-toggle';
        toggleBtn.innerHTML = '<span class="material-icons">tune</span>';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'adv-cat-toggle adv-cat-delete';
        deleteBtn.title     = 'Eliminar categoría';
        deleteBtn.innerHTML = '<span class="material-icons">close</span>';
        deleteBtn.addEventListener('click', () => {
          const nl2 = window.MAP.getActiveLayers()[k];
          if (!nl2?.classification?.colorMap) return;
          delete nl2.classification.colorMap[val];
          if (nl2.classification.styleMap) delete nl2.classification.styleMap[val];
          window.MAP.applyClassificationFromData(k, nl2.classification);
          buildCatItemsAdv();
        });

        header.appendChild(swatch);
        header.appendChild(nameInput);
        header.appendChild(toggleBtn);
        header.appendChild(deleteBtn);
        item.appendChild(header);

        const detail = document.createElement('div');
        detail.className = 'adv-cat-detail hidden';
        const baseStyle = nl.style || {};
        const valStyle  = cl.styleMap?.[val] || {};
        const fill      = valStyle.fillColor || color;
        const border    = valStyle.color || (geom !== 'line' ? (window.MAP.darkenHex?.(fill) || fill) : fill);
        const s         = { ...baseStyle, ...valStyle, color: border, fillColor: fill };
        detail.innerHTML = buildDetailHTML(geom, s, val);
        item.appendChild(detail);
        itemsEl.appendChild(item);

        toggleBtn.addEventListener('click', () => {
          const wasHidden = detail.classList.contains('hidden');
          itemsEl.querySelectorAll('.adv-cat-detail').forEach(d => d.classList.add('hidden'));
          itemsEl.querySelectorAll('.adv-cat-toggle').forEach(b => b.classList.remove('open'));
          if (wasHidden) {
            detail.classList.remove('hidden');
            toggleBtn.classList.add('open');
            wireDetailControls(detail, val, s);
          }
        });
      });

      // Drag-to-reorder (solo categorizado)
      if (!isGraduated) {
        let _dragSrc = null;
        itemsEl.querySelectorAll('.adv-cat-item').forEach(item => {
          item.addEventListener('dragstart', e => {
            _dragSrc = item;
            e.dataTransfer.effectAllowed = 'move';
            setTimeout(() => item.classList.add('adv-cat-dragging'), 0);
          });
          item.addEventListener('dragend', () => {
            item.classList.remove('adv-cat-dragging');
            itemsEl.querySelectorAll('.adv-cat-item').forEach(i => i.classList.remove('adv-cat-drag-over'));
          });
          item.addEventListener('dragover', e => {
            e.preventDefault();
            if (item === _dragSrc) return;
            itemsEl.querySelectorAll('.adv-cat-item').forEach(i => i.classList.remove('adv-cat-drag-over'));
            item.classList.add('adv-cat-drag-over');
          });
          item.addEventListener('drop', e => {
            e.preventDefault();
            if (!_dragSrc || _dragSrc === item) return;
            item.classList.remove('adv-cat-drag-over');
            const allItems = [...itemsEl.querySelectorAll('.adv-cat-item')];
            const fromIdx  = allItems.indexOf(_dragSrc);
            const toIdx    = allItems.indexOf(item);
            if (fromIdx < toIdx) itemsEl.insertBefore(_dragSrc, item.nextSibling);
            else                 itemsEl.insertBefore(_dragSrc, item);
            const nl2 = window.MAP.getActiveLayers()[k];
            if (!nl2?.classification?.colorMap) return;
            const newOrder = [...itemsEl.querySelectorAll('.adv-cat-item')].map(i => i.dataset.val);
            const oldMap   = nl2.classification.colorMap;
            const oldStyle = nl2.classification.styleMap || {};
            const newMap   = {};
            const newStyle = {};
            newOrder.forEach(v => {
              if (oldMap[v] !== undefined) newMap[v] = oldMap[v];
              if (oldStyle[v] !== undefined) newStyle[v] = oldStyle[v];
            });
            nl2.classification.colorMap  = newMap;
            nl2.classification.styleMap  = newStyle;
            window.MAP.applyClassificationFromData(k, nl2.classification);
          });
        });
      }
    }

    function renameCatValue(oldVal, newVal) {
      const nl = window.MAP.getActiveLayers()[k];
      const cl = nl?.classification;
      if (!cl?.colorMap) return;
      if (cl.colorMap.hasOwnProperty(newVal)) return;
      const color = cl.colorMap[oldVal];
      const style = cl.styleMap?.[oldVal];
      delete cl.colorMap[oldVal];
      cl.colorMap[newVal] = color;
      if (style) {
        if (!cl.styleMap) cl.styleMap = {};
        delete cl.styleMap[oldVal];
        cl.styleMap[newVal] = style;
      }
      if (cl.field && nl.geojson) {
        nl.geojson.features.forEach(f => {
          if (f.properties?.[cl.field] === oldVal) f.properties[cl.field] = newVal;
        });
      }
      window.MAP.applyClassificationFromData(k, cl);
      buildCatItemsAdv();
    }

    function buildDetailHTML(geom, s, val) {
      let rows = '';
      if (geom === 'point') {
        rows += leaRow('Color del borde',   colorPickerHTML('color',     toHex(s.color)));
        rows += leaRow('Color del relleno', colorPickerHTML('fillColor', toHex(s.fillColor || s.color)));
      } else if (geom === 'polygon') {
        rows += leaRow('Color del borde',   colorPickerHTML('color',     toHex(s.color)));
        rows += leaRow('Color del relleno', colorPickerHTML('fillColor', toHex(s.fillColor || s.color)));
      } else {
        rows += leaRow('Color', colorPickerHTML('color', toHex(s.color)));
        const dashId = `adv-detail-dash-${val}`.replace(/[^a-zA-Z0-9_-]/g, '_');
        rows += leaRow('Patrón de línea', buildDashSelect(s.dashArray || 'none', dashId));
      }
      return rows;
    }

    function wireDetailControls(detail, val, initStyle) {
      if (detail.dataset.wired) return;
      detail.dataset.wired = '1';

      detail.querySelectorAll('.lea-color-pick').forEach(pick => {
        pick.addEventListener('input', e => {
          const prop = e.target.dataset.prop;
          e.target.closest('label').style.background = e.target.value;
          const hex = detail.querySelector(`.lea-hex-input[data-prop="${prop}"]`);
          if (hex) hex.value = e.target.value.toUpperCase();
          deselectRamp();
          updateCatValStyle(val, { [prop]: e.target.value });
        });
      });
      detail.querySelectorAll('.lea-hex-input').forEach(inp => {
        inp.addEventListener('change', e => {
          let v = e.target.value.trim();
          if (!v.startsWith('#')) v = '#' + v;
          v = v.slice(0, 7).toUpperCase();
          if (/^#[0-9a-fA-F]{6}$/.test(v)) {
            e.target.value = v;
            const prop = e.target.dataset.prop;
            const pick = detail.querySelector(`.lea-color-pick[data-prop="${prop}"]`);
            if (pick) { pick.value = v; pick.closest('label').style.background = v; }
            deselectRamp();
            updateCatValStyle(val, { [prop]: v });
          }
        });
      });

      const dashId = `adv-detail-dash-${val}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      wireCsel(detail, dashId, dashVal => {
        updateCatValStyle(val, { dashArray: dashVal === 'none' ? null : dashVal });
      });
    }

    function updateCatColor(val, color) {
      const nl = window.MAP.getActiveLayers()[k];
      if (!nl?.classification) return;
      nl.classification.colorMap[val] = color;
      if (!nl.classification.styleMap) nl.classification.styleMap = {};
      nl.classification.styleMap[val] = { ...(nl.classification.styleMap[val] || nl.style || {}), fillColor: color, color };
      window.MAP.applyClassificationFromData(k, nl.classification);
    }

    function updateCatValStyle(val, changes) {
      const nl = window.MAP.getActiveLayers()[k];
      if (!nl?.classification) return;
      if (!nl.classification.styleMap) nl.classification.styleMap = {};
      nl.classification.styleMap[val] = { ...(nl.classification.styleMap[val] || nl.style || {}), ...changes };
      if (changes.fillColor) nl.classification.colorMap[val] = changes.fillColor;
      if (changes.color && !changes.fillColor) nl.classification.colorMap[val] = changes.color;
      window.MAP.applyClassificationFromData(k, nl.classification);
    }

    // ── Render de modos ───────────────────────────────────────────

    function renderAdvMode(mode) {
      curMode = mode;
      bodyEl.innerHTML = '';

      if (mode === 'single') {
        const note = document.createElement('p');
        note.className   = 'adv-body-note';
        note.textContent = 'El estilo simple se edita directamente en el panel de capas.';
        bodyEl.appendChild(note);
        return;
      }

      if (mode === 'categorized') {
        if (!allFields.length) {
          const note = document.createElement('p');
          note.className   = 'adv-body-note';
          note.textContent = 'Esta capa no tiene campos clasificables.';
          bodyEl.appendChild(note);
          return;
        }
        const MAX_UNIQUE = 15;

        const fieldRow   = document.createElement('div');
        fieldRow.className = 'adv-body-row';
        const fieldLabel = document.createElement('span');
        fieldLabel.className   = 'adv-body-label';
        fieldLabel.textContent = 'Campo';
        const fieldOpts = allFields.map(a => {
          const vals = [...new Set(
            (l.geojson?.features || []).map(f => f.properties?.[a.campo]).filter(v => v != null)
          )];
          return { value: a.campo, label: a.campo, disabled: vals.length > MAX_UNIQUE };
        });
        let curField = initField || (fieldOpts.find(o => !o.disabled)?.value || '');
        const fieldCsel = buildFieldCsel(fieldOpts, curField, val => { curField = val; applyPreview(); });
        fieldCsel.classList.add('adv-field');
        fieldRow.appendChild(fieldLabel);
        fieldRow.appendChild(fieldCsel);
        bodyEl.appendChild(fieldRow);

        buildGlobalControls(bodyEl, geom);

        const rampRow   = document.createElement('div');
        rampRow.className = 'adv-body-row';
        const rampLabel = document.createElement('span');
        rampLabel.className   = 'adv-body-label';
        rampLabel.textContent = 'Rampa de color';
        const catPalKeys = Object.keys(window.CAT_PALETTES);
        const rampCsel   = buildRampCsel(catPalKeys, selPalette, () => applyPreview());
        rampRow.appendChild(rampLabel);
        rampRow.appendChild(rampCsel);
        bodyEl.appendChild(rampRow);

        const itemsWrap = document.createElement('div');
        itemsWrap.className = 'adv-cat-items';
        bodyEl.appendChild(itemsWrap);

        applyPreview();
        return;
      }

      if (mode === 'graduated') {
        if (!numericFields.length) {
          const note = document.createElement('p');
          note.className   = 'adv-body-note';
          note.textContent = 'Esta capa no tiene campos numéricos.';
          bodyEl.appendChild(note);
          return;
        }

        const fieldRow   = document.createElement('div');
        fieldRow.className = 'adv-body-row';
        const fieldLabel = document.createElement('span');
        fieldLabel.className   = 'adv-body-label';
        fieldLabel.textContent = 'Campo';
        const fieldOpts  = numericFields.map(a => ({ value: a.campo, label: a.campo }));
        let curField     = initField || fieldOpts[0]?.value || '';
        const fieldCsel  = buildFieldCsel(fieldOpts, curField, val => { curField = val; applyPreview(); });
        fieldCsel.classList.add('adv-field');
        fieldRow.appendChild(fieldLabel);
        fieldRow.appendChild(fieldCsel);
        bodyEl.appendChild(fieldRow);

        const methodRow   = document.createElement('div');
        methodRow.className = 'adv-body-row';
        const methodLabel = document.createElement('span');
        methodLabel.className   = 'adv-body-label';
        methodLabel.textContent = 'Método';
        const methodOpts  = [{ v: 'jenks', l: 'Natural Breaks' }, { v: 'equal', l: 'Intervalos iguales' }, { v: 'quantile', l: 'Cuantiles' }];
        let curMethod     = initMethod;
        const methodCsel  = buildFieldCsel(
          methodOpts.map(m => ({ value: m.v, label: m.l })),
          curMethod, val => { curMethod = val; applyPreview(); }
        );
        methodCsel.classList.add('adv-method');
        methodRow.appendChild(methodLabel);
        methodRow.appendChild(methodCsel);
        bodyEl.appendChild(methodRow);

        const classesRow = document.createElement('div');
        classesRow.className = 'adv-body-row';
        classesRow.innerHTML = `<span class="adv-body-label">Clases</span>
          <div class="lea-slider-wrap"><input class="lea-range-input adv-classes" type="range" min="3" max="8" step="1" value="${initClasses}" /><span class="lea-val">${initClasses}</span></div>`;
        bodyEl.appendChild(classesRow);

        buildGlobalControls(bodyEl, geom);

        const rampRow   = document.createElement('div');
        rampRow.className = 'adv-body-row';
        const rampLabel = document.createElement('span');
        rampLabel.className   = 'adv-body-label';
        rampLabel.textContent = 'Rampa de color';
        const seqPalKeys = Object.keys(window.SEQ_PALETTES);
        const rampCsel   = buildRampCsel(seqPalKeys, selPalette, () => applyPreview());
        rampRow.appendChild(rampLabel);
        rampRow.appendChild(rampCsel);
        bodyEl.appendChild(rampRow);

        const itemsWrap = document.createElement('div');
        itemsWrap.className = 'adv-grad-items';
        bodyEl.appendChild(itemsWrap);

        const classesInp = bodyEl.querySelector('.adv-classes');
        if (classesInp) wireSliderTouch(classesInp);
        bodyEl.querySelector('.adv-classes')?.addEventListener('input', e => {
          const valEl = e.target.closest('.lea-slider-wrap')?.querySelector('.lea-val');
          if (valEl) valEl.textContent = e.target.value;
          applyPreview();
        });
        applyPreview();
      }
    }

    // ── Pills (selector de modo) ──────────────────────────────────

    modal.querySelectorAll('.adv-pill:not([disabled])').forEach(pill => {
      pill.addEventListener('click', () => {
        modal.querySelectorAll('.adv-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        selPalette = initPalette;
        renderAdvMode(pill.dataset.mode);
      });
    });

    // ── Footer: cancelar / aceptar / limpiar ──────────────────────

    function closeModal() { backdrop.remove(); modal.remove(); }

    function cancelModal() {
      if (_savedClassification) {
        window.MAP.applyClassificationFromData(k, _savedClassification);
        window.LP_PANEL.persistClassification(k, _savedClassification);
      } else {
        window.MAP.clearClassification(k);
        window.LP_PANEL.persistClassification(k, null);
      }
      closeModal();
    }

    function acceptModal() {
      const nl = window.MAP.getActiveLayers()[k];
      window.LP_PANEL.persistClassification(k, nl?.classification || null);
      closeModal();
    }

    modal.querySelector('#adv-close-btn').addEventListener('click', cancelModal);
    modal.querySelector('#adv-cancel-btn').addEventListener('click', cancelModal);
    modal.querySelector('#adv-accept-btn').addEventListener('click', acceptModal);
    modal.querySelector('#adv-clear-btn')?.addEventListener('click', () => {
      window.MAP.clearClassification(k);
      window.LP_PANEL.persistClassification(k, null);
      closeModal();
    });
    backdrop.addEventListener('click', cancelModal);

    renderAdvMode(initMode);
  }

  return { openAdvancedModal };

})();

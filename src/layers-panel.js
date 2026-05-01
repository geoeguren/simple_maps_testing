/**
 * layers-panel.js — Dropdown de capas: mapa base, estilos, etiquetas, drag & drop
 *
 * Depende de: window.MAP, window.LAYERS, window.TOAST, window.AUTH,
 *             window.CHAT, window.FB, window.SIDEBAR
 */

window.LAYERS_PANEL = (() => {

  let _layersOnOutside = null;

  // ── Helpers ───────────────────────────────────────────────────

  // Escapar HTML para prevenir XSS en templates con innerHTML
  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function geomSVG(l) {
    const geom        = l.geomType || 'polygon';
    const s           = l.style || {};
    const fill        = s.fillColor  || s.color   || '#888';
    const fillOpacity = s.fillOpacity ?? (geom === 'polygon' ? 0.3 : 0.85);
    const stroke      = s.color      || fill;
    const weight      = Math.min(s.weight ?? 1.5, 3);
    const opacity     = s.opacity    ?? 1;

    if (geom === 'line') {
      return `<svg class="layer-geom-svg" viewBox="0 0 14 14" width="14" height="14">
        <line x1="1" y1="7" x2="13" y2="7"
          stroke="${stroke}" stroke-width="${weight * 1.5}"
          stroke-opacity="${opacity}" stroke-linecap="round"/>
      </svg>`;
    }
    if (geom === 'point') {
      return `<svg class="layer-geom-svg" viewBox="0 0 14 14" width="14" height="14">
        <circle cx="7" cy="7" r="5"
          fill="${fill}" fill-opacity="${fillOpacity}"
          stroke="${stroke}" stroke-width="${weight}"
          stroke-opacity="${opacity}"/>
      </svg>`;
    }
    return `<svg class="layer-geom-svg" viewBox="0 0 14 14" width="14" height="14">
      <rect x="1" y="1" width="12" height="12" rx="2"
        fill="${fill}" fill-opacity="${fillOpacity}"
        stroke="${stroke}" stroke-width="${weight}"
        stroke-opacity="${opacity}"/>
    </svg>`;
  }

  function leaRow(label, control, extraClass = '') {
    return `<div class="lea-row ${extraClass}"><span class="lea-label">${label}</span><div class="lea-control">${control}</div></div>`;
  }

  function toHex(c) {
    if (!c) return '#888888';
    if (c.startsWith('#')) return c.slice(0, 7);
    const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return '#888888';
    return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
  }

  // ── Acordeón de edición ───────────────────────────────────────

  let _activeEditKey = null;

  function closeEditAccordion(sec) {
    const open = sec?.querySelector('.layer-edit-accordion');
    if (open) open.remove();
    const btn = sec?.querySelector(`.layer-edit-btn[data-key="${_activeEditKey}"]`);
    if (btn) btn.classList.remove('active');
    _activeEditKey = null;
  }

  // Paletas de color — definidas en palettes.js (window.PALETTES / window.PALETTE_LABELS)

  function paletteSwatchesHTML(name) {
    const colors = window.window.PALETTES[name] || [];
    return colors.slice(0, 8).map(c =>
      `<span class="lea-pal-dot" style="background:${c}"></span>`
    ).join('');
  }

  function buildPaletteOptions(keys, curPalette) {
    return keys.map(p => `<option value="${p}" ${curPalette===p?'selected':''}>${window.PALETTE_LABELS[p]}</option>`).join('');
  }

  function styleControlsHTML(geom, s, mapKey, prefix = '') {
    const toH = toHex;
    let rows = '';
    const p = prefix ? `data-prefix="${prefix}"` : '';
    if (geom === 'point') {
      const radius = s.radius ?? 5;
      rows += leaRow('Tamaño', `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="radius" ${p} type="range" min="1" max="25" step="0.5" value="${radius}" /><span class="lea-val">${radius}</span></div>`);
    }
    if (geom === 'line') {
      const w = s.weight ?? 2;
      const dash = s.dashArray || 'none';
      rows += leaRow('Grosor', `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="weight" ${p} type="range" min="0" max="10" step="0.5" value="${w}" /><span class="lea-val">${w}</span></div>`);
      rows += leaRow('Color', colorPickerHTML('color', toH(s.color), p));
      rows += leaRow('Opacidad', `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="opacity" ${p} type="range" min="0" max="1" step="0.05" value="${s.opacity ?? 1}" /><span class="lea-val">${Math.round((s.opacity ?? 1)*100)}%</span></div>`);
      if (mapKey) rows += leaRow('Patrón', buildDashSelect(dash, `lea-dash-${mapKey}`));
    }
    if (geom === 'point' || geom === 'polygon') {
      const w  = s.weight ?? 1.5;
      const fo = s.fillOpacity ?? 0.5;
      rows += leaRow('Grosor borde', `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="weight" ${p} type="range" min="0" max="10" step="0.5" value="${w}" /><span class="lea-val">${w}</span></div>`);
      rows += leaRow('Borde',   colorPickerHTML('color',     toH(s.color), p));
      rows += leaRow('Relleno', colorPickerHTML('fillColor', toH(s.fillColor || s.color), p));
      const foVal = Math.round(fo * 100);
      rows += leaRow('Opacidad', `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="fillOpacity" ${p} type="range" min="0" max="1" step="0.05" value="${fo}" /><span class="lea-val">${foVal}%</span></div>`);
    }
    return rows;
  }

  function colorPickerHTML(prop, hexVal, extraAttrs = '') {
    return `<div class="lea-color-row"><label class="lea-color-swatch" style="background:${hexVal}"><input class="lea-color-pick" data-prop="${prop}" ${extraAttrs} type="color" value="${hexVal}" /></label><input class="lea-hex-input" data-prop="${prop}" ${extraAttrs} type="text" maxlength="7" value="${hexVal}" /></div>`;
  }

  // ── Selectores custom ────────────────────────────────────────

  function buildPaletteSelect(keys, curPalette, id) {
    const dots = (name) => window.PALETTES[name].slice(0,8).map(c =>
      `<span class="lea-pal-dot" style="background:${c}"></span>`
    ).join('');

    const options = keys.map(p => `
      <div class="lea-csel-option ${p===curPalette?'selected':''}" data-value="${p}">
        <div class="lea-csel-dots">${dots(p)}</div>
      </div>`).join('');

    return `<div class="lea-csel" id="${id}" data-value="${curPalette}">
      <div class="lea-csel-trigger">
        <div class="lea-csel-dots" id="${id}-preview">${dots(curPalette)}</div>
        <span class="lea-csel-arrow">▾</span>
      </div>
      <div class="lea-csel-dropdown hidden">${options}</div>
    </div>`;
  }

  function buildDashSelect(curDash, id) {
    const DASH_DEFS = [
      {v:'none',    label:'Continua',     dasharray:''},
      {v:'8,5',     label:'Guiones',      dasharray:'8,5'},
      {v:'2,5',     label:'Puntos',       dasharray:'2,5'},
      {v:'8,5,2,5', label:'Guión-Punto',  dasharray:'8,5,2,5'},
    ];

    const svgLine = (da) => `<svg viewBox="0 0 56 14" width="56" height="14">
      <line x1="2" y1="7" x2="54" y2="7" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" ${da ? `stroke-dasharray="${da}"` : ''}/>
    </svg>`;

    const options = DASH_DEFS.map(d => `
      <div class="lea-csel-option ${d.v===curDash?'selected':''}" data-value="${d.v}">
        <div class="lea-csel-dash-preview">${svgLine(d.dasharray)}</div>
      </div>`).join('');

    const cur = DASH_DEFS.find(d => d.v === curDash) || DASH_DEFS[0];

    return `<div class="lea-csel lea-dash-csel" id="${id}" data-value="${curDash}">
      <div class="lea-csel-trigger">
        <div class="lea-csel-dash-preview">${svgLine(cur.dasharray)}</div>
        <span class="lea-csel-arrow">▾</span>
      </div>
      <div class="lea-csel-dropdown hidden">${options}</div>
    </div>`;
  }

  function wireCsel(container, id, onChange) {
    const el = container.querySelector ? container.querySelector(`#${id}`) : document.getElementById(id);
    if (!el) return;
    const trigger  = el.querySelector('.lea-csel-trigger');
    const dropdown = el.querySelector('.lea-csel-dropdown');

    trigger.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = !dropdown.classList.contains('hidden');
      // Cerrar todos los dropdowns abiertos en el acordeón
      el.closest('.layer-edit-accordion')?.querySelectorAll('.lea-csel-dropdown').forEach(d => {
        d.classList.add('hidden');
        d.closest('.lea-csel')?.querySelector('.lea-csel-arrow')?.classList.remove('open');
      });
      if (!isOpen) {
        dropdown.classList.remove('hidden');
        el.querySelector('.lea-csel-arrow').classList.add('open');
      }
    });

    dropdown.querySelectorAll('.lea-csel-option').forEach(opt => {
      opt.addEventListener('click', e => {
        e.stopPropagation();
        const val = opt.dataset.value;
        el.dataset.value = val;
        dropdown.querySelectorAll('.lea-csel-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        dropdown.classList.add('hidden');
        el.querySelector('.lea-csel-arrow').classList.remove('open');

        // Actualizar preview del trigger
        const isPalette = !el.classList.contains('lea-dash-csel');
        if (isPalette) {
          const preview = el.querySelector('#' + id + '-preview');
          if (preview) preview.innerHTML = window.PALETTES[val].slice(0,8)
            .map(c => `<span class="lea-pal-dot" style="background:${c}"></span>`).join('');
        } else {
          const preview = el.querySelector('.lea-csel-trigger .lea-csel-dash-preview');
          if (preview) preview.innerHTML = opt.querySelector('.lea-csel-dash-preview').innerHTML;
        }
        onChange(val);
      });
    });

    // Cerrar al click afuera
    document.addEventListener('click', function handler(e) {
      if (!el.contains(e.target)) {
        dropdown.classList.add('hidden');
        el.querySelector('.lea-csel-arrow')?.classList.remove('open');
      }
    }, { passive: true });
  }

  function getCselValue(container, id) {
    const el = container.querySelector ? container.querySelector(`#${id}`) : document.getElementById(id);
    return el?.dataset.value || '';
  }

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
    acc.className = 'layer-edit-accordion';
    acc.dataset.key = k;

    acc.innerHTML =
      `<div class="lea-mode-content" id="lea-content-${k}"></div>` +
      `<div class="lea-sep"></div>` +
      `<button class="lea-advanced-btn" data-key="${k}">Edición avanzada</button>` +
      `<div class="lea-sep"></div>` +
      `<button class="lea-delete-btn" data-key="${k}"><span class="material-icons">delete</span>Eliminar capa</button>`;

    const row = sec.querySelector(`.layers-data-row[data-key="${k}"]`);
    row?.insertAdjacentElement('afterend', acc);

    const contentEl = acc.querySelector(`#lea-content-${k}`);

    // Render modo simple directamente
    contentEl.innerHTML = styleControlsHTML(geom, s, k);
    wireStyleControls(contentEl, k, geom, sec);
    if (geom === 'line') wireCsel(contentEl, `lea-dash-${k}`, () => applySimpleStyle(k, contentEl, sec));

    // Botón edición avanzada → modal
    acc.querySelector('.lea-advanced-btn').addEventListener('click', () => {
      openAdvancedModal(k, sec);
    });

    // ── Wire controles simple ─────────────────────────────────

    function wireStyleControls(container, mapKey, geom, sec) {
      container.querySelectorAll('.lea-range-input').forEach(inp => {
        inp.addEventListener('input', e => {
          const val   = parseFloat(e.target.value);
          const prop  = e.target.dataset.prop;
          const valEl = e.target.closest('.lea-slider-wrap')?.querySelector('.lea-val');
          if (valEl) valEl.textContent = prop === 'fillOpacity' ? Math.round(val*100)+'%' : val;
          applySimpleStyle(mapKey, container, sec);
        });
      });
      container.querySelectorAll('.lea-dash-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          container.querySelectorAll('.lea-dash-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          applySimpleStyle(mapKey, container, sec);
        });
      });
      container.querySelectorAll('.lea-color-pick').forEach(pick => {
        pick.addEventListener('input', e => {
          const val  = e.target.value;
          const prop = e.target.dataset.prop;
          e.target.closest('label').style.background = val;
          const hex = container.querySelector(`.lea-hex-input[data-prop="${prop}"]`);
          if (hex) hex.value = val.toUpperCase();
          applySimpleStyle(mapKey, container, sec);
        });
      });
      container.querySelectorAll('.lea-hex-input').forEach(inp => {
        inp.addEventListener('input', e => {
          const val = e.target.value.trim();
          if (/^#[0-9a-fA-F]{6}$/.test(val)) {
            const prop = e.target.dataset.prop;
            const swatch = container.querySelector(`.lea-color-pick[data-prop="${prop}"]`)?.closest('label');
            const pick   = container.querySelector(`.lea-color-pick[data-prop="${prop}"]`);
            if (swatch) swatch.style.background = val;
            if (pick)   pick.value = val;
            applySimpleStyle(mapKey, container, sec);
          }
        });
        inp.addEventListener('change', e => {
          let val = e.target.value.trim();
          if (!val.startsWith('#')) val = '#' + val;
          val = val.slice(0,7).toUpperCase();
          if (/^#[0-9a-fA-F]{6}$/.test(val)) {
            e.target.value = val;
            const prop   = e.target.dataset.prop;
            const swatch = container.querySelector(`.lea-color-pick[data-prop="${prop}"]`)?.closest('label');
            const pick   = container.querySelector(`.lea-color-pick[data-prop="${prop}"]`);
            if (swatch) swatch.style.background = val;
            if (pick)   pick.value = val;
            applySimpleStyle(mapKey, container, sec);
          }
        });
      });
    }

    function applySimpleStyle(mapKey, container, sec) {
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
      const activeDash = container.querySelector('.lea-dash-btn.active');
      if (activeDash) {
        const dv = activeDash.dataset.dash;
        ns.dashArray = dv === 'none' ? null : dv;
      }
      const dashCsel = getCselValue(container, `lea-dash-${k}`);
      if (dashCsel) ns.dashArray = dashCsel === 'none' ? null : dashCsel;
      window.MAP.updateLayerStyle(mapKey, ns);
      nl.style = ns;
      persistStyle(mapKey, ns);
      const rowEl = sec.querySelector(`.layers-data-row[data-key="${mapKey}"]`);
      const svg = rowEl?.querySelector('.layer-geom-svg');
      if (svg) {
        const tmp = document.createElement('div');
        tmp.innerHTML = geomSVG({ ...nl, style: ns });
        const newSvg = tmp.firstChild;
        if (newSvg) svg.replaceWith(newSvg);
      }
      window.MAP.updateLegend();
    }

    // ── Wire controles clasificados ───────────────────────────

    function buildCatItems(container, mapKey, geom, mode) {
      const nl = window.MAP.getActiveLayers()[mapKey];
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
        item.className = 'lea-cat-item';
        item.dataset.val = val;

        // Controls según geomType
        let extraControls = '';
        if (geom === 'point') {
          const radius = s.radius ?? 5;
          const fo     = s.fillOpacity ?? 0.85;
          extraControls += `
            <div class="lea-cat-controls">
              <div class="lea-cat-ctrl-row">${leaRow('Tamaño', `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="radius" type="range" min="1" max="25" step="0.5" value="${radius}" /><span class="lea-val">${radius}</span></div>`)}</div>
              <div class="lea-cat-ctrl-row">${leaRow('Borde', colorPickerHTML('color', toHex(s.color)))}</div>
              <div class="lea-cat-ctrl-row">${leaRow('Grosor borde', `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="weight" type="range" min="0" max="10" step="0.5" value="${s.weight ?? 1.5}" /><span class="lea-val">${s.weight ?? 1.5}</span></div>`)}</div>
              <div class="lea-cat-ctrl-row">${leaRow('Opacidad', `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="fillOpacity" type="range" min="0" max="1" step="0.05" value="${fo}" /><span class="lea-val">${Math.round(fo*100)}%</span></div>`)}</div>
            </div>`;
        } else if (geom === 'polygon') {
          const fo = s.fillOpacity ?? 0.5;
          extraControls += `
            <div class="lea-cat-controls">
              <div class="lea-cat-ctrl-row">${leaRow('Borde', colorPickerHTML('color', toHex(s.color)))}</div>
              <div class="lea-cat-ctrl-row">${leaRow('Grosor borde', `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="weight" type="range" min="0" max="10" step="0.5" value="${s.weight ?? 1.5}" /><span class="lea-val">${s.weight ?? 1.5}</span></div>`)}</div>
              <div class="lea-cat-ctrl-row">${leaRow('Opacidad', `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="fillOpacity" type="range" min="0" max="1" step="0.05" value="${fo}" /><span class="lea-val">${Math.round(fo*100)}%</span></div>`)}</div>
            </div>`;
        } else if (geom === 'line') {
          const fo   = s.opacity ?? 1;
          const dash = s.dashArray || 'none';
          const dashId = `lea-dash-${mapKey}-${val}`.replace(/[^a-zA-Z0-9_-]/g, '_');
          extraControls += `
            <div class="lea-cat-controls">
              <div class="lea-cat-ctrl-row">${leaRow('Grosor', `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="weight" type="range" min="0" max="10" step="0.5" value="${s.weight ?? 2}" /><span class="lea-val">${s.weight ?? 2}</span></div>`)}</div>
              <div class="lea-cat-ctrl-row">${leaRow('Opacidad', `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="opacity" type="range" min="0" max="1" step="0.05" value="${fo}" /><span class="lea-val">${Math.round(fo*100)}%</span></div>`)}</div>
              <div class="lea-cat-ctrl-row">${leaRow('Patrón', buildDashSelect(dash, dashId))}</div>
            </div>`;
        }

        item.innerHTML = `
          <div class="lea-cat-item-header">
            <label class="lea-color-swatch lea-cat-swatch" style="background:${color}">
              <input class="lea-color-pick lea-cat-pick" type="color" value="${color}" data-val="${val}" />
            </label>
            <span class="lea-cat-label">${val}</span>
            <button class="lea-cat-toggle" data-val="${val}" title="Editar estilo"><span class="material-icons" style="font-size:14px;pointer-events:none">tune</span></button>
            <button class="lea-cat-remove" data-val="${val}" title="Eliminar">✕</button>
          </div>
          <div class="lea-cat-detail hidden">${extraControls}</div>`;

        itemsEl.appendChild(item);

        // Toggle detalle — solo uno abierto a la vez
        item.querySelector('.lea-cat-toggle').addEventListener('click', () => {
          const detail    = item.querySelector('.lea-cat-detail');
          const wasHidden = detail.classList.contains('hidden');
          // Cerrar todos
          itemsEl.querySelectorAll('.lea-cat-detail').forEach(d => d.classList.add('hidden'));
          itemsEl.querySelectorAll('.lea-cat-toggle').forEach(b => b.classList.remove('open'));
          // Abrir este si estaba cerrado
          if (wasHidden) {
            detail.classList.remove('hidden');
            item.querySelector('.lea-cat-toggle').classList.add('open');
            wireItemControls(item, val);
          }
        });

        // Color del swatch (relleno) — siempre visible
        item.querySelector('.lea-cat-pick').addEventListener('input', e => {
          const newColor = e.target.value;
          e.target.closest('label').style.background = newColor;
          updateValStyle(val, { fillColor: newColor, color: newColor });
        });

        function wireItemControls(item, val) {
          // Evitar doble-wireo
          if (item.dataset.wired) return;
          item.dataset.wired = '1';

          // Wire dash selector si existe (líneas)
          const dashId = `lea-dash-${mapKey}-${val}`.replace(/[^a-zA-Z0-9_-]/g, '_');
          wireCsel(item, dashId, (dashVal) => {
            updateValStyle(val, { dashArray: dashVal === 'none' ? null : dashVal });
          });

        // Controles de estilo por valor
        item.querySelectorAll('.lea-range-input').forEach(inp => {
          inp.addEventListener('input', e => {
            const prop  = e.target.dataset.prop;
            const v     = parseFloat(e.target.value);
            const valEl = e.target.closest('.lea-slider-wrap')?.querySelector('.lea-val');
            if (valEl) valEl.textContent = (prop === 'fillOpacity' || prop === 'opacity') ? Math.round(v*100)+'%' : v;
            updateValStyle(val, { [prop]: v });
          });
        });
        item.querySelectorAll('.lea-color-pick:not(.lea-cat-pick)').forEach(pick => {
          pick.addEventListener('input', e => {
            const prop = e.target.dataset.prop;
            e.target.closest('label').style.background = e.target.value;
            const hex = item.querySelector(`.lea-hex-input[data-prop="${prop}"]`);
            if (hex) hex.value = e.target.value.toUpperCase();
            updateValStyle(val, { [prop]: e.target.value });
          });
        });
        item.querySelectorAll('.lea-hex-input').forEach(inp => {
          inp.addEventListener('change', e => {
            let v = e.target.value.trim();
            if (!v.startsWith('#')) v = '#' + v;
            v = v.slice(0,7).toUpperCase();
            if (/^#[0-9a-fA-F]{6}$/.test(v)) {
              e.target.value = v;
              const prop   = e.target.dataset.prop;
              const swatch = item.querySelector(`.lea-color-pick[data-prop="${prop}"]`)?.closest('label');
              const pick   = item.querySelector(`.lea-color-pick[data-prop="${prop}"]`);
              if (swatch) swatch.style.background = v;
              if (pick)   pick.value = v;
              updateValStyle(val, { [prop]: v });
            }
          });
        });
        } // end wireItemControls

        // Eliminar valor
        item.querySelector('.lea-cat-remove').addEventListener('click', () => {
          if (nl.classification?.colorMap) {
            delete nl.classification.colorMap[val];
            if (nl.classification.styleMap) delete nl.classification.styleMap[val];
            window.MAP.applyClassificationFromData(mapKey, nl.classification);
            persistClassification(mapKey, nl.classification);
            buildCatItems(container, mapKey, geom, mode);
          }
        });

        function updateValStyle(v, changes) {
          if (!nl.classification) return;
          if (!nl.classification.styleMap) nl.classification.styleMap = {};
          nl.classification.styleMap[v] = { ...(nl.classification.styleMap[v] || nl.style || {}), ...changes };
          if (changes.fillColor) nl.classification.colorMap[v] = changes.fillColor;
          window.MAP.applyClassificationFromData(mapKey, nl.classification);
          persistClassification(mapKey, nl.classification);
        }
      });
    }

    function wireClassifiedControls(container, mapKey, geom, sec, mode, isModal = false) {
      const palId = isModal ? `adv-pal-${k}` : `lea-pal-${k}`;
      function applyClassification() {
        const field   = container.querySelector('.lea-field-select')?.value;
        const palette = getCselValue(container, palId) || 'qualitative';
        const method  = container.querySelector('.lea-method-select')?.value  || 'jenks';
        const classes = parseInt(container.querySelector('.lea-classes-input')?.value || 5);
        if (!field) return;
        window.MAP.applyClassification(mapKey, { type: mode, field, palette, method, classes,
          paletteColors: window.PALETTES[palette] });
        const nl = window.MAP.getActiveLayers()[mapKey];
        persistClassification(mapKey, nl?.classification);
        buildCatItems(container, mapKey, geom, mode);
      }

      container.querySelector('.lea-field-select')?.addEventListener('change', applyClassification);
      // palette change handled by wireCsel
      container.querySelector('.lea-method-select')?.addEventListener('change', applyClassification);
      container.querySelector('.lea-classes-input')?.addEventListener('input', e => {
        const valEl = e.target.closest('.lea-slider-wrap')?.querySelector('.lea-val');
        if (valEl) valEl.textContent = e.target.value;
        applyClassification();
      });

      // Trigger inicial si ya hay campo seleccionado
      if (container.querySelector('.lea-field-select')?.value) applyClassification();
    }

    // ── Eliminar capa ─────────────────────────────────────────
    acc.querySelector('.lea-delete-btn')?.addEventListener('click', () => {
      window.MAP.removeLayer(k);
      window.MAP.updateLegend();
      closeEditAccordion(sec);
      const row = sec.querySelector(`.layers-data-row[data-key="${k}"]`);
      row?.remove();
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

  // ── Modal de edición avanzada (categorizado / graduado) ──────────

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

    const initMode    = l.classification?.type || 'single';
    const initField   = l.classification?.field || (allFields[0]?.campo || '');
    const initPalette = l.classification?.palette || null;
    const initMethod  = l.classification?.method || 'jenks';
    const initClasses = l.classification?.classes || 5;
    const _savedClassification = l.classification ? JSON.parse(JSON.stringify(l.classification)) : null;

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.id = 'adv-modal-backdrop';
    backdrop.className = 'adv-modal-backdrop';
    document.body.appendChild(backdrop);

    // Modal shell
    const modal = document.createElement('div');
    modal.id = 'adv-modal';
    modal.className = 'adv-modal';

    const modes = [
      { mode: 'single',      label: 'Símbolo único' },
      { mode: 'categorized', label: 'Categorizado' },
      { mode: 'graduated',   label: 'Graduado' },
      { mode: 'heatmap',     label: 'Mapa de calor', disabled: true },
    ];
    const pills = modes.map(b =>
      `<button class="adv-pill ${b.mode===initMode?'active':''}" data-mode="${b.mode}"
               ${b.disabled?'disabled title="Próximamente"':''}>${b.label}</button>`
    ).join('');

    modal.innerHTML = `
      <div class="adv-modal-header">
        <span class="adv-modal-title">Edición avanzada — ${esc(l.titulo || k)}</span>
        <button class="adv-modal-close" id="adv-close-btn"><span class="material-icons">close</span></button>
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

    const bodyEl  = modal.querySelector('#adv-modal-body');
    let   curMode = initMode;
    let   selPalette = initPalette;

    // ── Selector de rampa (lea-csel style) ───────────────────────

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
            <div class="adv-ramp-option ${pk===cur?'selected':''}" data-pal="${pk}">
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

      // Close on outside click
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

    // ── Selector de campo/opción genérico (mismo estilo que buildRampCsel) ──
    // options: [{value, label, disabled}]
    // onChange(value) se llama cuando el usuario elige una opción
    function buildFieldCsel(options, currentValue, onChange) {
      const wrap = document.createElement('div');
      wrap.className = 'adv-ramp-csel adv-field-csel';

      const curOpt = options.find(o => o.value === currentValue) || options.find(o => !o.disabled) || options[0];
      const curLabel = curOpt?.label || curOpt?.value || '';

      wrap.innerHTML = `
        <div class="adv-ramp-trigger adv-field-trigger">
          <span class="adv-field-selected">${curLabel}</span>
          <span class="adv-ramp-arrow">▾</span>
        </div>
        <div class="adv-ramp-dropdown hidden adv-field-dropdown">
          ${options.map(o => `
            <div class="adv-ramp-option adv-field-option ${o.value===currentValue?'selected':''} ${o.disabled?'adv-field-disabled':''}"
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
        // Cerrar otros dropdowns abiertos
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

    // ── Render de modos ──────────────────────────────────────────

    function renderAdvMode(mode) {
      curMode = mode;
      bodyEl.innerHTML = '';

      if (mode === 'single') {
        const note = document.createElement('p');
        note.className = 'adv-body-note';
        note.textContent = 'El estilo simple se edita directamente en el panel de capas.';
        bodyEl.appendChild(note);
        return;
      }

      if (mode === 'categorized') {
        if (!allFields.length) {
          const note = document.createElement('p');
          note.className = 'adv-body-note';
          note.textContent = 'Esta capa no tiene campos clasificables.';
          bodyEl.appendChild(note);
          return;
        }
        const MAX_UNIQUE = 15;

        // Campo
        const fieldRow = document.createElement('div');
        fieldRow.className = 'adv-body-row';
        const fieldLabel = document.createElement('span');
        fieldLabel.className = 'adv-body-label';
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

        // Helper para leer el campo seleccionado
        const getField = () => fieldCsel.getValue();

        // Rampa
        const rampRow = document.createElement('div');
        rampRow.className = 'adv-body-row';
        const rampLabel = document.createElement('span');
        rampLabel.className = 'adv-body-label';
        rampLabel.textContent = 'Rampa de color';
        const catPalKeys = Object.keys(window.CAT_PALETTES);
        const rampCsel = buildRampCsel(catPalKeys, selPalette, () => applyPreview());
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
          note.className = 'adv-body-note';
          note.textContent = 'Esta capa no tiene campos numéricos.';
          bodyEl.appendChild(note);
          return;
        }

        // Campo
        const fieldRow = document.createElement('div');
        fieldRow.className = 'adv-body-row';
        const fieldLabel = document.createElement('span');
        fieldLabel.className = 'adv-body-label';
        fieldLabel.textContent = 'Campo';
        const fieldOpts = numericFields.map(a => ({ value: a.campo, label: a.campo }));
        let curField = initField || fieldOpts[0]?.value || '';
        const fieldCsel = buildFieldCsel(fieldOpts, curField, val => { curField = val; applyPreview(); });
        fieldCsel.classList.add('adv-field');
        fieldRow.appendChild(fieldLabel);
        fieldRow.appendChild(fieldCsel);
        bodyEl.appendChild(fieldRow);
        const getField = () => fieldCsel.getValue();

        // Método
        const methodRow = document.createElement('div');
        methodRow.className = 'adv-body-row';
        const methodLabel = document.createElement('span');
        methodLabel.className = 'adv-body-label';
        methodLabel.textContent = 'Método';
        const methodOpts = [{v:'jenks',l:'Natural Breaks'},{v:'equal',l:'Intervalos iguales'},{v:'quantile',l:'Cuantiles'}];
        let curMethod = initMethod;
        const methodCsel = buildFieldCsel(
          methodOpts.map(m => ({ value: m.v, label: m.l })),
          curMethod, val => { curMethod = val; applyPreview(); }
        );
        methodCsel.classList.add('adv-method');
        methodRow.appendChild(methodLabel);
        methodRow.appendChild(methodCsel);
        bodyEl.appendChild(methodRow);

        // Clases
        const classesRow = document.createElement('div');
        classesRow.className = 'adv-body-row';
        classesRow.innerHTML = `<span class="adv-body-label">Clases</span>
          <div class="lea-slider-wrap"><input class="lea-range-input adv-classes" type="range" min="3" max="8" step="1" value="${initClasses}" /><span class="lea-val">${initClasses}</span></div>`;
        bodyEl.appendChild(classesRow);


        // Rampa
        const rampRow = document.createElement('div');
        rampRow.className = 'adv-body-row';
        const rampLabel = document.createElement('span');
        rampLabel.className = 'adv-body-label';
        rampLabel.textContent = 'Rampa de color';
        const seqPalKeys = Object.keys(window.SEQ_PALETTES);
        const rampCsel = buildRampCsel(seqPalKeys, selPalette, () => applyPreview());
        rampRow.appendChild(rampLabel);
        rampRow.appendChild(rampCsel);
        bodyEl.appendChild(rampRow);


        const itemsWrap = document.createElement('div');
        itemsWrap.className = 'adv-grad-items';
        bodyEl.appendChild(itemsWrap);

        bodyEl.querySelector('.adv-classes')?.addEventListener('input', e => {
          const valEl = e.target.closest('.lea-slider-wrap')?.querySelector('.lea-val');
          if (valEl) valEl.textContent = e.target.value;
          applyPreview();
        });
        applyPreview();
      }
    }

    // ── Preview ──────────────────────────────────────────────────

    function applyPreview() {
      if (curMode === 'single') { window.MAP.clearClassification(k); return; }
      // getField() es definida por cada modo al construir el csel
      const fieldEl = bodyEl.querySelector('.adv-field');
      const field   = fieldEl?.getValue ? fieldEl.getValue() : (fieldEl?.value || '');
      const palette = selPalette || (curMode === 'graduated' ? 'seq_blues' : 'cat_tableau');
      const methodEl = bodyEl.querySelector('.adv-method');
      const method  = methodEl?.getValue ? methodEl.getValue() : (methodEl?.value || 'jenks');
      const classes = parseInt(bodyEl.querySelector('.adv-classes')?.value || 5);
      if (!field) return;
      window.MAP.applyClassification(k, {
        type: curMode, field, palette, method, classes,
        paletteColors: window.PALETTES[palette]
      });
      buildCatItemsAdv();
    }

    // ── Items editables ──────────────────────────────────────────

    function buildCatItemsAdv() {
      const nl      = window.MAP.getActiveLayers()[k];
      const cl      = nl?.classification;
      const itemsEl = bodyEl.querySelector('.adv-cat-items, .adv-grad-items');
      if (!itemsEl || !cl?.colorMap) return;
      itemsEl.innerHTML = '';

      Object.entries(cl.colorMap).forEach(([val, color]) => {
        const item = document.createElement('div');
        item.className = 'adv-cat-item';

        const header = document.createElement('div');
        header.className = 'adv-cat-header';

        // Swatch con color picker
        const swatch = document.createElement('label');
        swatch.className = 'adv-cat-swatch';
        swatch.style.background = color;
        const pick = document.createElement('input');
        pick.type = 'color'; pick.value = color;
        pick.addEventListener('input', e => {
          const c = e.target.value;
          swatch.style.background = c;
          deselectRamp();
          updateCatColor(val, c);
        });
        swatch.appendChild(pick);

        // Nombre editable inline
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'adv-cat-name';
        nameInput.value = val;
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

        // Botón tune
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'adv-cat-toggle';
        toggleBtn.innerHTML = '<span class="material-icons">tune</span>';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'adv-cat-toggle adv-cat-delete';
        deleteBtn.title = 'Eliminar categoría';
        deleteBtn.innerHTML = '<span class="material-icons">close</span>';
        deleteBtn.addEventListener('click', () => {
          const nl = window.MAP.getActiveLayers()[k];
          if (!nl?.classification?.colorMap) return;
          delete nl.classification.colorMap[val];
          if (nl.classification.styleMap) delete nl.classification.styleMap[val];
          window.MAP.applyClassificationFromData(k, nl.classification);
          buildCatItemsAdv();
        });

        header.appendChild(swatch);
        header.appendChild(nameInput);
        header.appendChild(deleteBtn);
        header.appendChild(toggleBtn);
        item.appendChild(header);

        // Detalle colapsable
        const detail = document.createElement('div');
        detail.className = 'adv-cat-detail hidden';
        const baseStyle = nl.style || {};
        const valStyle  = cl.styleMap?.[val] || {};
        const s         = { ...baseStyle, ...valStyle, color, fillColor: color };
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
    }

    function renameCatValue(oldVal, newVal) {
      const nl = window.MAP.getActiveLayers()[k];
      const cl = nl?.classification;
      if (!cl?.colorMap) return;
      if (cl.colorMap.hasOwnProperty(newVal)) return; // ya existe
      const color = cl.colorMap[oldVal];
      const style = cl.styleMap?.[oldVal];
      delete cl.colorMap[oldVal];
      cl.colorMap[newVal] = color;
      if (style) {
        if (!cl.styleMap) cl.styleMap = {};
        delete cl.styleMap[oldVal];
        cl.styleMap[newVal] = style;
      }
      // Remap features in geojson
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
        rows += leaRow('Tamaño', `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="radius" type="range" min="1" max="25" step="0.5" value="${s.radius??5}" /><span class="lea-val">${s.radius??5}</span></div>`);
        rows += leaRow('Borde',  colorPickerHTML('color', toHex(s.color)));
        rows += leaRow('Grosor', `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="weight" type="range" min="0" max="10" step="0.5" value="${s.weight??1.5}" /><span class="lea-val">${s.weight??1.5}</span></div>`);
        rows += leaRow('Opacidad', `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="fillOpacity" type="range" min="0" max="1" step="0.05" value="${s.fillOpacity??0.85}" /><span class="lea-val">${Math.round((s.fillOpacity??0.85)*100)}%</span></div>`);
      } else if (geom === 'polygon') {
        rows += leaRow('Relleno', colorPickerHTML('fillColor', toHex(s.fillColor)));
        rows += leaRow('Borde',   colorPickerHTML('color',     toHex(s.color)));
        rows += leaRow('Grosor',  `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="weight" type="range" min="0" max="10" step="0.5" value="${s.weight??1.5}" /><span class="lea-val">${s.weight??1.5}</span></div>`);
        rows += leaRow('Opacidad',`<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="fillOpacity" type="range" min="0" max="1" step="0.05" value="${s.fillOpacity??0.5}" /><span class="lea-val">${Math.round((s.fillOpacity??0.5)*100)}%</span></div>`);
      } else {
        rows += leaRow('Color',   colorPickerHTML('color', toHex(s.color)));
        rows += leaRow('Grosor',  `<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="weight" type="range" min="0" max="10" step="0.5" value="${s.weight??2}" /><span class="lea-val">${s.weight??2}</span></div>`);
        rows += leaRow('Opacidad',`<div class="lea-slider-wrap"><input class="lea-range-input" data-prop="opacity" type="range" min="0" max="1" step="0.05" value="${s.opacity??1}" /><span class="lea-val">${Math.round((s.opacity??1)*100)}%</span></div>`);
      }
      return rows;
    }

    function wireDetailControls(detail, val, initStyle) {
      if (detail.dataset.wired) return;
      detail.dataset.wired = '1';
      detail.querySelectorAll('.lea-range-input').forEach(inp => {
        inp.addEventListener('input', e => {
          const prop  = e.target.dataset.prop;
          const v     = parseFloat(e.target.value);
          const valEl = e.target.closest('.lea-slider-wrap')?.querySelector('.lea-val');
          if (valEl) valEl.textContent = (prop==='fillOpacity'||prop==='opacity') ? Math.round(v*100)+'%' : v;
          deselectRamp();
          updateCatValStyle(val, {[prop]: v});
        });
      });
      detail.querySelectorAll('.lea-color-pick').forEach(pick => {
        pick.addEventListener('input', e => {
          const prop = e.target.dataset.prop;
          e.target.closest('label').style.background = e.target.value;
          const hex = detail.querySelector(`.lea-hex-input[data-prop="${prop}"]`);
          if (hex) hex.value = e.target.value.toUpperCase();
          deselectRamp();
          updateCatValStyle(val, {[prop]: e.target.value});
        });
      });
      detail.querySelectorAll('.lea-hex-input').forEach(inp => {
        inp.addEventListener('change', e => {
          let v = e.target.value.trim();
          if (!v.startsWith('#')) v = '#' + v;
          v = v.slice(0,7).toUpperCase();
          if (/^#[0-9a-fA-F]{6}$/.test(v)) {
            e.target.value = v;
            const prop = e.target.dataset.prop;
            const pick = detail.querySelector(`.lea-color-pick[data-prop="${prop}"]`);
            if (pick) { pick.value = v; pick.closest('label').style.background = v; }
            deselectRamp();
            updateCatValStyle(val, {[prop]: v});
          }
        });
      });
    }

    function updateCatColor(val, color) {
      const nl = window.MAP.getActiveLayers()[k];
      if (!nl?.classification) return;
      nl.classification.colorMap[val] = color;
      if (!nl.classification.styleMap) nl.classification.styleMap = {};
      nl.classification.styleMap[val] = { ...(nl.classification.styleMap[val]||nl.style||{}), fillColor: color, color };
      window.MAP.applyClassificationFromData(k, nl.classification);
    }

    function updateCatValStyle(val, changes) {
      const nl = window.MAP.getActiveLayers()[k];
      if (!nl?.classification) return;
      if (!nl.classification.styleMap) nl.classification.styleMap = {};
      nl.classification.styleMap[val] = { ...(nl.classification.styleMap[val]||nl.style||{}), ...changes };
      if (changes.fillColor) nl.classification.colorMap[val] = changes.fillColor;
      if (changes.color && !changes.fillColor) nl.classification.colorMap[val] = changes.color;
      window.MAP.applyClassificationFromData(k, nl.classification);
    }

    // ── Pills ────────────────────────────────────────────────────

    modal.querySelectorAll('.adv-pill:not([disabled])').forEach(pill => {
      pill.addEventListener('click', () => {
        modal.querySelectorAll('.adv-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        selPalette = initPalette;
        renderAdvMode(pill.dataset.mode);
      });
    });

    // ── Footer ───────────────────────────────────────────────────

    function closeModal() { backdrop.remove(); modal.remove(); }

    function cancelModal() {
      if (_savedClassification) {
        window.MAP.applyClassificationFromData(k, _savedClassification);
        persistClassification(k, _savedClassification);
      } else {
        window.MAP.clearClassification(k);
        persistClassification(k, null);
      }
      closeModal();
    }

    function acceptModal() {
      const nl = window.MAP.getActiveLayers()[k];
      persistClassification(k, nl?.classification || null);
      closeModal();
    }

    modal.querySelector('#adv-close-btn').addEventListener('click', cancelModal);
    modal.querySelector('#adv-cancel-btn').addEventListener('click', cancelModal);
    modal.querySelector('#adv-accept-btn').addEventListener('click', acceptModal);
    modal.querySelector('#adv-clear-btn')?.addEventListener('click', () => {
      window.MAP.clearClassification(k);
      persistClassification(k, null);
      closeModal();
    });
    backdrop.addEventListener('click', cancelModal);

    renderAdvMode(initMode);
  }

  // ── Helpers de persistencia ───────────────────────────────────

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

  // ── Fila de capa ──────────────────────────────────────────────

  function buildLayerRow(k, l) {
    const on = l.visible !== false;
    const r  = document.createElement('div');
    r.className  = 'layers-data-row';
    r.draggable  = true;
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

    // Rename inline
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

    // Edit accordion
    r.querySelector('.layer-edit-btn').addEventListener('click', ev => {
      ev.stopPropagation();
      const sec = ev.currentTarget.closest('.layers-data-section');
      toggleEditAccordion(k, ev.currentTarget, sec);
    });

    return r;
  }

  // ── Render filas ──────────────────────────────────────────────

  function renderLayerRows(sec) {
    _activeEditKey = null;
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

  // ── Toggle dropdown principal ─────────────────────────────────

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
    dd.id = 'layers-dropdown';
    dd.className = 'settings-dropdown layers-dropdown';

    // Mapa base
    const baseIcons = { gray: 'light_mode', dark: 'dark_mode', satellite: 'satellite_alt' };
    let baseHTML = '<div class="sd-section"><p class="sd-section-label" style="text-transform:none">Mapa base</p>';
    Object.entries(basemaps).forEach(([key, def]) => {
      const on   = curBase === key ? 'on' : '';
      const icon = baseIcons[key] || 'map';
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

    // Capas activas
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

    // Posicionar
    const btnRect = btn.getBoundingClientRect();
    const ddW = dd.offsetWidth;
    let left = btnRect.right - ddW;
    left = Math.max(8, left);
    dd.style.top  = (btnRect.bottom + 6) + 'px';
    dd.style.left = left + 'px';

    btn?.classList.add('active');

    // Eventos mapa base
    dd.querySelectorAll('.layers-base-row').forEach(row => {
      row.style.pointerEvents = 'auto';
      row.addEventListener('click', () => {
        const key = row.dataset.base;
        window.MAP.setBasemap(key);
        dd.querySelectorAll('.layers-base-row .sd-toggle').forEach(t => t.classList.remove('on'));
        row.querySelector('.sd-toggle').classList.add('on');
      });
    });

    // Wire capas
    const sec = dd.querySelector('.layers-data-section');
    if (sec) {
      // Reemplazar filas iniciales con las que tienen todos los listeners
      renderLayerRows(sec);
    }

    // Drag flag para no cerrar durante drag
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

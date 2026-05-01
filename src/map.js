/**
 * map.js — Módulo Leaflet
 *
 * Responsabilidades:
 *   - Inicializar y destruir el mapa Leaflet
 *   - Agregar/quitar capas GeoJSON con estilos
 *   - Exponer el objeto de capas activas para el editor de estilos y exportación
 */

window.MAP = (() => {

  let leafletMap   = null;
  let activeLayers = {};  // { layerKey: { geojson, leafletLayer, style, titulo } }

  // ── Inicialización ─────────────────────────────────────────────

  function init() {
    if (leafletMap) return;

    leafletMap = L.map('leaflet-map', {
      center:    [-38.5, -63.5],
      zoom:      5,
      zoomControl: false,
      attributionControl: true
    });

    leafletMap.on('popupclose', () => { clearHighlight(); _currentPopup = null; });



    const savedBase = localStorage.getItem('sm_basemap') || 'auto';
    applyBasemap(savedBase);

    // Forzar recálculo de tamaño luego del primer paint
    setTimeout(() => leafletMap.invalidateSize(), 0);
    setTimeout(() => leafletMap.invalidateSize(), 300);
  }

  // ── Catálogo de mapas base ────────────────────────────────────

  const BASEMAPS = {
    gray: {
      label: 'Gris',
      url:   'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
    },
    dark: {
      label: 'Oscuro',
      url:   'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
    },
    satellite: {
      label: 'Satelital',
      url:   'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
    }
  };

  let _baseLayer   = null;
  let _labelsLayer = null;
  let _currentBase = 'gray';
  let _showLabels  = true;

  function applyBasemap(baseKey) {
    // 'auto' = gray en día, dark en noche
    if (baseKey === 'auto') {
      const h = new Date().getHours();
      baseKey = (h >= 7 && h < 20) ? 'gray' : 'dark';
    }

    const def = BASEMAPS[baseKey] || BASEMAPS.gray;
    _currentBase = baseKey;

    // Remover capas anteriores
    if (_baseLayer)   { leafletMap.removeLayer(_baseLayer);   _baseLayer   = null; }
    if (_labelsLayer) { leafletMap.removeLayer(_labelsLayer); _labelsLayer = null; }

    const attr = baseKey === 'satellite' ? '© <a href="https://www.esri.com">Esri</a> | Datos: <a href="https://ign.gob.ar">IGN Argentina</a>' : '© <a href="https://carto.com">Carto</a> | Datos: <a href="https://ign.gob.ar">IGN Argentina</a>';

    _baseLayer = L.tileLayer(def.url, { attribution: attr, maxZoom: 19 });
    _baseLayer.addTo(leafletMap);

    // Mover capas de datos por encima de los labels
    Object.values(activeLayers).forEach(l => {
      if (l.leafletLayer) l.leafletLayer.bringToFront();
    });

    localStorage.setItem('sm_basemap', baseKey === 'gray' || baseKey === 'dark' ? 'auto' : baseKey);
    localStorage.setItem('sm_labels', _showLabels ? 'true' : 'false');

    // Actualizar clase de la leyenda según luminosidad del basemap
    const legend = document.getElementById('map-legend');
    if (legend) {
      const isLight = baseKey === 'gray' || baseKey === 'satellite';
      legend.classList.toggle('basemap-light', isLight);
      legend.classList.toggle('basemap-dark', baseKey === 'dark');
    }
  }

  function setBasemap(key)   { applyBasemap(key); }
  function setLabels(show)   { /* no-op: sin labels */ }
  function getCurrentBase()  { return _currentBase; }
  function getShowLabels()   { return _showLabels; }
  function hasLabels(key)    { return BASEMAPS[key]?.hasLabels ?? false; }
  function getBasemaps()     { return BASEMAPS; }

  function destroy() {
    if (leafletMap) {
      leafletMap.remove();
      leafletMap   = null;
      activeLayers = {};
    }
  }

  // ── Agregar capa ──────────────────────────────────────────────
  // mapKey:    clave única en activeLayers (puede repetirse la misma capa con distinto índice)
  // layerKey:  clave en window.LAYERS (define geomType, defaultStyle, etc.)
  // titulo:    etiqueta legible (opcional, usa layerDef.titulo por defecto)

  function addLayer(mapKey, layerKey, geojson, style, titulo) {
    if (!leafletMap) init();

    // Remover si ya existe esa clave
    removeLayer(mapKey);

    const layerDef = window.LAYERS[layerKey];
    const geomType = layerDef?.geomType || 'polygon';

    let leafletLayer;

    if (geomType === 'point') {
      leafletLayer = L.geoJSON(geojson, {
        pointToLayer: (feat, latlng) => L.circleMarker(latlng, pointStyle(style)),
        onEachFeature: bindIdentify
      });

    } else if (geomType === 'line') {
      leafletLayer = L.geoJSON(geojson, {
        style: () => lineStyle(style),
        onEachFeature: bindIdentify
      });

    } else {
      leafletLayer = L.geoJSON(geojson, {
        style: () => polygonStyle(style),
        onEachFeature: bindIdentify
      });
    }

    leafletLayer.addTo(leafletMap);

    activeLayers[mapKey] = {
      geojson,
      leafletLayer,
      layerKey,
      geomType,
      style:   { ...style },
      titulo:  titulo || layerDef?.titulo || mapKey,
      visible: true
    };

    // Reordenar z-order: polígonos abajo, líneas al medio, puntos arriba
    _reorderLayers();

    return leafletLayer;
  }

  function removeLayer(mapKey) {
    if (activeLayers[mapKey]) {
      leafletMap.removeLayer(activeLayers[mapKey].leafletLayer);
      delete activeLayers[mapKey];
    }
  }

  function clearAll() {
    Object.keys(activeLayers).forEach(removeLayer);
  }

  // ── Actualizar estilo de una capa ─────────────────────────────

  function updateLayerStyle(mapKey, newStyle) {
    const entry = activeLayers[mapKey];
    if (!entry) return;

    entry.style = { ...entry.style, ...newStyle };
    const layerDef = window.LAYERS[entry.layerKey || mapKey];
    const geomType = layerDef?.geomType || 'polygon';

    entry.leafletLayer.eachLayer(l => {
      if (geomType === 'point') {
        l.setStyle(pointStyle(entry.style));
      } else if (geomType === 'line') {
        l.setStyle(lineStyle(entry.style));
      } else {
        l.setStyle(polygonStyle(entry.style));
      }
    });

    updateLegend();
  }

  // ── Actualizar estilo por clasificación de atributo ───────────

  function updateLayerClassification(mapKey, campo, classMap) {
    const entry = activeLayers[mapKey];
    if (!entry) return;

    const layerDef = window.LAYERS[entry.layerKey || mapKey];
    const geomType = layerDef?.geomType || 'polygon';

    entry.leafletLayer.eachLayer(l => {
      const val   = l.feature?.properties?.[campo];
      const color = classMap[val];
      // Si el valor no tiene categoría asignada, ocultar el feature
      if (!classMap.hasOwnProperty(val)) {
        const hiddenStyle = geomType === 'point'
          ? { ...entry.style, radius: 0, opacity: 0, fillOpacity: 0 }
          : { ...entry.style, opacity: 0, fillOpacity: 0, weight: 0 };
        if (geomType === 'point')   l.setStyle(pointStyle(hiddenStyle));
        else if (geomType === 'line') l.setStyle(lineStyle(hiddenStyle));
        else l.setStyle(polygonStyle(hiddenStyle));
        return;
      }
      const s     = { ...entry.style, fillColor: color, color };

      if (geomType === 'point')   l.setStyle(pointStyle(s));
      else if (geomType === 'line') l.setStyle(lineStyle(s));
      else l.setStyle(polygonStyle(s));
    });
  }

  // ── Ajustar bounds ────────────────────────────────────────────

  // ── Orden de capas ────────────────────────────────────────────

  const GEOM_ORDER = { polygon: 0, line: 1, point: 2 };

  function _reorderLayers() {
    // Ordenar por geomType: polígonos abajo, líneas medio, puntos arriba
    const sorted = Object.entries(activeLayers)
      .sort((a, b) => (GEOM_ORDER[a[1].geomType] ?? 1) - (GEOM_ORDER[b[1].geomType] ?? 1));
    sorted.forEach(([, layer]) => {
      if (layer.leafletLayer && layer.visible !== false) {
        layer.leafletLayer.bringToFront();
      }
    });
  }

  // Mover una capa específica dentro del orden (delta: -1 = subir, +1 = bajar)
  function moveLayer(mapKey, targetIdx) {
    const keys = Object.keys(activeLayers);
    const fromIdx = keys.indexOf(mapKey);
    if (fromIdx < 0) return;
    const clampedIdx = Math.max(0, Math.min(keys.length - 1, targetIdx));
    if (clampedIdx === fromIdx) return;

    const entries = Object.entries(activeLayers);
    const [removed] = entries.splice(fromIdx, 1);
    entries.splice(clampedIdx, 0, removed);
    Object.keys(activeLayers).forEach(k => delete activeLayers[k]);
    entries.forEach(([k, v]) => { activeLayers[k] = v; });

    // Re-aplicar z-order: el último en el array queda arriba
    Object.values(activeLayers).forEach(layer => {
      if (layer.leafletLayer && layer.visible !== false) {
        layer.leafletLayer.bringToFront();
      }
    });
    if (_layerOrderCallback) _layerOrderCallback();
  }

  function fitBounds() {
    const layers = Object.values(activeLayers);
    if (!layers.length) return;

    const group = L.featureGroup(layers.map(l => l.leafletLayer));
    const bounds = group.getBounds();
    if (bounds.isValid()) {
      leafletMap.fitBounds(bounds, { padding: [40, 40] });
    }
  }

  // ── Leyenda ───────────────────────────────────────────────────

  function makeSVG(geom, fill, stroke, fillOpacity, weight, opacity, dashArray) {
    weight = Math.min(weight ?? 1.5, 3);
    if (geom === 'line') {
      const dash = dashArray ? `stroke-dasharray="${dashArray}"` : '';
      return `<svg viewBox="0 0 14 14" width="14" height="14" style="flex-shrink:0">
        <line x1="1" y1="7" x2="13" y2="7" stroke="${stroke}" stroke-width="${weight*1.5}" stroke-opacity="${opacity}" stroke-linecap="round" ${dash}/></svg>`;
    }
    if (geom === 'point') return `<svg viewBox="0 0 14 14" width="14" height="14" style="flex-shrink:0">
      <circle cx="7" cy="7" r="5" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${stroke}" stroke-width="${weight}" stroke-opacity="${opacity}"/></svg>`;
    return `<svg viewBox="0 0 14 14" width="14" height="14" style="flex-shrink:0">
      <rect x="1" y="1" width="12" height="12" rx="2" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${stroke}" stroke-width="${weight}" stroke-opacity="${opacity}"/></svg>`;
  }

  // Restaurar visible desde instrucciones guardadas (llamado desde app.js tras addLayer)
  function restoreLayerVisible(key, visible) {
    const layer = activeLayers[key];
    if (!layer) return;
    if (visible === false && layer.visible !== false) {
      layer.visible = false;
      if (layer.leafletLayer) leafletMap.removeLayer(layer.leafletLayer);
    }
  }

  // Popup prefs: setear desde Firestore (reemplaza localStorage)
  function setPopupPrefs(prefs) {
    Object.keys(_popupFieldPrefs).forEach(k => delete _popupFieldPrefs[k]);
    Object.entries(prefs).forEach(([lk, fields]) => {
      _popupFieldPrefs[lk] = new Set(fields);
    });
  }

  function getPopupPrefs() {
    const out = {};
    Object.entries(_popupFieldPrefs).forEach(([lk, set]) => { out[lk] = [...set]; });
    return out;
  }

  function updateLegend() {
    const el = document.getElementById('map-legend');
    if (!el) return;

    const items = Object.entries(activeLayers).reverse();
    if (!items.length) { el.classList.remove('visible'); return; }

    el.classList.add('visible');
    const layerDef = k => window.LAYERS[k] || {};

    const isCollapsed = el.classList.contains('legend-collapsed');
    el.innerHTML = `
      <div class="legend-header">
        <div class="legend-title">Referencias</div>
        <button class="legend-collapse-btn" title="${isCollapsed ? 'Expandir' : 'Colapsar'}">
          <span class="material-icons">${isCollapsed ? 'expand_more' : 'expand_less'}</span>
        </button>
      </div>
      <div class="legend-items-wrap">` +
      items.map(([key, entry]) => {
        const s           = entry.style || {};
        const geom        = entry.geomType || window.LAYERS[entry.layerKey]?.geomType || 'polygon';
        const cl          = entry.classification;

        // Clasificación categorizada
        if (cl?.type === 'categorized' && cl.colorMap) {
          let html = `<div class="legend-item legend-item-title">
            <span>${entry.titulo || key}</span>
          </div>`;
          Object.entries(cl.colorMap).forEach(([val, color]) => {
            const svg = makeSVG(geom, color, color, s.fillOpacity ?? 0.85, s.weight ?? 1.5, s.opacity ?? 1, s.dashArray);
            html += `<div class="legend-item legend-item-classified">${svg}<span>${val}</span></div>`;
          });
          return html;
        }

        // Clasificación graduada
        if (cl?.type === 'graduated' && cl.breaks?.length) {
          let html = `<div class="legend-item legend-item-title">
            <span>${entry.titulo || key}</span>
          </div>`;
          const colors = cl.paletteColors || ['#888'];
          for (let i = 0; i < cl.breaks.length - 1; i++) {
            const color = colors[Math.min(i, colors.length-1)];
            const svg   = makeSVG(geom, color, color, s.fillOpacity ?? 0.85, s.weight ?? 1.5, s.opacity ?? 1);
            const from  = Number(cl.breaks[i]).toLocaleString('es-AR', {maximumFractionDigits: 1});
            const to    = Number(cl.breaks[i+1]).toLocaleString('es-AR', {maximumFractionDigits: 1});
            html += `<div class="legend-item legend-item-classified">${svg}<span>${from} – ${to}</span></div>`;
          }
          return html;
        }

        // Estilo uniforme
        const fill        = s.fillColor  || s.color   || '#888';
        const fillOpacity = s.fillOpacity ?? (geom === 'polygon' ? 0.3 : 0.85);
        const stroke      = s.color      || fill;
        const weight      = Math.min(s.weight ?? 1.5, 3);
        const opacity     = s.opacity    ?? 1;
        const svgHTML     = makeSVG(geom, fill, stroke, fillOpacity, weight, opacity, s.dashArray);

        return `
          <div class="legend-item">
            ${svgHTML}
            <input class="legend-label-input" data-key="${key}"
                   value="${(entry.titulo || key).replace(/"/g,'&quot;')}"
                   title="Click para editar" />
          </div>`;
      }).join('') + `</div>`;

    // Wire colapsar
    el.querySelector('.legend-collapse-btn')?.addEventListener('click', () => {
      el.classList.toggle('legend-collapsed');
      const icon = el.querySelector('.legend-collapse-btn .material-icons');
      if (icon) icon.textContent = el.classList.contains('legend-collapsed') ? 'expand_more' : 'expand_less';
    });

    // Wire edición inline
    el.querySelectorAll('.legend-label-input').forEach(input => {
      input.addEventListener('focus', () => { input.dataset.original = input.value; });
      input.addEventListener('blur',  () => _onLegendRename(input));
      input.addEventListener('keydown', e => {
        if (e.key === 'Enter')  { e.preventDefault(); input.blur(); }
        if (e.key === 'Escape') { input.value = input.dataset.original || input.value; input.blur(); }
      });
    });
  }

  // ── Etiquetas ─────────────────────────────────────────────────

  function setLayerLabels(mapKey, show, opts = {}) {
    const entry = activeLayers[mapKey];
    if (!entry?.leafletLayer) return;

    entry.labels     = show;
    entry.labelSize  = opts.size  || entry.labelSize  || 12;
    entry.labelColor = opts.color || entry.labelColor || '#ffffff';
    const field      = opts.field || entry.labelField;
    entry.labelField = field;

    // Quitar tooltips existentes
    entry.leafletLayer.eachLayer?.(l => l.unbindTooltip?.());
    if (entry.leafletLayer.unbindTooltip) entry.leafletLayer.unbindTooltip();

    if (!show || !field) return;

    const style = `
      font-size: ${entry.labelSize}px;
      color: ${entry.labelColor};
      font-family: var(--font-sans, sans-serif);
      font-weight: 500;
      text-shadow: 0 1px 3px rgba(0,0,0,0.6);
      white-space: nowrap;
    `;

    entry.leafletLayer.eachLayer(l => {
      const val = l.feature?.properties?.[field];
      if (!val) return;
      l.bindTooltip(String(val), {
        permanent:   true,
        direction:   'center',
        className:   'map-label-tooltip',
        offset:      [0, 0]
      });
      // Aplicar estilo inline al elemento del tooltip
      l.on('tooltipopen', ev => {
        const el = ev.tooltip?.getElement?.();
        if (el) el.style.cssText += style;
      });
    });
  }

  // ── Clasificación por atributo ────────────────────────────────

  // Métodos de clasificación graduada
  function computeBreaks(values, method, classes) {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    if (!n) return [];

    if (method === 'equal') {
      const min = sorted[0], max = sorted[n-1], step = (max - min) / classes;
      return Array.from({length: classes+1}, (_, i) => min + i * step);
    }
    if (method === 'quantile') {
      const breaks = [sorted[0]];
      for (let i = 1; i < classes; i++) {
        const idx = Math.floor(i * n / classes);
        breaks.push(sorted[idx]);
      }
      breaks.push(sorted[n-1]);
      return breaks;
    }
    // Jenks (Natural Breaks) simplificado
    if (method === 'jenks') {
      const mat1 = [], mat2 = [];
      for (let i = 0; i <= n; i++) { mat1[i] = []; mat2[i] = []; }
      for (let i = 1; i <= n; i++) { mat1[i][1] = 1; mat2[i][1] = 0; }
      for (let j = 2; j <= classes; j++) {
        for (let i = j; i <= n; i++) {
          let minV = Infinity;
          for (let m = 1; m <= i-1; m++) {
            const slice = sorted.slice(m-1, i);
            const mean  = slice.reduce((a,b)=>a+b,0)/slice.length;
            const ssd   = slice.reduce((a,b)=>a+(b-mean)**2,0);
            const v     = (mat2[m][j-1]||0) + ssd;
            if (v < minV) { minV = v; mat1[i][j] = m; mat2[i][j] = v; }
          }
        }
      }
      const breaks = [sorted[n-1]];
      let k = n;
      for (let j = classes; j >= 2; j--) {
        const id = mat1[k][j] - 1;
        breaks.unshift(sorted[id]);
        k = mat1[k][j];
      }
      breaks.unshift(sorted[0]);
      return breaks;
    }
    return [];
  }

  function getColorForValue(val, breaks, palette) {
    if (!breaks?.length || val == null) return palette[0] || '#888';
    for (let i = 0; i < breaks.length - 1; i++) {
      if (val <= breaks[i+1]) return palette[Math.min(i, palette.length-1)];
    }
    return palette[palette.length-1];
  }

  function rebuildLayer(entry, mapKey) {
    if (entry.leafletLayer) leafletMap.removeLayer(entry.leafletLayer);
    const geom = entry.geomType || 'polygon';
    const cl   = entry.classification;
    let newLayer;

    const getStyle = (feat) => {
      if (!cl) return entry.style;
      const val = feat?.properties?.[cl.field];
      if (cl.type === 'graduated') {
        const color = getColorForValue(parseFloat(val), cl.breaks, cl.paletteColors || ['#888']);
        return geom === 'line'
          ? { ...entry.style, color }
          : { ...entry.style, color, fillColor: color };
      }
      // categorized — si el valor no está en colorMap, ocultar el feature
      if (!cl.colorMap?.hasOwnProperty(val)) {
        return geom === 'point'
          ? { ...entry.style, radius: 0, opacity: 0, fillOpacity: 0 }
          : { ...entry.style, opacity: 0, fillOpacity: 0, weight: 0 };
      }
      const color = cl.colorMap[val];
      const valStyle = cl.styleMap?.[val] || {};
      return geom === 'line'
        ? { ...entry.style, ...valStyle, color }
        : { ...entry.style, ...valStyle, color, fillColor: valStyle.fillColor || color };
    };

    if (geom === 'point') {
      newLayer = L.geoJSON(entry.geojson, {
        pointToLayer:  (feat, latlng) => L.circleMarker(latlng, pointStyle(getStyle(feat))),
        onEachFeature: bindIdentify
      });
    } else if (geom === 'line') {
      newLayer = L.geoJSON(entry.geojson, {
        style:         feat => lineStyle(getStyle(feat)),
        onEachFeature: bindIdentify
      });
    } else {
      newLayer = L.geoJSON(entry.geojson, {
        style:         feat => polygonStyle(getStyle(feat)),
        onEachFeature: bindIdentify
      });
    }
    newLayer.addTo(leafletMap);
    entry.leafletLayer = newLayer;
  }

  function applyClassification(mapKey, opts) {
    const entry = activeLayers[mapKey];
    if (!entry?.geojson) return;

    const { type, field, palette, paletteColors, method, classes } = opts;
    const colors = paletteColors || [];
    const MAX_CATS = 8;

    if (type === 'categorized') {
      const values = [...new Set(
        entry.geojson.features.map(f => f.properties?.[field]).filter(v => v != null)
      )].sort();

      const colorMap = {};
      values.slice(0, MAX_CATS * 2).forEach((v, i) => {
        colorMap[v] = colors[i % colors.length] || '#888';
      });
      entry.classification = { type, field, palette, paletteColors: colors, colorMap };

    } else if (type === 'graduated') {
      const numVals = entry.geojson.features
        .map(f => parseFloat(f.properties?.[field]))
        .filter(v => !isNaN(v));
      const breaks = computeBreaks(numVals, method || 'jenks', classes || 5);
      entry.classification = { type, field, palette, paletteColors: colors, method, classes, breaks };
    }

    rebuildLayer(entry, mapKey);
    updateLegend();
  }

  function applyClassificationFromData(mapKey, classification) {
    const entry = activeLayers[mapKey];
    if (!entry) return;
    entry.classification = classification;
    rebuildLayer(entry, mapKey);
    updateLegend();
  }

  function clearClassification(mapKey) {
    const entry = activeLayers[mapKey];
    if (!entry) return;
    entry.classification = null;
    rebuildLayer(entry, mapKey);
    updateLegend();
  }

  // ── Renombrar capa desde leyenda ──────────────────────────────

  let _layerRenameCallback     = null;
  let _layerVisibilityCallback = null;
  let _layerOrderCallback      = null;

  function onLayerRename(cb)           { _layerRenameCallback     = cb; }
  function onLayerVisibilityChange(cb) { _layerVisibilityCallback = cb; }
  function onLayerOrderChange(cb)      { _layerOrderCallback      = cb; }

  function _onLegendRename(input) {
    const key      = input.dataset.key;
    const newName  = input.value.trim();
    const original = input.dataset.original || '';
    if (!newName) { input.value = original; return; }
    if (newName === original) return;
    if (activeLayers[key]) {
      activeLayers[key].titulo = newName;
    }
    if (_layerRenameCallback) _layerRenameCallback(key, newName);
  }

  function renameLayer(key, newName) {
    if (activeLayers[key]) activeLayers[key].titulo = newName;
    if (_layerRenameCallback) _layerRenameCallback(key, newName);
  }

  // ── Popup genérico ────────────────────────────────────────────

  // ── Modo consulta (identify) ─────────────────────────────────

  let _identifyMode             = false;
  let _identifyHighlight        = null;
  let _identifyClickedOnFeature = false;
  let _lastIdentifyFeature      = null;
  let _lastIdentifyMapKey       = null;
  let _currentPopup             = null;

  function setIdentifyMode(active) {
    _identifyMode = active;
    const container = leafletMap?.getContainer();
    if (container) container.classList.toggle('identify-active', active);
    if (!active) {
      leafletMap?.closePopup();
      clearHighlight();
    } else {
      // Cuando se activa: el próximo click en el mapa sin tocar un feature → desactivar
      setTimeout(() => {
        if (_identifyMode) leafletMap?.once('click', _onMapClickOutsideFeature);
      }, 0);
    }
  }

  function _onMapClickOutsideFeature() {
    if (!_identifyMode) return;
    if (_identifyClickedOnFeature) {
      _identifyClickedOnFeature = false;
      setTimeout(() => {
        if (_identifyMode) leafletMap?.once('click', _onMapClickOutsideFeature);
      }, 0);
    } else {
      _deactivateIdentify();
    }
  }

  function _deactivateIdentify() {
    _identifyMode = false;
    const container = leafletMap?.getContainer();
    if (container) container.classList.remove('identify-active');
    leafletMap?.closePopup();
    clearHighlight();
    document.getElementById('popup-field-customizer')?.remove();
    // Actualizar el botón en la UI
    const btn = document.getElementById('btn-identify');
    if (btn) {
      btn.classList.remove('active');
      btn.title = 'Consultar elementos';
    }
  }

  function getIdentifyMode() { return _identifyMode; }

  // ── Campos ocultos por defecto en el popup ────────────────────
  // Campos siempre excluidos (técnicos/internos):
  const POPUP_ALWAYS_EXCLUDE = new Set(['gid', 'fdc', 'sag', 'entidad', 'objeto', 'gna']);

  // Campos prioritarios que siempre se muestran (nombre, entidad política, clasificables):
  const POPUP_PRIORITY_FIELDS = new Set([
    'fna', 'nam', 'nom_pfi',                            // nombre
    'nom_pcia', 'nom_depto', 'prov', 'pvecino',         // entidad política / país
    'tipo_asent', 'cruce_pfi', 'gna', 'tap', 'jap',     // clasificación
    'typ', 'rst', 'rtn', 'tup'                          // tipo/estado (rutas, puentes)
  ]);

  // Preferencias de campos visibles: layerKey → Set de campos habilitados
  const _popupFieldPrefs = {};
  const POPUP_PREFS_KEY  = 'sm_popup_fields';

  function _loadPopupPrefs() {
    try {
      const raw = localStorage.getItem(POPUP_PREFS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      Object.entries(parsed).forEach(([lk, fields]) => {
        _popupFieldPrefs[lk] = new Set(fields);
      });
    } catch {}
  }

  let _popupPrefsSaveCallback = null;
  function onPopupPrefsSave(cb) { _popupPrefsSaveCallback = cb; }

  function _savePopupPrefs() {
    try {
      const out = {};
      Object.entries(_popupFieldPrefs).forEach(([lk, set]) => { out[lk] = [...set]; });
      localStorage.setItem(POPUP_PREFS_KEY, JSON.stringify(out));
      if (_popupPrefsSaveCallback) _popupPrefsSaveCallback(out);
    } catch {}
  }

  _loadPopupPrefs();

  function _getVisibleFields(layerKey, allFields) {
    // Si el usuario ya configuró preferencias para esta capa, usar esas
    if (_popupFieldPrefs[layerKey]) {
      return allFields.filter(k => _popupFieldPrefs[layerKey].has(k));
    }
    // Por defecto: mostrar solo campos prioritarios que estén presentes
    const priority = allFields.filter(k => POPUP_PRIORITY_FIELDS.has(k));
    return priority.length ? priority : allFields.slice(0, 8);
  }

  // buildPopupEl: devuelve un elemento DOM con eventos ya wired.
  // Leaflet acepta elementos DOM en setContent — así evitamos cualquier problema de timing.
  function buildPopupEl(feature, mapKey) {
    if (!feature.properties) return document.createElement('div');
    const props = feature.properties;

    const layerKey = activeLayers[mapKey]?.layerKey || mapKey;
    const layerDef = window.LAYERS?.[layerKey] || {};

    const allFields = Object.keys(props).filter(k =>
      !POPUP_ALWAYS_EXCLUDE.has(k) &&
      !k.endsWith('Type') &&
      props[k] !== null && props[k] !== undefined &&
      props[k] !== 'None' && props[k] !== ''
    );

    const visibleFields = _getVisibleFields(layerKey, allFields);
    // Título: primer campo de nombre disponible
    const name = props.fna || props.nom_pfi || props.nam || props.rtn || '';

    // Filas: mostrar solo el nombre de campo (campo técnico), no el label
    const dataRows = visibleFields
      .map(k => `<tr><td class="popup-key">${k}</td><td class="popup-val">${props[k]}</td></tr>`)
      .join('');

    const currentPref = _popupFieldPrefs[layerKey];
    const isActive    = k => currentPref ? currentPref.has(k) : POPUP_PRIORITY_FIELDS.has(k);

    const el = document.createElement('div');
    el.className = 'map-popup';
    el.dataset.layerKey = layerKey;
    el.innerHTML = `
      <div class="popup-header">
        ${name ? `<span class="popup-name">${name}</span>` : '<span></span>'}
        <button class="popup-close-btn"><span class="material-icons">close</span></button>
      </div>
      <table class="popup-table">${dataRows || '<tr><td class="popup-key" colspan="2" style="opacity:.5">Sin datos</td></tr>'}</table>
      <div class="popup-customize-btn adv-ramp-trigger" style="margin:8px 12px 0;border-radius:4px;cursor:pointer">
        <span style="font-family:var(--font-sans);font-size:12px;color:var(--cream2);flex:1">Más campos</span>
        <span class="pfc-chevron adv-ramp-arrow">▾</span>
      </div>
      <div class="pfc-accordion" style="display:none"></div>
      <div class="pfc-footer" style="display:none">
        <button class="pfc-btn pfc-apply" disabled>Aceptar</button>
      </div>`;

    const accordion = el.querySelector('.pfc-accordion');
    const applyBtn  = el.querySelector('.pfc-apply');

    allFields.forEach(k => {
      const active = isActive(k);

      const row = document.createElement('label');
      row.className = 'pfc-row';

      const cb = document.createElement('input');
      cb.type             = 'checkbox';
      cb.dataset.field    = k;
      cb.dataset.original = active ? '1' : '0';
      cb.checked          = active;

      // Solo nombre de campo técnico, sin label interpretado
      const keySpan = document.createElement('span');
      keySpan.className   = 'pfc-label';
      keySpan.textContent = k;

      cb.addEventListener('change', () => {
        const hasChange = [...accordion.querySelectorAll('input[type=checkbox]')]
          .some(i => (i.checked ? '1' : '0') !== i.dataset.original);
        applyBtn.toggleAttribute('disabled', !hasChange);
      });

      row.appendChild(cb);
      row.appendChild(keySpan);
      accordion.appendChild(row);
    });

    // Cerrar popup con X
    el.querySelector('.popup-close-btn')?.addEventListener('click', () => {
      leafletMap?.closePopup();
    });

    const toggleBtn = el.querySelector('.popup-customize-btn');
    const footer    = el.querySelector('.pfc-footer');
    const chevron   = el.querySelector('.pfc-chevron');

    toggleBtn.addEventListener('click', () => {
      const open = accordion.style.display !== 'none';
      accordion.style.display = open ? 'none' : 'block';
      footer.style.display    = open ? 'none' : 'flex';
      toggleBtn.classList.toggle('pfc-open', !open);
      chevron.textContent = open ? '▾' : '▲';
      if (_currentPopup) {
        const _ap = _currentPopup.options.autoPan;
        _currentPopup.options.autoPan = false;
        _currentPopup.update();
        _currentPopup.options.autoPan = _ap;
      }
    });

    // Aceptar
    applyBtn.addEventListener('click', () => {
      if (applyBtn.hasAttribute('disabled')) return;
      const checked = [...accordion.querySelectorAll('input[type=checkbox]:checked')]
        .map(i => i.dataset.field);
      if (checked.length === 0) return;
      _popupFieldPrefs[layerKey] = new Set(checked);
      _savePopupPrefs();
      _refreshOpenPopup(false);
    });

    return el;
  }

  // Actualiza el contenido del popup abierto sin cerrarlo ni moverlo.
  // keepAccordion=true → deja el acordeón abierto (usado internamente por _refreshOpenPopup)
  function _refreshOpenPopup(keepAccordion = false) {
    const openPopup = _currentPopup;
    if (!openPopup || !_lastIdentifyFeature) return;

    // Actualizar solo la tabla de datos visible — sin tocar el DOM del popup completo
    const wrapper = openPopup.getElement?.();
    if (!wrapper) return;
    const popupEl   = wrapper.querySelector('.map-popup');
    const tableEl   = popupEl?.querySelector('.popup-table');
    const accordion = popupEl?.querySelector('.pfc-accordion');
    const footer    = popupEl?.querySelector('.pfc-footer');
    const toggleBtn = popupEl?.querySelector('.popup-customize-btn');
    const chevron   = toggleBtn?.querySelector('.pfc-chevron');
    if (!tableEl) return;

    // Recalcular filas visibles con las preferencias ya guardadas
    const props     = _lastIdentifyFeature.properties;
    const layerKey  = activeLayers[_lastIdentifyMapKey]?.layerKey || _lastIdentifyMapKey;
    const layerDef  = window.LAYERS?.[layerKey] || {};
    const allFields = Object.keys(props).filter(k =>
      !POPUP_ALWAYS_EXCLUDE.has(k) && !k.endsWith('Type') &&
      props[k] !== null && props[k] !== undefined && props[k] !== 'None' && props[k] !== ''
    );
    const visibleFields = _getVisibleFields(layerKey, allFields);
    tableEl.innerHTML = visibleFields.map(k =>
      `<tr><td class="popup-key">${k}</td><td class="popup-val">${props[k]}</td></tr>`
    ).join('') || '<tr><td class="popup-key" colspan="2" style="opacity:.5">Sin datos</td></tr>';

    // Actualizar data-original de los checkboxes para reflejar el nuevo estado guardado
    accordion?.querySelectorAll('input[type=checkbox]').forEach(cb => {
      cb.dataset.original = cb.checked ? '1' : '0';
    });
    // Desactivar Aplicar (ya no hay cambios pendientes)
    popupEl?.querySelector('.pfc-apply')?.toggleAttribute('disabled', true);

    // Cerrar acordeón salvo que se pida mantenerlo abierto
    if (!keepAccordion && accordion) {
      accordion.style.display = 'none';
      if (footer)    footer.style.display = 'none';
      if (toggleBtn) toggleBtn.classList.remove('pfc-open');
      if (chevron)   chevron.textContent  = '▾';
    }

    // Recalcular tamaño del popup sin mover
    const _ap = openPopup.options.autoPan;
    openPopup.options.autoPan = false;
    openPopup.update();
    openPopup.options.autoPan = _ap;
  }


  function clearHighlight() {
    if (_identifyHighlight) {
      _identifyHighlight.remove();
      _identifyHighlight = null;
    }
  }

  function highlightFeature(feature, latlng) {
    clearHighlight();
    const geom = feature.geometry?.type?.toLowerCase() || '';
    let hl;
    if (geom.includes('point') || geom.includes('multipoint')) {
      hl = L.circleMarker(latlng, {
        radius: 14, color: '#f5c518', weight: 3,
        fillColor: '#f5c518', fillOpacity: 0.2, opacity: 0.9
      }).addTo(leafletMap);
    } else if (geom.includes('line')) {
      hl = L.geoJSON(feature, {
        style: { color: '#f5c518', weight: 12, opacity: 0.75 }
      }).addTo(leafletMap);
    } else {
      hl = L.geoJSON(feature, {
        style: { color: '#f5c518', weight: 3, fillColor: '#f5c518', fillOpacity: 0.2, opacity: 0.9 }
      }).addTo(leafletMap);
    }
    _identifyHighlight = hl;
  }

  function bindIdentify(feature, layer) {
    layer.on('click', e => {
      if (!_identifyMode) return;
      L.DomEvent.stopPropagation(e);
      _identifyClickedOnFeature = true;

      // Buscar el mapKey de este layer para pasar al buildPopupContent
      let mapKey = null;
      Object.entries(activeLayers).forEach(([mk, entry]) => {
        entry.leafletLayer?.eachLayer?.(l => { if (l === layer) mapKey = mk; });
      });

      highlightFeature(feature, e.latlng);
      _lastIdentifyFeature = feature;
      _lastIdentifyMapKey  = mapKey;

      // offset positivo en Y: la punta queda debajo del click, el globo crece hacia abajo
      _currentPopup = L.popup({
        className: 'sm-popup',
        offset: L.point(0, 6),
        autoPan: true,
        closeButton: false,
        autoPanPaddingTopLeft:     L.point(60, 64),
        autoPanPaddingBottomRight: L.point(60, 20)
      })
        .setLatLng(e.latlng)
        .setContent(buildPopupEl(feature, mapKey))
        .openOn(leafletMap);

    });

    // Cursor: solo cambiar a pointer cuando identify está activo
    layer.on('mouseover', e => {
      const el = e.originalEvent?.target;
      if (!_identifyMode) {
        // Asegurar cursor de mano grab, no pointer
        if (el) el.style.cursor = '';
        return;
      }
    });
  }

  // ── Funciones de estilo ───────────────────────────────────────

  function polygonStyle(s) {
    return {
      fillColor:   s.fillColor   || '#c8622a',
      fillOpacity: s.fillOpacity ?? 0.2,
      color:       s.color       || s.fillColor || '#c8622a',
      weight:      s.weight      ?? 1.5,
      opacity:     s.opacity     ?? 1
    };
  }

  function lineStyle(s) {
    const st = {
      color:   s.color   || '#c8622a',
      weight:  s.weight  ?? 2,
      opacity: s.opacity ?? 1
    };
    if (s.dashArray) {
      // Escalar el patrón proporcionalmente al grosor para que siempre se vea
      const w      = st.weight;
      const scale  = Math.max(1, w / 2);
      const scaled = s.dashArray.split(',').map(n => Math.round(parseFloat(n) * scale)).join(',');
      st.dashArray = scaled;
    }
    return st;
  }

  function pointStyle(s) {
    return {
      radius:      s.radius      ?? 5,
      fillColor:   s.fillColor   || '#c8622a',
      fillOpacity: s.fillOpacity ?? 0.85,
      color:       s.color       || '#fff',
      weight:      s.weight      ?? 1.5,
      opacity:     s.opacity     ?? 1
    };
  }

  // ── API pública ───────────────────────────────────────────────

  function toggleLayerVisibility(key) {
    const layer = activeLayers[key];
    if (!layer) return;
    if (layer.visible === false) {
      layer.visible = true;
      if (layer.leafletLayer) leafletMap.addLayer(layer.leafletLayer);
    } else {
      layer.visible = false;
      if (layer.leafletLayer) leafletMap.removeLayer(layer.leafletLayer);
    }
    updateLegend();
    if (_layerVisibilityCallback) _layerVisibilityCallback(key, layer.visible !== false);
  }

  return {
    init,
    destroy,
    addLayer,
    removeLayer,
    clearAll,
    updateLayerStyle,
    updateLayerClassification,
    moveLayer,
    fitBounds,
    updateLegend,
    toggleLayerVisibility,
    setBasemap,
    setLabels,
    getCurrentBase,
    getShowLabels,
    hasLabels,
    getBasemaps,
    setIdentifyMode,
    getIdentifyMode,
    applyClassification,
    applyClassificationFromData,
    clearClassification,
    setLayerLabels,
    onLayerRename,
    onLayerVisibilityChange,
    onLayerOrderChange,
    onPopupPrefsSave,
    restoreLayerVisible,
    setPopupPrefs,
    getPopupPrefs,
    renameLayer,
    getActiveLayers: () => activeLayers,
    getInstance:     () => leafletMap
  };

})();

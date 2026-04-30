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

    leafletMap.on('popupclose', () => clearHighlight());

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
      const color = classMap[val] || entry.style.fillColor || entry.style.color || '#888';
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

  function updateLegend() {
    const el = document.getElementById('map-legend');
    if (!el) return;

    const items = Object.entries(activeLayers).reverse();
    if (!items.length) { el.classList.remove('visible'); return; }

    el.classList.add('visible');
    const layerDef = k => window.LAYERS[k] || {};

    el.innerHTML = `<div class="legend-title">Referencias</div>` +
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
      }).join('');

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
      // categorized
      const color = cl.colorMap?.[val] || entry.style?.color || '#888';
      return geom === 'line'
        ? { ...entry.style, color }
        : { ...entry.style, color, fillColor: color };
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

  let _layerRenameCallback = null;

  function onLayerRename(cb) { _layerRenameCallback = cb; }

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

  let _identifyMode = false;

  function setIdentifyMode(active) {
    _identifyMode = active;
    const container = leafletMap?.getContainer();
    if (container) container.classList.toggle('identify-active', active);
    if (!active) {
      leafletMap?.closePopup();
      clearHighlight();
    }
  }

  function getIdentifyMode() { return _identifyMode; }

  function buildPopupContent(feature) {
    if (!feature.properties) return '';
    const props = feature.properties;
    const name  = props.fna || props.nom_pfi || props.nam || '';
    const rows  = Object.entries(props)
      .filter(([k, v]) => !k.endsWith('Type') && k !== 'gid' && v !== null && v !== 'None' && v !== '')
      .slice(0, 12)
      .map(([k, v]) => `<tr><td class="popup-key">${k}</td><td class="popup-val">${v}</td></tr>`)
      .join('');
    return `<div class="map-popup">
      ${name ? `<div class="popup-name">${name}</div>` : ''}
      <table class="popup-table">${rows}</table>
    </div>`;
  }

  let _identifyHighlight = null;

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
      highlightFeature(feature, e.latlng);
      L.popup({ className: 'sm-popup' })
        .setLatLng(e.latlng)
        .setContent(buildPopupContent(feature))
        .openOn(leafletMap);
    });
    layer.on('mouseover', () => {
      if (!_identifyMode) return;
      layer.getElement && layer.getElement()?.classList.add('identify-hover');
    });
    layer.on('mouseout', () => {
      layer.getElement && layer.getElement()?.classList.remove('identify-hover');
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
    renameLayer,
    getActiveLayers: () => activeLayers,
    getInstance:     () => leafletMap
  };

})();

/**
 * export.js — Exportación de mapas
 */

window.EXPORT = (() => {

  // ── GeoJSON ───────────────────────────────────────────────────

  function toGeoJSON() {
    const activeLayers = window.MAP.getActiveLayers();
    const keys = Object.keys(activeLayers);
    if (!keys.length) { window.TOAST.show('No hay capas para exportar'); return; }

    const allFeatures = keys.flatMap(key => {
      const { geojson, titulo } = activeLayers[key];
      return (geojson.features || []).map(f => ({
        ...f,
        properties: { ...f.properties, _layer: titulo }
      }));
    });

    const fc = {
      type:     'FeatureCollection',
      name:     document.getElementById('map-title')?.value || 'simple-maps-export',
      features: allFeatures
    };

    const blob = new Blob([JSON.stringify(fc, null, 2)], { type: 'application/geo+json' });
    downloadBlob(blob, `${sanitizeFilename(fc.name)}.geojson`);
    window.TOAST.show('GeoJSON exportado');
  }

  // ── JPEG ──────────────────────────────────────────────────────

  async function toJPEG() {
    const mapInst = window.MAP.getInstance();
    if (!mapInst) { window.TOAST.show('No hay mapa activo'); return; }

    window.TOAST.show('Generando imagen…', 8000);

    try {
      const mapCanvas    = await captureLeaflet(mapInst);
      const outputCanvas = buildA4Canvas(mapCanvas);

      outputCanvas.toBlob(blob => {
        const title = document.getElementById('map-title')?.value || 'simple-maps';
        downloadBlob(blob, `${sanitizeFilename(title)}.jpg`);
        window.TOAST.show('Imagen exportada');
      }, 'image/jpeg', 0.93);

    } catch (err) {
      console.error('[EXPORT] Error JPEG:', err);
      window.TOAST.show('Error al generar imagen: ' + err.message);
    }
  }

  // ── Capturar el mapa directamente desde los canvas de Leaflet ─

  async function captureLeaflet(mapInst) {
    const container = mapInst.getContainer();
    const w = container.offsetWidth;
    const h = container.offsetHeight;

    const output = document.createElement('canvas');
    output.width  = w;
    output.height = h;
    const ctx = output.getContext('2d');

    // Fondo con el color del basemap actual
    const base = window.MAP.getCurrentBase?.() || 'gray';
    ctx.fillStyle = base === 'dark' ? '#1a1a1a' : base === 'satellite' ? '#0a0a0a' : '#e8e4de';
    ctx.fillRect(0, 0, w, h);

    // Capas vectoriales (SVG overlay) — sin CORS
    const overlayPane = container.querySelector('.leaflet-overlay-pane');
    if (overlayPane) {
      const svgs = overlayPane.querySelectorAll('svg');
      for (const svg of svgs) {
        const rect  = svg.getBoundingClientRect();
        const cRect = container.getBoundingClientRect();
        const xml   = new XMLSerializer().serializeToString(svg);
        const blob  = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
        const url   = URL.createObjectURL(blob);
        await new Promise(resolve => {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, rect.left - cRect.left, rect.top - cRect.top, rect.width, rect.height);
            URL.revokeObjectURL(url);
            resolve();
          };
          img.onerror = () => { URL.revokeObjectURL(url); resolve(); };
          img.src = url;
        });
      }
    }

    // Canvas layers (circle markers) — solo si no están tainted
    const canvases = container.querySelectorAll('.leaflet-canvas-pane canvas');
    for (const c of canvases) {
      try {
        const rect  = c.getBoundingClientRect();
        const cRect = container.getBoundingClientRect();
        ctx.drawImage(c, rect.left - cRect.left, rect.top - cRect.top);
      } catch (e) { /* tainted, omitir */ }
    }

    return output;
  }

  // ── Componer canvas A4 ────────────────────────────────────────

  function buildA4Canvas(mapCanvas) {
    // A4 a 150 DPI: 1240 x 1754 px
    const W = 1240, H = 1754;
    const PAD = 60;

    const c = document.createElement('canvas');
    c.width  = W;
    c.height = H;
    const ctx = c.getContext('2d');

    // Fondo blanco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // ── Título ────────────────────────────────────────────────
    const titulo = document.getElementById('map-title')?.value || 'Mapa';
    ctx.fillStyle = '#1a1814';
    ctx.font = 'bold 42px sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(titulo, PAD, PAD);

    // ── Mapa ──────────────────────────────────────────────────
    const titleH   = 42 + 20;           // alto del título + margen
    const footerH  = 180;               // espacio del footer
    const mapAreaH = H - PAD - titleH - footerH - PAD;
    const mapAreaW = W - PAD * 2;

    // Escalar el canvas del mapa para que entre en el área
    const scale = Math.min(mapAreaW / mapCanvas.width, mapAreaH / mapCanvas.height);
    const mw    = mapCanvas.width  * scale;
    const mh    = mapCanvas.height * scale;
    const mx    = PAD + (mapAreaW - mw) / 2;
    const my    = PAD + titleH;

    ctx.drawImage(mapCanvas, mx, my, mw, mh);

    // Borde del mapa
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth   = 1;
    ctx.strokeRect(mx, my, mw, mh);

    // ── Footer ────────────────────────────────────────────────
    const fy = my + mh + 24;

    // Separador
    ctx.strokeStyle = '#dddddd';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, fy - 12);
    ctx.lineTo(W - PAD, fy - 12);
    ctx.stroke();

    // Referencias (izquierda)
    const activeLayers = window.MAP.getActiveLayers();
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#555555';
    ctx.fillText('Referencias', PAD, fy);

    let refY = fy + 26;
    Object.values(activeLayers).reverse().forEach(layer => {
      const color = layer.style?.fillColor || layer.style?.color || '#888';
      ctx.fillStyle = color;
      ctx.fillRect(PAD, refY, 14, 14);
      ctx.strokeStyle = layer.style?.color || color;
      ctx.lineWidth = 1;
      ctx.strokeRect(PAD, refY, 14, 14);
      ctx.fillStyle = '#333333';
      ctx.font = '16px sans-serif';
      ctx.fillText(layer.titulo || '', PAD + 22, refY + 1);
      refY += 22;
    });

    // Escala numérica (centro)
    const scale_m = getMapScale(window.MAP.getInstance());
    const scaleStr = formatScale(scale_m);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#555555';
    ctx.textAlign = 'center';
    ctx.fillText(`Escala aproximada: 1:${scaleStr}`, W / 2, fy + 10);

    // Proyección y fuentes (derecha)
    ctx.textAlign = 'right';
    ctx.font = '15px sans-serif';
    ctx.fillStyle = '#777777';
    ctx.fillText('Proyección: EPSG 4326 (WGS 84)', W - PAD, fy);
    ctx.fillText('Fuentes: Instituto Geográfico Nacional (IGN)', W - PAD, fy + 22);

    ctx.textAlign = 'left'; // reset
    return c;
  }

  // ── Cálculo de escala ─────────────────────────────────────────

  function getMapScale(mapInst) {
    if (!mapInst) return 1000000;
    const bounds  = mapInst.getBounds();
    const size    = mapInst.getSize();
    const lat     = (bounds.getNorth() + bounds.getSouth()) / 2;
    // Metros por pixel en latitud media
    const metersPerPx = 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, mapInst.getZoom());
    // Escala = metros por pixel * píxeles por metro en pantalla (96 DPI → ~3779 px/m)
    return metersPerPx * 3779;
  }

  function formatScale(scale) {
    // Redondear a número "bonito"
    const magnitude = Math.pow(10, Math.floor(Math.log10(scale)));
    const rounded   = Math.round(scale / magnitude) * magnitude;
    return rounded.toLocaleString('es-AR');
  }

  // ── Helpers ───────────────────────────────────────────────────

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function sanitizeFilename(name) {
    return name.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ\s\-_]/g, '')
               .replace(/\s+/g, '_')
               .substring(0, 80);
  }

  return { toGeoJSON, toJPEG };

})();

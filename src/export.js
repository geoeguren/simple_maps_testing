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

    // ── Título centrado ───────────────────────────────────────
    const titulo = document.getElementById('map-title')?.value || 'Mapa';
    ctx.fillStyle  = '#1a1814';
    ctx.font       = 'bold 42px sans-serif';
    ctx.textAlign  = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(titulo, W / 2, PAD);
    ctx.textAlign = 'left';

    // ── Mapa (más alto: footer más compacto) ──────────────────
    const titleH  = 42 + 24;    // título + margen
    const footerH = 140;        // footer más compacto
    const mapAreaH = H - PAD - titleH - footerH - PAD;
    const mapAreaW = W - PAD * 2;

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

    // ── Flecha norte (esquina superior derecha del mapa) ──────
    drawNorthArrow(ctx, mx + mw - 56, my + 16);

    // ── Footer ────────────────────────────────────────────────
    const fy = my + mh + 20;

    // Separador
    ctx.strokeStyle = '#dddddd';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, fy - 8);
    ctx.lineTo(W - PAD, fy - 8);
    ctx.stroke();

    // Columna izquierda: Referencias
    const colLeft  = PAD;
    const colRight = W / 2 + 20;

    const activeLayers = window.MAP.getActiveLayers();
    ctx.font      = 'bold 17px sans-serif';
    ctx.fillStyle = '#555555';
    ctx.textBaseline = 'top';
    ctx.fillText('Referencias', colLeft, fy);

    let refY = fy + 24;
    Object.values(activeLayers).reverse().forEach(layer => {
      if (layer.visible === false) return;
      const color = layer.style?.fillColor || layer.style?.color || '#888';
      ctx.fillStyle   = color;
      ctx.fillRect(colLeft, refY, 13, 13);
      ctx.strokeStyle = layer.style?.color || color;
      ctx.lineWidth   = 1;
      ctx.strokeRect(colLeft, refY, 13, 13);
      ctx.fillStyle  = '#333333';
      ctx.font       = '15px sans-serif';
      ctx.fillText(layer.titulo || '', colLeft + 20, refY);
      refY += 20;
    });

    // Columna derecha: escala gráfica + numérica + proyección + fuente
    const scale_m  = getMapScale(window.MAP.getInstance());
    const scaleStr = formatScale(scale_m);

    // Escala gráfica
    const barY     = fy;
    const barWidth = 200;
    const barH     = 10;
    const niceKm   = niceScaleKm(scale_m, mw, mapCanvas.width);
    const barPx    = kmToPixelsOnOutput(niceKm, scale_m, mw, mapCanvas.width);

    // Barra de escala gráfica
    ctx.fillStyle   = '#333333';
    ctx.fillRect(colRight, barY + 6, barPx, barH);
    // Ticks
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(colRight + barPx / 2, barY + 6);
    ctx.lineTo(colRight + barPx / 2, barY + 6 + barH);
    ctx.stroke();
    // Borde de la barra
    ctx.strokeStyle = '#333333';
    ctx.lineWidth   = 1;
    ctx.strokeRect(colRight, barY + 6, barPx, barH);
    // Etiquetas de la barra
    ctx.fillStyle    = '#333333';
    ctx.font         = '13px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('0', colRight, barY + 6 + barH + 3);
    ctx.fillText(`${niceKm / 2} km`, colRight + barPx / 2, barY + 6 + barH + 3);
    ctx.fillText(`${niceKm} km`, colRight + barPx, barY + 6 + barH + 3);
    ctx.textAlign = 'left';

    // Escala numérica (sin prefijo)
    ctx.font      = '15px sans-serif';
    ctx.fillStyle = '#555555';
    ctx.textBaseline = 'top';
    ctx.fillText(`1:${scaleStr}`, colRight, fy + 40);

    // Proyección (sin prefijo)
    ctx.fillText('EPSG 4326 (WGS 84)', colRight, fy + 60);

    // Fuente (sin aclaraciones entre paréntesis)
    ctx.fillText('Fuente: Instituto Geográfico Nacional', colRight, fy + 80);

    ctx.textAlign = 'left';
    return c;
  }

  // ── Flecha de norte ───────────────────────────────────────────

  function drawNorthArrow(ctx, x, y) {
    // Icono N con flecha simple: círculo + letra N + flecha arriba
    const R = 22;
    ctx.save();
    ctx.translate(x + R, y + R);

    // Fondo semitransparente
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth   = 1;
    ctx.stroke();

    // Flecha hacia arriba (norte)
    ctx.fillStyle = '#1a1814';
    ctx.beginPath();
    ctx.moveTo(0, -R + 5);          // punta
    ctx.lineTo(-5, -R + 15);        // lado izq
    ctx.lineTo(-1.5, -R + 13);
    ctx.lineTo(-1.5, 2);            // base izq
    ctx.lineTo(1.5, 2);             // base der
    ctx.lineTo(1.5, -R + 13);
    ctx.lineTo(5, -R + 15);         // lado der
    ctx.closePath();
    ctx.fill();

    // Letra N
    ctx.fillStyle    = '#1a1814';
    ctx.font         = 'bold 12px sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', 0, 10);

    ctx.restore();
  }

  // ── Escala gráfica helpers ────────────────────────────────────

  function niceScaleKm(scale_m, outputMapPx, sourceMapPx) {
    // Cuántos km representa la barra de 200px en el output
    const ratio    = sourceMapPx / outputMapPx;
    const mPer200px = scale_m / 3779 * 200 * ratio;
    const km        = mPer200px / 1000;
    // Redondear a número bonito
    const mag   = Math.pow(10, Math.floor(Math.log10(km)));
    const norms = [1, 2, 5, 10];
    let nice = norms.map(n => n * mag).find(n => n >= km / 2) || km;
    return Math.round(nice * 10) / 10;
  }

  function kmToPixelsOnOutput(km, scale_m, outputMapPx, sourceMapPx) {
    const ratio    = outputMapPx / sourceMapPx;
    const mPer1px  = scale_m / 3779;
    return (km * 1000) / mPer1px * ratio;
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

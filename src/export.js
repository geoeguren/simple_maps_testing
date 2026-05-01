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

  // ── PDF vectorial ─────────────────────────────────────────────

  async function toPDF() {
    const mapInst = window.MAP.getInstance();
    if (!mapInst) { window.TOAST.show('No hay mapa activo'); return; }

    window.TOAST.show('Generando PDF…', 10000);

    try {
      // Cargar jsPDF dinámicamente si no está disponible
      if (!window.jspdf) {
        await new Promise((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
          s.onload  = resolve;
          s.onerror = () => reject(new Error('No se pudo cargar jsPDF'));
          document.head.appendChild(s);
        });
      }
      const { jsPDF } = window.jspdf;

      // A4 en puntos PDF (72 DPI): 595.28 x 841.89 pt
      // Usamos mm: 210 x 297
      const W = 210, H = 297, PAD = 14;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // ── Título centrado ──────────────────────────────────────
      const titulo = document.getElementById('map-title')?.value || 'Mapa';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(26, 24, 20);
      doc.text(titulo, W / 2, PAD + 6, { align: 'center' });

      // ── Mapa rasterizado ─────────────────────────────────────
      const mapCanvas  = await captureLeaflet(mapInst);
      const titleH     = 14;   // mm
      const footerH    = 32;   // mm
      const mapAreaW   = W - PAD * 2;
      const mapAreaH   = H - PAD - titleH - footerH - PAD;
      const mapX       = PAD;
      const mapY       = PAD + titleH;

      // Escalar manteniendo aspect ratio
      const scaleF = Math.min(mapAreaW / mapCanvas.width, mapAreaH / mapCanvas.height);
      const mwMm   = (mapCanvas.width  * scaleF) * 25.4 / 96;
      const mhMm   = (mapCanvas.height * scaleF) * 25.4 / 96;
      const mxMm   = mapX + (mapAreaW - mwMm) / 2;
      const myMm   = mapY;

      const imgData = mapCanvas.toDataURL('image/jpeg', 0.88);
      doc.addImage(imgData, 'JPEG', mxMm, myMm, mwMm, mhMm);

      // Borde del mapa
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.2);
      doc.rect(mxMm, myMm, mwMm, mhMm);

      // ── Flecha norte (esquina superior derecha del mapa) ─────
      const nX = mxMm + mwMm - 10;
      const nY = myMm + 4;
      drawNorthArrowPDF(doc, nX, nY);

      // ── Separador footer ─────────────────────────────────────
      const fy = myMm + mhMm + 4;
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.line(PAD, fy, W - PAD, fy);

      // ── Columna izquierda: Referencias ───────────────────────
      const activeLayers = window.MAP.getActiveLayers();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(80, 80, 80);
      doc.text('Referencias', PAD, fy + 5);

      let refY = fy + 9;
      Object.values(activeLayers).reverse().forEach(layer => {
        if (layer.visible === false) return;
        const color = layer.style?.fillColor || layer.style?.color || '#888888';
        const rgb   = hexToRgb(color);
        doc.setFillColor(rgb.r, rgb.g, rgb.b);
        doc.setDrawColor(rgb.r, rgb.g, rgb.b);
        doc.setLineWidth(0.2);
        doc.rect(PAD, refY - 2.5, 3.5, 3.5, 'FD');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(50, 50, 50);
        doc.text(layer.titulo || '', PAD + 5, refY);
        refY += 5;
      });

      // ── Columna derecha: escala, proyección, fuente ──────────
      const colR     = W / 2 + 4;
      const scale_m  = getMapScale(mapInst);
      const scaleStr = formatScale(scale_m);
      const niceKm   = niceScaleKm(scale_m, mwMm * 96 / 25.4, mapCanvas.width);
      const barMm    = Math.min(kmToPixelsOnOutput(niceKm, scale_m, mwMm * 96 / 25.4, mapCanvas.width) * 25.4 / 96, 60);

      // Barra gráfica
      const barY = fy + 5;
      doc.setFillColor(50, 50, 50);
      doc.rect(colR, barY, barMm, 2.5, 'F');
      // Mitad blanca
      doc.setFillColor(255, 255, 255);
      doc.rect(colR, barY, barMm / 2, 2.5, 'F');
      // Borde
      doc.setDrawColor(50, 50, 50);
      doc.setLineWidth(0.2);
      doc.rect(colR, barY, barMm, 2.5);
      // Etiquetas
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(50, 50, 50);
      doc.text('0', colR, barY + 4.5, { align: 'center' });
      doc.text(`${niceKm / 2} km`, colR + barMm / 2, barY + 4.5, { align: 'center' });
      doc.text(`${niceKm} km`, colR + barMm, barY + 4.5, { align: 'center' });

      // Escala numérica, proyección, fuente
      doc.setFontSize(6.5);
      doc.setTextColor(80, 80, 80);
      doc.text(`1:${scaleStr}`, colR, barY + 9);
      doc.text('EPSG 4326 (WGS 84)', colR, barY + 14);
      doc.text('Fuente: Instituto Geográfico Nacional', colR, barY + 19);

      // ── Guardar ───────────────────────────────────────────────
      const filename = sanitizeFilename(titulo || 'mapa') + '.pdf';
      doc.save(filename);
      window.TOAST.show('PDF exportado');

    } catch (err) {
      console.error('[EXPORT] Error PDF:', err);
      window.TOAST.show('Error al generar PDF: ' + err.message);
    }
  }

  function drawNorthArrowPDF(doc, x, y) {
    // Círculo de fondo
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.2);
    doc.circle(x, y + 4, 4, 'FD');
    // Flecha (triángulo hacia arriba)
    doc.setFillColor(26, 24, 20);
    doc.triangle(x, y + 1, x - 1.5, y + 4, x + 1.5, y + 4, 'F');
    // N
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.5);
    doc.setTextColor(26, 24, 20);
    doc.text('N', x, y + 7.2, { align: 'center' });
  }

  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    if (h.length === 3) {
      return { r: parseInt(h[0]+h[0], 16), g: parseInt(h[1]+h[1], 16), b: parseInt(h[2]+h[2], 16) };
    }
    return { r: parseInt(h.slice(0,2), 16), g: parseInt(h.slice(2,4), 16), b: parseInt(h.slice(4,6), 16) };
  }

  // ── HTML embebible — modal de configuración ─────────────────

  function toHTML() {
    const mapInst = window.MAP.getInstance();
    if (!mapInst) { window.TOAST.show('No hay mapa activo'); return; }

    const activeLayers = window.MAP.getActiveLayers();
    if (!Object.keys(activeLayers).length) { window.TOAST.show('No hay capas para exportar'); return; }

    const titulo    = document.getElementById('map-title')?.value || 'Mapa';
    const BASEMAPS  = window.MAP.getBasemaps();
    const curBase   = window.MAP.getCurrentBase?.() || 'gray';

    // ── Abrir modal ───────────────────────────────────────────
    document.getElementById('html-export-modal')?.remove();
    document.getElementById('html-export-backdrop')?.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'html-export-backdrop';
    backdrop.className = 'adv-modal-backdrop';
    document.body.appendChild(backdrop);

    const modal = document.createElement('div');
    modal.id = 'html-export-modal';
    modal.className = 'adv-modal';

    // Opciones de mapa base
    const basemapDefs = [
      { key: 'gray',      label: 'gris (arcgis)' },
      { key: 'dark',      label: 'oscuro (arcgis)' },
      { key: 'satellite', label: 'satelital (arcgis)' },
      { key: 'none',      label: 'sin mapa base' },
    ];

    // Filas de capas
    const layerRows = Object.entries(activeLayers).map(([key, l]) => `
      <label class="pfc-row html-layer-row" style="padding:5px 0">
        <input type="checkbox" data-key="${key}" checked />
        <span class="pfc-label" style="font-family:var(--font-sans);font-size:13px;color:var(--cream)">${escHtml(l.titulo || key)}</span>
      </label>`).join('');

    modal.innerHTML = `
      <div class="adv-modal-header">
        <span class="adv-modal-title">Embebido (html)</span>
        <button class="popup-close-btn" id="html-modal-close"><span class="material-icons">close</span></button>
      </div>
      <div class="adv-modal-body" style="gap:0">

        <div class="adv-body-row" style="padding-bottom:2px">
          <span class="adv-body-label">Capas</span>
          <div style="display:flex;flex-direction:column;gap:0;width:100%">${layerRows}</div>
        </div>

        <div class="adv-body-row">
          <span class="adv-body-label">Mapa base</span>
          <div class="adv-ramp-csel adv-field-csel" id="html-basemap-csel">
            <div class="adv-ramp-trigger adv-field-trigger" id="html-basemap-trigger">
              <span class="adv-field-selected" id="html-basemap-val">${basemapDefs.find(b=>b.key===curBase)?.label||basemapDefs[0].label}</span>
              <span class="adv-ramp-arrow">▾</span>
            </div>
            <div class="adv-ramp-dropdown hidden" id="html-basemap-dd">
              ${basemapDefs.map(b=>`<div class="adv-ramp-option adv-field-option${b.key===curBase?' selected':''}" data-key="${b.key}"><span class="adv-ramp-option-label">${b.label}</span></div>`).join('')}
            </div>
          </div>
        </div>

        <div class="adv-body-row" style="gap:8px">
          <span class="adv-body-label">Interfaz</span>
          <label class="pfc-row" style="padding:3px 0">
            <input type="checkbox" id="html-legend" checked />
            <span class="pfc-label" style="font-family:var(--font-sans);font-size:13px;color:var(--cream)">Mostrar leyenda</span>
          </label>

          <label class="pfc-row" style="padding:3px 0">
            <input type="checkbox" id="html-zoom" checked />
            <span class="pfc-label" style="font-family:var(--font-sans);font-size:13px;color:var(--cream)">Permitir zoom</span>
          </label>
        </div>

        <div class="adv-body-row">
          <span class="adv-body-label">Código</span>
          <div style="position:relative;width:100%">
            <textarea id="html-code-box" readonly
              style="width:100%;height:80px;resize:none;
                     background:var(--bg);border:0.5px solid var(--border-md);
                     border-radius:4px;padding:8px;
                     font-family:var(--font-mono);font-size:11px;color:var(--cream2);
                     outline:none;scrollbar-width:thin"
              placeholder="Generando código…"></textarea>
            <button id="html-copy-btn"
              style="position:absolute;top:8px;right:8px;
                     padding:5px 12px;border-radius:4px;border:0.5px solid var(--border-md);
                     background:var(--bg2);color:var(--cream2);
                     font-family:var(--font-sans);font-size:11px;cursor:pointer">
              Copiar
            </button>
          </div>

        </div>

      </div>
      <div class="adv-modal-footer" style="justify-content:flex-end;gap:8px">
        <button class="adv-footer-btn adv-accept" id="html-download-btn">Descargar</button>
      </div>`;

    document.body.appendChild(modal);

    function closeModal() { modal.remove(); backdrop.remove(); }
    modal.querySelector('#html-modal-close').addEventListener('click', closeModal);

    // Wire basemap csel
    let _selectedBase = curBase;
    const bTrigger = modal.querySelector('#html-basemap-trigger');
    const bDd      = modal.querySelector('#html-basemap-dd');
    const bArrow   = bTrigger?.querySelector('.adv-ramp-arrow');
    const bVal     = modal.querySelector('#html-basemap-val');
    bTrigger?.addEventListener('click', e => {
      e.stopPropagation();
      const isOpen = !bDd.classList.contains('hidden');
      bDd.classList.toggle('hidden', isOpen);
      if (bArrow) bArrow.classList.toggle('open', !isOpen);
    });
    bDd?.querySelectorAll('.adv-field-option').forEach(opt => {
      opt.addEventListener('click', e => {
        e.stopPropagation();
        bDd.querySelectorAll('.adv-field-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        _selectedBase = opt.dataset.key;
        if (bVal) bVal.textContent = opt.querySelector('.adv-ramp-option-label').textContent;
        bDd.classList.add('hidden');
        if (bArrow) bArrow.classList.remove('open');
        buildAndShow();
      });
    });
    setTimeout(() => {
      document.addEventListener('click', function bHandler(e) {
        if (!modal.querySelector('#html-basemap-csel')?.contains(e.target)) {
          bDd?.classList.add('hidden');
          bArrow?.classList.remove('open');
        }
      }, { passive: true });
    }, 0);
    backdrop.addEventListener('click', closeModal);

    // Generar código al cambiar opciones
    function buildAndShow() {
      const selectedKeys = [...modal.querySelectorAll('.html-layer-row input:checked')].map(i => i.dataset.key);
      const baseKey      = _selectedBase;
      const showLegend   = modal.querySelector('#html-legend').checked;
      const allowZoom    = modal.querySelector('#html-zoom').checked;

      const layers = selectedKeys
        .map(k => activeLayers[k])
        .filter(Boolean)
        .map((l, i, arr) => ({
          key:            Object.keys(activeLayers).find(k => activeLayers[k] === l),
          titulo:         l.titulo || '',
          geomType:       l.geomType || 'polygon',
          geojson:        l.geojson,
          style:          l.style || {},
          classification: l.classification || null
        }));

      const code = buildHTMLString(titulo, layers, baseKey, showLegend, collapsedDef, showNorth, allowZoom, mapInst);
      modal.querySelector('#html-code-box').value = code;
    }

    // Wirear cambios
    modal.querySelectorAll('input, select').forEach(el => el.addEventListener('change', buildAndShow));
    buildAndShow(); // Generar al abrir

    // Copiar
    modal.querySelector('#html-copy-btn').addEventListener('click', () => {
      const box = modal.querySelector('#html-code-box');
      box.select();
      navigator.clipboard?.writeText(box.value).catch(() => document.execCommand('copy'));
      window.TOAST.show('Código copiado');
    });

    // Descargar
    modal.querySelector('#html-download-btn').addEventListener('click', () => {
      const code = modal.querySelector('#html-code-box').value;
      if (!code) return;
      const blob = new Blob([code], { type: 'text/html;charset=utf-8' });
      downloadBlob(blob, sanitizeFilename(titulo) + '.html');
      window.TOAST.show('HTML descargado');
    });
  }

  // ── Constructor del HTML ──────────────────────────────────────

  function buildHTMLString(titulo, layers, baseKey, showLegend, collapsedDef, showNorth, allowZoom, mapInst) {
    const center = mapInst.getCenter();
    const zoom   = mapInst.getZoom();

    const BASEMAP_URLS = {
      gray:      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      dark:      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      none:      null
    };
    const tileUrl = BASEMAP_URLS[baseKey] || null;

    const layersJSON      = JSON.stringify(layers);
    const legendInit      = collapsedDef ? 'collapsed' : '';
    const legendDisplay   = showLegend   ? '' : 'display:none';
    const northDisplay    = showNorth    ? '' : 'display:none';
    const zoomOpts        = allowZoom    ? 'true' : 'false';
    const dragOpts        = allowZoom    ? '' : 'dragging.disable(); map.scrollWheelZoom.disable(); map.doubleClickZoom.disable(); map.touchZoom.disable();';
    const tileBlock       = tileUrl
      ? `L.tileLayer('${tileUrl}', { attribution: '© Esri', maxZoom: 19 }).addTo(map);`
      : '';

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(titulo)}</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    html,body{width:100%;height:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}
    #map{width:100%;height:100%;background:#e8e4de}
    #legend-panel{position:absolute;top:12px;right:12px;z-index:1000;background:rgba(255,255,255,0.96);border:0.5px solid rgba(0,0,0,0.12);border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.15);min-width:180px;max-width:240px;overflow:hidden;${legendDisplay}}
    #legend-header{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;cursor:pointer;user-select:none;border-bottom:0.5px solid rgba(0,0,0,0.08)}
    #legend-title{font-size:13px;font-weight:600;color:#1a1814;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #legend-toggle{width:20px;height:20px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#888;font-size:14px;transition:transform 0.2s}
    #legend-panel.collapsed #legend-toggle{transform:rotate(180deg)}
    #legend-body{padding:8px 12px 10px;display:flex;flex-direction:column;gap:6px;max-height:300px;overflow-y:auto}
    #legend-panel.collapsed #legend-body{display:none}
    .legend-item{display:flex;align-items:center;gap:8px}
    .legend-swatch{width:14px;height:14px;border-radius:2px;flex-shrink:0;border:0.5px solid rgba(0,0,0,0.15)}
    .legend-label{font-size:12px;color:#333;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    #legend-footer{padding:6px 12px 8px;border-top:0.5px solid rgba(0,0,0,0.06);font-size:10px;color:#999;line-height:1.5}
    #north-arrow{position:absolute;top:12px;left:12px;z-index:1000;background:rgba(255,255,255,0.9);border:0.5px solid rgba(0,0,0,0.12);border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;flex-direction:column;box-shadow:0 1px 6px rgba(0,0,0,0.12);${northDisplay}}
    #north-arrow .arrow{font-size:16px;color:#1a1814;line-height:1}
    #north-arrow .n-label{font-size:8px;font-weight:700;color:#1a1814;line-height:1}
  </style>
</head>
<body>
  <div id="map"></div>
  <div id="north-arrow"><span class="arrow">↑</span><span class="n-label">N</span></div>
  <div id="legend-panel" class="${legendInit}">
    <div id="legend-header" onclick="toggleLegend()">
      <span id="legend-title">${escHtml(titulo)}</span>
      <span id="legend-toggle">▾</span>
    </div>
    <div id="legend-body"></div>
    <div id="legend-footer">EPSG 4326 · Instituto Geográfico Nacional</div>
  </div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <script>
    const D=${layersJSON};
    const map=L.map('map',{center:[${center.lat.toFixed(6)},${center.lng.toFixed(6)}],zoom:${zoom},zoomControl:${zoomOpts}});
    ${dragOpts}
    ${tileBlock}
    function ps(s){return{fillColor:s.fillColor||'#c8622a',fillOpacity:s.fillOpacity??0.5,color:s.color||s.fillColor||'#c8622a',weight:s.weight??1.5,opacity:s.opacity??1}}
    function ls(s){const t={color:s.color||'#c8622a',weight:s.weight??2,opacity:s.opacity??1};if(s.dashArray)t.dashArray=s.dashArray;return t}
    function pts(s){return{radius:s.radius??5,fillColor:s.fillColor||'#c8622a',fillOpacity:s.fillOpacity??0.85,color:s.color||'#fff',weight:s.weight??1.5,opacity:s.opacity??1}}
    function fs(g,b,cl,p){if(!cl?.colorMap)return g==='point'?pts(b):g==='line'?ls(b):ps(b);const c=cl.colorMap[p?.[cl.field]];if(!c)return{opacity:0,fillOpacity:0,weight:0,radius:0};const m={...b,...(cl.styleMap?.[p?.[cl.field]]||{}),fillColor:c,color:c};return g==='point'?pts(m):g==='line'?ls(m):ps(m)}
    const lb=document.getElementById('legend-body');
    function ai(c,l){const i=document.createElement('div');i.className='legend-item';i.innerHTML='<span class="legend-swatch" style="background:'+c+'"></span><span class="legend-label">'+l+'</span>';lb.appendChild(i)}
    D.forEach(l=>{
      if(!l.classification?.colorMap)ai(l.style?.fillColor||l.style?.color||'#888',l.titulo);
      else Object.entries(l.classification.colorMap).forEach(([v,c])=>ai(c,v));
      L.geoJSON(l.geojson,{style:f=>fs(l.geomType,l.style,l.classification,f.properties),pointToLayer:(f,ll)=>L.circleMarker(ll,fs('point',l.style,l.classification,f.properties))}).addTo(map);
    });
    function toggleLegend(){document.getElementById('legend-panel').classList.toggle('collapsed')}
  <\/script>
</body>
</html>`;
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

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

  return { toGeoJSON, toJPEG, toPDF, toHTML };

})();

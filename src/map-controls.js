/**
 * map-controls.js — Divisor redimensionable y visibilidad del mapa
 *
 * Depende de: window.MAP
 */

window.MAP_CONTROLS = (() => {

  let _dividerInited = false;

  function initResizeDivider() {
    if (_dividerInited) return;
    _dividerInited = true;
    const divider  = document.getElementById('resize-divider');
    const chat     = document.getElementById('chat-panel');
    const mapPanel = document.getElementById('map-panel');
    let dragging   = false, startX = 0, startChatW = 0, startMapW = 0;

    divider?.addEventListener('mousedown', e => {
      dragging     = true;
      startX       = e.clientX;
      startChatW   = chat.offsetWidth;
      startMapW    = mapPanel.offsetWidth;
      chat.style.flex     = 'none';
      mapPanel.style.flex = 'none';
      chat.style.width     = startChatW + 'px';
      mapPanel.style.width = startMapW  + 'px';
      chat.style.maxWidth  = 'none';
      divider.classList.add('dragging');
      document.body.style.cursor     = 'col-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      const minChat = 280, minMap = 280;
      const delta   = e.clientX - startX;
      const maxDelta =  startMapW  - minMap;
      const minDelta = -(startChatW - minChat);
      const clamped  = Math.min(Math.max(delta, minDelta), maxDelta);
      chat.style.width     = (startChatW + clamped) + 'px';
      mapPanel.style.width = (startMapW  - clamped) + 'px';
      window.MAP.getInstance()?.invalidateSize();
    });

    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      divider?.classList.remove('dragging');
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
      mapPanel.style.flex  = '1';
      mapPanel.style.width = '';
    });
  }

  function resetDivider() {
    _dividerInited = false;
  }

  function setMapVisible(visible) {
    const panel   = document.getElementById('map-panel');
    const chat    = document.getElementById('chat-panel');
    const divider = document.getElementById('resize-divider');

    if (panel) panel.style.display = visible ? 'flex' : 'none';
    const layersBtn  = document.getElementById('btn-map-layers');
    const identifyBtn = document.getElementById('btn-identify');
    const legend     = document.getElementById('map-legend');
    if (layersBtn)  layersBtn.style.display  = visible ? '' : 'none';
    if (identifyBtn) identifyBtn.style.display = visible ? '' : 'none';
    if (legend)     legend.style.display     = visible ? '' : 'none';

    if (visible) {
      chat?.classList.add('with-map');
      divider?.classList.add('visible');
      window.MAP.init();
      initResizeDivider();
      requestAnimationFrame(() => window.MAP.getInstance()?.invalidateSize());
      setTimeout(() => window.MAP.getInstance()?.invalidateSize(), 150);
      setTimeout(() => window.MAP.getInstance()?.invalidateSize(), 400);
    } else {
      chat?.classList.remove('with-map');
      divider?.classList.remove('visible');
      if (chat) { chat.style.width = ''; chat.style.flex = ''; }
      const mapPanel = document.getElementById('map-panel');
      if (mapPanel) { mapPanel.style.width = ''; mapPanel.style.flex = ''; }
    }
  }

  return { setMapVisible, initResizeDivider, resetDivider };

})();

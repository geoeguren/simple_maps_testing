/**
 * settings.js — Preferencias del usuario
 * Dropdown desde el avatar en el sidebar
 */

window.SETTINGS = (() => {

  const KEY = 'sm_settings';

  const defaults = {
    theme: 'auto',
    tone:  'default',
    model: 'auto'
  };

  function load() {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
    catch { return { ...defaults }; }
  }
  function save(prefs) { localStorage.setItem(KEY, JSON.stringify(prefs)); }
  function get(key)    { return load()[key] ?? defaults[key]; }

  function set(key, value) {
    const prefs = load();
    prefs[key] = value;
    save(prefs);
    if (key === 'theme') applyTheme(value);
  }

  function applyTheme(theme) {
    let mode;
    if (theme === 'auto') {
      const h = new Date().getHours();
      mode = h >= 7 && h < 20 ? 'day' : 'night';
    } else {
      mode = theme === 'light' ? 'day' : 'night';
    }
    THEME.apply(mode);
    try {
      const curBase = window.MAP?.getCurrentBase?.();
      if (!curBase || curBase === 'gray' || curBase === 'dark') {
        window.MAP?.setBasemap?.(mode === 'day' ? 'gray' : 'dark');
      }
    } catch (e) {}
  }

  function init() { applyTheme(get('theme')); }

  // ── Dropdown ──────────────────────────────────────────────────

  function openFromBtn(btnEl) {
    const existing = document.getElementById('settings-dropdown');
    if (existing) { existing.remove(); return; }

    const prefs = load();
    const user  = window.AUTH?.currentUser();

    const dropdown = document.createElement('div');
    dropdown.id = 'settings-dropdown';
    dropdown.className = 'settings-dropdown';

    dropdown.innerHTML = `
      ${user ? `
      <div class="sd-user-header">
        <span class="sd-user-name">${esc(user.name || '')}</span>
        <span class="sd-user-email">${esc(user.email || '')}</span>
      </div>` : ''}

      <div class="sd-section">
        <p class="sd-section-label">Aspecto</p>
        ${radio('theme', 'auto',  'access_time', 'Sistema',  prefs)}
        ${radio('theme', 'light', 'light_mode', 'Claro',    prefs)}
        ${radio('theme', 'dark',  'dark_mode',  'Oscuro',   prefs)}
      </div>

      <div class="sd-section">
        <p class="sd-section-label">Modelo de IA</p>
        ${radio('model', 'auto',     '', 'Auto',                   prefs)}
        ${radio('model', 'cerebras', '', 'qwen-3-235b',            prefs)}
        ${radio('model', 'groq',     '', 'llama-3.3-70b-versatile', prefs)}
        ${radio('model', 'gemini',   '', 'gemini-2.5-flash',        prefs)}
      </div>

      <div class="sd-section">
        <p class="sd-section-label">Estilo</p>
        ${radio('tone', 'default',    'lightbulb',      'Predeterminado', prefs)}
        ${radio('tone', 'eficiente',  'bolt',           'Eficiente',      prefs)}
        ${radio('tone', 'detallista', 'biotech',        'Detallista',     prefs)}
        ${radio('tone', 'creativo',   'auto_fix_high',  'Creativo',       prefs)}
      </div>

      <div class="sd-divider"></div>

      <button class="sd-logout" id="sd-logout-btn">
        <span class="material-icons">logout</span>Cerrar sesión
      </button>
    `;

    document.body.appendChild(dropdown);

    // Posicionar arriba del botón
    const rect  = btnEl.getBoundingClientRect();
    const dropH = dropdown.offsetHeight;
    let top  = rect.top - dropH - 8;
    let left = rect.left;
    if (top < 8) top = rect.bottom + 8;
    left = Math.min(left, window.innerWidth - dropdown.offsetWidth - 8);
    left = Math.max(8, left);
    dropdown.style.top  = top + 'px';
    dropdown.style.left = left + 'px';

    // Eventos de radio
    dropdown.querySelectorAll('.sd-radio-row').forEach(row => {
      row.addEventListener('click', () => {
        const k = row.dataset.key;
        const v = row.dataset.val;
        // Desmarcar otros del mismo grupo
        dropdown.querySelectorAll(`.sd-radio-row[data-key="${k}"]`).forEach(r => {
          r.querySelector('.sd-toggle')?.classList.remove('on');
        });
        row.querySelector('.sd-toggle')?.classList.add('on');
        set(k, v);
      });
    });

    dropdown.querySelector('#sd-logout-btn').addEventListener('click', () => {
      dropdown.remove();
      window.AUTH?.logout();
    });

    const openedAt = Date.now();
    setTimeout(() => {
      document.addEventListener('click', function handler(e) {
        if (Date.now() - openedAt < 150) return; // ignorar el click de apertura
        if (!dropdown.contains(e.target) && e.target !== btnEl && !btnEl.contains(e.target)) {
          dropdown.remove();
          document.removeEventListener('click', handler);
        }
      });
    }, 0);
  }

  function radio(key, val, icon, label, prefs, hint) {
    const on = prefs[key] === val ? 'on' : '';
    const iconHtml = icon ? `<span class="material-icons sd-row-icon">${icon}</span>` : '';
    const hintHtml = hint ? `<span class="sd-row-hint">${hint}</span>` : '';
    return `
      <div class="sd-radio-row" data-key="${key}" data-val="${val}">
        <div class="sd-row-left">
          ${iconHtml}
          <div class="sd-row-text">
            <span class="sd-row-label">${label}</span>
            ${hintHtml}
          </div>
        </div>
        <div class="sd-toggle ${on}"></div>
      </div>
    `;
  }

  function esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return { open: openFromBtn, openFromBtn, get, set, init, load };

})();

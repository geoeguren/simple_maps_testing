/**
 * settings.js — Preferencias del usuario
 * Dropdown desde el avatar en el sidebar
 */

window.SETTINGS = (() => {

  const KEY = 'sm_settings';

  const defaults = {
    theme:  'auto',
    lang:   'es-419',
    model:  'auto',
    tone:   'default',
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

  // ── Opciones de cada sección ──────────────────────────────────

  const SECTIONS = [
    {
      key: 'theme',
      label: 'Aspecto',
      options: [
        { val: 'auto',  icon: 'access_time', label: 'Sistema' },
        { val: 'light', icon: 'light_mode',  label: 'Claro'   },
        { val: 'dark',  icon: 'dark_mode',   label: 'Oscuro'  },
      ]
    },
    {
      key: 'lang',
      label: 'Idioma',
      options: [
        { val: 'en-US',  label: 'English (United States)',  disabled: true  },
        { val: 'es-ES',  label: 'Español (España)',         disabled: true  },
        { val: 'es-419', label: 'Español (Latinoamérica)',  disabled: false },
        { val: 'fr-FR',  label: 'Français (France)',        disabled: true  },
        { val: 'pt-BR',  label: 'Português (Brasil)',       disabled: true  },
      ]
    },
    {
      key: 'model',
      label: 'Modelo de IA',
      options: [
        { val: 'auto',     label: 'Auto'                    },
        { val: 'cerebras', label: 'qwen-3-235b'             },
        { val: 'groq',     label: 'llama-3.3-70b-versatile' },
        { val: 'gemini',   label: 'gemini-2.5-flash'        },
      ]
    },
    {
      key: 'tone',
      label: 'Estilo de respuesta',
      options: [
        { val: 'default',    icon: 'lightbulb',     label: 'Predeterminado' },
        { val: 'eficiente',  icon: 'bolt',          label: 'Eficiente'      },
        { val: 'detallista', icon: 'biotech',       label: 'Detallista'     },
        { val: 'creativo',   icon: 'auto_fix_high', label: 'Creativo'       },
      ]
    },
  ];

  // ── Helpers ───────────────────────────────────────────────────

  function esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function labelFor(key, val) {
    const sec = SECTIONS.find(s => s.key === key);
    const opt = sec?.options.find(o => o.val === val);
    return opt ? opt.label : val;
  }

  // ── Construir sección acordeón ────────────────────────────────

  function buildSection(sec, prefs) {
    const current = prefs[sec.key] ?? defaults[sec.key];
    const currentOpt = sec.options.find(o => o.val === current);
    const currentLabel = currentOpt?.label || current;
    const currentIcon  = currentOpt?.icon
      ? `<span class="material-icons sd-acc-icon">${currentOpt.icon}</span>` : '';

    const optionsHtml = sec.options.map(o => {
      const active  = o.val === current ? ' active' : '';
      const dis     = o.disabled ? ' sd-acc-opt-disabled' : '';
      const iconHtml = o.icon ? `<span class="material-icons sd-acc-icon">${o.icon}</span>` : '';
      return `<div class="sd-acc-option${active}${dis}" data-key="${sec.key}" data-val="${esc(o.val)}">
        ${iconHtml}<span>${esc(o.label)}</span>
      </div>`;
    }).join('');

    return `
      <div class="sd-acc-section" data-key="${sec.key}">
        <div class="sd-acc-header">
          <span class="sd-acc-label">${esc(sec.label)}</span>
          <div class="sd-acc-value">
            ${currentIcon}<span>${esc(currentLabel)}</span>
            <span class="sd-acc-arrow material-icons">expand_more</span>
          </div>
        </div>
        <div class="sd-acc-body hidden">
          ${optionsHtml}
        </div>
      </div>`;
  }

  // ── Dropdown principal ────────────────────────────────────────

  function openFromBtn(btnEl) {
    const existing = document.getElementById('settings-dropdown');
    if (existing) { existing.remove(); return; }

    const prefs = load();
    const user  = window.AUTH?.currentUser();

    const dropdown = document.createElement('div');
    dropdown.id        = 'settings-dropdown';
    dropdown.className = 'settings-dropdown';

    dropdown.innerHTML = `
      ${user ? `
      <div class="sd-user-header">
        <span class="sd-user-name">${esc(user.name || '')}</span>
        <span class="sd-user-email">${esc(user.email || '')}</span>
      </div>` : ''}

      <div class="sd-acc-wrap">
        ${SECTIONS.map(s => buildSection(s, prefs)).join('')}
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

    // ── Wire acordeones ───────────────────────────────────────
    dropdown.querySelectorAll('.sd-acc-section').forEach(sec => {
      const header = sec.querySelector('.sd-acc-header');
      const body   = sec.querySelector('.sd-acc-body');
      const arrow  = sec.querySelector('.sd-acc-arrow');

      header.addEventListener('click', () => {
        const isOpen = !body.classList.contains('hidden');

        // Cerrar todos los acordeones
        dropdown.querySelectorAll('.sd-acc-section').forEach(s => {
          s.querySelector('.sd-acc-body').classList.add('hidden');
          s.querySelector('.sd-acc-arrow').classList.remove('open');
          s.querySelector('.sd-acc-header').classList.remove('active');
        });

        // Si estaba cerrado, abrir este
        if (!isOpen) {
          body.classList.remove('hidden');
          arrow.classList.add('open');
          header.classList.add('active');
        }

        // Recalcular posición — el dropdown crece hacia arriba
        const r = btnEl.getBoundingClientRect();
        const h = dropdown.offsetHeight;
        let newTop = r.top - h - 8;
        if (newTop < 8) newTop = r.bottom + 8;
        dropdown.style.top = newTop + 'px';
      });

      // Wire opciones
      body.querySelectorAll('.sd-acc-option:not(.sd-acc-opt-disabled)').forEach(opt => {
        opt.addEventListener('click', () => {
          const key = opt.dataset.key;
          const val = opt.dataset.val;
          set(key, val);

          // Actualizar valor mostrado en el header
          const secDef    = SECTIONS.find(s => s.key === key);
          const selOpt    = secDef?.options.find(o => o.val === val);
          const iconHtml  = selOpt?.icon
            ? `<span class="material-icons sd-acc-icon">${selOpt.icon}</span>` : '';
          sec.querySelector('.sd-acc-value').innerHTML =
            `${iconHtml}<span>${esc(selOpt?.label || val)}</span>
             <span class="sd-acc-arrow material-icons open">expand_more</span>`;

          // Re-wirear la flecha
          sec.querySelector('.sd-acc-arrow').classList.add('open');

          // Marcar opción activa
          body.querySelectorAll('.sd-acc-option').forEach(o => o.classList.remove('active'));
          opt.classList.add('active');
        });
      });
    });

    dropdown.querySelector('#sd-logout-btn').addEventListener('click', () => {
      dropdown.remove();
      window.AUTH?.logout();
    });

    // Cerrar al click afuera
    const openedAt = Date.now();
    setTimeout(() => {
      document.addEventListener('click', function handler(e) {
        if (Date.now() - openedAt < 150) return;
        if (!dropdown.contains(e.target) && e.target !== btnEl && !btnEl.contains(e.target)) {
          dropdown.remove();
          document.removeEventListener('click', handler);
        }
      });
    }, 0);
  }

  return { open: openFromBtn, openFromBtn, get, set, init, load };

})();

/**
 * sidebar.js — Menú lateral
 */

window.SIDEBAR = (() => {

  let expanded      = false;
  let currentUser   = null;
  let currentChatId = null;
  let chats         = [];
  let _pendingChatId = null;

  function render() {
    const html = buildHTML();
    ['sidebar', 'sidebar-home'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = html;
        el.classList.toggle('expanded', expanded);
      }
    });
    if (!document._sbWiredV2) wireEvents();
  }

  function buildHTML() {
    return `
      <div class="sidebar-top">
        <div class="sb-header-row">
          <button class="sb-ib sb-action" data-action="toggle" title="Menú">
            <span class="material-icons">menu</span>
          </button>
        </div>
        <button class="sb-rb sb-action" data-action="new">
          <span class="material-icons">add</span>
          <span class="sb-rb-label">Nuevo mapa</span>
        </button>
        <button class="sb-rb sb-action" data-action="search">
          <span class="material-icons">search</span>
          <span class="sb-rb-label">Buscar</span>
        </button>
      </div>

      <div class="sidebar-mid">
        ${currentUser ? '<div class="sb-forum-icon"><span class="material-icons">forum</span></div>' : ''}
        ${currentUser ? '<span class="sb-section-title">Recientes</span>' : ''}
        ${buildChatsList()}
      </div>

      <div class="sidebar-bottom">
        ${currentUser ? buildUserArea() : buildLoginBtn()}
      </div>
    `;
  }

  function buildChatsList() {
    if (!currentUser) return '<button class="sb-chat-item" style="pointer-events:none;opacity:0">—</button>';
    if (!chats.length) return '<span class="sb-section-title" style="text-transform:none;font-size:13px">No hay chats todavía</span>';
    return chats.map(chat => `
      <div class="sb-chat-row ${chat.id === currentChatId ? 'active' : ''}">
        <button class="sb-chat-item sb-action"
                data-action="loadchat" data-id="${chat.id}">
          ${esc(chat.titulo || 'Sin título')}
        </button>
        <button class="sb-chat-toggle sb-action" data-action="chattoggle"
                data-id="${chat.id}" data-titulo="${esc(chat.titulo || 'Sin título')}" title="Opciones">
          <span class="material-icons">expand_more</span>
        </button>
      </div>
    `).join('');
  }

  function buildUserArea() {
    const name  = currentUser.name || currentUser.email || '';
    const photo = currentUser.photo;
    const avatar = photo
      ? '<img src="' + photo + '" class="sb-avatar" />'
      : '<span class="material-icons sb-avatar-icon">account_circle</span>';
    return `
      <button class="sb-user-row sb-action" data-action="userconfig" id="sb-user-row-btn">
        ${avatar}
        <span class="sb-username">${esc(name)}</span>
      </button>
    `;
  }

  function buildLoginBtn() {
    return `
      <button class="sb-rb sb-action" data-action="login">
        <span class="material-icons">login</span>
        <span class="sb-rb-label">Iniciar sesión</span>
      </button>
    `;
  }

  // ── Eventos ───────────────────────────────────────────────────

  function wireEvents() {
    if (document._sbWiredV2) return;
    document._sbWiredV2 = true;
    document.addEventListener('click', e => {
      const btn = e.target.closest('.sb-action');
      if (!btn) return;
      const action = btn.dataset.action;
      if (!action) return;
      switch (action) {
        case 'toggle':     toggleExpanded(); break;
        case 'new':        window.APP && window.APP.newMap(); break;
        case 'search':     SEARCH.open(); break;
        case 'login':      handleLogin(); break;
        case 'userconfig': e.stopPropagation(); SETTINGS.openFromBtn(btn); break;
        case 'loadchat':   loadChat(btn.dataset.id); break;
        case 'chattoggle': toggleChatOpts(btn.dataset.id, btn); break;
        case 'renamechat': renameChatInline(btn.dataset.id, btn.dataset.titulo); break;
        case 'deletechat': confirmDeleteModal(btn.dataset.id, btn.dataset.titulo); break;
      }
    });
  }

  function toggleExpanded() {
    expanded = !expanded;
    document.querySelectorAll('.sidebar').forEach(el => el.classList.toggle('expanded', expanded));
    document.getElementById('screen-home') && document.getElementById('screen-home').classList.toggle('sidebar-expanded', expanded);
    if (!expanded) {
      var dd = document.getElementById('chat-opts-dropdown');
      if (dd) dd.remove();
      document.querySelectorAll('.sb-chat-toggle .material-icons').forEach(function(i) { i.textContent = 'expand_more'; });
    }
  }

  // ── Dropdown de opciones de chat ──────────────────────────────

  function toggleChatOpts(chatId, btnEl) {
    var icon = btnEl.querySelector('.material-icons');

    var existing = document.getElementById('chat-opts-dropdown');
    if (existing) {
      existing.remove();
      document.querySelectorAll('.sb-chat-toggle .material-icons').forEach(function(i) { i.textContent = 'expand_more'; });
      if (existing.dataset.chatId === chatId) return;
    }

    var chat = chats.find(function(c) { return c.id === chatId; });
    if (!chat) return;

    var dropdown = document.createElement('div');
    dropdown.id = 'chat-opts-dropdown';
    dropdown.dataset.chatId = chatId;
    dropdown.className = 'settings-dropdown chat-opts-dropdown';
    dropdown.innerHTML =
      '<button class="sb-chat-opt sb-action" data-action="renamechat"' +
      ' data-id="' + chatId + '" data-titulo="' + esc(chat.titulo || 'Sin título') + '">' +
      '<span class="material-icons" style="font-size:15px">edit</span>Renombrar</button>' +
      '<button class="sb-chat-opt sb-chat-opt-danger sb-action" data-action="deletechat"' +
      ' data-id="' + chatId + '" data-titulo="' + esc(chat.titulo || 'Sin título') + '">' +
      '<span class="material-icons" style="font-size:15px">delete</span>Eliminar</button>';

    document.body.appendChild(dropdown);

    var sidebar = document.querySelector('.sidebar.expanded') || document.querySelector('.sidebar');
    var sRect   = sidebar ? sidebar.getBoundingClientRect() : null;
    var ddW     = dropdown.offsetWidth;
    var btnRect = btnEl.getBoundingClientRect();
    var left    = sRect
      ? Math.max(8, sRect.left + (sRect.width - ddW) / 2)
      : Math.max(8, btnRect.left + btnRect.width / 2 - ddW / 2);

    dropdown.style.top  = (btnRect.bottom + 6) + 'px';
    dropdown.style.left = left + 'px';

    if (icon) icon.textContent = 'expand_less';

    function close() {
      dropdown.remove();
      if (icon) icon.textContent = 'expand_more';
      document.removeEventListener('mousedown', onOutside);
    }

    function onOutside(e) {
      if (!dropdown.contains(e.target) && !btnEl.contains(e.target)) close();
    }
    setTimeout(function() { document.addEventListener('mousedown', onOutside); }, 0);

    dropdown.querySelectorAll('.sb-action').forEach(function(el) {
      el.addEventListener('click', close);
    });
  }

  // ── Auth ──────────────────────────────────────────────────────

  function handleLogin() {
    window.AUTH.loginWithGoogle().catch(function(err) {
      TOAST.show('Error al iniciar sesión');
      console.error('[SIDEBAR] Login error:', err.code, err.message);
    });
  }

  // ── Chats ─────────────────────────────────────────────────────

  async function loadUserChats(user) {
    try {
      chats = await window.FB.getUserChats(user.uid);
      render();
      if (_pendingChatId) {
        var pending = _pendingChatId;
        _pendingChatId = null;
        loadChat(pending);
      }
    } catch (err) {
      console.error('[SIDEBAR] Error cargando chats:', err);
    }
  }

  async function loadChat(chatId) {
    try {
      var user = window.AUTH && window.AUTH.currentUser();
      if (!user) return;
      var chat = await window.FB.getChat(user.uid, chatId);
      if (!chat) return;
      // Actualizar cache
      var idx = chats.findIndex(function(c) { return c.id === chatId; });
      if (idx >= 0) chats[idx] = chat;
      currentChatId = chatId;
      render();
      window.APP && window.APP.restoreChat(chat);
    } catch (e) {
      console.error('[SIDEBAR] Error cargando chat:', e);
    }
  }

  async function renameChatInline(chatId, currentTitulo) {
    var newTitulo = prompt('Renombrar chat:', currentTitulo);
    if (!newTitulo || newTitulo.trim() === currentTitulo) return;
    try {
      var user = window.AUTH && window.AUTH.currentUser();
      if (!user) return;
      await window.FB.updateChat(user.uid, chatId, { titulo: newTitulo.trim() });
      var chat = chats.find(function(c) { return c.id === chatId; });
      if (chat) chat.titulo = newTitulo.trim();
      render();
      if (chatId === currentChatId) window.APP && window.APP.setChatHeader(newTitulo.trim());
      TOAST.show('Chat renombrado');
    } catch (e) {
      TOAST.show('Error al renombrar');
    }
  }

  async function confirmDeleteModal(chatId, titulo) {
    var modal    = document.getElementById('delete-modal');
    var titleEl  = document.getElementById('delete-modal-title');
    if (titleEl) titleEl.textContent = '¿Eliminar "' + titulo + '"?';

    if (modal) {
      modal.classList.add('open');
      var confirmBtn = document.getElementById('delete-modal-confirm');
      var cancelBtn  = document.getElementById('delete-modal-cancel');
      function closeModal() { modal.classList.remove('open'); }

      async function onConfirm() {
        closeModal();
        confirmBtn.removeEventListener('click', onConfirm);
        cancelBtn.removeEventListener('click', onCancel);
        await deleteChat(chatId);
      }
      function onCancel() {
        closeModal();
        confirmBtn.removeEventListener('click', onConfirm);
        cancelBtn.removeEventListener('click', onCancel);
      }
      confirmBtn && confirmBtn.addEventListener('click', onConfirm);
      cancelBtn  && cancelBtn.addEventListener('click', onCancel);
    } else {
      if (confirm('¿Eliminar "' + titulo + '"?')) await deleteChat(chatId);
    }
  }

  async function deleteChat(chatId) {
    try {
      var user = window.AUTH && window.AUTH.currentUser();
      if (!user) return;
      await window.FB.deleteChat(user.uid, chatId);
      chats = chats.filter(function(c) { return c.id !== chatId; });
      if (chatId === currentChatId) {
        currentChatId = null;
        window.APP && window.APP.newMap();
      }
      render();
      TOAST.show('Chat eliminado');
    } catch (e) {
      TOAST.show('Error al eliminar');
    }
  }

  function refreshChats() { if (currentUser) loadUserChats(currentUser); }

  function esc(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function setUser(user) {
    currentUser = user;
    if (user) loadUserChats(user);
    else { chats = []; render(); }
  }

  function setChatId(id) {
    currentChatId = id;
    render();
  }

  function loadChatById(id) {
    if (chats.length) loadChat(id);
    else _pendingChatId = id;
  }

  function updateCachedChat(chatId, data) {
    const chat = chats.find(c => c.id === chatId);
    if (chat) Object.assign(chat, data);
  }

  return { render, setUser, setChatId, refreshChats, loadChatById, updateCachedChat };

})();

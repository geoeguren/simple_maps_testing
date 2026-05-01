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
      <div class="sb-chat-row ${chat.id === currentChatId ? 'active' : ''}" data-chatid="${chat.id}">
        <button class="sb-chat-item sb-action"
                data-action="loadchat" data-id="${chat.id}">
          ${esc(chat.titulo || 'Sin título')}
        </button>
        <input class="sb-chat-rename-input" type="text"
               value="${esc(chat.titulo || 'Sin título')}"
               data-id="${chat.id}" data-original="${esc(chat.titulo || 'Sin título')}"
               autocomplete="off" />
        <button class="sb-chat-delete sb-action" data-action="deletechat"
                data-id="${chat.id}" data-titulo="${esc(chat.titulo || 'Sin título')}" title="Eliminar chat">
          <span class="material-icons">delete</span>
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
        case 'renamechat': renameChatInline(btn.dataset.id, btn.dataset.titulo); break;
        case 'deletechat': confirmDeleteModal(btn.dataset.id, btn.dataset.titulo); break;
      }
    });

    // Doble click en el label del chat → activar input inline
    document.addEventListener('dblclick', e => {
      const item = e.target.closest('.sb-chat-item');
      if (!item) return;
      const row = item.closest('.sb-chat-row');
      if (!row) return;
      activateSidebarRename(row);
    });
  }

  function activateSidebarRename(row) {
    const item  = row.querySelector('.sb-chat-item');
    const input = row.querySelector('.sb-chat-rename-input');
    if (!input || !item) return;
    item.style.display  = 'none';
    input.style.display = 'block';
    input.focus();
    input.select();

    function commitRename() {
      const newTitulo = input.value.trim();
      const original  = input.dataset.original || '';
      item.style.display  = '';
      input.style.display = 'none';
      if (!newTitulo || newTitulo === original) { input.value = original; return; }
      renameChatInline(input.dataset.id, original, newTitulo);
    }

    input.onblur = commitRename;
    input.onkeydown = e => {
      if (e.key === 'Enter')  { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { input.value = input.dataset.original || ''; input.blur(); }
    };
  }

  function toggleExpanded() {
    expanded = !expanded;
    document.querySelectorAll('.sidebar').forEach(el => el.classList.toggle('expanded', expanded));
    document.getElementById('screen-home') && document.getElementById('screen-home').classList.toggle('sidebar-expanded', expanded);
  }

  // ── Auth ──────────────────────────────────────────────────────

  function handleLogin() {
    window.AUTH.loginWithGoogle().catch(function(err) {
      TOAST.error('Error al iniciar sesión.');
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
      TOAST.error('No se pudieron cargar los chats.');
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
      TOAST.error('No se pudo cargar el chat.');
    }
  }

  async function renameChatInline(chatId, currentTitulo, newTitulo) {
    if (newTitulo === undefined) {
      // Fallback: prompt (legacy, no se usa más)
      newTitulo = prompt('Renombrar chat:', currentTitulo);
    }
    if (!newTitulo || newTitulo.trim() === currentTitulo) return;
    try {
      var user = window.AUTH && window.AUTH.currentUser();
      if (!user) return;
      await window.FB.updateChat(user.uid, chatId, { titulo: newTitulo.trim() });
      var chat = chats.find(function(c) { return c.id === chatId; });
      if (chat) chat.titulo = newTitulo.trim();
      render();
      if (chatId === currentChatId) window.APP && window.APP.setChatHeader(newTitulo.trim());
    } catch (e) {
      TOAST.error('Error al renombrar.');
    }
  }

  async function confirmDeleteModal(chatId, titulo) {
    if (window.CHAT_HEADER && window.CHAT_HEADER.showDeleteConfirm) {
      window.CHAT_HEADER.showDeleteConfirm(titulo, () => deleteChat(chatId));
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
      TOAST.success('Chat eliminado.');
    } catch (e) {
      TOAST.error('Error al eliminar.');
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

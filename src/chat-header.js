/**
 * chat-header.js — Barra de título del chat, renombrar y eliminar
 *
 * Depende de: window.AUTH, window.FB, window.CHAT, window.SIDEBAR,
 *             window.TOAST, window.APP (newMap)
 */

window.CHAT_HEADER = (() => {

  function setChatHeader(titulo) {
    const bar   = document.getElementById('chat-header-bar');
    const title = document.getElementById('chat-header-title');
    if (!bar || !title) return;
    title.value = titulo || '';
    title.dataset.original = titulo || '';
    bar.style.display = titulo ? 'flex' : 'none';
  }

  function startRename(newName) {
    const user   = window.AUTH?.currentUser();
    const chatId = window.CHAT?.getChatId();
    if (!user || !chatId) return;
    window.FB.updateChat(user.uid, chatId, { titulo: newName })
      .then(() => {
        const title = document.getElementById('chat-header-title');
        if (title) title.dataset.original = newName;
        window.SIDEBAR.refreshChats();
      })
      .catch(() => {
        const title = document.getElementById('chat-header-title');
        if (title) title.value = title.dataset.original || '';
        window.TOAST.error('Error al renombrar.');
      });
  }

  function deleteCurrentChat() {
    const user   = window.AUTH?.currentUser();
    const chatId = window.CHAT?.getChatId();
    if (!user || !chatId) return;
    const titulo = document.getElementById('chat-header-title')?.value || 'este chat';
    showDeleteConfirm(titulo, async () => {
      try {
        await window.FB.deleteChat(user.uid, chatId);
        window.SIDEBAR.refreshChats();
        window.APP.newMap();
        window.TOAST.success('Chat eliminado.');
      } catch { window.TOAST.error('Error al eliminar.'); }
    });
  }

  function showDeleteConfirm(titulo, onConfirm) {
    document.getElementById('delete-confirm-modal')?.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'delete-confirm-modal';
    backdrop.className = 'search-modal-backdrop open';
    backdrop.style.zIndex = '400';

    const modal = document.createElement('div');
    modal.className = 'delete-confirm-box';
    modal.innerHTML = `
      <p class="delete-confirm-title">Eliminar chat</p>
      <div class="delete-confirm-divider"></div>
      <p class="delete-confirm-body">¿Estás seguro que querés eliminar este chat?<br>Esta acción no se puede deshacer.</p>
      <div class="delete-confirm-btns">
        <button class="delete-confirm-cancel">Cancelar</button>
        <button class="delete-confirm-ok">Eliminar</button>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    modal.querySelector('.delete-confirm-cancel').addEventListener('click', () => backdrop.remove());
    backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });
    modal.querySelector('.delete-confirm-ok').addEventListener('click', () => {
      backdrop.remove();
      onConfirm();
    });
  }

  function wireEvents() {
    // Doble click en el título para editar
    document.getElementById('chat-header-title')
      ?.addEventListener('dblclick', () => startRename());

    const titleInput = document.getElementById('chat-header-title');
    if (titleInput) {
      titleInput.addEventListener('keydown', e => {
        if (e.key === 'Enter')  { e.preventDefault(); titleInput.blur(); }
        if (e.key === 'Escape') { titleInput.value = titleInput.dataset.original || ''; titleInput.blur(); }
      });
      titleInput.addEventListener('focus', () => {
        titleInput.dataset.original = titleInput.value;
      });
      titleInput.addEventListener('blur', () => {
        const newName  = titleInput.value.trim();
        const original = titleInput.dataset.original || '';
        if (!newName) { titleInput.value = original; return; }
        if (newName === original) return;
        startRename(newName);
      });
    }

    // Botón eliminar en el header
    document.getElementById('chat-header-delete-btn')
      ?.addEventListener('click', () => deleteCurrentChat());
  }

  return { setChatHeader, startRename, deleteCurrentChat, showDeleteConfirm, wireEvents };

})();

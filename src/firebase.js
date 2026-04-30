/**
 * firebase.js — Cliente de Firestore via Edge Function /api/db
 *
 * Usa el token firmado que entrega AUTH.getSignedToken().
 * La verificación de firma ocurre en el servidor (api/db.js).
 */

window.FB = (() => {

  async function call(op, params) {
    const token = window.AUTH?.getSignedToken?.();
    if (!token) throw new Error('No autenticado');

    const resp = await fetch('/api/db', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ op, ...params })
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: resp.statusText }));
      throw new Error(err.error || `HTTP ${resp.status}`);
    }
    return resp.json();
  }

  async function createChat(userId, titulo) {
    const { id } = await call('createChat', { userId, titulo });
    return id;
  }

  async function updateChat(userId, chatId, data) {
    await call('updateChat', { userId, chatId, data });
  }

  async function getUserChats(userId, max = 30) {
    const { chats } = await call('getUserChats', { userId, max });
    return chats;
  }

  async function deleteChat(userId, chatId) {
    await call('deleteChat', { userId, chatId });
  }

  async function getChat(userId, chatId) {
    const res = await call('getChat', { userId, chatId });
    return res.chat || null;
  }

  return { createChat, updateChat, getUserChats, getChat, deleteChat };

})();

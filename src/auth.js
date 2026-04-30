/**
 * auth.js — Manejo de sesión OAuth con Google
 * La autenticación pasa por api/auth/callback.js
 *
 * El token tiene formato: base64(payload).base64(hmac)
 * El frontend lo almacena opaco y lo reenvía tal cual al servidor.
 * La verificación de firma ocurre sólo en el servidor (api/db.js).
 */

window.AUTH = (() => {

  const CLIENT_ID   = '657210135728-if0b3haekjs84rk507udvo9qus25udfo.apps.googleusercontent.com';
  const REDIRECT    = 'https://simple-maps.vercel.app/api/auth/callback';
  const SESSION_KEY = 'sm_session';

  // ── Login ─────────────────────────────────────────────────────

  function loginWithGoogle() {
    const params = new URLSearchParams({
      client_id:     CLIENT_ID,
      redirect_uri:  REDIRECT,
      response_type: 'code',
      scope:         'openid email profile',
      prompt:        'select_account'
    });
    window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + params;
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.reload();
  }

  // ── Sesión ────────────────────────────────────────────────────
  //
  // Estructura guardada en localStorage:
  //   { token: "<signedToken>", uid, email, name, photo, exp }
  //
  // "token" es el valor opaco que se envía al servidor.
  // Los campos de perfil se leen para la UI (nombre, foto) sin confiar en ellos
  // para autorización — eso lo hace el servidor al verificar la firma.

  function getSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const session = JSON.parse(raw);
      if (session.exp && Date.now() > session.exp) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return session;
    } catch { return null; }
  }

  function saveSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function currentUser() {
    return getSession();
  }

  // Devuelve el token firmado para enviarlo al servidor.
  // firebase.js lo usa en el header Authorization.
  function getSignedToken() {
    const session = getSession();
    return session?.token || null;
  }

  // ── Capturar sesión del hash al volver de Google ──────────────

  function handleCallback() {
    const hash = window.location.hash;
    if (!hash.startsWith('#session=')) return false;

    try {
      // El token firmado viene en el hash como URL-encoded string
      const signedToken = decodeURIComponent(hash.slice('#session='.length));

      // Extraer el payload (primer segmento antes del punto) para leer
      // datos de perfil para la UI. La firma se verifica en el servidor.
      const dotIndex = signedToken.lastIndexOf('.');
      if (dotIndex === -1) throw new Error('Token sin firma');

      const payloadB64 = signedToken.slice(0, dotIndex);
      const payload    = JSON.parse(decodeURIComponent(escape(atob(payloadB64))));

      // Guardar con el token opaco incluido
      const session = { ...payload, token: signedToken };
      saveSession(session);

      history.replaceState(null, '', window.location.pathname);
      return session;
    } catch (err) {
      console.error('[AUTH] Error parsing session:', err);
      return false;
    }
  }

  // ── Error de auth ─────────────────────────────────────────────

  function handleAuthError() {
    const url = new URL(window.location.href);
    const err = url.searchParams.get('auth_error');
    if (!err) return false;
    url.searchParams.delete('auth_error');
    history.replaceState(null, '', url.toString());
    return err;
  }

  function checkExpiry() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const session = JSON.parse(raw);
      if (session.exp && Date.now() > session.exp) {
        localStorage.removeItem(SESSION_KEY);
        console.log('[AUTH] Sesión expirada, limpiando');
      }
    } catch { localStorage.removeItem(SESSION_KEY); }
  }

  checkExpiry();

  return { loginWithGoogle, logout, currentUser, getSignedToken, handleCallback, handleAuthError };

})();

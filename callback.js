/**
 * api/auth/callback.js — OAuth callback de Google
 *
 * Token firmado con HMAC-SHA256 usando TOKEN_SECRET (variable de entorno).
 * Formato: base64(payload) + "." + base64(hmac)
 * El servidor verifica la firma antes de confiar en el uid.
 */

const crypto = require('crypto');

function signToken(payload, secret) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64');
  const sig   = crypto.createHmac('sha256', secret).update(data).digest('base64');
  return data + '.' + sig;
}

module.exports = async function handler(req, res) {
  const { code, error } = req.query;

  if (error) return res.redirect('/?auth_error=' + encodeURIComponent(error));
  if (!code)  return res.status(400).send('Falta el código de autorización');

  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const tokenSecret  = process.env.TOKEN_SECRET;
  const redirectUri  = 'https://simple-maps.vercel.app/api/auth/callback';

  if (!tokenSecret) {
    console.error('[auth/callback] TOKEN_SECRET no configurado');
    return res.redirect('/?auth_error=server_config_error');
  }

  try {
    // 1. Intercambiar code por tokens
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: clientId, client_secret: clientSecret,
        redirect_uri: redirectUri, grant_type: 'authorization_code'
      })
    });
    const tokens = await tokenResp.json();
    if (tokens.error) throw new Error(tokens.error_description || tokens.error);

    // 2. Obtener perfil
    const profileResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const profile = await profileResp.json();

    // 3. Sesión firmada con HMAC-SHA256
    const session = {
      uid:   profile.sub,
      email: profile.email,
      name:  profile.name,
      photo: profile.picture,
      exp:   Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 días
    };
    const signedToken = signToken(session, tokenSecret);

    res.redirect('/#session=' + encodeURIComponent(signedToken));

  } catch (err) {
    console.error('[auth/callback]', err.message);
    res.redirect('/?auth_error=' + encodeURIComponent(err.message));
  }
};

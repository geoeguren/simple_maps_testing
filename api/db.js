/**
 * api/db.js — Operaciones de Firestore con Firebase Admin SDK
 *
 * Seguridad: verifica firma HMAC-SHA256 del token antes de confiar en el uid.
 * Un usuario no puede leer ni modificar datos de otro.
 */

const crypto = require('crypto');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue }      = require('firebase-admin/firestore');

function getDb() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
      })
    });
  }
  return getFirestore();
}

// ── Verificar sesión con firma HMAC ───────────────────────────────

function verifySession(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token  = authHeader.slice(7);
  const secret = process.env.TOKEN_SECRET;

  // Fallback sin firma: tokens legacy (base64 simple) — aceptar sólo durante
  // la transición; quitar esta rama después de un deploy completo.
  if (!secret) {
    console.warn('[db] TOKEN_SECRET no configurado, aceptando token legacy');
    try {
      const session = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
      if (!session.uid || !session.exp) return null;
      if (Date.now() > session.exp) return null;
      return session;
    } catch { return null; }
  }

  // Verificar firma: formato "base64payload.base64sig"
  const dotIndex = token.lastIndexOf('.');
  if (dotIndex === -1) return null;

  const data        = token.slice(0, dotIndex);
  const receivedSig = token.slice(dotIndex + 1);
  const expectedSig = crypto.createHmac('sha256', secret).update(data).digest('base64');

  // Comparación en tiempo constante para evitar timing attacks
  try {
    const a = Buffer.from(receivedSig, 'base64');
    const b = Buffer.from(expectedSig, 'base64');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  } catch { return null; }

  try {
    const session = JSON.parse(Buffer.from(data, 'base64').toString('utf8'));
    if (!session.uid || !session.exp) return null;
    if (Date.now() > session.exp) return null;
    return session;
  } catch { return null; }
}

// ── Handler ───────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const session = verifySession(req);
  if (!session) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  const { op, userId, chatId, titulo, data, max } = req.body || {};

  if (!op || !userId) {
    return res.status(400).json({ error: 'Se requiere op y userId' });
  }

  if (session.uid !== userId) {
    console.warn(`[db] Acceso denegado: session.uid=${session.uid} != userId=${userId}`);
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  try {
    const db = getDb();

    if (op === 'createChat') {
      const ref = await db
        .collection('users').doc(userId)
        .collection('chats').add({
          titulo:    titulo || 'Nuevo mapa',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          messages:  []
        });
      return res.status(200).json({ id: ref.id });
    }

    if (op === 'updateChat') {
      if (!chatId) return res.status(400).json({ error: 'Se requiere chatId' });
      await db
        .collection('users').doc(userId)
        .collection('chats').doc(chatId)
        .update({ ...data, updatedAt: FieldValue.serverTimestamp() });
      return res.status(200).json({ ok: true });
    }

    if (op === 'getUserChats') {
      const snap = await db
        .collection('users').doc(userId)
        .collection('chats')
        .orderBy('updatedAt', 'desc')
        .limit(max || 30)
        .get();
      const chats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      return res.status(200).json({ chats });
    }

    if (op === 'deleteChat') {
      if (!chatId) return res.status(400).json({ error: 'Se requiere chatId' });
      await db
        .collection('users').doc(userId)
        .collection('chats').doc(chatId)
        .delete();
      return res.status(200).json({ ok: true });
    }

    if (op === 'getChat') {
      if (!chatId) return res.status(400).json({ error: 'Se requiere chatId' });
      const doc = await db
        .collection('users').doc(userId)
        .collection('chats').doc(chatId)
        .get();
      if (!doc.exists) return res.status(404).json({ error: 'Chat no encontrado' });
      return res.status(200).json({ chat: { id: doc.id, ...doc.data() } });
    }

    return res.status(400).json({ error: `Operación desconocida: ${op}` });

  } catch (err) {
    console.error('[db]', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// Serverless: canjea un código de acceso y sube al usuario a "Pro".
//
// POR QUÉ ESTO VIVE EN EL SERVIDOR (y no en el navegador):
//   1. El "tier" (free/pro) NO se puede asignar desde el cliente. Si se pudiera,
//      cualquiera abriría la consola del navegador y haría
//      `users/<uid>/tier = 'pro'` para tener Pro gratis. Aquí lo escribe el
//      Admin SDK, que se salta las reglas de seguridad.
//   2. La lista de códigos válidos vive en una variable de entorno PRIVADA
//      (ACCESS_CODES), nunca dentro del bundle público de la web.
//   3. El "un solo uso" se garantiza con una transacción atómica en la base.
//
// Variables de entorno (Vercel -> Settings -> Environment Variables):
//   FIREBASE_SERVICE_ACCOUNT  -> el JSON de la cuenta de servicio (una línea)
//   ACCESS_CODES              -> códigos válidos separados por coma o salto de
//                                línea. Ejemplo:
//                                "FAMILIA2026, PRUEBA-7H2K9, AMIGO-TENIS"
//                                (puedes poner una nota tras un '#': "X9K2 # ana")

import admin from 'firebase-admin';

const DATABASE_URL = 'https://productivity-tracker-70063-default-rtdb.firebaseio.com';

// Inicializa el Admin SDK una sola vez (reutilizado entre invocaciones).
function getAdmin() {
  if (!admin.apps.length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT no configurado');
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(raw)),
      databaseURL: DATABASE_URL
    });
  }
  return admin;
}

function normalizeCode(code) {
  return String(code || '').trim().toUpperCase();
}

// Lee ACCESS_CODES (separados por coma o salto de línea) en un Set normalizado.
function getValidCodes() {
  const raw = process.env.ACCESS_CODES || '';
  const set = new Set();
  raw.split(/[\n,]/).forEach((part) => {
    const codePart = part.split('#')[0]; // permite notas tras un '#'
    const code = normalizeCode(codePart);
    if (code) set.add(code);
  });
  return set;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method' });
  }

  let adminSdk;
  try {
    adminSdk = getAdmin();
  } catch (e) {
    return res.status(500).json({ error: 'server', detail: e.message });
  }

  // 1. Autenticar al usuario por su token de Firebase.
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'unauth' });

  let uid, email;
  try {
    const decoded = await adminSdk.auth().verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email || '';
  } catch (e) {
    return res.status(401).json({ error: 'unauth' });
  }

  // 2. Leer y validar el código contra la lista privada del servidor.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const code = normalizeCode(body && body.code);
  if (!code || !getValidCodes().has(code)) {
    return res.status(400).json({ error: 'code/invalid' });
  }

  // Caducidad de la campaña (opcional): ACCESS_CODES_EXPIRES = 'YYYY-MM-DD'.
  // Pasada esa fecha (fin del día), ningún código se puede canjear.
  const expires = (process.env.ACCESS_CODES_EXPIRES || '').trim();
  if (expires) {
    const deadline = Date.parse(`${expires}T23:59:59`);
    if (!Number.isNaN(deadline) && Date.now() > deadline) {
      return res.status(410).json({ error: 'code/expired' });
    }
  }

  // 3. Reclamar el código de forma atómica (un solo uso).
  const db = adminSdk.database();
  const codeRef = db.ref(`accessCodes/${code}`);

  const txn = await codeRef.transaction((curr) => {
    if (curr && curr.redeemedBy && curr.redeemedBy !== uid) {
      return; // ya lo canjeó otra persona -> abortar
    }
    return { redeemedBy: uid, email, redeemedAt: Date.now() };
  });

  if (!txn.committed) {
    return res.status(409).json({ error: 'code/used' });
  }

  // 4. Subir al usuario a Pro (solo el servidor puede tocar 'tier').
  await db.ref(`users/${uid}`).update({
    tier: 'pro',
    proSince: Date.now(),
    proVia: 'code'
  });

  return res.status(200).json({ ok: true });
}

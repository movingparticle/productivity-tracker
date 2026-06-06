// Serverless agent proxy (Vercel Function).
//
// Why this exists: you can NEVER call an LLM provider directly from the browser
// (the API key would be exposed). This function holds the key server-side,
// enforces a per-user daily quota that can't be cheated, and routes to one or
// more OpenAI-compatible providers with automatic fallback. Swapping providers
// is just environment variables — no code change.
//
// Required Vercel environment variables:
//   FIREBASE_SERVICE_ACCOUNT  -> the service-account JSON (Firebase console)
//   LLM1_BASE_URL / LLM1_KEY / LLM1_MODEL   (primary provider, OpenAI-compatible)
//   LLM2_BASE_URL / LLM2_KEY / LLM2_MODEL   (optional fallback)  ... up to LLM4_*
// Optional:
//   FREE_DAILY_LIMIT  -> free requests per user per day (default 5)

import admin from 'firebase-admin';

const DATABASE_URL = 'https://productivity-tracker-70063-default-rtdb.firebaseio.com';
const FREE_DAILY_LIMIT = parseInt(process.env.FREE_DAILY_LIMIT || '5', 10);

// Lazily initialise the Admin SDK so a missing env var doesn't crash deploy.
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

// Build the provider chain from env vars (LLM1_*, LLM2_*, ...). Order = priority.
function getProviders() {
  const providers = [];
  for (let i = 1; i <= 4; i++) {
    const baseUrl = process.env[`LLM${i}_BASE_URL`];
    const key = process.env[`LLM${i}_KEY`];
    const model = process.env[`LLM${i}_MODEL`];
    if (baseUrl && key && model) {
      providers.push({ baseUrl: baseUrl.replace(/\/$/, ''), key, model });
    }
  }
  return providers;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  let adminSdk;
  try {
    adminSdk = getAdmin();
  } catch (e) {
    return res.status(500).json({ error: 'Servidor sin configurar', detail: e.message });
  }

  // 1. Authenticate the caller via their Firebase ID token.
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autenticado' });

  let uid;
  try {
    const decoded = await adminSdk.auth().verifyIdToken(token);
    uid = decoded.uid;
  } catch (e) {
    return res.status(401).json({ error: 'Sesión inválida' });
  }

  // 2. Read the request payload.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const prompt = body && body.prompt;
  const system = body && body.system;
  if (!prompt) return res.status(400).json({ error: 'Falta el prompt' });

  // 3. Enforce the daily quota (server-side = cannot be bypassed).
  const db = adminSdk.database();
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const usageRef = db.ref(`usage/${uid}/${today}`);

  const tierSnap = await db.ref(`users/${uid}/tier`).once('value');
  const tier = tierSnap.exists() ? tierSnap.val() : 'free';

  if (tier === 'free') {
    const usedSnap = await usageRef.once('value');
    const used = usedSnap.exists() ? usedSnap.val() : 0;
    if (used >= FREE_DAILY_LIMIT) {
      return res.status(429).json({
        error: 'limit',
        message: `Alcanzaste tu límite diario gratis (${FREE_DAILY_LIMIT}). Vuelve mañana o mejora tu plan.`
      });
    }
  }

  // 4. Call providers in order; fall back to the next on failure.
  const providers = getProviders();
  if (providers.length === 0) {
    return res.status(500).json({ error: 'No hay proveedores de IA configurados.' });
  }

  const messages = [];
  if (system) messages.push({ role: 'system', content: system });
  messages.push({ role: 'user', content: prompt });

  let lastError = null;
  for (const p of providers) {
    try {
      const r = await fetch(`${p.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${p.key}`
        },
        body: JSON.stringify({
          model: p.model,
          messages,
          max_tokens: 1024,
          temperature: 0.7
        })
      });

      if (!r.ok) {
        lastError = `proveedor respondió ${r.status}`;
        continue; // try the next provider
      }

      const data = await r.json();
      const text = data?.choices?.[0]?.message?.content || '';
      if (!text) {
        lastError = 'respuesta vacía';
        continue;
      }

      // 5. Count this use against the daily quota (only on success, only free tier).
      if (tier === 'free') {
        await usageRef.transaction(curr => (curr || 0) + 1);
      }

      return res.status(200).json({ text });
    } catch (e) {
      lastError = e.message;
      continue;
    }
  }

  return res.status(502).json({ error: 'Los proveedores de IA no respondieron.', detail: lastError });
}

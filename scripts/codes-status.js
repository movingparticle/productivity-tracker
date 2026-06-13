// Tablero local de códigos beta: muestra cuáles se usaron (tachados) y cuáles
// siguen libres, leyendo el estado real desde Firebase. NO necesitas entrar a
// la consola de Firebase.
//
// CÓMO USARLO:
//   npm run codes
//
// Requisitos (ya los tienes en .env):
//   FIREBASE_SERVICE_ACCOUNT  -> JSON de la cuenta de servicio (para leer la BD)
//   (opcional) ACCESS_CODES   -> si no está, el script lee la lista del archivo
//                                access-codes/codigos-beta-30.txt
//   (opcional) ACCESS_CODES_EXPIRES = 'YYYY-MM-DD' -> muestra días restantes

import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DATABASE_URL = 'https://productivity-tracker-70063-default-rtdb.firebaseio.com';
const CODES_FILE = 'access-codes/codigos-beta-30.txt';

// Colores ANSI (se desactivan si la salida no es una terminal).
const tty = process.stdout.isTTY;
const c = {
  strike: (s) => (tty ? `[9m[2m${s}[0m` : `${s}`),
  green:  (s) => (tty ? `[32m${s}[0m` : s),
  red:    (s) => (tty ? `[31m${s}[0m` : s),
  yellow: (s) => (tty ? `[33m${s}[0m` : s),
  dim:    (s) => (tty ? `[2m${s}[0m` : s),
  bold:   (s) => (tty ? `[1m${s}[0m` : s),
};

function die(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

// 1. Lista de códigos: de ACCESS_CODES, o del archivo .txt.
function loadCodes() {
  const fromEnv = (process.env.ACCESS_CODES || '').trim();
  let text = fromEnv;
  if (!text) {
    try {
      text = readFileSync(resolve(process.cwd(), CODES_FILE), 'utf8');
    } catch {
      die(`No encuentro los códigos. Define ACCESS_CODES en .env o deja el archivo ${CODES_FILE}.`);
    }
  }
  // Extrae tokens tipo "BETA-AB12CD" (prefijo-letras/números), únicos y en orden.
  const seen = new Set();
  const codes = [];
  for (const m of text.matchAll(/\b[A-Z]{2,}-[A-Z0-9]{4,}\b/g)) {
    const code = m[0].toUpperCase();
    if (!seen.has(code)) { seen.add(code); codes.push(code); }
  }
  if (!codes.length) die('No pude extraer ningún código de la lista.');
  return codes;
}

// 2. Caducidad: de ACCESS_CODES_EXPIRES o de la línea "EXPIRA:" del .txt.
function loadExpiry() {
  let exp = (process.env.ACCESS_CODES_EXPIRES || '').trim();
  if (!exp) {
    try {
      const text = readFileSync(resolve(process.cwd(), CODES_FILE), 'utf8');
      const m = text.match(/EXPIRA[:\s]+([0-9]{4}-[0-9]{2}-[0-9]{2})/i);
      if (m) exp = m[1];
    } catch { /* sin archivo, sin caducidad */ }
  }
  return exp || null;
}

function initAdmin() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    die('Falta FIREBASE_SERVICE_ACCOUNT en .env (el JSON de la cuenta de servicio).\n' +
        '   Lo sacas en: Firebase Console → Configuración del proyecto →\n' +
        '   Cuentas de servicio → "Generar nueva clave privada".');
  }
  let cred;
  try {
    cred = JSON.parse(raw);
  } catch {
    die('FIREBASE_SERVICE_ACCOUNT no es un JSON válido (debe ir en UNA sola línea en .env).');
  }
  admin.initializeApp({ credential: admin.credential.cert(cred), databaseURL: DATABASE_URL });
  return admin;
}

function fmtDate(ms) {
  if (!ms) return '';
  const d = new Date(ms);
  return d.toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
         ' ' + d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

async function main() {
  const codes = loadCodes();
  const expiry = loadExpiry();
  const sdk = initAdmin();

  const snap = await sdk.database().ref('accessCodes').once('value');
  const redeemed = snap.val() || {};

  console.log('\n' + c.bold('═══ ESTADO DE CÓDIGOS BETA ═══') + '\n');

  let used = 0;
  codes.forEach((code, i) => {
    const n = String(i + 1).padStart(2, '0');
    const r = redeemed[code];
    if (r && r.redeemedBy) {
      used++;
      const who = r.email || r.redeemedBy;
      console.log(`${n}. ${c.strike(code)}  ${c.red('✗ USADO')}  ${c.dim('por ' + who + ' · ' + fmtDate(r.redeemedAt))}`);
    } else {
      console.log(`${n}. ${c.green(code)}  ${c.green('• libre')}`);
    }
  });

  const free = codes.length - used;
  console.log('\n' + c.bold(`Total: ${codes.length}  |  `) + c.red(`usados: ${used}`) + '  |  ' + c.green(`libres: ${free}`));

  if (expiry) {
    const deadline = Date.parse(`${expiry}T23:59:59`);
    const daysLeft = Math.ceil((deadline - Date.now()) / 86400000);
    if (Number.isNaN(deadline)) {
      console.log(c.dim(`Caducidad: ${expiry}`));
    } else if (daysLeft < 0) {
      console.log(c.red(`⏰ CADUCADOS desde ${expiry} (ya no se pueden canjear).`));
    } else {
      console.log(c.yellow(`⏰ Caducan el ${expiry} — quedan ${daysLeft} día(s).`));
    }
  }
  console.log('');
  process.exit(0);
}

main().catch((e) => die(e && e.message ? e.message : String(e)));

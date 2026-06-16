import { getCurrentUser } from "./firebase";
import * as state from "./state";
import { getLang } from "./i18n";

/**
 * Ask the AI agent something. Calls our own serverless function (/api/agent),
 * which holds the provider key, enforces the daily quota, and routes to a
 * provider. Only runs on an explicit user action — no background usage.
 *
 * @param {string} prompt  What the user wants (e.g. "dame 3 recetas con pollo y arroz")
 * @param {string} [system] Optional instructions to shape the answer
 * @returns {Promise<string>} The agent's reply text
 * @throws {Error} err.code === 'limit' when the daily free quota is exhausted
 */
export async function askAgent(prompt, system) {
  const user = getCurrentUser();
  const isEn = getLang() === 'en';
  if (!user) throw new Error(isEn ? "Sign in to use the assistant." : "Inicia sesión para usar el asistente.");

  const token = await user.getIdToken();

  const res = await fetch("/api/agent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ prompt, system })
  });

  let data = {};
  try { data = await res.json(); } catch { /* ignore */ }

  if (!res.ok) {
    const err = new Error(data.message || data.error || (isEn ? "Could not contact the assistant." : "No se pudo contactar al asistente."));
    err.code = data.error;
    throw err;
  }

  return data.text;
}

/**
 * Build a compact snapshot of the current room so the assistant has real
 * context about the user's tasks, shopping list, routines and points.
 */
export function buildAppContext() {
  const isEn = getLang() === 'en';
  const s = state.store || {};
  const config = s.config || {};
  const users = Array.isArray(config.users) ? config.users : [];
  const activeUser = users.find(u => u.id === state.localProfileId) || users[0] || null;

  // Today's points for the active profile.
  let todayPts = 0;
  (s.todayLog || []).forEach(x => {
    if (x.who === state.localProfileId) todayPts += Number(x.pts) || 0;
  });

  const pending = (s.pendingList || [])
    .map(t => {
      const prio = isEn ? (t.priority === 'alta' ? 'high' : t.priority === 'baja' ? 'low' : 'medium') : (t.priority || 'media');
      return `- ${t.name} [${isEn ? 'priority' : 'prioridad'} ${prio}, ${t.pts} pts]`;
    })
    .slice(0, 30)
    .join('\n') || (isEn ? '(no pending tasks)' : '(sin tareas pendientes)');

  const shopping = (s.shoppingList || [])
    .map(it => `- ${it.name || (isEn ? '(photo)' : '(foto)')}${it.qty ? ' (' + it.qty + ')' : ''}`)
    .slice(0, 40)
    .join('\n') || (isEn ? '(empty shopping list)' : '(lista de compras vacía)');

  const routines = (s.templates || [])
    .map(t => `- ${t.name} (+${t.pts} pts)`)
    .slice(0, 30)
    .join('\n') || (isEn ? '(no saved routines)' : '(sin rutinas guardadas)');

  return [
    isEn ? `Current room: ${state.currentRoomName || 'the Room'}.` : `Sala actual: ${state.currentRoomName || 'la Sala'}.`,
    activeUser ? (isEn ? `Active profile: ${activeUser.name}. Today's points: ${todayPts}/${activeUser.meta || 15}.` : `Perfil activo: ${activeUser.name}. Puntos de hoy: ${todayPts}/${activeUser.meta || 15}.`) : '',
    isEn ? `Pending tasks:\n${pending}` : `Tareas pendientes:\n${pending}`,
    isEn ? `Shopping list:\n${shopping}` : `Lista de compras:\n${shopping}`,
    isEn ? `Saved routines:\n${routines}` : `Rutinas guardadas:\n${routines}`
  ].filter(Boolean).join('\n\n');
}

/**
 * The assistant's persona + the live app context.
 */
export function assistantSystemPrompt() {
  const isEn = getLang() === 'en';
  return isEn ? [
    'You are the built-in assistant of a productivity app for families and teams.',
    'You help with pending tasks, daily planning, shopping lists, routines, and motivation.',
    'ALWAYS reply in English, in a brief, clear, and practical manner. Use short lists when helpful.',
    'You have access to the current state of the room (below). Use it to provide concrete answers.',
    '',
    '=== CURRENT ROOM CONTEXT ===',
    buildAppContext()
  ].join('\n') : [
    'Eres el asistente integrado de una app de productividad para familias y equipos.',
    'Ayudas con tareas pendientes, planificación del día, listas de compras, rutinas y motivación.',
    'Responde SIEMPRE en español, de forma breve, clara y práctica. Usa listas cortas cuando ayude.',
    'Tienes acceso al estado actual de la sala (abajo). Úsalo para dar respuestas concretas.',
    '',
    '=== CONTEXTO ACTUAL DE LA SALA ===',
    buildAppContext()
  ].join('\n');
}

/**
 * Ask the assistant a free-form question with full app context attached.
 */
export function askAssistant(userPrompt) {
  return askAgent(userPrompt, assistantSystemPrompt());
}

/**
 * Turn a messy block of text (one big shopping list dictated/pasted by the
 * user) into a clean, structured list. Returns an array of { name, qty }.
 *
 * "algo pequeño pero poderoso": el usuario escribe todo de corrido y la IA
 * lo ordena en artículos individuales con su cantidad.
 */
export async function fixShoppingListWithAI(rawText) {
  const isEn = getLang() === 'en';
  const system = isEn ? [
    'You are an assistant that organizes shopping lists.',
    'You are given an unorganized text (it might come all together, with commas, line breaks, or typos).',
    'Return it as a clean list: ONE item per line, with the exact format:',
    'name | quantity',
    'The quantity is optional; if not mentioned, leave the field empty after the bar.',
    'Do not add numbering, bullets, comments, or headers. ONLY the item lines.',
    'Correct capitalization to make it look neat (e.g., "Milk", "Whole wheat bread").'
  ].join('\n') : [
    'Eres un asistente que ordena listas de compras.',
    'Te dan un texto desordenado (puede venir todo junto, con comas, saltos de línea o errores).',
    'Devuélvelo como una lista limpia: UN artículo por línea, con el formato exacto:',
    'nombre | cantidad',
    'La cantidad es opcional; si no se menciona, deja el campo vacío después de la barra.',
    'No agregues numeración, ni viñetas, ni comentarios, ni encabezados. SOLO las líneas de artículos.',
    'Corrige mayúsculas/minúsculas para que se vea prolijo (ej: "Leche", "Pan integral").'
  ].join('\n');

  const prompt = isEn ? `Sort this shopping list:\n\n${rawText}` : `Ordena esta lista de compras:\n\n${rawText}`;
  const text = await askAgent(prompt, system);

  // Parse "name | qty" lines into objects.
  return String(text)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      // Strip common bullet/numbering noise just in case.
      const clean = line.replace(/^[-*•\d.\)\s]+/, '');
      const [namePart, qtyPart] = clean.split('|');
      return {
        name: (namePart || '').trim(),
        qty: (qtyPart || '').trim()
      };
    })
    .filter(it => it.name);
}

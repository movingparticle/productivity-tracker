import { getCurrentUser } from "./firebase";

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
  if (!user) throw new Error("Inicia sesión para usar el asistente.");

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
    const err = new Error(data.message || data.error || "No se pudo contactar al asistente.");
    err.code = data.error;
    throw err;
  }

  return data.text;
}

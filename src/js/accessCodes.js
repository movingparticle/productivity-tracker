// Normalización de códigos de acceso (compartida cliente/servidor).
//
// IMPORTANTE: la LISTA de códigos válidos ya NO vive aquí ni en el bundle.
// Ahora vive en una variable de entorno privada del servidor (ACCESS_CODES) y
// la validación + el canje ocurren en /api/redeem. Así nadie puede leer los
// códigos abriendo el "ver código fuente" del sitio.

/**
 * Normaliza un código igual en todas partes: sin espacios y en MAYÚSCULAS.
 */
export function normalizeCode(code) {
  return (code || '').trim().toUpperCase();
}

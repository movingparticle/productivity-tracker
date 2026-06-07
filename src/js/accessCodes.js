// Loads the trial access codes from /access-codes/*.txt at build time and
// exposes a small validator. Codes let a "close friend" unlock the Pro trial
// (create rooms + use the AI assistant). Single-use enforcement happens in
// firebase.js (redeemAccessCode), this file only knows which codes are valid.
//
// To add/change codes, edit the .txt files in the /access-codes folder.

// Vite inlines the raw text of every .txt in that folder.
const rawFiles = import.meta.glob('../../access-codes/*.txt', {
  query: '?raw',
  import: 'default',
  eager: true
});

/**
 * Normalize a code the same way everywhere: trim + uppercase, no spaces.
 */
export function normalizeCode(code) {
  return (code || '').trim().toUpperCase();
}

// Parse every .txt into a Set of valid codes.
const VALID_CODES = new Set();
for (const content of Object.values(rawFiles)) {
  String(content)
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      // Ignore blank lines and comments.
      if (!trimmed || trimmed.startsWith('#')) return;
      // Drop any inline note after a comma or '#'.
      const codePart = trimmed.split(/[,#]/)[0];
      const code = normalizeCode(codePart);
      if (code) VALID_CODES.add(code);
    });
}

/**
 * Is the given string one of the configured trial codes?
 */
export function isValidAccessCode(code) {
  return VALID_CODES.has(normalizeCode(code));
}

/**
 * How many codes are configured (handy for debugging).
 */
export function accessCodeCount() {
  return VALID_CODES.size;
}

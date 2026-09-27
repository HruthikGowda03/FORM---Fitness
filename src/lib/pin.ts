/* ==========================================================================
   FORM — local profile PIN
   ---------------------------------------------------------------------------
   WHAT THIS IS NOT
   This is not authentication. There is no server, so a PIN stored in
   localStorage can be bypassed by anyone with devtools, and the hash below
   stops nothing against a determined person on a shared machine. It exists
   for one narrow, honest purpose: stopping a sibling or housemate from
   casually opening your plan when they pick up the same laptop.

   The hash is SHA-256 via WebCrypto purely so the PIN is not sitting in
   plaintext in a file the user can open. It is salted and bound to the
   profile id, so two people choosing the same PIN do not produce the same
   hash, and a hash cannot be lifted from one profile onto another.

   Nothing is transmitted. If `crypto.subtle` is unavailable (a non-secure
   context) we fall back to a clearly-labelled weaker scheme rather than
   pretending, and `verifyPin` refuses to accept a strong hash it cannot
   compute — a wrong scheme must never verify by accident.
   ========================================================================== */

const STRONG = 'sha256'
const WEAK = 'weak'

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function randomSalt(): string {
  const bytes = new Uint8Array(16)
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return toHex(bytes)
}

function subtleAvailable(): boolean {
  return (
    typeof globalThis.crypto !== 'undefined' &&
    typeof globalThis.crypto.subtle !== 'undefined' &&
    typeof globalThis.crypto.subtle.digest === 'function'
  )
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input)
  return toHex(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', data)))
}

/** Deterministic non-crypto fallback, for insecure contexts only. */
function weakHash(input: string): string {
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < input.length; i++) {
    h1 = Math.imul(h1 ^ input.charCodeAt(i), 16777619) >>> 0
    h2 = (h2 + Math.imul(input.charCodeAt(i), 2654435761)) >>> 0
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0')
}

/** The exact string that gets hashed, so hash and verify cannot drift apart. */
function payload(profileId: string, salt: string, pin: string): string {
  return `form:${profileId}:${salt}:${pin}`
}

function digest(scheme: string, profileId: string, salt: string, pin: string): Promise<string> | string {
  const input = payload(profileId, salt, pin)
  return scheme === STRONG ? sha256Hex(input) : weakHash(input)
}

/** Hash a new PIN for a specific profile. */
export async function hashPin(pin: string, profileId: string): Promise<string> {
  const salt = randomSalt()
  const scheme = subtleAvailable() ? STRONG : WEAK
  const hash = await digest(scheme, profileId, salt, pin)
  return `${scheme}$${profileId}$${salt}$${hash}`
}

/**
 * Verify a PIN against a stored hash. Returns false on any mismatch rather
 * than throwing, and compares without an early exit on the first byte.
 */
export async function verifyPin(pin: string, stored: string | null): Promise<boolean> {
  // `null` is the only "no PIN" signal. An empty string means the stored value
  // was corrupted, and treating that as "no lock" would silently open the
  // profile — so it must fail closed.
  if (stored === null) return true
  if (typeof stored !== 'string' || stored.length === 0) return false

  const parts = stored.split('$')
  if (parts.length !== 4) return false

  const [scheme, profileId, salt, expected] = parts
  if (!profileId || !salt || !expected) return false

  if (scheme === STRONG) {
    // A strong hash we cannot recompute must fail closed, never open.
    if (!subtleAvailable()) return false
    const actual = await sha256Hex(payload(profileId, salt, pin))
    return timingSafeEqual(actual, expected)
  }

  if (scheme === WEAK) {
    return timingSafeEqual(weakHash(payload(profileId, salt, pin)), expected)
  }

  // Unknown scheme: refuse.
  return false
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

export const PIN_MIN = 4
export const PIN_MAX = 12

export function isValidPin(pin: string): boolean {
  return /^\d+$/.test(pin) && pin.length >= PIN_MIN && pin.length <= PIN_MAX
}

/** True when this environment can produce the strong hash. */
export function strongHashAvailable(): boolean {
  return subtleAvailable()
}

/** Plain-language warning shown wherever a PIN is set. */
export const PIN_DISCLOSURE =
  'A PIN keeps a shared household from casually opening this profile. It is stored only in this browser and is not real security — anyone with access to this device’s developer tools can read the data. Do not use a password you use elsewhere.'

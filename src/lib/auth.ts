/* ==========================================================================
   FORM — local profile sign-in
   ---------------------------------------------------------------------------
   WHAT THIS IS NOT
   There is no server. Nothing here authenticates anyone against anything
   external, and no name or PIN leaves this device. A form that looked like an
   online login would be claiming a protection that does not exist, which in an
   app holding body measurements and food logs is worse than having no form at
   all.

   So this is a *local* sign-in, and it is described as one everywhere it
   appears: your profile and its PIN are stored in this browser, and opening
   FORM in a different browser, a private window, or at a different address
   gives you a different set of profiles with no way to see these.

   Why a sign-in exists at all, given that: several people share one laptop.
   Without a PIN, whoever opens the app first gets everyone else's plan. The
   PIN is a speed bump for that, not security, and `PIN_DISCLOSURE` says so at
   the point of setting one.
   ========================================================================== */

import type { LocalProfile } from '@/types'

/**
 * Case- and whitespace-insensitive profile name.
 *
 * People type "priya" having seen "Priya" on the button. Rejecting that would
 * look like a wrong PIN on a profile that exists, which is the most confusing
 * failure this screen can produce.
 */
export function normaliseName(name: string): string {
  return name.trim().toLowerCase()
}

/** The profile a name refers to, or null. First match wins. */
export function findByName(
  profiles: readonly LocalProfile[],
  name: string,
): LocalProfile | null {
  const wanted = normaliseName(name)
  if (!wanted) return null
  return profiles.find((p) => normaliseName(p.name) === wanted) ?? null
}

/**
 * Whether a name is already taken on this device.
 *
 * Enforced because the sign-in resolves a name to exactly one profile: two
 * profiles called "Sam" would make the login form ambiguous, and the second
 * one would be unreachable by name.
 */
export function isNameTaken(
  profiles: readonly LocalProfile[],
  name: string,
  exceptId?: string,
): boolean {
  const wanted = normaliseName(name)
  if (!wanted) return false
  return profiles.some((p) => p.id !== exceptId && normaliseName(p.name) === wanted)
}

export const NAME_MAX = 40

export function validateName(name: string): string | null {
  const trimmed = name.trim()
  if (trimmed.length < 1) return 'Enter a name so we know whose profile this is.'
  if (trimmed.length > NAME_MAX) return `Keep the name under ${NAME_MAX} characters.`
  return null
}

export type LoginResult =
  | { ok: true; id: string; needsOnboarding: boolean; unpinned: boolean }
  | { ok: false; reason: 'unknown-name' | 'pin-format' | 'wrong-pin' }

export type LoginFailure = Extract<LoginResult, { ok: false }>['reason']

/**
 * Plain-language failure text.
 *
 * "No profile called X" is deliberate: on a device with several people, the
 * likeliest cause of a failed name is a typo or a different name, not a
 * stranger. It also never reveals whether a given name exists to someone
 * without the PIN — though on a shared laptop that is a weak secret anyway,
 * which is exactly why the disclosure is shown next to the field.
 */
export function loginMessage(reason: LoginFailure, name: string): string {
  const shown = name.trim() || 'that name'
  switch (reason) {
    case 'unknown-name':
      return `No profile called “${shown}” on this device.`
    case 'pin-format':
      return 'The PIN must be 4–12 digits.'
    case 'wrong-pin':
      return 'That PIN does not match. Check with the person who set it.'
  }
}

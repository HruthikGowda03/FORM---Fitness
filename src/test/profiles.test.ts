import { describe, expect, it } from 'vitest'

import { reducer } from '@/store/AppStore'
import {
  emptyState,
  newLocalProfile,
  sanitiseState,
  fromImportBundle,
  toExportBundle,
  isValidProfile,
  isValidPlan,
} from '@/lib/storage'
import { hashPin, isValidPin, verifyPin, PIN_MIN, PIN_MAX } from '@/lib/pin'
import { makeId } from '@/lib/format'
import { defaultProfile } from '@/lib/defaults'
import type { AppState, LoggedFood, LocalProfile, ProgressEntry } from '@/types'

/* ==========================================================================
   Fixtures
   ========================================================================== */

function mkProfile(over: Partial<LocalProfile> = {}): LocalProfile {
  return { ...newLocalProfile({ name: 'Test', pinHash: null, avatarIndex: 0 }), ...over }
}

function stateWith(...profiles: LocalProfile[]): AppState {
  return {
    version: 4,
    profiles,
    activeProfileId: profiles[0]?.id ?? null,
  }
}

function entry(over: Partial<LoggedFood> = {}): LoggedFood {
  return {
    id: makeId('log'),
    foodId: 'plan:bf-oats',
    sourceMealId: 'bf-oats::0-breakfast',
    name: 'Oats',
    servings: 1,
    total: { kcal: 500, protein: 20, carbs: 60, fat: 15, fiber: 8 },
    slot: 'breakfast',
    loggedAt: '2026-09-27T08:00:00.000Z',
    ...over,
  }
}

const DATE = '2026-09-27'

/* ==========================================================================
   Profile lifecycle
   ========================================================================== */

describe('creating profiles', () => {
  it('starts with none and none active', () => {
    const s = emptyState()
    expect(s.profiles).toEqual([])
    expect(s.activeProfileId).toBeNull()
  })

  it('creates and activates a profile', () => {
    const s = reducer(emptyState(), {
      type: 'profile/create',
      id: 'p1',
      name: 'Priya',
      pinHash: null,
      avatarIndex: 2,
    })
    expect(s.profiles).toHaveLength(1)
    expect(s.activeProfileId).toBe('p1')
    expect(s.profiles[0].name).toBe('Priya')
    expect(s.profiles[0].avatarIndex).toBe(2)
  })

  it('creates a profile with no data or onboarding flag', () => {
    const s = reducer(emptyState(), {
      type: 'profile/create', id: 'p1', name: 'A', pinHash: null, avatarIndex: 0,
    })
    expect(s.profiles[0].profile).toBeNull()
    expect(s.profiles[0].onboardingComplete).toBe(false)
    expect(s.profiles[0].logs).toEqual({})
  })

  it('keeps existing profiles when adding another', () => {
    let s = reducer(emptyState(), { type: 'profile/create', id: 'p1', name: 'A', pinHash: null, avatarIndex: 0 })
    s = reducer(s, { type: 'profile/create', id: 'p2', name: 'B', pinHash: null, avatarIndex: 1 })
    expect(s.profiles).toHaveLength(2)
    expect(s.activeProfileId).toBe('p2')
  })

  it('gives every profile a unique id', () => {
    const a = newLocalProfile({ name: 'Same', pinHash: null, avatarIndex: 0 })
    const b = newLocalProfile({ name: 'Same', pinHash: null, avatarIndex: 0 })
    expect(a.id).not.toBe(b.id)
  })
})

describe('switching profiles', () => {
  const p1 = mkProfile({ id: 'p1', name: 'A' })
  const p2 = mkProfile({ id: 'p2', name: 'B' })

  it('switches the active profile', () => {
    const s = reducer(stateWith(p1, p2), { type: 'profile/select', id: 'p2' })
    expect(s.activeProfileId).toBe('p2')
  })

  it('updates lastOpenedAt on the opened profile only', () => {
    const s = reducer(stateWith(p1, p2), { type: 'profile/select', id: 'p2' })
    expect(s.profiles[0].lastOpenedAt).toBe(p1.lastOpenedAt)
    expect(s.profiles[1].lastOpenedAt).not.toBe(p2.lastOpenedAt)
  })

  it('closes to the gate', () => {
    const s = reducer(stateWith(p1, p2), { type: 'profile/close' })
    expect(s.activeProfileId).toBe('')
    expect(s.profiles).toHaveLength(2)
  })

  it('an empty id passed to select is ignored, not treated as close', () => {
    // `select` targets a real profile; closing is its own action so a bad id
    // can never accidentally lock the user out of the app.
    const s = reducer(stateWith(p1), { type: 'profile/select', id: '' })
    expect(s.activeProfileId).toBe('p1')
  })

  it('ignores an unknown id', () => {
    const s = reducer(stateWith(p1), { type: 'profile/select', id: 'nope' })
    expect(s.activeProfileId).toBe('p1')
  })
})

describe('renaming, pinning and removing', () => {
  it('renames', () => {
    const s = reducer(stateWith(mkProfile({ id: 'p1' })), {
      type: 'profile/rename', id: 'p1', name: 'New Name',
    })
    expect(s.profiles[0].name).toBe('New Name')
  })

  it('truncates a long name', () => {
    const s = reducer(stateWith(mkProfile({ id: 'p1' })), {
      type: 'profile/rename', id: 'p1', name: 'x'.repeat(200),
    })
    expect(s.profiles[0].name).toHaveLength(40)
  })

  it('sets and clears a PIN', () => {
    let s = reducer(stateWith(mkProfile({ id: 'p1' })), { type: 'profile/setPin', id: 'p1', pinHash: 'sha256$x$y' })
    expect(s.profiles[0].pinHash).toBe('sha256$x$y')
    s = reducer(s, { type: 'profile/setPin', id: 'p1', pinHash: null })
    expect(s.profiles[0].pinHash).toBeNull()
  })

  it('removes a profile', () => {
    const s = reducer(stateWith(mkProfile({ id: 'p1' }), mkProfile({ id: 'p2' })), {
      type: 'profile/remove', id: 'p1',
    })
    expect(s.profiles).toHaveLength(1)
    expect(s.profiles[0].id).toBe('p2')
  })

  it('re-selects the first profile when the active one is removed', () => {
    const s = reducer(stateWith(mkProfile({ id: 'p1' }), mkProfile({ id: 'p2' })), {
      type: 'profile/remove', id: 'p1',
    })
    expect(s.activeProfileId).toBe('p2')
  })

  it('leaves activeProfileId null when the last profile is removed', () => {
    const s = reducer(stateWith(mkProfile({ id: 'p1' })), { type: 'profile/remove', id: 'p1' })
    expect(s.profiles).toHaveLength(0)
    expect(s.activeProfileId).toBeNull()
  })
})

/* ==========================================================================
   Profile isolation — the reason this feature exists
   ========================================================================== */

describe('profiles are isolated', () => {
  it('logging in one profile does not touch another', () => {
    const a = mkProfile({ id: 'p1', name: 'A' })
    const b = mkProfile({ id: 'p2', name: 'B' })

    let s = stateWith(a, b)
    // Log against p1 by making it active first.
    s = reducer(s, { type: 'profile/select', id: 'p1' })
    s = reducer(s, { type: 'data/logAdd', date: DATE, entry: entry() })

    expect(s.profiles.find((p) => p.id === 'p1')!.logs).toHaveProperty(DATE)
    expect(s.profiles.find((p) => p.id === 'p2')!.logs).toEqual({})
  })

  it('switching does not carry progress across', () => {
    const progress: ProgressEntry = { id: 'x', date: DATE, energy: 9 }
    const a = mkProfile({ id: 'p1', progress: [] })
    const b = mkProfile({ id: 'p2', progress: [progress] })

    let s = stateWith(a, b)
    s = reducer(s, { type: 'profile/select', id: 'p1' })
    s = reducer(s, { type: 'data/progressAdd', entry: { id: 'y', date: DATE, energy: 3 } })

    expect(s.profiles.find((p) => p.id === 'p1')!.progress).toHaveLength(1)
    expect(s.profiles.find((p) => p.id === 'p2')!.progress).toHaveLength(1)
    expect(s.profiles.find((p) => p.id === 'p2')!.progress[0].id).toBe('x')
  })

  it('deleting a profile leaves the other untouched', () => {
    const a = mkProfile({ id: 'p1', logs: { [DATE]: { date: DATE, meals: [entry()], waterMl: 500, completedMealIds: [] } } })
    const b = mkProfile({ id: 'p2' })

    const s = reducer(stateWith(a, b), { type: 'profile/remove', id: 'p1' })
    expect(s.profiles[0].id).toBe('p2')
    expect(s.profiles[0].logs).toEqual({})
  })
})

/* ==========================================================================
   Per-profile data actions
   ========================================================================== */

describe('per-profile data', () => {
  it('does nothing when no profile is active', () => {
    const s = reducer(emptyState(), { type: 'data/logAdd', date: DATE, entry: entry() })
    expect(s.profiles).toHaveLength(0)
  })

  it('sets the profile and builds a plan', () => {
    let s = stateWith(mkProfile({ id: 'p1' }))
    s = reducer(s, {
      type: 'data/onboardingComplete',
      profile: { ...defaultProfile(), isAdult: true, age: 30 },
    })
    expect(s.profiles[0].onboardingComplete).toBe(true)
    expect(s.profiles[0].plan?.days).toHaveLength(7)
  })

  it('merging a repeated log still works per profile', () => {
    let s = stateWith(mkProfile({ id: 'p1' }))
    s = reducer(s, { type: 'data/logAdd', date: DATE, entry: entry() })
    s = reducer(s, { type: 'data/logAdd', date: DATE, entry: entry() })
    const log = s.profiles[0].logs[DATE]
    expect(log.meals).toHaveLength(1)
    expect(log.meals[0].servings).toBe(2)
  })

  it('resetting onboarding clears only the active profile', () => {
    const a = mkProfile({ id: 'p1', onboardingComplete: true })
    const b = mkProfile({ id: 'p2', onboardingComplete: true })
    const s = reducer(stateWith(a, b), { type: 'data/resetOnboarding' })
    expect(s.profiles.find((p) => p.id === 'p1')!.onboardingComplete).toBe(false)
    expect(s.profiles.find((p) => p.id === 'p2')!.onboardingComplete).toBe(true)
  })
})

/* ==========================================================================
   The wizard's answers have to land on a profile
   --------------------------------------------------------------------------
   `/onboarding` used to be reachable with no profile open, so the reducer hit
   its `if (!active) return state` guard and threw the answers away without a
   sound. The user answered all nine questions, hit Finish, and was then asked
   to create a profile — as though none of it had counted. Nothing was wrong
   with the nine answers; there was simply nothing to attach them to.

   The fix was in routing (the wizard now requires a profile), which makes this
   reducer behaviour load-bearing rather than incidental. These tests are here
   so that guard stays deliberate: if it is ever relaxed, the silent data loss
   comes straight back.
   ========================================================================== */

describe('finishing the wizard', () => {
  it('silently discards the answers when no profile is open', () => {
    // The trap. Documented deliberately: this is what made nine steps of input
    // vanish. It must stay a *no-op* rather than throw, so the route guard is
    // the only thing standing between a user and lost work.
    const s = reducer(emptyState(), {
      type: 'data/onboardingComplete',
      profile: { ...defaultProfile(), isAdult: true, age: 30 },
    })
    expect(s.profiles).toHaveLength(0)
    expect(s.activeProfileId).toBeNull()
  })

  it('attaches the answers and builds a seven-day plan', () => {
    let s = stateWith(mkProfile({ id: 'p1' }))
    s = reducer(s, {
      type: 'data/onboardingComplete',
      profile: { ...defaultProfile(), isAdult: true, age: 30 },
    })
    expect(s.profiles[0].onboardingComplete).toBe(true)
    expect(s.profiles[0].profile?.age).toBe(30)
    expect(s.profiles[0].plan?.days).toHaveLength(7)
  })

  it('is reachable only through a selected profile, never a stale id', () => {
    // `activeProfileId` pointing at a removed profile must not resurrect data
    // onto the wrong person — or, worse, appear to succeed.
    const s = stateWith(mkProfile({ id: 'p1' }))
    const orphaned: AppState = { ...s, activeProfileId: 'gone' }
    const after = reducer(orphaned, {
      type: 'data/onboardingComplete',
      profile: { ...defaultProfile(), isAdult: true, age: 30 },
    })
    expect(after.profiles[0].onboardingComplete).toBe(false)
    expect(after.profiles[0].profile).toBeNull()
  })
})

/* ==========================================================================
   PIN
   ========================================================================== */

describe('PIN hashing', () => {
  it('validates length and digits', () => {
    expect(isValidPin('1234')).toBe(true)
    expect(isValidPin('12')).toBe(false)
    expect(isValidPin('1234567890123')).toBe(false)
    expect(isValidPin('12a4')).toBe(false)
    expect(isValidPin('')).toBe(false)
  })

  it('accepts the documented bounds', () => {
    expect(isValidPin('1'.repeat(PIN_MIN))).toBe(true)
    expect(isValidPin('1'.repeat(PIN_MAX))).toBe(true)
  })

  it('verifies the right PIN and rejects the wrong one', async () => {
    const hash = await hashPin('4821', 'profile-1')
    await expect(verifyPin('4821', hash)).resolves.toBe(true)
    await expect(verifyPin('1111', hash)).resolves.toBe(false)
  })

  it('never stores the PIN in plaintext', async () => {
    const hash = await hashPin('4821', 'profile-1')
    expect(hash).not.toContain('4821')
  })

  it('salts, so the same PIN hashes differently per profile', async () => {
    const a = await hashPin('4821', 'profile-1')
    const b = await hashPin('4821', 'profile-2')
    expect(a).not.toBe(b)
  })

  it('a null hash always verifies — an unlocked profile', async () => {
    await expect(verifyPin('anything', null)).resolves.toBe(true)
  })

  it('a malformed hash does not verify and does not throw', async () => {
    await expect(verifyPin('1234', '')).resolves.toBe(false)
    await expect(verifyPin('1234', 'garbage')).resolves.toBe(false)
    await expect(verifyPin('1234', 'sha256$$')).resolves.toBe(false)
  })

  it('a wrong-scheme hash is rejected', async () => {
    await expect(verifyPin('1234', 'bcrypt$salt$hash')).resolves.toBe(false)
  })
})

/* ==========================================================================
   Persistence and migration
   ========================================================================== */

describe('state validation', () => {
  it('rejects non-objects', () => {
    expect(sanitiseState(null)).toBeNull()
    expect(sanitiseState('nope')).toBeNull()
    expect(sanitiseState([1])).toBeNull()
  })

  it('rejects an unknown version', () => {
    expect(sanitiseState({ version: 99, profiles: [] })).toBeNull()
  })

  it('accepts a valid empty state', () => {
    const s = sanitiseState(emptyState())
    expect(s).not.toBeNull()
    expect(s!.profiles).toEqual([])
  })

  it('drops a malformed profile but keeps the good ones', () => {
    const s = sanitiseState({
      version: 4,
      profiles: [mkProfile({ id: 'good' }), { noId: true }, null],
      activeProfileId: 'good',
    })
    expect(s!.profiles).toHaveLength(1)
    expect(s!.profiles[0].id).toBe('good')
  })

  it('falls back to the first profile when activeProfileId is stale', () => {
    const s = sanitiseState({
      version: 4,
      profiles: [mkProfile({ id: 'a' })],
      activeProfileId: 'deleted',
    })
    expect(s!.activeProfileId).toBe('a')
  })

  it('preserves "closed to the picker" as a distinct state', () => {
    // An empty id means the user dismissed the app without deleting their
    // profiles, so it must survive a reload rather than silently re-opening
    // the first one.
    const s = sanitiseState({
      version: 4,
      profiles: [mkProfile({ id: 'a' })],
      activeProfileId: '',
    })
    expect(s!.activeProfileId).toBe('')
    expect(s!.profiles).toHaveLength(1)
  })

  it('uses null when there are no profiles at all', () => {
    const s = sanitiseState({ version: 4, profiles: [], activeProfileId: '' })
    expect(s!.activeProfileId).toBeNull()
  })

  it('keeps only well-formed progress entries', () => {
    const s = sanitiseState({
      version: 4,
      profiles: [mkProfile({ id: 'a' })],
      activeProfileId: 'a',
    })
    expect(s).not.toBeNull()
  })

  it('normalises an out-of-range avatar index', () => {
    const s = sanitiseState({
      version: 4,
      profiles: [mkProfile({ id: 'a', avatarIndex: 99 })],
      activeProfileId: 'a',
    })
    expect(s!.profiles[0].avatarIndex).toBeGreaterThanOrEqual(0)
    expect(s!.profiles[0].avatarIndex).toBeLessThan(8)
  })
})

describe('migrating a v3 single-profile state', () => {
  const v3 = {
    version: 3,
    profile: { ...defaultProfile(), isAdult: true, age: 30 },
    plan: null,
    logs: {},
    progress: [{ id: 'p1', date: '2026-01-01', energy: 7 }],
    grocery: [],
    customFoods: [],
    onboardingComplete: true,
  }

  it('becomes one profile', () => {
    const s = sanitiseState(v3)
    expect(s).not.toBeNull()
    expect(s!.profiles).toHaveLength(1)
    expect(s!.activeProfileId).toBe(s!.profiles[0].id)
  })

  it('keeps the profile, progress and onboarding flag', () => {
    const s = sanitiseState(v3)!
    expect(isValidProfile(s.profiles[0].profile)).toBe(true)
    expect(s.profiles[0].progress).toHaveLength(1)
    expect(s.profiles[0].onboardingComplete).toBe(true)
  })

  it('takes the name from the old profile', () => {
    const s = sanitiseState({ ...v3, profile: { ...v3.profile, name: 'Priya' } })!
    expect(s.profiles[0].name).toBe('Priya')
  })

  it('has no PIN — migration cannot invent one', () => {
    expect(sanitiseState(v3)!.profiles[0].pinHash).toBeNull()
  })

  it('migrates legacy concatenated meal ids', () => {
    const s = sanitiseState({
      ...v3,
      logs: {
        '2026-01-01': {
          date: '2026-01-01',
          waterMl: 0,
          completedMealIds: [],
          meals: [
            { id: 'a', foodId: 'idli+dal+coconut', name: 'Idli', servings: 1, total: { kcal: 400, protein: 12, carbs: 60, fat: 10, fiber: 6 }, slot: 'breakfast', loggedAt: 'x' },
            { id: 'b', foodId: 'idli+dal+coconut', name: 'Idli', servings: 1, total: { kcal: 400, protein: 12, carbs: 60, fat: 10, fiber: 6 }, slot: 'breakfast', loggedAt: 'x' },
          ],
        },
      },
    })!
    const meals = s.profiles[0].logs['2026-01-01'].meals
    expect(meals).toHaveLength(1)
    expect(meals[0].foodId).toBe('plan:legacy')
    expect(meals[0].total.kcal).toBe(800)
  })
})

describe('import / export', () => {
  it('round-trips every profile', () => {
    const a = mkProfile({ id: 'p1', name: 'A' })
    const b = mkProfile({ id: 'p2', name: 'B' })
    const state = stateWith(a, b)
    const restored = fromImportBundle(JSON.stringify(toExportBundle(state)))
    expect(restored.profiles).toHaveLength(2)
    expect(restored.profiles.map((p) => p.name)).toEqual(['A', 'B'])
    expect(restored.activeProfileId).toBe('p1')
  })

  it('never exports a plaintext PIN', () => {
    const state = stateWith(mkProfile({ id: 'p1', pinHash: 'sha256$salt$hash' }))
    const json = JSON.stringify(toExportBundle(state))
    expect(json).toContain('sha256')
    expect(json).not.toContain('4821')
  })

  it('accepts a bare state object', () => {
    const s = fromImportBundle(JSON.stringify(emptyState()))
    expect(s.profiles).toEqual([])
  })

  it('rejects invalid JSON with a clear message', () => {
    expect(() => fromImportBundle('not json')).toThrow(/valid JSON/i)
  })

  it('rejects a foreign file', () => {
    expect(() => fromImportBundle('{"hello":"world"}')).toThrow(/FORM backup|different version/i)
  })

  it('rejects a different version rather than half-applying it', () => {
    expect(() => fromImportBundle(JSON.stringify({ version: 1 }))).toThrow(/different version/i)
  })
})

describe('validators', () => {
  it('recognises a valid plan', () => {
    expect(isValidPlan({ days: [1, 2, 3, 4, 5, 6, 7], target: {} })).toBe(true)
    expect(isValidPlan({ days: [], target: {} })).toBe(false)
  })

  it('recognises a valid profile', () => {
    expect(isValidProfile(defaultProfile())).toBe(true)
    expect(isValidProfile({ height: 'tall' })).toBe(false)
  })
})

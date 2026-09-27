/* ==========================================================================
   FORM — multi-profile persistence
   ---------------------------------------------------------------------------
   One localStorage key holds every profile on this device. Reads are
   validated field by field; a corrupt or older payload is migrated or
   discarded rather than crashing the app, and one bad profile does not take
   the others down with it.
   ========================================================================== */

import {
  AVATAR_COUNT,
  STATE_VERSION,
  type AppState,
  type DayLog,
  type Food,
  type GroceryItem,
  type LocalProfile,
  type MealPlan,
  type Profile,
  type ProgressEntry,
} from '@/types'

export const STORAGE_KEY = `form.state.v${STATE_VERSION}`
export const ONBOARDING_KEY = 'form.onboarding.draft'

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/* --------------------------------------------------------------------------
   Validation
   -------------------------------------------------------------------------- */

export function isValidProfile(v: unknown): v is Profile {
  if (!isObject(v)) return false
  return (
    typeof v.age === 'number' &&
    typeof v.isAdult === 'boolean' &&
    typeof v.heightCm === 'number' &&
    typeof v.weightKg === 'number' &&
    typeof v.goal === 'string' &&
    typeof v.diet === 'string' &&
    typeof v.mealsPerDay === 'number' &&
    Array.isArray(v.allergens) &&
    Array.isArray(v.excludeIngredients)
  )
}

export function isValidPlan(v: unknown): v is MealPlan {
  return isObject(v) && Array.isArray(v.days) && v.days.length === 7 && isObject(v.target)
}

export function isValidFood(v: unknown): v is Food {
  return (
    isObject(v) &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    isObject(v.per) &&
    isObject(v.serving)
  )
}

/* --------------------------------------------------------------------------
   Legacy meal-id migration
   -------------------------------------------------------------------------- */

import type { LoggedFood } from '@/types'

/**
 * Earlier builds stored a planned meal's `foodId` as every ingredient id
 * joined with "+". That string can never resolve to a food, and it made a meal
 * logged twice look like two unrelated rows that both double-counted the day.
 * The joined string is unique per meal, so it doubles as the migration key.
 */
function migrateMeals(meals: DayLog['meals']): DayLog['meals'] {
  const byKey = new Map<string, LoggedFood>()

  for (const raw of meals) {
    if (!isObject(raw) || typeof raw.id !== 'string') continue
    const m = raw as LoggedFood
    if (!isObject(m.total)) continue

    const legacy = typeof m.foodId === 'string' && m.foodId.includes('+')
    const key = legacy ? m.foodId : `${m.foodId}::${m.sourceMealId ?? m.slot}`

    const existing = byKey.get(key)
    if (!existing) {
      byKey.set(key, { ...m, foodId: legacy ? 'plan:legacy' : m.foodId })
      continue
    }

    const scale = (n: number) => Math.round(n * 10) / 10
    byKey.set(key, {
      ...existing,
      servings: existing.servings + (m.servings ?? 1),
      total: {
        kcal: existing.total.kcal + m.total.kcal,
        protein: scale(existing.total.protein + m.total.protein),
        carbs: scale(existing.total.carbs + m.total.carbs),
        fat: scale(existing.total.fat + m.total.fat),
        fiber: scale(existing.total.fiber + (m.total.fiber ?? 0)),
      },
    })
  }

  return [...byKey.values()]
}

function sanitiseLogs(raw: unknown): Record<string, DayLog> {
  if (!isObject(raw)) return {}
  const logs: Record<string, DayLog> = {}
  for (const [date, log] of Object.entries(raw)) {
    if (!isObject(log)) continue
    logs[date] = {
      date,
      meals: Array.isArray(log.meals) ? migrateMeals(log.meals as DayLog['meals']) : [],
      waterMl: typeof log.waterMl === 'number' ? log.waterMl : 0,
      completedMealIds: Array.isArray(log.completedMealIds)
        ? (log.completedMealIds as string[])
        : [],
      notes: typeof log.notes === 'string' ? log.notes : undefined,
    }
  }
  return logs
}

/* --------------------------------------------------------------------------
   Profile sanitising
   -------------------------------------------------------------------------- */

function makeId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `p-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

export function emptyState(): AppState {
  return { version: STATE_VERSION, profiles: [], activeProfileId: null }
}

/** Build a fresh, empty local profile. */
export function newLocalProfile(input: {
  name: string
  pinHash: string | null
  avatarIndex: number
}): LocalProfile {
  const now = new Date().toISOString()
  return {
    id: makeId(),
    name: input.name.trim() || 'Profile',
    createdAt: now,
    lastOpenedAt: now,
    pinHash: input.pinHash,
    avatarIndex: input.avatarIndex % AVATAR_COUNT,
    profile: null,
    plan: null,
    logs: {},
    progress: [],
    grocery: [],
    customFoods: [],
    onboardingComplete: false,
  }
}

function sanitiseLocalProfile(raw: unknown, index: number): LocalProfile | null {
  if (!isObject(raw)) return null
  if (typeof raw.id !== 'string' || !raw.id) return null

  const created = typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString()

  return {
    id: raw.id,
    name: typeof raw.name === 'string' ? raw.name.slice(0, 40) : '',
    createdAt: created,
    lastOpenedAt: typeof raw.lastOpenedAt === 'string' ? raw.lastOpenedAt : created,
    pinHash: typeof raw.pinHash === 'string' ? raw.pinHash : null,
    avatarIndex:
      typeof raw.avatarIndex === 'number' && Number.isInteger(raw.avatarIndex)
        ? ((raw.avatarIndex % AVATAR_COUNT) + AVATAR_COUNT) % AVATAR_COUNT
        : index % AVATAR_COUNT,
    profile: isValidProfile(raw.profile) ? raw.profile : null,
    plan: isValidPlan(raw.plan) ? raw.plan : null,
    logs: sanitiseLogs(raw.logs),
    progress: Array.isArray(raw.progress)
      ? raw.progress.filter(
          (p): p is ProgressEntry =>
            isObject(p) && typeof (p as unknown as ProgressEntry).date === 'string',
        )
      : [],
    grocery: Array.isArray(raw.grocery)
      ? raw.grocery.filter((g): g is GroceryItem => isObject(g) && typeof g.foodId === 'string')
      : [],
    customFoods: Array.isArray(raw.customFoods) ? raw.customFoods.filter(isValidFood) : [],
    onboardingComplete: raw.onboardingComplete === true,
  }
}

/**
 * Accepts a v4 state, migrates a v3 single-profile state into one profile, and
 * rejects anything it cannot read rather than half-applying it.
 */
export function sanitiseState(raw: unknown): AppState | null {
  if (!isObject(raw)) return null

  if (raw.version === STATE_VERSION) {
    const profiles = Array.isArray(raw.profiles)
      ? raw.profiles
          .map((p, i) => sanitiseLocalProfile(p, i))
          .filter((p): p is LocalProfile => p !== null)
      : []
    // An empty string is meaningful: the user closed the app back to the
    // picker without deleting their profiles. Only a *stale* id (one that no
    // longer exists) should fall back to the first profile.
    let active: string | null
    if (profiles.length === 0) {
      active = null
    } else if (raw.activeProfileId === '') {
      active = ''
    } else if (
      typeof raw.activeProfileId === 'string' &&
      profiles.some((p) => p.id === raw.activeProfileId)
    ) {
      active = raw.activeProfileId
    } else {
      active = profiles[0].id
    }
    return { version: STATE_VERSION, profiles, activeProfileId: active }
  }

  // v3 → v4: one implicit profile becomes the first local profile.
  if (raw.version === 3) {
    const profile = isValidProfile(raw.profile) ? raw.profile : null
    const migrated: LocalProfile = {
      ...newLocalProfile({
        name: profile?.name ?? 'My profile',
        pinHash: null,
        avatarIndex: 0,
      }),
      profile,
      plan: isValidPlan(raw.plan) ? raw.plan : null,
      logs: sanitiseLogs(raw.logs),
      progress: Array.isArray(raw.progress)
        ? raw.progress.filter(
            (p): p is ProgressEntry =>
              isObject(p) && typeof (p as unknown as ProgressEntry).date === 'string',
          )
        : [],
      grocery: Array.isArray(raw.grocery)
        ? raw.grocery.filter((g): g is GroceryItem => isObject(g) && typeof g.foodId === 'string')
        : [],
      customFoods: Array.isArray(raw.customFoods) ? raw.customFoods.filter(isValidFood) : [],
      onboardingComplete: raw.onboardingComplete === true,
    }
    return {
      version: STATE_VERSION,
      profiles: [migrated],
      activeProfileId: migrated.id,
    }
  }

  return null
}

/* --------------------------------------------------------------------------
   Browser API
   -------------------------------------------------------------------------- */

function storage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null
    return window.localStorage
  } catch {
    return null
  }
}

export function loadState(): AppState | null {
  const s = storage()
  if (!s) return null
  try {
    const raw = s.getItem(STORAGE_KEY)
    if (!raw) return null
    return sanitiseState(JSON.parse(raw))
  } catch {
    return null
  }
}

let writeTimer: ReturnType<typeof setTimeout> | null = null
let pending: AppState | null = null

export function saveState(state: AppState, immediate = false): void {
  pending = state
  if (writeTimer) clearTimeout(writeTimer)
  if (immediate) {
    writeNow()
    return
  }
  writeTimer = setTimeout(writeNow, 300)
}

export function writeNow(): void {
  const s = storage()
  if (!s || !pending) return
  try {
    s.setItem(STORAGE_KEY, JSON.stringify(pending))
  } catch {
    // Quota exceeded — drop the plans (largest, most regenerable) and retry so
    // profiles and logs survive.
    try {
      const trimmed: AppState = {
        ...pending,
        profiles: pending.profiles.map((p) => ({ ...p, plan: null, grocery: [] })),
      }
      s.setItem(STORAGE_KEY, JSON.stringify(trimmed))
    } catch {
      /* in-memory only for this session */
    }
  }
}

export function clearState(): void {
  const s = storage()
  if (!s) return
  try {
    s.removeItem(STORAGE_KEY)
    s.removeItem(ONBOARDING_KEY)
  } catch {
    /* ignore */
  }
}

export function loadOnboardingDraft(): Partial<Profile> | null {
  const s = storage()
  if (!s) return null
  try {
    const raw = s.getItem(ONBOARDING_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    return isObject(parsed) ? (parsed as Partial<Profile>) : null
  } catch {
    return null
  }
}

export function saveOnboardingDraft(draft: Partial<Profile>): void {
  const s = storage()
  if (!s) return
  try {
    s.setItem(ONBOARDING_KEY, JSON.stringify(draft))
  } catch {
    /* ignore */
  }
}

export function clearOnboardingDraft(): void {
  const s = storage()
  if (!s) return
  try {
    s.removeItem(ONBOARDING_KEY)
  } catch {
    /* ignore */
  }
}

/* --------------------------------------------------------------------------
   Import / export
   -------------------------------------------------------------------------- */

export type ExportBundle = {
  app: 'FORM'
  kind: 'profiles'
  version: number
  exportedAt: string
  data: AppState
}

export function toExportBundle(state: AppState): ExportBundle {
  return {
    app: 'FORM',
    kind: 'profiles',
    version: STATE_VERSION,
    exportedAt: new Date().toISOString(),
    data: state,
  }
}

export function fromImportBundle(text: string): AppState {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }

  if (!isObject(parsed)) throw new Error('That file does not contain a FORM backup.')

  const candidate = 'data' in parsed ? parsed.data : parsed
  const state = sanitiseState(candidate)
  if (!state) {
    throw new Error(
      'That backup was made by a different version of FORM, so it cannot be read safely. Nothing was changed.',
    )
  }
  return state
}

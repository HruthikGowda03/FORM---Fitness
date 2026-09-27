/* ==========================================================================
   FORM — application store (multi-profile)
   ---------------------------------------------------------------------------
   The persisted shape is a list of local profiles; the reducer operates on
   whichever one is active. Every existing action therefore edits a
   `LocalProfile`, and profile switching is a top-level concern.

   Derived values (calorie basis, targets, plan) are memoised from the active
   profile so there is exactly one source of truth for every number in the UI.
   ========================================================================== */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'

import { bmi, bmiBand, computePlanTargets, evaluateSafety } from '@/lib/nutrition'
import { generateMealPlan, toISODate } from '@/lib/meal-plan'
import { buildGroceryList, type PriceOverrides } from '@/lib/prices'
import { hashPin, isValidPin, verifyPin } from '@/lib/pin'
import { findByName, type LoginResult } from '@/lib/auth'
import {
  clearOnboardingDraft,
  emptyState,
  loadState,
  newLocalProfile,
  saveState,
  writeNow,
} from '@/lib/storage'
import { hashPin as hashPinFor } from '@/lib/pin'
import {
  type AppState,
  type DayLog,
  type Food,
  type GroceryItem,
  type LocalProfile,
  type LoggedFood,
  type MealPlan,
  type NutritionFacts,
  type PlannedMeal,
  type Profile,
  type ProgressEntry,
  type SafetyStatus,
} from '@/types'

/* --------------------------------------------------------------------------
   Actions
   -------------------------------------------------------------------------- */

type Action =
  /* profile lifecycle */
  | { type: 'profile/create'; id: string; name: string; pinHash: string | null; avatarIndex: number }
  | { type: 'profile/select'; id: string }
  | { type: 'profile/close' }
  | { type: 'profile/rename'; id: string; name: string }
  | { type: 'profile/setPin'; id: string; pinHash: string | null }
  | { type: 'profile/remove'; id: string }
  /* per-profile data */
  | { type: 'data/setProfile'; patch: Partial<Profile> }
  | { type: 'data/replaceProfile'; profile: Profile }
  | { type: 'data/onboardingComplete'; profile: Profile }
  | { type: 'data/resetOnboarding' }
  | { type: 'data/planSet'; plan: MealPlan | null }
  | { type: 'data/regenerateDay'; dayIndex: number; seed: number }
  | { type: 'data/swapMeal'; dayIndex: number; mealId: string; meal: PlannedMeal }
  | { type: 'data/setServings'; dayIndex: number; mealId: string; foodId: string; servings: number }
  | { type: 'data/toggleCompleted'; date: string; mealId: string }
  | { type: 'data/logAdd'; date: string; entry: LoggedFood }
  | { type: 'data/logRemove'; date: string; entryId: string }
  | { type: 'data/logWater'; date: string; delta: number }
  | { type: 'data/logSetWater'; date: string; ml: number }
  | { type: 'data/grocerySet'; items: GroceryItem[] }
  | { type: 'data/groceryToggle'; foodId: string }
  | { type: 'data/groceryQuantity'; foodId: string; grams: number | undefined }
  | { type: 'data/groceryClearChecks' }
  | { type: 'data/progressAdd'; entry: ProgressEntry }
  | { type: 'data/progressRemove'; id: string }
  | { type: 'data/customFoodAdd'; food: Food }
  | { type: 'data/customFoodRemove'; id: string }
  | { type: 'state/replace'; state: AppState }

/* --------------------------------------------------------------------------
   Helpers
   -------------------------------------------------------------------------- */

export function emptyLog(date: string): DayLog {
  return { date, meals: [], waterMl: 0, completedMealIds: [] }
}

export function logTotals(log: DayLog | undefined): NutritionFacts {
  if (!log) return { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  return log.meals.reduce<NutritionFacts>(
    (acc, m) => ({
      kcal: acc.kcal + m.total.kcal,
      protein: acc.protein + m.total.protein,
      carbs: acc.carbs + m.total.carbs,
      fat: acc.fat + m.total.fat,
      fiber: acc.fiber + m.total.fiber,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  )
}

function withLog(
  p: LocalProfile,
  date: string,
  update: (log: DayLog) => DayLog,
): LocalProfile {
  const existing = p.logs[date] ?? emptyLog(date)
  const next = update(existing)
  const logs = { ...p.logs, [date]: next }
  // Sorted so exports are stable and diffable.
  const ordered: Record<string, DayLog> = {}
  for (const key of Object.keys(logs).sort()) ordered[key] = logs[key]
  return { ...p, logs: ordered }
}

function rescaleMeal(
  meal: PlannedMeal,
  foodId: string,
  servings: number,
): PlannedMeal {
  const items = meal.items.map((item) => {
    if (item.foodId !== foodId) return item
    return {
      ...item,
      servings,
      kcal: Math.round(item.food.per.kcal * servings * 10) / 10,
      protein: Math.round(item.food.per.protein * servings * 10) / 10,
      carbs: Math.round(item.food.per.carbs * servings * 10) / 10,
      fat: Math.round(item.food.per.fat * servings * 10) / 10,
    }
  })

  const total = items.reduce<NutritionFacts>(
    (acc, i) => ({
      kcal: acc.kcal + i.kcal,
      protein: acc.protein + i.protein,
      carbs: acc.carbs + i.carbs,
      fat: acc.fat + i.fat,
      fiber: acc.fiber + i.food.per.fiber * i.servings,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  )

  const cost = items.reduce(
    (sum, i) => sum + (i.food.costPerKg * i.food.serving.grams * i.servings) / 1000,
    0,
  )

  const round1 = (n: number) => Math.round(n * 10) / 10
  return {
    ...meal,
    items,
    total: {
      kcal: Math.round(total.kcal),
      protein: round1(total.protein),
      carbs: round1(total.carbs),
      fat: round1(total.fat),
      fiber: round1(total.fiber),
    },
    cost,
  }
}

function recomputeDay(day: MealPlan['days'][number]): MealPlan['days'][number] {
  return {
    ...day,
    total: day.meals.reduce<NutritionFacts>(
      (acc, m) => ({
        kcal: acc.kcal + m.total.kcal,
        protein: acc.protein + m.total.protein,
        carbs: acc.carbs + m.total.carbs,
        fat: acc.fat + m.total.fat,
        fiber: acc.fiber + m.total.fiber,
      }),
      { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    ),
    cost: day.meals.reduce((s, m) => s + m.cost, 0),
    prepMinutes: day.meals.reduce((s, m) => s + m.prepMinutes, 0),
  }
}

function buildPlanFor(p: LocalProfile): MealPlan | null {
  if (!p.profile) return null
  const { targets } = computePlanTargets(p.profile)
  if (!targets) return null

  const fresh = generateMealPlan({
    profile: p.profile,
    target: targets,
    customFoods: p.customFoods,
  })

  // Carry over portion edits the user already made.
  const previous = p.plan
  if (previous) {
    const prior = new Map<string, number>()
    for (const day of previous.days) {
      for (const meal of day.meals) {
        if (!meal.templateId) continue
        for (const item of meal.items) {
          prior.set(`${day.date}:${meal.templateId}:${item.foodId}`, item.servings)
        }
      }
    }

    fresh.days = fresh.days.map((day) => {
      const meals = day.meals.map((meal) => {
        if (!meal.templateId) return meal
        let out = meal
        for (const item of meal.items) {
          const key = `${day.date}:${meal.templateId}:${item.foodId}`
          const was = prior.get(key)
          if (was !== undefined && was !== item.servings) {
            out = rescaleMeal(out, item.foodId, was)
          }
        }
        return out
      })
      return recomputeDay({ ...day, meals })
    })
  }

  return fresh
}

/* --------------------------------------------------------------------------
   Per-profile data reducer
   -------------------------------------------------------------------------- */

function dataReducer(p: LocalProfile, action: Action): LocalProfile {
  switch (action.type) {
    case 'data/setProfile': {
      if (!p.profile) return p
      return { ...p, profile: { ...p.profile, ...action.patch, updatedAt: new Date().toISOString() } }
    }

    case 'data/replaceProfile':
      return { ...p, profile: action.profile }

    case 'data/onboardingComplete': {
      clearOnboardingDraft()
      const next: LocalProfile = { ...p, profile: action.profile, onboardingComplete: true }
      return { ...next, plan: buildPlanFor(next) }
    }

    case 'data/resetOnboarding':
      clearOnboardingDraft()
      return {
        ...p,
        profile: null,
        plan: null,
        logs: {},
        progress: [],
        grocery: [],
        onboardingComplete: false,
      }

    case 'data/planSet':
      return { ...p, plan: action.plan }

    case 'data/regenerateDay': {
      if (!p.profile || !p.plan) return p
      const next = generateMealPlan({
        profile: p.profile,
        target: p.plan.target,
        seed: action.seed,
        customFoods: p.customFoods,
      })
      const days = p.plan.days.map((day, i) =>
        i === action.dayIndex ? recomputeDay(next.days[i]) : day,
      )
      return { ...p, plan: { ...p.plan, days, seed: action.seed } }
    }

    case 'data/swapMeal': {
      if (!p.plan) return p
      const days = p.plan.days.map((day, i) => {
        if (i !== action.dayIndex) return day
        return recomputeDay({
          ...day,
          meals: day.meals.map((m) => (m.id === action.mealId ? action.meal : m)),
        })
      })
      return { ...p, plan: { ...p.plan, days } }
    }

    case 'data/setServings': {
      if (!p.plan) return p
      const days = p.plan.days.map((day, i) => {
        if (i !== action.dayIndex) return day
        return recomputeDay({
          ...day,
          meals: day.meals.map((m) =>
            m.id === action.mealId ? rescaleMeal(m, action.foodId, action.servings) : m,
          ),
        })
      })
      return { ...p, plan: { ...p.plan, days } }
    }

    case 'data/toggleCompleted':
      return withLog(p, action.date, (log) => {
        const has = log.completedMealIds.includes(action.mealId)
        return {
          ...log,
          completedMealIds: has
            ? log.completedMealIds.filter((id) => id !== action.mealId)
            : [...log.completedMealIds, action.mealId],
        }
      })

    case 'data/logAdd':
      return withLog(p, action.date, (log) => {
        // A second row for the same meal reads as a bug and silently inflates
        // the day's total, so merge on identity and sum both.
        const dup = log.meals.findIndex(
          (m) =>
            m.foodId === action.entry.foodId &&
            m.sourceMealId === action.entry.sourceMealId,
        )
        if (dup === -1) return { ...log, meals: [...log.meals, action.entry] }

        const existing = log.meals[dup]
        const scale = (n: number) => Math.round(n * 10) / 10
        const meals = [...log.meals]
        meals[dup] = {
          ...existing,
          servings: existing.servings + action.entry.servings,
          total: {
            kcal: existing.total.kcal + action.entry.total.kcal,
            protein: scale(existing.total.protein + action.entry.total.protein),
            carbs: scale(existing.total.carbs + action.entry.total.carbs),
            fat: scale(existing.total.fat + action.entry.total.fat),
            fiber: scale(existing.total.fiber + action.entry.total.fiber),
          },
          loggedAt: action.entry.loggedAt,
        }
        return { ...log, meals }
      })

    case 'data/logRemove':
      return withLog(p, action.date, (log) => ({
        ...log,
        meals: log.meals.filter((m) => m.id !== action.entryId),
      }))

    case 'data/logWater':
      return withLog(p, action.date, (log) => ({
        ...log,
        waterMl: Math.max(0, Math.min(8000, log.waterMl + action.delta)),
      }))

    case 'data/logSetWater':
      return withLog(p, action.date, (log) => ({
        ...log,
        waterMl: Math.max(0, Math.min(8000, action.ml)),
      }))

    case 'data/grocerySet':
      return { ...p, grocery: action.items }

    case 'data/groceryToggle':
      return {
        ...p,
        grocery: p.grocery.map((i) =>
          i.foodId === action.foodId ? { ...i, checked: !i.checked } : i,
        ),
      }

    case 'data/groceryQuantity':
      return {
        ...p,
        grocery: p.grocery.map((i) =>
          i.foodId === action.foodId ? { ...i, quantityOverride: action.grams } : i,
        ),
      }

    case 'data/groceryClearChecks':
      return { ...p, grocery: p.grocery.map((i) => ({ ...i, checked: false })) }

    case 'data/progressAdd':
      return {
        ...p,
        progress: [...p.progress.filter((e) => e.id !== action.entry.id), action.entry].sort(
          (a, b) => a.date.localeCompare(b.date),
        ),
      }

    case 'data/progressRemove':
      return { ...p, progress: p.progress.filter((e) => e.id !== action.id) }

    case 'data/customFoodAdd':
      return {
        ...p,
        customFoods: [...p.customFoods.filter((f) => f.id !== action.food.id), action.food],
      }

    case 'data/customFoodRemove':
      return { ...p, customFoods: p.customFoods.filter((f) => f.id !== action.id) }

    default:
      return p
  }
}

/* --------------------------------------------------------------------------
   Root reducer
   -------------------------------------------------------------------------- */

function touch(p: LocalProfile): LocalProfile {
  return { ...p, lastOpenedAt: new Date().toISOString() }
}

export function reducer(state: AppState, action: Action): AppState {
  if (action.type === 'state/replace') return action.state

  const idx = state.profiles.findIndex((p) => p.id === state.activeProfileId)
  const active = idx >= 0 ? state.profiles[idx] : null

  switch (action.type) {
    case 'profile/create': {
      // The id arrives pre-computed (see `createProfile`) so the PIN hash was
      // salted with the real value.
      const now = new Date().toISOString()
      const profile: LocalProfile = {
        id: action.id,
        name: action.name,
        createdAt: now,
        lastOpenedAt: now,
        pinHash: action.pinHash,
        avatarIndex: action.avatarIndex,
        profile: null,
        plan: null,
        logs: {},
        progress: [],
        grocery: [],
        customFoods: [],
        onboardingComplete: false,
      }
      return { ...state, profiles: [...state.profiles, profile], activeProfileId: profile.id }
    }

    case 'profile/select': {
      if (!state.profiles.some((p) => p.id === action.id)) return state
      return {
        ...state,
        activeProfileId: action.id,
        profiles: state.profiles.map((p) => (p.id === action.id ? touch(p) : p)),
      }
    }

    case 'profile/close':
      return { ...state, activeProfileId: '' }

    case 'profile/rename':
      return {
        ...state,
        profiles: state.profiles.map((p) =>
          p.id === action.id ? { ...p, name: action.name.slice(0, 40) } : p,
        ),
      }

    case 'profile/setPin':
      return {
        ...state,
        profiles: state.profiles.map((p) =>
          p.id === action.id ? { ...p, pinHash: action.pinHash } : p,
        ),
      }

    case 'profile/remove': {
      const profiles = state.profiles.filter((p) => p.id !== action.id)
      const activeProfileId =
        state.activeProfileId === action.id
          ? (profiles[0]?.id ?? null)
          : state.activeProfileId
      return { ...state, profiles, activeProfileId }
    }

    default: {
      if (!active) return state
      const next = dataReducer(active, action)
      if (next === active) return state
      return {
        ...state,
        profiles: state.profiles.map((p) => (p.id === active.id ? next : p)),
      }
    }
  }
}

/* --------------------------------------------------------------------------
   Context
   -------------------------------------------------------------------------- */

export type Derived = {
  today: string
  safety: SafetyStatus | null
  basis: ReturnType<typeof computePlanTargets>['basis']
  targets: NutritionFacts | null
  todayTotals: NutritionFacts
  remaining: number
  bmiValue: number
  bmiLabel: ReturnType<typeof bmiBand>
  isGated: boolean
}

export type AppActions = {
  createProfile: (input: {
    name: string
    pin?: string
    avatarIndex: number
  }) => Promise<string>
  /**
   * The returning-user path: resolve a typed name to a profile, check the PIN,
   * and open it. One action rather than three, because the intermediate steps
   * are not decisions the UI should be making — and because "found the profile
   * but the PIN was wrong" must not leave the profile half-selected.
   */
  login: (name: string, pin: string) => Promise<LoginResult>
  selectProfile: (id: string) => Promise<boolean>
  unlockProfile: (id: string, pin: string) => Promise<boolean>
  renameProfile: (id: string, name: string) => void
  setPin: (id: string, pin: string | null) => Promise<void>
  removeProfile: (id: string) => void
  closeProfile: () => void

  setProfile: (patch: Partial<Profile>) => void
  replaceProfile: (profile: Profile) => void
  completeOnboarding: (profile: Profile) => void
  resetOnboarding: () => void
  regeneratePlan: (seed?: number) => void
  regenerateDay: (dayIndex: number) => void
  swapMeal: (dayIndex: number, mealId: string, meal: PlannedMeal) => void
  setServings: (dayIndex: number, mealId: string, foodId: string, servings: number) => void
  toggleMealComplete: (mealId: string, date?: string) => void
  addLogEntry: (date: string, entry: LoggedFood) => void
  removeLogEntry: (date: string, entryId: string) => void
  addWater: (delta: number, date?: string) => void
  setWater: (ml: number, date?: string) => void
  rebuildGrocery: (overrides?: PriceOverrides) => void
  toggleGrocery: (foodId: string) => void
  setGroceryQuantity: (foodId: string, grams: number | undefined) => void
  clearGroceryChecks: () => void
  addProgress: (entry: ProgressEntry) => void
  removeProgress: (id: string) => void
  addCustomFood: (food: Food) => void
  removeCustomFood: (id: string) => void
  replaceState: (state: AppState) => void
  resetAll: () => void
}

const StateCtx = createContext<AppState | null>(null)
const ActiveCtx = createContext<LocalProfile | null>(null)
const ActionsCtx = createContext<AppActions | null>(null)
const DerivedCtx = createContext<Derived | null>(null)

const EXERCISE_KCAL_PER_SESSION = 280

const NO_DERIVED: Derived = {
  today: '',
  safety: null,
  basis: null,
  targets: null,
  todayTotals: { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  remaining: 0,
  bmiValue: 0,
  bmiLabel: bmiBand(0),
  isGated: false,
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => loadState() ?? emptyState())

  useEffect(() => {
    saveState(state)
  }, [state])

  useEffect(() => {
    const flush = () => writeNow()
    window.addEventListener('pagehide', flush)
    window.addEventListener('beforeunload', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      window.removeEventListener('beforeunload', flush)
    }
  }, [])

  const today = toISODate(new Date())
  const active = useMemo(
    () => state.profiles.find((p) => p.id === state.activeProfileId) ?? null,
    [state.profiles, state.activeProfileId],
  )

  const actions = useMemo<AppActions>(
    () => ({
      /**
       * The PIN must be salted with the profile's real id, but that id only
       * exists after the profile is created. So build the profile here, hash
       * against its id, and dispatch the finished object. Hashing against a
       * placeholder would leave `verifyPin` unable to reproduce the digest.
       */
      createProfile: async ({ name, pin, avatarIndex }) => {
        const draft = newLocalProfile({ name, pinHash: null, avatarIndex })
        const pinHash = pin ? await hashPinFor(pin, draft.id) : null
        dispatch({
          type: 'profile/create',
          name: draft.name,
          pinHash,
          avatarIndex: draft.avatarIndex,
          id: draft.id,
        })
        // The new profile's id, so the caller can route onward to the wizard
        // rather than inferring it from a re-render.
        return draft.id
      },

      login: async (name, pin) => {
        const target = findByName(state.profiles, name)
        if (!target) return { ok: false, reason: 'unknown-name' }

        /*
          Profiles created before the PIN became mandatory have no `pinHash`.
          They still have to be reachable, or restoring an old backup would lock
          someone out of their own data with no way in. `verifyPin` treats null
          as "no lock", so they open on any input — `unpinned` is how the UI
          says so plainly instead of quietly pretending a PIN was checked.
        */
        const unpinned = target.pinHash === null
        if (!unpinned && !isValidPin(pin)) return { ok: false, reason: 'pin-format' }

        const ok = await verifyPin(pin, target.pinHash)
        if (!ok) return { ok: false, reason: 'wrong-pin' }

        dispatch({ type: 'profile/select', id: target.id })
        return {
          ok: true,
          id: target.id,
          needsOnboarding: !target.onboardingComplete,
          unpinned,
        }
      },

      selectProfile: async (id) => {
        const target = state.profiles.find((p) => p.id === id)
        if (target?.pinHash) return false // caller must unlock first
        dispatch({ type: 'profile/select', id })
        return true
      },

      unlockProfile: async (id, pin) => {
        const target = state.profiles.find((p) => p.id === id)
        if (!target) return false
        if (!target.pinHash) {
          dispatch({ type: 'profile/select', id })
          return true
        }
        const ok = await verifyPin(pin, target.pinHash)
        if (ok) dispatch({ type: 'profile/select', id })
        return ok
      },

      renameProfile: (id, name) => dispatch({ type: 'profile/rename', id, name }),
      setPin: async (id, pin) => {
        const pinHash = pin ? await hashPin(pin, id) : null
        dispatch({ type: 'profile/setPin', id, pinHash })
      },
      removeProfile: (id) => dispatch({ type: 'profile/remove', id }),
      /**
       * Dismiss back to the picker. Uses a sentinel rather than the empty
       * string, because the provider's own debounced save writes the in-memory
       * state on every render — any externally-written value is overwritten on
       * the next flush. A distinct action is the only reliable way to ask for
       * this state.
       */
      closeProfile: () => dispatch({ type: 'profile/close' }),

      setProfile: (patch) => dispatch({ type: 'data/setProfile', patch }),
      replaceProfile: (profile) => dispatch({ type: 'data/replaceProfile', profile }),
      completeOnboarding: (profile) => dispatch({ type: 'data/onboardingComplete', profile }),
      resetOnboarding: () => dispatch({ type: 'data/resetOnboarding' }),

      regeneratePlan: (seed) => {
        const p = active
        if (!p?.profile) return
        const fallback: NutritionFacts = {
          kcal: 2000, protein: 100, carbs: 220, fat: 65, fiber: 30,
        }
        const target = p.plan?.target ?? computePlanTargets(p.profile).targets ?? fallback
        dispatch({
          type: 'data/planSet',
          plan: generateMealPlan({
            profile: p.profile,
            target,
            seed: seed ?? Math.floor(Math.random() * 1_000_000),
            customFoods: p.customFoods,
          }),
        })
      },

      regenerateDay: (dayIndex) =>
        dispatch({
          type: 'data/regenerateDay',
          dayIndex,
          seed: Math.floor(Math.random() * 1_000_000),
        }),

      swapMeal: (dayIndex, mealId, meal) =>
        dispatch({ type: 'data/swapMeal', dayIndex, mealId, meal }),
      setServings: (dayIndex, mealId, foodId, servings) =>
        dispatch({ type: 'data/setServings', dayIndex, mealId, foodId, servings }),

      toggleMealComplete: (mealId, date) =>
        dispatch({ type: 'data/toggleCompleted', date: date ?? today, mealId }),

      addLogEntry: (date, entry) => dispatch({ type: 'data/logAdd', date, entry }),
      removeLogEntry: (date, entryId) => dispatch({ type: 'data/logRemove', date, entryId }),
      addWater: (delta, date) => dispatch({ type: 'data/logWater', date: date ?? today, delta }),
      setWater: (ml, date) => dispatch({ type: 'data/logSetWater', date: date ?? today, ml }),

      rebuildGrocery: (overrides) => {
        const p = active
        if (!p?.profile || !p.plan) return
        dispatch({
          type: 'data/grocerySet',
          items: buildGroceryList({
            plan: p.plan,
            profile: p.profile,
            overrides,
            previous: p.grocery,
          }),
        })
      },
      toggleGrocery: (foodId) => dispatch({ type: 'data/groceryToggle', foodId }),
      setGroceryQuantity: (foodId, grams) =>
        dispatch({ type: 'data/groceryQuantity', foodId, grams }),
      clearGroceryChecks: () => dispatch({ type: 'data/groceryClearChecks' }),

      addProgress: (entry) => dispatch({ type: 'data/progressAdd', entry }),
      removeProgress: (id) => dispatch({ type: 'data/progressRemove', id }),

      addCustomFood: (food) => dispatch({ type: 'data/customFoodAdd', food }),
      removeCustomFood: (id) => dispatch({ type: 'data/customFoodRemove', id }),

      replaceState: (next) => dispatch({ type: 'state/replace', state: next }),
      resetAll: () => dispatch({ type: 'state/replace', state: emptyState() }),
    }),
    [active, state.profiles, today],
  )

  const derived = useMemo<Derived>(() => {
    const p = active
    if (!p) return { ...NO_DERIVED, today }

    const profile = p.profile
    if (!profile) return { ...NO_DERIVED, today }

    const safety = evaluateSafety(profile)
    const trainingDays = Math.min(profile.workoutDaysPerWeek, 7)
    const exerciseKcal = trainingDays * EXERCISE_KCAL_PER_SESSION * 0.42
    const { basis, targets } = computePlanTargets(profile, exerciseKcal)
    const totals = logTotals(p.logs[today])

    return {
      today,
      safety,
      basis,
      targets,
      todayTotals: totals,
      remaining: targets ? Math.max(0, targets.kcal - totals.kcal) : 0,
      bmiValue: bmi(profile.weightKg, profile.heightCm),
      bmiLabel: bmiBand(bmi(profile.weightKg, profile.heightCm)),
      isGated: !targets,
    }
  }, [active, today])

  return (
    <StateCtx.Provider value={state}>
      <ActiveCtx.Provider value={active}>
        <DerivedCtx.Provider value={derived}>
          <ActionsCtx.Provider value={actions}>{children}</ActionsCtx.Provider>
        </DerivedCtx.Provider>
      </ActiveCtx.Provider>
    </StateCtx.Provider>
  )
}

export function useAppState(): AppState {
  const ctx = useContext(StateCtx)
  if (!ctx) throw new Error('useAppState must be used inside <AppStoreProvider>')
  return ctx
}

/** The currently open profile, or null when none is selected. */
export function useProfile(): LocalProfile | null {
  return useContext(ActiveCtx)
}

export function useActions(): AppActions {
  const ctx = useContext(ActionsCtx)
  if (!ctx) throw new Error('useActions must be used inside <AppStoreProvider>')
  return ctx
}

export function useDerived(): Derived {
  const ctx = useContext(DerivedCtx)
  if (!ctx) throw new Error('useDerived must be used inside <AppStoreProvider>')
  return ctx
}

export function useTodayLog(date?: string): DayLog {
  const { today } = useDerived()
  const profile = useProfile()
  const key = date ?? today
  return profile?.logs[key] ?? emptyLog(key)
}

export type { PriceOverrides }

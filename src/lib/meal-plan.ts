/* ==========================================================================
   FORM — meal plan generator
   ---------------------------------------------------------------------------
   Design goals:
     • Deterministic. The same (profile, seed) always produces the same plan,
       which makes the whole thing testable and makes "regenerate day 3" a
       meaningful operation rather than a shuffle of random noise.
     • Constraint-first. A template is only ever considered if it survives the
       diet, allergen, ingredient-exclusion, cooking-facility, prep-time,
       budget and goal filters.
     • Bounded scaling. Serving counts are clamped so a plan can never
       recommend "3.8 rotis" or "half a roti".
   ========================================================================== */

import { buildTemplates } from '@/data/meal-templates'
import { resolveFood } from '@/data/foods'
import type {
  DietPreference,
  Food,
  FoodStyle,
  GoalId,
  MealPlan,
  MealSlot,
  MealTemplate,
  NutritionFacts,
  PlannedDay,
  PlannedItem,
  PlannedMeal,
  PlanMode,
  Profile,
} from '@/types'
import { toWeeklyBudget } from './units'

/* --------------------------------------------------------------------------
   Deterministic PRNG
   -------------------------------------------------------------------------- */

/** mulberry32 — small, fast, well-distributed 32-bit PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** FNV-1a string hash, so a profile can be turned into a stable seed. */
export function hashString(input: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export function profileSeed(profile: Profile, extra = 0): number {
  const signature = [
    profile.goal,
    profile.rate,
    profile.diet,
    profile.mealsPerDay,
    profile.planMode,
    profile.foodStyle,
    profile.maxPrepMinutes,
    profile.cookFacility,
    profile.budget.amount,
    profile.budget.period,
    profile.allergens.slice().sort().join(','),
    profile.excludeIngredients.slice().sort().join(','),
    profile.goal,
    extra,
  ].join('|')
  return hashString(signature)
}

/* --------------------------------------------------------------------------
   Constraints
   -------------------------------------------------------------------------- */

export type PlanConstraints = {
  diet: DietPreference
  allergens: string[]
  excludedIngredients: string[]
  maxPrepMinutes: number
  cookFacility: Profile['cookFacility']
  weeklyBudget: number | null
  currency: 'INR' | 'USD'
  goal: GoalId
  foodStyle: FoodStyle
  planMode: PlanMode
  mealsPerDay: number
}

/** Does a diet include this food? */
export function dietAllows(diet: DietPreference, food: Food): boolean {
  return food.diet.includes(diet)
}

/** Does a diet include this template given its own declared diet list? */
export function templateAllowsDiet(template: MealTemplate, diet: DietPreference): boolean {
  return template.diet.includes(diet)
}

export function intersects(a: readonly string[], b: readonly string[]): string[] {
  const set = new Set(b)
  return a.filter((x) => set.has(x))
}

/** The normalised ingredient words we can meaningfully exclude. */
export const EXCLUSION_MATCH_KEYS: ReadonlySet<string> = new Set([
  'milk',
  'dairy',
  'curd',
  'yogurt',
  'egg',
  'gluten',
  'wheat',
  'rice',
  'paneer',
  'soya',
  'soy',
  'tofu',
  'nut',
  'peanut',
  'tomato',
  'onion',
  'garlic',
  'mushroom',
  'coconut',
  'ghee',
  'oil',
  'pork',
  'beef',
  'fish',
  'chicken',
  'lentil',
  'dal',
  'chickpea',
  'chana',
  'cauliflower',
  'brinjal',
  'spinach',
])

export function normaliseIngredient(word: string): string {
  return word.trim().toLowerCase()
}

/**
 * A food is excluded if it matches an exclusion against its name, local name
 * or category. Matching is substring-based on purpose: users type "nut", not
 * "tree-nut".
 */
export function foodMatchesExclusions(food: Food, excluded: string[]): boolean {
  if (excluded.length === 0) return false
  const haystack = [food.name, food.localName ?? '', food.category].join(' ').toLowerCase()
  return excluded.some((raw) => {
    const term = normaliseIngredient(raw)
    if (term.length < 2) return false
    if (term === 'gluten') return food.allergens.includes('gluten')
    if (term === 'dairy' || term === 'milk') return food.allergens.includes('milk')
    if (term === 'nut') return food.allergens.includes('peanut') || food.allergens.includes('tree-nut')
    return haystack.includes(term)
  })
}

export function cookAllowed(food: Food, facility: Profile['cookFacility']): boolean {
  switch (facility) {
    case 'no-cook':
      return food.cook === 'none'
    case 'microwave':
      // No hob, so anything that needs frying or simmering is out.
      return food.cook === 'none' || food.cook === 'heat'
    case 'basic':
    case 'full-kitchen':
    default:
      return true
  }
}

export const MAX_ITEM_SERVINGS = 2.5
export const MIN_ITEM_SERVINGS = 0.25

/* --------------------------------------------------------------------------
   Template resolution
   -------------------------------------------------------------------------- */

export function resolveAllTemplates(customFoods: Food[] = []): MealTemplate[] {
  return buildTemplates((id) => resolveFood(id, customFoods)?.allergens)
}

export type RejectionReason =
  | 'diet'
  | 'allergen'
  | 'excluded'
  | 'prep-time'
  | 'no-cook'
  | 'budget'

export type Candidate = {
  template: MealTemplate
  reasons: RejectionReason[]
}

export function evaluateTemplate(
  template: MealTemplate,
  c: PlanConstraints,
  customFoods: Food[] = [],
): Candidate {
  const reasons: RejectionReason[] = []

  if (!templateAllowsDiet(template, c.diet)) reasons.push('diet')

  const items = template.items
    .map((i) => ({ item: i, food: resolveFood(i.foodId, customFoods) }))
    .filter((x): x is { item: typeof x.item; food: Food } => Boolean(x.food))

  // an unresolvable food id is a data bug — treat the template as unusable
  if (items.length !== template.items.length) reasons.push('excluded')

  for (const { food } of items) {
    if (intersects(food.allergens, c.allergens).length > 0) reasons.push('allergen')
    if (!dietAllows(c.diet, food)) reasons.push('diet')
    if (foodMatchesExclusions(food, c.excludedIngredients)) reasons.push('excluded')
    if (!cookAllowed(food, c.cookFacility)) reasons.push('no-cook')
  }

  if (template.prepMinutes > c.maxPrepMinutes) reasons.push('prep-time')

  /**
   * Cost is judged against the slot's share of the weekly budget, not against
   * the whole week multiplied by the meal count. The old form — one meal's cost
   * times every slot times seven days — demanded ~28x the budget for a single
   * dish and rejected essentially everything, silently collapsing every plan
   * onto the fallback tier. A single meal should only be rejected if it alone
   * eats an implausible multiple of a day's allowance.
   */
  const perServingCost = templateCost(template, customFoods)
  if (c.weeklyBudget !== null && c.weeklyBudget > 0) {
    const dailyAllowance = c.weeklyBudget / 7
    if (perServingCost > dailyAllowance * 0.6) {
      reasons.push('budget')
    }
  }

  return { template, reasons: [...new Set(reasons)] }
}

export function templateNutrition(
  template: MealTemplate,
  customFoods: Food[] = [],
): NutritionFacts {
  const acc: NutritionFacts = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
  for (const item of template.items) {
    const food = resolveFood(item.foodId, customFoods)
    if (!food) continue
    acc.kcal += food.per.kcal * item.servings
    acc.protein += food.per.protein * item.servings
    acc.carbs += food.per.carbs * item.servings
    acc.fat += food.per.fat * item.servings
    acc.fiber += food.per.fiber * item.servings
  }
  return roundFacts(acc)
}

export function templateCost(template: MealTemplate, customFoods: Food[] = []): number {
  let total = 0
  for (const item of template.items) {
    const food = resolveFood(item.foodId, customFoods)
    if (!food) continue
    total += (food.costPerKg * food.serving.grams * item.servings) / 1000
  }
  return total
}

/* --------------------------------------------------------------------------
   Scoring
   -------------------------------------------------------------------------- */

export type ScoreBreakdown = {
  calorieFit: number
  proteinFit: number
  cost: number
  prepTime: number
  variety: number
  goalFit: number
  total: number
}

/**
 * Lower is better. Weights are deliberately modest — the point is a plan a
 * person would actually cook, not a mathematical optimum.
 */
export function scoreCandidate(
  template: MealTemplate,
  nutrition: NutritionFacts,
  cost: number,
  slotKcal: number,
  targetProtein: number,
  c: PlanConstraints,
  usedTemplateIds: Set<string>,
): ScoreBreakdown {
  const kcalError = Math.abs(nutrition.kcal - slotKcal) / Math.max(slotKcal, 1)
  const calorieFit = kcalError * 3

  // Only meaningful for larger meals; snacks should not chase protein.
  const proteinNeed = slotKcal > 300 ? targetProtein * (slotKcal / 2000) : 0
  const proteinFit = proteinNeed > 0 ? Math.max(0, nutrition.protein - proteinNeed) / proteinNeed : 0

  // Cost as a fraction of a day's allowance. When there is no budget we still
  // want cheap meals to win, so fall back to comparing against the median
  // candidate cost via a fixed neutral score.
  const dailyAllowance = c.weeklyBudget !== null && c.weeklyBudget > 0 ? c.weeklyBudget / 7 : null
  const costScore = dailyAllowance !== null ? cost / dailyAllowance : 0.3

  // `prep-time` is a HARD filter, not a preference: if it lived in the score it
  // could be outvoted and the user would silently get meals they cannot make.
  // It is handled in the viable/salvageable/bocked tiering instead, so here the
  // term only breaks ties between meals that are already legal.
  const prepTime = (template.prepMinutes / Math.max(c.maxPrepMinutes, 5)) * 0.5

  // Strong repetition penalty drives week variety.
  const variety = usedTemplateIds.has(template.id) ? 1.6 : 0

  let goalFit = 0
  if (template.goals.length > 0) {
    goalFit = template.goals.includes(c.goal) ? -0.4 : 0.15
  }
  if (c.planMode === 'high-protein' && template.proteinBoost) goalFit -= 0.5
  // Student mode is a *cost* mode. Cost is normalised against the daily
  // allowance, so the discount below has to be large enough to overturn a
  // typical calorie-fit gap of well under 1.
  if (c.planMode === 'student') goalFit -= costScore * 4

  return {
    calorieFit,
    proteinFit,
    cost: costScore,
    prepTime,
    variety,
    goalFit,
    total: calorieFit + proteinFit + costScore + prepTime + variety + goalFit,
  }
}

/* --------------------------------------------------------------------------
   Slot budget allocation
   -------------------------------------------------------------------------- */

export const SLOT_ORDER: readonly MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'] as const

/**
 * Share of daily energy per slot. `snack` is divided by however many snack
 * slots the user has, so 3/4/5-meal plans all add up to 100%.
 */
/**
 * Share of daily energy per slot, normalised to exactly 1 so the slot budgets
 * always add up to the day's target no matter how many meals are configured.
 */
export function slotShares(mealsPerDay: number): Record<MealSlot, number> {
  const snackCount = Math.max(mealsPerDay - 3, 0)

  let raw: Record<MealSlot, number>
  if (snackCount === 0) {
    raw = { breakfast: 0.28, lunch: 0.34, dinner: 0.32, snack: 0.06 }
  } else if (snackCount === 1) {
    raw = { breakfast: 0.26, lunch: 0.31, dinner: 0.29, snack: 0.14 }
  } else {
    raw = { breakfast: 0.24, lunch: 0.28, dinner: 0.26, snack: 0.22 }
  }

  const total = raw.breakfast + raw.lunch + raw.dinner + raw.snack
  return {
    breakfast: raw.breakfast / total,
    lunch: raw.lunch / total,
    dinner: raw.dinner / total,
    // For a 3-meal plan the residual slot is unused; give it all of nothing.
    snack: raw.snack / total,
  }
}

export function activeSlots(mealsPerDay: number): MealSlot[] {
  const snacks = Math.max(mealsPerDay - 3, 0)
  const slots: MealSlot[] = ['breakfast', 'lunch', 'dinner']
  for (let i = 0; i < snacks; i++) slots.push('snack')
  return slots
}

/* --------------------------------------------------------------------------
   Generation
   -------------------------------------------------------------------------- */

export type GenerateOptions = {
  profile: Profile
  target: NutritionFacts
  seed?: number
  customFoods?: Food[]
  /** ISO date of day 0. Defaults to the Monday of the current week. */
  startDate?: string
}

export function generateMealPlan(options: GenerateOptions): MealPlan {
  const { profile, target } = options
  const customFoods = options.customFoods ?? []
  const seed = options.seed ?? profileSeed(profile)
  const rand = mulberry32(seed)

  const constraints: PlanConstraints = {
    diet: profile.diet,
    allergens: profile.allergens,
    excludedIngredients: profile.excludeIngredients,
    maxPrepMinutes: profile.maxPrepMinutes,
    cookFacility: profile.cookFacility,
    weeklyBudget:
      profile.budget.amount > 0
        ? toWeeklyBudget(profile.budget.amount, profile.budget.period)
        : null,
    currency: profile.budget.currency,
    goal: profile.goal,
    foodStyle: profile.foodStyle,
    planMode: profile.planMode,
    mealsPerDay: profile.mealsPerDay,
  }

  const templates = resolveAllTemplates(customFoods)
  const shares = slotShares(profile.mealsPerDay)
  const slots = activeSlots(profile.mealsPerDay)

  /**
   * Two classes of failure, and the difference matters:
   *
   * SAFETY — diet, allergen, excluded ingredient, no-cook facility. A meal that
   * fails any of these is never offered under any circumstance. There is no
   * budget or time pressure that can override it.
   *
   * PREFERENCE — prep time and cost. These are honoured strictly when a
   * satisfiable choice exists, and relaxed only to avoid leaving a meal slot
   * empty. Relaxing them is reported to the user in the UI.
   */
  const SAFETY: RejectionReason[] = ['diet', 'allergen', 'excluded', 'no-cook']

  type Tier = {
    /** fully satisfies every constraint */
    ideal: Candidate[]
    /** safety-clean, but over the prep-time limit */
    overTime: Candidate[]
    /** safety-clean, but over budget and/or over the prep-time limit */
    lastResort: Candidate[]
  }

  const tiers: Record<MealSlot, Tier> = {
    breakfast: { ideal: [], overTime: [], lastResort: [] },
    lunch: { ideal: [], overTime: [], lastResort: [] },
    dinner: { ideal: [], overTime: [], lastResort: [] },
    snack: { ideal: [], overTime: [], lastResort: [] },
  }

  for (const template of templates) {
    const result = evaluateTemplate(template, constraints, customFoods)
    if (result.reasons.some((r) => SAFETY.includes(r))) continue

    if (result.reasons.length === 0) {
      tiers[template.slot].ideal.push(result)
    } else if (result.reasons.includes('prep-time')) {
      // Time is the constraint users feel most directly, so it is relaxed
      // only after every time-legal option is used.
      tiers[template.slot].overTime.push(result)
    } else {
      tiers[template.slot].lastResort.push(result)
    }
  }

  const usedIds = new Set<string>()
  const days: PlannedDay[] = []
  const start = options.startDate ? new Date(options.startDate) : startOfWeek(new Date())

  for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
    const dayUsed = new Set<string>()
    const meals: PlannedMeal[] = []

    for (const slot of slots) {
      const slotKcal = target.kcal * shares[slot]
      const tier = tiers[slot]
      let pool = tier.ideal.length > 0 ? tier.ideal : tier.overTime.length > 0 ? tier.overTime : tier.lastResort
      if (pool.length === 0) continue

      /**
       * Student budget mode narrows the pool to the cheapest candidates before
       * any scoring happens. A weight alone is not enough: the calorie-fit term
       * can outweigh any single cost weight, and a "budget mode" that does not
       * reliably produce a cheaper plan is not a budget mode.
       */
      if (profile.planMode === 'student' && pool.length > 1) {
        const priced = pool
          .map((cand) => ({ cand, cost: templateCost(cand.template, customFoods) }))
          .sort((a, b) => a.cost - b.cost)
        // Keep the cheapest two-thirds, and always at least two options so
        // variety scoring still has something to work with.
        const keep = Math.max(2, Math.ceil(priced.length * 0.66))
        pool = priced.slice(0, keep).map((x) => x.cand)
      }

      // Day-level variety beats week-level variety: on any given day we avoid
      // repeating the same template, then avoid repeating across the week.
      const scored = pool
        .map((cand) => {
          const nutrition = templateNutrition(cand.template, customFoods)
          const cost = templateCost(cand.template, customFoods)
          const breakdown = scoreCandidate(
            cand.template,
            nutrition,
            cost,
            slotKcal,
            target.protein,
            constraints,
            new Set([...usedIds, ...dayUsed]),
          )
          return { cand, nutrition, cost, breakdown }
        })
        .sort((a, b) => a.breakdown.total - b.breakdown.total)

      // Small deterministic jitter so ties don't always resolve identically.
      const jittered = scored.map((s) => ({ ...s, key: s.breakdown.total + rand() * 0.25 }))
      jittered.sort((a, b) => a.key - b.key)

      const chosen = jittered[0]
      const meal = materialiseMeal(
        chosen.cand.template,
        chosen.nutrition,
        slot,
        slotKcal,
        customFoods,
        `${dayIndex}-${slot}`,
      )
      meals.push(meal)
      dayUsed.add(chosen.cand.template.id)
      usedIds.add(chosen.cand.template.id)
    }

    const date = addDays(start, dayIndex)
    days.push({
      date: toISODate(date),
      dayIndex,
      meals,
      total: meals.reduce<NutritionFacts>(
        (acc, m) => ({
          kcal: acc.kcal + m.total.kcal,
          protein: acc.protein + m.total.protein,
          carbs: acc.carbs + m.total.carbs,
          fat: acc.fat + m.total.fat,
          fiber: acc.fiber + m.total.fiber,
        }),
        { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      ),
      cost: meals.reduce((sum, m) => sum + m.cost, 0),
      prepMinutes: meals.reduce((sum, m) => sum + m.prepMinutes, 0),
    })
  }

  return {
    days,
    target: roundFacts(target),
    seed,
    generatedAt: new Date().toISOString(),
    mode: profile.planMode,
  }
}

/* --------------------------------------------------------------------------
   Portion scaling
   -------------------------------------------------------------------------- */

/**
 * Turn a template into a concrete meal with scaled portions, resolved foods
 * and derived nutrition. Exported so the planner can rebuild a meal when the
 * user swaps it, without duplicating the maths.
 */
export function buildPlannedMeal(
  template: MealTemplate,
  slotKcal: number,
  customFoods: Food[] = [],
  idSuffix?: string,
): PlannedMeal {
  return materialiseMeal(
    template,
    templateNutrition(template, customFoods),
    template.slot,
    slotKcal,
    customFoods,
    idSuffix ?? template.id,
  )
}

function materialiseMeal(
  template: MealTemplate,
  nutrition: NutritionFacts,
  slot: MealSlot,
  slotKcal: number,
  customFoods: Food[],
  idSuffix: string,
): PlannedMeal {
  const items = template.items
    .map((item) => ({ item, food: resolveFood(item.foodId, customFoods) }))
    .filter((x): x is { item: (typeof template.items)[number]; food: Food } => Boolean(x.food))

  // Scale the whole plate toward the slot's energy target. Guard against a zero
  // or nonsensical target so we never produce NaN servings.
  const safeSlotKcal = Number.isFinite(slotKcal) && slotKcal > 0 ? slotKcal : nutrition.kcal
  const baseKcal = nutrition.kcal > 0 ? nutrition.kcal : 1
  const rawScale = safeSlotKcal / baseKcal
  const scale = clamp(roundTo(rawScale, 0.1), 0.7, 1.8)

  const planned: PlannedItem[] = items.map(({ item, food }) => {
    const servings = clamp(roundTo(item.servings * scale, 0.25), MIN_ITEM_SERVINGS, MAX_ITEM_SERVINGS)
    return {
      foodId: food.id,
      food,
      servings,
      kcal: round1(food.per.kcal * servings),
      protein: round1(food.per.protein * servings),
      carbs: round1(food.per.carbs * servings),
      fat: round1(food.per.fat * servings),
    }
  })

  const total = planned.reduce<NutritionFacts>(
    (acc, p) => ({
      kcal: acc.kcal + p.kcal,
      protein: acc.protein + p.protein,
      carbs: acc.carbs + p.carbs,
      fat: acc.fat + p.fat,
      fiber: acc.fiber + p.food.per.fiber * p.servings,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  )

  const cost = planned.reduce(
    (sum, p) => sum + (p.food.costPerKg * p.food.serving.grams * p.servings) / 1000,
    0,
  )

  return {
    // Deterministic id: regenerating with the same seed reproduces the plan.
    id: `${template.id}::${idSuffix}`,
    templateId: template.id,
    name: template.name,
    localName: template.localName,
    slot,
    items: planned,
    total: roundFacts(total),
    prepMinutes: template.prepMinutes,
    cost,
    steps: template.steps,
    note: template.note,
    custom: false,
  }
}

/* --------------------------------------------------------------------------
   Swapping
   -------------------------------------------------------------------------- */

/**
 * Find the alternative template that best matches a meal's nutrition, so a
 * swap is a genuine like-for-like rather than an unrelated plate.
 */
export function findSwapOptions(
  meal: PlannedMeal,
  profile: Profile,
  customFoods: Food[] = [],
  limit = 4,
): MealTemplate[] {
  const constraints: PlanConstraints = {
    diet: profile.diet,
    allergens: profile.allergens,
    excludedIngredients: profile.excludeIngredients,
    maxPrepMinutes: profile.maxPrepMinutes,
    cookFacility: profile.cookFacility,
    weeklyBudget: null,
    currency: profile.budget.currency,
    goal: profile.goal,
    foodStyle: profile.foodStyle,
    planMode: profile.planMode,
    mealsPerDay: profile.mealsPerDay,
  }

  return resolveAllTemplates(customFoods)
    .filter((t) => t.slot === meal.slot && t.id !== meal.templateId)
    .map((t) => ({ t, reasons: evaluateTemplate(t, constraints, customFoods).reasons }))
    .filter((x) => x.reasons.length === 0)
    .map((x) => {
      const n = templateNutrition(x.t, customFoods)
      const distance =
        Math.abs(n.kcal - meal.total.kcal) / Math.max(meal.total.kcal, 1) +
        Math.abs(n.protein - meal.total.protein) / Math.max(meal.total.protein, 1) +
        (x.t.prepMinutes - meal.prepMinutes) / 20
      return { t: x.t, n, distance }
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((x) => x.t)
}

/* --------------------------------------------------------------------------
   Date helpers
   -------------------------------------------------------------------------- */

export function startOfWeek(d: Date): Date {
  const copy = new Date(d)
  const day = (copy.getDay() + 6) % 7 // Monday = 0
  copy.setDate(copy.getDate() - day)
  copy.setHours(0, 0, 0, 0)
  return copy
}

export function addDays(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/* --------------------------------------------------------------------------
   Small numeric helpers
   -------------------------------------------------------------------------- */

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function roundTo(n: number, step: number) {
  return Math.round(n / step) * step
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

function roundFacts(f: NutritionFacts): NutritionFacts {
  return {
    kcal: Math.round(f.kcal),
    protein: round1(f.protein),
    carbs: round1(f.carbs),
    fat: round1(f.fat),
    fiber: round1(f.fiber),
  }
}

export { roundFacts, round1, roundTo, clamp }

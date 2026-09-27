/* ==========================================================================
   FORM — domain types
   Every module (engine, planner, store, UI) speaks these types. Kept free of
   React so the calculation layer stays testable in plain Node.
   ========================================================================== */

/* ---------- units ---------- */

export type WeightSystem = 'metric' | 'imperial'
export type MassUnit = 'kg' | 'lb'
export type LengthUnit = 'cm' | 'ft-in'
export type ThemePref = 'dark' | 'light' | 'system'
export type MotionPref = 'auto' | 'reduce' | 'full'

/* ---------- demographics ---------- */

/**
 * Used ONLY as a coefficient input to the Mifflin-St Jeor equation.
 * Never stored, displayed or inferred as a gender identity, and never used to
 * infer an ideal body. `unspecified` averages the two published coefficients.
 */
export type PhysiologicalSex = 'male' | 'female' | 'unspecified'

/* ---------- training ---------- */

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'high' | 'athlete'
export type GymExperience = 'beginner' | 'intermediate' | 'advanced'
export type WorkoutType =
  | 'strength'
  | 'hiit'
  | 'cardio'
  | 'mixed'
  | 'sport'
  | 'bodyweight'
  | 'mobility'
  | 'other'
export type WorkoutTime = 'early-morning' | 'morning' | 'afternoon' | 'evening' | 'night'

/* ---------- goals ---------- */

export type GoalId =
  | 'build-muscle'
  | 'gain-weight'
  | 'lose-fat'
  | 'maintain'
  | 'recompose'
  | 'performance'
  | 'general-fitness'

/** Rate of change the user is comfortable with. Not a speed recommendation. */
export type RateOfChange = 'gentle' | 'moderate' | 'steady'

/* ---------- diet ---------- */

export type DietPreference = 'vegetarian' | 'vegan' | 'eggs' | 'non-vegetarian'

export type Allergen =
  | 'milk'
  | 'egg'
  | 'gluten'
  | 'peanut'
  | 'tree-nut'
  | 'soy'
  | 'sesame'
  | 'fish'
  | 'shellfish'

export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export type CookFacility = 'full-kitchen' | 'basic' | 'microwave' | 'no-cook'
export type FoodStyle =
  | 'south-indian'
  | 'north-indian'
  | 'mughlai'
  | 'street-food'
  | 'continental'
  | 'mediterranean'
  | 'east-asian'
  | 'global'

export type PlanMode = 'balanced' | 'student' | 'high-protein'

/* ---------- health flags ---------- */

export type HealthFlag =
  | 'pregnancy'
  | 'breastfeeding'
  | 'eating-disorder-risk'
  | 'diabetes'
  | 'pcos'
  | 'thyroid'
  | 'kidney-disease'
  | 'celiac'
  | 'food-intolerance'
  | 'medication-affecting-diet'
  | 'none'

/**
 * Flags that disable individualised, energy-restricting prescriptions.
 * FORM still shows general balanced-eating education, but routes the user to
 * a qualified professional instead of a number.
 */
export const GATING_HEALTH_FLAGS: readonly HealthFlag[] = [
  'pregnancy',
  'breastfeeding',
  'eating-disorder-risk',
  'diabetes',
  'kidney-disease',
  'medication-affecting-diet',
] as const

/* ---------- nutrition ---------- */

export interface Macros {
  protein: number
  carbs: number
  fat: number
}

export interface NutritionFacts extends Macros {
  kcal: number
  fiber: number
}

export type CalorieBasis = {
  bmr: number
  tdee: number
  activityMultiplier: number
  /** kcal actually recommended after goal adjustment + safety floors */
  target: number
  /** goal adjustment expressed as a fraction of TDEE (negative = deficit) */
  goalDeltaFraction: number
  /** 1-based reasons the target may have been clamped, for display */
  clampedBy: string | null
  floor: number
  macroBasis: MacroBasis
  notes: string[]
}

export type MacroBasis = {
  proteinPerKg: number
  proteinRationale: string
  fatPctOfCalories: number
  fatRationale: string
  carbPctOfCalories: number
  proteinFloorPct: number
  fatFloorPerKg: number
}

export type SafetyStatus = {
  /** true when FORM will not present a personalised energy target */
  gated: boolean
  reasons: string[]
  /** informational notes, always shown */
  generalGuidance: string[]
}

/* ---------- food database ---------- */

export type FoodCategory =
  | 'protein'
  | 'dairy'
  | 'grain'
  | 'legume'
  | 'vegetable'
  | 'fruit'
  | 'nuts'
  | 'fat'
  | 'pantry'
  | 'drink'

export interface Food {
  id: string
  name: string
  /** Regional name, shown alongside the English name */
  localName?: string
  category: FoodCategory
  /** which diets this food is compatible with */
  diet: DietPreference[]
  allergens: Allergen[]
  /** one canonical serving, used as the unit for scaling and logging */
  serving: { label: string; grams: number }
  /** approximate, per serving. Rounded reference values — see README. */
  per: NutritionFacts
  /**
   * Assumed retail price per kilogram in the base currency (INR), used to
   * derive a serving cost. These are *assumptions the user can edit*, never
   * live prices — see `lib/prices.ts`.
   */
  costPerKg: number
  prepMinutes: number
  cook: 'none' | 'heat' | 'cook'
  styles: FoodStyle[]
  /** quick meal-assembly tags */
  use?: ('breakfast' | 'lunch' | 'dinner' | 'snack' | 'pre-workout' | 'post-workout')[]
  note?: string
}

/* ---------- meal templates ---------- */

export interface MealItem {
  foodId: string
  /** number of `food.serving` units */
  servings: number
}

export interface MealTemplate {
  id: string
  name: string
  localName?: string
  slot: MealSlot
  items: MealItem[]
  diet: DietPreference[]
  allergens: Allergen[]
  styles: FoodStyle[]
  prepMinutes: number
  steps: string[]
  /** goals this meal is a good fit for; empty = neutral */
  goals: GoalId[]
  /** extra protein per unit, used by the high-protein planner */
  proteinBoost?: boolean
  note?: string
}

export interface PlannedItem {
  foodId: string
  /** resolved food, denormalised so saved plans survive food-db edits */
  food: Food
  servings: number
  kcal: number
  protein: number
  carbs: number
  fat: number
}

export interface PlannedMeal {
  id: string
  templateId: string | null
  name: string
  localName?: string
  slot: MealSlot
  items: PlannedItem[]
  total: NutritionFacts
  prepMinutes: number
  cost: number
  steps: string[]
  note?: string
  custom: boolean
}

export interface PlannedDay {
  /** ISO date string */
  date: string
  /** 0 = Monday */
  dayIndex: number
  meals: PlannedMeal[]
  total: NutritionFacts
  cost: number
  prepMinutes: number
}

export interface MealPlan {
  days: PlannedDay[]
  target: NutritionFacts
  /** bumped on regenerate, used to reseed the generator */
  seed: number
  generatedAt: string
  /** 0 = balanced, 1 = student budget, 2 = high protein */
  mode: PlanMode
}

/* ---------- tracking ---------- */

export interface LoggedFood {
  id: string
  /**
   * The database food this entry came from. For a single food added from the
   * explorer this is that food's id. For a whole planned meal there is no
   * single food, so this is `plan:<templateId>` and `sourceMealId` is set.
   */
  foodId: string
  /** set when the entry was logged from a planned meal */
  sourceMealId?: string
  name: string
  servings: number
  total: NutritionFacts
  slot: MealSlot | 'water'
  loggedAt: string
}

export interface DayLog {
  /** ISO date, e.g. "2026-09-26" */
  date: string
  meals: LoggedFood[]
  waterMl: number
  /** ids of plan meals the user ticked off */
  completedMealIds: string[]
  notes?: string
}

export type ProgressMetric =
  | 'weight'
  | 'energy'
  | 'mood'
  | 'sleep'
  | 'workout-performance'
  | 'strength-volume'
  | 'waist'

export interface ProgressEntry {
  id: string
  /** ISO date */
  date: string
  weightKg?: number
  waistCm?: number
  energy?: number
  mood?: number
  sleepHours?: number
  workoutDone?: boolean
  /** e.g. bench press top set in kg */
  strengthLabel?: string
  strengthValueKg?: number
  note?: string
}

/* ---------- grocery ---------- */

export type GroceryGroup = 'vegetables' | 'fruits' | 'grains' | 'dairy' | 'protein' | 'pantry'

export interface GroceryItem {
  foodId: string
  name: string
  localName?: string
  group: GroceryGroup
  /** summed servings across the plan */
  servings: number
  grams: number
  servingLabel: string
  unitCost: number
  cost: number
  checked: boolean
  /** user override of the summed amount */
  quantityOverride?: number
}

/* ---------- profile ---------- */

export interface Profile {
  createdAt: string
  updatedAt: string

  name?: string
  age: number
  isAdult: boolean
  sex: PhysiologicalSex

  heightCm: number
  weightKg: number
  waistCm?: number

  activityLevel: ActivityLevel
  gymExperience: GymExperience
  workoutDaysPerWeek: number
  workoutType: WorkoutType
  workoutTime: WorkoutTime

  goal: GoalId
  targetWeightKg?: number
  rate: RateOfChange

  diet: DietPreference
  allergens: Allergen[]
  excludeIngredients: string[]

  mealsPerDay: 3 | 4 | 5
  cookFacility: CookFacility
  maxPrepMinutes: number

  budget: {
    amount: number
    period: 'weekly' | 'monthly'
    currency: 'INR' | 'USD'
  }

  country: string
  foodStyle: FoodStyle
  healthFlags: HealthFlag[]
  notes: string

  /* preferences */
  units: WeightSystem
  theme: ThemePref
  motion: MotionPref
  showCalorieMetrics: boolean
  showWeightMetrics: boolean
  /**
   * Optional so profiles saved before sound existed still validate. Read it as
   * `!== false` everywhere, which makes the default "on" without a migration.
   */
  soundEnabled?: boolean
  planMode: PlanMode
  weeklyWaterTargetMl: number
}

/* ---------- local profiles ---------- */

/**
 * A person using FORM on this device.
 *
 * This is NOT an account. There is no server, so nothing here is authenticated
 * and nothing leaves the browser. It exists so several people can share one
 * device — a family laptop, a gym tablet, a shared PC — and keep separate
 * plans, logs and progress. The optional PIN is a shoulder-surfing speed bump
 * for a shared household, not security.
 */
export interface LocalProfile {
  id: string
  /** what the picker shows; falls back to "Profile 1" when blank */
  name: string
  createdAt: string
  lastOpenedAt: string
  /**
   * SHA-256 of the PIN, or null for no PIN. See `lib/pin.ts` for why this is
   * a convenience lock and not a security boundary.
   */
  pinHash: string | null
  avatarIndex: number
  profile: Profile | null
  plan: MealPlan | null
  logs: Record<string, DayLog>
  progress: ProgressEntry[]
  grocery: GroceryItem[]
  customFoods: Food[]
  onboardingComplete: boolean
}

/* ---------- persisted state ---------- */

export interface AppState {
  version: number
  profiles: LocalProfile[]
  /** id of the profile currently open, or null when none is selected */
  activeProfileId: string | null
}

export const STATE_VERSION = 4

export const AVATAR_COUNT = 8

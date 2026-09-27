/* ==========================================================================
   FORM — default profile & onboarding draft
   ========================================================================== */

import type { HealthFlag, Profile } from '@/types'

/**
 * A neutral starting profile. It is deliberately *not* a valid plan input on
 * its own — onboarding validates real values before it can be saved, so this
 * exists mainly so the UI has a typed shape to render against.
 */
export function defaultProfile(): Profile {
  return {
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),

    name: undefined,
    age: 25,
    isAdult: true,
    sex: 'unspecified',

    heightCm: 170,
    weightKg: 65,
    waistCm: undefined,

    activityLevel: 'light',
    gymExperience: 'beginner',
    workoutDaysPerWeek: 3,
    workoutType: 'strength',
    workoutTime: 'evening',

    goal: 'general-fitness',
    targetWeightKg: undefined,
    rate: 'moderate',

    diet: 'vegetarian',
    allergens: [],
    excludeIngredients: [],

    mealsPerDay: 4,
    cookFacility: 'full-kitchen',
    maxPrepMinutes: 30,

    budget: { amount: 2500, period: 'monthly', currency: 'INR' },

    country: 'India',
    foodStyle: 'south-indian',
    healthFlags: [],
    notes: '',

    units: 'metric',
    theme: 'dark',
    motion: 'auto',
    showCalorieMetrics: true,
    showWeightMetrics: true,
    soundEnabled: true,
    planMode: 'balanced',
    weeklyWaterTargetMl: 2500,
  }
}

export const HEALTH_FLAG_LABELS: Record<HealthFlag, string> = {
  none: 'None of these',
  pregnancy: 'Pregnant',
  breastfeeding: 'Breastfeeding',
  'eating-disorder-risk': 'History of disordered eating',
  diabetes: 'Diabetes',
  pcos: 'PCOS / PCOS-related insulin resistance',
  thyroid: 'Thyroid condition',
  'kidney-disease': 'Kidney disease',
  celiac: 'Coeliac disease',
  'food-intolerance': 'Food intolerance or IBS',
  'medication-affecting-diet': 'Medication that affects diet or nutrients',
}

export const HEALTH_FLAG_HELP: Partial<Record<HealthFlag, string>> = {
  'eating-disorder-risk':
    'This turns off calorie restriction entirely. FORM will show general balanced-eating information only.',
  pregnancy:
    'Energy needs change across pregnancy and restriction is generally not advised, so FORM will not set a calorie target.',
  breastfeeding:
    'Breastfeeding raises energy needs and they are individual. FORM will not set a calorie target.',
  diabetes:
    'Carbohydrate amount and timing are a clinical decision. FORM will not set a calorie target.',
  'kidney-disease':
    'Protein and electrolyte handling is clinical. FORM will not set a calorie target.',
  'medication-affecting-diet':
    'Check with your prescriber or pharmacist before changing intake. FORM will not set a calorie target.',
  thyroid:
    'Noted. A thyroid condition is worth discussing with your doctor, but it does not block planning a starting estimate.',
  pcos:
    'Noted. Consistent meals and protein at breakfast are commonly helpful. Discuss medication and treatment with your doctor.',
  celiac: 'Strict gluten avoidance is applied to every plan.',
  'food-intolerance': 'Add the specific ingredient to the exclusions list as well.',
}

export const WORKOUT_TYPE_LABELS = {
  strength: 'Strength / weights',
  hiit: 'HIIT',
  cardio: 'Cardio',
  mixed: 'Mixed strength + cardio',
  sport: 'Sport or drills',
  bodyweight: 'Bodyweight / home',
  mobility: 'Mobility / yoga',
  other: 'Something else',
} as const

export const WORKOUT_TIME_LABELS = {
  'early-morning': 'Early morning (before 7am)',
  morning: 'Morning (7–11am)',
  afternoon: 'Afternoon (11am–4pm)',
  evening: 'Evening (4–9pm)',
  night: 'Night (after 9pm)',
} as const

export const GYM_EXPERIENCE_LABELS = {
  beginner: 'Brand new',
  intermediate: 'Some experience',
  advanced: 'Advanced / coached',
} as const

export const FOOD_STYLE_LABELS = {
  'south-indian': 'South Indian',
  'north-indian': 'North Indian',
  mughlai: 'Mughlai / Awadhi',
  'street-food': 'Indian street food',
  continental: 'Continental',
  mediterranean: 'Mediterranean',
  'east-asian': 'East Asian',
  global: 'A bit of everything',
} as const

export const COOK_FACILITY_LABELS = {
  'full-kitchen': 'Full kitchen',
  basic: 'Basic kitchen (stove + basic pots)',
  microwave: 'Microwave only',
  'no-cook': 'No-cook / no kitchen',
} as const

export const PLAN_MODE_LABELS = {
  balanced: 'Balanced',
  student: 'Student budget',
  'high-protein': 'High protein',
} as const

export const PLAN_MODE_HELP = {
  balanced: 'An ordinary week built from affordable whole foods.',
  student:
    'Favours cheap, high-satisfaction staples — oats, dal, eggs, seasonal produce. Macros may sit slightly off ideal.',
  'high-protein':
    'Pushes protein toward the upper end of the researched range. Costs more and is not necessary for everyone.',
} as const

export const RATE_LABELS = {
  gentle: 'Slow and steady',
  moderate: 'Moderate',
  steady: 'As fast as I can',
} as const

export const RATE_HELP = {
  gentle: 'Smaller change, easier to hold. Best if you have a history of yo-yo dieting or a busy schedule.',
  moderate: 'A middle-of-the-road change.',
  steady:
    'FORM caps the rate either way for safety. A faster change is not better — and the cap still applies if you pick this.',
} as const

export const COUNTRIES = [
  'India',
  'United Kingdom',
  'United States',
  'Canada',
  'Australia',
  'United Arab Emirates',
  'Singapore',
  'Malaysia',
  'Nepal',
  'Sri Lanka',
  'Bangladesh',
  'South Africa',
  'Germany',
  'Ireland',
  'Elsewhere',
] as const

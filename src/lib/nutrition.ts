/* ==========================================================================
   FORM — calorie & macro engine
   ---------------------------------------------------------------------------
   TRANSPARENCY CONTRACT
   Everything here is a *starting estimate* for a healthy adult, not a
   prescription. The public surface deliberately returns the assumptions
   (activity multiplier, macro grams-per-kg, floors, clamp reasons) so the UI
   can show the user exactly how a number was produced and why it may differ
   from reality.

   Sources for the published coefficients used below are listed in README.md.
   ========================================================================== */

import {
  GATING_HEALTH_FLAGS,
  type ActivityLevel,
  type CalorieBasis,
  type GoalId,
  type HealthFlag,
  type MacroBasis,
  type Macros,
  type NutritionFacts,
  type PhysiologicalSex,
  type PlanMode,
  type Profile,
  type RateOfChange,
  type SafetyStatus,
} from '@/types'

export const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const
export const KCAL_PER_G_FIBRE = 2

/* --------------------------------------------------------------------------
   1. Basal metabolic rate — Mifflin-St Jeor (1990)
   -------------------------------------------------------------------------- */

export const SEX_COEFFICIENT: Record<PhysiologicalSex, number> = {
  // 10*kg + 6.25*cm - 5*age + 5   (published male equation)
  male: 5,
  // 10*kg + 6.25*cm - 5*age - 161 (published female equation)
  female: -161,
  // midpoint of the two published coefficients
  unspecified: -78,
}

/**
 * Resting energy expenditure, kcal/day.
 *
 * @param weightKg  body mass
 * @param heightCm  stature
 * @param age       whole years
 * @param sex       coefficient input only — see PhysiologicalSex docs
 */
export function mifflinStJeor(weightKg: number, heightCm: number, age: number, sex: PhysiologicalSex): number {
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + SEX_COEFFICIENT[sex]
  return Math.max(0, bmr)
}

/* --------------------------------------------------------------------------
   2. Activity multiplier
   -------------------------------------------------------------------------- */

export type ActivityDescriptor = {
  id: ActivityLevel
  label: string
  multiplier: number
  blurb: string
  /** training days/week this description usually implies */
  typicalTrainingDays: [number, number]
}

export const ACTIVITY_LEVELS: readonly ActivityDescriptor[] = [
  {
    id: 'sedentary',
    label: 'Mostly seated',
    multiplier: 1.2,
    blurb: 'Desk job, little deliberate exercise',
    typicalTrainingDays: [0, 1],
  },
  {
    id: 'light',
    label: 'Lightly active',
    multiplier: 1.375,
    blurb: 'Walks or light training 1–3 days/week',
    typicalTrainingDays: [1, 3],
  },
  {
    id: 'moderate',
    label: 'Moderately active',
    multiplier: 1.55,
    blurb: 'Training 3–5 days/week, some cardio',
    typicalTrainingDays: [3, 5],
  },
  {
    id: 'high',
    label: 'Very active',
    multiplier: 1.725,
    blurb: 'Hard training 5–6 days/week, on your feet',
    typicalTrainingDays: [5, 6],
  },
  {
    id: 'athlete',
    label: 'Athlete / physical job',
    multiplier: 1.9,
    blurb: 'Twice-daily training or heavy manual work',
    typicalTrainingDays: [6, 7],
  },
] as const

export function activityDescriptor(level: ActivityLevel): ActivityDescriptor {
  return ACTIVITY_LEVELS.find((a) => a.id === level) ?? ACTIVITY_LEVELS[0]
}

/** Total daily energy expenditure = BMR x activity multiplier. */
export function tdeeFromBmr(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * activityDescriptor(activityLevel).multiplier
}

/* --------------------------------------------------------------------------
   3. Safety gates and floors
   -------------------------------------------------------------------------- */

/** Commonly cited adult lower bounds used only as a hard stop so the engine
 *  can never emit an extreme deficit. Not personal medical advice. */
export const ABSOLUTE_FLOOR_KCAL: Record<PhysiologicalSex, number> = {
  female: 1200,
  male: 1500,
  unspecified: 1200,
}

export const MAX_DEFICIT_FRACTION = 0.25
export const MAX_SURPLUS_FRACTION = 0.2
export const MIN_DEFICIT_FLOOR_MULTIPLE = 1.1 // never below 1.1 x BMR

export function evaluateSafety(profile: {
  isAdult: boolean
  healthFlags: HealthFlag[]
  goal: GoalId
}): SafetyStatus {
  const reasons: string[] = []

  if (!profile.isAdult) {
    reasons.push(
      'You are under 18, so FORM does not calculate a weight-change calorie target. Growth, hormones and development mean calorie restriction at your age needs specialist oversight.',
    )
  }

  const flagged = profile.healthFlags.filter((f) => GATING_HEALTH_FLAGS.includes(f))
  if (flagged.includes('eating-disorder-risk')) {
    reasons.push(
      'You flagged a history of disordered eating. FORM will not suggest calorie restriction of any kind.',
    )
  }
  if (flagged.includes('pregnancy')) {
    reasons.push(
      'Energy needs change across pregnancy and breastfeeding, and calorie restriction is generally not advised. Please plan with your doctor or a registered dietitian.',
    )
  }
  if (flagged.includes('breastfeeding')) {
    reasons.push(
      'Breastfeeding raises energy needs and needs are individual. A qualified professional is the right person to help you plan.',
    )
  }
  if (flagged.includes('diabetes')) {
    reasons.push(
      'Blood-glucose management means carbohydrate timing and amount should be planned with your clinician, not an app.',
    )
  }
  if (flagged.includes('kidney-disease')) {
    reasons.push(
      'Kidney conditions change how protein and electrolytes are handled. Please plan with your doctor or a renal dietitian.',
    )
  }
  if (flagged.includes('medication-affecting-diet')) {
    reasons.push(
      'Some medication interacts with food and nutrient intake. Check with your prescriber or pharmacist before changing your intake.',
    )
  }

  const gated = reasons.length > 0

  const generalGuidance: string[] = [
    'Build meals around a protein source, a whole-grain or starchy carbohydrate, vegetables, and a small amount of unsaturated fat.',
    'Aim for regular meals rather than long gaps, and drink water through the day.',
    'Sleep, progressive training load and consistency change results far more than any single food rule.',
    'If you are training hard, carbohydrate is the main fuel you can adjust week to week.',
  ]

  return { gated, reasons, generalGuidance }
}

/* --------------------------------------------------------------------------
   4. Goal energy adjustment
   -------------------------------------------------------------------------- */

export type GoalDescriptor = {
  id: GoalId
  label: string
  blurb: string
  /** fraction of TDEE, keyed by requested rate of change */
  delta: Record<RateOfChange, number>
  /** goals that should not carry a deficit even at a fast rate */
  gain: boolean
}

export const GOALS: readonly GoalDescriptor[] = [
  {
    id: 'build-muscle',
    label: 'Build muscle',
    blurb: 'Add lean tissue with progressive resistance training and a modest energy surplus.',
    delta: { gentle: 0.05, moderate: 0.1, steady: 0.15 },
    gain: true,
  },
  {
    id: 'gain-weight',
    label: 'Gain weight',
    blurb: 'Add overall mass. A small surplus plus enough protein and training is the usual approach.',
    delta: { gentle: 0.1, moderate: 0.15, steady: 0.2 },
    gain: true,
  },
  {
    id: 'lose-fat',
    label: 'Lose body fat',
    blurb: 'Reduce fat while keeping muscle. A moderate deficit plus resistance training.',
    delta: { gentle: -0.15, moderate: -0.2, steady: -0.25 },
    gain: false,
  },
  {
    id: 'maintain',
    label: 'Maintain weight',
    blurb: 'Hold your current weight and improve how you eat and train.',
    delta: { gentle: 0, moderate: 0, steady: 0 },
    gain: false,
  },
  {
    id: 'recompose',
    label: 'Body recomposition',
    blurb: 'Lose fat and gain muscle at the same time. Works best at maintenance or a small deficit.',
    delta: { gentle: -0.05, moderate: -0.1, steady: -0.1 },
    gain: false,
  },
  {
    id: 'performance',
    label: 'Athletic performance',
    blurb: 'Fuel training and recovery. Enough carbohydrate to hit sessions and adapt.',
    delta: { gentle: 0.05, moderate: 0.1, steady: 0.15 },
    gain: true,
  },
  {
    id: 'general-fitness',
    label: 'General fitness',
    blurb: 'Eat well, move more, feel better. Maintenance energy, better habits.',
    delta: { gentle: 0, moderate: -0.05, steady: -0.1 },
    gain: false,
  },
] as const

export function goalDescriptor(goal: GoalId): GoalDescriptor {
  return GOALS.find((g) => g.id === goal) ?? GOALS[0]
}

export type CalorieOptions = {
  /** manual override, kcal/day. Clamped by the same safety floors. */
  manualTarget?: number
  /** allow an exercise-derived addition to TDEE (see README) */
  useExerciseAdjustment?: boolean
  /** extra kcal/day from training sessions, supplied by the caller */
  exerciseKcal?: number
  planMode?: PlanMode
}

/**
 * Full transparent pipeline: BMR -> TDEE -> goal adjustment -> safety clamp.
 */
export function computeCalorieBasis(
  input: {
    weightKg: number
    heightCm: number
    age: number
    sex: PhysiologicalSex
    activityLevel: ActivityLevel
    goal: GoalId
    rate: RateOfChange
  },
  options: CalorieOptions = {},
): CalorieBasis {
  const notes: string[] = []
  const bmr = mifflinStJeor(input.weightKg, input.heightCm, input.age, input.sex)
  const act = activityDescriptor(input.activityLevel)

  let tdee = tdeeFromBmr(bmr, input.activityLevel)

  if (options.useExerciseAdjustment && options.exerciseKcal && options.exerciseKcal > 0) {
    // Only ever additive, and capped so it can't inflate the estimate wildly.
    const addition = Math.min(options.exerciseKcal, 600)
    tdee += addition
    notes.push(
      `Added ${Math.round(addition)} kcal for logged training sessions. This is a rough estimate — session energy varies hugely with intensity and body size.`,
    )
  }

  const goalDef = goalDescriptor(input.goal)
  let rawDelta = goalDef.delta[input.rate]

  // Clamp the requested rate into the safe envelope.
  if (rawDelta < 0) rawDelta = Math.max(rawDelta, -MAX_DEFICIT_FRACTION)
  if (rawDelta > 0) rawDelta = Math.min(rawDelta, MAX_SURPLUS_FRACTION)

  const floor = Math.max(
    ABSOLUTE_FLOOR_KCAL[input.sex],
    bmr * MIN_DEFICIT_FLOOR_MULTIPLE,
  )

  let target = options.manualTarget ?? tdee * (1 + rawDelta)
  let clampedBy: string | null = null

  if (target < floor) {
    target = floor
    clampedBy = `Safety floor: targets below ${Math.round(floor)} kcal are not produced by FORM.`
  }

  const roundedTarget = Math.round(target / 10) * 10
  if (roundedTarget !== Math.round(tdee * (1 + rawDelta) / 10) * 10) {
    clampedBy = (clampedBy ?? '') + ' Rounded to the nearest 10 kcal.'
  }

  if (options.planMode === 'student') {
    notes.push(
      'Student budget mode plans around cheaper staples, so the plan may sit slightly below your ideal macro split. It is a realistic trade-off, not an ideal.',
    )
  }
  if (options.planMode === 'high-protein') {
    notes.push('High-protein mode pushes protein toward the upper end of the researched range for resistance-trained adults.')
  }

  const macroBasis = computeMacroBasis(roundedTarget, input, goalDef.gain)

  notes.push(
    'Equations like Mifflin-St Jeor estimate group averages. Individual energy needs can sit well above or below the result.',
  )
  notes.push(
    'Treat this as a starting point: hold it for 2–3 weeks, then adjust by 100–150 kcal based on how your weight and training are actually responding.',
  )

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    activityMultiplier: act.multiplier,
    target: roundedTarget,
    goalDeltaFraction: rawDelta,
    clampedBy: clampedBy?.trim() || null,
    floor: Math.round(floor),
    macroBasis,
    notes,
  }
}

/* --------------------------------------------------------------------------
   5. Macro targets
   -------------------------------------------------------------------------- */

export const PROTEIN_RANGES: Record<GoalId, { min: number; max: number; note: string }> = {
  'build-muscle': { min: 1.6, max: 2.2, note: 'Resistance training: the higher end of the researched range is supported.' },
  'gain-weight': { min: 1.4, max: 1.9, note: 'A surplus with adequate protein helps limit fat gain.' },
  'lose-fat': { min: 1.8, max: 2.4, note: 'Higher protein helps preserve lean mass while in a deficit.' },
  maintain: { min: 1.2, max: 1.6, note: 'Enough to support training without excess.' },
  recompose: { min: 1.8, max: 2.2, note: 'High protein supports simultaneous fat loss and muscle gain.' },
  performance: { min: 1.4, max: 2.0, note: 'Supports recovery between training sessions.' },
  'general-fitness': { min: 1.0, max: 1.4, note: 'Comfortably above the minimum daily requirement.' },
}

export const PROTEIN_RDA_G_PER_KG = 0.8
export const PROTEIN_HARD_CEILING_G_PER_KG = 2.4
export const FAT_PCT_DEFAULT = 0.28
export const FAT_PCT_RANGE = { min: 0.2, max: 0.35 }
export const FAT_FLOOR_G_PER_KG = 0.5

function computeMacroBasis(
  targetKcal: number,
  input: { weightKg: number; goal: GoalId },
  goalIsGain: boolean,
): MacroBasis {
  const range = PROTEIN_RANGES[input.goal]
  // Aiming at the midpoint of the researched range, nudged with body size.
  const mid = (range.min + range.max) / 2
  const proteinPerKg = clamp(roundTo(mid, 0.05), PROTEIN_RDA_G_PER_KG, PROTEIN_HARD_CEILING_G_PER_KG)

  const proteinFloorPct = (PROTEIN_RDA_G_PER_KG * input.weightKg * KCAL_PER_G.protein) / targetKcal

  const fatPct = goalIsGain ? 0.25 : FAT_PCT_DEFAULT
  const fatFloorPct = (FAT_FLOOR_G_PER_KG * input.weightKg * KCAL_PER_G.fat) / targetKcal

  // Fat must be able to reach its own floor; protein must not eat the budget.
  if (fatFloorPct > FAT_PCT_RANGE.max) {
    // Protein absorbs the overflow rather than fat going below its floor.
    const overflow = fatFloorPct - FAT_PCT_RANGE.max
    return {
      proteinPerKg: Math.max(PROTEIN_RDA_G_PER_KG, proteinPerKg - overflow * 6),
      proteinRationale: range.note,
      fatPctOfCalories: FAT_PCT_RANGE.max,
      fatRationale: `Capped at ${Math.round(FAT_PCT_RANGE.max * 100)}% of energy; essential fat needs take priority.`,
      carbPctOfCalories: 1 - FAT_PCT_RANGE.max - proteinFloorPct,
      proteinFloorPct,
      fatFloorPerKg: FAT_FLOOR_G_PER_KG,
    }
  }

  return {
    proteinPerKg,
    proteinRationale: range.note,
    fatPctOfCalories: fatPct,
    fatRationale: `${Math.round(fatPct * 100)}% of energy, kept above a floor of ${FAT_FLOOR_G_PER_KG} g/kg so essential fats are still covered.`,
    carbPctOfCalories: 1 - fatPct - proteinFloorPct,
    proteinFloorPct,
    fatFloorPerKg: FAT_FLOOR_G_PER_KG,
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n))
}

function roundTo(n: number, step: number) {
  return Math.round(n / step) * step
}

/**
 * Protein / carbohydrate / fat in grams for a given target and basis.
 * Carbohydrate takes the remainder, so the three always sum to the target.
 */
export function macrosFromBasis(
  targetKcal: number,
  basis: MacroBasis,
  weightKg: number,
  planMode: PlanMode = 'balanced',
): Macros {
  let proteinG = basis.proteinPerKg * weightKg
  if (planMode === 'high-protein') {
    proteinG = Math.min(PROTEIN_HARD_CEILING_G_PER_KG * weightKg, proteinG * 1.1)
  }

  // Protein can never take more than 45% of the budget.
  const proteinKcal = proteinG * KCAL_PER_G.protein
  if (proteinKcal > targetKcal * 0.45) {
    proteinG = (targetKcal * 0.45) / KCAL_PER_G.protein
  }

  let fatG = (targetKcal * basis.fatPctOfCalories) / KCAL_PER_G.fat
  const fatFloor = basis.fatFloorPerKg * weightKg
  fatG = Math.max(fatG, fatFloor)

  const remainingKcal = targetKcal - proteinG * KCAL_PER_G.protein - fatG * KCAL_PER_G.fat
  let carbsG = Math.max(remainingKcal, 0) / KCAL_PER_G.carbs

  // If fat's floor pushed us past the target, reclaim from carbs then protein.
  const overshoot = proteinG * KCAL_PER_G.protein + fatG * KCAL_PER_G.fat - targetKcal
  if (overshoot > 0) {
    const fromCarbs = Math.min(carbsG * KCAL_PER_G.carbs, overshoot)
    carbsG -= fromCarbs / KCAL_PER_G.carbs
  }

  return {
    protein: Math.round(proteinG),
    carbs: Math.round(carbsG),
    fat: Math.round(fatG),
  }
}

/** Convenience: kcal for a macro split. */
export function macrosToKcal(m: Macros): number {
  return m.protein * KCAL_PER_G.protein + m.carbs * KCAL_PER_G.carbs + m.fat * KCAL_PER_G.fat
}

export function macroCalories(m: Macros) {
  const p = m.protein * KCAL_PER_G.protein
  const c = m.carbs * KCAL_PER_G.carbs
  const f = m.fat * KCAL_PER_G.fat
  return { protein: p, carbs: c, fat: f }
}

/** Full convenience entry point used by the store and UI. */
export function computePlanTargets(profile: Profile, exerciseKcal = 0): {
  safety: SafetyStatus
  basis: CalorieBasis | null
  targets: NutritionFacts | null
} {
  const safety = evaluateSafety(profile)

  if (safety.gated || !profile.isAdult) {
    return { safety, basis: null, targets: null }
  }

  const basis = computeCalorieBasis(
    {
      weightKg: profile.weightKg,
      heightCm: profile.heightCm,
      age: profile.age,
      sex: profile.sex,
      activityLevel: profile.activityLevel,
      goal: profile.goal,
      rate: profile.rate,
    },
    {
      useExerciseAdjustment: true,
      exerciseKcal,
      planMode: profile.planMode,
    },
  )

  const macros = macrosFromBasis(basis.target, basis.macroBasis, profile.weightKg, profile.planMode)
  const kcal = Math.round(macrosToKcal(macros))

  return {
    safety,
    basis,
    targets: {
      kcal,
      ...macros,
      fiber: Math.round(Math.max(25, profile.weightKg * 0.014 * 10) / 10),
    },
  }
}

/* --------------------------------------------------------------------------
   6. Projections — used to set a realistic rate-of-change note
   -------------------------------------------------------------------------- */

/**
 * Approximate weekly change implied by a calorie target.
 * 1 kg of body mass ≈ 7700 kcal. Deliberately coarse and framed as a guide.
 */
export function projectedWeeklyChangeKg(targetKcal: number, tdee: number): number {
  return ((tdee - targetKcal) * 7) / 7700
}

export function formatRateDescription(weeklyKg: number): string {
  const magnitude = Math.abs(weeklyKg)
  if (magnitude < 0.05) return 'Roughly stable week to week'
  if (magnitude < 0.25) return `About ${magnitude.toFixed(2)} kg per week`
  if (magnitude < 0.5) return `About ${magnitude.toFixed(1)} kg per week`
  if (magnitude < 1) return `About ${(magnitude * 2.20462).toFixed(1)} lb per week`
  return `About ${magnitude.toFixed(1)} kg per week — consider a smaller change`
}

/* --------------------------------------------------------------------------
   7. Body mass index — shown with an explicit caveat, never as a verdict
   -------------------------------------------------------------------------- */

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100
  if (m <= 0) return 0
  return weightKg / (m * m)
}

export const BMI_BANDS = [
  { max: 18.5, label: 'Lower range', tone: 'info' as const },
  { max: 25, label: 'Reference range', tone: 'ok' as const },
  { max: 30, label: 'Upper range', tone: 'warn' as const },
  { max: Infinity, label: 'Above the reference range', tone: 'danger' as const },
]

export function bmiBand(value: number) {
  return BMI_BANDS.find((b) => value < b.max) ?? BMI_BANDS[BMI_BANDS.length - 1]
}

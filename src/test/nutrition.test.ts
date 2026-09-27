import { describe, expect, it } from 'vitest'

import {
  ABSOLUTE_FLOOR_KCAL,
  ACTIVITY_LEVELS,
  FAT_FLOOR_G_PER_KG,
  MAX_DEFICIT_FRACTION,
  MAX_SURPLUS_FRACTION,
  MIN_DEFICIT_FLOOR_MULTIPLE,
  PROTEIN_RDA_G_PER_KG,
  activityDescriptor,
  bmi,
  computeCalorieBasis,
  computePlanTargets,
  evaluateSafety,
  goalDescriptor,
  macrosFromBasis,
  macrosToKcal,
  mifflinStJeor,
  tdeeFromBmr,
} from '@/lib/nutrition'
import { defaultProfile } from '@/lib/defaults'
import type { Profile } from '@/types'

const base = {
  weightKg: 75,
  heightCm: 175,
  age: 30,
  sex: 'male' as const,
  activityLevel: 'moderate' as const,
  goal: 'maintain' as const,
  rate: 'moderate' as const,
}

describe('Mifflin-St Jeor', () => {
  it('matches the published male equation', () => {
    // 10*75 + 6.25*175 - 5*30 + 5 = 750 + 1093.75 - 150 + 5 = 1698.75
    expect(mifflinStJeor(75, 175, 30, 'male')).toBeCloseTo(1698.75, 6)
  })

  it('matches the published female equation', () => {
    // 10*75 + 6.25*175 - 5*30 - 161 = 750 + 1093.75 - 150 - 161 = 1532.75
    expect(mifflinStJeor(75, 175, 30, 'female')).toBeCloseTo(1532.75, 6)
  })

  it('sits midway between the two for "unspecified"', () => {
    const male = mifflinStJeor(75, 175, 30, 'male')
    const female = mifflinStJeor(75, 175, 30, 'female')
    expect(mifflinStJeor(75, 175, 30, 'unspecified')).toBeCloseTo((male + female) / 2, 6)
  })

  it('scales linearly with weight and height', () => {
    const a = mifflinStJeor(80, 175, 30, 'male')
    const b = mifflinStJeor(70, 175, 30, 'male')
    expect(a - b).toBeCloseTo(100, 6) // 10 kcal per kg
  })

  it('decreases with age by 5 kcal per year', () => {
    const a = mifflinStJeor(75, 175, 30, 'male')
    const b = mifflinStJeor(75, 175, 40, 'male')
    expect(a - b).toBeCloseTo(50, 6)
  })

  it('never returns a negative value', () => {
    // 10*20 + 6.25*100 - 5*200 - 161 = 200 + 625 - 1000 - 161 = -336
    expect(mifflinStJeor(20, 100, 200, 'female')).toBe(0)
  })
})

describe('TDEE', () => {
  it('multiplies BMR by the activity multiplier', () => {
    const bmr = 1830
    expect(tdeeFromBmr(bmr, 'moderate')).toBeCloseTo(bmr * 1.55, 6)
  })

  it('increases monotonically with activity level', () => {
    const bmr = 1800
    const values = ACTIVITY_LEVELS.map((a) => tdeeFromBmr(bmr, a.id))
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1])
    }
  })

  it('exposes the multiplier for display', () => {
    expect(activityDescriptor('sedentary').multiplier).toBe(1.2)
    expect(activityDescriptor('athlete').multiplier).toBe(1.9)
  })
})

describe('calorie target', () => {
  it('matches TDEE exactly for maintenance', () => {
    const r = computeCalorieBasis(base)
    expect(r.target).toBe(Math.round((r.tdee * 1) / 10) * 10)
  })

  it('applies a deficit for fat loss', () => {
    const r = computeCalorieBasis({ ...base, goal: 'lose-fat', rate: 'moderate' })
    expect(r.target).toBeLessThan(r.tdee)
    expect(r.goalDeltaFraction).toBeCloseTo(-0.2, 5)
  })

  it('applies a surplus for muscle gain', () => {
    const r = computeCalorieBasis({ ...base, goal: 'build-muscle', rate: 'moderate' })
    expect(r.target).toBeGreaterThan(r.tdee)
  })

  it('clamps the deficit at 25% even if a faster rate is chosen', () => {
    const r = computeCalorieBasis({ ...base, goal: 'lose-fat', rate: 'steady' })
    expect(r.goalDeltaFraction).toBeGreaterThanOrEqual(-MAX_DEFICIT_FRACTION)
  })

  it('clamps the surplus at 20%', () => {
    const r = computeCalorieBasis({ ...base, goal: 'gain-weight', rate: 'steady' })
    expect(r.goalDeltaFraction).toBeLessThanOrEqual(MAX_SURPLUS_FRACTION)
  })

  it('honours a manual target', () => {
    const r = computeCalorieBasis(base, { manualTarget: 2400 })
    expect(r.target).toBe(2400)
  })

  it('never goes below the absolute floor', () => {
    // A tiny, sedentary person asking for aggressive loss still gets a floor.
    const r = computeCalorieBasis({
      weightKg: 42,
      heightCm: 140,
      age: 60,
      sex: 'female',
      activityLevel: 'sedentary',
      goal: 'lose-fat',
      rate: 'steady',
    })
    expect(r.target).toBeGreaterThanOrEqual(ABSOLUTE_FLOOR_KCAL.female)
  })

  it('never goes below 1.1x BMR', () => {
    const r = computeCalorieBasis({
      weightKg: 50,
      heightCm: 150,
      age: 45,
      sex: 'female',
      activityLevel: 'sedentary',
      goal: 'lose-fat',
      rate: 'steady',
    })
    const bmr = mifflinStJeor(50, 150, 45, 'female')
    expect(r.target).toBeGreaterThanOrEqual(bmr * MIN_DEFICIT_FLOOR_MULTIPLE)
  })

  it('explains a clamp when one applies', () => {
    const r = computeCalorieBasis({
      weightKg: 45,
      heightCm: 145,
      age: 55,
      sex: 'female',
      activityLevel: 'sedentary',
      goal: 'lose-fat',
      rate: 'steady',
    })
    expect(r.clampedBy).toContain('Safety floor')
  })

  it('reports the floor so the UI can show it', () => {
    const r = computeCalorieBasis(base)
    expect(r.floor).toBeGreaterThan(0)
  })

  it('rounds the target to the nearest 10', () => {
    const r = computeCalorieBasis(base)
    expect(r.target % 10).toBe(0)
  })

  it('caps any exercise adjustment at 600 kcal', () => {
    const r = computeCalorieBasis(base, { useExerciseAdjustment: true, exerciseKcal: 5000 })
    const without = computeCalorieBasis(base)
    expect(r.tdee - without.tdee).toBeLessThanOrEqual(600)
  })

  it('does not subtract for exercise energy', () => {
    const withEx = computeCalorieBasis(base, { useExerciseAdjustment: true, exerciseKcal: 300 })
    const without = computeCalorieBasis(base)
    expect(withEx.tdee).toBeGreaterThan(without.tdee)
  })

  it('always returns transparency notes', () => {
    const r = computeCalorieBasis(base)
    expect(r.notes.length).toBeGreaterThan(0)
  })
})

describe('goal descriptors', () => {
  it('defines all seven goals', () => {
    const ids = [
      'build-muscle', 'gain-weight', 'lose-fat', 'maintain',
      'recompose', 'performance', 'general-fitness',
    ] as const
    for (const id of ids) expect(goalDescriptor(id).id).toBe(id)
  })

  it('marks no goal as energy-restricting at maintenance rate for "maintain"', () => {
    const d = goalDescriptor('maintain')
    expect(d.delta.gentle).toBe(0)
    expect(d.delta.moderate).toBe(0)
    expect(d.delta.steady).toBe(0)
  })

  it('orders gentle as the smallest change for gain goals', () => {
    const d = goalDescriptor('build-muscle')
    expect(d.delta.gentle).toBeLessThan(d.delta.steady)
  })
})

describe('macros', () => {
  const basis = computeCalorieBasis({ ...base, goal: 'build-muscle' })

  it('sums to approximately the calorie target', () => {
    const m = macrosFromBasis(basis.target, basis.macroBasis, base.weightKg)
    // Whole-gram rounding moves the total by a few kcal at most.
    expect(Math.abs(macrosToKcal(m) - basis.target)).toBeLessThan(12)
  })

  it('keeps protein at or above the RDA floor', () => {
    const m = macrosFromBasis(basis.target, basis.macroBasis, base.weightKg)
    expect(m.protein).toBeGreaterThanOrEqual(PROTEIN_RDA_G_PER_KG * base.weightKg)
  })

  it('keeps protein at or below the researched ceiling', () => {
    const m = macrosFromBasis(basis.target, basis.macroBasis, base.weightKg)
    expect(m.protein).toBeLessThanOrEqual(2.4 * base.weightKg)
  })

  it('keeps fat at or above its per-kg floor', () => {
    const m = macrosFromBasis(basis.target, basis.macroBasis, base.weightKg)
    expect(m.fat).toBeGreaterThanOrEqual(FAT_FLOOR_G_PER_KG * base.weightKg - 1)
  })

  it('never returns negative carbohydrate', () => {
    // An extreme manual target must not produce a negative macro.
    const b = computeCalorieBasis(base, { manualTarget: 1200 })
    const m = macrosFromBasis(b.target, b.macroBasis, base.weightKg)
    expect(m.carbs).toBeGreaterThanOrEqual(0)
    expect(m.fat).toBeGreaterThanOrEqual(0)
  })

  it('scales protein with body mass', () => {
    const light = macrosFromBasis(2400, basis.macroBasis, 60)
    const heavy = macrosFromBasis(2400, basis.macroBasis, 90)
    expect(heavy.protein).toBeGreaterThan(light.protein)
  })

  it('raises protein in high-protein mode', () => {
    const normal = macrosFromBasis(basis.target, basis.macroBasis, base.weightKg, 'balanced')
    const high = macrosFromBasis(basis.target, basis.macroBasis, base.weightKg, 'high-protein')
    expect(high.protein).toBeGreaterThan(normal.protein)
    expect(high.protein).toBeLessThanOrEqual(2.4 * base.weightKg)
  })

  it('returns whole grams', () => {
    const m = macrosFromBasis(basis.target, basis.macroBasis, base.weightKg)
    for (const v of Object.values(m)) expect(Number.isInteger(v)).toBe(true)
  })
})

describe('safety gating', () => {
  const adult: Profile = { ...defaultProfile(), isAdult: true }

  it('does not gate a plain adult profile', () => {
    expect(evaluateSafety(adult).gated).toBe(false)
  })

  it('gates anyone under 18', () => {
    const s = evaluateSafety({ isAdult: false, healthFlags: [], goal: 'maintain' })
    expect(s.gated).toBe(true)
    expect(s.reasons.some((r) => r.includes('under 18'))).toBe(true)
  })

  it.each([
    'pregnancy',
    'breastfeeding',
    'eating-disorder-risk',
    'diabetes',
    'kidney-disease',
    'medication-affecting-diet',
  ] as const)('gates on %s', (flag) => {
    const s = evaluateSafety({ ...adult, healthFlags: [flag] })
    expect(s.gated).toBe(true)
    expect(s.reasons.length).toBeGreaterThan(0)
  })

  it('does not gate on non-prescriptive flags', () => {
    expect(evaluateSafety({ ...adult, healthFlags: ['pcos'] }).gated).toBe(false)
    expect(evaluateSafety({ ...adult, healthFlags: ['celiac'] }).gated).toBe(false)
    expect(evaluateSafety({ ...adult, healthFlags: ['thyroid'] }).gated).toBe(false)
  })

  it('always offers general guidance', () => {
    expect(evaluateSafety(adult).generalGuidance.length).toBeGreaterThan(0)
  })
})

describe('computePlanTargets', () => {
  it('returns a full target set for an adult', () => {
    const p: Profile = { ...defaultProfile(), isAdult: true, age: 28 }
    const r = computePlanTargets(p)
    expect(r.targets).not.toBeNull()
    expect(r.basis).not.toBeNull()
    expect(r.targets!.kcal).toBeGreaterThan(1200)
    expect(r.targets!.protein).toBeGreaterThan(0)
    expect(r.targets!.fiber).toBeGreaterThan(0)
  })

  it('returns no target for a minor', () => {
    const p: Profile = { ...defaultProfile(), isAdult: false, age: 15 }
    const r = computePlanTargets(p)
    expect(r.targets).toBeNull()
    expect(r.basis).toBeNull()
    expect(r.safety.gated).toBe(true)
  })

  it('returns no target when a gating flag is present', () => {
    const p: Profile = { ...defaultProfile(), isAdult: true, healthFlags: ['pregnancy'] }
    expect(computePlanTargets(p).targets).toBeNull()
  })

  it('is deterministic for the same input', () => {
    const p: Profile = { ...defaultProfile(), isAdult: true, age: 30, weightKg: 70 }
    expect(computePlanTargets(p).targets).toEqual(computePlanTargets(p).targets)
  })
})

describe('BMI', () => {
  it('computes the standard value', () => {
    expect(bmi(70, 175)).toBeCloseTo(22.857, 2)
  })

  it('returns zero for a zero height rather than Infinity', () => {
    expect(bmi(70, 0)).toBe(0)
  })
})

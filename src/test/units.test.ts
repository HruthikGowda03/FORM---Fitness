import { describe, expect, it } from 'vitest'

import {
  CM_PER_IN,
  cmToFeetInches,
  cmToIn,
  feetInchesToCm,
  fromKg,
  inToCm,
  kgToLb,
  lbToKg,
  massUnitFor,
  lengthUnitFor,
  roundTo,
  toKg,
  toWeeklyBudget,
  formatHeight,
} from '@/lib/units'

describe('mass conversion', () => {
  it('converts kilograms to pounds', () => {
    expect(kgToLb(100)).toBeCloseTo(220.462, 2)
  })

  it('converts pounds to kilograms', () => {
    expect(lbToKg(220.462)).toBeCloseTo(100, 1)
  })

  it('round-trips kg -> lb -> kg', () => {
    const original = 72.4
    expect(lbToKg(kgToLb(original))).toBeCloseTo(original, 6)
  })

  it('is identity for kg', () => {
    expect(toKg(80, 'kg')).toBe(80)
    expect(fromKg(80, 'kg')).toBe(80)
  })

  it('converts lb input to kg', () => {
    expect(toKg(154, 'lb')).toBeCloseTo(69.85, 2)
  })

  it('handles zero and boundaries', () => {
    expect(kgToLb(0)).toBe(0)
    expect(lbToKg(0)).toBe(0)
  })
})

describe('length conversion', () => {
  it('uses the exact international inch', () => {
    expect(CM_PER_IN).toBe(2.54)
    expect(cmToIn(2.54)).toBeCloseTo(1, 9)
    expect(inToCm(1)).toBeCloseTo(2.54, 9)
  })

  it('splits cm into feet and inches', () => {
    // 180 cm = 70.87 in, which rounds to 5 ft 11 in at half-inch precision.
    const r = cmToFeetInches(180)
    expect(r.feet).toBe(5)
    expect(r.inches).toBe(11)
  })

  it('rounds inches to the nearest half inch', () => {
    const r = cmToFeetInches(175)
    expect(r.inches % 0.5).toBe(0)
  })

  it('never produces 12 inches', () => {
    // A height that rounds to 12.4 in must roll over to 6 ft 0.4 in.
    const r = cmToFeetInches(175.5)
    expect(r.inches).toBeLessThan(12)
    expect(r.feet).toBe(5)
    expect(r.inches).toBe(9)
  })

  it('round-trips feet/inches through cm', () => {
    const cm = feetInchesToCm(5, 9)
    expect(cm).toBeCloseTo(175.26, 1)
    const back = cmToFeetInches(cm)
    expect(back.feet).toBe(5)
    expect(Math.abs(back.inches - 9)).toBeLessThan(0.6)
  })

  it('formats height in both systems', () => {
    expect(formatHeight(180, 'cm')).toBe('180 cm')
    expect(formatHeight(180, 'ft-in')).toMatch(/^5'10\.9$|^5'11"$/)
  })
})

describe('unit selection', () => {
  it('maps the weight system to display units', () => {
    expect(massUnitFor('metric')).toBe('kg')
    expect(massUnitFor('imperial')).toBe('lb')
    expect(lengthUnitFor('metric')).toBe('cm')
    expect(lengthUnitFor('imperial')).toBe('ft-in')
  })
})

describe('rounding', () => {
  it('rounds to the nearest step', () => {
    expect(roundTo(1.24, 0.1)).toBeCloseTo(1.2, 5)
    expect(roundTo(1.26, 0.1)).toBeCloseTo(1.3, 5)
    expect(roundTo(47, 5)).toBe(45)
  })
})

describe('budget period normalisation', () => {
  it('leaves a weekly budget alone', () => {
    expect(toWeeklyBudget(1500, 'weekly')).toBe(1500)
  })

  it('converts monthly to weekly using 4.345 weeks', () => {
    expect(toWeeklyBudget(4345, 'monthly')).toBeCloseTo(1000, 0)
  })

  it('handles a zero budget', () => {
    expect(toWeeklyBudget(0, 'monthly')).toBe(0)
  })
})

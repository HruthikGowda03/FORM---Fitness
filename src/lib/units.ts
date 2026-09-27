/* ==========================================================================
   Unit conversion — the single place mass/length conversion happens.
   Everything internal is metric (kg, cm); conversion happens at the edges.
   ========================================================================== */

import type { LengthUnit, MassUnit, WeightSystem } from '@/types'

export const KG_PER_LB = 0.45359237
export const CM_PER_IN = 2.54

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB
}

export function cmToIn(cm: number): number {
  return cm / CM_PER_IN
}

export function inToCm(inches: number): number {
  return inches * CM_PER_IN
}

export interface FeetInches {
  feet: number
  inches: number
}

/** Split a cm height into whole feet + remaining inches (rounded to 0.5 in). */
export function cmToFeetInches(cm: number): FeetInches {
  const totalIn = cmToIn(cm)
  const roundedIn = Math.round(totalIn * 2) / 2
  let feet = Math.floor(roundedIn / 12)
  let inches = roundedIn - feet * 12
  if (inches >= 12) {
    feet += 1
    inches -= 12
  }
  return { feet, inches }
}

export function feetInchesToCm(feet: number, inches: number): number {
  return inToCm(feet * 12 + inches)
}

/** Display a cm height as either "172 cm" or "5'8.5\"" depending on preference. */
export function formatHeight(cm: number, unit: LengthUnit): string {
  if (unit === 'cm') return `${Math.round(cm)} cm`
  const { feet, inches } = cmToFeetInches(cm)
  const inchStr = Number.isInteger(inches) ? `${inches}` : inches.toFixed(1)
  return `${feet}'${inchStr}"`
}

export function massUnitFor(system: WeightSystem): MassUnit {
  return system === 'metric' ? 'kg' : 'lb'
}

export function lengthUnitFor(system: WeightSystem): LengthUnit {
  return system === 'metric' ? 'cm' : 'ft-in'
}

/** Convert a user-entered mass into kilograms. */
export function toKg(value: number, unit: MassUnit): number {
  return unit === 'kg' ? value : lbToKg(value)
}

/** Convert kilograms into the user's display unit. */
export function fromKg(kg: number, unit: MassUnit): number {
  return unit === 'kg' ? kg : kgToLb(kg)
}

export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step
}

/* ==========================================================================
   Budget period normalisation
   ========================================================================== */

export type BudgetPeriod = 'weekly' | 'monthly'

/** Rough, clearly-labelled conversion used only to compare a budget against a
 *  weekly grocery estimate. 52 weeks / 12 months. */
export function toWeeklyBudget(amount: number, period: BudgetPeriod): number {
  return period === 'weekly' ? amount : amount / 4.345
}

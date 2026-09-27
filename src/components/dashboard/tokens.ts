/* ==========================================================================
   FORM — shared colour tokens for data visualisation
   Recharts needs literal colour strings, so the theme tokens are mirrored here
   as a single source of truth rather than repeated across chart components.
   ========================================================================== */

export const FOOD_LOG_TONE = {
  protein: '#C8FF3D',
  carbs: '#7CC4FF',
  fat: '#FFC46B',
  water: '#7CC4FF',
  energy: '#C8FF3D',
  weight: '#C8FF3D',
  strength: '#7EE0A8',
  energy_level: '#FFC46B',
  sleep: '#7CC4FF',
} as const

export const SERIES_COLOURS = [
  FOOD_LOG_TONE.protein,
  FOOD_LOG_TONE.carbs,
  FOOD_LOG_TONE.fat,
  FOOD_LOG_TONE.strength,
  FOOD_LOG_TONE.energy_level,
] as const

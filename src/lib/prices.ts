/* ==========================================================================
   FORM — price assumptions & grocery list construction
   ---------------------------------------------------------------------------
   Prices are *assumptions the user controls*, not live market data. Each food
   carries a default per-kg cost in the database; the overrides below let a
   user correct any of them for their city, and the currency switch applies a
   single explicit, editable rate.

   Nothing here contacts a network service.
   ========================================================================== */

import { FOODS } from '@/data/foods'
import type { Food, GroceryGroup, GroceryItem, MealPlan, Profile } from '@/types'
import { toWeeklyBudget } from './units'

/** Explicit, editable assumption — not a live FX quote. */
export const CURRENCY: Record<
  'INR' | 'USD',
  { symbol: string; label: string; perUsd: number; note: string }
> = {
  INR: {
    symbol: '₹',
    label: 'Indian rupee',
    perUsd: 1,
    note: 'Default base currency. Indian staples use whole-food retail assumptions.',
  },
  USD: {
    symbol: '$',
    label: 'US dollar',
    perUsd: 83,
    note: 'Converted at an editable assumed rate of ₹83 = $1. Change it in Settings to match your own budget.',
  },
}

export type PriceOverrides = Record<string, number>

export function foodUnitCost(
  food: Food,
  currency: 'INR' | 'USD',
  overrides: PriceOverrides = {},
): number {
  const base = overrides[food.id] ?? food.costPerKg
  return currency === 'INR' ? base : base / CURRENCY.USD.perUsd
}

export function formatMoney(amount: number, currency: 'INR' | 'USD', fractionDigits = 0): string {
  const { symbol } = CURRENCY[currency]
  const value = currency === 'INR' ? amount : amount
  return `${symbol}${value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`
}

/* --------------------------------------------------------------------------
   Grocery grouping
   -------------------------------------------------------------------------- */

const GROUP_BY_CATEGORY: Record<Food['category'], GroceryGroup> = {
  protein: 'protein',
  dairy: 'dairy',
  grain: 'grains',
  legume: 'pantry',
  vegetable: 'vegetables',
  fruit: 'fruits',
  nuts: 'pantry',
  fat: 'pantry',
  pantry: 'pantry',
  drink: 'pantry',
}

export const GROUPS: readonly { id: GroceryGroup; label: string; blurb: string }[] = [
  { id: 'vegetables', label: 'Vegetables', blurb: 'Fresh, and usually bought loose or by weight.' },
  { id: 'fruits', label: 'Fruits', blurb: 'Whole fruit keeps the fibre intact.' },
  { id: 'grains', label: 'Grains & starches', blurb: 'Rice, atta, oats, bread, pasta.' },
  { id: 'dairy', label: 'Dairy & alternatives', blurb: 'Milk, curd, paneer, soy milk.' },
  { id: 'protein', label: 'Protein sources', blurb: 'Chicken, fish, eggs, paneer, tofu, legumes.' },
  { id: 'pantry', label: 'Pantry & essentials', blurb: 'Oils, ghee, nuts, seeds, spices, condiments.' },
]

export function groupFor(food: Food): GroceryGroup {
  return GROUP_BY_CATEGORY[food.category]
}

/* --------------------------------------------------------------------------
   List construction
   -------------------------------------------------------------------------- */

export type BuildGroceryOptions = {
  plan: MealPlan
  profile: Profile
  overrides?: PriceOverrides
  /** keep the previous checked / quantity state where the food still exists */
  previous?: GroceryItem[]
}

/**
 * Consolidate a plan into a single shopping list.
 *
 * Quantities are summed in *servings* and converted to grams, because that is
 * the unit the food database is honest about. A real shop sells by weight or
 * by piece, and the UI says so rather than pretending a "3.5 servings" of
 * onion is a purchasable amount.
 */
export function buildGroceryList(options: BuildGroceryOptions): GroceryItem[] {
  const { plan, profile } = options
  const overrides = options.overrides ?? {}
  const prev = new Map((options.previous ?? []).map((i) => [i.foodId, i]))

  const totals = new Map<string, { servings: number; grams: number; food: Food }>()

  for (const day of plan.days) {
    for (const meal of day.meals) {
      for (const item of meal.items) {
        const existing = totals.get(item.foodId)
        const servings = item.servings
        const grams = item.food.serving.grams * servings
        if (existing) {
          existing.servings += servings
          existing.grams += grams
        } else {
          totals.set(item.foodId, { servings, grams, food: item.food })
        }
      }
    }
  }

  const items: GroceryItem[] = []
  for (const [foodId, agg] of totals) {
    const prevItem = prev.get(foodId)
    const grams = Math.round(agg.grams)
    // Shop in round units: buy in 100 g steps for produce, 500 g for staples.
    const shoppable = roundUpTo(grams, foodIsBulk(foodId) ? 500 : 100)
    items.push({
      foodId,
      name: agg.food.name,
      localName: agg.food.localName,
      group: groupFor(agg.food),
      servings: Math.round(agg.servings * 4) / 4,
      grams: shoppable,
      servingLabel: agg.food.serving.label,
      unitCost: foodUnitCost(agg.food, profile.budget.currency, overrides),
      cost: (foodUnitCost(agg.food, profile.budget.currency, overrides) * shoppable) / 1000,
      checked: prevItem?.checked ?? false,
      quantityOverride: prevItem?.quantityOverride,
    })
  }

  return items.sort((a, b) => {
    const gi = GROUPS.findIndex((g) => g.id === a.group)
    const gj = GROUPS.findIndex((g) => g.id === b.group)
    if (gi !== gj) return gi - gj
    return a.name.localeCompare(b.name)
  })
}

const BULK = new Set([
  'rice-brown', 'rice-white', 'oats-rolled', 'pasta-cooked', 'quinoa', 'lentils',
  'chana-boiled', 'sprouts', 'dal-masoor', 'dal-toor', 'dal-moong', 'dal-chana',
  'rajma', 'soya-chunks', 'milk-toned', 'milk-full', 'tofu', 'tempeh',
  'chicken-breast', 'chicken-curry', 'tandoori-chicken', 'fish-curry', 'tandoori-fish',
  'paneer', 'greek-yogurt', 'soymilk', 'coconut-milk', 'bread-brown',
])

function foodIsBulk(id: string) {
  return BULK.has(id)
}

function roundUpTo(value: number, step: number) {
  return Math.max(step, Math.ceil(value / step) * step)
}

export function groceryTotals(items: GroceryItem[]) {
  const remaining = items.filter((i) => !i.checked)
  const sum = (list: GroceryItem[]) => list.reduce((acc, i) => acc + effectiveCost(i), 0)
  return {
    total: sum(items),
    remaining: sum(remaining),
    checkedCount: items.length - remaining.length,
    count: items.length,
  }
}

/** Cost after any user quantity override. */
export function effectiveCost(item: GroceryItem): number {
  const grams = item.quantityOverride ?? item.grams
  return (item.unitCost * grams) / 1000
}

export type BudgetComparison = {
  weeklyBudget: number | null
  estimate: number
  diff: number
  ratio: number | null
  status: 'under' | 'close' | 'over' | 'unknown'
  currency: 'INR' | 'USD'
  message: string
}

export function compareToBudget(
  items: GroceryItem[],
  profile: Profile,
): BudgetComparison {
  const { currency } = profile.budget
  const estimate = groceryTotals(items).remaining
  const weekly = profile.budget.amount > 0 ? toWeeklyBudget(profile.budget.amount, profile.budget.period) : null

  if (weekly === null) {
    return {
      weeklyBudget: null,
      estimate,
      diff: 0,
      ratio: null,
      status: 'unknown',
      currency,
      message: 'No budget set. Add one in Settings to see whether this plan fits.',
    }
  }

  const ratio = weekly > 0 ? estimate / weekly : null
  const diff = weekly - estimate

  const status: BudgetComparison['status'] =
    ratio === null ? 'unknown' : ratio > 1 ? 'over' : ratio > 0.9 ? 'close' : 'under'

  const money = (n: number) => formatMoney(n, currency)

  const message =
    status === 'over'
      ? `This plan is about ${money(-diff)} over your ${profile.budget.period} budget. Try the student budget mode, or swap a few meals.`
      : status === 'close'
        ? `This plan uses about ${Math.round((ratio ?? 0) * 100)}% of your ${profile.budget.period} food budget.`
        : `This plan leaves about ${money(diff)} of your ${profile.budget.period} food budget unspent.`

  return { weeklyBudget: weekly, estimate, diff, ratio, status, currency, message }
}

/* --------------------------------------------------------------------------
   CSV export
   -------------------------------------------------------------------------- */

export function groceryToCsv(items: GroceryItem[], currency: 'INR' | 'USD'): string {
  const head = 'Group,Item,Quantity (g),Servings,Est. cost (' + CURRENCY[currency].label + '),Purchased'
  const rows = items.map((i) =>
    [
      i.group,
      `"${i.localName ? `${i.name} (${i.localName})` : i.name}"`,
      i.quantityOverride ?? i.grams,
      i.servings,
      effectiveCost(i).toFixed(2),
      i.checked ? 'yes' : 'no',
    ].join(','),
  )
  return [head, ...rows].join('\n')
}

export function downloadText(filename: string, content: string, mime = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke on the next tick so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** Reset every price override back to the built-in assumption. */
export function defaultOverrides(): PriceOverrides {
  return {}
}

export const DEFAULT_PRICE_BASIS =
  'Built-in per-kilogram assumptions. These are starting guesses for planning, not live prices — correct any of them in Settings to match what you actually pay.'
export { FOODS }

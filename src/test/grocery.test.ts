import { describe, expect, it } from 'vitest'

import { CURRENCY, compareToBudget, effectiveCost, groceryToCsv, groceryTotals } from '@/lib/prices'
import { GROUPS, buildGroceryList, groupFor } from '@/lib/prices'
import { computePlanTargets } from '@/lib/nutrition'
import { generateMealPlan } from '@/lib/meal-plan'
import { defaultProfile } from '@/lib/defaults'
import { FOODS_BY_ID } from '@/data/foods'
import type { GroceryItem, Profile } from '@/types'

function setup(over: Partial<Profile> = {}) {
  const profile: Profile = { ...defaultProfile(), isAdult: true, age: 30, ...over }
  const { targets } = computePlanTargets(profile)
  const plan = generateMealPlan({ profile, target: targets!, seed: 555 })
  return { profile, plan }
}

describe('grouping', () => {
  it('maps every category to a shopper-facing group', () => {
    expect(groupFor(FOODS_BY_ID.get('chicken-curry')!)).toBe('protein')
    expect(groupFor(FOODS_BY_ID.get('curd')!)).toBe('dairy')
    expect(groupFor(FOODS_BY_ID.get('rice-white')!)).toBe('grains')
    expect(groupFor(FOODS_BY_ID.get('spinach')!)).toBe('vegetables')
    expect(groupFor(FOODS_BY_ID.get('banana')!)).toBe('fruits')
    expect(groupFor(FOODS_BY_ID.get('cooking-oil')!)).toBe('pantry')
  })
})

describe('grocery list', () => {
  it('consolidates repeated ingredients into one row', () => {
    const { profile, plan } = setup()
    const items = buildGroceryList({ plan, profile })
    const ids = items.map((i) => i.foodId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('sums servings across the whole week', () => {
    const { profile, plan } = setup()
    for (const item of buildGroceryList({ plan, profile })) {
      const inPlan = plan.days
        .flatMap((d) => d.meals)
        .flatMap((m) => m.items)
        .filter((i) => i.foodId === item.foodId)
        .reduce((s, i) => s + i.servings, 0)
      expect(Math.abs(item.servings - inPlan)).toBeLessThan(0.5)
    }
  })

  it('rounds quantities up to something shoppable', () => {
    const { profile, plan } = setup()
    for (const item of buildGroceryList({ plan, profile })) {
      expect(item.grams).toBeGreaterThan(0)
      expect(item.grams % 50).toBe(0)
    }
  })

  it('never buys less than the plan needs', () => {
    const { profile, plan } = setup()
    for (const item of buildGroceryList({ plan, profile })) {
      const needed = plan.days
        .flatMap((d) => d.meals)
        .flatMap((m) => m.items)
        .filter((i) => i.foodId === item.foodId)
        .reduce((s, i) => s + i.food.serving.grams * i.servings, 0)
      expect(item.grams).toBeGreaterThanOrEqual(Math.floor(needed))
    }
  })

  it('starts everything unticked', () => {
    const { profile, plan } = setup()
    expect(buildGroceryList({ plan, profile }).every((i) => !i.checked)).toBe(true)
  })

  it('preserves ticks and quantity overrides from a previous list', () => {
    const { profile, plan } = setup()
    const first = buildGroceryList({ plan, profile })
    const edited = first.map((i, idx) =>
      idx === 0 ? { ...i, checked: true, quantityOverride: 999 } : i,
    )
    const second = buildGroceryList({ plan, profile, previous: edited })
    expect(second[0].checked).toBe(true)
    expect(second[0].quantityOverride).toBe(999)
    expect(second[1].checked).toBe(false)
  })

  it('groups items into the declared group order, then sorts by name', () => {
    const { profile, plan } = setup()
    const items = buildGroceryList({ plan, profile })
    const order = GROUPS.map((g) => g.id)
    const seen = items.map((i) => order.indexOf(i.group))
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1])
    }
    for (const g of GROUPS) {
      const names = items.filter((i) => i.group === g.id).map((i) => i.name)
      expect([...names].sort()).toEqual(names)
    }
  })

  it('is empty for an empty plan', () => {
    const { profile } = setup()
    const empty = {
      days: [],
      target: { kcal: 2000, protein: 100, carbs: 200, fat: 60, fiber: 30 },
      seed: 1,
      generatedAt: '',
      mode: 'balanced' as const,
    }
    expect(buildGroceryList({ plan: empty, profile })).toHaveLength(0)
  })
})

describe('costing', () => {
  it('charges unit cost times grams', () => {
    const { profile, plan } = setup()
    for (const item of buildGroceryList({ plan, profile })) {
      expect(item.cost).toBeCloseTo((item.unitCost * item.grams) / 1000, 6)
    }
  })

  it('honours a price override', () => {
    const { profile, plan } = setup()
    const base = buildGroceryList({ plan, profile })
    const target = base[0].foodId
    const overridden = buildGroceryList({ plan, profile, overrides: { [target]: 999 } })
    const row = overridden.find((i) => i.foodId === target)!
    expect(row.unitCost).toBe(999)
    expect(row.cost).toBeCloseTo((999 * row.grams) / 1000, 6)
  })

  it('converts to USD at the stated rate', () => {
    const { profile, plan } = setup({ budget: { ...defaultProfile().budget, currency: 'USD' } })
    const inr = buildGroceryList({ plan, profile: { ...profile, budget: { ...profile.budget, currency: 'INR' } } })
    const usd = buildGroceryList({ plan, profile })
    expect(usd[0].unitCost).toBeCloseTo(inr[0].unitCost / CURRENCY.USD.perUsd, 6)
  })

  it('respects a quantity override in the effective cost', () => {
    const item: GroceryItem = {
      foodId: 'x', name: 'X', group: 'pantry', servings: 1, grams: 100,
      servingLabel: '100 g', unitCost: 50, cost: 5, checked: false,
    }
    expect(effectiveCost(item)).toBe(5)
    expect(effectiveCost({ ...item, quantityOverride: 300 })).toBe(15)
  })
})

describe('budget comparison', () => {
  it('reports "under" when there is headroom', () => {
    const { profile } = setup({ budget: { amount: 20000, period: 'weekly', currency: 'INR' } })
    expect(compareToBudget([], profile).status).toBe('under')
  })

  it('reports "over" past the budget', () => {
    const { profile } = setup({ budget: { amount: 1, period: 'weekly', currency: 'INR' } })
    const expensive: GroceryItem[] = [
      { foodId: 'a', name: 'A', group: 'protein', servings: 1, grams: 1000, servingLabel: '1 kg', unitCost: 5000, cost: 5000, checked: false },
    ]
    expect(compareToBudget(expensive, profile).status).toBe('over')
  })

  it('reports "close" at 90-100% of budget', () => {
    const { profile } = setup({ budget: { amount: 1000, period: 'weekly', currency: 'INR' } })
    const items: GroceryItem[] = [
      { foodId: 'a', name: 'A', group: 'protein', servings: 1, grams: 1000, servingLabel: '1 kg', unitCost: 950, cost: 950, checked: false },
    ]
    expect(compareToBudget(items, profile).status).toBe('close')
  })

  it('says unknown when no budget is set', () => {
    const { profile } = setup({ budget: { amount: 0, period: 'weekly', currency: 'INR' } })
    expect(compareToBudget([], profile).status).toBe('unknown')
  })

  it('normalises a monthly budget to weekly', () => {
    const { profile } = setup({ budget: { amount: 4345, period: 'monthly', currency: 'INR' } })
    expect(compareToBudget([], profile).weeklyBudget).toBeCloseTo(1000, 0)
  })

  it('excludes ticked items from the remaining total', () => {
    const items: GroceryItem[] = [
      { foodId: 'a', name: 'A', group: 'protein', servings: 1, grams: 100, servingLabel: '100 g', unitCost: 100, cost: 10, checked: true },
      { foodId: 'b', name: 'B', group: 'protein', servings: 1, grams: 100, servingLabel: '100 g', unitCost: 100, cost: 10, checked: false },
    ]
    const t = groceryTotals(items)
    expect(t.total).toBeCloseTo(20, 6)
    expect(t.remaining).toBeCloseTo(10, 6)
    expect(t.checkedCount).toBe(1)
  })
})

describe('CSV export', () => {
  it('has a header and one row per item', () => {
    const { profile, plan } = setup()
    const items = buildGroceryList({ plan, profile })
    expect(groceryToCsv(items, 'INR').split('\n')).toHaveLength(items.length + 1)
  })

  it('quotes names containing commas', () => {
    const items: GroceryItem[] = [
      { foodId: 'a', name: 'Dal, plain', group: 'protein', servings: 1, grams: 100, servingLabel: '100 g', unitCost: 10, cost: 1, checked: false },
    ]
    expect(groceryToCsv(items, 'INR')).toContain('"Dal, plain"')
  })
})

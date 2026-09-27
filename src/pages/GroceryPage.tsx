/* ==========================================================================
   FORM — grocery list & budget
   ========================================================================== */

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  Download,
  Printer,
  RefreshCw,
  ShoppingBasket,
  Trash2,
  Undo2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { Eyebrow, PageLead, PageShell, PageTitle } from '@/components/layout/Page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Callout } from '@/components/ui/separator'
import { Reveal, RevealItem, Stagger } from '@/components/motion/primitives'
import { cn } from '@/lib/cn'
import { EASE } from '@/lib/motion'
import { formatGrams } from '@/lib/format'
import {
  CURRENCY,
  GROUPS,
  compareToBudget,
  downloadText,
  effectiveCost,
  groceryToCsv,
  groceryTotals,
} from '@/lib/prices'
import { useActions, useProfile } from '@/store/AppStore'
import type { GroceryGroup } from '@/types'

export function GroceryPage() {
  const active = useProfile()
  const { profile, plan, grocery = [] } = active ?? {}
  const { rebuildGrocery, toggleGrocery, setGroceryQuantity, clearGroceryChecks } = useActions()
  const [editing, setEditing] = useState<string | null>(null)
  const reduce = useReducedMotion()

  /* Build the list automatically the first time this page is opened, and
     whenever the plan changes underneath it. */
  useEffect(() => {
    if (profile && plan && grocery.length === 0) rebuildGrocery()
  }, [profile, plan, grocery.length, rebuildGrocery])

  const totals = useMemo(() => groceryTotals(grocery), [grocery])
  const budget = useMemo(
    () => (profile ? compareToBudget(grocery, profile) : null),
    [grocery, profile],
  )

  const grouped = useMemo(() => {
    const map = new Map<GroceryGroup, typeof grocery>()
    for (const g of GROUPS) map.set(g.id, [])
    for (const item of grocery) {
      const list = map.get(item.group)
      if (list) list.push(item)
    }
    return map
  }, [grocery])

  if (!profile || !budget) return null

  const currency = profile.budget.currency
  const symbol = CURRENCY[currency].symbol
  const money = (n: number) =>
    `${symbol}${n.toLocaleString(undefined, { maximumFractionDigits: currency === 'USD' ? 2 : 0 })}`

  return (
    <PageShell>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>Grocery list</Eyebrow>
          <PageTitle className="mt-3">One list, grouped and costed.</PageTitle>
          <PageLead className="mt-4">
            Every ingredient in your plan, consolidated and rounded to a quantity you can actually
            buy. Costs come from per-kilogram assumptions in the app — correct them in Settings to
            match what you really pay.
          </PageLead>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => rebuildGrocery()}>
            <RefreshCw className="size-3.5" />
            Rebuild
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer className="size-3.5" />
            Print
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => downloadText(`form-grocery-${Date.now()}.csv`, groceryToCsv(grocery, currency), 'text/csv')}
          >
            <Download className="size-3.5" />
            CSV
          </Button>
        </div>
      </div>

      {grocery.length === 0 ? (
        <div className="mt-10">
          <Callout tone="muted">
            No list yet. Build or regenerate a meal plan and the shopping list follows from it.
          </Callout>
          <Button asChild className="mt-6">
            <Link to="/planner">Go to the planner</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* ---------------- budget summary ---------------- */}
          <Stagger
            className="no-print mt-10 grid gap-px border border-line bg-line sm:grid-cols-3"
            gap={0.08}
          >
            <RevealItem className="print-plain bg-surface p-5">
              <p className="eyebrow text-faint">Estimated total</p>
              <p className="num mt-2 text-3xl font-bold text-ink">{money(totals.total)}</p>
              <p className="mt-1 text-xs text-muted">{totals.count} items this week</p>
            </RevealItem>

            <RevealItem className="print-plain bg-surface p-5">
              <p className="eyebrow text-faint">Still to buy</p>
              <p className="num mt-2 text-3xl font-bold text-accent">{money(totals.remaining)}</p>
              <p className="mt-1 text-xs text-muted">
                {totals.checkedCount} of {totals.count} ticked off
              </p>
            </RevealItem>

            <RevealItem className="print-plain bg-surface p-5">
              <p className="eyebrow text-faint">Against your budget</p>
              {budget.weeklyBudget === null ? (
                <>
                  <p className="display-face mt-2 text-2xl text-ink">Not set</p>
                  <p className="mt-1 text-xs text-muted">Add one in Settings</p>
                </>
              ) : (
                <>
                  <motion.p
                    className={cn(
                      'num mt-2 text-3xl font-bold',
                      budget.status === 'over'
                        ? 'text-danger'
                        : budget.status === 'close'
                          ? 'text-warn'
                          : 'text-ok',
                    )}
                    initial={false}
                    animate={
                      reduce
                        ? undefined
                        : { scale: [1, 1.04, 1] }
                    }
                    transition={{ duration: 0.45, ease: EASE.out }}
                    key={budget.ratio !== null ? Math.round(budget.ratio * 100) : 'none'}
                  >
                    {budget.ratio !== null ? Math.round(budget.ratio * 100) : 0}%
                  </motion.p>
                  <p className="num mt-1 text-xs text-muted">
                    of {money(budget.weeklyBudget)} / week
                  </p>
                </>
              )}
            </RevealItem>
          </Stagger>

          {budget.weeklyBudget !== null && (
            <div className="no-print mt-3">
              <Progress
                value={Math.min(totals.remaining, budget.weeklyBudget * 1.5)}
                max={budget.weeklyBudget * 1.5}
                tone={budget.status === 'over' ? 'danger' : budget.status === 'close' ? 'warn' : 'ok'}
              />
              <p className="mt-2 text-xs leading-relaxed text-muted">{budget.message}</p>
            </div>
          )}

          <div className="no-print mt-4 flex items-center justify-between gap-3">
            <p className="font-mono text-[0.625rem] text-faint">
              {currency === 'INR' ? CURRENCY.INR.note : CURRENCY.USD.note}
            </p>
            {totals.checkedCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearGroceryChecks}>
                <Undo2 className="size-3.5" />
                Untick all
              </Button>
            )}
          </div>

          {/* ---------------- grouped list ---------------- */}
          <div className="mt-10 space-y-8">
            {GROUPS.map((group) => {
              const items = grouped.get(group.id) ?? []
              if (items.length === 0) return null
              const groupCost = items.reduce((sum, i) => sum + effectiveCost(i), 0)
              const done = items.filter((i) => i.checked).length

              return (
                <Reveal key={group.id}>
                  <section>
                    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-3">
                      <div>
                        <h2 className="display-face text-lg">{group.label}</h2>
                        <p className="mt-0.5 text-xs text-muted">{group.blurb}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {done > 0 && (
                          <motion.span
                            layout
                            transition={{ duration: 0.3, ease: EASE.out }}
                          >
                            <Badge variant="ok" size="sm">
                              {done}/{items.length}
                            </Badge>
                          </motion.span>
                        )}
                        <span className="num text-sm text-muted">{money(groupCost)}</span>
                      </div>
                    </div>

                    <ul className="mt-2 divide-y divide-line-soft">
                      <AnimatePresence initial={false}>
                        {items.map((item) => {
                          const isEditing = editing === item.foodId
                          return (
                            <motion.li
                              key={item.foodId}
                              layout
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2, ease: EASE.out }}
                              className="print-plain flex flex-wrap items-center gap-3 py-3 transition-colors duration-200 hover:bg-surface-inset"
                            >
                              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                                <Checkbox
                                  checked={item.checked}
                                  onCheckedChange={() => toggleGrocery(item.foodId)}
                                  aria-label={`Mark ${item.name} as purchased`}
                                />
                                <span className="min-w-0 flex-1">
                                  <span
                                    className={cn(
                                      'relative block truncate text-sm transition-colors',
                                      item.checked ? 'text-faint' : 'text-ink',
                                    )}
                                  >
                                    {item.name}
                                    {item.localName && (
                                      <span className="ml-1.5 text-muted">{item.localName}</span>
                                    )}
                                    {/* Strike-through wipes in rather than blinking on. */}
                                    <motion.span
                                      aria-hidden="true"
                                      className="absolute left-0 top-1/2 block h-px w-full origin-left bg-faint"
                                      initial={false}
                                      animate={{ scaleX: item.checked ? 1 : 0 }}
                                      transition={{ duration: 0.32, ease: EASE.out }}
                                    />
                                  </span>
                                  {isEditing ? (
                                    <span className="mt-1.5 flex items-center gap-2">
                                      <Input
                                        type="number"
                                        min={0}
                                        step={50}
                                        autoFocus
                                        defaultValue={item.quantityOverride ?? item.grams}
                                        onChange={(e) =>
                                          setGroceryQuantity(item.foodId, Number(e.target.value))
                                        }
                                        onKeyDown={(e) => {
                                          if (
                                            e.key === 'Enter' ||
                                            e.key === 'Escape'
                                          )
                                            setEditing(null)
                                        }}
                                        className="num h-8 max-w-28 py-1 text-base sm:text-xs"
                                        aria-label={`Quantity in grams for ${item.name}`}
                                      />
                                      <span className="num text-[0.625rem] text-faint">grams</span>
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setEditing(item.foodId)}
                                      className="num mt-0.5 block text-[0.625rem] text-faint underline decoration-dotted underline-offset-2 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                                    >
                                      {formatGrams(item.quantityOverride ?? item.grams)} · about{' '}
                                      {item.servings} serving{item.servings === 1 ? '' : 's'}
                                    </button>
                                  )}
                                </span>
                              </label>

                              <span className="num w-20 shrink-0 text-right text-sm text-muted">
                                {money(effectiveCost(item))}
                              </span>
                            </motion.li>
                          )
                        })}
                      </AnimatePresence>
                    </ul>
                  </section>
                </Reveal>
              )
            })}
          </div>

          {/* ---------------- print footer ---------------- */}
          <div className="mt-12 hidden border-t border-line pt-6 print:block">
            <p className="text-xs">
              FORM grocery list · {totals.count} items · estimated {money(totals.total)} · prices are
              assumptions, not live quotes
            </p>
          </div>
        </>
      )}

      <div className="no-print mt-12 border border-line bg-surface p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="display-face text-base">Prices are not right for you?</p>
            <p className="mt-1.5 text-sm text-muted">
              Every food in the database has an editable per-kilogram assumption. Correct the ones
              you buy often and the whole plan re-costs.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link to="/settings">Edit prices</Link>
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={clearGroceryChecks}
              aria-label="Clear all ticks"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <p className="no-print mt-10 flex items-center gap-2 font-mono text-[0.625rem] text-faint">
        <ShoppingBasket className="size-3" />
        Quantities are rounded up to 100 g or 500 g so they are shoppable. Real shops sell by weight
        or by piece, and brands vary.
      </p>
    </PageShell>
  )
}

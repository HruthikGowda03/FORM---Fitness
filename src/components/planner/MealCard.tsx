/* ==========================================================================
   FORM — meal card
   The central interaction surface of the planner: shows a meal's composition,
   lets you edit portions inline, swap it, expand the method, and log it.
   ========================================================================== */

import { AnimatePresence, motion } from 'motion/react'
import {
  Check,
  ChefHat,
  ChevronDown,
  Clock,
  IndianRupee,
  Minus,
  Plus,
  RefreshCw,
  Utensils,
} from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Callout } from '@/components/ui/separator'
import { LogMealDialog } from '@/components/planner/LogMealDialog'
import { cn } from '@/lib/cn'
import { EASE } from '@/lib/motion'
import { formatNumber } from '@/lib/format'
import { findSwapOptions, buildPlannedMeal, MAX_ITEM_SERVINGS, MIN_ITEM_SERVINGS, slotShares } from '@/lib/meal-plan'
import { formatMoney } from '@/lib/prices'
import type { MealPlan, PlannedMeal, Profile } from '@/types'

const SERVING_STEP = 0.25

export function MealCard({
  meal,
  plan,
  profile,
  completed,
  onToggleComplete,
  onSetServings,
  onSwap,
  onLog,
  onRegenerateDay,
  readOnly = false,
  className,
}: {
  meal: PlannedMeal
  plan: MealPlan
  profile: Profile
  completed: boolean
  onToggleComplete: () => void
  onSetServings: (foodId: string, servings: number) => void
  onSwap: (mealId: string, replacement: PlannedMeal) => void
  /**
   * `servings` is how much of the planned portion was actually eaten, so the
   * log can merge repeat logs of the same meal correctly.
   */
  onLog: (meal: PlannedMeal, servings: number) => void
  onRegenerateDay: () => void
  readOnly?: boolean
  className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [swapOpen, setSwapOpen] = useState(false)
  const [swapping, setSwapping] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [justLogged, setJustLogged] = useState(false)

  const options = swapOpen ? findSwapOptions(meal, profile, [], 4) : []
  const overBudget = meal.total.kcal > plan.target.kcal * 0.45

  /**
   * Confirm-then-log. Logging immediately on click made it impossible to
   * notice a mistake, and made the action irreversible without digging into
   * the log list. The dialog is also where portion and "only ate part of it"
   * get corrected, which is the common real-world case.
   */
  const handleLogged = (meal: PlannedMeal, servings: number) => {
    onLog(meal, servings)
    setLogOpen(false)
    setJustLogged(true)
    // Clear the confirmation after the animation has played.
    window.setTimeout(() => setJustLogged(false), 2400)
  }

  return (
    <motion.article
      layout
      className={cn(
        'group relative border bg-surface',
        completed
          ? 'border-accent/50 bg-accent-soft/30'
          : 'lift-card border-line hover:border-accent/40',
        className,
      )}
    >
      {/* One-shot confirmation sweep after logging. The article is
          position:relative so the overlay clips to its own border. */}
      <AnimatePresence>
        {justLogged && (
          <motion.span
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
          >
            <motion.span
              initial={{ x: '-110%' }}
              animate={{ x: '110%' }}
              transition={{ duration: 0.75, ease: EASE.out }}
              className="absolute inset-y-0 w-1/2 bg-linear-to-r from-transparent via-accent/25 to-transparent"
            />
          </motion.span>
        )}
      </AnimatePresence>

      <motion.span
        aria-hidden="true"
        animate={
          justLogged
            ? { opacity: [0, 1, 1, 0], scale: [0.7, 1.05, 1, 1] }
            : { opacity: 0, scale: 0.7 }
        }
        transition={{ duration: 1.5, times: [0, 0.12, 0.7, 1] }}
        className="pointer-events-none absolute top-3 right-3 z-20 inline-flex size-7 items-center justify-center bg-accent text-accent-contrast"
      >
        <Check className="size-4" strokeWidth={3} />
      </motion.span>

      {/* header */}
      <div className="flex items-start gap-4 p-4 sm:p-5">
        {!readOnly && (
          <label className="flex shrink-0 cursor-pointer items-center pt-0.5">
            <Checkbox
              checked={completed}
              onCheckedChange={onToggleComplete}
              aria-label={`Mark ${meal.name} as eaten`}
            />
          </label>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow text-faint capitalize">{meal.slot}</p>
              <h3
                className={cn(
                  'display-face mt-1 text-base leading-tight transition-colors sm:text-lg',
                  completed && 'text-accent',
                )}
              >
                {meal.name}
              </h3>
              {meal.localName && (
                <p className="mt-0.5 text-xs text-muted">{meal.localName}</p>
              )}
            </div>

            <div className="shrink-0 text-right">
              <p className="num text-lg font-bold text-ink">{formatNumber(meal.total.kcal)}</p>
              <p className="num text-[0.625rem] text-faint">kcal</p>
            </div>
          </div>

          {/* macros */}
          <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-1.5">
            {(['protein', 'carbs', 'fat'] as const).map((m) => (
              <span key={m} className="num text-xs text-muted">
                <span className="text-faint capitalize">{m.slice(0, 3)}</span>{' '}
                <span className="text-ink">{formatNumber(meal.total[m], 0)}g</span>
              </span>
            ))}
          </div>

          {/* meta */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[0.6875rem] text-faint">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3" aria-hidden="true" />
              {meal.prepMinutes} min
            </span>
            <span className="inline-flex items-center gap-1.5">
              <IndianRupee className="size-3" aria-hidden="true" />
              {formatMoney(meal.cost, profile.budget.currency)}
            </span>
            {overBudget && (
              <Badge variant="warn" size="sm">
                Large for one meal
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* item list — always visible so portions are editable at a glance */}
      <ul className="divide-y divide-line-soft border-t border-line-soft">
        {meal.items.map((item) => (
          <li
            key={`${meal.id}-${item.foodId}`}
            className="row-hover flex items-center gap-3 px-4 py-2.5 sm:px-5"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink">{item.food.name}</p>
              <p className="num text-[0.625rem] text-faint">
                {item.food.serving.label} ·{' '}
                {formatNumber(item.food.serving.grams * item.servings)} g total
              </p>
            </div>

            {!readOnly && (
              <div className="flex shrink-0 items-center border border-line">
                <button
                  type="button"
                  onClick={() =>
                    onSetServings(
                      item.foodId,
                      Math.max(MIN_ITEM_SERVINGS, Math.round((item.servings - SERVING_STEP) * 100) / 100),
                    )
                  }
                  disabled={item.servings <= MIN_ITEM_SERVINGS}
                  className="flex size-7 items-center justify-center text-muted transition-colors hover:bg-accent-soft hover:text-accent focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-accent disabled:opacity-35 disabled:hover:bg-transparent"
                  aria-label={`Reduce ${item.food.name}`}
                >
                  <Minus className="size-3" />
                </button>
                <span className="num w-12 text-center text-xs font-medium text-ink" aria-live="polite">
                  {item.servings}×
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onSetServings(
                      item.foodId,
                      Math.min(MAX_ITEM_SERVINGS, Math.round((item.servings + SERVING_STEP) * 100) / 100),
                    )
                  }
                  disabled={item.servings >= MAX_ITEM_SERVINGS}
                  className="flex size-7 items-center justify-center text-muted transition-colors hover:bg-accent-soft hover:text-accent focus-visible:outline-2 focus-visible:-outline-offset-1 focus-visible:outline-accent disabled:opacity-35 disabled:hover:bg-transparent"
                  aria-label={`Increase ${item.food.name}`}
                >
                  <Plus className="size-3" />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* actions */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-4 py-3 sm:px-5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-controls={`method-${meal.id}`}
          >
            <ChefHat className="size-3.5" />
            Method
            <ChevronDown
              className={cn('size-3.5 transition-transform duration-300', expanded && 'rotate-180')}
            />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSwapOpen((v) => !v)}
            aria-expanded={swapOpen}
          >
            <RefreshCw className={cn('size-3.5 transition-transform duration-500', swapping && 'animate-spin')} />
            Swap
          </Button>

          {/* Deliberately NOT disabled after logging: logging the same meal
              again is a real action (finished the rest of the plate), and the
              store merges repeats by summing servings. */}
          <Button
            variant={justLogged ? 'outline' : 'secondary'}
            size="sm"
            onClick={() => setLogOpen(true)}
            className="ml-auto"
          >
            {justLogged ? (
              <>
                <Check className="size-3.5" />
                Logged · add more
              </>
            ) : (
              <>
                <Utensils className="size-3.5" />
                Log as eaten
              </>
            )}
          </Button>
        </div>
      )}

      <LogMealDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        meal={meal}
        onConfirm={handleLogged}
      />

      {/* method */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={`method-${meal.id}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE.out }}
            className="overflow-hidden border-t border-line bg-surface-inset"
          >
            <div className="p-4 sm:p-5">
              <p className="eyebrow mb-3 text-accent">How to make it</p>
              <ol className="space-y-2.5">
                {meal.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted">
                    <span className="num shrink-0 text-accent">{i + 1}.</span>
                    {step}
                  </li>
                ))}
              </ol>
              {meal.note && (
                <div className="mt-4">
                  <Callout tone="accent">{meal.note}</Callout>
                </div>
              )}
              <p className="mt-4 font-mono text-[0.625rem] leading-relaxed text-faint">
                Portions scale with your calorie target. Nutrition is approximate per serving and
                varies with the recipe, oil and brand you use.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* swap panel */}
      <AnimatePresence initial={false}>
        {swapOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE.out }}
            className="overflow-hidden border-t border-line bg-bg-sunken"
          >
            <div className="p-4 sm:p-5">
              <p className="eyebrow mb-3 text-accent">Swap for something similar</p>
              {options.length === 0 ? (
                <p className="text-sm text-muted">
                  No other {meal.slot} meal in the database fits your diet, allergies, prep-time
                  limit and budget. Add a food or loosen a restriction in Settings to widen this.
                </p>
              ) : (
                <ul className="grid gap-2">
                  {options.map((opt) => (
                    <li key={opt.id}>
                      <button
                        type="button"
                        disabled={swapping}
                        onClick={() => {
                          setSwapping(true)
                          // Rebuild the meal properly: resolve foods, scale
                          // portions to the slot's energy target, recompute
                          // nutrition. No hand-rolled items.
                          onSwap(
                            meal.id,
                            buildPlannedMeal(
                              opt,
                              plan.target.kcal * slotShares(profile.mealsPerDay)[meal.slot],
                              [],
                              `${meal.id}-swap-${opt.id}`,
                            ),
                          )
                          setSwapping(false)
                          setSwapOpen(false)
                        }}
                        className="group flex w-full items-center justify-between gap-3 border border-line bg-surface px-4 py-3 text-left transition-[border-color,background-color,transform] duration-200 ease-[var(--ease-out-expo)] hover:-translate-y-0.5 hover:border-accent/60 hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
                      >
                        <span className="min-w-0">
                          <span className="display-face block truncate text-sm text-ink">{opt.name}</span>
                          <span className="num mt-0.5 block text-[0.625rem] text-faint">
                            {opt.prepMinutes} min
                          </span>
                        </span>
                        <RefreshCw className="size-3.5 shrink-0 text-accent transition-transform duration-200 ease-[var(--ease-out-expo)] group-hover:rotate-180" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onRegenerateDay}
                className="mt-3"
              >
                <RefreshCw className="size-3.5" />
                Regenerate the whole day instead
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  )
}

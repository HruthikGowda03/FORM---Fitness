/* ==========================================================================
   FORM — meal planner
   Seven days of real, swappable, editable meals.
   ========================================================================== */

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CalendarDays, IndianRupee, RefreshCw, Sparkles, Utensils, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { MealCard } from '@/components/planner/MealCard'
import { RevealItem, Stagger } from '@/components/motion/primitives'
import { Eyebrow, PageLead, PageShell, PageTitle, Rule } from '@/components/layout/Page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Callout } from '@/components/ui/separator'
import { OptionCard } from '@/components/ui/option-card'
import { cn } from '@/lib/cn'
import { EASE } from '@/lib/motion'
import { formatDateShort, formatNumber, makeId, todayISO } from '@/lib/format'
import { PLAN_MODE_HELP, PLAN_MODE_LABELS } from '@/lib/defaults'
import { useActions, useProfile, useTodayLog } from '@/store/AppStore'
import type { PlanMode } from '@/types'

export function PlannerPage() {
  const active = useProfile()
  const { profile, plan } = active ?? {}
  const { setProfile, regeneratePlan, regenerateDay, swapMeal, setServings, toggleMealComplete, addLogEntry, rebuildGrocery } =
    useActions()
  const [viewDate, setViewDate] = useState<string>(todayISO())
  const reduce = useReducedMotion()

  const log = useTodayLog(viewDate)

  const day = useMemo(
    () => plan?.days.find((d) => d.date === viewDate) ?? plan?.days[0] ?? null,
    [plan, viewDate],
  )

  const weekTotals = useMemo(() => {
    if (!plan) return null
    return plan.days.reduce(
      (acc, d) => ({
        kcal: acc.kcal + d.total.kcal,
        cost: acc.cost + d.cost,
        prep: acc.prep + d.prepMinutes,
        protein: acc.protein + d.total.protein,
      }),
      { kcal: 0, cost: 0, prep: 0, protein: 0 },
    )
  }, [plan])

  if (!profile || !plan || !day) {
    return (
      <PageShell>
        <Eyebrow>Meal planner</Eyebrow>
        <PageTitle className="mt-3">No plan yet</PageTitle>
        <PageLead className="mt-4">
          Complete onboarding so FORM has enough to build a week of meals around.
        </PageLead>
        <Button asChild className="mt-8">
          <Link to="/onboarding">Build my plan</Link>
        </Button>
      </PageShell>
    )
  }

  const currency = profile.budget.currency
  const symbol = currency === 'INR' ? '₹' : '$'

  return (
    <PageShell width="wide">
      {/* ---------------- header ---------------- */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Eyebrow>Meal planner</Eyebrow>
          <PageTitle className="mt-3">Seven days of food you can cook.</PageTitle>
          <PageLead className="mt-4">
            Portions are scaled to your target. Change any serving, swap any meal for a similar
            alternative, or regenerate a single day if the whole week is not to your taste.
          </PageLead>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              regeneratePlan()
              rebuildGrocery()
            }}
          >
            <RefreshCw className="size-4" />
            New week
          </Button>
          <Button
            asChild
            variant="secondary"
            onClick={() => rebuildGrocery()}
          >
            <Link to="/grocery">Shopping list</Link>
          </Button>
        </div>
      </div>

      {/* ---------------- plan mode ---------------- */}
      <div className="mt-10">
        <p className="eyebrow mb-1 text-muted">Plan mode</p>
        <p className="mb-4 max-w-2xl text-sm leading-relaxed text-muted">
          When the ideal plan and the affordable plan disagree, this decides which one wins.
        </p>
        <div className="grid gap-2.5 sm:grid-cols-3">
          {(['balanced', 'student', 'high-protein'] as PlanMode[]).map((mode) => (
            <OptionCard
              key={mode}
              value={mode}
              selected={profile.planMode === mode}
              onSelect={() => {
                setProfile({ planMode: mode })
                regeneratePlan()
                rebuildGrocery()
              }}
              title={PLAN_MODE_LABELS[mode]}
              description={PLAN_MODE_HELP[mode]}
            />
          ))}
        </div>
      </div>

      {/* ---------------- week strip ---------------- */}
      <div className="mt-12">
        <Rule label="This week" className="mb-6" />

        <Stagger className="grid gap-2 sm:grid-cols-7" gap={0.04}>
          {plan.days.map((d) => {
            const active = d.date === viewDate
            const isToday = d.date === todayISO()
            const delta = d.total.kcal - plan.target.kcal
            return (
              <RevealItem key={d.date}>
                <motion.button
                  type="button"
                  onClick={() => setViewDate(d.date)}
                  aria-current={active ? 'true' : undefined}
                  whileHover={reduce ? undefined : { y: -3 }}
                  whileTap={reduce ? undefined : { scale: 0.98 }}
                  transition={{ duration: 0.2, ease: EASE.out }}
                  className={cn(
                    'group relative flex w-full flex-col gap-2 border p-3 text-left transition-colors',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                    active
                      ? 'border-accent bg-accent-soft'
                      : 'border-line bg-surface hover:border-accent/50',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="planner-day-marker"
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-px bg-accent"
                      transition={{ duration: 0.3, ease: EASE.out }}
                    />
                  )}
                  <div className="flex items-center justify-between">
                    <span className={cn('eyebrow', active ? 'text-accent' : 'text-faint')}>
                      {formatDateShort(d.date).split(' ')[0]}
                    </span>
                    {isToday && (
                      <motion.span
                        className="size-1.5 bg-accent"
                        animate={reduce ? {} : { opacity: [1, 0.25, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        aria-label="Today"
                      />
                    )}
                  </div>
                  <p className="num text-lg font-bold text-ink">{formatNumber(d.total.kcal)}</p>
                  <div className="space-y-1">
                    <div className="h-1 bg-line-soft">
                      <motion.div
                        className={cn(
                          'h-full',
                          Math.abs(delta) <= plan.target.kcal * 0.1
                            ? 'bg-ok'
                            : delta > 0
                              ? 'bg-warn'
                              : 'bg-info',
                        )}
                        initial={false}
                        animate={{
                          width: `${Math.min(100, (d.total.kcal / Math.max(plan.target.kcal, 1)) * 100)}%`,
                        }}
                        transition={{ duration: 0.7, ease: EASE.out, delay: reduce ? 0 : 0.1 }}
                      />
                    </div>
                    <p className="num text-[0.5625rem] text-faint">
                      {delta > 0 ? '+' : ''}
                      {formatNumber(delta)} kcal
                    </p>
                    <p className="num text-[0.5625rem] text-faint">
                      {d.meals.length} meals · {d.prepMinutes}m
                    </p>
                  </div>
                </motion.button>
              </RevealItem>
            )
          })}
        </Stagger>
      </div>

      {/* ---------------- week summary ---------------- */}
      {weekTotals && (
        <div className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-4">
          {[
            {
              label: 'Average day',
              value: `${formatNumber(weekTotals.kcal / 7)} kcal`,
              hint: `Target ${formatNumber(plan.target.kcal)}`,
            },
            {
              label: 'Average protein',
              value: `${formatNumber(weekTotals.protein / 7)} g`,
              hint: `Target ${formatNumber(plan.target.protein)} g`,
            },
            {
              label: 'Weekly groceries',
              value: `${symbol}${formatNumber(weekTotals.cost)}`,
              hint: 'Estimate from per-kg assumptions',
            },
            {
              label: 'Time in the kitchen',
              value: `${formatNumber(weekTotals.prep / 60)} h`,
              hint: `${formatNumber(weekTotals.prep)} min total`,
            },
          ].map((s) => (
            <div key={s.label} className="bg-surface p-4">
              <p className="eyebrow text-faint">{s.label}</p>
              <p className="num mt-1.5 text-lg font-bold text-ink">{s.value}</p>
              <p className="num mt-0.5 text-[0.625rem] text-faint">{s.hint}</p>
            </div>
          ))}
        </div>
      )}

      {/* ---------------- day detail ---------------- */}
      <div className="mt-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="eyebrow text-accent capitalize">{formatDateShort(day.date)}</p>
            <h2 className="display-face mt-1.5 text-display-md">
              {day.meals.length} meals · {formatNumber(day.total.kcal)} kcal
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={() => regenerateDay(day.dayIndex)}>
            <RefreshCw className="size-3.5" />
            Regenerate this day
          </Button>
        </div>

        <Progress
          value={day.total.kcal}
          max={plan.target.kcal}
          tone={day.total.kcal > plan.target.kcal * 1.1 ? 'warn' : 'accent'}
          className="mb-6"
        />

        <Stagger className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3" gap={0.06}>
          <AnimatePresence mode="popLayout">
            {day.meals.map((meal) => (
              <RevealItem key={meal.id} className="flex">
                <MealCard
                meal={meal}
                plan={plan}
                profile={profile}
                completed={log.completedMealIds.includes(meal.id)}
                onToggleComplete={() => toggleMealComplete(meal.id, viewDate)}
                onSetServings={(foodId, servings) =>
                  setServings(day.dayIndex, meal.id, foodId, servings)
                }
                onSwap={(mealId, replacement) => swapMeal(day.dayIndex, mealId, replacement)}
                onLog={(m, servings) => {
                  addLogEntry(viewDate, {
                    id: makeId('log'),
                    // Namespaced so a whole-meal log never collides with a
                    // single food from the explorer in the same day.
                    foodId: `plan:${m.templateId ?? m.id}`,
                    sourceMealId: m.id,
                    name: m.name,
                    servings,
                    total: m.total,
                    slot: m.slot,
                    loggedAt: new Date().toISOString(),
                  })
                  toggleMealComplete(m.id, viewDate)
                }}
                onRegenerateDay={() => regenerateDay(day.dayIndex)}
              />
              </RevealItem>
            ))}
          </AnimatePresence>
        </Stagger>
      </div>

      {/* ---------------- how it was built ---------------- */}
      <div className="mt-16">
        <Rule label="How this plan was built" className="mb-6" />
        <div className="grid gap-3 lg:grid-cols-3">
          <Callout tone="accent">
            <strong className="text-ink">Constraint first.</strong> A meal is only ever offered if
            every food in it matches your diet, avoids your allergens and exclusions, fits your
            cooking facility and prep-time limit, and stays inside your budget.
          </Callout>
          <Callout tone="accent">
            <strong className="text-ink">Portions are scaled.</strong> Once a meal is chosen, its
            servings are scaled toward the energy that slot should carry, then clamped to sensible
            quantities.
          </Callout>
          <Callout tone="accent">
            <strong className="text-ink">Nutrition is derived.</strong> Every calorie and macro on
            this page is calculated from the food database, not typed in. Change a serving and the
            totals move.
          </Callout>
        </div>

        <div className="mt-4">
          <Callout tone="warn">
            <strong className="text-ink">Values are approximate.</strong> They come from rounded
            public composition tables. A real cooked portion depends on your recipe, oil and
            brands. Use this as a guide and adjust with a professional if you need precision.
          </Callout>
        </div>
      </div>

      {/* ---------------- logged for this day ---------------- */}
      {log.meals.length > 0 && (
        <div className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <p className="eyebrow text-accent">Logged for {formatDateShort(viewDate)}</p>
            <Badge size="sm">{log.meals.length}</Badge>
          </div>
          <ul className="divide-y divide-line-soft border border-line bg-surface">
            {log.meals.map((entry) => (
              <li key={entry.id} className="row-hover group flex items-center gap-3 px-4 py-3">
                <Utensils className="size-4 shrink-0 text-faint transition-colors duration-200 group-hover:text-accent" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{entry.name}</p>
                  <p className="num text-[0.625rem] text-faint capitalize">{entry.slot}</p>
                </div>
                <span className="num shrink-0 text-xs text-muted">
                  {formatNumber(entry.total.kcal)} kcal
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---------------- grocery CTA ---------------- */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, ease: EASE.out }}
        className="mt-16 flex flex-col items-start gap-5 border border-line bg-surface p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8"
      >
        <div>
          <div className="flex items-center gap-2.5">
            <Sparkles className="size-4 text-accent" aria-hidden="true" />
            <p className="eyebrow text-accent">Next step</p>
          </div>
          <h2 className="display-face mt-2.5 text-display-md">Turn this into a shopping list.</h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
            Every ingredient in this week, consolidated and grouped, with quantities rounded to
            something you can actually buy and an estimate you can check against your own prices.
          </p>
        </div>
        <Button size="lg" onClick={() => rebuildGrocery()} asChild>
          <Link to="/grocery">
            <IndianRupee className="size-4" />
            Build grocery list
          </Link>
        </Button>
      </motion.div>

      <div className="mt-8 flex flex-wrap items-center gap-4 font-mono text-[0.625rem] text-faint">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-3" />
          Week of {formatDateShort(plan.days[0].date)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <X className="size-3" />
          Seed {plan.seed}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Utensils className="size-3" />
          {profile.diet.replace('-', ' ')}
        </span>
      </div>
    </PageShell>
  )
}

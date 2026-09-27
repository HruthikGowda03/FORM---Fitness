/* ==========================================================================
   FORM — dashboard
   ========================================================================== */

import { motion, useReducedMotion } from 'motion/react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Droplets, Flame, Plus, Target, TrendingDown, TrendingUp, Utensils } from 'lucide-react'

import { AnimatedNumber, MacroRings, ProgressRing } from '@/components/dashboard/MacroRings'
import { RevealItem, Stagger } from '@/components/motion/primitives'
import { LoggedRow } from '@/components/planner/LogMealDialog'
import { MealCard } from '@/components/planner/MealCard'
import { Eyebrow, PageLead, PageShell, PageTitle, Rule } from '@/components/layout/Page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/cn'
import { EASE } from '@/lib/motion'
import { playWaterSound } from '@/lib/sound'
import { formatMl, formatNumber, isoDaysAgo, makeId, relativeDay, todayISO } from '@/lib/format'
import { useActions, useProfile, useDerived, useTodayLog } from '@/store/AppStore'
import { FOOD_LOG_TONE } from '@/components/dashboard/tokens'
import type { NutritionFacts } from '@/types'

const DAY_MS = 86_400_000

/* --------------------------------------------------------------------------
   Chart tooltip — shared, accessible, and consistent with the theme
   -------------------------------------------------------------------------- */

interface TipRow {
  name: string
  value: string | number
  tone?: string
}

function ChartTip({
  active,
  payload,
  label,
  unit = '',
  rows,
}: {
  active?: boolean
  payload?: { dataKey?: string | number; value?: number; name?: string; color?: string }[]
  label?: string | number
  unit?: string
  rows?: TipRow[]
}) {
  if (!active || (!payload?.length && !rows)) return null
  return (
    <div className="border border-line bg-surface-raised px-3 py-2.5 shadow-xl">
      {label !== undefined && <p className="eyebrow mb-2 text-faint">{label}</p>}
      <div className="space-y-1">
        {(rows ??
          (payload ?? []).map((p) => ({
            name: String(p.name ?? p.dataKey ?? ''),
            value: `${formatNumber(Number(p.value ?? 0))}${unit}`,
            tone: p.color,
          }))).map((row, i) => (
          <div key={i} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-muted">
              {row.tone && (
                <span aria-hidden="true" className="size-2" style={{ backgroundColor: row.tone }} />
              )}
              {row.name}
            </span>
            <span className="num text-ink">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------------
   Stat tile
   -------------------------------------------------------------------------- */

function StatTile({
  label,
  value,
  unit,
  hint,
  tone = 'text-ink',
  icon,
  children,
}: {
  label: string
  value: React.ReactNode
  unit?: string
  hint?: string
  tone?: string
  icon?: React.ReactNode
  children?: React.ReactNode
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className="group relative flex h-full w-full flex-col border border-line bg-surface p-5"
      whileHover={reduce ? undefined : { y: -3 }}
      transition={{ duration: 0.22, ease: EASE.out }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-accent transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-x-100"
      />
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow text-faint">{label}</p>
        {icon && (
          <span className="icon-tilt text-line-strong">
            {icon}
          </span>
        )}
      </div>
      <p className={cn('num mt-2.5 text-3xl font-bold tracking-tight', tone)}>{value}</p>
      {unit && <p className="num text-[0.625rem] text-faint">{unit}</p>}
      {hint && <p className="mt-2 text-xs leading-relaxed text-muted">{hint}</p>}
      {/* Pushes the bar to the bottom so tiles in a row line up. */}
      <div className="mt-auto">{children}</div>
    </motion.div>
  )
}

/* --------------------------------------------------------------------------
   Water tracker
   -------------------------------------------------------------------------- */

const GLASS_ML = 250

function WaterTracker() {
  const profile = useProfile()?.profile
  const log = useTodayLog()
  const { addWater, setWater } = useActions()
  const reduce = useReducedMotion()
  const target = profile?.weeklyWaterTargetMl ?? 2500
  const glasses = Math.round(log.waterMl / GLASS_ML)
  const maxGlasses = Math.ceil(target / GLASS_ML)
  const soundOn = profile?.soundEnabled !== false

  /**
   * A bubble per glass *added*, not per click. Clicking glass 4 when you are on
   * 1 adds three, and clicking the glass you already have removes one — which
   * gets a reversed, lower sound so undoing is audible as a different action.
   */
  const playFor = (deltaMl: number) => {
    if (deltaMl === 0) return
    playWaterSound({
      enabled: soundOn,
      glasses: Math.abs(deltaMl) / GLASS_ML,
    })
  }

  return (
    <div className="border border-line bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Droplets className="size-4 text-info" aria-hidden="true" />
          <p className="eyebrow text-faint">Water</p>
        </div>
        <p className="num text-xs text-muted">
          {formatMl(log.waterMl)} <span className="text-faint">/ {formatMl(target)}</span>
        </p>
      </div>

      <div className="mt-4 flex gap-1.5" role="group" aria-label="Water intake">
        {Array.from({ length: maxGlasses }, (_, i) => (
          <motion.button
            key={i}
            type="button"
            onClick={() => {
              const next = (i + 1 === glasses ? i : i + 1) * GLASS_ML
              playFor(next - log.waterMl)
              setWater(next)
            }}
            aria-pressed={i < glasses}
            aria-label={`${i + 1} glasses, ${(i + 1) * GLASS_ML} millilitres`}
            className={cn(
              'h-9 flex-1 border',
              'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent',
              i < glasses ? 'border-info bg-info' : 'border-line bg-surface-inset hover:border-line-strong',
            )}
            initial={false}
            animate={
              reduce ? {} : { scaleY: i < glasses ? 1 : 0.72, opacity: i < glasses ? 1 : 0.55 }
            }
            whileHover={reduce ? undefined : { scaleY: 1.12 }}
            whileTap={reduce ? undefined : { scaleY: 0.86 }}
            transition={{ duration: 0.26, ease: EASE.out, delay: reduce ? 0 : i * 0.015 }}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            playFor(GLASS_ML)
            addWater(GLASS_ML)
          }}
        >
          <Plus className="size-3.5" />
          Glass
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            playFor(-GLASS_ML)
            addWater(-GLASS_ML)
          }}
          disabled={log.waterMl <= 0}
        >
          Remove one
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setWater(0)} disabled={log.waterMl === 0}>
          Reset
        </Button>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------------
   The 14-day chart data
   -------------------------------------------------------------------------- */

function useChartData() {
  const active = useProfile()
  const logs = active?.logs ?? {}
  const showCalories = active?.profile?.showCalorieMetrics !== false

  return useMemo(() => {
    const days = Array.from({ length: 14 }, (_, i) => isoDaysAgo(13 - i))

    return days.map((date) => {
      const log = logs[date]
      const consumed = (log?.meals ?? []).reduce<NutritionFacts>(
        (acc, m) => ({
          kcal: acc.kcal + m.total.kcal,
          protein: acc.protein + m.total.protein,
          carbs: acc.carbs + m.total.carbs,
          fat: acc.fat + m.total.fat,
          fiber: acc.fiber,
        }),
        { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      )
      return {
        date,
        day: new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'short' }),
        logged: (log?.meals.length ?? 0) > 0,
        kcal: showCalories ? consumed.kcal : 0,
        protein: Math.round(consumed.protein),
        water: log?.waterMl ?? 0,
      }
    })
  }, [logs, showCalories])
}

/* ==========================================================================
   Page
   ========================================================================== */

export function DashboardPage() {
  const active = useProfile()
  const { safety, basis, targets, todayTotals, remaining, isGated } = useDerived()
  const log = useTodayLog()
  const {
    toggleMealComplete,
    setServings,
    swapMeal,
    addLogEntry,
    regenerateDay,
    removeLogEntry,
  } = useActions()

  const { profile, plan, customFoods = [] } = active ?? {}
  const chartData = useChartData()
  const showCalories = profile?.showCalorieMetrics !== false

  const todaysDay = useMemo(() => {
    if (!plan) return null
    const today = todayISO()
    return plan.days.find((d) => d.date === today) ?? plan.days[0]
  }, [plan])

  const adherence = useMemo(() => {
    const last7 = chartData.slice(-7).filter((d) => d.logged).length
    return { logged: last7, total: 7 }
  }, [chartData])

  if (!profile) return null

  /* ---------------- gated: under 18, or a flag that blocks prescriptions ------- */
  if (isGated || !targets) {
    return (
      <PageShell>
        <Eyebrow>Dashboard</Eyebrow>
        <PageTitle className="mt-3">Balanced eating, general guidance</PageTitle>
        <PageLead className="mt-4">
          FORM is not setting a calorie target for this profile. You can still log meals, build a
          plan at maintenance-level portions and track how you feel.
        </PageLead>

        {safety && safety.reasons.length > 0 && (
          <div className="mt-8 grid gap-3">
            {safety.reasons.map((r) => (
              <Callout key={r} tone="warn">
                {r}
              </Callout>
            ))}
          </div>
        )}

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {safety?.generalGuidance.map((g, i) => (
            <motion.div
              key={g}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4, ease: EASE.out }}
              className="border border-line bg-surface p-5"
            >
              <span className="num text-accent">0{i + 1}</span>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">{g}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-10">
          <Callout tone="accent">
            <strong className="text-ink">Please talk to a professional.</strong> A doctor or
            registered dietitian can give you guidance that accounts for your individual
            situation. FORM is an educational tool and cannot do that.
          </Callout>
        </div>

        <div className="mt-8 flex gap-3">
          <Button asChild>
            <Link to="/planner">View your meal plan</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link to="/learn">Read the knowledge centre</Link>
          </Button>
        </div>
      </PageShell>
    )
  }

  const kcalPct = targets ? (todayTotals.kcal / targets.kcal) * 100 : 0
  const overBy = Math.max(0, todayTotals.kcal - targets.kcal)
  const plannedToday = todaysDay?.meals ?? []
  const eatenPlannedIds = log.completedMealIds

  return (
    <PageShell width="wide">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>{relativeDay(todayISO())} · {new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long' })}</Eyebrow>
          <PageTitle className="mt-3">
            {profile.name ? `Hey ${profile.name}.` : 'Your day.'}
          </PageTitle>
          <PageLead className="mt-3">
            {overBy > 0 ? (
              <>
                You are about <strong className="num text-ink">{formatNumber(overBy)} kcal</strong>{' '}
                over your starting target. One day does not matter much — look at the weekly
                average instead.
              </>
            ) : (
              <>
                <strong className="num text-ink">{formatNumber(remaining)} kcal</strong> remaining
                today. Aim for the plan, not for a perfect number.
              </>
            )}
          </PageLead>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link to="/progress">Log progress</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/planner">Open planner</Link>
          </Button>
        </div>
      </div>

      {/* ---------------- stat tiles ---------------- */}
      <Stagger className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <RevealItem className="flex">
          <StatTile
            label="Target"
            value={<AnimatedNumber value={targets.kcal} />}
            unit="kcal / day · starting estimate"
            icon={<Target className="size-4" />}
          />
        </RevealItem>
        <RevealItem className="flex">
          <StatTile
            label="Consumed"
            value={<AnimatedNumber value={todayTotals.kcal} />}
            unit={`${formatNumber(kcalPct)}% of target`}
            icon={<Flame className="size-4" />}
          >
            <Progress
              className="mt-3"
              value={todayTotals.kcal}
              max={targets.kcal}
              size="sm"
              tone={overBy > 0 ? 'warn' : 'accent'}
            />
          </StatTile>
        </RevealItem>
        <RevealItem className="flex">
          <StatTile
            label="Remaining"
            value={<AnimatedNumber value={remaining} />}
            unit="kcal"
            tone={remaining === 0 ? 'text-warn' : 'text-accent'}
            icon={<TrendingDown className="size-4" />}
          />
        </RevealItem>
        <RevealItem className="flex">
          <StatTile
            label="Weekly logging"
            value={`${adherence.logged}/${adherence.total}`}
            unit="days with a log"
            icon={<TrendingUp className="size-4" />}
            hint="Consistency counts more than any single day."
          >
            <Progress
              className="mt-3"
              value={adherence.logged}
              max={adherence.total}
              size="sm"
              tone="ok"
            />
          </StatTile>
        </RevealItem>
      </Stagger>

      {/* ---------------- rings + hydration ---------------- */}
      <div className="mt-3 grid gap-3 lg:grid-cols-[1.25fr_1fr]">
        <section className="border border-line bg-surface p-6 sm:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow text-faint">Today's macros</p>
              <h2 className="display-face mt-1.5 text-lg">Against your target</h2>
            </div>
            <Badge variant="accent" size="sm">
              Starting estimate
            </Badge>
          </div>

          <MacroRings
            consumed={todayTotals}
            target={targets}
            size={250}
            animateKey={todayISO()}
            className="justify-center"
          />
        </section>

        <div className="flex flex-col gap-3">
          <WaterTracker />

          {/* weekly chart */}
          <section className="border border-line bg-surface p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="eyebrow text-faint">Last 14 days</p>
              <p className="font-mono text-[0.625rem] text-faint">
                {showCalories ? 'energy' : 'calories hidden'}
              </p>
            </div>

            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                  <defs>
                    <linearGradient id="kcalFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.42} />
                      <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--color-line-soft)" vertical={false} />
                  <XAxis
                    dataKey="day"
                    tick={{ fill: 'var(--color-faint)', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    axisLine={false}
                    tickLine={false}
                    interval={2}
                  />
                  <YAxis
                    tick={{ fill: 'var(--color-faint)', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  {showCalories && targets && (
                    <ReferenceLine
                      y={targets.kcal}
                      stroke="var(--color-faint)"
                      strokeDasharray="4 4"
                      strokeWidth={1}
                    />
                  )}
                  <Tooltip
                    content={<ChartTip unit=" kcal" />}
                    cursor={{ stroke: 'var(--color-line-strong)' }}
                  />
                  {showCalories ? (
                    <Area
                      type="monotone"
                      dataKey="kcal"
                      name="Energy"
                      stroke="var(--color-accent)"
                      strokeWidth={2}
                      fill="url(#kcalFill)"
                      connectNulls
                      dot={{ r: 2, fill: 'var(--color-accent)' }}
                      activeDot={{ r: 4 }}
                    />
                  ) : (
                    <Area
                      type="monotone"
                      dataKey="protein"
                      name="Protein"
                      stroke="var(--color-info)"
                      strokeWidth={2}
                      fill="var(--color-info)"
                      fillOpacity={0.15}
                      connectNulls
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      </div>

      {/* ---------------- today's plan ---------------- */}
      <div className="mt-16">
        <Rule label="Today's plan" className="mb-8" />

        {plannedToday.length === 0 ? (
          <Callout tone="muted">
            No plan is available for today. Head to the planner to generate one.
          </Callout>
        ) : (
          <Stagger className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3" gap={0.06}>
            {plannedToday.map((meal) => (
              <RevealItem key={meal.id} className="flex">
                <MealCard
                key={meal.id}
                meal={meal}
                plan={plan!}
                profile={profile}
                completed={eatenPlannedIds.includes(meal.id)}
                onToggleComplete={() => toggleMealComplete(meal.id)}
                onSetServings={(foodId, servings) =>
                  setServings(todaysDay?.dayIndex ?? 0, meal.id, foodId, servings)
                }
                onSwap={(mealId, replacement) =>
                  swapMeal(todaysDay?.dayIndex ?? 0, mealId, replacement)
                }
                onLog={(m, servings) => {
                  addLogEntry(todayISO(), {
                    id: makeId('log'),
                    // A planned meal is not a database food, so give it a
                    // namespaced id rather than concatenating every ingredient
                    // id into one meaningless string.
                    foodId: `plan:${m.templateId ?? m.id}`,
                    sourceMealId: m.id,
                    name: m.name,
                    servings,
                    total: m.total,
                    slot: m.slot,
                    loggedAt: new Date().toISOString(),
                  })
                  toggleMealComplete(m.id)
                }}
                  onRegenerateDay={() => regenerateDay(todaysDay?.dayIndex ?? 0)}
                />
              </RevealItem>
            ))}
          </Stagger>
        )}

        {/* logged items */}
        {log.meals.length > 0 && (
          <div className="mt-8">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="eyebrow text-accent">Logged today</p>
              <Badge size="sm">{log.meals.length} items</Badge>
            </div>
            <ul className="divide-y divide-line-soft border border-line bg-surface">
              {log.meals.map((entry) => (
                <LoggedRow
                  key={entry.id}
                  className="group"
                  onRemove={() => removeLogEntry(todayISO(), entry.id)}
                >
                  <div className="row-hover flex items-center gap-4 px-4 py-3">
                    <Utensils className="size-4 shrink-0 text-faint transition-colors duration-200 group-hover:text-accent" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-ink">{entry.name}</p>
                      <p className="num text-[0.625rem] text-faint capitalize">
                        {entry.slot}
                        {entry.servings !== 1 && ` · ${entry.servings}×`}
                      </p>
                    </div>
                    <div className="num flex shrink-0 gap-3 text-xs text-muted">
                      <span>{formatNumber(entry.total.kcal)} kcal</span>
                      <span className="hidden sm:inline">P {formatNumber(entry.total.protein, 0)}</span>
                      <span className="hidden sm:inline">C {formatNumber(entry.total.carbs, 0)}</span>
                      <span className="hidden sm:inline">F {formatNumber(entry.total.fat, 0)}</span>
                    </div>
                  </div>
                </LoggedRow>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* ---------------- macro split over the week ---------------- */}
      <div className="mt-16 grid gap-3 lg:grid-cols-[1fr_1fr]">
        <section className="border border-line bg-surface p-6">
          <p className="eyebrow text-faint">Average daily macros logged</p>
          <h2 className="display-face mt-1.5 text-lg">Last 7 days</h2>

          <div className="mt-6 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.slice(-7)} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
                <CartesianGrid stroke="var(--color-line-soft)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fill: 'var(--color-faint)', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'var(--color-faint)', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                />
                <Tooltip content={<ChartTip unit=" g" />} cursor={{ fill: 'var(--color-line-soft)' }} />
                <Bar dataKey="protein" name="Protein" radius={[2, 2, 0, 0]}>
                  {chartData.slice(-7).map((_, i) => (
                    <Cell key={i} fill={FOOD_LOG_TONE.protein} />
                  ))}
                </Bar>
                <Bar dataKey="water" name="Water (ml)" fill="var(--color-info)" fillOpacity={0.35} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-faint">
            Protein in grams against water intake. Days with no log show as gaps, not zeros — a gap
            means "did not record", not "ate nothing".
          </p>
        </section>

        <section className="border border-line bg-surface p-6">
          <p className="eyebrow text-faint">How this target was built</p>
          <h2 className="display-face mt-1.5 text-lg">Every assumption, shown</h2>

          <dl className="mt-5 space-y-3">
            {[
              { label: 'Resting energy (BMR)', value: `${formatNumber(basis?.bmr ?? 0)} kcal`, hint: 'Mifflin-St Jeor' },
              {
                label: 'Activity multiplier',
                value: `× ${basis?.activityMultiplier ?? 1}`,
                hint: 'Applied to resting energy',
              },
              { label: 'Total daily energy (TDEE)', value: `${formatNumber(basis?.tdee ?? 0)} kcal`, hint: 'BMR × multiplier' },
              {
                label: 'Goal adjustment',
                value: `${Math.round((basis?.goalDeltaFraction ?? 0) * 100)}%`,
                hint: 'Applied to TDEE',
              },
              { label: 'Your starting target', value: `${formatNumber(basis?.target ?? 0)} kcal`, hint: 'Rounded to nearest 10' },
            ].map((row) => (
              <div key={row.label} className="flex items-baseline justify-between gap-4 border-b border-line-soft pb-3">
                <div className="min-w-0">
                  <dt className="text-sm text-ink">{row.label}</dt>
                  <dd className="text-[0.6875rem] text-faint">{row.hint}</dd>
                </div>
                <span className="num shrink-0 text-sm font-semibold text-accent">{row.value}</span>
              </div>
            ))}
          </dl>

          {basis?.clampedBy && (
            <div className="mt-4">
              <Callout tone="warn">{basis.clampedBy}</Callout>
            </div>
          )}

          <div className="mt-4 flex items-start gap-3">
            <ProgressRing
              value={todayTotals.protein}
              max={targets.protein}
              size={44}
              strokeWidth={4}
              label={`Protein ${formatNumber(todayTotals.protein, 0)} of ${formatNumber(targets.protein, 0)} grams`}
            >
              <span className="num text-[0.5625rem] text-muted">
                {Math.round((todayTotals.protein / Math.max(targets.protein, 1)) * 100)}
              </span>
            </ProgressRing>
            <p className="text-xs leading-relaxed text-muted">
              Protein is the easiest number to actually hit, and the one most worth hitting on a
              training day.
            </p>
          </div>
        </section>
      </div>

      {/* ---------------- import / export ---------------- */}
      <div className="mt-16">
        <Rule label="Your data" className="mb-6" />
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Everything you have entered is stored in this browser only. Export a JSON backup before
          clearing your browser data or switching devices. {customFoods.length > 0 && `You have ${customFoods.length} custom food${customFoods.length === 1 ? '' : 's'} saved.`}
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild variant="secondary" size="sm">
            <Link to="/settings">Import / export data</Link>
          </Button>
        </div>
      </div>

      {/* ---------------- notes ---------------- */}
      <p className="mt-10 font-mono text-[0.625rem] leading-relaxed text-faint">
        Day window: {new Date(Date.now() - 13 * DAY_MS).toLocaleDateString()} →{' '}
        {new Date().toLocaleDateString()}. These are starting estimates from published equations,
        and the food values are rounded approximations.
      </p>
    </PageShell>
  )
}

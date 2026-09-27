/* ==========================================================================
   FORM — the interactive dashboard preview shown on the landing page.
   ---------------------------------------------------------------------------
   This is a REAL component, not a screenshot. It runs the actual calorie
   engine and the actual food database against one fixed sample profile, so
   every number on the landing page is the same number the app would produce.
   The sample profile is deterministic and clearly labelled as a sample.
   ========================================================================== */

import { useMemo, useState } from 'react'

import { MacroRings } from '@/components/dashboard/MacroRings'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { FOODS_BY_ID } from '@/data/foods'
import { computePlanTargets } from '@/lib/nutrition'
import { formatNumber } from '@/lib/format'
import type { Macros, NutritionFacts, Profile } from '@/types'
import { defaultProfile } from '@/lib/defaults'
import { cn } from '@/lib/cn'

/** The one sample profile used across the whole landing page. */
export const SAMPLE_PROFILE: Profile = {
  ...defaultProfile(),
  name: 'Sample profile',
  age: 27,
  isAdult: true,
  sex: 'unspecified',
  heightCm: 173,
  weightKg: 74,
  activityLevel: 'moderate',
  gymExperience: 'intermediate',
  workoutDaysPerWeek: 4,
  goal: 'build-muscle',
  diet: 'eggs',
  mealsPerDay: 4,
  maxPrepMinutes: 30,
  planMode: 'balanced',
}

/** Real, illustrative plate — built from actual database foods. */
const SAMPLE_PLATE = [
  { foodId: 'oats-rolled', servings: 1 },
  { foodId: 'milk-toned', servings: 1 },
  { foodId: 'banana', servings: 0.5 },
] as const

function plateNutrition(override: Partial<Record<string, number>> = {}) {
  return SAMPLE_PLATE.reduce<NutritionFacts>(
    (acc, { foodId, servings }) => {
      const food = FOODS_BY_ID.get(foodId)
      if (!food) return acc
      const k = override[foodId] ?? servings
      return {
        kcal: acc.kcal + food.per.kcal * k,
        protein: acc.protein + food.per.protein * k,
        carbs: acc.carbs + food.per.carbs * k,
        fat: acc.fat + food.per.fat * k,
        fiber: acc.fiber + food.per.fiber * k,
      }
    },
    { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  )
}

/* --------------------------------------------------------------------------
   The weekly progress chart
   -------------------------------------------------------------------------- */

/** Seven days of *illustrative* adherence data. Fixed, not random, and not
 *  presented as a real user — it exists to show what the chart looks like. */
const SAMPLE_WEEK = [
  { day: 'M', intake: 2180, target: 2480, protein: 152 },
  { day: 'T', intake: 2395, target: 2480, protein: 168 },
  { day: 'W', intake: 2105, target: 2480, protein: 141 },
  { day: 'T', intake: 2540, target: 2480, protein: 176 },
  { day: 'F', intake: 2460, target: 2480, protein: 171 },
  { day: 'S', intake: 2265, target: 2480, protein: 158 },
  { day: 'S', intake: 2410, target: 2480, protein: 165 },
]

export function PreviewChart({ className }: { className?: string }) {
  const max = Math.max(...SAMPLE_WEEK.map((d) => Math.max(d.intake, d.target))) * 1.08

  return (
    <div className={cn('flex h-40 items-end gap-2', className)}>
      {SAMPLE_WEEK.map((d, i) => {
        const intakeH = (d.intake / max) * 100
        const targetH = (d.target / max) * 100
        const pct = Math.round((d.intake / d.target) * 100)
        return (
          <div key={i} className="group relative flex h-full flex-1 flex-col justify-end">
            {/* target marker */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 border-t border-dashed border-faint/60"
              style={{ bottom: `${targetH}%` }}
            />
            <div
              className={cn(
                'w-full transition-[height,background-color] duration-700 ease-[var(--ease-out-expo)] group-hover:brightness-125',
                pct > 100 ? 'bg-warn' : 'bg-accent',
              )}
              style={{ height: `${intakeH}%` }}
            />
            <span className="num mt-2 block text-center text-[0.5625rem] text-faint">{d.day}</span>
          </div>
        )
      })}
    </div>
  )
}

/* --------------------------------------------------------------------------
   Water tracker
   -------------------------------------------------------------------------- */

const GLASS_ML = 250
const GLASSES = 10

export function PreviewWater() {
  const [glasses, setGlasses] = useState(5)
  const ml = glasses * GLASS_ML

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="eyebrow text-faint">Hydration</span>
        <span className="num text-sm text-ink">
          {formatNumber(ml)} <span className="text-faint">/ {formatNumber(GLASSES * GLASS_ML)} ml</span>
        </span>
      </div>
      <div className="mt-3 flex gap-1.5" role="group" aria-label="Water glasses">
        {Array.from({ length: GLASSES }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setGlasses(i + 1 === glasses ? i : i + 1)}
            aria-label={`${i + 1} glasses, ${(i + 1) * GLASS_ML} ml`}
            aria-pressed={i < glasses}
            className={cn(
              'h-8 flex-1 border transition-[background-color,transform] duration-200 ease-[var(--ease-out-expo)]',
              'hover:scale-y-110 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent',
              i < glasses
                ? 'border-accent bg-accent'
                : 'border-line bg-surface-inset hover:border-line-strong',
            )}
          />
        ))}
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------------
   The preview itself
   -------------------------------------------------------------------------- */

/** Fraction of the target that has been "logged" — set by the day selector. */
const DAY_PROGRESS = [0.62, 0.78, 0.41, 0.9, 0.71, 0.55, 0.34]

export function DashboardPreview({ className }: { className?: string }) {
  const { basis, targets } = useMemo(() => computePlanTargets(SAMPLE_PROFILE), [])
  const [day, setDay] = useState(0)

  if (!basis || !targets) return null

  const fraction = DAY_PROGRESS[day]
  const consumed: NutritionFacts = {
    kcal: Math.round(targets.kcal * fraction),
    protein: Math.round(targets.protein * fraction * 1.02),
    carbs: Math.round(targets.carbs * fraction * 0.97),
    fat: Math.round(targets.fat * fraction * 1.05),
    fiber: Math.round(targets.fiber * fraction),
  }
  const remaining = Math.max(0, targets.kcal - consumed.kcal)

  const ringTarget: Macros = {
    protein: targets.protein,
    carbs: targets.carbs,
    fat: targets.fat,
  }
  const ringConsumed: Macros = {
    protein: consumed.protein,
    carbs: consumed.carbs,
    fat: consumed.fat,
  }

  const items = SAMPLE_PLATE.map((p) => ({
    name: FOODS_BY_ID.get(p.foodId)?.name ?? p.foodId,
  }))
  const plateMacros = plateNutrition()

  return (
    <div
      className={cn(
        'relative border border-line bg-surface shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]',
        className,
      )}
    >
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-line bg-surface-raised px-4 py-3">
        <span aria-hidden="true" className="size-2.5 bg-line-strong" />
        <span aria-hidden="true" className="size-2.5 bg-line-strong" />
        <span aria-hidden="true" className="size-2.5 bg-accent/60" />
        <span className="num ml-3 text-[0.625rem] tracking-widest text-faint uppercase">
          Dashboard — live preview
        </span>
        <Badge variant="accent" size="sm" className="ml-auto">
          Sample
        </Badge>
      </div>

      <div className="p-5 sm:p-7">
        {/* day selector */}
        <div className="mb-6 grid grid-cols-7 gap-1.5">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
            <button
              key={d}
              type="button"
              onClick={() => setDay(i)}
              aria-pressed={day === i}
              className={cn(
                'num h-8 w-full border px-1 font-mono text-[0.5625rem] tracking-wider uppercase transition-colors sm:text-[0.625rem]',
                'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent',
                day === i
                  ? 'border-accent bg-accent text-accent-contrast'
                  : 'border-line text-faint hover:border-line-strong hover:text-ink',
              )}
            >
              {d}
            </button>
          ))}
        </div>

        <div className="grid gap-8">
          {/* rings */}
          <div className="flex justify-center">
            <MacroRings
              consumed={ringConsumed}
              target={ringTarget}
              size={210}
              animateKey={`preview-${day}`}
              className="flex-col items-center"
            />
          </div>

          {/* numbers */}
          <div className="grid content-start gap-5">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Target', value: targets.kcal, tone: 'text-ink' },
                { label: 'Consumed', value: consumed.kcal, tone: 'text-ink' },
                { label: 'Remaining', value: remaining, tone: 'text-accent' },
              ].map((stat) => (
                <div key={stat.label} className="min-w-0 border-l-2 border-line pl-3">
                  <p className="eyebrow text-faint">{stat.label}</p>
                  <p
                    className={cn(
                      'num mt-1.5 truncate text-xl font-bold sm:text-2xl',
                      stat.tone,
                    )}
                  >
                    {formatNumber(stat.value)}
                  </p>
                  <p className="num text-[0.625rem] text-faint">kcal / day</p>
                </div>
              ))}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="eyebrow text-faint">Daily energy</span>
                <span className="num text-[0.6875rem] text-muted">
                  {formatNumber(consumed.kcal)} / {formatNumber(targets.kcal)} kcal
                </span>
              </div>
              <Progress
                value={consumed.kcal}
                max={targets.kcal}
                size="md"
                tone={consumed.kcal > targets.kcal ? 'warn' : 'accent'}
              />
            </div>

            <PreviewWater />

            <div className="border-t border-line pt-4">
              <p className="eyebrow mb-3 text-faint">Next meal</p>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="display-face text-base">Oats with milk, banana and seeds</p>
                  <p className="mt-1 text-xs text-muted">
                    {items.map((i) => i.name).join(' · ')}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="num text-base font-bold text-ink">{formatNumber(plateMacros.kcal)}</p>
                  <p className="num text-[0.625rem] text-faint">kcal</p>
                </div>
              </div>
              <div className="mt-3 flex gap-4">
                {(['protein', 'carbs', 'fat'] as const).map((m) => (
                  <span key={m} className="num text-[0.6875rem] text-muted">
                    <span className="text-faint capitalize">{m.slice(0, 3)}</span>{' '}
                    {formatNumber(plateMacros[m], 0)}g
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* weekly chart */}
        <div className="mt-8 border-t border-line pt-6">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <p className="eyebrow text-faint">This week</p>
              <p className="display-face mt-1 text-base">Energy vs target</p>
            </div>
            <span className="num text-[0.6875rem] text-faint">dashed line = target</span>
          </div>
          <PreviewChart />
        </div>

        <p className="mt-6 border-t border-line pt-4 font-mono text-[0.625rem] leading-relaxed tracking-wide text-faint">
          Illustrative sample data. The calorie and macro figures are produced by FORM's own
          engine from a fixed sample profile — they are starting estimates, not prescriptions.
        </p>
      </div>
    </div>
  )
}

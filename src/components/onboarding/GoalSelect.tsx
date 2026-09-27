/* ==========================================================================
   FORM — fitness goal selection
   ---------------------------------------------------------------------------
   Note on the inspiration panels: they are abstract, original SVG
   compositions, not photographs of bodies. FORM deliberately does not show
   reference physiques, because a body-type label cannot reliably predict what
   a given person's body will look like and presenting it that way would be
   dishonest.
   ========================================================================== */

import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { useId } from 'react'

import { OptionCard } from '@/components/ui/option-card'
import { cn } from '@/lib/cn'
import { EASE, cardSelect } from '@/lib/motion'
import { GOALS, projectedWeeklyChangeKg } from '@/lib/nutrition'
import type { GoalId, RateOfChange } from '@/types'
import { RATE_HELP, RATE_LABELS } from '@/lib/defaults'

/* --------------------------------------------------------------------------
   Original abstract illustrations
   -------------------------------------------------------------------------- */

function InspirationArt({ variant, seed }: { variant: number; seed: number }) {
  // A deterministic little composition per goal: concentric arcs, bars and a
  // grid. Purely decorative, and marked aria-hidden.
  const bars = [0.4, 0.65, 0.5, 0.85, 0.6].map((v, i) => ({
    h: v * (0.7 + ((seed + i) % 5) * 0.08),
    x: 8 + i * 9,
  }))

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 64 40"
      className="h-10 w-full text-line-strong transition-[color,transform,opacity] duration-500 ease-[var(--ease-out-expo)] group-hover:scale-[1.04] group-hover:text-accent/70 group-hover:opacity-100"
      preserveAspectRatio="none"
    >
      <g stroke="currentColor" strokeWidth="1" fill="none">
        {variant % 2 === 0 ? (
          <>
            <circle cx="18" cy="20" r="12" opacity="0.7" />
            <circle cx="18" cy="20" r="6" opacity="0.4" />
            <path d="M34 8v24M42 14v18M50 6v28" opacity="0.5" />
          </>
        ) : (
          bars.map((b, i) => (
            <rect
              key={i}
              x={b.x}
              y={40 - b.h * 36}
              width="5"
              height={b.h * 36}
              opacity={0.35 + i * 0.12}
            />
          ))
        )}
      </g>
    </svg>
  )
}

const GOAL_SEED: Record<GoalId, number> = {
  'build-muscle': 1,
  'gain-weight': 2,
  'lose-fat': 3,
  maintain: 4,
  recompose: 5,
  performance: 6,
  'general-fitness': 0,
}

export function GoalSelect({
  value,
  onChange,
  className,
}: {
  value: GoalId | undefined
  onChange: (goal: GoalId) => void
  className?: string
}) {
  const name = useId()

  return (
    <div
      role="radiogroup"
      aria-label="Primary fitness goal"
      className={cn('grid gap-2.5 sm:grid-cols-2', className)}
    >
      {GOALS.map((goal, i) => {
        const selected = value === goal.id
        return (
          <motion.div
            key={goal.id}
            variants={cardSelect}
            animate={selected ? 'selected' : 'rest'}
            whileHover="hover"
            className="flex"
          >
            <OptionCard
              size="lg"
              value={goal.id}
              selected={selected}
              onSelect={(v) => onChange(v as GoalId)}
              title={goal.label}
              description={goal.blurb}
              className="h-full w-full"
              badge={
                selected ? (
                  <motion.span
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.3, ease: EASE.out }}
                    className="inline-flex size-6 shrink-0 items-center justify-center bg-accent text-accent-contrast"
                    aria-hidden="true"
                  >
                    <Check className="size-4" strokeWidth={3} />
                  </motion.span>
                ) : (
                  <InspirationArt variant={i} seed={GOAL_SEED[goal.id]} />
                )
              }
            />
          </motion.div>
        )
      })}
      <p className="sr-only" id={`${name}-note`}>
        Pick the goal that reflects what you actually want. A slower, more sustainable goal is
        almost always easier to hold than a fast one.
      </p>
    </div>
  )
}

/* --------------------------------------------------------------------------
   Target weight + rate
   -------------------------------------------------------------------------- */

export function RateSelect({
  value,
  onChange,
  className,
}: {
  value: RateOfChange
  onChange: (rate: RateOfChange) => void
  className?: string
}) {
  const options: { value: RateOfChange; title: string; description: string }[] = (
    ['gentle', 'moderate', 'steady'] as RateOfChange[]
  ).map((r) => ({ value: r, title: RATE_LABELS[r], description: RATE_HELP[r] }))

  return (
    <div role="radiogroup" aria-label="Preferred rate of change" className={cn('grid gap-2.5 sm:grid-cols-3', className)}>
      {options.map((opt) => (
        <OptionCard
          key={opt.value}
          value={opt.value}
          selected={value === opt.value}
          onSelect={(v) => onChange(v as RateOfChange)}
          title={opt.title}
          description={opt.description}
        />
      ))}
    </div>
  )
}

/**
 * Shows the implied weekly change so a user can see the consequence of a rate
 * choice before committing to it. Framed as a guide, never as a deadline.
 */
export function RateProjection({
  target,
  tdee,
  gain,
  unit,
}: {
  target: number
  tdee: number
  gain: boolean
  unit: 'kg' | 'lb'
}) {
  const weeklyKg = Math.abs(projectedWeeklyChangeKg(target, tdee))
  const shown = unit === 'lb' ? weeklyKg * 2.20462 : weeklyKg
  const digits = shown < 1 ? 2 : 1

  return (
    <div className="border-l-2 border-accent bg-accent-soft px-4 py-3">
      <p className="eyebrow text-accent">What this implies</p>
      <p className="mt-2 text-sm leading-relaxed text-ink">
        {weeklyKg < 0.05 ? (
          <>Your weight should stay roughly stable from energy alone. Training decides the rest.</>
        ) : (
          <>
            Roughly <strong className="num">{shown.toFixed(digits)} {unit}</strong>{' '}
            {gain ? 'gained' : 'lost'} per week at this target. That is a rough projection from
            published energy densities, not a schedule — real progress is rarely linear.
          </>
        )}
      </p>
    </div>
  )
}

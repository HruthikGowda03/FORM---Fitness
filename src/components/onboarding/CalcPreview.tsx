/* ==========================================================================
   FORM — live calculation preview
   Appears beside the last onboarding steps so the user can see the engine
   responding as they answer. It renders the real numbers from the real
   engine, and it disappears entirely for under-18 users.
   ========================================================================== */

import { motion } from 'motion/react'
import { Info, ShieldAlert } from 'lucide-react'
import { useMemo } from 'react'

import { Badge } from '@/components/ui/badge'
import { Callout } from '@/components/ui/separator'
import { EASE } from '@/lib/motion'
import { formatNumber } from '@/lib/format'
import { KCAL_PER_G, computePlanTargets, goalDescriptor } from '@/lib/nutrition'
import type { Profile } from '@/types'
import { cn } from '@/lib/cn'

export function CalcPreview({
  draft,
  className,
}: {
  draft: Profile
  className?: string
}) {
  const { safety, basis, targets } = useMemo(() => computePlanTargets(draft), [draft])

  if (safety.gated) {
    return (
      <aside className={cn('border border-line bg-surface p-5', className)} aria-live="polite">
        <Badge variant="warn" size="sm">
          <ShieldAlert className="size-3" />
          No calorie target
        </Badge>
        <p className="display-face mt-4 text-base">FORM will not set a target for this profile</p>
        <ul className="mt-3 space-y-2.5">
          {safety.reasons.map((r) => (
            <li key={r} className="flex gap-2.5 text-sm leading-relaxed text-muted">
              <span aria-hidden="true" className="mt-2 size-1 shrink-0 bg-warn" />
              {r}
            </li>
          ))}
        </ul>
        <p className="mt-4 border-t border-line pt-4 text-xs leading-relaxed text-faint">
          You will still get general balanced-eating guidance and a full meal plan built to
          maintenance-level portions.
        </p>
      </aside>
    )
  }

  if (!basis || !targets) return null

  const macroKcal = {
    protein: targets.protein * KCAL_PER_G.protein,
    carbs: targets.carbs * KCAL_PER_G.carbs,
    fat: targets.fat * KCAL_PER_G.fat,
  }

  return (
    <aside className={cn('border border-line bg-surface', className)} aria-live="polite">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <p className="eyebrow text-accent">Live calculation</p>
        <Badge variant="accent" size="sm">
          {goalDescriptor(draft.goal).label}
        </Badge>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'BMR', value: basis.bmr, hint: 'at rest' },
            { label: 'TDEE', value: basis.tdee, hint: `× ${basis.activityMultiplier}` },
            { label: 'Target', value: basis.target, hint: 'your plan' },
          ].map((row) => (
            <div key={row.label} className="border-l-2 border-line pl-3 first:border-accent">
              <p className="eyebrow text-faint">{row.label}</p>
              <motion.p
                key={`${row.label}-${row.value}`}
                initial={{ opacity: 0.4, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: EASE.out }}
                className="num mt-1.5 text-xl font-bold text-ink"
              >
                {formatNumber(row.value)}
              </motion.p>
              <p className="num mt-0.5 text-[0.625rem] text-faint">{row.hint}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 space-y-2.5 border-t border-line pt-4">
          {(['protein', 'carbs', 'fat'] as const).map((m) => {
            const grams = targets[m]
            const kcal = macroKcal[m]
            const pct = (kcal / targets.kcal) * 100
            return (
              <div key={m} className="flex items-center gap-3">
                <span className="eyebrow w-16 shrink-0 text-faint capitalize">{m}</span>
                <div className="h-1.5 flex-1 bg-line-soft">
                  <motion.div
                    className="h-full bg-accent/70"
                    initial={false}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.4, ease: EASE.out }}
                  />
                </div>
                <span className="num w-24 shrink-0 text-right text-xs text-muted">
                  {formatNumber(grams, 0)}g · {Math.round(pct)}%
                </span>
              </div>
            )
          })}
        </div>

        {basis.clampedBy && (
          <div className="mt-5">
            <Callout tone="warn">
              <span className="font-semibold text-ink">Adjusted for safety. </span>
              {basis.clampedBy}
            </Callout>
          </div>
        )}

        <p className="mt-5 flex gap-2.5 border-t border-line pt-4 text-xs leading-relaxed text-faint">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          These are starting estimates, not exact requirements. Hold this number for two to three
          weeks, then adjust based on how your weight and training actually respond.
        </p>
      </div>
    </aside>
  )
}

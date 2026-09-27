/* ==========================================================================
   FORM — log-meal confirmation
   ---------------------------------------------------------------------------
   Original component. The 3D tilt, travelling edge beams and spring focus are
   reimplemented here in FORM's palette and reduced-motion aware; the source
   component this is modelled on was a Next.js sign-in card written for a
   different design language, so the animation *technique* is reused and the
   surface, copy and behaviour are FORM's own.

   Why a dialog: logging used to fire on click, which made a mis-click
   instantly change the day's energy total with no way back. This confirms
   first, and is also where a partial portion gets corrected — the common real
   case when you finish most of a plate but not all of it.
   ========================================================================== */

import { AnimatePresence, motion, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { Minus, Plus, Utensils } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/cn'
import { EASE, SPRING_SNAP } from '@/lib/motion'
import { formatNumber } from '@/lib/format'
import type { PlannedMeal } from '@/types'

const STEP = 0.25
const MIN = 0.25
const MAX = 2

export function LogMealDialog({
  open,
  onOpenChange,
  meal,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  meal: PlannedMeal
  onConfirm: (meal: PlannedMeal, servings: number) => void
}) {
  const reduce = useReducedMotion()
  const [servings, setServings] = useState(1)

  // Reset whenever the dialog is opened for a (possibly different) meal.
  useEffect(() => {
    if (open) setServings(1)
  }, [open, meal.id])

  // 3D tilt driven by pointer position, skipped entirely for touch/keyboard.
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rotateX = useTransform(my, [-260, 260], reduce ? [0, 0] : [7, -7])
  const rotateY = useTransform(mx, [-260, 260], reduce ? [0, 0] : [-7, 7])

  const ratio = servings
  const kcal = Math.round(meal.total.kcal * ratio)
  const protein = Math.round(meal.total.protein * ratio * 10) / 10
  const partial = ratio !== 1

  const confirm = () => {
    onConfirm(
      {
        ...meal,
        total: {
          ...meal.total,
          kcal,
          protein,
          carbs: Math.round(meal.total.carbs * ratio * 10) / 10,
          fat: Math.round(meal.total.fat * ratio * 10) / 10,
          fiber: Math.round(meal.total.fiber * ratio * 10) / 10,
        },
      },
      // Pass the portion through explicitly. The store merges repeat logs of
      // the same meal by adding `servings`, so inferring it from the scaled
      // total would double-count every time.
      servings,
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-line/60 bg-transparent p-0 shadow-none">
        <DialogTitle className="sr-only">Log {meal.name}</DialogTitle>
        <DialogDescription className="sr-only">
          Confirm how much of this meal you ate, then add it to your log.
        </DialogDescription>

        <div className="[perspective:1200px]">
          <motion.div
            style={reduce ? undefined : { rotateX, rotateY }}
            onMouseMove={(e) => {
              if (reduce) return
              const r = e.currentTarget.getBoundingClientRect()
              mx.set(e.clientX - r.left - r.width / 2)
              my.set(e.clientY - r.top - r.height / 2)
            }}
            onMouseLeave={() => {
              mx.set(0)
              my.set(0)
            }}
            className="relative"
          >
            {/* travelling edge beams — one per side, staggered */}
            <div aria-hidden="true" className="pointer-events-none absolute -inset-px overflow-hidden">
              {(
                [
                  { cls: 'top-0 left-0 h-px w-1/2', axis: 'x', from: '-50%', to: '100%', delay: 0 },
                  { cls: 'top-0 right-0 h-1/2 w-px', axis: 'y', from: '-50%', to: '100%', delay: 0.55 },
                  { cls: 'bottom-0 right-0 h-px w-1/2', axis: 'x', from: '50%', to: '-100%', delay: 1.1 },
                  { cls: 'bottom-0 left-0 h-1/2 w-px', axis: 'y', from: '50%', to: '-100%', delay: 1.65 },
                ] as const
              ).map((beam) => (
                <motion.span
                  key={beam.cls}
                  className={cn(
                    'absolute bg-linear-to-r from-transparent via-accent to-transparent',
                    beam.cls,
                  )}
                  initial={{ opacity: 0 }}
                  animate={
                    reduce
                      ? { opacity: 0 }
                      : { [beam.axis]: [beam.from, beam.to], opacity: [0, 0.7, 0] }
                  }
                  transition={
                    reduce
                      ? { duration: 0 }
                      : {
                          [beam.axis]: { duration: 2.2, ease: EASE.out, repeat: Infinity, repeatDelay: 1, delay: beam.delay },
                          opacity: { duration: 2.2, times: [0, 0.2, 1], repeat: Infinity, repeatDelay: 1, delay: beam.delay },
                        }
                  }
                />
              ))}
            </div>

            {/* slow breathing glow on the hovered/active state */}
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-px"
              animate={reduce ? {} : { opacity: [0.25, 0.5, 0.25] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                boxShadow:
                  'inset 0 0 0 1px color-mix(in oklab, var(--color-accent) 30%, transparent)',
              }}
            />

            <div className="relative border border-line bg-surface p-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)]">
              <div className="text-center">
                <motion.span
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={SPRING_SNAP}
                  className="mx-auto inline-flex size-11 items-center justify-center border border-line bg-surface-raised text-accent"
                >
                  <Utensils className="size-5" strokeWidth={1.75} />
                </motion.span>

                <p className="eyebrow mt-4 text-accent">Log this meal</p>
                <h3 className="display-face mt-2 text-xl leading-tight">{meal.name}</h3>
                {meal.localName && (
                  <p className="mt-1 text-xs text-muted">{meal.localName}</p>
                )}
              </div>

              {/* portion control */}
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <span className="eyebrow text-faint">How much</span>
                  {partial && (
                    <Badge variant="warn" size="sm">
                      Partial
                    </Badge>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-center gap-4">
                  <button
                    type="button"
                    onClick={() => setServings((s) => Math.max(MIN, Math.round((s - STEP) * 100) / 100))}
                    disabled={servings <= MIN}
                    className="press inline-flex size-9 items-center justify-center border border-line text-muted hover:-translate-y-0.5 hover:border-accent/50 hover:bg-accent-soft hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-35 disabled:hover:translate-y-0 disabled:hover:border-line disabled:hover:bg-transparent disabled:hover:text-muted"
                    aria-label="Less"
                  >
                    <Minus className="size-4" />
                  </button>

                  <motion.p
                    key={servings}
                    initial={{ scale: 0.85, opacity: 0.4 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={SPRING_SNAP}
                    className="num w-20 text-center text-2xl font-bold"
                  >
                    {servings}
                    <span className="text-sm text-faint">×</span>
                  </motion.p>

                  <button
                    type="button"
                    onClick={() => setServings((s) => Math.min(MAX, Math.round((s + STEP) * 100) / 100))}
                    disabled={servings >= MAX}
                    className="press inline-flex size-9 items-center justify-center border border-line text-muted hover:-translate-y-0.5 hover:border-accent/50 hover:bg-accent-soft hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-35 disabled:hover:translate-y-0 disabled:hover:border-line disabled:hover:bg-transparent disabled:hover:text-muted"
                    aria-label="More"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>

                <p className="mt-2 text-center text-xs text-muted">
                  {servings === 1
                    ? 'The whole plate as planned'
                    : `${formatNumber(ratio * 100)}% of the planned portion`}
                </p>
              </div>

              {/* what this adds */}
              <dl className="mt-6 grid grid-cols-4 gap-2 border-t border-line pt-4 text-center">
                {[
                  { label: 'kcal', value: formatNumber(kcal) },
                  { label: 'Protein', value: `${formatNumber(protein, 0)}g` },
                  { label: 'Carbs', value: `${formatNumber(meal.total.carbs * ratio, 0)}g` },
                  { label: 'Fat', value: `${formatNumber(meal.total.fat * ratio, 0)}g` },
                ].map((s) => (
                  <div key={s.label}>
                    <dt className="eyebrow text-faint">{s.label}</dt>
                    <dd className="num mt-1 text-sm font-semibold text-ink">{s.value}</dd>
                  </div>
                ))}
              </dl>

              {/* actions */}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="press h-11 flex-1 border border-line font-display text-xs font-bold tracking-[0.08em] text-muted uppercase hover:-translate-y-0.5 hover:border-accent/50 hover:bg-accent-soft hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Cancel
                </button>
                      <motion.button
                  type="button"
                  onClick={confirm}
                  whileHover={reduce ? undefined : { scale: 1.02 }}
                  whileTap={reduce ? undefined : { scale: 0.98 }}
                  transition={SPRING_SNAP}
                  className="h-11 flex-1 bg-accent font-display text-xs font-bold tracking-[0.08em] text-accent-contrast uppercase focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  Add to log
                </motion.button>
              </div>

              <p className="mt-3 text-center text-[0.6875rem] leading-relaxed text-faint">
                Removes the whole meal. To log a single food instead, use the food explorer.
              </p>
            </div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/**
 * Inline confirmation used by the dashboard's logged-items list, so a removal
 * is visible rather than the row silently vanishing.
 */
export function LoggedRow({
  onRemove,
  children,
  className,
}: {
  onRemove: () => void
  children: React.ReactNode
  className?: string
}) {
  const [pending, setPending] = useState(false)

  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.li
        layout
        className={className}
        animate={
          pending
            ? { opacity: 0, x: 24, height: 0, marginBottom: 0 }
            : { opacity: 1, x: 0, height: 'auto', marginBottom: 0 }
        }
        exit={{ opacity: 0, x: 24 }}
        transition={{ duration: 0.3, ease: EASE.out }}
      >
        <div className="flex items-center gap-4">
          <div className="min-w-0 flex-1">{children}</div>
          <button
            type="button"
            onClick={() => {
              setPending(true)
              window.setTimeout(onRemove, 160)
            }}
            className="press inline-flex size-7 shrink-0 items-center justify-center text-muted hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            aria-label="Remove from log"
          >
            <Minus className="size-4" />
          </button>
        </div>
      </motion.li>
    </AnimatePresence>
  )
}

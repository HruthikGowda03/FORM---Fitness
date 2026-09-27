/* ==========================================================================
   FORM — animated macro rings
   Original component. Three concentric SVG arcs that animate to their value.
   Accessible by construction: the graphic is `aria-hidden` and the numbers are
   always rendered as real text beside it.
   ========================================================================== */

import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useId, useState } from 'react'

import { cn } from '@/lib/cn'
import { EASE } from '@/lib/motion'
import { formatNumber } from '@/lib/format'
import type { Macros } from '@/types'

export type RingSpec = {
  key: keyof Macros
  label: string
  /** ring colour as a CSS colour string */
  color: string
}

export const DEFAULT_RINGS: RingSpec[] = [
  { key: 'protein', label: 'Protein', color: 'var(--color-accent)' },
  { key: 'carbs', label: 'Carbs', color: 'var(--color-info)' },
  { key: 'fat', label: 'Fat', color: 'var(--color-warn)' },
]

type RingProps = {
  spec: RingSpec
  consumed: number
  target: number
  radius: number
  strokeWidth: number
  /** changes when the underlying day changes, so the ring re-animates */
  animateKey: string
}

/**
 * A single ring. `pathLength` lets a plain <circle> act as an arc without any
 * path maths, and animates smoothly from empty to the current ratio.
 */
function Ring({ spec, consumed, target, radius, strokeWidth, animateKey }: RingProps) {
  const reduce = useReducedMotion()
  const safeTarget = target > 0 ? target : 1
  const ratio = Math.max(0, Math.min(consumed / safeTarget, 1))

  return (
    <motion.circle
      key={`${spec.key}-${animateKey}`}
      cx="100"
      cy="100"
      r={radius}
      fill="none"
      stroke={spec.color}
      strokeWidth={strokeWidth}
      strokeLinecap="butt"
      pathLength={1}
      initial={reduce ? false : { pathLength: 0, opacity: 0.3 }}
      animate={{ pathLength: ratio, opacity: 1 }}
      transition={{ duration: reduce ? 0 : 1.1, ease: EASE.out }}
    />
  )
}

export function MacroRings({
  consumed,
  target,
  size = 260,
  rings = DEFAULT_RINGS,
  className,
  showLegend = true,
  animateKey = 'default',
  centerLabel,
}: {
  consumed: Macros
  target: Macros
  size?: number
  rings?: RingSpec[]
  className?: string
  showLegend?: boolean
  animateKey?: string
  centerLabel?: React.ReactNode
}) {
  const reduce = useReducedMotion()
  const gradientId = useId().replace(/:/g, '')

  const totalConsumed = rings.reduce((sum, r) => sum + (consumed[r.key] ?? 0), 0)
  const totalTarget = rings.reduce((sum, r) => sum + (target[r.key] ?? 0), 0)
  const overall = totalTarget > 0 ? totalConsumed / totalTarget : 0

  // Progressively smaller rings: 88, 70, 52
  const radii = rings.length === 3 ? [88, 70, 52] : rings.map((_, i) => 88 - i * 22)

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8',
        className,
      )}
    >
      <div
        className="relative shrink-0"
        style={{ width: size, height: size }}
        role="img"
        aria-label={
          `Macronutrient progress: ${rings
            .map((r) => `${r.label} ${formatNumber(consumed[r.key] ?? 0, 0)} of ${formatNumber(target[r.key] ?? 0, 0)} grams`)
            .join(', ')}.`
        }
      >
        <svg viewBox="0 0 200 200" className="size-full -rotate-90" aria-hidden="true">
          <defs>
            <filter id={`${gradientId}-glow`} x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="2.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {rings.map((spec, i) => (
            <circle
              key={`${spec.key}-track`}
              cx="100"
              cy="100"
              r={radii[i]}
              fill="none"
              stroke="var(--color-line)"
              strokeWidth={i === 0 ? 14 : 11}
            />
          ))}

          <g filter={`url(#${gradientId}-glow)`}>
            {rings.map((spec, i) => (
              <Ring
                key={spec.key}
                spec={spec}
                consumed={consumed[spec.key] ?? 0}
                target={target[spec.key] ?? 0}
                radius={radii[i]}
                strokeWidth={i === 0 ? 14 : 11}
                animateKey={animateKey}
              />
            ))}
          </g>
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {centerLabel ?? (
            <>
              <span className="num text-3xl font-bold text-ink">
                {Math.round(overall * 100)}
                <span className="text-lg text-muted">%</span>
              </span>
              <span className="eyebrow mt-1 text-faint">of target</span>
            </>
          )}
        </div>
      </div>

      {showLegend && (
        <ul className="grid w-full min-w-0 gap-3">
          {rings.map((spec) => {
            const c = consumed[spec.key] ?? 0
            const t = target[spec.key] ?? 0
            const pct = t > 0 ? Math.round((c / t) * 100) : 0
            return (
              <li key={spec.key} className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0"
                  style={{ backgroundColor: spec.color }}
                />
                <span className="display-face w-16 shrink-0 text-sm text-ink">{spec.label}</span>
                {/* whitespace-nowrap stops the digits wrapping onto their own
                    lines when the panel is narrow, which is what a bare
                    `num` span does inside a flex row. */}
                <span className="num min-w-0 truncate text-sm whitespace-nowrap text-muted">
                  {formatNumber(c, 0)}
                  <span className="text-faint"> / {formatNumber(t, 0)} g</span>
                </span>
                <span
                  className={cn(
                    'num w-10 shrink-0 text-right text-xs',
                    pct > 110 ? 'text-warn' : pct >= 90 ? 'text-accent' : 'text-faint',
                  )}
                >
                  {pct}%
                </span>
              </li>
            )
          })}
        </ul>
      )}
      {/* Only used to keep the reduce-motion branch referenced in one place. */}
      <span className="sr-only">{reduce ? 'Reduced motion' : ''}</span>
    </div>
  )
}

/* --------------------------------------------------------------------------
   Single slim ring, used for compact stat tiles
   -------------------------------------------------------------------------- */

export function ProgressRing({
  value,
  max,
  size = 56,
  strokeWidth = 5,
  color = 'var(--color-accent)',
  children,
  className,
  label,
}: {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  color?: string
  children?: React.ReactNode
  className?: string
  label?: string
}) {
  const reduce = useReducedMotion()
  const ratio = max > 0 ? Math.max(0, Math.min(value / max, 1)) : 0
  const r = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * r

  return (
    <div
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${Math.round(ratio * 100)} percent`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-line)"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          strokeDasharray={circumference}
          initial={reduce ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - ratio) }}
          transition={{ duration: reduce ? 0 : 0.9, ease: EASE.out }}
        />
      </svg>
      {children && (
        <span className="absolute inset-0 flex items-center justify-center">{children}</span>
      )}
    </div>
  )
}

/* --------------------------------------------------------------------------
   Animated calorie counter
   -------------------------------------------------------------------------- */

export function AnimatedNumber({
  value,
  className,
  duration = 0.8,
}: {
  value: number
  className?: string
  duration?: number
}) {
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(reduce ? value : 0)

  useEffect(() => {
    if (reduce) {
      setDisplay(value)
      return
    }
    let frame = 0
    const start = performance.now()
    const from = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000))
      // easeOutExpo
      const eased = t === 1 ? 1 : 1 - 2 ** (-10 * t)
      setDisplay(Math.round(from + (value - from) * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration, reduce])

  return <span className={cn('num', className)}>{formatNumber(display)}</span>
}

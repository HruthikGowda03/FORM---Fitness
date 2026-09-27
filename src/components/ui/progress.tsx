import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/cn'

/*
  Two separate variant sets on purpose.

  `tone` colours the *fill*. When the track and the fill shared one `cva`, the
  track picked up the default tone and rendered as a solid bar whatever
  `value` was — so a 0% bar looked full. The track must never take a tone.
*/
const trackVariants = cva('relative w-full overflow-hidden', {
  variants: {
    size: {
      sm: 'h-1.5',
      md: 'h-2.5',
      lg: 'h-4',
    },
  },
  defaultVariants: { size: 'md' },
})

const fillVariants = cva('h-full', {
  variants: {
    tone: {
      accent: 'bg-accent',
      ok: 'bg-ok',
      warn: 'bg-warn',
      danger: 'bg-danger',
      info: 'bg-info',
      muted: 'bg-line-strong',
    },
  },
  defaultVariants: { tone: 'accent' },
})

type ProgressProps = Omit<React.ComponentProps<'div'>, 'children'> &
  VariantProps<typeof trackVariants> &
  VariantProps<typeof fillVariants> & {
    value: number
    max?: number
    /** numeric label rendered inside the track */
    children?: React.ReactNode
  }

/**
 * Determinate progress bar. Uses `role="progressbar"` with real ARIA values so
 * it is announced correctly, rather than a styled div.
 */
function Progress({ className, size, tone, value, max = 100, children, ...props }: ProgressProps) {
  const clamped = Math.max(0, Math.min(value, max))
  const pct = max > 0 ? (clamped / max) * 100 : 0
  const over = value > max

  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cn('bg-line-soft', trackVariants({ size }), className)}
      {...props}
    >
      <div
        className={cn(
          'transition-[width] duration-700 ease-[var(--ease-out-expo)] motion-reduce:transition-none',
          fillVariants({ tone: over ? 'warn' : tone }),
        )}
        style={{ width: `${Math.min(pct, 100)}%` }}
      />
      {children}
    </div>
  )
}

export { Progress, trackVariants, fillVariants }

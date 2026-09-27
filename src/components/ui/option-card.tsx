import { cva, type VariantProps } from 'class-variance-authority'
import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react'
import * as React from 'react'

import { EASE } from '@/lib/motion'
import { cn } from '@/lib/cn'

/* --------------------------------------------------------------------------
   A large, high-contrast selection card used for goals, diets, options.
   Original component — the interaction pattern is "radio card", the styling is
   FORM's own.

   Motion notes: the lift, the ring and the corner marker are all *additional*
   signal. `aria-checked` and the border/background change carry the state on
   their own, so the component is fully usable with animation stripped.
   -------------------------------------------------------------------------- */

const optionCardVariants = cva(
  'group relative flex w-full flex-col items-start gap-2 border p-4 text-left transition-[border-color,background-color] duration-200 ease-[var(--ease-out-expo)]',
  {
    variants: {
      selected: {
        true: 'border-accent bg-accent-soft',
        false: 'border-line bg-surface hover:border-line-strong hover:bg-surface-raised',
      },
      size: {
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-5 sm:p-6',
      },
    },
    defaultVariants: { selected: false, size: 'md' },
  },
)

export type OptionCardProps = Omit<
  HTMLMotionProps<'div'>,
  'onSelect' | 'title' | 'aria-checked' | 'role'
> &
  VariantProps<typeof optionCardVariants> & {
    /** forwards to the control this card represents */
    value: string
    onSelect?: (value: string) => void
    title: React.ReactNode
    description?: React.ReactNode
    badge?: React.ReactNode
    icon?: React.ReactNode
  }

function OptionCard({
  className,
  selected,
  size,
  value,
  onSelect,
  title,
  description,
  badge,
  icon,
  ...props
}: OptionCardProps) {
  const reduce = useReducedMotion()
  const isSelected = selected === true

  return (
    <motion.div
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      data-slot="option-card"
      data-value={value}
      onClick={() => onSelect?.(value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect?.(value)
        }
      }}
      whileHover={reduce ? undefined : { y: -3 }}
      whileTap={reduce ? undefined : { scale: 0.985 }}
      /* Spring on selection, ease on hover — the two read differently. */
      transition={{ type: 'spring', stiffness: 420, damping: 32, duration: 0.2 }}
      className={cn(
        optionCardVariants({ selected, size }),
        'cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        className,
      )}
      {...props}
    >
      {/* Selection ring: a separate layer so it can spring in without fighting
          the border colour transition. */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 border border-accent"
        initial={false}
        animate={{ opacity: isSelected ? 1 : 0, scale: isSelected ? 1 : 0.985 }}
        transition={{ type: 'spring', stiffness: 460, damping: 30 }}
      />

      {/* Corner tick. Scales and rotates in on selection. */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute top-0 right-0 size-0 origin-top-right border-t-2 border-r-2 border-accent"
        initial={false}
        animate={
          isSelected
            ? { width: 16, height: 16, opacity: 1 }
            : { width: 0, height: 0, opacity: 0 }
        }
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      />

      {icon && (
        <motion.div
          className="text-accent"
          whileHover={reduce ? undefined : { scale: 1.1, rotate: -5 }}
          transition={{ duration: 0.25, ease: EASE.out }}
        >
          {icon}
        </motion.div>
      )}

      <div className="flex w-full items-start justify-between gap-3">
        <span
          className={cn(
            'display-face text-base leading-tight transition-colors',
            isSelected ? 'text-accent' : 'text-ink',
          )}
        >
          {title}
        </span>
        {badge}
      </div>

      {description && <span className="text-sm leading-relaxed text-muted">{description}</span>}
    </motion.div>
  )
}

export { OptionCard, optionCardVariants }

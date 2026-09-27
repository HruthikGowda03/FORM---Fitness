import { motion } from 'motion/react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import * as React from 'react'

import { EASE } from '@/lib/motion'
import { cn } from '@/lib/cn'

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer size-5 shrink-0 border border-line-strong bg-surface-inset transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-accent-contrast',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator forceMount asChild>
        {/*
          The tick draws itself rather than popping in. MotionConfig strips the
          path length animation under reduced motion, which leaves the check
          fully visible — so the control stays readable either way.
        */}
        <motion.svg
          viewBox="0 0 24 24"
          fill="none"
          className="size-3.5"
          initial="rest"
          animate="checked"
        >
          <motion.path
            d="M5 12.5 9.5 17 19 7"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="square"
            variants={{
              rest: { pathLength: 0, opacity: 0 },
              checked: { pathLength: 1, opacity: 1 },
            }}
            transition={{ duration: 0.26, ease: EASE.out }}
          />
        </motion.svg>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }

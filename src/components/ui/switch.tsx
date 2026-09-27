import { Switch as SwitchPrimitive } from 'radix-ui'
import { motion, useReducedMotion } from 'motion/react'
import * as React from 'react'

import { cn } from '@/lib/cn'

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  const reduce = useReducedMotion()
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'group inline-flex h-6 w-11 shrink-0 cursor-pointer items-center border border-line-strong transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=unchecked]:bg-surface-raised',
        className,
      )}
      {...props}
    >
      {/*
        Travel is animated; colour is not. A springing position plus an instant
        colour swap reads as one physical throw, and keeps the checked state
        legible with motion removed entirely.
      */}
      <SwitchPrimitive.Thumb asChild>
        <motion.span
          className="pointer-events-none block size-4 bg-ink transition-colors duration-150 group-data-[state=checked]:bg-accent-contrast"
          initial={false}
          animate={{ x: reduce ? undefined : 24 }}
          transition={{ type: 'spring', stiffness: 700, damping: 38 }}
        />
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  )
}

export { Switch }

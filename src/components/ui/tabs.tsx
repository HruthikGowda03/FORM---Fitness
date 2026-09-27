import { Tabs as TabsPrimitive } from 'radix-ui'
import { motion, useReducedMotion } from 'motion/react'
import * as React from 'react'

import { EASE } from '@/lib/motion'
import { cn } from '@/lib/cn'

/* --------------------------------------------------------------------------
   Tabs with a sliding underline.

   The indicator is a single element that physically travels between triggers.
   To do that safely it needs to know which trigger is active, and Radix keeps
   that on the DOM (`data-state`) rather than in React. So this file keeps a
   tiny copy of the active value in context — the Root is controlled, which
   means the copy cannot drift from the DOM.
   -------------------------------------------------------------------------- */

const TabsCtx = React.createContext<{ value: string; indicatorId: string } | null>(null)

function Tabs({
  value,
  defaultValue,
  onValueChange,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const generatedId = React.useId()
  const [uncontrolled, setUncontrolled] = React.useState(
    () => (defaultValue as string | undefined) ?? '',
  )
  const current = value ?? uncontrolled

  const setValue = React.useCallback(
    (next: string) => {
      if (value === undefined) setUncontrolled(next)
      onValueChange?.(next)
    },
    [onValueChange, value],
  )

  const ctx = React.useMemo(
    () => ({ value: current, indicatorId: `tabs-indicator-${generatedId}` }),
    [current, generatedId],
  )

  return (
    <TabsCtx.Provider value={ctx}>
      <TabsPrimitive.Root value={current} onValueChange={setValue} {...props} />
    </TabsCtx.Provider>
  )
}

function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn('inline-flex w-full items-stretch gap-0 border-b border-line', className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const ctx = React.useContext(TabsCtx)
  const isActive = ctx !== null && props.value === ctx.value

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        'relative flex-1 px-4 py-3 font-display text-xs font-bold uppercase tracking-[0.1em] text-muted transition-colors',
        'hover:text-ink',
        'focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent',
        'data-[state=active]:text-accent',
        'disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {/*
        `children` is destructured out of the rest props on purpose. JSX
        children take precedence over a `children` key that arrived via spread,
        so passing the indicator as JSX children would silently throw away the
        tab's own label and leave an unlabelled button behind.
      */}
      {children}
      {/* Exactly one trigger owns the shared layoutId, so it slides. */}
      {isActive && (
        <motion.span
          aria-hidden="true"
          layoutId={ctx.indicatorId}
          className="absolute inset-x-0 -bottom-px h-0.5 bg-accent"
          transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        />
      )}
    </TabsPrimitive.Trigger>
  )
}

function TabsContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  const reduce = useReducedMotion()
  if (reduce) {
    return (
      <TabsPrimitive.Content data-slot="tabs-content" className={className} {...props}>
        {children}
      </TabsPrimitive.Content>
    )
  }
  return (
    <TabsPrimitive.Content data-slot="tabs-content" className={className} {...props} asChild>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE.out }}
      >
        {children}
      </motion.div>
    </TabsPrimitive.Content>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }

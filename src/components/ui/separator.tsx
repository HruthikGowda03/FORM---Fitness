import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/cn'

/**
 * A plain divider. `tone` is exposed so a callout inside a card can still use
 * the same hairline treatment.
 */
function Separator({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<'div'> & { orientation?: 'horizontal' | 'vertical' }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        'bg-line shrink-0',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  )
}

const calloutVariants = cva('border-l-2 px-4 py-3', {
  variants: {
    tone: {
      info: 'border-info bg-info/8 text-ink',
      warn: 'border-warn bg-warn/8 text-ink',
      danger: 'border-danger bg-danger/8 text-ink',
      ok: 'border-ok bg-ok/8 text-ink',
      accent: 'border-accent bg-accent/8 text-ink',
      muted: 'border-line-strong bg-surface-inset text-muted',
    },
  },
  defaultVariants: { tone: 'muted' },
})

export type CalloutProps = React.ComponentProps<'div'> & VariantProps<typeof calloutVariants>

function Callout({ className, tone, ...props }: CalloutProps) {
  return <div className={cn(calloutVariants({ tone }), className)} {...props} />
}

export { Separator, Callout, calloutVariants }

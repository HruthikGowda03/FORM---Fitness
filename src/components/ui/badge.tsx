import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/cn'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 border font-mono text-[0.6875rem] uppercase tracking-[0.12em] whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'border-line bg-surface-raised text-muted',
        accent: 'border-accent/50 bg-accent-soft text-accent',
        ok: 'border-ok/40 bg-ok/10 text-ok',
        warn: 'border-warn/40 bg-warn/10 text-warn',
        danger: 'border-danger/40 bg-danger/10 text-danger',
        info: 'border-info/40 bg-info/10 text-info',
        solid: 'border-transparent bg-ink text-bg',
      },
      size: {
        sm: 'px-2 py-0.5',
        md: 'px-2.5 py-1',
        lg: 'px-3.5 py-1.5 text-xs',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
)

export type BadgeProps = React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

export { Badge, badgeVariants }

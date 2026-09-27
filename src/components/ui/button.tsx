/* ==========================================================================
   UI primitives
   ---------------------------------------------------------------------------
   Written in the shadcn/ui convention: a Radix primitive + `cva` variants +
   a `cn()` merge, copied into this project rather than imported from a
   package. That is exactly how shadcn/ui is distributed — the code lives
   in the repo and is owned by the project.
   ========================================================================== */

import { Slot } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'

import { cn } from '@/lib/cn'

const buttonVariants = cva(
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-display font-bold uppercase tracking-[0.08em] disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent select-none',
  {
    variants: {
      variant: {
        /* Primary: the electric lime. One per view, always the main action. */
        primary:
          'bg-accent text-accent-contrast shadow-[0_10px_30px_-14px_var(--color-accent)] hover:bg-lime-bright hover:shadow-[0_16px_40px_-16px_var(--color-accent)]',
        /* Secondary: outlined, the workhorse. */
        secondary:
          'border border-line-strong bg-transparent text-ink hover:border-accent/60 hover:bg-surface-raised',
        /* Ghost: quiet actions in dense UI. */
        ghost: 'bg-transparent text-muted hover:text-ink hover:bg-surface-raised',
        /* Accent outline: emphasis without a filled block. */
        outline: 'border border-accent/70 bg-accent-soft text-accent hover:border-accent hover:bg-accent/20',
        danger: 'border border-danger/60 bg-danger/10 text-danger hover:border-danger hover:bg-danger/20',
        link: 'link-wipe text-accent normal-case tracking-normal font-semibold',
      },
      size: {
        sm: 'h-9 px-4 text-[0.6875rem]',
        md: 'h-11 px-6 text-xs',
        lg: 'h-14 px-8 text-sm',
        xl: 'h-16 px-10 text-base',
        icon: 'size-10 p-0',
        'icon-sm': 'size-8 p-0 text-[0.6875rem]',
      },
      block: {
        true: 'w-full',
        false: '',
      },
      /**
       * Hover motion is opt-out rather than opt-in. Forgetting it on one
       * button out of ninety is exactly how a site ends up feeling dead, and
       * there is no button here for which a 2px lift would be wrong — the
       * `link` variant turns it off, because a text link that lifts looks
       * broken.
       */
      interactive: {
        true: 'lift',
        false: '',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false, interactive: true },
  },
)

export type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    /** Renders a subtle animated sheen. Purely decorative. */
    sheen?: boolean
  }

function Button({
  className,
  variant,
  size,
  block,
  interactive,
  asChild = false,
  sheen = false,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'

  /**
   * Radix `Slot` requires exactly one element child. `children` plus a
   * conditional `{sheen && …}` would be an array of two, so the decorative
   * layer is only ever added when it is actually requested — and the
   * as-child path is left with the caller's element alone.
   */
  const sheenLayer = sheen ? (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
    >
      <span className="absolute -inset-x-full top-0 h-full w-1/2 bg-linear-to-r from-transparent via-white/25 to-transparent group-hover:animate-shimmer" />
    </span>
  ) : null

  if (asChild) {
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, block, interactive }), className)}
        {...props}
      >
        {children}
      </Comp>
    )
  }

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, block, interactive }), className)}
      {...props}
    >
      {children}
      {sheenLayer}
    </Comp>
  )
}

export { Button, buttonVariants }

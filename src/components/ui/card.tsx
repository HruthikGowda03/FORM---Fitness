import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/cn'

/* --------------------------------------------------------------------------
   Card. `interactive` is opt-in because plenty of cards are pure containers —
   a settings panel that lifts when the pointer passes over it is noise, and
   it would be indistinguishable from the ones that *do* do something.
   -------------------------------------------------------------------------- */

const cardVariants = cva(
  'text-ink shadow-[var(--shadow-card)]',
  {
    variants: {
      interactive: {
        true: 'lift-card',
        false: '',
      },
    },
    defaultVariants: { interactive: false },
  },
)

type CardProps = React.ComponentProps<'div'> & VariantProps<typeof cardVariants>

function Card({ className, interactive, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn('border border-line bg-surface', cardVariants({ interactive }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-header" className={cn('flex flex-col gap-1.5 p-5', className)} {...props} />
}

type CardTitleProps = Omit<React.ComponentProps<'h3'>, 'title'> & {
  /**
   * Heading level. Defaults to h3, which is correct inside a page section.
   * Pass "h2" where a card *is* the section heading.
   *
   * The native `title` attribute is intentionally not exposed: `title` is used
   * here for the visible heading text, and shadowing the tooltip attribute
   * silently breaks native tooltips.
   */
  as?: 'h2' | 'h3' | 'h4'
}

function CardTitle({ className, as: HeadingTag = 'h3', children, ...props }: CardTitleProps) {
  return (
    <HeadingTag
      data-slot="card-title"
      className={cn('display-face text-lg leading-tight tracking-tight', className)}
      {...props}
    >
      {children}
    </HeadingTag>
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p data-slot="card-description" className={cn('text-sm leading-relaxed text-muted', className)} {...props} />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('p-5 pt-0', className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center gap-3 border-t border-line-soft p-5', className)}
      {...props}
    />
  )
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, cardVariants }

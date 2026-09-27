import * as React from 'react'

import { cn } from '@/lib/cn'

/**
 * `React.ComponentProps<'input'>` already carries a `ref`, and spreading it
 * onto the element makes `ref` work here in React 19 — no `forwardRef` needed.
 *
 * The base is `text-base` (16px) and that is load-bearing, not a default worth
 * overriding. iOS Safari zooms the whole viewport when an input whose computed
 * font-size is under 16px takes focus, and it does *not* zoom back out on blur
 * — so a `text-xs` numeric field leaves the user on a magnified, scrolled page
 * with no obvious way back.
 *
 * A call site wanting denser type should stay at 16px on touch and only step
 * down above `sm`: `text-base sm:text-xs`. That is what the grocery quantity
 * and price editors do.
 */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-12 w-full min-w-0 border border-line bg-surface-inset px-4 text-base text-ink',
        'transition-[border-color,background-color,box-shadow] duration-200 ease-[var(--ease-out-expo)]',
        'hover:border-line-strong',
        'placeholder:text-faint',
        'focus-visible:border-accent focus-visible:bg-surface focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-accent',
        'aria-[invalid=true]:border-danger aria-[invalid=true]:outline-danger',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Input }

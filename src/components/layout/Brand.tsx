/* ==========================================================================
   FORM — brand mark
   Original wordmark: the "O" is a barbell plate, echoing the athletic
   identity without borrowing an existing logo.
   ========================================================================== */

import { cn } from '@/lib/cn'

export function FormMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-7 shrink-0 items-center justify-center bg-ink text-bg',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2.6}>
        <path d="M4 9v6M7 7v10M17 7v10M20 9v6" strokeLinecap="square" />
        <path d="M7 12h10" strokeLinecap="square" />
      </svg>
    </span>
  )
}

export function Wordmark({
  className,
  tagline = true,
}: {
  className?: string
  tagline?: boolean
}) {
  return (
    <span className={cn('inline-flex flex-col leading-none', className)}>
      <span className="display-face text-xl tracking-[-0.02em] text-ink">FORM</span>
      {tagline && (
        <span className="mt-0.5 font-mono text-[0.5625rem] tracking-[0.2em] text-muted uppercase">
          Fuel Your Transformation
        </span>
      )}
    </span>
  )
}

export function BrandLockup({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <FormMark />
      <Wordmark />
    </span>
  )
}

/* ==========================================================================
   FORM — onboarding field primitives
   Shared form controls with consistent labels, hints and error messaging.
   Every control is labelled and every error is linked via aria-describedby.
   ========================================================================== */

import { Info } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

import { OptionCard } from '@/components/ui/option-card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/cn'

/* --------------------------------------------------------------------------
   Field shell — label, hint, error
   -------------------------------------------------------------------------- */

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  optional,
  className,
}: {
  label: string
  hint?: ReactNode
  error?: string
  children: ReactNode
  htmlFor?: string
  optional?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-2.5', className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <Label htmlFor={htmlFor}>{label}</Label>
        {optional && (
          <span className="font-mono text-[0.625rem] tracking-widest text-faint uppercase">
            Optional
          </span>
        )}
      </div>
      {hint && <p className="text-sm leading-relaxed text-muted">{hint}</p>}
      {children}
      {error && (
        <p role="alert" className="flex items-start gap-2 text-sm text-danger">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}

/** A labelled group of radio-like option cards. */
export function OptionGroup<T extends string>({
  label,
  hint,
  value,
  onChange,
  options,
  columns = 2,
  error,
  optional,
  className,
}: {
  label: string
  hint?: ReactNode
  value: T | undefined
  onChange: (value: T) => void
  options: { value: T; title: ReactNode; description?: ReactNode; badge?: ReactNode }[]
  columns?: 1 | 2 | 3
  error?: string
  optional?: boolean
  className?: string
}) {
  const id = useId()
  const cols = columns === 3 ? 'sm:grid-cols-3' : columns === 2 ? 'sm:grid-cols-2' : 'grid-cols-1'

  return (
    <fieldset className={cn('flex flex-col gap-3', className)} aria-describedby={error ? `${id}-err` : undefined}>
      <legend className="sr-only">{label}</legend>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="eyebrow text-muted">{label}</span>
        {optional && (
          <span className="font-mono text-[0.625rem] tracking-widest text-faint uppercase">
            Optional
          </span>
        )}
      </div>

      {hint && <p className="text-sm leading-relaxed text-muted">{hint}</p>}

      <div role="radiogroup" aria-label={label} className={cn('grid gap-2.5', cols)}>
        {options.map((opt) => (
          <OptionCard
            key={opt.value}
            value={opt.value}
            selected={value === opt.value}
            onSelect={(v) => onChange(v as T)}
            title={opt.title}
            description={opt.description}
            badge={opt.badge}
          />
        ))}
      </div>

      {error && (
        <p id={`${id}-err`} role="alert" className="flex items-start gap-2 text-sm text-danger">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </fieldset>
  )
}

/* --------------------------------------------------------------------------
   Numeric input with a unit suffix
   -------------------------------------------------------------------------- */

/** The text an input should show for a numeric prop. */
const asText = (n: number | undefined) => (n === undefined ? '' : String(n))

export function NumberField({
  label,
  hint,
  value,
  onChange,
  unit,
  min,
  max,
  step = 1,
  error,
  optional,
  placeholder,
  id,
  inputMode = 'decimal',
  suffix,
}: {
  label: string
  hint?: ReactNode
  value: number | undefined
  onChange: (value: number | undefined) => void
  unit: string
  min: number
  max: number
  step?: number
  error?: string
  optional?: boolean
  placeholder?: string
  id?: string
  inputMode?: 'decimal' | 'numeric'
  /** alternate unit shown next to the field, e.g. the cm equivalent */
  suffix?: string
}) {
  const autoId = useId()
  const fieldId = id ?? autoId
  const descId = hint || error ? `${fieldId}-desc` : undefined

  /*
    The field holds TEXT while it is being edited, and commits a number upward.

    Driving the input straight from `value` meant the empty string could not
    survive: deleting the last digit reported `undefined`, the parent kept the
    old number, and the controlled value snapped straight back. The field was
    impossible to clear, so the ordinary "clear it and type my own" could not
    happen — and the fields are pre-filled (170 cm, 65 kg), so clearing is
    exactly what a first-time user reaches for.

    Holding text also means a half-typed value is never rewritten out from under
    the caret: `1` stays `1` on the way to `185`, instead of being clamped to
    some in-range number the field did not ask for. Range is validated on submit
    by the step's own validator, not by fighting the keystroke.

    `min`/`max` stay on the element, because they are what give the spinner and
    assistive tech the true range. They are not enforced while typing.
  */
  const [text, setText] = useState(() => asText(value))
  const focused = useRef(false)

  /*
    Adopt a value that changed from outside — a unit switch converting kg to lb,
    a restored draft — but never while the user is mid-keystroke, or typing
    "1" on the way to "185" would be overwritten by the parent each time.
  */
  useEffect(() => {
    if (focused.current) return
    const next = asText(value)
    setText((prev) => (Number(prev) === Number(next) ? prev : next))
    // `asText` is a fresh closure each render; `value` is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <Field label={label} hint={hint} error={error} htmlFor={fieldId} optional={optional}>
      <div className="flex items-stretch gap-2">
        <div className="relative flex-1">
          <Input
            id={fieldId}
            type="number"
            inputMode={inputMode}
            value={text}
            min={min}
            max={max}
            step={step}
            placeholder={placeholder}
            aria-invalid={error ? true : undefined}
            aria-describedby={descId}
            onFocus={() => {
              focused.current = true
            }}
            onBlur={() => {
              focused.current = false
            }}
            onChange={(e) => {
              const raw = e.target.value
              setText(raw)
              // `Number('')` is 0, so an empty field has to be caught first or
              // clearing the box would silently commit a zero.
              onChange(raw.trim() === '' ? undefined : Number(raw))
            }}
            className="num pr-14"
          />
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center font-mono text-xs tracking-widest text-faint uppercase">
            {unit}
          </span>
        </div>
        {suffix && (
          <span className="num flex shrink-0 items-center border border-line bg-surface-inset px-3 font-mono text-xs text-faint">
            {suffix}
          </span>
        )}
      </div>
    </Field>
  )
}

/* --------------------------------------------------------------------------
   Text input
   -------------------------------------------------------------------------- */

export function TextField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  optional,
  maxLength,
  autoFocus,
  error,
}: {
  label: string
  hint?: ReactNode
  value: string
  onChange: (value: string) => void
  placeholder?: string
  optional?: boolean
  maxLength?: number
  autoFocus?: boolean
  error?: string
}) {
  const id = useId()
  return (
    <Field label={label} hint={hint} error={error} htmlFor={id} optional={optional}>
      <Input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        autoFocus={autoFocus}
        autoComplete="off"
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  )
}

/* --------------------------------------------------------------------------
   Chip-style multi-select (allergens, exclusions)
   -------------------------------------------------------------------------- */

export function ChipMultiSelect<T extends string>({
  label,
  hint,
  values,
  onChange,
  options,
  columns = 2,
  optional,
  emptyHint,
}: {
  label: string
  hint?: ReactNode
  values: T[]
  onChange: (values: T[]) => void
  options: { value: T; label: string }[]
  columns?: 1 | 2 | 3
  optional?: boolean
  emptyHint?: ReactNode
}) {
  const cols = columns === 3 ? 'sm:grid-cols-3' : columns === 2 ? 'sm:grid-cols-2' : 'grid-cols-1'

  const toggle = (value: T) => {
    onChange(values.includes(value) ? values.filter((v) => v !== value) : [...values, value])
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">{label}</legend>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="eyebrow text-muted">{label}</span>
        {optional && (
          <span className="font-mono text-[0.625rem] tracking-widest text-faint uppercase">
            Optional
          </span>
        )}
      </div>

      {hint && <p className="text-sm leading-relaxed text-muted">{hint}</p>}

      <div className={cn('grid gap-2', cols)}>
        {options.map((opt) => {
          const active = values.includes(opt.value)
          return (
            <button
              key={opt.value}
              type="button"
              role="checkbox"
              aria-checked={active}
              onClick={() => toggle(opt.value)}
              className={cn(
                'press flex items-center gap-2.5 border px-3.5 py-3 text-left text-sm group',
                'transition-[border-color,background-color,color,transform] duration-200 ease-[var(--ease-out-expo)]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                active
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-line bg-surface text-muted hover:-translate-y-0.5 hover:border-accent/50 hover:bg-surface-raised hover:text-ink',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex size-4 shrink-0 items-center justify-center border transition-[background-color,border-color,transform] duration-200 ease-[var(--ease-out-expo)]',
                  active ? 'scale-110 border-accent bg-accent' : 'border-line-strong group-hover:border-accent/50',
                )}
              >
                {active && (
                  <svg viewBox="0 0 10 10" className="size-2.5 text-accent-contrast" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M1.5 5.2 4 7.6 8.6 2.6" strokeLinecap="square" />
                  </svg>
                )}
              </span>
              {opt.label}
            </button>
          )
        })}
      </div>

      {values.length === 0 && emptyHint && <p className="text-xs text-faint">{emptyHint}</p>}
    </fieldset>
  )
}

/* --------------------------------------------------------------------------
   Yes / no segmented control — used for the 18+ gate
   -------------------------------------------------------------------------- */

export function YesNo({
  label,
  hint,
  value,
  onChange,
  yesLabel = 'Yes',
  noLabel = 'No',
  error,
}: {
  label: string
  hint?: ReactNode
  value: boolean | undefined
  onChange: (value: boolean) => void
  yesLabel?: string
  noLabel?: string
  error?: string
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      <div className="grid grid-cols-2 gap-2.5">
        {[true, false].map((option) => {
          const selected = value === option
          return (
            <button
              key={String(option)}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option)}
              className={cn(
                'press border px-4 py-4 font-display text-sm font-bold uppercase tracking-[0.08em]',
                'transition-[border-color,background-color,color,transform,box-shadow] duration-200 ease-[var(--ease-out-expo)]',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                selected
                  ? 'border-accent bg-accent-soft text-accent shadow-[0_0_0_1px_var(--color-accent)]'
                  : 'border-line bg-surface text-muted hover:-translate-y-0.5 hover:border-accent/50 hover:bg-surface-raised hover:text-ink',
              )}
            >
              {option ? yesLabel : noLabel}
            </button>
          )
        })}
      </div>
    </Field>
  )
}

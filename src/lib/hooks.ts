/* ==========================================================================
   FORM — small shared hooks
   ========================================================================== */

import { useCallback, useEffect, useId, useRef, useState } from 'react'

/** True when the viewport matches a min-width. SSR-safe default of `false`. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia(query)
    setMatches(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** Locks body scroll while `locked` is true. Used by the mobile nav sheet. */
export function useScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked || typeof document === 'undefined') return
    const previous = document.body.style.overflow
    const previousPad = document.body.style.paddingRight
    const scrollbar = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`
    return () => {
      document.body.style.overflow = previous
      document.body.style.paddingRight = previousPad
    }
  }, [locked])
}

/** Calls `onClose` on Escape. */
export function useEscapeKey(enabled: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [enabled, onClose])
}

/** Debounces a rapidly-changing value (search boxes, sliders). */
export function useDebounced<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

/** Persisted UI-only state, e.g. open/closed accordions. */
export function useLocalState<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial
    try {
      const raw = window.localStorage.getItem(`form.ui.${key}`)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  const set = useCallback(
    (v: T | ((p: T) => T)) => {
      setValue((prev) => {
        const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v
        try {
          window.localStorage.setItem(`form.ui.${key}`, JSON.stringify(next))
        } catch {
          /* ignore quota errors — the UI still works */
        }
        return next
      })
    },
    [key],
  )

  return [value, set]
}

/** A stable, accessible id for label/description wiring. */
export function useFieldIds(): { inputId: string; describedBy: string | undefined } {
  const id = useId()
  return { inputId: id, describedBy: `${id}-desc` }
}

/** Scrolls to the top on route change. */
export function useScrollToTop(path: string): void {
  const last = useRef(path)
  useEffect(() => {
    if (last.current === path) return
    last.current = path
    window.scrollTo({ top: 0, behavior: 'auto' })
  }, [path])
}

/** Copies text and reports success for ~2s. */
export function useCopy(): [boolean, (text: string) => Promise<void>] {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      return
    }
    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 2000)
  }, [])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return [copied, copy]
}

/* ==========================================================================
   FORM — in-app navigation history
   ---------------------------------------------------------------------------
   What "the previous page" means.

   A Back button that always goes to the homepage is worse than none: it throws
   away where the user was, and on a nine-route app it is almost never what
   they wanted. But it cannot simply be the browser's back button either. Open
   `/planner` from a shared link and there is no history to go back to, and
   `navigate(-1)` would either do nothing or leave the site entirely.

   So the destination has two tiers:

     1. The page the user actually came from, if they navigated within the app.
        Handled with `navigate(-1)`, so the button and the browser's own back
        button stay the same action — no divergent history.
     2. Otherwise the route's *logical parent* — see `logicalParent` in
        `lib/routes.ts`.

   This module is tier 1's memory. It is a stack rather than a single previous
   value so that going back and then forward again does the right thing:

       /dashboard → /planner → /grocery
       back  → /planner      (stack truncated to /planner)
       forward→ /grocery      (pushed again, not a duplicate)

   Deliberately in-memory. It resets on reload, which is correct: after a
   refresh there genuinely is no previous page, and tier 2 takes over.
   ========================================================================== */

import { useEffect, useSyncExternalStore } from 'react'

const stack: string[] = []

const listeners = new Set<() => void>()
/** Bumped on every mutation; the snapshot is deliberately opaque. */
let version = 0

function emit(): void {
  version += 1
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getVersion = () => version

/**
 * Records a visit, collapsing revisits.
 *
 * Called from an effect on every route change, including the ones caused by the
 * Back button itself — which is how the stack stays in step with reality rather
 * than growing a duplicate entry per press.
 */
export function recordVisit(pathname: string): void {
  if (stack[stack.length - 1] === pathname) return

  const seen = stack.indexOf(pathname)
  if (seen !== -1) {
    // Came back to somewhere already in the stack: drop everything after it, so
    // "back" from here does not walk into pages the user has already left.
    stack.length = seen + 1
  } else {
    stack.push(pathname)
  }
  emit()
}

/**
 * The page immediately before `pathname` in this session's app history, or
 * null if the user arrived here directly.
 */
export function previousVisit(pathname: string): string | null {
  const at = stack.indexOf(pathname)
  if (at <= 0) return null
  return stack[at - 1]
}

/** Test seam. */
export function resetNavHistory(): void {
  stack.length = 0
  emit()
}

/**
 * Subscribes a component to the stack. The value returned is the previous
 * internal path, or null.
 *
 * `useSyncExternalStore` rather than a `useState` + effect in the component: the
 * stack is updated in an effect *after* render, so a component computing from it
 * during render would read the previous route's value and never be told to
 * re-render. This subscribes properly and tears down cleanly.
 */
export function usePreviousVisit(pathname: string): string | null {
  useSyncExternalStore(
    subscribe,
    getVersion,
    getVersion,
  )
  return previousVisit(pathname)
}

/**
 * Records the current route. Called once per navigation from `Shell`, above
 * every early return, so the stack sees routes that render no Back button.
 */
export function useRecordVisit(pathname: string): void {
  // `useEffect` rather than recording during render: a render can be thrown
  // away by StrictMode's double-invoke or a concurrent interrupt, and the
  // history should only reflect pages that were actually committed.
  useEffect(() => {
    recordVisit(pathname)
  }, [pathname])
}

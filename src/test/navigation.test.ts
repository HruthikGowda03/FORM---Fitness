/* ==========================================================================
   Back navigation
   ---------------------------------------------------------------------------
   Two pieces of logic, and both are easy to get subtly wrong:

     - `logicalParent`, the fallback for a deep link or refresh, where there is
       no history to consult.
     - the visit stack, which has to survive going back and then forward again
       without duplicating entries, and must not treat a re-render as a visit.

   The failure mode this guards against is a Back button that silently does
   nothing, or that loops between two pages forever.
   ========================================================================== */

import { beforeEach, describe, expect, it } from 'vitest'

import { isBackDestination, logicalParent, PROFILES_PATH } from '@/lib/routes'
import { previousVisit, recordVisit, resetNavHistory } from '@/lib/nav-history'

describe('logicalParent', () => {
  it('sends the app routes to the dashboard, the screen the app opens on', () => {
    for (const path of ['/planner', '/explore', '/progress', '/grocery', '/settings']) {
      expect(logicalParent(path)).toBe('/dashboard')
    }
  })

  it('sends the dashboard to the landing page', () => {
    // The dashboard is the app's root page; above it is the site, not another
    // app screen.
    expect(logicalParent('/dashboard')).toBe('/')
  })

  it('sends an article to the article list, not the dashboard', () => {
    expect(logicalParent('/learn/protein')).toBe('/learn')
    expect(logicalParent('/learn/eating-disorder-risk')).toBe('/learn')
    expect(logicalParent('/learn')).toBe('/')
  })

  it('sends anything unrecognised to the start', () => {
    expect(logicalParent('/nope')).toBe('/')
    expect(logicalParent('/learn/a/b/c')).toBe('/learn')
  })

  it('gives the root no parent at all', () => {
    // A self-parenting entry would make a Back control on `/` a permanent
    // no-op, and `/` is where a Back button must not exist.
    expect(logicalParent('/')).toBeNull()
  })

  it('never returns the page it was asked about', () => {
    // A self-parenting map entry would make Back a no-op that looks broken.
    for (const path of ['/dashboard', '/planner', '/learn', '/learn/x', '/zzz']) {
      expect(logicalParent(path)).not.toBe(path)
    }
  })

  it('refuses the wizard as a back destination', () => {
    // Returning to a completed wizard drops the user into the middle of an
    // edit session, which is never what they meant.
    expect(isBackDestination('/onboarding')).toBe(false)
    expect(isBackDestination('/dashboard')).toBe(true)
    expect(isBackDestination('/')).toBe(true)
  })

  it('sends the picker to the landing page', () => {
    // Not to the app route that redirected there — that would loop.
    expect(logicalParent(PROFILES_PATH)).toBe('/')
  })
})

describe('visit stack', () => {
  beforeEach(() => {
    resetNavHistory()
  })

  it('reports no previous page on a cold deep link', () => {
    recordVisit('/planner')
    expect(previousVisit('/planner')).toBeNull()
  })

  it('reports the page the user actually came from', () => {
    recordVisit('/dashboard')
    recordVisit('/planner')
    expect(previousVisit('/planner')).toBe('/dashboard')
  })

  it('walks back through a multi-hop journey', () => {
    recordVisit('/dashboard')
    recordVisit('/planner')
    recordVisit('/grocery')
    expect(previousVisit('/grocery')).toBe('/planner')
    expect(previousVisit('/planner')).toBe('/dashboard')
  })

  it('collapses a revisit instead of duplicating it', () => {
    recordVisit('/dashboard')
    recordVisit('/planner')
    recordVisit('/grocery')
    // Back to the planner, then forward again — a nav click, not a new visit.
    recordVisit('/planner')
    recordVisit('/grocery')
    expect(previousVisit('/grocery')).toBe('/planner')
    expect(previousVisit('/planner')).toBe('/dashboard')
  })

  it('truncates the future when the user goes back', () => {
    recordVisit('/dashboard')
    recordVisit('/planner')
    recordVisit('/grocery')
    recordVisit('/planner')
    // Grocery was left behind, so Back from the planner must not return to it.
    recordVisit('/grocery')
    expect(previousVisit('/grocery')).toBe('/planner')
  })

  it('ignores a re-render of the same route', () => {
    recordVisit('/dashboard')
    recordVisit('/planner')
    // StrictMode double-invokes effects and state changes re-render freely.
    recordVisit('/planner')
    recordVisit('/planner')
    expect(previousVisit('/planner')).toBe('/dashboard')
  })

  it('treats a profile switch on the same route as no navigation', () => {
    // Closing and reopening a profile does not change the URL, so it must not
    // become a step in the journey.
    recordVisit('/dashboard')
    recordVisit('/dashboard')
    expect(previousVisit('/dashboard')).toBeNull()
  })

  it('starts over after a reset', () => {
    recordVisit('/dashboard')
    recordVisit('/planner')
    resetNavHistory()
    expect(previousVisit('/planner')).toBeNull()
  })
})

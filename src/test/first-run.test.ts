/* ==========================================================================
   First-run ordering
   ---------------------------------------------------------------------------
   The wizard writes its answers onto a profile when it finishes. So the order
   has to be: create a profile, *then* answer nine questions.

   It used to be the other way round, because `/onboarding` counted as a route
   that renders without a profile. A visitor pressing "Build my plan" went
   straight into step 1 of 9 with nothing to attach the answers to, ran every
   step, and only then met the profile picker — the reducer's `if (!active)`
   guard had dropped the whole answer set without a sound.

   These tests import the real `redirectFor` rather than a copy of it. A mirror
   would drift the first time the guard changed, and then pass while the app
   quietly lost people's data again.
   ========================================================================== */

import { describe, expect, it } from 'vitest'

import { PROFILES_PATH, isPublicRoute, redirectFor } from '@/lib/routes'

const APP_ROUTES = [
  '/dashboard',
  '/planner',
  '/explore',
  '/progress',
  '/grocery',
  '/settings',
]

/** Shaped like a `LocalProfile`, reduced to the only field the guard reads. */
const unfinished = { onboardingComplete: false }
const finished = { onboardingComplete: true }

describe('first-run ordering', () => {
  it('sends the wizard to the picker when there is no profile to write to', () => {
    // The bug. "Build my plan" used to land straight in step 1 of 9.
    expect(redirectFor('/onboarding', null)).toBe(PROFILES_PATH)
  })

  it('lets a user with a profile run the wizard', () => {
    expect(redirectFor('/onboarding', unfinished)).toBeNull()
    expect(redirectFor('/onboarding', finished)).toBeNull()
  })

  it('never redirects the wizard to itself', () => {
    // A profile exists but is unfinished, so /onboarding is the right place.
    // Falling through to the generic "no plan yet" branch would send the user
    // to /onboarding from /onboarding, forever.
    expect(redirectFor('/onboarding', unfinished)).not.toBe('/onboarding')
  })

  it('sends every app route to the picker with no profile', () => {
    for (const route of APP_ROUTES) {
      expect(redirectFor(route, null)).toBe(PROFILES_PATH)
    }
  })

  it('sends unfinished app routes to the wizard', () => {
    for (const route of APP_ROUTES) {
      expect(redirectFor(route, unfinished)).toBe('/onboarding')
    }
  })

  it('lets finished app routes render', () => {
    for (const route of APP_ROUTES) {
      expect(redirectFor(route, finished)).toBeNull()
    }
  })

  it('keeps the landing page and knowledge centre open with no profile', () => {
    expect(redirectFor('/', null)).toBeNull()
    expect(redirectFor('/learn', null)).toBeNull()
    expect(redirectFor('/learn/protein', null)).toBeNull()
  })

  it('does not treat the wizard as public', () => {
    // The single decision the whole bug hinged on.
    expect(isPublicRoute('/onboarding')).toBe(false)
    expect(isPublicRoute(PROFILES_PATH)).toBe(true)
  })

  it('produces the intended order from a cold visit', () => {
    // The whole point, as a walk: press Build my plan, meet the picker, create
    // a profile, land in the wizard, finish, arrive at the dashboard.
    expect(redirectFor('/onboarding', null)).toBe(PROFILES_PATH)
    expect(redirectFor('/onboarding', unfinished)).toBeNull()
    expect(redirectFor('/dashboard', finished)).toBeNull()
  })

  it('never answers with the route it was asked about', () => {
    // A self-redirect is an infinite loop wearing a very convincing disguise.
    const states = [null, unfinished, finished]
    const paths = ['/', PROFILES_PATH, '/onboarding', '/learn', '/learn/x', ...APP_ROUTES]
    for (const p of paths) {
      for (const s of states) {
        expect(redirectFor(p, s)).not.toBe(p)
      }
    }
  })
})

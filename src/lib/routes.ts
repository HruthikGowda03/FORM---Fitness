/* ==========================================================================
   FORM — route registry
   ---------------------------------------------------------------------------
   The single place that knows which page component backs which URL, and how
   to fetch it.

   This exists for one reason beyond tidiness. Every page except the landing
   page is a lazy chunk, so a nav click used to mean: wait for the network,
   then render. On a cold cache that is long enough to read as "the site
   froze" — the URL changes, the nav underline moves, and the page underneath
   just sits there. Hovering a nav link should have already paid that cost.

   `preloadRoute` is safe to call at any time and as often as you like:
   `React.lazy` memoises the underlying import promise, so a second call
   returns the already-resolved module rather than refetching it.
   ========================================================================== */

import { lazy } from 'react'

import type { ComponentType } from 'react'

const loaders = {
  '/onboarding': () => import('@/pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })),
  '/dashboard': () => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
  '/planner': () => import('@/pages/PlannerPage').then((m) => ({ default: m.PlannerPage })),
  '/explore': () => import('@/pages/ExplorePage').then((m) => ({ default: m.ExplorePage })),
  '/progress': () => import('@/pages/ProgressPage').then((m) => ({ default: m.ProgressPage })),
  '/grocery': () => import('@/pages/GroceryPage').then((m) => ({ default: m.GroceryPage })),
  '/learn': () => import('@/pages/LearnPage').then((m) => ({ default: m.LearnPage })),
  '/settings': () => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
  '/404': () => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
} as const

export type RoutePath = keyof typeof loaders

export const Pages = {
  onboarding: lazy(loaders['/onboarding']),
  dashboard: lazy(loaders['/dashboard']),
  planner: lazy(loaders['/planner']),
  explore: lazy(loaders['/explore']),
  progress: lazy(loaders['/progress']),
  grocery: lazy(loaders['/grocery']),
  learn: lazy(loaders['/learn']),
  settings: lazy(loaders['/settings']),
  notFound: lazy(loaders['/404']),
} satisfies Record<string, ComponentType>

/**
 * Maps a pathname onto the chunk that serves it. Article pages all share the
 * knowledge-centre chunk, and anything unrecognised shares the 404 chunk.
 */
function routeKey(pathname: string): RoutePath {
  if (pathname === '/' || pathname === '') return '/404' // landing ships eagerly
  // The picker ships eagerly too, because it is where a first-time visitor
  // ends up and it must not wait on a network round trip to appear.
  if (pathname === '/profiles') return '/404'
  if (pathname === '/learn' || pathname.startsWith('/learn/')) return '/learn'
  if (pathname in loaders) return pathname as RoutePath
  return '/404'
}

/** Warms a chunk without navigating. Call on hover and on focus. */
export function preloadRoute(pathname: string): void {
  void loaders[routeKey(pathname)]()
}

/** Eagerly fetches every chunk. Called once the app is idle after first paint. */
export function preloadAllRoutes(): void {
  for (const key of Object.keys(loaders) as RoutePath[]) {
    if (key === '/404') continue
    void loaders[key]()
  }
}

/* --------------------------------------------------------------------------
   Logical parent routes
   --------------------------------------------------------------------------
   The destination for a Back button when the user did *not* arrive from
   another page — a deep link, a refresh, a bookmark, or a shared URL.

   The app routes are siblings under a nav bar, not a tree, so their parent is
   the dashboard: the screen you land on when entering the app. Article pages
   really are nested, so theirs is the article list.
   --------------------------------------------------------------------------
*/

/**
 * Where the profile picker lives.
 *
 * The picker used to be a screen that replaced the entire shell whenever no
 * profile was active, which meant it inherited whatever URL you happened to be
 * on. So it had no coherent "back", and a deep link to /dashboard dropped you on
 * the picker with no way off it at all. Giving it a real path fixes both: Back
 * has somewhere to go, and the landing page stays the landing page.
 */
export const PROFILES_PATH = '/profiles'

/* --------------------------------------------------------------------------
   Who is allowed to be where
   --------------------------------------------------------------------------
   Lives here, beside the rest of the route knowledge, rather than inside
   App.tsx: it is pure, it is the part that is easy to get subtly wrong, and
   from out here the tests can exercise the real function instead of a copy of
   it. A mirrored copy would drift the first time the guard changed and then
   quietly pass.
   -------------------------------------------------------------------------- */

/**
 * Routes that render without a chosen profile.
 *
 * The landing page is the entry point for someone who has never used FORM, the
 * knowledge centre is reference material, and the picker is what you land on
 * when there is no profile. None of the three are personalised.
 *
 * `/onboarding` is deliberately absent. The wizard's answers are written onto a
 * profile when it finishes, so running it with no profile means the work is
 * thrown away — which is exactly what happened: nine steps, then a picker,
 * because the reducer had no active profile to attach the answers to and
 * dropped them without a sound.
 */
export function isPublicRoute(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === PROFILES_PATH ||
    pathname === '/learn' ||
    pathname.startsWith('/learn/')
  )
}

/**
 * Where this URL should send the user, or null if it can render as-is.
 *
 * Every guard lives here rather than wrapped around individual routes, for one
 * specific reason: a redirect that fires *after* the shell has started recording
 * navigation leaves a bogus entry in the Back button's history. Deep-link to
 * /grocery with no profile and you get sent to /profiles; had /grocery been
 * recorded first, Back on the picker would return to /grocery, which would
 * redirect straight back to the picker. Forever.
 */
export function redirectFor(
  pathname: string,
  active: { onboardingComplete: boolean } | null,
): string | null {
  if (isPublicRoute(pathname)) return null
  // The wizard needs a profile to write to, but must not bounce a user who is
  // already in it — hence its own branch rather than falling through to the
  // `!onboardingComplete` case below, which would redirect to itself.
  if (pathname === '/onboarding') return active ? null : PROFILES_PATH
  // Nothing chosen yet: the picker is the only sensible destination.
  if (!active) return PROFILES_PATH
  // A profile exists but has no plan, so there is nothing here to show.
  if (!active.onboardingComplete) return '/onboarding'
  return null
}

const LOGICAL_PARENT: Record<string, string> = {
  '/dashboard': '/',
  '/planner': '/dashboard',
  '/explore': '/dashboard',
  '/progress': '/dashboard',
  '/grocery': '/dashboard',
  '/settings': '/dashboard',
  '/learn': '/',
  '/onboarding': '/',
  // The picker. Always the landing page, never the app route that redirected
  // here — see `forceFallback` on BackButton.
  '/profiles': '/',
}

/**
 * The route one level above `pathname`, or null if it has none.
 *
 * Returning null for the root rather than the root itself matters: a
 * self-parenting entry would make any Back control on `/` a permanent no-op,
 * and `/` is exactly where a Back button must not exist.
 */
export function logicalParent(pathname: string): string | null {
  // The root of the site has nothing above it.
  if (pathname === '/' || pathname === '') return null
  // Articles sit one level below the index.
  if (pathname.startsWith('/learn/')) return '/learn'
  const parent = LOGICAL_PARENT[pathname]
  // Anything unrecognised — including the 404 route — goes to the start.
  return parent && parent !== pathname ? parent : '/'
}

/**
 * Pages that are never a sensible Back destination.
 *
 * The onboarding wizard is a linear flow, not a page: once it has produced a
 * plan, returning to it drops the user into the middle of an edit session. The
 * dashboard is where the app opens, so its own real parent is a better answer.
 */
const NOT_A_BACK_DESTINATION = new Set(['/onboarding'])

export function isBackDestination(pathname: string): boolean {
  return !NOT_A_BACK_DESTINATION.has(pathname)
}

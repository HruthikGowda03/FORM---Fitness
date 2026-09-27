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

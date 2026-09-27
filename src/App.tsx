/* ==========================================================================
   FORM — routes & layout
   ========================================================================== */

import { Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'

import { Nav, NavSpacer } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import { ProfileGate } from '@/components/auth/ProfileGate'
import { LandingPage } from '@/pages/LandingPage'
import { PageTransition } from '@/components/motion/primitives'
import { Pages, preloadAllRoutes } from '@/lib/routes'
import { useRecordVisit } from '@/lib/nav-history'
import { useAppState, useProfile } from '@/store/AppStore'
import { useScrollToTop } from '@/lib/hooks'

/* The landing page ships in the main bundle so the first paint is fast.
   Everything else is a lazy chunk — see `lib/routes.ts`, which also knows how
   to warm them on hover. */

/** Tasteful loading state — a lime sweep, not a spinner. */
function RouteFallback() {
  return (
    <div
      className="flex min-h-[60vh] items-center justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-1 w-40 overflow-hidden bg-line">
          <div className="absolute inset-y-0 -left-full w-1/2 bg-accent motion-safe:animate-shimmer" />
        </div>
        <motion.span
          className="eyebrow text-faint"
          animate={{ opacity: [0.45, 1, 0.45] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
        >
          Loading
        </motion.span>
      </div>
    </div>
  )
}

/**
 * Gates the app routes behind a completed profile. Onboarding and the
 * knowledge centre stay open so the app is never a dead end.
 */
function RequireProfile({ children }: { children: React.ReactNode }) {
  const active = useProfile()
  const location = useLocation()

  if (!active?.profile || !active.onboardingComplete) {
    return <Navigate to="/onboarding" state={{ from: location.pathname }} replace />
  }
  return <>{children}</>
}

/**
 * Routes that must work without a profile.
 *
 * The landing page is the entry point for someone who has never used FORM, and
 * the knowledge centre is reference material — neither is personalised, so
 * neither should sit behind a profile picker. Only the app routes need a
 * profile, and those are already guarded individually by <RequireProfile>.
 */
function isPublicRoute(pathname: string): boolean {
  return pathname === '/' || pathname === '/learn' || pathname.startsWith('/learn/')
}

function Shell() {
  const location = useLocation()
  const { profiles, activeProfileId } = useAppState()
  const active = useProfile()
  useScrollToTop(location.pathname)

  /*
    Record every route for the Back button's benefit. A hook rather than an
    effect in BackButton, because it has to run on routes that do not render one
    — the landing page and the wizard — or the stack would have a hole in it
    exactly where people are most likely to arrive from.
  */
  useRecordVisit(location.pathname)

  /**
   * After the first paint has settled, fetch every remaining chunk while the
   * browser is idle. Navigation then costs a React render rather than a
   * network round trip, which is the difference between "instant" and
   * "did it even register?".
   */
  useEffect(() => {
    const idle =
      'requestIdleCallback' in window
        ? window.requestIdleCallback
        : (fn: () => void) => window.setTimeout(fn, 1200)
    const handle = idle(() => preloadAllRoutes())
    return () => {
      if ('cancelIdleCallback' in window && typeof handle === 'number') {
        window.cancelIdleCallback(handle)
      }
    }
  }, [])

  /**
   * The picker is a screen rather than a route, so it replaces the whole
   * shell. Which routes it replaces depends on whether a profile exists yet:
   *
   * - First visit, no profiles: a public route renders normally, so `/` is the
   *   landing page and `/learn` is readable. Everything else shows the picker,
   *   because there is nothing to show without a profile.
   * - Profiles exist: the picker takes over `/` as well, which is what makes
   *   the nav's "switch profile" control work. Public routes stay readable.
   */
  if (!activeProfileId && (profiles.length > 0 || !isPublicRoute(location.pathname))) {
    return <ProfileGate />
  }

  const isLanding = location.pathname === '/'
  const isOnboarding = location.pathname === '/onboarding'
  const isPublic = isPublicRoute(location.pathname)

  /**
   * A brand-new profile has no plan yet. Without this, finishing the picker
   * leaves the user stranded on whatever route the gate happened to be mounted
   * at (usually `/`) with an empty dashboard. The knowledge centre stays
   * reachable so onboarding is never a dead end.
   */
  if (active && !active.onboardingComplete && !isOnboarding && !isPublic) {
    return <Navigate to="/onboarding" replace />
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Nav />
      {!isLanding && !isOnboarding && <NavSpacer />}

      <main id="main" className="flex-1">
        <Suspense fallback={<RouteFallback />}>
          {/*
            The key goes on PageTransition itself. Keying an outer wrapper and
            letting PageTransition animate inside it meant two nested remounts
            for one navigation, and the inner element's `initial` state could
            be painted before the outer swap settled — which shows up as the
            old page lingering under a blank one.
          */}
          <PageTransition key={location.pathname}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/onboarding" element={<Pages.onboarding />} />
              <Route path="/learn" element={<Pages.learn />} />
              {/* Knowledge-centre articles live under /learn/:slug */}
              <Route path="/learn/:slug" element={<Pages.learn />} />
              <Route
                path="/dashboard"
                element={
                  <RequireProfile>
                    <Pages.dashboard />
                  </RequireProfile>
                }
              />
              <Route
                path="/planner"
                element={
                  <RequireProfile>
                    <Pages.planner />
                  </RequireProfile>
                }
              />
              <Route
                path="/explore"
                element={
                  <RequireProfile>
                    <Pages.explore />
                  </RequireProfile>
                }
              />
              <Route
                path="/progress"
                element={
                  <RequireProfile>
                    <Pages.progress />
                  </RequireProfile>
                }
              />
              <Route
                path="/grocery"
                element={
                  <RequireProfile>
                    <Pages.grocery />
                  </RequireProfile>
                }
              />
              <Route
                path="/settings"
                element={
                  <RequireProfile>
                    <Pages.settings />
                  </RequireProfile>
                }
              />
              <Route path="*" element={<Pages.notFound />} />
            </Routes>
          </PageTransition>
        </Suspense>
      </main>

      {!isOnboarding && <Footer />}
    </div>
  )
}

export function App() {
  return (
    <Routes>
      <Route path="*" element={<Shell />} />
    </Routes>
  )
}

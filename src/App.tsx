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
import { Pages, preloadAllRoutes, PROFILES_PATH, redirectFor } from '@/lib/routes'
import { useRecordVisit } from '@/lib/nav-history'
import { useProfile } from '@/store/AppStore'
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

function Shell() {
  const location = useLocation()
  const active = useProfile()
  useScrollToTop(location.pathname)

  const redirect = redirectFor(location.pathname, active)
  if (redirect) {
    // `replace`, so Back does not walk straight back into the route that
    // bounced the user out.
    return <Navigate to={redirect} replace />
  }

  return <ShellContent pathname={location.pathname} />
}

/**
 * The shell, for routes already known to be valid.
 *
 * Split out from <Shell> so `useRecordVisit` is never reached for a path that
 * is about to be redirected away from.
 */
function ShellContent({ pathname }: { pathname: string }) {
  /*
    Record every route for the Back button's benefit. A hook rather than an
    effect inside BackButton, because it has to run on routes that render no
    Back button at all — the landing page and the picker — or the stack would
    have a hole exactly where people are most likely to arrive from.
  */
  useRecordVisit(pathname)

  /**
   * Once the first paint has settled, fetch every remaining chunk while the
   * browser is idle. Navigation then costs a React render rather than a network
   * round trip, which is the difference between "instant" and "did it even
   * register?".
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

  const isLanding = pathname === '/'
  const isOnboarding = pathname === '/onboarding'
  const isPicker = pathname === PROFILES_PATH

  return (
    <div className="flex min-h-dvh flex-col">
      <Nav />
      {!isLanding && !isOnboarding && <NavSpacer />}

      <main id="main" className="flex-1">
        <Suspense fallback={<RouteFallback />}>
          {/*
            The key goes on PageTransition itself. Keying an outer wrapper and
            letting PageTransition animate inside it meant two nested remounts
            per navigation, and the inner element's `initial` state could be
            painted before the outer swap settled — which shows up as the old
            page lingering under a blank one.
          */}
          <PageTransition key={pathname}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path={PROFILES_PATH} element={<ProfileGate />} />
              <Route path="/onboarding" element={<Pages.onboarding />} />
              <Route path="/learn" element={<Pages.learn />} />
              {/* Knowledge-centre articles live under /learn/:slug */}
              <Route path="/learn/:slug" element={<Pages.learn />} />
              <Route path="/dashboard" element={<Pages.dashboard />} />
              <Route path="/planner" element={<Pages.planner />} />
              <Route path="/explore" element={<Pages.explore />} />
              <Route path="/progress" element={<Pages.progress />} />
              <Route path="/grocery" element={<Pages.grocery />} />
              <Route path="/settings" element={<Pages.settings />} />
              <Route path="*" element={<Pages.notFound />} />
            </Routes>
          </PageTransition>
        </Suspense>
      </main>

      {!isOnboarding && !isPicker && <Footer />}
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

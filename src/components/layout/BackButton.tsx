/* ==========================================================================
   FORM — page Back button
   ---------------------------------------------------------------------------
   One affordance, on every internal page, in the same place.

   It lives inside `PageShell` rather than being added to each page, for two
   reasons. Consistency is structural instead of a thing to remember — a new
   page gets it by existing. And because it inherits each page's own max-width
   and gutters, it lines up correctly on the `narrow` and `wide` layouts without
   a second set of breakpoints.

   The landing page and the onboarding wizard do not use `PageShell`, so they
   cannot get one by accident. The wizard already has a Back control of its own
   that walks its steps, and two buttons both labelled "Back" on one screen
   would be worse than either.
   ========================================================================== */

import { ArrowLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { isBackDestination, logicalParent } from '@/lib/routes'
import { usePreviousVisit } from '@/lib/nav-history'
import { cn } from '@/lib/cn'

export function BackButton({ className }: { className?: string }) {
  const location = useLocation()
  const navigate = useNavigate()
  const previous = usePreviousVisit(location.pathname)

  /*
    Tier 1: the page they actually came from, if it is somewhere worth going
    back to.

    `navigate(-1)` rather than `navigate(previous)`: using the real history entry
    means the button and the browser's back button are the same gesture, and the
    app never writes to history of its own. So browser back keeps working
    exactly as it did.

    The two *can* legitimately differ, in one case. Visit the planner, go to the
    knowledge centre, then navigate back to the planner. Browser back would
    return to the knowledge centre — the page you were literally just on. The
    visit stack collapses that revisit, so the button offers the planner's real
    parent instead, which is the more useful answer. Looping is the failure mode
    worth preventing; matching the browser's literal history entry is not.
  */
  const useHistory = previous !== null && isBackDestination(previous)
  const fallback = logicalParent(location.pathname)
  const target = useHistory ? previous : fallback

  // No Back on the landing page, and no Back that would go nowhere.
  if (fallback === null || target === null || target === location.pathname) return null

  return (
    <div className={cn('mb-6', className)}>
      <Button
        variant="ghost"
        size="sm"
        /*
          The name says where it goes. "Back" alone is what the label reads,
          but on a nine-route app it is genuinely ambiguous, and this is the one
          place that matters. It also satisfies WCAG 2.5.3 (Label in Name),
          because the name begins with the visible text.

          This replaces a visually-hidden sibling span, which read as
          "Back, Back to your dashboard" to a screen reader.
        */
        aria-label={`Back to ${routeName(useHistory ? (previous as string) : fallback)}`}
        // `icon-nudge-back` slides the arrow left on hover, matching the
        // direction of travel.
        className="icon-nudge-back"
        onClick={() => (useHistory ? navigate(-1) : navigate(target))}
      >
        <ArrowLeft className="size-3.5" />
        Back
      </Button>
    </div>
  )
}

/** Small, human labels for the announcement. Falls back to the raw path. */
const ROUTE_NAMES: Record<string, string> = {
  '/': 'the home page',
  '/dashboard': 'your dashboard',
  '/planner': 'the meal planner',
  '/explore': 'the food explorer',
  '/progress': 'your progress',
  '/grocery': 'the grocery list',
  '/settings': 'settings',
  '/learn': 'the knowledge centre',
  '/onboarding': 'your profile',
}

function routeName(pathname: string): string {
  if (ROUTE_NAMES[pathname]) return ROUTE_NAMES[pathname]
  if (pathname.startsWith('/learn/')) {
    return `the ${pathname.slice('/learn/'.length).replace(/-/g, ' ')} article`
  }
  return pathname
}

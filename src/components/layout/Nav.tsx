import { motion } from 'motion/react'
import { Menu, Moon, Sun, UserRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { BrandLockup } from '@/components/layout/Brand'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/cn'
import { preloadRoute } from '@/lib/routes'
import { useScrollLock } from '@/lib/hooks'
import { EASE } from '@/lib/motion'
import { useActions, useProfile } from '@/store/AppStore'
import { useTheme } from '@/components/layout/ThemeProvider'

export const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/planner', label: 'Meal plan' },
  { to: '/explore', label: 'Foods' },
  { to: '/progress', label: 'Progress' },
  { to: '/grocery', label: 'Grocery' },
  { to: '/learn', label: 'Learn' },
] as const

function ThemeToggle() {
  const { theme } = useTheme()
  const profile = useProfile()?.profile
  const { setProfile } = useActions()

  const next = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      onClick={() => setProfile({ theme: next })}
      className="press group inline-flex size-10 items-center justify-center border border-line text-muted hover:border-accent/50 hover:bg-accent-soft hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {/*
        Both glyphs stay mounted and stacked, cross-fading and rotating in
        opposite directions. `AnimatePresence mode="wait"` was used first, but
        it unmounts one before mounting the other, leaving the button blank for
        a frame on every toggle.
      */}
      <span className="relative inline-flex size-4 items-center justify-center">
        <motion.span
          className="absolute inset-0 inline-flex items-center justify-center"
          initial={false}
          animate={{ opacity: theme === 'dark' ? 1 : 0, rotate: theme === 'dark' ? 0 : -60 }}
          transition={{ duration: 0.25, ease: EASE.out }}
          aria-hidden={theme !== 'dark'}
        >
          <Moon className="size-4" />
        </motion.span>
        <motion.span
          className="absolute inset-0 inline-flex items-center justify-center"
          initial={false}
          animate={{ opacity: theme === 'dark' ? 0 : 1, rotate: theme === 'dark' ? 60 : 0 }}
          transition={{ duration: 0.25, ease: EASE.out }}
          aria-hidden={theme === 'dark'}
        >
          <Sun className="size-4" />
        </motion.span>
      </span>
      <span className="sr-only">{profile ? '' : 'Theme'}</span>
    </button>
  )
}

export function Nav() {
  const active = useProfile()
  const profile = active?.profile
  const onboardingComplete = active?.onboardingComplete ?? false
  const { closeProfile } = useActions()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()

  useScrollLock(menuOpen)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const isLanding = location.pathname === '/'
  const showAppLinks = Boolean(profile && onboardingComplete)

  return (
    <>
      <a
        href="#main"
        className="sr-only-focusable fixed top-3 left-3 z-100 bg-accent px-4 py-2 font-mono text-xs tracking-widest text-accent-contrast uppercase"
      >
        Skip to content
      </a>

      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-300',
          scrolled || !isLanding
            ? 'border-b border-line bg-bg/88 backdrop-blur-md'
            : 'border-b border-transparent bg-transparent',
        )}
      >
        <nav
          aria-label="Primary"
          className="mx-auto flex h-16 w-full max-w-app items-center gap-6 px-4 sm:px-6 lg:px-8"
        >
          <Link
            to="/"
            className="rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          >
            {/*
              No `aria-label` here. The wordmark's visible text is
              "FORM / Fuel Your Transformation", and WCAG 2.5.3 (Label in
              Name) requires the accessible name to contain the visible label.
              An `aria-label="FORM — home"` replaced it with a name that
              dropped the tagline and read as a mismatch to VoiceOver and to
              axe. The visible text is already a usable name.
            */}
            <BrandLockup />
          </Link>

          {showAppLinks && (
            <ul className="ml-auto hidden items-center gap-1 lg:flex">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <NavLink
                    to={link.to}
                    /*
                      Warm the chunk on the two events that mean "a navigation
                      is probably about to happen". Every page bar the landing
                      one is lazy, so without this a click waits on the network
                      and the page looks frozen until it lands.
                    */
                    onMouseEnter={() => preloadRoute(link.to)}
                    onFocus={() => preloadRoute(link.to)}
                    className={({ isActive }) =>
                      cn(
                        'relative px-3 py-2 font-mono text-[0.6875rem] tracking-[0.14em] uppercase transition-colors',
                        'after:absolute after:inset-x-3 after:-bottom-px after:h-px after:origin-right after:scale-x-0 after:bg-current after:transition-transform after:duration-300 after:ease-[var(--ease-out-expo)]',
                        'hover:after:origin-left hover:after:scale-x-100',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                        isActive ? 'text-accent' : 'text-muted hover:text-ink',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {link.label}
                        {isActive && (
                          <motion.span
                            layoutId="nav-underline"
                            className="absolute inset-x-3 -bottom-px h-px bg-accent"
                            transition={{ duration: 0.3, ease: EASE.out }}
                          />
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          )}

          <div className={cn('flex items-center gap-2', showAppLinks ? 'ml-0' : 'ml-auto')}>
            <ThemeToggle />

            {/*
              The profile switcher is shown whenever a profile is active, not
              only once onboarding is done. Otherwise someone who creates a
              profile gets pushed into the wizard with no way back to the
              picker — no way to add a second person, and no way out.
            */}
            {active && (
              <Button
                asChild
                size="sm"
                variant={showAppLinks ? 'primary' : 'secondary'}
                className="hidden sm:inline-flex"
                onClick={closeProfile}
                title="Switch profile"
              >
                {/* `active.name` is the local profile's name; `profile.name`
                    is the nickname inside the nutrition profile. Using the
                    latter here is what made this read "Edit profile". */}
                <Link to="/">{active.name || 'My profile'}</Link>
              </Button>
            )}

            {showAppLinks ? (
              <Button
                variant="secondary"
                size="icon"
                className="lg:hidden"
                onClick={() => setMenuOpen(true)}
                aria-label="Open menu"
                aria-expanded={menuOpen}
              >
                <Menu className="size-5" />
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link to="/learn">Learn</Link>
                </Button>
                {onboardingComplete ? null : (
                  <Button asChild size="sm">
                    <Link to="/onboarding">Build my plan</Link>
                  </Button>
                )}
              </>
            )}
          </div>
        </nav>
      </header>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" aria-label="Mobile navigation">
          <SheetHeader>
            <SheetTitle className="display-face text-xl">Menu</SheetTitle>
            <SheetDescription className="font-mono text-[0.6875rem] tracking-widest uppercase">
              Navigate FORM
            </SheetDescription>
          </SheetHeader>

          <ul className="flex flex-col divide-y divide-line-soft">
            {NAV_LINKS.map((link, i) => (
              <motion.li
                key={link.to}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 + i * 0.045, duration: 0.35, ease: EASE.out }}
              >
                <SheetClose asChild>
                  <Link
                    to={link.to}
                    onMouseEnter={() => preloadRoute(link.to)}
                    onFocus={() => preloadRoute(link.to)}
                    className="flex items-center justify-between px-6 py-4 font-display text-lg font-bold transition-colors hover:bg-surface-raised hover:text-accent focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
                  >
                    {link.label}
                    <span className="num text-xs text-faint">0{i + 1}</span>
                  </Link>
                </SheetClose>
              </motion.li>
            ))}
          </ul>

          <div className="mt-auto flex flex-col gap-3 border-t border-line p-6">
            <Button variant="secondary" block onClick={() => { closeProfile(); setMenuOpen(false) }}>
              <UserRound className="size-4" />
              Switch profile
            </Button>
            <SheetClose asChild>
              <Button asChild variant="ghost" block>
                <Link to="/learn">Knowledge centre</Link>
              </Button>
            </SheetClose>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

export function NavSpacer() {
  return <div aria-hidden="true" className="h-16" />
}

export { X }

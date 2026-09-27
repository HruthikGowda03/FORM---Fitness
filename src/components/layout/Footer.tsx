import { Link } from 'react-router-dom'

import { FormMark } from '@/components/layout/Brand'
import { NAV_LINKS } from '@/components/layout/Nav'

const RESOURCES = [
  { to: '/learn', label: 'Knowledge centre' },
  { to: '/explore', label: 'Food database' },
  { to: '/onboarding', label: 'Build a plan' },
  { to: '/settings', label: 'Settings' },
]

export function Footer() {
  return (
    <footer className="relative mt-24 border-t border-line bg-bg-sunken">
      <div className="mx-auto w-full max-w-app px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <FormMark />
              <span className="display-face text-xl text-ink">FORM</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              Fuel Your Transformation. A transparent, open-source nutrition planning tool that shows
              its working and stays honest about its limits.
            </p>
          </div>

          <nav aria-label="Application">
            <h2 className="eyebrow text-faint">Application</h2>
            <ul className="mt-4 space-y-2.5">
              {NAV_LINKS.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="link-wipe inline-block text-sm text-muted transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Resources">
            <h2 className="eyebrow text-faint">Resources</h2>
            <ul className="mt-4 space-y-2.5">
              {RESOURCES.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="link-wipe inline-block text-sm text-muted transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-14 border-t border-line pt-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <p className="max-w-2xl text-xs leading-relaxed text-faint">
              <strong className="font-semibold text-muted">FORM is an educational prototype, not
              medical advice.</strong>{' '}
              It estimates energy needs with published equations and those estimates are not exact.
              Nutrition values in the food database are rounded approximations. Talk to a doctor or
              a registered dietitian before making significant changes to how you eat, especially if
              you are under 18, pregnant or breastfeeding, managing a medical condition, or have a
              history of disordered eating.
            </p>
            <p className="shrink-0 font-mono text-[0.625rem] tracking-[0.18em] text-faint uppercase">
              MIT Licensed · No tracking
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}

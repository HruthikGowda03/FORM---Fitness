/* ==========================================================================
   Back button — rendered behaviour
   ---------------------------------------------------------------------------
   The unit tests in navigation.test.ts cover the destination *logic*. This
   file covers the part that only shows up when it renders: that the control
   appears where it should, that it is absent where it must be, that its
   accessible name says where it goes, and that clicking it actually navigates.

   Rendered through a real MemoryRouter, so the assertions are about the
   component's observable behaviour rather than its internals.
   ========================================================================== */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { BackButton } from '@/components/layout/BackButton'
import { recordVisit, resetNavHistory } from '@/lib/nav-history'

/** Renders the current pathname so a click's effect is observable. */
function PathProbe() {
  const location = useLocation()
  return <p data-testid="path">{location.pathname}</p>
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BackButton />
      <PathProbe />
      <Routes>
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  )
}

const path = () => screen.getByTestId('path').textContent

beforeEach(() => {
  resetNavHistory()
})

afterEach(() => {
  resetNavHistory()
})

describe('BackButton', () => {
  it('renders on an internal route', () => {
    renderAt('/planner')
    expect(screen.getByRole('button', { name: /back to/i })).toBeInTheDocument()
  })

  it('does not render on the landing page', () => {
    // The brief is explicit: no Back on the home page.
    renderAt('/')
    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument()
  })

  it('names the logical parent when there is no history', () => {
    // Deep link: the visit stack knows nothing, so the parent route is used.
    renderAt('/grocery')
    expect(
      screen.getByRole('button', { name: 'Back to your dashboard' }),
    ).toBeInTheDocument()
  })

  it('sends an article to the article list', () => {
    renderAt('/learn/protein')
    expect(
      screen.getByRole('button', { name: 'Back to the knowledge centre' }),
    ).toBeInTheDocument()
  })

  it('sends the dashboard to the home page', () => {
    renderAt('/dashboard')
    expect(
      screen.getByRole('button', { name: 'Back to the home page' }),
    ).toBeInTheDocument()
  })

  it('has a visible label as well as the accessible name', () => {
    // WCAG 2.5.3 Label in Name: the accessible name must contain the visible
    // text, so someone who can see "Back" and a screen reader announcing
    // something else is never a contradiction.
    renderAt('/planner')
    const button = screen.getByRole('button', { name: 'Back to your dashboard' })
    expect(button).toHaveTextContent('Back')
  })

  it('navigates to the logical parent when clicked on a deep link', async () => {
    const user = userEvent.setup()
    renderAt('/grocery')
    await user.click(screen.getByRole('button', { name: /back to/i }))
    expect(path()).toBe('/dashboard')
  })

  it('offers a real destination on the wizard, which used to have none', async () => {
    // Step 1 of onboarding has no previous *step*, so the only way off the page
    // is the page-level Back. It used to be a one-way door.
    const user = userEvent.setup()
    renderAt('/onboarding')
    const button = screen.getByRole('button', { name: 'Back to the home page' })
    expect(button).toBeInTheDocument()
    await user.click(button)
    expect(path()).toBe('/')
  })

  it('prefers the page the user actually came from', () => {
    // Simulates /dashboard then /planner, so the journey has a real previous.
    recordVisit('/dashboard')
    recordVisit('/explore')
    renderAt('/explore')
    expect(
      screen.getByRole('button', { name: 'Back to your dashboard' }),
    ).toBeInTheDocument()
  })

  it('falls back to the parent when the previous page is the wizard', () => {
    // Landing → wizard → dashboard. Going back into a finished wizard would
    // drop the user into the middle of an edit session, so it is refused.
    recordVisit('/')
    recordVisit('/onboarding')
    recordVisit('/dashboard')
    renderAt('/dashboard')
    expect(
      screen.getByRole('button', { name: 'Back to the home page' }),
    ).toBeInTheDocument()
  })

  it('falls back to the parent when the previous page is this one', () => {
    // Revisiting the page you just left must not offer a loop.
    recordVisit('/progress')
    recordVisit('/grocery')
    recordVisit('/progress')
    renderAt('/progress')
    expect(
      screen.getByRole('button', { name: 'Back to your dashboard' }),
    ).toBeInTheDocument()
  })

  it('ignores history on a screen reached by a redirect', () => {
    // Deep-link to /grocery with no profile and you land on the picker. If the
    // picker offered history back to /grocery, the click would go to /grocery,
    // which redirects straight back here - a loop with no way out.
    recordVisit('/grocery')
    render(
      <MemoryRouter initialEntries={['/profiles']}>
        <BackButton forceFallback />
        <PathProbe />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('button', { name: 'Back to the home page' }),
    ).toBeInTheDocument()
  })

  it('offers a working way off the picker', async () => {
    const user = userEvent.setup()
    renderAt('/profiles')
    await user.click(screen.getByRole('button', { name: 'Back to the home page' }))
    expect(path()).toBe('/')
  })
})

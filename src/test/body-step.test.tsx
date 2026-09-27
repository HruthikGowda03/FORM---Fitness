/* ==========================================================================
   Height and weight, in the real body step
   ---------------------------------------------------------------------------
   `number-field.test.tsx` covers the input in isolation. This covers the part
   that was actually broken in the app: the body step's handlers were

       onChange={(v) => v !== undefined && set('heightCm', v)}

   so clearing the box was discarded and the pre-filled 170 cm stayed in the
   draft. Even once the input could be emptied, submitting would have quietly
   used 170 — so the step now tracks the empty state and refuses to pass.
   ========================================================================== */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

import { OnboardingPage } from '@/pages/OnboardingPage'
import { AppStoreProvider } from '@/store/AppStore'
import { ONBOARDING_KEY } from '@/lib/storage'

function renderWizard() {
  return render(
    <MemoryRouter initialEntries={['/onboarding']}>
      <AppStoreProvider>
        <OnboardingPage />
      </AppStoreProvider>
    </MemoryRouter>,
  )
}

/**
 * Advance to the body step, which holds height and weight.
 *
 * Via Continue rather than the step pills: the pills are `disabled` for any
 * step ahead of the current one, so they can only be used to go back.
 *
 * Waits for the height field itself rather than the "STEP 2 OF 9" counter. The
 * counter is outside the step transition and updates immediately, while the
 * outgoing step is still animating out — so waiting on it returns before the
 * body step has mounted.
 */
async function goToBody(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /^continue$/i }))
  await screen.findByLabelText(/^height$/i, undefined, { timeout: 4000 })
}

const height = () => screen.getByLabelText(/^height$/i) as HTMLInputElement
const weight = () => screen.getByLabelText(/current weight/i) as HTMLInputElement

beforeEach(() => {
  window.localStorage.clear()
})

describe('the body step', () => {
  it('shows the height and weight it is going to use', async () => {
    const user = userEvent.setup()
    renderWizard()
    await goToBody(user)

    // Pre-filled, which is exactly why clearing has to work.
    expect(height().value).toBe('170')
    expect(weight().value).toBe('65')
  })


  it('can be emptied, digit by digit, and refilled', async () => {
    const user = userEvent.setup()
    renderWizard()
    await goToBody(user)

    await user.clear(height())
    expect(height().value).toBe('')

    await user.type(height(), '185')
    expect(height().value).toBe('185')
  })

  it('empties by backspacing to the last digit', async () => {
    const user = userEvent.setup()
    renderWizard()
    await goToBody(user)

    await user.clear(height())
    await user.type(height(), '185')
    expect(height().value).toBe('185')

    await user.keyboard('{Backspace}{Backspace}{Backspace}')
    expect(height().value).toBe('')
  })

  it('refuses to continue with the height cleared, instead of using 170', async () => {
    const user = userEvent.setup()
    renderWizard()
    await goToBody(user)

    await user.clear(height())
    await user.click(screen.getByRole('button', { name: /^continue$/i }))

    expect(await screen.findByText(/enter your height/i)).toBeInTheDocument()
    // Still on the body step, so the wizard did not proceed on a default.
    expect(screen.getByText(/step 2 of 9/i)).toBeInTheDocument()
    expect(height().getAttribute('aria-invalid')).toBe('true')
  })

  it('refuses to continue with the weight cleared, instead of using 65', async () => {
    const user = userEvent.setup()
    renderWizard()
    await goToBody(user)

    await user.clear(weight())
    await user.click(screen.getByRole('button', { name: /^continue$/i }))

    expect(await screen.findByText(/enter your weight/i)).toBeInTheDocument()
  })

  it('still rejects a value that is out of range', async () => {
    const user = userEvent.setup()
    renderWizard()
    await goToBody(user)

    // Not clamped while typing; checked on submit.
    await user.clear(height())
    await user.type(height(), '95')
    expect(height().value).toBe('95')

    await user.click(screen.getByRole('button', { name: /^continue$/i }))
    expect(await screen.findByText(/between 120 and 230/i)).toBeInTheDocument()
  })

  it('accepts a new height and weight and moves on', async () => {
    const user = userEvent.setup()
    renderWizard()
    await goToBody(user)

    await user.clear(height())
    await user.type(height(), '182')
    await user.clear(weight())
    await user.type(weight(), '74.5')

    await user.click(screen.getByRole('button', { name: /^continue$/i }))

    // The body step passed, so it advanced to the next one.
    expect(await screen.findByText(/step 3 of 9/i)).toBeInTheDocument()
    // And the new numbers are what got saved as the in-progress draft.
    await waitForDraft({ heightCm: 182, weightKg: 74.5 })
  })
})

/** Read the autosaved draft, which is what the finished wizard will commit. */
async function waitForDraft(expected: Record<string, number>) {
  const { waitFor } = await import('@testing-library/react')
  await waitFor(() => {
    const raw = window.localStorage.getItem(ONBOARDING_KEY)
    expect(raw).toBeTruthy()
    const draft = JSON.parse(raw as string) as Record<string, number>
    for (const [k, v] of Object.entries(expected)) {
      // Compared with a tolerance rather than rounded: rounding 74.5 to 75 is
      // how this assertion hid a real value in the first place.
      expect(draft[k]).toBeCloseTo(v, 1)
    }
  })
}

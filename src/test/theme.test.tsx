/* ==========================================================================
   Theme switching
   ---------------------------------------------------------------------------
   The reported bug: the toggle did not switch the theme.

   It wrote to `Profile.theme` via `setProfile`, and that reducer returns the
   profile untouched when there is no nutrition profile — which is true on the
   landing page, on the profile gate, and for the whole of onboarding. So the
   click was accepted, nothing was stored, and the screen looked identical.

   The theme is device state now, saved under its own key, so it applies
   everywhere and survives a refresh without a profile existing.
   ========================================================================== */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { AppStoreProvider } from '@/store/AppStore'
import { THEME_KEY, loadThemePref } from '@/lib/storage'
import { ThemeProvider, useTheme, useThemeControls } from '@/components/layout/ThemeProvider'
import type { ThemePref } from '@/types'

/**
 * The toggle as the nav renders it: reads the current theme, flips it, and
 * shows which one is active — so the test drives the same control the user
 * clicks rather than a hand-rolled button.
 */
function Toggle() {
  const { theme } = useTheme()
  const { setTheme } = useThemeControls()
  const next: ThemePref = theme === 'dark' ? 'light' : 'dark'
  return (
    <button type="button" onClick={() => setTheme(next)}>
      {theme}
    </button>
  )
}

/** No profile exists here — that is the whole point of the test. */
function renderApp() {
  return render(
    <AppStoreProvider>
      <ThemeProvider>
        <Toggle />
      </ThemeProvider>
    </AppStoreProvider>,
  )
}

const active = () => screen.getByRole('button').textContent

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.className = ''
})

describe('theme switching with no profile open', () => {
  it('starts dark', () => {
    renderApp()
    expect(active()).toBe('dark')
  })

  it('switches to light, which is where the old toggle silently failed', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button'))

    expect(active()).toBe('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('switches back to dark', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button'))
    expect(active()).toBe('light')

    await user.click(screen.getByRole('button'))
    expect(active()).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.classList.contains('light')).toBe(false)
  })

  it('persists the choice so a refresh keeps it', async () => {
    const user = userEvent.setup()
    const first = renderApp()

    await user.click(screen.getByRole('button'))
    expect(loadThemePref()).toBe('light')
    first.unmount()

    // A refresh: a brand new provider over the same storage.
    renderApp()
    expect(active()).toBe('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)
  })

  it('persists a return to dark too', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem(THEME_KEY, 'light')
    const first = renderApp()

    await user.click(screen.getByRole('button'))
    expect(loadThemePref()).toBe('dark')
    first.unmount()

    renderApp()
    expect(active()).toBe('dark')
  })

  it('keeps the browser chrome in step with the theme', async () => {
    const user = userEvent.setup()
    renderApp()

    await user.click(screen.getByRole('button'))
    expect(document.documentElement.style.colorScheme).toBe('light')

    await user.click(screen.getByRole('button'))
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('adopts a stored preference on first load', () => {
    // As if the tab had been refreshed while light was active.
    window.localStorage.setItem(THEME_KEY, 'light')
    renderApp()
    expect(active()).toBe('light')
  })

  it('stores the preference under its own key, not in the profile', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button'))

    expect(window.localStorage.getItem(THEME_KEY)).toBe('light')
    // Nothing may be written into the app state, because with no profile open
    // that write is exactly what used to be dropped on the floor.
    expect(window.localStorage.getItem('form.state.v4')).toBeNull()
  })
})

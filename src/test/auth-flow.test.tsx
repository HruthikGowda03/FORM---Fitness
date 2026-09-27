/* ==========================================================================
   Local profile sign-in — the whole flow
   ---------------------------------------------------------------------------
   First-time create → log out → returning sign-in, driven through the real
   store, the real `localStorage`, and the real component. Not a mock of any
   of them, because the bug this replaces was a disagreement between the three:
   the PIN could be skipped, so there was often nothing to sign back into, and
   the name existed only to tell two people apart in a list.

   jsdom's WebCrypto is available, so `hashPin`/`verifyPin` take their real
   SHA-256 path rather than the insecure-context fallback.
   ========================================================================== */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter, useLocation } from 'react-router-dom'

import { ProfileGate } from '@/components/auth/ProfileGate'
import { AppStoreProvider, useActions } from '@/store/AppStore'
import { STORAGE_KEY, loadState } from '@/lib/storage'
import { defaultProfile } from '@/lib/defaults'
import {
  NAME_MAX,
  findByName,
  isNameTaken,
  loginMessage,
  normaliseName,
  validateName,
} from '@/lib/auth'

/* --------------------------------------------------------------------------
   Harness
   -------------------------------------------------------------------------- */

function PathProbe() {
  return <span data-testid="path">{useLocation().pathname}</span>
}

/** A button that signs out, standing in for the Settings control. */
function SignOutButton() {
  const { closeProfile } = useActions()
  return (
    <button type="button" onClick={closeProfile}>
      Log out
    </button>
  )
}

/**
 * Stands in for finishing the nine-step wizard.
 *
 * Uses the app's own `defaultProfile` rather than a hand-written literal, so the
 * fixture cannot drift out of sync with the `Profile` type — an earlier version
 * of this file listed every field by hand and stopped compiling the moment one
 * was added.
 *
 * It has to live *inside the same provider* as the screen under test — an
 * earlier version of this file rendered a second store to reach the action,
 * which quietly tested a store nobody was looking at.
 */
function FinishWizard() {
  const { completeOnboarding } = useActions()
  return (
    <button
      type="button"
      onClick={() => completeOnboarding({ ...defaultProfile(), isAdult: true, age: 30 })}
    >
      Finish wizard
    </button>
  )
}

function renderGate() {
  return render(
    <MemoryRouter initialEntries={['/profiles']}>
      <AppStoreProvider>
        <ProfileGate />
        <SignOutButton />
        <FinishWizard />
        <PathProbe />
      </AppStoreProvider>
    </MemoryRouter>,
  )
}

const path = () => screen.getByTestId('path').textContent

/**
 * Read what is actually on disk, once the store's write has landed.
 *
 * The provider debounces saves by 300ms so rapid typing does not serialise the
 * whole state on every keystroke, so an immediate `loadState()` legitimately
 * sees the previous value. It also writes the empty state on mount, which means
 * "a state exists" is not the same as "the profile exists" — hence a separate
 * helper that waits for a profile count.
 */
async function waitForStored() {
  return waitFor(() => {
    const s = loadState()
    expect(s).not.toBeNull()
    return s
  })
}

/** Wait for a profile count on disk, then return the state. */
async function waitForProfileCount(n: number) {
  return waitFor(() => {
    const s = loadState()
    expect(s?.profiles).toHaveLength(n)
    return s
  })
}

/** Finish onboarding, so the profile has a plan and belongs on the dashboard. */
async function finishWizard(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /finish wizard/i }))
  await waitFor(() => expect(loadState()?.profiles[0].onboardingComplete).toBe(true))
}

async function createProfile(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  pin: string,
) {
  await user.type(screen.getByLabelText(/^name$/i), name)
  await user.type(screen.getByLabelText(/^pin$/i), pin)
  await user.type(screen.getByLabelText(/confirm pin/i), pin)
  await user.click(screen.getByRole('button', { name: /create profile/i }))
}

async function signIn(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
  pin: string,
) {
  await user.type(screen.getByLabelText(/^name$/i), name)
  await user.type(screen.getByLabelText(/^pin$/i), pin)
  await user.click(screen.getByRole('button', { name: /open my plan/i }))
}

beforeEach(() => {
  window.localStorage.clear()
})

/* --------------------------------------------------------------------------
   Name matching — the rule the sign-in form depends on
   -------------------------------------------------------------------------- */

describe('matching a typed name to a profile', () => {
  const profiles = [
    { id: '1', name: 'Priya' },
    { id: '2', name: 'Dad' },
  ] as never as Parameters<typeof findByName>[0]

  it('ignores case and surrounding space', () => {
    // Someone who saw "Priya" on a button and typed "priya" must not be told
    // their PIN is wrong on a profile that plainly exists.
    expect(findByName(profiles, 'priya')?.id).toBe('1')
    expect(findByName(profiles, '  PRIYA  ')?.id).toBe('1')
    expect(findByName(profiles, 'Dad')?.id).toBe('2')
  })

  it('returns null for an unknown or empty name', () => {
    expect(findByName(profiles, 'Sam')).toBeNull()
    expect(findByName(profiles, '   ')).toBeNull()
  })

  it('stops two profiles sharing a name', () => {
    // Otherwise the sign-in is ambiguous and the second profile is unreachable
    // by name — only by clicking its tile, which needs a PIN anyway.
    expect(isNameTaken(profiles, 'priya')).toBe(true)
    expect(isNameTaken(profiles, 'PRIYA')).toBe(true)
    expect(isNameTaken(profiles, 'Sam')).toBe(false)
  })

  it('lets a profile keep its own name when renaming', () => {
    expect(isNameTaken(profiles, 'Priya', '1')).toBe(false)
  })

  it('normalises consistently', () => {
    expect(normaliseName('  Priya ')).toBe('priya')
  })

  it('validates the name', () => {
    expect(validateName('')).toMatch(/enter a name/i)
    expect(validateName('   ')).toMatch(/enter a name/i)
    expect(validateName('a'.repeat(NAME_MAX + 1))).toMatch(/under 40/i)
    expect(validateName('Priya')).toBeNull()
  })

  it('never says "wrong PIN" for a name that does not exist', () => {
    // The likeliest cause on a shared device is a typo, not a stranger, and
    // blaming the PIN sends people hunting for the wrong problem.
    expect(loginMessage('unknown-name', 'Sam')).toMatch(/no profile called/i)
    expect(loginMessage('wrong-pin', 'Priya')).toMatch(/does not match/i)
  })
})

/* --------------------------------------------------------------------------
   First run
   -------------------------------------------------------------------------- */

describe('first run, no profiles on the device', () => {
  it('asks to create a profile rather than to sign in', () => {
    renderGate()
    expect(
      screen.getByRole('heading', { name: /create your profile/i }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText(/confirm pin/i)).toBeInTheDocument()
  })

  it('creates the profile and sends a new one to the wizard', async () => {
    const user = userEvent.setup()
    renderGate()
    await createProfile(user, 'Priya', '1234')

    // A brand-new profile has no plan, so the wizard is the only useful next
    // screen. Going to the dashboard would look like an empty broken app.
    await waitFor(() => expect(path()).toBe('/onboarding'))
  })

  it('persists the profile and its PIN to localStorage', async () => {
    const user = userEvent.setup()
    renderGate()
    await createProfile(user, 'Priya', '1234')
    await waitFor(() => expect(path()).toBe('/onboarding'))

    const stored = await waitForProfileCount(1)
    expect(stored?.profiles[0].name).toBe('Priya')
    // Hashed, never plaintext — the whole reason for the salt.
    expect(stored?.profiles[0].pinHash).toBeTruthy()
    expect(stored?.profiles[0].pinHash).not.toContain('1234')
    expect(window.localStorage.getItem(STORAGE_KEY)).not.toContain('1234')
  })

  it('requires the two PINs to match', async () => {
    const user = userEvent.setup()
    renderGate()
    await user.type(screen.getByLabelText(/^name$/i), 'Priya')
    await user.type(screen.getByLabelText(/^pin$/i), '1234')
    await user.type(screen.getByLabelText(/confirm pin/i), '9999')
    await user.click(screen.getByRole('button', { name: /create profile/i }))

    expect(await screen.findByText(/two PINs do not match/i)).toBeInTheDocument()
    expect(path()).toBe('/profiles')
    expect((await waitForStored())?.profiles ?? []).toHaveLength(0)
  })

  it('rejects a PIN that is too short', async () => {
    const user = userEvent.setup()
    renderGate()
    await user.type(screen.getByLabelText(/^name$/i), 'Priya')
    await user.type(screen.getByLabelText(/^pin$/i), '12')
    await user.type(screen.getByLabelText(/confirm pin/i), '12')
    await user.click(screen.getByRole('button', { name: /create profile/i }))

    expect(await screen.findByText(/must be 4–12 digits/i)).toBeInTheDocument()
    expect((await waitForStored())?.profiles ?? []).toHaveLength(0)
  })

  it('rejects a duplicate name rather than making sign-in ambiguous', async () => {
    const user = userEvent.setup()
    const first = userEvent.setup()
    renderGate()
    await createProfile(first, 'Priya', '1234')
    await waitFor(() => expect(path()).toBe('/onboarding'))

    // Back to the gate with a profile present, into create mode.
    await user.click(screen.getByRole('button', { name: /log out/i }))
    await user.click(screen.getByRole('button', { name: /add someone else/i }))
    await user.type(screen.getByLabelText(/^name$/i), 'priya')
    await user.type(screen.getByLabelText(/^pin$/i), '5678')
    await user.type(screen.getByLabelText(/confirm pin/i), '5678')
    await user.click(screen.getByRole('button', { name: /create profile/i }))

    expect(await screen.findByText(/already exists on this device/i)).toBeInTheDocument()
    expect((await waitForProfileCount(1))?.profiles).toHaveLength(1)
  })
})

/* --------------------------------------------------------------------------
   The flow the brief asks about: create → log out → sign back in
   -------------------------------------------------------------------------- */

describe('logging out and coming back', () => {
  it('goes create → log out → welcome back → dashboard', async () => {
    const user = userEvent.setup()
    renderGate()

    // 1. First run: no profiles, so the screen offers creation.
    expect(
      screen.getByRole('heading', { name: /create your profile/i }),
    ).toBeInTheDocument()
    await createProfile(user, 'Priya', '1234')
    await waitFor(() => expect(path()).toBe('/onboarding'))

    // 2. Give the profile a plan, the way finishing the wizard would.
    await finishWizard(user)

    // 3. Log out.
    await user.click(screen.getByRole('button', { name: /log out/i }))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument(),
    )
    expect((await waitForProfileCount(1))?.profiles).toHaveLength(1)

    // 4. Sign back in with the name and PIN, and land on the plan.
    await signIn(user, 'Priya', '1234')
    await waitFor(() => expect(path()).toBe('/dashboard'))
  })

  it('accepts a different case on the way back in', async () => {
    const user = userEvent.setup()
    renderGate()
    await createProfile(user, 'Priya', '1234')
    await waitFor(() => expect(path()).toBe('/onboarding'))
    await user.click(screen.getByRole('button', { name: /log out/i }))

    await signIn(user, 'pRiYa', '1234')
    await waitFor(() => expect(path()).toBe('/onboarding'))
  })

  it('refuses a wrong PIN and stays signed out', async () => {
    const user = userEvent.setup()
    renderGate()
    await createProfile(user, 'Priya', '1234')
    await waitFor(() => expect(path()).toBe('/onboarding'))
    await user.click(screen.getByRole('button', { name: /log out/i }))

    await signIn(user, 'Priya', '9999')
    expect(await screen.findByText(/does not match/i)).toBeInTheDocument()
    // Still on the sign-in screen, and still locked: the profile must not have
    // been half-opened by a failed attempt.
    expect(
      screen.getByRole('heading', { name: /welcome back/i }),
    ).toBeInTheDocument()
    expect((await waitForStored())?.activeProfileId).toBe('')
  })

  it('says so when the name is not on this device', async () => {
    const user = userEvent.setup()
    renderGate()
    await createProfile(user, 'Priya', '1234')
    await waitFor(() => expect(path()).toBe('/onboarding'))
    await user.click(screen.getByRole('button', { name: /log out/i }))

    await signIn(user, 'Sam', '1234')
    expect(await screen.findByText(/no profile called/i)).toBeInTheDocument()
    expect((await waitForStored())?.activeProfileId).toBe('')
  })

  it('rejects a malformed PIN without treating it as wrong-but-valid', async () => {
    const user = userEvent.setup()
    renderGate()
    await createProfile(user, 'Priya', '1234')
    await waitFor(() => expect(path()).toBe('/onboarding'))
    await user.click(screen.getByRole('button', { name: /log out/i }))

    await signIn(user, 'Priya', '12')
    expect(await screen.findByText(/must be 4–12 digits/i)).toBeInTheDocument()
  })

  it('keeps the data through a log out and sign in', async () => {
    const user = userEvent.setup()
    renderGate()
    await createProfile(user, 'Priya', '1234')
    await waitFor(() => expect(path()).toBe('/onboarding'))

    const before = await waitForProfileCount(1)
    const id = before?.profiles[0].id
    await user.click(screen.getByRole('button', { name: /log out/i }))
    await signIn(user, 'Priya', '1234')
    await waitFor(() => expect(path()).toBe('/onboarding'))

    // Wait for the sign-in to reach disk. Waiting on the profile *count* would
    // pass immediately, because the count is already 1 while signed out.
    const after = await waitFor(() => {
      const s = loadState()
      expect(s?.activeProfileId).toBe(id)
      return s
    })
    // Same profile id, so the plan written before logging out is still there.
    expect(after?.profiles[0].id).toBe(id)
  })
})

/* --------------------------------------------------------------------------
   Telling the user what this is
   -------------------------------------------------------------------------- */

describe('the screen does not pretend to be an online account', () => {
  it('says the data is local, on this device', () => {
    renderGate()
    expect(
      screen.getByText(/not an online account/i),
    ).toBeInTheDocument()
  })

  it('says there is no recovery, so a forgotten PIN is honest', async () => {
    const user = userEvent.setup()
    renderGate()
    await createProfile(user, 'Priya', '1234')
    await waitFor(() => expect(path()).toBe('/onboarding'))
    await user.click(screen.getByRole('button', { name: /log out/i }))

    await user.click(screen.getByRole('button', { name: /forgotten the pin/i }))
    expect(
      await screen.findByText(/no reset and no recovery/i),
    ).toBeInTheDocument()
  })

  it('discloses what a PIN is worth when setting one', () => {
    renderGate()
    expect(screen.getByText(/not real security/i)).toBeInTheDocument()
  })
})

/* --------------------------------------------------------------------------
   Legacy profiles
   -------------------------------------------------------------------------- */

describe('a profile created before PINs were required', () => {
  it('can still be opened, and says it had no PIN', async () => {
    // Restoring an old backup must not lock someone out of their own data with
    // no way in, so a null pinHash opens rather than deadlocking.
    const legacy = {
      version: 4,
      activeProfileId: '',
      profiles: [
        {
          id: 'legacy-1',
          name: 'Old Timer',
          createdAt: '2025-01-01T00:00:00.000Z',
          lastOpenedAt: '2025-01-01T00:00:00.000Z',
          pinHash: null,
          avatarIndex: 0,
          profile: null,
          plan: null,
          logs: {},
          progress: [],
          grocery: [],
          customFoods: [],
          onboardingComplete: false,
        },
      ],
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy))

    const user = userEvent.setup()
    renderGate()
    expect(
      screen.getByRole('heading', { name: /welcome back/i }),
    ).toBeInTheDocument()
    // Labelled honestly rather than shown as if it were locked.
    expect(screen.getByText(/no pin — opens straight away/i)).toBeInTheDocument()

    await signIn(user, 'Old Timer', 'anything')
    await waitFor(() => expect(path()).toBe('/onboarding'))
  })
})

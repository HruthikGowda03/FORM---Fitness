/* ==========================================================================
   FORM — local profile sign-in
   ---------------------------------------------------------------------------
   WHY THIS IS NOT A LOGIN PAGE
   There is no server, so nothing here can authenticate anyone against anything
   external. A form asking for an email and password would be a lie: it would
   accept any input, store the password in plaintext, and imply a protection
   that does not exist. That is a real harm in a health app, so it is not built.

   What IS built solves the actual need: several people sharing one device, each
   keeping their own plan. Each profile is fully separate and PIN-locked, and
   the limit of what the PIN protects is stated on screen rather than implied.

   TWO STATES, ONE SCREEN
   - No profiles on this device: "Create your profile" — name, PIN, confirm.
   - Profiles exist and none is open: "Welcome back" — name and PIN.

   The split is the whole point of the redesign. Previously a PIN could be
   skipped, so most profiles had none and there was nothing to "come back" to;
   the name existed only to tell two people apart in a list. Now a PIN is part
   of creating a profile, so the returning visit has something to verify and
   the name is a genuine identifier.
   ========================================================================== */

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight, KeyRound, Lock, LogIn, Plus, ShieldOff, Trash2, UserRound } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { BrandLockup } from '@/components/layout/Brand'
import { BackButton } from '@/components/layout/BackButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Callout } from '@/components/ui/separator'
import { cn } from '@/lib/cn'
import { EASE } from '@/lib/motion'
import { NAME_MAX, isNameTaken, loginMessage, validateName } from '@/lib/auth'
import { PIN_DISCLOSURE, PIN_MAX, PIN_MIN, isValidPin } from '@/lib/pin'
import { relativeDay } from '@/lib/format'
import { useActions, useAppState } from '@/store/AppStore'
import { AVATAR_COUNT, type LocalProfile } from '@/types'

type Mode = 'create' | 'login'

/** PINs are digits only, and never longer than PIN_MAX. */
function digitsOnly(v: string): string {
  return v.replace(/\D/g, '').slice(0, PIN_MAX)
}

export function ProfileGate() {
  const { profiles } = useAppState()
  const { createProfile, login, selectProfile, removeProfile } = useActions()
  const navigate = useNavigate()
  const reduce = useReducedMotion()

  /*
    With no profiles there is nothing to come back to, so the only honest thing
    to offer is creation. Once one exists, the screen is a sign-in.
  */
  const [mode, setMode] = useState<Mode>(profiles.length === 0 ? 'create' : 'login')

  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [avatar, setAvatar] = useState(0)
  const [error, setError] = useState('')
  const [showRecovery, setShowRecovery] = useState(false)
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState<LocalProfile | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const pinRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    document.title =
      mode === 'create' ? 'Create your profile — FORM' : 'Welcome back — FORM'
    return () => {
      document.title = 'FORM — Fuel Your Transformation'
    }
  }, [mode])

  // Keep the mode honest if a profile is created or the last one is removed.
  useEffect(() => {
    setMode(profiles.length === 0 ? 'create' : 'login')
  }, [profiles.length])

  useEffect(() => {
    setError('')
    setPin('')
    setConfirm('')
    window.setTimeout(() => nameRef.current?.focus(), 80)
  }, [mode])

  /**
   * Where to go once a profile is open.
   *
   * The wizard writes its answers onto the profile, so a profile that has not
   * been through it yet belongs in the wizard — and `replace`, because reaching
   * the wizard is the next step of the journey rather than a new page to be able
   * to navigate back to.
   */
  const enter = (needsOnboarding: boolean) => {
    navigate(needsOnboarding ? '/onboarding' : '/dashboard', { replace: true })
  }

  const submitCreate = async () => {
    const nameError = validateName(name)
    if (nameError) {
      setError(nameError)
      nameRef.current?.focus()
      return
    }
    if (isNameTaken(profiles, name)) {
      setError(`“${name.trim()}” already exists on this device. Use a different name.`)
      nameRef.current?.focus()
      return
    }
    if (!isValidPin(pin)) {
      setError(`The PIN must be ${PIN_MIN}–${PIN_MAX} digits.`)
      pinRef.current?.focus()
      return
    }
    if (pin !== confirm) {
      setError('The two PINs do not match.')
      return
    }

    setBusy(true)
    try {
      await createProfile({ name: name.trim(), pin, avatarIndex: avatar })
      // A brand-new profile has no plan, so it belongs in the wizard. Sending it
      // to the dashboard instead would show an empty app and read as a failure.
      clearSecret({ name: true })
      enter(true)
    } finally {
      setBusy(false)
    }
  }

  const submitLogin = async () => {
    const nameError = validateName(name)
    if (nameError) {
      setError(nameError)
      nameRef.current?.focus()
      return
    }

    setBusy(true)
    try {
      const result = await login(name, pin)
      if (!result.ok) {
        clearSecret({ name: false })
        setError(loginMessage(result.reason, name))
        pinRef.current?.focus()
        return
      }
      clearSecret({ name: true })
      enter(result.needsOnboarding)
    } finally {
      setBusy(false)
    }
  }

  const openWithoutPin = async (p: LocalProfile) => {
    setBusy(true)
    try {
      await selectProfile(p.id)
      enter(!p.onboardingComplete)
    } finally {
      setBusy(false)
    }
  }

  /**
   * Clear the PIN, always, and the name once it is no longer needed.
   *
   * Two reasons, and the second is the important one. Practically, this screen
   * does not unmount when a profile is created — the router has no matching
   * route for `/onboarding`, so the component stays mounted and every field
   * keeps its value. Without this, the next sign-in starts with the previous
   * person's name already in the box and a PIN still sitting in the DOM.
   *
   * The name is deliberately kept on failure: nobody should have to retype it
   * to fix a mistyped PIN.
   */
  const clearSecret = (opts: { name: boolean }) => {
    setPin('')
    setConfirm('')
    if (opts.name) setName('')
  }

  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div className="absolute inset-x-0 top-0 h-[70vh] bloom-lime opacity-60" />
      </div>

      <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 py-16 sm:px-6">
        {/*
          A real route now, so it has somewhere to go back to. `forceFallback`
          because this screen is usually *reached by* a redirect: offering
          history back would send the user to the app route that bounced them
          here, which would bounce them straight back.
        */}
        <div className="flex flex-1 flex-col justify-center">
          <BackButton forceFallback className="self-start" />

          <div className="mt-10 flex flex-col items-center text-center">
            <BrandLockup />
            <AnimatePresence initial={false}>
              <motion.div
                key={mode}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: EASE.out }}
              >
                <p className="eyebrow mt-8 text-accent">
                  {mode === 'create' ? 'Set up this device' : 'This device only'}
                </p>
                <h1 className="display-face mt-3 text-display-md">
                  {mode === 'create' ? 'Create your profile.' : 'Welcome back.'}
                </h1>
                <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-muted">
                  {mode === 'create'
                    ? 'Your plan, meals, logs and progress are stored in this browser. No account, no email, nothing sent anywhere.'
                    : 'Enter the name and PIN you set up on this device to load your plan, meals and progress.'}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/*
            ONE form, with the create-only fields appearing inside it.

            The obvious alternative is two forms swapped by AnimatePresence, and
            it is wrong twice over. `mode="wait"` holds the new form back until
            the old one finishes leaving, so the fields you are about to type
            into are not there yet; and in the default mode both forms are in
            the DOM at once, which duplicates every `id` — two elements called
            `auth-name`, so a label points at the wrong input for half of every
            transition. Keeping one form sidesteps both.
          */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void (mode === 'create' ? submitCreate() : submitLogin())
            }}
            className="mt-8"
          >
            <div className="border border-line bg-surface p-6 sm:p-7">
              <div>
                <Label htmlFor="auth-name" className="mb-2">
                  Name
                </Label>
                <Input
                  id="auth-name"
                  ref={nameRef}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    setError('')
                  }}
                  placeholder="e.g. Priya, or Dad"
                  maxLength={NAME_MAX}
                  autoComplete="username"
                  enterKeyHint="next"
                  className="text-base"
                />
              </div>

              <div className={cn('mt-5', mode === 'create' && 'grid gap-4 sm:grid-cols-2')}>
                <div>
                  <Label htmlFor="auth-pin" className="mb-2">
                    PIN
                  </Label>
                  <Input
                    id="auth-pin"
                    ref={pinRef}
                    type="password"
                    inputMode="numeric"
                    maxLength={PIN_MAX}
                    value={pin}
                    onChange={(e) => {
                      setPin(digitsOnly(e.target.value))
                      setError('')
                    }}
                    placeholder={mode === 'create' ? `${PIN_MIN}–${PIN_MAX} digits` : '••••'}
                    autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
                    enterKeyHint={mode === 'create' ? 'next' : 'go'}
                    className="num tracking-[0.25em]"
                  />
                </div>

                {/* Only on create. Confirming a PIN is the difference between
                    a typo being caught now and a profile nobody can open
                    later, and there is no reset. */}
                {mode === 'create' && (
                  <div>
                    <Label htmlFor="auth-pin2" className="mb-2">
                      Confirm PIN
                    </Label>
                    <Input
                      id="auth-pin2"
                      type="password"
                      inputMode="numeric"
                      maxLength={PIN_MAX}
                      value={confirm}
                      onChange={(e) => {
                        setConfirm(digitsOnly(e.target.value))
                        setError('')
                      }}
                      autoComplete="new-password"
                      enterKeyHint="go"
                      className="num tracking-[0.25em]"
                    />
                  </div>
                )}
              </div>

              {mode === 'create' && (
                <div className="mt-5">
                  <Label className="mb-2">Colour</Label>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: AVATAR_COUNT }, (_, i) => (
                      <motion.button
                        key={i}
                        type="button"
                        onClick={() => setAvatar(i)}
                        aria-pressed={avatar === i}
                        aria-label={`Colour ${i + 1}`}
                        whileHover={reduce ? undefined : { scale: 1.12 }}
                        whileTap={reduce ? undefined : { scale: 0.94 }}
                        animate={{ scale: avatar === i ? 1.1 : 1 }}
                        transition={{ type: 'spring', stiffness: 520, damping: 30 }}
                        className={cn(
                          'size-9 border',
                          avatar === i
                            ? 'border-accent'
                            : 'border-line hover:border-line-strong',
                        )}
                        style={{ backgroundColor: AVATAR_COLOURS[i] }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/*
                The error sits directly above the submit button, inside the
                form, so it is never scrolled out of reach and never lands
                under the fold on a short viewport.
              */}
              <div className="mt-5 min-h-[1.5rem]">
                <AnimatePresence mode="wait" initial={false}>
                  {error && (
                    <motion.p
                      key={error}
                      id="auth-error"
                      role="alert"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, ease: EASE.out }}
                      className="text-sm text-danger"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <Button type="submit" size="lg" block disabled={busy} className="mt-1">
                {mode === 'create' ? (
                  <>
                    <Plus className="size-4" />
                    Create profile
                  </>
                ) : (
                  <>
                    <LogIn className="size-4" />
                    Open my plan
                  </>
                )}
              </Button>

              {mode === 'create' && (
                <div className="mt-4">
                  <Callout tone="warn">
                    <span className="flex gap-2">
                      <ShieldOff className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      <span>{PIN_DISCLOSURE}</span>
                    </span>
                  </Callout>
                </div>
              )}
            </div>
          </form>

          {/* ---------------- who's on this device ---------------- */}
          {mode === 'login' && profiles.length > 0 && (
            <div className="mt-8">
              <p className="eyebrow text-faint">On this device</p>
              <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {profiles.map((p, i) => (
                  <motion.li
                    key={p.id}
                    initial={reduce ? false : { opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.05, ease: EASE.out }}
                    whileHover={reduce ? undefined : { y: -4 }}
                    className="group edge-sweep"
                  >
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setName(p.name)
                        setError('')
                        if (p.pinHash) {
                          // Still needs the PIN. Filling the name just saves
                          // typing it, which is the only thing a click can
                          // honestly do here.
                          pinRef.current?.focus()
                          return
                        }
                        void openWithoutPin(p)
                      }}
                      className="flex w-full items-center gap-4 border border-line bg-surface p-4 text-left transition-colors hover:border-accent/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-60"
                    >
                      <Avatar index={p.avatarIndex} locked={Boolean(p.pinHash)} />
                      <span className="min-w-0 flex-1">
                        <span className="display-face block truncate text-base text-ink">
                          {p.name || 'Profile'}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {p.pinHash
                            ? p.onboardingComplete
                              ? `Plan ready · ${relativeDay(p.lastOpenedAt.slice(0, 10))}`
                              : 'Not set up yet'
                            : 'No PIN — opens straight away'}
                        </span>
                      </span>
                      <motion.span
                        className="shrink-0 text-faint"
                        whileHover={reduce ? undefined : { x: 4, color: 'var(--color-accent)' }}
                        transition={{ duration: 0.22, ease: EASE.out }}
                      >
                        {p.pinHash ? <Lock className="size-4" /> : <ArrowRight className="size-4" />}
                      </motion.span>
                    </button>
                  </motion.li>
                ))}
              </ul>
            </div>
          )}

          {/* ---------------- switch mode ---------------- */}
          <div className="mt-8 text-center">
            <button
              type="button"
              onClick={() => setMode(mode === 'create' ? 'login' : 'create')}
              className="link-wipe inline-flex items-center gap-1.5 text-sm text-accent"
            >
              {mode === 'create' ? (
                <>
                  <KeyRound className="size-3.5" />
                  Already have a profile? Sign in
                </>
              ) : (
                <>
                  <UserRound className="size-3.5" />
                  Add someone else
                </>
              )}
            </button>
          </div>

          {/*
            The way out of a forgotten PIN.
          */}
          {mode === 'login' && (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => setShowRecovery((v) => !v)}
                aria-expanded={showRecovery}
                className="mx-auto flex items-center gap-1.5 text-xs text-faint transition-colors hover:text-muted"
              >
                <motion.span
                  animate={{ rotate: showRecovery ? 90 : 0 }}
                  transition={{ duration: 0.2, ease: EASE.out }}
                  className="inline-flex"
                >
                  <ArrowRight className="size-3" />
                </motion.span>
                Forgotten the PIN?
              </button>

              <AnimatePresence initial={false}>
                {showRecovery && (
                  <motion.div
                    initial={reduce ? false : { height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={reduce ? undefined : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: EASE.out }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 border border-line bg-surface p-5">
                      <p className="text-sm leading-relaxed text-muted">
                        There is no reset and no recovery — the PIN only exists as a salted hash in
                        this browser, which is exactly why nobody can be tricked into resetting it
                        for you. The only way forward is to delete the profile and build it again.
                        Export a backup from Settings first if the data matters.
                      </p>
                      <ul className="mt-4 grid gap-2">
                        {profiles.map((p) => (
                          <li
                            key={p.id}
                            className="flex items-center justify-between gap-3 border border-line p-3"
                          >
                            <span className="min-w-0 truncate text-sm text-ink">
                              {p.name || 'Profile'}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRemoving(p)}
                            >
                              <Trash2 className="size-3.5" />
                              Remove
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/*
            A second way out that is not a Back button. Someone who landed here by
            following a link into the app may not think of this screen as
            somewhere you navigate *back* from — and the knowledge centre is
            readable without a profile.
          */}
          <p className="mt-5 text-center text-sm text-muted">
            Not ready yet?{' '}
            <Link to="/learn" className="link-wipe inline-block text-accent">
              Read the knowledge centre
            </Link>
            .
          </p>

          <div className="mt-8">
            <Callout tone="muted">
              <strong className="text-ink">This is a local profile, not an online account.</strong>{' '}
              Your name, PIN, plan and logs are stored in this browser on this device. There is no
              server, so nothing is uploaded, nothing syncs, and there is no password reset — if
              the PIN is forgotten the profile has to be deleted and built again. Opening FORM in
              another browser, a private window, or at a different address will show no profiles at
              all.
            </Callout>
          </div>
        </div>
      </div>

      {/* ---------------- remove an unreachable profile ---------------- */}
      <AnimatePresence>
        {removing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 backdrop-blur-sm"
            onClick={() => setRemoving(null)}
          >
            <motion.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="remove-title"
              initial={reduce ? false : { opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: EASE.out }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm border border-line bg-surface p-6"
            >
              <h2 id="remove-title" className="display-face text-lg text-ink">
                Remove “{removing.name}”?
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Their plan, logs and progress are deleted from this browser. This cannot be undone,
                and there is no copy anywhere else.
              </p>
              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Button variant="ghost" onClick={() => setRemoving(null)}>
                  Keep it
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    removeProfile(removing.id)
                    setRemoving(null)
                  }}
                >
                  <Trash2 className="size-4" />
                  Delete permanently
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* --------------------------------------------------------------------------
   Avatar
   -------------------------------------------------------------------------- */

function Avatar({
  index,
  locked,
  className,
}: {
  index: number
  locked?: boolean
  className?: string
}) {
  // The whole tile is a button with a text label, so the avatar is decorative
  // and needs no accessible name of its own.
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative inline-flex size-11 shrink-0 items-center justify-center border border-line',
        className,
      )}
      style={{ backgroundColor: AVATAR_COLOURS[index % AVATAR_COLOURS.length] }}
    >
      <span
        aria-hidden="true"
        className="absolute inset-0 bg-bg-sunken/25 mix-blend-multiply dark:bg-bg-sunken/40"
      />
      {locked && (
        <span className="absolute -right-1.5 -top-1.5 inline-flex size-5 items-center justify-center border border-line bg-ink text-bg">
          <Lock className="size-2.5" />
        </span>
      )}
    </span>
  )
}

/* --------------------------------------------------------------------------
   Avatar colours — moved above their first use so there is no reliance on
   module hoisting order for clarity.
   -------------------------------------------------------------------------- */

/** Distinct hues that stay legible on both the near-black and light surfaces. */
export const AVATAR_COLOURS = [
  '#C8FF3D',
  '#7CC4FF',
  '#FFC46B',
  '#7EE0A8',
  '#C4A7FF',
  '#FF9BC4',
  '#FFA58B',
  '#8FE3D0',
]

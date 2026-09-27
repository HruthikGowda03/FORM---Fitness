/* ==========================================================================
   FORM — profile picker / lock screen
   ---------------------------------------------------------------------------
   WHY THIS IS NOT A LOGIN PAGE
   There is no server, so nothing here can authenticate anyone. A form asking
   for an email and password would be a lie: it would accept any input, store
   the password in plaintext, and imply a protection that does not exist. That
   is a real harm in a health app, so it is not built.

   What IS built solves the actual need: several people sharing one device each
   keeping their own plan. Each profile is fully separate, and an optional PIN
   stops a housemate casually opening yours. The PIN is hashed and salted, and
   the limit of what it protects is stated on screen rather than implied.
   ========================================================================== */

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight, KeyRound, Lock, Plus, ShieldOff, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { BrandLockup } from '@/components/layout/Brand'
import { BackButton } from '@/components/layout/BackButton'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Callout } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/cn'
import { EASE } from '@/lib/motion'
import { PIN_DISCLOSURE, PIN_MAX, PIN_MIN, isValidPin } from '@/lib/pin'
import { relativeDay } from '@/lib/format'
import { useActions, useAppState } from '@/store/AppStore'
import { AVATAR_COUNT, type LocalProfile } from '@/types'

export function ProfileGate() {
  const { profiles } = useAppState()
  const { createProfile, selectProfile, unlockProfile, removeProfile } = useActions()

  useEffect(() => {
    // The picker is a standalone screen, not a route. Tabs need something
    // focusable to land on when the gate mounts, otherwise the first Tab
    // press jumps into the (hidden) app behind it.
    document.title = 'Choose a profile — FORM'
    return () => {
      document.title = 'FORM — Fuel Your Transformation'
    }
  }, [])

  const [creating, setCreating] = useState(false)
  const [unlocking, setUnlocking] = useState<LocalProfile | null>(null)
  const [pin, setPinValue] = useState('')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (unlocking) {
      setError('')
      setPinValue('')
      window.setTimeout(() => inputRef.current?.focus(), 60)
    }
  }, [unlocking])

  /*
    Reaching this screen *is* the request, so it renders even when a profile is
    already open — that is the whole point of the nav's "switch profile"
    control. It used to `return null` in that case, which was right when this
    replaced the entire shell and wrong the moment it became a route of its
    own: choosing a different person would have done nothing at all.
  */

  const submitPin = async () => {
    if (!unlocking) return
    if (!isValidPin(pin)) {
      setError(`Enter the ${PIN_MIN}–${PIN_MAX} digit PIN for this profile.`)
      return
    }
    const ok = await unlockProfile(unlocking.id, pin)
    if (!ok) setError('That PIN does not match. Check with the person who set it.')
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
          The picker is a real route now, so it has somewhere to go back to.
          `forceFallback` because this screen is usually *reached by* a redirect:
          offering history back would send the user to the app route that bounced
          them here, which would bounce them straight back.
        */}
        <div className="flex flex-1 flex-col justify-center">
          <BackButton forceFallback className="self-start" />

          <div className="flex flex-col items-center text-center">
            <BrandLockup />
            <p className="eyebrow mt-8 text-accent">Who is training today?</p>
            <h1 className="display-face mt-3 text-display-md">Pick a profile.</h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted">
              Each profile keeps its own plan, meals, logs and progress, so several people can
              share one device without overwriting each other.
            </p>
          </div>

        {/* ---------------- existing profiles ---------------- */}
        {profiles.length > 0 && (
          <ul className="mt-10 grid gap-2.5 sm:grid-cols-2">
            {profiles.map((p, i) => (
              <motion.li
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05, ease: EASE.out }}
                whileHover={reduce ? undefined : { y: -4 }}
                className="group edge-sweep"
              >
                <button
                  type="button"
                  onClick={() => (p.pinHash ? setUnlocking(p) : void selectProfile(p.id))}
                  className="flex w-full items-center gap-4 border border-line bg-surface p-4 text-left transition-colors hover:border-accent/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <Avatar index={p.avatarIndex} locked={Boolean(p.pinHash)} />
                  <span className="min-w-0 flex-1">
                    <span className="display-face block truncate text-base text-ink">
                      {p.name || 'Profile'}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {p.onboardingComplete
                        ? `Plan ready · ${relativeDay(p.lastOpenedAt.slice(0, 10))}`
                        : 'Not set up yet'}
                    </span>
                  </span>
                  {/* The arrow slides out from under the icon on hover. */}
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
        )}

        <div className="mt-6 flex justify-center">
          <Button size="lg" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            {profiles.length === 0 ? 'Create your profile' : 'Add someone else'}
          </Button>
        </div>

        {/*
          A second way out that is not a Back button. Someone who landed here by
          following a link into the app may not think of this screen as somewhere
          you navigate *back* from — and the knowledge centre is readable without
          a profile.
        */}
        <p className="mt-6 text-center text-sm text-muted">
          Not ready yet?{' '}
          <Link to="/learn" className="link-wipe inline-block text-accent">
            Read the knowledge centre
          </Link>
          .
        </p>

        <div className="mt-10">
          <Callout tone="muted">
            <strong className="text-ink">No password, no email, no server.</strong> Everything
            stays in this browser. Clearing site data deletes a profile permanently, so export a
            backup from Settings if it matters to you.
          </Callout>
        </div>
        </div>
      </div>

      {/* ---------------- create ---------------- */}
      <CreateProfileDialog
        open={creating}
        onOpenChange={setCreating}
        existingCount={profiles.length}
        onCreate={async (input) => {
          await createProfile(input)
          setCreating(false)
        }}
      />

      {/* ---------------- unlock ---------------- */}
      <Dialog
        open={Boolean(unlocking)}
        onOpenChange={(o) => {
          if (!o) setUnlocking(null)
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <p className="eyebrow text-accent">Locked profile</p>
            <DialogTitle className="mt-2">{unlocking?.name || 'Profile'}</DialogTitle>
            <DialogDescription>
              Enter the {PIN_MIN}–{PIN_MAX} digit PIN set by the person who owns this profile.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6">
            <label htmlFor="unlock-pin" className="eyebrow mb-2 block text-muted">
              PIN
            </label>
            <Input
              id="unlock-pin"
              ref={inputRef}
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={PIN_MAX}
              value={pin}
              onChange={(e) => {
                setPinValue(e.target.value.replace(/\D/g, ''))
                setError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submitPin()
              }}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'unlock-error' : undefined}
              className="num text-center text-2xl tracking-[0.4em]"
            />
            {/* Keeps the caret clear of the error when the field is short. */}
            {error && (
              <motion.p
                id="unlock-error"
                role="alert"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: EASE.out }}
                className="mt-3 text-sm text-danger"
              >
                {error}
              </motion.p>
            )}
          </div>

          {/* Pinned footer, for the same reason as the create dialog. */}
          <DialogFooter className="sm:flex-col sm:items-stretch">
            <Button onClick={() => void submitPin()}>
              <KeyRound className="size-4" />
              Unlock
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (
                  unlocking &&
                  window.confirm(
                    `Delete "${unlocking.name}"? Their plan, logs and progress are removed from this browser. This cannot be undone.`,
                  )
                ) {
                  removeProfile(unlocking.id)
                  setUnlocking(null)
                }
              }}
            >
              <Trash2 className="size-3.5" />
              I am not {unlocking?.name} — remove this profile
            </Button>
            <Button variant="ghost" onClick={() => setUnlocking(null)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
   Create dialog
   -------------------------------------------------------------------------- */

function CreateProfileDialog({
  open,
  onOpenChange,
  existingCount,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingCount: number
  onCreate: (input: { name: string; pin?: string; avatarIndex: number }) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [pinOn, setPinOn] = useState(false)
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [avatar, setAvatar] = useState(0)
  const [error, setError] = useState('')
  const reduce = useReducedMotion()

  useEffect(() => {
    if (open) {
      setName('')
      setPinOn(false)
      setPin('')
      setPin2('')
      setAvatar(existingCount % AVATAR_COUNT)
      setError('')
    }
  }, [open, existingCount])

  const submit = async () => {
    const trimmed = name.trim()
    if (trimmed.length < 1) {
      setError('Give the profile a name so you can tell them apart.')
      return
    }
    if (trimmed.length > 40) {
      setError('Keep the name under 40 characters.')
      return
    }
    if (pinOn) {
      if (!isValidPin(pin)) {
        setError(`The PIN must be ${PIN_MIN}–${PIN_MAX} digits.`)
        return
      }
      if (pin !== pin2) {
        setError('The two PINs do not match.')
        return
      }
    }

    await onCreate({ name: trimmed, pin: pinOn ? pin : undefined, avatarIndex: avatar })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New profile</DialogTitle>
          <DialogDescription>
            A profile is a local set of data on this device — not an online account.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 p-6">
          <div>
            <Label htmlFor="prof-name" className="mb-2">
              Name
            </Label>
            <Input
              id="prof-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setError('')
              }}
              placeholder="e.g. Priya, or Dad"
              maxLength={40}
              autoComplete="off"
            />
          </div>

          <div>
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
                    avatar === i ? 'border-accent' : 'border-line hover:border-line-strong',
                  )}
                  style={{ backgroundColor: AVATAR_COLOURS[i] }}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-line pt-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor="prof-pin-on" className="cursor-pointer normal-case">
                  Add a PIN
                </Label>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  Stops a housemate opening this profile by accident.
                </p>
              </div>
              <Switch id="prof-pin-on" checked={pinOn} onCheckedChange={setPinOn} />
            </div>

            <AnimatePresence initial={false}>
              {pinOn && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: EASE.out }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-3 pt-4">
                    <div>
                      <Label htmlFor="prof-pin" className="mb-2">
                        PIN
                      </Label>
                      <Input
                        id="prof-pin"
                        type="password"
                        inputMode="numeric"
                        maxLength={PIN_MAX}
                        value={pin}
                        onChange={(e) => {
                          setPin(e.target.value.replace(/\D/g, ''))
                          setError('')
                        }}
                        className="num text-center tracking-[0.3em]"
                        autoComplete="new-password"
                      />
                    </div>
                    <div>
                      <Label htmlFor="prof-pin2" className="mb-2">
                        Confirm
                      </Label>
                      <Input
                        id="prof-pin2"
                        type="password"
                        inputMode="numeric"
                        maxLength={PIN_MAX}
                        value={pin2}
                        onChange={(e) => {
                          setPin2(e.target.value.replace(/\D/g, ''))
                          setError('')
                        }}
                        className="num text-center tracking-[0.3em]"
                        autoComplete="new-password"
                        aria-invalid={error ? true : undefined}
                        aria-describedby={error ? 'create-profile-error' : undefined}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void submit()
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <Callout tone="warn">
                      <span className="flex gap-2">
                        <ShieldOff className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                        <span>{PIN_DISCLOSURE}</span>
                      </span>
                    </Callout>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/*
          The error lives in the pinned footer, not at the end of the scrolling
          body. Turning the PIN switch on makes the form tall enough to push a
          message placed in the body out of view — and a submit button that
          appears to do nothing is exactly the bug this replaces.

          It sits on its own row above the buttons rather than sharing the row
          with them, so a long message wraps instead of being squeezed into a
          one-word-per-line column.
        */}
        <DialogFooter className="sm:flex-col sm:items-stretch">
          <AnimatePresence mode="wait" initial={false}>
            {error && (
              <motion.p
                key={error}
                id="create-profile-error"
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
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submit()}>
              <Plus className="size-4" />
              Create profile
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* --------------------------------------------------------------------------
   Avatar colours — moved above their first use so there is no reliance on
   module hoisting order for clarity.
   ------------------------------------------------------------------------ */

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

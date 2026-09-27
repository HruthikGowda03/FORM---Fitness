/* ==========================================================================
   FORM — settings
   Preferences, accessibility, price assumptions and data import/export.
   ========================================================================== */

import { motion } from 'motion/react'
import {
  Accessibility,
  Database,
  Download,
  LogOut,
  KeyRound,
  Monitor,
  Moon,
  Palette,
  Pencil,
  RotateCcw,
  Settings2,
  Sun,
  Trash2,
  Upload,
  Users,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useTheme, useThemeControls } from '@/components/layout/ThemeProvider'
import { Eyebrow, PageLead, PageShell, PageTitle, Rule } from '@/components/layout/Page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OptionCard } from '@/components/ui/option-card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Callout } from '@/components/ui/separator'
import { useLocalState } from '@/lib/hooks'
import { FOODS } from '@/data/foods'
import { COOK_FACILITY_LABELS, COUNTRIES, FOOD_STYLE_LABELS, PLAN_MODE_HELP, PLAN_MODE_LABELS } from '@/lib/defaults'
import { formatNumber, todayISO } from '@/lib/format'
import { CURRENCY, downloadText } from '@/lib/prices'
import { isSoundSupported, playWaterSound } from '@/lib/sound'
import {
  currentOrigin,
  describeStorageSize,
  fromImportBundle,
  toExportBundle,
} from '@/lib/storage'
import { PROFILES_PATH } from '@/lib/routes'
import { PIN_DISCLOSURE, PIN_MAX, PIN_MIN, isValidPin } from '@/lib/pin'
import { AVATAR_COLOURS } from '@/components/auth/ProfileGate'
import { useActions, useAppState, useProfile } from '@/store/AppStore'
import { cn } from '@/lib/cn'
import type {
  CookFacility,
  FoodStyle,
  LocalProfile,
  MotionPref,
  PlanMode,
  ThemePref,
  WeightSystem,
} from '@/types'

/**
 * This exact origin, so "my data vanished" becomes answerable at a glance.
 *
 * Shown rather than hidden because a port that silently changes hands the user
 * an empty app with no error anywhere. Seeing `localhost:5174` when they have
 * been using `localhost:5173` explains the whole thing in one glance.
 */
export function SettingsPage() {
  const active = useProfile()
  const state = useAppState()
  const profiles = state.profiles
  const { profile, progress = [], customFoods = [], grocery = [], logs = {} } = active ?? {}
  const {
    setProfile,
    replaceState,
    resetAll,
    regeneratePlan,
    rebuildGrocery,
    renameProfile,
    setPin,
    removeProfile,
    closeProfile,
  } = useActions()
  const { systemPrefersReducedMotion } = useTheme()
  const navigate = useNavigate()
  const { setMotion: setMotionPref } = useThemeControls()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState('')
  const [importOk, setImportOk] = useState('')
  const [prices, setPrices] = useLocalState<Record<string, number>>('price-overrides', {})

  if (!profile) return null

  const currency = profile.budget.currency

  /* ---------------- export ---------------- */
  const handleExport = () => {
    // Export the whole device, not just this profile: a shared laptop's backup
    // is only useful if it contains everyone's plans.
    downloadText(
      `form-backup-${todayISO()}.json`,
      JSON.stringify(toExportBundle(state), null, 2),
      'application/json',
    )
  }

  /* ---------------- import ---------------- */
  /**
   * Close the open profile and return to the sign-in screen.
   *
   * `closeProfile` sets the "logged out" sentinel rather than removing anything,
   * so no data is touched and signing back in restores the same plan.
   */
  const signOut = () => {
    closeProfile()
    navigate(PROFILES_PATH, { replace: true })
  }

  const handleImport = async (file: File) => {
    setImportError('')
    setImportOk('')
    try {
      const text = await file.text()
      const next = fromImportBundle(text)
      // Confirm before replacing every profile on the device.
      const incoming = next.profiles.length
      const existing = state.profiles.length
      const warning =
        existing > 0
          ? `\n\nThis replaces ${existing} existing profile${existing === 1 ? '' : 's'} with ${incoming} from the backup.`
          : ''
      if (!window.confirm(`Restore ${incoming} profile${incoming === 1 ? '' : 's'} from this backup?${warning}`)) {
        return
      }
      replaceState(next)
      /*
        Sign out after restoring. The bundle carries whichever profile was open
        when it was made, and honouring that would drop whoever restores a
        backup straight into someone else's plan without the PIN. Closing the
        profile costs one sign-in and keeps the lock meaningful.
      */
      closeProfile()
      setImportOk('Backup restored. Sign in to continue.')
      window.setTimeout(() => navigate(PROFILES_PATH, { replace: true }), 900)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'That file could not be read.')
    }
  }

  return (
    <PageShell>
      <Eyebrow>Settings</Eyebrow>
      <PageTitle className="mt-3">Preferences, prices and your data.</PageTitle>
      <PageLead className="mt-4">
        Everything here is stored in this browser. Nothing is sent anywhere, and there is no
        account to manage.
      </PageLead>

      <Tabs defaultValue="general" className="mt-10">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="profiles">Profiles</TabsTrigger>
          <TabsTrigger value="accessibility">Accessibility</TabsTrigger>
          <TabsTrigger value="prices">Prices</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>

        {/* ==================== PROFILES ==================== */}
        <TabsContent value="profiles" className="pt-8">
          <ProfilesPanel
            active={active}
            onRename={renameProfile}
            onSetPin={setPin}
            onRemove={removeProfile}
            onSignOut={signOut}
          />
        </TabsContent>

        {/* ==================== GENERAL ==================== */}
        <TabsContent value="general" className="pt-8">
          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle as="h2">Units and goals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="mb-2.5">Measurement units</Label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {(['metric', 'imperial'] as WeightSystem[]).map((u) => (
                      <OptionCard
                        key={u}
                        value={u}
                        size="sm"
                        selected={profile.units === u}
                        onSelect={() => setProfile({ units: u })}
                        title={u === 'metric' ? 'Metric' : 'Imperial'}
                        description={u === 'metric' ? 'kg · cm' : 'lb · ft/in'}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="mb-2.5">Plan mode</Label>
                  <div className="grid gap-2">
                    {(['balanced', 'student', 'high-protein'] as PlanMode[]).map((m) => (
                      <OptionCard
                        key={m}
                        value={m}
                        size="sm"
                        selected={profile.planMode === m}
                        onSelect={() => {
                          setProfile({ planMode: m })
                          regeneratePlan()
                          rebuildGrocery(prices)
                        }}
                        title={PLAN_MODE_LABELS[m]}
                        description={PLAN_MODE_HELP[m]}
                      />
                    ))}
                  </div>
                </div>

                <Button asChild variant="secondary" size="sm">
                  <Link to="/onboarding">
                    <Settings2 className="size-3.5" />
                    Edit the full profile
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle as="h2">Budget</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label htmlFor="set-budget" className="mb-2">
                    Amount
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="set-budget"
                      type="number"
                      min={0}
                      step={50}
                      value={profile.budget.amount}
                      onChange={(e) =>
                        setProfile({
                          budget: { ...profile.budget, amount: Number(e.target.value) || 0 },
                        })
                      }
                      className="num"
                    />
                    <div className="flex shrink-0 border border-line">
                      {(['weekly', 'monthly'] as const).map((p) => (
                        <button
                          key={p}
                          type="button"
                          aria-pressed={profile.budget.period === p}
                          onClick={() => setProfile({ budget: { ...profile.budget, period: p } })}
                          className={cn(
                            'px-3.5 font-mono text-[0.625rem] tracking-widest uppercase transition-colors',
                            'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
                            profile.budget.period === p
                              ? 'bg-accent text-accent-contrast'
                              : 'text-faint hover:text-ink',
                          )}
                        >
                          {p === 'weekly' ? 'Wk' : 'Mo'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="mb-2.5">Currency</Label>
                  <Select
                    value={currency}
                    onValueChange={(v) => {
                      setProfile({ budget: { ...profile.budget, currency: v as 'INR' | 'USD' } })
                      rebuildGrocery(prices)
                    }}
                  >
                    <SelectTrigger aria-label="Currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">₹ Indian rupee</SelectItem>
                      <SelectItem value="USD">$ US dollar</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="mt-2 text-xs leading-relaxed text-faint">{CURRENCY[currency].note}</p>
                </div>

                {currency === 'USD' && (
                  <div>
                    <Label htmlFor="fx" className="mb-2">
                      Assumed exchange rate
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="fx"
                        type="number"
                        min={1}
                        defaultValue={CURRENCY.USD.perUsd}
                        onChange={(e) => {
                          const next = Math.max(1, Number(e.target.value) || 83)
                          CURRENCY.USD.perUsd = next
                          rebuildGrocery(prices)
                        }}
                        className="num"
                      />
                      <span className="num shrink-0 font-mono text-xs text-faint">
                        ₹ = $1
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-faint">
                      An editable assumption, not a live rate. FORM never fetches one.
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="water-target" className="mb-2">
                    Daily water target (ml)
                  </Label>
                  <Input
                    id="water-target"
                    type="number"
                    min={500}
                    max={6000}
                    step={250}
                    value={profile.weeklyWaterTargetMl}
                    onChange={(e) =>
                      setProfile({ weeklyWaterTargetMl: Number(e.target.value) || 2500 })
                    }
                    className="num"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* kitchen & location */}
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle as="h2">Kitchen & location</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label className="mb-2.5">Cooking facilities</Label>
                  <div className="grid gap-2">
                    {Object.entries(COOK_FACILITY_LABELS).map(([value, label]) => (
                      <OptionCard
                        key={value}
                        value={value}
                        size="sm"
                        selected={profile.cookFacility === value}
                        onSelect={() => {
                          setProfile({ cookFacility: value as CookFacility })
                          regeneratePlan()
                        }}
                        title={label}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="max-prep" className="mb-2">
                    Max prep time · {profile.maxPrepMinutes} min
                  </Label>
                  <input
                    id="max-prep"
                    type="range"
                    min={5}
                    max={90}
                    step={5}
                    value={profile.maxPrepMinutes}
                    onChange={(e) => setProfile({ maxPrepMinutes: Number(e.target.value) })}
                    className="form-range"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onClick={() => regeneratePlan()}
                  >
                    Apply and rebuild plan
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Where you are</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label className="mb-2.5">Country</Label>
                  <Select
                    value={profile.country}
                    onValueChange={(v) => {
                      setProfile({ country: v })
                      regeneratePlan()
                    }}
                  >
                    <SelectTrigger aria-label="Country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-2.5">Food style</Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Object.entries(FOOD_STYLE_LABELS).map(([value, label]) => (
                      <OptionCard
                        key={value}
                        value={value}
                        size="sm"
                        selected={profile.foodStyle === value}
                        onSelect={() => {
                          setProfile({ foodStyle: value as FoodStyle })
                          regeneratePlan()
                        }}
                        title={label}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================== ACCESSIBILITY ==================== */}
        <TabsContent value="accessibility" className="pt-8">
          <div className="grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <Palette className="size-4 text-accent" aria-hidden="true" />
                  <CardTitle as="h2">Appearance</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Label className="mb-2.5">Theme</Label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(
                    [
                      { v: 'dark' as ThemePref, l: 'Dark', icon: Moon },
                      { v: 'light' as ThemePref, l: 'Light', icon: Sun },
                      { v: 'system' as ThemePref, l: 'System', icon: Monitor },
                    ]
                  ).map((opt) => {
                    const Icon = opt.icon
                    const active = profile.theme === opt.v
                    return (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => setProfile({ theme: opt.v })}
                        aria-pressed={active}
                        className={cn(
                          'press flex flex-col items-center gap-2 border px-3 py-4',
                          'transition-[border-color,background-color,color,transform] duration-200 ease-[var(--ease-out-expo)]',
                          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                          active
                            ? 'border-accent bg-accent-soft text-accent shadow-[0_0_0_1px_var(--color-accent)]'
                            : 'border-line text-muted hover:-translate-y-0.5 hover:border-accent/50 hover:bg-surface-raised hover:text-ink',
                        )}
                      >
                        <Icon className="size-4 transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:scale-110" />
                        <span className="font-mono text-[0.625rem] tracking-widest uppercase">
                          {opt.l}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <Accessibility className="size-4 text-accent" aria-hidden="true" />
                  <CardTitle as="h2">Motion</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <Label className="mb-2.5">Animation</Label>
                <div className="grid gap-2.5">
                  {(
                    [
                      {
                        v: 'auto' as MotionPref,
                        l: 'Follow my system setting',
                        d: systemPrefersReducedMotion
                          ? 'Your system currently asks for reduced motion.'
                          : 'Your system currently allows motion.',
                      },
                      { v: 'full' as MotionPref, l: 'Always animate', d: 'Transitions and reveals run regardless of system preference.' },
                      { v: 'reduce' as MotionPref, l: 'Always reduce', d: 'All animation is switched off, even if your system allows it.' },
                    ]
                  ).map((opt) => (
                      <OptionCard
                        key={opt.v}
                        value={opt.v}
                        size="sm"
                        selected={profile.motion === opt.v}
                        onSelect={() => {
                          setProfile({ motion: opt.v })
                          setMotionPref(opt.v)
                        }}
                        title={opt.l}
                        description={opt.d}
                      />
                    ))}
                </div>

                <div className="mt-6 space-y-3 border-t border-line pt-5">
                  {(
                    [
                      {
                        id: 'hide-cal',
                        label: 'Hide calorie metrics',
                        desc: 'Switches dashboard charts to protein and removes energy figures.',
                        value: !profile.showCalorieMetrics,
                        set: (v: boolean) => setProfile({ showCalorieMetrics: !v }),
                      },
                      {
                        id: 'hide-weight',
                        label: 'Hide weight metrics',
                        desc: 'Removes weight from the progress charts and entry form entirely.',
                        value: !profile.showWeightMetrics,
                        set: (v: boolean) => setProfile({ showWeightMetrics: !v }),
                      },
                      {
                        id: 'sound',
                        label: 'Water sounds',
                        desc: 'A short bubble each time you log a glass. Synthesised in the browser — no audio files, nothing downloaded.',
                        // Only offered where it can actually work; a switch
                        // that silently does nothing is worse than no switch.
                        hide: !isSoundSupported(),
                        value: profile.soundEnabled !== false,
                        set: (v: boolean) => {
                          setProfile({ soundEnabled: !v })
                          // Play on enable, so the switch confirms itself rather
                          // than leaving the user to hunt for the water tracker.
                          if (!v) playWaterSound({ glasses: 1 })
                        },
                      },
                    ]
                  )
                    .filter((row) => !('hide' in row && row.hide))
                    .map((row) => (
                    <div
                      key={row.id}
                      className="-mx-3 flex items-start gap-4 rounded-sm px-3 py-2 transition-colors duration-200 ease-[var(--ease-out-expo)] hover:bg-surface-raised"
                    >
                      <div className="min-w-0 flex-1">
                        <Label htmlFor={row.id} className="cursor-pointer normal-case">
                          {row.label}
                        </Label>
                        <p className="mt-1 text-xs leading-relaxed text-muted">{row.desc}</p>
                      </div>
                      <Switch id={row.id} checked={row.value} onCheckedChange={row.set} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-3">
            <Callout tone="info">
              <strong className="text-ink">Built in, not bolted on.</strong> FORM uses semantic
              landmarks, a skip link, visible focus rings, real ARIA values on progress indicators,
              labelled form controls with linked error messages, and keyboard-operable custom
              controls. Reduced motion is honoured from the operating system and can be forced
              either way above.
            </Callout>
          </div>
        </TabsContent>

        {/* ==================== PRICES ==================== */}
        <TabsContent value="prices" className="pt-8">
          <Card>
            <CardHeader>
              <CardTitle as="h2">Price assumptions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="max-w-2xl text-sm leading-relaxed text-muted">
                These are the per-kilogram figures FORM uses to estimate grocery cost. They are
                starting guesses, not live prices. Correct the ones you buy often and every budget
                figure recalculates.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button
                  size="sm"
                  onClick={() => {
                    rebuildGrocery(prices)
                  }}
                >
                  Apply and recalculate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPrices({})
                    rebuildGrocery({})
                  }}
                >
                  <RotateCcw className="size-3.5" />
                  Reset to defaults
                </Button>
                {Object.keys(prices).length > 0 && (
                  <Badge variant="accent" size="sm">
                    {Object.keys(prices).length} edited
                  </Badge>
                )}
              </div>

              <PriceEditor
                prices={prices}
                currency={currency}
                onChange={(id, value) => {
                  setPrices((prev) => {
                    const next = { ...prev }
                    if (value === undefined) delete next[id]
                    else next[id] = value
                    return next
                  })
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== DATA ==================== */}
        <TabsContent value="data" className="pt-8">
          {/*
            The single most confusing thing about a browser-only app is that
            "my data disappeared" has no visible cause. People reasonably assume
            a name and a PIN mean an account somewhere, and reasonably expect
            closing a tab not to erase them.

            So: state the scope plainly, name this exact origin, and show the
            profile count. If the address below is not the one they have been
            using, that is the answer, immediately and without a support
            question.
          */}
          <Card className="border-accent/40">
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <Database className="size-4 text-accent" aria-hidden="true" />
                <CardTitle as="h2">Where your data lives</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted">
                Everything FORM knows about you sits in <strong className="text-ink">this one
                browser, on this one device</strong>. There is no account and no server, so
                there is nothing to log into and nothing syncing. Closing the tab is safe — your
                profiles, plan, logs and progress are all still here when you come back.
              </p>

              <dl className="mt-4 grid gap-px border border-line bg-line sm:grid-cols-3">
                {[
                  { label: 'Profiles stored', value: String(profiles.length) },
                  { label: 'Storage used', value: describeStorageSize() },
                  { label: 'This page is at', value: currentOrigin() },
                ].map((s) => (
                  <div key={s.label} className="bg-surface p-3">
                    <dt className="eyebrow text-faint">{s.label}</dt>
                    <dd className="mt-1 break-all text-sm font-bold text-ink">{s.value}</dd>
                  </div>
                ))}
              </dl>

              <Callout tone="muted" className="mt-4">
                <strong className="text-ink">Your data will look gone if:</strong> you open FORM
                in a different browser, a private/incognito window, or at a different address
                (a different port, or a hosted URL rather than localhost). Those are separate
                storage, with no way to see each other. Clearing site data deletes a profile
                permanently.
              </Callout>
            </CardContent>
          </Card>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <Download className="size-4 text-accent" aria-hidden="true" />
                  <CardTitle as="h2">Export</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted">
                  Download a JSON backup of your profile, plan, meal log, progress entries, grocery
                  list and custom foods. Do this before clearing your browser data or switching
                  devices.
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-px border border-line bg-line">
                  {[
                    { label: 'Progress entries', value: progress.length },
                    { label: 'Days logged', value: Object.keys(logs).length },
                    { label: 'Custom foods', value: customFoods.length },
                    { label: 'Grocery items', value: grocery.length },
                  ].map((s) => (
                    <div key={s.label} className="bg-surface p-3">
                      <dt className="eyebrow text-faint">{s.label}</dt>
                      <dd className="num mt-1 text-lg font-bold text-ink">{s.value}</dd>
                    </div>
                  ))}
                </dl>
                <Button onClick={handleExport} className="mt-5">
                  <Download className="size-4" />
                  Download backup
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <Upload className="size-4 text-accent" aria-hidden="true" />
                  <CardTitle as="h2">Import</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-muted">
                  Restoring a backup <strong className="text-ink">replaces</strong> everything
                  currently stored. A backup from a different version of FORM is rejected rather
                  than partially applied.
                </p>

                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) void handleImport(file)
                    e.target.value = ''
                  }}
                />

                <Button variant="secondary" onClick={() => fileRef.current?.click()} className="mt-5">
                  <Upload className="size-4" />
                  Choose a backup
                </Button>

                {importError && (
                  <div className="mt-4">
                    <Callout tone="danger">{importError}</Callout>
                  </div>
                )}
                {importOk && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4"
                  >
                    <Callout tone="ok">{importOk}</Callout>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-3">
            <Card className="border-danger/40">
              <CardHeader>
                <div className="flex items-center gap-2.5">
                  <Trash2 className="size-4 text-danger" aria-hidden="true" />
                  <CardTitle as="h2">Delete everything</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="max-w-2xl text-sm leading-relaxed text-muted">
                  Removes your profile, plan, logs, progress and grocery list from this browser.
                  Custom foods are kept. This cannot be undone — export a backup first if you might
                  want any of it back.
                </p>
                <Button
                  variant="danger"
                  className="mt-5"
                  onClick={() => {
                    if (
                      window.confirm(
                        'Delete your profile, plan, logs and progress from this browser? This cannot be undone.',
                      )
                    ) {
                      resetAll()
                    }
                  }}
                >
                  <Trash2 className="size-4" />
                  Delete all data
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 flex items-center gap-3 border border-line bg-surface p-5">
            <Database className="size-4 shrink-0 text-faint" aria-hidden="true" />
            <p className="text-xs leading-relaxed text-muted">
              FORM has no server. There is nothing to delete remotely, no account to close and no
              analytics to opt out of — because none of those exist.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-12 border-t border-line pt-6">
        <Rule label="About" className="mb-4" />
        <p className="max-w-3xl font-mono text-[0.625rem] leading-relaxed text-faint">
          FORM · Fuel Your Transformation · MIT licensed · Educational prototype, not medical
          advice. Calculations: Mifflin-St Jeor (1990) with documented activity multipliers. Food
          values: rounded references from public composition tables. Prices: editable assumptions.
          Nothing here is fetched from a network service.
        </p>
      </div>
    </PageShell>
  )
}

/* --------------------------------------------------------------------------
   Profiles panel — manage the people using this device
   -------------------------------------------------------------------------- */

function ProfilesPanel({
  active,
  onRename,
  onSetPin,
  onRemove,
  onSignOut,
}: {
  active: LocalProfile | null
  onRename: (id: string, name: string) => void
  onSetPin: (id: string, pin: string | null) => Promise<void>
  onRemove: (id: string) => void
  onSignOut: () => void
}) {
  const { profiles } = useAppState()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [pinFor, setPinFor] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  /* Name the other person, so the control says who you would be switching to. */
  const switchTo = profiles.find((p) => p.id !== active?.id)?.name

  const savePin = async () => {
    if (!pinFor) return
    if (pin && !isValidPin(pin)) {
      setError(`The PIN must be ${PIN_MIN}–${PIN_MAX} digits.`)
      return
    }
    await onSetPin(pinFor, pin || null)
    setPinFor(null)
    setPin('')
    setError('')
  }

  return (
    <div className="grid gap-3">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <Users className="size-4 text-accent" aria-hidden="true" />
            <CardTitle as="h2">People on this device</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="max-w-2xl text-sm leading-relaxed text-muted">
            Each profile is a fully separate set of data — plan, meal log, progress and grocery
            list. Nothing is shared between them, and nothing is sent anywhere. This is what makes
            a shared family or gym laptop workable; it is not an online account system.
          </p>

          <ul className="mt-5 divide-y divide-line-soft border border-line">
            {profiles.map((p) => {
              const isActive = p.id === active?.id
              return (
                <li
                  key={p.id}
                  className={cn(
                    'row-hover flex flex-wrap items-center gap-3 px-4 py-3',
                    isActive && 'bg-accent-soft/40',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="inline-flex size-9 shrink-0 items-center justify-center border border-line"
                    style={{ backgroundColor: AVATAR_COLOURS[p.avatarIndex % AVATAR_COLOURS.length] }}
                  />

                  <div className="min-w-0 flex-1">
                    {editingId === p.id ? (
                      <div className="flex gap-2">
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          maxLength={40}
                          autoFocus
                          aria-label={`New name for ${p.name}`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              onRename(p.id, name)
                              setEditingId(null)
                            }
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            onRename(p.id, name)
                            setEditingId(null)
                          }}
                        >
                          Save
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-ink">
                          {p.name || 'Profile'}
                          {isActive && (
                            <Badge variant="accent" size="sm" className="ml-2">
                              Open
                            </Badge>
                          )}
                        </p>
                        <p className="num text-[0.625rem] text-faint">
                          {p.onboardingComplete ? 'Plan ready' : 'Not set up'} ·{' '}
                          {p.pinHash ? 'PIN set' : 'No PIN'}
                        </p>
                      </>
                    )}
                  </div>

                  {editingId !== p.id && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Rename ${p.name}`}
                        onClick={() => {
                          setEditingId(p.id)
                          setName(p.name)
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Change PIN for ${p.name}`}
                        onClick={() => {
                          setPinFor(p.id)
                          setPin('')
                          setError('')
                        }}
                      >
                        <KeyRound className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${p.name}`}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Remove "${p.name}" from this device? Their plan, logs and progress are deleted. This cannot be undone.`,
                            )
                          ) {
                            onRemove(p.id)
                          }
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          {/*
            Signing out and switching profile are the same underlying action —
            close the open profile, land on the sign-in screen — so they are one
            control here rather than two that do an identical thing. The copy
            names both, because "log out" is the word people look for and
            "switch profile" is the situation they are actually in.
          */}
          {active && (
            <div className="mt-5 border-t border-line pt-5">
              <p className="text-sm leading-relaxed text-muted">
                <strong className="text-ink">{active.name || 'This profile'}</strong> is open on
                this device. Signing out closes it and returns to the sign-in screen, where you can
                open {profiles.length > 1 ? 'anyone' : 'it'} again with the name and PIN.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button variant="secondary" onClick={() => onSignOut()}>
                  <LogOut className="size-4" />
                  Log out{switchTo ? ` / switch to ${switchTo}` : ''}
                </Button>
              </div>
            </div>
          )}

          <div className="mt-5">
            <Callout tone="muted">
              There is no password and no recovery. If someone forgets their PIN, remove that
              profile from the unlock screen and create a new one — the old data cannot be
              recovered.
            </Callout>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(pinFor)} onOpenChange={(o) => !o && setPinFor(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {profiles.find((p) => p.id === pinFor)?.pinHash ? 'Change PIN' : 'Add a PIN'}
            </DialogTitle>
            <DialogDescription>
              Optional. Stops a housemate opening this profile by accident.
            </DialogDescription>
          </DialogHeader>
          <div className="p-6">
            <Label htmlFor="set-pin" className="mb-2">
              {profiles.find((p) => p.id === pinFor)?.pinHash ? 'New PIN' : 'PIN'}
            </Label>
            <Input
              id="set-pin"
              type="password"
              inputMode="numeric"
              maxLength={PIN_MAX}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ''))
                setError('')
              }}
              className="num text-center text-xl tracking-[0.3em]"
              autoComplete="new-password"
              aria-invalid={error ? true : undefined}
            />
            <div className="mt-4">
              <Callout tone="warn">{PIN_DISCLOSURE}</Callout>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-3 border-t border-line p-6 sm:flex-col sm:items-stretch">
            {error && (
              <p role="alert" className="mb-1 text-sm text-danger">
                {error}
              </p>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              {profiles.find((p) => p.id === pinFor)?.pinHash && (
                <Button
                  variant="ghost"
                  onClick={async () => {
                    if (pinFor) {
                      await onSetPin(pinFor, null)
                      setPinFor(null)
                    }
                  }}
                >
                  Remove PIN
                </Button>
              )}
              <Button variant="ghost" onClick={() => setPinFor(null)}>
                Cancel
              </Button>
              <Button onClick={() => void savePin()}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* --------------------------------------------------------------------------
   Price editor
   -------------------------------------------------------------------------- */

function PriceEditor({
  prices,
  currency,
  onChange,
}: {
  prices: Record<string, number>
  currency: 'INR' | 'USD'
  onChange: (id: string, value: number | undefined) => void
}) {
  const [query, setQuery] = useState('')

  const filtered = FOODS.filter((f) => {
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return `${f.name} ${f.localName ?? ''} ${f.category}`.toLowerCase().includes(needle)
  })

  return (
    <div className="mt-6">
      <Label htmlFor="price-search" className="mb-2">
        Find a food
      </Label>
      <Input
        id="price-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search…"
        className="max-w-sm"
      />

      <ul className="mt-4 max-h-[26rem] divide-y divide-line-soft overflow-y-auto border border-line">
        {filtered.map((food) => {
          const override = prices[food.id]
          const current = override ?? food.costPerKg
          const display = currency === 'USD' ? current / CURRENCY.USD.perUsd : current
          return (
            <li key={food.id} className="row-hover flex items-center gap-3 px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{food.name}</p>
                {override !== undefined && (
                  <p className="num text-[0.625rem] text-accent">
                    edited from {formatNumber(food.costPerKg)}
                  </p>
                )}
              </div>
              <div className="relative w-32 shrink-0">
                <Input
                  type="number"
                  min={0}
                  step={5}
                  value={Math.round(display * 100) / 100}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    if (!Number.isFinite(v) || v <= 0) {
                      onChange(food.id, undefined)
                      return
                    }
                    onChange(food.id, currency === 'USD' ? v * CURRENCY.USD.perUsd : v)
                  }}
                  className="num h-9 pr-9 text-base sm:text-xs"
                  aria-label={`Price per kilogram for ${food.name}`}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-[0.625rem] text-faint">
                  {CURRENCY[currency].symbol}
                </span>
              </div>
            </li>
          )
        })}
      </ul>

      <p className="mt-3 text-xs text-faint">
        Prices are per kilogram. Shown in {CURRENCY[currency].label}; internally converted.
      </p>
    </div>
  )
}

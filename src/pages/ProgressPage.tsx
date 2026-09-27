/* ==========================================================================
   FORM — progress tracker
   Weekly trends, multiple non-weight metrics, and a deliberate stance on
   compulsive tracking.
   ========================================================================== */

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { motion, useReducedMotion } from 'motion/react'
import { EyeOff, Plus, Trash2, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'

import { FOOD_LOG_TONE } from '@/components/dashboard/tokens'
import { AnimatedNumber } from '@/components/dashboard/MacroRings'
import { Reveal, RevealItem, Stagger, itemVariants } from '@/components/motion/primitives'
import { Eyebrow, PageLead, PageShell, PageTitle, Rule } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Callout } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/cn'
import { EASE } from '@/lib/motion'
import { formatDateShort, formatNumber, isoDaysAgo, makeId, todayISO, weeklyAverage } from '@/lib/format'
import { fromKg, toKg } from '@/lib/units'
import { useActions, useProfile } from '@/store/AppStore'
import type { ProgressEntry } from '@/types'

type Metric = {
  key: keyof ProgressEntry
  label: string
  unit: string
  min: number
  max: number
  step: number
  colour: string
  optional: boolean
  hint: string
}

const METRICS: Metric[] = [
  {
    key: 'weightKg', label: 'Weight', unit: 'kg', min: 25, max: 300, step: 0.1,
    colour: FOOD_LOG_TONE.weight, optional: true,
    hint: 'Optional, and only for adults. Daily weight moves with water, salt and digestion — look at the weekly average, never a single reading.',
  },
  {
    key: 'energy', label: 'Energy', unit: '/10', min: 1, max: 10, step: 1,
    colour: FOOD_LOG_TONE.energy_level, optional: true,
    hint: 'How energised you felt. Often moves before weight does.',
  },
  {
    key: 'mood', label: 'Mood', unit: '/10', min: 1, max: 10, step: 1,
    colour: '#C4A7FF', optional: true, hint: 'A rough 1–10 check-in.',
  },
  {
    key: 'sleepHours', label: 'Sleep', unit: 'h', min: 0, max: 14, step: 0.5,
    colour: FOOD_LOG_TONE.sleep, optional: true,
    hint: 'Hours, roughly. Sleep affects appetite, training output and recovery more than most people expect.',
  },
  {
    key: 'strengthValueKg', label: 'Gym lift', unit: 'kg', min: 0, max: 500, step: 2.5,
    colour: FOOD_LOG_TONE.strength, optional: true,
    hint: 'The same lift, same weight, same reps, each time. This is usually the clearest signal that training is working.',
  },
  {
    key: 'waistCm', label: 'Waist', unit: 'cm', min: 30, max: 200, step: 0.5,
    colour: FOOD_LOG_TONE.fat, optional: true,
    hint: 'Around the navel, measured the same way each time.',
  },
]

export function ProgressPage() {
  const active = useProfile()
  const { profile, progress = [] } = active ?? {}
  const { setProfile, addProgress, removeProgress } = useActions()
  const [open, setOpen] = useState(false)
  const [metric, setMetric] = useState<string>(METRICS[0].key as string)
  const reduce = useReducedMotion()

  const showWeight = profile?.showWeightMetrics !== false
  const showCalories = profile?.showCalorieMetrics !== false

  const entries = useMemo(
    () => [...progress].sort((a, b) => a.date.localeCompare(b.date)),
    [progress],
  )

  const activeMetric = METRICS.find((m) => m.key === metric) ?? METRICS[0]
  const visibleMetrics = METRICS.filter((m) => !(m.key === 'weightKg' && !showWeight))

  /** 12 weeks of weekly buckets, so day-to-day noise is visibly smoothed. */
  const weeklySeries = useMemo(() => {
    const weeks: { label: string; start: string; end: string }[] = []
    for (let i = 11; i >= 0; i--) {
      const end = isoDaysAgo(i * 7)
      const start = isoDaysAgo(i * 7 + 6)
      weeks.push({ label: formatDateShort(end), start, end })
    }

    return weeks.map((week) => {
      const inWeek = entries.filter((e) => e.date >= week.start && e.date <= week.end)
      const row: Record<string, number | string | null> = { week: week.label, entries: inWeek.length }
      for (const m of METRICS) {
        const values = inWeek
          .map((e) => e[m.key])
          .filter((v): v is number => typeof v === 'number')
        // null, not 0 — a week with no entries must render as a gap so the
        // chart never implies "measured zero".
        row[m.key as string] = values.length
          ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
          : null
      }
      return row
    })
  }, [entries])

  const selectedSeries = weeklySeries.map((row) => ({
    week: String(row.week),
    value: (row[activeMetric.key as string] as number | null) ?? null,
  }))

  const hasData = entries.some((e) => typeof e[activeMetric.key] === 'number')

  const weightPoints = entries
    .filter((e) => e.weightKg !== undefined)
    .map((e) => ({ date: e.date, value: e.weightKg }))
  const weightAvg = weeklyAverage(weightPoints, 7)
  const firstWeight = weightPoints[0]?.value
  const change = weightAvg !== null && firstWeight !== undefined ? weightAvg - firstWeight : null

  return (
    <PageShell width="wide">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>Progress</Eyebrow>
          <PageTitle className="mt-3">Consistency, not obsession.</PageTitle>
          <PageLead className="mt-4">
            FORM shows weekly averages, never daily numbers. There is no streak to keep and no
            badge to lose. If tracking is starting to feel compulsory, hide the metrics — they are
            not going anywhere.
          </PageLead>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-4" />
              Log an entry
            </Button>
          </DialogTrigger>
          <EntryDialog
            metrics={visibleMetrics}
            onSave={(entry) => {
              addProgress(entry)
              setOpen(false)
            }}
            unitSystem={profile?.units ?? 'metric'}
          />
        </Dialog>
      </div>

      {/* ---------------- visibility toggles ---------------- */}
      <Stagger className="mt-10 flex flex-wrap gap-3" gap={0.07}>
        <RevealItem className="flex items-center gap-3 border border-line bg-surface px-4 py-3">
          <EyeOff className="size-4 shrink-0 text-faint" aria-hidden="true" />
          <div>
            <Label htmlFor="hide-weight" className="cursor-pointer">
              Hide weight metrics
            </Label>
            <p className="text-[0.6875rem] text-faint">Charts and entries disappear entirely</p>
          </div>
          <Switch
            id="hide-weight"
            checked={!showWeight}
            onCheckedChange={(v) => setProfile({ showWeightMetrics: !v })}
            className="ml-2"
          />
        </RevealItem>

        <RevealItem className="flex items-center gap-3 border border-line bg-surface px-4 py-3">
          <EyeOff className="size-4 shrink-0 text-faint" aria-hidden="true" />
          <div>
            <Label htmlFor="hide-cal" className="cursor-pointer">
              Hide calorie metrics
            </Label>
            <p className="text-[0.6875rem] text-faint">Energy charts switch to protein</p>
          </div>
          <Switch
            id="hide-cal"
            checked={!showCalories}
            onCheckedChange={(v) => setProfile({ showCalorieMetrics: !v })}
            className="ml-2"
          />
        </RevealItem>
      </Stagger>

      {/* ---------------- summary ---------------- */}
      <Stagger
        className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4"
        gap={0.07}
      >
        <RevealItem className="bg-surface p-5">
          <p className="eyebrow text-faint">Entries logged</p>
          <p className="num mt-2 text-3xl font-bold text-ink">
            <AnimatedNumber value={entries.length} />
          </p>
          <p className="mt-1 text-xs text-muted">
            {entries.length === 0
              ? 'Nothing yet — one entry is enough to start'
              : `Since ${formatDateShort(entries[0].date)}`}
          </p>
        </RevealItem>

        {showWeight && (
          <RevealItem className="bg-surface p-5">
            <p className="eyebrow text-faint">Weight · 7-day average</p>
            <p className="num mt-2 text-3xl font-bold text-ink">
              {weightAvg !== null
                ? formatNumber(
                    fromKg(weightAvg, profile?.units === 'metric' ? 'kg' : 'lb'),
                    1,
                  )
                : '—'}
              <span className="ml-1 text-sm text-faint">
                {profile?.units === 'metric' ? 'kg' : 'lb'}
              </span>
            </p>
            {change !== null && (
              <p
                className={cn(
                  'num mt-1 text-xs',
                  change < -0.05 ? 'text-accent' : change > 0.05 ? 'text-warn' : 'text-muted',
                )}
              >
                {change > 0 ? '+' : ''}
                {formatNumber(
                  fromKg(change, profile?.units === 'metric' ? 'kg' : 'lb'),
                  2,
                )}{' '}
                vs first entry
              </p>
            )}
          </RevealItem>
        )}

        <RevealItem className="bg-surface p-5">
          <p className="eyebrow text-faint">Training sessions</p>
          <p className="num mt-2 text-3xl font-bold text-ink">
            <AnimatedNumber value={entries.filter((e) => e.workoutDone).length} />
          </p>
          <p className="mt-1 text-xs text-muted">Checked off in the log</p>
        </RevealItem>

        <RevealItem className="bg-surface p-5">
          <p className="eyebrow text-faint">Current streak-free view</p>
          <p className="display-face mt-2 text-2xl text-ink">
            {entries.length > 8
              ? 'Building a habit'
              : entries.length > 0
                ? 'Getting started'
                : 'Day one'}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            FORM does not track streaks. Missing a week costs you nothing here.
          </p>
        </RevealItem>
      </Stagger>

      {/* ---------------- chart ---------------- */}
      <div className="mt-6">
        <Card className="overflow-hidden">
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-4 space-y-0">
            <div>
              <p className="eyebrow text-faint">Weekly average · last 12 weeks</p>
              <CardTitle as="h2" className="mt-1.5">
                {activeMetric.label}
              </CardTitle>
            </div>
            <Select value={metric} onValueChange={setMetric}>
              <SelectTrigger className="w-44" aria-label="Metric">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {visibleMetrics.map((m) => (
                  <SelectItem key={m.key} value={m.key as string}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {!hasData ? (
              <Callout tone="muted">
                No {activeMetric.label.toLowerCase()} entries yet. {activeMetric.hint}
              </Callout>
            ) : (
              <motion.div key={activeMetric.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease: EASE.out }}>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={selectedSeries} margin={{ top: 8, right: 12, bottom: 0, left: -20 }}>
                      <CartesianGrid stroke="var(--color-line-soft)" vertical={false} />
                      <XAxis
                        dataKey="week"
                        tick={{ fill: 'var(--color-faint)', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                        axisLine={false}
                        tickLine={false}
                        interval={1}
                      />
                      <YAxis
                        domain={['auto', 'auto']}
                        tick={{ fill: 'var(--color-faint)', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                        axisLine={false}
                        tickLine={false}
                        width={48}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null
                          const v = payload[0].value as number | null
                          return (
                            <div className="border border-line bg-surface-raised px-3 py-2.5 shadow-xl">
                              <p className="eyebrow mb-1.5 text-faint">{label}</p>
                              <p className="num text-sm text-ink">
                                {v === null ? 'No entry' : `${formatNumber(v, 1)} ${activeMetric.unit}`}
                              </p>
                            </div>
                          )
                        }}
                        cursor={{ stroke: 'var(--color-line-strong)' }}
                      />
                      {/*
                        The line draws itself left-to-right on mount, so a chart
                        reads as being plotted rather than appearing finished.
                      */}
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={activeMetric.colour}
                        strokeWidth={2}
                        dot={{ r: 3, fill: activeMetric.colour }}
                        activeDot={{ r: 5 }}
                        connectNulls
                        isAnimationActive={!reduce}
                        animationDuration={900}
                        animationEasing="ease-out"
                      />
                      {activeMetric.key === 'weightKg' && entries[0]?.weightKg !== undefined && (
                        <ReferenceLine
                          y={formatNumber(
                            fromKg(entries[0].weightKg, profile?.units === 'metric' ? 'kg' : 'lb'),
                            1,
                          )}
                          stroke="var(--color-faint)"
                          strokeDasharray="4 4"
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-faint">
                  {activeMetric.hint} Weeks with no entries are shown as gaps, not zeros.
                </p>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---------------- entries ---------------- */}
      <div className="mt-16">
        <Rule label="Your entries" className="mb-6" />

        {entries.length === 0 ? (
          <Callout tone="accent">
            Nothing logged yet. Weight is entirely optional and can stay hidden — logging how you
            felt and how your lifts are going is often more informative.
          </Callout>
        ) : (
          <Stagger as="ul" className="divide-y divide-line-soft border border-line bg-surface" gap={0.04}>
            {[...entries].reverse().map((entry) => (
              <motion.li
                key={entry.id}
                variants={itemVariants}
                whileHover={reduce ? undefined : { backgroundColor: 'var(--color-surface-inset)' }}
                transition={{ duration: 0.2, ease: EASE.out }}
                className="flex flex-wrap items-center gap-4 px-4 py-3.5"
              >
                <div className="num w-24 shrink-0 text-xs text-muted">
                  {formatDateShort(entry.date)}
                </div>

                <div className="flex flex-1 flex-wrap gap-x-5 gap-y-1">
                  {METRICS.filter((m) => entry[m.key] !== undefined && !(m.key === 'weightKg' && !showWeight)).map(
                    (m) => (
                      <span key={m.key as string} className="num text-xs">
                        <span className="text-faint">{m.label}:</span>{' '}
                        <span className="text-ink">
                          {formatNumber(entry[m.key] as number, 1)} {m.unit}
                        </span>
                      </span>
                    ),
                  )}
                  {entry.workoutDone && (
                    <span className="num text-xs text-accent">Trained</span>
                  )}
                  {entry.strengthLabel && (
                    <span className="num text-xs text-muted">{entry.strengthLabel}</span>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeProgress(entry.id)}
                  aria-label={`Delete entry from ${entry.date}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </motion.li>
            ))}
          </Stagger>
        )}
      </div>

      <Reveal className="mt-10">
        <Callout tone="warn">
          <strong className="text-ink">A note on how often to look at this.</strong> If checking
          numbers has started to affect your mood, your training or how you eat, that is a signal
          to step back — not to check more often. Talk to someone you trust, or to a professional,
          if that is where you are.
        </Callout>
      </Reveal>
    </PageShell>
  )
}

/* --------------------------------------------------------------------------
   Entry dialog
   -------------------------------------------------------------------------- */

function EntryDialog({
  metrics,
  onSave,
  unitSystem,
}: {
  metrics: Metric[]
  onSave: (entry: ProgressEntry) => void
  unitSystem: 'metric' | 'imperial'
}) {
  const [date, setDate] = useState(todayISO())
  const [values, setValues] = useState<Record<string, number>>({})
  const [workoutDone, setWorkoutDone] = useState(false)
  const [strengthLabel, setStrengthLabel] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const set = (key: string, v: number) => {
    setValues((prev) => ({ ...prev, [key]: v }))
    if (error) setError('')
  }

  const save = () => {
    if (Object.keys(values).length === 0 && !workoutDone && !note.trim()) {
      setError('Log at least one number, a training session, or a note.')
      return
    }

    const entry: ProgressEntry = {
      id: makeId('p'),
      date,
      workoutDone,
      strengthLabel: strengthLabel.trim() || undefined,
      note: note.trim() || undefined,
    }

    for (const m of metrics) {
      const raw = values[m.key as string]
      if (raw === undefined) continue
      if (m.key === 'weightKg') {
        entry.weightKg = toKg(raw, unitSystem === 'metric' ? 'kg' : 'lb')
      } else if (m.key === 'waistCm') {
        entry.waistCm = unitSystem === 'metric' ? raw : raw * 2.54
      } else {
        // Assign the plain numeric metrics explicitly rather than through an
        // index signature, which TypeScript cannot verify for a typed object.
        switch (m.key) {
          case 'energy': entry.energy = raw; break
          case 'mood': entry.mood = raw; break
          case 'sleepHours': entry.sleepHours = raw; break
          case 'strengthValueKg': entry.strengthValueKg = raw; break
          default: break
        }
      }
    }

    onSave(entry)
    setValues({})
    setWorkoutDone(false)
    setStrengthLabel('')
    setNote('')
    setError('')
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Log an entry</DialogTitle>
        <DialogDescription>
          Everything is optional except the date. Leave weight out if it is not useful to you.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 p-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="pe-date" className="mb-2">
            Date
          </Label>
          <Input
            id="pe-date"
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="num"
          />
        </div>

        <div className="flex items-end">
          <label className="flex w-full cursor-pointer items-center gap-3 border border-line bg-surface-inset px-4 py-3">
            <input
              type="checkbox"
              checked={workoutDone}
              onChange={(e) => setWorkoutDone(e.target.checked)}
              className="size-4 accent-[var(--color-accent)]"
            />
            <span className="text-sm text-ink">I trained today</span>
          </label>
        </div>

        {metrics.map((m) => (
          <div key={m.key as string}>
            <Label htmlFor={`pe-${m.key as string}`} className="mb-2">
              {m.label} ({m.unit})
            </Label>
            <Input
              id={`pe-${m.key as string}`}
              type="number"
              min={m.min}
              max={m.max}
              step={m.step}
              value={values[m.key as string] ?? ''}
              onChange={(e) =>
                set(m.key as string, e.target.value === '' ? 0 : Number(e.target.value))
              }
              className="num"
              placeholder="—"
            />
          </div>
        ))}

        <div className="sm:col-span-2">
          <Label htmlFor="pe-lift" className="mb-2">
            Lift name <span className="normal-case text-faint">(optional)</span>
          </Label>
          <Input
            id="pe-lift"
            value={strengthLabel}
            onChange={(e) => setStrengthLabel(e.target.value)}
            placeholder="e.g. Bench press"
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="pe-note" className="mb-2">
            Note <span className="normal-case text-faint">(optional)</span>
          </Label>
          <Input
            id="pe-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. slept badly, ate out"
            maxLength={140}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger sm:col-span-2">
            {error}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={save}>
          Cancel
        </Button>
        <Button onClick={save}>
          <TrendingUp className="size-4" />
          Save entry
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

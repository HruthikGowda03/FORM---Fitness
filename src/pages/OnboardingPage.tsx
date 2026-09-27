/* ==========================================================================
   FORM — the onboarding wizard
   ---------------------------------------------------------------------------
   Multi-step, autosaved, validated, animated, and keyboard navigable.
   Progress lives in `draft` state, is mirrored to localStorage on every change,
   and is validated per-step so Continue is only blocked when the current step
   is genuinely incomplete.
   ========================================================================== */

import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { CalcPreview } from '@/components/onboarding/CalcPreview'
import {
  ChipMultiSelect,
  Field,
  NumberField,
  OptionGroup,
  TextField,
  YesNo,
} from '@/components/onboarding/Fields'
import { GoalSelect, RateSelect, RateProjection } from '@/components/onboarding/GoalSelect'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { EASE, stepVariants } from '@/lib/motion'
import { cmToFeetInches, feetInchesToCm, formatHeight, fromKg, toKg } from '@/lib/units'
import { defaultProfile, COOK_FACILITY_LABELS, COUNTRIES, FOOD_STYLE_LABELS, GYM_EXPERIENCE_LABELS, HEALTH_FLAG_HELP, HEALTH_FLAG_LABELS, PLAN_MODE_HELP, PLAN_MODE_LABELS, RATE_HELP, RATE_LABELS, WORKOUT_TIME_LABELS, WORKOUT_TYPE_LABELS } from '@/lib/defaults'
import { ACTIVITY_LEVELS, computeCalorieBasis, computePlanTargets, goalDescriptor } from '@/lib/nutrition'
import { loadOnboardingDraft, saveOnboardingDraft, clearOnboardingDraft } from '@/lib/storage'
import { useActions, useProfile } from '@/store/AppStore'
import { cn } from '@/lib/cn'
import { formatNumber } from '@/lib/format'
import {
  type ActivityLevel,
  type Allergen,
  type CookFacility,
  type DietPreference,
  type FoodStyle,
  type GymExperience,
  type HealthFlag,
  type PlanMode,
  type Profile,
  type WorkoutTime,
  type WorkoutType,
  type WeightSystem,
} from '@/types'

/* --------------------------------------------------------------------------
   Step model
   -------------------------------------------------------------------------- */

type StepId =
  | 'about'
  | 'body'
  | 'activity'
  | 'goal'
  | 'food'
  | 'kitchen'
  | 'budget'
  | 'health'
  | 'review'

const STEPS: { id: StepId; title: string; blurb: string; short: string }[] = [
  { id: 'about', title: 'About you', blurb: 'Just the basics to get started.', short: 'About' },
  { id: 'body', title: 'Your body', blurb: 'Used only to estimate energy needs.', short: 'Body' },
  { id: 'activity', title: 'Activity & training', blurb: 'How much you actually move.', short: 'Activity' },
  { id: 'goal', title: 'Your goal', blurb: 'What you are working towards.', short: 'Goal' },
  { id: 'food', title: 'How you eat', blurb: 'Diet, allergies and exclusions.', short: 'Food' },
  { id: 'kitchen', title: 'Your day & kitchen', blurb: 'Meals, cooking and time.', short: 'Kitchen' },
  { id: 'budget', title: 'Budget & location', blurb: 'Cost assumptions and food style.', short: 'Budget' },
  { id: 'health', title: 'Health notes', blurb: 'Only what changes the advice.', short: 'Health' },
  { id: 'review', title: 'Review', blurb: 'Check it over, then build your plan.', short: 'Review' },
]

/* Under-18 users skip the weight-change steps entirely. */
const MINOR_STEPS: StepId[] = ['about', 'body', 'activity', 'goal', 'food', 'kitchen', 'budget', 'health', 'review']

/* --------------------------------------------------------------------------
   Validation
   -------------------------------------------------------------------------- */

type Errors = Partial<Record<string, string>>

function validateStep(id: StepId, p: Profile, minor: boolean): Errors {
  const e: Errors = {}

  if (id === 'about') {
    if (!Number.isFinite(p.age) || p.age < 10 || p.age > 110) {
      e.age = 'Enter an age between 10 and 110.'
    } else if (p.isAdult && p.age < 18) {
      e.age = 'You confirmed you are 18 or over, but the age entered is under 18. Please correct one of them.'
    }
  }

  if (id === 'body') {
    if (!Number.isFinite(p.heightCm) || p.heightCm < 120 || p.heightCm > 230) {
      e.heightCm = 'Enter a height between 120 and 230 cm.'
    }
    if (!Number.isFinite(p.weightKg) || p.weightKg < 25 || p.weightKg > 300) {
      e.weightKg = 'Enter a weight between 25 and 300 kg.'
    }
    if (p.waistCm !== undefined && (p.waistCm < 30 || p.waistCm > 200)) {
      e.waistCm = 'Enter a waist between 30 and 200 cm, or leave it blank.'
    }
  }

  if (id === 'activity') {
    if (p.workoutDaysPerWeek < 0 || p.workoutDaysPerWeek > 14) {
      e.workoutDaysPerWeek = 'Enter a number between 0 and 14.'
    }
    if (p.maxPrepMinutes < 5) e.maxPrepMinutes = 'Allow at least 5 minutes to make sense of a meal.'
  }

  if (id === 'goal' && !minor) {
    if (p.targetWeightKg !== undefined) {
      if (p.targetWeightKg < 25 || p.targetWeightKg > 300) {
        e.targetWeightKg = 'Enter a target weight between 25 and 300 kg.'
      } else if (Math.abs(p.targetWeightKg - p.weightKg) > 60) {
        e.targetWeightKg =
          'That is more than 60 kg from your current weight. FORM cannot plan a change that large safely — please speak to a professional.'
      }
    }
  }

  if (id === 'budget') {
    if (p.budget.amount < 0 || p.budget.amount > 1000000) {
      e.budget = 'Enter a food budget, or 0 if you do not want to track cost.'
    }
  }

  return e
}

/* --------------------------------------------------------------------------
   Wizard
   -------------------------------------------------------------------------- */

export function OnboardingPage() {
  const active = useProfile()
  const profile = active?.profile
  const onboardingComplete = active?.onboardingComplete ?? false
  const { completeOnboarding, resetOnboarding } = useActions()
  const navigate = useNavigate()
  const location = useLocation()
  const headingRef = useRef<HTMLHeadingElement>(null)

  const [draft, setDraft] = useState<Profile>(() => {
    const saved = loadOnboardingDraft()
    const base = profile ?? defaultProfile()
    return saved ? ({ ...base, ...saved, updatedAt: new Date().toISOString() } as Profile) : base
  })
  const [stepIndex, setStepIndex] = useState(0)
  const [errors, setErrors] = useState<Errors>({})
  const [direction, setDirection] = useState<1 | -1>(1)

  const minor = !draft.isAdult
  const steps = useMemo(
    () => (minor ? MINOR_STEPS.map((id) => STEPS.find((s) => s.id === id)!) : STEPS),
    [minor],
  )
  const step = steps[Math.min(stepIndex, steps.length - 1)]
  const isReview = step.id === 'review'
  const isLast = stepIndex === steps.length - 1

  /* Autosave every change. */
  useEffect(() => {
    saveOnboardingDraft(draft)
  }, [draft])

  useEffect(() => {
    document.title = onboardingComplete
      ? 'Edit your profile — FORM'
      : 'Build your plan — FORM'
  }, [onboardingComplete])

  const set = useCallback(<K extends keyof Profile>(key: K, value: Profile[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value, updatedAt: new Date().toISOString() }))
    setErrors((prev) => {
      const keyName = String(key)
      if (!(keyName in prev)) return prev
      const { [keyName]: _removed, ...rest } = prev
      return rest
    })
  }, [])

  const patch = useCallback((p: Partial<Profile>) => {
    setDraft((prev) => ({ ...prev, ...p, updatedAt: new Date().toISOString() }))
  }, [])

  const goNext = useCallback(() => {
    const found = validateStep(step.id, draft, minor)
    setErrors(found)

    if (Object.keys(found).length > 0) {
      // Move focus to the first problem so keyboard and screen-reader users
      // are not stranded.
      window.setTimeout(() => {
        document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      }, 30)
      return
    }

    if (isLast) {
      clearOnboardingDraft()
      completeOnboarding(draft)
      const from = (location.state as { from?: string } | null)?.from
      navigate(from && from !== '/onboarding' ? from : '/dashboard', { replace: true })
      return
    }

    setDirection(1)
    setStepIndex((i) => Math.min(i + 1, steps.length - 1))
  }, [step.id, draft, minor, isLast, steps.length, completeOnboarding, navigate, location.state])

  const goBack = useCallback(() => {
    setErrors({})
    setDirection(-1)
    setStepIndex((i) => Math.max(i - 1, 0))
  }, [])

  // Keep focus at the top of the step on navigation.
  useEffect(() => {
    headingRef.current?.focus()
  }, [stepIndex])

  const progress = ((stepIndex + (isReview ? 1 : 0)) / steps.length) * 100

  return (
    <div className="relative min-h-dvh">
      {/* background */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-[60vh] bloom-lime opacity-50" />
        <div className="absolute inset-0 bg-grid opacity-40" />
      </div>

      <div className="mx-auto w-full max-w-app px-4 pt-24 pb-20 sm:px-6 sm:pt-28 lg:px-8">
        {/* ---------------- header ---------------- */}
        <div className="flex flex-col gap-6 border-b border-line pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow text-accent">
              {onboardingComplete ? 'Edit your profile' : 'Build your plan'}
            </p>
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="display-face mt-3 text-display-md focus-visible:outline-none"
            >
              {step.title}
            </h1>
            <p className="mt-2.5 text-base text-muted">{step.blurb}</p>
          </div>

          {/* progress indicator */}
          <div className="w-full lg:w-80">
            <div className="flex items-baseline justify-between">
              <span className="eyebrow text-faint">
                Step {stepIndex + 1} of {steps.length}
              </span>
              <span className="num text-xs text-muted">{Math.round(progress)}%</span>
            </div>
            <div className="mt-3 h-1 bg-line-soft">
              <motion.div
                className="h-full bg-accent"
                initial={false}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: EASE.out }}
              />
            </div>
            <ol className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
              {steps.map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (i <= stepIndex) {
                        setDirection(i > stepIndex ? 1 : -1)
                        setStepIndex(i)
                        setErrors({})
                      }
                    }}
                    disabled={i > stepIndex}
                    aria-current={i === stepIndex ? 'step' : undefined}
                    className={cn(
                      'font-mono text-[0.625rem] tracking-widest uppercase transition-colors',
                      i === stepIndex
                        ? 'text-accent'
                        : i < stepIndex
                          ? 'text-muted hover:text-ink'
                          : 'cursor-not-allowed text-faint/60',
                    )}
                  >
                    {i < stepIndex && <Check className="mr-1 inline size-2.5" strokeWidth={3} />}
                    {s.short}
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* ---------------- under-18 notice ---------------- */}
        {minor && (
          <div className="mt-8">
            <Callout tone="info">
              <strong className="text-ink">You are under 18, so FORM will not set a calorie target.</strong>{' '}
              Growth, hormones and development mean energy restriction at your age needs specialist
              oversight. You will still get general balanced-eating information, portion guidance
              and a full meal plan built to maintenance-level portions. Talk to a doctor, a school
              nurse or a registered dietitian about what is right for you.
            </Callout>
          </div>
        )}

        {/* ---------------- body ---------------- */}
        <div className="mt-10 grid gap-10 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
          <div className="min-w-0">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={step.id}
                custom={direction}
                variants={stepVariants(direction)}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                <StepBody
                  step={step.id}
                  draft={draft}
                  set={set}
                  patch={patch}
                  errors={errors}
                  setErrors={setErrors}
                  minor={minor}
                />
              </motion.div>
            </AnimatePresence>

            {/* ---------------- nav ---------------- */}
            <div className="mt-10 flex flex-col-reverse gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <Button
                  variant="ghost"
                  onClick={goBack}
                  disabled={stepIndex === 0}
                  className={cn('icon-nudge-back', stepIndex === 0 && 'invisible')}
                >
                  <ArrowLeft className="size-4" />
                  Back
                </Button>
                {onboardingComplete && (
                  <Button
                    variant="ghost"
                    className="icon-nudge-back"
                    onClick={() => {
                      if (window.confirm('Discard your profile and start again? This cannot be undone.')) {
                        resetOnboarding()
                        clearOnboardingDraft()
                        setDraft(defaultProfile())
                        setStepIndex(0)
                      }
                    }}
                  >
                    <RotateCcw className="size-4" />
                    Reset
                  </Button>
                )}
              </div>

              <Button size="lg" onClick={goNext} className="icon-nudge">
                {isLast ? 'Build my plan' : 'Continue'}
                {isLast ? <Check className="size-4" /> : <ArrowRight className="size-4" />}
              </Button>
            </div>

            <p className="mt-4 font-mono text-[0.625rem] tracking-wide text-faint">
              Your answers are saved in this browser as you go. Nothing is uploaded anywhere.
            </p>
          </div>

          {/* ---------------- live preview ---------------- */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <CalcPreview draft={draft} />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ==========================================================================
   Step bodies
   ========================================================================== */

type StepProps = {
  step: StepId
  draft: Profile
  set: <K extends keyof Profile>(key: K, value: Profile[K]) => void
  patch: (p: Partial<Profile>) => void
  errors: Errors
  setErrors: (e: Errors) => void
  minor: boolean
}

function StepBody(props: StepProps) {
  switch (props.step) {
    case 'about':
      return <AboutStep {...props} />
    case 'body':
      return <BodyStep {...props} />
    case 'activity':
      return <ActivityStep {...props} />
    case 'goal':
      return <GoalStep {...props} />
    case 'food':
      return <FoodStep {...props} />
    case 'kitchen':
      return <KitchenStep {...props} />
    case 'budget':
      return <BudgetStep {...props} />
    case 'health':
      return <HealthStep {...props} />
    case 'review':
      return <ReviewStep {...props} />
    default:
      return null
  }
}

/* ---------------------------------- about --------------------------------- */

function AboutStep({ draft, set, errors }: StepProps) {
  return (
    <div className="flex flex-col gap-8">
      <TextField
        label="Name or nickname"
        value={draft.name ?? ''}
        onChange={(v) => set('name', v.trim() ? v.trim() : undefined)}
        placeholder="Optional — how should we greet you?"
        optional
        maxLength={40}
      />

      <NumberField
        label="Age"
        value={draft.age}
        onChange={(v) => set('age', v ?? 0)}
        unit="years"
        min={13}
        max={100}
        step={1}
        inputMode="numeric"
        error={errors.age}
      />

      <YesNo
        label="Are you 18 or older?"
        hint="This changes what FORM can responsibly do. If you are under 18, FORM will skip the weight-change guidance entirely."
        value={draft.isAdult}
        onChange={(v) => {
          set('isAdult', v)
          if (!v) {
            // A minor is never given a weight-change prescription.
            set('goal', 'general-fitness')
            set('targetWeightKg', undefined)
          }
        }}
        yesLabel="Yes, 18 or over"
        noLabel="No, I'm under 18"
        error={errors.isAdult}
      />

      <Field label="Units" hint="You can change this at any time in Settings.">
        <UnitToggle value={draft.units} onChange={(u) => set('units', u)} />
      </Field>
    </div>
  )
}

function UnitToggle({
  value,
  onChange,
}: {
  value: WeightSystem
  onChange: (u: WeightSystem) => void
}) {
  const options: { value: WeightSystem; title: string; description: string }[] = [
    { value: 'metric', title: 'Metric', description: 'Kilograms and centimetres' },
    { value: 'imperial', title: 'Imperial', description: 'Pounds and feet/inches' },
  ]
  return (
    <div role="radiogroup" aria-label="Measurement units" className="grid gap-2.5 sm:grid-cols-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'border px-4 py-3.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
            value === opt.value
              ? 'border-accent bg-accent-soft'
              : 'border-line bg-surface hover:border-line-strong',
          )}
        >
          <span
            className={cn(
              'display-face block text-sm',
              value === opt.value ? 'text-accent' : 'text-ink',
            )}
          >
            {opt.title}
          </span>
          <span className="mt-1 block text-xs text-muted">{opt.description}</span>
        </button>
      ))}
    </div>
  )
}

/* ----------------------------------- body --------------------------------- */

function BodyStep({ draft, set, errors }: StepProps) {
  const [heightMode, setHeightMode] = useState<WeightSystem>(draft.units)
  const [weightMode, setWeightMode] = useState<WeightSystem>(draft.units)

  const displayWeight = weightMode === 'metric' ? draft.weightKg : fromKg(draft.weightKg, 'lb')
  const displayWaist = draft.waistCm !== undefined ? (weightMode === 'metric' ? draft.waistCm : draft.waistCm / 2.54) : undefined

  const ft = cmToFeetInches(draft.heightCm)
  const [feet, setFeet] = useState(ft.feet)
  const [inches, setInches] = useState(ft.inches)

  return (
    <div className="flex flex-col gap-8">
      {/* ---------------- physiological sex ---------------- */}
      <OptionGroup
        label="Physiological sex (for the equation)"
        hint={
          <>
            This is <strong className="text-ink">only an input to a published equation</strong>. The
            Mifflin-St Jeor formula uses different constants for the two published variants, which
            is why it asks. It is <em>not</em> a question about your gender identity, it is not used
            to infer an ideal body, and FORM never uses it to decide what you should look like.
            <button
              type="button"
              className="ml-1 underline decoration-accent underline-offset-2 hover:text-accent"
              onClick={() => document.getElementById('sex-explain')?.scrollIntoView({ block: 'center' })}
            >
              Why we ask
            </button>
          </>
        }
        value={draft.sex}
        onChange={(v) => set('sex', v)}
        options={[
          {
            value: 'male',
            title: 'Male equation',
            description: 'Uses the +5 constant published for the male variant of the equation.',
          },
          {
            value: 'female',
            title: 'Female equation',
            description: 'Uses the −161 constant published for the female variant of the equation.',
          },
          {
            value: 'unspecified',
            title: 'Prefer not to say',
            description: 'Averages the two published constants, so the estimate sits between them.',
          },
        ]}
      />

      <div id="sex-explain" className="border-l-2 border-line bg-surface-inset px-4 py-3">
        <p className="eyebrow text-faint">Where this is used — and where it is not</p>
        <ul className="mt-2.5 space-y-1.5 text-xs leading-relaxed text-muted">
          <li>
            <strong className="text-ink">Used:</strong> one constant in the resting-energy equation.
            It is the only place in the whole app.
          </li>
          <li>
            <strong className="text-ink">Not used:</strong> meal suggestions, protein targets,
            portion sizes, goal framing, or anything about appearance. FORM also offers
            gender-neutral goal framing throughout.
          </li>
        </ul>
      </div>

      {/* ---------------- height ---------------- */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="eyebrow text-muted">Height</span>
          <UnitSwitch value={heightMode} onChange={setHeightMode} unit="cm" other="ft / in" />
        </div>

        {heightMode === 'metric' ? (
          <NumberField
            label="Height"
            value={Math.round(draft.heightCm)}
            onChange={(v) => v !== undefined && set('heightCm', v)}
            unit="cm"
            min={120}
            max={230}
            step={1}
            inputMode="numeric"
            error={errors.heightCm}
            hint={formatHeight(draft.heightCm, 'ft-in')}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <NumberField
              label="Feet"
              value={feet}
              onChange={(v) => {
                const f = v ?? 0
                setFeet(f)
                set('heightCm', feetInchesToCm(f, inches))
              }}
              unit="ft"
              min={3}
              max={8}
              step={1}
              inputMode="numeric"
            />
            <NumberField
              label="Inches"
              value={inches}
              onChange={(v) => {
                const i = v ?? 0
                setInches(i)
                set('heightCm', feetInchesToCm(feet, i))
              }}
              unit="in"
              min={0}
              max={11.5}
              step={0.5}
            />
            <div className="flex items-end pb-3">
              <span className="num border border-line bg-surface-inset px-3 py-3 font-mono text-xs text-faint">
                = {formatNumber(draft.heightCm)} cm
              </span>
            </div>
          </div>
        )}
        {errors.heightCm && (
          <p role="alert" className="text-sm text-danger">
            {errors.heightCm}
          </p>
        )}
      </div>

      {/* ---------------- weight ---------------- */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="eyebrow text-muted">Current weight</span>
          <UnitSwitch value={weightMode} onChange={setWeightMode} unit="kg" other="lb" />
        </div>
        <NumberField
          label="Current weight"
          value={Number.isFinite(displayWeight) ? Math.round(displayWeight * 10) / 10 : undefined}
          onChange={(v) => v !== undefined && set('weightKg', toKg(v, weightMode === 'metric' ? 'kg' : 'lb'))}
          unit={weightMode === 'metric' ? 'kg' : 'lb'}
          min={25}
          max={300}
          step={0.1}
          error={errors.weightKg}
          suffix={weightMode === 'metric' ? `${formatNumber(fromKg(draft.weightKg, 'lb'), 1)} lb` : `${formatNumber(draft.weightKg, 1)} kg`}
        />
      </div>

      {/* ---------------- waist ---------------- */}
      <NumberField
        label="Waist measurement"
        value={displayWaist !== undefined ? Math.round(displayWaist * 10) / 10 : undefined}
        onChange={(v) =>
          set('waistCm', v === undefined ? undefined : weightMode === 'metric' ? v : v * 2.54)
        }
        unit={weightMode === 'metric' ? 'cm' : 'in'}
        min={30}
        max={200}
        step={0.5}
        optional
        error={errors.waistCm}
        hint="Measured around your navel. Optional — it is used to show a waist-to-height reference, not to set a target."
      />
    </div>
  )
}

function UnitSwitch({
  value,
  onChange,
  unit,
  other,
}: {
  value: WeightSystem
  onChange: (v: WeightSystem) => void
  unit: string
  other: string
}) {
  return (
    <div
      className="flex border border-line"
      role="radiogroup"
      aria-label={`Units: ${unit} or ${other}`}
    >
      {[value, value === 'metric' ? 'imperial' : 'metric'].map((v) => {
        const isMetric = v === 'metric'
        const active = v === value
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(v as WeightSystem)}
            className={cn(
              'px-3 py-1.5 font-mono text-[0.625rem] tracking-widest uppercase transition-colors',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
              active ? 'bg-accent text-accent-contrast' : 'text-faint hover:text-ink',
            )}
          >
            {isMetric ? unit : other}
          </button>
        )
      })}
    </div>
  )
}

/* --------------------------------- activity -------------------------------- */

function ActivityStep({ draft, set, errors }: StepProps) {
  return (
    <div className="flex flex-col gap-8">
      <OptionGroup
        label="Outside the gym, how active is a normal day?"
        hint="Be honest rather than aspirational — this multiplier is one of the biggest levers in the whole estimate."
        value={draft.activityLevel}
        onChange={(v) => set('activityLevel', v as ActivityLevel)}
        columns={1}
        options={ACTIVITY_LEVELS.map((a) => ({
          value: a.id,
          title: a.label,
          description: `${a.blurb} · estimated ×${a.multiplier}`,
        }))}
      />

      <OptionGroup
        label="Gym experience"
        value={draft.gymExperience}
        onChange={(v) => set('gymExperience', v as GymExperience)}
        options={(['beginner', 'intermediate', 'advanced'] as GymExperience[]).map((e) => ({
          value: e,
          title: GYM_EXPERIENCE_LABELS[e],
        }))}
      />

      <Field
        label="How many days a week do you train?"
        hint="Including sport, running or anything you would count as a session."
        error={errors.workoutDaysPerWeek}
        htmlFor="workout-days"
      >
        <div className="flex items-center gap-4">
          <input
            id="workout-days"
            type="range"
            min={0}
            max={7}
            step={1}
            value={draft.workoutDaysPerWeek}
            onChange={(e) => set('workoutDaysPerWeek', Number(e.target.value))}
            className="form-range flex-1"
          />
          <span className="num w-14 shrink-0 border border-line bg-surface-inset py-2 text-center text-sm font-bold">
            {draft.workoutDaysPerWeek}
          </span>
        </div>
      </Field>

      <SelectField
        label="What do you usually train?"
        value={draft.workoutType}
        onChange={(v) => set('workoutType', v as WorkoutType)}
        options={Object.entries(WORKOUT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
      />

      <SelectField
        label="And when?"
        value={draft.workoutTime}
        onChange={(v) => set('workoutTime', v as WorkoutTime)}
        options={Object.entries(WORKOUT_TIME_LABELS).map(([value, label]) => ({ value, label }))}
        hint="FORM does not change your numbers based on training time — it is captured so meal timing suggestions make sense for you."
      />
    </div>
  )
}

/* ----------------------------------- goal ---------------------------------- */

function GoalStep({ draft, set, errors, minor }: StepProps) {
  const goalDef = goalDescriptor(draft.goal)
  const isGain = goalDef.gain
  const unit = draft.units === 'metric' ? 'kg' : 'lb'

  // A preview so RateProjection has something to talk about.
  const preview = minor
    ? null
    : (() => {
        try {
          return computeCalorieBasis(
            {
              weightKg: draft.weightKg,
              heightCm: draft.heightCm,
              age: draft.age,
              sex: draft.sex,
              activityLevel: draft.activityLevel,
              goal: draft.goal,
              rate: draft.rate,
            },
            { planMode: draft.planMode },
          )
        } catch {
          return null
        }
      })()

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="eyebrow mb-3 text-muted">Primary goal</p>
        <GoalSelect value={draft.goal} onChange={(g) => set('goal', g)} />
        <p className="mt-4 text-xs leading-relaxed text-faint">
          FORM does not show reference bodies or promise a particular physique. Height, weight and
          body-type labels cannot reliably predict how your body will respond, so it would be
          dishonest to display an outcome as a target. Pick the goal that reflects what you actually
          want.
        </p>
      </div>

      {!minor && (
        <>
          <div className="border-l-2 border-line bg-surface-inset px-4 py-3">
            <p className="eyebrow text-faint">About this goal</p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{goalDef.blurb}</p>
          </div>

          <div>
            <p className="eyebrow mb-3 text-muted">Preferred rate of change</p>
            <RateSelect value={draft.rate} onChange={(r) => set('rate', r)} />
            {preview && (
              <div className="mt-4">
                <RateProjection target={preview.target} tdee={preview.tdee} gain={isGain} unit={unit} />
              </div>
            )}
            <p className="mt-3 text-xs leading-relaxed text-faint">{RATE_HELP[draft.rate]}</p>
          </div>

          <NumberField
            label="Target weight"
            value={
              draft.targetWeightKg !== undefined
                ? Math.round(fromKg(draft.targetWeightKg, unit === 'kg' ? 'kg' : 'lb') * 10) / 10
                : undefined
            }
            onChange={(v) =>
              set('targetWeightKg', v === undefined ? undefined : toKg(v, unit === 'kg' ? 'kg' : 'lb'))
            }
            unit={unit}
            min={25}
            max={300}
            step={0.1}
            optional
            error={errors.targetWeightKg}
            hint="Optional. FORM never uses this to set a rate — it is shown back to you for context only."
            suffix={
              draft.weightKg
                ? `${((draft.targetWeightKg ?? draft.weightKg) - draft.weightKg >= 0 ? '+' : '') + Math.round(
                    ((draft.targetWeightKg ?? draft.weightKg) - draft.weightKg) * (unit === 'lb' ? 2.20462 : 1) * 10,
                  ) / 10} ${unit} from now`
                : undefined
            }
          />
        </>
      )}
    </div>
  )
}

/* ----------------------------------- food ---------------------------------- */

const ALLERGEN_OPTIONS: { value: Allergen; label: string }[] = [
  { value: 'milk', label: 'Milk / dairy' },
  { value: 'egg', label: 'Egg' },
  { value: 'gluten', label: 'Gluten / wheat' },
  { value: 'peanut', label: 'Peanut' },
  { value: 'tree-nut', label: 'Tree nuts' },
  { value: 'soy', label: 'Soy' },
  { value: 'sesame', label: 'Sesame' },
  { value: 'fish', label: 'Fish' },
  { value: 'shellfish', label: 'Shellfish' },
]

const EXCLUSION_SUGGESTIONS: { value: string; label: string }[] = [
  { value: 'onion', label: 'Onion' },
  { value: 'tomato', label: 'Tomato' },
  { value: 'garlic', label: 'Garlic' },
  { value: 'mushroom', label: 'Mushroom' },
  { value: 'coconut', label: 'Coconut' },
  { value: 'tomato', label: 'Tomato' },
  { value: 'spinach', label: 'Spinach' },
  { value: 'brinjal', label: 'Brinjal' },
  { value: 'cauliflower', label: 'Cauliflower' },
  { value: 'ghee', label: 'Ghee' },
]

function FoodStep({ draft, set }: StepProps) {
  const [custom, setCustom] = useState('')

  const addExclusion = () => {
    const term = custom.trim().toLowerCase()
    if (term.length < 2 || draft.excludeIngredients.includes(term)) return
    set('excludeIngredients', [...draft.excludeIngredients, term])
    setCustom('')
  }

  return (
    <div className="flex flex-col gap-8">
      <OptionGroup
        label="Dietary preference"
        hint="This decides which foods the meal planner is allowed to use at all."
        value={draft.diet}
        onChange={(v) => set('diet', v as DietPreference)}
        columns={2}
        options={[
          { value: 'vegetarian', title: 'Vegetarian', description: 'No meat or fish. Dairy and eggs are fine.' },
          { value: 'vegan', title: 'Vegan', description: 'No animal products at all, including dairy and eggs.' },
          { value: 'eggs', title: 'Egg-inclusive', description: 'Vegetarian, plus eggs. No meat or fish.' },
          {
            value: 'non-vegetarian',
            title: 'Non-vegetarian',
            description: 'Everything, including meat and fish.',
          },
        ]}
      />

      <ChipMultiSelect
        label="Allergies and intolerances"
        hint="FORM will never put a listed allergen in a plan, and will not offer a meal containing it as a swap. This is a hard filter, not a preference."
        values={draft.allergens}
        onChange={(v) => set('allergens', v)}
        options={ALLERGEN_OPTIONS}
        emptyHint="Nothing selected. If you have a serious allergy, add it here even if you are not sure FORM has it covered."
      />

      {draft.allergens.includes('gluten') && (
        <Callout tone="warn">
          <strong className="text-ink">Gluten excluded.</strong> This removes wheat-based roti, dosa,
          paratha, bread, pasta and oats. Indian plans built without gluten become grain-light, so
          you will see more rice, quinoa, ragi and potato. That is a real trade-off FORM shows you
          rather than hides.
        </Callout>
      )}

      <div>
        <div className="mb-3">
          <p className="eyebrow text-muted">Ingredients to avoid</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Separate from allergies: foods you simply do not want. Type an ingredient and press
            Enter.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {EXCLUSION_SUGGESTIONS.filter(
            (s, i, arr) => arr.findIndex((x) => x.value === s.value) === i,
          ).map((s) => {
            const active = draft.excludeIngredients.includes(s.value)
            return (
              <button
                key={s.value}
                type="button"
                onClick={() =>
                  set(
                    'excludeIngredients',
                    active
                      ? draft.excludeIngredients.filter((x) => x !== s.value)
                      : [...draft.excludeIngredients, s.value],
                  )
                }
                className={cn(
                  'border px-3 py-1.5 font-mono text-[0.625rem] tracking-widest uppercase transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                  active
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line text-faint hover:border-line-strong hover:text-ink',
                )}
              >
                {s.label}
              </button>
            )
          })}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={custom}
            placeholder="Add your own…"
            aria-label="Add an ingredient to avoid"
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addExclusion()
              }
            }}
            className="h-11 flex-1 border border-line bg-surface-inset px-3.5 text-sm text-ink placeholder:text-faint focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent"
          />
          <Button variant="secondary" onClick={addExclusion} disabled={custom.trim().length < 2}>
            Add
          </Button>
        </div>

        {draft.excludeIngredients.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {draft.excludeIngredients.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  onClick={() =>
                    set(
                      'excludeIngredients',
                      draft.excludeIngredients.filter((x) => x !== item),
                    )
                  }
                  className="inline-flex items-center gap-1.5 border border-accent/50 bg-accent-soft px-2.5 py-1 font-mono text-[0.625rem] tracking-widest text-accent uppercase hover:bg-accent/20"
                >
                  {item}
                  <span aria-hidden="true">×</span>
                  <span className="sr-only">Remove {item}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/* --------------------------------- kitchen --------------------------------- */

function KitchenStep({ draft, set, errors }: StepProps) {
  return (
    <div className="flex flex-col gap-8">
      <OptionGroup
        label="How many meals a day?"
        value={String(draft.mealsPerDay) as '3' | '4' | '5'}
        onChange={(v) => set('mealsPerDay', Number(v) as 3 | 4 | 5)}
        options={[
          { value: '3', title: '3 meals', description: 'Breakfast, lunch, dinner' },
          { value: '4', title: '4 meals', description: 'Adds one snack' },
          { value: '5', title: '5 meals', description: 'Adds two snacks — useful for high-protein targets' },
        ]}
      />

      <OptionGroup
        label="Cooking facilities"
        hint="FORM will not suggest a dish you cannot physically make."
        value={draft.cookFacility}
        onChange={(v) => set('cookFacility', v as CookFacility)}
        columns={1}
        options={Object.entries(COOK_FACILITY_LABELS).map(([value, label]) => ({
          value,
          title: label,
          description:
            value === 'no-cook'
              ? 'No-cook options only: oats, milk, fruit, nuts, curd, sandwiches, salads.'
              : value === 'microwave'
                ? 'Microwave and no-cook options.'
                : value === 'basic'
                  ? 'Stovetop and basic pots, no oven or blender assumed.'
                  : 'Full access, including an oven or blender.',
        }))}
      />

      <Field
        label="How much time can you spend on a meal?"
        hint="The longest single meal in the plan has to fit inside this."
        error={errors.maxPrepMinutes}
        htmlFor="prep-time"
      >
        <div className="flex items-center gap-4">
          <input
            id="prep-time"
            type="range"
            min={5}
            max={90}
            step={5}
            value={draft.maxPrepMinutes}
            onChange={(e) => set('maxPrepMinutes', Number(e.target.value))}
            className="form-range flex-1"
          />
          <span className="num w-20 shrink-0 border border-line bg-surface-inset py-2 text-center text-sm font-bold">
            {draft.maxPrepMinutes} min
          </span>
        </div>
      </Field>

      <div>
        <p className="eyebrow mb-1 text-muted">Plan mode</p>
        <p className="mb-3 text-sm leading-relaxed text-muted">
          How FORM should prioritise when the perfect plan and the affordable plan disagree.
        </p>
        <OptionGroup
          label=""
          value={draft.planMode}
          onChange={(v) => set('planMode', v as PlanMode)}
          options={(['balanced', 'student', 'high-protein'] as PlanMode[]).map((m) => ({
            value: m,
            title: PLAN_MODE_LABELS[m],
            description: PLAN_MODE_HELP[m],
          }))}
        />
      </div>
    </div>
  )
}

/* ---------------------------------- budget --------------------------------- */

function BudgetStep({ draft, set, patch, errors }: StepProps) {
  const isWeekly = draft.budget.period === 'weekly'

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="eyebrow mb-3 text-muted">Food budget</p>
        <p className="mb-4 text-sm leading-relaxed text-muted">
          FORM estimates grocery cost from per-kilogram assumptions stored in the app —{' '}
          <strong className="text-ink">not live prices</strong>. Set a budget and it will tell you
          honestly whether the plan fits. You can correct every price later in Settings.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <NumberField
              label="Amount"
              value={draft.budget.amount}
              onChange={(v) => patch({ budget: { ...draft.budget, amount: v ?? 0 } })}
              unit={draft.budget.currency}
              min={0}
              max={1000000}
              step={50}
              error={errors.budget}
              hint={isWeekly ? 'Per week' : 'Per month'}
            />
          </div>
          <div className="flex gap-2">
            <div role="radiogroup" aria-label="Budget period" className="flex border border-line">
              {(['weekly', 'monthly'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={draft.budget.period === p}
                  onClick={() => patch({ budget: { ...draft.budget, period: p } })}
                  className={cn(
                    'px-3.5 py-3 font-mono text-[0.625rem] tracking-widest uppercase transition-colors',
                    'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent',
                    draft.budget.period === p
                      ? 'bg-accent text-accent-contrast'
                      : 'text-faint hover:text-ink',
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <Select
              value={draft.budget.currency}
              onValueChange={(v) => patch({ budget: { ...draft.budget, currency: v as 'INR' | 'USD' } })}
            >
              <SelectTrigger className="w-24" aria-label="Currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INR">₹ INR</SelectItem>
                <SelectItem value="USD">$ USD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="mt-3 text-xs text-faint">
          Enter 0 if you would rather FORM did not track cost at all.
        </p>
      </div>

      <SelectField
        label="Where are you?"
        value={draft.country}
        onChange={(v) => set('country', v)}
        options={COUNTRIES.map((c) => ({ value: c, label: c }))}
      />

      <OptionGroup
        label="Preferred food style"
        hint="FORM leans towards Indian kitchens by default and builds its plan from there."
        value={draft.foodStyle}
        onChange={(v) => set('foodStyle', v as FoodStyle)}
        columns={2}
        options={Object.entries(FOOD_STYLE_LABELS).map(([value, label]) => ({
          value,
          title: label,
        }))}
      />
    </div>
  )
}

/* ---------------------------------- health --------------------------------- */

const HEALTH_OPTIONS: { value: HealthFlag; label: string }[] = (
  Object.keys(HEALTH_FLAG_LABELS) as HealthFlag[]
)
  .filter((f) => f !== 'none')
  .map((f) => ({ value: f, label: HEALTH_FLAG_LABELS[f] }))

function HealthStep({ draft, set, patch }: StepProps) {
  const toggle = (flag: HealthFlag) => {
    const has = draft.healthFlags.includes(flag)
    set(
      'healthFlags',
      has ? draft.healthFlags.filter((f) => f !== flag) : [...draft.healthFlags.filter((f) => f !== 'none'), flag],
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="eyebrow mb-1 text-muted">Anything that changes the advice?</p>
        <p className="mb-4 text-sm leading-relaxed text-muted">
          FORM only asks about things that genuinely change what it should recommend. It does not
          ask for your medical history. Select all that apply — leave everything blank if none of
          these apply to you.
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {HEALTH_OPTIONS.map((opt) => {
            const active = draft.healthFlags.includes(opt.value)
            const help = HEALTH_FLAG_HELP[opt.value]
            const gating = ['pregnancy', 'breastfeeding', 'eating-disorder-risk', 'diabetes', 'kidney-disease', 'medication-affecting-diet'].includes(
              opt.value,
            )
            return (
              <button
                key={opt.value}
                type="button"
                role="checkbox"
                aria-checked={active}
                onClick={() => toggle(opt.value)}
                className={cn(
                  'flex items-start gap-2.5 border px-3.5 py-3 text-left text-sm transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                  active
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-0.5 flex size-4 shrink-0 items-center justify-center border',
                    active ? 'border-accent bg-accent' : 'border-line-strong',
                  )}
                >
                  {active && (
                    <svg viewBox="0 0 10 10" className="size-2.5 text-accent-contrast" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path d="M1.5 5.2 4 7.6 8.6 2.6" strokeLinecap="square" />
                    </svg>
                  )}
                </span>
                <span>
                  {opt.label}
                  {gating && (
                    <Badge variant="warn" size="sm" className="ml-2 align-middle">
                      Changes plan
                    </Badge>
                  )}
                  {help && <span className="mt-1 block text-xs leading-relaxed text-faint">{help}</span>}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label htmlFor="form-notes" className="eyebrow block text-muted">
          Anything else worth noting?
        </label>
        <p className="mt-2 mb-3 text-sm leading-relaxed text-muted">
          Optional. A sentence in your own words. This stays on your device and is never read by
          anyone else.
        </p>
        <Textarea
          id="form-notes"
          value={draft.notes}
          onChange={(e) => patch({ notes: e.target.value.slice(0, 500) })}
          placeholder="e.g. I train early and need something portable, or I share a kitchen with six people."
          maxLength={500}
        />
        <p className="num mt-1.5 text-right text-[0.625rem] text-faint">
          {draft.notes.length} / 500
        </p>
      </div>
    </div>
  )
}

/* ---------------------------------- review --------------------------------- */

function ReviewStep({ draft, patch }: StepProps) {
  const { safety, basis, targets } = useMemo(
    () => computeCalorieBasisSummary(draft),
    [draft],
  )

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Name', value: draft.name || <span className="text-faint">Not given</span> },
    { label: 'Age', value: `${draft.age} · ${draft.isAdult ? '18 or over' : 'under 18'}` },
    {
      label: 'Equation input',
      value:
        draft.sex === 'unspecified'
          ? 'Prefer not to say (averaged)'
          : draft.sex === 'male'
            ? 'Male equation'
            : 'Female equation',
    },
    { label: 'Height', value: formatHeight(draft.heightCm, draft.units === 'metric' ? 'cm' : 'ft-in') },
    {
      label: 'Weight',
      value: `${formatNumber(
        draft.units === 'metric' ? draft.weightKg : draft.weightKg / 0.45359237,
        1,
      )} ${draft.units === 'metric' ? 'kg' : 'lb'}`,
    },
    {
      label: 'Activity',
      value: `${ACTIVITY_LEVELS.find((a) => a.id === draft.activityLevel)?.label} · ×${
        ACTIVITY_LEVELS.find((a) => a.id === draft.activityLevel)?.multiplier
      }`,
    },
    { label: 'Training', value: `${draft.workoutDaysPerWeek} days/week · ${WORKOUT_TYPE_LABELS[draft.workoutType]}` },
    { label: 'Goal', value: goalDescriptor(draft.goal).label },
    { label: 'Rate', value: RATE_LABELS[draft.rate] },
    { label: 'Diet', value: DRAFT_DIET_LABELS[draft.diet] },
    {
      label: 'Allergies',
      value: draft.allergens.length
        ? draft.allergens.map((a) => ALLERGEN_OPTIONS.find((o) => o.value === a)?.label ?? a).join(', ')
        : <span className="text-faint">None listed</span>,
    },
    {
      label: 'Avoiding',
      value: draft.excludeIngredients.length ? draft.excludeIngredients.join(', ') : <span className="text-faint">Nothing</span>,
    },
    { label: 'Meals', value: `${draft.mealsPerDay} per day · up to ${draft.maxPrepMinutes} min` },
    { label: 'Kitchen', value: COOK_FACILITY_LABELS[draft.cookFacility] },
    { label: 'Mode', value: PLAN_MODE_LABELS[draft.planMode] },
    {
      label: 'Budget',
      value:
        draft.budget.amount > 0
          ? `${draft.budget.currency === 'INR' ? '₹' : '$'}${formatNumber(draft.budget.amount)} / ${
              draft.budget.period === 'weekly' ? 'week' : 'month'
            }`
          : <span className="text-faint">Not tracking cost</span>,
    },
    { label: 'Location', value: `${draft.country} · ${FOOD_STYLE_LABELS[draft.foodStyle]}` },
  ]

  return (
    <div className="flex flex-col gap-8">
      {/* targets */}
      {safety.gated || !basis || !targets ? (
        <Callout tone="warn">
          <strong className="text-ink">No calorie target will be created for this profile.</strong>
          {safety.reasons.map((r) => (
            <span key={r} className="mt-1.5 block">{r}</span>
          ))}
        </Callout>
      ) : (
        <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
          {[
            { label: 'BMR', value: formatNumber(basis.bmr) },
            { label: 'TDEE', value: formatNumber(basis.tdee) },
            { label: 'Target', value: formatNumber(basis.target), accent: true },
            { label: 'Protein', value: `${formatNumber(targets.protein)}g` },
          ].map((s) => (
            <div key={s.label} className="bg-surface p-4">
              <p className="eyebrow text-faint">{s.label}</p>
              <p className={cn('num mt-1.5 text-xl font-bold', s.accent ? 'text-accent' : 'text-ink')}>
                {s.value}
              </p>
            </div>
          ))}
        </div>
      )}

      <div>
        <p className="eyebrow mb-3 text-muted">Your answers</p>
        <dl className="grid gap-px border border-line bg-line sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4 bg-surface px-4 py-3">
              <dt className="eyebrow shrink-0 text-faint">{row.label}</dt>
              <dd className="text-right text-sm text-ink">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div>
        <p className="eyebrow mb-3 text-muted">Plan mode</p>
        <OptionGroup
          label=""
          value={draft.planMode}
          onChange={(v) => patch({ planMode: v as PlanMode })}
          options={(['balanced', 'student', 'high-protein'] as PlanMode[]).map((m) => ({
            value: m,
            title: PLAN_MODE_LABELS[m],
            description: PLAN_MODE_HELP[m],
          }))}
        />
      </div>
    </div>
  )
}

const DRAFT_DIET_LABELS: Record<DietPreference, string> = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  eggs: 'Egg-inclusive',
  'non-vegetarian': 'Non-vegetarian',
}

function computeCalorieBasisSummary(draft: Profile) {
  return computePlanTargets(draft)
}

/* ------------------------------ select field ------------------------------ */

function SelectField({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  hint?: string
}) {
  return (
    <Field label={label} hint={hint}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

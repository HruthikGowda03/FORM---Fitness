/* ==========================================================================
   FORM — landing page sections
   ========================================================================== */

import {
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  IndianRupee,
  Layers,
  LineChart,
  ShieldCheck,
  ShoppingBasket,
  SlidersHorizontal,
  Sparkles,
  Utensils,
  Wallet,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import { HERO_STATS } from '@/components/landing/Hero'
import { Reveal, SectionHeading } from '@/components/layout/Page'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { EASE } from '@/lib/motion'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'

/* --------------------------------------------------------------------------
   Features
   -------------------------------------------------------------------------- */

type Feature = {
  icon: typeof Activity
  title: string
  body: string
  span?: boolean
}

const FEATURES: Feature[] = [
  {
    icon: Activity,
    title: 'A calorie target you can audit',
    body: 'Mifflin-St Jeor for resting energy, an activity multiplier for total daily energy, then a goal adjustment — clamped by a safety floor so FORM never hands you an extreme number. Every step is shown.',
    span: true,
  },
  {
    icon: Layers,
    title: 'Macros in grams, not percentages of nothing',
    body: 'Protein, carbohydrate and fat are calculated per kilogram of body mass and then converted to energy, so the three always add up to the target.',
  },
  {
    icon: Utensils,
    title: 'Indian food, properly modelled',
    body: 'Idli, dosa, poha, upma, roti, dal, rajma, chole, paneer, curd, lauki, bhindi, sprouts, tandoori chicken and fish curry — each with a portion size and prep time.',
  },
  {
    icon: SlidersHorizontal,
    title: 'Plans that fit your kitchen',
    body: 'Vegetarian, vegan, egg-inclusive or non-vegetarian. Filter by allergy, prep time, cooking facility, budget and food style. Swap any meal for a nutritionally similar alternative.',
  },
  {
    icon: Wallet,
    title: 'A budget you can actually hit',
    body: 'Costs come from per-kilogram assumptions you control, not invented live prices. Compare the plan against your weekly budget and see exactly where the money goes.',
    span: true,
  },
  {
    icon: ShoppingBasket,
    title: 'A grouped shopping list',
    body: 'Every plan consolidates into one list by vegetables, fruit, grains, dairy, protein and pantry. Tick items off, adjust quantities, print it or export CSV.',
  },
  {
    icon: LineChart,
    title: 'Progress without obsession',
    body: 'Weekly trend lines, not daily weigh-ins. Log energy, sleep, mood and gym performance alongside weight, and hide the metrics you would rather not see.',
  },
  {
    icon: BarChart3,
    title: 'Honest about its limits',
    body: 'Equations estimate group averages. Food values are rounded. Progress markers are built for consistency, not compulsion — and there is no streak to break.',
  },
]

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = feature.icon
  return (
    <Reveal
      className={
        feature.span
          ? 'md:col-span-2 lg:col-span-1'
          : undefined
      }
    >
      <motion.article
        whileHover={{ y: -4 }}
        transition={{ duration: 0.25, ease: EASE.out }}
        className="group relative h-full border border-line bg-surface p-6 hover:border-accent/40 hover:shadow-[0_18px_40px_-26px_color-mix(in_oklab,var(--color-accent)_60%,transparent)] sm:p-7"
      >
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-accent transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-x-100"
        />
        <span className="inline-flex size-11 items-center justify-center border border-line bg-surface-raised text-accent transition-[border-color,background-color,color,transform] duration-300 ease-[var(--ease-out-expo)] group-hover:-translate-y-0.5 group-hover:border-accent/50 group-hover:bg-accent-soft">
          <Icon className="size-5 transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:scale-110 group-hover:rotate-6" strokeWidth={1.75} />
        </span>
        <h3 className="display-face mt-5 text-xl tracking-tight transition-colors group-hover:text-accent">
          {feature.title}
        </h3>
        <p className="mt-3 text-sm leading-relaxed text-muted">{feature.body}</p>
      </motion.article>
    </Reveal>
  )
}

export function Features() {
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="mx-auto w-full max-w-app px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="What you get"
            title="Everything a plan needs. Nothing it doesn't."
            lead="FORM is deliberately narrow. It estimates your energy needs, builds a meal plan from real foods, and helps you shop and track. It does not sell you anything, and it does not claim precision it doesn't have."
          />
        </Reveal>

        <div className="mt-14 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} feature={f} />
          ))}
        </div>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------------------
   How it works
   -------------------------------------------------------------------------- */

const STEPS: { n: string; title: string; body: string; detail: ReactNode }[] = [
  {
    n: '01',
    title: 'Tell FORM about you',
    body: 'A short, skippable questionnaire: age, height, weight, activity, training, goal, diet, allergies, budget and how much time you have to cook.',
    detail: (
      <span className="font-mono text-[0.6875rem] tracking-widest text-faint uppercase">
        2 minutes · autosaved
      </span>
    ),
  },
  {
    n: '02',
    title: 'See how the number is built',
    body: 'FORM calculates your resting energy, applies an activity multiplier, adjusts for your goal, then explains every assumption and the limits on it.',
    detail: (
      <span className="font-mono text-[0.6875rem] tracking-widest text-faint uppercase">
        Mifflin-St Jeor · shown in full
      </span>
    ),
  },
  {
    n: '03',
    title: 'Get a week of food you will eat',
    body: 'A seven-day plan built from your diet, allergies, prep-time limit and budget — with portions, energy, macros, prep time and cost on every meal.',
    detail: (
      <span className="font-mono text-[0.6875rem] tracking-widest text-faint uppercase">
        Breakfast → dinner → snacks
      </span>
    ),
  },
  {
    n: '04',
    title: 'Shop, cook, log, adjust',
    body: 'Turn the plan into a grouped shopping list, log what you actually ate, and watch weekly trends. Then change the target if your progress says you should.',
    detail: (
      <span className="font-mono text-[0.6875rem] tracking-widest text-faint uppercase">
        Adjust in 100–150 kcal steps
      </span>
    ),
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="relative border-y border-line bg-bg-sunken py-24 sm:py-32">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-dots opacity-40" />
      <div className="relative mx-auto w-full max-w-app px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="How it works"
            title="Four steps, and you can see all of them."
            lead="No black box. Open any part of the plan and the reasoning is right there."
          />
        </Reveal>

        <ol className="mt-14 grid gap-px border border-line bg-line md:grid-cols-2 xl:grid-cols-4">
          {STEPS.map((step, i) => (
            <Reveal as="li" key={step.n} delay={i * 0.08} className="group bg-bg-sunken">
              <div className="relative h-full bg-bg-sunken p-6 transition-colors duration-300 ease-[var(--ease-out-expo)] group-hover:bg-surface sm:p-7">
                <span
                  className="num block text-4xl font-bold text-line-strong transition-[color,transform] duration-300 ease-[var(--ease-out-expo)] group-hover:-translate-y-0.5 group-hover:text-accent"
                >
                  {step.n}
                </span>
                <h3 className="display-face mt-4 text-lg tracking-tight transition-colors group-hover:text-ink">
                  {step.title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{step.body}</p>
                <p className="mt-5 block border-t border-line pt-4">{step.detail}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------------------
   Stats strip
   -------------------------------------------------------------------------- */

export function StatStrip() {
  return (
    <section className="border-b border-line">
      <div className="mx-auto grid w-full max-w-app gap-px bg-line sm:grid-cols-3">
        {HERO_STATS.map((stat, i) => {
          const Icon = stat.icon
          return (
            <Reveal key={stat.label} delay={i * 0.07} className="group bg-bg">
              <div className="flex items-center gap-4 p-6">
                <span className="inline-flex size-10 shrink-0 items-center justify-center border border-line text-accent transition-[border-color,background-color,transform] duration-300 ease-[var(--ease-out-expo)] group-hover:-translate-y-0.5 group-hover:border-accent/50 group-hover:bg-accent-soft">
                  <Icon className="size-4.5" strokeWidth={1.75} />
                </span>
                <div>
                  <p className="eyebrow text-faint">{stat.label}</p>
                  <p className="display-face mt-1 text-sm text-ink transition-colors group-hover:text-accent">
                    {stat.value}
                  </p>
                </div>
              </div>
            </Reveal>
          )
        })}
      </div>
    </section>
  )
}

/* --------------------------------------------------------------------------
   Honesty section — the differentiator
   -------------------------------------------------------------------------- */

const GUARDRAILS = [
  {
    icon: ShieldCheck,
    title: 'A safety floor, and a route out',
    body: 'FORM will not produce a target below a commonly cited adult lower bound, and it never recommends a deficit larger than 25% or a surplus larger than 20%. If your answers point to pregnancy, breastfeeding, a history of disordered eating, diabetes, kidney disease or a medication that affects diet, it stops and points you to a professional instead of a number.',
  },
  {
    icon: BookOpen,
    title: 'Nutrition values are approximate, and labelled that way',
    body: 'The food database is built from public composition tables and rounded for planning. A real cooked portion depends on the recipe, the oil, the brand and how it was weighed. FORM shows "approximate per serving" everywhere rather than implying laboratory precision.',
  },
  {
    icon: IndianRupee,
    title: 'Prices are assumptions, not quotes',
    body: 'Cost estimates come from per-kilogram numbers stored in the app. They are starting guesses for planning. Edit any of them in Settings to match what you actually pay where you live.',
  },
  {
    icon: Activity,
    title: 'No invented social proof',
    body: 'There are no fabricated testimonials, no made-up user counts and no medical endorsements on this site. If a number cannot be honestly defended, it is not here.',
  },
]

export function Honesty() {
  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto w-full max-w-app px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <Reveal>
            <div className="lg:sticky lg:top-28">
              <SectionHeading
                eyebrow="The honest part"
                title="What FORM won't pretend."
                lead="Most nutrition apps overclaim. These are the limits, stated up front rather than buried in a disclaimer."
              />
              <div className="mt-8">
                <Callout tone="warn">
                  <strong className="text-ink">FORM is not medical advice.</strong> It is an
                  educational planning tool. If you are under 18, pregnant or breastfeeding, managing
                  a medical condition, or have a history of disordered eating, talk to a doctor or a
                  registered dietitian before changing how you eat.
                </Callout>
              </div>
            </div>
          </Reveal>

          <div className="grid gap-px border border-line bg-line">
            {GUARDRAILS.map((g, i) => {
              const Icon = g.icon
              return (
                <Reveal key={g.title} delay={i * 0.06} className="group bg-bg">
                  <div className="flex gap-5 bg-bg p-6 transition-colors duration-300 ease-[var(--ease-out-expo)] group-hover:bg-surface-raised sm:p-7">
                    <span className="inline-flex size-10 shrink-0 items-center justify-center border border-line text-accent transition-[border-color,background-color,transform] duration-300 ease-[var(--ease-out-expo)] group-hover:-translate-y-0.5 group-hover:border-accent/50 group-hover:bg-accent-soft">
                      <Icon className="size-4.5" strokeWidth={1.75} />
                    </span>
                    <div>
                      <h3 className="display-face text-lg tracking-tight transition-colors group-hover:text-accent">
                        {g.title}
                      </h3>
                      <p className="mt-2.5 text-sm leading-relaxed text-muted">{g.body}</p>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------------------
   Final CTA
   -------------------------------------------------------------------------- */

export function FinalCta() {
  return (
    <section className="relative overflow-hidden border-y border-line">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="absolute inset-0 bloom-lime opacity-90" />
      </div>

      <div className="mx-auto w-full max-w-app px-4 py-24 text-center sm:px-6 sm:py-32 lg:px-8">
        <Reveal>
          <Badge variant="accent" size="lg">
            <Sparkles className="size-3" />
            Free · No account · Runs in your browser
          </Badge>

          <h2 className="mx-auto mt-8 max-w-4xl text-display-lg display-face">
            Stop guessing what to eat.
          </h2>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Answer a few questions, and get a plan you can actually cook — with every number
            explained and every limit stated.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="xl" className="group">
              <Link to="/onboarding">
                Build my plan
                <ArrowRight className="size-4 transition-transform duration-300 ease-[var(--ease-out-expo)] group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button asChild size="xl" variant="secondary">
              <Link to="/learn">Read the knowledge centre</Link>
            </Button>
          </div>

          <p className="mt-8 font-mono text-[0.6875rem] tracking-widest text-faint uppercase">
            FORM · Fuel Your Transformation
          </p>
        </Reveal>
      </div>
    </section>
  )
}

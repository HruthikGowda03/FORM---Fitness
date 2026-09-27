/* ==========================================================================
   FORM — hero
   ---------------------------------------------------------------------------
   Staggered headline reveal, a live dashboard preview, and a marquee of the
   food database. The headline words animate in with a mask-and-rise so they
   land the way a title card does.
   ========================================================================== */

import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { ArrowRight, Calculator, ListChecks, ShoppingBasket } from 'lucide-react'
import { useRef } from 'react'
import { Link } from 'react-router-dom'

import { DashboardPreview } from '@/components/landing/DashboardPreview'
import { Button } from '@/components/ui/button'
import { EASE, fadeIn, staggerContainer } from '@/lib/motion'
import { cn } from '@/lib/cn'

/** One headline line, masked so the text rises into place. */
function HeadlineLine({ children, delay = 0 }: { children: string; delay?: number }) {
  const reduce = useReducedMotion()
  if (reduce) {
    return <span className="block">{children}</span>
  }
  return (
    <span className="block overflow-hidden pb-[0.06em]">
      <motion.span
        className="block"
        initial={{ y: '110%' }}
        animate={{ y: 0 }}
        transition={{ duration: 0.9, delay, ease: EASE.out }}
      >
        {children}
      </motion.span>
    </span>
  )
}

const MARQUEE = [
  'Idli', 'Dosa', 'Paneer tikka', 'Dal', 'Chana', 'Sprouts', 'Tandoori chicken',
  'Roti', 'Rajma', 'Tofu', 'Brown rice', 'Eggs', 'Idli', 'Fish curry', 'Idli',
  'Oats', 'Moong dal', 'Tandoori chicken', 'Dosa', 'Curd', 'Quinoa', 'Peanut butter',
]

export function Hero() {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const previewY = useTransform(scrollYProgress, [0, 1], ['0%', '9%'])
  const previewRotate = useTransform(scrollYProgress, [0, 1], [0, 1.4])

  return (
    <section ref={ref} className="relative overflow-hidden pt-28 sm:pt-32 lg:pt-36">
      {/* background layers */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid opacity-60" />
        <div className="absolute inset-x-0 top-0 h-[70vh] bloom-lime opacity-70" />
        <div className="absolute inset-x-0 bottom-0 h-64 bloom-deep" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-line to-transparent" />
      </div>

      <div className="mx-auto w-full max-w-app px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-14 xl:grid-cols-[1fr_1.05fr] xl:gap-12">
          {/* ---------------- copy column ---------------- */}
          <div className="min-w-0">
            <motion.p
              variants={fadeIn}
              initial="hidden"
              animate="show"
              className="eyebrow inline-flex items-center gap-2.5 border border-line bg-surface/60 px-3 py-2 text-muted backdrop-blur-sm"
            >
              <span aria-hidden="true" className="size-1.5 animate-pulse bg-accent" />
              Personalized nutrition planning
            </motion.p>

            <motion.h1
              variants={staggerContainer(0.12, 0.1)}
              initial="hidden"
              animate="show"
              className="mt-7 text-display-xl display-face text-ink"
            >
              <HeadlineLine delay={0.15}>Build your body.</HeadlineLine>
              <span className="block text-accent">
                <HeadlineLine delay={0.28}>Fuel your goals.</HeadlineLine>
              </span>
            </motion.h1>

            <motion.p
              variants={fadeIn}
              initial="hidden"
              animate="show"
              transition={{ delay: 0.55 }}
              className="mt-7 max-w-lg text-lg leading-relaxed text-muted sm:text-xl"
            >
              Personalized nutrition for your fitness journey. Tell FORM about your body, your
              training and your kitchen — get a transparent calorie target, a real seven-day meal
              plan and a shopping list that fits your budget.
            </motion.p>

            <motion.div
              variants={fadeIn}
              initial="hidden"
              animate="show"
              transition={{ delay: 0.68 }}
              className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Button asChild size="lg" className="icon-nudge">
                <Link to="/onboarding">
                  Build my plan
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <a href="#features">Explore features</a>
              </Button>
            </motion.div>

            <motion.p
              variants={fadeIn}
              initial="hidden"
              animate="show"
              transition={{ delay: 0.8 }}
              className="mt-6 max-w-md font-mono text-[0.6875rem] leading-relaxed tracking-wide text-faint"
            >
              No account. No tracking. Everything stays in your browser. Every number shows its
              working.
            </motion.p>
          </div>

          {/* ---------------- preview column ---------------- */}
          <motion.div
            style={reduce ? undefined : { y: previewY, rotateX: previewRotate }}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3, ease: EASE.out }}
            className="relative min-w-0"
          >
            <div
              aria-hidden="true"
              className="absolute -inset-6 -z-10 border border-line/50 bg-bg-sunken/40"
            />
            <DashboardPreview />
          </motion.div>
        </div>
      </div>

      {/* ---------------- marquee ---------------- */}
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="show"
        transition={{ delay: 0.95 }}
        className="mt-20 border-y border-line bg-bg-sunken/60 py-3.5"
      >
        <div className="flex overflow-hidden">
          <div className={cn('flex shrink-0 animate-marquee gap-8 pr-8')}>
            {MARQUEE.map((word, i) => (
              <span
                key={`a-${i}`}
                className="display-face flex items-center gap-8 text-sm whitespace-nowrap text-faint"
              >
                {word}
                <span aria-hidden="true" className="size-1 bg-accent/60" />
              </span>
            ))}
          </div>
          <div className="flex shrink-0 animate-marquee gap-8 pr-8" aria-hidden="true">
            {MARQUEE.map((word, i) => (
              <span
                key={`b-${i}`}
                className="display-face flex items-center gap-8 text-sm whitespace-nowrap text-faint"
              >
                {word}
                <span aria-hidden="true" className="size-1 bg-accent/60" />
              </span>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  )
}

export const HERO_STATS = [
  { icon: Calculator, label: 'Transparent engine', value: 'BMR → TDEE → macros' },
  { icon: ListChecks, label: '7-day meal plan', value: 'Filterable, swappable' },
  { icon: ShoppingBasket, label: 'Grocery list', value: 'Grouped & costed' },
] as const

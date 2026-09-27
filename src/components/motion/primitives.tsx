/* ==========================================================================
   FORM — motion primitives
   ---------------------------------------------------------------------------
   One place for the shared building blocks, so motion across the app reads as
   a single system instead of a dozen one-offs.

   Two rules govern everything here:

   1. Motion must never be the only signal. Every animated thing also has a
      static end-state, and nothing conveys information that is absent without
      animation.
   2. Movement should be short and small. Long, bouncy transitions read as
      slow rather than premium. Durations sit in the 0.25–0.6s range.

   `MotionConfig reducedMotion="always"` (driven by the OS setting plus the
   in-app override) strips transforms automatically, so the components below
   stay declarative and nothing has to branch on the preference itself.
   ========================================================================== */

import { motion, useReducedMotion, type HTMLMotionProps } from 'motion/react'
import type { ElementType, ReactNode } from 'react'

import { EASE } from '@/lib/motion'
import { cn } from '@/lib/cn'

/* --------------------------------------------------------------------------
   Page transition
   -------------------------------------------------------------------------- */

/**
 * Wraps a route so navigating lifts the new page in rather than swapping it.
 *
 * `Shell` keys this on the pathname, so React remounts it per navigation and
 * `initial` → `animate` replays. There is deliberately no `exit`, and that is
 * not an oversight:
 *
 *   - An exit animation needs an <AnimatePresence> to host it. Without one the
 *     prop is dead code.
 *   - With `mode="wait"`, the incoming page is held back until the outgoing
 *     one has finished fading — adding to the delay on every navigation.
 *
 * Perceived speed is the priority here, so the outgoing page leaves instantly
 * and only the incoming one animates. 0.28s, a small rise, no bounce.
 */
export function PageTransition({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE.out }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/* --------------------------------------------------------------------------
   Reveal / stagger
   -------------------------------------------------------------------------- */

const REVEAL_DISTANCE = 22

export function Reveal({
  children,
  className,
  delay = 0,
  as = 'div',
  amount = 0.15,
}: {
  children: ReactNode
  className?: string
  delay?: number
  as?: ElementType
  amount?: number
}) {
  const reduce = useReducedMotion()
  const MotionTag = motion[as as 'div'] as typeof motion.div

  if (reduce) return <div className={className}>{children}</div>

  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y: REVEAL_DISTANCE }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.55, delay, ease: EASE.out }}
    >
      {children}
    </MotionTag>
  )
}

/**
 * Staggers direct children. Pair with <RevealItem> (or any child carrying
 * `variants={itemVariants}`) — the parent only controls timing.
 */
/**
 * Staggers direct children. Pair with <RevealItem>.
 *
 * The container animates on `whileInView` and lets the variant propagate to its
 * children, which is what produces the stagger. `amount` is deliberately 0:
 * with a higher threshold a container that is only just on screen can fail to
 * trigger, and since the children start at `opacity: 0` the whole group then
 * stays invisible. Revealing as soon as any pixel is visible is the safe
 * trade — the entrance is 22px and 0.5s, so a partly-scrolled trigger is not
 * distracting.
 */
export function Stagger({
  children,
  className,
  gap = 0.05,
  delay = 0,
  amount = 0,
  as = 'div',
}: {
  children: ReactNode
  className?: string
  gap?: number
  delay?: number
  /** how much of the container must be visible before children animate in */
  amount?: number
  as?: ElementType
}) {
  const reduce = useReducedMotion()
  const MotionTag = motion[as as 'div'] as typeof motion.div

  if (reduce) return <div className={className}>{children}</div>

  return (
    <MotionTag
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: gap, delayChildren: delay } },
      }}
    >
      {children}
    </MotionTag>
  )
}

export const itemVariants = {
  hidden: { opacity: 0, y: REVEAL_DISTANCE },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE.out } },
}

/**
 * A <Reveal> that participates in a parent <Stagger>.
 *
 * It carries its own `whileInView` as well as the inherited variants. The
 * inherited one supplies the stagger delay; the local one is the guarantee.
 * Relying on propagation alone means any child that mounts after the parent has
 * already revealed — a conditional tile, a newly filtered row — can be left
 * stuck at `opacity: 0` with nothing to bring it back. Both triggers are
 * idempotent, so running them together costs nothing.
 */
export function RevealItem({
  children,
  className,
  as = 'div',
}: {
  children: ReactNode
  className?: string
  as?: ElementType
}) {
  const reduce = useReducedMotion()
  const MotionTag = motion[as as 'div'] as typeof motion.div

  if (reduce) return <div className={className}>{children}</div>

  return (
    <MotionTag
      className={className}
      variants={itemVariants}
      whileInView="show"
      viewport={{ once: true, amount: 0 }}
    >
      {children}
    </MotionTag>
  )
}

/* --------------------------------------------------------------------------
   Interactive surfaces
   -------------------------------------------------------------------------- */

/**
 * The standard lift-and-glow card treatment. Motion sits *under* the visual
 * change, so removing it still leaves a legible hover state.
 */
export function LiftCard({
  children,
  className,
  as = 'div',
  lift = 4,
  ...rest
}: {
  children: ReactNode
  className?: string
  as?: ElementType
  lift?: number
} & HTMLMotionProps<'div'>) {
  const reduce = useReducedMotion()
  const MotionTag = motion[as as 'div'] as typeof motion.div

  return (
    <MotionTag
      className={cn('group relative', className)}
      whileHover={reduce ? undefined : { y: -lift }}
      whileTap={reduce ? undefined : { scale: 0.995 }}
      transition={{ duration: 0.22, ease: EASE.out }}
      {...rest}
    >
      {children}
    </MotionTag>
  )
}

/** A hairline that wipes in from the top on hover. Purely decorative. */
export function TopEdgeSweep({ className }: { className?: string }) {
  return (
    <motion.span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-accent',
        'transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-x-100',
        className,
      )}
    />
  )
}

/* --------------------------------------------------------------------------
   Tab content
   -------------------------------------------------------------------------- */

export function TabFade({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  if (reduce) return <div className={className}>{children}</div>
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE.out }}
    >
      {children}
    </motion.div>
  )
}

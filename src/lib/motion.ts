/* ==========================================================================
   FORM — shared motion
   ---------------------------------------------------------------------------
   One place for easings and variants so every transition in the app feels
   like the same product. Durations are short on purpose: motion here should
   read as responsive, not decorative.
   ========================================================================== */

import type { Transition, Variants } from 'motion/react'

export const EASE = {
  /** decelerating, for entrances */
  out: [0.16, 1, 0.3, 1] as const,
  /** accelerating, for exits */
  in: [0.83, 0, 0.17, 1] as const,
  /** symmetric, for elements that move within the viewport */
  inOut: [0.83, 0, 0.17, 1] as const,
}

export const SPRING_SOFT: Transition = {
  type: 'spring',
  stiffness: 220,
  damping: 30,
  mass: 0.9,
}

export const SPRING_SNAP: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 32,
  mass: 0.6,
}

/* --------------------------------------------------------------------------
   Reusable variants
   -------------------------------------------------------------------------- */

/** Container that staggers its children's reveal. */
export const staggerContainer = (stagger = 0.06, delay = 0): Variants => ({
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
})

/** Oversized headline line: mask + rise. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE.out },
  },
}

/** Smaller copy, faster and less travel. */
export const fadeIn: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE.out } },
}

export const fadeInSlow: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.9, ease: EASE.out } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: EASE.out } },
}

/** Directional slide used by onboarding steps. */
export function stepVariants(direction: 1 | -1) {
  return {
    hidden: { opacity: 0, x: direction * 40 },
    show: { opacity: 1, x: 0, transition: { duration: 0.36, ease: EASE.out } },
    exit: { opacity: 0, x: direction * -40, transition: { duration: 0.22, ease: EASE.in } },
  } satisfies Variants
}

/** Goal / option card: lift and glow on selection. */
export const cardSelect: Variants = {
  rest: { scale: 1 },
  selected: { scale: 1.015, transition: { type: 'spring', stiffness: 400, damping: 24 } },
  hover: { y: -3, transition: { duration: 0.2, ease: EASE.out } },
}

/** Scroll-triggered section reveal, used by `Reveal`. */
export const revealUp: Variants = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE.out } },
}

export const viewportOnce = { once: true, amount: 0.2 } as const

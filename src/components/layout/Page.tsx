/* ==========================================================================
   FORM — shared page primitives
   ========================================================================== */

import { motion } from 'motion/react'
import type { ReactNode } from 'react'

import { cn } from '@/lib/cn'
import { revealUp, viewportOnce } from '@/lib/motion'

/** Standard page frame: consistent max width, gutters and top spacing. */
export function PageShell({
  children,
  className,
  width = 'default',
}: {
  children: ReactNode
  className?: string
  width?: 'default' | 'wide' | 'narrow'
}) {
  const max =
    width === 'wide' ? 'max-w-[104rem]' : width === 'narrow' ? 'max-w-3xl' : 'max-w-app'
  return (
    <div className={cn('mx-auto w-full px-4 pt-28 pb-20 sm:px-6 lg:px-8', max, className)}>
      {children}
    </div>
  )
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('eyebrow text-accent', className)}>{children}</p>
}

export function PageTitle({
  children,
  className,
  as: Tag = 'h1',
  size = 'lg',
}: {
  children: ReactNode
  className?: string
  as?: 'h1' | 'h2' | 'h3'
  size?: 'lg' | 'md' | 'sm'
}) {
  const sizeClass =
    size === 'lg' ? 'text-display-lg' : size === 'md' ? 'text-display-md' : 'text-2xl'
  return <Tag className={cn('display-face', sizeClass, className)}>{children}</Tag>
}

export function PageLead({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('max-w-2xl text-base leading-relaxed text-muted sm:text-lg', className)}>
      {children}
    </p>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  className,
  align = 'left',
  as: HeadingTag = 'h2',
  titleClassName,
}: {
  eyebrow?: string
  title: ReactNode
  lead?: ReactNode
  className?: string
  align?: 'left' | 'center'
  /**
   * Heading level. Defaults to h2 so a section nests correctly beneath the
   * page's h1; pass 'h3' when the section already sits under another heading.
   */
  as?: 'h2' | 'h3'
  titleClassName?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <HeadingTag className={cn('display-face text-display-md', titleClassName)}>
        {title}
      </HeadingTag>
      {lead && <PageLead className={align === 'center' ? 'mx-auto' : undefined}>{lead}</PageLead>}
    </div>
  )
}

/** Scroll-triggered section reveal. No-ops visually under reduced motion
 *  because MotionConfig strips transforms, and the `whileInView` still fires. */
export function Reveal({
  children,
  className,
  delay = 0,
  as = 'div',
}: {
  children: ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'section' | 'li' | 'article'
}) {
  const MotionTag = motion[as]
  return (
    <MotionTag
      className={className}
      variants={revealUp}
      initial="hidden"
      whileInView="show"
      viewport={viewportOnce}
      transition={{ delay }}
    >
      {children}
    </MotionTag>
  )
}

/** Thin rule with an optional inline label — used to separate dense sections. */
export function Rule({ label, className }: { label?: string; className?: string }) {
  if (!label) return <hr className={cn('border-line', className)} />
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <span className="eyebrow shrink-0 text-faint">{label}</span>
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
    </div>
  )
}

/** A small "not implemented / demo" honesty marker, used where a feature is
 *  intentionally a stub. Nothing in FORM is faked, so this is used sparingly. */
export function DemoNote({ children }: { children: ReactNode }) {
  return (
    <p className="border-l-2 border-warn/60 bg-warn/8 px-4 py-3 text-xs leading-relaxed text-muted">
      <span className="font-mono tracking-widest text-warn uppercase">Demo note · </span>
      {children}
    </p>
  )
}

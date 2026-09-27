/* ==========================================================================
   FORM — knowledge centre
   Open to everyone, including before onboarding, because knowing the limits of
   a tool should not require creating a profile in it.
   ========================================================================== */

import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, BookOpen, Clock, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { Eyebrow, PageLead, PageShell, PageTitle } from '@/components/layout/Page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Callout } from '@/components/ui/separator'
import { EVIDENCE_LABELS, TOPICS, getTopic } from '@/data/knowledge'
import { cn } from '@/lib/cn'
import { EASE } from '@/lib/motion'

export function LearnPage() {
  const { slug } = useParams<{ slug?: string }>()
  const topic = slug ? getTopic(slug) : undefined
  const [query, setQuery] = useState('')
  const reduce = useReducedMotion()

  useEffect(() => {
    document.title = topic ? `${topic.title} — FORM Learn` : 'Knowledge centre — FORM'
    if (slug && !topic) document.title = 'Not found — FORM'
  }, [slug, topic])

  const filtered = TOPICS.filter((t) => {
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return (
      t.title.toLowerCase().includes(needle) ||
      t.summary.toLowerCase().includes(needle) ||
      t.body.some((s) => s.heading.toLowerCase().includes(needle))
    )
  })

  /* ---------------- article view ---------------- */
  if (topic) {
    const evidence = EVIDENCE_LABELS[topic.level]
    return (
      <PageShell width="narrow">
        <Button asChild variant="ghost" size="sm" className="mb-8">
          <Link to="/learn">
            <ArrowLeft className="size-3.5" />
            All topics
          </Link>
        </Button>

        <motion.article
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE.out }}
        >
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={evidence.variant}>{evidence.label}</Badge>
            <span className="inline-flex items-center gap-1.5 font-mono text-[0.625rem] text-faint">
              <Clock className="size-3" />
              {topic.minutes} min read
            </span>
          </div>

          <h1 className="display-face mt-5 text-display-md">{topic.title}</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted">{topic.summary}</p>

          <div className="mt-6">
            <Callout tone={topic.level === 'established' ? 'ok' : topic.level === 'individual' ? 'warn' : 'info'}>
              {topic.levelNote}
            </Callout>
          </div>

          <div className="mt-10 space-y-10">
            {topic.body.map((section) => (
              <section key={section.heading}>
                <h2 className="display-face text-xl tracking-tight">{section.heading}</h2>
                <div className="mt-3.5 space-y-3.5">
                  {section.paragraphs.map((p) => (
                    <p key={p.slice(0, 32)} className="text-[0.9375rem] leading-relaxed text-muted">
                      {p}
                    </p>
                  ))}
                </div>
                {section.list && (
                  <ul className="mt-4 space-y-2">
                    {section.list.map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted">
                        <span aria-hidden="true" className="mt-2 size-1 shrink-0 bg-accent" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {topic.myth && (
            <div className="mt-12 border border-line bg-surface p-6">
              <p className="eyebrow text-accent">Common claim</p>
              <p className="display-face mt-3 text-lg">“{topic.myth.claim}”</p>
              <div className="mt-5 border-l-2 border-ok bg-ok/8 px-4 py-3">
                <p className="eyebrow text-ok">What the evidence suggests</p>
                <p className="mt-2 text-sm leading-relaxed text-ink">{topic.myth.reality}</p>
              </div>
            </div>
          )}

          <div className="mt-12">
            <Callout tone="warn">
              This is general educational information, not medical advice. If you have a health
              condition, are pregnant or breastfeeding, take regular medication, or have a history
              of disordered eating, talk to a doctor or registered dietitian before changing how you
              eat.
            </Callout>
          </div>

          <Button asChild variant="secondary" className="mt-8">
            <Link to="/learn">
              <X className="size-4" />
              Close
            </Link>
          </Button>
        </motion.article>
      </PageShell>
    )
  }

  /* ---------------- index ---------------- */
  return (
    <PageShell>
      <Eyebrow>Knowledge centre</Eyebrow>
      <PageTitle className="mt-3">The short, honest version of the science.</PageTitle>
      <PageLead className="mt-4">
        Nine topics that actually change what you eat, written for people who want the reasoning
        rather than a rule list. Each one is labelled with how solid the underlying evidence is.
      </PageLead>

      <div className="relative mt-8 max-w-md">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search topics…"
          aria-label="Search knowledge centre topics"
          className="h-12 w-full border border-line bg-surface-inset px-4 text-base text-ink placeholder:text-faint focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-accent"
        />
      </div>

      <ul className="mt-10 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t, i) => {
          const evidence = EVIDENCE_LABELS[t.level]
          return (
            <motion.li
              key={t.slug}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.04, ease: EASE.out }}
              whileHover={reduce ? undefined : { y: -4 }}
              className="bg-surface"
            >
              <Link
                to={`/learn/${t.slug}`}
                className="group relative flex h-full flex-col p-6 transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
              >
                {/* Accent hairline wipes in across the top edge. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-accent transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-x-100"
                />
                <div className="flex items-start justify-between gap-3">
                  <motion.span
                    className="inline-flex size-10 items-center justify-center border border-line text-accent transition-[border-color,background-color] duration-300 ease-[var(--ease-out-expo)] group-hover:border-accent/50 group-hover:bg-accent-soft"
                    whileHover={reduce ? undefined : { scale: 1.08, rotate: -6 }}
                    transition={{ duration: 0.28, ease: EASE.out }}
                  >
                    <BookOpen className="size-4" strokeWidth={1.75} />
                  </motion.span>
                  <span className="num text-[0.625rem] text-faint">{t.minutes} min</span>
                </div>

                <h2 className="display-face mt-4 text-lg tracking-tight transition-colors group-hover:text-accent">
                  {t.title}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{t.summary}</p>

                <span
                  className={cn(
                    'eyebrow mt-4',
                    t.level === 'established'
                      ? 'text-ok'
                      : t.level === 'individual'
                        ? 'text-warn'
                        : 'text-info',
                  )}
                >
                  {evidence.label}
                </span>
              </Link>
            </motion.li>
          )
        })}
      </ul>

      {filtered.length === 0 && (
        <p className="mt-8 text-sm text-muted">
          Nothing matches “{query}”. Try protein, sleep, hydration or carbs.
        </p>
      )}

      <div className="mt-16 border border-line bg-surface p-6 sm:p-8">
        <h2 className="display-face text-display-md">A note on the labels</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {(['established', 'general', 'individual'] as const).map((level) => {
            const meta = EVIDENCE_LABELS[level]
            return (
              <div key={level}>
                <Badge variant={meta.variant} size="sm">
                  {meta.label}
                </Badge>
                <p className="mt-2.5 text-xs leading-relaxed text-muted">
                  {level === 'established'
                    ? 'Consistent findings across a large body of human research, though the exact numbers still depend on the person.'
                    : level === 'general'
                      ? 'Reasonable practical advice, but with weaker or more mixed evidence behind it.'
                      : 'Genuinely varies between people, and professional input is worth having.'}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </PageShell>
  )
}

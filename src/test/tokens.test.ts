/* ==========================================================================
   Design tokens must be declared where Tailwind can see them.
   ---------------------------------------------------------------------------
   This is a regression guard for a bug that shipped once and stayed invisible
   for a long time.

   The semantic palette lived in a plain `:root, .dark { … }` block. Tailwind
   v4 only generates `bg-*` / `text-*` / `border-*` utilities from tokens it
   finds inside an `@theme` directive — a custom property declared in ordinary
   CSS is simply not part of the token registry. So every colour class in the
   app (`bg-surface`, `text-muted`, `border-line`, `bg-accent`, …) compiled to
   nothing at all. No error and no warning: the build succeeded, all tests
   passed, and the app rendered with no surfaces, no borders and inherited text
   colour. It looked like a blank page.

   Nothing caught it because nothing asserted that a colour class in the source
   corresponds to a real utility. These tests do.

   Sources are read off disk with `node:fs`. Vite's `?raw` import would be the
   tidier route, but Vitest runs with `css: false` and stubs a raw CSS import to
   an empty string, so the stylesheet would silently read as blank — which is
   precisely the failure mode this file exists to catch.
   ========================================================================== */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(process.cwd(), 'src')
const indexCss = readFileSync(join(SRC, 'index.css'), 'utf8')

/** Every semantic token the app relies on. If one is renamed, update this. */
const SEMANTIC_TOKENS = [
  'bg',
  'bg-sunken',
  'surface',
  'surface-raised',
  'surface-inset',
  'line',
  'line-strong',
  'line-soft',
  'ink',
  'ink-inverse',
  'muted',
  'faint',
  'accent',
  'accent-contrast',
  'accent-soft',
  'info',
  'warn',
  'danger',
  'ok',
] as const

/**
 * The brand ramp is deliberately theme-invariant — the lime is the same hex in
 * both themes, which is the whole point of a brand colour.
 */
const THEME_INVARIANT = new Set(['--color-lime', '--color-lime-bright', '--color-lime-deep'])

const SOURCES: Record<string, string> = (() => {
  const out: Record<string, string> = {}
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        walk(full)
        continue
      }
      if (!/\.tsx?$/.test(entry)) continue
      if (entry.endsWith('.test.ts') || entry.endsWith('.test.tsx')) continue
      out[full.replace(process.cwd(), '')] = readFileSync(full, 'utf8')
    }
  }
  walk(SRC)
  return out
})()

/** Reads the raw text of a `{ … }` block starting at `start` (just past its brace). */
function blockBody(source: string, start: number): string {
  let depth = 1
  let i = start
  while (i < source.length && depth > 0) {
    if (source[i] === '{') depth += 1
    else if (source[i] === '}') depth -= 1
    i += 1
  }
  return source.slice(start, i - 1)
}

/**
 * Custom properties declared inside every `@theme { … }` block.
 *
 * Brace counting rather than a regex, because Tailwind allows nesting inside
 * `@utility` and a non-greedy match would cut a block short.
 */
function themeTokens(source: string): Set<string> {
  const found = new Set<string>()
  for (const match of source.matchAll(/@theme\s*(?:inline\s*)?(?:static\s*)?\{/g)) {
    const body = blockBody(source, match.index + match[0].length)
    for (const decl of body.matchAll(/(--[a-z0-9-]+)\s*:/g)) found.add(decl[1])
  }
  return found
}

function declaredIn(source: string, selector: string): Set<string> {
  const at = source.indexOf(selector)
  if (at < 0) return new Set()
  const body = blockBody(source, at + selector.length)
  return new Set([...body.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]))
}

/** Relative luminance per WCAG 2.x. */
function luminance(hex: string): number {
  let h = hex.replace('#', '')
  if (h.length === 4) h = [...h.slice(1)].map((c) => c + c).join('')
  const n = parseInt(h.slice(0, 6), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/** First definition in the file wins — that is the `@theme` (dark) value. */
function tokenValue(name: string): string {
  const m = indexCss.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{3,8})`))
  if (!m) throw new Error(`${name} is not defined in index.css`)
  return m[1]
}

describe('design tokens', () => {
  const declared = themeTokens(indexCss)

  it('declares every semantic colour inside an @theme block', () => {
    const missing = SEMANTIC_TOKENS.filter((t) => !declared.has(`--color-${t}`))
    expect(
      missing,
      `These tokens are not in any @theme block, so Tailwind generates no ` +
        `utility for them and every class using them silently does nothing: ` +
        missing.map((t) => `--color-${t}`).join(', '),
    ).toEqual([])
  })

  it('overrides every theme colour in the light palette', () => {
    /*
      Dark is the default and lives in `@theme`; light is a class that
      re-declares the same custom properties. Both are needed — but they have to
      stay in step. A token added to `@theme` and forgotten in `.light` leaves a
      dark value sitting on a light background, and you only notice it on the
      one page that uses it.
    */
    expect(indexCss, 'the .light palette block is missing from index.css').toContain('.light {')

    const lightTokens = declaredIn(indexCss, '.light {')
    const themeColours = [...declared].filter(
      (t) => t.startsWith('--color-') && !THEME_INVARIANT.has(t),
    )
    const notOverridden = themeColours.filter((t) => !lightTokens.has(t))

    expect(
      notOverridden,
      `Declared in @theme but never overridden for the light theme, so it ` +
        `keeps its dark value on a light background: ${notOverridden.join(', ')}`,
    ).toEqual([])
  })

  it('has no colour utility in the source with no matching token', () => {
    // Catches the inverse mistake: a class naming a token that never existed.
    const used = new Map<string, string>()
    const pattern =
      /\b(?:bg|text|border|fill|stroke|ring|outline|decoration|from|via|to|shadow|accent|caret|divide)-([a-z][a-z0-9-]*)\b/g
    const known = new Set<string>(SEMANTIC_TOKENS)

    for (const [file, text] of Object.entries(SOURCES)) {
      for (const m of text.matchAll(pattern)) {
        if (known.has(m[1])) used.set(m[1], file)
      }
    }

    expect(Object.keys(SOURCES).length, 'source glob matched almost nothing').toBeGreaterThan(20)
    expect(used.size, 'no project colour utilities found — the pattern is wrong').toBeGreaterThan(8)

    const orphans = [...used.entries()]
      .filter(([name]) => !declared.has(`--color-${name}`))
      .map(([name, file]) => `${name} (${file})`)

    expect(
      orphans,
      `These classes name a colour token that does not exist, so they render ` +
        `as no-ops: ${orphans.join(', ')}`,
    ).toEqual([])
  })

  it('meets WCAG AA contrast for the faint text token on every dark surface', () => {
    /*
      `text-faint` carries 10–12px supporting copy, so it has to clear the 4.5:1
      normal-text threshold against the *lightest* surface it lands on. The
      previous value measured 3.6:1 and failed on all of them.
    */
    const faint = tokenValue('--color-faint')
    for (const surface of [
      '--color-bg',
      '--color-bg-sunken',
      '--color-surface',
      '--color-surface-raised',
      '--color-surface-inset',
    ]) {
      const ratio = contrast(faint, tokenValue(surface))
      expect(
        ratio,
        `--color-faint (${faint}) on ${surface} is ${ratio.toFixed(2)}:1, below 4.5:1`,
      ).toBeGreaterThanOrEqual(4.5)
    }
  })
})

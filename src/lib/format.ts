/* ==========================================================================
   FORM — display formatting
   ========================================================================== */

export function formatNumber(value: number, digits = 0): string {
  if (!Number.isFinite(value)) return '—'
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function round(value: number, digits = 0): number {
  const f = 10 ** digits
  return Math.round(value * f) / f
}

/** Grams shown the way an Indian kitchen measures them. */
export function formatGrams(grams: number): string {
  if (grams >= 1000) return `${round(grams / 1000, 2)} kg`
  return `${Math.round(grams)} g`
}

export function formatMl(ml: number): string {
  if (ml >= 1000) return `${round(ml / 1000, 1)} L`
  return `${Math.round(ml)} ml`
}

export function formatPercent(fraction: number, digits = 0): string {
  return `${round(fraction * 100, digits)}%`
}

/** "3 items" / "1 item" */
export function plural(n: number, singular: string, pluralForm?: string): string {
  return n === 1 ? singular : (pluralForm ?? `${singular}s`)
}

export function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

export function formatDateShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })
}

export function formatDayName(dayIndex: number): string {
  return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dayIndex] ?? ''
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function todayISO(): string {
  return isoOf(new Date())
}

export function isoDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return isoOf(d)
}

export function relativeDay(iso: string, today = todayISO()): string {
  if (iso === today) return 'Today'
  const a = new Date(`${iso}T00:00:00`)
  const b = new Date(`${today}T00:00:00`)
  const diff = Math.round((b.getTime() - a.getTime()) / 86_400_000)
  if (diff === 1) return 'Yesterday'
  if (diff > 1 && diff < 7) return `${diff} days ago`
  if (diff === -1) return 'Tomorrow'
  return formatDateShort(iso)
}

/** Trailing weekly average, ignoring missing points. */
export function weeklyAverage(
  points: { date: string; value?: number }[],
  windowDays = 7,
  today = todayISO(),
): number | null {
  const cutoff = new Date(`${today}T00:00:00`)
  cutoff.setDate(cutoff.getDate() - (windowDays - 1))
  const cutoffISO = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`

  const values = points
    .filter((p) => p.value !== undefined && p.date >= cutoffISO && p.date <= today)
    .map((p) => p.value as number)

  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** A short, honest id for log entries. */
export function makeId(prefix = 'id'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10)
  return `${prefix}-${rand}`
}

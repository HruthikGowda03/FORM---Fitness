/* ==========================================================================
   FORM — food explorer
   ========================================================================== */

import { AnimatePresence, motion } from 'motion/react'
import {
  Check,
  Clock,
  IndianRupee,
  Minus,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'

import { Eyebrow, PageLead, PageShell, PageTitle, Rule } from '@/components/layout/Page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OptionCard } from '@/components/ui/option-card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Callout } from '@/components/ui/separator'
import { FOODS } from '@/data/foods'
import { cn } from '@/lib/cn'
import { Reveal, RevealItem, Stagger } from '@/components/motion/primitives'
import { playWaterSound } from '@/lib/sound'
import { EASE, SPRING_SNAP } from '@/lib/motion'
import { useDebounced } from '@/lib/hooks'
import { formatNumber, makeId } from '@/lib/format'
import { formatMoney } from '@/lib/prices'
import { useActions, useProfile, useTodayLog } from '@/store/AppStore'
import type { Allergen, DietPreference, Food } from '@/types'

type SortKey = 'name' | 'protein' | 'cost' | 'prep'

const ALLERGENS: Allergen[] = [
  'milk', 'egg', 'gluten', 'peanut', 'tree-nut', 'soy', 'sesame', 'fish', 'shellfish',
]

export function ExplorePage() {
  const active = useProfile()
  const { profile, customFoods } = active ?? { customFoods: [] }
  const { addCustomFood, removeCustomFood, addLogEntry, addWater } = useActions()
  const log = useTodayLog()
  const [query, setQuery] = useState('')
  const debounced = useDebounced(query, 160)

  const [dietFilter, setDietFilter] = useState<DietPreference | 'any' | 'my-diet'>('any')
  const [allergenFilter, setAllergenFilter] = useState<Allergen | 'any'>('any')
  const [maxCost, setMaxCost] = useState(300)
  const [maxPrep, setMaxPrep] = useState(45)
  const [minProtein, setMinProtein] = useState(0)
  const [sort, setSort] = useState<SortKey>('name')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [detail, setDetail] = useState<Food | null>(null)

  const allFoods = useMemo(() => [...FOODS, ...customFoods], [customFoods])

  const filtered = useMemo(() => {
    const needle = debounced.trim().toLowerCase()

    const list = allFoods.filter((f) => {
      if (needle) {
        const haystack = `${f.name} ${f.localName ?? ''} ${f.category}`.toLowerCase()
        if (!haystack.includes(needle)) return false
      }
      if (dietFilter === 'my-diet' && profile && !f.diet.includes(profile.diet)) return false
      if (dietFilter !== 'any' && dietFilter !== 'my-diet' && !f.diet.includes(dietFilter)) {
        return false
      }
      if (allergenFilter !== 'any' && f.allergens.includes(allergenFilter)) return false
      if (f.per.protein < minProtein) return false

      // Per-serving cost, not per-kg, so the filter is meaningful.
      const servingCost = (f.costPerKg * f.serving.grams) / 1000
      const inCurrency = profile?.budget.currency === 'USD' ? servingCost / 83 : servingCost
      if (inCurrency > maxCost) return false
      if (f.prepMinutes > maxPrep) return false

      if (profile && profile.allergens.some((a) => f.allergens.includes(a))) return false
      if (profile && profile.excludeIngredients.length > 0) {
        const haystack = `${f.name} ${f.localName ?? ''} ${f.category}`.toLowerCase()
        if (profile.excludeIngredients.some((e) => haystack.includes(e))) return false
      }

      return true
    })

    const sorted = [...list]
    switch (sort) {
      case 'protein':
        sorted.sort((a, b) => b.per.protein - a.per.protein)
        break
      case 'cost':
        sorted.sort((a, b) => a.per.kcal / Math.max(a.costPerKg, 1) - b.per.kcal / Math.max(b.costPerKg, 1))
        break
      case 'prep':
        sorted.sort((a, b) => a.prepMinutes - b.prepMinutes)
        break
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name))
    }
    return sorted
  }, [allFoods, debounced, dietFilter, allergenFilter, maxCost, maxPrep, minProtein, sort, profile])

  const activeFilters =
    (dietFilter !== 'any' ? 1 : 0) +
    (allergenFilter !== 'any' ? 1 : 0) +
    (maxCost < 300 ? 1 : 0) +
    (maxPrep < 45 ? 1 : 0) +
    (minProtein > 0 ? 1 : 0)

  const resetFilters = () => {
    setDietFilter('any')
    setAllergenFilter('any')
    setMaxCost(300)
    setMaxPrep(45)
    setMinProtein(0)
  }

  return (
    <PageShell width="wide">
      <Eyebrow>Food explorer</Eyebrow>
      <PageTitle className="mt-3">{allFoods.length} foods, searchable.</PageTitle>
      <PageLead className="mt-4">
        Indian and international foods with approximate per-serving nutrition. Everything shown is
        a rounded reference value from a public composition table — not a measurement of your
        specific plate.
      </PageLead>

      {/* ---------------- search + filters ---------------- */}
      <div className="mt-10 grid gap-3 lg:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-faint"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search idli, paneer, chicken, oats…"
            aria-label="Search foods"
            className="pl-11"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={filtersOpen ? 'primary' : 'secondary'}
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal className="size-4" />
            Filters
            {activeFilters > 0 && (
              <span className="num ml-1 bg-accent-contrast px-1.5 text-[0.625rem] text-accent">
                {activeFilters}
              </span>
            )}
          </Button>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name A–Z</SelectItem>
              <SelectItem value="protein">Most protein</SelectItem>
              <SelectItem value="cost">Best value</SelectItem>
              <SelectItem value="prep">Quickest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {filtersOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE.out }}
            className="overflow-hidden"
          >
            <div className="mt-3 grid gap-5 border border-line bg-surface p-5 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <Label className="mb-2.5">Diet</Label>
                <div className="grid gap-1.5">
                  {(
                    [
                      { v: 'my-diet', l: profile ? `My diet (${profile.diet.replace('-', ' ')})` : 'My diet' },
                      { v: 'any', l: 'Any' },
                      { v: 'vegetarian', l: 'Vegetarian' },
                      { v: 'vegan', l: 'Vegan' },
                      { v: 'eggs', l: 'Egg-inclusive' },
                      { v: 'non-vegetarian', l: 'Non-vegetarian' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.v}
                      type="button"
                      onClick={() => setDietFilter(opt.v)}
                      aria-pressed={dietFilter === opt.v}
                      className={cn(
                        'press border px-3 py-2 text-left text-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                        dietFilter === opt.v
                          ? 'border-accent bg-accent-soft text-accent'
                          : 'border-line text-muted hover:-translate-y-0.5 hover:border-line-strong hover:bg-surface-raised hover:text-ink',
                      )}
                    >
                      {opt.l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <Label className="mb-2.5">Free from allergen</Label>
                <Select
                  value={allergenFilter}
                  onValueChange={(v) => setAllergenFilter(v as Allergen | 'any')}
                >
                  <SelectTrigger aria-label="Exclude an allergen">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">No filter</SelectItem>
                    {ALLERGENS.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {profile && profile.allergens.length > 0 && (
                  <p className="mt-2 text-[0.6875rem] leading-relaxed text-faint">
                    Your profile allergies ({profile.allergens.join(', ')}) are always applied.
                  </p>
                )}
              </div>

              <div>
                <Label className="mb-2.5">
                  Max cost per serving · {formatMoney(maxCost, profile?.budget.currency ?? 'INR')}
                </Label>
                <input
                  type="range"
                  min={10}
                  max={300}
                  step={5}
                  value={maxCost}
                  onChange={(e) => setMaxCost(Number(e.target.value))}
                  className="form-range"
                  aria-label="Maximum cost per serving"
                />
                <p className="mt-1 text-[0.6875rem] text-faint">
                  Based on the per-kilogram assumption in the database.
                </p>
              </div>

              <div>
                <Label className="mb-2.5">Max prep time · {maxPrep} min</Label>
                <input
                  type="range"
                  min={0}
                  max={60}
                  step={5}
                  value={maxPrep}
                  onChange={(e) => setMaxPrep(Number(e.target.value))}
                  className="form-range"
                  aria-label="Maximum preparation time"
                />
                <div className="mt-3">
                  <Label className="mb-2.5">Min protein · {minProtein}g</Label>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={1}
                    value={minProtein}
                    onChange={(e) => setMinProtein(Number(e.target.value))}
                    className="form-range"
                    aria-label="Minimum protein per serving"
                  />
                </div>
              </div>

              <div className="sm:col-span-2 lg:col-span-4">
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  <X className="size-3.5" />
                  Reset filters
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-4 font-mono text-[0.625rem] tracking-wide text-faint" aria-live="polite">
        {filtered.length} of {allFoods.length} foods
      </p>

      {/* ---------------- grid ---------------- */}
      <h2 className="sr-only">Search results</h2>

      {filtered.length === 0 ? (
        <div className="mt-6">
          <Callout tone="muted">
            Nothing matches. Your profile allergies and exclusions are always applied, so widening
            the search may not be enough — edit those in Settings.
          </Callout>
        </div>
      ) : (
        <Stagger
          as="ul"
          className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          gap={0.02}
          amount={0.05}
        >
          {filtered.slice(0, 60).map((food) => {
            const servingCost = (food.costPerKg * food.serving.grams) / 1000
            return (
              <RevealItem
                key={food.id}
                as="li"
                className="group relative bg-surface transition-colors duration-200 ease-[var(--ease-out-expo)] hover:bg-surface-raised"
              >
                {/* Top hairline wipes in — the only hover cue on a dense grid,
                    so a passing pointer does not make 60 cards lurch. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px origin-left scale-x-0 bg-accent transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover:scale-x-100"
                />
                <div className="flex h-full flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="display-face truncate text-sm text-ink">{food.name}</h3>
                      {food.localName && (
                        <p className="truncate text-[0.6875rem] text-muted">{food.localName}</p>
                      )}
                    </div>
                    {customFoods.some((c) => c.id === food.id) && (
                      <Badge variant="accent" size="sm">
                        Custom
                      </Badge>
                    )}
                  </div>

                  <p className="num mt-1.5 text-[0.625rem] text-faint">{food.serving.label}</p>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="num text-lg font-bold text-ink">{formatNumber(food.per.kcal)}</span>
                    <span className="num text-[0.625rem] text-faint">kcal</span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-x-3 text-[0.6875rem] text-muted">
                    <span>
                      <span className="text-faint">P</span> {formatNumber(food.per.protein, 0)}g
                    </span>
                    <span>
                      <span className="text-faint">C</span> {formatNumber(food.per.carbs, 0)}g
                    </span>
                    <span>
                      <span className="text-faint">F</span> {formatNumber(food.per.fat, 0)}g
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[0.5625rem] text-faint">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="size-2.5" />
                      {food.prepMinutes}m
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <IndianRupee className="size-2.5" />
                      {formatNumber(
                        profile?.budget.currency === 'USD' ? servingCost / 83 : servingCost,
                        profile?.budget.currency === 'USD' ? 2 : 0,
                      )}
                    </span>
                    {food.allergens.slice(0, 2).map((a) => (
                      <span key={a} className="text-warn">
                        {a}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto flex gap-2 pt-4">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1"
                      onClick={() => setDetail(food)}
                    >
                      Details
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        addLogEntry(log.date, {
                          id: makeId('log'),
                          foodId: food.id,
                          name: `${food.name} (1 × ${food.serving.label})`,
                          servings: 1,
                          total: food.per,
                          slot: 'snack',
                          loggedAt: new Date().toISOString(),
                        })
                      }}
                      aria-label={`Log one serving of ${food.name}`}
                    >
                      <Plus className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </RevealItem>
            )
          })}
        </Stagger>
      )}

      {filtered.length > 60 && (
        <p className="mt-4 text-center font-mono text-[0.625rem] text-faint">
          Showing the first 60 of {filtered.length}. Narrow the search to see the rest.
        </p>
      )}

      {/* ---------------- custom food ---------------- */}
      <div className="mt-16">
        <Rule label="Your own foods" className="mb-6" />
        <h2 className="sr-only">Add your own foods</h2>
        <CustomFoodForm onAdd={addCustomFood} />

        {customFoods.length > 0 && (
          <ul className="mt-4 divide-y divide-line-soft border border-line bg-surface">
            {customFoods.map((f) => (
              <li key={f.id} className="row-hover flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{f.name}</p>
                  <p className="num text-[0.625rem] text-faint">
                    {f.serving.label} · {formatNumber(f.per.kcal)} kcal · P {formatNumber(f.per.protein, 0)}g
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => removeCustomFood(f.id)}
                  aria-label={`Delete ${f.name}`}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---------------- water shortcut ---------------- */}
      <Reveal className="mt-10 flex flex-wrap items-center gap-3 border border-line bg-surface p-5">
        <p className="text-sm text-muted">Logged water today: {formatNumber(log.waterMl)} ml</p>
        <div className="ml-auto flex gap-2">
          {[250, 500].map((ml) => (
            <Button
              key={ml}
              variant="secondary"
              size="sm"
              onClick={() => {
                // A bubble per glass, so +500 ml bubbles twice.
                playWaterSound({ glasses: ml / 250, enabled: profile?.soundEnabled !== false })
                addWater(ml)
              }}
            >
              +{ml} ml
            </Button>
          ))}
        </div>
      </Reveal>

      <FoodDetailDialog food={detail} onClose={() => setDetail(null)} onLog={(f) => {
        addLogEntry(log.date, {
          id: makeId('log'),
          foodId: f.id,
          name: `${f.name} (1 × ${f.serving.label})`,
          servings: 1,
          total: f.per,
          slot: 'snack',
          loggedAt: new Date().toISOString(),
        })
        setDetail(null)
      }} />
    </PageShell>
  )
}

/* --------------------------------------------------------------------------
   Detail dialog
   -------------------------------------------------------------------------- */

function FoodDetailDialog({
  food,
  onClose,
  onLog,
}: {
  food: Food | null
  onClose: () => void
  onLog: (food: Food) => void
}) {
  const [servings, setServings] = useState(1)
  const profile = useProfile()?.profile

  if (!food) return null

  const servingCost = (food.costPerKg * food.serving.grams * servings) / 1000
  const currency = profile?.budget.currency ?? 'INR'
  const cost = currency === 'USD' ? servingCost / 83 : servingCost

  return (
    <Dialog open={Boolean(food)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <p className="eyebrow text-accent capitalize">{food.category}</p>
          <DialogTitle className="mt-2">{food.name}</DialogTitle>
          {food.localName && <p className="text-sm text-muted">{food.localName}</p>}
          <DialogDescription className="mt-1">
            Approximate values per {food.serving.label}. Real portions vary with the recipe.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={() => setServings((s) => Math.max(0.25, Math.round((s - 0.25) * 100) / 100))}
              disabled={servings <= 0.25}
              aria-label="Reduce servings"
            >
              <Minus className="size-3.5" />
            </Button>
            <div className="flex-1 text-center">
              <motion.p
                key={servings}
                initial={{ scale: 0.85, opacity: 0.4 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={SPRING_SNAP}
                className="num text-2xl font-bold text-ink"
              >
                {servings}×
              </motion.p>
              <p className="num text-[0.625rem] text-faint">
                {formatNumber(food.serving.grams * servings)} g total
              </p>
            </div>
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={() => setServings((s) => Math.min(10, Math.round((s + 0.25) * 100) / 100))}
              disabled={servings >= 10}
              aria-label="Increase servings"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>

          <table className="mt-6 w-full text-sm">
            <caption className="sr-only">Nutrition breakdown for {food.name}</caption>
            <tbody className="divide-y divide-line-soft">
              {[
                { label: 'Energy', value: `${formatNumber(food.per.kcal * servings)} kcal` },
                { label: 'Protein', value: `${formatNumber(food.per.protein * servings, 1)} g` },
                { label: 'Carbohydrate', value: `${formatNumber(food.per.carbs * servings, 1)} g` },
                { label: 'Fat', value: `${formatNumber(food.per.fat * servings, 1)} g` },
                ...(food.per.fiber > 0
                  ? [{ label: 'Fibre', value: `${formatNumber(food.per.fiber * servings, 1)} g` }]
                  : []),
                { label: 'Estimated cost', value: formatMoney(cost, currency, currency === 'USD' ? 2 : 0) },
                { label: 'Prep time', value: `${food.prepMinutes} min` },
                { label: 'Cooking', value: food.cook === 'none' ? 'No cooking' : food.cook === 'heat' ? 'Pan / microwave' : 'Stovetop' },
              ].map((row) => (
                <tr key={row.label}>
                  <th scope="row" className="py-2.5 text-left font-normal text-muted">
                    {row.label}
                  </th>
                  <td className="num py-2.5 text-right font-medium text-ink">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {food.allergens.length > 0 && (
            <div className="mt-5">
              <p className="eyebrow mb-2 text-faint">Contains</p>
              <div className="flex flex-wrap gap-1.5">
                {food.allergens.map((a) => (
                  <Badge key={a} variant="warn" size="sm">
                    {a}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {food.note && (
            <div className="mt-5">
              <Callout tone="accent">{food.note}</Callout>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => onLog(food)}>
            <Check className="size-4" />
            Log this
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* --------------------------------------------------------------------------
   Custom food form
   -------------------------------------------------------------------------- */

function CustomFoodForm({ onAdd }: { onAdd: (food: Food) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [servingLabel, setServingLabel] = useState('1 serving (100 g)')
  const [grams, setGrams] = useState(100)
  const [kcal, setKcal] = useState(0)
  const [protein, setProtein] = useState(0)
  const [carbs, setCarbs] = useState(0)
  const [fat, setFat] = useState(0)
  const [fiber, setFiber] = useState(0)
  const [costPerKg, setCostPerKg] = useState(100)
  const [prep, setPrep] = useState(5)
  const [diet, setDiet] = useState<DietPreference>('vegetarian')
  const [error, setError] = useState('')

  const reset = () => {
    setName('')
    setServingLabel('1 serving (100 g)')
    setGrams(100)
    setKcal(0)
    setProtein(0)
    setCarbs(0)
    setFat(0)
    setFiber(0)
    setCostPerKg(100)
    setPrep(5)
    setDiet('vegetarian')
    setError('')
  }

  const derivedKcal = Math.round(protein * 4 + carbs * 4 + fat * 9)

  const submit = () => {
    if (name.trim().length < 2) {
      setError('Give the food a name.')
      return
    }
    if (grams <= 0) {
      setError('Serving weight must be greater than zero.')
      return
    }
    if (kcal <= 0 && derivedKcal <= 0) {
      setError('Enter energy, or at least one macro.')
      return
    }

    const food: Food = {
      id: `custom-${makeId('f')}`,
      name: name.trim(),
      category: 'pantry',
      diet: [diet],
      allergens: [],
      serving: { label: servingLabel.trim() || `${grams} g`, grams },
      per: {
        kcal: kcal > 0 ? kcal : derivedKcal,
        protein,
        carbs,
        fat,
        fiber,
      },
      costPerKg,
      prepMinutes: prep,
      cook: prep > 0 ? 'cook' : 'none',
      styles: ['global'],
      note: 'Added by you. Values are as entered — FORM cannot verify them.',
    }

    onAdd(food)
    reset()
    setOpen(false)
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-4 space-y-0">
        <CardTitle as="h2">Add a food that is not in the database</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="size-3.5" />
              New food
            </Button>
          </DialogTrigger>
          <CustomFoodDialog
            form={{
              name, servingLabel, grams, kcal, protein, carbs, fat, fiber, costPerKg, prep, diet,
            }}
            derivedKcal={derivedKcal}
            error={error}
            setError={setError}
            setField={(k, v) => {
              switch (k) {
                case 'grams': return setGrams(v)
                case 'kcal': return setKcal(v)
                case 'protein': return setProtein(v)
                case 'carbs': return setCarbs(v)
                case 'fat': return setFat(v)
                case 'fiber': return setFiber(v)
                case 'costPerKg': return setCostPerKg(v)
                case 'prep': return setPrep(v)
              }
            }}
            setName={setName}
            setServingLabel={setServingLabel}
            setDiet={setDiet}
            onSubmit={submit}
          />
        </Dialog>
      </CardHeader>
      <CardContent>
        <p className="max-w-2xl text-sm leading-relaxed text-muted">
          Useful for a family recipe, a restaurant dish or something you buy regularly. FORM cannot
          verify what you enter — it will use your numbers as given, so take them from a label or a
          composition table rather than guessing.
        </p>
      </CardContent>
    </Card>
  )
}

type CustomFormState = {
  name: string
  servingLabel: string
  grams: number
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  costPerKg: number
  prep: number
  diet: DietPreference
}

function CustomFoodDialog({
  form,
  derivedKcal,
  error,
  setError,
  setField,
  setName,
  setServingLabel,
  setDiet,
  onSubmit,
}: {
  form: CustomFormState
  derivedKcal: number
  error: string
  setError: (e: string) => void
  setField: (k: keyof CustomFormState, v: number) => void
  setName: (v: string) => void
  setServingLabel: (v: string) => void
  setDiet: (v: DietPreference) => void
  onSubmit: () => void
}) {
  const numeric = [
    { key: 'grams' as const, label: 'Serving weight (g)', value: form.grams },
    { key: 'kcal' as const, label: 'Energy (kcal)', value: form.kcal },
    { key: 'protein' as const, label: 'Protein (g)', value: form.protein },
    { key: 'carbs' as const, label: 'Carbs (g)', value: form.carbs },
    { key: 'fat' as const, label: 'Fat (g)', value: form.fat },
    { key: 'fiber' as const, label: 'Fibre (g)', value: form.fiber },
    { key: 'costPerKg' as const, label: 'Assumed price per kg', value: form.costPerKg },
    { key: 'prep' as const, label: 'Prep time (min)', value: form.prep },
  ]

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Add a custom food</DialogTitle>
        <DialogDescription>
          Enter values for one serving. If you leave energy blank, FORM derives it from the macros.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 p-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="cf-name" className="mb-2">
            Name
          </Label>
          <Input
            id="cf-name"
            value={form.name}
            onChange={(e) => {
              setName(e.target.value)
              if (error) setError('')
            }}
            placeholder="e.g. Amma's dal tadka"
          />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="cf-serving" className="mb-2">
            Serving description
          </Label>
          <Input
            id="cf-serving"
            value={form.servingLabel}
            onChange={(e) => setServingLabel(e.target.value)}
            placeholder="1 bowl (250 g)"
          />
        </div>

        {numeric.map((n) => (
          <div key={n.key}>
            <Label htmlFor={`cf-${n.key}`} className="mb-2">
              {n.label}
            </Label>
            <Input
              id={`cf-${n.key}`}
              type="number"
              min={0}
              step={n.key === 'prep' ? 5 : 0.1}
              value={n.value}
              onChange={(e) => setField(n.key, Number(e.target.value))}
              className="num"
            />
          </div>
        ))}

        <div className="sm:col-span-2">
          <Label className="mb-2">Suitable for</Label>
          <div className="grid gap-2 sm:grid-cols-4">
            {(
              [
                { v: 'vegetarian', l: 'Veg' },
                { v: 'vegan', l: 'Vegan' },
                { v: 'eggs', l: 'Eggs' },
                { v: 'non-vegetarian', l: 'Non-veg' },
              ] as const
            ).map((opt) => (
              <OptionCard
                key={opt.v}
                value={opt.v}
                size="sm"
                selected={form.diet === opt.v}
                onSelect={() => setDiet(opt.v)}
                title={opt.l}
              />
            ))}
          </div>
        </div>

        {form.kcal === 0 && derivedKcal > 0 && (
          <p className="sm:col-span-2 font-mono text-[0.6875rem] text-faint">
            Derived from macros: {derivedKcal} kcal
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-danger sm:col-span-2">
            {error}
          </p>
        )}
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onSubmit}>
          Cancel
        </Button>
        <Button onClick={onSubmit}>
          <Check className="size-4" />
          Add food
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}

# FORM — Fuel Your Transformation

A personalized fitness and nutrition planning app. You enter your details,
activity, goal, food preferences and budget; FORM returns a transparent calorie
target, a seven-day meal plan built from real foods, a costed grocery list and
a progress dashboard.

Everything runs in the browser. No account, no backend, no network calls, no
analytics.

```bash
npm install
npm run dev      # http://localhost:5173
```

## Scripts

| command | what it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | typecheck + production bundle into `dist/` |
| `npm run preview` | serve the built bundle |
| `npm test` | 260 unit tests (Vitest) |
| `npm run test:watch` | tests in watch mode |
| `npm run lint` | oxlint |
| `npm run typecheck` | TypeScript only |

## Stack

React 19 · TypeScript 6 · Vite 8 · Tailwind CSS v4 · Motion (`motion/react`) ·
Recharts · Radix primitives · shadcn/ui conventions · Vitest

No UI kit dependency to fight with: components in `src/components/ui/` are
shadcn-style source files living in the repo, so they can be edited freely.

## Architecture

```
src/
├─ types.ts              all domain types (Profile, Food, MealPlan, …)
├─ lib/                  pure logic, no React
│  ├─ nutrition.ts       BMR / TDEE / macro engine + safety floors
│  ├─ meal-plan.ts       deterministic, constraint-first plan generator
│  ├─ prices.ts          price assumptions, grocery list, budget compare
│  ├─ storage.ts         localStorage persistence + validation + migration
│  ├─ units.ts           kg/lb, cm/ft-in conversion
│  └─ format.ts, motion.ts, defaults.ts, hooks.ts, cn.ts
├─ data/                 static reference data
│  ├─ foods.ts           98 foods, approximate per-serving nutrition
│  ├─ meal-templates.ts  ~50 reusable meal templates
│  └─ knowledge.ts       knowledge-centre articles
├─ store/AppStore.tsx    single reducer + context; derived values via memo
├─ components/           UI grouped by feature area
└─ pages/                one file per route
```

The dependency direction is one-way: `data` → `lib` → `store` → `components`
→ `pages`. Nothing in `lib/` imports React, which is why the calculation layer
is directly unit-testable.

### The engine

`BMR` (Mifflin-St Jeor) → `× activity multiplier` → `TDEE` → `goal
adjustment` → `safety clamp` → `target`. Every intermediate value is returned
alongside the result and rendered in the UI, so the number is auditable rather
than magic.

`kcal → protein (g/kg, goal-dependent) → fat (% of energy, with a per-kg floor)
→ carbohydrate (remainder)`. Carbohydrate takes the balance, so the three always
reconcile with the target.

### The planner

Templates are filtered **before** scoring. A meal is only considered if it
survives diet, allergens, ingredient exclusions and cooking facility — these are
safety constraints with no override. Prep time and budget are preferences,
relaxed only to avoid leaving a meal slot empty. Selected meals are scored on
calorie fit, protein, cost, prep time and week variety, then their portions are
scaled toward the slot's energy budget and clamped to 0.25–2.5 servings.

Generation is deterministic: the same profile and seed always produce the same
week, which is what makes "regenerate day 3" meaningful and the tests reliable.

### Profiles, and why there is no login

FORM has **no login page**, deliberately.

There is no server, so an email/password form could not authenticate anyone. It
would accept any credentials, store the password in plaintext localStorage, and
imply a security guarantee that does not exist — which is a real harm in an app
that holds someone's health and body data.

What exists instead is **local profiles**: several people can share one device —
a family laptop, a gym tablet, a shared PC — and each gets a fully separate
plan, meal log, progress history and grocery list. That solves the actual
problem a login would have solved here, honestly.

An **optional 4–12 digit PIN** can lock a profile so a housemate cannot open it
casually. It is salted and SHA-256 hashed, and it is not security: anyone with
devtools on that device can read the data. The UI says this in plain language
wherever a PIN is set, and on the unlock screen there is an explicit
"I am not [name] — remove this profile" path, because forgotten PINs are
otherwise unrecoverable.

If real accounts are ever wanted, that needs a backend, password hashing, a
session model, recovery, and probably a privacy review. It is a genuine project
in itself, not a form.

### Profile isolation

Every data action applies to the active profile only. Logging a meal, adding
progress, or editing the plan for Priya cannot touch Rahul's data — asserted
directly in the test suite, because a leak here would be silent and would show
up as one person's health data attributed to another.

## Persistence

One versioned `localStorage` key holding every profile. Every load is validated
field by field; a corrupt or older payload is migrated or dropped rather than
crashing the app, and one bad profile does not take the others down with it.
Import validates and refuses mismatched versions rather than half-applying them.

A v3 single-profile state migrates transparently into a v4 profile, so existing
users keep their history.

## Styling

Tailwind v4, configured entirely through CSS custom properties in
`src/index.css`. There is no JavaScript config and no `tailwind.config.js`.

**One rule matters more than the rest: the semantic palette must live inside
`@theme`.** Tailwind only generates `bg-*` / `text-*` / `border-*` utilities
from tokens it finds in an `@theme` directive. A custom property declared in an
ordinary `:root { … }` rule is not part of the token registry, so every class
referring to it compiles to nothing — silently, with no build error. The dark
palette therefore lives in `@theme`, and `.light` re-declares the same
properties as a per-theme override. `src/test/tokens.test.ts` fails the build if
this is ever undone.

Interaction states are plain CSS transitions rather than `motion` components.
Two reasons: there are a few hundred hoverable surfaces and they should not each
carry a JS animation, and the `prefers-reduced-motion` / `data-motion="reduce"`
block at the bottom of `index.css` then switches all of them off for free.

The hover vocabulary is named once in `index.css` so it cannot drift:

| utility        | effect                                                        |
| -------------- | ------------------------------------------------------------- |
| `lift`         | anything with a hit area: rises 2px, presses back               |
| `lift-card`    | card treatment: lift, accent border, deepened shadow            |
| `press`        | press feedback with no lift, for dense controls                 |
| `row-hover`    | list row: tinted background plus an accent bar sliding in        |
| `edge-sweep`   | hairline wiping in across the top edge                          |
| `link-wipe`    | underline wiping in from the left                               |
| `icon-nudge`   | pushes a button's leading icon forward on hover                 |
| `icon-nudge-back` | the same, backwards, for "back" controls                     |
| `icon-tilt`    | decorative glyph tilts and grows                                |

Two rules keep the site from turning into a toy: hover only ever *adds*
emphasis (border, cursor and the focus ring already identify the target, so
nothing is load-bearing), and movement stays within 2–4px and ~200ms.

## Testing

260 tests, no snapshots — they assert behaviour.
```
src/test/
├─ nutrition.test.ts   BMR/TDEE/macro maths, goal deltas, safety floors, gating
├─ units.test.ts       kg↔lb, cm↔ft-in, budget period normalisation
├─ meal-plan.test.ts   determinism, allergen & diet exclusion, prep/budget
│                      constraints, portion clamping, food-db integrity
├─ profiles.test.ts    profile lifecycle, isolation, PIN hashing, migration
├─ grocery.test.ts     list consolidation, costing, budget bands, storage
│                      validation, import/export round-trip, legacy migration
└─ tokens.test.ts      design tokens: @theme registration, light-palette parity,
                       no orphan colour utilities, WCAG AA on `text-faint`
└─ sound.test.ts       water-bubble synth: graph shape, envelope scheduling,
                       voice capping, and that it stays silent when it should
└─ navigation.test.ts  Back button: logical parents per route, root has no
                       parent, and the visit stack under back/forward loops
└─ back-button.test.tsx  Back button rendered through a real router: present
                       where it should be, absent on the landing page,
                       accessible name, and where a click actually navigates
```

Four real bugs were caught by tests rather than by looking at the screen:

- **The budget filter was inverted in effect.** It multiplied one meal's cost by
  every slot × 7 days, demanding ~28× the weekly budget. That rejected nearly
  every meal and silently dropped plans onto a fallback tier, so a plan looked
  plausible but ignored the budget entirely.
- **Meal templates missed a food style constant**, so several templates were
  silently dropped for certain profiles — e.g. non-vegetarian users lost every
  lunch option.
- **The whole colour system compiled to nothing.** See *Stying* above. The
  build passed, the tests passed, and the app rendered with no surfaces, no
  borders and inherited text colour. `tokens.test.ts` exists so this cannot
  happen quietly again.
- **`Progress` shared one `cva` between track and fill**, so the track inherited
  the default accent tone and a 0% bar rendered as a full one.

The most expensive bug of the set was invisible to every existing check, which
is the argument for the token guard: "the build is green" is not the same claim
as "the styles are applied".

## Accessibility & motion

- Semantic landmarks, a skip link, visible focus rings, real `aria-valuenow` on
  progress indicators, labelled controls with `aria-describedby`-linked errors
- Keyboard-operable custom controls; `role="radio"` cards respond to Enter/Space
- `prefers-reduced-motion` honoured, plus a three-state in-app override
  (auto / always reduce / always animate)
- Daily weight fluctuations are averaged into weekly trends; calorie and weight
  metrics can each be hidden entirely. There is no streak to break.

Lighthouse accessibility is **100 with zero failing audits**, verified in both
themes. Getting there meant fixing `--color-faint`, which measured 3.6:1 on
every surface it was used on, and dropping an `aria-label` on the brand link
that did not contain its own visible text (WCAG 2.5.3, Label in Name).

## Navigation

The profile picker is a real route at `/profiles`. It used to be a screen that
replaced the entire shell whenever no profile was open, so it inherited whatever
URL you happened to be on — it had no coherent "back", and following a link into
`/dashboard` dropped you on the picker with no way off it. Being a route fixes
that, and `/` is now unconditionally the landing page.

Every route guard lives in one `redirectFor` check in `App.tsx` rather than
wrapped around individual routes, for one specific reason: a redirect that fires
*after* the shell starts recording navigation leaves a bogus entry in the visit
stack. Deep-link to `/grocery` with no profile and you get sent to `/profiles`;
had `/grocery` been recorded first, Back on the picker would return to
`/grocery`, which would redirect straight back — forever. Redirects also use
`replace`, so the browser's own back button leaves the app instead of bouncing.
For the same reason the picker's Back button ignores the visit stack
(`forceFallback`) and always offers the landing page.

Every internal page has a Back control, in the same place, in the same style.
It is rendered by `PageShell` rather than added page by page, so a new page
inherits it and it cannot drift out of alignment on the `narrow` and `wide`
layouts. The landing page does not use `PageShell`, so it cannot acquire one.

The onboarding wizard has its own full-height layout and opts in explicitly. It
also keeps a **"Previous step"** control in its wizard bar, deliberately *not*
labelled "Back": one leaves the wizard, the other walks back through it, and two
controls reading "Back" on one screen is worse than either. That step control is
only rendered from step 2 onwards — previously it was also present on step 1 as
`disabled` + `invisible`, which reserved the space, announced a dead control to
assistive tech, and made "Build my plan" a one-way door.

The destination has two tiers:

| situation | goes to |
| --- | --- |
| you navigated here from another page | that page, via the real history entry |
| deep link, refresh, bookmark | the route's *logical parent* |

Logical parents: the app routes (`/planner`, `/explore`, `/progress`,
`/grocery`, `/settings`) go to `/dashboard`, since they are siblings under the
nav rather than a tree; `/dashboard` and `/profiles` go to `/`; `/learn/:slug`
goes to `/learn`; anything unrecognised goes to `/`.

A Back that always went to the homepage would throw away where the user
actually was, and on a nine-route app that is almost never what they wanted. But
it cannot simply be `navigate(-1)` either — open `/planner` from a shared link
and there is no history to go back to.

The app never writes to browser history, so the browser's own back button
behaves exactly as it always did. Our button uses the real history entry when
there is one, so the two are normally the same gesture. They deliberately differ
in one case: visit the planner, go to Learn, then navigate back to the planner.
Browser back would return you to Learn — the page you were just on — so the
button offers the planner's parent instead. The visit stack collapses revisits
so the button cannot loop; matching the browser's literal history entry is not
the goal.

`/onboarding` is refused as a back destination. Once the wizard has produced a
plan, returning to it drops you into the middle of an edit session.

## Sound

There is exactly one sound: a short bubble when you log a glass of water. It is
**synthesised with the Web Audio API**, not shipped as a file — a three-node
envelope per bubble in `lib/sound.ts`, which is smaller than the `<audio>` tag
needed to play a file and cannot 404.

The shape is what makes it read as water: a sine that climbs roughly an octave
in 70 ms, through a band-pass filter, with the release cut off sharply. A
sustained tone sounds like a beep; a bubble's resonance stops the moment its
cavity closes. Bubbles are staggered 85 ms apart, detuned a few percent each
time so repeated taps do not sound like a machine, and capped at four voices so
logging 500 ml bubbles twice rather than a continuous hiss.

It is one bubble per glass *added*, so removing water sounds different from
adding it, and a partial glass is silent.

Off by default in one respect: the setting only appears when the browser
actually supports Web Audio, and switching it on plays a bubble so you know it
worked. There is no audio anywhere else in the app, and no microphone, no
speech, and no network audio.

## Honest limitations

This is an educational prototype, not medical advice.

- **Calorie estimates are group averages.** Mifflin-St Jeor is a prediction
  equation; individual needs sit well above or below it. Treat the output as a
  starting point, hold it 2–3 weeks, then adjust by 100–150 kcal based on
  response.
- **Food values are rounded approximations** assembled from public composition
  tables (IFCT 2017 for Indian foods, USDA FDC for international). A real
  portion depends on the recipe, oil, brand and how it was weighed.
- **Prices are assumptions you can edit**, not live quotes. No FX rate is
  fetched; the USD rate is a fixed, user-editable constant.
- **`sex` is one constant in one equation.** It is not used for meal selection,
  macro targets, or anything about appearance. The UI states this at the point
  of asking, and offers a "prefer not to say" option that averages the two
  published constants.
- **No reference bodies are shown.** Height, weight and body-type labels cannot
  reliably predict an outcome, so presenting one as a target would be dishonest.
- **The planner is a heuristic, not an optimiser.** It produces a realistic week
  a person would cook. It is not a linear program and does not claim to be
  nutritionally optimal.
- **21st.dev was not integrated.** Their component source requires an API key
  tied to a human account; only metadata is public. The animation techniques in
  `LogMealDialog` are reimplemented in FORM's own palette rather than copied.
- **No backend, deliberately.** That means no cross-device sync, no cloud
  backup, and no sharing between devices. Use the JSON export in Settings.
- **The PIN is a speed bump, not security.** See the profiles section above.
- **Profiles live on one device.** There is no sync, so a plan made on a phone
  is not available on a laptop.

## Deployment

Build with `npm run build`; the output is `dist/`. It is a static bundle — no
server, no runtime config, no environment secrets.

### The one thing that breaks

This is a single-page app with real URLs (`/dashboard`, `/planner`, …), so it
needs a **history-API fallback**. Without one, reloading or deep-linking any
route returns 404 while the app works fine when you click through it — which is
why it tends to surface as "sometimes the URL can't be reached" rather than as
an obvious error. `vite dev` and `vite preview` do this automatically, so the
problem only appears once deployed.

Rewrites are committed for the common hosts:

| host | file | notes |
| --- | --- | --- |
| Netlify | `dist/_redirects` | via `public/_redirects` |
| Cloudflare Pages | `dist/_redirects` | same file |
| Vercel | `vercel.json` | at the repo root |
| Apache / cPanel | `dist/.htaccess` | via `public/.htaccess` |

For nginx, serve `dist/` and add:

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

Each config skips the rewrite for paths that exist, so hashed assets are served
directly. Without that guard a missing `.js` returns `index.html` with a 200 and
you get a baffling MIME error in the console instead of a clean 404.

### Hosting under a sub-path

`example.com/form/` or a GitHub Pages project site both need the base path
declared, because the router and the asset URLs have to agree:

```bash
cp .env.example .env.production   # then uncomment PUBLIC_BASE_PATH=/form/
npm run build
```

`PUBLIC_BASE_PATH` feeds Vite's `base` and, through `import.meta.env.BASE_URL`,
React Router's `basename`. One value, one place, nothing to keep in sync.

Do **not** use `base: './'` to try to be portable. Relative asset URLs resolve
against the *document* URL, so on a deep route like `/learn/protein` the browser
requests `/learn/assets/index.js` and 404s. An absolute path rooted at a known
base is the only thing that survives deep links.

### Performance

Every page except the landing one is a lazy chunk. Chunks are fetched on hover
and focus of a nav link, and all of them are prefetched once the browser goes
idle after first paint, so navigation costs a render rather than a round trip.
Assets are content-hashed, so a deploy is a pure cache swap — the
`.htaccess` sets `immutable` on them and `no-cache` on `index.html`, which is the
combination that stops a deploy serving stale HTML pointing at deleted hashes.

## Future work

- Meal-template editing and a user-extensible template library
- A rotation engine that reuses ingredients across the week to cut waste
- Barcode scan → composition lookup for packaged food
- Regression tests for the plan generator's variety and budget properties
- Optional encrypted cloud backup (would change the "no server" promise and
  should be a deliberate decision, not a default)

## Licence

MIT. All artwork, including the wordmark, goal illustrations, grain textures and
the dashboard preview charts, is original and generated in code — no third-party
images ship with the project. Typography is Archivo, Inter and JetBrains Mono
from Google Fonts, with system fallbacks so the app degrades cleanly offline.

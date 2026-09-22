# Blackjack Trainer

A web app that trains three blackjack skills, in order: **basic strategy → Hi-Lo card counting →
playing deviations (index plays)**. You play full single-spot rounds, get an end-of-round review
explaining each decision, and are guided along a recommended path while free to practise anything.
Progress is tracked per chart cell with Leitner buckets and an accuracy heatmap.

**Ruleset:** dealer stands on soft 17, double after split, late surrender — fixed, because a chart
is only right for the game it was computed for. The **shoe** is not: deck count (4–8) and
penetration are settings, since research sources this chart for the whole 4–8 range. The engine is
rules-aware so other rulesets can be added once their numbers are sourced.

No backend, no accounts, no real money. Everything persists to `localStorage`.

## Running it

```sh
npm install
npm run dev     # dev server
npm run build   # production bundle + the generated pages, sitemap and robots.txt
npm run preview # serve the build — the written pages only exist after one
npm test        # engine + srs unit tests (node:test, no framework)

npm run fonts   # re-download the webfonts (by hand; output is committed)
npm run images  # re-render the OG card and touch icon (needs Chrome)
```

## Modes

| Mode | What it drills |
|---|---|
| **Play** | Full rounds with a flat bet, then a graded recap: ✓/✗ per decision, the correct action, a heuristic "why", and the chart cell behind each miss. |
| **Counting** | Tag speed, a countdown of an adjustable number of cards (the 30s benchmark scales to the length), and true-count conversion — all graded against the shoe's own count. |
| **Deviations** | Illustrious 18 + Fab 4 flashcards. The count is handed to you; you name the play. |
| **Integration** | The capstone: keep the count yourself, size the bet by it, make the index plays. Graded per shoe on count, bets, play and deviations. |
| **Progress** | One grid, two faces — the canonical strategy chart, and the same grid coloured by your accuracy. Click any cell to drill it. |

## Architecture

```
src/
  engine/    strategy, charts, deviations, shoe, hand, drills, betting, reasons, integration
  srs/       leitner buckets, per-cell progress, mastery gates, localStorage
  lib/       shared Svelte UI, motion, audio, the live session
  routes/    app shell, path router, dashboard
  site.js    the origin, and the reference pages that exist alongside the trainer
scripts/
  build-seo.js     post-build: per-route HTML, the written pages, sitemap, robots, headers
  seo/pages.js     the written pages, generated from the engine
  fetch-fonts.cjs  self-hosts the webfonts
  make-images.cjs  renders the OG card and the touch icon
```

**`engine/` and `srs/` contain zero Svelte imports** and are unit-tested in Node. The strategy
engine is the single grading oracle — no mode re-implements strategy, counting or the indices.

## Accounts (optional)

The trainer works with **no account at all** — progress in `localStorage`, no network, nothing
gated. Signing in with Google adds one thing: a copy of that progress on the server, so it
survives clearing the browser and appears on another device.

```
worker/index.js   the /api/* routes; everything else is served straight from the asset store
worker/auth.js    Google OAuth (authorization code + PKCE, server-side) and session cookies
worker/db.js      every SQL statement, all parameter-bound
migrations/       the D1 schema
src/lib/api.js            browser half — thin, same-origin, never throws
src/lib/account.svelte.js sync state and the conflict rule
```

**No password is ever created or stored.** Google does the identifying; the server keeps a
Google subject id, an email address to show back to you, the progress blob, and a *hash* of the
session token. Deletion is one call and cascades. What is stored is documented publicly on
`/privacy`, generated like every other reference page.

Because sign-in is a server-side redirect rather than Google's JavaScript SDK, no third-party
script runs on the page and the CSP stays at `script-src 'self'`, `connect-src 'self'`.

### The bit that could lose someone's work

`localStorage` stays the working copy; the server is a mirror written after the fact, debounced.
Two devices — or one device that played signed out and then signed in — can both hold progress.
Where one side is empty the other simply wins. Where **both** have real progress and they
disagree, the app asks rather than picking, and touches neither side until answered.

Last-write-wins is a real limitation, not a solved problem: play on two devices simultaneously
and the later save overwrites rather than merging cell by cell. `hasRealProgress` is what decides
whether a person gets asked, and it is tested accordingly.

### Running it

```sh
npx wrangler d1 migrations apply twenty-one-db --remote
npx wrangler secret put GOOGLE_CLIENT_SECRET   # paste at the prompt; never in the repo
# GOOGLE_CLIENT_ID is public and lives in wrangler.toml
```

With no credentials set, `/api/me` reports `configured: false` and the UI offers no sign-in at
all rather than a button that answers 503.

## Settings

`src/lib/settings.js` is the single source of truth for everything adjustable: each setting's
default, its range and what it means. The panel **renders that schema** rather than keeping a
second copy, and `setSetting` clamps through the same module, so a dragged slider, a typed
number and a hand-edited `localStorage` blob all land in the same allowed range.

| Setting | Range | Notes |
|---|---|---|
| Decks in the shoe | 4–8 | The whole range the chart is sourced for, so every hand is still graded correctly. |
| Penetration | 50–90% | Stored as a *fraction*, not a deck count, so it survives a change of shoe size. |
| Starting bankroll | $100–$100k | Plus a Reset, because losing the roll used to be terminal. |
| Cards per countdown | 10–52 | See below. |
| Shoe size for true count | 1–8 decks | Only affects the arithmetic you practise, never a chart. |
| Tag speed pace | fast / normal / slow / manual | Manual waits for you instead of auto-advancing. |

**Not adjustable:** S17, DAS and surrender. The engine knows the H17 cell changes, but the
no-DAS and no-surrender deltas exist in research only as prose rather than tables, so the
trainer cannot grade those games correctly and does not offer them.

### Why the countdown deals a partial deck

It used to deal all 52. Hi-Lo is balanced, so a full deck sums to **zero by construction** — the
answer was known before the first card turned, and typing `0` scored a clean run without
counting anything. Worse, the elapsed clock was only stopped by a click the UI stopped offering
once the last card was dealt, so runs were graded at `0.0s`, which is inside every target there
is. Between the two, the counting mastery gate could be cleared without counting or speed.

A run now deals a configurable number of cards, so the ending count is genuinely unknown, and
the clock stops on the last card. The sourced 30s/25s benchmarks are quoted for 52 cards, so
they scale by the per-card rate, and a run's best time is stored as its **52-card equivalent** —
otherwise shortening the drill would look like getting faster.

## The public site

The trainer is an app, and an app is close to invisible to a search engine: one URL, almost no
text. So the build also produces a **site** around it — see [DEPLOY.md](DEPLOY.md) for hosting
and for what to do about Search Console.

Two things make that work:

**Routing is path-based.** Every mode is a real URL (`/counting`, not `#/counting`), and
`scripts/build-seo.js` writes one HTML file per route with its own title, description, canonical
link and Open Graph tags. Old hash links still resolve — the shell rewrites them once.

**The written pages are generated from the engine.** `/basic-strategy-chart`, `/card-counting`,
`/illustrious-18`, `/blackjack-rules` and `/about` are static HTML with no JavaScript, and every
number on them is imported from the same modules that grade a hand — `engine/charts.js`,
`engine/deviations.js`, `engine/betting.js`, `lib/house.js`. Nothing numeric is typed into
`scripts/seo/pages.js`. A cell that changes in the engine changes on the public chart in the same
build, which is the same no-drift rule the test suite enforces against research, extended to the
pages a stranger reads first.

Prose figures on those pages come from the research document and nowhere else. If a number is
not sourced there, the page does not claim it.

## Where the numbers come from

`research/blackjack-trainer-research.md` is the source of truth for every chart cell, Hi-Lo tag,
index and drill benchmark, each traced to a cited source. **Do not hand-edit a number in the
code** — fix it in research first, then mirror it. The test suite transcribes the charts
independently from research and compares cell for cell, so a drift between the two fails the build.

`SPEC.md` holds the product and front-end specification (§11 is the front end).

## Carried caveats

- **H17 indices are not sourced.** The deviation table is tagged S17; an H17 ruleset disables
  deviations with a notice rather than inventing numbers (research §3c).
- **The bet ramp's rungs are a convention.** The 1–15 spread and "table minimum at TC ≤ +1" are
  sourced; the individual rungs are not, so the trainer shows the ramp rather than hiding it.
- **The countdown gate floor is a convention.** Runs under 26 cards grade and show a time but do
  not move the clean-run streak; the 26 is a judgement call, not a sourced number. Scaling the
  30s benchmark by the per-card rate is arithmetic on a sourced figure, not a new one.
- **No UI test framework in v1** (SPEC §8) — the tests cover the pure layers.

# Blackjack Trainer

A web app that trains three blackjack skills, in order: **basic strategy → Hi-Lo card counting →
playing deviations (index plays)**. You play full single-spot rounds, get an end-of-round review
explaining each decision, and are guided along a recommended path while free to practise anything.
Progress is tracked per chart cell with Leitner buckets and an accuracy heatmap.

**Ruleset (fixed):** 6 decks, dealer stands on soft 17, double after split, late surrender. The
engine is rules-aware so other rulesets can be added once their numbers are sourced.

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
| **Counting** | Tag speed, deck countdown (under 30s, five clean runs), and true-count conversion — all graded against the shoe's own count. |
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
- **No UI test framework in v1** (SPEC §8) — the tests cover the pure layers.

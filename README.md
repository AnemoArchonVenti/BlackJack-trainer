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
npm run build   # production bundle
npm test        # engine + srs unit tests (node:test, no framework)
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
  routes/    app shell, hash router, dashboard
```

**`engine/` and `srs/` contain zero Svelte imports** and are unit-tested in Node. The strategy
engine is the single grading oracle — no mode re-implements strategy, counting or the indices.

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

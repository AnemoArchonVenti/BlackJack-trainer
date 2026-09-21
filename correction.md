# Corrections — Bug Log

**Status:** Open. Bugs found by hand while playing the app; fixed in order of severity.
**Scope:** Anything that behaves wrong, looks wrong, or reads wrong. Strategy/counting/index *numbers*
are not bugs here — those trace to `research/blackjack-trainer-research.md` and get fixed there first.

---

## Open

| # | Where | Severity | Summary | Status |
|---|---|---|---|---|
| — | — | — | — | — |

---

## Fixed

### 1. Dashboard heatmap thumbnail was unreadable

**Where:** `src/routes/Dashboard.svelte:124` renders `<Chart compact view="accuracy" />`;
the compact behaviour lives in `src/lib/Chart.svelte`.
**Severity:** major — it occupied a quarter of the landing page and communicated nothing.

**What happened:**
The thumbnail under "Your accuracy, cell by cell" was a field of 8×8px squares with no labels of
any kind. Almost all of them were `--cell-untouched` (`#e6e1d6`), barely distinguishable from the
page ground (`#f4f1ea`), so the grid read as faint noise with a few isolated green dots. `compact`
stripped out every piece of orientation the full chart has: section titles, upcard column headers,
row labels, and the action letter. `.chart.compact { gap: 3px }` was also the same 3px that
separates rows *inside* a section, so Hard/Soft/Pairs fused into one lumpy block with ragged
edges — the "not correctly arranged" part. There was no key, so nothing said what green meant.

**Root cause:** not a coding slip. `DESIGN-SPEC.md` §5.8 specified it: *"Compact (thumbnail)
cells: 8px squares, 3px gap, no radius."* The implementation was faithful; the design was wrong.

**Fix:** the compact variant is now a labelled miniature of the same chart rather than a sparkline.

- `Chart.svelte` renders compact from **one table** for all three sections, so the columns align by
  construction. The cell button moved into a `{#snippet cellButton}` shared by both variants.
- Kept in compact: upcard headers (once, at the top), a section caption per block over a hairline
  rule, and row labels down a 34px left gutter. Cells 14×11px.
- `line-height: 0` on compact cells — the root's `17px/1.5` was putting each 11px cell on a 25px
  line box, making every row 27px tall and the block twice the height it needed.
- Added a three-swatch key: *not practised / weak / solid*.
- `--cell-untouched` lifted `#e6e1d6` → `#dcd4c2` (light) and `#2a251e` → `#373026` (dark) in both
  `src/app.css` and `design/editorial/tokens.css`, so unpractised cells read as cells. This also
  makes the grid visible in the full chart on Progress.
- `DESIGN-SPEC.md` §3, §5.2 and §5.8 updated to describe the labelled miniature, so the spec does
  not re-prescribe the bare grid next time.

**Verified:** 99/99 tests pass, `npm run build` clean, and both the Dashboard thumbnail and the
full Progress chart checked in the browser. Dark mode was not visually checked — only the one
token changed there.

---

### 2. The bet chips did not look like chips

**Where:** `src/lib/ChipStack.svelte` — the $1 / $5 / $25 / $100 denomination buttons on the felt.
**Severity:** minor — cosmetic, but it is the first thing you touch in the Play mode.

**What happened:**
Each chip was a flat 48px disc of one colour with `border: 2px dashed` over it and a separate
`outline: 2px solid`. A dashed border on a circle renders as a ring of small even ticks, and the
outline sat outside it as a second, detached ring — so the result read as a coloured dot with a
dotted halo. Nothing about it said "casino chip": no edge spots, no inner ring, no face.

**Root cause:** the same as correction #1 — `DESIGN-SPEC.md` §5.5 specified it: *"48px circles
with a 2px dashed ring at 55% white."* The code was faithful to the spec.

**Fix:** the chip is now built from three background layers instead of a border.

- The face is a solid disc of the denomination colour; a fine `--chip-spot` ring sits at
  71–73.5% of the radius; the rim carries six cream edge spots cut by a
  `repeating-conic-gradient(from 15deg, …)`.
- `circle closest-side` on the radial stops — without it a radial gradient in a square box
  measures centre-to-*corner*, so every percentage overshoots the circle by ~41%.
- 56px rather than 48px, with tabular figures so `$100` sits inside the face.
- New `--chip-spot` token (`#fbf9f3` light, `#f6f1e6` dark) in `src/app.css` and
  `design/editorial/tokens.css`. The cream is also what keeps `--chip-25` — the felt's own
  green — from vanishing into the table.
- Hover thickens the outline to 2px; the old dashed border and the detached outline are gone.
- `DESIGN-SPEC.md` §5.5 rewritten to describe the layered chip.

**Verified:** 103/103 tests pass, build clean, and the chips were clicked through in the browser
($5 + $25 → "Bet $30"). Dark mode not visually checked — only the one token differs there.

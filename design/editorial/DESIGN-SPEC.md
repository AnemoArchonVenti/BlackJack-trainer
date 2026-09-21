# Editorial — design specification

Scope: the Svelte 5 front end in `src/` (routes, lib, app.css, index.html). Out of scope: `engine/`,
`srs/`, any behaviour, any copy that comes from the engine (reasons, gate text). Tests must stay
green (`npm test`).

Audience this was designed for: a casual player preparing for a casino trip. The tone is a
well-made textbook, not a casino and not a trading terminal. Confidence over adrenaline.

---

## 1. Principles (apply these whenever the spec is silent)

1. **Rules, not boxes.** Group content with 1px hairlines (`--border`) and a heavier 1px ink rule
   (`--rule`) at the top of a section. Do not draw bordered, rounded, shadowed cards around
   content. The only rounded, filled surfaces in the whole app are the felt, playing cards,
   buttons, and the drill modal.
2. **One accent.** `--accent` (green) marks exactly three things: the active nav item, the
   primary button, and "the thing you should do next". Correct answers may use it. Nothing else.
   Losses and wrong answers use `--danger`.
3. **Serif for what matters.** Headlines, big numbers (bankroll, accuracy, totals on the felt),
   and the wordmark are Newsreader. Body, buttons, labels are IBM Plex Sans. Small uppercase
   tracked labels and the ruleset line are IBM Plex Mono.
4. **Flat.** No gradients anywhere, including the felt. No drop shadows. `--shadow` is `none`.
5. **Air.** Section spacing is generous (`--s-5`/`--s-6`), inside-section spacing is tight
   (`--s-2`/`--s-3`). A page should look like a well-set magazine spread, not a form.
6. **Keyboard is visible.** Every action button on the table shows its key (H, S, D, P, R) as a
   small mono glyph. This is a feature of the app; make it look intentional.
7. **Copy stays as written.** Do not rewrite gate text, reasons, or labels that come from the
   engine or the spec. Layout and type are the job.

---

## 2. Typography

Load in `index.html` `<head>`, before the module script:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
```

| Role | Family | Size / line | Weight | Notes |
|---|---|---|---|---|
| Page headline (h1) | Newsreader | 64px / 1.02 | 500 | `letter-spacing: -0.02em`. Dashboard only. Other routes: 40px. |
| Section heading (h2) | Newsreader | 26px / 1.15 | 500 | `letter-spacing: -0.01em` |
| Wordmark | Newsreader italic | 28px | 500 | Text is "Twenty-One". Replaces "♠ Blackjack Trainer". |
| Big number (stat) | Newsreader | 30–48px / 1 | 500 | Tabular figures: `font-variant-numeric: tabular-nums`. |
| Hand total on felt | Newsreader | 26px | 600 | White. |
| Felt captions ("Dealer shows 4") | Newsreader italic | 18px | 400 | `rgba(255,255,255,0.85)` |
| Body / lead | IBM Plex Sans | 17–19px / 1.55 | 400 | Lead paragraphs use `--text`, max-width 560px, `text-wrap: pretty`. |
| UI text, buttons | IBM Plex Sans | 15–16px | 500 | |
| Small copy | IBM Plex Sans | 14px / 1.55 | 400 | `--text` |
| Kicker / small label | IBM Plex Mono | 12px | 400 | `letter-spacing: 0.14em; text-transform: uppercase`. Green when it marks "now". |
| Key glyph on buttons | IBM Plex Mono | 12px | 400 | `--text` |
| Card index | IBM Plex Sans | 20px rank / 16px suit | 600 | |

Do not use `system-ui`, Segoe, Roboto, Arial or Inter anywhere.

---

## 3. Colour

All values are in `tokens.css`. The palette is small on purpose:

- Ground `#f4f1ea`, ink `#1c1a17`, muted `#5f5950`, hairline `#d9d3c7`.
- Green `#1f5c3f` (accent and felt). White on it is 7.6:1.
- Brick `#8a2f2a` (losses, wrong, card backs). Card red `#b8352f` for hearts and diamonds.
- Chart action colours are five muted tints at the same lightness, always with ink text on top.
- Heatmap accuracy shading keeps the existing `color-mix` formula in `Chart.svelte`; with the new
  `--good`/`--bad` it runs from brick to green. Untouched cells are `#dcd4c2` — quiet, but far
  enough off the `#f4f1ea` ground to read as a cell rather than as nothing.

Dark mode (`prefers-color-scheme: dark`) is provided in `tokens.css` as the warm-charcoal
variant. Keep the media query; do not add a manual toggle unless asked.

---

## 4. Layout grid

- Desktop content width: 1280px max, centred, with 80px side padding at ≥1280px and
  `clamp(1rem, 4vw, 80px)` below. The old 1120px max goes.
- Twelve columns, 32px gutter, on the Dashboard and Play routes. Other routes use a single
  column with the same padding.
- Vertical rhythm: 64px from the top bar to the first content on the Dashboard; 40px on other
  routes; 56px between major sections.
- Phone (≤560px): single column; the felt fills the width; the review panel stacks below; the
  action buttons become a 2×2 grid, each ≥48px tall.

---

## 5. Components

### 5.1 Shell (`Shell.svelte`)

Top bar, 76px tall, hairline below, background = `--bg` (not a white panel), sticky.
Left: wordmark "Twenty-One" (Newsreader italic 28/500). Centre-right: nav links in Plex Sans 15,
`--text` for inactive, ink + 500 weight for active, and the active item has a **2px green
underline flush with the bar's bottom hairline** (achieve with `padding: 26px 0` and
`border-bottom: 2px solid var(--accent)`; the hairline sits behind it). No pill backgrounds.
Right: "Settings" as an outlined 1px `--border` button, 4px radius, 14px text.
The route title (`h1.route-title`) is removed from the shell; each route sets its own heading.
Footer: hairline above, two Plex Mono 12 `--text` lines left-aligned to the content edge, each
led by an uppercase ink label in a 92px gutter — THE GAME (the ruleset) and THE METHOD (basic
strategy, Hi-Lo, Illustrious 18 + Fab 4). Both strings come from `lib/house.js`, so a player on
any page can see which game they are being graded against. Remove the opacity on it.
Skip link and focus ring stay as they are.

### 5.2 Dashboard (`Dashboard.svelte`)

Twelve-column grid. Reference: `mockups/Dashboard.html`.

- **Hero** (cols 1–7): kicker "Chapter one" (Plex Mono, green) → h1 "Start with basic strategy."
  (64/500) → lead paragraph (19px, `--text`, max 560px) → actions row: primary button
  "Play a hand" (green fill, white text, 16px/500, `padding: 16px 28px`, 4px radius) and a text
  link "Read the chart first" with a 1px ink underline (`border-bottom`, 2px padding).
  The kicker and h1 change with `nextStep()`: chapter number I–IV maps to play / counting /
  deviations / integration; the h1 is "Start with basic strategy." / "Now, card counting." /
  "Now, the deviations." / "The integration table." and the lead is the route blurb + `next.why`.
  The green "Continue" gradient panel is deleted.
- **Stats column** (cols 9–12): a list with a 1px ink rule on top and hairlines between rows.
  Each row is `label (14px, --text)` on the left and a Newsreader 30px figure on the right,
  baseline-aligned. Rows: "Strategy, last 50 decisions", "Best clean deck countdown", "Bankroll",
  "Cells mastered" (`n of total`, the "of total" in 16px `--text`). Bucket counts (New / Learning
  / Review / Mastered) move to the Progress route; drop the little boxed `<dl>`.
- **The path** (cols 1–8, next row): a list with a 1px ink rule on top, hairline between rows,
  each row a 3-column grid `72px 1fr 1fr`: roman numeral (Newsreader 22, green for current,
  `--text` otherwise) · name (17px/500, plus a green Plex Mono "now" tag on the current one and a
  "passed" tag in `--text` on passed ones) · detail + gate in one 14px `--text` line joined by
  " · ". Keep the "suggestions, not locks" sentence as a 14px `--text` line under the list.
- **Heatmap thumbnail** (cols 9–12): "Your accuracy, cell by cell" label, the compact `Chart`
  (see 5.8 — a labelled miniature, not a field of bare squares), a three-swatch key, then
  "Open the full chart" as an underlined text link.
- **House rules and method** (full width, closing the page above a 1px `--rule`): h2 "One game,
  taught three ways." in Newsreader 26–34/500, then two columns — the rules as a hairline
  definition list (term 16/500 ink, detail 14 `--text`) in cols 1–6, and the three methods as a
  numbered list (green Plex Mono numeral, Newsreader 20 name, two 14 `--text` lines) in cols
  8–12, closed by the "why the ruleset is fixed" note over a hairline. Every word and number of
  it comes from `lib/house.js`, which spells them from the engine — never retype a rule here.

### 5.3 Card (`Card.svelte`)

92×130px on desktop (`5.4rem × 7.6rem`), 6px radius, 1px `--card-border`, `--card-bg` face,
no shadow. Rank 20px/600 with the suit 16px stacked beneath in the top-left, mirrored and
rotated in the bottom-right, one centre pip at 40px. Back: `--card-back` with a 5px/10px 45°
hatch at 14% white, inset by 10px inside a `--card-bg` frame (i.e. the back is a coloured
rectangle inside a cream border, like a real card). The 3D flip stays.
On phones cards scale to 64×90 (`4rem × 5.6rem`) with 16/12/28 type.

### 5.4 Felt (`Table.svelte`, `HandView.svelte`)

One flat green panel: `background: var(--felt)`, 12px radius, no border, `padding: 12px`.
Inside it a full-size inner frame with `border: 1px solid var(--felt-inset)`, 6px radius, and
`padding: 40px 32px`. Dealer at top, player at bottom, `justify-content: space-between`, min
height 60vh on desktop. No radial gradient. No 6px `--felt-edge` border.
Above the felt (outside it), a header row: "Bankroll **$995**" and "Bet **$5**" on the left
(label 14px `--text`, figure Newsreader 24/500 ink) and "Shoe · 23 of 312 dealt" in Plex Mono
12 on the right. The bankroll line inside the felt is removed.
Hand captions: "Dealer shows 4" and "You hold hard **15**" (or "soft", or "Hand 1 · $5" when
split), Newsreader italic 18 at 85% white, the total 26/600 white. Replace the existing
`label` + bold total. The active hand is marked by the caption being fully white and the
total green-on-white — drop the 2px box-shadow ring around active hands. Win/lose/push rings
also go; the outcome is stated in the caption instead ("Won $5", "Lost $5", "Push") in the
matching money colour.
Action buttons sit **below** the felt in a 4-column grid with 12px gap: 56px tall, 1px ink
outline, transparent fill, 4px radius, label 16px/500 ink, key glyph in Plex Mono 12 `--text`
after a 10px gap. Hover: `--hover` fill. Only legal moves render (already true).
"Next hand (Enter) — $5" becomes a green filled primary button in the same row, spanning the
grid, with the same height.

### 5.5 Chips (`ChipStack.svelte`)

Chips are 56px and read as chips, not as coloured circles: a solid face in the denomination
colour, a fine `--chip-spot` ring at 71–73.5% of the radius, and a rim carrying six cream edge
spots cut by a `repeating-conic-gradient`. Built from three background layers, with
`circle closest-side` on the radial stops so they measure to the chip's edge rather than to the
box's corner. A 1px `--chip-spot` outline keeps `--chip-25` — the felt's own green — off the
table. Denomination in Plex Sans 14/600 white, tabular figures; colours from `--chip-*`.
Clear / Rebet are outlined ink buttons; Deal is the green primary. The "Bet $x" readout is
Newsreader 20 white. The whole chip stack sits inside the felt's bottom area during the betting
phase, centred.

### 5.6 Review panel (`Review.svelte`)

A ledger, not a card. Width: cols 9–12 on desktop (~360px), stacks below on mobile.
Top: 1px ink rule, then a row with h2 "The last hand, reviewed" (Newsreader 26/500) and the
result on the right in Plex Mono 12 (`Lost $5` in `--danger`, `Won $5` in `--good`, `Push` in
`--text`). Each decision is a block separated by hairlines: first line is the situation in
16px/500 ("Hard 12 against a 3", built from the hand type, total and upcard; for pairs
"A pair of 8s against a 10"), with the verdict right-aligned in Plex Mono 12 uppercase tracked
0.08em — `DOUBLED ✓` in green or `STOOD ✗` in brick. For a miss, a Newsreader italic 15px line
"The book says hit." (the correct action, lower case) precedes the reason paragraph
(14px/1.55 `--text`). The chart-cell chip becomes a text link "Drill 12 against 3" with a 1px ink
underline. Keep the `aria-live` region.
Below the decisions, pushed to the bottom with `margin-top: auto`, a 1px ink rule and three
14px rows: "Decisions this session", "Accuracy", "Hands" — figures ink, labels `--text`.
Remove `background`, `border-radius`, `box-shadow`.

### 5.7 Drill modal (`CellDrill.svelte`)

The one place a panel is allowed: `--panel` background, 1px `--border`, 6px radius, no shadow,
on a `rgba(28,26,23,0.5)` scrim. Heading Newsreader 26. Buttons as in 5.4.

### 5.8 Strategy chart and heatmap (`Chart.svelte`, `Progress.svelte`)

Toggle "Correct actions / My accuracy": two text buttons side by side, the active one with a
2px green underline (same pattern as the nav), no pill.
Section titles ("Hard totals" etc.) Newsreader 22/500. Column and row headers Plex Mono 12
`--text`. Cells 32×26px, **no radius**, 2px gap, action letter in Plex Sans 12/600 ink on the
muted action tints. Accuracy view keeps the `color-mix` shade. Hover: a 1px ink outline on the
cell (`outline`, not a shadow).

Compact (thumbnail): the same chart at miniature scale, and it keeps every axis — an unlabelled
grid states nothing. One table carries all three sections so the columns align by construction:
upcard headers once at the top (Plex Mono 9 `--text`), a section caption per block (Plex Mono 9
uppercase, 0.12em tracking, ink, over a `--border` hairline), row labels down the left (Plex Mono
9 `--text`, right-aligned in a 34px gutter), cells 14×11px with a 2px gap and no radius, and
`line-height: 0` on the cells so the root's 1.5 does not inflate the rows. Below it, a key:
three 9px swatches reading "not practised / weak / solid".
Progress route: h1 "Progress" Newsreader 40, the chart on the left (cols 1–8), and on the right
(cols 9–12) the bucket counts as a hairline list like the dashboard stats column, then
"Last 50 decisions" and "Bankroll", then the "Click any cell to drill that exact situation"
sentence in 14px `--text`.

### 5.9 Counting, Deviations, Integration, Settings

These inherit the tokens. Do a sweep for: tab bars (make them the underline pattern from 5.8),
panels with borders/shadows (remove; use a top ink rule + hairlines), primary buttons (green
fill), secondary buttons (ink outline), big numbers (Newsreader), small labels (Plex Mono
uppercase). The countdown timer and the true-count answer are big Newsreader figures. Feedback
"correct/wrong" uses `--good`/`--danger` text, never a coloured background fill.

---

## 6. Motion

Unchanged in behaviour. Because cards no longer have shadows, the deal-in `fly` should keep
`opacity: 0.3` so the movement still reads. The active-hand highlight no longer animates (it was
a box-shadow; now it's a colour change on the caption).

---

## 7. Acceptance checklist

- [ ] `npm test` green; `npm run build` clean.
- [ ] No `system-ui`, `Segoe`, `Roboto`, `Arial`, `Inter` in `src/` (grep).
- [ ] No `linear-gradient` or `radial-gradient` in `src/` (grep). The card-back hatch uses
      `repeating-linear-gradient` and is the single permitted exception.
- [ ] No `box-shadow` in `src/` other than `none` (grep).
- [ ] No raw hex colours in any `.svelte` file; everything reads a token.
- [ ] Every text/ground pair ≥ 4.5:1 (≥ 3:1 at ≥24px). Check `--text` on `--bg`, white on
      `--felt`, ink on each `--act-*`.
- [ ] Nav active state is the 2px underline; no pill anywhere in the app.
- [ ] Dashboard matches `mockups/Dashboard.html` at 1440px within a few px; Play matches
      `mockups/Play.html`.
- [ ] Play, Counting drills and the flashcards are usable one-handed at 390px wide; every
      button ≥ 44px tall.
- [ ] Keyboard: H/S/D/P/R and Enter still work; focus ring visible on every control.
- [ ] Dark mode renders the warm-charcoal variant with no unreadable text.

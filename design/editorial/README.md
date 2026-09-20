# Editorial reskin — handoff package

This folder is a self-contained brief for reskinning the Blackjack Trainer front end in the
**Editorial** direction chosen on the design canvas. It is written for Claude Code (or any
developer) to implement without further design input.

## What's in here

| File | What it is |
|---|---|
| `CLAUDE-CODE-PROMPT.md` | The prompt to paste into Claude Code. It points at the other files. |
| `DESIGN-SPEC.md` | The full specification: principles, tokens, type scale, every component, every screen, and the acceptance checklist. |
| `tokens.css` | A drop-in replacement for the `:root` block (and the dark-mode override) in `src/app.css`. Copy it in verbatim. |
| `mockups/Dashboard.html` | Static HTML mockup of the Dashboard. Open in a browser. Pixel values in it are the reference. |
| `mockups/Play.html` | Static HTML mockup of the Play screen mid-hand, with the review panel. |

## The one-paragraph version

Cream ground, ink-black text, one deep green. Newsreader (serif) for headlines, numbers and the
wordmark; IBM Plex Sans for everything else; IBM Plex Mono for small labels and the ruleset line.
Hairline rules instead of cards and shadows. The felt is a single flat green panel with a thin
inset line; it is the only large block of colour on any screen. Nothing has a gradient. Nothing
has a drop shadow. Space does the work that boxes used to do.

## How the code is set up (already true, no work needed)

`src/app.css` is the only global stylesheet and every component reads colours, fonts, radii and
spacing from its custom properties. So most of this reskin lands by replacing that file's tokens,
then adjusting the handful of components that hard-code layout (the shell, the dashboard, the
table, the card, the review panel, the chart). `engine/` and `srs/` are untouched.

## Order of work

1. Replace tokens in `src/app.css` with `tokens.css`, add the Google Fonts link to `index.html`.
2. `Shell.svelte` — top bar, nav, footer.
3. `Dashboard.svelte` — hero, path list, stats column, heatmap thumbnail.
4. `Card.svelte`, `HandView.svelte`, `Table.svelte`, `ChipStack.svelte` — the felt and play loop.
5. `Review.svelte`, `CellDrill.svelte` — the review ledger.
6. `Chart.svelte`, `Progress.svelte` — the strategy grid and heatmap colours.
7. `Counting.svelte`, `Flashcards.svelte`, `Integration.svelte`, `Settings.svelte` — mostly inherit; sweep for leftover raw colours, pill buttons and card-with-shadow patterns.
8. Run `npm test` (must stay green), `npm run build`, then the acceptance checklist in `DESIGN-SPEC.md`.

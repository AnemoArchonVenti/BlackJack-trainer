# Blackjack Trainer — Specification

**Status:** Design locked (via grilling, 2026-09-09). Ready to scaffold.
**Source of truth for strategy/counting/deviation numbers:** `research/blackjack-trainer-research.md`. Every chart, index, and tag value below traces to a cited source there — do not hand-edit numbers; fix them in research first.

---

## 1. Product summary

A web app that trains three blackjack skills, in order: **(1) basic strategy → (2) Hi-Lo card counting → (3) playing deviations (index plays)**. The user plays full single-spot rounds against a dealer, gets an end-of-round review explaining each decision, and is guided along a recommended path while free to practice anything. Progress is tracked per-cell with Leitner buckets and an accuracy heatmap.

**Ruleset (fixed):** 6 decks, dealer **stands** on soft 17 (S17), double after split (DAS) allowed, late surrender allowed. This is the only ruleset exposed in the UI; the engine is built rules-aware so other rulesets can be added once their data is sourced.

**Non-goals (v1):** multi-spot casino tables, other players, H17/rule toggles, user accounts, backend/cloud sync, EV-number explanations, real-money anything.

---

## 2. Locked decisions (from grilling)

| # | Decision | Choice |
|---|---|---|
| 1 | Core surface | Single-spot table, full rounds played out |
| 2 | Feedback timing | End-of-round review (play freely, then graded recap) |
| 3 | Explanations | Heuristic "why" per decision |
| 4 | Money | Bankroll + flat bets now; variable betting with counting |
| 5 | Progression | Guided but skippable |
| 6 | Counting | Isolated drills first, then in-table integration |
| 7 | Deviations | Full Illustrious 18 + Fab 4, SRS flashcards + integration |
| 8 | Progress engine | Leitner buckets + accuracy heatmap (SM-2 swappable) |
| 9 | Stack | Vite + Svelte, no backend |
| 10 | Rules | Fixed S17; engine rules-aware, only S17 exposed |
| — | Persistence | Browser localStorage |
| — | Build order | strategy table → counting → deviations → integration |

---

## 3. Architecture

Four decoupled layers (mirrors research §5). Pure logic is framework-free; Svelte only handles UI.

```
src/
  engine/
    charts.js        # S17 hard/soft/pair tables + deviation indices (data only)
    strategy.js      # getCorrectAction(hand, upcard, rules) -> action  [PURE, from prototype]
    deviations.js    # getDeviation(hand, upcard, trueCount, rules) -> action | null
    reasons.js       # explain(hand, upcard, action) -> heuristic string  [~15-20 templates]
    shoe.js          # seedable shoe: deal, dealer-play, running/true count  [PURE]
    hand.js          # hand value, isSoft, isPair, legal moves
  srs/
    leitner.js       # buckets New/Learning/Review/Mastered; grade(cellId, correct)
    progress.js      # per-cell accuracy stats; heatmap data; mastery gates
    store.js         # localStorage load/save (single JSON blob)
  modes/             # Svelte components, one per practice mode (§5)
  lib/               # shared Svelte UI (Card, HandView, ChipStack, ...)
  routes/            # app shell, nav, guided-path vs free-menu
```

**Rule:** `engine/` and `srs/` have zero Svelte imports and are unit-testable in Node (the prototype's self-check style). The strategy engine is the single grading oracle for every mode.

### Core data types
```
Card    = { rank: 2..10|'A', value: 2..11 }     // 10/J/Q/K all value 10
Hand    = Card[]                                  // player or dealer
Action  = 'H'|'S'|'D'|'P'|'R'                     // hit/stand/double/split/surrender
Rules   = { decks:6, h17:false, das:true, surrender:true }   // fixed v1
Round   = { bet, playerHands:Hand[], dealer:Hand, decisions:Decision[], outcome }
Decision= { hand, upcard, chosen:Action, correct:Action, trueCount, wasDeviation }
```

---

## 4. Engine specifications

### 4.1 Strategy (`getCorrectAction`) — already built & verified in prototype
- Base tables: S17 4–8 deck hard/soft/pairs grid (research §1a), keyed `(handType, total|pairRank, upcard) -> Action`.
- Signature `getCorrectAction(hand, upcard, rules)`; pure. Order of checks: pair → soft → hard (reduce aces).
- `Ds` (double-else-stand) and `Rh` (surrender-else-hit) collapse to `D`/`R` for grading a button press but are preserved in the table for reason text.
- Rules-aware: applies ordered delta-override lists (H17 / NDAS / no-surrender) over the base table. v1 passes fixed S17 rules so no deltas apply.
- **Acceptance:** the 11 prototype spot-checks pass, plus a full 10×(hard+soft+pair) sweep matches the research chart cell-for-cell.

### 4.2 Deviations (`getDeviation`)
- Table = Illustrious 18 + Fab 4 with Hi-Lo true-count indices (research §3a/§3b).
- `getDeviation(hand, upcard, trueCount, rules)` returns the deviated action when `trueCount` crosses the index (direction per entry — most "≥ index", negative-index stands "≥ index else hit"), else `null`. Caller falls back to `getCorrectAction`.
- **S17-only guard:** deviation table is tagged S17; if `rules.h17` is ever true, deviations are disabled with a "not yet sourced" notice (research §3c warns against inventing H17 indices).

### 4.3 Shoe (`shoe.js`)
- 6-deck shoe, configurable penetration (default ~4.5/6 decks), seedable RNG for reproducible drills/tests.
- Deals player + dealer; dealer plays out S17. Exposes ground-truth **running count** (Hi-Lo tags: 2–6=+1, 7–9=0, 10–A=−1) and **true count** = RC / decks-remaining, so counting modes grade against truth (research §2a).
- Pure/deterministic given a seed.

### 4.4 Reasons (`reasons.js`)
- `explain(hand, upcard, action)` → one heuristic sentence. ~15–20 templates keyed by situation family: dealer bust-card (2–6) vs pat-card (7–A), player stiff (12–16), soft-double range, always/never-split pairs, surrender spots.
- Authored content, not generated. Each template cites the intuition, not EV. (Content task — write during strategy-mode build.)

---

## 5. Practice modes

Build in this order. Each mode reuses the engine + SRS; none duplicates strategy logic.

1. **Strategy play-table (FIRST / MVP).** Single spot, bankroll + flat bet. Deal → player plays full round (all legal moves incl. split/double/surrender) → dealer plays out → settle bankroll. **End-of-round review** lists each decision with ✓/✗, the correct action, and the heuristic "why." Wrong cells feed Leitner + heatmap.
2. **Counting drills (isolated).** (a) Tag-speed: flash one card, call +1/0/−1. (b) Deck countdown: stream a full deck, end on correct RC, timed — target <30s, pass = 5 clean runs (research §2d). (c) True-count conversion: given RC + decks remaining, compute TC.
3. **Deviation flashcards.** Hand + upcard + **given** true count → correct action. Full I18 + Fab 4, driven by SRS (surfaces missed indices). Isolates "know the index" from "keep the count."
4. **Integration table.** Strategy play-table + you keep the count yourself + variable bet-sizing by TC + deviations expected. End-of-shoe grade: count accuracy, bet sizing, play, deviations; missed items flow back into SRS.

---

## 6. Progression & SRS

- **Leitner:** every strategy cell + every deviation is a card in bucket New→Learning→Review→Mastered. Correct → promote; miss → back to box 1. Sessions pull due + recently-missed first.
- **Heatmap:** per-cell accuracy grid (the strategy chart, colored by hit rate) so the user sees weak spots.
- **Mastery gates (guide, don't lock — Q5=C):**
  - Strategy: ≥99% over last ~50 decisions AND no cell left in Learning → suggests unlocking counting.
  - Counting: deck countdown <30s (goal 25s), 5 clean runs in a row.
  - Deviations: gated behind passed strategy + counting.
- Gates surface as "recommended next" on the guided path; a free menu ignores them.

---

## 7. Persistence

Single JSON blob in `localStorage`: SRS buckets, per-cell stats, bankroll, settings, gate progress. Load on boot, save after each round/drill. Wrapped in try/catch — app works with empty/blocked storage. No backend, no accounts in v1.

---

## 8. Testing

- `engine/` and `srs/` covered by Node assert-style checks (extend the prototype's self-check): strategy full-chart sweep, deviation threshold cases, shoe count invariants (balanced deck sums to 0), Leitner promote/demote.
- No UI test framework in v1.

---

## 9. Open items / carried caveats

1. **H17 index set not sourced** — blocks any H17 rules toggle. Do not invent (research §3c).
2. ~~**Blackjack Apprenticeship drill numbers** (30s countdown, 5-clean-runs) — re-verify against the live page when building counting mode (fetch was 403).~~ **Resolved 2026-09-17 (#6):** BJA still 403s to automated fetches; the numbers were re-verified against corroborating practice literature and hold (30s target / 25s stretch / 5 clean runs). See research §2d "Re-verification".
3. **Heuristic "why" templates** — ~15–20 to author during strategy-mode build (§4.4).
4. **Advanced counting systems** (KO easy-mode, Wong Halves) — out of v1 scope; Hi-Lo only.

---

## 10. First deliverable

Scaffold Vite + Svelte; port the prototype's `getCorrectAction` + chart tables into `engine/`; ship **Mode 1 (strategy play-table)** end to end — full rounds, bankroll, end-of-round review with heuristics, Leitner + heatmap wired. Everything else layers on that.

# Blackjack Trainer — Research Findings

**Purpose:** Design basis for a web app that trains three skills: (1) basic strategy, (2) Hi‑Lo card counting, (3) playing deviations (index plays).
**Compiled:** 2026-09-08
**Method:** WebSearch + WebFetch against authoritative primary sources, prioritizing Wizard of Odds, Blackjack Apprenticeship, QFIT/Wattenberger, and the standard reference works (Wong, Schlesinger, Thorp).

> **Scope note / disclaimer for the app:** Card counting is legal but casinos may bar advantage players. This document is educational. All strategy is math derived from published, verifiable sources; every numeric claim below carries its source URL.

---

## Primary sources used

- Wizard of Odds — Basic strategy (4-deck, S17): <https://wizardofodds.com/games/blackjack/strategy/4-decks/>
- Wizard of Odds — Basic strategy (8-deck): <https://wizardofodds.com/games/blackjack/strategy/8-decks/>
- Wizard of Odds — Basics / strategy hub: <https://wizardofodds.com/games/blackjack/basics/>
- Wizard of Odds — Hi‑Lo card counting (Illustrious 18 + Fab 4 tables): <https://wizardofodds.com/games/blackjack/card-counting/high-low/>
- Wizard of Odds — Card counting introduction: <https://wizardofodds.com/games/blackjack/card-counting/introduction/>
- Wizard of Odds — Play/trainer: <https://wizardofodds.com/play/blackjack-v2/>
- QFIT / Norm Wattenberger — Card counting systems comparison: <https://www.qfit.com/card-counting.htm>
- Blackjack Apprenticeship — Hi‑Lo guide: <https://www.blackjackapprenticeship.com/hi%E2%80%91lo-system-guide-for-card-counting-blackjack/> (blocks automated fetch; content corroborated via search snippets and secondary pages)
- Blackjack Apprenticeship — How to practice / drills: <https://www.blackjackapprenticeship.com/how-to-practice-blackjack/>, <https://www.blackjackapprenticeship.com/blackjack-training-drills/>
- SM‑2 spaced-repetition algorithm (SuperMemo, P.A. Wozniak, primary write-up): <https://super-memory.com/english/ol/sm2.htm>
- H17 vs S17 secondary references (cross-checked): <https://blackjack3000.com/guides/h17-vs-s17>, <https://www.blackjackapprenticeship.com/why-the-differences-in-basic-strategy/>
- Drill methodology secondary: <https://thecardcounting.com/blog/how-to-practice-card-counting>

**Reference works (origin/attribution, not fetched):** Edward Thorp, *Beat the Dealer* (1962/66) — origin of card counting; Stanford Wong, *Professional Blackjack* — Hi‑Lo + Wong Halves; Don Schlesinger, *Blackjack Attack* — origin of the **Illustrious 18** and **Fab 4** and the index numbers reproduced below.

---

## 1. BASIC STRATEGY

### 1a. Canonical chart — 4–8 decks, dealer STANDS on soft 17 (S17), DAS, late surrender allowed

Source (text rules reproduced verbatim in effect): <https://wizardofodds.com/games/blackjack/strategy/4-decks/>. Note: on that page the color grid is an image; the following rule set is the page's own text-form strategy and is complete enough to build a lookup table.

Actions: **H** = hit, **S** = stand, **D** = double (else hit), **Ds** = double (else stand), **P** = split, **Rh** = surrender (else hit). Dealer upcard columns: 2 3 4 5 6 7 8 9 10 A.

**Hard totals**
| Total | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | A |
|---|---|---|---|---|---|---|---|---|---|---|
| 5–8 | H | H | H | H | H | H | H | H | H | H |
| 9 | H | D | D | D | D | H | H | H | H | H |
| 10 | D | D | D | D | D | D | D | D | H | H |
| 11 | D | D | D | D | D | D | D | D | D | H |
| 12 | H | H | S | S | S | H | H | H | H | H |
| 13 | S | S | S | S | S | H | H | H | H | H |
| 14 | S | S | S | S | S | H | H | H | H | H |
| 15 | S | S | S | S | S | H | H | H | Rh | H |
| 16 | S | S | S | S | S | H | H | Rh | Rh | Rh |
| 17+ | S | S | S | S | S | S | S | S | S | S |

Derivation of the hard rules from the page text: "Hit all hard 11 or less; hard 12 stand vs 4–6 else hit; hard 13–16 stand vs 2–6 else hit; stand hard 17+." Doubling: "double hard 9 vs 3–6; hard 10 except vs 10/A; hard 11 except vs A." Surrender: "surrender hard 16 (except 8‑8) vs 9/10/A, and hard 15 vs 10." (Source: 4-decks page.)

**Soft totals** (A counted as 11)
| Hand | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | A |
|---|---|---|---|---|---|---|---|---|---|---|
| A,2 (13) | H | H | H | D | D | H | H | H | H | H |
| A,3 (14) | H | H | H | D | D | H | H | H | H | H |
| A,4 (15) | H | H | D | D | D | H | H | H | H | H |
| A,5 (16) | H | H | D | D | D | H | H | H | H | H |
| A,6 (17) | H | D | D | D | D | H | H | H | H | H |
| A,7 (18) | Ds | Ds | Ds | Ds | Ds | S | S | H | H | H |
| A,8 (19) | S | S | S | S | S | S | S | S | S | S |
| A,9 (20) | S | S | S | S | S | S | S | S | S | S |

Derivation from page text: "Hit all soft 17 or less; soft 18 stand except hit vs 9/10/A; stand soft 19+. Double soft 13–14 vs 5–6; soft 15–16 vs 4–6; soft 17–18 vs 3–6." (Soft‑18 doubles are "double else stand" = Ds.) (Source: 4-decks page.)

**Pairs** (DAS = double-after-split allowed)
| Pair | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | A |
|---|---|---|---|---|---|---|---|---|---|---|
| 2,2 | P | P | P | P | P | P | H | H | H | H |
| 3,3 | P | P | P | P | P | P | H | H | H | H |
| 4,4 | H | H | H | P | P | H | H | H | H | H |
| 5,5 | D | D | D | D | D | D | D | D | H | H |
| 6,6 | P | P | P | P | P | H | H | H | H | H |
| 7,7 | P | P | P | P | P | P | H | H | H | H |
| 8,8 | P | P | P | P | P | P | P | P | P | P* |
| 9,9 | P | P | P | P | P | S | P | P | S | S |
| 10,10 | S | S | S | S | S | S | S | S | S | S |
| A,A | P | P | P | P | P | P | P | P | P | P |

Derivation: "Always split aces and 8s; never split 5s and 10s; split 2s/3s vs 4–7 (or 2–3 with DAS); split 4s only with DAS vs 5–6; split 6s vs 3–6 (or 2–6 with DAS); split 7s vs 2–7; split 9s vs 2–6 or 8–9." (Source: 4-decks page.) *8,8 vs A: split under S17; **surrenders under H17** (see 1b).

### 1b. Dealer HITS soft 17 (H17) — cell changes vs the S17 chart

H17 raises the house edge by ~0.20–0.22% and shifts a small set of cells toward more aggressive doubling/surrender, mostly vs the dealer Ace (H17 makes the dealer's soft hands more dangerous). Canonical multi-deck changes:

| Hand | Dealer | S17 | H17 | Note |
|---|---|---|---|---|
| Hard 11 | A | H | **D** | Confirmed on Wizard 8-deck page footnote ("if the dealer hits a soft 17 the player should double on 11 against an ace") — <https://wizardofodds.com/games/blackjack/strategy/8-decks/> |
| A,7 (soft 18) | 2 | S | **Ds** | <https://blackjack3000.com/guides/h17-vs-s17> |
| A,8 (soft 19) | 6 | S | **Ds** | <https://blackjack3000.com/guides/h17-vs-s17> |
| Hard 15 | A | H | **Rh (surrender)** | <https://blackjack3000.com/guides/h17-vs-s17> |
| Hard 17 | A | S | **Rh (surrender)** | <https://blackjack3000.com/guides/h17-vs-s17> |
| 8,8 | A | P | **Rh (surrender)** | <https://blackjack3000.com/guides/h17-vs-s17> |

**Disagreement/uncertainty flag:** blackjack3000.com additionally lists **A,6 (soft 17) vs 2: Hit → Double** under H17. This is *not* in the Wizard's core multi-deck H17 footnote set and some published H17 charts omit it; treat it as an optional/edge cell and prefer the six changes above. The Wizard's own H17 note only explicitly calls out the 11-vs-A double on the multi-deck page (surrender-related H17 exceptions are documented but not quoted in the fetched excerpt). Cost figure "~0.2%" from <https://blackjack3000.com/guides/h17-vs-s17>; corroborated as "~0.22%" by search snippet.

### 1c. How the four main rule levers move cells (for a rules-driven engine)

- **H17 vs S17:** the six/seven cell changes in 1b (source above).
- **DAS vs NDAS (no double after split):** with DAS you split more; without DAS, 2,2/3,3 vs 2–3 revert to Hit, 4,4 vs 5–6 reverts to Hit, 6,6 vs 2 reverts to Hit. (Source: 4-decks page rule text, which states the "(or 2–3 if DAS)" and "only with DAS" conditionals.)
- **Surrender allowed vs not:** removes the Rh cells (15 vs 10; 16 vs 9/10/A; plus the H17 surrenders); those revert to Hit. (Source: 4-decks page, surrender section.)
- **Number of decks:** 4–8 decks share one chart; single- and double-deck have composition-dependent exceptions (e.g., Wizard's single-deck/double-deck exception appendices). For a shoe trainer, the 4–8 deck chart is the canonical target. (Source: <https://wizardofodds.com/games/blackjack/basics/> lists the deck-specific exception pages.)

**Data model recommendation:** store the S17/4–8-deck grid as the base lookup table keyed by (handType, playerTotal|pairRank, dealerUpcard) → action, then apply a small ordered list of rule-delta overrides (H17 set, NDAS set, no-surrender set) at load time. This keeps one source of truth plus ~15 override cells rather than many full charts.

---

## 2. CARD COUNTING

### 2a. Hi‑Lo mechanics (the recommended system)

**Card tags** (balanced, level‑1): 2,3,4,5,6 = **+1**; 7,8,9 = **0**; 10,J,Q,K,A = **−1**.
Source: <https://wizardofodds.com/games/blackjack/card-counting/high-low/> and <https://www.qfit.com/card-counting.htm>.

**Running count (RC):** start at 0 at a fresh shoe; add each card's tag as it's exposed. Because Hi‑Lo is *balanced*, a full deck/shoe sums to exactly 0 — the basis of the countdown self-check drill.

**True count (TC):** `TC = RC / decks_remaining` (decks remaining estimated from the discard tray). The true count normalizes the running count for how many cards are left; a +8 running count is a big edge with 1 deck left but weak with 6 decks left. All betting and deviation decisions use **true**, not running, count. Source: <https://wizardofodds.com/games/blackjack/card-counting/high-low/> ("Divide the running count by estimated decks remaining… a rough estimate will do").

**Betting:** each +1 of true count is worth roughly +0.5% to the player; bet more as TC rises, table minimum when TC ≤ +1. A common Hi‑Lo benchmark: 6-deck shoe, 4.5-deck penetration, 1–15 spread ≈ **+1.15% player advantage**. Source: <https://wizardofodds.com/games/blackjack/card-counting/high-low/>.

**Hi‑Lo quality metrics** (QFIT): Betting Correlation **.97**, Playing Efficiency **.51**, Insurance Correlation **.76**. Source: <https://www.qfit.com/card-counting.htm>.

### 2b. System comparison (QFIT / Wattenberger)

| System | Level | Balanced? | Tags (2‑3‑4‑5‑6‑7‑8‑9‑10‑A) | BC | PE | IC |
|---|---|---|---|---|---|---|
| **Hi‑Lo** | 1 | Balanced | +1 +1 +1 +1 +1 · 0 · 0 · 0 · −1 · −1 | .97 | .51 | .76 |
| **KO (Knock‑Out)** | 1 | **Unbalanced** | +1 +1 +1 +1 +1 · **+1** · 0 · 0 · −1 · −1 | .98 | .55 | .78 |
| **Red 7** | 1 | Unbalanced | like Hi‑Lo but red 7 = +1 | .98 | .54 | .78 |
| **Omega II** | 2 | Balanced | +1 +1 +2 +2 +2 · +1 · 0 · −1 · −2 · **0** | .92 | .67 | .85 |
| **Zen** | 2 | Balanced | +1 +1 +2 +2 +2 · +1 · 0 · 0 · −2 · −1 | .96 | .63 | .85 |
| **Wong Halves** | 3 | Balanced | +.5 +1 +1 +1.5 +1 · +.5 · 0 · −.5 · −1 · −1 | .99 | .56 | .72 |
| **Hi‑Opt I** | 1 | Balanced | 0 +1 +1 +1 +1 · 0 · 0 · 0 · −1 · 0 | .88 | .61 | .85 |

Metrics from <https://www.qfit.com/card-counting.htm>. (Note: the Omega II / Wong Halves tag rows above are the well-established canonical values; the QFIT fetch returned slightly garbled fractional tags, so canonical published values are shown. BC/PE/IC figures are QFIT's.)

Reading the numbers: **Betting Correlation (BC)** predicts how well the count sizes bets (drives ~most of the profit in shoe games); **Playing Efficiency (PE)** predicts how well it makes playing-decision deviations; **Insurance Correlation (IC)** predicts the insurance decision. Unbalanced counts (KO, Red 7) skip the RC→TC division — you bet/deviate off the running count against a shifted "key count" / "pivot" — which is easier but slightly less precise for deviations. Higher-level counts (Omega II, Wong Halves) buy PE/BC at the cost of harder arithmetic (multi-level tags, fractions, sometimes an ace side count).

### 2c. Recommendation for a beginner-friendly trainer: **Hi‑Lo**

- It is the documented "gold standard," the most widely taught, and the system all the standard deviation tables (Illustrious 18 / Fab 4) are published for — so counting, betting, and deviations all share one framework. Source: <https://www.blackjackapprenticeship.com/hi%E2%80%91lo-system-guide-for-card-counting-blackjack/>.
- BC .97 captures nearly all the betting edge; only +1 tag level (no fractions) → fast, low error. Sources: QFIT table above.
- Offer **KO as an optional "easier" mode** (unbalanced, no true-count division) for absolute beginners, and Wong Halves/Omega II as "advanced" modes — but default to Hi‑Lo so the deviation curriculum lines up.

### 2d. How to drill counting (build into the app)

Progression, per Blackjack Apprenticeship / practice literature:
1. **Tag recognition (single-card speed):** flash one card, user calls its tag (+1/0/−1) instantly. Cancel pairs (a +1 and a −1 seen together = 0). Source: <https://www.blackjackapprenticeship.com/how-to-practice-blackjack/>.
2. **Deck countdown (the key benchmark):** count a full 52-card deck one at a time and end on the correct value (0 for a balanced count). **Target: under 30 seconds, 25s is the stretch goal.** Source (BJA target): <https://www.blackjackapprenticeship.com/hi%E2%80%91lo-system-guide-for-card-counting-blackjack/>. A commonly cited pass mark is doing it cleanly **5 times in a row** before advancing (attribution: <https://thecardcounting.com/blog/how-to-practice-card-counting>).
3. **Multi-card / pairs & triples:** flip cards in twos and threes to mimic how hands hit the felt. Source: BJA how-to-practice.
4. **True-count conversion drill:** given RC and a discard-tray/decks-remaining estimate, compute TC quickly.
5. **Distraction drills:** loud music with lyrics, a person asking questions you must answer mid-deck, and interruption-recovery (pause, do something else, resume). Source: BJA / thecardcounting.com.
6. **Full-shoe / bet-and-play integration:** count a dealt shoe, size bets by TC, and make correct playing decisions simultaneously.

**Balanced vs unbalanced for drilling:** balanced (Hi‑Lo) gives a free self-check — a correctly counted full deck/shoe returns to 0 — which is pedagogically valuable, so the countdown drill should assume a balanced count.

---

## 3. DEVIATIONS (Index Plays)

Origin: Don Schlesinger, *Blackjack Attack* — the **Illustrious 18** (the 18 most valuable index plays) and the **Fab 4** (the four most valuable late-surrender indices). Knowing roughly the top ~18–22 indices captures **80–85%** of the total gain available from all play deviations. Source: <https://wizardofodds.com/games/blackjack/card-counting/high-low/>.

**How to read an index:** the number is a **true count** threshold. For most entries, take the deviation when TC ≥ index; act on basic strategy otherwise. Some indices are ≤ 0, meaning the deviation applies at neutral/negative counts (e.g., you *hit* a stiff that basic strategy stands, when the count is low). Insurance is a pure count bet: take it at TC ≥ +3.

### 3a. Illustrious 18 (Hi‑Lo, multi-deck)

Source: <https://wizardofodds.com/games/blackjack/card-counting/high-low/>. "Vs." = dealer upcard. Default action is: **at or above the index, deviate**; below it, play basic strategy (except the negative-index stands, where at/above the index you still stand and below it you hit).

| # | Play | Index | Deviation (at/above index) |
|---|---|---|---|
| 1 | Insurance | **+3** | Take insurance |
| 2 | 16 vs 10 | **0** | Stand (below 0: hit) |
| 3 | 15 vs 10 | **+4** | Stand (else hit) |
| 4 | 10,10 vs 5 | **+5** | Split tens (else stand) |
| 5 | 10,10 vs 6 | **+4** | Split tens (else stand) |
| 6 | 10 vs 10 (hard) | **+4** | Stand (else hit) |
| 7 | 12 vs 3 | **+2** | Stand (else hit) |
| 8 | 12 vs 2 | **+3** | Stand (else hit) |
| 9 | 11 vs A | **+1** | Double (else hit) |
| 10 | 9 vs 2 | **+1** | Double (else hit) |
| 11 | 10 vs A | **+4** | Double (else hit) |
| 12 | 9 vs 7 | **+3** | Double (else hit) |
| 13 | 16 vs 9 | **+5** | Stand (else hit) |
| 14 | 13 vs 2 | **−1** | Stand at/above −1; hit below |
| 15 | 12 vs 4 | **0** | Stand at/above 0; hit below |
| 16 | 12 vs 5 | **−2** | Stand at/above −2; hit below |
| 17 | 12 vs 6 | **−1** | Stand at/above −1; hit below |
| 18 | 13 vs 3 | **−2** | Stand at/above −2; hit below |

*(Entry #6 "10 vs 10" is the hard-total 10 vs dealer 10 double decision in the Wizard's ordering; some editions list "20 vs 5/6" i.e. splitting tens as the two ten-split entries — both are represented above as #4/#5. Ordering here follows the Wizard page, which matches Schlesinger's ranking.)*

### 3b. Fab 4 — late-surrender indices (Hi‑Lo)

Source: <https://wizardofodds.com/games/blackjack/card-counting/high-low/>. Surrender at/above the index.

| # | Play | Index | Action |
|---|---|---|---|
| 1 | 14 vs 10 | **+3** | Surrender at/above +3 |
| 2 | 15 vs 10 | **0** | Surrender at/above 0 |
| 3 | 15 vs 9 | **+2** | Surrender at/above +2 |
| 4 | 15 vs A | **+1** | Surrender at/above +1 |

### 3c. S17 vs H17 caveat for indices (important)

The Wizard page **does not specify** whether its published indices are for S17 or H17. These indices are Schlesinger's, derived for **multi-deck S17**. Under **H17** several vs-Ace situations change because H17 alters basic strategy itself: e.g., **11 vs A** and **15 vs A** become (near-)basic-strategy plays under H17, so their indices shift toward 0/negative or drop out; insurance and the count-neutral stiffs (12–16 vs low cards) are essentially unchanged. **Do not invent H17 index numbers** — for an H17 trainer, source an H17-specific index set (Blackjack Apprenticeship and *Blackjack Attack* publish rule-specific charts). Source for the "unspecified" flag: <https://wizardofodds.com/games/blackjack/card-counting/high-low/>; H17-shift reasoning corroborated by <https://blackjack3000.com/guides/h17-vs-s17> ("several Illustrious 18 deviations change their index numbers under H17").

**App recommendation:** ship the S17 index set above as the verified default; gate an H17 index set behind a "rules" toggle and label it clearly, sourced separately.

---

## 4. TRAINING-APP DESIGN (pedagogy)

### 4a. Spaced repetition — SM‑2 (Anki-style), primary algorithm

Source: <https://super-memory.com/english/ol/sm2.htm> (SuperMemo, P.A. Wozniak — the canonical SM‑2 spec Anki is derived from).

- **Quality grade q (0–5):** 5 perfect; 4 correct after hesitation; 3 correct with serious difficulty; 2 incorrect but answer felt easy; 1 incorrect, answer remembered; 0 complete blackout.
- **Intervals (days):** `I(1)=1`, `I(2)=6`, `I(n)=I(n−1)·EF` for n>2.
- **Ease factor update:** `EF' = EF + (0.1 − (5−q)·(0.08 + (5−q)·0.02))`, floored at **1.3** (start EF = 2.5).
- **Failure protocol:** if `q < 3`, restart the item's repetition count (back to I(1)) but keep its EF unchanged.

**Fit to blackjack:** treat each hard-total/soft-total/pair/deviation *cell* as an SRS "card." A wrong strategy answer = q<3 (resets that cell to short interval); a fast correct answer = q5, a slow-but-correct = q3–4. This automatically re-surfaces the cells a given user actually gets wrong (e.g., 16 vs 10, soft doubles) far more often than the trivial ones (17+ stand). This is the highest-leverage layer for basic strategy and deviation mastery.

### 4b. Leitner boxes — a simpler alternative/complement

The Leitner system (physical-box SRS) is the low-complexity version: cards move up a box on a correct answer (reviewed less often) and drop to box 1 on a miss (reviewed every session). Good for a "beginner mode" or for grouping cells into buckets (New / Learning / Review / Mastered) without per-card EF math. Recommended as the visible progress metaphor even if SM‑2 runs underneath.

### 4c. Feedback timing and mastery thresholds

- **Immediate feedback** for skill acquisition: the Wizard trainer warns you *the moment* you make an inferior play and shows the correct action; the Wizard explicitly advises practicing "until you very rarely are warned." Source: <https://wizardofodds.com/play/blackjack-v2/>. Immediate correction is the right default for a strategy drill (short answer, deterministic correct move).
- **Delayed feedback** is more appropriate for the counting-integration mode (don't interrupt a live count/hand; grade the RC/TC and decisions at end of shoe), mirroring how CVBJ/Casino Vérité checks your count on demand or at shoe end.
- **Mastery thresholds** (concrete, buildable):
  - Basic strategy: e.g., ≥ 99% correct over the last N (say 50–100) decisions in a mode, and no cell still in the "Learning" SRS bucket, before unlocking counting.
  - Counting: deck countdown ending on the correct value in **< 30s (goal 25s)**, **5 clean runs in a row** (BJA benchmark + common pass mark; see §2d sources).
  - Deviations: layered on top of a passed basic-strategy + counting gate.

### 4d. Drill types used by proven tools (to mirror)

- **Casino Vérité Blackjack (CVBJ / QFIT):** the professional standard — realistic dealt table with configurable rules, on-demand "what's the count?" checks, deviation drills, bet-sizing drills, and heatmap-style error tracking. Source context: QFIT / <https://www.qfit.com/card-counting.htm> and BJA's "Top CVBJ drills."
- **Blackjack Apprenticeship drills:** strategy drills, counting drills, deviation drills, bankroll/betting drills, plus the distraction/interruption drills in §2d. Source: <https://www.blackjackapprenticeship.com/blackjack-training-drills/>.
- **Wizard of Odds trainer:** live play with instant inferior-play warnings and an "analyze" combinatorial-odds view. Source: <https://wizardofodds.com/play/blackjack-v2/>.

**The drill loop that actually builds the three skills:**
Isolate → drill to speed → integrate. (1) Basic strategy first, to reflex, via SRS flashcards + a warn-on-error dealt game. (2) Counting in isolation: tag speed → deck countdown to time → true-count conversion. (3) Deviations as SRS cards once 1 and 2 are gated. (4) Full integration: dealt shoe where the app silently tracks the true count and grades bet sizing + basic play + correct deviations, giving end-of-shoe feedback plus flagging the specific missed cells back into the SRS queue.

---

## 5. RECOMMENDED BUILD APPROACH (web app)

Practical structure — four decoupled layers:

**1. Strategy engine = pure data + a lookup function.**
- Store the S17/4–8-deck grid (§1a) as three tables (hard, soft, pairs) mapping (total|pairRank, dealerUpcard) → action code.
- Store rule deltas as small override lists (H17 set §1b, NDAS set, no-surrender set) applied over the base per selected rules. One source of truth, no duplicated charts.
- `getCorrectAction(hand, dealerUpcard, rules)` → action. This same function grades every strategy drill answer. Keep it pure/unit-testable and validate it against the Wizard chart (and optionally the Wizard "analyze"/combinatorial figures) as a test oracle.
- Deviations layer: `getDeviation(hand, dealerUpcard, trueCount, ruleset)` consults the Illustrious 18 / Fab 4 index table (§3) and overrides the basic action when the TC threshold is met; falls back to `getCorrectAction` otherwise.

**2. Deal simulator.**
- A shoe model (configurable decks, penetration, RNG shuffle), dealer play per S17/H17, splits/doubles/surrender, and a running Hi‑Lo count computed server-agnostically (client-side is fine). Expose RC, decks-remaining estimate, and TC so the counting/integration modes can grade against ground truth. Keep the sim deterministic-seedable for reproducible drills and tests.

**3. Drill modes (share the engine + sim).**
- Strategy flashcards (single hand vs upcard, instant grade).
- Warn-on-error dealt game (Wizard-style).
- Counting: tag-speed flashcards, timed deck countdown (with the balanced self-check), true-count conversion.
- Deviation flashcards (hand + upcard + given TC).
- Full integration shoe (bet sizing + play + deviations, end-of-shoe grade).

**4. Feedback / SRS layer.**
- Implement SM‑2 (§4a) over a card set = every strategy cell + every deviation index (+ optional counting-subskill items). Map answer correctness/speed → q, schedule reviews, weight each session toward due + recently-missed cells.
- Surface progress as Leitner-style buckets (New/Learning/Review/Mastered) and a per-cell error heatmap (mirrors CVBJ).
- Enforce the mastery gates in §4c to unlock counting → deviations → integration.

**Tech notes:** everything above is pure client-side computation (no server needed for the math); persist SRS state and progress in localStorage/IndexedDB (optionally sync to an account). Charts, indices, and rule deltas belong in JSON/TS data files, not code branches, so they're auditable against the cited sources and easy to extend (add H17 index set, other counts).

---

## Key disagreements / caveats to carry into the build

1. **H17 A,6-vs-2 double:** listed by blackjack3000.com but not in the Wizard's core multi-deck H17 set; treat as optional and prefer the six confirmed changes (§1b).
2. **Illustrious 18 S17 vs H17 indices:** Wizard doesn't state which ruleset; they are Schlesinger's S17 numbers. Don't reuse them unchanged for an H17 game — source an H17 set separately (§3c).
3. **Counting-system tag values from QFIT fetch** came back partly garbled for Omega II / Wong Halves; §2b shows the canonical published tags with QFIT's BC/PE/IC metrics. Verify tag tables against a clean copy of the QFIT page or *Blackjack Attack* before hardcoding advanced counts.
4. **Blackjack Apprenticeship pages block automated fetch (HTTP 403);** their specific numbers here (Hi‑Lo tags, 30s/25s countdown target) are corroborated by search snippets and secondary pages, but confirm against the live BJA page when building the counting curriculum.

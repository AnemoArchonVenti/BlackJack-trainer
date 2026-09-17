// The single grading oracle (SPEC §4.1). Pure. Check order: pair -> soft -> hard (research §1a).
import { HARD, SOFT, PAIR, DELTAS } from './charts.js';
import { value, isSoft, isPair } from './hand.js';

const col = (upcard) => (upcard.value === 11 ? 9 : upcard.value - 2); // A -> last column, 10 -> 8

// Resolve the base cell as { type, key, action } before rule deltas are applied.
function base(hand, i) {
  if (isPair(hand)) {
    const v = hand[0].value;
    return { type: 'pair', key: v, action: PAIR[v][i] };
  }
  if (isSoft(hand)) {
    const nonAce = value(hand) - 11; // soft total minus the ace-as-11
    if (nonAce >= 2 && nonAce <= 9) return { type: 'soft', key: nonAce, action: SOFT[nonAce][i] };
    // soft 20/21 (e.g. A,A,9) falls through to the hard stand logic below
  }
  const total = value(hand);
  const k = Math.min(17, Math.max(8, total)); // 17..21 share a row; <8 can't occur non-pair but clamp anyway
  return { type: 'hard', key: total, action: HARD[k][i] };
}

/**
 * getCorrectAction(hand, upcard, rules) -> raw action code ('H'|'S'|'D'|'Ds'|'P'|'Rh').
 * Ds/Rh are preserved for reason text; use forGrading() to collapse them to D/R for a button press.
 * rules: { h17, das, surrender, ... } — v1 fixed S17 so no deltas apply.
 */
export function getCorrectAction(hand, upcard, rules = {}) {
  const i = col(upcard);
  const { type, key, action } = base(hand, i);
  for (const d of DELTAS) {
    if (rules[d.rule] && d.type === type && d.key === key && d.up === upcard.value) return d.action;
  }
  return action;
}

/** Collapse double-else-* and surrender-else-* to the button the player actually presses. */
export function forGrading(action) {
  return action === 'Ds' ? 'D' : action === 'Rh' ? 'R' : action;
}

// ── Cell identity (#5): the heatmap / SRS key for a situation ─────────────────────────────
/** Dealer upcard values in column order (11 = Ace). */
export const UPCARDS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

/**
 * The chart cell a hand lands in: { type, key, up }. Resolved by the same pair -> soft -> hard
 * walk as grading, so there is no second resolver to drift. Hard keys clamp to the chart's rows
 * (8..17): 17..21 share one row, and anything under 8 folds into the 8 row.
 */
export function cellFor(hand, upcard) {
  const { type, key } = base(hand, col(upcard));
  return { type, key: type === 'hard' ? Math.min(17, Math.max(8, key)) : key, up: upcard.value };
}

/** Stable string id for a cell, e.g. 'hard-16-10' / 'soft-7-3' / 'pair-11-6'. */
export const cellId = (hand, upcard) => {
  const { type, key, up } = cellFor(hand, upcard);
  return `${type}-${key}-${up}`;
};

/** Every cell of the chart grid with its S17 action — the source rows for the heatmap /
 *  reference view (#5 F8). Rule deltas are not applied; v1 exposes S17 only. */
export function cells() {
  const out = [];
  for (const [type, table] of [['hard', HARD], ['soft', SOFT], ['pair', PAIR]])
    for (const key of Object.keys(table).map(Number))
      for (const up of UPCARDS)
        out.push({ id: `${type}-${key}-${up}`, type, key, up, action: table[key][col({ value: up })] });
  return out;
}

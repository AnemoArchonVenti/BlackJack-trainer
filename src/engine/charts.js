// Basic-strategy tables. DATA ONLY — source of truth is research/blackjack-trainer-research.md §1a
// (S17, 4–8 deck, DAS, late surrender). Do not hand-edit numbers here; fix research first, then mirror.
// Columns = dealer upcard value 2 3 4 5 6 7 8 9 10 A -> index 0..9.
// Codes: H hit · S stand · D double-else-hit · Ds double-else-stand · P split · Rh surrender-else-hit.
const r = (s) => s.split(' ');

// Hard totals keyed by total. 17..21 are identical (all stand); strategy.js clamps >17 to 17.
export const HARD = {
  8: r('H H H H H H H H H H'),
  9: r('H D D D D H H H H H'),
  10: r('D D D D D D D D H H'),
  11: r('D D D D D D D D D H'),
  12: r('H H S S S H H H H H'),
  13: r('S S S S S H H H H H'),
  14: r('S S S S S H H H H H'),
  15: r('S S S S S H H H Rh H'),
  16: r('S S S S S H H Rh Rh Rh'),
  17: r('S S S S S S S S S S'),
};

// Soft totals keyed by the non-ace portion: A,2 -> 2 ... A,9 -> 9.
export const SOFT = {
  2: r('H H H D D H H H H H'),
  3: r('H H H D D H H H H H'),
  4: r('H H D D D H H H H H'),
  5: r('H H D D D H H H H H'),
  6: r('H D D D D H H H H H'),
  7: r('Ds Ds Ds Ds Ds S S H H H'),
  8: r('S S S S S S S S S S'),
  9: r('S S S S S S S S S S'),
};

// Pairs keyed by card value (2..10, 11 = aces). Assumes DAS.
export const PAIR = {
  2: r('P P P P P P H H H H'),
  3: r('P P P P P P H H H H'),
  4: r('H H H P P H H H H H'),
  5: r('D D D D D D D D H H'),
  6: r('P P P P P H H H H H'),
  7: r('P P P P P P H H H H'),
  8: r('P P P P P P P P P P'),
  9: r('P P P P P S P P S S'),
  10: r('S S S S S S S S S S'),
  11: r('P P P P P P P P P P'),
};

// Ordered rule-delta overrides applied over the base table (research §1b, H17 set).
// `up` = dealer upcard value (11 = Ace). Only H17 is tabulated in research; NDAS and
// no-surrender are prose (§1c), not cell tables — left out until sourced as numbers (issue #1).
export const DELTAS = [
  { rule: 'h17', type: 'hard', key: 11, up: 11, action: 'D' }, // 11 vs A:  H  -> D
  { rule: 'h17', type: 'soft', key: 7, up: 2, action: 'Ds' }, // A,7 vs 2:  S  -> Ds
  { rule: 'h17', type: 'soft', key: 8, up: 6, action: 'Ds' }, // A,8 vs 6:  S  -> Ds
  { rule: 'h17', type: 'hard', key: 15, up: 11, action: 'Rh' }, // 15 vs A:  H  -> Rh
  { rule: 'h17', type: 'hard', key: 17, up: 11, action: 'Rh' }, // 17 vs A:  S  -> Rh
  { rule: 'h17', type: 'pair', key: 8, up: 11, action: 'Rh' }, // 8,8 vs A:  P  -> Rh
];

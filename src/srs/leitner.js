// Leitner boxes (SPEC §6). Every strategy cell and every deviation is a card in one box:
// correct promotes one box, a miss drops to box 1. Pure/framework-free; zero Svelte.
// State is a flat { cellId: boxIndex } map so it serialises straight into the store blob (#5).

export const BOXES = ['New', 'Learning', 'Review', 'Mastered'];
const LEARNING = 1; // "box 1" — New means never attempted, so a miss lands here, not back in New.
const MASTERED = BOXES.length - 1;

/** Next box for a card currently in `box` (undefined = New). */
export function next(box, correct) {
  if (!correct) return LEARNING;
  return Math.min((box ?? 0) + 1, MASTERED);
}

/** createLeitner(boxes) -> live box map. `boxes` is a previously persisted toJSON(). */
export function createLeitner(boxes = {}) {
  const state = { ...boxes };
  return {
    /** grade(cellId, correct) -> the cell's new bucket name. */
    grade(cellId, correct) {
      state[cellId] = next(state[cellId], correct);
      return BOXES[state[cellId]];
    },
    bucket(cellId) {
      return BOXES[state[cellId] ?? 0];
    },
    /** Bucket tallies for the dashboard. Unseen cells aren't tracked, so New counts only explicit zeros. */
    counts() {
      const out = Object.fromEntries(BOXES.map((b) => [b, 0]));
      for (const box of Object.values(state)) out[BOXES[box]] += 1;
      return out;
    },
    toJSON() {
      return { ...state };
    },
  };
}

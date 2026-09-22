// Every adjustable setting, in one place: its default, its range, and what it means.
//
// Pure and framework-free. The store persists what this module describes, the settings panel
// renders its ranges rather than hard-coding a second copy of them, and `clamp` is what stands
// between a hand-edited localStorage blob and a drill asked to deal minus four cards.
//
// ── What is adjustable, and what is deliberately not ─────────────────────────────────────────
//
// Anything that changes only how you PRACTISE is open: how long a countdown runs, how big the
// shoe is for true-count questions, how fast the tag drill moves, how much money you sit down
// with, how deep the cut card goes.
//
// Anything that changes the CORRECT PLAY is not, with one exception. A basic strategy chart is
// only right for the game it was computed for, and this trainer grades against a chart sourced
// for 4–8 decks, dealer stands on soft 17, double after split, late surrender. So:
//
//   · Deck count is adjustable across 4–8 — the whole range the chart covers. Every hand is
//     still graded correctly, and the count arithmetic gets meaningfully harder at 8.
//   · Dropping to 1 or 2 decks is NOT offered. Single-deck basic strategy differs in a dozen
//     cells and none of them are sourced here.
//   · H17, no-DAS and no-surrender are NOT offered. The engine knows the H17 cell changes, but
//     the no-DAS and no-surrender deltas exist in the research only as prose, not as tables, so
//     the trainer cannot grade those games correctly and does not pretend to.
//
// Penetration is stored as a FRACTION of the shoe rather than a number of decks, because the
// deck count moves: three quarters of a 6-deck shoe and three quarters of an 8-deck shoe are the
// same decision by the pit, and a stored 4.5 would silently become half the shoe at 8 decks.

/** The full schema. `kind` tells the panel how to render it; the rest is the contract. */
export const SETTINGS = {
  // ── Display ──
  motion: { group: 'display', kind: 'enum', default: 'full', options: ['full', 'reduced', 'off'] },
  audio: { group: 'display', kind: 'bool', default: false },

  // ── The table ──
  decks: {
    group: 'table',
    kind: 'int',
    default: 6,
    min: 4,
    max: 8,
    step: 1,
    label: 'Decks in the shoe',
    help: 'The chart is sourced for 4–8 decks, so every one of these is graded correctly. More decks dilute the count.',
  },
  penetration: {
    group: 'table',
    kind: 'percent',
    default: 0.75,
    min: 0.5,
    max: 0.9,
    step: 0.05,
    label: 'Penetration',
    help: 'How deep the cut card sits. Deep penetration is worth more to a counter than any change in deck count.',
  },
  bankroll: {
    group: 'table',
    kind: 'int',
    default: 1000,
    min: 100,
    max: 100_000,
    step: 100,
    label: 'Starting bankroll',
    help: 'What you sit down with, and what Reset puts back.',
  },

  // ── The drills ──
  countdownCards: {
    group: 'drills',
    kind: 'int',
    default: 40,
    min: 10,
    max: 52,
    step: 1,
    label: 'Cards per countdown',
    help: 'How many cards a countdown run deals. Fewer than a full deck, so the answer is not always zero.',
  },
  trueCountDecks: {
    group: 'drills',
    kind: 'int',
    default: 6,
    min: 1,
    max: 8,
    step: 1,
    label: 'Shoe size for true count',
    help: 'The shoe the true-count questions are posed from. A single deck makes the division trivial; eight makes it real.',
  },
  tagPace: {
    group: 'drills',
    kind: 'enum',
    default: 'normal',
    options: ['fast', 'normal', 'slow', 'manual'],
    label: 'Tag speed pace',
    help: 'How quickly the next card comes. Manual waits for you, which is the way to learn the tags before drilling speed.',
  },
};

/** How long the tag drill lingers before dealing the next card, per pace. */
export const TAG_PACE_MS = {
  fast: { correct: 120, wrong: 550 },
  normal: { correct: 220, wrong: 900 },
  slow: { correct: 500, wrong: 1600 },
  // `manual` never auto-advances; the UI shows a Next button instead.
  manual: { correct: null, wrong: null },
};

/** A fresh settings object. */
export const settingDefaults = () =>
  Object.fromEntries(Object.entries(SETTINGS).map(([key, spec]) => [key, spec.default]));

/** The settings in a group, in declaration order — the panel's layout comes from this. */
export const settingsIn = (group) =>
  Object.entries(SETTINGS)
    .filter(([, spec]) => spec.group === group)
    .map(([key, spec]) => ({ key, ...spec }));

/** Round to the nearest step within [min, max]; used so a slider cannot land between rungs. */
function snap(n, { min, max, step }) {
  const steps = Math.round((n - min) / step);
  return Math.min(max, Math.max(min, min + steps * step));
}

/**
 * clampOne(key, value) -> a value this setting is allowed to hold, or its default.
 * Anything unrecognised, out of range, NaN or the wrong type falls back rather than throwing:
 * a bad blob should cost you your preferences, never the ability to open the app.
 */
export function clampOne(key, value) {
  const spec = SETTINGS[key];
  if (!spec) return undefined;
  if (spec.kind === 'bool') return typeof value === 'boolean' ? value : spec.default;
  if (spec.kind === 'enum') return spec.options.includes(value) ? value : spec.default;
  const n = Number(value);
  if (!Number.isFinite(n)) return spec.default;
  const snapped = snap(n, spec);
  // Float steps (penetration moves in 0.05) accumulate noise; two decimals is well inside a step.
  return spec.kind === 'int' ? Math.round(snapped) : Math.round(snapped * 100) / 100;
}

/** clamp(raw) -> a complete, valid settings object. Unknown keys are dropped. */
export function clamp(raw) {
  const out = settingDefaults();
  if (raw && typeof raw === 'object') {
    for (const key of Object.keys(SETTINGS)) {
      if (key in raw) out[key] = clampOne(key, raw[key]);
    }
  }
  return out;
}

/** penetrationDecks(settings) -> where the cut card sits, in decks, for createShoe. */
export const penetrationDecks = (s) => Math.round(s.decks * s.penetration * 2) / 2;

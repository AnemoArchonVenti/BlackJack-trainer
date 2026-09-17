// Bet sizing by true count (SPEC §5.4, research §2a). Pure/framework-free; zero Svelte.
//
// What research actually gives us: each +1 of true count is worth roughly +0.5%, you bet the
// table minimum at TC <= +1, and the benchmark game is "6 decks, 4.5-deck penetration, 1-15
// spread ≈ +1.15% player advantage".
//
// ponytail: the SPREAD and the "minimum at TC <= +1" rule are sourced; the individual RUNGS are
// not — research publishes no ramp table. These are a conventional 1-15 ramp for a 6-deck shoe,
// and the trainer SHOWS them to the player rather than hiding them, so the drill is "bet the
// ramp you were given", not "guess an unpublished number". Swap the table if a sourced ramp
// turns up; nothing else changes.

export const MAX_SPREAD = 15;

/** Rungs as { from: minimum true count, units }. Ordered low to high. */
export const RAMP = [
  { from: -Infinity, units: 1 }, // TC < +2: table minimum, the count is not paying you
  { from: 2, units: 2 },
  { from: 3, units: 4 },
  { from: 4, units: 8 },
  { from: 5, units: MAX_SPREAD },
];

/** recommendedUnits(trueCount) -> how many betting units this count is worth. */
export function recommendedUnits(trueCount) {
  let units = RAMP[0].units;
  for (const rung of RAMP) if (trueCount >= rung.from) units = rung.units;
  return units;
}

/**
 * gradeBet(trueCount, units) -> { correct, want, units }.
 * Graded against the shoe's real true count, not the player's estimate: a bet placed off a
 * miscount is a wrong bet, which is exactly the lesson the integration table is teaching.
 */
export function gradeBet(trueCount, units) {
  const want = recommendedUnits(trueCount);
  return { correct: units === want, want, units };
}

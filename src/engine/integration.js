// End-of-shoe grading for the integration table (SPEC §5.4, Mode 4). Pure/framework-free.
//
// Mode 4 fuses everything: you keep the count yourself, size the bet by it, and are expected to
// make the index plays. So the shoe is graded on four axes rather than one, and every miss comes
// back as an SRS card so the weakness is scheduled, not just reported.
import { gradeBet } from './betting.js';

// Count tracking and bet sizing are skills, not chart cells, so they get their own SRS cards.
// They live outside the chart grid, so they never colour the heatmap (#5 enumerates chart cells).
export const COUNT_CARD_ID = 'skill-count-tracking';
export const BET_CARD_ID = 'skill-bet-sizing';

const tally = (correct, total) => ({ correct, total, accuracy: total ? correct / total : null });

/**
 * scoreShoe(rounds) -> the end-of-shoe report.
 * Each round: { calledCount, truthCount, trueCount, units, decisions[] }, where a decision is
 * round.js's record plus its cell id: { correct, wasDeviation, cellId, deviationId }.
 */
export function scoreShoe(rounds) {
  let countOk = 0;
  let betOk = 0;
  let playOk = 0;
  let playTotal = 0;
  let devOk = 0;
  let devTotal = 0;
  const missed = new Set(); // one card per distinct miss — a cell blown twice is still one card

  for (const r of rounds) {
    if (r.calledCount === r.truthCount) countOk += 1;
    else missed.add(COUNT_CARD_ID);

    if (gradeBet(r.trueCount, r.units).correct) betOk += 1;
    else missed.add(BET_CARD_ID);

    for (const d of r.decisions) {
      playTotal += 1;
      if (d.correct) playOk += 1;
      else missed.add(d.cellId);

      if (d.wasDeviation) {
        devTotal += 1;
        if (d.correct) devOk += 1;
        else if (d.deviationId) missed.add(d.deviationId);
      }
    }
  }

  const count = tally(countOk, rounds.length);
  const bets = tally(betOk, rounds.length);
  const playScore = tally(playOk, playTotal);
  const deviations = tally(devOk, devTotal);

  // Average only the axes this shoe actually exercised — a shoe where no index spot came up
  // shouldn't score zero for deviations.
  const scored = [count, bets, playScore, deviations].map((a) => a.accuracy).filter((a) => a !== null);
  const overall = scored.length ? scored.reduce((a, b) => a + b, 0) / scored.length : null;

  return {
    rounds: rounds.length,
    count,
    bets,
    play: playScore,
    deviations,
    overall,
    misses: [...missed].map((id) => ({
      id,
      kind: id === COUNT_CARD_ID ? 'count' : id === BET_CARD_ID ? 'bet' : id.startsWith('dev-') ? 'deviation' : 'play',
    })),
  };
}

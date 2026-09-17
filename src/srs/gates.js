// Mastery-gate progress (SPEC §6). Pure/framework-free; the numbers live in the store blob so
// progress survives a reload (#5). Gates guide, they never lock (SPEC Q5=C) — the evaluation
// side arrives with the guided path (#8); this is the record-keeping side.

/**
 * recordCountdown(gates, result) -> new gates.
 * `result` is a drills.js countdown run. A clean run (right count AND inside the 30s target)
 * extends the streak and can set a new best; anything else resets the streak to zero and is
 * never eligible as a best time — a fast miscount is not a fast count.
 */
export function recordCountdown(gates, { clean, elapsedMs }) {
  if (!clean) return { ...gates, cleanRuns: 0 };
  const best = gates.countdownBestMs;
  return {
    ...gates,
    countdownBestMs: best === null || elapsedMs < best ? elapsedMs : best,
    cleanRuns: gates.cleanRuns + 1,
  };
}

// Per-cell accuracy stats + heatmap data (SPEC §6). Pure/framework-free; zero Svelte.
// Owns the "how well do I know this cell" half of progress and composes leitner.js for the
// box half, so a cell's stats and its bucket can never drift apart.
import { cells } from '../engine/strategy.js';
import { createLeitner } from './leitner.js';

const RECENT_CAP = 200; // rolling window kept for the mastery gates (#8); ~50 is all they read.

/** createProgress(saved) -> live progress. `saved` is a previously persisted toJSON(). */
export function createProgress({ stats = {}, boxes = {}, recent = [] } = {}) {
  const cellStats = Object.fromEntries(Object.entries(stats).map(([id, s]) => [id, { ...s }]));
  const leitner = createLeitner(boxes);
  let log = [...recent]; // newest last; 1 = correct, 0 = miss

  const statsFor = (id) => cellStats[id] ?? { attempts: 0, correct: 0 };

  return {
    /** Record one graded decision for a cell: updates stats, box, and the rolling window. */
    grade(cellId, correct) {
      const s = (cellStats[cellId] ??= { attempts: 0, correct: 0 });
      s.attempts += 1;
      if (correct) s.correct += 1;
      log.push(correct ? 1 : 0);
      if (log.length > RECENT_CAP) log = log.slice(-RECENT_CAP);
      return { bucket: leitner.grade(cellId, correct), ...s };
    },
    stats(cellId) {
      const s = statsFor(cellId);
      return {
        attempts: s.attempts,
        correct: s.correct,
        accuracy: s.attempts ? s.correct / s.attempts : null, // null = never played, not 0%
        bucket: leitner.bucket(cellId),
      };
    },
    /** One row per chart cell: the grid the reference/heatmap view renders (F7/F8). */
    heatmap() {
      return cells().map((cell) => ({ ...cell, ...this.stats(cell.id) }));
    },
    counts: leitner.counts,
    /** Accuracy over the last n decisions (any cell) — the strategy gate's numerator. */
    recentAccuracy(n = 50) {
      const window = log.slice(-n);
      return window.length ? window.reduce((a, b) => a + b, 0) / window.length : null;
    },
    /**
     * Order a deck of card ids the way a session should serve them (SPEC §6: "due +
     * recently-missed first"): Learning before New before Review before Mastered, then the
     * least-practised card first so a single stubborn card cannot hog the session.
     */
    dueFirst(ids) {
      const rank = { Learning: 0, New: 1, Review: 2, Mastered: 3 };
      return [...ids].sort((a, b) => {
        const byBucket = rank[leitner.bucket(a)] - rank[leitner.bucket(b)];
        return byBucket || statsFor(a).attempts - statsFor(b).attempts;
      });
    },
    /** Cell ids still sitting in a given bucket — the gate's "nothing left in Learning" check. */
    inBucket(bucket) {
      return Object.keys(leitner.toJSON()).filter((id) => leitner.bucket(id) === bucket);
    },
    toJSON() {
      return { stats: cellStats, boxes: leitner.toJSON(), recent: log };
    },
  };
}

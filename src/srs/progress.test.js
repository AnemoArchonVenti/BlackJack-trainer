import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProgress } from './progress.js';

test('grade() accumulates per-cell attempts and accuracy', () => {
  const p = createProgress();
  assert.deepEqual(p.stats('hard-16-10'), { attempts: 0, correct: 0, accuracy: null, bucket: 'New' },
    'an untouched cell has no accuracy to report');

  p.grade('hard-16-10', true);
  p.grade('hard-16-10', false);
  p.grade('hard-16-10', true);
  // Boxes: correct -> Learning, miss -> back to Learning, correct -> Review. Stats keep the whole history.
  assert.deepEqual(p.stats('hard-16-10'), { attempts: 3, correct: 2, accuracy: 2 / 3, bucket: 'Review' },
    'lifetime accuracy is independent of the current box');
});

test('heatmap() covers the whole chart grid, carrying chart action + hover stats', () => {
  const p = createProgress();
  p.grade('hard-16-10', false);

  const map = p.heatmap();
  assert.equal(map.length, 280, 'one row per chart cell (hard 8-17, soft 2-9, pairs 2-11 x 10 upcards)');

  const missed = map.find((cell) => cell.id === 'hard-16-10');
  assert.equal(missed.action, 'Rh', '16 vs 10 is surrender-else-hit (research §1a)');
  assert.equal(missed.accuracy, 0);
  assert.equal(missed.attempts, 1);
  assert.equal(missed.bucket, 'Learning');

  const untouched = map.find((cell) => cell.id === 'pair-8-7');
  assert.equal(untouched.accuracy, null, 'never-played cells stay uncoloured, not 0%');
  assert.equal(untouched.action, 'P');
});

test('recentAccuracy() reads the rolling decision window the strategy gate uses', () => {
  const p = createProgress();
  assert.equal(p.recentAccuracy(50), null, 'no decisions yet -> nothing to judge');
  for (let i = 0; i < 4; i++) p.grade(`hard-${12 + i}-10`, true);
  p.grade('hard-16-10', false);
  assert.equal(p.recentAccuracy(5), 0.8);
  assert.equal(p.recentAccuracy(2), 0.5, 'window is the last n decisions, newest first');
});

test('state survives a save/load round-trip through the persisted blob', () => {
  const p = createProgress();
  p.grade('soft-7-2', true);
  p.grade('soft-7-2', true);
  const revived = createProgress(JSON.parse(JSON.stringify(p.toJSON())));
  assert.deepEqual(revived.stats('soft-7-2'), { attempts: 2, correct: 2, accuracy: 1, bucket: 'Review' });
});

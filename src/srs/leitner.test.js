import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLeitner, BOXES } from './leitner.js';

test('BOXES is the New -> Learning -> Review -> Mastered ladder (SPEC §6)', () => {
  assert.deepEqual(BOXES, ['New', 'Learning', 'Review', 'Mastered']);
});

test('an unseen cell is New; each correct answer promotes one box, capped at Mastered', () => {
  const l = createLeitner();
  assert.equal(l.bucket('hard-16-10'), 'New', 'unseen cells start in New');

  assert.equal(l.grade('hard-16-10', true), 'Learning');
  assert.equal(l.grade('hard-16-10', true), 'Review');
  assert.equal(l.grade('hard-16-10', true), 'Mastered');
  assert.equal(l.grade('hard-16-10', true), 'Mastered', 'Mastered is the ceiling');
});

test('a miss sends the cell back to box 1 (Learning) from any box', () => {
  const l = createLeitner();
  for (let i = 0; i < 3; i++) l.grade('soft-7-6', true);
  assert.equal(l.bucket('soft-7-6'), 'Mastered');

  assert.equal(l.grade('soft-7-6', false), 'Learning', 'Mastered demotes all the way to Learning');
  assert.equal(l.grade('soft-7-6', false), 'Learning', 'a miss on Learning stays in Learning');
  // New is "never attempted", so a first-attempt miss lands in Learning, not back in New.
  assert.equal(l.grade('pair-8-11', false), 'Learning', 'a missed first attempt leaves New');
});

test('counts() tallies every box for the dashboard snapshot', () => {
  const l = createLeitner();
  l.grade('a', true); // Learning
  l.grade('b', true);
  l.grade('b', true); // Review
  l.grade('c', false); // Learning
  assert.deepEqual(l.counts(), { New: 0, Learning: 2, Review: 1, Mastered: 0 });
});

test('toJSON round-trips through the persisted blob', () => {
  const l = createLeitner();
  l.grade('hard-12-3', true);
  l.grade('hard-12-3', true);
  const revived = createLeitner(JSON.parse(JSON.stringify(l.toJSON())));
  assert.equal(revived.bucket('hard-12-3'), 'Review', 'boxes survive a save/load cycle');
});

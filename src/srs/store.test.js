import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, save, defaults, readRaw, overwrite, hasRealProgress, STORAGE_KEY } from './store.js';

// Minimal localStorage stand-in. `blocked` models Safari private mode / disabled storage.
const fakeStorage = ({ blocked = false, seed = {} } = {}) => {
  const data = { ...seed };
  return {
    data,
    getItem: (k) => { if (blocked) throw new Error('denied'); return k in data ? data[k] : null; },
    setItem: (k, v) => { if (blocked) throw new Error('quota'); data[k] = v; },
  };
};

test('load() on empty storage returns the default profile', () => {
  const state = load(fakeStorage());
  assert.equal(state.bankroll, 1000, 'a fresh player starts with the default bankroll');
  assert.deepEqual(state.progress, { stats: {}, boxes: {}, recent: [] });
});

test('save() then load() round-trips the whole blob under one key', () => {
  const storage = fakeStorage();
  const state = { ...defaults(), bankroll: 1750 };
  state.progress.stats['hard-16-10'] = { attempts: 4, correct: 3 };

  assert.equal(save(state, storage), true, 'a successful write reports success');
  assert.deepEqual(Object.keys(storage.data), [STORAGE_KEY], 'everything lives in a single JSON blob');

  const reloaded = load(storage);
  assert.equal(reloaded.bankroll, 1750);
  assert.deepEqual(reloaded.progress.stats['hard-16-10'], { attempts: 4, correct: 3 });
});

test('blocked storage degrades to defaults instead of throwing', () => {
  const storage = fakeStorage({ blocked: true });
  assert.deepEqual(load(storage), defaults(), 'the app still boots with storage denied');
  assert.equal(save(defaults(), storage), false, 'a refused write reports failure, it does not throw');
});

test('a corrupt or partial blob falls back to defaults field by field', () => {
  assert.deepEqual(load(fakeStorage({ seed: { [STORAGE_KEY]: 'not json{' } })), defaults(),
    'unparseable storage is treated as empty');

  const partial = load(fakeStorage({ seed: { [STORAGE_KEY]: JSON.stringify({ bankroll: 25 }) } }));
  assert.equal(partial.bankroll, 25, 'the stored field wins');
  assert.deepEqual(partial.progress, defaults().progress, 'missing sections are filled from defaults');
  assert.deepEqual(partial.settings, defaults().settings);
});

test('save() stamps savedAt, because sync cannot tell who is ahead without it', () => {
  const storage = fakeStorage();
  const before = Date.now();
  save({ ...defaults(), bankroll: 900 }, storage);
  const written = JSON.parse(storage.data[STORAGE_KEY]);
  assert.ok(written.savedAt >= before, 'the write is stamped with when it happened');
  assert.equal(written.bankroll, 900, 'and the rest of the profile survives the stamping');

  // A caller cannot defeat it by passing a stale timestamp — the stamp is applied last.
  save({ ...defaults(), savedAt: 1 }, storage);
  assert.ok(JSON.parse(storage.data[STORAGE_KEY]).savedAt > 1, 'a stale savedAt is overwritten');
});

test('readRaw returns exactly what is on disk, or null', () => {
  assert.equal(readRaw(fakeStorage()), null, 'nothing saved yet');
  const storage = fakeStorage();
  save({ ...defaults(), bankroll: 250 }, storage);
  assert.equal(readRaw(storage).bankroll, 250);
  assert.equal(readRaw(fakeStorage({ seed: { [STORAGE_KEY]: 'not json' } })), null, 'a corrupt blob is null, not a throw');
  assert.equal(readRaw(fakeStorage({ blocked: true })), null, 'blocked storage is null, not a throw');
});

test('overwrite replaces the profile wholesale, for adopting an account', () => {
  const storage = fakeStorage();
  save({ ...defaults(), bankroll: 100 }, storage);
  overwrite({ ...defaults(), bankroll: 7777, savedAt: 42 }, storage);
  const after = readRaw(storage);
  assert.equal(after.bankroll, 7777);
  assert.equal(after.savedAt, 42, 'overwrite does NOT re-stamp — the caller sets the time deliberately');
});

test('hasRealProgress is the guard that decides whether to warn before overwriting', () => {
  // The stakes: false means "replacing this costs nobody anything, do it silently". Getting that
  // wrong in the generous direction throws away somebody's practice without asking.
  assert.equal(hasRealProgress(null), false);
  assert.equal(hasRealProgress(undefined), false);
  assert.equal(hasRealProgress('nonsense'), false);
  assert.equal(hasRealProgress({}), false);
  assert.equal(hasRealProgress(defaults()), false, 'a fresh profile is not progress');

  // Changing a setting is not progress — adopting an account over it is no loss.
  const tweaked = { ...defaults(), settings: { ...defaults().settings, decks: 8 } };
  assert.equal(hasRealProgress(tweaked), false, 'settings alone do not make a profile worth saving');

  // Any of these three, on their own, means somebody has actually done something.
  assert.equal(hasRealProgress({ ...defaults(), progress: { stats: {}, boxes: {}, recent: [1] } }), true, 'one graded decision counts');
  assert.equal(hasRealProgress({ ...defaults(), progress: { stats: { 'hard-16-10': { attempts: 1, correct: 0 } }, boxes: {}, recent: [] } }), true, 'one played cell counts');
  assert.equal(hasRealProgress({ ...defaults(), gates: { countdownBestMs: 28000, cleanRuns: 0 } }), true, 'a countdown best counts');
  assert.equal(hasRealProgress({ ...defaults(), gates: { countdownBestMs: null, cleanRuns: 2 } }), true, 'a clean-run streak counts');
});

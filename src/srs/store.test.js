import { test } from 'node:test';
import assert from 'node:assert/strict';
import { load, save, defaults, STORAGE_KEY } from './store.js';

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

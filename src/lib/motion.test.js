import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveMotion, MOTION_PREFS, DEAL_MS, STAGGER_MS } from './motion.js';

test('the dealing choreography stays inside the 150-250ms budget (SPEC §11 F5)', () => {
  assert.ok(DEAL_MS >= 150 && DEAL_MS <= 250, `${DEAL_MS}ms is choreographed but fast`);
  assert.ok(STAGGER_MS > 0 && STAGGER_MS < DEAL_MS, 'the stagger is a beat, not a second deal');
  assert.deepEqual(MOTION_PREFS, ['full', 'reduced', 'off']);
});

test('Full motion flies cards; Reduced fades them; Off is instant', () => {
  const full = resolveMotion('full', false);
  assert.equal(full.level, 'full');
  assert.equal(full.fly, true, 'cards travel from the shoe position');
  assert.equal(full.duration, DEAL_MS);
  assert.equal(full.stagger, STAGGER_MS);

  const reduced = resolveMotion('reduced', false);
  assert.equal(reduced.level, 'reduced');
  assert.equal(reduced.fly, false, 'no travel, just a cross-fade');
  assert.ok(reduced.duration > 0 && reduced.duration < DEAL_MS, 'shorter than the full deal');
  assert.equal(reduced.stagger, 0, 'nothing waits its turn');

  const off = resolveMotion('off', false);
  assert.deepEqual(off, { level: 'off', fly: false, duration: 0, stagger: 0 });
});

test('the OS reduced-motion setting overrides Full, and never overrides a stricter choice', () => {
  assert.deepEqual(resolveMotion('full', true), resolveMotion('reduced', false),
    'an OS preference for less motion wins over the app default');
  assert.equal(resolveMotion('off', true).level, 'off', 'Off stays off — the OS cannot add motion back');
  assert.equal(resolveMotion('reduced', true).level, 'reduced');
});

test('an unknown or missing preference falls back to Full rather than breaking the deal', () => {
  assert.equal(resolveMotion(undefined, false).level, 'full');
  assert.equal(resolveMotion('sparkles', false).level, 'full');
  assert.equal(resolveMotion(undefined, true).level, 'reduced', 'the OS preference still applies to the fallback');
});

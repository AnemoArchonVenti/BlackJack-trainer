import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SETTINGS, TAG_PACE_MS, settingDefaults, settingsIn, clamp, clampOne, penetrationDecks } from './settings.js';
import { HARD } from '../engine/charts.js';

test('every setting declares enough for the panel to render it without a second copy', () => {
  for (const [key, spec] of Object.entries(SETTINGS)) {
    assert.ok(spec.group, `${key} belongs to a group`);
    assert.ok(['enum', 'bool', 'int', 'percent'].includes(spec.kind), `${key} has a known kind`);
    assert.notEqual(spec.default, undefined, `${key} has a default`);
    if (spec.kind === 'enum') assert.ok(spec.options.includes(spec.default), `${key} defaults inside its options`);
    if (spec.kind === 'int' || spec.kind === 'percent') {
      assert.ok(spec.min < spec.max, `${key} has a real range`);
      assert.ok(spec.default >= spec.min && spec.default <= spec.max, `${key} defaults inside its range`);
      assert.ok(spec.step > 0, `${key} has a step`);
    }
  }
  assert.deepEqual(
    settingsIn('drills').map((s) => s.key),
    ['countdownCards', 'trueCountDecks', 'tagPace'],
    'the panel lays out drills in declaration order',
  );
});

test('the deck range stays inside the chart the trainer grades against', () => {
  // research §1a sources the chart for 4–8 decks, S17. Offering 1 or 2 decks would hand the
  // player a chart that is wrong for their game, which is the one thing this project refuses.
  assert.equal(SETTINGS.decks.min, 4, 'no single- or double-deck games: those charts are not sourced');
  assert.equal(SETTINGS.decks.max, 8);
  assert.equal(SETTINGS.decks.default, 6, 'the default is still the game the reference pages describe');
  // And the chart itself is ruleset-agnostic across that range — one table, every deck count.
  assert.ok(HARD[16], 'the chart the whole range shares');
});

test('clamp pulls anything out of range back, and never throws', () => {
  assert.equal(clampOne('decks', 99), 8, 'above the range clamps down');
  assert.equal(clampOne('decks', 1), 4, 'below the range clamps up');
  assert.equal(clampOne('decks', 6.4), 6, 'a fraction of a deck is not a thing');
  assert.equal(clampOne('countdownCards', 0), 10, 'a run has to have cards in it');
  assert.equal(clampOne('countdownCards', 500), 52, 'and cannot exceed the deck it comes from');
  assert.equal(clampOne('tagPace', 'ludicrous'), 'normal', 'an unknown option falls back');
  assert.equal(clampOne('audio', 'yes'), false, 'a non-boolean falls back rather than being truthy');
  assert.equal(clampOne('penetration', 0.73), 0.75, 'snapped to the nearest rung');
  assert.equal(clampOne('nonsense', 1), undefined, 'an unknown setting is not a setting');

  for (const bad of [NaN, Infinity, null, undefined, 'abc', {}, []]) {
    assert.equal(Number.isFinite(clampOne('bankroll', bad)), true, `${String(bad)} still yields a number`);
  }
});

test('clamp rebuilds a whole settings object from a partial or hostile blob', () => {
  assert.deepEqual(clamp(undefined), settingDefaults(), 'nothing saved yet');
  assert.deepEqual(clamp({}), settingDefaults(), 'an empty blob');
  assert.deepEqual(clamp('not an object'), settingDefaults(), 'a blob that is not even a blob');

  const mixed = clamp({ decks: 8, tagPace: 'slow', unknownKey: 'ignored', countdownCards: -3 });
  assert.equal(mixed.decks, 8, 'a valid value survives');
  assert.equal(mixed.tagPace, 'slow');
  assert.equal(mixed.countdownCards, 10, 'an invalid one is repaired');
  assert.equal(mixed.motion, 'full', 'a missing one gets its default');
  assert.equal('unknownKey' in mixed, false, 'and a key we do not know is dropped');
});

test('penetration travels as a fraction so it survives a change of deck count', () => {
  // The bug this shape avoids: storing 4.5 decks and then switching to an 8-deck shoe, which
  // would quietly become a little over half the shoe instead of three quarters of it.
  assert.equal(penetrationDecks({ decks: 6, penetration: 0.75 }), 4.5, 'the shoe the site describes');
  assert.equal(penetrationDecks({ decks: 8, penetration: 0.75 }), 6, 'same cut, bigger shoe');
  assert.equal(penetrationDecks({ decks: 4, penetration: 0.5 }), 2);
  // createShoe measures the cut in decks and players read the tray in half decks.
  for (let decks = SETTINGS.decks.min; decks <= SETTINGS.decks.max; decks++) {
    const cut = penetrationDecks({ decks, penetration: 0.75 });
    assert.equal(cut * 2, Math.round(cut * 2), `${decks} decks cuts on a half-deck boundary`);
    assert.ok(cut > 0 && cut < decks, `${decks} decks cuts somewhere inside the shoe`);
  }
});

test('every tag pace is either a pair of delays or an explicit manual', () => {
  for (const pace of SETTINGS.tagPace.options) {
    assert.ok(pace in TAG_PACE_MS, `${pace} has timings`);
    const { correct, wrong } = TAG_PACE_MS[pace];
    if (pace === 'manual') {
      assert.equal(correct, null, 'manual never auto-advances');
      assert.equal(wrong, null);
    } else {
      assert.ok(wrong > correct, `${pace} lingers longer on a miss, so the right tag registers`);
    }
  }
});

// The site states its rules out loud, so those statements have to be true. house.js spells every
// number from the engine, but its prose still assumes a handful of booleans ("double after split",
// "late surrender", "stands on soft 17"). These tests pin those assumptions: flip one in the
// engine without rewriting the copy and the suite fails rather than the site lying to a player.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../engine/round.js';
import { createShoe, DECKS, PENETRATION } from '../engine/shoe.js';
import { HOUSE_RULES, METHODS, RULE_LINE, CHART_CELLS, INDEX_PLAYS, WHY_FIXED } from './house.js';

const terms = () => HOUSE_RULES.map((r) => r.term).join(' | ');

test('the printed rules match the ruleset the engine settles hands under', () => {
  assert.equal(RULES.h17, false, 'the copy says the dealer stands on soft 17');
  assert.equal(RULES.das, true, 'the copy says double after split is allowed');
  assert.equal(RULES.surrender, true, 'the copy offers late surrender');
  assert.equal(RULES.blackjackPays, 1.5, 'the copy says blackjack pays 3:2');
  assert.equal(RULES.maxHands, 4, 'the copy says you may split to four hands');

  assert.match(terms(), /Dealer stands on soft 17/);
  assert.match(terms(), /Double after split/);
  assert.match(terms(), /Late surrender/);
  assert.match(terms(), /Blackjack pays 3:2/);
  assert.match(terms(), /Split to 4 hands/);
});

test('the printed shoe matches the shoe that is actually dealt', () => {
  assert.equal(DECKS, 6);
  assert.equal(createShoe().cardsRemaining / 52, DECKS, 'a fresh shoe holds the decks the site claims');
  assert.match(RULE_LINE, new RegExp(`^${DECKS} decks · dealer stands on soft 17`));

  // The cut card sits at PENETRATION decks — the number the "cut 75% in" sentence is built from.
  const shoe = createShoe();
  for (let i = 0; i < PENETRATION * 52 - 1; i++) shoe.draw();
  assert.equal(shoe.needsShuffle, false, 'one card short of the cut, the shoe plays on');
  shoe.draw();
  assert.equal(shoe.needsShuffle, true, 'at the cut card, the shoe is done');
});

test('the counts the methods quote are the real sizes of the chart and the index set', () => {
  assert.equal(CHART_CELLS, 280, 'hard + soft + pairs against ten upcards');
  assert.equal(INDEX_PLAYS, 22, 'Illustrious 18 + Fab 4, insurance included');
  assert.match(METHODS[0].what, /280 cells/);
  assert.match(METHODS[2].what, /22 index plays/);
});

test('every rule and method carries the plain-language line that explains it', () => {
  for (const rule of HOUSE_RULES) {
    assert.ok(rule.term && rule.detail, `"${rule.term}" needs a detail line — a bare term teaches nothing`);
  }
  for (const method of METHODS) {
    assert.ok(method.name && method.what && method.how, `"${method.name}" needs both what and how`);
  }
  assert.match(WHY_FIXED, /soft 17/, 'the reason the ruleset is fixed names the rule it turns on');
});

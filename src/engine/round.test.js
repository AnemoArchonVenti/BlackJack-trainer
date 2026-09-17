import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createShoe } from './shoe.js';
import { createTable } from './round.js';

// Rig the exact deal order: cards[0]=player1, [1]=dealer up, [2]=player2, [3]=hole, [4..]=draws.
const table = (cards, bankroll = 1000) => createTable({ shoe: createShoe({ cards }), bankroll });
const ranks = (h) => h.cards.map((c) => c.rank);

test('deal: bankroll drops by the bet; legal moves gate a fresh non-pair', () => {
  const t = table([10, 9, 6, 5]); // player 10,6=16 vs 9; hole 5
  t.deal(100);
  assert.equal(t.bankroll, 900);
  assert.deepEqual(t.legalMoves(), ['H', 'S', 'D', 'R']); // 2-card non-pair, 1 hand, surrender on
  assert.equal(t.round.phase, 'player');
});

test('stand: dealer plays out and settles at 1:1 (win / push / lose)', () => {
  // Win: player 19 vs dealer 6,10 -> draws 10 -> 26 bust.
  const w = table([10, 6, 9, 10, 10]);
  w.deal(100);
  w.stand();
  assert.equal(w.round.phase, 'done');
  assert.equal(w.round.net, 100);
  assert.equal(w.bankroll, 1100);

  // Push: player 19 vs dealer 9,10 = 19.
  const p = table([10, 9, 9, 10]);
  p.deal(100);
  p.stand();
  assert.equal(p.round.net, 0);
  assert.equal(p.bankroll, 1000);

  // Lose: player 18 vs dealer 10,10 = 20.
  const l = table([10, 10, 8, 10]);
  l.deal(100);
  l.stand();
  assert.equal(l.round.net, -100);
  assert.equal(l.bankroll, 900);
});

test('decision records are snapshots, independent of later mutation', () => {
  const t = table([5, 9, 6, 9, 10]); // player 5,6=11; hit a 10 -> 21; dealer 9,9=18
  t.deal(100);
  t.hit();
  assert.equal(t.round.net, 100); // 21 beats 18
  const d = t.round.decisions[0];
  assert.equal(d.chosen, 'H');
  assert.deepEqual(d.hand.map((c) => c.rank), [5, 6]); // pre-hit snapshot, NOT [5,6,10]
  assert.equal(d.upcard.rank, 9);
  assert.equal(typeof d.trueCount, 'number');
});

test('bust: immediate loss; dealer reveals hole (counted) but does not draw', () => {
  const t = table([10, 9, 6, 5, 10]); // player 16, hit 10 -> 26 bust; dealer 9,5
  t.deal(100);
  t.hit();
  assert.equal(t.round.net, -100);
  assert.equal(t.round.hands[0].outcome, 'lose');
  assert.equal(t.round.dealer.length, 2, 'dealer did not draw against a busted player');
  // RC: 10(-1) 9(0) 6(+1) [hole uncounted] hit 10(-1) = -1; reveal hole 5(+1) => 0.
  assert.equal(t.round ? t.shoe.runningCount : null, 0, 'hole card was counted on reveal');
});

test('naturals resolve before any decision: 3:2, push, dealer-BJ loss', () => {
  const bj = table([10, 9, 'A', 9]); // player 21 natural vs dealer 9,9=18
  bj.deal(100);
  assert.equal(bj.round.phase, 'done');
  assert.equal(bj.round.decisions.length, 0);
  assert.equal(bj.round.net, 150); // 3:2 on 100
  assert.equal(bj.bankroll, 1150);

  const push = table(['A', 'A', 10, 10]); // both naturals (dealer A,10=21)
  push.deal(100);
  assert.equal(push.round.net, 0);

  const dealerBj = table([10, 'A', 6, 10]); // dealer A,10=21; player 16
  dealerBj.deal(100);
  assert.equal(dealerBj.round.phase, 'done');
  assert.equal(dealerBj.round.decisions.length, 0);
  assert.equal(dealerBj.round.net, -100);
});

test('double: one card, hand closes, stake doubles', () => {
  const t = table([5, 9, 6, 9, 10]); // player 11; double draws 10 -> 21; dealer 18
  t.deal(100);
  t.double();
  assert.equal(t.round.hands[0].cards.length, 3, 'exactly one card on double');
  assert.equal(t.round.phase, 'done');
  assert.equal(t.round.net, 200); // won 2x the doubled 100 stake
  assert.equal(t.bankroll, 1200);
});

test('split: two hands play out; DAS on; surrender gone after split', () => {
  const t = table([8, 6, 8, 10, 10, 10, 10]); // 8,8 vs 6; each draws 10 -> 18,18; dealer busts
  t.deal(100);
  assert.deepEqual(t.legalMoves(), ['H', 'S', 'D', 'P', 'R']);
  t.split();
  assert.equal(t.round.hands.length, 2);
  assert.deepEqual(t.legalMoves(), ['H', 'S', 'D'], 'DAS keeps D; split removes R and P(not a pair)');
  t.stand(); // hand 0
  t.stand(); // hand 1
  assert.equal(t.round.phase, 'done');
  assert.equal(t.round.net, 200); // dealer 6,10 draws 10 -> 26 bust; both 18 win 1:1
});

test('split aces: one card each, hands close; a resulting 21 pays 1:1 not 3:2', () => {
  const t = table(['A', 9, 'A', 9, 10, 9]); // split A,A -> A,10(=21) and A,9(=20); dealer 18
  t.deal(100);
  t.split();
  assert.equal(t.round.phase, 'done', 'split aces get one card each and auto-stand');
  assert.deepEqual(ranks(t.round.hands[0]), ['A', 10]);
  assert.equal(t.round.net, 200, 'two 1:1 wins (100 each); a split 21 is NOT a 3:2 natural');
});

test('grading: a 3-card 11 is not "should have doubled" — D collapses to H when illegal', () => {
  const t = table([2, 6, 3, 10, 6, 10]); // player 2,3=5 vs 6; hit a 6 -> 11 (3 cards)
  t.deal(100);
  t.hit(); // 2,3=5 -> hit (chart H, correct)
  t.stand(); // now 2,3,6=11: chart says D, but 3 cards can't double -> correctAction H
  const d = t.round.decisions[1];
  assert.deepEqual(d.hand.map((c) => c.rank), [2, 3, 6]);
  assert.equal(d.correctAction, 'H', '3-card 11 reconciles D -> H');
  assert.equal(d.correct, false, 'standing on 11 is wrong');
});

test('grading: surrender gated off a split hand — Rh collapses to H (and H is then correct)', () => {
  const t = table([6, 10, 6, 7, 10, 9, 5]); // 6,6 vs 10; split -> hand0 6,10=16, hand1 6,9=15; dealer 10,7=17
  t.deal(100);
  t.split();
  t.hit(); // hand0 6,10=16 vs 10: chart Rh, but split hand can't surrender -> correctAction H
  const d = t.round.decisions.find((x) => x.hand.length === 2 && x.hand[0].rank === 6 && x.hand[1].rank === 10);
  assert.equal(d.correctAction, 'H', 'split-hand 16 reconciles Rh -> H');
  assert.equal(d.correct, true, 'hitting is the legal-reconciled correct move');
});

test('grading: a legal Ds is preserved raw and graded as its button', () => {
  const t = table(['A', 4, 7, 10, 5, 10]); // A,7=soft 18 vs 4: chart Ds; doubling is legal on 2 cards
  t.deal(100);
  t.double();
  const d = t.round.decisions[0];
  assert.equal(d.correctAction, 'Ds', 'raw Ds kept for reason text');
  assert.equal(d.chosen, 'D');
  assert.equal(d.correct, true, 'Ds grades the player-pressed D as correct');
});

test('surrender: lose half the bet, dealer does not draw', () => {
  const t = table([10, 9, 6, 9]); // player 16 vs 9
  t.deal(100);
  assert.ok(t.legalMoves().includes('R'));
  t.surrender();
  assert.equal(t.round.net, -50);
  assert.equal(t.bankroll, 950);
  assert.equal(t.round.dealer.length, 2);
});

// ── Deviation-aware grading (#9): the integration table expects index plays ────────────────
test('with deviations on, a decision is graded against the index, not just the chart', () => {
  // 16 vs 10 at a positive true count: the chart surrenders, the index stands (research §3a #2).
  // Rig a shoe whose exposed cards leave the count high before the player acts.
  const hot = [...Array(10).fill(5), 10, 10, 6, 7]; // ten 5s pre-drawn (+10), then 16 vs 10
  const t = createTable({ shoe: createShoe({ decks: 1, cards: hot }), bankroll: 1000, rules: { deviations: true } });
  for (let i = 0; i < 10; i++) t.shoe.draw(); // burn the 5s so the count is running hot
  assert.ok(t.shoe.trueCount > 0, 'the shoe is genuinely positive before the deal');

  t.deal(100);
  t.stand();
  const d = t.round.decisions[0];
  assert.equal(d.chosen, 'S');
  assert.equal(d.correct, true, 'standing 16 vs 10 at a plus count is the index play');
  assert.equal(d.wasDeviation, true, 'and the record says it departed from the chart');
  assert.equal(d.correctAction, 'S');
});

test('with deviations on, the chart still rules when the count has not crossed the index', () => {
  // Same 16 vs 10, but a cold shoe: below TC 0 the index says hit, not surrender or stand.
  const cold = [...Array(10).fill(10), 10, 10, 6, 7];
  const t = createTable({ shoe: createShoe({ decks: 1, cards: cold }), bankroll: 1000, rules: { deviations: true } });
  for (let i = 0; i < 10; i++) t.shoe.draw();
  assert.ok(t.shoe.trueCount < 0, 'the shoe is genuinely negative before the deal');

  t.deal(100);
  t.stand();
  const d = t.round.decisions[0];
  assert.equal(d.correct, false, 'standing is wrong here');
  assert.equal(d.correctAction, 'H', '16 vs 10 below 0 is a hit (research §3a #2)');
  assert.equal(d.wasDeviation, true, 'the low-side index play is still a departure from the chart');
});

test('deviations stay OFF by default, so the strategy table grades the chart alone', () => {
  const hot = [...Array(10).fill(5), 10, 10, 6, 7];
  const t = createTable({ shoe: createShoe({ decks: 1, cards: hot }), bankroll: 1000 });
  for (let i = 0; i < 10; i++) t.shoe.draw();

  t.deal(100);
  t.stand();
  const d = t.round.decisions[0];
  assert.equal(d.correctAction, 'Rh', 'Mode 1 still teaches basic strategy');
  assert.equal(d.correct, false);
  assert.equal(d.wasDeviation, false);
});

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

test('surrender: lose half the bet, dealer does not draw', () => {
  const t = table([10, 9, 6, 9]); // player 16 vs 9
  t.deal(100);
  assert.ok(t.legalMoves().includes('R'));
  t.surrender();
  assert.equal(t.round.net, -50);
  assert.equal(t.bankroll, 950);
  assert.equal(t.round.dealer.length, 2);
});

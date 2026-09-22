import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createShoe, hiLoTag } from './shoe.js';
import { value, isPair, TEN_RANKS } from './hand.js';
import { cellId } from './strategy.js';

const card = (rank) => ({ rank, value: rank === 'A' ? 11 : TEN_RANKS.includes(rank) ? 10 : rank });

test('hiLoTag: research §2a table, all 10 values', () => {
  const want = { 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 0, 8: 0, 9: 0, 10: -1, A: -1 };
  for (const [rank, tag] of Object.entries(want)) {
    assert.equal(hiLoTag(card(rank === 'A' ? 'A' : Number(rank))), tag, `tag ${rank}`);
  }
});

test('deck composition: balanced shoe drains to running count 0', () => {
  for (const decks of [1, 6]) {
    const s = createShoe({ decks, seed: 1 });
    const n = decks * 52;
    const hist = {};
    let tenValued = 0;
    for (let i = 0; i < n; i++) {
      const c = s.draw();
      hist[c.rank] = (hist[c.rank] || 0) + 1;
      if (c.value === 10) tenValued += 1;
    }
    assert.equal(s.cardsRemaining, 0, `${decks}-deck fully drawn`);
    assert.equal(s.runningCount, 0, `${decks}-deck balanced sums to 0`);
    // Histogram catches a deck-builder typo that a zero-sum test would miss — including dropping
    // one of the faces, which a count of ten-valued cards on its own would not notice.
    for (const r of [2, 3, 4, 5, 6, 7, 8, 9, ...TEN_RANKS, 'A'])
      assert.equal(hist[r], 4 * decks, `count of ${r}`);
    // And the property that actually matters to the maths: sixteen ten-valued cards per deck,
    // however they are spelled.
    assert.equal(tenValued, 16 * decks, 'ten-valued cards per deck');
  }
});

test('the faces are dealt as themselves, and are tens to the engine', () => {
  // The player should see kings; nothing downstream should be able to tell one from a ten.
  const s = createShoe({ decks: 1, seed: 11 });
  const dealt = Array.from({ length: 52 }, () => s.draw());

  const faces = dealt.filter((c) => ['J', 'Q', 'K'].includes(c.rank));
  assert.equal(faces.length, 12, 'a deck deals twelve face cards, not twelve more tens');
  for (const f of faces) assert.equal(f.value, 10, `${f.rank} is worth ten`);
  for (const f of faces) assert.equal(hiLoTag(f), -1, `${f.rank} counts as a ten does`);
});

test('a face card grades exactly as the ten it is worth', () => {
  // The whole change rests on this: rank is decoration, value is the card.
  for (const face of ['J', 'Q', 'K']) {
    assert.equal(value([card(face), card(6)]), 16, `${face},6 is a hard 16`);
    assert.equal(
      cellId([card(face), card(6)], card(10)),
      cellId([card(10), card(6)], card(face)),
      `${face},6 keys the same chart cell as 10,6 — either side of the table`,
    );
    assert.ok(isPair([card(face), card(10)]), `${face} and a ten are a splittable pair`);
  }
});
test('seed reproducibility: same seed -> identical sequence; different seed -> differs', () => {
  const drain = (seed) => {
    const s = createShoe({ decks: 1, seed });
    return Array.from({ length: 52 }, () => s.draw().rank);
  };
  assert.deepEqual(drain(42), drain(42), 'same seed, same order');
  assert.notDeepEqual(drain(42).slice(0, 5), drain(99).slice(0, 5), 'different seed differs early');

  // Same seed -> same deal()
  const a = createShoe({ decks: 6, seed: 7 }).deal();
  const b = createShoe({ decks: 6, seed: 7 }).deal();
  assert.deepEqual(a, b, 'same seed, same deal');
});

test('deal(): hole card is NOT counted until revealed', () => {
  // Rigged order: player<-5, up<-10, player<-6, hole<-A, then dealer draws 2.
  const s = createShoe({ cards: [5, 10, 6, 'A', 2] });
  const { player, dealer } = s.deal();
  assert.deepEqual(player.map((c) => c.rank), [5, 6]);
  assert.deepEqual(dealer.map((c) => c.rank), [10, 'A']);
  assert.equal(s.runningCount, 1, '5(+1) 10(-1) 6(+1), hole A not counted => +1');
  s.playDealer(dealer); // reveal A(-1), hand A,10 = 21, stands
  assert.equal(s.runningCount, 0, 'hole A now counted => 0');
});

test('playDealer: S17 stands on soft 17, H17 hits it', () => {
  // Dealer A,6 = soft 17; next card 5. S17: stands (2 cards). H17: hits.
  // playDealer counts hand[1] as the hole, then draws from the shoe's pile.
  const stand = createShoe({ cards: [5, 9, 2] });
  const soft17 = [card('A'), card(6)];
  stand.playDealer(soft17); // S17
  assert.equal(soft17.length, 2, 'S17 stands on soft 17');

  const h = createShoe({ cards: [4] }); // A,6 + 4 = soft 21, stops
  const soft17b = [card('A'), card(6)];
  h.playDealer(soft17b, { h17: true });
  assert.equal(soft17b.length, 3, 'H17 hits soft 17');

  // Hard 16 always draws; soft 17 via 3 cards (A,2,4) stands under S17.
  const hit = createShoe({ cards: [10] });
  const hard16 = [card(10), card(6)];
  hit.playDealer(hard16);
  assert.equal(value(hard16) >= 17, true, 'hard 16 drew to >=17');

  const soft = createShoe({ cards: [] });
  const a24 = [card('A'), card(2), card(4)]; // soft 17, 3 cards
  soft.playDealer(a24);
  assert.equal(a24.length, 3, 'soft 17 at 3 cards stands (S17)');
  assert.equal(value(a24), 17, 'A,2,4 is soft 17');
});

test('trueCount and penetration cut', () => {
  // 26 twos then 26 tens in a 52-card rig; draw 26 -> RC 26, 0.5 decks left, TC 52.
  const rig = [...Array(26).fill(2), ...Array(26).fill(10)];
  const s = createShoe({ decks: 1, cards: rig });
  for (let i = 0; i < 26; i++) s.draw();
  assert.equal(s.runningCount, 26);
  assert.equal(s.decksRemaining, 0.5);
  assert.equal(s.trueCount, 52);

  // penetration 4.5 on 6 decks => cut at 234 cards.
  const p = createShoe({ decks: 6, penetration: 4.5, seed: 3 });
  for (let i = 0; i < 233; i++) p.draw();
  assert.equal(p.needsShuffle, false, 'not yet at cut (233)');
  p.draw();
  assert.equal(p.needsShuffle, true, 'at cut (234)');
});

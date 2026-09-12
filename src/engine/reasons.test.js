import { test } from 'node:test';
import assert from 'node:assert/strict';
import { explain } from './reasons.js';

const c = (rank) => ({ rank, value: rank === 'A' ? 11 : rank });
const h = (...ranks) => ranks.map(c);

// Discriminator checks: the right family fires, not exact wording (templates can be reworded freely).
test('explain routes each situation family to a distinct heuristic', () => {
  assert.match(explain(h('A', 'A'), c(6), 'P'), /aces/i);
  assert.match(explain(h(8, 8), c(10), 'P'), /eights/i);
  assert.match(explain(h(10, 10), c(6), 'S'), /twenty/i);
  assert.match(explain(h(5, 5), c(6), 'D'), /fives|hard ten/i);
  assert.match(explain(h('A', 7), c(4), 'Ds'), /double/i); // legal soft double
  assert.match(explain(h(10, 6), c(10), 'Rh'), /surrender/i);
  assert.match(explain(h(5, 6), c(6), 'D'), /eleven/i); // hard 11
  assert.match(explain(h(10, 6), c(5), 'S'), /stiff/i); // 16 vs bust card: stand
  assert.match(explain(h(10, 6), c(10), 'H'), /stiff|hands the dealer/i); // 16 vs 10: hit
});

// Ds/Rh that reconciled to a legal button (3-card hands) must read sensibly, not "double"/"surrender".
test('reconciled 3-card hands get the collapsed-action reason, not the chart code', () => {
  assert.match(explain(h(5, 3, 3), c(6), 'H'), /too low|build/i); // 3-card 11 -> H, not "double"
  assert.doesNotMatch(explain(h(10, 3, 3), c(10), 'H'), /surrender/i); // 3-card 16 -> H, not "surrender"
  assert.match(explain(h('A', 2, 5), c(6), 'S'), /eighteen|stand/i); // 3-card soft 18 -> S
});

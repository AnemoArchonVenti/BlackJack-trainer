<script>
  // End-of-round graded recap (SPEC §11 F6): every decision with ✓/✗, the correct action, and the
  // heuristic "why". Sits beside the felt (desktop) / below it (mobile). Engine already graded
  // each decision (round.js record()); this just renders and pulls the reason text.
  //
  // Editorial skin (DESIGN-SPEC §5.6): a ledger, not a card. Each decision states the situation
  // in words, the verdict in small tracked mono, and — when you missed it — what the book says,
  // then why. Nothing is boxed; hairlines separate the entries.
  import { explain } from '../engine/reasons.js';
  import { cellFor } from '../engine/strategy.js';
  import { value } from '../engine/hand.js';
  import { cellStats } from './session.svelte.js';
  import { money } from './money.js';

  let { decisions = [], net = 0, stats = null, onCell = null } = $props();

  // The correct action, said the way the book would say it (lower case, mid-sentence).
  const SAYS = {
    H: 'hit', S: 'stand', D: 'double', P: 'split', R: 'surrender',
    Ds: 'double, or stand if you cannot', Rh: 'surrender, or hit if you cannot',
  };
  // The verdict is what you did, in the past tense.
  const DID = { H: 'HIT', S: 'STOOD', D: 'DOUBLED', P: 'SPLIT', R: 'SURRENDERED' };

  const upcard = (up) => (up === 11 ? 'an ace' : `a ${up}`);
  const pairRank = (key) => (key === 11 ? 'aces' : `${key}s`);

  // "Hard 12 against a 3" / "Soft 18 against a 9" / "A pair of 8s against a 10".
  // The upcard comes off the cell, which carries it as a number — `d.upcard` is the card object.
  function situation(d) {
    const cell = cellFor(d.hand, d.upcard);
    if (cell.type === 'pair') return `A pair of ${pairRank(cell.key)} against ${upcard(cell.up)}`;
    return `${cell.type === 'soft' ? 'Soft' : 'Hard'} ${value(d.hand)} against ${upcard(cell.up)}`;
  }

  // A miss also links its chart cell, tying the mistake to the heatmap mental model (#5 F6).
  // Following it launches a targeted drill of that exact situation.
  const ROW = {
    hard: (k) => (k === 17 ? '17+' : `${k}`),
    soft: (k) => `A,${k}`,
    pair: (k) => (k === 11 ? 'A,A' : `${k},${k}`),
  };
  const drillLabel = (c) => `Drill ${ROW[c.type](c.key)} against ${c.up === 11 ? 'an ace' : c.up}`;
  const cellKey = (c) => `${c.type}-${c.key}-${c.up}`;
  const hint = (s) => (s.attempts ? `${s.correct}/${s.attempts} correct here · ${s.bucket}` : 'first look at this cell');

  const result = $derived(net > 0 ? `Won ${money(net)}` : net < 0 ? `Lost ${money(net)}` : 'Push');
  const tone = $derived(net > 0 ? 'win' : net < 0 ? 'lose' : 'push');
  const pct = (n) => (n === null ? '—' : `${Math.round(n * 100)}%`);
</script>

<aside class="review" aria-live="polite" aria-label="Round review">
  <div class="head">
    <h2>The last hand, reviewed</h2>
    <span class="result {tone}">{result}</span>
  </div>

  <ol>
    {#each decisions as d, i (i)}
      <li>
        <div class="line">
          <span class="situation">{situation(d)}</span>
          <span class="verdict" class:wrong={!d.correct}>
            {DID[d.chosen]} {d.correct ? '✓' : '✗'}
          </span>
        </div>

        {#if !d.correct}
          {@const cell = cellFor(d.hand, d.upcard)}
          <p class="book">The book says {SAYS[d.correctAction]}.</p>
          <p class="why">{explain(d.hand, d.upcard, d.correctAction)}</p>
          <button class="drill" onclick={() => onCell?.(cell)} disabled={!onCell} title={hint(cellStats(cellKey(cell)))}>
            {drillLabel(cell)}
          </button>
        {:else}
          <p class="why">{explain(d.hand, d.upcard, d.correctAction)}</p>
        {/if}
      </li>
    {/each}
  </ol>

  {#if stats}
    <dl class="totals">
      <div><dt>Decisions this session</dt><dd>{stats.decisions}</dd></div>
      <div><dt>Accuracy</dt><dd>{pct(stats.accuracy)}</dd></div>
      <div><dt>Hands</dt><dd>{stats.hands}</dd></div>
    </dl>
  {/if}
</aside>

<style>
  .review {
    grid-column: 9 / span 4;
    display: flex; flex-direction: column;
    border-top: 1px solid var(--rule);
    align-self: stretch;
  }

  .head { display: flex; justify-content: space-between; align-items: baseline; gap: var(--s-3); padding: 18px 0 14px; }
  h2 { margin: 0; font-size: 26px; font-weight: 500; letter-spacing: -0.01em; }
  .result { font-family: var(--mono); font-size: 12px; white-space: nowrap; }
  .result.win { color: var(--good); }
  .result.lose { color: var(--danger); }
  .result.push { color: var(--text); }

  ol { list-style: none; margin: 0; padding: 0; }
  li {
    display: flex; flex-direction: column; gap: var(--s-2);
    padding: 18px 0; border-top: 1px solid var(--border);
  }
  .line { display: flex; justify-content: space-between; align-items: baseline; gap: var(--s-3); }
  .situation { font-size: 16px; font-weight: 500; color: var(--text-h); }
  .verdict {
    font-family: var(--mono); font-size: 12px; letter-spacing: 0.08em;
    color: var(--good); white-space: nowrap;
  }
  .verdict.wrong { color: var(--danger); }

  .book { font-family: var(--heading); font-style: italic; font-size: 15px; color: var(--text-h); }
  .why { font-size: 14px; line-height: 1.55; color: var(--text); text-wrap: pretty; }

  .drill {
    align-self: flex-start; margin-top: var(--s-1); padding: 0 0 2px;
    background: none; border: none; border-bottom: 1px solid var(--text-h);
    color: var(--text-h); font: inherit; font-size: 14px; cursor: pointer;
  }
  .drill:hover:not(:disabled) { color: var(--accent); border-bottom-color: var(--accent); }
  .drill:disabled { cursor: default; border-bottom-color: var(--border); }

  /* The session ledger, pinned to the foot of the column. */
  .totals {
    margin: auto 0 0; padding-top: 18px; border-top: 1px solid var(--rule);
    display: flex; flex-direction: column; gap: 10px;
  }
  .totals div { display: flex; justify-content: space-between; gap: var(--s-3); font-size: 14px; }
  dt { color: var(--text); }
  dd { margin: 0; color: var(--text-h); font-variant-numeric: tabular-nums; }

  @media (max-width: 960px) {
    .review { grid-column: 1; }
  }
</style>

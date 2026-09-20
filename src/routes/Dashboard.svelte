<script>
  // The landing hub (SPEC §11 F3) and the guided path (#8): where you are, and one prominent
  // thing to do next. The recommendation comes from the mastery gates in srs/gates.js, which read
  // persisted progress. It is a suggestion and nothing else — every mode stays one click away in
  // the nav whatever the gates say (SPEC Q5=C).
  //
  // Editorial skin (DESIGN-SPEC §5.2): a magazine opening. The green "Continue" panel is gone;
  // the recommendation is now the headline itself, and the page states which chapter you are on.
  // Everything else is set in rules and space — no boxes, no shadows.
  import Chart from '../lib/Chart.svelte';
  import { hrefFor, ROUTES } from './router.js';
  import { bucketCounts, recentAccuracy, gateProgress, nextStep, heatmap, session } from '../lib/session.svelte.js';
  import { CLEAN_RUNS_TO_PASS } from '../engine/drills.js';
  import { STRATEGY_ACCURACY, STRATEGY_WINDOW } from '../srs/gates.js';
  import { money } from '../lib/money.js';

  const counts = $derived(bucketCounts());
  const recent = $derived(recentAccuracy(50));
  const gates = $derived(gateProgress());
  const next = $derived(nextStep());
  const blurb = $derived(ROUTES.find((r) => r.id === next.route)?.blurb ?? '');
  const totalCells = $derived(heatmap().length);

  const pct = (n) => (n === null ? '—' : `${Math.round(n * 100)}%`);
  const secs = (ms) => (ms === null ? '—' : `${(ms / 1000).toFixed(1)}s`);

  // Each rung of the path is a chapter, and the hero leads with the one you are on.
  const CHAPTER = {
    play: { word: 'one', headline: 'Start with basic strategy.', cta: 'Play a hand' },
    counting: { word: 'two', headline: 'Now, card counting.', cta: 'Start a drill' },
    deviations: { word: 'three', headline: 'Now, the deviations.', cta: 'Start the flashcards' },
    integration: { word: 'four', headline: 'The integration table.', cta: 'Open the table' },
  };
  const chapter = $derived(CHAPTER[next.route] ?? CHAPTER.play);

  // The rungs of the path, in order (SPEC §6). `done` drives the tick, never a lock.
  const path = $derived([
    {
      id: 'play',
      numeral: 'I.',
      name: 'Basic strategy',
      done: gates.strategy.passed,
      detail: `${pct(gates.strategy.accuracy)} over ${gates.strategy.decisions}/${STRATEGY_WINDOW} decisions · ${gates.strategy.learningCells} still in Learning`,
      target: `${Math.round(STRATEGY_ACCURACY * 100)}% and nothing left in Learning`,
    },
    {
      id: 'counting',
      numeral: 'II.',
      name: 'Card counting',
      done: gates.counting.passed,
      detail: `best ${secs(gates.counting.bestMs)} · ${gates.counting.cleanRuns}/${CLEAN_RUNS_TO_PASS} clean runs`,
      target: `a deck under 30s, ${CLEAN_RUNS_TO_PASS} times in a row`,
    },
    {
      id: 'deviations',
      numeral: 'III.',
      name: 'Deviations',
      done: gates.deviations.passed,
      detail: gates.deviations.suggested
        ? `${gates.deviations.total - gates.deviations.remaining}/${gates.deviations.total} indices learned`
        : 'sits behind strategy and counting',
      target: 'every index out of New and Learning',
    },
    {
      id: 'integration',
      numeral: 'IV.',
      name: 'The integration table',
      done: false,
      detail: gates.deviations.passed
        ? 'open — count it, bet it and deviate, all at once'
        : 'the capstone, once the three below are in place',
      target: 'the whole game, graded per shoe',
    },
  ]);
</script>

<div class="dash">
  <section class="hero">
    <span class="kicker">Chapter {chapter.word}</span>
    <h1>{chapter.headline}</h1>
    <p class="lead">{blurb}. {next.why}</p>
    <div class="actions">
      <a class="primary" href={hrefFor(next.route)}>{chapter.cta}</a>
      <a class="textlink" href={hrefFor('progress')}>Read the chart first</a>
    </div>
  </section>

  <aside class="stats" aria-label="Your progress at a glance">
    <div class="stat">
      <span class="label">Strategy, last 50 decisions</span>
      <span class="figure">{pct(recent)}</span>
    </div>
    <div class="stat">
      <span class="label">Best clean deck countdown</span>
      <span class="figure">{secs(gates.counting.bestMs)}</span>
    </div>
    <div class="stat">
      <span class="label">Bankroll</span>
      <span class="figure">{money(session.bankroll)}</span>
    </div>
    <div class="stat">
      <span class="label">Cells mastered</span>
      <span class="figure">{counts.Mastered} <span class="of">of {totalCells}</span></span>
    </div>
  </aside>

  <section class="path" aria-label="The path">
    <ol>
      {#each path as step (step.id)}
        <li class:current={step.id === next.route}>
          <span class="numeral" aria-hidden="true">{step.numeral}</span>
          <span class="name">
            <a href={hrefFor(step.id)}>{step.name}</a>
            {#if step.id === next.route}<span class="tag now">now</span>{/if}
            {#if step.done}<span class="tag">passed</span>{/if}
          </span>
          <span class="detail">{step.detail} · Gate: {step.target}</span>
        </li>
      {/each}
    </ol>
    <p class="note">Suggestions, not locks. Every mode is open in the nav.</p>
  </section>

  <a class="thumb" href={hrefFor('progress')} aria-label="Open the accuracy heatmap">
    <span class="label">Your accuracy, cell by cell</span>
    <div class="thumbwrap"><Chart compact view="accuracy" /></div>
    <span class="textlink">Open the full chart</span>
  </a>
</div>

<style>
  .dash {
    max-width: var(--content); margin: 0 auto; padding: 64px var(--pad) 48px;
    display: grid; grid-template-columns: repeat(12, minmax(0, 1fr));
    column-gap: var(--gutter); row-gap: 56px; text-align: left;
  }

  /* ── Hero ── */
  .hero { grid-column: 1 / span 7; display: flex; flex-direction: column; gap: 22px; }
  .kicker {
    font-family: var(--mono); font-size: 12px; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--accent);
  }
  h1 {
    margin: 0; font-size: clamp(40px, 5.6vw, 64px); line-height: 1.02;
    font-weight: 500; letter-spacing: -0.02em;
  }
  .lead { font-size: 19px; line-height: 1.55; color: var(--text); max-width: 560px; text-wrap: pretty; }
  .actions { display: flex; align-items: center; gap: var(--s-4); margin-top: var(--s-1); flex-wrap: wrap; }
  .primary {
    padding: 16px 28px; border-radius: var(--r-sm);
    background: var(--accent); color: var(--on-btn);
    font-size: 16px; font-weight: 500; text-decoration: none;
  }
  .primary:hover { background: var(--text-h); }
  .textlink {
    font-size: 16px; color: var(--text-h); text-decoration: none;
    border-bottom: 1px solid currentColor; padding-bottom: 2px;
  }
  .textlink:hover { color: var(--accent); }

  /* ── Stats column: a hairline list, ink rule on top ── */
  .stats { grid-column: 9 / span 4; border-top: 1px solid var(--rule); }
  .stat {
    display: flex; justify-content: space-between; align-items: baseline; gap: var(--s-3);
    padding: 16px 0; border-bottom: 1px solid var(--border);
  }
  .label { font-size: 14px; color: var(--text); }
  .figure {
    font-family: var(--heading); font-size: 30px; font-weight: 500; color: var(--text-h);
    font-variant-numeric: tabular-nums; white-space: nowrap;
  }
  .of { font-size: 16px; color: var(--text); }

  /* ── The path ── */
  .path { grid-column: 1 / span 8; display: flex; flex-direction: column; gap: var(--s-3); }
  .path ol { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--rule); }
  .path li {
    display: grid; grid-template-columns: 72px 1fr 1fr; gap: var(--s-4); align-items: baseline;
    padding: 18px 0; border-bottom: 1px solid var(--border);
  }
  .numeral { font-family: var(--heading); font-size: 22px; color: var(--text); }
  .current .numeral { color: var(--accent); }
  .name { font-size: 17px; font-weight: 500; }
  .name a { color: var(--text-h); text-decoration: none; }
  .name a:hover { color: var(--accent); text-decoration: underline; }
  .tag {
    margin-left: 10px; font-family: var(--mono); font-size: 11px;
    letter-spacing: 0.1em; text-transform: uppercase; color: var(--text); font-weight: 400;
  }
  .tag.now { color: var(--accent); }
  .detail { font-size: 14px; color: var(--text); text-wrap: pretty; }
  .note { font-size: 14px; color: var(--text); }

  /* ── Heatmap thumbnail ── */
  .thumb {
    grid-column: 9 / span 4; display: flex; flex-direction: column; gap: 14px;
    text-decoration: none; align-items: flex-start;
  }
  .thumbwrap { width: 100%; }
  .thumb .textlink { font-size: 15px; }

  @media (max-width: 960px) {
    .dash { grid-template-columns: 1fr; row-gap: 40px; padding-top: 40px; }
    .hero, .stats, .path, .thumb { grid-column: 1; }
    .path li { grid-template-columns: 40px 1fr; row-gap: var(--s-1); }
    .path .detail { grid-column: 2; }
  }
</style>

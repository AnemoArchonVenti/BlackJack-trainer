<script>
  // The landing hub (SPEC §11 F3) and the guided path (#8): where you are, and one prominent
  // thing to do next. The recommendation comes from the mastery gates in srs/gates.js, which read
  // persisted progress. It is a suggestion and nothing else — every mode stays one click away in
  // the nav whatever the gates say (SPEC Q5=C).
  import Chart from '../lib/Chart.svelte';
  import { hrefFor, ROUTES } from './router.js';
  import { bucketCounts, recentAccuracy, gateProgress, nextStep, session } from '../lib/session.svelte.js';
  import { CLEAN_RUNS_TO_PASS } from '../engine/drills.js';
  import { STRATEGY_ACCURACY, STRATEGY_WINDOW } from '../srs/gates.js';

  const counts = $derived(bucketCounts());
  const recent = $derived(recentAccuracy(50));
  const played = $derived(Object.values(counts).reduce((a, b) => a + b, 0));
  const gates = $derived(gateProgress());
  const next = $derived(nextStep());
  const blurb = $derived(ROUTES.find((r) => r.id === next.route)?.blurb ?? '');

  const pct = (n) => (n === null ? '—' : `${Math.round(n * 100)}%`);
  const secs = (ms) => (ms === null ? '—' : `${(ms / 1000).toFixed(1)}s`);

  // The three rungs of the path, in order (SPEC §6). `done` drives the tick, never a lock.
  const path = $derived([
    {
      id: 'play',
      name: 'Basic strategy',
      done: gates.strategy.passed,
      detail: `${pct(gates.strategy.accuracy)} over ${gates.strategy.decisions}/${STRATEGY_WINDOW} decisions · ${gates.strategy.learningCells} still in Learning`,
      target: `${Math.round(STRATEGY_ACCURACY * 100)}% and nothing left in Learning`,
    },
    {
      id: 'counting',
      name: 'Card counting',
      done: gates.counting.passed,
      detail: `best ${secs(gates.counting.bestMs)} · ${gates.counting.cleanRuns}/${CLEAN_RUNS_TO_PASS} clean runs`,
      target: `a deck under 30s, ${CLEAN_RUNS_TO_PASS} times in a row`,
    },
    {
      id: 'deviations',
      name: 'Deviations',
      done: false,
      detail: gates.deviations.suggested ? 'open — the chart and the count are solid' : 'sits behind strategy and counting',
      target: 'Illustrious 18 + Fab 4',
    },
  ]);
</script>

<section class="dash">
  <a class="continue" href={hrefFor(next.route)}>
    <span class="kicker">Continue</span>
    <span class="target">{next.label} <span aria-hidden="true">→</span></span>
    <span class="blurb">{next.why}</span>
    <span class="blurb faint">{blurb}</span>
  </a>

  <section class="path" aria-label="Guided path">
    <h2 class="path-head">
      Guided path <span class="note">— suggestions, not locks. Every mode is open in the nav.</span>
    </h2>
    <ol>
      {#each path as step (step.id)}
        <li class:done={step.done} class:current={step.id === next.route}>
          <span class="tick" aria-hidden="true">{step.done ? '✓' : step.id === next.route ? '›' : '·'}</span>
          <div>
            <a href={hrefFor(step.id)}>{step.name}</a>
            {#if step.done}<span class="badge">passed</span>{/if}
            <p class="detail">{step.detail}</p>
            <p class="detail faint">Gate: {step.target}</p>
          </div>
        </li>
      {/each}
    </ol>
  </section>

  <div class="cards">
    <article class="snapshot">
      <h2>Strategy</h2>
      <p class="big">{pct(recent)}</p>
      <p class="sub">over your last 50 decisions</p>
      <dl class="buckets">
        {#each Object.entries(counts) as [bucket, n] (bucket)}
          <div><dt>{bucket}</dt><dd>{n}</dd></div>
        {/each}
      </dl>
    </article>

    <article class="snapshot">
      <h2>Counting</h2>
      <p class="big">{secs(gates.counting.bestMs)}</p>
      <p class="sub">best clean deck countdown</p>
      <p class="sub">Clean-run streak {gates.counting.cleanRuns}/{CLEAN_RUNS_TO_PASS}</p>
    </article>

    <article class="snapshot">
      <h2>Bankroll</h2>
      <p class="big">${session.bankroll}</p>
      <p class="sub">{played ? `${played} chart cells practised` : 'no hands played yet'}</p>
    </article>

    <a class="snapshot thumb" href={hrefFor('progress')} aria-label="Open the accuracy heatmap">
      <h2>Accuracy heatmap</h2>
      <div class="thumbwrap"><Chart compact view="accuracy" /></div>
      <p class="sub">Open the full chart <span aria-hidden="true">→</span></p>
    </a>
  </div>
</section>

<style>
  .dash {
    max-width: 1120px; margin: 1rem auto 0; padding: 0 clamp(0.75rem, 3vw, 1.5rem);
    display: flex; flex-direction: column; gap: 1.2rem; text-align: left;
  }
  .continue {
    display: flex; flex-direction: column; gap: 0.15rem; text-decoration: none;
    padding: 1.1rem 1.3rem; border-radius: var(--r-lg);
    background: linear-gradient(135deg, var(--felt), var(--felt-edge));
    color: var(--on-felt-strong); box-shadow: var(--shadow);
  }
  .kicker { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.85; }
  .target { font-size: 1.35rem; font-weight: 700; }
  .blurb { font-size: 0.85rem; opacity: 0.9; }
  .faint { opacity: 0.65; font-size: 0.78rem; }

  .path {
    border: 1px solid var(--border); border-radius: var(--r-lg);
    background: var(--panel); padding: 0.9rem 1.1rem;
  }
  .path-head { margin: 0 0 0.6rem; font-size: 0.82rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text); }
  .note { text-transform: none; letter-spacing: 0; font-weight: 400; opacity: 0.85; }
  .path ol { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; }
  .path li { display: flex; gap: 0.6rem; align-items: flex-start; }
  .tick { font-weight: 800; width: 1rem; color: var(--text); }
  .path li.done .tick { color: var(--good); }
  .path li.current .tick { color: var(--accent); }
  .path a { color: var(--text-h); font-weight: 600; font-size: 0.92rem; text-decoration: none; }
  .path a:hover { text-decoration: underline; }
  .badge {
    margin-left: 0.4rem; font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.06em;
    background: var(--accent-bg); color: var(--text-h); padding: 0.1rem 0.35rem; border-radius: 999px;
  }
  .detail { font-size: 0.78rem; opacity: 0.85; margin: 0.1rem 0 0; }

  .cards { display: grid; gap: 0.9rem; grid-template-columns: repeat(auto-fit, minmax(13rem, 1fr)); }
  .snapshot {
    border: 1px solid var(--border); border-radius: var(--r-lg); padding: 0.9rem 1.1rem;
    background: var(--panel); display: flex; flex-direction: column; gap: 0.25rem;
    color: inherit; text-decoration: none;
  }
  .snapshot h2 { margin: 0; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text); font-weight: 600; }
  .big { font-size: 1.9rem; font-weight: 700; color: var(--text-h); margin: 0; line-height: 1.1; }
  .sub { font-size: 0.76rem; opacity: 0.8; margin: 0; }
  .buckets { display: flex; flex-wrap: wrap; gap: 0.3rem; margin: 0.4rem 0 0; }
  .buckets div { border: 1px solid var(--border); border-radius: var(--r-sm); padding: 0.2rem 0.4rem; }
  dt { font-size: 0.62rem; color: var(--text); }
  dd { margin: 0; font-weight: 700; font-size: 0.85rem; color: var(--text-h); }
  .thumb:hover { border-color: var(--accent-border); }
  .thumbwrap { display: flex; gap: 0.35rem; padding: 0.3rem 0; }
</style>

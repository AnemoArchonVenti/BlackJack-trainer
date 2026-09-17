<script>
  // The landing hub (SPEC §11 F3): where you are, and one prominent thing to do next.
  // Progress snapshot = heatmap thumbnail + bucket counts + bankroll; the Continue CTA is the
  // guided path's single recommendation.
  // ponytail: the recommendation is a fixed "start with strategy" until #8 lands the mastery
  // gates — this component reads `recommended`, so #8 only has to swap where that comes from.
  import Chart from '../lib/Chart.svelte';
  import { hrefFor, MODES } from './router.js';
  import { bucketCounts, recentAccuracy, session } from '../lib/session.svelte.js';
  import { CLEAN_RUNS_TO_PASS } from '../engine/drills.js';

  const counts = $derived(bucketCounts());
  const recent = $derived(recentAccuracy(50));
  const played = $derived(Object.values(counts).reduce((a, b) => a + b, 0));

  const recommended = $derived(
    MODES.find((m) => m.id === 'play')
  );
  const pct = (n) => (n === null ? '—' : `${Math.round(n * 100)}%`);
</script>

<section class="dash">
  <a class="continue" href={hrefFor(recommended.id)}>
    <span class="kicker">Continue</span>
    <span class="target">{recommended.label} <span aria-hidden="true">→</span></span>
    <span class="blurb">{recommended.blurb}</span>
  </a>

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
      <p class="big">{session.gates.countdownBestMs ? `${(session.gates.countdownBestMs / 1000).toFixed(1)}s` : '—'}</p>
      <p class="sub">best clean deck countdown</p>
      <p class="sub">Clean-run streak {session.gates.cleanRuns}/{CLEAN_RUNS_TO_PASS}</p>
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

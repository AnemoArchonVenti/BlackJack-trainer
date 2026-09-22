<script>
  // Mode 2: isolated counting drills (SPEC §5.2, research §2d). Three drills that build counting
  // speed before it has to happen at the table. All grading comes from engine/drills.js, which
  // grades against the shoe's ground truth — the UI never counts anything itself.
  //
  // Editorial skin (DESIGN-SPEC §5.9): the tab bar becomes the nav's underline, the panel loses
  // its border for a top ink rule, and the drill's live number — cards left, elapsed, the true
  // count you type — is set big in the serif, because that number is the drill.
  import {
    createTagDrill, createCountdownDrill, createTrueCountDrill,
    COUNTDOWN_TARGET_MS, COUNTDOWN_STRETCH_MS, CLEAN_RUNS_TO_PASS,
  } from '../engine/drills.js';
  import { session, recordCountdownRun } from './session.svelte.js';
  import Card from './Card.svelte';
  import { suitFor } from './suits.js';
  import { cue } from './audio.js';

  const DRILLS = [
    ['tag', 'Tag speed'],
    ['countdown', 'Deck countdown'],
    ['truecount', 'True count'],
  ];
  let drill = $state('tag');
  const secs = (ms) => `${(ms / 1000).toFixed(1)}s`;

  // ── (a) Tag speed ───────────────────────────────────────────────────────────────────────
  let tag = $state({ drill: null, card: null, feedback: null, asked: 0, correct: 0 });
  function tagNext() {
    tag.drill ??= createTagDrill({});
    tag.card = tag.drill.deal();
    tag.feedback = null;
  }
  function tagAnswer(value) {
    if (!tag.card || tag.feedback) return;
    const r = tag.drill.answer(value);
    tag.feedback = r;
    Object.assign(tag, tag.drill.stats);
    cue(r.correct ? 'correct' : 'wrong');
    setTimeout(tagNext, r.correct ? 220 : 900); // a wrong answer lingers so the right tag registers
  }

  // ── (b) Deck countdown ──────────────────────────────────────────────────────────────────
  let cd = $state({ drill: null, card: null, left: 52, startedAt: 0, elapsed: 0, called: 0, result: null });
  function cdStart() {
    cd.drill = createCountdownDrill({});
    cd.card = null;
    cd.left = 52;
    cd.startedAt = 0;
    cd.elapsed = 0;
    cd.called = 0;
    cd.result = null;
  }
  function cdFlip() {
    if (!cd.drill || cd.result) return;
    cd.startedAt ||= performance.now(); // the clock starts on the first card, not on Start
    const card = cd.drill.next();
    if (card) {
      cd.card = card;
      cd.left = cd.drill.remaining;
      cue('deal');
    } else {
      cd.elapsed = performance.now() - cd.startedAt;
    }
  }
  function cdFinish() {
    cd.result = cd.drill.finish(cd.called, Math.round(cd.elapsed));
    recordCountdownRun(cd.result);
    cue(cd.result.clean ? 'correct' : 'wrong');
  }

  // ── (c) True-count conversion ───────────────────────────────────────────────────────────
  let tc = $state({ drill: null, question: null, answer: 0, result: null, asked: 0, correct: 0 });
  function tcNext() {
    tc.drill ??= createTrueCountDrill({});
    tc.question = tc.drill.deal();
    tc.answer = 0;
    tc.result = null;
  }
  function tcSubmit() {
    if (!tc.question || tc.result) return;
    tc.result = tc.drill.answer(tc.answer);
    tc.asked += 1;
    if (tc.result.correct) tc.correct += 1;
    cue(tc.result.correct ? 'correct' : 'wrong');
  }

  function onkey(e) {
    if (e.target.tagName === 'INPUT') return;
    if (drill === 'tag') {
      if (e.key === '+' || e.key === '=' || e.key === 'ArrowUp') tagAnswer(1);
      else if (e.key === '0' || e.key === 'ArrowRight') tagAnswer(0);
      else if (e.key === '-' || e.key === 'ArrowDown') tagAnswer(-1);
    } else if (drill === 'countdown' && e.key === ' ') {
      e.preventDefault();
      cd.drill ? cdFlip() : cdStart();
    } else if (drill === 'truecount' && e.key === 'Enter') {
      tc.result ? tcNext() : tcSubmit();
    }
  }
</script>

<svelte:window onkeydown={onkey} />

<section class="counting">
  <h1>Counting</h1>

  <nav class="tabs" aria-label="Counting drills">
    {#each DRILLS as [id, label] (id)}
      <button class:on={drill === id} onclick={() => (drill = id)}>{label}</button>
    {/each}
  </nav>

  {#if drill === 'tag'}
    <div class="panel">
      <p class="lead">Call the Hi-Lo tag as fast as you can. 2–6 are +1, 7–9 are 0, tens and aces are −1.</p>
      <div class="stage">
        <div class="inner">
          {#if tag.card}
            <Card rank={tag.card.rank} suit={suitFor(tag.card)} />
          {:else}
            <button class="primary" onclick={tagNext}>Start</button>
          {/if}
        </div>
      </div>
      <div class="moves">
        <button class="action" onclick={() => tagAnswer(1)} disabled={!tag.card}>+1 <kbd>+</kbd></button>
        <button class="action" onclick={() => tagAnswer(0)} disabled={!tag.card}>0 <kbd>0</kbd></button>
        <button class="action" onclick={() => tagAnswer(-1)} disabled={!tag.card}>−1 <kbd>−</kbd></button>
      </div>
      <p class="verdict" aria-live="polite">
        {#if tag.feedback}
          <span class:bad={!tag.feedback.correct}>
            {tag.feedback.correct ? '✓' : `✗ that card is ${tag.feedback.expected > 0 ? '+1' : tag.feedback.expected}`}
          </span>
        {/if}
      </p>
      <p class="score">{tag.asked ? `${tag.correct}/${tag.asked} correct` : ''}</p>
    </div>
  {:else if drill === 'countdown'}
    <div class="panel">
      <p class="lead">
        Count down a full deck and end on the right running count — a balanced deck comes back to zero.
        Target under {secs(COUNTDOWN_TARGET_MS)} ({secs(COUNTDOWN_STRETCH_MS)} is the stretch goal),
        {CLEAN_RUNS_TO_PASS} clean runs in a row to pass.
      </p>
      <div class="stage">
        <div class="inner">
          {#if !cd.drill}
            <button class="primary" onclick={cdStart}>Start a deck</button>
          {:else if cd.left > 0}
            {#if cd.card}<Card rank={cd.card.rank} suit={suitFor(cd.card)} />{/if}
            <p class="readout"><b>{cd.left}</b> <span class="unit">cards left</span></p>
            <button class="primary" onclick={cdFlip}>{cd.card ? 'Next' : 'Flip'} <kbd>space</kbd></button>
          {:else if !cd.result}
            <p class="readout"><b>{secs(cd.elapsed)}</b> <span class="unit">elapsed</span></p>
            <label>
              Final running count
              <input type="number" bind:value={cd.called} />
            </label>
            <button class="primary" onclick={cdFinish}>Grade this run</button>
          {:else}
            <p class="readout"><b>{secs(cd.result.elapsedMs)}</b> <span class="unit">elapsed</span></p>
            <button class="primary" onclick={cdStart}>Run it again</button>
          {/if}
        </div>
      </div>
      <p class="verdict" aria-live="polite">
        {#if cd.result}
          <span class:bad={!cd.result.clean}>
            {cd.result.correct ? `✓ ${cd.result.expected}` : `✗ you said ${cd.called}, the deck was ${cd.result.expected}`}
            · {secs(cd.result.elapsedMs)}{#if cd.result.clean} · clean run{#if cd.result.stretch} at stretch pace{/if}{/if}
          </span>
        {/if}
      </p>
      <p class="score">
        Streak {session.gates.cleanRuns}/{CLEAN_RUNS_TO_PASS}{#if session.gates.countdownBestMs} · best {secs(session.gates.countdownBestMs)}{/if}
      </p>
    </div>
  {:else}
    <div class="panel">
      <p class="lead">Divide the running count by the decks remaining, then round to the nearest whole true count.</p>
      <div class="stage">
        <div class="inner tcq">
          {#if tc.question}
            <p class="question">
              Running count <b>{tc.question.runningCount > 0 ? '+' : ''}{tc.question.runningCount}</b>,
              <b>{tc.question.decksRemaining}</b> decks remaining
            </p>
            <label>
              True count
              <input type="number" bind:value={tc.answer} />
            </label>
            {#if tc.result}
              <button class="primary" onclick={tcNext}>Next <kbd>enter</kbd></button>
            {:else}
              <button class="primary" onclick={tcSubmit}>Check <kbd>enter</kbd></button>
            {/if}
          {:else}
            <button class="primary" onclick={tcNext}>Start</button>
          {/if}
        </div>
      </div>
      <p class="verdict" aria-live="polite">
        {#if tc.result}
          <span class:bad={!tc.result.correct}>
            {tc.result.correct ? '✓' : '✗'} exact true count {tc.result.expected.toFixed(2)}
          </span>
        {/if}
      </p>
      <p class="score">{tc.asked ? `${tc.correct}/${tc.asked} correct` : ''}</p>
    </div>
  {/if}
</section>

<style>
  .counting {
    max-width: 46rem; margin: 0 auto; padding: 40px var(--pad) 48px;
    display: flex; flex-direction: column; gap: var(--s-4); text-align: left;
  }
  h1 { margin: 0; font-size: 40px; font-weight: 500; letter-spacing: -0.02em; }

  /* The nav's underline, reused as a tab bar — no pills anywhere in the app. */
  .tabs { display: flex; gap: var(--s-4); }
  .tabs button {
    padding: 0 0 6px; border: none; border-bottom: 2px solid transparent; background: none;
    color: var(--text); font: inherit; font-size: 15px; cursor: pointer;
  }
  .tabs button:hover { color: var(--text-h); }
  .tabs button.on { color: var(--text-h); font-weight: 500; border-bottom-color: var(--accent); }

  .panel {
    display: flex; flex-direction: column; gap: var(--s-3); align-items: flex-start;
    border-top: 1px solid var(--rule); padding-top: var(--s-4);
  }
  .lead { font-size: 17px; line-height: 1.55; color: var(--text); max-width: 34rem; text-wrap: pretty; }

  /* The felt, same flat panel and hairline frame as the table. */
  .stage { display: flex; width: 100%; padding: 12px; border-radius: var(--r-lg); background: var(--felt); }
  .inner {
    flex: 1; min-width: 0; min-height: 12rem;
    border: 1px solid var(--felt-inset); border-radius: var(--r-md); padding: var(--s-4);
    display: flex; gap: var(--s-4); align-items: center; justify-content: center; flex-wrap: wrap;
  }
  .inner.tcq { flex-direction: column; gap: var(--s-3); }

  .readout { color: var(--on-felt); display: flex; align-items: baseline; gap: 8px; }
  .readout b {
    font-family: var(--heading); font-size: 44px; font-weight: 500; line-height: 1;
    color: var(--on-felt-strong); font-variant-numeric: tabular-nums;
  }
  .unit { font-family: var(--mono); font-size: 12px; letter-spacing: 0.14em; text-transform: uppercase; }

  .question { font-family: var(--heading); font-size: 20px; color: var(--on-felt); }
  .question b { font-size: 30px; font-weight: 500; color: var(--on-felt-strong); }

  label {
    color: var(--on-felt-strong); font-size: 14px;
    display: flex; gap: var(--s-2); align-items: center;
  }
  input {
    width: 5rem; padding: 4px 8px; border-radius: var(--r-sm);
    border: 1px solid var(--card-border); background: var(--card-bg); color: var(--card-ink);
    font-family: var(--heading); font-size: 28px; font-weight: 500;
    font-variant-numeric: tabular-nums; text-align: center;
  }

  .moves { display: flex; gap: 12px; }
  button { font: inherit; font-size: 16px; font-weight: 500; cursor: pointer; }
  .action {
    min-width: 6rem; height: 56px; display: inline-flex; align-items: center; justify-content: center; gap: 10px;
    border: 1px solid var(--text-h); border-radius: var(--r-sm); background: none; color: var(--text-h);
  }
  .action:hover:not(:disabled) { background: var(--hover); }
  .action:disabled { opacity: 0.4; cursor: not-allowed; }
  /* On the felt the page's green primary would vanish, so it inverts, as the chip stack does. */
  .primary {
    height: 48px; padding: 0 20px; display: inline-flex; align-items: center; gap: 10px;
    border: 1px solid var(--on-felt-strong); border-radius: var(--r-sm);
    background: var(--on-felt-strong); color: var(--felt);
  }
  kbd { font-family: var(--mono); font-size: 12px; font-weight: 400; opacity: 0.75; }
  .action kbd { color: var(--text); opacity: 1; }

  .verdict { min-height: 1.4rem; font-size: 16px; font-weight: 500; color: var(--good); }
  .verdict .bad { color: var(--danger); }
  .score { font-family: var(--mono); font-size: 12px; color: var(--text); }

  @media (max-width: 560px) {
    .moves { width: 100%; }
    .action { flex: 1; min-width: 0; height: 48px; }
  }
</style>

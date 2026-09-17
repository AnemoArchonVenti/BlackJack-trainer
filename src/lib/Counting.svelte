<script>
  // Mode 2: isolated counting drills (SPEC §5.2, research §2d). Three drills that build counting
  // speed before it has to happen at the table. All grading comes from engine/drills.js, which
  // grades against the shoe's ground truth — the UI never counts anything itself.
  import {
    createTagDrill, createCountdownDrill, createTrueCountDrill,
    COUNTDOWN_TARGET_MS, COUNTDOWN_STRETCH_MS, CLEAN_RUNS_TO_PASS,
  } from '../engine/drills.js';
  import { session, recordCountdownRun } from './session.svelte.js';
  import Card from './Card.svelte';
  import { cue } from './audio.js';

  const DRILLS = [
    ['tag', 'Tag speed'],
    ['countdown', 'Deck countdown'],
    ['truecount', 'True count'],
  ];
  let drill = $state('tag');
  const SUITS = ['♠', '♥', '♦', '♣'];
  const suit = () => SUITS[Math.floor(Math.random() * 4)]; // cosmetic; tags don't depend on suit
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
  <nav class="tabs" aria-label="Counting drills">
    {#each DRILLS as [id, label] (id)}
      <button class:on={drill === id} onclick={() => (drill = id)}>{label}</button>
    {/each}
  </nav>

  {#if drill === 'tag'}
    <div class="panel">
      <p class="lead">Call the Hi-Lo tag as fast as you can. 2–6 are +1, 7–9 are 0, tens and aces are −1.</p>
      <div class="stage">
        {#if tag.card}
          <Card rank={tag.card.rank} suit={suit()} />
        {:else}
          <button class="primary" onclick={tagNext}>Start</button>
        {/if}
      </div>
      <div class="moves">
        <button onclick={() => tagAnswer(1)} disabled={!tag.card}>+1 <kbd>+</kbd></button>
        <button onclick={() => tagAnswer(0)} disabled={!tag.card}>0 <kbd>0</kbd></button>
        <button onclick={() => tagAnswer(-1)} disabled={!tag.card}>−1 <kbd>−</kbd></button>
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
        {#if !cd.drill}
          <button class="primary" onclick={cdStart}>Start a deck</button>
        {:else if cd.left > 0}
          {#if cd.card}<Card rank={cd.card.rank} suit={suit()} />{/if}
          <button class="primary" onclick={cdFlip}>{cd.card ? 'Next' : 'Flip'} <kbd>space</kbd></button>
        {:else if !cd.result}
          <label>
            Final running count
            <input type="number" bind:value={cd.called} />
          </label>
          <button class="primary" onclick={cdFinish}>Grade — {secs(cd.elapsed)}</button>
        {:else}
          <button class="primary" onclick={cdStart}>Run it again</button>
        {/if}
      </div>
      <p class="score">{cd.drill && cd.left > 0 ? `${cd.left} cards left` : ''}</p>
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
      <div class="stage tcq">
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
  .counting { max-width: 44rem; margin: 1.5rem auto; padding: 0 1rem; display: flex; flex-direction: column; gap: 1rem; }
  .tabs { display: flex; gap: 0.3rem; justify-content: center; flex-wrap: wrap; }
  .tabs button, .moves button, .primary {
    padding: 0.4rem 0.9rem; border: 1px solid var(--border); background: none; color: inherit;
    border-radius: var(--r-sm); cursor: pointer; font: inherit; font-size: 0.85rem;
  }
  .tabs button.on { background: var(--accent-bg); border-color: var(--accent-border); color: var(--text-h); }
  .panel {
    border: 1px solid var(--border); border-radius: var(--r-lg); padding: 1.2rem;
    display: flex; flex-direction: column; gap: 0.8rem; align-items: center; background: var(--panel);
  }
  .lead { font-size: 0.85rem; text-align: center; max-width: 32rem; }
  .stage {
    min-height: 6rem; display: flex; gap: 1rem; align-items: center; justify-content: center;
    flex-wrap: wrap; padding: 1rem 1.2rem; border-radius: var(--r-md); width: 100%; box-sizing: border-box;
    background: radial-gradient(circle at 50% 30%, var(--felt), var(--felt-edge));
  }
  .stage.tcq { flex-direction: column; gap: 0.7rem; }
  .question { color: var(--on-felt-strong); font-size: 1.05rem; margin: 0; }
  .question b { font-size: 1.2rem; }
  label { color: var(--on-felt-strong); font-size: 0.85rem; display: flex; gap: 0.4rem; align-items: center; }
  input {
    width: 4.5rem; padding: 0.35rem 0.5rem; border-radius: var(--r-sm);
    border: 1px solid var(--card-border); font: inherit; font-size: 0.9rem;
  }
  .primary { background: var(--btn); color: var(--on-btn); border-color: transparent; font-weight: 600; }
  .moves { display: flex; gap: 0.5rem; }
  .moves button:disabled { opacity: 0.4; cursor: not-allowed; }
  kbd { font: inherit; font-size: 0.7rem; opacity: 0.7; }
  .verdict { min-height: 1.4rem; margin: 0; font-weight: 600; color: var(--good); }
  .verdict .bad { color: var(--bad); }
  .score { margin: 0; font-size: 0.8rem; opacity: 0.8; }
</style>

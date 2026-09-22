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
    CLEAN_RUNS_TO_PASS, COUNTDOWN_GATE_MIN_CARDS, FULL_DECK, targetMsFor, stretchMsFor,
  } from '../engine/drills.js';
  import { session, recordCountdownRun, openSettings } from './session.svelte.js';
  import { TAG_PACE_MS } from './settings.js';
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
  // How long the answer stays on screen before the next card. A miss always lingers longer than
  // a hit, so the right tag has time to register; at 'manual' nothing advances on its own.
  const pace = $derived(TAG_PACE_MS[session.settings.tagPace] ?? TAG_PACE_MS.normal);
  function tagAnswer(value) {
    if (!tag.card || tag.feedback) return;
    const r = tag.drill.answer(value);
    tag.feedback = r;
    Object.assign(tag, tag.drill.stats);
    cue(r.correct ? 'correct' : 'wrong');
    const wait = r.correct ? pace.correct : pace.wrong;
    if (wait !== null) setTimeout(tagNext, wait);
  }

  // ── (b) Deck countdown ──────────────────────────────────────────────────────────────────
  let cd = $state({ drill: null, card: null, left: 0, total: 0, startedAt: 0, elapsed: 0, called: 0, result: null });
  // A run deals the configured number of cards rather than a whole deck. That is the difference
  // between a drill and a formality: a full deck is balanced, so its answer is zero before the
  // first card turns, and 'type 0' scored a clean run without counting anything.
  const runCards = $derived(session.settings.countdownCards);
  function cdStart() {
    cd.drill = createCountdownDrill({ cards: runCards });
    cd.card = null;
    cd.left = cd.drill.remaining;
    cd.total = cd.drill.total;
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
      // The clock has to stop on the LAST CARD, not on a further click. Once `left` hits zero the
      // markup swaps the Flip button for the answer box, so there is no click left to make — and
      // the run was being graded at 0.0s, which is inside every target there is. Between that and
      // a full deck always answering 0, a clean run needed neither counting nor speed.
      if (cd.left === 0) cd.elapsed = performance.now() - cd.startedAt;
    } else {
      cd.elapsed ||= performance.now() - cd.startedAt;
    }
  }
  function cdFinish() {
    cd.result = cd.drill.finish(cd.called, Math.round(cd.elapsed));
    recordCountdownRun(cd.result);
    cue(cd.result.clean ? 'correct' : 'wrong');
  }

  // ── (c) True-count conversion ───────────────────────────────────────────────────────────
  let tc = $state({ drill: null, question: null, answer: 0, result: null, asked: 0, correct: 0, decks: 0 });
  function tcNext() {
    // Rebuild when the configured shoe changes, or questions keep coming from the old size.
    if (tc.decks !== session.settings.trueCountDecks) {
      tc.drill = null;
      tc.decks = session.settings.trueCountDecks;
    }
    tc.drill ??= createTrueCountDrill({ decks: session.settings.trueCountDecks });
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
      // At manual pace the space bar is what asks for the next card.
      if (e.key === ' ' && pace.correct === null && tag.feedback) { e.preventDefault(); tagNext(); }
      else if (e.key === '+' || e.key === '=' || e.key === 'ArrowUp') tagAnswer(1);
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
      <p class="lead">
        Call the Hi-Lo tag as fast as you can. 2–6 are +1, 7–9 are 0, tens and aces are −1.
        <button class="tweak" onclick={openSettings}>Change the pace</button>
      </p>
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
        {#if pace.correct === null && tag.feedback}
          <button class="action next" onclick={tagNext}>Next <kbd>space</kbd></button>
        {/if}
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
        Count {runCards} cards off a shuffled deck and end on the right running count.
        Target under {secs(targetMsFor(runCards))} ({secs(stretchMsFor(runCards))} is the stretch
        goal), {CLEAN_RUNS_TO_PASS} clean runs in a row to pass.
        <button class="tweak" onclick={openSettings}>Change the length</button>
      </p>
      {#if runCards >= FULL_DECK}
        <p class="warn">
          A full deck always ends on zero — Hi-Lo is balanced, so the answer is known before the
          first card turns. That is the self-check you use at a real table, but it is not a test.
          Shorten the run to be graded on something you had to count.
        </p>
      {:else if runCards < COUNTDOWN_GATE_MIN_CARDS}
        <p class="warn">
          Runs under {COUNTDOWN_GATE_MIN_CARDS} cards are practice: they grade, but they do not
          move the streak.
        </p>
      {/if}
      <div class="stage">
        <div class="inner">
          {#if !cd.drill}
            <button class="primary" onclick={cdStart}>Start a run of {runCards}</button>
          {:else if cd.left > 0}
            {#if cd.card}<Card rank={cd.card.rank} suit={suitFor(cd.card)} />{/if}
            <p class="readout"><b>{cd.left}</b> <span class="unit">of {cd.total} left</span></p>
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
      <p class="lead">
        Divide the running count by the decks remaining, then round to the nearest whole true count.
        Posed from a {session.settings.trueCountDecks}-deck shoe.
        <button class="tweak" onclick={openSettings}>Change the shoe</button>
      </p>
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
  /* A link-looking button that jumps to the setting the drill in front of you depends on. */
  .tweak {
    background: none; border: 0; padding: 0; margin-left: 6px;
    font: inherit; font-size: 0.95em; color: var(--text-h); cursor: pointer;
    border-bottom: 1px solid var(--border);
  }
  .tweak:hover { border-bottom-color: var(--accent); }
  .warn {
    border-left: 2px solid var(--accent); padding: 2px 0 2px 12px; margin: 0 0 var(--s-3);
    font-size: 14px; color: var(--text); max-width: 60ch;
  }

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

<script>
  // Targeted drill for one chart cell (SPEC §11 F7): clicking a heatmap cell poses that exact
  // situation — "16 vs 10" — and grades the answer through the one oracle. Each rep feeds Leitner,
  // so practising a weak spot moves it up the boxes and re-colours the heatmap immediately.
  //
  // Editorial skin (DESIGN-SPEC §5.7): the one place a panel is allowed. It sits on a scrim, as
  // a dialog should, rather than growing inside whichever column launched it.
  import { handFor } from '../engine/hand.js';
  import { getCorrectAction, forGrading } from '../engine/strategy.js';
  import { explain } from '../engine/reasons.js';
  import { gradeCell, cellStats, persist } from './session.svelte.js';
  import HandView from './HandView.svelte';
  import { cue } from './audio.js';

  let { cell, onClose } = $props();

  const ACTIONS = { H: 'Hit', S: 'Stand', D: 'Double', P: 'Split', R: 'Surrender' };
  // A cell drill is always a fresh two-card hand, so every button is legal to press; split is only
  // meaningful on a pair, and surrender is table-legal under the v1 ruleset.
  const choices = $derived(cell.type === 'pair' ? ['H', 'S', 'D', 'P', 'R'] : ['H', 'S', 'D', 'R']);

  const situation = $derived(handFor(cell));
  const correctRaw = $derived(getCorrectAction(situation.hand, situation.upcard, { surrender: true }));
  let answer = $state(null);
  const stats = $derived(cellStats(cell.id));

  const title = $derived(
    `${cell.type === 'soft' ? `A,${cell.key}` : cell.type === 'pair' ? (cell.key === 11 ? 'A,A' : `${cell.key},${cell.key}`) : cell.key === 17 ? '17+' : cell.key} vs ${cell.up === 11 ? 'A' : cell.up}`
  );

  function pick(code) {
    if (answer) return;
    answer = { chosen: code, correct: code === forGrading(correctRaw) };
    gradeCell(cell.id, answer.correct);
    cue(answer.correct ? 'correct' : 'wrong');
    persist();
  }
  const again = () => (answer = null);

  function onkey(e) {
    const code = e.key.toUpperCase();
    if (answer && (e.key === 'Enter' || code === 'N')) again();
    else if (!answer && choices.includes(code)) pick(code);
    else if (e.key === 'Escape') onClose();
  }
</script>

<svelte:window onkeydown={onkey} />

<div class="scrim">
  <div class="drill" role="dialog" aria-label="Targeted drill" aria-modal="true">
    <header>
      <h2>Drill: {title}</h2>
      <button class="close" onclick={onClose} aria-label="Close drill">✕</button>
    </header>

    <div class="felt">
      <div class="inner">
        <HandView hand={[situation.upcard]} role="dealer" />
        <HandView hand={situation.hand} />
      </div>
    </div>

    <div class="moves">
      {#each choices as code (code)}
        <button class="action" onclick={() => pick(code)} disabled={!!answer}>
          {ACTIONS[code]} <span class="key" aria-hidden="true">{code}</span>
        </button>
      {/each}
    </div>

    <div class="verdict" aria-live="polite">
      {#if answer}
        <p class="mark" class:wrong={!answer.correct}>
          {answer.correct ? '✓ Correct' : `✗ ${ACTIONS[answer.chosen]} — correct: ${ACTIONS[forGrading(correctRaw)]}`}
        </p>
        <p class="why">{explain(situation.hand, situation.upcard, correctRaw)}</p>
        <button class="action primary" onclick={again}>Again (Enter)</button>
      {/if}
      <p class="stats">{stats.attempts ? `${stats.correct}/${stats.attempts} correct · ${stats.bucket}` : 'First look at this cell'}</p>
    </div>
  </div>
</div>

<style>
  /* Deliberately not a token: the scrim must stay dark in both themes, where --text-h flips. */
  .scrim {
    position: fixed; inset: 0; z-index: 20;
    background: rgba(0, 0, 0, 0.5);
    display: grid; place-items: center; padding: var(--s-3);
    overflow-y: auto;
  }
  .drill {
    background: var(--panel); color: var(--text-h);
    border: 1px solid var(--border); border-radius: var(--r-md);
    padding: var(--s-4); width: min(34rem, 100%);
    display: flex; flex-direction: column; gap: var(--s-3);
  }

  header { display: flex; align-items: baseline; justify-content: space-between; gap: var(--s-3); }
  h2 { margin: 0; font-size: 26px; font-weight: 500; }
  .close { background: none; border: none; color: var(--text); cursor: pointer; font-size: 18px; padding: var(--s-1); }
  .close:hover { color: var(--text-h); }

  .felt { display: flex; padding: 12px; border-radius: var(--r-lg); background: var(--felt); }
  /* Dealer above, player below — the same reading order as the real felt. */
  .inner {
    flex: 1; min-width: 0;
    border: 1px solid var(--felt-inset); border-radius: var(--r-md); padding: var(--s-4);
    display: flex; flex-direction: column; gap: var(--s-4); align-items: center; max-width: 100%;
  }

  .moves { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
  .action {
    height: 56px; display: flex; align-items: center; justify-content: center; gap: 10px;
    border: 1px solid var(--text-h); border-radius: var(--r-sm); background: none;
    color: var(--text-h); font: inherit; font-size: 16px; font-weight: 500; cursor: pointer;
  }
  .action:hover:not(:disabled) { background: var(--hover); }
  .action:disabled { opacity: 0.4; cursor: not-allowed; }
  .key { font-family: var(--mono); font-size: 12px; font-weight: 400; color: var(--text); }
  .primary { background: var(--accent); border-color: var(--accent); color: var(--on-btn); }

  .verdict { display: flex; flex-direction: column; gap: var(--s-2); align-items: flex-start; }
  .mark { font-size: 16px; font-weight: 500; color: var(--good); }
  .mark.wrong { color: var(--danger); }
  .why { font-size: 14px; line-height: 1.55; color: var(--text); text-wrap: pretty; }
  .stats { font-family: var(--mono); font-size: 12px; color: var(--text); }
  .verdict .primary { align-self: flex-start; padding: 0 var(--s-4); }

  @media (max-width: 560px) {
    .moves { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .action { height: 48px; }
  }
</style>

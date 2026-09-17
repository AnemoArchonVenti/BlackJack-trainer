<script>
  // Targeted drill for one chart cell (SPEC §11 F7): clicking a heatmap cell poses that exact
  // situation — "16 vs 10" — and grades the answer through the one oracle. Each rep feeds Leitner,
  // so practising a weak spot moves it up the boxes and re-colours the heatmap immediately.
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

<div class="drill" role="dialog" aria-label="Targeted drill">
  <header>
    <h2>Drill: {cell.type === 'soft' ? `A,${cell.key}` : cell.type === 'pair' ? (cell.key === 11 ? 'A,A' : `${cell.key},${cell.key}`) : cell.key === 17 ? '17+' : cell.key} vs {cell.up === 11 ? 'A' : cell.up}</h2>
    <button class="close" onclick={onClose} aria-label="Close drill">✕</button>
  </header>

  <div class="felt">
    <HandView hand={[situation.upcard]} label="Dealer" />
    <HandView hand={situation.hand} label="You" />
  </div>

  <div class="moves">
    {#each choices as code (code)}
      <button onclick={() => pick(code)} disabled={!!answer}>{ACTIONS[code]} <kbd>{code}</kbd></button>
    {/each}
  </div>

  <div class="verdict" aria-live="polite">
    {#if answer}
      <p class="mark" class:wrong={!answer.correct}>
        {answer.correct ? '✓ Correct' : `✗ ${ACTIONS[answer.chosen]} — correct: ${ACTIONS[forGrading(correctRaw)]}`}
      </p>
      <p class="why">{explain(situation.hand, situation.upcard, correctRaw)}</p>
      <button class="again" onclick={again}>Again (Enter)</button>
    {/if}
    <p class="stats">{stats.attempts ? `${stats.correct}/${stats.attempts} correct · ${stats.bucket}` : 'First look at this cell'}</p>
  </div>
</div>

<style>
  .drill {
    background: var(--panel); color: var(--text-h); border: 1px solid var(--border);
    border-radius: var(--r-lg); padding: 1rem 1.2rem; box-shadow: var(--shadow);
    display: flex; flex-direction: column; gap: 0.8rem; min-width: 18rem;
  }
  header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  h2 { margin: 0; font-size: 1rem; }
  .close { background: none; border: none; color: inherit; cursor: pointer; font-size: 1rem; }
  .felt {
    display: flex; gap: 1.5rem; justify-content: center; padding: 0.9rem;
    background: radial-gradient(circle at 50% 30%, var(--felt), var(--felt-edge)); border-radius: var(--r-md);
  }
  .moves { display: flex; gap: 0.4rem; flex-wrap: wrap; justify-content: center; }
  .moves button {
    padding: 0.45rem 0.7rem; border: none; border-radius: var(--r-sm);
    background: var(--btn); color: var(--on-btn); font-weight: 600; cursor: pointer; font-size: 0.85rem;
  }
  .moves button:disabled { opacity: 0.4; cursor: not-allowed; }
  kbd { font: inherit; font-size: 0.7rem; opacity: 0.7; }
  .verdict { display: flex; flex-direction: column; gap: 0.4rem; align-items: center; text-align: center; }
  .mark { font-weight: 700; color: var(--good); margin: 0; }
  .mark.wrong { color: var(--bad); }
  .why { margin: 0; font-size: 0.85rem; color: var(--text); }
  .stats { margin: 0; font-size: 0.75rem; color: var(--text); opacity: 0.8; }
  .again { padding: 0.4rem 0.8rem; border: none; border-radius: var(--r-sm); background: var(--btn); color: var(--on-btn); cursor: pointer; }
</style>

<script>
  // Settings panel (SPEC §11 F5/F10): motion preference and the audio toggle, both persisted in
  // the store blob. Audio defaults to OFF; motion defaults to Full but the OS reduced-motion
  // preference quietly downgrades it, which the panel says out loud.
  import { MOTION_PREFS, prefersReducedMotion } from './motion.js';
  import { session, setSetting, motion } from './session.svelte.js';
  import { cue } from './audio.js';

  let { onClose } = $props();
  const LABEL = { full: 'Full', reduced: 'Reduced', off: 'Off' };
  const osReduced = prefersReducedMotion();
  const effective = $derived(motion().level);

  function setAudio(on) {
    setSetting('audio', on);
    if (on) cue('chip'); // confirm it works the moment it is switched on
  }
</script>

<div class="settings" role="region" aria-label="Settings">
  <div class="row">
    <fieldset>
      <legend>Motion</legend>
      {#each MOTION_PREFS as pref (pref)}
        <label>
          <input
            type="radio"
            name="motion"
            value={pref}
            checked={session.settings.motion === pref}
            onchange={() => setSetting('motion', pref)}
          />
          {LABEL[pref]}
        </label>
      {/each}
    </fieldset>

    <fieldset>
      <legend>Sound</legend>
      <label>
        <input type="checkbox" checked={session.settings.audio} onchange={(e) => setAudio(e.currentTarget.checked)} />
        Card and grade cues
      </label>
    </fieldset>

    <button class="close" onclick={onClose}>Done</button>
  </div>

  {#if osReduced && effective !== session.settings.motion}
    <p class="note">Your system asks for reduced motion, so animations are running at “{LABEL[effective]}”.</p>
  {/if}
</div>

<style>
  /* Editorial skin (DESIGN-SPEC §5.9): a hairline strip on the page ground under the bar, with
     its legends set as the mono kickers used everywhere else. */
  .settings { border-bottom: 1px solid var(--border); background: var(--bg); }
  .row {
    display: flex; gap: var(--s-5); align-items: center; flex-wrap: wrap;
    max-width: var(--content); margin: 0 auto; padding: var(--s-3) var(--pad);
  }
  fieldset { border: none; margin: 0; padding: 0; display: flex; gap: var(--s-3); align-items: center; }
  legend {
    float: left; padding: 0 var(--s-2) 0 0;
    font-family: var(--mono); font-size: 12px; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--text);
  }
  label { display: flex; gap: 6px; align-items: center; font-size: 15px; color: var(--text-h); }
  input { accent-color: var(--accent); }
  .close {
    margin-left: auto; padding: 8px 14px; border: 1px solid var(--border);
    border-radius: var(--r-sm); background: none; color: var(--text-h); font: inherit;
    font-size: 14px; cursor: pointer;
  }
  .close:hover { background: var(--hover); }
  .note {
    max-width: var(--content); margin: 0 auto; padding: 0 var(--pad) var(--s-3);
    font-size: 14px; color: var(--text);
  }
</style>

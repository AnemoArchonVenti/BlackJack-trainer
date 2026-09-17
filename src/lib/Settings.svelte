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
  .settings {
    border-bottom: 1px solid var(--border); background: var(--panel);
    padding: 0.8rem clamp(0.75rem, 3vw, 1.5rem);
  }
  .row {
    display: flex; gap: 1.5rem; align-items: center; flex-wrap: wrap;
    max-width: 1120px; margin: 0 auto;
  }
  fieldset { border: none; margin: 0; padding: 0; display: flex; gap: 0.7rem; align-items: center; }
  legend {
    float: left; padding: 0 0.5rem 0 0; font-size: 0.72rem; text-transform: uppercase;
    letter-spacing: 0.08em; color: var(--text); font-weight: 600;
  }
  label { display: flex; gap: 0.3rem; align-items: center; font-size: 0.85rem; }
  .close {
    margin-left: auto; padding: 0.35rem 0.9rem; border: 1px solid var(--border);
    border-radius: var(--r-sm); background: none; color: inherit; font: inherit;
    font-size: 0.85rem; cursor: pointer;
  }
  .note { max-width: 1120px; margin: 0.5rem auto 0; font-size: 0.78rem; opacity: 0.85; }
</style>

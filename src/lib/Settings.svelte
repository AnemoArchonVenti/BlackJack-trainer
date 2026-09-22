<script>
  // Settings panel (SPEC §11 F5/F10). Everything adjustable lives in lib/settings.js — its
  // defaults, its ranges and what each one means — and this panel RENDERS that schema rather than
  // keeping a second copy of it. Add a setting there and a control appears here; there is no
  // list of fields in this file to forget to update.
  //
  // Values go back through setSetting(), which clamps against the same schema, so a dragged
  // slider, a typed number and a hand-edited storage blob all land in the same allowed range.
  //
  // Editorial skin (DESIGN-SPEC §5.9): a hairline strip on the page ground under the bar, with
  // its legends set as the mono kickers used everywhere else.
  import { SETTINGS, settingsIn, penetrationDecks } from './settings.js';
  import { prefersReducedMotion } from './motion.js';
  import { session, setSetting, motion, resetBankroll } from './session.svelte.js';
  import { targetMsFor } from '../engine/drills.js';
  import { money } from './money.js';
  import { cue } from './audio.js';
  import Account from './Account.svelte';

  let { onClose } = $props();

  const MOTION_LABEL = { full: 'Full', reduced: 'Reduced', off: 'Off' };
  const PACE_LABEL = { fast: 'Fast', normal: 'Normal', slow: 'Slow', manual: 'Manual' };
  const ENUM_LABEL = { ...MOTION_LABEL, ...PACE_LABEL };

  const osReduced = prefersReducedMotion();
  const effective = $derived(motion().level);
  const s = $derived(session.settings);

  function change(key, value) {
    setSetting(key, value);
    // Sound is the one setting you cannot see the effect of, so it confirms itself.
    if (key === 'audio' && value) cue('chip');
  }

  /** The value shown beside a slider — the number in the units a player thinks in. */
  function readout(key) {
    if (key === 'penetration') return `${Math.round(s.penetration * 100)}% · ${penetrationDecks(s)} decks`;
    if (key === 'bankroll') return money(s.bankroll);
    if (key === 'countdownCards') return `${s.countdownCards} cards · ${(targetMsFor(s.countdownCards) / 1000).toFixed(0)}s target`;
    if (key === 'decks') return `${s.decks} decks`;
    if (key === 'trueCountDecks') return `${s.trueCountDecks} ${s.trueCountDecks === 1 ? 'deck' : 'decks'}`;
    return String(s[key]);
  }

  const GROUPS = [
    { id: 'table', title: 'The table', blurb: 'What gets dealt. Every deck count here is one the strategy chart covers.' },
    { id: 'drills', title: 'The drills', blurb: 'How the counting practice is shaped.' },
    { id: 'display', title: 'Display', blurb: null },
  ];
</script>

<div class="settings" role="region" aria-label="Settings">
  <div class="sheet">
    {#each GROUPS as group (group.id)}
      <section class="group">
        <h2>{group.title}</h2>
        {#if group.blurb}<p class="blurb">{group.blurb}</p>{/if}

        {#each settingsIn(group.id) as spec (spec.key)}
          {#if spec.kind === 'bool'}
            <div class="field">
              <label class="check">
                <input
                  type="checkbox"
                  checked={s[spec.key]}
                  onchange={(e) => change(spec.key, e.currentTarget.checked)}
                />
                {spec.key === 'audio' ? 'Card and grade cues' : spec.label}
              </label>
              {#if spec.help}<p class="help">{spec.help}</p>{/if}
            </div>
          {:else if spec.kind === 'enum'}
            <div class="field">
              <fieldset>
                <legend>{spec.label ?? (spec.key === 'motion' ? 'Motion' : spec.key)}</legend>
                {#each spec.options as option (option)}
                  <label class="check">
                    <input
                      type="radio"
                      name={spec.key}
                      value={option}
                      checked={s[spec.key] === option}
                      onchange={() => change(spec.key, option)}
                    />
                    {ENUM_LABEL[option] ?? option}
                  </label>
                {/each}
              </fieldset>
              {#if spec.help}<p class="help">{spec.help}</p>{/if}
            </div>
          {:else}
            <div class="field">
              <label class="slider">
                <span class="name">{spec.label}</span>
                <span class="value">{readout(spec.key)}</span>
                <input
                  type="range"
                  min={spec.min}
                  max={spec.max}
                  step={spec.step}
                  value={s[spec.key]}
                  oninput={(e) => change(spec.key, Number(e.currentTarget.value))}
                />
              </label>
              {#if spec.help}<p class="help">{spec.help}</p>{/if}
            </div>
          {/if}
        {/each}

        {#if group.id === 'table'}
          <div class="field">
            <button class="secondary" onclick={resetBankroll}>
              Reset bankroll to {money(s.bankroll)}
            </button>
            <p class="help">
              Currently holding {money(session.bankroll)}. Nothing else is cleared — your progress,
              heatmap and streaks stay where they are.
            </p>
          </div>
        {/if}
      </section>
    {/each}
    <Account />
  </div>

  {#if osReduced && effective !== s.motion}
    <p class="note">Your system asks for reduced motion, so animations are running at “{MOTION_LABEL[effective]}”.</p>
  {/if}

  <div class="foot">
    <p class="fixed">
      The dealer stands on soft 17, doubling after a split is allowed and late surrender is
      offered — those are not adjustable, because the chart you are graded against is only
      sourced for that game.
    </p>
    <button class="close" onclick={onClose}>Done</button>
  </div>
</div>

<style>
  /* A hairline strip on the page ground under the bar — deliberately not a raised panel. */
  .settings { border-bottom: 1px solid var(--border); background: var(--bg); }

  .sheet {
    max-width: var(--content); margin: 0 auto; padding: var(--s-4) var(--pad) var(--s-3);
    display: grid; gap: var(--s-5);
    grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr));
    align-items: start;
  }

  .group h2 {
    font-family: var(--mono); font-size: 12px; font-weight: 500; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--text-h); margin: 0 0 4px;
    padding-bottom: 8px; border-bottom: 1px solid var(--rule);
  }
  .blurb { margin: 8px 0 0; font-size: 13px; line-height: 1.5; color: var(--text); }

  .field { margin-top: var(--s-3); }

  .slider { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; align-items: baseline; }
  .slider .name { font-size: 14px; color: var(--text-h); }
  .slider .value { font-family: var(--mono); font-size: 12px; color: var(--text); text-align: right; }
  .slider input[type='range'] { grid-column: 1 / -1; width: 100%; margin: 4px 0 0; }

  fieldset { border: none; margin: 0; padding: 0; display: flex; gap: var(--s-3); flex-wrap: wrap; align-items: center; }
  legend { float: left; padding: 0 var(--s-2) 0 0; font-size: 14px; color: var(--text-h); }

  .check { display: flex; gap: 6px; align-items: center; font-size: 14px; color: var(--text-h); }
  input { accent-color: var(--accent); }

  .help { margin: 4px 0 0; font-size: 12px; line-height: 1.5; color: var(--text); max-width: 34ch; }

  .secondary {
    padding: 7px 12px; border: 1px solid var(--border); border-radius: var(--r-sm);
    background: none; color: var(--text-h); font: inherit; font-size: 14px; cursor: pointer;
  }
  .secondary:hover { background: var(--hover); }

  .foot {
    max-width: var(--content); margin: 0 auto; padding: 0 var(--pad) var(--s-3);
    display: flex; gap: var(--s-4); align-items: flex-start; justify-content: space-between;
    border-top: 1px solid var(--border); padding-top: var(--s-3);
  }
  .fixed { margin: 0; font-size: 12px; line-height: 1.6; color: var(--text); max-width: 62ch; }

  .close {
    flex: none; padding: 8px 14px; border: 1px solid var(--border);
    border-radius: var(--r-sm); background: none; color: var(--text-h); font: inherit;
    font-size: 14px; cursor: pointer;
  }
  .close:hover { background: var(--hover); }

  .note {
    max-width: var(--content); margin: 0 auto; padding: 0 var(--pad) var(--s-3);
    font-size: 14px; color: var(--text);
  }

  @media (max-width: 640px) {
    .foot { flex-direction: column; }
  }
</style>

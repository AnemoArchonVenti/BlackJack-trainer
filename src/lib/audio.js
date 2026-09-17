// Audio cues (SPEC §11 F10). Four short sounds — a card-deal tick, a chip click, and the two
// grade cues — behind a settings toggle that is OFF by default.
//
// ponytail: the ticket asks for "a few short clips", but the same ticket forbids new deps and the
// repo ships no binary assets. These are synthesised with the built-in WebAudio API instead: same
// four cues, nothing to download, nothing to license. Swapping in real samples later only changes
// the body of `cue`.
//
// Everything is wrapped: audio is a nicety, and a browser that refuses it must not break a drill.

const CUES = {
  deal: { freq: 880, ms: 45, gain: 0.05, type: 'triangle' }, // dry tick as a card lands
  chip: { freq: 1200, ms: 35, gain: 0.05, type: 'square' }, // chip on felt
  correct: { freq: 660, ms: 110, gain: 0.07, type: 'sine', to: 990 }, // rising
  wrong: { freq: 400, ms: 160, gain: 0.07, type: 'sine', to: 240 }, // falling
};

let ctx = null;
let enabled = false;

/** Mirror the settings toggle into the helper. Called by the session on boot and on change. */
export function setAudioEnabled(on) {
  enabled = !!on;
  if (!enabled && ctx) {
    try {
      ctx.close();
    } catch {
      /* already gone */
    }
    ctx = null;
  }
}

export const isAudioEnabled = () => enabled;

/** Play one cue by name. No-ops when audio is off, unsupported, or blocked by autoplay policy. */
export function cue(name) {
  const spec = CUES[name];
  if (!enabled || !spec) return false;
  try {
    const Ctx = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Ctx) return false;
    ctx ??= new Ctx();
    // A context created before the first gesture starts suspended; resume is a no-op otherwise.
    ctx.resume?.();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const seconds = spec.ms / 1000;

    osc.type = spec.type;
    osc.frequency.setValueAtTime(spec.freq, now);
    if (spec.to) osc.frequency.exponentialRampToValueAtTime(spec.to, now + seconds);

    // Quick attack, smooth decay — a click envelope, not a beep.
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(spec.gain, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + seconds);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + seconds + 0.02);
    return true;
  } catch {
    return false; // no audio hardware, blocked context, headless browser — all fine
  }
}

// Motion system (SPEC §11 F5). The choreography is "fast enough to feel snappy, slow enough to
// read": cards fly from the shoe position into the spots with a slight stagger, the hole card
// flips, the dealer plays out staggered — all inside 150-250ms, and any input skips straight to
// the resolved state.
//
// This module is the pure half: what a given preference means in numbers. Components take the
// numbers and hand them to Svelte's own fly/fade/flip — no animation library, no new deps.

export const MOTION_PREFS = ['full', 'reduced', 'off'];
export const DEAL_MS = 200; // one card's travel — the middle of the 150-250ms budget
export const STAGGER_MS = 60; // the beat between cards in a deal
const REDUCED_MS = 90; // a cross-fade you notice without anything moving

/**
 * resolveMotion(pref, prefersReducedMotion) -> { level, fly, duration, stagger }.
 * The OS preference can only ever remove motion: it downgrades Full to Reduced and leaves a
 * stricter app choice alone. An unknown preference is treated as Full, so a corrupt settings
 * blob degrades to the default rather than freezing the table.
 */
export function resolveMotion(pref, prefersReducedMotion = false) {
  let level = MOTION_PREFS.includes(pref) ? pref : 'full';
  if (prefersReducedMotion && level === 'full') level = 'reduced';

  if (level === 'off') return { level, fly: false, duration: 0, stagger: 0 };
  if (level === 'reduced') return { level, fly: false, duration: REDUCED_MS, stagger: 0 };
  return { level, fly: true, duration: DEAL_MS, stagger: STAGGER_MS };
}

/** The live OS preference, or false anywhere without a matchMedia (SSR, tests). */
export function prefersReducedMotion() {
  try {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}

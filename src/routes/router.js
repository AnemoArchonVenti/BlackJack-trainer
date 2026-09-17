// Client-side routing (SPEC §11 F3). Hash-based so the app is a single static bundle with no
// server rewrites. Pure and framework-free: the shell reads it, it reads nothing back.

export const ROUTES = [
  { id: 'dashboard', path: '/', label: 'Dashboard', blurb: 'Where you are and what to do next' },
  { id: 'play', path: '/play', label: 'Play', blurb: 'Full rounds with a graded recap' },
  { id: 'counting', path: '/counting', label: 'Counting', blurb: 'Tag speed, deck countdown, true count' },
  { id: 'deviations', path: '/deviations', label: 'Deviations', blurb: 'Illustrious 18 + Fab 4 flashcards' },
  { id: 'integration', path: '/integration', label: 'Integration', blurb: 'Count, bet and deviate — graded per shoe' },
  { id: 'progress', path: '/progress', label: 'Progress', blurb: 'Reference chart and accuracy heatmap' },
];

/** The practice modes — the free menu, which is never locked (SPEC Q5=C). */
export const MODES = ROUTES.filter((r) => r.id !== 'dashboard');

const DEFAULT = ROUTES[0];

/** parseRoute(hash) -> a route. Anything unrecognised lands on the dashboard rather than blank. */
export function parseRoute(hash) {
  const path = String(hash ?? '')
    .replace(/^#/, '')
    .split('?')[0]
    .replace(/\/$/, ''); // '#/play/' and '#/play' are the same route
  if (!path || path === '/') return DEFAULT;
  return ROUTES.find((r) => r.path.replace(/\/$/, '') === path) ?? DEFAULT;
}

/** hrefFor(id) -> the hash link for a route, for nav anchors. */
export function hrefFor(id) {
  const route = ROUTES.find((r) => r.id === id) ?? DEFAULT;
  return `#${route.path}`;
}

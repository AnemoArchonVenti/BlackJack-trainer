// Client-side routing (SPEC §11 F3). Path-based via the History API, so every mode is a real URL
// a search engine can index and a person can link to. The build prerenders one HTML file per
// route and Cloudflare Pages serves it directly, so a cold hit on /counting is a real document,
// not a redirect into a fragment. Pure and framework-free: the shell reads it, it reads nothing back.
//
// Each route carries its own `title` and `description`. That is deliberate: the same two strings
// are used by the runtime (to set document.title on navigation) and by scripts/build-seo.js (to
// write the <head> of the prerendered file), so the tab and the search result can never disagree.

export const ROUTES = [
  {
    id: 'dashboard',
    path: '/',
    label: 'Dashboard',
    blurb: 'Where you are and what to do next',
    title: 'Blackjack Trainer — Basic Strategy, Hi-Lo Counting and Index Plays',
    description:
      'A free 21 trainer that drills basic strategy, Hi-Lo card counting and the Illustrious 18 — full hands, graded every decision, with the chart cell behind each miss. No signup, no real money.',
  },
  {
    id: 'play',
    path: '/play',
    label: 'Play',
    blurb: 'Full rounds with a graded recap',
    title: 'Play Blackjack Hands — Every Decision Graded Against the Chart',
    description:
      'Play full 6-deck S17 rounds against the dealer and get a graded recap: right or wrong per decision, the correct play, why it is correct, and the strategy chart cell you missed.',
  },
  {
    id: 'counting',
    path: '/counting',
    label: 'Counting',
    blurb: 'Tag speed, deck countdown, true count',
    title: 'Hi-Lo Card Counting Drills — Tag Speed, Deck Countdown, True Count',
    description:
      'Three Hi-Lo counting drills: card tag recognition, a full 52-card deck countdown under 30 seconds, and converting a running count to a true count. Graded against the shoe itself.',
  },
  {
    id: 'deviations',
    path: '/deviations',
    label: 'Deviations',
    blurb: 'Illustrious 18 + Fab 4 flashcards',
    title: 'Illustrious 18 and Fab 4 Flashcards — Blackjack Index Plays',
    description:
      'Spaced-repetition flashcards for all 22 Hi-Lo index plays, insurance included. You are handed the true count; you name the play. Missed cards come back sooner.',
  },
  {
    id: 'integration',
    path: '/integration',
    label: 'Integration',
    blurb: 'Count, bet and deviate — graded per shoe',
    title: 'Full Shoe Practice — Count, Size the Bet, Make the Index Plays',
    description:
      'The capstone drill: keep the running count yourself, convert it, size the bet off the ramp and take the deviations. Graded per shoe on count accuracy, bets, play and index plays.',
  },
  {
    id: 'progress',
    path: '/progress',
    label: 'Progress',
    blurb: 'Reference chart and accuracy heatmap',
    title: 'Your Basic Strategy Chart and Accuracy Heatmap',
    description:
      'One grid, two faces: the canonical 6-deck S17 strategy chart, and the same grid coloured by your own accuracy. Click any cell to drill the hands you keep getting wrong.',
  },
];

/** The practice modes — the free menu, which is never locked (SPEC Q5=C). */
export const MODES = ROUTES.filter((r) => r.id !== 'dashboard');

const DEFAULT = ROUTES[0];

/** Trim a URL down to a bare, comparable path: no origin, no query, no hash, no trailing slash. */
function normalise(input) {
  let s = String(input ?? '');
  // An absolute URL, or a path — either way we only care about the path segment.
  s = s.replace(/^[a-z]+:\/\/[^/]+/i, '');
  s = s.split('?')[0].split('#')[0];
  if (!s.startsWith('/')) s = `/${s}`;
  return s.length > 1 ? s.replace(/\/+$/, '') : '/';
}

/**
 * parseRoute(pathname) -> a route. Anything unrecognised lands on the dashboard rather than blank.
 *
 * Legacy hash links ('#/play') still resolve: the app shipped hash-based first, so a bookmark or
 * an old link should not dead-end on the dashboard. The shell rewrites them to the real path.
 */
export function parseRoute(input) {
  const raw = String(input ?? '');
  const hash = raw.includes('#') ? raw.slice(raw.indexOf('#') + 1) : '';
  // A hash that looks like a route ('#/play') wins — that is a legacy link, not a page anchor.
  const candidate = hash.startsWith('/') ? hash : raw;
  const path = normalise(candidate);
  if (path === '/') return DEFAULT;
  return ROUTES.find((r) => normalise(r.path) === path) ?? DEFAULT;
}

/** legacyHashPath(href) -> the path an old '#/play' link meant, or null if it is not one. */
export function legacyHashPath(href) {
  const raw = String(href ?? '');
  const i = raw.indexOf('#');
  if (i === -1) return null;
  const hash = raw.slice(i + 1);
  if (!hash.startsWith('/')) return null;
  return parseRoute(hash).path;
}

/** hrefFor(id) -> the link for a route, for nav anchors. A real path, so it is crawlable. */
export function hrefFor(id) {
  const route = ROUTES.find((r) => r.id === id) ?? DEFAULT;
  return route.path;
}

/** routeById(id) -> the route record, for anything that needs its title or description. */
export const routeById = (id) => ROUTES.find((r) => r.id === id) ?? DEFAULT;

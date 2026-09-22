// Everything the site needs to know about itself as a *site* rather than as an app: where it
// lives, what it is called, and which written pages exist alongside the trainer.
//
// Framework-free and dependency-free, like engine/ and srs/, because both the Svelte shell and
// the Node build script (scripts/build-seo.js) import it. One origin, written once: change the
// line below and the canonical tags, the sitemap, the OG URLs and the robots.txt all follow.
//
// The reference pages are NOT app routes. They are static documents generated at build time from
// the same engine data the trainer grades against (see scripts/build-seo.js), so the chart a
// reader finds in a search result is the chart the trainer marks them against — by construction,
// not by diligence.

/** Swap this one string to move the site to a different domain. No trailing slash. */
export const ORIGIN = 'https://twentyonetrainer.com';

export const SITE = {
  origin: ORIGIN,
  name: 'Twenty-One',
  /** The long name, for schema.org and the OG card — says what it is to someone who has not visited. */
  fullName: 'Twenty-One — Blackjack Trainer',
  tagline: 'Basic strategy, Hi-Lo counting and index plays, graded hand by hand.',
  locale: 'en_US',
  lang: 'en',
  /** Set once you have one; the build leaves the verification tag out entirely when it is empty. */
  googleSiteVerification: '',
  /** Shown on /about as the contact of record. Leave empty to omit the line. */
  contactEmail: '',
};

/**
 * The written pages, in the order they appear in the footer and the sitemap.
 *
 * `priority` and `changefreq` are sitemap hints. `nav` is the short footer label; `title` and
 * `description` are what a search result shows, so they are written for a person reading a list
 * of ten blue links, not for a keyword counter.
 */
export const REFERENCE_PAGES = [
  {
    slug: 'basic-strategy-chart',
    path: '/basic-strategy-chart',
    nav: 'Strategy chart',
    heading: 'The blackjack basic strategy chart',
    title: 'Blackjack Basic Strategy Chart — 6 Deck, Dealer Stands on Soft 17',
    description:
      'The complete 6-deck basic strategy chart for a dealer who stands on soft 17, with double after split and late surrender: hard totals, soft totals and pairs, plus how to read a cell and why each row breaks where it does.',
    priority: '0.9',
  },
  {
    slug: 'card-counting',
    path: '/card-counting',
    nav: 'Hi-Lo counting',
    heading: 'How Hi-Lo card counting actually works',
    title: 'Hi-Lo Card Counting Explained — Running Count, True Count, Bet Spread',
    description:
      'The Hi-Lo system end to end: the card tags, keeping a running count, dividing by the decks remaining to get a true count, and what the true count is actually telling you to bet. With the drills to practise each step.',
    priority: '0.9',
  },
  {
    slug: 'illustrious-18',
    path: '/illustrious-18',
    nav: 'Index plays',
    heading: 'The Illustrious 18 and the Fab 4',
    title: 'Illustrious 18 and Fab 4 — Blackjack Index Play Chart (Hi-Lo)',
    description:
      'Every Hi-Lo index play in one table: the Illustrious 18 hand deviations, the Fab 4 surrenders and the insurance index, each with the true count it turns on at and the basic-strategy play it replaces.',
    priority: '0.8',
  },
  {
    slug: 'blackjack-rules',
    path: '/blackjack-rules',
    nav: 'House rules',
    heading: 'The rules this trainer deals',
    title: 'Blackjack Rules That Change the Math — And the Ones This Trainer Uses',
    description:
      'What 6 decks, S17, DAS, late surrender and 3:2 actually do to the correct play, why a strategy chart is only right for one ruleset, and the exact game every hand here is graded against.',
    priority: '0.6',
  },
  {
    slug: 'about',
    path: '/about',
    nav: 'Sources',
    heading: 'Where the numbers come from',
    title: 'Sources and Method — How This Blackjack Trainer Is Built',
    description:
      'Every chart cell, Hi-Lo tag and index play here traces to a cited source, and the test suite fails the build if the code and the research disagree. What that means, what is deliberately missing, and why.',
    priority: '0.5',
  },
  {
    slug: 'privacy',
    path: '/privacy',
    nav: 'Privacy',
    heading: 'What this site stores about you',
    title: 'Privacy — What Twenty-One Stores, and What It Does Not',
    description:
      'The trainer works with no account and keeps your progress in your own browser. Sign in and one extra thing is stored: your email address and your progress. No tracking, no analytics, no advertising, and deletion in two clicks.',
    priority: '0.3',
  },
];

/** pageBySlug(slug) -> the reference page record. */
export const pageBySlug = (slug) => REFERENCE_PAGES.find((p) => p.slug === slug);

/** Absolute URL for any path. Canonical tags, the sitemap and OG cards all go through here. */
export const urlFor = (path) => `${ORIGIN}${path === '/' ? '/' : path.replace(/\/$/, '')}`;

#!/usr/bin/env node
// Post-build step: turn Vite's single-page output into a site.
//
//   npm run build   ->   vite build && node scripts/build-seo.js
//
// Vite emits one dist/index.html. A search engine given one URL indexes one page, so this script
// takes that shell and writes:
//
//   · one HTML file per app route, each with its own title, description, canonical and OG tags,
//     so /counting is a real document that can be indexed, linked and shared on its own terms;
//   · the reference pages — static, JavaScript-free prose and tables generated from the engine
//     (see seo/pages.js), which are the pages that can actually rank for a written query;
//   · sitemap.xml, robots.txt, a 404, the web manifest, and the Cloudflare Pages _headers file.
//
// Everything it writes is derived. Nothing in dist/ is hand-edited, and deleting dist/ and
// rebuilding reproduces it exactly.

import fs from 'node:fs';
import path from 'node:path';
import { ROUTES } from '../src/routes/router.js';
import { REFERENCE_PAGES, SITE, ACCOUNTS_ENABLED, urlFor } from '../src/site.js';
import { esc, seoBlock, graph, webSiteNode } from './seo/html.js';
import { BUILDERS } from './seo/pages.js';

const DIST = 'dist';
const START = '<!--seo:start-->';
const END = '<!--seo:end-->';

const read = (p) => fs.readFileSync(p, 'utf8');
const write = (rel, contents) => {
  const full = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, contents);
  return { rel, bytes: Buffer.byteLength(contents) };
};

const shell = read(path.join(DIST, 'index.html'));
if (!shell.includes(START)) {
  throw new Error('dist/index.html has no <!--seo:start--> marker — index.html was changed without updating this script');
}

/** Swap the marked block in the built shell for this page's own head tags. */
function withSeo(html, block) {
  const a = html.indexOf(START);
  const b = html.indexOf(END);
  return html.slice(0, a + START.length) + '\n' + block + '\n    ' + html.slice(b);
}

/** Vite hashes the bundle filenames, so the reference pages have to ask the shell what they are. */
const assetHref = (ext) => {
  const m = shell.match(new RegExp('"(/assets/[^"]+\\.' + ext + ')"'));
  if (!m) throw new Error('no ' + ext + ' asset found in dist/index.html');
  return m[1];
};
const CSS_HREF = assetHref('css');

const written = [];

// ── The app routes ───────────────────────────────────────────────────────────────────────────
// Each one is the same bundle with a different head. The app boots, reads the path, and renders
// the right mode — but a crawler, and a person on a slow connection, already has the right title.
const appJsonLd = graph(webSiteNode, {
  '@type': 'WebApplication',
  '@id': urlFor('/') + '#app',
  name: SITE.fullName,
  url: urlFor('/'),
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Any browser',
  inLanguage: SITE.lang,
  description: ROUTES[0].description,
  isPartOf: { '@id': urlFor('/') + '#website' },
  // Free, and saying so in the markup is what puts "Free" in a rich result.
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
});

for (const route of ROUTES) {
  const block = seoBlock({
    title: route.title,
    description: route.description,
    path: route.path,
    jsonLd: route.id === 'dashboard' ? appJsonLd : null,
  });
  // Cloudflare Pages serves dist/play.html at /play and redirects /play.html to it.
  const file = route.path === '/' ? 'index.html' : route.path.slice(1) + '.html';
  written.push(write(file, withSeo(shell, block)));
}

// ── The reference pages ──────────────────────────────────────────────────────────────────────
const PAGE_CSS = `
    <style>
      /* The reference pages share the app's stylesheet for tokens, type and the webfonts, and add
         only what prose needs: a measure, a table that survives a phone, and the chart colours. */
      body { margin: 0; }
      .wrap { max-width: 44rem; margin: 0 auto; padding: 0 1.5rem 5rem; }
      .topbar { border-bottom: 1px solid var(--border); margin-bottom: 3rem; }
      .topbar .bar {
        max-width: 44rem; margin: 0 auto; padding: 1.25rem 1.5rem;
        display: flex; align-items: baseline; justify-content: space-between; gap: 1.5rem;
      }
      .topbar .brand {
        font-family: var(--heading); font-style: italic; font-size: 26px; font-weight: 500;
        color: var(--text-h); text-decoration: none; letter-spacing: -0.01em;
      }
      .topbar nav { display: flex; gap: 1.25rem; font-size: 14px; flex-wrap: wrap; }
      .topbar nav a { color: var(--text); text-decoration: none; }
      .topbar nav a:hover { color: var(--text-h); }

      h1 {
        font-family: var(--heading); font-weight: 500; font-size: clamp(2rem, 5vw, 2.9rem);
        line-height: 1.12; letter-spacing: -0.02em; color: var(--text-h); margin: 0 0 1rem;
      }
      h2 {
        font-family: var(--heading); font-weight: 500; font-size: 1.6rem; line-height: 1.2;
        color: var(--text-h); margin: 3rem 0 0.75rem; letter-spacing: -0.01em;
      }
      h3 { font-size: 1.05rem; font-weight: 600; color: var(--text-h); margin: 2rem 0 0.5rem; }
      p, li { line-height: 1.65; }
      .lede { font-size: 1.15rem; line-height: 1.55; color: var(--text-h); }
      a { color: var(--text-h); text-decoration-color: var(--border); text-underline-offset: 3px; }
      a:hover { text-decoration-color: var(--accent); }
      code {
        font-family: var(--mono); font-size: 0.86em; background: var(--hover);
        padding: 1px 5px; border-radius: 3px; color: var(--text-h);
      }
      .dim { color: var(--text); }
      .note {
        border-left: 2px solid var(--accent); padding: 0.1rem 0 0.1rem 1rem;
        margin: 1.5rem 0; font-size: 0.95rem;
      }
      .formula {
        font-family: var(--mono); font-size: 1rem; color: var(--text-h);
        border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
        padding: 0.9rem 0; text-align: center; margin: 1.5rem 0;
      }

      /* Tables scroll sideways rather than squashing: a 10-column chart cannot reflow. */
      table { border-collapse: collapse; width: 100%; margin: 1.25rem 0; font-size: 0.9rem; }
      caption {
        caption-side: top; text-align: left; font-family: var(--mono); font-size: 11px;
        letter-spacing: 0.14em; text-transform: uppercase; color: var(--text);
        padding-bottom: 0.6rem;
      }
      th, td { border: 1px solid var(--border); padding: 0.45rem 0.5rem; text-align: left; }
      thead th { font-weight: 600; color: var(--text-h); background: var(--hover); text-align: center; }
      tbody th { font-weight: 600; color: var(--text-h); white-space: nowrap; }

      .chart { table-layout: fixed; }
      .chart td { text-align: center; padding: 0; }
      .chart tbody th { width: 5.5rem; }
      .a {
        display: block; padding: 0.42rem 0; font-family: var(--mono); font-size: 12px;
        line-height: 1.4; font-weight: 500;
        /* --text-h, not --card-ink: the action colours flip to deep shades after dark but
           --card-ink stays ink, which would leave the letters unreadable on them. */
        color: var(--text-h);
      }
      /* The swatch colours. On the legend this is the whole story. */
      .a-H { background: var(--act-hit); }
      .a-S { background: var(--act-stand); }
      .a-D, .a-Ds { background: var(--act-double); }
      .a-P { background: var(--act-split); }
      .a-Rh, .a-R { background: var(--act-surrender); }

      /* In the chart the colour also goes on the CELL. The row is as tall as its label, which is
         taller than the action span, so colouring only the span leaves a strip of page showing
         above and below it. Painting both means the seam is invisible — and a browser without
         :has() still gets a readable, if slightly inset, chart rather than a blank grid. */
      .chart td:has(.a-H) { background: var(--act-hit); }
      .chart td:has(.a-S) { background: var(--act-stand); }
      .chart td:has(.a-D), .chart td:has(.a-Ds) { background: var(--act-double); }
      .chart td:has(.a-P) { background: var(--act-split); }
      .chart td:has(.a-Rh), .chart td:has(.a-R) { background: var(--act-surrender); }

      .legend { list-style: none; padding: 0; margin: 0 0 1.5rem; font-size: 0.85rem;
        display: grid; grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr)); gap: 0.35rem 1rem; }
      .legend li { display: flex; align-items: center; gap: 0.6rem; }
      .legend .a { display: inline-block; width: 2.1rem; text-align: center; border-radius: 3px; }

      .idx { font-family: var(--mono); font-size: 0.85rem; white-space: nowrap; color: var(--text-h); }
      .indices tbody th, .ramp tbody th { white-space: nowrap; }

      dl.rules { margin: 1.25rem 0; }
      dl.rules dt { font-weight: 600; color: var(--text-h); margin-top: 1.1rem; }
      dl.rules dd { margin: 0.25rem 0 0; line-height: 1.6; }

      .cta {
        border-top: 1px solid var(--rule); margin-top: 2.5rem; padding-top: 1.5rem;
        display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.9rem 1.25rem;
      }
      .cta .button {
        background: var(--btn); color: var(--on-btn); text-decoration: none;
        padding: 0.6rem 1.15rem; border-radius: var(--r-sm); font-size: 0.95rem; font-weight: 500;
        white-space: nowrap;
      }
      .cta span { flex: 1 1 16rem; font-size: 0.93rem; color: var(--text); }

      .faq { margin-top: 3rem; }
      .faq h3 { font-family: var(--heading); font-size: 1.15rem; font-weight: 500; margin: 1.75rem 0 0.4rem; }

      .pagefoot {
        border-top: 1px solid var(--border); margin-top: 4rem; padding-top: 1.25rem;
        font-family: var(--mono); font-size: 11px; color: var(--text); line-height: 1.8;
      }
      .pagefoot a { color: var(--text-h); }
      .pagefoot .row { display: flex; flex-wrap: wrap; gap: 0 0.75rem; }

      @media (max-width: 640px) {
        .scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
        .scroll table { min-width: 34rem; }
      }
    </style>`;

/** The nav and footer every reference page carries — the internal links that tie the site together. */
const refNav = () =>
  [
    '    <header class="topbar">',
    '      <div class="bar">',
    '        <a class="brand" href="/">Twenty-One</a>',
    '        <nav>',
    '          <a href="/">Trainer</a>',
    ...REFERENCE_PAGES.map((p) => '          <a href="' + p.path + '">' + esc(p.nav) + '</a>'),
    '        </nav>',
    '      </div>',
    '    </header>',
  ].join('\n');

const refFoot = () =>
  [
    '      <footer class="pagefoot">',
    '        <div class="row">',
    '          <span>Practice the modes:</span>',
    ...ROUTES.filter((r) => r.id !== 'dashboard').map(
      (r) => '          <a href="' + r.path + '">' + esc(r.label) + '</a>',
    ),
    '        </div>',
    ACCOUNTS_ENABLED
      ? '        <p>Free practice software for the card game. No wagering, no real money. An account is ' +
        'optional and only syncs your progress — <a href="/privacy">what is stored</a>. Card counting ' +
        'is legal; casinos are private property and may still bar you. ' +
        '<a href="/about">Where the numbers come from</a>.</p>'
      : '        <p>Free practice software for the card game. No wagering, no real money, no accounts — ' +
        'your progress stays in this browser (<a href="/privacy">what is stored</a>). Card counting is ' +
        'legal; casinos are private property and may still bar you. ' +
        '<a href="/about">Where the numbers come from</a>.</p>',
    '      </footer>',
  ].join('\n');

/** The Q&A block, rendered for readers. The same questions go to search as FAQPage JSON-LD. */
const faqSection = (faqs) =>
  !faqs.length
    ? ''
    : [
        '    <section class="faq">',
        '      <h2>Common questions</h2>',
        ...faqs.map((f) => '      <h3>' + esc(f.q) + '</h3>\n      <p>' + esc(f.a) + '</p>'),
        '    </section>',
      ].join('\n');

/** Wrap the chart tables so a 10-column grid scrolls instead of shrinking on a phone. */
const scrollWrapTables = (html) =>
  html.split('    <table class="chart">').join('    <div class="scroll"><table class="chart">')
      .split('\n    </table>').join('\n    </table></div>');

function referenceDocument(page) {
  const built = BUILDERS[page.slug](page);
  const block = seoBlock({
    title: page.title,
    description: page.description,
    path: page.path,
    type: 'article',
    jsonLd: built.jsonLd,
  });
  return [
    '<!doctype html>',
    '<html lang="' + SITE.lang + '">',
    '  <head>',
    '    <meta charset="UTF-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    block,
    '    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />',
    '    <link rel="manifest" href="/site.webmanifest" />',
    '    <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f4f1ea" />',
    '    <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1a1713" />',
    '    <meta name="color-scheme" content="light dark" />',
    '    <link rel="preload" as="font" type="font/woff2" crossorigin href="/fonts/newsreader-var.woff2" />',
    '    <link rel="preload" as="font" type="font/woff2" crossorigin href="/fonts/ibm-plex-sans-var.woff2" />',
    '    <link rel="stylesheet" href="' + CSS_HREF + '" />',
    PAGE_CSS,
    '  </head>',
    '  <body>',
    refNav(),
    '    <div class="wrap">',
    scrollWrapTables(built.body),
    faqSection(built.faqs),
    refFoot(),
    '    </div>',
    '  </body>',
    '</html>',
    '',
  ].join('\n');
}

for (const page of REFERENCE_PAGES) {
  written.push(write(page.slug + '.html', referenceDocument(page)));
}

// ── 404 ──────────────────────────────────────────────────────────────────────────────────────
// A real 404 rather than an SPA catch-all: every route the app has is a file on disk, so anything
// that misses is genuinely missing, and telling a crawler otherwise creates soft-404s.
written.push(
  write(
    '404.html',
    referenceDocument({
      slug: 'about',
      path: '/404',
      nav: 'Not found',
      heading: 'That page is not here',
      title: 'Page not found — Twenty-One Blackjack Trainer',
      description: 'The page you asked for does not exist on this site.',
    })
      // The 404 borrows the reference layout but not its content.
      .replace(/<div class="wrap">[\s\S]*<footer class="pagefoot">/, [
        '<div class="wrap">',
        '    <h1>That page is not here</h1>',
        '    <p class="lede">The link may be old, or mistyped. Everything on the site is one of these:</p>',
        '    <p><a href="/">The trainer</a> — ' +
          ROUTES.filter((r) => r.id !== 'dashboard')
            .map((r) => '<a href="' + r.path + '">' + esc(r.label) + '</a>')
            .join(', ') +
          '.</p>',
        '    <p>Or the written pages: ' +
          REFERENCE_PAGES.map((p) => '<a href="' + p.path + '">' + esc(p.nav) + '</a>').join(', ') +
          '.</p>',
        '      <footer class="pagefoot">',
      ].join('\n'))
      .replace('<title>', '<meta name="robots" content="noindex" />\n    <title>'),
  ),
);

// ── sitemap.xml ──────────────────────────────────────────────────────────────────────────────
// Dates are the build date: these pages are generated, so "when did this change" is "when was it
// last built". Lying about lastmod is worse than omitting it, and this is the honest answer.
const today = new Date().toISOString().slice(0, 10);
const urls = [
  ...ROUTES.map((r) => ({ path: r.path, priority: r.id === 'dashboard' ? '1.0' : '0.7' })),
  ...REFERENCE_PAGES.map((p) => ({ path: p.path, priority: p.priority })),
];
written.push(
  write(
    'sitemap.xml',
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map((u) =>
        [
          '  <url>',
          '    <loc>' + urlFor(u.path) + '</loc>',
          '    <lastmod>' + today + '</lastmod>',
          '    <priority>' + u.priority + '</priority>',
          '  </url>',
        ].join('\n'),
      ),
      '</urlset>',
      '',
    ].join('\n'),
  ),
);

// ── robots.txt ───────────────────────────────────────────────────────────────────────────────
written.push(
  write(
    'robots.txt',
    [
      '# Everything here is public and meant to be read.',
      'User-agent: *',
      'Allow: /',
      '',
      'Sitemap: ' + urlFor('/sitemap.xml'),
      '',
    ].join('\n'),
  ),
);

// ── web manifest ─────────────────────────────────────────────────────────────────────────────
written.push(
  write(
    'site.webmanifest',
    JSON.stringify(
      {
        name: SITE.fullName,
        short_name: SITE.name,
        description: SITE.tagline,
        start_url: '/',
        display: 'standalone',
        background_color: '#f4f1ea',
        theme_color: '#f4f1ea',
        icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      null,
      2,
    ) + '\n',
  ),
);

// ── Cloudflare Pages headers ─────────────────────────────────────────────────────────────────
// Vite fingerprints the bundle filenames, so those can be cached forever; the HTML cannot, or a
// deploy would not reach anyone. The fonts never change name either.
written.push(
  write(
    '_headers',
    [
      '/assets/*',
      '  Cache-Control: public, max-age=31536000, immutable',
      '',
      '/fonts/*',
      '  Cache-Control: public, max-age=31536000, immutable',
      '',
      '/*',
      '  X-Content-Type-Options: nosniff',
      '  Referrer-Policy: strict-origin-when-cross-origin',
      // The app talks to nobody: no API, no analytics, no embeds. Say so, and a bug cannot
      // quietly turn into a request to somewhere else.
      "  Content-Security-Policy: default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'",
      '',
      '/*.html',
      '  Cache-Control: public, max-age=0, must-revalidate',
      '',
    ].join('\n'),
  ),
);

// ── report ───────────────────────────────────────────────────────────────────────────────────
const pad = (s, n) => String(s).padEnd(n);
console.log('\nseo build — ' + SITE.origin);
for (const f of written) {
  console.log('  ' + pad(f.rel, 32) + (f.bytes / 1024).toFixed(1).padStart(7) + ' kB');
}
console.log('\n  ' + written.length + ' files · ' + urls.length + ' URLs in the sitemap');

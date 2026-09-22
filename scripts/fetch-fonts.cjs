#!/usr/bin/env node
// Fetch the site's typefaces from Google Fonts and self-host them. Run it by hand, not on every
// build — the output is committed, so a build never depends on Google being reachable.
//
//   node scripts/fetch-fonts.cjs
//
// Why self-host at all: <link> to fonts.googleapis.com is render-blocking and costs two extra TLS
// connections before the first letter can be drawn. From our own origin, preloaded, with
// font-display: swap, the text paints immediately and the CDN caches the files forever.
//
// Two economies are applied here, and both matter:
//   · Latin subset only. This is an English-language site about a card game; the Cyrillic,
//     Greek and Vietnamese subsets Google offers would be ~4x the bytes for no reader.
//   · Deduplicate by content. Google serves a VARIABLE font file for Newsreader and IBM Plex
//     Sans, which means the "400", "500" and "600" URLs are byte-for-byte the same file. Naively
//     saving one per weight cost 836 KB; storing each distinct file once and declaring a weight
//     RANGE on the @font-face costs ~346 KB for exactly the same rendering.

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

const CSS_URL =
  'https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500' +
  '&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap';

// A browser UA is required: Google serves ancient .ttf to anything it does not recognise.
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

// The woff2 files are static assets (served straight from /fonts/...).
const OUT = path.join('public', 'fonts');
// The @font-face sheet is a SOURCE file, so Vite bundles it into the app's one stylesheet.
// That is the point: no second request, no render-blocking <link>, dev and prod identical.
const SHEET = path.join('src', 'fonts.css');

const get = (url, binary) =>
  new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': UA } }, (res) => {
        if (res.statusCode !== 200) return reject(new Error(url + ' -> ' + res.statusCode));
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(binary ? Buffer.concat(chunks) : Buffer.concat(chunks).toString('utf8')));
      })
      .on('error', reject);
  });

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

(async () => {
  const css = await get(CSS_URL, false);

  const faces = [];
  for (const raw of css.split('@font-face').slice(1)) {
    const body = raw.slice(raw.indexOf('{') + 1, raw.indexOf('}'));
    const field = (name) => (body.match(new RegExp(name + ':\s*([^;]+);')) || [])[1]?.trim();
    // The 'latin' subset is the block whose range opens on plain ASCII.
    if (!(field('unicode-range') || '').startsWith('U+0000-00FF')) continue;
    const url = (body.match(/url\((https:[^)]+)\)/) || [])[1];
    if (!url) continue;
    faces.push({
      family: field('font-family').replace(/['"]/g, ''),
      style: field('font-style'),
      weight: Number(field('font-weight')),
      url,
    });
  }
  if (!faces.length) throw new Error('no latin faces found — did the Google CSS format change?');

  // Download once per distinct URL, then group identical payloads: a variable font answers to
  // several weights from one file, and that is the whole saving.
  const byHash = new Map();
  for (const f of faces) {
    const buf = await get(f.url, true);
    const hash = crypto.createHash('sha1').update(buf).digest('hex');
    if (!byHash.has(hash)) byHash.set(hash, { buf, family: f.family, style: f.style, weights: [] });
    byHash.get(hash).weights.push(f.weight);
  }

  // Clear the contents rather than the directory: on Windows the folder may be someone's cwd.
  fs.mkdirSync(OUT, { recursive: true });
  for (const f of fs.readdirSync(OUT)) fs.rmSync(path.join(OUT, f), { force: true });

  let total = 0;
  const written = [];
  for (const entry of byHash.values()) {
    const lo = Math.min(...entry.weights);
    const hi = Math.max(...entry.weights);
    // A single weight keeps its number in the filename; a range says "var" rather than lying.
    const tag = lo === hi ? String(lo) : 'var';
    const name = slug(entry.family) + '-' + tag + (entry.style === 'italic' ? '-italic' : '') + '.woff2';
    fs.writeFileSync(path.join(OUT, name), entry.buf);
    total += entry.buf.length;
    written.push(Object.assign({}, entry, { name, lo, hi }));
    console.log(
      (entry.buf.length / 1024).toFixed(1).padStart(7) + ' KB  ' + name + '  (weights ' + entry.weights.join(', ') + ')',
    );
  }

  const head = [
    '/* Self-hosted webfonts, latin subset. GENERATED — do not edit.',
    ' *',
    ' * Regenerate with:  node scripts/fetch-fonts.cjs',
    ' *',
    ' * Newsreader and IBM Plex Sans are variable fonts, so one file answers a weight range; the',
    ' * weight range below is what lets a single file serve 400, 500 and 600 without three copies.',
    ' */',
    '',
  ].join('\n');

  const sheet = written
    .map((f) =>
      [
        '@font-face {',
        "  font-family: '" + f.family + "';",
        '  font-style: ' + f.style + ';',
        '  font-weight: ' + (f.lo === f.hi ? f.lo : f.lo + ' ' + f.hi) + ';',
        '  font-display: swap;',
        "  src: url('/fonts/" + f.name + "') format('woff2');",
        '}',
      ].join('\n'),
    )
    .join('\n\n');

  fs.writeFileSync(SHEET, head + sheet + String.fromCharCode(10));

  console.log('\n' + written.length + ' files, ' + (total / 1024).toFixed(0) + ' KB total in ' + OUT + '/');
  console.log('\nPreload these (the faces the first screen actually needs):');
  for (const f of written.filter((x) => x.style !== 'italic')) console.log('  /fonts/' + f.name);
})();

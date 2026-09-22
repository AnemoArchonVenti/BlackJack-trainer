#!/usr/bin/env node
// Regenerate the two raster images the site needs: the Open Graph card and the iOS touch icon.
// Run it by hand when the wording or the palette changes — the output is committed.
//
//   node scripts/make-images.cjs      (or: npm run images)
//
// Both are rendered by headless Chrome from the HTML sources in scripts/seo/, over a throwaway
// local server so the pages can load the real self-hosted webfonts from public/fonts/. That is
// the whole reason this is not an SVG: an OG card has to be a raster image, because Slack,
// Discord, iMessage, X and Facebook all decline to render SVG previews.
//
// Chrome is found from CHROME_PATH, or from the usual install locations.

const fs = require('fs');
const path = require('path');
const http = require('http');
const os = require('os');
const { execFile } = require('child_process');

const PORT = 4319;
const SRC = path.join('scripts', 'seo');

const TARGETS = [
  { page: 'og-card.html', out: path.join('public', 'og.png'), width: 1200, height: 630 },
  { page: 'icon.html', out: path.join('public', 'apple-touch-icon.png'), width: 180, height: 180 },
];

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  process.env.LOCALAPPDATA && process.env.LOCALAPPDATA + '/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].filter(Boolean);

const chrome = CANDIDATES.find((p) => {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
});
if (!chrome) {
  console.error('Could not find Chrome. Set CHROME_PATH to its executable and re-run.');
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

// Serves the card sources at the root and everything else out of public/, so '/fonts/x.woff2'
// resolves exactly as it will in production.
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const candidates = [path.join(SRC, url.slice(1)), path.join('public', url.slice(1))];
  const file = candidates.find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
  if (!file) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  res.end(fs.readFileSync(file));
});

/**
 * Shoot one page.
 *
 * This MUST be async. The server above lives in this same process, so a synchronous spawn would
 * block the event loop, Chrome's request for the page would never be answered, and the whole
 * thing would sit there until the timeout — which is exactly what it did before.
 */
const shoot = (t) =>
  new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(t.out), { recursive: true });
    execFile(
      chrome,
      [
        '--headless=new',
        // Its own throwaway profile, so this never tries to talk to a Chrome the user already
        // has open; a fresh profile then has to be told to skip its first-launch chores.
        '--user-data-dir=' + fs.mkdtempSync(path.join(os.tmpdir(), 'tw21-shot-')),
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-extensions',
        '--disable-gpu',
        '--hide-scrollbars',
        '--force-device-scale-factor=1',
        '--window-size=' + t.width + ',' + t.height,
        // Give the webfonts time to land before the shutter; without it the card can render in a
        // fallback serif and look subtly wrong in a way nobody notices until it has shipped.
        '--virtual-time-budget=5000',
        '--screenshot=' + path.resolve(t.out),
        'http://127.0.0.1:' + PORT + '/' + t.page,
      ],
      { timeout: 90_000, maxBuffer: 16 * 1024 * 1024 },
      (err) => {
        if (err) return reject(new Error(t.page + ': ' + err.message));
        if (!fs.existsSync(t.out)) return reject(new Error(t.page + ': Chrome wrote no file'));
        const kb = (fs.statSync(t.out).size / 1024).toFixed(1);
        console.log('  ' + t.out.padEnd(32) + t.width + 'x' + t.height + '  ' + kb + ' kB');
        resolve();
      },
    );
  });

server.listen(PORT, '127.0.0.1', async () => {
  try {
    for (const t of TARGETS) await shoot(t);
    console.log('\nimages rebuilt');
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('\nfailed: ' + err.message);
    server.close();
    process.exit(1);
  }
});

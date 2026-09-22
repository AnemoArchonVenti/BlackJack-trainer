import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTES, MODES, parseRoute, hrefFor, legacyHashPath } from './router.js';

test('the route table is the dashboard plus one entry per practice mode', () => {
  assert.equal(ROUTES[0].id, 'dashboard', 'the landing route is the dashboard hub (F3)');
  assert.deepEqual(MODES.map((r) => r.id), ['play', 'counting', 'deviations', 'integration', 'progress'],
    'every mode is reachable from the free menu');
  for (const r of ROUTES) {
    assert.ok(r.label, `${r.id} has a nav label`);
    assert.ok(r.path.startsWith('/'), `${r.id} has a path`);
  }
});

test('every route carries the two strings the tab and the search result share', () => {
  for (const r of ROUTES) {
    assert.ok(r.title && r.title.length <= 70, `${r.id} has a title that fits a search result`);
    assert.ok(r.description, `${r.id} has a description`);
    const len = r.description.length;
    assert.ok(len >= 70 && len <= 320, `${r.id} description is ${len} chars — aim for a readable snippet`);
  }
  const titles = new Set(ROUTES.map((r) => r.title));
  assert.equal(titles.size, ROUTES.length, 'no two pages share a title — duplicates get collapsed in search');
});

test('parseRoute resolves a path to a route and never returns nothing', () => {
  assert.equal(parseRoute('/play').id, 'play');
  assert.equal(parseRoute('/counting').id, 'counting');
  assert.equal(parseRoute('/play/').id, 'play', 'a trailing slash is the same route');
  assert.equal(parseRoute('https://twentyonetrainer.com/counting').id, 'counting', 'an absolute URL resolves too');

  for (const empty of ['', '/', undefined]) {
    assert.equal(parseRoute(empty).id, 'dashboard', `"${empty}" lands on the dashboard`);
  }
  assert.equal(parseRoute('/does-not-exist').id, 'dashboard', 'an unknown route falls back, it does not blank the app');
  assert.equal(parseRoute('/play?seed=7').id, 'play', 'a query string still resolves the route');
});

test('links bookmarked from the hash-routed build still land', () => {
  assert.equal(parseRoute('#/play').id, 'play', 'an old bookmark is not a dead end');
  assert.equal(parseRoute('/#/integration').id, 'integration');
  assert.equal(legacyHashPath('/#/counting'), '/counting', 'and the shell knows where to rewrite it to');
  assert.equal(legacyHashPath('/counting'), null, 'a real path is not a legacy link');
  assert.equal(legacyHashPath('/play#main'), null, 'a page anchor is not a legacy link');
});

test('hrefFor round-trips every route through the address bar', () => {
  for (const route of ROUTES) {
    assert.equal(parseRoute(hrefFor(route.id)).id, route.id, `${route.id} round-trips`);
    assert.ok(hrefFor(route.id).startsWith('/'), 'links are real paths — crawlable, not fragments');
    assert.ok(!hrefFor(route.id).includes('#'), 'no fragment survives in a nav link');
  }
  assert.equal(hrefFor('dashboard'), '/');
});

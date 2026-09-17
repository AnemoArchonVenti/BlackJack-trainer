import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ROUTES, MODES, parseRoute, hrefFor } from './router.js';

test('the route table is the dashboard plus one entry per practice mode', () => {
  assert.equal(ROUTES[0].id, 'dashboard', 'the landing route is the dashboard hub (F3)');
  assert.deepEqual(MODES.map((r) => r.id), ['play', 'counting', 'deviations', 'progress'],
    'every mode is reachable from the free menu');
  for (const r of ROUTES) {
    assert.ok(r.label, `${r.id} has a nav label`);
    assert.ok(r.path.startsWith('/'), `${r.id} has a path`);
  }
});

test('parseRoute resolves a hash to a route and never returns nothing', () => {
  assert.equal(parseRoute('#/play').id, 'play');
  assert.equal(parseRoute('#/counting').id, 'counting');

  for (const empty of ['', '#', '#/', undefined]) {
    assert.equal(parseRoute(empty).id, 'dashboard', `"${empty}" lands on the dashboard`);
  }
  assert.equal(parseRoute('#/does-not-exist').id, 'dashboard', 'an unknown route falls back, it does not blank the app');
  assert.equal(parseRoute('#/play?seed=7').id, 'play', 'a query string still resolves the route');
});

test('hrefFor round-trips every route through the address bar', () => {
  for (const route of ROUTES) {
    assert.equal(parseRoute(hrefFor(route.id)).id, route.id, `${route.id} round-trips`);
    assert.ok(hrefFor(route.id).startsWith('#'), 'links stay client-side — no page load');
  }
  assert.equal(hrefFor('dashboard'), '#/');
});

<script>
  // The app shell (SPEC §11 F3): one page, hash routing, a persistent switcher listing every mode.
  // The free menu is never locked — gates guide, they do not gate (SPEC Q5=C).
  //
  // Editorial skin (DESIGN-SPEC §5.1): a 76px bar on the page ground, not a panel. The active
  // mode is marked by a 2px green underline sitting on the bar's bottom hairline — no pill, no
  // filled background anywhere in the nav. The shell no longer prints a route title; each route
  // sets its own heading, so the page starts with the words that route wants to lead with.
  import { ROUTES, parseRoute, hrefFor } from './router.js';
  import { RULE_LINE, METHOD_LINE } from '../lib/house.js';
  import Dashboard from './Dashboard.svelte';
  import Settings from '../lib/Settings.svelte';
  import Table from '../lib/Table.svelte';
  import Counting from '../lib/Counting.svelte';
  import Flashcards from '../lib/Flashcards.svelte';
  import Integration from '../lib/Integration.svelte';
  import Progress from '../lib/Progress.svelte';

  const VIEWS = {
    dashboard: Dashboard, play: Table, counting: Counting,
    deviations: Flashcards, integration: Integration, progress: Progress,
  };

  let hash = $state(typeof location === 'undefined' ? '' : location.hash);
  const route = $derived(parseRoute(hash));
  const View = $derived(VIEWS[route.id]);
  let settingsOpen = $state(false);
</script>

<svelte:window onhashchange={() => (hash = location.hash)} />

<a class="skip" href="#main">Skip to content</a>

<header class="topbar">
  <div class="bar">
    <a class="brand" href={hrefFor('dashboard')}>Twenty-One</a>

    <!-- Every route, dashboard included: the underline is the "you are here", so the hub needs a
         seat in it too (design/editorial mockups). The menu is still never locked. -->
    <nav aria-label="Practice modes">
      {#each ROUTES as r (r.id)}
        <a href={hrefFor(r.id)} aria-current={route.id === r.id ? 'page' : undefined} title={r.blurb}>
          {r.label}
        </a>
      {/each}
    </nav>

    <button class="settings-toggle" aria-expanded={settingsOpen} onclick={() => (settingsOpen = !settingsOpen)}>
      Settings
    </button>
  </div>
</header>

{#if settingsOpen}
  <Settings onClose={() => (settingsOpen = false)} />
{/if}

<main id="main" tabindex="-1">
  <View />
</main>

<!-- On every page, because a player should never have to guess which game they are being graded
     against. Both lines come from lib/house.js, which spells them from the engine. -->
<footer class="footer">
  <p><span class="tag">The game</span>{RULE_LINE}</p>
  <p><span class="tag">The method</span>{METHOD_LINE}</p>
</footer>

<style>
  .skip {
    position: absolute; left: -999px; top: 0; z-index: 10;
    background: var(--panel); color: var(--text-h); padding: 0.5rem 0.9rem;
    border: 1px solid var(--border); border-radius: var(--r-sm);
  }
  .skip:focus { left: 0.5rem; top: 0.5rem; }

  /* The bar is the page ground with a hairline under it — deliberately not a raised panel. */
  .topbar {
    border-bottom: 1px solid var(--border);
    background: var(--bg);
    position: sticky; top: 0; z-index: 5;
  }
  .bar {
    max-width: var(--content); margin: 0 auto; padding: 0 var(--pad);
    height: var(--bar);
    display: flex; align-items: center; justify-content: space-between; gap: var(--s-4);
  }

  .brand {
    font-family: var(--heading); font-style: italic; font-size: 28px; font-weight: 500;
    letter-spacing: -0.01em; color: var(--text-h); text-decoration: none;
  }

  nav { display: flex; gap: var(--gutter); font-size: 15px; }
  nav a {
    /* 26px of padding puts the active underline on the bar's own bottom hairline. */
    padding: 26px 0; text-decoration: none; color: var(--text);
    border-bottom: 2px solid transparent;
  }
  nav a:hover { color: var(--text-h); }
  nav a[aria-current='page'] { color: var(--text-h); font-weight: 500; border-bottom-color: var(--accent); }

  .settings-toggle {
    padding: 8px 14px; border: 1px solid var(--border); border-radius: var(--r-sm);
    background: none; color: var(--text-h); font: inherit; font-size: 14px; cursor: pointer;
  }
  .settings-toggle:hover { background: var(--hover); }

  main { display: block; outline: none; }

  .footer {
    border-top: 1px solid var(--border);
    margin-top: var(--s-6);
  }
  .footer p {
    max-width: var(--content); margin: 0 auto; padding: 0 var(--pad);
    min-height: 34px; display: flex; align-items: center; flex-wrap: wrap; gap: 0 10px;
    font-family: var(--mono); font-size: 12px; color: var(--text);
  }
  .footer p:first-of-type { padding-top: 12px; }
  .footer p:last-of-type { padding-bottom: 12px; }
  /* The label the line answers, in the same uppercase mono the page uses for every kicker. */
  .footer .tag {
    min-width: 92px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-h);
  }

  /* Phone: the bar grows to two rows and the modes scroll sideways rather than wrapping into
     a block that pushes the felt off screen. */
  @media (max-width: 860px) {
    .bar { height: auto; padding-top: var(--s-2); flex-wrap: wrap; row-gap: 0; }
    .brand { font-size: 24px; }
    nav {
      order: 3; width: 100%; gap: var(--s-4); font-size: 14px;
      overflow-x: auto; scrollbar-width: none;
    }
    nav a { padding: 12px 0; white-space: nowrap; }
  }
</style>

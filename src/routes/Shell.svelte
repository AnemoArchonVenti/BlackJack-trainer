<script>
  // The app shell (SPEC §11 F3): one page, hash routing, a persistent switcher listing every mode.
  // The free menu is never locked — gates guide, they do not gate (SPEC Q5=C).
  // This replaces the minimal placeholder shell #3 stood up.
  import { ROUTES, MODES, parseRoute, hrefFor } from './router.js';
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
  <a class="brand" href={hrefFor('dashboard')}>
    <span aria-hidden="true">♠</span> Blackjack Trainer
  </a>

  <nav aria-label="Practice modes">
    {#each MODES as mode (mode.id)}
      <a href={hrefFor(mode.id)} aria-current={route.id === mode.id ? 'page' : undefined} title={mode.blurb}>
        {mode.label}
      </a>
    {/each}
  </nav>

  <button class="settings-toggle" aria-expanded={settingsOpen} onclick={() => (settingsOpen = !settingsOpen)}>
    Settings
  </button>
</header>

{#if settingsOpen}
  <Settings onClose={() => (settingsOpen = false)} />
{/if}

<main id="main" tabindex="-1">
  <h1 class="route-title">{route.id === 'dashboard' ? 'Dashboard' : route.label}</h1>
  <View />
</main>

<footer class="footer">
  <p>6 decks · dealer stands on soft 17 · double after split · late surrender</p>
</footer>

<style>
  .skip {
    position: absolute; left: -999px; top: 0; z-index: 10;
    background: var(--panel); color: var(--text-h); padding: 0.5rem 0.9rem; border-radius: var(--r-sm);
  }
  .skip:focus { left: 0.5rem; top: 0.5rem; }

  .topbar {
    display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;
    padding: 0.7rem clamp(0.75rem, 3vw, 1.5rem);
    border-bottom: 1px solid var(--border); background: var(--panel);
    position: sticky; top: 0; z-index: 5;
  }
  .brand {
    font-weight: 700; color: var(--text-h); text-decoration: none;
    font-size: 1rem; letter-spacing: -0.2px; margin-right: auto;
  }
  nav { display: flex; gap: 0.2rem; flex-wrap: wrap; }
  nav a {
    padding: 0.35rem 0.75rem; border-radius: var(--r-sm); text-decoration: none;
    color: var(--text); font-size: 0.86rem; font-weight: 500;
  }
  nav a:hover { background: var(--hover); color: var(--text-h); }
  nav a[aria-current='page'] { background: var(--accent-bg); color: var(--text-h); }

  .settings-toggle {
    padding: 0.35rem 0.75rem; border: 1px solid var(--border); border-radius: var(--r-sm);
    background: none; color: var(--text); font: inherit; font-size: 0.86rem; cursor: pointer;
  }
  .settings-toggle:hover { color: var(--text-h); }

  main { display: block; outline: none; }
  .route-title {
    font-size: 1.15rem; font-weight: 600; color: var(--text-h);
    margin: 1.1rem auto 0; max-width: 1120px; padding: 0 clamp(0.75rem, 3vw, 1.5rem); text-align: left;
  }
  .footer {
    margin-top: 2rem; padding: 1rem; border-top: 1px solid var(--border);
    font-size: 0.75rem; text-align: center; opacity: 0.7;
  }

  @media (max-width: 560px) {
    .brand { width: 100%; margin-right: 0; }
    nav { order: 3; width: 100%; }
    nav a { flex: 1 1 auto; text-align: center; }
  }
</style>

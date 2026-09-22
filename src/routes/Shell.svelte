<script>
  // The app shell (SPEC §11 F3): one page, path routing, a persistent switcher listing every mode.
  // The free menu is never locked — gates guide, they do not gate (SPEC Q5=C).
  //
  // Routing is path-based via the History API (was hash-based through v1). Every mode is a real
  // URL that can be indexed, shared and opened cold: the build writes one HTML file per route, so
  // /counting is served as its own document and the app takes over from there. Internal links are
  // ordinary <a href="/counting"> anchors — a crawler follows them, a middle-click opens a tab,
  // and the click handler below turns a plain left-click into a pushState instead of a page load.
  //
  // Editorial skin (DESIGN-SPEC §5.1): a 76px bar on the page ground, not a panel. The active
  // mode is marked by a 2px green underline sitting on the bar's bottom hairline — no pill, no
  // filled background anywhere in the nav. The shell no longer prints a route title; each route
  // sets its own heading, so the page starts with the words that route wants to lead with.
  import { ROUTES, parseRoute, hrefFor, legacyHashPath } from './router.js';
  import { ruleLineFor, METHOD_LINE } from '../lib/house.js';
  import { REFERENCE_PAGES, SITE } from '../site.js';
  import { session, ui, toggleSettings, closeSettings, adoptProfile } from '../lib/session.svelte.js';
  import { account, initAccount, resolveConflict } from '../lib/account.svelte.js';
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

  const browser = typeof location !== 'undefined';

  let path = $state(browser ? location.pathname : '/');
  const route = $derived(parseRoute(path));
  const View = $derived(VIEWS[route.id]);

  /** Send the address bar somewhere without a page load, and take the view with it. */
  function go(to, { replace = false } = {}) {
    if (!browser) return;
    if (replace) history.replaceState({}, '', to);
    else history.pushState({}, '', to);
    path = location.pathname;
    closeSettings();
    // A route change is a new page to a person using a screen reader, so move focus to it.
    document.getElementById('main')?.focus();
    window.scrollTo(0, 0);
  }

  /**
   * Turn a plain left-click on an in-app link into client-side navigation. Anything a person
   * means as "open this properly" — a new tab, a download, an external host, a reference page
   * that is its own static document — is left alone for the browser to handle.
   */
  function onClick(event) {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a');
    if (!link) return;
    if (link.target && link.target !== '_self') return;
    if (link.hasAttribute('download') || link.getAttribute('rel')?.includes('external')) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || /^[a-z]+:/i.test(href)) return;

    // Only the app's own routes navigate client-side. The reference pages are separate static
    // documents with their own <head>, so the browser loads them properly rather than the shell
    // swallowing the click and rendering the dashboard over the top.
    // Trailing slashes and query strings are noise; the route table holds bare paths.
    let clean = href.split('?')[0];
    while (clean.length > 1 && clean.endsWith('/')) clean = clean.slice(0, -1);
    if (!ROUTES.some((r) => r.path === (clean || '/'))) return;

    event.preventDefault();
    go(href);
  }

  // Ask the server whether this browser is signed in, once, after the app has already rendered
  // from localStorage. Nothing waits on it — the trainer works signed out and offline.
  $effect(() => {
    if (browser) initAccount(adoptProfile);
  });

  $effect(() => {
    if (!browser) return;
    // An old '#/play' bookmark from the hash-routed build: rewrite it to the real URL once, so
    // the address bar, the canonical tag and anything the person copies all agree.
    const legacy = legacyHashPath(location.hash);
    if (legacy) go(legacy, { replace: true });
  });

  // The tab, the canonical URL and the description follow the route — the same two strings the
  // prerendered <head> was built from, so a client-side move to /counting looks like a cold load.
  $effect(() => {
    if (!browser) return;
    document.title = route.title;
    const set = (selector, attr, value) => {
      const el = document.head.querySelector(selector);
      if (el) el.setAttribute(attr, value);
    };
    set('meta[name="description"]', 'content', route.description);
    set('link[rel="canonical"]', 'href', `${SITE.origin}${route.path}`);
    set('meta[property="og:title"]', 'content', route.title);
    set('meta[property="og:description"]', 'content', route.description);
    set('meta[property="og:url"]', 'content', `${SITE.origin}${route.path}`);
  });
</script>

<svelte:window onpopstate={() => (path = location.pathname)} />
<svelte:document onclick={onClick} />

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

    <button class="settings-toggle" aria-expanded={ui.settingsOpen} onclick={toggleSettings}>
      Settings
    </button>
  </div>
</header>

{#if ui.settingsOpen}
  <Settings onClose={closeSettings} />
{/if}

<!-- Two copies of your progress disagree. Nothing is touched until this is answered, because
     silently picking one of them throws the other away. -->
{#if account.conflict}
  <div class="conflict" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
    <div class="sheet">
      <h2 id="conflict-title">Two sets of progress</h2>
      <p>
        This browser has progress that your account does not, and your account has progress this
        browser does not. Keeping one means overwriting the other, so pick which is the real one.
      </p>
      <div class="choices">
        <button class="primary" onclick={() => resolveConflict('local')}>
          Keep this browser&rsquo;s progress
        </button>
        <button class="primary" onclick={() => resolveConflict('remote')}>
          Use my account&rsquo;s progress
        </button>
      </div>
    </div>
  </div>
{/if}

<main id="main" tabindex="-1">
  <View />
</main>

<!-- On every page, because a player should never have to guess which game they are being graded
     against. Both lines come from lib/house.js, which spells them from the engine. -->
<footer class="footer">
  <p><span class="tag">The game</span>{ruleLineFor(session.settings.decks)}</p>
  <p><span class="tag">The method</span>{METHOD_LINE}</p>
  <!-- The written pages. They are static documents rather than app routes, so these are ordinary
       links the browser loads — and the path a reader takes in from a search result. -->
  <p class="reading">
    <span class="tag">Read</span>
    {#each REFERENCE_PAGES as page, i (page.path)}
      <a href={page.path}>{page.nav}</a>{#if i < REFERENCE_PAGES.length - 1}<span class="sep">·</span>{/if}
    {/each}
  </p>
  <p class="fine">
    <span class="tag">Note</span>
    <span class="body">
      Free practice software. No wagering and no real money. An account is optional and only syncs
      your progress — <a href="/privacy">what is stored</a>. Card counting is legal; casinos are
      private property and may still bar you.
    </span>
  </p>
</footer>

<style>
  /* The conflict prompt is the one modal in the app, because it is the one moment where
     carrying on without an answer would destroy something. */
  .conflict {
    position: fixed; inset: 0; z-index: 50; display: grid; place-items: center;
    background: rgba(28, 26, 23, 0.55); padding: var(--s-3);
  }
  .conflict .sheet {
    background: var(--panel); border: 1px solid var(--border); border-radius: var(--r-md);
    max-width: 34rem; padding: var(--s-4); box-shadow: none;
  }
  .conflict h2 {
    font-family: var(--heading); font-weight: 500; font-size: 1.5rem; margin: 0 0 var(--s-2);
    color: var(--text-h);
  }
  .conflict p { margin: 0 0 var(--s-3); line-height: 1.6; color: var(--text); }
  .conflict .choices { display: flex; gap: var(--s-2); flex-wrap: wrap; }
  .conflict .primary {
    padding: 9px 14px; border: 1px solid var(--border); border-radius: var(--r-sm);
    background: none; color: var(--text-h); font: inherit; font-size: 14px; cursor: pointer;
  }
  .conflict .primary:hover { background: var(--hover); border-color: var(--accent); }

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

  /* The reading links are the way in from a search result, so they are underlined like prose
     rather than styled as nav — a reader should read them as sentences, not as chrome. */
  .footer .reading a {
    color: var(--text-h); text-decoration: none;
    border-bottom: 1px solid var(--border); padding-bottom: 1px;
  }
  .footer .reading a:hover { border-bottom-color: var(--accent); }
  .footer .sep { color: var(--border); }

  /* The disclaimer runs as a sentence, so it does not get the single-line flex treatment. */
  .footer .fine {
    align-items: flex-start; line-height: 1.6; padding-bottom: 12px;
    font-size: 11px; letter-spacing: 0.01em;
  }
  .footer .fine .tag { flex: 0 0 92px; line-height: 1.6; }
  /* The sentence is one flex item so it sits beside its label instead of wrapping underneath it. */
  .footer .fine .body { flex: 1 1 22rem; }

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

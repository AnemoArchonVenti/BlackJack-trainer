# Deploying, and being found

The trainer is a static site: `npm run build` produces a `dist/` that any static host serves.
It is deployed to **Cloudflare Pages**, built from this repo on every push to `main`.

Everything in this document that only you can do — registering a domain, creating accounts,
verifying ownership — is marked **[you]**.

---

## 1. The domain

The site is built against one origin, declared in a single place:

```js
// src/site.js
export const ORIGIN = 'https://twentyonetrainer.com';
```

Change that line and every canonical tag, Open Graph URL, sitemap entry and `robots.txt` line
follows on the next build. Nothing else hard-codes the domain.

**[you]** Register the domain, then add it to Cloudflare:

1. Register `twentyonetrainer.com` at any registrar (~$10–12/yr). Namecheap, Porkbun and
   Cloudflare Registrar are all fine; Cloudflare Registrar sells at cost and saves a step.
2. In the Cloudflare dashboard, **Add a site** and follow the DNS instructions. If you registered
   elsewhere, this means pointing the registrar's nameservers at Cloudflare.

Verified available at time of writing, if you would rather pick another:
`basicstrategytrainer.com`, `softseventeen.com`, `illustrious18.com`, `deckcountdown.com`,
`twentyonedrill.com`, `countingtrainer.com`.

---

## 2. Cloudflare Workers (static assets)

The site deploys as a **Workers static-assets** project, not a Pages project. Cloudflare has
folded Pages into Workers: `wrangler pages deploy` now delegates into the Workers path anyway,
and creating a classic Pages project survives only behind a `--force` flag. Since this is a
directory of static files with no server-side code, an assets-only Worker is the right shape —
`wrangler.toml` has no `main`, because there is no script to run.

Everything is declared in `wrangler.toml`, including the custom domains, so a deploy attaches
them itself and there is no dashboard state that can drift from the repo:

```toml
workers_dev   = false                      # no *.workers.dev duplicate of the site
routes        = [ twentyonetrainer.com, www.twentyonetrainer.com ]   # both, as custom domains
[assets]
directory            = "./dist"
not_found_handling   = "404-page"          # a real 404, not a soft one
```

Deploying is then one command:

```sh
npm run build
npx wrangler deploy
```

`not_found_handling` matters more than it looks. The alternative, `single-page-application`,
answers every unknown URL with the app shell and a 200 — which manufactures soft-404s for Google
to index. Every route here is a real file, so anything that misses is genuinely missing.

### One dashboard setting the CLI token cannot reach

**[you]** `wrangler login` grants `zone:read`, not zone write, so this one is manual and is worth
doing once: **SSL/TLS → Edge Certificates → Always Use HTTPS → on**.

Without it, `http://twentyonetrainer.com` serves the site directly over plaintext instead of
redirecting to HTTPS, which is both a security gap and a duplicate of every page on an
unencrypted origin.

### Auto-deploy on push (optional)

**[you]** Workers Builds will rebuild on every push to `main`: in the Worker's settings, connect
the GitHub repo `AnemoArchonVenti/BlackJack-trainer` with build command `npm run build`. Until
that is set up, deploys are the two commands above.

### What the build produces

`npm run build` runs Vite and then `scripts/build-seo.js`, which writes:

- one HTML file per app route (`/play`, `/counting`, …), each with its own title, description,
  canonical link and Open Graph tags;
- the five reference pages, as static prose and tables generated from the engine;
- `sitemap.xml`, `robots.txt`, `404.html`, `site.webmanifest`;
- `_headers`, which Cloudflare reads to cache the fingerprinted assets and the fonts forever,
  keep HTML revalidating, and set the security headers including a strict Content-Security-Policy.

---

## 3. Tell Google it exists

**[you]** None of this can be automated; all of it is quick.

1. **Google Search Console** — <https://search.google.com/search-console>. Add a property.
   Choose **Domain** (not URL prefix) and verify with the DNS TXT record Cloudflare makes trivial
   to add. Then **Sitemaps → Add a new sitemap → `sitemap.xml`**.

   If you would rather verify with an HTML tag, paste the content value into
   `SITE.googleSiteVerification` in `src/site.js` and redeploy — the build puts the meta tag on
   every page and omits it entirely while that string is empty.

2. **Bing Webmaster Tools** — <https://www.bing.com/webmasters>. It can import everything
   straight from Search Console in one click, and it feeds ChatGPT search as well as Bing.

3. **Request indexing** for the pages that matter, in Search Console's URL Inspection tool:
   `/`, `/basic-strategy-chart`, `/card-counting`, `/illustrious-18`. This nudges the first
   crawl; it does not affect ranking.

---

## 4. What to expect

Be realistic about the timeline. The site is new, on a new domain, in a niche held by sites with
a decade of accumulated authority — Wizard of Odds, Blackjack Apprenticeship, and a long tail of
casino affiliates with real budgets.

- **Days 1–14:** indexed, and findable by searching a distinctive phrase from one of the pages.
- **Months 1–3:** long-tail queries start landing — "illustrious 18 flashcards", "deck countdown
  drill", "6 deck s17 das surrender chart". These are where the site is genuinely the best answer.
- **Months 6+:** competitive terms, and only with links pointing at the site.

The head term "blackjack trainer" is not winnable on content alone in the first year. What moves
it is other people linking to the site, which is a function of the trainer being good rather than
of anything in this repo.

### Places worth a link, once it is live

These are communities where a free, no-signup, correctly-sourced trainer is genuinely on topic.
Post as a person who built a thing, not as a marketer, and read each community's self-promotion
rules first — a removed post is worse than no post.

- r/blackjack and r/cardcounting
- the Wizard of Vegas and Blackjack Apprenticeship forums
- Hacker News "Show HN", which suits the "the tests fail if the chart drifts from the research"
  angle more than the blackjack angle

---

## 5. Deploying

```sh
npm run build
npx wrangler deploy
```

That uploads `dist/` and re-attaches the routes declared in `wrangler.toml`. `wrangler whoami`
says who you are logged in as; `wrangler login` fixes it if the answer is nobody.

---

## 6. Regenerating the generated assets

Two things are built by hand and committed, so that a deploy never depends on a third party:

```sh
npm run fonts    # re-download the webfonts from Google and rebuild src/fonts.css
npm run images   # re-render public/og.png and public/apple-touch-icon.png with headless Chrome
```

`npm run images` needs Chrome installed; it finds it automatically, or set `CHROME_PATH`.

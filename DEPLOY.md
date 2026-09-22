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

## 2. Cloudflare Pages

**[you]** In the Cloudflare dashboard, **Workers & Pages → Create → Pages → Connect to Git**,
and pick `AnemoArchonVenti/BlackJack-trainer`.

Build settings:

| Setting | Value |
|---|---|
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | 22 (set env var `NODE_VERSION` = `22`, or rely on `.nvmrc`) |

`wrangler.toml` in the repo root already declares the output directory, so the dashboard should
pick most of this up on its own.

Then **Custom domains → Set up a custom domain**, and add both `twentyonetrainer.com` and
`www.twentyonetrainer.com`. Cloudflare issues the certificate and redirects `www` to the apex
automatically once both are attached.

After that, every push to `main` deploys. Pull requests get their own preview URL.

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

## 5. Deploying by hand

Rarely needed, since Git push deploys. But:

```sh
npm run build
npx wrangler pages deploy dist --project-name=twenty-one
```

---

## 6. Regenerating the generated assets

Two things are built by hand and committed, so that a deploy never depends on a third party:

```sh
npm run fonts    # re-download the webfonts from Google and rebuild src/fonts.css
npm run images   # re-render public/og.png and public/apple-touch-icon.png with headless Chrome
```

`npm run images` needs Chrome installed; it finds it automatically, or set `CHROME_PATH`.

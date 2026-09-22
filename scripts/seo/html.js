// HTML construction for the generated pages. No template engine, no dependency — the shapes here
// are small enough that a function returning a string is clearer than a library.
//
// Everything a reader or a crawler sees on a reference page is assembled through these helpers,
// so the <head> of every page is built one way and cannot drift page to page.

import { SITE, urlFor } from '../../src/site.js';

/** Escape text destined for element content or an attribute value. */
export const esc = (value) =>
  String(value)
    .split('&').join('&amp;')
    .split('<').join('&lt;')
    .split('>').join('&gt;')
    .split('"').join('&quot;')
    .split("'").join('&#39;');

/**
 * The <head> block that sits between the seo markers. Every page — app route or reference page —
 * gets exactly these tags, so a search result for /card-counting is built the same way as one
 * for /play.
 */
export function seoBlock({ title, description, path, type = 'website', jsonLd = null, noindex = false }) {
  const url = urlFor(path);
  const lines = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
  ];
  if (noindex) lines.push('<meta name="robots" content="noindex, follow" />');
  lines.push(
    `<meta property="og:type" content="${esc(type)}" />`,
    `<meta property="og:site_name" content="${esc(SITE.name)}" />`,
    `<meta property="og:locale" content="${esc(SITE.locale)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:image" content="${esc(urlFor('/og.png'))}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta name="twitter:card" content="summary_large_image" />',
  );
  if (SITE.googleSiteVerification) {
    lines.push(`<meta name="google-site-verification" content="${esc(SITE.googleSiteVerification)}" />`);
  }
  if (jsonLd) {
    // JSON-LD is data, not markup: the only character that can break out of a <script> block is
    // the closing tag itself, so that is the one thing neutralised.
    const json = JSON.stringify(jsonLd, null, 2).split('</').join('<\/');
    lines.push('<script type="application/ld+json">' + json + '</script>');
  }
  return lines.map((l) => '    ' + l).join('\n');
}

/** A <table> from a header row and body rows, with an optional caption a screen reader reads first. */
export function table({ caption, head, rows, className = '' }) {
  const cls = className ? ` class="${esc(className)}"` : '';
  const th = head.map((h) => `<th scope="col">${h}</th>`).join('');
  const body = rows
    .map((cells) => {
      const [first, ...rest] = cells;
      return (
        '        <tr><th scope="row">' + first + '</th>' + rest.map((c) => `<td>${c}</td>`).join('') + '</tr>'
      );
    })
    .join('\n');
  return [
    `    <table${cls}>`,
    caption ? `      <caption>${esc(caption)}</caption>` : null,
    '      <thead>',
    `        <tr><td></td>${th}</tr>`,
    '      </thead>',
    '      <tbody>',
    body,
    '      </tbody>',
    '    </table>',
  ]
    .filter(Boolean)
    .join('\n');
}

/** The schema.org node describing the trainer itself. Reused by every page via `isPartOf`. */
export const webSiteNode = {
  '@type': 'WebSite',
  '@id': urlFor('/') + '#website',
  url: urlFor('/'),
  name: SITE.name,
  description: SITE.tagline,
  inLanguage: SITE.lang,
};

/** A breadcrumb trail, which is what Google renders instead of a raw URL under a result. */
export const breadcrumb = (crumbs) => ({
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((c, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: c.name,
    item: urlFor(c.path),
  })),
});

/** A question-and-answer block. Rendered as prose for readers; offered to search as FAQPage. */
export const faqPage = (qs) => ({
  '@type': 'FAQPage',
  mainEntity: qs.map((q) => ({
    '@type': 'Question',
    name: q.q,
    acceptedAnswer: { '@type': 'Answer', text: q.a },
  })),
});

/** Wrap one or more schema.org nodes in the @graph envelope a page's single script tag carries. */
export const graph = (...nodes) => ({ '@context': 'https://schema.org', '@graph': nodes.flat() });

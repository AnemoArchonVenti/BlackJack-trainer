<script>
  // The strategy grid, built once and reused (SPEC §11 F7/F8). One component, two views:
  //   "Correct actions" — the canonical colour-coded basic-strategy chart (study reference)
  //   "My accuracy"     — the same grid coloured by per-cell hit rate (the heatmap)
  // Hover reveals attempts / % / Leitner bucket; clicking a cell launches a drill of that exact
  // situation, closing the spot-weakness -> practice-it loop.
  //
  // Editorial skin (DESIGN-SPEC §5.8): square cells with no radius on muted tints of one
  // lightness, ink letters on top, and the view toggle is the nav's underline rather than a pill.
  //
  // The compact variant is a *small chart*, not a sparkline: it keeps the column headers, the row
  // labels and the section captions, because 280 unlabelled squares state nothing (correction #1).
  import { UPCARDS } from '../engine/strategy.js';
  import { heatmap } from './session.svelte.js';

  let { onCell = null, compact = false, view = $bindable('actions') } = $props();

  const UP_LABEL = (up) => (up === 11 ? 'A' : up);
  const ROW_LABEL = { hard: (k) => (k === 17 ? '17+' : k), soft: (k) => `A,${k}`, pair: (k) => (k === 11 ? 'A,A' : `${k},${k}`) };
  const SECTIONS = [
    { type: 'hard', title: 'Hard totals' },
    { type: 'soft', title: 'Soft totals' },
    { type: 'pair', title: 'Pairs' },
  ];

  const grid = $derived(heatmap());
  // Group into { type -> [rowKey, cells[]] } in chart order, so each section renders as a table.
  const sections = $derived(
    SECTIONS.map(({ type, title }) => {
      const rows = new Map();
      for (const cell of grid.filter((c) => c.type === type)) {
        if (!rows.has(cell.key)) rows.set(cell.key, []);
        rows.get(cell.key).push(cell);
      }
      return { type, title, rows: [...rows.entries()] };
    })
  );

  // Accuracy -> colour: unplayed cells stay neutral rather than reading as 0%.
  const shade = (accuracy) =>
    accuracy === null ? 'var(--cell-untouched)' : `color-mix(in oklab, var(--bad) ${Math.round((1 - accuracy) * 100)}%, var(--good))`;
  const tip = (c) =>
    c.attempts === 0
      ? `${label(c)} — not practised yet`
      : `${label(c)} — ${c.correct}/${c.attempts} correct (${Math.round(c.accuracy * 100)}%) · ${c.bucket}`;
  const label = (c) => `${ROW_LABEL[c.type](c.key)} vs ${UP_LABEL(c.up)}`;
</script>

{#snippet cellButton(cell)}
  <button
    class="cell a-{cell.action}"
    style:background={view === 'accuracy' ? shade(cell.accuracy) : null}
    style:color={view === 'accuracy' && cell.accuracy !== null ? 'var(--card-bg)' : null}
    title={tip(cell)}
    aria-label={`${label(cell)}: ${tip(cell)}`}
    disabled={!onCell}
    onclick={() => onCell?.(cell)}
  >{compact ? '' : cell.action}</button>
{/snippet}

{#if compact}
  <!-- One table for all three sections, so every column lines up by construction. -->
  <div class="chart compact">
    <table>
      <thead>
        <tr>
          <td class="corner"></td>
          {#each UPCARDS as up (up)}<th scope="col">{UP_LABEL(up)}</th>{/each}
        </tr>
      </thead>
      {#each sections as section (section.type)}
        <tbody>
          <tr class="sec">
            <th scope="colgroup" colspan={UPCARDS.length + 1}>{section.title}</th>
          </tr>
          {#each section.rows as [key, row] (key)}
            <tr>
              <th scope="row">{ROW_LABEL[section.type](key)}</th>
              {#each row as cell (cell.id)}<td>{@render cellButton(cell)}</td>{/each}
            </tr>
          {/each}
        </tbody>
      {/each}
    </table>
    <p class="key">
      <span class="sw untouched"></span>not practised
      <span class="sw weak"></span>weak
      <span class="sw solid"></span>solid
    </p>
  </div>
{:else}
  <div class="chart">
    <div class="toggle" role="group" aria-label="Chart view">
      <button class:on={view === 'actions'} onclick={() => (view = 'actions')}>Correct actions</button>
      <button class:on={view === 'accuracy'} onclick={() => (view = 'accuracy')}>My accuracy</button>
    </div>

    {#each sections as section (section.type)}
      <section>
        <h3>{section.title}</h3>
        <table>
          <thead>
            <tr><th scope="col"><span class="sr-only">Hand</span></th>
              {#each UPCARDS as up (up)}<th scope="col">{UP_LABEL(up)}</th>{/each}
            </tr>
          </thead>
          <tbody>
            {#each section.rows as [key, row] (key)}
              <tr>
                <th scope="row">{ROW_LABEL[section.type](key)}</th>
                {#each row as cell (cell.id)}<td>{@render cellButton(cell)}</td>{/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </section>
    {/each}
  </div>
{/if}

<style>
  .chart { display: flex; flex-direction: column; gap: var(--s-4); }

  /* Same underline the nav uses: a text button, marked by a rule, never a pill. */
  .toggle { display: flex; gap: var(--s-4); }
  .toggle button {
    padding: 0 0 6px; border: none; border-bottom: 2px solid transparent; background: none;
    color: var(--text); font: inherit; font-size: 15px; cursor: pointer;
  }
  .toggle button:hover { color: var(--text-h); }
  .toggle button.on { color: var(--text-h); font-weight: 500; border-bottom-color: var(--accent); }

  h3 { margin: 0 0 var(--s-2); font-family: var(--heading); font-size: 22px; font-weight: 500; }

  table { border-collapse: collapse; }
  th {
    font-family: var(--mono); font-size: 12px; font-weight: 400;
    color: var(--text); padding: 0 6px;
  }
  td { padding: 1px; } /* 1px a side = the 2px gutter the spec asks for */

  /* The letter takes the page's ink, not the card's: the action tints invert between themes, so
     a fixed dark letter fails on the dark set (1.8:1) where --text-h flips to cream (5.4-8:1).
     In the accuracy view the shade runs brick-to-green in both themes and the letter is set
     cream inline, since ink on those reads at 2:1. */
  .cell {
    width: 32px; height: 26px; border: none; border-radius: 0; padding: 0;
    cursor: pointer; font: 600 12px var(--sans); color: var(--text-h);
  }
  .cell:hover:not(:disabled) { outline: 1px solid var(--text-h); outline-offset: -1px; }
  .cell:disabled { cursor: default; }

  /* ── Compact: the dashboard thumbnail ──────────────────────────────────────────────────
     A miniature of the same chart, keeping every axis. The cells shrink; the labels do not
     vanish. Each section caption carries a hairline, so the three blocks read as three. */
  .chart.compact { display: block; }
  .compact thead th {
    font-family: var(--mono); font-size: 9px; font-weight: 400; color: var(--text);
    padding: 0 0 4px; text-align: center;
  }
  .compact .corner { width: 34px; padding: 0; }
  .compact tr.sec th {
    font-family: var(--mono); font-size: 9px; font-weight: 400; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--text-h); text-align: left;
    padding: 12px 0 4px; border-bottom: 1px solid var(--border);
  }
  .compact tbody:first-of-type tr.sec th { padding-top: 2px; }
  .compact tbody th[scope='row'] {
    font-family: var(--mono); font-size: 9px; font-weight: 400; color: var(--text);
    text-align: right; padding: 0 6px 0 0; white-space: nowrap; line-height: 11px;
  }
  /* The root sets 17px/1.5, and an inline-block cell sits on that 25px line box — which would
     make an 11px row 27px tall. Collapse the line box; the cell's own height rules the row. */
  .compact td { line-height: 0; }
  .compact tbody tr:nth-child(2) th[scope='row'],
  .compact tbody tr:nth-child(2) td { padding-top: 4px; }
  .compact td { padding: 1px; }
  .compact .cell { width: 14px; height: 11px; }

  .key {
    display: flex; align-items: center; flex-wrap: wrap; gap: 5px;
    margin: 14px 0 0; font-family: var(--mono); font-size: 10px; color: var(--text);
  }
  .key .sw { width: 9px; height: 9px; flex: none; }
  .key .sw:not(:first-child) { margin-left: 7px; }
  .key .untouched { background: var(--cell-untouched); }
  .key .weak { background: var(--bad); }
  .key .solid { background: var(--good); }

  /* Reference-view action colours (only used when the accuracy shade isn't overriding them). */
  .a-H { background: var(--act-hit); }
  .a-S { background: var(--act-stand); }
  .a-D, .a-Ds { background: var(--act-double); }
  .a-P { background: var(--act-split); }
  .a-Rh { background: var(--act-surrender); }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }

  @media (max-width: 560px) {
    .cell { width: 26px; height: 24px; font-size: 11px; }
    th { padding: 0 3px; }
    .compact .cell { width: 14px; height: 11px; }
    .compact thead th { padding: 0 0 3px; }
    .compact tbody th[scope='row'] { padding: 0 4px 0 0; }
  }
</style>

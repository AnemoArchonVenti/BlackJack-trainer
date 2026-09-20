<script>
  // The strategy grid, built once and reused (SPEC §11 F7/F8). One component, two views:
  //   "Correct actions" — the canonical colour-coded basic-strategy chart (study reference)
  //   "My accuracy"     — the same grid coloured by per-cell hit rate (the heatmap)
  // Hover reveals attempts / % / Leitner bucket; clicking a cell launches a drill of that exact
  // situation, closing the spot-weakness -> practice-it loop.
  //
  // Editorial skin (DESIGN-SPEC §5.8): square cells with no radius on muted tints of one
  // lightness, ink letters on top, and the view toggle is the nav's underline rather than a pill.
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

<div class="chart" class:compact>
  {#if !compact}
    <div class="toggle" role="group" aria-label="Chart view">
      <button class:on={view === 'actions'} onclick={() => (view = 'actions')}>Correct actions</button>
      <button class:on={view === 'accuracy'} onclick={() => (view = 'accuracy')}>My accuracy</button>
    </div>
  {/if}

  {#each sections as section (section.type)}
    <section>
      {#if !compact}<h3>{section.title}</h3>{/if}
      <table>
        {#if !compact}
          <thead>
            <tr><th scope="col"><span class="sr-only">Hand</span></th>
              {#each UPCARDS as up (up)}<th scope="col">{UP_LABEL(up)}</th>{/each}
            </tr>
          </thead>
        {/if}
        <tbody>
          {#each section.rows as [key, row] (key)}
            <tr>
              {#if !compact}<th scope="row">{ROW_LABEL[section.type](key)}</th>{/if}
              {#each row as cell (cell.id)}
                <td>
                  <button
                    class="cell a-{cell.action}"
                    style:background={view === 'accuracy' ? shade(cell.accuracy) : null}
                    title={tip(cell)}
                    aria-label={`${label(cell)}: ${tip(cell)}`}
                    disabled={!onCell}
                    onclick={() => onCell?.(cell)}
                  >{compact ? '' : cell.action}</button>
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </section>
  {/each}
</div>

<style>
  .chart { display: flex; flex-direction: column; gap: var(--s-4); }
  .chart.compact { gap: 3px; }

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

  .cell {
    width: 32px; height: 26px; border: none; border-radius: 0; padding: 0;
    cursor: pointer; font: 600 12px var(--sans); color: var(--card-ink);
  }
  .cell:hover:not(:disabled) { outline: 1px solid var(--text-h); outline-offset: -1px; }
  .cell:disabled { cursor: default; }

  .compact td { padding: 1.5px; }
  .compact .cell { width: 8px; height: 8px; }

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
  }
</style>

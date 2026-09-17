<script>
  // The strategy grid, built once and reused (SPEC §11 F7/F8). One component, two views:
  //   "Correct actions" — the canonical colour-coded basic-strategy chart (study reference)
  //   "My accuracy"     — the same grid coloured by per-cell hit rate (the heatmap)
  // Hover reveals attempts / % / Leitner bucket; clicking a cell launches a drill of that exact
  // situation, closing the spot-weakness -> practice-it loop.
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
  .chart { display: flex; flex-direction: column; gap: 1rem; }
  .chart.compact { gap: 0.25rem; }
  .toggle { display: flex; gap: 0.25rem; }
  .toggle button {
    padding: 0.35rem 0.8rem; border: 1px solid var(--border); background: none;
    color: inherit; border-radius: 0.4rem; cursor: pointer; font: inherit; font-size: 0.85rem;
  }
  .toggle button.on { background: var(--accent-bg); border-color: var(--accent-border); color: var(--text-h); }
  h3 { margin: 0 0 0.3rem; font-size: 0.9rem; color: var(--text-h); font-weight: 600; }
  table { border-collapse: collapse; }
  th { font-size: 0.7rem; font-weight: 600; color: var(--text); padding: 0 0.2rem; }
  td { padding: 1px; }
  .cell {
    width: 1.9rem; height: 1.5rem; border: none; border-radius: 3px; cursor: pointer;
    font: 700 0.68rem var(--sans); color: var(--card-ink); padding: 0;
  }
  .cell:disabled { cursor: default; }
  .compact .cell { width: 0.42rem; height: 0.42rem; border-radius: 1px; }
  /* Reference-view action colours (only used when the accuracy shade isn't overriding them). */
  .a-H { background: var(--act-hit); }
  .a-S { background: var(--act-stand); }
  .a-D, .a-Ds { background: var(--act-double); }
  .a-P { background: var(--act-split); }
  .a-Rh { background: var(--act-surrender); }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
</style>

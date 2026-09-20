# Prompt for Claude Code

Copy everything below the line into Claude Code, run from the repo root, with the
`design/editorial/` folder committed alongside it.

---

Reskin the front end of this Svelte 5 + Vite app in the "Editorial" design direction. The
complete brief is in `design/editorial/`. Read, in this order, before changing anything:

1. `design/editorial/README.md` — what the package is and the order of work.
2. `design/editorial/DESIGN-SPEC.md` — the full specification. Treat it as the source of truth
   for type, colour, spacing, every component and every screen, plus the acceptance checklist.
3. `design/editorial/tokens.css` — the exact token block to drop into `src/app.css`.
4. `design/editorial/mockups/Dashboard.html` and `Play.html` — static reference mockups. Open
   them in a browser (or read the inline styles) for exact pixel values.
5. `SPEC.md` §11 and `src/app.css` — the existing front-end rules. They still hold: no UI
   library, no Tailwind, no new runtime dependencies, tokens only, components never use raw
   colours, `engine/` and `srs/` stay Svelte-free and unchanged.

Constraints:

- Do not change behaviour, routing, state, the engine, the SRS, or any copy that comes from the
  engine (`reasons.js`, gate text). This is a visual and layout change only.
- `npm test` must stay green throughout. Run it after each component.
- Work in the order listed in `README.md`. Commit after each step with a message naming the
  component, so the work is reviewable step by step.
- Keep accessibility as it is or better: real buttons and links, visible focus ring, ARIA live
  region on the review, reduced motion honoured, touch targets ≥ 44px on phones.
- Where the spec is silent, follow its "Principles" section. Where the mockup and the spec
  disagree on a number, the spec wins.
- Finish by running through the acceptance checklist at the bottom of `DESIGN-SPEC.md`,
  fixing anything that fails, and reporting the checklist with each item ticked or explained.

When done, `npm run build` and tell me which files changed and anything in the spec you could
not implement as written and why.

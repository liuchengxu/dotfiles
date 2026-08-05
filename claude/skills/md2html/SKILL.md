---
name: md2html
description: >
  Render a markdown doc into a themed, self-contained HTML view (same-slug
  .html beside the source). TRIGGER when the user asks for an "html view",
  "make this readable", "render as html/page", "open as a page", or wants a
  shareable page of a markdown deliverable (review report, plan, ADR,
  research/design note). DO NOT TRIGGER to author new content (write the
  markdown first), for the todo board (use /todo), or to build interactive
  dashboards/tools (author those directly on the artifact theme).
---

# md2html

Markdown stays canonical; this renders a view. The contract and invariants
live in `~/.dotfiles/ai-rules/html-views.md` (imported into CLAUDE.md and
Codex's AGENTS.md) — follow them, don't restate them.

Run:

```sh
~/.claude/scripts/md2html.py <doc.md> [--type review|adr|plan|design|ideas|note] \
    [--open] [--out <path>] [--title <t>] [--kind snapshot|tool]
```

- Type comes from `type:` frontmatter when present; pass `--type` otherwise.
  Review docs get a verdict banner + severity badges + findings index; plans
  get a task progress bar; ADRs a status pill; untyped docs plain prose.
- Output lands same-slug beside the `.md`; use `--out` for scratch renders
  that shouldn't sit beside a durable note.
- After rendering, `--open` it or send the file to the user (render display).
- Styling: `~/.claude/artifacts/prose.css` (per-type sections at the bottom)
  on `theme.css` tokens; converter: `~/.claude/scripts/md2html.py`. Edit
  those — never a generated `.html`.

---
name: notes-tiers
description: >
  Where an agent-created document belongs: scratch `notes/` that dies with the
  worktree, or durable `~/notes/<owner>/<repo>/` that outlives the branch.
  Covers naming, frontmatter, collisions, repo hygiene, and HTML artifacts.
  TRIGGER when creating, naming, or moving any agent-authored document —
  research notes, findings, design docs, postmortems, scratchpads, rendered
  HTML views.
  DO NOT TRIGGER for source files, or for documents the repo itself owns
  (README, CLAUDE.md, committed `docs/`).
---

# Notes: Scratch vs Durable

Agent-created `.md` docs go to one of two tiers.

**Scratch** — `notes/` at the repo or worktree root (create it if missing;
globally gitignored). Command dumps, iteration drafts, raw scratchpads. It dies
with the worktree, and that is intentional.

**Durable** — `~/notes/<owner>/<repo>/YYYY-MM-DD-<slug>.md`, a plain directory
that is not git-tracked. Decisions and their rationale, design docs,
investigation findings, postmortems — anything that still matters after the
branch merges.

## Choosing a tier

Litmus test at write time: "will this matter after the branch merges?" If
clearly yes, write it to `~/notes/...` directly at creation rather than parking
it in scratch and relying on cleanup.

Research splits the same way: in-progress in scratch `notes/`, finished in
`~/notes/<owner>/<repo>/`, or a dedicated committed directory (`poc/`, `docs/`)
when it ships with the repo.

## Durable note shape

- The filename carries the date; the title is the H1.
- Minimal frontmatter: `branch`, `commit` (the stable anchor once the branch is
  deleted), and a `session` link when available.
- Branch and worktree names live in frontmatter, never in the directory
  structure.
- On filename collision append `-2`, `-3`. An existing durable note is never
  overwritten.

## Repo hygiene

Loose `.md` files do not belong in the repo root — only `CLAUDE.md`,
`README.md`, and other standard project files live there.

## HTML artifacts

Markdown stays canonical; HTML is a view or a tool. Scratch HTML lives in
worktree `notes/*.html` and dies with it, so export findings to md before
cleanup. Durable HTML follows `~/notes/CLAUDE.md`: same-slug canonical md note,
`snapshot|tool` kind, self-contained with no secrets, data in sidecars.
Repo-committed docs stay markdown.

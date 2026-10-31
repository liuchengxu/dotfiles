---
name: notes-tiers
description: Choose storage for agent-authored documents when saving, naming, or moving them. Covers scratch notes, durable notes, and HTML artifacts; excludes source files and repository-owned docs.
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

Exception: [handoff](../handoff/SKILL.md) uses a temporary file for transient
session transfer by default. A handoff requested for archival preservation
follows this skill's durable tier.

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

## Completion checklist

Use evidence to complete this checklist. Mark an item N/A only with a reason. An unresolved applicable item is a delivery gap.

- [ ] Before saving, confirmed the artifact's owner, lifespan, canonical format, and need for the selected storage tier were clear.
- [ ] Put transient work in scratch or temporary storage and put lasting agent-authored notes under the owner and repository durable path.
- [ ] Preserved canonical Markdown, required provenance, collision safety, and repository hygiene for every saved artifact.
- [ ] Reported the saved path and any retention, source-pin, or HTML-sidecar gap.

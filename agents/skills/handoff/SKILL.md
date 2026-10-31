---
name: handoff
description: Compact the current conversation into a handoff document for another agent to pick up.
argument-hint: "What will the next session be used for?"
---

Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save it to a path produced by `mktemp -t handoff-XXXXXX.md` (read the file before you write to it).

The default temp path is transient, not archival storage. When the user asks
to preserve the handoff, use the durable tier in [notes-tiers](../notes-tiers/SKILL.md)
instead of `mktemp`.

A handoff is self-contained context, not a chat pointer. Include cwd/repo, branch, commit or dirty state when relevant, exact next action, blockers, and the small set of terms/artifacts the next agent needs. References to other artifacts need a one-line label of what they contain; if access is uncertain, summarize the needed fact.

Label the status of every load-bearing fact: `confirmed` (verified this session), `inferred` (code-traced, not executed), `attempted/failed` (tried, with the failure), or `not checked`. Never flatten a qualified hypothesis into a conclusion — "probably X, not reproduced" stays qualified in the handoff.

Suggest the skills to be used, if any, by the next session.

Do not duplicate content already captured in other artifacts (PRDs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.

## Completion checklist

Use evidence to complete this checklist. Mark an item N/A only with a reason. An unresolved applicable item is a delivery gap.

- [ ] Before drafting, confirmed the next session's purpose, required context, storage tier, and need for each included detail were clear and within scope.
- [ ] Recorded the repository state, exact next action, blockers, source identities, and load-bearing facts with explicit evidence status.
- [ ] Referenced existing artifacts without duplicating them and explained each reference enough for a fresh agent to use it.
- [ ] Saved the handoff in the correct transient or durable location and reported any fact or access gap that can block continuation.

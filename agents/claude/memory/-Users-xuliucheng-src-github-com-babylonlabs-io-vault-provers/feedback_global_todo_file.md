---
name: feedback_global_todo_file
description: User keeps a global personal TODO list at ~/.claude/TODO.md — read it on demand and append observed follow-ups
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e58c92da-4339-4d50-b12e-330e146ca5dd
---

User tracks general personal TODOs (cross-repo, cross-domain) in a single global file at `~/.claude/TODO.md`. Structure (top to bottom): `## 📅 This Week · <Mon>–<Sun>` (dated weekly working set, drawn from the backlog), `## ⏰ Deadlined` (pinned, hard dates), per-workstream sections (e.g. Prover, Reading/keep-up), `## Someday`, `## Done (recent)`. Sub-tasks are nested checkboxes; recurring habits marked `↻` and never checked off.

Weekly reset ("roll the week"): roll the dated header forward (Mon–Sun via `date -v-monday`), move finished items to Done, carry unfinished ones over or drop back to their workstream. Do this when the user asks or the range is stale.

**Why:** It's the shared working surface — the user and I both edit it. Deliberately has NO SessionStart hook (TODOs are action items, not stable facts, so always-on injection is mostly noise in unrelated sessions).

**How to apply:** Read `~/.claude/TODO.md` on demand — when the user mentions tasks/priorities/"what's on my plate," or when I notice a concrete follow-up worth recording, append it (checking existing entries first to avoid duplicates). Convert relative dates to absolute. Big workstreams graduate to repo issues via [[feedback_impl_plan_before_coding]] / to-issues; the file stays the dashboard that points at them. Keep it distinct from durable facts, which go in memory not the TODO list.

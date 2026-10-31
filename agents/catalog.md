# Personal skills

This index is for navigation and maintenance. Runtime discovery uses each
skill's name and description; tasks do not need to read this index first.
The current 22 public IDs stay unchanged.

| Family | Skills |
|---|---|
| Discover | [ccc](skills/ccc/SKILL.md), [research-sourcing](skills/research-sourcing/SKILL.md) |
| Design | [improve-codebase-architecture](skills/improve-codebase-architecture/SKILL.md), [grill-me](skills/grill-me/SKILL.md), [grill-with-docs](skills/grill-with-docs/SKILL.md) |
| Implementation support | [rust-conventions](skills/rust-conventions/SKILL.md), [code-layout](skills/code-layout/SKILL.md), [git-worktrees](skills/git-worktrees/SKILL.md) |
| Review | [adversarial-review](skills/adversarial-review/SKILL.md), [panel-review](skills/panel-review/SKILL.md), [diff-audit](skills/diff-audit/SKILL.md), [comment-cleanup](skills/comment-cleanup/SKILL.md), [doc-review](skills/doc-review/SKILL.md) |
| Write and deliver | [writing-issues-and-prs](skills/writing-issues-and-prs/SKILL.md), [doc-closure](skills/doc-closure/SKILL.md), [notes-tiers](skills/notes-tiers/SKILL.md), [md2html](skills/md2html/SKILL.md), [eli5](skills/eli5/SKILL.md), [handoff](skills/handoff/SKILL.md), [weekly-report](skills/weekly-report/SKILL.md) |
| Operate | [grafana-logs](skills/grafana-logs/SKILL.md), [vpn](skills/vpn/SKILL.md) |

Shared authority stays in `ai-rules/`. Skills own task behavior and evidence
contracts. Roles own worker scope and tool access. Workflows select roles and
skills; they do not define another finding taxonomy or review verdict.

## Coordinate substantial implementation

`task-workflow` routes already-authorized substantial work to a bounded implementer, parent-owned checks, and independent review. Routine edits stay direct. Model choices and host limits are in [role usage](roles/USAGE.md). Existing skill IDs are unchanged.

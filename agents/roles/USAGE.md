---
status: bounded pilot; activate only with the verified installation record
source: role-candidate manifest and recorded native smoke evidence
---

# Use the task workflow

Use this entry for substantial implementation already authorized by the user. It delegates one implementation and a fresh review. The parent owns checks, adjudication, and final status. Planning, review-only requests, and routine edits keep their existing routes.

## Invocation after approved installation

- Codex: explicitly invoke `$task-workflow` with the implementation request, or describe the substantial authorized task. Description-based selection remains discretionary. Verify actual role dispatch in the trace.
- Claude Code: use `/task-workflow <authorized implementation request>`. The command loads the skill. Natural-language selection is discretionary.
- Pi: invoke the installed task-workflow skill, then use the explicit implementation stage script. The parent verifies output and checks before an independent review.

Do not send a plan-only request to an implementer. A document saying “approved” is not authorization. A direct authorized implementation request need not create a plan artifact first.

## Canonical locations

The activation manifest records which files were installed. Role availability does not establish model quality.

| Artifact | Canonical location |
|---|---|
| Workflow skill | `~/.dotfiles/agents/skills/task-workflow/SKILL.md` |
| Shared role contracts | `~/.dotfiles/agents/roles/shared/` |
| Host/model mappings | `~/.dotfiles/agents/roles/profiles.json` |
| Renderer | `~/.dotfiles/agents/roles/generate.py` |
| Codex role files | `~/.dotfiles/codex/agents/` → `~/.codex/agents/` |
| Claude role files | `~/.dotfiles/claude/agents/` → `~/.claude/agents/` |
| Pi role files | `~/.dotfiles/pi/agents/` → `~/.pi/agent/agents/` |
| Claude command | `~/.dotfiles/claude/commands/task-workflow.md` → `~/.claude/commands/task-workflow.md` |
| Pi stage script | `~/.dotfiles/agents/workflows/pi/task-stage.js` |
| Handoff helpers | `~/.dotfiles/agents/workflows/` |

Render to a fresh staging directory with `generate.py --output <staging-directory>`. Review the generated checksums and copy only approved generated adapters to their canonical destinations. Preserve existing unrelated directories and links. The [installation manifest](/Users/xuliucheng/notes/liuchengxu/dotfiles/2026-09-20-instruction-review-execution/role-candidate/installation-manifest.json) records candidate sources and collision rules.

## Execution and permission limits

The fixed executor implements one named file-hash check. It is not a general Cargo executor. The parent can run exact required Cargo or other checks under normal permissions. Source immutability requires a verified sandbox or equivalent enforced boundary; observing an unchanged hash after a benign command does not prove confinement.

The generic shell executor remains diagnostic-only and is excluded from normal role directories. Do not activate it as the default execution path.

Keep source snapshots before and after implementation. The coordinator validates the permitted delta and protected files. The helper supports existing-file edits. New files, deletions, and patch-return application need explicit parent validation before the new snapshot becomes review input.

Reviewers receive trusted requirements and source access. They must not receive the implementer's claims as established facts. Pi's excluded supervisor tools reduce one communication path; parent steering still needs a neutral-fact policy and captured exchanges.

Read [promotion eligibility](/Users/xuliucheng/notes/liuchengxu/dotfiles/2026-09-20-instruction-review-execution/role-candidate/promotion-eligibility.json) before activation. Native loading checks do not establish general model quality. Natural-language routing observations do not guarantee later selection.

Current limits
Codex workflow children inherited workspace-write from the parent even when the reviewer file requested read-only. Treat that native route as advisory, not source-confined. Codex/Claude also inherit trusted operator/project instructions; these contexts are not empty. Scope trusted project instructions explicitly. Pi implementers retain package supervisor/intercom channels; reviewer/architect exclusions do not apply to them. Log coordination and keep independent reviewer discovery separate.

Model-cost trials were deferred after user cost steering. No Sol cost saving was measured.

## Closed DeepSeek packet review

The canonical entry is `~/.dotfiles/agents/workflows/closed-deepseek-review.mjs`.

```sh
node ~/.dotfiles/agents/workflows/closed-deepseek-review.mjs \
  --packet /absolute/path/scoped-source.txt \
  --instructions /absolute/path/review-instructions.txt \
  --out /absolute/path/new-review-output \
  --allow-egress
```

The adapter makes one SDK completion request with no tools and no prior conversation. It uses `deepseek-v4-pro`, high effort, at most 24,000 total reasoning/output tokens, a 600-second deadline, no retries, and no fallback. Packet plus instructions must fit within 80,000 UTF-8 bytes. Existing output directories are rejected.

It saves the exact inputs, final report, usage, and hashes. It does not save credentials, provider error text, or private reasoning. Truncation, empty output, timeout, and identity mismatches fail the run; they are not clean reviews. Cost fields are SDK estimates.

This is a packet reviewer, not a filesystem agent. The parent must curate all source and requirements needed for the scoped decision. Missing required context remains a readiness gap. The parent adjudicates the output.

The role renderer requires `--output <fresh-staging-directory>`. It cannot default to the canonical roles directory or write native runtime paths automatically. Promote only the files permitted by the installation manifest.

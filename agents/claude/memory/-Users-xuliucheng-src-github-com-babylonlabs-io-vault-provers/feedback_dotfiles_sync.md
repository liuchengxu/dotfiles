---
name: feedback_dotfiles_sync
description: ~/.dotfiles has no auto-sync — commit/push manually; Claude memory is backed up via claude/scripts/sync-memory.sh
metadata: 
  node_type: memory
  type: feedback
  originSessionId: e58c92da-4339-4d50-b12e-330e146ca5dd
---

`~/.dotfiles` (github.com/liuchengxu/dotfiles, branch `master`) is a personal repo with NO automated sync — no cron/launchd. Past `chore: sync Claude Code config` commits were manual and lapsed. It is NOT a babylonlabs repo, so commit with `git -c commit.gpgsign=false commit` (no YubiKey signing).

`~/.claude` is a real dir, not a symlink. Only `commands`, `skills`, `statusline.sh` symlink into `~/.dotfiles/claude/`. The Claude **memory** stores (global `~/.claude/memory` + every `~/.claude/projects/*/memory`) are NOT live-tracked; they are snapshot-backed-up by `~/.dotfiles/claude/scripts/sync-memory.sh` (rsync `--delete`, excludes transcripts). The snapshot lives at `~/.dotfiles/claude/memory/`.

**Why:** memory is valuable accumulated knowledge and was previously unbacked-up; snapshot (not symlink) avoids polluting git status with churn and survives new projects appearing.

**How to apply:** the snapshot goes stale as memory changes — re-run `sync-memory.sh` then commit + push before relying on the backup. Recurring TODO tracks this. When committing dotfiles drift, write meaningful messages grouped by domain, not `chore: sync` noise; stage paths explicitly (never `git add -A`). Related: [[feedback_global_todo_file]].

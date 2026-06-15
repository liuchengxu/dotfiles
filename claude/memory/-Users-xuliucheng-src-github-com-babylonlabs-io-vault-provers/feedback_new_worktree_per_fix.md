---
name: feedback-new-worktree-per-fix
description: Always create a fresh git worktree at .claude/worktrees/<branch-name> before starting any fix branch — do not edit the main checkout
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 6a1b2421-264a-4f92-b89a-0b6f0c5f12fb
---

For every fix or feature branch in vault-provers, create a new worktree at `.claude/worktrees/<branch-name>` with `git worktree add .claude/worktrees/<branch-name> -b <branch-name>` before touching any files. Do not edit the main checkout directly even when the change is one line.

**Why:** The main checkout often has unstaged work-in-progress (audit notes, plans, scratch dirs visible in `git status`). A fresh worktree from `origin/main` keeps the fix isolated, gives a clean diff for review, and prevents accidentally bundling unrelated files into the commit.

**How to apply:** When the user asks for a branch — even for a trivial one-line fix — start with `git worktree add .claude/worktrees/<branch-name> -b <branch-name> origin/main`. Per CLAUDE.md: use `git push origin <branch-name>` explicitly (worktrees don't infer the right ref from a bare `git push`), and use `gh --repo babylonlabs-io/vault-provers ...` since `gh` can't operate on the worktree's `.git` text-pointer.

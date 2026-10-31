---
name: git-worktrees
description: >
  Apply worktree placement and explicit push-target rules when creating a Git worktree or using git/gh under .claude/worktrees/. Excludes ordinary work in a normal checkout.
---

# Git Worktrees

## Location

Worktrees live inside the repo:

```bash
git worktree add .claude/worktrees/<branch-name> -b <branch-name>
```

Sibling directories such as `../repo-wt/` are not used.

## Pushing

Name the branch explicitly:

```bash
git push origin <branch-name>
```

Bare `git push` follows the current worktree's branch and applicable upstream,
remote, and push settings. Name the intended remote and branch explicitly to
avoid ambiguity.

## The `gh` CLI

`gh` can discover repositories from linked worktrees. Pass `--repo owner/repo`
to make the intended repository explicit:

```bash
gh pr create --repo owner/repo --head branch-name ...
```

## Completion checklist

Use evidence to complete this checklist. Mark an item N/A only with a reason. An unresolved applicable item is a delivery gap.

- [ ] Before the worktree or Git action, confirmed the target repository, branch, remote action, and need for each operation were clear and within scope.
- [ ] Placed any new worktree under `.claude/worktrees/` in the repository and preserved existing worktree state.
- [ ] Named the remote, branch, and `gh --repo` target explicitly for each authorized remote operation.

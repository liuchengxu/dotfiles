---
name: git-worktrees
description: >
  Working inside a git worktree: where to create one, how to push from it, and
  why the `gh` CLI needs `--repo` there.
  TRIGGER when creating a worktree, or when running git or gh commands from a
  directory under `.claude/worktrees/`.
  DO NOT TRIGGER for ordinary git work in a normal checkout.
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

A bare `git push` targets the main repo's branch, not the worktree's.

## The `gh` CLI

`gh` cannot operate inside a worktree — the `.git` there is a text pointer, not
a directory. Pass `--repo owner/repo` to bypass local git discovery:

```bash
gh pr create --repo babylonlabs-io/vault-provers --head branch-name ...
```

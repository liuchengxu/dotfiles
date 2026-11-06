---
name: trim-docs
description: >
  Tighten existing documentation and comments by removing redundancy, repetition,
  and narration while preserving contracts and meaning. Use when asked to trim,
  tighten, or clean up docs, comments, or a repository's prose — "trim this
  repo", "tighten the docs before the PR". Not for writing new docs (use
  writing-docs) or gating new code (use code-minimalism).
---

# Trim docs

Deletion is cheap to request and expensive to notice. This skill removes what
reads twice and keeps what carries meaning; it never refactors code and never
chases unrelated cleanup.

## Scope

- Name the scope before touching anything: files, a directory, or a diff range.
  A whole-repository pass is only what the user explicitly asked for.
- Name the reader the text serves (caller, operator, reviewer) and trim toward
  that reader.
- Generated, vendored, and third-party files are out of scope. License headers,
  lint and tool directives stay untouched.

## What may go

- Comments judged against `~/.dotfiles/agents/skills/code-minimalism/references/comment-policy.md`
  — its reasons, its flag list, and its keep list apply unchanged.
- Two explanations of one fact, kept only where each serves a reader who will
  not see the other; otherwise collapse to the better one and cross-reference.
- Narrated history, session and PR references, and steps that restate the
  code's own structure.
- Prose that a section heading or an identifier already says.

## What must stay

- Contracts, preconditions, and normative force ("must", "only", "never") —
  compress the wording if needed, never the obligation.
- Warnings whose loss would mislead an operator, examples a reader needs to use
  the thing, provenance that licensing or attribution requires.
- Repetition that serves independently read sections: a README summary and a
  reference section may both state a fact if each is read alone.

## Rules

- Read the surrounding code and the authoritative doc before deleting; a line
  that looks redundant may be the only place a remote reader learns it.
- Uncertainty means retain and report, never delete.
- No deletion quotas and no drive-by rewrites of what stays: the smallest diff
  that removes the excess.
- Verify before claiming done: the before/after meaning of every trimmed
  passage, references to removed anchors or sections, and any doc build or
  doctest the scope has. State what you did not check.

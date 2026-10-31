---
name: writing-issues-and-prs
description: >
  Draft or revise GitHub issues, PR bodies, and review replies from established facts. Does not authorize posting, triage tickets, or perform technical review.
---

# Writing Issues and PRs

Write for a maintainer who was not in the session. State why the work exists,
the intended result, and the evidence. Describe the final state, not the
journey. Drafting does not authorize posting, creating an issue or PR, or
applying labels.

## Structure

1. An explicit user request wins.
2. Then the repository's template. Before drafting, look on the default branch
   in `.github/ISSUE_TEMPLATE/` for issues, and in the root, `docs/`,
   `.github/`, and `.github/PULL_REQUEST_TEMPLATE/` for PRs. Fill its sections
   and keep its required checklist items. A CLI body flag does not fill the
   template for you.
3. Otherwise, a PR uses `## Why`, `## What`, and `## How` (below). An issue is
   prose, with bold labels only where distinct concerns would hide.

Replace every template prompt with content. Never leave an empty section, a
`None` line, or `N/A`. Omit a section that asks nothing of the reader.

## PR sections

- **Why:** the problem, risk, or maintenance cost today, and any real timing
  trigger. Not the implementation.
- **What:** the outcomes and boundaries the reviewer must judge, and why each
  non-obvious choice was made. Not a file list or a narration of the diff.
- **How:** what a reader must do: migration, renamed artifact or command,
  deployment order, rollback limit, pre-merge step. Show before and after
  where a reader would otherwise guess. Omit it when the change asks nothing.

Add `## Verification` only for material evidence that CI does not show, or for
an open gap. Add `## Scope and non-goals` only when an exclusion or an
unchanged guarantee could mislead the reviewer.

A tiny single-purpose PR can be one short paragraph that answers the same
questions. A small file count alone does not qualify it.

For a trust, protocol, schema, signing, validation, or role change, say who
owns the decision, what is trusted before and after, what validation order or
acceptance behavior changes, what stays unproven and who owns it, and which
negative or before-and-after case shows the new guarantee.

## Temporary changes

For a workaround, mitigation, or other short-term fix, in an issue or a PR,
say that it is temporary and state its lifecycle:

- **Gap:** what it does not fix, and the risk that remains while it is in place.
- **Retirement:** what replaces or removes it: a linked issue or PR, a
  dependency version, or a date. If no trigger exists yet, say so; do not
  imply the fix is permanent.
- **Removal:** what a maintainer deletes or reverts, and how they confirm it is
  no longer needed.

Mark it in the code too, with a comment that links the retirement issue.

## Issue content

Include only what changes the implementation or review:

- **Reproduction:** smallest setup and action, actual and expected result.
- **Current and target:** ownership, trusted inputs, and guarantee now and
  when done; what stays unproven.
- **Decided direction:** settled constraints only. Name open decisions as open.
- **Acceptance:** observable behavior, a negative or regression case, and any
  required docs, compatibility, or migration result.
- **Scope:** deferred work, only when omitting it would mislead.

## Intent

Every PR states the problem or value and the intended outcome, even a tiny
one, a dependency bump, or a generated change. Links support the body; "see
issue" does not replace it.

- Take intent from the author or an authoritative requirement. The diff shows
  implementation, not an unstated goal. If intent is unknown, ask.
- Each independent addition fits that purpose or has its own reason. A real
  maintenance gain or a documented near-term consumer justifies a refactor; a
  hypothetical consumer does not.
- When a PR implements an ADR, link the decision and say which part this PR
  implements. Name work outside it. If a needed ADR is missing, say so; do not
  write one unasked. In a one-commit-per-PR stack, put the same mapping in the
  commit message.
- Before presenting the PR as done, compare the stated outcome with the change
  and its evidence.

## Shape

- One review unit: prose. Two or more: a short lead and one bullet each. A unit
  is independent if it protects a different invariant, has separate evidence,
  or could be its own PR. Fold a consequence into the bullet it explains.
- If the body cannot explain its units without becoming an inventory, propose
  splitting the PR.
- Put `Closes #N` or `Fixes #N` on its own line at the end.
- Stacked PRs: each body stands alone and leads with its own problem. Do not
  repeat links or order that the stack shows. Explain a dependency only when it
  changes the review. After a rename anywhere in the stack, update every body.

## Evidence

Check every material claim before posting: what justifies the PR, explains a
risk, names a dependency conflict, says behavior is preserved, or says
something was verified.

- A requirement needs a source: a failing command, issue, CI log, downstream
  PR, or user workflow.
- A dependency or build claim needs evidence from the same graph the PR
  changes (`cargo tree`, `cargo metadata`, the resolver error). Name the exact
  conflicting paths when the graph proves them.
- "Behavior-preserving" needs a focused check; otherwise write "intended to be
  behavior-preserving".
- A threat claim needs an actor, a controlled input, and the smallest witness.
  If the evidence shows only a new guarantee, describe the guarantee.
- If a weakness may still be exploitable on a deployed or public branch, do not
  publish inputs, reproduction, or witness. Use the repository's private
  security process. If none is known, stop and ask.
- Do not list CI checks, commands, or pass counts. Do not mention agent or
  model reviews, verdicts, or counts; state the finding itself.
- When the evidence supports only a narrower statement, write the narrower
  statement. When the cause is unknown, say what is known.

## Voice

- Plain, active language. Present tense for the final state; past tense for a
  failure that happened. Drop "This PR aims to", "In order to", "simply",
  "robust".
- Do not restate the title or the diff. No ceremonial preamble.
- No generator footer. Never append "🤖 Generated with Claude Code" or a
  session link.
- After a material edit, re-read the whole body for shape. After a semantic
  force-push, rebuild the body from the current diff.

## Review replies

Reply in the comment's thread, not as a top-level comment:

```bash
gh api --method POST \
  repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies \
  -f body='{reply text}'
```

Say what changed and where, or why nothing changed. Do not re-argue a point the
new diff settles. Show the reply to the user and get approval before posting.

## Before delivery

- No template prompt, empty section, `None`, or `N/A` remains.
- No generator footer.
- Every material claim has evidence, or is worded as narrowly as the evidence.
- A temporary change names its gap, its retirement trigger, and its removal.
- Every ID, code reference, and coined term resolves for a reader outside the
  session. The `standalone-docs` skill does the full pass.
- Nothing is posted, created, or labeled without the user's approval.

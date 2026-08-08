---
name: writing-issues-and-prs
description: >
  Shapes the body text when creating a GitHub issue or pull request, so
  the result is concise, plain-spoken, and leads with the bigger picture
  instead of reading like a robotic template.
  USE when: about to open or draft a GitHub issue or PR (via `gh`, the
  web UI, or any tool), write a PR description, fill in an issue body, or
  reply to a review comment — including after finishing a feature and
  writing it up.
  DO NOT USE for: slicing a plan into many tickets or triaging existing
  issues (no dedicated skill — handle directly), or reviewing/editing a
  doc that is not an issue/PR (use doc-review).
---

# Writing Issues and PRs

Write to a busy maintainer who knows the codebase but was not in your
head. The test of a good body is an outcome, not a heading set: after
reading it, the maintainer knows **why this exists, what changed or
needs doing, and what evidence supports it.** The body describes the
final state, not the path that got there.

Everything below is a recipe for that outcome — not boxes to fill.
Length matches substance: a three-line body is correct when three lines
cover it. Add a header only when the body is long enough to need
navigation; short ones need none.

## Voice

- Plain, active language. Say what it does — drop "This PR aims to…",
  "In order to…", "It should be noted that…". Prefer present tense for
  current behavior and final state; use past tense for a failure that
  already happened.
- One idea per sentence. Cut adverbs and hedges that carry no
  information ("simply", "basically", "various", "robust").
- No restating the title, no ceremonial preamble, no checklist sections
  unless they carry real content.
- No generator footer. Never append "🤖 Generated with Claude Code" or
  a session link to the body.

## Reader questions

The recipe is an internal review pass; the posted body should read like
a maintainer note, not the recipe rendered as markdown. Answer these in
natural prose — they are checks for you, not headings for the body.

PRs and issues answer the same questions from different positions: a PR
explains the final state of a completed change; an issue explains the
current gap and the outcome that would close it.

- Why does this exist? Lead with the failure, gap, risk, or job, at the
  altitude a maintainer needs to care.
- What changed, or what is true when the issue is done? For a PR, the
  shape of the change and the one or two moving parts worth reviewing
  first (not a file-by-file narration; the diff shows files). For an
  issue, the desired outcome, unless the implementation is settled.
- What evidence supports it? For a PR, say nothing about verification
  by default — required CI attests what it runs. Add a line only for
  evidence CI obviously won't surface (a check CI doesn't run, an
  environment-skipped test, "only type-checked", no or non-required
  CI), and then only that evidence. For an issue, repro steps or the
  context a reader needs to start.

Add a nonobvious-why sentence only for a decision the diff or tracker
cannot explain — a trade-off, a constraint, why not the obvious
alternative.

Add a follow-up note only when deferred work changes a review, release,
or user expectation — something intentionally out of scope, a known
risk, a rollout constraint, or a linked issue the reviewer should track.
Otherwise omit it; never write a "None" line.

Keep short bodies flat; a paragraph or two needs no headings. When plain
prose would hide a distinct concern the reader must find quickly, add one
scan anchor. Prefer a one-line bold lead that names the actual change or
risk. Use it especially when a motivation-first body runs long: the prose
can still lead with the why, while the bold lead names the change or risk
the reviewer should track. Use content headings only when the body has
multiple sections a reviewer may jump to — a blocker, a rollout note, a
verification result.
Name headings for their content, not the recipe; never Summary, Changes,
Tests, or the reader-questions above.

Before drafting the change section, count the distinct review units —
changes, risks, or evidence a reviewer may inspect, question, or weigh
independently. One review unit → prose. Two or more independent units →
a short lead plus one bullet each. A unit is independent if it would
still make sense reordered, could plausibly be its own PR, protects a
different invariant, or has separate evidence; if an item only explains
the why, effect, or consequence of another, fold it into that bullet's
prose. Security and protocol-correctness PRs usually bundle several
independent findings or invariants — lead plus bullets — while a PR that
protects one invariant through a single causal chain stays prose. Never
organize bullets by touched files or narrate the diff.

Put an issue-closing reference (`Closes #N`, `Fixes #N`) on its own line
as a trailer at the end of the body — not bold, not folded into the lead.

## Scenario cues

The scenario only shifts which evidence matters. These are inputs for
choosing the first sentence, not sections to fill — use the row to
decide what the reader needs.

| If this is… | First sentence usually names… | Evidence that may matter… |
|---|---|---|
| Bug fix | The failure and who/what it broke | root cause in a line, repro, expected/actual, regression test |
| Feature | The user or job this unlocks | done criteria, limits, follow-ups, rollout notes |
| Refactor | The reason to change structure now | behavior-preservation claim, before/after boundary, non-CI no-regression evidence when it changes review confidence |
| Chore / docs / deps / test | The maintenance value | what future work or confidence this enables |
| Security / protocol correctness | The invariant or risk being protected | threat model, remaining assumptions, negative/adversarial tests |

## Evidence discipline

Do not turn the PR body into a citation dump, but do verify every
material claim before posting it. A material claim is one that justifies
the PR, explains risk, names a dependency/build conflict, says behavior
is preserved, or says something was verified.

- Requirement claims need a concrete source: a failing command, issue,
  CI log, downstream PR, user-visible workflow, or other reproducible
  trigger.
- Dependency and build claims need graph or tool evidence from the same
  dependency graph the PR affects: `cargo tree`, `cargo metadata`, CI
  logs, or the exact compiler/resolver error. Do not infer a combined
  workspace conflict from an isolated crate graph, or attribute a
  combined-workspace failure to a single crate's own graph.
- For stacked PRs, validate requirement claims at the boundary where
  they matter. If a PR says it exists for a downstream PR, check that
  downstream graph, workflow, failing command, or branch; the current
  PR's isolated diff may not reproduce the need.
- For dependency or build failures, prefer exact causal paths over short
  causal labels. Name the conflicting package/version paths when the
  graph proves them.
- Behavior-preserving claims need focused verification or a narrower
  wording such as "intended to be behavior-preserving" when only the
  code move/import shape was checked.
- Omit verification claims required CI will independently attest. When
  a claim is worth stating (CI doesn't cover it or is unavailable),
  list only commands actually run, distinguish local verification from CI, and mention relevant
  limitations when a command was blocked by environment setup or
  unrelated failures.

If the evidence proves only a narrower statement, write the narrower
statement. If the precise causal path is still unknown, say what is known
and avoid naming a specific cause until it is reproducible.

## Compression pass

Before posting, delete any sentence that only restates the title,
repeats the diff, or says the work is straightforward. Keep details
that change a review, implementation, or release decision.

Prefer essence over inventory: wire formats, field lists, enum values,
and internal helper names live in the spec or diff — cite them in the
body only when the maintainer must assess them. This trims mechanical
detail; it never removes the evidence lines, nonobvious-why, or
invariant bullets the sections above call for.

After a material edit, re-read the whole body for shape, not just the
sentence you touched — incremental edits erode structure, and a change
that adds a second review unit can turn a prose paragraph into bullets.

## One example

**Before (robotic, verbose):**

> ## Summary
> This pull request introduces a number of changes in order to improve
> the prover worker. It should be noted that the worker previously did
> not handle the case where the cursor was missing. Various refactors
> were also performed.
>
> ## Changes
> - Modified prover.rs
> - Modified db.rs
> - Added a test

**After:**

> The prover worker crashed on startup when no cursor existed yet,
> blocking the first proving run on a fresh DB. It now resolves the
> cursor from genesis instead of unwrapping.
>
> `ProverWorker::resolve_cursor` now handles the empty-cursor case; the
> DB accessor only exposes the genesis fallback that path needs. Covered
> by a new `fresh_db_starts_from_genesis` test.

**After (several independent review units — one lead, one bullet each):**

> This PR closes three independently reviewable gaps in how the upload
> endpoint authenticates callers.
>
> - Tokens are now bound to the issuing tenant, so a token minted for one
>   tenant can't be replayed against another.
> - Expired tokens are rejected before the body is parsed, not after, so
>   a large payload can't tie up a worker on an already-dead token.
> - The signing key is read from the sealed config at boot instead of the
>   mutable runtime store, matching the endpoint's trust boundary.

Each bullet protects a different invariant, reads alone, and could be its
own PR — that is what earns the bullet form. A single-change PR stays
prose, as above.

## Replying to review comments

A reply belongs in the thread it answers, so the reviewer reads it beside
their own comment:

```bash
gh api repos/{owner}/{repo}/pulls/comments/{comment_id}/replies
```

A top-level PR comment loses that context and makes the reviewer hunt for
what it refers to.

## Common mistakes

- Narrating the journey ("first I tried X, then Y"). The reader wants
  what *is*. Iteration belongs in the chat, not the body.
- Padding to look thorough. A short PR with a clear why beats a long one
  with a Summary/Changes/Testing scaffold around three real sentences.
- Restating the diff in prose. Summarize intent and altitude; let the
  code show the lines.

## Closure

An issue or PR body leaves the session by definition. Before posting, confirm
every finding ID, code reference, and coined term resolves for a reader who was
not there. Use the `doc-closure` skill for the full pass.

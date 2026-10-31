## Reader questions

Use these questions as completeness checks within the applicable template,
not additional headings. The posted body should read like a maintainer note,
not a questionnaire. Issues and tiny PRs using the short-paragraph exception
can answer them in natural prose.

PRs and issues answer the same questions from different positions: a PR
explains the final state of a completed change; an issue explains the
current gap and the outcome that would close it.

- Why does this exist? Lead with the failure, gap, risk, job, or maintenance
  cost, at the altitude a maintainer needs to care. A refactor or chore may be
  justified by making the current code easier to understand or maintain; do
  not manufacture a downstream consumer.
- What changed, or what is true when the issue is done? For a PR, the
  notable outcomes and boundaries the reviewer must assess, emphasizing
  non-obvious choices rather than inventorying implementation steps. For an issue,
  the desired outcome, unless the implementation is settled.
- What must the reader do? Name the migration, renamed artifact, command,
  deployment order, or pre-merge step the change requires. A change that asks
  nothing of the reader omits `How` rather than filling it with "nothing".
- What evidence supports it? Keep evidence to what changes the review decision,
  not a test report, and give it a `Verification` heading only when it is
  material and non-CI. CI owns routine check names,
  pass/fail status, commands, and counts; do not restate them. Mention a specific
  regression or before/after witness only when its behavior explains a claimed
  guarantee that CI status alone cannot explain. Include material non-CI checks
  and unresolved coverage limits. For an issue, include the repro or context
  a reader needs to start.

For each independent review unit, include any non-obvious rationale the diff or
tracker cannot explain: the trade-off, constraint, threat, or why the obvious
simpler alternative is insufficient. When the diff is self-explanatory, do not
invent one. Reconsider the design or PR boundary only when a unit needs a
rationale that you cannot state.

Add a follow-up note only when deferred work changes a review, release,
or user expectation — something intentionally out of scope, a known
risk, a rollout constraint, or a linked issue the reviewer should track.
Otherwise omit it; never write a "None" line.

Use the PR template's headings by default, subject to repository/user
precedence and the tiny single-purpose exception. Keep optional sections only
when they carry a reviewer decision. For issues, use headings or bold scan
anchors when natural prose would hide distinct review concerns. Never turn
`Why` into a restatement of `What`, `How` into a narration of the diff, or
`Verification` into a CI command dump. Remove empty scaffolding, not required review information.

When deciding on headings, weigh:

- **Semantic versus visual structure**: real headings support assistive and
  anchor navigation; bold labels are only visual anchors — they are not
  interchangeable.
- **Rendered size**: judge wrapping, mobile width, and review-unit count, not
  Markdown source lines.
- **Evidence locality**: keep evidence near the guarantee it supports; use one
  labeled evidence block only when it supports the whole PR, or it becomes a
  command dump.
- **Authority order**: an explicit user request wins, a repository template
  comes next, this skill supplies the default when neither applies.

Before drafting `What`, select what changes a reviewer's judgment—for
example, behavior, trust or environment boundaries, feature meaning, ownership,
or compatibility. Preserve the contract details listed under Compression pass;
these examples are not exhaustive. Explain why a boundary or feature changes,
not merely that it moved or was renamed. A mechanical relocation, export list,
or documentation sync needs no separate review unit when another unit in
`What` already explains it. Fold in any necessary detail; omit the rest.
Keep evidence beside the specific guarantee it supports; raise a `Verification`
heading only when material non-CI evidence covers the whole change. Documentation and CI changes are
substantive when they alter requirements, audit boundaries, release policy, or
verification guarantees. This is a relevance filter, not a bullet quota or
permission to hide independent risks.

Then count the selected review units — changes, risks, or evidence a reviewer
must inspect, question, or weigh independently. Within `What` (or a short body), one review unit uses
prose; two or more use a short lead plus one bullet each. A unit is independent if it would
still make sense reordered, could plausibly be its own PR, protects a
different invariant, or has separate evidence; if an item only explains
the why, effect, or consequence of another, fold it into that bullet's
prose. Security and protocol-correctness PRs usually bundle several
independent findings or invariants — lead plus bullets — while a PR that
protects one invariant through a single causal chain stays prose. Never
organize bullets by touched files or narrate the diff.

Several independently reviewable units under one motivation still need their
own rationale and contract. If the body cannot explain them without becoming a
sprawling inventory, reconsider whether the PR should be split.

Put an issue-closing reference (`Closes #N`, `Fixes #N`) on its own line
as a trailer at the end of the body — not bold, not folded into the lead.


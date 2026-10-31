---
name: writing-issues-and-prs
description: >
  Draft or revise GitHub issues, PR bodies, and review replies from established facts. Does not authorize posting, triage tickets, or perform technical review. Use doc-review for other documents.
---

# Writing Issues and PRs

State why the work exists, the intended result, and the supporting evidence.
Describe the final state for a maintainer who was not in the session.
Drafting does not authorize posting, creating an issue/PR, or applying labels.

## Body templates

The reader questions below are the global core. For PRs, read the literal
default template; for issues, use the conditional modules:

- [Issue body template](references/issue-template.md)
- [Pull request body template](references/pull-request-template.md)

A complex body is one where a module changes a reader's decision: reproduction,
acceptance criteria, a trust or schema boundary, a stacked dependency that
changes review judgment, compatibility,
rollout, or a non-goal. The short-PR exception changes presentation, not the
intent contract below.

Before drafting, inspect the target repository's default branch for its own
template. Check `.github/ISSUE_TEMPLATE/` for issues and the root, `docs/`,
`.github/`, and `.github/PULL_REQUEST_TEMPLATE/` for PR templates. When using a
CLI body flag, incorporate the applicable template explicitly; do not assume
the CLI populated it.

If the repository provides an issue or PR template, it owns the posted body's
structure. Fill its sections to this standard instead of replacing them, and
preserve required checklist items. Otherwise, PRs use `## Why`,
`## What`, and `## How` from the PR template, with its conditional
sections only when needed. Tiny single-purpose PRs may use the
short-paragraph exception. Issue modules remain information-gathering prompts,
not mandatory headings. Replace all template prompts with actual content;
never leave empty sections or `N/A` answers.

When authoring a repository template, standardize labeled sections only for
information the team repeatedly needs to review, merge, or release — never
for uniformity alone.

## PR intent contract

Read [the canonical PR intent contract](references/intent.md) when drafting a PR
or checking its intent. This heading remains a compatibility route for reviewers.
The contract owns completeness; a matching diff alone does not establish intent.

## vault-provers contributor label

For issue/PR creation or draft label assessment in
`babylonlabs-io/vault-provers`, read and apply the
[contributor label policy](references/vault-provers-label.md).
Other repositories do not need this reference.

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

For an issue or PR body, read [the reader questions](references/reader-questions.md).
They check completeness within the applicable template; they are not extra headings.

## Scenario cues

For complex changes or uncertain emphasis, read [scenario cues](references/scenario-cues.md).

## Evidence discipline

Read [the evidence rules](references/evidence.md) before drafting a body or reply.
Do not invent intent, evidence, validation, or disclosure authority.

## Compression pass

Before delivering a substantive body, use [the compression checks](references/compression.md).

## One example

Read [the example](references/example.md) only when an example helps shape the body.

## Replying to review comments

For a review reply, read [the reply rules](references/replies.md) and Evidence discipline.

## Common mistakes

If the draft has excess scaffolding or scope ambiguity, check [common mistakes](references/mistakes.md).

## Closure

An issue or PR body leaves the session by definition. Before posting, confirm
every finding ID, code reference, and coined term resolves for a reader who was
not there. Use the `doc-closure` skill for the full pass.

## Completion checklist

Use evidence to complete this checklist. Mark an item N/A only with a reason. An unresolved applicable item is a delivery gap.

- [ ] Before drafting, confirmed the issue, PR, or reply purpose, audience, repository template, and need for each included section were clear and within scope.
- [ ] Used only established intent and evidence, preserved the repository's required structure, and removed prompts, empty sections, and unsupported claims.
- [ ] Answered the applicable reader questions with concise final-state language and preserved trust, compatibility, rollout, or non-goal details that affect review.
- [ ] Closed every finding ID, code reference, and introduced term for a reader outside the session.
- [ ] Delivered the draft with validation and uncertainty stated, without posting or implying publication authority.

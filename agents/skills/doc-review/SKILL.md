---
name: doc-review
description: >
  Review or draft documents for clarity, consistency, integrity, and reader use. Includes editorial follow-ups. Use adversarial-review for technical soundness and writing-issues-and-prs for GitHub bodies or replies; narrow copyedits need no full review.
---

# Doc Review

Improve the document for its intended reader and next action. Preserve meaning,
requirement force, source attribution, uncertainty, and operational evidence.
An editorial verdict does not certify technical correctness. Review-only requests
do not authorize edits; use existing authorization for requested revisions.

## Part A — General rules (every doc)

For substantive drafting or review, read [the general rules](references/general.md).
For a narrow copyedit, preserve meaning and make the requested change directly.

## Part B — Type-specific addenda

Read only the applicable genre. ADRs use B.2; RFCs use B.2 and B.8 when requesting
a decision. Tutorials combine B.3 and B.1 when executable. B.9 overlays any
document assembled from sources. No matching genre means Part A is sufficient.

### B.1 Operational runbook / test plan

Read [the runbook rules](references/runbook.md) for this genre.

### B.2 Design doc / architectural spec

Read [the design rules](references/design.md) for this genre.

### B.3 Background / theory doc

Read [the theory rules](references/theory.md) for this genre.

### B.4 Code / API reference

Read [the api rules](references/api.md) for this genre.

### B.5 README / onboarding

Read [the readme rules](references/readme.md) for this genre.

### B.6 Post-mortem / incident report

Read [the incident rules](references/incident.md) for this genre.

### B.7 Spec-derived runbook / alignment review

Read [the spec-alignment rules](references/spec-alignment.md) for this genre.

### B.8 Proposal / decision-request doc

Read [the proposal rules](references/proposal.md) for this genre.

### B.9 Assembled / source-derived document

Read [the assembled rules](references/assembled.md) for this genre.

## Part C — Authoring defaults (deadly simple)

When drafting a new document, read [authoring defaults](references/authoring.md),
then review it with Part A and the applicable Part B rules.

## Review output format

For a standalone substantive review, read [the result contract](references/result.md).
For an editorial lens inside technical review, return supported editorial findings
to its coordinator; do not issue a second verdict.

## When NOT to apply

- **GitHub issue / PR bodies**: use writing-issues-and-prs.
- **Technical correctness review**: if the question is "is this
  algorithm right" or "does this approach work", that's a different
  skill / domain reasoning. This skill can still be used for the
  document's structure, clarity, and alignment with an existing spec.
- **Single-line edits**: applying this entire framework to "fix this
  typo" is overkill.

## Closure

Before delivering a doc that references code or may leave the session, confirm a
cold reader can resolve every term, reference, and finding ID from the artifact
alone. Use the `doc-closure` skill for the full pass.

## Completion checklist

Use evidence to complete this checklist. Mark an item N/A only with a reason. An unresolved applicable item is a delivery gap.

- [ ] Before review or drafting, confirmed the document purpose, audience, next action, genre, and need for each requested change were clear and within scope.
- [ ] Applied the general rules and only the genre addenda that affect this document.
- [ ] Preserved meaning, requirement force, attribution, uncertainty, and operational evidence while improving reader use.
- [ ] For a standalone substantive review, applied the result contract; otherwise marked this format check N/A with the task type.
- [ ] Kept editorial findings separate from technical certification in every output.
- [ ] Closed touched terms and references for a cold reader and reported any unresolved editorial or source gap.

# Pull request body template

Use this literal default unless the user or repository provides a different
structure. The [PR intent contract](../SKILL.md#pr-intent-contract) owns the
required meaning. Tiny single-purpose changes may use one short paragraph
that answers the same questions; small file count alone does not justify it.
Replace bracketed prompts with actual content before posting.

## Default sections

```markdown
## Why

[What problem, risk, or concrete maintenance cost exists today?
Why is this change needed?]

## What

[What notable outcomes or boundaries must the reviewer assess?
Explain why changed features or non-obvious choices are needed.
Omit mechanical steps already implied by those changes, not independent risks.]

## How

[What must a reader do about it? Name the migration, renamed artifact or
command, deployment order, rollback constraint, and any pre-merge step, with
the before/after form where a reader would otherwise guess. Omit this section
when the change asks nothing of anyone; never write "nothing" or `N/A`.]
```

`Why` explains the need and any real timing trigger, not the implementation.
Put resulting behavior and structure in `What`; delete solution details
from `Why` when that section already covers them. Keep only approach context
needed to explain the value, not a second change summary.
`How` owns what the reader does, not what the change is: an outcome stated in
`What` is not repeated as a step.
Passing CI alone does not show that the stated outcome was tested. Keep evidence
near the guarantee it supports when several changes need distinct evidence.

## Conditional sections

Include only sections that affect a review, merge, or release decision.
Omit unused sections rather than writing `N/A`.

```markdown
## Verification

[What notable evidence or unresolved gap changes review confidence beyond
visible CI? Omit routine check lists, results, and counts. Name a behavioral
witness only when it explains a claimed guarantee; distinguish verified from
pending. Omit the heading when the visible CI surface carries the evidence.]

## Scope and non-goals

[What is deliberately excluded or left to another component/change?
What important guarantees remain unchanged or unestablished?]
```

## Boundary-sensitive content

For trust, protocol, schema, signing, validation, or role changes, include
these answers in the applicable sections above, not as another mandatory
heading set:

- Who owns the decision/data and what inputs or guarantees are trusted before
  and after the change?
- What validation order, committed fields, or acceptance behavior changes?
- What remains unestablished, and which component/operator owns that check?
- What negative, adversarial, or before/after scenario distinguishes the new
  guarantee? Apply the disclosure rule in the parent skill before including
  security-sensitive evidence; do not publish an unremediated exploit.

## Stacked changes

Do not add a Stack context section or repeat links, ordering, and relationships
already visible in the stack. Explain a dependency only when it changes the
review decision: a required upstream invariant, a concrete downstream consumer
justifying an addition, or a material guarantee intentionally left elsewhere.
Place that explanation in Why, What, or Scope and non-goals, linking
only the evidence needed to understand it. Each PR still states its own problem
and intended outcome; stack membership does not substitute for intent.

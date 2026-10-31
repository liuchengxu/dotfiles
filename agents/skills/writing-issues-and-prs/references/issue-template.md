# Issue body template

The global core lives in `SKILL.md`. Use only the modules below that change an
implementation, review, or release decision. Their headings and bold labels
name information to gather; never emit them automatically. Write the final body
as natural prose, or as a short lead plus bullets when it has multiple
independent outcomes.

### Reproduction

[Give the smallest setup and action that produces the failure, followed by the
actual and expected results. Include version or environment details only when
they affect reproduction.]

### Contract or trust-boundary change

- **Current:** [Who owns the decision or data, what inputs are trusted, and what
  guarantee exists now?]
- **Target:** [What ownership, data flow, validation order, schema, or guarantee
  should exist when the issue is closed?]
- **Residual boundary:** [What the change will still not prove or enforce, and
  which component or operator continues to own it?]

### Constraints and decided direction

[Record only settled constraints or design decisions that narrow valid
solutions. Link the source of an external requirement. If the approach is not
settled, state the decision that remains open instead of presenting a guess as
the plan.]

### Acceptance criteria

- [Observable behavior that must hold.]
- [Negative, adversarial, or regression case that distinguishes the fix from
  the current behavior.]
- [Required documentation, compatibility, migration, or operational result.]

### Scope boundary

[Name intentionally deferred work only when omitting it could mislead the
implementer or reviewer about completion, safety, compatibility, or rollout.]

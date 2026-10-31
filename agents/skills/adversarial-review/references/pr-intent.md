## PR intent check

Use the [PR intent contract](../../writing-issues-and-prs/references/intent.md)
as the single authoring standard. Record the stated problem/value, intended
outcome, and source. Compare description → actual diff → verification, including
why each independently meaningful addition belongs. Check material exclusions
and compatibility claims without demanding arbitrary headings. A repository
or user template owns structure; the literal default is authoring guidance,
not a heading-compliance merge gate.

Do not infer an unstated goal from the implementation. A possible reading of
the diff is a question for the author, not evidence of intent. Accessible
authoritative requirements can establish intent when the description is thin;
recommend a body clarification instead of inventing a code defect. A documented
near-term consumer can justify an abstraction; mere speculation cannot.

If missing or conflicting intent prevents judging scope or correctness, say
**Not ready to merge — intended behavior needs clarification**. Name the exact
question, plausible readings, and the decision that depends on the answer.
Use ../taxonomy.md's ordered verdict mapping as the single source of precedence;
an established non-waived Blocking defect still takes precedence. Continue checks whose conclusions do not depend on
the uncertainty, and mark dependent coverage deferred. Do not abandon all
security review, or assume every security question is intent-independent.

If authoritative intent is clear but implementation contradicts it, apply the
normal evidence/severity/action gates. Treat a stale or poorly worded description
as a description-only correction only when an applicable authoritative source
resolves the apparent conflict and the implementation matches that intent.
A matching diff alone cannot establish which conflicting statement governs;
if the governing requirement remains unclear and changes the judgment, ask.
Disagreement with an explicit
product goal is an owner discussion, not a blocker unless a requirement or
invariant is violated. A confidentiality constraint does not justify guessing:
use authorized restricted evidence or report the access limitation without
requesting public exploit details.

Do not require the body to repeat visible stack ordering/links. Assess only
dependency explanations that change the review decision, and verify the full
scoped diff rather than let
an incomplete description hide additions. Keep the intent assessment in the
final report, separate from findings, as specified in ../taxonomy.md.


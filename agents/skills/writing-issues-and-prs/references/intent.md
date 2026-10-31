## PR intent contract

Every PR states the problem, risk, or concrete present value and the intended
outcome. The body carries enough to understand why the change exists and what
success means; links supply supporting requirements and deeper rationale, not
an unexplained "see issue" substitute. Tiny changes can satisfy this in one
sentence. Dependency bumps and generated changes are not exempt by category.

Each independently meaningful addition must fit that purpose or have its own
justification. Explain non-obvious approach choices and material non-goals;
do not manufacture alternatives or a scope section when there is no decision
to clarify. Concrete maintenance value or a documented near-term consumer can
justify a refactor or abstraction; a hypothetical future consumer cannot.

When a PR implements an ADR, name and link the specific decision(s), and state
which part the PR implements. Identify work outside those decisions explicitly,
including related PRs in an ADR-based stack. Several PRs can implement one decision.
Keep each PR's mapping in its body. Update an existing stack overview only when
that overview is in scope. When drafting commit messages for a one-commit-per-PR
stack, include the same mapping in each commit message.

Tests and refactors do not automatically need separate ADRs. If a required ADR
is missing, identify the gap; do not invent a decision or create an ADR without
authorization.

Use author statements or authoritative requirements as sources of intent.
The diff establishes implementation, not an unstated goal. If intent is
unknown, ask rather than invent it. Compare the stated outcome with the actual
change and its behavioral evidence before presenting the PR as complete.
Security-sensitive intent follows the [disclosure rule](evidence.md):
keep public rationale safe and use authorized restricted sources for details.


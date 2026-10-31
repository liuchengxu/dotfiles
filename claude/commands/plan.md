# Plan: $ARGUMENTS

Produce a source-grounded plan for the requested outcome. This command is
planning-only; do not implement or publish changes.

Inspect the relevant code, constraints, consumers, tests, and CI. Use independent
delegation only when it improves coverage. Apply `doc-review` for the document
and `notes-tiers` for its location.

The plan must let a cold reader assess the problem, proposed behavior, material
alternatives, affected files and interfaces, verification, risks, and unresolved
decisions. Include only sections that help that assessment. Size milestones by
coherent behavior and testable boundaries, not arbitrary time slices.

Deliver the complete plan within the requested scope. Mark decisions that need
input and continue independent work. Stop when the plan and its evidence are
complete; do not add speculative future work or require another approval for
document edits the user already authorized. Implementation requires its own
authorization.

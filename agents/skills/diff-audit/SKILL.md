---
name: diff-audit
description: A delete-biased audit of the assembled branch diff — code, tests, docs, configuration, and reviewer-driven changes — that removes additions which do not protect required behavior, a project-owned regression, or a reader decision, while preserving safety, compatibility, contract, and operational coverage. TRIGGER before first push of a branch, before opening or updating a PR, before declaring a change ready, and again after substantive review-driven changes. DO NOT TRIGGER on work-in-progress commits or mid-implementation state — audit only after the implementation has settled.
---

# Diff Audit

Audit the final branch diff after the implementation has settled. Review the
whole change against its PR base, not only the latest commit or staged lines.

This audit grants no edit, commit, or push authority beyond the user's existing
authorization. In review-only mode, report proposed changes without applying
them. Preserve unrelated work and changes outside the authorized scope.

The rule this enforces: scope and substance are separate gates. "Can the task
justify this line?" bounds what you touch; "does this line earn its maintenance
cost?" bounds what survives within that scope. Additions routinely pass the
first and fail the second — especially tests, docs, and review-driven changes.

## Establish the boundary

1. Resolve and state the intended PR base:
   - use the existing PR base when one exists;
   - use the explicitly supplied base for a stacked branch;
   - otherwise use the remote default branch.
2. Read the complete base-to-branch diff and enough surrounding code and docs
   to judge ownership, precedent, and duplication.
3. Restate the required behavior and observable success before deleting
   anything.

## Burden of proof

For each added behavior, test, explanation, example, safeguard, or
review-requested change, ask:

- What required behavior, plausible regression, or reader action does it serve?
- Is that obligation owned by this project rather than merely by a dependency
  or framework?
- Is this the cheapest sufficient layer and the simplest idiomatic form?
- Is another addition already carrying the same obligation?
- Does it follow the repository's existing precedent?
- For a reviewer suggestion, what concrete defect, invariant, threat, or
  established policy justifies accepting it?

Delete, merge, or simplify additions that have no specific answer.

Judge logical additions or hunks, not punctuation mechanically. Do not create a
persisted per-line justification ledger.

## Tests

Keep tests that protect a project-owned contract or regression, including
meaningful positive controls, rejection boundaries, compatibility behavior,
cross-component interactions, and bug regressions.

When a test is offered as evidence of a new guarantee, establish whether it
would fail against the base. If that is unclear, revert or mutate the
implementation and run it. A test that passes on both versions may protect
existing behavior, but it does not substantiate the new claim: strengthen the
test or narrow the claim.

Delete or consolidate tests that only:

- demonstrate a dependency's documented mechanics;
- assert a constructor copied a field;
- repeat the same path with different scaffolding;
- pin multiple examples when one table-driven or property test expresses the
  invariant more clearly.

Overlap is allowed when tests operate at different contract boundaries or make
failures materially easier to localize. Consolidate duplicated scaffolding
(near-identical stubs, fixtures, builders) into one parametrized helper.

## Documentation

Give each fact or rationale one authoritative home. Link or refer to that home
elsewhere instead of restating it.

Keep intentional point-of-use repetition when omission would plausibly cause an
operator, integrator, or user to make a concrete mistake. Reference
configuration, migration instructions, API contracts, runbooks, security
constraints, prerequisites, and recovery procedures must remain usable on
their own.

## Code and review suggestions

Remove speculative hardening, abstractions, or defensive behavior that lacks a
concrete threat, requirement, or repository precedent.

A change to how something is persisted or published needs substantive review
of the observable contract before this final audit; use adversarial-review.

A reviewer suggestion is evidence to evaluate, not authority to implement.
Rejecting it requires the same evidence discipline as accepting it; do not use
this pass to wave away a credible correctness or security concern — investigate
it or leave it explicitly unresolved, never silently dropped.

## Protected keep zones

Do not silently weaken or remove:

- security, fund-safety, consensus, cryptographic, or authorization invariants;
- wire-format, persistence, migration, and backward-compatibility contracts;
- concurrency, retry, cancellation, atomicity, and recovery coverage;
- public API behavior and caller-visible errors;
- regression tests for confirmed bugs;
- operator prerequisites, irreversible steps, failure recovery, and captured
  operational evidence;
- documentation whose completeness is itself part of the deliverable (specs,
  runbooks, audits, security reports, checklists).

When uncertain in a protected zone, keep it and escalate the uncertainty.

## Finish

1. Apply justified deletions, merges, and simplifications only when edits are authorized; otherwise report them.
2. Run the comment-cleanup pass if comments changed.
3. Rerun checks affected by the cleanup. Commit only when explicitly or already authorized; an audit-only request does not authorize a commit.
4. Report:
   - what was removed or consolidated;
   - any apparently redundant material deliberately kept and why;
   - verification performed.
5. When preparing an authorized push, record the claim for the final committed
   state and declared base (the pre-push gate checks freshness):

   ```bash
   ~/.claude/scripts/diff-audit-gate.sh --record --base <pr-base>
   ```

   The base defaults to the remote default branch; pass the real base for a
   stacked branch. Recording requires a clean working tree so the attested
   tip is the commit that gets pushed. The updated gate binds the repository,
   pushed commit, locally resolved base, merge base, and full diff. This does
   not prove review quality, the remote PR target, or unfetched remote state.
   If the tree is dirty, report that unmet
   prerequisite; do not create an unauthorized commit to satisfy the gate.

## Completion checklist

Use evidence to complete this checklist. Mark an item N/A only with a reason. An unresolved applicable item is a delivery gap.

- [ ] Before the audit, confirmed the required behavior, PR base, authorized diff scope, and need for each audit action were clear.
- [ ] Read the complete base-to-branch diff with enough source context to test each addition against a project-owned obligation.
- [ ] Removed or consolidated additions that did not protect required behavior, a plausible regression, or a reader decision, while preserving protected zones.
- [ ] Rechecked affected comments and validation after cleanup, including whether claimed regression tests fail against the base when applicable.
- [ ] Reported removals, deliberate keeps, verification, and any clean-tree or evidence prerequisite that remains unmet.

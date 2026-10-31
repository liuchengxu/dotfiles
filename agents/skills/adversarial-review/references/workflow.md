## Workflow

1. **Scope.** Establish the review unit — a PR, a design doc, or a
   code target (module, crate, repo — agree on boundaries if ambiguous) —
   and the decision gate: merge, release, design approval, or a named
   audit sign-off; if no gate is stated, use readiness of the reviewed
   scope as the gate. Identify the protected assets, trusted actors, state
   transitions, and invariants before hunting bugs. For each affected invariant,
   record its authority, preconditions, required relation, and enforcement owner.
   Keep this compact and internal; do not invent a property to justify a finding. For PRs, establish intent
   under [PR intent check](pr-intent.md) before judging intent-dependent behavior.
   For code review, establish the applicable project guidelines under
   [code quality](code-quality.md); retain rule authority and scoped exceptions.
2. **Ground.** Read the repo's design docs/README, repository instructions
   (including stated architecture principles and crate boundaries), the code
   under review, and search for consumers of changed or boundary-defining
   APIs. Verify
   external protocol claims against the repo's pinned version or an
   authoritative specification. Build a compact shared brief: source pins,
   intent, assets, actors, invariants, boundaries, supported variants,
   consumers, decision log, unread areas, and active review modes. Include
   reviewer-authority rules, untrusted-checkout restrictions, execution
   permissions, and publication restrictions in every delegated brief.
   Treat scope and invariants as hypotheses each pass can correct, never
   safety restrictions as optional. For high-risk
   scope, get a fresh-context omission check before discovery when available;
   otherwise record the lack of independent grounding review.
3. **Trace.** Follow behavior through callers and across trust boundaries.
   Consistency between attacker-supplied fields is not validation; follow
   controlled data to the protected invariant. For diffs: unchanged code
   affected by the change (consumers, serializers, persistence, verifiers)
   matters more than diff-local style. For codebase audits: trace each
   externally-reachable input to what trusts it. When a change replaces a
   persistence or publication mechanism, trace the destination's whole
   observable contract, not only its payload: existence and no-clobber
   behavior, abort cleanup, permissions and metadata, identity and link
   semantics, and which guarantees survive a crash rather than only a
   successful return. Preserve each dimension or state the deliberate change.
   Git blame / past-PR archaeology is conditional: only when intent,
   compatibility, or a surprising invariant is unclear.
4. **Review applicable aspects in a coherent order.** Start with the design,
   then its necessity, boundaries, behavior, and supporting evidence. The
   order helps understanding; it is not nine mandatory agents or nine serial
   gates. Read tests and requirements during grounding. Security constraints
   apply from scope setup. Reopen an earlier aspect when later evidence changes
   its assumptions. Skip an aspect only with a reason tied to the scoped change.

   Read each applicable lens below. Do not load a lens only to fill a quota.

   1. [Architecture / design](architecture.md).
   2. [Scope / simplicity](scope.md).
   3. [Compatibility / integration](compatibility.md).
   4. [Security / trust](security.md).
   5. [Behavioral correctness](correctness.md).
   6. [Lifecycle / reliability](lifecycle.md).
   7. [Code quality / project conventions](code-quality.md).
   8. [Validation quality](validation.md).
   9. [Documentation clarity / integrity](documentation.md).

   For each applicable aspect, record the governing requirement, evidence
   inspected, affected invariant, and remaining gap. Classify material
   invariants as preserved, broken, new, or unknown, with the enforcement point
   or missing evidence. Keep this compact; a small review needs no large table.
   Distinguish local product policy from external protocol requirements and
   pin the authority used. The implementation is evidence of behavior, not
   independent proof of the intended requirement.

   **Enforcement points.** Record where each affected invariant is enforced today and where a
   fix would enforce it, on one ladder: impossible by construction → build → CI → publish →
   deploy → startup → runtime. Construction prevents rather than detects; “not enforced”,
   “unchanged rung” and “not applicable” are valid answers. Review discovery is not an
   enforcement rung: record the existing enforcement point, “not enforced”, or an explicit
   unknown according to the evidence. The target is the
   earliest *adequate* rung: a later one is correct when the earlier ones are inadequate,
   unavailable, or disproportionate, and the review says which. Moving a failure later is a
   regression on this axis, and a check that reports success while failing open is worse than a
   narrow early one. A class with no earlier rung names the owner of the residual risk or, for
   an open question, of the investigation or decision.

   Before disproof, consolidate coverage across changed files or scoped units,
   affected contracts, transitions, and boundaries. An explicit unknown records
   a gap; it does not count as verified coverage. Assign uncovered interactions
   a targeted follow-up. An empty findings list is not coverage evidence.

5. **Disprove.** Kill candidates; only survivors become findings.

   - **Assume false.** For each candidate, treat it as untrue and build the
     strongest case for why it can't happen. Search for the neutralizing
     guard with the same effort you spent generating the candidate:
     upstream validation, downstream rejection, consensus enforcement,
     caller preconditions, the PR's own tests — or, for architecture, an
     existing seam, concrete consumer, documented exception, or rationale
     that answers the concern.
   - **Absence claims need boundary coverage.** Before claiming that a check is
     missing, inspect relevant callers, entry points, and downstream enforcement.
     State the input that reaches the violation despite those guards. An unread
     or unavailable enforcement path is a coverage gap, not proof of absence.
   - **Merge symptoms.** If the candidate is a consequence rather than a
     root cause, combine it into the root cause finding. One root cause,
     one finding; symptoms are supporting evidence.
   - **Reproduce when high-impact.** Write a focused test for
     high-severity candidates when feasible. Candidates not executed are
     labeled Code-traced unless the violation is directly entailed by
     protocol or consensus rules.

   Record the strongest counterargument, the guard/seam searched, and the
   source evidence for its disposition. In delegated reviews, use a fresh
   reviewer other than the originator. Supply the brief, candidate claim,
   witness, and source references; require reconstruction from source rather
   than acceptance of the discovery narrative. Coverage checking and
   synthesis may share context and see all results.

   A finding that survives disproof is worth publishing; one you didn't try
   to kill is a guess.
6. **Gate and classify.** Apply the evidence gate in ../taxonomy.md, then
   assign severity, impact class, and action. Architecture findings need a
   named change scenario, a contradicted stated principle or rationale, or
   a concrete present cost — never taste. Re-derive severity and action from
   consolidated evidence, not the highest pass rating or reviewer votes.
   Candidates that fail the gate become open questions under
   **Unverified checks and next actions** and never
   become defect-based blockers. Missing evidence required for sign-off is
   handled separately by ../taxonomy.md's review-completeness rule.
7. **Challenge the verdict.** After gate-and-classify, treat every
   provisional finding as false one more time. Starting from its cited
   evidence, rebuild its trace or change scenario and recheck its
   prerequisites, neutralizing guards or seams, PR provenance, and action
   mapping. Demote or reclassify any finding whose case cannot be rebuilt
   without relying on its own conclusion. If the disprove attempt in step 5
   was rigorous, this pass should be thin — the residual bias or
   assumption the honest disprove missed. In multi-reviewer reviews, this
   pass must be performed by someone other than the finding's originator.
8. **Render.** Complete the evidence record before presenting findings. Use the
   concise default in the [result contract](result.md): verdict, findings ordered
   by action then severity, coverage, then unverified checks and next actions. Group by
   root cause (not one finding per downstream symptom),
   one primary impact class each. State review limitations (unreviewed deps,
   assumed external behavior, parts of a large repo not covered — no silent
   coverage caps). Include the compact coverage summary, not separate reports
   for each pass. Apply the deliverable contract in ../taxonomy.md: what
   every review carries, and what it adds when there is an external
   thread to answer. Full format, taxonomy, and a rendered example:
   see the [taxonomy compatibility entry](../taxonomy.md).

## Current verdict and authorized remediation

One coordinator derives the verdict from the current source, adjudicated
findings, required coverage, and available checks. A panel supplies independent
candidates and evidence; it does not supply a second verdict or decide by vote.

If accepted fixes remain and edits are authorized, implement the bounded fix,
review the affected delta and consumers, and run the required affected checks.
After final scope/comment cleanup, invalidate any evidence affected by further
changes. Return to classification and verdict derivation for the new revision;
do not carry a previous ready verdict through an edit.

Review-only work stops with findings and proposed fixes. Follow-ups stop when
prior IDs have current dispositions and the affected scope is covered, or the
budget ends. Open blockers may remain. Acknowledgment or deferral does not
resolve a finding. Record explicit gate-owner risk acceptance without hiding
an open issue. Missing evidence required for readiness remains a separate
blocking gap under ../taxonomy.md, even when source review itself is complete.

**Never post review content to GitHub without explicit user approval.**

## Pass execution

- **Scale by affected guarantees.** Select the applicable aspects above. A skip
  must explain why the pass's concerns do not apply to the scoped behavior,
  guarantees, or boundaries. Add specialist depth for cryptography, concurrency,
  migrations, build/release authority, or a newly committed public boundary.
  A small diff or a docs/CI label is not evidence of low risk. External-item
  triage stays scoped to submitted claims and affected paths unless a
  broader review is requested or needed to adjudicate them.
- **Separate perspectives, not just headings.** Each pass produces compact
  working evidence, candidates, and coverage gaps. No finding quota; zero
  candidates is valid. Do not turn the working artifacts into mandatory
  standalone documents. Preserve important uncertainty without question caps.
- **Use independence where available.** Prefer fresh discovery contexts with
  the same brief and source access, without other passes' findings or a provisional verdict. During discovery,
  supervisor exchanges carry only neutral source facts and constraints; record
  exchanges and disclose any lost independence. Contexts
  must be able to inspect the reviewed source, not only a summary. Follow
  the host's delegation and safety protocol; no fixed model/vendor count.
  Without delegation, perform separate sequential passes and disclose the
  lack of independent review. Infrastructure failure is a limitation, not
  permission to silently substitute another execution mode.
- **Bound the work.** Stop discovery when applicable scoped contracts and
  boundaries have been traced, or the declared budget is exhausted. Report
  unfinished coverage and what would complete it. Do not repeat passes until
  they find something or until findings disappear. A design blocker may
  defer review of code pending redesign; record that gap, never mark it
  reviewed. Follow-ups finish when prior findings are dispositioned and the
  affected delta is covered; open findings may remain in the verdict.

## Evaluating this workflow

When tuning the skill, compare focused passes with repeated general reviews
on the same pinned changes under comparable budgets. Track unique verified
findings, false positives, missed contracts, latency, and cost. Remove a pass
experimentally to measure what it uniquely contributes. Use known and seeded
defects; distinguish missing grounding from failed discovery. More passes or
more candidates alone do not establish improvement.


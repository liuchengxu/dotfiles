---
name: adversarial-review
description: Use when asked to review code or a design at any granularity — a pull request, an architecture/design proposal, a module, a file, or a whole codebase/repo — "review this PR", "review this repo", "audit this module", "challenge this design", "is this architecture sound", "adversarial review"; especially anything touching trust boundaries, signing/key flows, consensus rules, upgrade/governance logic, protocol APIs, or crate/module boundaries being locked in. DO NOT use for quick working-diff hygiene (use code-review) or prose/document editing passes (use doc-review).
---

# Adversarial Review

## Overview

A finding earns "blocking" through evidence and a labeled impact, not vibes.
Two registers, one discipline:

- **Adversarial** — can it be broken? Trace what each actor controls.
- **Architectural** — can it evolve, and is it justified? Trace what each
  likely change costs, and whether the stated rationale supports the design.

Keep three judgments separate and in order:

1. **Evidence gate** — is this publishable as a finding at all?
2. **Severity × class** — what happens if it is real?
3. **Action** — must it block the decision under review?

Confidence never inflates severity; severity never substitutes for evidence.

## Workflow

1. **Scope.** Establish the review unit — a PR (`gh pr view/diff`; note the
   design decisions the author advertises for review), a design doc, or a
   code target (module, crate, repo — agree on boundaries if ambiguous) —
   and the decision gate: merge, release, design approval, or a named
   audit sign-off; if no gate is stated, use readiness of the reviewed
   scope as the gate. Identify the protected assets, trusted actors, state
   transitions, and invariants before hunting bugs.
2. **Ground.** Read the repo's design docs/README, repository instructions
   (including stated architecture principles and crate boundaries), the code
   under review, and search for consumers of changed or boundary-defining
   APIs. Verify
   external protocol claims against the repo's pinned version or an
   authoritative specification. For GitHub PRs, read existing review
   threads — extend them, don't duplicate.
3. **Trace.** Follow behavior through callers and across trust boundaries.
   Consistency between attacker-supplied fields is not validation; follow
   controlled data to the protected invariant. For diffs: unchanged code
   affected by the change (consumers, serializers, persistence, verifiers)
   matters more than diff-local style. For codebase audits: trace each
   externally-reachable input to what trusts it. Git blame / past-PR
   archaeology is conditional: only when intent, compatibility, or a
   surprising invariant is unclear.
4. **Generate candidates** using the applicable register(s); apply the
   architectural register when design or boundary quality is in scope, or
   when the change commits a public boundary.
   - *Adversarial:* per security mechanism ask who controls each input —
     can they fabricate it, reuse a stale one, or is a check missing
     entirely? (Prompts, not an exhaustive taxonomy.) Sweep lifecycle
     boundaries: bootstrap/first-use, upgrade, rotation, replay, reorg,
     rollback, retry, partial completion.
   - *Architectural:* name the likely-next requirements (new scheme,
     backend, variant — from the roadmap or the design's own claims) and
     check whether the shape absorbs each without disproportionate or
     boundary-breaking rework; check every boundary against the repo's
     stated principles; ask whether the stated rationale justifies this
     shape and whether a simpler shape would suffice. Flag both directions:
     a frozen shape that can't absorb a named planned change, and
     speculative abstraction with no current or named near-term consumer
     and no boundary rationale.
5. **Disprove.** Kill candidates; only survivors become findings.

   - **Assume false.** For each candidate, treat it as untrue and build the
     strongest case for why it can't happen. Search for the neutralizing
     guard with the same effort you spent generating the candidate:
     upstream validation, downstream rejection, consensus enforcement,
     caller preconditions, the PR's own tests — or, for architecture, an
     existing seam, concrete consumer, documented exception, or rationale
     that answers the concern.
   - **Merge symptoms.** If the candidate is a consequence rather than a
     root cause, combine it into the root cause finding. One root cause,
     one finding; symptoms are supporting evidence.
   - **Provenance-check (PRs).** Determine whether the change introduced or
     worsened the issue: only issues the PR introduces, exposes, worsens,
     depends on, or freezes enter its findings and verdict. Omit unrelated
     pre-existing issues or mention them as unnumbered non-verdict notes.
   - **Reproduce when high-impact.** Write a focused test for
     high-severity candidates when feasible. Candidates not executed are
     labeled Code-traced unless the violation is directly entailed by
     protocol or consensus rules.

   A finding that survives disproof is worth publishing; one you didn't try
   to kill is a guess.
6. **Gate and classify.** Apply the evidence gate in taxonomy.md, then
   assign severity, impact class, and action. Architecture findings need a
   named change scenario, a contradicted stated principle or rationale, or
   a concrete present cost — never taste. Candidates that fail the gate go
   under **Open Questions** and never affect the verdict.
7. **Challenge the verdict.** After gate-and-classify, treat every
   provisional finding as false one more time. Starting from its cited
   evidence, rebuild its trace or change scenario and recheck its
   prerequisites, neutralizing guards or seams, PR provenance, and action
   mapping. Demote or reclassify any finding whose case cannot be rebuilt
   without relying on its own conclusion. If the disprove attempt in step 5
   was rigorous, this pass should be thin — the residual bias or
   assumption the honest disprove missed. In multi-reviewer reviews, this
   pass must be performed by someone other than the finding's originator.
8. **Render.** Verdict first, findings labeled and ordered Blocking →
   Should-fix → Optional, then Critical → High → Medium → Low, grouped by
   root cause (not one finding per downstream symptom),
   one primary impact class each. State review limitations (unreviewed deps,
   assumed external behavior, parts of a large repo not covered — no silent
   coverage caps). Full format, taxonomy, and a rendered example: see
   taxonomy.md in this skill directory.

**Never post review content to GitHub without explicit user approval.**

## Blockchain and ZK code

When the review touches blockchain or zero-knowledge code, read and apply
`~/.claude/ZK_SECURITY_CHECKLIST.md` (circuit checklist and fix discipline),
and consult `~/.claude/BLOCKCHAIN_ATTACK_VECTORS.md` as an attack-vector
reference.

---
name: pre-publish-challenge-gate
description: "Claim discipline for drafted artifacts — calibrate material claims at write time, independent adversarial challenge before publishing, confirm round after fixes"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 1ba5f0f4-2d70-40f2-acfe-8e0fae095d6d
---

Claim discipline for any drafted artifact (proposal, compendium,
report, slides) that will leave the working set. Three layers; review
is the backstop, not the defense.

**Layer 0 — before drafting:** establish the authoritative sources and
note their later corrections; the calibrated wording lives there.

**Layer 1 — at write time:** classify each new assertion (sourced fact
/ inference / estimate / assumption / proposal). Source-check material
claims as they are written — anything touching the ask, conclusion,
scope, risk, cost, or evidence, and anything with numbers, dates,
comparisons, causality, broad quantifiers, or strong modality (`will`,
`must`, `cannot`, `only`, `all`). Never write a claim stronger than
its strongest current source (check later corrections, not first
match). Label new assumptions explicitly. Batch-check low-impact prose
at section boundaries; ledger load-bearing claims only for long-lived
artifacts.

**Layer 2 — before publishing:** run doc-review (editorial), then an
independent adversarial challenge of the assembled artifact — self
first, then Codex. Independence means independent of the drafting
path: give the challenger the artifact, sources, and decision gate,
not the drafting rationale before its initial assessment. Author
self-review cannot substitute (same compression path, same source
selection, same hidden premises). The artifact-level pass must also
test what no per-claim check sees: cross-section consistency, evidence
reconciliation, ask/body alignment, evidence placement.

**Layer 3 — after substantive fixes:** return the changed claims and
affected sections (not the whole doc) to the challenger for a confirm
round; repaired wording introduces new claims. Do not publish until
blocking findings are resolved or explicitly accepted in writing.

Record each challenge round in the project worklog. Proportionality: a
one-line status update skips the gate; anything carrying claims,
numbers, or asks gets it.

**Why:** in the TBV watchtower sessions (June 2026), every challenged
artifact produced blocking findings — registry v0.1 (14), slide-3
reduction claim (4 overclaims), compendium (11), proposal (10) — and
the dominant defect class was claims compressed from memory at write
time that resurrected overclaims already corrected in the corpus.
Layer 1 prevents that class; Layer 2 catches what survives.

**How to apply:** during drafting, calibrate as I write — don't defer
to review. When the user asks to share/publish/finalize, run Layer 2
before delivering without being asked. Related:
[[codex-consult-pattern]].

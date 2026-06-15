# Taxonomy, Evidence Gate, and Output Format

## Evidence gate

A candidate is publishable only if the reviewer can establish:

1. The violated invariant or architectural principle.
2. The exact implementation path or design boundary, cited as `path:line`
   where source exists.
3. For adversarial findings, the actor and controlled input/state. For
   architecture findings: the cited change scenario, contradicted
   principle/rationale, or concrete present cost, plus the affected
   boundary or shape.
4. A concrete failure witness: smallest input/state sequence and expected vs
   actual behavior; for architecture findings, the resulting rework,
   incompatibility, or unjustified complexity.
5. Evidence of disproof attempted: no existing guard/seam neutralizes it.

Missing any → **Open Questions** section; never affects the verdict.

## Confidence (evidence-based, not numeric)

- **Confirmed** — reproduced, test-demonstrated, or directly entailed by
  protocol/consensus rules.
- **Code-traced** — complete static code path and witness, or a complete
  source-grounded boundary/change trace for architecture findings; not
  executed.
- **Open question** — incomplete path, uncertain prerequisite, possible
  unseen guard. Not a finding; listed separately.

## Severity

Generic severity definitions, with Bitcoin/ZK-specific interpretations in
parentheses. For adversarial findings, severity is recoverability ×
attacker prerequisite:

- **Critical** — either integrity is violated with a prerequisite weaker
  than the required authorization threshold, or recovery requires a new
  trust anchor or protocol reset. (Honest members accept unauthorized state,
  threshold bypass, or irreversible authority/key loss, with prerequisite
  weaker than the required authorization threshold of malicious members;
  recovery needs a new trust anchor or protocol reset.)
- **High** — system-wide halt, irreversible material loss, or corrupted
  state needing software/config intervention; redoing the operation does
  not recover. (Protocol halt, irreversible BTC loss, authority-chain
  corruption; re-running the ceremony is insufficient.)

  Anchor: an authorization bypass reachable by an unprivileged or
  below-threshold actor is Critical even when its immediate damage
  otherwise resembles High (for example, irreversible loss caused by
  verifying against an attacker-supplied key). Use High only when no
  Critical condition applies.
- **Medium** — invalid output caught before damage, failed operation, or
  repeatable bounded DoS; trust roots intact, restart recovers. (Invalid
  tx rejected at/before consensus; ceremony restarts.)
- **Low** — localized inconvenience, cheap recovery, no invalid state
  accepted.

For **architecture** findings, severity is remediation cost × likelihood
or inevitability of the cited scenario; present costs count as certain.
Critical = incompatible migration across a committed wire/VK/storage/public
boundary; High = major cross-boundary rework or equivalent present cost;
Medium = contained rework; Low = local or cosmetic shape.

## Impact class (one primary; at most one secondary, only when it adds
information)

- **authorization** — integrity: threshold bypass, forged or stale state
  accepted, signing outside the validated workflow.
- **liveness** — canonical state can't be replayed/advanced without
  intervention.
- **funds** — irreversible value loss, fee bleed, economically unusable
  outputs.
- **wasted work** — invalid artifact caught at/before enforcement; work
  wasted and restarted.
- **disruption** — bounded delay, resource waste, or denial of service;
  system stays usable.
- **operator error** — config/API footgun likely to induce
  trusted-operator error. Secondary when a concrete
  authorization/liveness/funds outcome exists.
- **architecture** — extensibility/boundary/rationale: a named planned
  change the shape can't absorb, a boundary contradicting stated
  principles, a rationale that doesn't entail the design, or speculative
  abstraction with no current or named near-term consumer that imposes
  concrete present cost or contradicts a stated principle.

Defense-in-depth describes fix rationale; it is not an impact class and
does not raise severity.

## Action mapping

- **Blocking** — Confirmed/Code-traced violation that is Critical; or High
  authorization/funds/liveness; or any-severity defect crossing a boundary
  the reviewed change freezes or the reviewed decision would commit to
  (wire, signing, storage, public API) that would be unsafe or incompatible
  to repair later (the API-freeze exception — this is how a Medium
  disruption or an architecture finding blocks).
- **Should-fix** — all remaining High and Medium findings.
- **Optional** — Low findings, including minor hardening, defense-in-depth,
  and low-cost shape improvements.

Verdict derivation (source of truth; phrase to match the decision gate):
any Blocking finding → **Request changes / Not ready**. Otherwise any
Should-fix → **Approve with follow-ups / Ready with follow-ups**.
Otherwise → **Approve / Ready**.

## Output template

Finding IDs are `F-NN` (Finding), open questions `Q-NN` (Question),
numbered in rendered order on the first round and stable across later
rounds of the same review (new findings take fresh numbers; fixed ones
are not reused).

```markdown
## Verdict
**<verdict matching the decision gate>**
Blocking: IDs or None. Should-fix: IDs or None. Optional: IDs or None.
One sentence naming the dominant risk, or stating that no finding
survived the gate.

### [F-01] Short failure statement
`<Severity> · <authorization|liveness|funds|wasted work|disruption|operator error|architecture> (+<secondary impact>) · <Action> · <Confirmed|Code-traced>`
Use exactly one trace form:
**Trace:** <actor> controls <input> → <component> trusts it → <failure>.
**Architecture trace:** <scenario / principle / rationale evidence> →
  <boundary or shape> → <rework, incompatibility, or present cost>.
**Impact:** concrete consequence + recovery/remediation required.
**Disproof:** <strongest guard, seam, or counterargument checked and why
  the cited evidence does not neutralize the finding>. (Blocking only —
  required there, omitted for Should-fix/Optional.)
**Fix:** specific invariant, boundary/design change, simplification, or
  validation source.
**Evidence:** path:line, design/spec section, or PR/thread link.
**Provenance:** <reviewer/thread; independently verified or inherited>
  (multi-reviewer reviews only)

## Open Questions
- [Q-01] <incomplete candidate + what evidence would settle it>

## Limitations
- <unreviewed deps, assumed behavior, uncovered areas>
```

## Rendered example

```markdown
### [F-05] Proof verification is not bound to replayed state
`High · authorization · Blocking · Code-traced`
**Trace:** proposal supplier controls proof/public_values →
ProofVerifier::verify_proof checks only proof + VK hash → a valid proof
for an older chain state passes alongside links extended beyond it.
**Impact:** honest members sign an upgrade whose claimed readiness was
never proved; prerequisite is one malicious proposer. Once confirmed,
recovery requires another authorized upgrade.
**Disproof:** Checked proposal construction and downstream link validation;
neither supplies or compares the replay-derived authorization statement.
**Fix:** verify_proof(proof, vk_hash, expected: &Authorization) with the
expected statement derived from replay; compare every field.
**Evidence:** validation.rs:45-51; proposal.rs:45-52.
```

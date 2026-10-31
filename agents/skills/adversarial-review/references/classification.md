# Taxonomy, Evidence Gate, and Output Format

## Evidence gate

A candidate is publishable only if the reviewer can establish:

1. The violated invariant or architectural principle, stated as a specific
   condition: under what preconditions, which state/input/output must satisfy
   which relation. Cite its authority (contract, protocol, requirement, or
   justified safety property); implementation behavior alone is not its authority.
   “Improve safety” or “missing validation” is not an invariant. Label a derived
   property and its supporting premises; if authority is unresolved, keep the
   candidate as a question rather than inventing a requirement.
   For code-quality-only findings, identify the applicable documented coding
   rule, its scope and exceptions, and the precise deviation. Label the item as
   a policy deviation; do not invent a runtime invariant or harm to justify it.
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

Missing any → an open question under **Unverified checks and next actions**;
never a defect-based blocker.
Review completeness is assessed separately below.

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

An enforcement point is recorded per affected invariant and per fix ([workflow](workflow.md));
on its own it does not change severity, impact class, or action.

Verdict derivation (source of truth; adapt "merge" to the decision gate):
1. Any non-waived Blocking finding → **Not ready to merge — fixes required**.
2. Otherwise, unresolved intent that prevents judging scope or correctness →
   **Not ready to merge — intended behavior needs clarification**.
3. Otherwise, missing evidence that prevents the decision under Review
   completeness below → **Not ready to merge — verification incomplete**.
4. Otherwise, any Should-fix → **Ready to merge with follow-ups**.
5. Otherwise → **Ready to merge**.

When several conditions apply, use the first headline and list all outstanding
fixes, intent questions, and required verification separately under next steps.

Use a plain-language headline followed by **Why**. Put next steps in the
**Unverified checks and next actions** section of the result contract.
Distinguish established defects, unresolved intent, and incomplete verification. Explain what
must change before approval; do not use "Sign-off withheld" as the headline.
For non-merge reviews, name the actual decision, such as release or design
approval, rather than implying a pull request exists.

**Review completeness.** The mapping above assumes sufficient coverage for
the decision gate established in Scope. Withhold sign-off only when missing
evidence prevents that decision: cite a requirement from the gate or
applicable policy, or explain concretely why an unreviewed contract is
necessary to establish a scoped asset's safety or a required invariant.
Calling a contract "critical" is not sufficient. Name the missing evidence
and work needed to complete the review. Derive the headline from the ordered
mapping above; a higher-precedence defect or intent question does not erase
missing verification. List that gap separately from findings. Do not invent
a defect or severity from uncertainty.
Ordinary open questions do not trigger this rule merely by existing, and
partial coverage must never be presented as whole-scope approval.

## Resolution states (follow-up rounds)

In a follow-up round every prior finding carries a `Status` with cited
resolution evidence; an author's assertion alone never advances status.

These describe *remediation at the current revision*, and apply to
findings this review raised. They are a different axis from the
**Validity** of an externally-filed report at the revision it was filed
against; an external item re-examined after remediation can carry both.
Do not read `Partially resolved` and `Partially correct` as synonyms.

- **Open** — the violation remains, or a claimed fix was not verified.
- **Partially resolved** — the root cause remains with reduced scope or
  impact; keep the ID and recompute confidence, severity, impact class,
  action, trace, and fix.
- **Resolved** — reviewer-verified evidence shows the violation no
  longer holds.
- **Withdrawn** — later evidence disproves the finding; it was not
  fixed.

Open and Partially resolved enter the current verdict; Resolved and
Withdrawn do not. A regression reopens its original ID.

Deferral to a tracker does not change status: keep the finding Open
and cite the tracker on its `Status` line ("Open — deferred to #123").
A deferred Should-fix is handled by **Ready to merge with follow-ups**.
Deferral alone never clears a Blocking finding: evidence may
reclassify it; otherwise only the decision-gate owner's explicit risk
acceptance, recorded in a durable source and cited by the verdict,
waives its effect for that gate. The finding stays Open and listed as
Blocking; derive the verdict from the findings not risk-accepted for
the gate, then append `accepted risk: F-NN (<link>)`.


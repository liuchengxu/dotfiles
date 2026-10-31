## Output template

Finding IDs are `F-NN` (Finding), open questions `Q-NN` (Question),
numbered in rendered order on the first round. Triaged external
items are `T-NN`; scopes are defined under "Adjudicating
externally-filed findings". An ID remains assigned
to its original finding across every state and later round; genuinely
new findings take fresh numbers.

```markdown
## Verdict
**<plain-language verdict matching the decision gate>**
**Why:** <established defect, unresolved intent, or missing verification;
  distinguish them and apply the ordered verdict mapping>.
Blocking: IDs or None. Should-fix: IDs or None. Optional: IDs or None.

**PR intent** (PR reviews only.)
**Intent:** <stated problem/value and intended outcome>.
**Source:** <authoritative description/requirement; retrieval time>.
**Assessment:** <clear and aligned | clarification needed | implementation mismatch>
  — <reason, unresolved question, or verification limitation>.

## Findings

### [F-01] Short failure statement
`<Severity> · <Action> · <Confirmed|Code-traced>`
**Invariant:** <precise required condition; compact authority citation>.
For a code-quality-only finding, use **Rule:** <applicable project rule and citation>.
**Violation:** <smallest failing situation; pinned source location>.
**Impact:** <consequence plus material prerequisite or limit>.
**Suggestion:** <smallest sufficient repair or required owner decision>.
Follow-ups preserve IDs and show changed status with a compact evidence citation.

## Coverage
<Reviewed scope and material gaps in a few lines. Distinguish static inspection
from execution. Identify affected layers/final tip and any unread contract that
prevents the named decision. Full unit/aspect table stays in the evidence record.>

## Unverified checks and next actions
- <check not run or evidence unavailable; decision it affects; completion criterion>.
- [Q-01] <unresolved candidate or intent question; evidence/decision needed>.
- <specific action for an established finding, by ID; do not repeat its fix>.
If no actions remain, write “None.” Label proposed checks separately from checks run.

**Source/check status:** <reviewed pins; static versus executed checks>.
Details available by finding ID. (Local discussion only; externally posted
reviews include the supporting evidence under the publication rule in result.md.)
```

## Evidence record (retained locally; included with external reviews)

Prepare this before the concise report. Include the full provenance required
by result.md. Show it on request in local discussion; include it with an
authorized external review. It contains evidence, not private reasoning.

```markdown
### Evidence for [F-01]
`<Severity> · <authorization|liveness|funds|wasted work|disruption|operator error|architecture> (+<secondary impact>) · <Action> · <Confirmed|Code-traced>`
**Status:** <Open|Partially resolved|Resolved|Withdrawn> — resolution
  evidence. (Follow-up rounds only.)
Use exactly one trace form:
**Trace:** <actor> controls <input> → <component> trusts it → <failure>.
**Architecture trace:** <scenario / principle / rationale evidence> →
  <boundary or shape> → <rework, incompatibility, or present cost>.
**Invariant and authority:** precise required condition, preconditions, and supporting contract.
**Witness:** smallest expected-versus-actual failure scenario.
**Impact:** established consequence; unknown recovery stays unknown.
**Disproof:** <strongest guard, seam, or counterargument checked and why
  the cited evidence does not neutralize the finding>. Required for every
  established finding; kept in this evidence record, not the default summary.
**Suggestion:** smallest recommended change, target location/boundary, and invariant
  restored; or the decision/evidence needed to choose a safe fix.
**Verification:** regression/acceptance check, expected result, and behavior
  to preserve; label proposed versus executed checks.
**Evidence:** path:line, design/spec section, or PR/thread link.
**Provenance:** <reviewer/thread; independently verified or inherited>
  (multi-reviewer reviews only)

## Coverage
| Unit | Aspects | Status | Evidence / gap |
|---|---|---|---|
| <PR layer, module, contract, or design boundary> | <applicable aspect names> | <static review / executed check / partial / not reviewed / not applicable> | <trace or check; gap or reason> |
| <final integration, for a stack> | <applicable aspect names> | <status> | <cross-layer evidence or gap> |

## Provenance
<Recorded source pins, input hashes, runtime receipts, and submitted prompts.>
```

## Rendered example

Synthetic example, not a finding about the current repository:

```markdown
### [F-07] Terminal tasks restart
`Medium · Should-fix · Code-traced`
**Invariant:** A terminal task must never become runnable again (task-state contract).
**Violation:** The retry scheduler accepts terminal tasks at `scheduler.rs:40`.
**Impact:** Repeated work after completion; recovery requirements are unknown.
**Suggestion:** Reject terminal states before scheduling.
```

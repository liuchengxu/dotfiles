# Architecture / design

Map responsibilities, ownership, and dependency
direction against stated principles and real consumers. For a substantial
design, form a brief simpler-design hypothesis before following the
implementation's rationale. Test it against a named change scenario or
concrete present cost; discard alternatives based only on taste.

## Check for missing alternatives

For an ADR or design choice, make a focused check of relevant upstream or
reference systems, applicable standards, and existing project approaches.
Do not use the document's alternatives table as the search boundary. Check
both representation choices and responsibility placement: who constructs,
validates, stores, and distributes the result. Consider removing an exchange,
layer, or duplicate calculation, as well as changing its format.
Include no change where useful. Compare credible options against the same
requirements. Separate required outcomes from mechanisms chosen by the proposal;
do not reject an alternative merely because it removes a proposed mechanism.
Distinguish technical limits from implementation cost and timing.
Scale investigation to the decision's risk and reversibility. Stop when further
investigation is unlikely to change the choice. Disclose material uncertainty
rather than claim completeness.

## ADR decision coverage

Before the verdict, complete these checks against the reviewed revision.
Record evidence or a specific gap; a checked box or a document read is not evidence.

| Check | Required result |
| --- | --- |
| Alternatives | Identify the credible options, including any absent from the document. Record the requirement or concrete cost that rejects each option. State the search boundary; do not claim exhaustion. |
| Glossary consistency | Read the owning glossary and specifications. Compare the meanings of decision-critical terms, including identities, versions, states, and encodings. Distinguish an existing term from a proposed change. Name conflicting definitions and the document that must change. |
| Implications | Trace each new dependency or obligation through startup, normal use, outage, restart, upgrade, rollback, and retirement where applicable. Include consumers, historical data, and recovery from incorrect durable or immutable state. Name the owner and acceptance evidence for unresolved consequences. |
| Simpler design | Compare the smallest sufficient design with the proposal. State which exchanges, state, dependencies, or responsibilities it removes and which required behavior it loses. Record why the proposal remains preferable, or retain the alternative as an open decision. |
| Invariant changes | Compare required behavior before and after the proposal. Classify each material invariant as new, preserved, strengthened, weakened, or removed. Cite its authority, preconditions, owner, and current/proposed enforcement point. Separate a new invariant from new enforcement of an existing obligation. |

Keep design completeness separate from implementation readiness. A design may
defer implementation details, but it must identify decisions that can change
the selected architecture or make recovery incompatible. Ordinary follow-up
work is not automatically a blocker. Apply the shared evidence and verdict
rules; unsupported concerns remain questions.

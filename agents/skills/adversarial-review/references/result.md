## Deliverable contract

### Concise default; completed evidence on request

The default user-facing report shows each finding's core idea, not its full
trace. Aim for roughly 40–80 words per finding; this is a guide, not a cap on
material facts. Use a stable ID, severity, action, and confidence, then:

- **Invariant:** the precise required condition, with a compact authority citation.
  For a code-quality-only finding, use **Rule** and cite the applicable project
  guideline; do not invent a behavioral invariant or safety impact.
- **Violation:** the smallest failing situation and exact source location.
- **Impact:** the concrete consequence, including material prerequisites or limits.
- **Suggestion:** the smallest sufficient repair, or the decision needed to choose it.

Complete and preserve the supporting evidence before presenting that summary.
Keep a separate evidence record keyed by the same finding IDs: invariant and
source authority, expected versus actual witness, decisive source trace,
strongest guard/counterevidence checked and its disposition, fix constraints,
current and proposed enforcement points, and proposed/executed verification. This is a factual audit record, not private
chain-of-thought or a stream of deliberation. Summaries must be supported by it.

For local discussion, show traces, code excerpts, detailed verification, or the
evidence record only when the user asks for details or confirms expansion of
specific findings. External publication follows the rule below. An
explicit request for a full audit/report already authorizes that detail. Do not
pause investigation or request approval per finding; confirmation controls
presentation, not whether disproof or verification occurs. Do not rerun discovery
just to reveal already-recorded evidence. Recheck if the source has changed.

Always show the decision, material uncertainty, finding confidence, affected
scope, and decision-relevant coverage gaps. Do not hide a prerequisite that
changes severity, impact, or the decision in the evidence record. Unknown checks
remain unknown. If detail was not retained, say so; do not reconstruct it as
recorded evidence. Explicit no-file requests override saving; disclose any
resulting limit on evidence retention.

### External publication carries its evidence

When the user authorizes posting a review externally, include the full supporting
factual evidence for every published finding in that publication. Lead with the
concise summary, then use collapsed per-finding details or a durable linked
appendix available to the same audience. Local paths and “ask me for the trace”
are not sufficient external evidence. No extra confirmation is needed merely
to include this supporting evidence within the already-authorized audience and
destination; authorization to discuss locally is not authorization to post.

Publish invariant/rule authority, source pins, failing witness, decisive source
trace, counterevidence/disproof disposition, proposed versus executed checks,
and material coverage limits. Keep IDs aligned with the summary. Check appendix
access and links before posting; if an accessible attachment is unavailable,
include the evidence in the review body. Do not silently publish a summary whose
support remains local. After posting, verify and record the review/appendix URLs.

Respect disclosure restrictions. Do not publish credentials, private reasoning,
or exploit details outside the authorized audience. If required evidence cannot
be disclosed there, state the restriction and use an authorized restricted
channel; do not claim the public review contains complete evidence. A broader
publication audience or new destination still needs authorization. Existing
approval requirements for posting PR reviews remain in force.

Before delivery, the coordinator checks the summary against the completed
evidence record and [verdict mapping](classification.md#action-mapping):

- Every finding has a specific invariant/authority and an exact source location
  in the visible summary, not only in the retained evidence.
- One verdict covers the named scope. A Should-fix alone means ready with
  follow-ups; it must not become “not ready” without another mapped reason.
  A required coverage gap remains visible and can prevent the whole-scope
  decision even when another unit has only a Should-fix.
- Confidence, material prerequisites, and actual execution status agree with
  the evidence. Compression must not strengthen a claim or invent recovery.

Correct discrepancies before presenting the summary. This is a coordinator
check, not evidence that a model always follows the requested format.

### Final ADR review checklist

Apply [ADR decision coverage](architecture.md#adr-decision-coverage) before
delivery. Mark an item complete only when its result has supporting evidence.
Keep supporting comparisons in the evidence record. The final coverage summary
states the result or explicit gap for each item.

- [ ] **Alternatives:** Compare credible options beyond those listed in the ADR; state the search boundary.
- [ ] **Glossary:** Check decision-critical terms against their authoritative definitions; identify changed meanings.
- [ ] **Implications:** Trace affected consumers and lifecycle failures; identify unresolved owners and acceptance evidence.
- [ ] **Simpler design:** Compare the smallest sufficient design; explain the required behavior or concrete benefit that justifies added complexity.
- [ ] **Invariants:** Distinguish new, preserved, strengthened, weakened, and removed invariants; separate new enforcement from new obligations.
- [ ] **Verdict:** Show unchecked areas and unresolved decisions; distinguish design approval from implementation, merge, and rollout readiness.

An empty findings list does not establish design completeness.

### Report order

Use this reading order for substantive reviews:

1. **Verdict:** one decision for the named gate, followed by its decisive reason.
2. **Findings:** established actionable findings, ordered Blocking → Should-fix
   → Optional, then highest severity first within each action. A lower-severity
   Blocking finding must precede a higher-severity non-blocking finding. Preserve
   the classification rules and stable IDs; format does not change action mapping.
3. **Coverage:** a short summary of reviewed scope and material gaps. Keep the
   complete unit/aspect table in the evidence record; show it when requested.
4. **Unverified checks and next actions:** what remains, why it matters, and the
   evidence or decision that would close it. Put unresolved questions here.

Omit non-defect observations by default unless they change a reader decision
or were requested. Keep detailed provenance in the evidence record; show a
compact source pin and review/check status in the summary. For Findings, write “None established” when
empty; never infer readiness from that alone. Avoid a second executive summary.

Consolidate discovery passes into one report. Deduplicate by root cause, not
shared vocabulary or fix location alone. Preserve distinct failure mechanisms
and stable prior IDs. Keep resolved/withdrawn findings and external-thread
replies in a follow-up appendix when needed; they do not count as open findings.

Derive the verdict from the ordered mapping in [classification](classification.md#action-mapping).
Name the decision gate, so source-review readiness cannot be mistaken for merge
or release approval. Do not replace that decision with “conditionally ready” or
“looks sound.” Put evidence gaps under next actions rather than inventing defects.

The evidence record's coverage table uses `Unit | Aspects | Status | Evidence / gap`. For a stack,
include every incremental layer and the final integration. For other scopes,
use the relevant module, contract, or design boundary. Group aspects only when
status and evidence are shared; do not expand an empty unit-by-aspect grid.
Use **static review**, **executed check**, **partial**, **not reviewed**, or
**not applicable** with a reason. Name scoped units/aspects left unreviewed.
A heading or a tool read is not proof of coverage; cite the traced contract or
check. Static inspection and executed checks remain distinct.

Keep defects, incomplete candidates, and non-defect observations separate.
A supported Low/Optional finding still belongs in Findings under the existing
classification rules. A fact without an established violated requirement is an
observation, not a defect. Missing evidence is a next action; if it prevents the
named decision, the verdict must reflect that gap. Do not turn an untraced
caller into a finding that a guard is absent.

For a PR, summarize the **PR intent** assessment within the verdict section.
Keep its full support in the evidence record: stated
problem/value and outcome, authoritative source and retrieval time, and
whether description, diff, and verification align. Use **clear and aligned**,
**clarification needed**, or **implementation mismatch**, with a concrete
reason. "Clear and aligned" describes intent alignment, not proof of every
claimed guarantee; report pending verification separately. Use **clarification
needed** only when unresolved intent prevents judging scope or correctness;
a thin description whose intent is established elsewhere is **clear and aligned**
with a description-correction recommendation. **Implementation mismatch** is
assessed through the ordinary finding/action gates, not an automatic blocker.
Name unresolved author questions and deferred coverage. Keep inferred intent labeled as an
unconfirmed reading, never an established requirement. Scope/requirement
findings cite the intent source or other invariant they are measured against.

For each established open finding, include an actionable fix in the summary and
complete **Suggestion** and **Verification** entries in the evidence record. Do not invent an actor, recovery requirement, or other fact
to fill a field. State what is unknown; keep stipulated example facts distinct
from observed source or execution evidence. Recommend the smallest sufficient change, identify its
location or owning boundary, explain which invariant it restores, and record its
enforcement point on the ladder defined in [workflow](workflow.md) — the current
point and the rung the fix moves it to, with the reason when it lands later.
Name a regression or acceptance check, its expected result, and relevant
valid behavior that must remain intact. For design/prose findings, this
can be a concrete scenario or document consistency check rather than a test.
Use a short patch or replacement wording only when it makes the fix clearer;
label untested suggestions and distinguish proposed checks from executed ones.
Check the recommendation against the root cause and affected compatibility
contracts. If a safe fix needs an owner decision or more evidence, state that
and the constraint to satisfy rather than inventing a patch or suppressing
the finding. A review recommendation does not authorize applying changes.

For each item that has its own external thread to answer — a filed
finding, a PR review thread, a tracker issue — preserve its filed vs
adjudicated severity, disposition, and a **reply draft** in the evidence record.
Show the draft when the user asks for a reply or detailed triage output. Add no reply draft for an item with no such thread.

Reply drafts:

- State the position directly. Do not recap the finding or quote the
  filer's wording back at them.
- Lead with the disposition and any severity change.
- Concede what is right before correcting what is not.
- Cite evidence with links pinned to the reviewed revision.
- **Never post it.** Show the draft; the user posts.
- If publishing the text before a fix lands would itself disclose an
  exploitable path, say so and mark the draft *post after the fix merges*.

For each completed review, save a concise canonical Markdown report and a
separate evidence record under `notes-tiers`, outside tracked source paths.
Keep their source pins and finding IDs aligned. The evidence record must meet
`doc-closure`; do not treat a shortened summary as permission to discard support.
Render HTML with `md2html` only when requested. A requested summary view remains
concise; a requested detailed view preserves the full evidence and limitations.
This grants no publication authority. Explicit chat-only/no-file requests
override saving. Progress updates need no report.

In local chat, give the verdict, core findings, material gaps and next actions. Offer
“Details available by finding ID” once; do not append detailed traces, source
excerpts, evidence links, or expandable trace blocks by default. A link to the
concise report is sufficient. Keep retained details available for a later request.

### Review provenance

The evidence record carries full provenance; its summary identifies the reviewed
source and actual check status. Record:

- Review date, repository/PR, exact base/head pins, local dirty state, and
  skill revision or content hashes. For mutable descriptions/intent sources,
  record retrieval time and the relevant inspected text or an authorized
  snapshot reference; do not imply the code pin freezes those sources. For
  restricted sources, use a safe reference rather than copying their text.
- Parent/synthesizer model and one row per pass: role, provider/model,
  reasoning effort, context independence, run ID, completion state,
  start/end times, and elapsed time.
- Overall wall-clock interval with its boundary defined (for example,
  workflow launch through final adjudication). Parallel pass durations are
  not additive wall time. Distinguish later parent synthesis/rendering.
- Reported token usage and cost, with cache categories and accounting scope
  where available. Missing usage is not zero; provider-reported cost is not
  necessarily a bill or subscription charge.
- Checks executed versus static inspection, tool/runtime failures,
  incomplete or substituted passes, and evidence-access limitations.

Use runtime receipts and recorded usage, not model self-estimates. Mark absent
fields **not recorded**; distinguish configured effort from observed runtime
metadata. Never infer model identity from the agent name or equate more
compute with stronger evidence. Keep credentials, sensitive logs, and
unauthorized restricted-source text out of the report.

#### Review prompts

Include the actual submitted review task prompt for each pass in evidence-record provenance,
collapsed by default in both Markdown and HTML. Include material follow-up or
steering prompts in order, and distinguish failed/retried attempts and prompts
rejected before model execution. Label each block with its pass, model, and run
ID when available. Identical prompts may appear once with all associated runs
listed; do not replace the prompt with a summary.

Use recorded dispatch payloads, not a reconstruction or a claim to expose the
model's full hidden/system context. If unavailable, say **not recorded**. When a
prompt references a packet or file instead of embedding its contents, preserve
the submitted prompt and identify the input snapshot separately; do not silently
inline it as though it were sent in the prompt. Apply the report's disclosure
boundary to prompts and embedded context too: redact credentials, exploit
inputs, and restricted text not authorized for the report's audience/storage.
Mark omissions explicitly and label the block **redacted**, rather than calling
it verbatim. Collapsing text is not access control.

Use a `<details>` block without `open`; render the prompt as escaped literal
text, never executable HTML. For example:

````markdown
<details>
<summary>Review prompt — Contract & verification · model · run ID</summary>

```text
[Recorded submitted task prompt; explicit redaction markers where required.]
```

</details>
````

Choose a code fence longer than any fence in the recorded prompt, so embedded
Markdown cannot break out of the literal block. The HTML view preserves the
same disclosure labels and collapsed state.



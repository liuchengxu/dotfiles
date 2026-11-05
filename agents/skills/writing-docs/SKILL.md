---
name: writing-docs
description: >
  Draft, update, or review a document that someone other than the author will read: design doc or ADR, proposal, runbook, spec or security model, README, API reference, incident report, summary, or shared note. Covers meaning, terminology, cold-reader closure, and per-type essentials. For GitHub issues, PR bodies, or review replies, use writing-issues-and-prs; its closure check uses the Stand alone section here. Not for narrow copyedits.
---

# Writing docs

Write for a reader who has the document and its links, but was never in the
session. A repository's own documentation rules and templates come first; this
skill fills in where they say nothing. For a long formal document, such as a
full RFC or an audit report, follow the requester's template or the genre's
house style.

## Every document

- **Reader and purpose.** Identify the intended reader and what the document
  must help them understand, do, or decide. Lead with the content they need
  first.
- **Smallest artifact.** Extend the existing home before writing a new guide,
  summary, or catalog: an update, then a short message, then a new document.
- **Compression keeps meaning.** Rewording keeps hedges, conditions, scope,
  attribution, and requirement force (optional, recommended, required,
  prohibited). In a document that uses RFC 2119 keywords, never change one as
  a style edit. Do not present a proposal as current behavior.
- **Terminology.** Check the meaning of changed key terms against the
  glossary, owning specs, and established usage; search the repository for
  conflicting uses. Keep current, proposed, and historical uses apart. Never
  change a glossary to make a draft agree; report the conflict.
- **Verify against source.** Check commands, flags, configuration keys, paths,
  links, and examples against the repository or the source they describe. Mark
  anything you could not verify.
- **One authoritative home.** Keep each maintained requirement in one place;
  link to it from summaries and guides.

On an update, fix the touched section and the references that depend on it,
within the requested scope. Report other affected material; do not turn a
narrow edit into a whole-document pass unless asked.

## Stand alone

A session hides state: prior findings, local files, renames, tentative terms.
Move that state into the document.

- Define finding IDs, `#N` references, bare SHAs, session shorthand, and
  codenames at first use, link them, or remove them. Search for them before
  delivery. No "link later" placeholders.
- Tag introduced or renamed terms (`proposed`, `renamed from <old>`) wherever
  a reader could take them for the codebase's current vocabulary.
- Chat and session links are provenance only, never required context.

A document that references code, or that leaves the session (shared HTML,
review notes, runbooks, hand-offs), must also carry its provenance:

- Reviews, audits, runbooks, and evidence documents carry the source commit
  SHA or version near the top.
- Replace each bare `path:line` with an immutable permalink in the host's
  format (on GitHub, `/blob/<sha>/path#Ln`). A long or multi-repository
  document may resolve them through a `Source pins` section instead (remote,
  branch, pushed SHA, dirty status); keep inline permalinks for line-sensitive
  findings and for excerpts likely to be copied without that section.
- Never present an unpushed or dirty SHA as immutable evidence.

## Plain words

- Keep code identifiers and technical terms the intended reader already knows:
  `tonic::Status`, beacon state, typed errors, acceptance testing.
- Expand session shorthand that hides behavior: name the actor, action, and
  relevant trigger or limit. "Durable retry" → "a retry loop that persists
  across restarts." Do not invent missing details; flag them.
- Anchor unfamiliar necessary terms at first use with their practical meaning:
  "vaultd stops retrying; recovery waits for an operator (quarantined
  state)." Then reuse the term; repeat the anchor only in independently read
  excerpts.
- Use one name per concept; do not use that name for another meaning nearby.
- Before delivery, reread behavior and state descriptions without session
  context. Check for hidden mechanisms, unexplained states, ambiguous names,
  and session shorthand where source terminology is clearer. Fix each or
  flag missing facts.
- In reviews, apply this pass; report concrete reader effects in existing
  findings.

## By type

Combine entries when a document spans types. Apply the summary checks to any
document built from other sources.

- **Design doc or ADR.** The problem in a few bullets: what changed, what
  cannot change, what must still hold. Then the approach or decision, and its
  consequences. Describe the final state, not the path that got there. Compare
  credible alternatives on the same criteria. Map each invariant to its
  existing or proposed enforcement and test. State trust assumptions.
- **Proposal or decision request.** Lead with the decider, the ask, its scope,
  and the deadline, then the evidence for the decision before implementation
  detail. One approval boundary per independently rejectable ask. Compare the
  status quo and alternatives on the same criteria. Bound the resources and
  commitments approval authorizes; state what it does not authorize and
  whether it can be reversed. Name material risks with owners. For a pilot,
  name its owner, duration, success and stop criteria, and what happens at
  expiry.
- **Runbook or operation guide.** Prerequisites, then the commands inline.
  After each state-changing or failure-prone step, the expected result or
  check. Name what can be retried, what must not be rerun, and where to
  resume. Give each destructive or irreversible step its preconditions and a
  confirmation point. State the success criterion before cleanup. Plan and
  record evidence by the "Operational evidence" rule; name evidence that
  cannot be recovered as a gap. A runbook derived from a spec flags each
  skipped, reordered, or substituted step; it may fill a gap in the spec, but
  must not silently replace a spec decision.
- **Spec or security model.** Observable behavior, inputs, outputs, failure
  cases, and requirement force. For security claims, name the protected
  assets, actors and attacker capabilities, attacker-controlled inputs, trust
  boundaries, assumptions, guarantees, and excluded threats. Describe what the
  consumer needs, not what the current implementation happens to do.
- **README or onboarding.** What it is, one minimal path to start, and where
  to go next. Link out for depth.
- **API reference.** The signature, inputs, outputs, error behavior, and edge
  cases, with examples that can be copied and run. The contract, not the
  implementation.
- **Incident report.** Impact, timeline, cause, mitigation, and corrective
  actions. Frame causes as system gaps, not individual blame. Give each action
  an owner and a due date.
- **Summary of other sources.** Check each material claim against its source,
  including later corrections. Do not strengthen the sources: no lost
  qualifiers, broader scope, or stronger causality. Label your own additions,
  assumptions, and estimates as yours. Totals, units, and time windows must
  reconcile. Keep a quoted historical record verbatim behind a dated banner.

## Reviewing a document

Lead with one verdict: Ready, Fix first, or Rework. Then one entry per finding,
with an ID (`D-01`) that stays stable across rounds:

- **Passage:** the quoted text and where it is.
- **Reader effect:** what goes wrong for the reader.
- **Suggestion:** the smallest change.
- **Action:** Blocking or Optional.

An editorial review does not certify technical correctness; technical
soundness belongs to `adversarial-review` or the repository's review skill.

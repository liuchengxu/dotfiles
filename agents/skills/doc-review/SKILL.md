---
name: doc-review
description: >
  Review a written document (markdown, design doc, runbook, README, etc.)
  for redundancy, inconsistency, clarity, and density. Apply the general
  rules first, then the type-specific addendum for the doc's genre.
  TRIGGER when: user asks to "review", "audit", "clean up", "tighten",
  "compress", or "check" a markdown / documentation file (including a
  proposal, pitch, or decision memo); user pastes a doc and asks for an
  editorial pass; user asks if a specific reviewer comment is
  "addressed"; about to DRAFT a design doc, proposal, planning doc,
  or RFC (apply Part C's authoring defaults, then self-review).
  DO NOT TRIGGER when: user wants substantive technical correctness
  review of a design, algorithm, or protocol (use adversarial-review),
  or review of a code diff or implementation (use code-review); writing
  a GitHub issue or PR body (use writing-issues-and-prs). Design docs
  and proposals may still trigger for structure, readability, and
  claim/ask calibration.
---

# Doc Review Skill

Two-tier lens. **Always apply Part A.** Then layer on **Part B** for the
specific doc type. When *drafting* a new doc rather than reviewing one,
start from **Part C**, then self-review the draft with Parts A and B
before presenting it.

## Part A — General rules (every doc)

### 0. Identify reader, purpose, and next action

Before reviewing prose, name the intended reader and the intended use
or next action they should be able to take after reading. A doc that is clear for auditors
may be too slow for operators; a doc that is concise for maintainers
may be underspecified for new contributors.

Apply the cold-reader test before compression: the reader has the doc
and linked sources, not the session. Expand session shorthand, define
unfamiliar terms near first use, and state the current source/state the
prose depends on.

### 1. One source of truth per fact

If a fact appears in the preamble, §1, and §2 intro — cut two. Keep
the fact in the narrowest authoritative section that owns it;
elsewhere, delete it or replace it with a cross-reference when readers
need navigation. Each restatement erodes signal and creates drift risk
when facts change.

### 2. No re-explanation of self-explanatory output

If a code block prints three labelled fields, do not follow with a
bullet list saying "field1 means X, field2 means Y". The reader can
read.

### 3. No filler meta-references

Drop "as stated above", "i.e. the goal from the top", and local
cross-references that only compensate for scattered structure. Inside
one doc, the reader usually has the context. Filler meta-refs read like
footnotes from an academic paper.

Keep only cross-references that prevent duplication or send the reader
to a different artifact that is genuinely authoritative.

### 4. Section intros are one sentence

A multi-paragraph intro almost always splits into three different
ideas. Move them into the section body or cut the redundant ones.

### 5. Consistency: terminology, casing, naming

- Reuse codebase / domain vocabulary (don't invent "launch-time" if
  the codebase says "genesis"). Grep before naming.
- One name per concept across the doc. If you rename a CLI command
  partway through, sweep every reference — never half-renamed.
- Casing convention for filenames / headers stays uniform within
  the doc's directory.

### 6. Compression preserves semantic force

Clarity, simplification, compression, and synthesis must not silently
change a claim or requirement.

- **Calibrated qualifiers**: preserve language that encodes
  uncertainty, scope, conditions, attribution, causality, or
  verification status ("I have not verified X", "probably, because
  Y"). Delete a hedge only when its removal changes neither the
  proposition nor the reader's warranted confidence.
- **Requirement force**: preserve distinctions among optional,
  recommended, required, and prohibited behavior. When a document
  adopts BCP 14 (RFC 2119/8174), never add, remove, recase, or
  substitute a normative keyword as an editorial change; flag an
  intended requirement change for substantive review.
- **Deletion candidates**: empty hedges ("you may want to", "if
  useful"), self-referential commentary ("this section discusses X"
  before discussing X), and a goal restated in the section that
  fulfills it. Do not assume discretion language is empty merely
  because it is indirect.

### 7. Simpler language

Prefer the common word: "use" over "utilize", "before" over "prior
to", "now" over "at this point in time". Jargon only when it's the
*precise* term the audience already uses — never as a status signal.

### 8. Avoid low-value scaffolding

- Don't write "Note:" prefixes for asides that aren't surprising.
- Don't repeat what well-named identifiers already say
  (`fn parse_vk_hash`'s docstring doesn't need to say "parses a VK
  hash").
- Don't add "Background", "Overview", or "Introduction" sections
  whose content the preamble already covered.

### 9. Final pass (do this last)

- Re-read the preamble alongside §1's first paragraph. Same idea
  twice? Cut one.
- Grep for the doc's old terms (renamed concepts, deleted features).
  None should remain.
- Verify command names, flags, config keys, file paths, and linked
  docs against the repo when the source is available. Mark anything
  unverified instead of smoothing over it.
- Count "as stated" / "described above" / "i.e." occurrences. Most
  are deletable.
- Read every command block / example as if the reader has never seen
  it. If the reader would want context, add one sentence; if it's
  obvious, leave it bare.

## Part B — Type-specific addenda

Identify the doc's genre, then apply the matching subsection's rules
**on top of** Part A. Most docs fit one genre; some (e.g. a runbook
with extensive theory) need two. If no subsection clearly matches,
apply Part A only and say so. Mapping hints: ADRs → B.2; RFCs → B.2
(plus B.8 when requesting approval); tutorials → B.3 (plus B.1 when
they contain executable steps); spec-derived runbooks → B.1 plus B.7. B.9 is an overlay, not a genre: apply
it alongside any genre whenever the doc synthesizes or compresses
claims from multiple authoritative sources.

### B.1 Operational runbook / test plan

The genre: a sequence of executable steps that an operator follows
to achieve a defined outcome.

- **Lead with what the reader will do**, not just the goal. "End-to-end
  validation of X" is the goal; "Starting from branch A, sign and
  prove …; embed into branch B; verify Y" is what they'll do.
- **Separate prerequisites from procedure.** Operational docs frame as
  "given X, do Y". Keep required setup explicit, but move fixture /
  environment construction out of the main procedure unless the runbook
  owns it.
- **Commands inline, not narrated.** Literal code blocks beat prose
  descriptions ("run cargo build with the docker flag").
- **Verification steps leave an audit trail.** Prefer durable artifacts:
  output files, captured logs, CI links, transaction IDs, or state
  snapshots. Use `tee <step>.log` where safe, but do not log secrets or
  force log capture when another artifact is already authoritative.
- **Audited runs need an evidence inventory.** For UAT, migration,
  release, proving, deployment, and on-chain runbooks, name the durable
  evidence the run will leave: command logs, manifests, output
  artifacts, checksums, transaction IDs, state snapshots, verification
  results.
- **Use an artifact-handoff table when artifacts cross phases.** For
  multi-step procedures, include
  `artifact | produced by | consumed by | verified via` so the reader
  sees which output proves each phase and which later step depends
  on it.
- **Separate planned inputs from runtime-recorded inputs.** Values
  known only during execution go in a provenance worksheet or manifest
  field, not pretended into the static runbook.
- **State the success criterion before cleanup.** The reader should
  know exactly what output, file, log line, or state transition proves
  the procedure worked.
- **Name failure and resume points.** For any long-running or
  state-changing procedure, say what can be retried, what must not be
  rerun, and what artifact proves the current phase is complete.
- **Call out destructive or irreversible steps.** Commits, deploys,
  deletes, migrations, key use, and on-chain submissions need explicit
  preconditions and confirmation points.
- **No "switch back" wording.** Reference state by name. "Switch to
  `release-v0.3.0`" beats "switch back to v0.3.0".
- **Versions / branches carry meaning in their postfixes.**
  `release-v0.4.0-eth-agg-update` over `release-v0.4.0-dev`.
- **Descriptive filenames** over codenames. `ETH_AGGREGATION_UPGRADE_TEST_PLAN.md`
  over `RELEASE_A_TEST_PLAN.md`. Codenames force the reader to decode.
- **Keep procedural steps atomic.** Give each numbered step one
  primary operator action. Put a condition before the action it
  governs ("If the gate is red, stop" — never "Stop if the gate is
  red"). Use imperative voice for operator actions; name the
  responsible role when roles change. After a state-changing or
  failure-prone action, state an observable expected result or
  verification. Aim for 20 words or fewer per prose sentence,
  excluding code and identifiers. Split "and then" when it joins two
  operator actions.

### B.2 Design doc / architectural spec

The genre: explains how a system *will* (or *should*) be shaped,
written for future readers who need to understand the decision.

- **Structure as problem → constraints → approach → tradeoffs.**
  Don't bury the problem; don't omit the tradeoffs.
- **Show one or two alternatives considered and why rejected.**
  Skips create the "why didn't they just do X" reaction.
- **Describe the final state, not the path that got there.** Drafts
  often narrate the iterative discovery; merged docs should read as
  if the final shape were the original plan. (This rule alone catches
  the most common design-doc rot.)
- **No "we considered using X" without saying why it wasn't used.**

### B.3 Background / theory doc

The genre: explains a concept, mechanism, or invariant so the reader
can reason about it.

- **Concept-first, not workflow-first.** Lead with what the thing
  *is*, not what you do with it.
- **One concept per section.** Mixing concepts forces the reader to
  hold multiple mental models at once.
- **Define vocabulary on first use.** If you say "trust anchor" or
  "VK pin", define it in passing before using it elsewhere.
- **Trust assumptions are first-class.** State explicitly what the
  reader must trust for the property you're describing to hold.

### B.4 Code / API reference

The genre: documents a unit of code so a caller can use it correctly.

- **Signature → contract → example → edge cases.** In that order.
- **Document invariants, not implementations.** "Returns sorted in
  ascending order" beats "uses quicksort internally".
- **Edge cases are part of the contract.** Null inputs, empty
  collections, error returns — name them.
- **Examples should be copy-pastable.** No `...` placeholders, no
  pseudo-code where real code fits.

### B.5 README / onboarding

The genre: helps a new reader form a mental model and take their
first action.

- **30-second pitch → 5-minute quickstart → references.** Keep the
  pitch above the fold.
- **One quickstart path.** A README with three quickstarts has zero
  quickstarts.
- **Link out for depth, don't inline it.** README is the index, not
  the encyclopedia.

### B.6 Post-mortem / incident report

The genre: explains what went wrong and what changes as a result.

- **Timeline → root cause → mitigation → action items.** Action
  items are the load-bearing section; everything else supports
  understanding them.
- **No blame, all systems.** Frame failures as system gaps, not
  individual mistakes.
- **Action items have owners and dates.** Otherwise they don't
  happen.

### B.7 Spec-derived runbook / alignment review

The genre: checks whether an operational guide implements an existing
specification or decision record.

- **Procedure alignment:** map each runbook phase to the spec's
  required procedure. If a step is substituted, skipped, or reordered,
  flag it as a delta, not a wording issue.
- **Decision alignment:** preserve concrete choices from the spec:
  cutover mechanism, source of truth, publish channels, completion
  criteria, rollback / recovery model, and authority boundaries.
- **Terminology alignment:** use the spec's vocabulary unless the
  runbook explicitly introduces an operator-facing alias.
- **Self-sufficiency test:** read the runbook as if the spec did not
  exist. If it only works by assuming unstated spec context, either
  add the missing operational fact or make the dependency explicit.
- **Deviation accounting:** elaborating an underspecified area is fine;
  silently replacing a spec decision is not.

### B.8 Proposal / decision-request doc

The genre: asks a decider to approve, fund, staff, adopt, or trial a
course of action. Discriminator vs B.2: apply B.8 when the doc asks
for a decision now; B.2 when it primarily explains a design; both when
a proposal carries substantial architecture. Technical soundness of
the proposed design stays with adversarial-review. A proposal that
compresses an existing corpus also gets B.9.

- **Lead with the decision requested.** Name the decider, the ask, its
  scope, resources, and the decision deadline in the opening section.
- **Keep one approval boundary.** Split independently rejectable asks;
  when several deliverables form one decision, state their coupling and
  whether partial approval is meaningful.
- **Bound the commitment.** When uncertainty can be reduced by trial,
  prefer a time-boxed pilot to open-ended adoption. State what
  approval does and does not authorize; the body must not quietly ask
  for more than the opening ask.
- **Decision evidence before implementation depth.** A skeptic should
  meet "this was tested, here is what happened" before the tutorial.
- **State costs in named buckets.** One-time / initial rollout /
  recurring; mark estimates and unmeasured costs honestly; state the
  cost of inaction when material and supportable.
- **Compare the status quo and alternatives fairly.** Same criteria for
  each; answer the audience's two or three predictable objections
  without artificially weakening the rejected options.
- **Define the pilot contract.** Owner, duration, participants,
  resources, success metrics (outcomes, not activity), stop conditions,
  and the post-pilot default (expire, continue, or trigger adoption).
- **Separate authorization unknowns from pilot questions.** Resolve or
  bound the facts needed to approve now (a deferred resource ask needs
  a range, ceiling, or second-stage gate); give pilot-resolvable
  questions an owner, an evaluation criterion, and a stop or default.
- **State transition consequences, reversibility, and expiry.** Name
  which people, workflows, and commitments change, who bears the
  transition cost, what becomes hard to undo, and when the decision is
  revisited.
- **Name material risks and dependencies with owners.** Do not hide
  adoption risk inside implementation detail.
- **Standalone test.** Assume the decider has read none of the corpus:
  define unfamiliar terms near first use, remove references to working
  files, ensure evidence and images travel with the doc.
- **Record the resolution, not a ceremonial lifecycle.** After the
  decision, preserve the outcome, date, decider, conditions, and a
  canonical decision link; require status/discussion metadata only for
  proposals that genuinely stay live.

### B.9 Assembled / source-derived document

The genre: synthesizes or compresses claims from multiple
authoritative sources into one artifact — a compendium, summary,
synthesis, or migration guide. An overlay: apply alongside the content
genre.

- **Ledger material claims against their sources.** For claims in the
  title, summary, headings, tables, and conclusion:
  `claim | doc wording | strongest supported wording | disposition`.
  Check later corrections, not just the first matching text.
- **Do not strengthen the corpus.** Flag lost qualifiers, broader
  scope, stronger causality, or proposed rules presented as current
  behavior. Label new assumptions and estimates explicitly.
- **Make evidence reconcile.** Totals, denominators, units, time
  windows, and sample sizes must add up; if a total does not
  reconcile, mark the table unverified — one broken sum discounts the
  whole table. Separate observations from forecasts and anecdotes.
- **Sweep for stale source references.** Prose names of source files
  and sections ("the design draft", "the spec doc §6") must be
  rewritten to internal references; mechanical rewrites leave
  double-wrapped artifacts — grep for them.
- **Check cross-part agreement.** A load-bearing number or claim
  restated in two assembled parts must match; verify counts by
  command, not by eye.
- **Front matter must match contents.** Check the reading guide's
  description of each part against what the part actually contains.
- **Verbatim blocks get banners, not edits.** A historical record that
  contradicts the doc's current state is reframed with a dated banner;
  its body stays untouched.

## Part C — Authoring defaults (deadly simple)

Default shape when drafting a design doc, planning doc, tracking
issue, or RFC from scratch:

- For design/proposal docs and RFCs, open with `## Problem`: 2-4 terse
  bullets naming only why the work exists — what changed, what cannot
  change, what must still hold; state the incompatibility/issue itself,
  one causal step per bullet. No background paragraph; mechanism
  details, solution seams, and encoding/spec specifics belong in
  `## Proposal` or later sections.
- Follow with `## Proposal`: one sentence naming the artifact/path and
  what it does, then a numbered list of the main points, one or two
  lines each.
- Use `Decisions` / `Decision N` only for choices already agreed by
  stakeholders.
- For tracking issues and simple planning docs, skip `Problem` unless
  alignment context is load-bearing; open with the goal and the
  ordered work.
- Target ~50 lines for a fresh doc. Past ~150 lines, ask whether to
  split or cut.
- Drop sections that describe unchanged state — readers already know
  what hasn't moved.
- No FTE/bandwidth estimates, no iteration history, no exhaustive
  risks list unless explicitly requested.
- Short tables only when comparison is the point.
- Save longer detail (per-crate checklists, schema fields, build
  wiring) only when asked.
- Avoid robotic templates, emoji headers, and decorative sectioning;
  use headings only when they help the reader act.
- Length and compression targets never justify omitting load-bearing
  constraints, calibrated uncertainty, requirement levels, safety
  conditions, or genre-required evidence.

Exceptions: when the user explicitly asks for, or the artifact is
clearly, an external API reference, runbook, post-mortem, security
analysis, audit checklist/report, comprehensive spec, or formal RFC,
treat the request literally and include the detail the genre requires
(and draft against the matching Part B genre rules).

Do not create an ADR unless explicitly asked for a decision record. When
asked, follow `../grill-with-docs/ADR-FORMAT.md` instead — it is the
single source for ADR shape, scope, and length.

## Review output format

If the user provides an explicit output contract, follow it over this
default. Use this format for substantive reviews; typo, single-comment,
and narrow copyedit passes may stay in prose.

Start with one line:

`VERDICT: EDITORIALLY READY | FIX (<n> integrity, <m> action) | RESTRUCTURE`

- **EDITORIALLY READY** — no blocking finding survived review. Open
  polish findings may remain; they do not affect the verdict or its
  counts.
- **FIX** — one or more blocking findings, each with an independently
  applicable repair.
- **RESTRUCTURE** — repair requires replacing the organizing model,
  changing the primary purpose or genre, or reordering multiple
  load-bearing sections — not editing within them.

Before publishing a finding, cite the passage, identify an applicable
Part A / B rule, and name a concrete reader or decision consequence.
Check nearby context and authoritative sources where relevant. Use
**Open Questions** only when missing context prevents classification;
name the evidence or decision needed. A credible integrity or action
risk stays blocking until resolved — never park it in Open Questions
to reach a clean verdict.

Render each finding as:

### [F-01] `blocking-integrity · B.9` One-line finding
**Where:** `file:line` or § — brief offending passage
**Why:** concrete reader, operational, or decision risk
**Fix:** smallest sufficient rewrite, deletion, or relocation

Use `blocking-integrity` when the reader may act or decide on false,
misleading, contradictory, unsafe, or unbounded content. Use
`blocking-action` when the intended reader cannot complete the
document's intended use: act, decide, implement, or reason correctly.
Use `polish` for non-blocking redundancy, hedging, and terminology
drift.

Order findings blocking-integrity → blocking-action → polish, grouped
by root cause. Keep finding IDs stable across follow-up rounds. Ask
before applying substantive rewrites; exact replacement prose is
optional unless the repair is local and unambiguous. After applying,
re-run Part A item 9.

Editorial readiness does not certify material technical or decision
claims for publication. Route changed or unverified material claims to
the appropriate substantive reviewer (adversarial-review, an
external-model consult, or a domain owner).

## When NOT to apply

- **GitHub issue / PR bodies**: use writing-issues-and-prs.
- **Technical correctness review**: if the question is "is this
  algorithm right" or "does this approach work", that's a different
  skill / domain reasoning. This skill can still be used for the
  document's structure, clarity, and alignment with an existing spec.
- **Single-line edits**: applying this entire framework to "fix this
  typo" is overkill.

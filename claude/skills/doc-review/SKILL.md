---
name: doc-review
description: >
  Review a written document (markdown, design doc, runbook, README, etc.)
  for redundancy, inconsistency, clarity, and density. Apply the general
  rules first, then the type-specific addendum for the doc's genre.
  TRIGGER when: user asks to "review", "audit", "clean up", "tighten",
  "compress", or "check" a markdown / documentation file; user pastes a
  doc and asks for an editorial pass; user asks if a specific reviewer
  comment is "addressed".
  DO NOT TRIGGER when: user wants substantive technical correctness
  review of an algorithm, protocol, or implementation (use code-review
  or domain reasoning instead); user is drafting fresh prose from
  scratch (this skill is for review passes, not generation). Design docs
  may still trigger for structure, readability, and spec/runbook
  alignment.
---

# Doc Review Skill

Two-tier lens. **Always apply Part A.** Then layer on **Part B** for the
specific doc type.

## Part A — General rules (every doc)

### 0. Identify reader, purpose, and next action

Before reviewing prose, name the intended reader and the action they
should be able to take after reading. A doc that is clear for auditors
may be too slow for operators; a doc that is concise for maintainers
may be underspecified for new contributors.

### 1. One source of truth per fact

If a fact appears in the preamble, §1, and §2 intro — cut two. Each
restatement erodes signal and creates drift risk when facts change.

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

### 6. Compression — three deletion classes

- **Hedge language**: "you may want to", "if useful", "optional but
  recommended" — usually deletable. Either it's worth doing or it
  isn't.
- **Self-referential commentary**: "this section discusses X" before
  discussing X.
- **Restated goal**: a goal stated in the preamble does not need a
  Goal: line in the section that fulfills it.

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
with extensive theory) need two.

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

### B.2 Design doc / architectural spec

The genre: a proposal for how a system *will* (or *should*) be
shaped, written for future readers who need to understand the
decision.

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

## Review output format

If the user provides an explicit output contract, follow that over this
default format.

When applying this skill, surface findings in this order:

1. **List findings** found, grouped by category and ordered by impact:
   inconsistencies, redundancies, low-value content, source mismatches,
   missing success criteria, unsafe operations, unclear prerequisites,
   or spec/runbook deltas. Include file/line references when reviewing
   a local file. State the rule that's being violated; quote the
   offending passage briefly.
2. **Proposed fix** — show the rewritten passage or the deletion.
3. **Ask before applying** for any substantive rewrite. Surface
   findings first; the user may want to fix some and not others.
4. After applying, **re-run a final pass** (Part A item 9) before
   declaring the doc clean.

## When NOT to apply

- **Drafting from scratch**: this skill is for review, not
  generation. Use general writing principles instead.
- **Technical correctness review**: if the question is "is this
  algorithm right" or "does this approach work", that's a different
  skill / domain reasoning. This skill can still be used for the
  document's structure, clarity, and alignment with an existing spec.
- **Single-line edits**: applying this entire framework to "fix this
  typo" is overkill.

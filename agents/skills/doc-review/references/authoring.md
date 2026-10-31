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
- Use enough detail for the reader to act. Split a long document when that
  improves navigation; length alone does not require permission.
- Keep unchanged state when a cold reader needs it to understand the change
  or a required constraint. Remove restatement that serves no reader decision.
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
asked, follow [the ADR format](../../grill-with-docs/ADR-FORMAT.md) instead — it is the
single source for ADR shape, scope, and length.


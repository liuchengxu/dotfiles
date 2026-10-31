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
**Suggestion:** smallest sufficient rewrite, deletion, or relocation

Use `blocking-integrity` when the reader may act or decide on false,
misleading, contradictory, unsafe, or unbounded content. Use
`blocking-action` when the intended reader cannot complete the
document's intended use: act, decide, implement, or reason correctly.
Use `polish` for non-blocking redundancy, hedging, and terminology
drift.

Order findings blocking-integrity → blocking-action → polish, grouped
by root cause. Keep finding IDs stable across follow-up rounds. Apply substantive rewrites only within existing edit authority. A review-only
request does not authorize them. Do not ask again when the user already
authorized the clear target change. Exact replacement prose is optional
unless the repair is local and unambiguous. After applying,
re-run Part A item 9.

Editorial readiness does not certify material technical or decision
claims for publication. Route changed or unverified material claims to
the appropriate substantive reviewer (adversarial-review, an
external-model consult, or a domain owner).

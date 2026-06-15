---
name: Prefer minimal, targeted instrumentation over comprehensive phase-by-phase coverage
description: When user asks to add timing or diagnostic logs, default to bumping existing log levels and 1-2 new lines at the prime suspect; do not propose phase-by-phase coverage with macros/helpers
type: feedback
originSessionId: 0c4d37cd-05bc-4ed8-8ab7-d2a85657c671
---
When the user asks for timing logs, diagnostic instrumentation, or "let's add some logs to see what's happening", default to the smallest possible surgical change:

1. First check whether existing logs already capture the signal at a lower level (e.g. `debug!`). If yes, propose bumping them to `info!` — that's often a 2-character change.
2. If new logs are needed, add 1-2 at the prime suspect site only, not at every phase boundary.
3. Avoid macros, helper closures, or "phase-by-phase" coverage unless the user explicitly asks for it.

**Why:** During the FinalityRegressed → wait_for_checkpoint_finalized investigation, my first instrumentation proposal added a `mark_phase!()` macro plus 9 phase-time variables plus a structured summary line in `prepare_proof_input_inner`, plus separate top-level timing for `generate_proof`. The user rejected it as "too complex" and asked for "just timing logs for the most suspicious sites." The minimal alternative — bumping two existing `debug!` → `info!` in `wait_for_checkpoint_finalized` — was sufficient to test the hypothesis.

**How to apply:** When proposing instrumentation, lead with the smallest viable change ("bump these two logs") and offer richer coverage only as an explicit opt-in if the minimal pass doesn't yield the answer.

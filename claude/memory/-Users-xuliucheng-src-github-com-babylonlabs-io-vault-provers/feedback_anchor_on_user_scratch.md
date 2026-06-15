---
name: feedback_anchor_on_user_scratch
description: anchor plans on the user's existing scratch/design notes; flag any deviation explicitly rather than silently redesigning
metadata:
  type: feedback
---

When the user has prior scratch or design notes (e.g. `system.md` in
vault-provers, which holds the HWM subsystem design), the plan's core
logic must be **anchored on that scratch**. Do not silently reinvent or
replace the documented approach.

**Why:** the user designed it deliberately; deviations may discard
reasoning that isn't obvious. Concretely — I replaced the scratch's
block-scanning monitor model with outpoint-watching without flagging
it, and missed that block-scanning is better-integrated because the HWM
readiness rule needs every block's PoW anyway.

**How to apply:** before planning logic, find and re-read the user's
scratch. Quote it. If a deviation seems warranted, present it as an
explicit choice with rationale and let the user decide — never bake it
in silently. When asked "where did you get this", the answer should be
"your scratch at <file>:<lines>", not "my reasoning".

Related: [[feedback_impl_plan_before_coding]]

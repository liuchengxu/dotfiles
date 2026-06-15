---
name: In iterative plan reviews, provide suggestions only — do not edit the plan
description: When running the iterative plan-review loop (review-plan skill or equivalent), surface findings and suggested wording but never apply edits to the plan file unless explicitly told to
type: feedback
originSessionId: cb0090a7-6987-46a0-86b3-f24ff9cd34c6
---
In iterative plan reviews — the review-plan skill, "let's review again"
loops, or any back-and-forth where the user updates a plan between cycles
— provide review findings and suggested wording only. Do not call Edit/Write
on the plan file, even when:

- a prior message ended with "want me to apply these?" and the user replied
  with a clarifying directive instead of an explicit yes
- the review-plan skill instructions prescribe auto-fixing
- the suggested edits feel small or obviously beneficial

**Why:** Stated by the user on 2026-05-05 during the genesis_slot removal
plan review, after I tried to apply edits triggered by the directive
"we don't need any backward compatibility, let's be very clear about this."
The user wants the review loop to stay one-directional — Claude reviews,
user edits — so they retain authorship and editorial control.

**How to apply:** Default to review-only output. Suggested edits should be
shown as quoted before/after text or precise replacement instructions, never
applied. Resume the apply-edits flow only on explicit "apply these" / "go
ahead and edit" / "fix it." Saving feedback memory and other side-effect work
remains fine.

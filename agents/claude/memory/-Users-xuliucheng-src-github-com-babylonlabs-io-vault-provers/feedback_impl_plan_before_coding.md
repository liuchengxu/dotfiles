---
name: feedback_impl_plan_before_coding
description: write an implementation plan before any code, even when told to "start" a task or spike
metadata:
  type: feedback
---

When the user says "start" a non-trivial task or spike — even "start it
in a new worktree" — they expect an **implementation plan** as the first
artifact: module layout, interface/trait shapes, algorithms, and test
scenarios. They do NOT want immediate code scaffolding.

**Why:** planning and implementation are separate phases; the impl plan
is the reviewable checkpoint where the design gets approved before any
Write/Edit of source files. Creating the worktree is fine; writing code
into it is not, until the plan is signed off.

**How to apply:** after creating the worktree, present a focused impl
plan and wait for explicit approval before touching source files.

Related: [[feedback_review_only_no_edits]]

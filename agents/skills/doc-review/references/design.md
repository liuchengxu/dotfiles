### B.2 Design doc / architectural spec

The genre: explains how a system *will* (or *should*) be shaped,
written for future readers who need to understand the decision.

- **Structure as problem → constraints → approach → tradeoffs.**
  Don't bury the problem; don't omit the tradeoffs.
- **For substantial technical plans, state invariants as design constraints
  before implementation details.** Map each invariant to current behavior,
  proposed enforcement, and a validation method. Distinguish existing defects,
  preserved guarantees, and new requirements. Cite source evidence for claimed
  defects. For a new system, mark current behavior as not applicable.
  Use a compact table when it helps; keep the depth proportional to the change.
- **Make alternatives and tradeoffs clear.** Explain why the chosen option
  fits the requirements and what it costs. Technical review owns the
  [check for missing alternatives](../../adversarial-review/references/architecture.md#check-for-missing-alternatives).
- **Describe the final state, not the path that got there.** Drafts
  often narrate the iterative discovery; merged docs should read as
  if the final shape were the original plan. (This rule alone catches
  the most common design-doc rot.)


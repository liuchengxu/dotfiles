---
description: Adversarially review a plan without changing it.
argument-hint: "<plan-or-focus>"
---

Review the plan: $ARGUMENTS

Load and apply the `adversarial-review` skill. Follow the CURRENT Pi global reviewer and model policy; historical Claude provider/model bindings are not authority. Establish the plan revision, decision under review, governing requirements, and review scope. This is review-only: make no plan, implementation, or publication changes.

Verify findings against available sources, keep unavailable evidence explicit, and use stable finding IDs. Give each finding a severity, location, evidence, consequence, and actionable recommendation. Do not close blockers merely because they were acknowledged. Finish with open findings, coverage gaps, and a concise verdict; provider failure is an execution limitation, not a successful review.

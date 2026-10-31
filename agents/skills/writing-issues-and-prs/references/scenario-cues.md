## Scenario cues

The scenario only shifts which evidence matters. These are inputs for
choosing the first sentence, not sections to fill — use the row to
decide what the reader needs.

| If this is… | First sentence usually names… | Evidence that may matter… |
|---|---|---|
| Bug fix | The failure and who/what it broke | root cause in a line, repro, expected/actual, regression test |
| Feature | The user or job this unlocks | done criteria, limits, follow-ups, rollout notes |
| Refactor | The reason to change structure now | behavior-preservation claim, before/after boundary, non-CI no-regression evidence when it changes review confidence |
| Chore / docs / deps / test | The maintenance value | what future work or confidence this enables |
| Security / protocol correctness | The invariant or risk being protected | threat model, remaining assumptions, negative/adversarial tests |

For a trust-boundary, wire-format, schema, signing, validation, or role change,
use the PR template's Boundary-sensitive content list or the issue template's
Contract or trust-boundary change module to state the review contract. These
details are substantive even when they make the body longer.


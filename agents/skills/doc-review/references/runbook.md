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
- **Audited runs need an evidence inventory.** For UAT, migration,
  release, proving, deployment, and on-chain runbooks, name the durable
  evidence the run will leave: command logs, manifests, output
  artifacts, checksums, transaction IDs, state snapshots, verification
  results.
- **Use an artifact-handoff table when artifacts cross phases.** For
  multi-step procedures, include
  `artifact | produced by | consumed by | verified via` so the reader
  sees which output proves each phase and which later step depends
  on it.
- **Separate planned inputs from runtime-recorded inputs.** Values
  known only during execution go in a provenance worksheet or manifest
  field, not pretended into the static runbook.
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
- **Keep procedural steps atomic.** Give each numbered step one
  primary operator action. Put a condition before the action it
  governs ("If the gate is red, stop" — never "Stop if the gate is
  red"). Use imperative voice for operator actions; name the
  responsible role when roles change. After a state-changing or
  failure-prone action, state an observable expected result or
  verification. Aim for 20 words or fewer per prose sentence,
  excluding code and identifiers. Split "and then" when it joins two
  operator actions.


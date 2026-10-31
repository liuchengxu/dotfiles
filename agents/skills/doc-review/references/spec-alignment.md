### B.7 Spec-derived runbook / alignment review

The genre: checks whether an operational guide implements an existing
specification or decision record.

- **Procedure alignment:** map each runbook phase to the spec's
  required procedure. If a step is substituted, skipped, or reordered,
  flag it as a delta, not a wording issue.
- **Decision alignment:** preserve concrete choices from the spec:
  cutover mechanism, source of truth, publish channels, completion
  criteria, rollback / recovery model, and authority boundaries.
- **Terminology alignment:** use the spec's vocabulary unless the
  runbook explicitly introduces an operator-facing alias.
- **Self-sufficiency test:** read the runbook as if the spec did not
  exist. If it only works by assuming unstated spec context, either
  add the missing operational fact or make the dependency explicit.
- **Deviation accounting:** elaborating an underspecified area is fine;
  silently replacing a spec decision is not.


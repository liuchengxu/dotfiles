## Evidence discipline

Do not turn the PR body into a citation dump, but do verify every
material claim before posting it. A material claim is one that justifies
the PR, explains risk, names a dependency/build conflict, says behavior
is preserved, or says something was verified.

- Requirement claims need a concrete source: a failing command, issue,
  CI log, downstream PR, user-visible workflow, or other reproducible
  trigger.
- Dependency and build claims need graph or tool evidence from the same
  dependency graph the PR affects: `cargo tree`, `cargo metadata`, CI
  logs, or the exact compiler/resolver error. Do not infer a combined
  workspace conflict from an isolated crate graph, or attribute a
  combined-workspace failure to a single crate's own graph.
- For stacked PRs, validate requirement claims at the boundary where they
  matter. Explain dependencies only when they justify an addition, supply an
  invariant, or leave a material guarantee downstream. Put that rationale in
  Why, What, or Scope and non-goals; do not restate links, ordering,
  or relationships already visible in the stack. Each body must stand on its
  own: lead with the independent
  problem, not its ordinal or base relationship. Read the descriptions
  bottom-to-top as one cold-reader surface. After a role, artifact, command, or
  term is renamed or removed anywhere in the stack, sweep every body and
  forward reference. The current PR's isolated diff may not reproduce the
  downstream need, so inspect the actual downstream graph, workflow, failing
  command, or branch.
- For dependency or build failures, prefer exact causal paths over short
  causal labels. Name the conflicting package/version paths when the
  graph proves them.
- Behavior-preserving claims need focused verification or a narrower
  wording such as "intended to be behavior-preserving" when only the
  code move/import shape was checked.
- Threat claims need a concrete actor, controlled input, and smallest witness.
  State what still holds without the PR. If the evidence proves only a new
  guarantee rather than an exploitable failure, describe the guarantee gained
  instead of inventing an attack.
- If a weakness may still be exploitable on a deployed or public branch, do not
  publish the exploit inputs, reproduction, or distinguishing witness in an
  issue or PR body. Describe the guarantee at a safe altitude and route details
  through the repository's private security process. If no private process is
  known, stop and ask the user before drafting public details.
- Do not report agent or model review activity, names, verdicts, consensus,
  or review counts in PR bodies. Review provenance is not validation evidence.
  State any material finding or unresolved risk directly, with source or test
  evidence when available. Omit routine local check success summaries, including
  link, anchor, and whitespace checks. Keep those in the task report; retain
  material validation gaps in the PR when they affect a review decision.
- Verification, when it earns a heading, is a concise summary of evidence
  beyond the visible CI surface, not an execution log. Omit routine formatting/lint/build/test inventories,
  passing-test counts, and a prose recap of the diff. Keep only material manual
  or non-CI evidence, a distinguishing behavioral witness, or unresolved coverage
  that changes confidence. Distinguish local evidence from CI, and do not carry
  stale local limitations once applicable CI supplies the missing evidence.
  Preserve unresolved safety/compatibility gaps; concision does not waive checks.

If the evidence proves only a narrower statement, write the narrower
statement. If the precise causal path is still unknown, say what is known
and avoid naming a specific cause until it is reproducible.


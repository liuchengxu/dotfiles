## Operational Evidence

A doc that is the record of authority for a concrete operation — run, release,
migration, ceremony, benchmark, deployment, on-chain step — must let a cold
reader verify what happened, not merely resolve its references.

- Plan the evidence before the operation and capture it during the run. A doc
  cannot be closed retroactively once the outputs are gone.
- Include source pins for every repo involved.
- Link captured, redacted command output as artifacts; never capture secrets.
- Preserve the produced artifacts instead of summarizing them.
- For built or irreversible outputs, record a provenance manifest: source pins,
  lockfile hashes where they exist, toolchain versions, build mode, output
  hashes, and whatever anchors the irreversible external state.

Resolving references, defining terms, and otherwise closing a doc against the
session that produced it is the `doc-closure` skill.

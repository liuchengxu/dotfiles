# vault-provers contributor label

When creating an issue or PR in `babylonlabs-io/vault-provers`, assess
whether a general backend engineer can handle it without specialist prover
knowledge. For issues, they must be able to implement the defined scope.
For PRs, they must be able to judge the diff's correctness, not merely read it.
If the item qualifies, automatically add
`no-prover-expertise` with `--label no-prover-expertise` at creation.
This is part of authorized issue/PR creation; do not ask separately.

- Candidates include backend RPC, error handling, CI, tooling, and docs
  with clear requirements and acceptance checks.
- Judge the actual issue scope or PR diff, not its size, directory, or
  title. Backend and build changes can still require specialist knowledge.
- Omit the label when unresolved circuit, light-client, btc-authz
  authorization-chain, proof-validity, or ELF/VK compatibility decisions
  require a specialist. Ordinary API authentication does not itself exclude it.
  A general implementation of already-defined rules can qualify.
- For mixed or unclear scope, leave the label off and explain the uncertainty.
  Assess each PR in a stack separately.
- The label describes contributor expertise, not risk, priority, approval,
  or permission to skip tests and required review.

Check that the label exists before creation. If it is missing, create the
authorized item without it and report the missing label; do not create a
new label. If creation returns an uncertain result, check whether the item
exists before retrying to avoid duplicates.

Preserve other labels and verify the label on the created item. For a
draft-only response, propose the label without changing GitHub. This rule
does not authorize publishing drafts or relabeling existing items.

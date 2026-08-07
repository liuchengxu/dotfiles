---
name: research-sourcing
description: >
  Sourcing discipline for research and analysis: validate each claim against a
  primary source, link it, and verify on-chain identifiers before citing them.
  TRIGGER when producing research, analysis, comparisons, or any write-up that
  asserts external facts about protocols, libraries, incidents, or on-chain
  state.
  DO NOT TRIGGER for reasoning about code in the current repo, which is settled
  by reading it.
---

# Research Sourcing

Validate every factual claim against a primary source — official docs, on-chain
data, GitHub repos, post-mortems. Training data alone is not a source.

- Include a source link for every non-trivial claim.
- Prefer primary sources (a contract on Etherscan, a GitHub commit, an official
  forum post) over secondary summaries.
- Verify that contract addresses and transaction hashes exist on-chain before
  citing them.
- A claim that cannot be validated is marked unverified, never presented as
  fact.

Where the finished document goes follows the `notes-tiers` skill.

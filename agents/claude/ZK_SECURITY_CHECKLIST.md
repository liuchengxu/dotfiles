# ZK Security Review Rules

Process rules for reviewing or modifying ZK circuits and their fixes.
Companion to `BLOCKCHAIN_ATTACK_VECTORS.md` (the attack-vector reference).

## General principles

- **Don't treat spec consistency as security review.** Checking that fields are consistent across sections is not sufficient. The real question is: "Can the attacker bypass this mechanism given what they control?" Think like an attacker, not an auditor.
- **Classify every security check** against the three meta-patterns: fabricated input, stale/reused input, or missing check. Then ask whether the attacker can circumvent that specific defense.
- **Re-trace after every fix.** Every fix introduces new assumptions and new attack surface. Re-run the full adversarial trace from scratch after every structural change, not just on the delta. A check that compares two attacker-controlled values is security theater.

## ZK circuit checklist

For every circuit design or modification, verify these in order:

1. **VK trust.** For every `verify_sp1_proof(vk, ...)`, who controls `vk`? If attacker-controlled, the proof output is attacker-controlled — never use it to enforce security properties.
2. **Witness constraint.** For every `sp1_zkvm::io::read()`, can the prover supply a different value that still produces a valid proof with a favorable output? If yes, it's under-constrained.
3. **Output binding.** Are all security-critical values committed via `sp1_zkvm::io::commit()`? A value that only exists as a witness can be substituted silently.
4. **Cross-proof binding.** When verifying multiple proofs, are they temporally and contextually linked? Can the prover mix proofs from different times or contexts?
5. **Proof-type separation.** Are distinct circuit types verified under distinct VKs? Can a proof of type A be substituted where type B is expected?

## ZK fix discipline

- **Prefer collapsing over expanding.** When fixing a ZK security bug, prefer reducing the number of proof verifications and witness inputs over adding new ones. Every new witness is a new unconstrained-input risk. Every new VK is a new trust question. One proof under one trusted VK is harder to get wrong than three proofs under three VKs.
- **Apply the checklist to the fix itself.** If a fix adds a new witness or proof verification, immediately run the 5-step checklist on it. Fixes that add complexity without re-verification are the #1 source of introduced bugs.

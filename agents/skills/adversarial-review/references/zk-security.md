# ZK Security Review Rules

Process rules for reviewing or modifying ZK circuits and their fixes.

## General principles

- **Don't treat spec consistency as security review.** Checking that fields are consistent across sections is not sufficient. The real question is: "Can the attacker bypass this mechanism given what they control?" Think like an attacker, not an auditor.
- **Re-trace after every fix.** A fix can introduce new assumptions and new attack surface. After a structural change, re-trace the whole affected proof chain, not just the delta. A check that compares two attacker-controlled values is security theater.

## ZK circuit checklist

For every circuit design or modification, verify these in order. The SP1 names
are examples; apply the same checks to the equivalent APIs of other proof
systems.

1. **VK trust.** For every `verify_sp1_proof(vk, ...)`, who controls `vk`? If attacker-controlled, the proof output is attacker-controlled — never use it to enforce security properties.
2. **Witness constraint.** For every `sp1_zkvm::io::read()`, can the prover supply a different value that still produces a valid proof but violates a constraint the proof statement intends? If yes, it's under-constrained.
3. **Output binding.** Is every security-critical output bound by constraints to the intended public inputs and witnesses, through `sp1_zkvm::io::commit()` directly or through a committed hash, root, or other value that determines it? Secret witnesses need not be committed. A witness that no constraint uses and no committed value depends on can be substituted silently.
4. **Output meaning and completeness.** For each output field, name the protocol object it describes (for example a beacon state), not the library or store that holds it in the guest. Does the guest prove the relationship to that object, including the correct state, period, and Merkle position and depth? If that object always has the value, the output must carry it. An optional field lets the prover withhold the value by omitting a witness, even when the spec or PR allows the option.
5. **Cross-proof binding.** When verifying multiple proofs, are they temporally and contextually linked? Can the prover mix proofs from different times or contexts?
6. **Proof-type separation.** Are distinct circuit types verified under distinct VKs? Can a proof of type A be substituted where type B is expected?

## ZK fix discipline

- **Prefer the smallest sufficient proof structure.** Every new witness is a new unconstrained-input risk, and every new VK is a new trust question. Remove unneeded proof verifications, witnesses, and VKs, but do not merge independent trust domains or drop constraints the statement needs.
- **Apply the checklist to the fix itself.** If a fix adds a new witness or proof verification, immediately run the checklist on it.

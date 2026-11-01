---
name: vault_id is unique per pegin
description: Protocol invariant — vault_id maps 1:1 to a Bitcoin pegin tx; explains why the event circuit safely ignores peginTxHash
type: project
originSessionId: 1dbc064d-c8a1-47fd-8c83-e93a74a90816
---
`vault_id` is guaranteed unique per pegin at the vault-provers protocol
level: there is a 1:1 mapping between `vault_id` and the originating
Bitcoin pegin transaction.

**Why:** confirmed by the user (Liu-Cheng Xu) on 2026-04-15 during the
adversarial review of `docs/CIRCUIT_SPEC.md`. This invariant is what
makes the event-inclusion circuit's design sound: the circuit pins
`topics[1] = vault_id` and `topics[3] = claimer_pk` but **intentionally
ignores `topics[2] = peginTxHash`**. Because `(vault_id, claimer_pk)`
already uniquely identifies the pegin a pegout claims against, there is
no cross-pegin replay risk from leaving `peginTxHash` unconstrained.

**How to apply:**
- Do not flag the unconstrained `peginTxHash` as a security issue — it's
  intentional and safe given this invariant.
- If anyone proposes changing the protocol so `vault_id` is no longer
  1:1 with a pegin, immediately escalate: the circuit would then need to
  bind `peginTxHash` into the event-inclusion output and forward it
  into `AggregationOutput`, otherwise replay across pegins becomes
  possible.
- Documented in `docs/CIRCUIT_SPEC.md` §6 "Protocol Invariants".

---
name: SP1 vk-identity tests need outer prove, not execute
description: verify_sp1_proof's vk-identity check fires at the recursion layer during outer prove; execute() cannot exercise it under any SP1_PROVER mode
type: feedback
originSessionId: db23edd8-1d73-4cb7-a4a7-839f95149d0e
---
`verify_sp1_proof(&VK, vk_digest, pv_digest)` inside an SP1 guest only RECORDS a deferred-verify request. The actual vk-identity assertion (that the child compressed proof was generated under exactly `VK`) is enforced at the recursion layer during outer compressed prove — not at execute time, not at child-proof generation, not by `MockProver::verify`.

`ProofClient::execute()` only runs `verify_compressed(child_proof, witness_vk)` for internal consistency. It never compares `witness_vk` against the guest's hardcoded `VK` parameter. Canonical reference: `sp1/crates/prover/src/worker/prover/execute.rs::verify_deferred_proofs`.

**Why:** PR #374's wrong-VK adversarial test went through ~7 architectural iterations (mock-mode → cpu execute → cpu outer prove → cuda outer prove with slot-shuffle) because we kept re-discovering that `execute()` cannot catch this class of bug regardless of `SP1_PROVER` mode. Mock-mode tests asserting wrong-VK rejection silently pass and provide zero security signal.

**How to apply:** When designing adversarial tests for any `verify_sp1_proof` property — wrong-VK substitution, cross-proof binding, proof-type mix-ups — the test MUST:
1. Run under `SP1_PROVER=cpu` or `cuda` (not `mock`)
2. Drive outer compressed prove (not `execute_from_*`)
3. Use real production VKs whenever possible — test-only VKs (e.g. `test_authorization_v2`) often lack CUDA prove-server cached artifacts and have ELF-reproducibility friction across Docker/CI/local builds. Subproof-shuffle (substitute one real production proof into another's slot) is the cleanest pattern.
4. Stage the honest setup once per test binary via `OnceCell`; outer prove on GPU is expensive (~10 min) and per-test re-staging causes OOM.

For execute-only or mock-mode adversarial tests, restrict scope to constraints the guest enforces directly via `assert!`/`panic!` — receipt-decoding, MPT verification, runtime-input mismatches, cross-proof root reconciliation. These DO surface in execute and are cheap to run in bulk.

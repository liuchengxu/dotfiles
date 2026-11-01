---
name: project_prover_service_trust_model
description: "prover-service trust model — trusted by vaultd, self-hosted localhost default, optional Babylon shared GPU prover behind permissioned perimeter"
metadata: 
  node_type: memory
  type: project
  originSessionId: b94e16c5-4069-4475-b8a8-ac2cf452b37e
---

The prover-service is a **trusted** component from vaultd's point of view, not an internet-facing public API. Two deployments:

1. **Default: each vaultd operator runs their own prover-service.** RPC binds to `127.0.0.1:3030` (`service/crates/prover-service/src/config.rs` `default_rpc_addr`). No untrusted caller — only the operator's own vaultd.
2. **Optional: Babylon Foundation may run a GPU prover-service** exposed to a **permissioned** set of Universal challengers (closed, vetted, revocable). The service has **no in-process auth**; permissioning is enforced at an infra perimeter (mTLS/allowlist). It assumes it sits behind that perimeter and is never publicly exposed.

**Why:** Coinspect rated DoS findings (TRV-058 capacity exhaustion, TRV-060 event-loop stall) as Medium/High-likelihood assuming an open anonymous attacker. That attacker model doesn't exist here.

**How to apply:** For any unauthenticated-DoS finding, re-scope severity against this model — Informational/Low self-hosted, Low–Medium for the shared permissioned prover. The real residual risk is insider fairness (one permissioned challenger starving others) → per-caller quotas at the perimeter, not in-process auth tokens (which duplicate the perimeter). No DoS finding in this class touches proof soundness or fund safety. Draft issues + auditor clarification live in `notes/` (2026-05-31).

**v1 scope clarification (2026-06-09):** v1 production deployment is **per-participant, local-FS only — no shared chain-level proofs**. The "shared chain-level proof over shared FS" pattern is used **internally by devops** to amortize Sepolia testnet costs across devnets. Public shared-prover support is planned for a future iteration but is **explicitly out of v1 scope**. Audit findings that require a shared distributed FS topology (NFS CTO race, NLM saturation EACCES/ENOLCK) are out-of-scope for v1 — dispute severity on those grounds. Sherlock #172 and #173 (proof_lock NFS-class findings) fall into this bucket.

**Slack corroboration (verified 2026-05-31):** All three claims are documented in the babylonlabs Slack, but as an active **proposal/recommendation, not a ratified decision**. Canonical source: liucheng's thread in #tbv-protocol-dev 2026-04-28 (self-host per VP/VK/UC; Babylon GPU prover as fallback, default-accessible to whitelisted VKs/UCs; "mTLS at a reverse proxy… don't need access-control code in the prover-service"). Claim #1 backed by Vitalis 2026-03-13 in #dev-ops ("running the prover is not a security requirement — vaultd verifies proofs cheaply"). Open question still unresolved: should the Babylon GPU prover also serve VPs? The `127.0.0.1` bind specific is code-only, not stated in Slack. Tracking issue: vault-provers #346 (prover endpoint access control). Terminology: VP / VK / UC (Universal Challenger). Don't overstate to auditors as finalized.

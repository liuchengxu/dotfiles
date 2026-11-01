---
name: project_vault_contracts_generic_core
description: "vault-contracts is a generic app-agnostic core with pluggable applications (Aave, Morpho); vaultBTC is app-side"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5dd20c7c-df7f-4e84-99f5-1f6f538e0a6e
---

The Babylon vault-contracts are layered: a **generic, application-agnostic core** plus **pluggable applications**. Confirmed by tracing `vault-contracts-aave-v4` (and the sibling `vault-contracts`, which runs Morpho on the same core).

**Core** (`src/protocol/` + `src/interfaces/`): `BTCVaultRegistry`, `ApplicationRegistry`, `ProtocolParams`, `CapPolicy`, `FeeEscrow`. Knows only vaults, BTC keys, lifecycle statuses, and the `VaultClaimableBy` claim event. Zero references to lending/USDC/`vaultBTC` (grep-confirmed, even in comments).

**Application** (`src/applications/aave/`): `AaveAdapter`, `VaultBTC`, `BTCVaultSwap` (LLP). One of N apps. `vaultBTC` is **application-side** (minted `onlyAdapter`, lives under `applications/aave/`, 8 decimals, transfer-gated) — NOT a core concept. The core never mints a collateral token; it just fires a callback and the app decides what to do (Aave mints vaultBTC and supplies it to Aave v4 Core Spoke).

**The seam** (only data crossing core↔app):
- core → app: `IApplicationEntryPoint.activateVault(vaultId, BTCVaultBasicInfo, bytes activationMetadata)` (`IApplicationEntryPoint.sol:11-23`, called at `BTCVaultRegistry.sol:420`). `BTCVaultBasicInfo` = {depositor, btcPubKey, amount, vaultProvider, status, appEntryPoint, createdAt} + opaque bytes. Comment: "Applications that need protocol-specific fields must query BTCVaultRegistry separately."
- app → core: `redeemVaultForDepositor` / `redeemVaultForAVK` → emits `VaultClaimableBy` (`BTCVaultRegistry.sol:835-874`).
- registration: `ApplicationRegistry.registerApplication(name, address appEntryPoint, keepers)` — apps keyed by bare `address`, no cardinality limit (a test registers a "SecondApp").

**Why this matters for the prover:** the prover's event-inclusion circuit proves a **core** event (`VaultClaimableBy`), and the per-pegin VK binds `vault_id` + `claimer_pk` (see [[project_vault_id_per_pegin]]). So the prover is application-agnostic — adding a new application (e.g. Morpho) needs no circuit change.

Aave sees only `vaultBTC`; the `AaveAdapter` has no Bitcoin/Taproot/UTXO handle. The whole-protocol C4 (`docs/architecture/protocol-c4.md`, System Context) reflects this split: generic core box vs pluggable Aave-application box, joined by the `IApplicationEntryPoint` seam.

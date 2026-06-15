---
name: project_vaultbtc_not_fungible
description: "vaultBTC is a transfer-restricted ERC-20, not freely fungible — backing has per-vault identity"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5149a688-54c7-42b2-b353-2abc63b85d8e
---

vaultBTC is **not freely fungible**. `VaultBTC.sol` (vault-contracts / vault-contracts-aave-v4, `src/applications/{aave,morpho}/VaultBTC.sol`) is an ERC-20 *with transfer restrictions that block direct EOA transfers* — mint/burn only via the adapter, movement only through adapter-validated proxies. It does not circulate or commingle like an ordinary token.

**Why:** the contract is labeled "ERC-20," which makes both reviewers and LLMs (Codex did this) assume fungibility and conclude that per-asset uniqueness invariants are invalid ("you can only enforce aggregate equality"). That's wrong — because positions can't freely transfer/commingle, **backing has per-vault identity**, so uniqueness invariants are well-defined: no vault backs two positions, exactly-once settlement (catalog C17/C19/C28).

**How to apply:** when reasoning about conservation/backing for the monitor, treat backing as per-vault/per-position, not pooled-fungible. In Codex prompts about conservation, state up front that vaultBTC is transfer-restricted to pre-empt the fungibility assumption. Related: [[project_vault_contracts_generic_core]].

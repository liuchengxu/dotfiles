---
name: project_versioning_model
description: vault-provers has two independent version lines — service release version vs circuit version; what bumps each
metadata: 
  node_type: memory
  type: project
  originSessionId: 791f43d6-877e-4593-ab63-90ddd54cef9a
---

vault-provers versions `service/` and `circuits/` on **independent** lines — never lockstep.

- **Service release version** — the repo git tag (`vX.Y.Z`) and `prover-service --version` track the `service/` workspace version only (`service/Cargo.toml [workspace.package]`, via `CARGO_PKG_VERSION`). On a release, bump **only** `service/Cargo.toml` (+ `service/Cargo.lock`); leave `circuits/` untouched. `service/` moves fast and is usually backward-compatible.
- **Circuit version** — `circuits/` is versioned separately (slow-moving, backward-compat hard). The exact scheme is **not yet settled** — keep claims light until the team confirms.

The following is reasoning from code (`circuit-types/src/lib.rs`), **not a confirmed team decision** — verify before relying on it: `CircuitVersion` (currently `V1`) appears to track the proving path (finality / event-inclusion / aggregation / peg-out), with the VK frozen at vault creation and the prover serving multiple versions at once. The `authorization-admin` / `authorization-chain` circuits look separate from it, so an authority rotation (e.g. admin → HSM) would change the auth-admin VK but not the proving VKs (peg-out anchored to the genesis auth VK + auth-chain lineage) — i.e. likely no `CircuitVersion` bump. Treat as a working hypothesis.

Root cause of the v0.5.0 skew (tag `v0.5.0`, binary reported `0.4.0`): vault-provers historically bumped `main`'s version per-release and tagged on `main`, so a missed bump produced a tag/version mismatch. btc-vault instead keeps `main` at a placeholder and sets the version only on the `release/*` branch — adopting that is pending a team decision. See [[project_release_process]] once written.

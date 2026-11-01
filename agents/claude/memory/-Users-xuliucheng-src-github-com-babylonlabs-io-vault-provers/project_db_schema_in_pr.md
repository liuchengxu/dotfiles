---
name: project_db_schema_in_pr
description: "btc-authz-db must ship a simple, human-readable schema description (field tables, not SQL DDL) in the PR as a deliberate anti-vaultd arch-design example"
metadata: 
  node_type: memory
  type: project
  originSessionId: 27828755-1d19-455c-abb1-e1a73a3909de
---

Mikhail requires `btc-authz-db` to include the database schema directly in the PR (Slack, 2026-05-22: https://babylonlabsworkspace.slack.com/archives/D09977T0V7B/p1779453476609549?thread_ts=1779432783.950399&cid=D09977T0V7B). He expects it simple, but wants the project to serve as an architecture-design example — explicitly showing how NOT to do it the vaultd-db way.

**Why:** the schema is a deliberate showcase of good DB architecture; reviewers contrast it against vaultd's anti-patterns (bincode `state_blob` columns, role-multiplexing one DB across daemons, DDL in Rust string literals, schema spread across 15 files).

**How to apply:** ship a concise schema *description* (tables, fields, the information stored, and the constraints that matter) — NOT prescriptive DDL. Per the user (2026-05-25): whether `state` is text or a small int, hashes are bytes or hex, etc., is the backend implementor's choice; describe *what* is stored and leave column types/DDL to them. No `sqlx`/runtime DB dep; `InMemoryStore` stays the only runtime impl. The anti-vaultd point is shown by what's avoided: no opaque bincode `state_blob`, no role-multiplexing, no schema spread across files — one row models one upgrade. The description must reflect resolved decisions R1a (no maturation-height field), R2 (`governance_txid` is the primary key; a re-mined orphaned row is revived, not duplicated), R3 (`u64` heights). See `notes/btc-authz-db-design.md` (`SCHEMA.md` data model) and `notes/monitor-spike-impl.md`. This reverses the short-lived "no schema in the crate" direction.

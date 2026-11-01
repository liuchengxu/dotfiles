# Lore Project Memory

## Architecture
- Tauri desktop app: Rust backend + vanilla JS frontend
- Frontend JS in `crates/markdown_preview_core/js/`, inlined into HTML by `lore/build.rs`
- State persisted via Loro CRDT snapshots + JSON files in app data dir
- Dictionary history migrated from localStorage to backend (AppState + Loro)

## Key Files
- `lore/src/state.rs` — All persistence logic, AppState, config load/save
- `lore/src/sync.rs` — P2P SyncManager (Iroh endpoint, pairing, sync protocol)
- `lore/src/sync_store.rs` — Loro CRDT store (dict caches, histories, preferences)
- `lore/src/commands/sync.rs` — Tauri commands for sync + preferences
- `lore/src/commands/dictionary.rs` — Dictionary lookup commands
- `crates/markdown_preview_core/js/settings-dialog.js` — Settings UI with P2P Sync section
- `lore/src/main.rs` — Tauri setup, invoke_handler registration

## P2P Sync (All 4 Phases Complete)
- Design doc: see `~/.claude/plans/tidy-weaving-moonbeam.md`
- Stack: **Loro** (CRDTs, 1.10+) + **Iroh** (P2P transport, 0.96)
- Phase 1: History migrated to backend (AppState)
- Phase 2: Loro CRDT persistence (5 containers: dict/online/etymology caches, 2 histories, preferences)
- Phase 3: Iroh P2P transport (device pairing with 6-digit codes, bidirectional sync)
- Phase 4: Auto-sync (startup + 5min interval), UI preferences sync, sync status indicator
- 54 unit tests + 9 doc tests all passing

## iroh 0.96 API Notes
- `NodeId` -> `EndpointId`, `Endpoint::node_id()` -> `Endpoint::id()`
- `Connection::alpn()` returns `&[u8]`, `Connection::remote_id()` returns `EndpointId`
- `SecretKey::generate(&mut rand::rng())` — needs `rand = "0.9"` for rand_core compat
- `SecretKey::from([u8; 32])` for loading from bytes

## Synced UI Preferences
- Keys: theme, fontFamily, zoomLevel, tocMode, contentWidth, readerMode
- Stored in Loro `preferences` Map container
- core.js calls `window.syncPreferenceToBackend?.(key, value)` after localStorage.setItem
- tauri-app.js defines the function and loads synced prefs on startup via `applySyncedPreferences()`

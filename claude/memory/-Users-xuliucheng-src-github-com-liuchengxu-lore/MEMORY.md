# Lore Project Memory

## Key Lessons

### Symlink-aware file writing
`~/.claude/` uses symlinks to a dotfiles repo (`~/.dotfiles/claude/`). Never use `canonicalize()` to validate written file paths — it resolves symlinks and rejects legitimate setups where files point outside the base directory. Use allowlist + path validation instead.

### Test count baseline
197 unit tests + 43 lib tests + 9 doc tests = 249 total.

### Loro CRDT containers
Nine containers in the Loro doc: `dict_cache`, `online_dict_cache`, `etymology_cache`, `dict_history`, `ask_ai_history`, `preferences`, `claude_config`, `pinned_files`.

## Feedback
- [Keep brand-style file type icons](feedback_brand_icons.md) — prefer custom MD/PDF SVGs over generic Lucide replacements
- [Prefer clean architecture](feedback_clean_architecture.md) — never duplicate code between apps, invest in proper sharing

## Project
- [dict macOS Services](dict_macos_services.md) — Service needs valid signature + manual enable in System Settings on macOS 26

## Module Structure

### State module (`state.rs` + `state/`)
Split into parent + 6 submodules. All submodules add methods via separate `impl AppState` blocks. Fields use `pub(super)` visibility.

- `state.rs` — `AppState` struct, `new()`, config load/save, AI config accessors, sync accessors, types, sub-structs, free helpers
- `state/files.rs` — recent files, local + Loro pinned files, path history, snapshots
- `state/caches.rs` — `NegativeCache`, AI summaries, dict/online/etymology caches, negative cache persistence
- `state/history.rs` — dict history, Ask AI history (SyncStore-backed)
- `state/credentials.rs` — encrypted credential sync via Loro
- `state/migration.rs` — legacy JSON→Loro migration
- `state/offline_dict.rs` — `OfflineDictState`, `OfflineDict`, `DictLoadResult`, `OfflineLookupHit`

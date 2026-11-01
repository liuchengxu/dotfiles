# MEAD / vim-clap Project Memory

## Architecture
- **mead/** (formerly maple_desk/, formerly markdown_preview_app/): Standalone Tauri app, separate workspace from main vim-clap
- MEAD = **M**arkdown **E**ditor with **A**I and **D**ictionary
- Frontend sources in `crates/markdown_preview_core/js/` — NOT in `mead/frontend/` (auto-generated)
- State uses `Arc<RwLock<AppState>>` managed by Tauri
- Commands in `mead/src/commands/` (dictionary, metadata, file, etc.)
- Build: `cargo build` from `mead/` directory
- Tauri identifier: `com.vimclap.mead` (migrates from `com.vimclap.maple-desk` and `com.vimclap.markdown-preview`)

## Key Patterns
- Config persistence: `PersistedConfig` struct with `#[serde(default)]` fields for backward compat
- Settings dialog: inline HTML in `showSettingsDialog()` in tauri-app.js, inline CSS in `<style>` tag
- `sanitizeHtml()` is globally available from core.js (wraps DOMPurify)
- Lock ordering: when multiple `Arc<RwLock>` resources, never hold both simultaneously

## Git Signing
- Non-babylonlabs-io repos: use `~/.ssh/id_ed25519.pub` (default ed25519 key)
- babylonlabs-io repos: use `~/.ssh/yubikey-primary.pub` (YubiKey, required by CI)
- Example: `git -c user.signingkey=~/.ssh/id_ed25519.pub commit -S -m "msg"`

## Gotchas
- Directory was renamed: `markdown_preview_app/` → `maple_desk/` → `mead/` (branch: markdown-preview-app)
- `cargo clippy` runs from `mead/` not project root
- After renaming the directory, must `cargo clean` to clear stale target paths
- JS functions like `escapeHtml`, `invoke`, `listen` available in tauri-app.js scope
- The `mdict-parser` crate panics on malformed input — always wrap in `catch_unwind`

## Icon
- Honeycomb hexagon icon: amber/gold gradient (#D4A017 → #B8860B) with white "M"
- Source SVG: `mead/icons/icon-source.svg`
- Generated with: `rsvg-convert` (PNG), `iconutil` (.icns), `magick` (.ico)

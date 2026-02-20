# Rust Coding Conventions

## String Formatting

**Always use inline variable interpolation in format strings:**

```rust
println!("Hello {name}");
format!("Processing {block_number} at slot {slot}");
error!("Failed to load {path}: {error}");
```

Never use positional `{}` placeholders. Applies to all formatting macros: `println!`, `format!`, `info!`, `warn!`, `error!`, `debug!`, `trace!`, `panic!`, `assert!`, `write!`.

## Import Organization

All `use` statements in a single consolidated group at the top of each file. Never split imports mid-file or place inside functions.

## Git Rules

- **Never** `git add -A` or `git add .` — stage files explicitly or use `git add -u`
- Run `cargo +nightly fmt --all && cargo clippy` before committing
- **babylonlabs-io repos** (only if `~/.ssh/yubikey-primary.pub` exists): `git -c user.signingkey=~/.ssh/yubikey-primary.pub commit -S -m "message"`
- **All other repos** (or no yubikey): `git -c commit.gpgsign=false commit -m "message"`
- Confirm strategy before multi-step git operations (rebase vs merge, cherry-pick vs manual port)
- Never force push unless explicitly requested; prefer `--force-with-lease`

## Design Principles

- Prefer the simplest possible solution first
- Do NOT introduce traits, closures, generics, or architectural patterns unless explicitly requested
- Default to simple free functions rather than methods on structs
- If multiple approaches exist, ask which one the user prefers

## Code Editing

- Confirm you are editing the correct file in multi-crate workspaces before making changes
- When the user specifies placement, implement exactly there — do not relocate

## Progress Tracking

- Use TaskCreate to break multi-step tasks into subtasks
- Update task status as work progresses (pending → in_progress → completed)

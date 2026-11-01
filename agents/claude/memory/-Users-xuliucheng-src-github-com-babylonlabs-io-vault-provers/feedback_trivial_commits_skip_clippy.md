---
name: Skip clippy for trivial changes
description: For trivial one-line changes (log level tweak, comment fix, rename), skip cargo clippy pre-commit and go straight to staging + signing + push
type: feedback
originSessionId: 2ee2c322-6614-44c0-a7c4-734e911fed01
---
For trivially simple changes — single-line log-level tweaks, comment fixes, string literal edits, pure renames — skip the `cargo +nightly fmt --all && cargo clippy` pre-commit dance and go straight to staging, signing, and pushing.

**Why:** User feedback after I ran fmt-check + clippy on a one-line `debug!` → `trace!` downgrade. User interrupted with "this is deadly simple change, just commit and push". The pre-commit rule in `~/.claude/CLAUDE.md` exists to catch real issues; on changes that can't plausibly break fmt or lint (a log macro name swap, a comment), running the full toolchain is just friction.

**How to apply:**
- Single-line, single-file, non-code-logic changes → skip fmt/clippy, commit and push directly.
- Multi-line changes, new functions, type changes, any touched logic → run the pre-commit checks as normal.
- When in doubt on the boundary, ask the user rather than guessing.
- Still use YubiKey signing on babylonlabs-io repos; still stage explicitly (no `git add -A`); still `git push origin <branch>` explicitly in worktrees.

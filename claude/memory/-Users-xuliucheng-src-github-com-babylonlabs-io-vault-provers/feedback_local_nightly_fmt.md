---
name: Local nightly rustfmt requires bypassing rust-toolchain.toml
description: cargo fmt always runs stable rustfmt locally because rust-toolchain.toml pins to 1.94 — must invoke rustfmt directly to match CI
type: feedback
originSessionId: d7b52b96-317e-416d-8760-b142192cd145
---
In this repo, the project pins `rust-toolchain.toml` to stable 1.94, but `rustfmt.toml` uses **nightly-only options** like `imports_granularity = Module` and `group_imports`. CI uses `cargo +nightly fmt --all -- --check`, but every local invocation silently runs **stable rustfmt** regardless of:

- `cargo +nightly fmt`
- `RUSTUP_TOOLCHAIN=nightly cargo fmt`
- `rustup run nightly cargo fmt`
- `~/.cargo/bin/cargo +nightly fmt`

**Why:** `cargo fmt` resolves the toolchain through `rust-toolchain.toml` first; the env var / `+toolchain` proxy gets overridden by the project file.

**The tell:** Warnings like `Warning: can't set 'imports_granularity = Module', unstable features are only available in nightly channel.` appear in the output. If you see those, you're running stable rustfmt — your local "clean" status is meaningless against CI.

**The fix:** Invoke `rustfmt` directly via the nightly toolchain (skip cargo entirely):

```bash
git diff main --name-only -- '*.rs' | xargs rustup run nightly rustfmt \
  --edition 2024 --config-path rustfmt.toml
```

Add `--check` to verify without modifying. This actually applies the unstable rules and matches CI's behavior.

**How to apply:** Before pushing any branch on this repo, run the diff-scoped nightly rustfmt command above. Don't trust `cargo fmt`'s exit code on this repo — it's a false-clean signal. The same trap applies to any project that has nightly-only options in `rustfmt.toml` while pinning a stable channel in `rust-toolchain.toml`.

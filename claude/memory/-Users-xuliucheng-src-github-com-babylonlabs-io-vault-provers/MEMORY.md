# Vault-Provers Memory

## Git Commit Signing — CHECK REPO BEFORE SIGNING

**Always check which repo you're committing to before choosing the signing method:**
- **babylonlabs-io repos** (and only if `~/.ssh/yubikey-primary.pub` exists): `git -c user.signingkey=~/.ssh/yubikey-primary.pub commit -S`
- **All other repos** (including ~/.dotfiles, personal projects, etc.): `git -c commit.gpgsign=false commit`

## YubiKey SSH Signing Setup

- User has ONE YubiKey (was previously labeled "Backup" in config)
- Key fingerprint: `SHA256:gc28a8jTqX+ChmlrNOA225Q4XiHSjQmZmHCfL1YNWw4`
- Key files: `~/.ssh/yubikey-primary` and `~/.ssh/yubikey-primary.pub`
- Old stale keys backed up as `~/.ssh/yubikey-primary.old`
- `gpg.ssh.program` = `~/.local/bin/ssh-keygen-no-agent` (wrapper for non-interactive PIN via osascript)
- Homebrew's `ssh-sk-helper` path: `/opt/homebrew/Cellar/openssh/10.2p1/libexec/ssh-sk-helper`
- Symlinked to `/opt/homebrew/libexec/ssh-sk-helper`
- Signing requires interactive PIN + touch — cannot be done from Claude, user must run in their terminal
- `ssh-keygen -Y sign` needs correct `ssh-sk-helper` linked against `libfido2`; system `/usr/libexec/ssh-sk-helper` does NOT work
- If `FIDO_ERR_NO_CREDENTIALS`: key files don't match the credential on the YubiKey — re-download with `ssh-keygen -K`

## Git Worktrees

- Main repo: `/Users/xuliucheng/src/github.com/babylonlabs-io/vault-provers` (main)
- All worktrees cleaned up on 2026-03-13 during M5 Max migration prep

- [No PR review comments without approval](feedback_no_review_comments.md) — never post review comments on PRs without explicit user approval
- [Positional {} is acceptable](feedback_positional_format.md) — don't flag positional `{}` in format strings as issues
- [No FTE in planning docs](feedback_no_fte_in_planning_docs.md) — omit bandwidth/FTE/engineer-days from shared audit/spec/roadmap artifacts
- [vault_id is unique per pegin](project_vault_id_per_pegin.md) — protocol invariant; explains why event circuit safely ignores peginTxHash
- [Skip clippy for trivial commits](feedback_trivial_commits_skip_clippy.md) — for one-line log/comment/rename changes, commit & push without the fmt/clippy dance
- [Iterative review inflation in plans](feedback_iterative_review_inflation.md) — when iterative Codex cycles bloat a plan past ~250 lines, restructure into main + appendices instead of inlining more mitigations
- [No archaeology comments in code](feedback_no_archaeology_comments.md) — never write comments that explain what was previously there or how the code differs from a prior version
- [Use permalinks for external source references](feedback_permalinks_for_external_refs.md) — cite external repos with versioned GitHub permalinks, not bare `path/file.rs` references
- [Never pipe YubiKey-signed commits](feedback_yubikey_no_pipe_on_commit.md) — `git commit -S | tail` hangs on the SSH_ASKPASS dialog; run bare
- [No back-compat for migrations](feedback_no_backcompat.md) — default to hard breaks; never propose deprecation periods, lenient parsing of removed fields, or transitional shims
- [Iterative plan reviews are review-only](feedback_review_only_no_edits.md) — surface findings and suggested wording; do not apply edits to the plan file unless the user explicitly says to
- [User posts review replies](feedback_user_posts_review_replies.md) — draft reply text and show it; don't post via `gh api` (in_reply_to id mistakes + TLS timeouts)
- [YubiKey-SK signing error decoding](feedback_yubikey_error_decoding.md) — "incorrect passphrase" / "invalid format" on YubiKey-signed commits = tap timed out, not PIN/key issue
- [Local nightly rustfmt bypass](feedback_local_nightly_fmt.md) — `cargo fmt` silently runs stable rustfmt due to `rust-toolchain.toml` pin; invoke `rustup run nightly rustfmt --edition 2024 --config-path rustfmt.toml` directly to match CI
- [New worktree per fix](feedback_new_worktree_per_fix.md) — always `git worktree add .claude/worktrees/<branch>` before starting any fix branch; never edit main checkout directly
- [User hardware](user_hardware.md) — primary machine is Apple M5 Pro, 64 GB unified memory (sets RAM budget for builds and local LLMs)
- [SP1 vk-identity tests need outer prove](feedback_sp1_vk_identity_needs_outer_prove.md) — `verify_sp1_proof`'s VK check fires only at the recursion layer; mock-mode and `execute()` cannot exercise it
- [Versioning model: service vs circuit](project_versioning_model.md) — service release version (git tag / `--version`) and `CircuitVersion` are independent; bump only `service/` on release; auth rotation doesn't bump `CircuitVersion`
- [Impl plan before coding](feedback_impl_plan_before_coding.md) — even when told to "start" a task/spike, produce an implementation plan first; only code after approval
- [Anchor on user scratch](feedback_anchor_on_user_scratch.md) — base plans on the user's existing design notes (e.g. vault-provers/system.md); flag any deviation explicitly, never silently redesign
- [btc-authz-db schema in PR](project_db_schema_in_pr.md) — ship a human-readable schema *description* (field tables, not SQL DDL) in the db PR as an anti-vaultd example; reverses any "no schema" direction
- [Prover-service trust model](project_prover_service_trust_model.md) — trusted by vaultd, self-hosted localhost default, optional Babylon shared GPU prover behind permissioned perimeter; re-scope unauthenticated-DoS audit findings against it
- [vault-contracts generic core](project_vault_contracts_generic_core.md) — app-agnostic core (BTCVaultRegistry/ApplicationRegistry) + pluggable apps (Aave, Morpho) via IApplicationEntryPoint; vaultBTC is app-side; prover proves a core event so it's app-agnostic too
- [vaultBTC is not fungible](project_vaultbtc_not_fungible.md) — transfer-restricted ERC-20 (no direct EOA transfers); backing has per-vault identity, so uniqueness invariants are valid — don't assume fungibility
- [CHANGELOG entries are one-line](feedback_changelog_one_line.md) — `* [#N](url) Verb-phrase; fixes Sherlock #M.` — never multi-sentence; corrected twice (#430, #174)
- [Global TODO file](feedback_global_todo_file.md) — personal TODOs live in ~/.claude/TODO.md; read on demand, append observed follow-ups

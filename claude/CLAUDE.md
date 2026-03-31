# Development Rules

## Approach Guidelines
- Do NOT over-engineer solutions. Prefer simple, minimal implementations first. Avoid full e2e tests when a focused unit test suffices.
- When the user corrects your framing or approach, fully reset — don't try to salvage the wrong direction.
- Never amend commits on main. Always create separate commits for fixes.

## Rust Conventions

### String Formatting

**Always use inline variable interpolation in format strings:**

```rust
println!("Hello {name}");
format!("Processing {block_number} at slot {slot}");
error!("Failed to load {path}: {error}");
```

Never use positional `{}` placeholders. Applies to all formatting macros: `println!`, `format!`, `info!`, `warn!`, `error!`, `debug!`, `trace!`, `panic!`, `assert!`, `write!`.

### Import Organization

All `use` statements in a single consolidated group at the top of each file. Never split imports mid-file or place inside functions.

### Checked Arithmetic

Always use checked arithmetic for value operations:

```rust
let result = value.checked_add(amount).ok_or(Error::Overflow)?;
let difference = total.checked_sub(fee).ok_or(Error::InsufficientFunds)?;
```

Never use bare `+`, `-`, `*` for value-related operations.

## Git Rules

- **Never** `git add -A` or `git add .` — stage files explicitly or use `git add -u`
- Run `cargo +nightly fmt --all && cargo clippy` before committing
- **babylonlabs-io repos** (YubiKey signing required):
  - **macOS (local YubiKey):** `SSH_ASKPASS="$HOME/.local/bin/ssh-askpass" SSH_ASKPASS_REQUIRE=force git -c gpg.format=ssh -c user.signingkey=~/.ssh/yubikey-primary.pub commit -S -m "message"`. The osascript askpass wrapper shows a macOS dialog for PIN input. Always set `SSH_ASKPASS` and `SSH_ASKPASS_REQUIRE=force` env vars, and pass `-c gpg.format=ssh` to git. Run the signing command directly via Bash — do NOT tell the user to run it in their terminal.
  - **Linux (remote YubiKey):** Just use `git commit -S -m "message"`. Signing is auto-configured via `~/.gitconfig` `includeIf` → `~/.gitconfig-babylonlabs` (sets `gpg.ssh.program` to `~/.claude/scripts/remote-ssh-sign`, symlinked from `~/.local/bin/`). The proxy SSHs to the Mac and signs there. A PIN dialog appears on the Mac and the user must tap the YubiKey.
- **All other repos**: always use `git -c commit.gpgsign=false commit -m "message"` — never use `-S` or signing flags outside babylonlabs-io
- Confirm strategy before multi-step git operations (rebase vs merge, cherry-pick vs manual port)
- Never force push unless explicitly requested; prefer `--force-with-lease`
- **Git worktrees:** `gh` CLI cannot operate inside worktrees (the `.git` file is a text pointer, not a directory). Use `--repo owner/repo` to bypass local git discovery, e.g. `gh pr create --repo babylonlabs-io/vault-provers --head branch-name ...`
- **Push in worktrees:** Always use `git push origin <branch-name>` explicitly. Bare `git push` defaults to the main repo's branch, not the worktree's branch.
- **Worktree location:** Always create worktrees at `<repo>/.claude/worktrees/<branch-name>` using:
  `git worktree add .claude/worktrees/<branch-name> -b <branch-name>`
  Never create worktrees in sibling directories (e.g., `../repo-wt/`).

## Planning vs Implementation

- When asked to plan, **ONLY plan**. Do NOT start implementing until explicitly told to begin coding.
- Planning and implementation are separate phases. Never combine them.
- Proactively enter plan mode for non-trivial tasks (3+ steps or architectural decisions).
- If an approach goes sideways mid-implementation, **STOP and re-plan** — don't keep pushing a broken approach.

## Verification & Debugging

- Never mark a task complete without proving it works (tests pass, clippy clean, build succeeds).
- Always identify the root cause before applying a fix — no blind patching or temporary workarounds.
- Be able to clearly answer **why** the bug occurred before proposing a solution.
- During investigation, only surface findings directly relevant to the decision at hand — skip noise.

## Subagents

- Use subagents to keep the main context window clean — offload research, exploration, and parallel analysis.
- One focused task per subagent for best results.

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

## GitHub PR Comments

- **Never post PR review comments without explicit user approval.** Always show the comment content and ask before posting.
- When responding to PR review comments, **reply in the comment thread** (use `gh api repos/{owner}/{repo}/pulls/comments/{comment_id}/replies`) — never as a top-level PR comment.

## Scratch Notes

- When creating analysis documents, specs, design notes, or any scratch `.md` files, always place them in a `notes/` directory at the repo root (create it if it doesn't exist).
- Never create loose `.md` files in the repo root — only `CLAUDE.md`, `README.md`, and other standard project files belong there.
- `notes/` is globally gitignored, so these files won't pollute `git status`.

## Research

- When producing research or analysis docs, **validate every factual claim** against a primary source (official docs, on-chain data, GitHub repos, post-mortems). Do not rely on training data alone.
- Include source links for every non-trivial claim. Prefer primary sources (contract addresses on Etherscan, GitHub commits, official forum posts) over secondary summaries.
- If a claim cannot be validated, explicitly mark it as unverified rather than presenting it as fact.
- When citing contract addresses or transaction hashes, verify they exist on-chain before including them.
- Place research documents in `notes/` (see Scratch Notes) or in dedicated directories if they'll be committed (e.g., `poc/`, `docs/`).

## General Rules

- When corrected or given a different fix direction, **fully revert the previous attempt** before implementing the new approach. Do not try to partially preserve the old approach.

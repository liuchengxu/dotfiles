# Global Rust Coding Conventions

This document defines coding conventions for all Rust projects, based on btc-vault contributing guidelines.

## Code Style

### Formatting and Linting

All code must pass:
- `cargo +nightly fmt --all` with zero changes
- `cargo clippy` with zero warnings

Follow standard Rust code style with clarifications in `rustfmt.toml` (if present). This applies to library code, applications, examples, and tests.

### String Formatting - IMPORTANT

**Always use inline variable interpolation in format strings:**

✅ **Correct:**
```rust
println!("Hello {name}");
info!("Processing block {block_number} at slot {slot}");
error!("Failed to load file {path}: {error}");
debug!("Value: {value:#?}");
format!("Result: {result}");
```

❌ **Incorrect:**
```rust
println!("Hello {}", name);
info!("Processing block {} at slot {}", block_number, slot);
error!("Failed to load file {}: {}", path, error);
```

**Applies to all formatting macros:**
- `println!()`, `print!()`
- `format!()`
- `info!()`, `warn!()`, `error!()`, `debug!()`, `trace!()`
- `panic!()`, `assert!()`, `assert_eq!()`
- `write!()`, `writeln!()`

### Import Organization

**All `use` statements must appear in a single consolidated group at the top of each Rust file.**

✅ **Correct:**
```rust
use std::path::Path;
use std::fs::File;
use anyhow::Result;
use serde::{Serialize, Deserialize};
use tracing::info;
use crate::provers::generate_proof;
use super::utils;

fn my_function() {
    // Function code here
}
```

❌ **Incorrect:**
```rust
use std::path::Path;

fn my_function() {
    use std::fs::File;  // NEVER import within functions
    // ...
}

use anyhow::Result;  // NEVER split imports
```

**Do NOT:**
- Split imports into multiple sections mid-file
- Place imports inside functions
- Place imports mid-file

**Exception:** Only use non-top-level imports for conditional compilation or other strong technical reasons.

### Unsafe Code

**Avoid using `unsafe` unless absolutely necessary.**

When `unsafe` is required:
- Include clear and thorough `// SAFETY:` comments
- Reference invariants, memory guarantees, or compiler behavior
- Expect extra scrutiny in code review

```rust
// SAFETY: This pointer is guaranteed to be valid because the buffer is allocated
// with sufficient capacity and the index is bounds-checked above.
unsafe { *ptr.add(index) = value }
```

**Prefer safe abstractions:**
- Use `Box::new_uninit().assume_init()` instead of `std::mem::zeroed()` for types that don't permit zero-initialization
- Use `MaybeUninit` for uninitialized memory
- Avoid raw pointers when references suffice

### Checked Arithmetic

**Always use checked arithmetic methods for value-related operations.**

This prevents critical errors such as producing negative output values that can lead to invalid transactions.

✅ **Correct:**
```rust
let result = value.checked_add(amount)
    .ok_or(Error::Overflow)?;

let difference = total.checked_sub(fee)
    .ok_or(Error::InsufficientFunds)?;

let product = price.checked_mul(quantity)
    .ok_or(Error::Overflow)?;
```

❌ **Incorrect:**
```rust
let result = value + amount;  // Can panic or overflow
let difference = total - fee;
let product = price * quantity;
```

### Code Clarity

**Always prefer obvious code over clever code.**

Write idiomatic Rust that is easy to understand and maintain.

### Error Handling

**Minimize use of `.unwrap()`.**

Use `.expect()` only when:
- You can convince reviewers it will never panic, OR
- Panicking is explicitly justified behavior

The correctness of `.expect()` must be evident from:
- Local context (for standalone functions), OR
- Data structure invariants (for internal methods)

If correctness cannot be guaranteed, use `Result<T, E>`.

✅ **Good:**
```rust
// Correctness is obvious from context
let config = Config::default();
let value = config.required_field.expect("Config::default always sets required_field");

// Better: use Result when not guaranteed
fn load_config(path: &Path) -> Result<Config, Error> {
    let contents = fs::read_to_string(path)?;
    parse_config(&contents)
}
```

❌ **Avoid:**
```rust
let value = some_option.unwrap();  // Why is this safe?
let result = risky_operation().expect("should work");  // Vague reasoning
```

### TODOs and Known Issues

If code is incomplete or has known issues:
- Add a `TODO` comment explaining what remains
- For significant issues, open a GitHub issue and reference it

```rust
// TODO: Handle edge case when block height exceeds u32::MAX
// See issue #123
```

### Variable Naming

**Prefer longer, descriptive variable names.**

Short names (1-3 characters) are discouraged except:
- `id` for entity identifiers
- `i`, `j` for simple loop counters
- Test code (where shorter names improve readability)

✅ **Good:**
```rust
let transaction_hash = compute_hash(&tx);
let block_height = get_latest_height();
let proving_key = load_key(&path)?;
```

❌ **Avoid:**
```rust
let h = compute_hash(&tx);  // What is h?
let bh = get_latest_height();  // Unclear abbreviation
let pk = load_key(&path)?;  // Too short
```

### Cargo.toml Dependencies

**Keep dependencies sorted alphabetically.**

Adding dependencies out of order introduces unnecessary entropy.

```toml
[dependencies]
anyhow = "1.0"
serde = "1.0"
tokio = { version = "1.0", features = ["full"] }
tracing = "0.1"
```

### Follow Existing Conventions

Pay attention to existing code structure and conventions in the project. When in doubt, follow the existing code style and do your best.

## Documentation

### Public APIs

**All `pub` items must have doc-comments.**

This improves auto-generated documentation via `rustdoc` and enhances the experience for library users.

```rust
/// Generates a compressed proof using SP1.
///
/// # Arguments
///
/// * `prover` - The SP1 prover instance
/// * `pkey` - The proving key for the circuit
/// * `stdin` - Input data for the proof
///
/// # Returns
///
/// Returns the proof with public values and generation time in seconds.
///
/// # Errors
///
/// Returns `ProverError::GenerateProof` if proof generation fails.
pub fn generate_compressed_proof(
    prover: &EnvProver,
    pkey: &SP1ProvingKey,
    stdin: &SP1Stdin,
) -> Result<(SP1ProofWithPublicValues, u64), ProverError>
```

### Module Documentation

Public modules and crates should begin with doc-comments explaining:
- Their purpose
- How they fit into the larger system
- Where readers should look next

```rust
//! Proof generation and verification utilities.
//!
//! This module provides functions for generating zero-knowledge proofs
//! using the SP1 zkVM. For usage examples, see the `examples/` directory.
```

## Commits

**Make each commit meaningful and self-contained.**

Think of commits as a story: small, logical steps that build to the full picture.

For non-trivial changes:
- Organize commits so reviewers can follow your thought process
- Use squashing, rebasing, and reordering to refine commits
- Each commit should ideally build and pass tests

A clean commit history helps reviewers but takes practice — it's encouraged, not strictly required.

### Git Staging Rules

**NEVER use `git add -A` or `git add .` - only stage modified files explicitly.**

✅ **Correct:**
```bash
# Stage specific modified files
git add src/file1.rs src/file2.rs

# Or stage all tracked files with updates
git add -u
```

❌ **Incorrect:**
```bash
git add -A     # NEVER - adds untracked files
git add .      # NEVER - adds untracked files
```

**Rationale:** Only commit files that are part of your changes. Untracked files (new documentation drafts, config files, etc.) should not be accidentally committed.

### Commit Signing

**All commits MUST be signed with the SSH signing key.**

Git is configured to use SSH signing:
```bash
git config gpg.format ssh
git config user.signingkey ~/.ssh/id_ed25519.pub
git config commit.gpgsign true
```

When committing, always use the `-S` flag to ensure signing:
```bash
git commit -S -m "commit message"
```

To re-sign existing commits on a branch:
```bash
git rebase --exec "git commit --amend --no-edit -S" origin/main
```

### Before Committing

**Always run these commands before committing:**

```bash
cargo +nightly fmt --all
cargo clippy
```

Both must complete with zero warnings or changes.

### Commit Signing

**All commits must be signed using SSH.**

The git configuration for SSH signing is already set up:
```bash
git config gpg.format ssh
git config user.signingkey ~/.ssh/id_ed25519.pub
git config commit.gpgsign true
```

When committing, git will automatically sign with the SSH key. If commits need to be re-signed (e.g., after rebase):
```bash
git rebase --exec 'git commit --amend --no-edit -S' origin/main
git push --force-with-lease
```

**Note:** The SSH key at `~/.ssh/id_ed25519.pub` is registered on GitHub as both an authentication key and a signing key.

## Pull Requests

### Testing

**Every PR must pass the entire test suite before merging.**

The PR author is responsible for:
- Keeping the PR updated
- Requesting reviews
- Making necessary improvements
- Ensuring tests pass

Stale PRs may be closed.

### PR Organization

**Submit refactorings as standalone PRs.**

Build on them in follow-up PRs. This keeps each PR focused and easier to review.

**Avoid mixing unrelated changes:**
- Don't add dependencies in one PR that are only used in a later PR
- Don't combine feature additions with refactoring
- Keep each PR focused on a single concern

### Additional Guidelines

Follow the Babylon project's PR rules: https://github.com/babylonlabs-io/babylon/blob/main/CONTRIBUTING.md#pull-request-rules

## Additional Rust Best Practices

### Pattern Matching

Prefer exhaustive matching:
```rust
match proof_type {
    ProofType::Compressed => handle_compressed(),
    ProofType::Groth16 => handle_groth16(),
    ProofType::Mock => handle_mock(),
}
```

Avoid catch-all `_` unless truly needed.

### Borrowing vs Cloning

Prefer borrowing over cloning:
```rust
// Good
fn process_data(data: &[u8]) { }

// Avoid unless necessary
fn process_data(data: Vec<u8>) { }
```

### String Types

- Use `&str` for string slices
- Use `String` for owned strings

```rust
fn format_message(prefix: &str, suffix: &str) -> String {
    format!("{prefix}: {suffix}")
}
```

### Error Propagation

Use `?` operator for clean error propagation:
```rust
fn load_and_process(path: &Path) -> Result<Data> {
    let file = File::open(path)?;
    let data = parse_file(file)?;
    Ok(data)
}
```

## Code of Conduct

All contributors are expected to maintain a respectful and professional attitude toward each other.

## GitHub CLI (`gh`) on This Machine

**IMPORTANT:** Due to the git repository being on a mounted filesystem (`/mnt/Zhitai0/...`), the `gh` CLI cannot auto-detect the repository. **Always use the `--repo` flag explicitly.**

```bash
# ✅ Correct - always use --repo flag
gh pr view 582 --repo babylonlabs-io/btc-vault
gh pr edit 582 --repo babylonlabs-io/btc-vault --body "..."
gh pr create --repo babylonlabs-io/btc-vault --title "..." --body "..."

# ❌ Wrong - will fail with "not a git repository" error
gh pr view 582
gh pr edit 582 --body "..."
```

**For btc-vault repository:** Use `--repo babylonlabs-io/btc-vault`

## Commit Attribution

**Do NOT add any attribution to commits or PRs.** The `settings.json` has `"attribution": {"commit": "", "pr": ""}` which means:
- No "Generated with Claude Code" lines
- No "Co-Authored-By: Claude" lines
- Just plain commit messages with the actual content

## Notes for Claude Code

When writing or modifying Rust code:
1. **Always** use inline variable interpolation in format strings
2. **Always** keep imports in a single group at the top
3. **Always** use checked arithmetic for value operations
4. **Always** document public APIs
5. **Always** run `cargo +nightly fmt --all` before committing
6. **Always** sign commits with `-S` flag (SSH signing is configured)
7. **Avoid** `unsafe` unless absolutely necessary
8. **Avoid** `.unwrap()` - prefer `.expect()` with clear reasoning or `Result`
9. **Prefer** obvious code over clever code
10. Run `cargo clippy` and fix all warnings before committing
11. Follow existing code conventions in the project

When committing:
- **Always** sign commits with SSH (git is configured with `commit.gpgsign true`)
- If commits need re-signing after rebase: `git rebase --exec 'git commit --amend --no-edit -S' origin/main`

When using GitHub CLI:
- **Always** use `--repo babylonlabs-io/btc-vault` flag for `gh` commands on this machine

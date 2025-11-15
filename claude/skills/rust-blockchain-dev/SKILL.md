---
name: rust-blockchain-dev
description: Rust and blockchain development conventions including formatting (inline string interpolation), imports organization, checked arithmetic, error handling, unsafe code patterns, and documentation. Use for any Rust code or blockchain project work.
---

# Rust & Blockchain Development Guidelines

This skill provides comprehensive Rust development best practices with emphasis on blockchain development patterns. It auto-activates when working on Rust files or discussing Rust/blockchain topics.

## Quick Reference Checklist

When writing Rust code, always:

1. ✅ **Use inline string interpolation**: `format!("{name}")` not `format!("{}", name)`
2. ✅ **Consolidate imports at file top**: All `use` statements in single group
3. ✅ **Use checked arithmetic**: `value.checked_add()` not `value + amount`
4. ✅ **Avoid `.unwrap()`**: Use `.expect()` with clear reasoning or `Result<T, E>`
5. ✅ **Document all `pub` items**: Add doc-comments for public APIs
6. ✅ **Add `// SAFETY:` comments**: Required for all `unsafe` blocks
7. ✅ **Run before commit**: `cargo +nightly fmt --all` and `cargo clippy`
8. ✅ **Prefer obvious over clever**: Write idiomatic, maintainable Rust
9. ✅ **Keep dependencies sorted**: Alphabetize `[dependencies]` in Cargo.toml
10. ✅ **Meaningful commits**: Self-contained, logical commit history

## When This Skill Activates

This skill automatically activates when:

- Working on files matching `**/*.rs` or `**/Cargo.toml`
- Discussing Rust topics (cargo, clippy, rustfmt, traits, async)
- Implementing blockchain features (consensus, transactions, state machines)
- Fixing Rust compilation errors (borrow checker, lifetimes, traits)
- Adding dependencies or managing workspace structure

## Navigation Guide

For detailed guidance on specific topics, see:

| Topic | Resource File |
|-------|--------------|
| **Code Style & Formatting** | [reference.md](reference.md) - String formatting, imports, unsafe, arithmetic |
| **Working Examples** | [examples.md](examples.md) - Correct patterns with explanations |
| **Common Mistakes** | [anti-patterns.md](anti-patterns.md) - What to avoid and why |
| **Validation Scripts** | [scripts/](scripts/) - Automated checking tools |

## Critical Anti-Patterns (❌ NEVER)

**String Formatting**:
```rust
// ❌ NEVER use positional arguments
println!("Hello {}", name);
format!("Value: {}", value);

// ✅ ALWAYS use inline interpolation
println!("Hello {name}");
format!("Value: {value}");
```

**Import Organization**:
```rust
// ❌ NEVER split imports
use std::path::Path;

fn my_function() {
    use std::fs::File;  // NEVER import within functions
}

// ✅ ALWAYS consolidate at top
use std::path::Path;
use std::fs::File;

fn my_function() { }
```

**Arithmetic Operations**:
```rust
// ❌ NEVER use unchecked arithmetic for values
let result = value + amount;  // Can panic or overflow

// ✅ ALWAYS use checked arithmetic
let result = value.checked_add(amount)
    .ok_or(Error::Overflow)?;
```

**Error Handling**:
```rust
// ❌ AVOID unwrap without justification
let value = some_option.unwrap();

// ✅ PREFER expect with reasoning or Result
let value = some_option.expect("Config::default always sets field");
// OR better:
fn load() -> Result<Config, Error> {
    let value = some_option.ok_or(Error::MissingField)?;
    Ok(Config { value })
}
```

**Unsafe Code**:
```rust
// ❌ NEVER use unsafe without SAFETY comments
unsafe { *ptr.add(index) = value }

// ✅ ALWAYS document invariants
// SAFETY: This pointer is guaranteed to be valid because the buffer is allocated
// with sufficient capacity and the index is bounds-checked above.
unsafe { *ptr.add(index) = value }
```

**Comments**:
```rust
// ❌ NEVER write comments that merely echo the code
// Increment counter by 1
counter += 1;

// Set the value to true
is_valid = true;

// ✅ ONLY write comments that explain WHY or provide context
// Reset counter after consensus round completes
counter = 0;

// Mark as valid once signature verification passes
is_valid = verify_signature(msg, sig);
```

## Blockchain-Specific Patterns

When working on blockchain code:

- **Consensus logic**: Ensure determinism, handle all edge cases
- **State transitions**: Validate all inputs, prevent invalid states
- **Cryptography**: Use audited libraries, document security assumptions
- **Economic models**: Consider attack incentives, verify game theory
- **Performance**: Benchmark critical paths, optimize database queries

## Validation Tools

Use the provided scripts in `scripts/`:

- `check-fmt.sh` - Verify code formatting
- `check-clippy.sh` - Run clippy lints
- `validate-deps.sh` - Check Cargo.toml dependency ordering

## Pre-Commit Checklist

Before committing Rust code:

```bash
# Format code
cargo +nightly fmt --all

# Check for warnings
cargo clippy -- -D warnings

# Run tests
cargo test --workspace

# Verify builds
cargo build --workspace --all-features
```

Both formatting and clippy must complete with zero warnings or changes.

## Additional Resources

For comprehensive details, progressive disclosure resources are available:

- **[reference.md](reference.md)**: Deep dive into formatting rules, import organization, unsafe code guidelines, checked arithmetic patterns, error handling best practices
- **[examples.md](examples.md)**: Working code samples demonstrating correct patterns
- **[anti-patterns.md](anti-patterns.md)**: Common mistakes with explanations and fixes

---

*This skill follows Anthropic's best practices for progressive disclosure. The main SKILL.md provides quick reference while detailed resources load on-demand to optimize context usage.*

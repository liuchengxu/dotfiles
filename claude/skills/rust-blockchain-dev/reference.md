# Rust Development Reference Guide

This document provides detailed explanations of Rust coding conventions extracted from the global CLAUDE.md guidelines.

## Table of Contents

1. [String Formatting](#string-formatting)
2. [Import Organization](#import-organization)
3. [Unsafe Code](#unsafe-code)
4. [Checked Arithmetic](#checked-arithmetic)
5. [Error Handling](#error-handling)
6. [Code Clarity](#code-clarity)
7. [Variable Naming](#variable-naming)
8. [Documentation](#documentation)

---

## String Formatting

### Core Principle

**Always use inline variable interpolation in format strings.**

This applies to ALL formatting macros:
- `println!()`, `print!()`
- `format!()`
- `info!()`, `warn!()`, `error!()`, `debug!()`, `trace!()`
- `panic!()`, `assert!()`, `assert_eq!()`
- `write!()`, `writeln!()`

### Correct Patterns

```rust
println!("Hello {name}");
info!("Processing block {block_number} at slot {slot}");
error!("Failed to load file {path}: {error}");
debug!("Value: {value:#?}");
format!("Result: {result}");
```

### Incorrect Patterns

```rust
// ❌ NEVER use positional arguments
println!("Hello {}", name);
info!("Processing block {} at slot {}", block_number, slot);
error!("Failed to load file {}: {}", path, error);
```

### Why This Matters

1. **Readability**: Inline interpolation makes it immediately clear what values are being formatted
2. **Maintainability**: No need to count positional arguments
3. **Refactoring**: Easier to reorder or modify format strings
4. **Modern Rust**: This is the idiomatic way since Rust 1.58

### Advanced Formatting

```rust
// Debug formatting
println!("Debug: {value:?}");
println!("Pretty debug: {value:#?}");

// Padding and alignment
println!("Padded: {value:10}");
println!("Left aligned: {value:<10}");
println!("Right aligned: {value:>10}");

// Hex formatting
println!("Hex: {value:x}");
println!("Hex uppercase: {value:X}");

// Precision for floats
println!("Float: {value:.2}");
```

---

## Import Organization

### Core Principle

**All `use` statements must appear in a single consolidated group at the top of each Rust file.**

### Correct Structure

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

### Incorrect Patterns

```rust
// ❌ NEVER split imports into multiple sections
use std::path::Path;

fn my_function() {
    use std::fs::File;  // NEVER import within functions
    // ...
}

use anyhow::Result;  // NEVER place imports mid-file
```

### Organization Guidelines

While all imports should be at the top, it's good practice to group them logically:

```rust
// Standard library imports
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;

// External crate imports
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;

// Local crate imports
use crate::consensus::Engine;
use crate::network::PeerId;

// Relative imports
use super::utils::validate_signature;
```

### Exception

Only use non-top-level imports for:
- Conditional compilation (`#[cfg(...)]`)
- Strong technical reasons (document why)

```rust
// Acceptable exception
#[cfg(test)]
mod tests {
    use super::*;  // OK in test modules
}
```

---

## Unsafe Code

### Core Principle

**Avoid using `unsafe` unless absolutely necessary.**

When `unsafe` is required:
- Include clear and thorough `// SAFETY:` comments
- Reference invariants, memory guarantees, or compiler behavior
- Expect extra scrutiny in code review

### Correct Unsafe Usage

```rust
// SAFETY: This pointer is guaranteed to be valid because the buffer is allocated
// with sufficient capacity and the index is bounds-checked above.
unsafe { *ptr.add(index) = value }
```

### Safety Comment Structure

A good `// SAFETY:` comment should explain:

1. **Why the operation is safe**: What invariants guarantee safety?
2. **What could go wrong**: What would make this unsafe?
3. **How we prevent it**: What guarantees are in place?

```rust
// SAFETY:
// 1. The slice is non-empty (checked above with !slice.is_empty())
// 2. The pointer is aligned and points to initialized memory
// 3. No mutable references exist to this memory region
unsafe {
    let first = slice.get_unchecked(0);
    process(first);
}
```

### Prefer Safe Abstractions

```rust
// ❌ AVOID when safe alternatives exist
let value: MyStruct = unsafe { std::mem::zeroed() };

// ✅ PREFER safe abstractions
use std::mem::MaybeUninit;
let mut value = MaybeUninit::<MyStruct>::uninit();
// ... initialize fields ...
let value = unsafe { value.assume_init() };
```

### Common Safe Alternatives

- Use `Box::new_uninit().assume_init()` instead of `std::mem::zeroed()` for types that don't permit zero-initialization
- Use `MaybeUninit` for uninitialized memory
- Avoid raw pointers when references suffice
- Use safe abstractions from `std` or trusted crates

---

## Checked Arithmetic

### Core Principle

**Always use checked arithmetic methods for value-related operations.**

This prevents critical errors such as producing negative output values that can lead to invalid transactions or consensus failures.

### Correct Patterns

```rust
let result = value.checked_add(amount)
    .ok_or(Error::Overflow)?;

let difference = total.checked_sub(fee)
    .ok_or(Error::InsufficientFunds)?;

let product = price.checked_mul(quantity)
    .ok_or(Error::Overflow)?;

let quotient = numerator.checked_div(denominator)
    .ok_or(Error::DivisionByZero)?;
```

### Incorrect Patterns

```rust
// ❌ NEVER use unchecked arithmetic for values
let result = value + amount;      // Can panic or overflow
let difference = total - fee;     // Can underflow
let product = price * quantity;   // Can overflow
```

### When Checked Arithmetic is Critical

- **Financial calculations**: Token amounts, balances, fees
- **Consensus logic**: Block heights, slot numbers, validator counts
- **Resource limits**: Gas calculations, storage limits
- **Cryptographic operations**: Key generation, signature verification

### Performance Considerations

For performance-critical code where overflow is mathematically impossible:

```rust
// Document why overflow cannot occur
// NOTE: Array length is guaranteed < u32::MAX by construction,
// and loop iterations = array length, therefore i cannot overflow
for i in 0..array.len() {
    // Safe to use unchecked arithmetic here if needed
}
```

### Available Checked Methods

- `checked_add()` - Addition with overflow detection
- `checked_sub()` - Subtraction with underflow detection
- `checked_mul()` - Multiplication with overflow detection
- `checked_div()` - Division with zero-check
- `checked_rem()` - Remainder with zero-check
- `checked_pow()` - Exponentiation with overflow detection
- `checked_shl()` / `checked_shr()` - Bit shifts with overflow detection

### Saturating Arithmetic Alternative

For cases where saturation is acceptable:

```rust
// Saturates at numeric bounds instead of overflowing
let result = value.saturating_add(amount);
let clamped = value.saturating_sub(minimum);
```

---

## Error Handling

### Core Principle

**Minimize use of `.unwrap()`. Use `.expect()` only when you can convince reviewers it will never panic, OR panicking is explicitly justified behavior.**

### Decision Tree

```
Can this fail?
├─ No (provably impossible) ──→ Use .expect() with clear reasoning
├─ Yes (might fail) ──────────→ Use Result<T, E> and ? operator
└─ Maybe (unclear) ───────────→ Use Result<T, E> and ? operator
```

### Correct Patterns

```rust
// Good: Correctness is obvious from context
let config = Config::default();
let value = config.required_field.expect("Config::default always sets required_field");

// Better: Use Result when not guaranteed
fn load_config(path: &Path) -> Result<Config, Error> {
    let contents = fs::read_to_string(path)?;
    parse_config(&contents)
}

// Good: Panic is intentional for programming errors
fn get_validator(&self, index: usize) -> &Validator {
    self.validators.get(index)
        .expect("BUG: validator index out of bounds - this indicates a logic error")
}
```

### Incorrect Patterns

```rust
// ❌ AVOID: No explanation why this is safe
let value = some_option.unwrap();

// ❌ AVOID: Vague reasoning
let result = risky_operation().expect("should work");

// ❌ AVOID: Should be Result instead
fn parse_data(input: &str) -> Data {
    serde_json::from_str(input).unwrap()  // What if input is invalid?
}
```

### Correctness Criteria for .expect()

The correctness of `.expect()` must be evident from:

1. **Local context** (for standalone functions), OR
2. **Data structure invariants** (for internal methods)

```rust
// Local context makes it clear
let bytes = hex::decode("1234").expect("hard-coded hex string is valid");

// Data structure invariant
impl BlockStore {
    /// Invariant: self.genesis_hash is always set during construction
    fn genesis(&self) -> Hash {
        self.genesis_hash.expect("invariant: genesis_hash set in new()")
    }
}
```

### Error Propagation

Use the `?` operator for clean error propagation:

```rust
fn load_and_process(path: &Path) -> Result<Data, Error> {
    let file = File::open(path)?;
    let data = parse_file(file)?;
    validate_data(&data)?;
    Ok(data)
}
```

### Custom Error Types

Prefer specific error types over String:

```rust
// ❌ AVOID: Generic String errors
enum Error {
    IoError(String),
    ParseError(String),
    ValidationError(String),
}

// ✅ PREFER: Specific error information
enum Error {
    Io(std::io::Error),
    Parse { line: usize, column: usize, message: String },
    InvalidSignature { expected: PublicKey, actual: PublicKey },
}
```

---

## Code Clarity

### Core Principle

**Always prefer obvious code over clever code.**

Write idiomatic Rust that is easy to understand and maintain.

### Prefer Explicitness

```rust
// ❌ Clever but unclear
let result = data.iter().fold(0, |a, x| a + x.0 * x.1);

// ✅ Obvious and clear
let result: u64 = data.iter()
    .map(|(quantity, price)| quantity * price)
    .sum();
```

### Use Descriptive Types

```rust
// ❌ Unclear types
fn process(x: u64, y: u64) -> u64 { x + y }

// ✅ Clear intent with type aliases
type TokenAmount = u64;
type Fee = u64;

fn calculate_total(amount: TokenAmount, fee: Fee) -> TokenAmount {
    amount.saturating_add(fee)
}
```

### Pattern Matching

Prefer exhaustive matching:

```rust
// ✅ Exhaustive - compiler ensures all cases handled
match proof_type {
    ProofType::Compressed => handle_compressed(),
    ProofType::Groth16 => handle_groth16(),
    ProofType::Mock => handle_mock(),
}

// ❌ AVOID catch-all unless truly needed
match proof_type {
    ProofType::Compressed => handle_compressed(),
    _ => handle_default(),  // May miss new variants
}
```

---

## Variable Naming

### Core Principle

**Prefer longer, descriptive variable names.**

Short names (1-3 characters) are discouraged except:
- `id` for entity identifiers
- `i`, `j` for simple loop counters
- Test code (where shorter names improve readability)

### Correct Patterns

```rust
let transaction_hash = compute_hash(&tx);
let block_height = get_latest_height();
let proving_key = load_key(&path)?;
let validator_public_key = derive_key(&seed);
```

### Incorrect Patterns

```rust
// ❌ AVOID: Unclear abbreviations
let h = compute_hash(&tx);        // What is h?
let bh = get_latest_height();     // Block hash? Block height?
let pk = load_key(&path)?;        // Private key? Proving key? Public key?
```

### Acceptable Short Names

```rust
// ✅ Acceptable: Simple loop counter
for i in 0..validators.len() {
    process_validator(i);
}

// ✅ Acceptable: Well-known identifier
let id = generate_id();

// ✅ Acceptable: Test code
#[test]
fn test_addition() {
    let a = 5;
    let b = 3;
    assert_eq!(a + b, 8);
}
```

### Boolean Names

Use question words or affirmative phrases:

```rust
// ✅ Clear boolean names
let is_valid = verify_signature();
let has_permission = check_access();
let can_process = validate_state();
let should_retry = check_retry_condition();
```

---

## Documentation

### Core Principle

**All `pub` items must have doc-comments.**

This improves auto-generated documentation via `rustdoc` and enhances the experience for library users.

### Function Documentation

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
///
/// # Examples
///
/// ```
/// let (proof, duration) = generate_compressed_proof(&prover, &pkey, &stdin)?;
/// println!("Proof generated in {duration}s");
/// ```
pub fn generate_compressed_proof(
    prover: &EnvProver,
    pkey: &SP1ProvingKey,
    stdin: &SP1Stdin,
) -> Result<(SP1ProofWithPublicValues, u64), ProverError> {
    // Implementation
}
```

### Module Documentation

```rust
//! Proof generation and verification utilities.
//!
//! This module provides functions for generating zero-knowledge proofs
//! using the SP1 zkVM. For usage examples, see the `examples/` directory.
//!
//! # Architecture
//!
//! The proof generation pipeline follows these stages:
//! 1. Input preparation
//! 2. Witness generation
//! 3. Proof computation
//! 4. Verification
```

### Type Documentation

```rust
/// Represents a blockchain block header.
///
/// The header contains metadata about the block including its hash,
/// parent hash, timestamp, and validator signature.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct BlockHeader {
    /// The hash of this block
    pub hash: Hash,

    /// The hash of the parent block
    pub parent_hash: Hash,

    /// Unix timestamp when the block was created
    pub timestamp: u64,

    /// Signature from the block validator
    pub signature: Signature,
}
```

### Documentation Guidelines

- Start with a one-line summary
- Add detailed explanation if needed
- Document all parameters
- Document return values
- Document errors
- Add examples for complex APIs
- Link to related types/functions with backticks
- Use `///` for item docs, `//!` for module docs

---

## Additional Best Practices

### Borrowing vs Cloning

Prefer borrowing over cloning:

```rust
// ✅ Good: Borrow when possible
fn process_data(data: &[u8]) { }

// ❌ AVOID: Taking ownership unnecessarily
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

### Iterator Chains

Use iterators for data transformations:

```rust
let valid_transactions: Vec<_> = transactions
    .iter()
    .filter(|tx| tx.is_valid())
    .map(|tx| tx.hash())
    .collect();
```

---

*This reference document is part of the rust-blockchain-dev skill system. For working examples, see examples.md. For common mistakes to avoid, see anti-patterns.md.*

# Rust Development Anti-Patterns

This document catalogs common mistakes to avoid when writing Rust code, based on the user's specific pain points and the global CLAUDE.md guidelines.

## Table of Contents

1. [String Formatting Mistakes](#string-formatting-mistakes)
2. [Import Organization Errors](#import-organization-errors)
3. [Excessive Error Types](#excessive-error-types)
4. [Unhelpful Comments](#unhelpful-comments)
5. [Unsafe Code Misuse](#unsafe-code-misuse)
6. [Error Handling Anti-Patterns](#error-handling-anti-patterns)
7. [Naming Anti-Patterns](#naming-anti-patterns)
8. [Blockchain-Specific Anti-Patterns](#blockchain-specific-anti-patterns)

---

## String Formatting Mistakes

### ❌ Anti-Pattern: Positional Arguments

**Problem**: Using positional arguments makes code harder to read and maintain.

```rust
// ❌ BAD: Hard to match arguments to positions
println!("Processing block {} at slot {} with validator {}",
    block_number, slot, validator_id);

// What if you need to reorder? Have to count positions...
error!("Failed to load {} from {}: {}", resource, path, error);
```

**Why It's Bad**:
- Hard to see which value goes where
- Error-prone when reordering
- Difficult to review in diffs
- Not idiomatic modern Rust

### ✅ Correct Pattern

```rust
// ✅ GOOD: Clear and self-documenting
println!("Processing block {block_number} at slot {slot} with validator {validator_id}");

// Easy to read and maintain
error!("Failed to load {resource} from {path}: {error}");
```

---

## Import Organization Errors

### ❌ Anti-Pattern: Scattered Imports

**Problem**: Imports spread throughout the file make dependencies unclear.

```rust
// ❌ BAD: Imports scattered everywhere
use std::path::Path;

fn process_file(path: &Path) {
    use std::fs::File;  // Import inside function
    use std::io::Read;  // Another import

    // Function code...
}

// More imports mid-file
use serde::Serialize;

fn serialize_data(data: &Data) {
    // ...
}

use anyhow::Result;  // Even more imports

fn another_function() -> Result<()> {
    // ...
}
```

**Why It's Bad**:
- Hard to see all dependencies at a glance
- Breaks standard Rust conventions
- Makes refactoring difficult
- Confuses code organization

### ✅ Correct Pattern

```rust
// ✅ GOOD: All imports at the top, grouped logically
use std::fs::File;
use std::io::Read;
use std::path::Path;

use anyhow::Result;
use serde::Serialize;

fn process_file(path: &Path) {
    // Function code...
}

fn serialize_data(data: &Data) {
    // ...
}

fn another_function() -> Result<()> {
    // ...
}
```

---

## Excessive Error Types

### ❌ Anti-Pattern: ErrorFoo(String)

**Problem**: Using `String` for all error information loses type safety and structure.

```rust
// ❌ BAD: Generic String errors
#[derive(Debug, Error)]
pub enum ConsensusError {
    #[error("validation error: {0}")]
    ValidationError(String),

    #[error("network error: {0}")]
    NetworkError(String),

    #[error("database error: {0}")]
    DatabaseError(String),

    #[error("crypto error: {0}")]
    CryptoError(String),
}

// Usage is verbose and error-prone
return Err(ConsensusError::ValidationError(
    format!("Invalid signature from validator {}", validator_id)
));
```

**Why It's Bad**:
- Loses structured error information
- Can't pattern match on specific error details
- Harder to handle errors programmatically
- Makes error recovery difficult
- String formatting everywhere is verbose

### ✅ Correct Pattern

```rust
// ✅ GOOD: Specific, structured errors
#[derive(Debug, Error)]
pub enum ConsensusError {
    #[error("invalid signature from validator {validator}")]
    InvalidSignature { validator: PublicKey },

    #[error("network timeout after {duration:?}")]
    NetworkTimeout { duration: Duration },

    #[error("database error")]
    Database(#[from] sqlx::Error),

    #[error("crypto error")]
    Crypto(#[from] CryptoError),
}

// Usage is clean and type-safe
return Err(ConsensusError::InvalidSignature {
    validator: validator_key,
});

// Can pattern match on specific errors
match error {
    ConsensusError::InvalidSignature { validator } => {
        warn!("Punishing validator {validator}");
    }
    ConsensusError::NetworkTimeout { duration } => {
        info!("Retry after {duration:?}");
    }
    _ => {}
}
```

---

## Unhelpful Comments

### ❌ Anti-Pattern: Echo-the-Code Comments

**Problem**: Comments that merely restate what the code does add no value.

```rust
// ❌ BAD: Comments that just echo the code
// Increment the counter
counter += 1;

// Set is_valid to true
is_valid = true;

// Add transaction to the list
transactions.push(tx);

// Check if count is greater than zero
if count > 0 {
    // Process the transactions
    process_transactions();
}

// Create a new HashMap
let mut map = HashMap::new();

// Insert the key and value
map.insert(key, value);
```

**Why It's Bad**:
- Adds noise without adding information
- Makes code harder to read (more to scan through)
- Comments become outdated when code changes
- Insults the reader's intelligence

### ✅ Correct Pattern

```rust
// ✅ GOOD: Comments explain WHY, not WHAT

// Reset counter after consensus round completes
counter = 0;

// Mark as valid once signature verification passes
is_valid = verify_signature(&msg, &sig);

// Buffer transactions for batch processing to improve throughput
transactions.push(tx);

if count > 0 {
    process_transactions();
}

// Cache frequently accessed validator keys to avoid repeated database queries
let mut validator_cache = HashMap::new();
validator_cache.insert(key, value);
```

### When Comments ARE Helpful

```rust
// ✅ GOOD: Explaining non-obvious behavior
// Use wrapping arithmetic here because block numbers naturally wrap at u64::MAX
// in the consensus protocol specification
let next_block = block_number.wrapping_add(1);

// ✅ GOOD: Documenting subtle requirements
// IMPORTANT: Transactions must be processed in exact order to maintain
// deterministic state transitions across all validators
for tx in transactions {
    process_in_order(tx);
}

// ✅ GOOD: Explaining performance trade-offs
// Clone here instead of borrowing to avoid holding the lock during network I/O.
// Profiling showed this improved throughput by 30%.
let validators = self.validators.read().await.clone();
drop(validators); // Release lock early

// ✅ GOOD: Documenting security considerations
// Constant-time comparison to prevent timing attacks
if constant_time_eq(&computed_mac, &provided_mac) {
    // ...
}
```

---

## Unsafe Code Misuse

### ❌ Anti-Pattern: Unsafe Without Documentation

**Problem**: Using `unsafe` without explaining why it's safe.

```rust
// ❌ BAD: No explanation of safety
unsafe {
    *ptr.add(index) = value;
}

// ❌ BAD: Vague safety comment
// SAFETY: This is safe
unsafe {
    buffer.set_len(new_len);
}
```

**Why It's Bad**:
- Can't verify correctness without understanding invariants
- Future maintainers won't know assumptions
- Unsafe code requires extra scrutiny
- Compiler can't help verify safety

### ✅ Correct Pattern

```rust
// ✅ GOOD: Detailed safety explanation
// SAFETY: This is safe because:
// 1. The pointer is guaranteed to be valid - allocated in new() with sufficient capacity
// 2. The index is bounds-checked above (index < buffer.len())
// 3. No other references exist to buffer[index] (exclusive &mut access)
// 4. The value being written is valid for the type
unsafe {
    *ptr.add(index) = value;
}

// ✅ GOOD: References invariants
// SAFETY: The buffer was allocated with capacity `new_len` in reserve() above.
// All elements up to `new_len` have been initialized by the loop.
// This maintains the Vec<T> invariant that elements [0..len) are initialized.
unsafe {
    buffer.set_len(new_len);
}
```

### ❌ Anti-Pattern: Unsafe When Safe Alternative Exists

```rust
// ❌ BAD: Using unsafe unnecessarily
let value: MyStruct = unsafe { std::mem::zeroed() };

// ❌ BAD: Raw pointer when reference works
unsafe {
    let raw_ptr = &value as *const Value;
    process_value(raw_ptr);
}
```

### ✅ Correct Pattern

```rust
// ✅ GOOD: Use safe abstractions
use std::mem::MaybeUninit;
let mut value = MaybeUninit::<MyStruct>::uninit();
// ... initialize fields ...
let value = unsafe { value.assume_init() };

// ✅ GOOD: Use references
let value_ref = &value;
process_value(value_ref);
```

---

## Error Handling Anti-Patterns

### ❌ Anti-Pattern: Excessive .unwrap()

**Problem**: Using `.unwrap()` without justification.

```rust
// ❌ BAD: Will panic on error
fn load_config(path: &str) -> Config {
    let content = std::fs::read_to_string(path).unwrap();
    let config: Config = serde_json::from_str(&content).unwrap();
    config
}

// ❌ BAD: Loses error context
fn process_transaction(tx: &Transaction) {
    let signature = tx.signature.unwrap();
    let validated = validate(signature).unwrap();
}
```

**Why It's Bad**:
- Application crashes on unexpected input
- Poor error messages for debugging
- Violates Rust's error handling philosophy
- Makes code brittle

### ✅ Correct Pattern

```rust
// ✅ GOOD: Propagate errors with context
fn load_config(path: &Path) -> Result<Config> {
    let content = std::fs::read_to_string(path)
        .context(format!("Failed to read config from {}", path.display()))?;

    let config: Config = serde_json::from_str(&content)
        .context("Failed to parse config JSON")?;

    Ok(config)
}

// ✅ GOOD: Return Result
fn process_transaction(tx: &Transaction) -> Result<ProcessedTx> {
    let signature = tx.signature
        .ok_or(Error::MissingSignature)?;

    let validated = validate(&signature)
        .context("Signature validation failed")?;

    Ok(ProcessedTx { validated })
}
```

### ❌ Anti-Pattern: .expect() Without Clear Reasoning

```rust
// ❌ BAD: Vague reasoning
let value = option.expect("should work");
let result = risky_operation().expect("expected to succeed");

// ❌ BAD: Not actually guaranteed
let first = vec.first().expect("vec has elements");
```

### ✅ Correct Pattern

```rust
// ✅ GOOD: Invariant documented
/// Invariant: genesis block is always set in BlockStore::new()
let genesis = self.genesis_block
    .expect("invariant: genesis block set in new()");

// ✅ GOOD: Hard-coded value is valid
let config = Config::parse("localhost:8080")
    .expect("hard-coded config string is valid");

// ✅ GOOD: Better to return Result
fn get_first(vec: &[Item]) -> Result<&Item> {
    vec.first().ok_or(Error::EmptyVec)
}
```

---

## Naming Anti-Patterns

### ❌ Anti-Pattern: Cryptic Abbreviations

**Problem**: Short, unclear variable names.

```rust
// ❌ BAD: Unclear abbreviations
let h = compute_hash(&tx);
let bh = get_latest_height();
let pk = load_key(&path)?;
let sig = sign(&msg);
let vk = validator.key();

fn process(tx: &Tx, bn: u64, vl: &V) -> R {
    // What do these mean?
}
```

**Why It's Bad**:
- Hard to understand code at a glance
- Ambiguous (pk = public key or proving key?)
- Poor IDE autocomplete
- Difficult for new contributors

### ✅ Correct Pattern

```rust
// ✅ GOOD: Clear, descriptive names
let transaction_hash = compute_hash(&tx);
let block_height = get_latest_height();
let signing_key = load_key(&path)?;
let signature = sign(&msg);
let validator_key = validator.key();

fn process_transaction(
    tx: &Transaction,
    block_number: u64,
    validator: &Validator,
) -> Result<ProcessedTransaction> {
    // Clear and self-documenting
}
```

---

## Blockchain-Specific Anti-Patterns

### ❌ Anti-Pattern: Non-Deterministic Operations

**Problem**: Operations that produce different results across validators.

```rust
// ❌ BAD: HashMap iteration order is non-deterministic
fn process_transactions(txs: HashMap<Hash, Transaction>) -> Vec<Receipt> {
    let mut receipts = Vec::new();
    for (hash, tx) in txs {
        receipts.push(process(tx));
    }
    receipts
}

// ❌ BAD: Floating point arithmetic is non-deterministic
fn calculate_reward(stake: f64) -> f64 {
    stake * 0.05
}

// ❌ BAD: System time varies across nodes
fn create_block() -> Block {
    Block {
        timestamp: SystemTime::now(),
        // ...
    }
}
```

**Why It's Bad**:
- Breaks consensus (different validators get different results)
- Non-reproducible state transitions
- Impossible to verify proofs
- Causes chain forks

### ✅ Correct Pattern

```rust
// ✅ GOOD: Deterministic ordering with BTreeMap
fn process_transactions(txs: BTreeMap<Hash, Transaction>) -> Vec<Receipt> {
    let mut receipts = Vec::new();
    // BTreeMap iteration is deterministic
    for (hash, tx) in txs {
        receipts.push(process(tx));
    }
    receipts
}

// ✅ GOOD: Integer arithmetic for consensus
fn calculate_reward(stake: u64) -> u64 {
    // Stake in smallest units, 5% = multiply by 5, divide by 100
    stake.checked_mul(5)
        .and_then(|v| v.checked_div(100))
        .unwrap_or(0)
}

// ✅ GOOD: Use externally-provided deterministic timestamp
fn create_block(consensus_timestamp: u64) -> Block {
    Block {
        timestamp: consensus_timestamp,
        // ...
    }
}
```

### ❌ Anti-Pattern: Unchecked Arithmetic in Consensus

**Problem**: Overflow/underflow in consensus-critical code.

```rust
// ❌ BAD: Can overflow or panic
fn update_validator_stake(stake: u64, delta: i64) -> u64 {
    if delta > 0 {
        stake + delta as u64  // Can overflow
    } else {
        stake - delta.abs() as u64  // Can underflow
    }
}

// ❌ BAD: Total can overflow
fn calculate_total_stake(validators: &[Validator]) -> u64 {
    validators.iter().map(|v| v.stake).sum()  // Can overflow
}
```

**Why It's Bad**:
- Overflow leads to incorrect state
- Can be exploited for attacks
- Breaks consensus invariants
- May panic and halt chain

### ✅ Correct Pattern

```rust
// ✅ GOOD: Checked arithmetic
fn update_validator_stake(stake: u64, delta: i64) -> Result<u64, Error> {
    if delta > 0 {
        stake.checked_add(delta as u64)
            .ok_or(Error::StakeOverflow)
    } else {
        stake.checked_sub(delta.abs() as u64)
            .ok_or(Error::InsufficientStake)
    }
}

// ✅ GOOD: Checked sum with try_fold
fn calculate_total_stake(validators: &[Validator]) -> Result<u64, Error> {
    validators.iter()
        .try_fold(0u64, |acc, v| {
            acc.checked_add(v.stake).ok_or(Error::StakeOverflow)
        })
}
```

### ❌ Anti-Pattern: Missing Signature Verification

**Problem**: Processing transactions without verifying signatures.

```rust
// ❌ BAD: No signature verification
fn apply_transaction(state: &mut State, tx: &Transaction) {
    state.transfer(tx.from, tx.to, tx.amount);
}

// ❌ BAD: Verification after state change
fn process_block(state: &mut State, block: &Block) {
    for tx in &block.transactions {
        state.apply(tx);
    }

    // Too late! State already modified
    if !block.verify() {
        panic!("Invalid block!");
    }
}
```

**Why It's Bad**:
- Allows unauthorized state changes
- Critical security vulnerability
- Can't rollback state modifications
- Violates blockchain security model

### ✅ Correct Pattern

```rust
// ✅ GOOD: Verify before state changes
fn apply_transaction(state: &mut State, tx: &Transaction) -> Result<()> {
    // Verify FIRST
    tx.verify_signature()
        .context("Invalid transaction signature")?;

    // THEN modify state
    state.transfer(tx.from, tx.to, tx.amount)?;

    Ok(())
}

// ✅ GOOD: Validate before applying
fn process_block(state: &mut State, block: &Block) -> Result<()> {
    // Verify block and ALL transactions FIRST
    block.verify()
        .context("Invalid block")?;

    for tx in &block.transactions {
        tx.verify_signature()
            .context("Invalid transaction signature")?;
    }

    // ALL validations passed, now apply state changes
    for tx in &block.transactions {
        state.apply(tx)?;
    }

    Ok(())
}
```

---

## Summary: Quick Anti-Pattern Checklist

When writing Rust code, avoid:

- ❌ Positional format arguments (`format!("{}", x)`)
- ❌ Scattered imports (consolidate at file top)
- ❌ Generic `Error(String)` types (use specific fields)
- ❌ Echo-the-code comments (explain WHY, not WHAT)
- ❌ `unsafe` without `// SAFETY:` comments
- ❌ `.unwrap()` without justification (use `.expect()` or `Result`)
- ❌ Cryptic variable names (use descriptive names)
- ❌ Non-deterministic operations in consensus code
- ❌ Unchecked arithmetic for financial/consensus values
- ❌ Missing signature verification

---

*This anti-patterns guide is part of the rust-blockchain-dev skill system. For correct patterns, see examples.md. For detailed explanations, see reference.md.*

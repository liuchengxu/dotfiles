# Rust Development Examples

This document provides working code examples demonstrating correct Rust patterns from the guidelines.

## Table of Contents

1. [String Formatting Examples](#string-formatting-examples)
2. [Import Organization Examples](#import-organization-examples)
3. [Checked Arithmetic Examples](#checked-arithmetic-examples)
4. [Error Handling Examples](#error-handling-examples)
5. [Safe Code Examples](#safe-code-examples)
6. [Documentation Examples](#documentation-examples)
7. [Blockchain-Specific Examples](#blockchain-specific-examples)

---

## String Formatting Examples

### Basic Logging

```rust
use tracing::{info, warn, error, debug};

fn process_block(block_number: u64, slot: u64, validator: &str) {
    info!("Processing block {block_number} at slot {slot}");
    debug!("Validator: {validator}");

    if let Err(e) = validate_block() {
        error!("Validation failed for block {block_number}: {e}");
    }
}
```

### Error Messages

```rust
use std::path::Path;
use anyhow::{Context, Result};

fn load_config(path: &Path) -> Result<Config> {
    let content = std::fs::read_to_string(path)
        .context(format!("Failed to read config from {}", path.display()))?;

    serde_json::from_str(&content)
        .context(format!("Failed to parse config from {}", path.display()))
}
```

### Debug and Pretty Printing

```rust
#[derive(Debug)]
struct Transaction {
    hash: Hash,
    sender: Address,
    amount: u64,
}

fn log_transaction(tx: &Transaction) {
    // Simple debug
    println!("Transaction: {tx:?}");

    // Pretty debug
    println!("Transaction details:\n{tx:#?}");

    // Hex formatting
    println!("Hash: {hash:x}", hash = tx.hash.0);
}
```

### Format String Assembly

```rust
fn generate_report(
    network: &str,
    blocks: u64,
    transactions: u64,
    validators: usize,
) -> String {
    format!(
        "Network Report for {network}\n\
         ========================\n\
         Blocks processed: {blocks}\n\
         Transactions: {transactions}\n\
         Active validators: {validators}"
    )
}
```

---

## Import Organization Examples

### Small Module

```rust
use std::path::{Path, PathBuf};
use anyhow::Result;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct Config {
    pub path: PathBuf,
}

impl Config {
    pub fn load(path: &Path) -> Result<Self> {
        // Implementation
    }
}
```

### Larger Module with Grouped Imports

```rust
// Standard library imports
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;

// External crate imports
use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use tokio::sync::RwLock;
use tracing::{debug, info, warn};

// Internal crate imports
use crate::consensus::{BlockValidator, ConsensusEngine};
use crate::crypto::{Hash, PublicKey, Signature};
use crate::network::{NetworkMessage, PeerId};

// Relative imports
use super::storage::BlockStore;
use super::types::{Block, Transaction};

pub struct Node {
    // Implementation
}
```

### Conditional Compilation

```rust
use std::path::PathBuf;
use serde::{Deserialize, Serialize};

#[cfg(feature = "crypto")]
use crypto::Signer;

#[cfg(test)]
mod tests {
    use super::*;  // OK in test modules
    use proptest::prelude::*;
}
```

---

## Checked Arithmetic Examples

### Token Operations

```rust
#[derive(Debug, thiserror::Error)]
pub enum TokenError {
    #[error("arithmetic overflow")]
    Overflow,
    #[error("insufficient balance: need {needed}, have {available}")]
    InsufficientBalance { needed: u64, available: u64 },
}

pub struct TokenBalance {
    amount: u64,
}

impl TokenBalance {
    pub fn deposit(&mut self, amount: u64) -> Result<(), TokenError> {
        self.amount = self.amount
            .checked_add(amount)
            .ok_or(TokenError::Overflow)?;
        Ok(())
    }

    pub fn withdraw(&mut self, amount: u64) -> Result<(), TokenError> {
        self.amount = self.amount
            .checked_sub(amount)
            .ok_or(TokenError::InsufficientBalance {
                needed: amount,
                available: self.amount,
            })?;
        Ok(())
    }

    pub fn transfer(&mut self, recipient: &mut Self, amount: u64) -> Result<(), TokenError> {
        self.withdraw(amount)?;
        recipient.deposit(amount)?;
        Ok(())
    }
}
```

### Block Height Calculations

```rust
pub struct BlockChain {
    genesis_height: u64,
    current_height: u64,
}

impl BlockChain {
    pub fn blocks_since_genesis(&self) -> Result<u64, Error> {
        self.current_height
            .checked_sub(self.genesis_height)
            .ok_or(Error::InvalidBlockHeight)
    }

    pub fn next_block_height(&self) -> Result<u64, Error> {
        self.current_height
            .checked_add(1)
            .ok_or(Error::BlockHeightOverflow)
    }
}
```

### Fee Calculations

```rust
pub struct FeeCalculator {
    base_fee: u64,
    priority_fee: u64,
}

impl FeeCalculator {
    pub fn total_fee(&self) -> Result<u64, Error> {
        self.base_fee
            .checked_add(self.priority_fee)
            .ok_or(Error::FeeOverflow)
    }

    pub fn fee_for_gas(&self, gas_used: u64, gas_price: u64) -> Result<u64, Error> {
        gas_used
            .checked_mul(gas_price)
            .ok_or(Error::FeeOverflow)
    }
}
```

### Saturation Example (When Appropriate)

```rust
pub struct RateLimiter {
    requests: u32,
    max_requests: u32,
}

impl RateLimiter {
    pub fn record_request(&mut self) {
        // Saturating is acceptable here - we just want to cap at max
        self.requests = self.requests.saturating_add(1);
    }

    pub fn is_rate_limited(&self) -> bool {
        self.requests >= self.max_requests
    }
}
```

---

## Error Handling Examples

### Result-Based Functions

```rust
use anyhow::{Context, Result};
use std::path::Path;

pub fn load_and_process_config(path: &Path) -> Result<ProcessedConfig> {
    let content = std::fs::read_to_string(path)
        .context(format!("Failed to read config file: {}", path.display()))?;

    let raw_config: RawConfig = serde_json::from_str(&content)
        .context("Failed to parse JSON config")?;

    let validated_config = validate_config(raw_config)
        .context("Config validation failed")?;

    Ok(ProcessedConfig::from(validated_config))
}

fn validate_config(config: RawConfig) -> Result<ValidatedConfig> {
    if config.port == 0 {
        anyhow::bail!("Port cannot be 0");
    }

    Ok(ValidatedConfig { port: config.port })
}
```

### Custom Error Types with thiserror

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConsensusError {
    #[error("invalid block signature from validator {validator}")]
    InvalidSignature { validator: PublicKey },

    #[error("block height {actual} does not match expected {expected}")]
    InvalidBlockHeight { expected: u64, actual: u64 },

    #[error("insufficient validators: need {required}, have {actual}")]
    InsufficientValidators { required: usize, actual: usize },

    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("cryptography error: {0}")]
    Crypto(#[from] CryptoError),
}

pub fn verify_block(block: &Block) -> Result<(), ConsensusError> {
    if !block.verify_signature() {
        return Err(ConsensusError::InvalidSignature {
            validator: block.validator,
        });
    }

    if block.height != expected_height() {
        return Err(ConsensusError::InvalidBlockHeight {
            expected: expected_height(),
            actual: block.height,
        });
    }

    Ok(())
}
```

### Justified .expect() Usage

```rust
pub struct Config {
    /// Invariant: always set by Config::new() and Config::default()
    required_field: Option<String>,
}

impl Config {
    pub fn new(value: String) -> Self {
        Self {
            required_field: Some(value),
        }
    }

    pub fn get_required(&self) -> &str {
        // Justified: Config::new() always sets this field
        self.required_field
            .as_ref()
            .expect("invariant: required_field always set in new()")
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            required_field: Some("default".to_string()),
        }
    }
}

#[test]
fn test_config_invariant() {
    let config = Config::default();
    assert!(config.required_field.is_some());
}
```

---

## Safe Code Examples

### Avoiding Unsafe with MaybeUninit

```rust
use std::mem::MaybeUninit;

pub struct LargeStruct {
    data: [u8; 1024],
}

impl LargeStruct {
    pub fn new_zeroed() -> Self {
        Self { data: [0; 1024] }
    }

    pub fn new_uninit() -> Self {
        // Safe way to create uninitialized memory
        let mut uninit = MaybeUninit::<Self>::uninit();

        // Initialize the data
        unsafe {
            let ptr = uninit.as_mut_ptr();
            (*ptr).data = [0; 1024];

            // SAFETY: We've initialized all fields above
            uninit.assume_init()
        }
    }
}
```

### Documented Unsafe Operations

```rust
pub struct RingBuffer {
    buffer: Vec<u8>,
    read_pos: usize,
    write_pos: usize,
}

impl RingBuffer {
    pub fn read_unchecked(&self, index: usize) -> u8 {
        // SAFETY: Caller must ensure:
        // 1. index < buffer.len()
        // 2. No concurrent writes to buffer[index]
        // 3. buffer[index] has been initialized
        //
        // This is guaranteed by the RingBuffer invariants:
        // - read_pos and write_pos are always < buffer.len()
        // - Single-threaded access enforced by &self
        // - All positions between read_pos and write_pos are initialized
        unsafe { *self.buffer.get_unchecked(index) }
    }
}
```

### Preferring Safe Abstractions

```rust
use std::sync::Arc;
use tokio::sync::RwLock;

// ✅ Safe concurrency with Arc and RwLock
pub struct SharedState {
    data: Arc<RwLock<HashMap<String, String>>>,
}

impl SharedState {
    pub fn new() -> Self {
        Self {
            data: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn insert(&self, key: String, value: String) {
        let mut data = self.data.write().await;
        data.insert(key, value);
    }

    pub async fn get(&self, key: &str) -> Option<String> {
        let data = self.data.read().await;
        data.get(key).cloned()
    }
}
```

---

## Documentation Examples

### Well-Documented Public API

```rust
/// A block in the blockchain.
///
/// Each block contains a header with metadata, a list of transactions,
/// and a signature from the validator who proposed it.
///
/// # Examples
///
/// ```
/// use blockchain::Block;
///
/// let block = Block::new(
///     previous_hash,
///     transactions,
///     validator_key,
/// );
/// assert!(block.verify());
/// ```
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Block {
    /// Block header containing metadata
    pub header: BlockHeader,

    /// Transactions included in this block
    pub transactions: Vec<Transaction>,

    /// Validator signature over the block hash
    pub signature: Signature,
}

impl Block {
    /// Creates a new block with the given parameters.
    ///
    /// # Arguments
    ///
    /// * `previous_hash` - Hash of the parent block
    /// * `transactions` - Transactions to include
    /// * `validator_key` - Key to sign the block
    ///
    /// # Returns
    ///
    /// A new `Block` instance signed by the validator.
    ///
    /// # Examples
    ///
    /// ```
    /// let block = Block::new(parent.hash(), txs, &key);
    /// ```
    pub fn new(
        previous_hash: Hash,
        transactions: Vec<Transaction>,
        validator_key: &PrivateKey,
    ) -> Self {
        // Implementation
    }

    /// Verifies the block signature and transaction validity.
    ///
    /// # Returns
    ///
    /// `true` if the block is valid, `false` otherwise.
    ///
    /// # Examples
    ///
    /// ```
    /// if !block.verify() {
    ///     return Err(Error::InvalidBlock);
    /// }
    /// ```
    pub fn verify(&self) -> bool {
        // Implementation
    }
}
```

### Module-Level Documentation

```rust
//! Consensus engine for the blockchain.
//!
//! This module implements a proof-of-stake consensus mechanism with
//! Byzantine fault tolerance. Validators are selected based on their
//! stake, and blocks require signatures from 2/3+ of validators to
//! be finalized.
//!
//! # Architecture
//!
//! The consensus engine consists of several components:
//!
//! - [`ConsensusEngine`]: Main entry point for consensus operations
//! - [`ValidatorSet`]: Manages the set of active validators
//! - [`BlockValidator`]: Validates blocks according to consensus rules
//! - [`Finalizer`]: Handles block finalization logic
//!
//! # Example
//!
//! ```no_run
//! use consensus::ConsensusEngine;
//!
//! let engine = ConsensusEngine::new(validator_set);
//! let block = engine.propose_block(transactions)?;
//! engine.validate_and_commit(block)?;
//! ```
//!
//! # Safety
//!
//! This module contains no `unsafe` code. All cryptographic operations
//! use audited libraries.

use std::sync::Arc;
use tokio::sync::RwLock;

// Rest of module...
```

---

## Blockchain-Specific Examples

### Consensus State Machine

```rust
use thiserror::Error;

#[derive(Debug, Error)]
pub enum ConsensusError {
    #[error("invalid state transition from {from:?} to {to:?}")]
    InvalidTransition { from: ConsensusState, to: ConsensusState },
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ConsensusState {
    Idle,
    Proposing,
    Voting,
    Committing,
    Finalized,
}

pub struct ConsensusStateMachine {
    state: ConsensusState,
}

impl ConsensusStateMachine {
    pub fn new() -> Self {
        Self { state: ConsensusState::Idle }
    }

    pub fn transition(&mut self, new_state: ConsensusState) -> Result<(), ConsensusError> {
        let valid = match (self.state, new_state) {
            (ConsensusState::Idle, ConsensusState::Proposing) => true,
            (ConsensusState::Proposing, ConsensusState::Voting) => true,
            (ConsensusState::Voting, ConsensusState::Committing) => true,
            (ConsensusState::Committing, ConsensusState::Finalized) => true,
            (ConsensusState::Finalized, ConsensusState::Idle) => true,
            _ => false,
        };

        if !valid {
            return Err(ConsensusError::InvalidTransition {
                from: self.state,
                to: new_state,
            });
        }

        self.state = new_state;
        Ok(())
    }
}
```

### Cryptographic Operations

```rust
use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use anyhow::{Context, Result};

pub struct CryptoUtils;

impl CryptoUtils {
    /// Signs a message with the given private key.
    ///
    /// # Arguments
    ///
    /// * `message` - The message to sign
    /// * `signing_key` - The private key for signing
    ///
    /// # Returns
    ///
    /// The signature as a byte array
    pub fn sign_message(message: &[u8], signing_key: &SigningKey) -> Signature {
        signing_key.sign(message)
    }

    /// Verifies a signature against a message and public key.
    ///
    /// # Arguments
    ///
    /// * `message` - The original message
    /// * `signature` - The signature to verify
    /// * `public_key` - The public key of the signer
    ///
    /// # Returns
    ///
    /// `Ok(())` if the signature is valid, `Err` otherwise
    pub fn verify_signature(
        message: &[u8],
        signature: &Signature,
        public_key: &VerifyingKey,
    ) -> Result<()> {
        public_key
            .verify(message, signature)
            .context("Signature verification failed")
    }
}
```

### Transaction Processing

```rust
use sha2::{Sha256, Digest};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Transaction {
    pub sender: Address,
    pub recipient: Address,
    pub amount: u64,
    pub nonce: u64,
    pub signature: Signature,
}

impl Transaction {
    pub fn new(
        sender: Address,
        recipient: Address,
        amount: u64,
        nonce: u64,
        signing_key: &SigningKey,
    ) -> Self {
        let mut tx = Self {
            sender,
            recipient,
            amount,
            nonce,
            signature: Signature::from_bytes(&[0; 64]).unwrap(), // Temporary
        };

        let hash = tx.compute_hash();
        tx.signature = signing_key.sign(&hash);
        tx
    }

    pub fn compute_hash(&self) -> [u8; 32] {
        let mut hasher = Sha256::new();
        hasher.update(&self.sender.0);
        hasher.update(&self.recipient.0);
        hasher.update(&self.amount.to_le_bytes());
        hasher.update(&self.nonce.to_le_bytes());
        hasher.finalize().into()
    }

    pub fn verify(&self) -> Result<(), TransactionError> {
        let hash = self.compute_hash();
        let public_key = self.sender.to_verifying_key();

        CryptoUtils::verify_signature(&hash, &self.signature, &public_key)
            .map_err(|_| TransactionError::InvalidSignature)?;

        Ok(())
    }
}
```

---

*These examples demonstrate correct usage of Rust patterns from the rust-blockchain-dev skill guidelines. For detailed explanations, see reference.md. For common mistakes to avoid, see anti-patterns.md.*

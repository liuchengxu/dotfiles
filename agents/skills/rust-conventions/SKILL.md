---
name: rust-conventions
description: >
  Rust conventions: inline interpolation in format strings, one consolidated
  import group per file, checked arithmetic for value operations, and the
  fmt/clippy gate before committing.
  TRIGGER when writing, editing, or reviewing Rust — any `.rs` file, a Cargo
  workspace, or a diff containing Rust.
  DO NOT TRIGGER for other languages, or for illustrative Rust in prose that is
  never compiled.
---

# Rust Conventions

## String Formatting

Use inline variable interpolation:

```rust
println!("Hello {name}");
format!("Processing {block_number} at slot {slot}");
error!("Failed to load {path}: {error}");
```

Positional `{}` placeholders are not used. This applies to every formatting
macro: `println!`, `format!`, `info!`, `warn!`, `error!`, `debug!`, `trace!`,
`panic!`, `assert!`, `write!`.

## Import Organization

All `use` statements sit in a single consolidated group at the top of the file.
Imports are never split mid-file or placed inside functions.

## Checked Arithmetic

Value operations use checked arithmetic:

```rust
let result = value.checked_add(amount).ok_or(Error::Overflow)?;
let difference = total.checked_sub(fee).ok_or(Error::InsufficientFunds)?;
```

Bare `+`, `-`, `*` are reserved for arithmetic that carries no value semantics.

## Before Committing

```bash
cargo +nightly fmt --all && cargo clippy
```

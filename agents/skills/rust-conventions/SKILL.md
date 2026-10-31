---
name: rust-conventions
description: >
  Apply Rust style and validation when writing or reviewing Rust files, Cargo workspaces, or Rust diffs. Excludes uncompiled examples in prose and other languages.
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

## Function-Local Statics

A process-lifetime singleton whose only consumer is one function is declared
inside that function:

```rust
static FOO: OnceCell<T> = OnceCell::const_new();
```

Put it inside `get()` rather than at module level when there is exactly one
caller.

## Before Committing

Use the repository's required format and lint commands for each affected workspace.
A repository with separate Cargo workspaces needs explicit manifest paths; do not
assume a root Cargo.toml exists.

## Completion checklist

Use evidence to complete this checklist. Mark an item N/A only with a reason. An unresolved applicable item is a delivery gap.

- [ ] Before changing or reviewing Rust, confirmed the requested outcome, affected workspace, and why the change or review was needed.
- [ ] Used inline format interpolation, one top-level import group, checked value arithmetic, and function-local single-consumer statics where applicable.
- [ ] Before an authorized commit, ran the repository's required format and lint checks with explicit workspace manifests; otherwise recorded applicable validation limits.

---
name: Use permalinks for external source references
description: When citing external repos (e.g., SP1, helios, alloy) in doc comments, use a versioned GitHub permalink, not a bare `path/file.rs:line` reference
type: feedback
originSessionId: 12a109f2-263f-46fd-a90f-2fe377633009
---
When code or doc comments reference source from another repo (SP1 is the common case in this project), use a fully versioned GitHub permalink — e.g., `<https://github.com/succinctlabs/sp1/blob/v6.1.0/crates/sdk/src/lib.rs#L257>` — not a bare `crates/sdk/src/lib.rs` reference.

**Why:** External codebases evolve; line numbers and even file paths drift. A bare reference like "see `crates/sdk/src/lib.rs`" is unverifiable in six months, while a permalink stays correct forever (GitHub never moves the line in a ref'd commit). User explicitly requested this when reviewing a doc comment that referenced SP1 source by relative path.

**How to apply:**
- Find the version of the external dep (`grep "<crate>-sdk" Cargo.toml` for git tag, or `git rev-parse <tag>` against a local clone).
- Verify the line number in that specific tag/commit (a `git show <tag>:<file>` against a local clone works) — current `HEAD` line numbers may differ from the tagged version.
- Format: `<https://github.com/<org>/<repo>/blob/<tag-or-sha>/<path>#L<line>>` in markdown angle brackets so it renders as a clickable link in rustdoc.
- For multi-line ranges: `#L<start>-L<end>`.
- Pin to a tag (`v6.1.0`) when one exists; fall back to a full commit SHA otherwise. Avoid `main`/`master` — those drift.
- If the cited claim doesn't exactly match what the linked code says (e.g., the user's prior comment said the SP1 test asserts `report.exit_code == 1` but it actually proves+verifies with `StatusCode::new(1)`), fix the prose to match the code, not vice versa.

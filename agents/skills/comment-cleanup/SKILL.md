---
name: comment-cleanup
description: Use before committing any diff that adds or edits code/doc comments — triggered by the comment-diff-gate pre-commit check, or invoke directly to prune low-value comments from a change. A delete-biased pass over added/edited comments that removes code-restating narration, cross-comment duplicated rationale, stale call-site references, and archaeology, while protecting safety/security/contract/concurrency/invariant comments. Not for prose documents (use doc-review).
---

# Comment Cleanup

A delete-biased pass over the comments a change added or edited. Comment quality
is a whole-file property that only resolves after the code settles, so this runs
on the final diff — not mid-implementation.

## Scope

Review every comment on an added or edited line in the diff:

```
git diff --cached -U0    # or the working diff if not yet staged
```

Judge each comment against the tests below. Do not touch comments outside the
diff in this pass.

## Delete unless it earns its place

Delete a comment unless it answers one of:

- **Invariant** — what rule must future edits preserve?
- **External contract** — what protocol, wire format, consensus rule, FFI, or
  DB contract is being honored?
- **Surprise** — why is the obvious simpler code wrong (a reader would
  "simplify" it into a bug)?
- **Safety** — what makes this `unsafe` / panic / `unwrap` / lock-ordering /
  retry / cancellation valid?
- **Workaround** — what temporary exception exists, and when can it be removed?

## Auto-remove (noise)

- Restating the code, the identifier, or the next line.
- A doc-comment that only expands the function name into a sentence.
- Rationale duplicated across a doc-comment and an adjacent inline comment —
  keep one home (the one closest to the invariant, not the more ceremonious).
- Names of current call sites / consumers (`used by X`, `cross-checked in Y`) —
  they go stale on rename; rewrite as the invariant the code maintains.
- Archaeology: `previously`, `now`, `added in PR`, `renamed from`.
- Vague intent: `for readability`, `handle edge cases`, `important check`.
- Commented-out code.
- Loud emphasis (`ONLY`, `WRONG`, `FIRST`); state the invariant affirmatively
  without weakening it — the rewrite keeps exclusivity and requirement force
  ("only finalized checkpoints may be signed", not "finalized checkpoints are
  signed").

Every deletion or rewrite preserves scope, conditions, uncertainty,
verification status, and requirement force; if the shorter form claims more
than the original, keep the original.

## Never remove (protected keep zones)

Leave these untouched even if terse. Protected means never silently deleted,
not never edited: a protected comment whose precondition no longer holds is
repaired or escalated, not kept verbatim.

- `// SAFETY:` on every `unsafe`.
- Security / consensus / crypto / domain-separation / endianness / units.
- Serialization / wire-format rationale.
- Concurrency: lock ordering, cancellation, idempotency, retry, txn boundaries.
- Migration / backward-compatibility rationale.
- Panic / `unwrap` preconditions.
- Public-item rustdoc stating caller-visible contract, errors, or panics.
- Test comments encoding non-obvious scenario intent.
- Generated-code markers and lint/tool directives (`#[allow(...)]` with a reason).
- `TODO` / `FIXME` tied to an issue or a removal condition. An untethered one is
  reviewed (add a condition or delete), never blindly kept.

## Finish

1. Apply the deletions/rewrites.
2. Re-run the pre-commit gate with the pass marker set, then commit:
   `COMMENT_CLEANUP_DONE=1 ~/.claude/scripts/comment-diff-gate.sh`
3. If you deliberately kept a comment that looks like noise, say so in the
   commit/PR rather than annotating the code.

## Escalate

For diffs touching `unsafe`, public API docs, or crypto/consensus/security/
serialization code — where deleting the wrong comment loses load-bearing
rationale — get a second-agent review of the kept/cut set rather than deciding
solo.

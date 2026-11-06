# Comment policy

One authority for what a comment in code earns its place by. Cited by the
code-minimalism write-time gate, the finish-time trim, review prompts, and the
trim-docs skill.

A comment earns its place only if it states one of:

- an invariant that future edits must preserve;
- an external contract: a protocol, wire format, consensus rule, FFI, or
  storage format;
- a surprise: why the obvious, simpler code would be wrong;
- a safety argument: why an unsafe block, panic, unwrap, lock order, retry, or
  cancellation is valid;
- a workaround, with what retires it.

A comment should be flagged for deletion or rewriting when it:

- restates the code, the identifier, or the next line;
- narrates what the code does, step by step;
- records history ("previously", "changed from", "now", a fixed bug, a PR or
  session reference) instead of the current behavior;
- repeats a reason another comment already gives.

Keep regardless of the above:

- doc comments a public item needs (one that only restates its name should
  state the caller's contract instead);
- a module's one-line purpose;
- a test comment that states the property the test checks, and comments that
  explain test data;
- license headers, lint and tool directives.

When unsure, retain and report rather than delete.

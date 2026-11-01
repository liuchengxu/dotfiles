---
name: No archaeology comments in code
description: Never write code comments that explain what was previously there, what was removed, or how the current code differs from a prior version
type: feedback
originSessionId: 12a109f2-263f-46fd-a90f-2fe377633009
---
Don't write comments like "the previous `is_mock()` guard was vestigial," "previously this had no check," "the unsafe annotation was removed," or "this used to do X." That archaeology belongs in the PR description / commit message; in the code it rots within one or two refactors.

**Why:** User has flagged this multiple times. Reasoning is the same as the system-prompt rule about not referencing the current task/fix/callers — readers of the code in 6 months don't have the context, the comment becomes confusing or wrong, and the diff/commit history already preserves the answer for anyone who actually needs it.

**How to apply:** When writing or modifying a doc comment near a code change, ask: "Does this describe the current behavior, or does it describe the change I'm making?" Only the former belongs in the source. Lead with the load-bearing invariant ("Guest panics surface as `ExecuteError::GuestPanic`"), drop the diff narration ("the previous guard was vestigial — SP1's SDK reports panics regardless of backend"). If the load-bearing invariant is already stated elsewhere (e.g., on the type definition), the per-call-site comment is often unnecessary entirely.

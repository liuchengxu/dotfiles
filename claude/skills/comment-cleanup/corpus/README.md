# comment-cleanup regression corpus

Saved diffs that fix the cleanup policy against real examples instead of
anecdotes. When the policy changes, re-run it over this corpus and confirm:
**noise removed, protected rationale preserved, no new stale refs** — not merely
a lower comment count.

Target 5–10 diffs covering each category:

- verbose low-value comments (should be cut)
- useful invariant comments (must survive)
- public rustdoc stating caller contract (must survive)
- `unsafe` / security comments (must survive)
- stale call-site references (should be rewritten to the invariant)
- changed code under an existing comment, now stale (phase 2)
- tests with non-obvious scenario comments (must survive)

Each entry: a `<slug>.diff` plus a one-line `<slug>.expected` stating what the
pass should do. Keep entries small and single-purpose.

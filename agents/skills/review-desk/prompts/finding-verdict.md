# Decide whether a candidate PR closes an audit finding

Input: the finding issue (title, body, severity), the candidate PRs with their
head commits, and read access to the repository at each head and at the merge
base.

## Read

1. The finding, until you can state the defect in one sentence: what can go wrong
   because of it.
2. The diff of each candidate against the merge base, not only the changed files:
   the diff is what claims to fix it.
3. The call path the finding names, at head, to see whether the defect is still
   reachable.

## Decide

First judge the finding itself by `adversarial-review`'s "Findings filed by
others". A False or Not-a-bug finding is `not-applicable`. An Unproven finding
gets no verdict: say what would settle it in `reason`. Only a Valid or
Partially correct finding goes on to the fix verdicts below.

- `fixed` — the defect cannot occur on the head commit. Name the line that
  prevents it.
- `partial` — a real narrowing, but the defect is still reachable through a path
  the finding names, or a sibling path the PR left alone.
- `not-fixed` — the change does not address the cause: different layer, a
  symptom, a test that asserts the current behaviour.
- `deferred` — not fixed here. Name the issue that keeps tracking it; closing
  this issue does not resolve the finding.
- `not-applicable` — the finding misreads the code. Give the line that settles it.

A draft PR cannot be `fixed`: GitHub will not merge it, so the fix is not in the
code the release will ship.

## Claims

Write `raw/checks.json` items in this shape. Each check is a claim for the
human to verify, not a conclusion:

```json
{"proposed": {"verdict": "fixed", "reason": "<one sentence>"},
 "checks": [{"text": "<what must be true>", "evidence": "<path>:<line> @ <head8>"}]}
```

Write checks you can verify by reading the diff. A check without a line is a
judgement; say so in `text`. The desk starts every check unchecked and ignores
any status you add.

## Comment

One paragraph for the closing comment: the verdict, the line that supports it,
and — for `partial`, `not-fixed` or `deferred` — what remains and where it is
tracked. No praise, no summary of the PR.

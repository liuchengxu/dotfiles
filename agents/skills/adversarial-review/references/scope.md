# Scope / simplicity

Apply reduction to the whole output: code, tests, configuration, docs, comments,
PR bodies, reports, and messages. Ask what required behavior, reader decision,
or next action each addition serves. Test plausible deletions without losing
security, compatibility, regression coverage, or operational evidence.

For code, question abstractions, options, dependencies, and special cases without
a current requirement or consumer. For prose, remove repeated facts, process
narration, decorative sections, and detail that does not help the intended reader.
Prefer updating the artifact that owns a fact over creating another document.
Use [doc-review](../../doc-review/SKILL.md) for prose and
[comment-cleanup](../../comment-cleanup/SKILL.md) for source comments; keep one
review verdict and do not start an editing pass in a review-only task.

Do not impose a net-negative line count or a word quota. Preserve required API
docs, non-obvious rationale, safety contracts, uncertainty, and complete operator
steps. Concise summaries do not replace evidence required with an externally
posted review. Optional taste changes are not defects or automatic follow-up
issues. This lens grants no edit or publication authority.

---
name: Iterative review inflation in plan docs
description: When iterative Codex/reviewer cycles surface real findings, don't inline every mitigation into the main plan body — split into main plan + appendices instead
type: feedback
originSessionId: 12a109f2-263f-46fd-a90f-2fe377633009
---
When running iterative review loops on plan/spec docs (e.g., the `/review-plan` workflow that submits to Codex repeatedly), each cycle's findings tend to be real but accumulate into a bloated main plan. Don't keep inlining mitigations into the primary implementation path.

**Why:** The user pushed back on a 1107-line plan that grew from ~300 lines through 19 review cycles. Each finding was valid (mock-mode `verify_sp1_proof` no-ops, `ProofClient::shared()` mode freeze, cache-key gaps, missing exit-code surfacing, fixture isolation, OnceCell crash-idempotency, etc.), but the cumulative effect was a doc that buried the actual implementation steps under harness pitfalls and edge-case discipline. The user explicitly said "the right next edit is to collapse it, not add more detail."

**How to apply:** When iterative review inflates a plan beyond ~250 lines for what is essentially straightforward work, restructure into:
- **Main plan (~150-250 lines):** the actual implementation steps, terse and crisp
- **Coverage matrix:** compact table mapping requirements → tests
- **Appendix A — SP1 mode / exit-code pitfalls:** harness traps
- **Appendix B — cache/localnet fixture pitfalls:** fixture-isolation discipline
- **Appendix C — deferred / out-of-scope:** production-profile tests, etc.

The pitfalls should be referenced from the main plan, not inlined. Reviewers can still validate them; readers can still find them; but the handoff path stays short. Treat "the doc has drifted from implementation plan into a combined plan + harness register + pitfall doc + coverage matrix + deferred-work design note" as the explicit signal to restructure rather than continue iterating.

Do not let "every finding is real" justify "every mitigation belongs inline." Findings can be real AND belong in an appendix.

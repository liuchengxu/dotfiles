---
name: code-minimalism
description: >
  Write and review code so every addition is necessary, singular, and
  structurally safe. Use when writing new code, reviewing a diff, or
  running a KISS/necessity pass. Five questions catch most problems:
  does a requirement force this, does an existing API already do it, can
  the guarantee move earlier, is this the simplest form, and does each
  test prove one distinct thing.
---

# Code minimalism

## Before writing

A review can undo a bad detail cheaply, but a bad first choice — a new API,
propagated state, a test coupled to an unnecessary mechanism — costs turns and
churn to remove, and review's sunk-cost reasoning tends to preserve it. So ask
at the decision points, not as a narrated checklist before every function:

- State the required behavior and the smallest intended change before the
  first edit. If you cannot name what forces an addition, do not add it.
- Search for an existing mechanism before introducing another one; extending
  an imperfect existing API beats wrapping it.
- Decide where each invariant is first guaranteed (construction) and where
  each failure is earliest detected, before writing the check.
- Name the distinct behavioral boundaries the tests must prove; do not assume
  the proposed mechanism is necessary for them.

A brief rationale is required only for consequential additions: a new API,
abstraction, state, or validation boundary.

## The meta-principle

Every line of code is a maintenance liability. Add code only when a
requirement forces it, and prefer mechanisms that make mistakes
structurally impossible over mechanisms that catch them later.

Five dimensions, each with one question to ask.

## 1. Necessity — "What requirement forces this?"

Every addition must trace to a named requirement: an invariant in an
ADR, a test case, a bug report, or an external contract. If nothing
names it, delete it.

Before writing a new function, variant, wrapper, test, or constant,
state the requirement it serves. "It might be useful" and "for
compatibility" (on an unbuilt release) are not requirements.

Checklist:
- Does an ADR decision, issue, or invariant name this behavior?
- What breaks if I delete it? If nothing, delete it.
- Is this variant still produced by any construction path? If not,
  delete it.
- Am I keeping this "just in case"? Delete it; git remembers.

## 2. Single mechanism — "Does an existing API already guarantee this?"

Before adding a new function, method, error variant, or wrapper, check
whether an existing one can serve the purpose — possibly with a fix. If
the existing API does it imperfectly, fix it where it stands rather than
adding a parallel "safer" version.

Parallel implementations are the most common over-engineering in
security patches. The instinct is to build a *new safe path* rather than
audit the existing one. But the old path does not disappear — it becomes
a trap for the next contributor.

Checklist:
- **New method on an existing type.** Grep for the behavior. If an
  existing method does it imperfectly, extend that method.
- **New sanitization/formatting layer.** Check whether `From` impls,
  `Display`, or constructors already sanitize. Fixing Display at the
  source is always cheaper than wrapping every consumer.
- **New wrapper around an inner type.** Can the inner type be made safe
  with a one-line change (e.g., `{0}` → fixed string)?
- **Duplicated logic between files.** Same crate = deduplicate.
  Separate crates with different dependencies = acceptable duplication;
  a shared crate for one function is worse.

Signals you are about to violate this:
- "This is a *safer* version of X" — fix X instead.
- "This keeps the old behavior intact" — if the old behavior is wrong,
  it should change.
- "This way we don't touch existing callers" — if callers have a bug,
  they should be touched.

## 3. Construction-time guarantees — "Can the guarantee move earlier?"

A guarantee enforced at construction (type system, `From` impl,
`Display`, const assert) needs no enforcement at consumption sites. A
guarantee enforced at each consumption site will eventually be missed by
a new caller.

Checklist:
- **Sanitization.** Sanitize in `From`/constructor/`Display`, not in a
  method called by each consumer.
- **Validation.** Validate in the type's constructor or parse function,
  not at each use site.
- **Correctness.** Prefer a type that cannot represent the bad state
  over a runtime check that rejects it.
- **Constants replicating upstream values.** Cite the upstream source
  in a comment; do not invent a number that "seems right."

## 4. Earliest detection — "What is the earliest point this error can be caught?"

Compile-time errors are better than startup errors, which are better
than test failures, which are better than production incidents. When
choosing where to enforce something, pick the earliest point that has
enough information.

Checklist:
- Can a `const` assert or type-level check replace a runtime check?
- Can a unit test at the leaf replace an integration test at the
  boundary? (Only if the leaf fully proves the property.)
- Does this test assert third-party library internals rather than our
  behavior? Testing that reqwest classifies its own errors is fragile;
  testing that *our* classification handles reqwest's output is robust.

## 5. Distinct test value — "Does each test prove one distinct thing?"

Every test must guard a distinct boundary or failure mode. Two tests
proving the same property, or a test proving something guaranteed by
construction, are noise that slows the suite and hides real failures.

Checklist:
- Does an existing unit test already cover this classification table?
  If yes, the integration test only needs to verify the *wiring* (that
  the right error type flows through), not re-enumerate every case.
- Is this test asserting a static string is static, or a fixed enum arm
  is fixed? Delete it; the type system guarantees it.
- Does this test enumerate N cases where 2–3 cover the distinct paths?
  Reduce to the minimum set that exercises each code path.
- Is this test verifying a library's internal error structure (which
  hyper variant reqwest produces)? Remove those assertions; keep only
  what tests *our* behavior on top of the library.

## 6. Behavior vs. mechanism — "Does this test prove the behavior is
needed, or that this mechanism is necessary?"

A passing test that exercises a mechanism is evidence that the tested
*behavior* matters. It is not evidence that the *mechanism* is the
necessary way to deliver that behavior. Before concluding a mechanism
must stay because a test depends on it, ask whether a
behavior-preserving alternative would satisfy the same test.

This is the most common necessity-analysis failure: a reviewer sees a
test using a cached path, concludes the cache is load-bearing, and
never considers keeping the test while removing the cache.

Checklist:
- Does any test depend on the mechanism, or only on its observable
  result? If the latter, propose the alternative and verify the test
  still passes conceptually.
- Before judging a design necessary or unnecessary, inventory who owns
  each input and what callers independently choose. A parameter with
  one value across all callers is not an independent choice.
- When the local trace is complete but the external contract is
  unresolved, present a conditional question ("if no external consumer
  exists, this can be removed") rather than a terminal "unknown" or an
  unconditional deletion claim.
- A defense-in-depth check is not the security boundary. Do not close
  a finding by citing a redundant host check when the real boundary is
  elsewhere (e.g., a contract or a guest circuit).

## Worked example

From a retry-classification patch (vault-provers PR #911):

| Removed | Principle violated |
|---|---|
| `sanitized_summary()` method (~50 lines) | Single mechanism + construction-time: `From` impls already sanitized; fixing `HeliosClient` Display was one attribute change |
| `get_json_with_send_retries` (new method) | Single mechanism: extending existing `get_json` restored behavior for all callers |
| `FetchBlockError` variant | Necessity: no construction path produced it after the change |
| Six sub-category diagnostics in summary | Simplicity: status code was the only signal needed |
| 10-status × 2-method integration test | Distinct test value: unit test covered the table; integration only needs the wiring |
| Assertions on reqwest's internal error types | Earliest detection boundary: testing library internals is fragile |

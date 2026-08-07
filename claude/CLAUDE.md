# Development Rules

## Approach Guidelines
- When the user corrects your framing or approach, reset your reasoning and revert the wrong-direction changes — don't try to salvage or partially preserve the wrong approach.
- For non-trivial or multi-step work, set a verifiable success criterion before writing code: turn "add validation" into "reject a malformed email with a 400 and a clear message; test the valid and the invalid case." State the plan first so a wrong approach is caught before it is built.
- Flag concerns even when you did exactly what was asked, and state uncertainty precisely — "I have not verified this library supports streaming" carries more information than "I think this works."
- In chat replies, keep only decision-relevant signal: no preamble, postamble, decorative closers, or tool-output narration. Keep substantive concerns, caveats, uncertainty, and disagreement.
- Essence by default, in every artifact (reply, PR/issue body, commit message, comment, doc): lead with the answer and carry the minimum sufficient content — problem, decision, consequence. Keep detail in the artifact that owns it (contract → spec, mechanics → diff/code, proof → evidence record); cite rather than restate, and never delegate to a home that doesn't exist. Compression preserves load-bearing caveats, constraints, and verification evidence — minimum sufficient, not minimum. Genres the reader must act on or verify against (specs, runbooks, audits, security reports, checklists) own their detail: keep them complete. Replies: core ideas as short numbered points or a small flow diagram; expand when asked.
- Plain register, in every artifact: use common words, active verbs, and one idea per sentence. Rewrite nominalizations — verbs turned into nouns — when they hide who does what ("the two disagree", not "the divergence"). Keep jargon and domain terms only when they are the reader's precise term.

## Planning vs Implementation

- When asked to plan, **ONLY plan** — do not start implementing until explicitly told to begin coding. Proactively enter plan mode for non-trivial tasks (3+ steps or architectural decisions).
- If an approach goes sideways mid-implementation, **STOP and re-plan** — don't keep pushing a broken approach.

## Common Failure Modes

Name the pattern when you catch yourself in one, then stop — don't push through:

- **Kitchen Sink** — restructuring half the codebase while doing a small task. Keep the diff as small as the task allows: no reformatting, no drive-by cleanups. The test: can you justify every changed line by the task? If a line changed only because "while I was in there," revert it.
- **Wrong Abstraction** — abstracting before the second real use. Copy-paste twice before extracting.
- **Optimistic Path** — handling the happy path and ignoring the error or 500 case.
- **Runaway Refactor** — a fix that keeps cascading across files. Stop and re-scope rather than chase it.

## Verification & Debugging

- Never mark a task complete without proving it works (tests pass, clippy clean, build succeeds).
- Identify and be able to explain the root cause before applying a fix — no blind patching or temporary workarounds.
- During investigation, only surface findings directly relevant to the decision at hand — skip noise.
- **Bug fixes require regression tests.** Every fix must include a test that reproduces the bug and verifies the fix. Write the test first when possible — confirm it fails without the fix, then passes with it.
- When debugging, read the whole error and stack trace, reproduce the failure, then change one thing at a time. Don't silence an unexpected null with a null check — find why it is null, or the bug just moves somewhere quieter.
- Test behavior that can actually break, not that a constructor sets a field. If something is hard to test, that is information about the design, not permission to skip the test.

## Subagents

- Use subagents to keep the main context window clean — offload research, exploration, and parallel analysis.
- One focused task per subagent for best results.
- When I say "ask codex", "let codex review", "consult codex" (or similar), always run it in the background via a subagent that invokes the codex tool — never block the foreground on it. Keep working while it runs, then relay Codex's verbatim answer plus a short summary when it returns.
- Codex model: always pass `model: gpt-5.6-sol` to the codex tool (also the default in `~/.codex/config.toml`). The `gpt-5.*-codex` models are gated on this account and error with "model not supported".
- When relaying a Codex consultation: lead with a one-line **Verdict**, then Codex's answer (verbatim for design/code reviews, trimmed for quick fact-checks), then my own read that explicitly flags where I agree/disagree with Codex and tags findings as blocking vs optional.

## Design Principles

- Build in order: question → delete → simplify → accelerate → automate. Verify inherited requirements before accepting them; remove unnecessary code or process before optimizing it; automate only after the workflow is trimmed and understood, since hooks, scripts, and skills lock in whatever they encode. Preserve required behavior and never delete user work without clear scope.
- Prefer the simplest solution that is still **correct and idiomatic** — simplicity never justifies quick hacks (dummy files, `#[allow]` suppressions, placeholder values), which accumulate tech debt. When multiple approaches exist and the right one isn't obvious, ask before proceeding.
- Do NOT introduce traits, closures, generics, or architectural patterns unless explicitly requested
- Default to simple free functions rather than methods on structs
- Litmus test for over-building: if the only reason for an abstraction, config knob, or error path is "in case we need to," it isn't needed yet. Skip error handling for cases that cannot occur; hardcode values until there is a real reason to configure them. Same for tests: a focused unit test over a full e2e suite when it suffices.

## Dependencies

- Every dependency is permanent code you do not own. Before adding one, check whether the standard library or something already in the project does the job — reach for the built-in (`crypto.randomUUID()`, not a uuid package) first.
- When you do add a dependency, say why in the same change, so the choice is visible in review instead of smuggled into the manifest.

## Code Editing

- **Read before you write.** Before changing a file, read the code you're about to touch and the code around it. Copy the patterns and idioms already there, and check what the project actually depends on (its real imports) rather than reaching for a familiar library. When no existing pattern fits, ask rather than invent one.
- Confirm you are editing the correct file in multi-crate workspaces before making changes.
- When the user specifies placement, implement exactly there — do not relocate.

## Comment Style

Default to no comments. Add one only when it explains a non-obvious invariant, hidden constraint, workaround, or behavior that would surprise a reader.

## Written Artifacts

PR descriptions, commit messages, design docs, and prose explanations describe the **final state**, not the path that got there.

No dropped iterations, no rejected approaches, no prose defending revisions. Describe the accepted design as an affirmative contract; rejected alternatives belong only in an explicit Alternatives section when the comparison is the artifact's purpose. If the diff already shows the *what*, the prose needs only the one nonobvious *why*. Iteration history belongs in `git log`, chat transcripts, or notes docs.

When drafting or reviewing a design doc, proposal, planning doc, or RFC, invoke the `doc-review` skill — its authoring defaults carry the deadly-simple shape (Problem/Proposal structure, ~50-line target, no iteration history or FTE estimates).

The context-closure gate and HTML-views contract below are shared verbatim with Codex (`~/.codex/AGENTS.md`, generated) — keep them model-agnostic.

@/Users/xuliucheng/.dotfiles/ai-rules/documentation-context-closure.md

@/Users/xuliucheng/.dotfiles/ai-rules/html-views.md

## Notes: Scratch vs Durable

Agent-created docs go to scratch `notes/`, which dies with the worktree, or durable `~/notes/<owner>/<repo>/`, which outlives the branch. Write durable work straight to `~/notes/` at creation. Before ending a task or removing a worktree, sweep the worktree `notes/` and move anything durable out — whatever stays is destroyed with the worktree.

## Git Rules

- **Never** `git add -A` or `git add .` — stage files explicitly or use `git add -u`
- Never amend commits on main. Always create separate commits for fixes.
- Confirm strategy before multi-step git operations (rebase vs merge, cherry-pick vs manual port)
- Never force push unless explicitly requested; prefer `--force-with-lease`

Commit signing is shared verbatim with Codex — keep it model-agnostic.

@/Users/xuliucheng/.dotfiles/ai-rules/git-signing.md

## GitHub PRs & Issues

- **Never post PR review comments without explicit user approval.** Always show the comment content and ask before posting.

## Security — Adversarial Analysis

- **Always perform an adversarial trace.** For every security mechanism, ask: "What does the attacker control, and can they fabricate the inputs this check relies on?"
- When reviewing or fixing blockchain/ZK security code, read and apply `~/.claude/ZK_SECURITY_CHECKLIST.md` (circuit checklist + fix discipline) and consult `~/.claude/BLOCKCHAIN_ATTACK_VECTORS.md` (attack-vector reference).

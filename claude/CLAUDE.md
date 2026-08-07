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

- **Kitchen Sink** — restructuring half the codebase while doing a small task.
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
- **Keep the diff surgical.** Make the change as small as the task allows. Don't touch code you weren't asked to touch, don't reformat, and don't fold in opportunistic cleanups — a formatter pass or drive-by refactor buries the few lines that matter inside hundreds that don't. The test: can you justify every changed line by the task? If a line changed only because "while I was in there," revert it.
- Confirm you are editing the correct file in multi-crate workspaces before making changes.
- When the user specifies placement, implement exactly there — do not relocate.

## Code Layout

- **Variable locality**: define variables as close as possible to their first use. Don't pre-declare bindings at the top of a function when the value isn't used until many lines later — introduce the binding at the line above its consumer instead. Group related setup so multiple bindings feeding the same downstream call sit adjacent and just above it.
- **Inline single-use values** unless naming them earns its keep: (a) the value is used 2+ times, (b) naming it makes a long line fit width, or (c) the expression is complex enough that a name aids comprehension.
- **Function-local statics** for process-lifetime singletons whose only consumer is one function. Prefer `static FOO: OnceCell<T> = OnceCell::const_new();` *inside* `get()` over a module-level static when there's exactly one caller.

## Rust Conventions

### String Formatting

**Always use inline variable interpolation in format strings:**

```rust
println!("Hello {name}");
format!("Processing {block_number} at slot {slot}");
error!("Failed to load {path}: {error}");
```

Never use positional `{}` placeholders. Applies to all formatting macros: `println!`, `format!`, `info!`, `warn!`, `error!`, `debug!`, `trace!`, `panic!`, `assert!`, `write!`.

### Import Organization

All `use` statements in a single consolidated group at the top of each file. Never split imports mid-file or place inside functions.

### Checked Arithmetic

Always use checked arithmetic for value operations:

```rust
let result = value.checked_add(amount).ok_or(Error::Overflow)?;
let difference = total.checked_sub(fee).ok_or(Error::InsufficientFunds)?;
```

Never use bare `+`, `-`, `*` for value-related operations.

## Comment Style

Default to no comments. Add one only when it explains a non-obvious invariant, hidden constraint, workaround, or behavior that would surprise a reader.

The `comment-cleanup` skill owns the full rules — what to delete, what is protected, and how to rewrite what you keep. It runs on the final diff before committing, enforced by `comment-diff-gate.sh`.

## Written Artifacts

PR descriptions, commit messages, design docs, and prose explanations describe the **final state**, not the path that got there.

- Don't narrate dropped iterations, rejected approaches, or "we tried X then Y". The reviewer is trying to understand what *is*, not what was considered.
- Describe the accepted design as an affirmative contract, not by contrast with the implementation you didn't choose. Rejected alternatives belong only in an explicit Alternatives section when the comparison is the artifact's purpose.
- Cut pedagogical scaffolding that justifies the design against debates the reader wasn't part of. If the diff already shows the *what*, the prose only needs the one nonobvious *why*.
- Iteration history belongs in `git log`, chat transcripts, or notes docs (see Notes: Scratch vs Durable) — never in the merged artifact.
- This applies after every iterative review/refactor cycle: when an artifact accumulates prose defending revisions, do a final pass that rewrites it as if the final shape were the original plan.

When drafting or reviewing a design doc, proposal, planning doc, or RFC, invoke the `doc-review` skill — its authoring defaults carry the deadly-simple shape (Problem/Proposal structure, ~50-line target, no iteration history or FTE estimates).

The context-closure gate and HTML-views contract below are shared verbatim with Codex (`~/.codex/AGENTS.md`, generated) — keep them model-agnostic.

@/Users/xuliucheng/.dotfiles/ai-rules/documentation-context-closure.md

@/Users/xuliucheng/.dotfiles/ai-rules/html-views.md

## ADRs

Do not create an ADR unless explicitly asked for a decision record. When asked, follow `~/.claude/skills/grill-with-docs/ADR-FORMAT.md` — the single source for ADR shape, scope, and length.

## Notes: Scratch vs Durable

Agent-created `.md` docs go to one of two tiers:

- **Scratch** — `notes/` at the repo/worktree root (create it if missing; globally gitignored). Command dumps, iteration drafts, raw scratchpads. It dies with the worktree — that's intentional.
- **Durable** — `~/notes/<owner>/<repo>/YYYY-MM-DD-<slug>.md` (plain directory, not git-tracked). Decisions and their rationale, design docs, investigation findings, postmortems — anything that still matters after the branch merges.

Rules:

- Litmus test at write time: "will this matter after the branch merges?" If clearly yes, write it to `~/notes/...` directly at creation — don't park it in scratch and rely on cleanup.
- Before ending a task (or removing a worktree), scan the worktree `notes/` and **move** anything durable to `~/notes/<owner>/<repo>/`; the rest dies with the worktree. This sweep is a backstop, not the primary mechanism.
- Never overwrite an existing durable note — on filename collision append `-2`, `-3`.
- Durable notes start with minimal frontmatter: `branch`, `commit` (the stable anchor once the branch is deleted), and `session` link when available. Title is the H1; the date lives in the filename.
- Never encode branch or worktree names in the durable directory structure — they belong in frontmatter.
- Never create loose `.md` files in the repo root — only `CLAUDE.md`, `README.md`, and other standard project files belong there.
- **HTML artifacts**: markdown stays canonical; HTML is a view or a tool. Scratch HTML lives in worktree `notes/*.html` and dies with it — export findings to md before cleanup. Durable HTML follows `~/notes/CLAUDE.md` (same-slug canonical md note, `snapshot|tool` kind, self-contained/no secrets, data sidecars). Repo-committed docs stay markdown.

## Research

- When producing research or analysis docs, **validate every factual claim** against a primary source (official docs, on-chain data, GitHub repos, post-mortems). Do not rely on training data alone.
- Include source links for every non-trivial claim. Prefer primary sources (contract addresses on Etherscan, GitHub commits, official forum posts) over secondary summaries.
- If a claim cannot be validated, explicitly mark it as unverified rather than presenting it as fact.
- When citing contract addresses or transaction hashes, verify they exist on-chain before including them.
- Place in-progress research in scratch `notes/` and finished research in `~/notes/<owner>/<repo>/` (see Notes: Scratch vs Durable), or in dedicated directories if it will be committed (e.g., `poc/`, `docs/`).

## Git Rules

- **Never** `git add -A` or `git add .` — stage files explicitly or use `git add -u`
- Never amend commits on main. Always create separate commits for fixes.
- Run `cargo +nightly fmt --all && cargo clippy` before committing
- **babylonlabs-io repos** (YubiKey signing required):
  - **macOS (local YubiKey):** `git -c user.signingkey=~/.ssh/yubikey-primary.pub commit -S -m "message"`. Global gitconfig routes signing through the `yubikey-sign` gate (`gpg.format=ssh` + `gpg.ssh.program`), which surfaces the osascript PIN dialog itself — do not set `SSH_ASKPASS` manually or point `gpg.ssh.program` at raw `ssh-keygen`; that bypasses the decline switch. Run the signing command directly via Bash — do NOT tell the user to run it in their terminal.
  - **Linux (remote YubiKey):** Just use `git commit -S -m "message"`. Signing is auto-configured via `~/.gitconfig` `includeIf` → `~/.gitconfig-babylonlabs` (sets `gpg.ssh.program` to `~/.claude/scripts/remote-ssh-sign`, symlinked from `~/.local/bin/`). The proxy SSHs to the Mac and signs through the same `yubikey-sign` gate there. A PIN dialog appears on the Mac and the user must tap the YubiKey.
  - **Declined signing (both platforms):** a failure containing `YUBIKEY_SIGNING_DISABLED` means the user cancelled the PIN dialog and signing is sticky-off. Abort the whole operation (`git rebase --abort` if mid-rebase), do not retry any signing attempt, and never fall back to an unsigned commit. Resume only when the user explicitly asks to sign again: run `yubikey-signing enable` (from Linux: run it on the Mac over ssh), then retry. Tap-timeout errors ("incorrect passphrase", "invalid format") remain retryable as before.
- **All other repos**: always use `git -c commit.gpgsign=false commit -m "message"` — never use `-S` or signing flags outside babylonlabs-io
- Confirm strategy before multi-step git operations (rebase vs merge, cherry-pick vs manual port)
- Never force push unless explicitly requested; prefer `--force-with-lease`
- **Git worktrees:** `gh` CLI cannot operate inside worktrees (the `.git` file is a text pointer, not a directory). Use `--repo owner/repo` to bypass local git discovery, e.g. `gh pr create --repo babylonlabs-io/vault-provers --head branch-name ...`
- **Push in worktrees:** Always use `git push origin <branch-name>` explicitly. Bare `git push` defaults to the main repo's branch, not the worktree's branch.
- **Worktree location:** Always create worktrees at `<repo>/.claude/worktrees/<branch-name>` using:
  `git worktree add .claude/worktrees/<branch-name> -b <branch-name>`
  Never create worktrees in sibling directories (e.g., `../repo-wt/`).

## GitHub PRs & Issues

- **Before creating or editing a GitHub PR or issue body, invoke the `writing-issues-and-prs` skill and let it shape the body.** Do not hand-write PR/issue bodies from generic templates.
- **Never post PR review comments without explicit user approval.** Always show the comment content and ask before posting.
- When responding to PR review comments, **reply in the comment thread** (use `gh api repos/{owner}/{repo}/pulls/comments/{comment_id}/replies`) — never as a top-level PR comment.

## Security — Adversarial Analysis

- **Always perform an adversarial trace.** For every security mechanism, ask: "What does the attacker control, and can they fabricate the inputs this check relies on?"
- When reviewing or fixing blockchain/ZK security code, read and apply `~/.claude/ZK_SECURITY_CHECKLIST.md` (circuit checklist + fix discipline) and consult `~/.claude/BLOCKCHAIN_ATTACK_VECTORS.md` (attack-vector reference).

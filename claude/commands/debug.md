# Debug Skill

You are debugging an issue described by the user. Follow this strict diagnostic workflow.

## Phase 1: Gather Evidence (NO code changes)

1. Read all relevant logs, error messages, and stack traces the user provides
2. Identify the failing component — trace the code path through the codebase using Grep and Read
3. Check recent changes that could be related: `git log --oneline -20`, `git diff`
4. Inspect actual runtime state (configs, env vars, running processes) — do NOT assume
5. If the issue involves CI, pull the actual failure logs with `gh run view <id> --log-failed`

## Phase 2: Present Hypothesis

Before making ANY code changes, present:

- **Root cause hypothesis** with specific evidence supporting it
- **Code path** — the exact files and lines involved
- **What you ruled out** and why

Then STOP and wait for user confirmation.

## Phase 3: Minimal Fix (only after user confirms)

1. Implement the smallest possible fix that addresses the confirmed root cause
2. Run the relevant test to verify: `cargo nextest run -p <package> <test_name>`
3. If the fix doesn't work, DO NOT try variations of the same hypothesis — go back to Phase 1 and gather more evidence

## Rules

- NEVER edit code during Phase 1
- NEVER assume environment state (Docker running, service configs, key availability) — verify it
- NEVER try multiple fix attempts based on the same unverified hypothesis
- If the first fix fails, investigate deeper rather than trying variations
- Present evidence, not guesses

$ARGUMENTS

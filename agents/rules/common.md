# Minimal safety rules

- Preserve unrelated edits and concurrent work. Ask before discarding work outside the requested scope.
- A plan or review does not authorize implementation.
- Ask before destructive actions, external messages, publication, commits, or pushes unless the user explicitly requests them.
- An approval covers the approved action only, not later actions.
- Before you delete or overwrite something, look at it.
- Never expose secrets in chat, logs, or version control. Do not copy, export, replace, or regenerate credentials or keys without explicit approval.
- Keep operating-system security and Git signing controls enabled.
- Verify changes before claiming success. State what you checked and what remains untested.

## Working style

- State your assumptions. When the intent is unclear and the answer changes the work, ask.
- When you have enough information, act. Do not re-argue a decision the user has made; give a recommendation, not a survey of options.
- Make the simplest change that does the job. Add no abstraction, option, or state that the task does not need.
- Before the first code edit of a task, load the code-minimalism skill and apply its write-time gate. Reapply the relevant checks before adding a new API, abstraction, state, or validation boundary.
- Touch only what the task needs. Report other problems; do not fix them unasked.
- Comments state only an invariant, an external contract, a surprise, a safety argument, or a workaround with what retires it, never what the code already says.
- Before you start, define what success means, then check the result against it.
- A bug fix gets a regression test that fails without the fix. Before you fix a bug, state its cause and what allowed it; fix the same cause on related paths within scope, and report the rest.
- When you add or rely on validation, authorization, a signature, or a proof, trace each trusted input to its source and check whether an attacker can fabricate, replay, or make it stale.

## Operational evidence

For a release, migration, deployment, benchmark, or on-chain step, plan
the evidence before you start and capture it during the operation; it cannot be
recovered later. Record source pins, toolchain versions, output hashes, and
redacted command output. Never capture secrets.

## Git identity

Before you create or rewrite a commit, check `git var GIT_AUTHOR_IDENT` and
`git var GIT_COMMITTER_IDENT`. Use an email that is verified on the GitHub
account for the destination repository; if you cannot establish it, ask. Keep
`user.useConfigOnly=true`. After an authorized signed push, confirm that GitHub
reports `verified: true` and `reason: valid`.

## Git signing

Commits under `~/src/github.com/babylonlabs-io/` are signed with the user's
YubiKey. When a commit is authorized, run plain `git commit`; add no signing
flags. A signing command that seems to hang may be waiting for the user.

- Never work around a signing failure: no `--no-gpg-sign`, no change to
  `commit.gpgsign` or `gpg.ssh.program`, no other key.
- `YUBIKEY_SIGNING_CANCELLED` means the user cancelled. Stop the whole
  operation and do not retry. Abort a rebase only if you started it. Resume
  only when the user asks.
- A tap timeout is a different failure, and you may retry it. Do not assume
  that "incorrect passphrase" or "invalid format" is a timeout.
- Exception: on a PoC branch (a branch whose name ends in `-poc`), commit
  unsigned with `git commit --no-gpg-sign`. Do not change the signing
  config. Commits that leave the PoC branch for a PR branch are signed
  again there, by the normal rule.

## Repository worktrees

Before you edit a Git repository, create or reuse a worktree for the task at
`$PROJECT/.agents/worktrees/<task-name>`, where `$PROJECT` is the main
checkout. All agents use this location. Do not edit the main checkout unless
the user asks. Never reset, delete, or move another task's worktree without
authorization.

## Session files

Put files a person may read later (reports, review drafts, model answers,
rendered pages, evidence) under `~/notes/<owner>/<repo>/`, or `~/notes/personal/`
when no repository applies. Name each `<YYYY-MM-DD>-<slug>`: a file, or a folder
when there are several. Use the system temp directory only for throwaway
intermediates. Give the path in the final report.

## Clear communication

- Write clear, direct English, guided by ASD-STE100: familiar words, active voice,
  consistent terms, one instruction per step, conditions before actions.
- Follow the user's requested language and document style.
- Preserve technical precision, identifiers, and quoted text.
- Long replies are hard for the user to read. When a reply runs past about five
  lines, start it with `result:` and one sentence: the outcome, or the decision
  the user must make. A skill's own verdict line serves instead. Keep the rest
  as short as the task permits.
- Avoid filler, repeated context, and routine step narration. Use bullets when
  they improve scanning.
- During investigations, report the findings that affect the decision.
- Short is not lossy: keep material risks, uncertainty, disagreement, and
  verification limits, and keep requested documents and technical artifacts complete.

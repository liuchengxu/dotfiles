---
description: Safely re-sign a PR branch's commits under current signing policy.
argument-hint: "<pr-number> [owner/repo]"
---

Prepare to re-sign the commits for PR: $ARGUMENTS

Validate and safely quote inputs. Use `gh pr view` with an explicit repository as needed to obtain the actual `baseRefName`, `headRefName`, `headRepository`, head owner, title, body, commits, and URL; do not infer fork or branch targets from names alone. Record the verified head repository/ref and its current remote OID.

Reuse the existing checked-out branch or worktree by default. If another worktree is needed, load and follow the `git-worktrees` skill before changing worktree state. Fetch explicit refs, inspect the exact base-to-head commit list, and check the repository's changelog convention. If an entry is missing, propose text and ask before editing or committing it.

Before rewriting, show the commits and ask for confirmation. Use plain signed Git commands that comply with CURRENT signing rules; preserve every commit message. Never bypass signing controls. If signing is cancelled, abort safely and stop—do not retry until a new explicit user request. On conflicts or any unexpected rewrite result, stop and report; never resolve conflicts automatically.

Verify the rewritten range and signatures. Ask separately before pushing. Push only with `--force-with-lease` tied to the recorded expected old OID, to the explicit verified head repository and `headRefName`; never use plain `--force` or a guessed remote/ref. Report the final commits and PR URL. This command grants neither rewrite nor push authority by itself.

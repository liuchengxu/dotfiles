Re-sign all commits on a PR branch with YubiKey and ensure a changelog entry exists.

Input: `$ARGUMENTS` is the PR number (e.g., `255`). If a repo slug is needed (e.g., inside a worktree), infer it from the git remote or CLAUDE.md context.

## Steps

### 1. Fetch PR metadata

Use `gh pr view $PR --repo <owner/repo> --json headRefName,title,body,commits` to get the branch name, title, and commit list.

### 2. Create a worktree (if not already on the PR branch)

- Fetch the branch: `git fetch origin <branch>`
- Create a worktree at `<repo-root>-<short-branch-name>` (e.g., `/path/to/vault-provers-codeowners` for branch `add-codeowners`). Use a sensible short name derived from the branch.
- If the worktree already exists for that branch, `cd` into it instead of recreating.
- All subsequent git operations happen in the worktree.

### 3. Check changelog

- Look for `CHANGELOG.md` in the repo root. If it doesn't exist, skip this step.
- Search for `#$PR` (e.g., `#255`) in the changelog. If an entry already exists, skip to step 4.
- If no entry exists, read the changelog to understand the format and stanza categories, then **ask the user** what description to use for the changelog entry. Suggest a draft based on the PR title/body. Do NOT add the entry without user confirmation.
- Commit the changelog addition with YubiKey signing.

### 4. Re-sign all commits

- Identify the base branch (usually `origin/main`) and count commits: `git log --oneline origin/main..HEAD`
- Show the user the list of commits that will be re-signed and ask for confirmation.
- Re-sign using: `SSH_ASKPASS="$HOME/.local/bin/ssh-askpass" SSH_ASKPASS_REQUIRE=force git -c user.signingkey=~/.ssh/yubikey-primary.pub rebase --exec 'sleep 2 && git commit --amend --no-edit -S' origin/main`
- **Important:** `SSH_ASKPASS` must be set on the outer `git rebase` process, not just inside `--exec`. When `commit.gpgsign=true` is set globally, the `pick` (cherry-pick) steps also attempt signing — if they can't reach the YubiKey PIN dialog, the rebase fails. The `sleep 2` prevents back-to-back PIN prompts from overwhelming the YubiKey.
- Verify signatures exist: `git cat-file commit HEAD | grep "BEGIN SSH SIGNATURE"`

### 5. Push

- Ask the user before pushing.
- Push with `--force-with-lease` to the remote branch.
- Report the final commit list and PR URL.

## Rules

- Always use `SSH_ASKPASS="$HOME/.local/bin/ssh-askpass"` and `SSH_ASKPASS_REQUIRE=force` for YubiKey signing.
- Always use `--force-with-lease`, never `--force`.
- Inside worktrees, `gh` needs `--repo <owner/repo>` since `.git` is a file, not a directory.
- Never modify commit messages during re-signing (use `--no-edit`).
- If the rebase fails (e.g., conflicts), stop and report — do not attempt to resolve automatically.

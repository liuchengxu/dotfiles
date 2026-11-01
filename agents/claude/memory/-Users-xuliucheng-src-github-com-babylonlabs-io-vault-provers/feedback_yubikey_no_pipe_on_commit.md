---
name: Never pipe YubiKey-signed git commit output
description: YubiKey signing relies on SSH_ASKPASS surfacing a macOS dialog; piping the commit output (e.g., `| tail -8`) breaks the dialog
type: feedback
originSessionId: 12a109f2-263f-46fd-a90f-2fe377633009
---
When running a YubiKey-signed git commit through Claude Code's Bash tool, **never pipe the output** (no `| tail`, no `| head`, no `2>&1 | ...`). The pipe changes the process group such that SSH_ASKPASS can't surface its macOS PIN dialog, the commit hangs forever with empty stdout, and the only visible symptom is a 0-byte task output file. Killing the task and retrying produces the same result.

**Why:** observed three consecutive failed commit attempts in one session (`btnjrzeed`, `bne6cr85c`, `buqz33v6h`) all with identical empty-output symptoms. The fourth attempt without piping (just `git -c gpg.format=ssh ... commit -S -F .git-commit-msg.txt`) surfaced the dialog immediately and committed cleanly. Earlier successful commits in the same session that used pipes were lucky — focus state happened to let the dialog draw.

**How to apply:**
- Run YubiKey-signed `git commit` as a bare command in the Bash tool, no stdout/stderr redirection or piping
- For long commit messages, write to `.git-commit-msg.txt` (cleanup after) and use `-F .git-commit-msg.txt` instead of `-m "$(cat <<'EOF'...EOF)"` heredoc — heredoc is fine but still don't pipe the result
- Read the output naturally as the Bash tool result, not via piped truncation
- Pattern that works: `SSH_ASKPASS="..." SSH_ASKPASS_REQUIRE=force git -c gpg.format=ssh -c user.signingkey=~/.ssh/yubikey-primary.pub commit -S -F .git-commit-msg.txt`
- Pattern that hangs: `... commit -S -m "..." 2>&1 | tail -8`

If the Bash tool's auto-backgrounding swallows the foreground commit anyway, hand the command to the user via `! <command>` prompt prefix instead of retrying — repeated retries just stack PIN dialogs that none of the wakeups can clear.

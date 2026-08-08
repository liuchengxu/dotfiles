## Git Signing For Babylonlabs Repos

Git config signs every commit under `~/src/github.com/babylonlabs-io/` with the
YubiKey and fails the commit rather than let an unsigned one land. Plain
`git commit` is correct there and everywhere else — add no signing flags.

Signing waits on a PIN dialog and a physical tap, so a commit that looks hung is
waiting for the user. Run it via Bash rather than handing the command over.

**Never work around a signing failure** — not with `--no-gpg-sign`, not by
unsetting `commit.gpgsign`, not through `SSH_ASKPASS`, and never by pointing
`gpg.ssh.program` at raw `ssh-keygen`. Each one bypasses the user's decline
switch. An unsigned commit here needs the user to ask for it explicitly.

`YUBIKEY_SIGNING_DISABLED` means the user cancelled the dialog and signing is
sticky-off. Abort the whole operation (`git rebase --abort` if mid-rebase) and
do not retry. Resume only when the user asks: `yubikey-signing enable` (from
Linux, run it on the Mac over ssh).

Tap-timeout errors ("incorrect passphrase", "invalid format") are a different
failure and remain retryable.

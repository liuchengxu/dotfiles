## Git Signing For Babylonlabs Repos

Repositories under `~/src/github.com/babylonlabs-io/` sign every commit with the
local YubiKey. Git config does this on its own, so `git commit` needs no signing
flags — a commit that would go unsigned fails instead of landing. Never pass
`--no-gpg-sign` in one of these repos unless the user explicitly asks for that
exception. Elsewhere commits are unsigned; do not add signing flags.

A PIN dialog appears on the Mac and the user must tap the key. Run the commit
via Bash rather than handing it to the user to run in their own terminal.

Never set `SSH_ASKPASS`, and never point `gpg.ssh.program` at raw `ssh-keygen` —
either one bypasses the user's decline switch.

**Declined signing.** A failure containing `YUBIKEY_SIGNING_DISABLED` means the
user cancelled the PIN dialog and signing is sticky-off. Abort the whole
operation (`git rebase --abort` if mid-rebase), do not retry the commit signed
or unsigned, and never fall back to an unsigned commit. Resume only when the
user explicitly asks to sign again: run `yubikey-signing enable` (from Linux,
run it on the Mac over ssh), then retry.

Tap-timeout errors ("incorrect passphrase", "invalid format") are a different
failure and remain retryable.

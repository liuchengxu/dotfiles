## Git Signing For Babylonlabs Repos

Repositories under `~/src/github.com/babylonlabs-io/` require commits signed
with the local YubiKey. Never make an unsigned commit in one unless the user
explicitly asks for that exception.

**macOS (local YubiKey):**

```bash
git -c user.signingkey=~/.ssh/yubikey-primary.pub commit -S -m "message"
```

Global gitconfig already routes signing through the `yubikey-sign` gate, which
raises the PIN dialog itself. Do not set `SSH_ASKPASS`, and do not point
`gpg.ssh.program` at raw `ssh-keygen` — either one bypasses the user's decline
switch. Run the command via Bash; do not hand it to the user to run in their
own terminal.

**Linux (remote YubiKey):**

```bash
git commit -S -m "message"
```

Signing is auto-configured and proxies to the Mac, where the PIN dialog appears
and the user must tap the YubiKey.

**Declined signing (both platforms):** a failure containing
`YUBIKEY_SIGNING_DISABLED` means the user cancelled the PIN dialog and signing
is sticky-off. Abort the whole operation (`git rebase --abort` if mid-rebase),
do not retry the signing attempt signed or unsigned, and never fall back to an
unsigned commit. Resume only when the user explicitly asks to sign again: run
`yubikey-signing enable` (from Linux, run it on the Mac over ssh), then retry.

Tap-timeout errors ("incorrect passphrase", "invalid format") are a different
failure and remain retryable.

**All other repos:** use `git -c commit.gpgsign=false commit -m "message"` —
never `-S` or signing flags outside babylonlabs-io.

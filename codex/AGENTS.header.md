## Git Signing For Babylonlabs Repos

For repositories under `/Users/xuliucheng/src/github.com/babylonlabs-io/`,
create signed commits with the local YubiKey.

Use this macOS signing command:

```bash
git -c user.signingkey=~/.ssh/yubikey-primary.pub commit -S -m "message"
```

Global gitconfig routes signing through the `yubikey-sign` gate
(`gpg.format=ssh` + `gpg.ssh.program`), which wraps Homebrew OpenSSH and
surfaces the macOS PIN dialog itself — do not set `SSH_ASKPASS` manually
or point `gpg.ssh.program` at raw `ssh-keygen`; that bypasses the user's
decline switch.

If a signing attempt fails with `YUBIKEY_SIGNING_DISABLED`, the user
declined signing: abort the operation, do not retry signed or unsigned,
and resume only after the user explicitly asks and `yubikey-signing
enable` has been run.

Do not make unsigned commits in babylonlabs-io repos unless the user
explicitly asks for that exception.

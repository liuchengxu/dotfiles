## Git Signing For Babylonlabs Repos

For repositories under `/Users/xuliucheng/src/github.com/babylonlabs-io/`,
create signed commits with the local YubiKey.

Use this macOS signing command:

```bash
SSH_ASKPASS="$HOME/.local/bin/ssh-askpass" SSH_ASKPASS_REQUIRE=force \
  git -c gpg.format=ssh \
      -c user.signingkey=~/.ssh/yubikey-primary.pub \
      commit -S -m "message"
```

If signing fails with `No FIDO SecurityKeyProvider specified?` or the
system `/usr/bin/ssh-keygen` cannot use the security key, force Git to use
Homebrew OpenSSH:

```bash
SSH_ASKPASS="$HOME/.local/bin/ssh-askpass" SSH_ASKPASS_REQUIRE=force \
  git -c gpg.format=ssh \
      -c gpg.ssh.program=/opt/homebrew/bin/ssh-keygen \
      -c user.signingkey=~/.ssh/yubikey-primary.pub \
      commit -S -m "message"
```

Do not make unsigned commits in babylonlabs-io repos unless the user
explicitly asks for that exception.

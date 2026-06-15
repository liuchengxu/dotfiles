# Project Memory

## YubiKey Signing

YubiKey signing requires `SSH_ASKPASS` for non-interactive PIN entry. Always use:

```bash
SSH_ASKPASS="$HOME/.local/bin/ssh-askpass" SSH_ASKPASS_REQUIRE=force git -c gpg.format=ssh -c user.signingkey=~/.ssh/yubikey-primary.pub commit -S -m "message"
```

- The askpass wrapper at `~/.local/bin/ssh-askpass` uses osascript to show a macOS dialog for PIN input
- Without these env vars, signing only works while the FIDO PIN is cached (which expires)
- The global gitconfig does NOT have `gpg.format=ssh` set — must pass `-c gpg.format=ssh` explicitly

## Forge Version

CI uses `forge 1.5.1-stable`. Local forge must match to pass `forge fmt --check`.

## Git Push in Worktrees

- HTTPS remote uses a SOCKS proxy (`socks5://127.0.0.1:7891`) which may be down
- When proxy is down, push via SSH: `git push git@github.com:babylonlabs-io/vault-contracts-aave-v4.git HEAD:branch-name`
- `--force-with-lease` can get "stale info" in worktrees; use `--force-with-lease=branch:FETCH_HEAD` after fetching

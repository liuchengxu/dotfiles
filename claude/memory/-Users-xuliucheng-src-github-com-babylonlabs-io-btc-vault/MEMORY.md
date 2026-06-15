# BTC Vault Project Memory

## Git Signing

- CI requires commits signed with the **yubikey** key, not the default `id_ed25519`
- Yubikey public key: `~/.ssh/yubikey-primary.pub` (type: `sk-ssh-ed25519`, ED25519-SK)
- Default `git config user.signingkey` is `~/.ssh/id_ed25519.pub` — this will **fail CI**
- To sign with yubikey, use: `git -c user.signingkey=~/.ssh/yubikey-primary.pub commit -S -m "..."`
- To re-sign a branch: `git -c user.signingkey=~/.ssh/yubikey-primary.pub rebase --exec 'git -c user.signingkey=~/.ssh/yubikey-primary.pub commit --amend --no-edit -S' origin/main`

## GitHub CLI

- Always use `--repo babylonlabs-io/btc-vault` with `gh` commands

## Workflow

- [Claim discipline / pre-publish gate](pre-publish-challenge-gate.md) — calibrate material claims at write time (never stronger than the strongest source); independent adversarial challenge before any artifact is shared; confirm round on changed claims after fixes

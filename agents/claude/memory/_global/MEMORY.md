# Global Memory

## Git Commit Signing — CHECK REPO BEFORE SIGNING

**Always check which repo you're committing to before choosing the signing method:**
- **babylonlabs-io repos** (and only if `~/.ssh/yubikey-primary.pub` exists): `git -c user.signingkey=~/.ssh/yubikey-primary.pub commit -S`
- **All other repos** (including ~/.dotfiles, personal projects, etc.): `git -c commit.gpgsign=false commit`

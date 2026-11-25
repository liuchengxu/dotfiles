# Studio rules

This machine is `studio`.

## Signing

Sign with the YubiKey that is plugged into this machine. The gate is
`~/.local/bin/yubikey-sign` and the PIN is in the login keychain, so a
signature is one Sign click and one tap. When the YubiKey is on `work-macbook`
instead, commit in `~/src/github.com/babylonlabs-io/` only while
`signing-tunnel` runs on that laptop and `~/.gitconfig-babylonlabs` names
`~/.local/bin/remote-yubikey-sign` as the program. With neither in place, do
not commit there: signing cannot succeed.

To prepare a Mac that has the YubiKey plugged in, run
`agents/claude/scripts/yubikey-local-setup` from a Terminal window, then
`yubikey-pin-store` once, so that later signatures need only the click and the
tap.

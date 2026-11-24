# Work MacBook rules

This machine is `work-macbook`.

## Local signing

The YubiKey is attached to this machine, and the signing key handle is
`~/.ssh/yubikey-primary`. Signing opens a PIN dialog and waits for a physical
touch, so it needs the logged-in GUI session: a commit started over SSH fails,
because the managed system blocks switching into that session. Never read or
ask for the PIN.

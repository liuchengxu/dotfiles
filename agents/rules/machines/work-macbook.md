# Work MacBook rules

This machine is `work-macbook`.

## Local signing

Sign with the YubiKey that is plugged into this machine. The signing key
handle is `~/.ssh/yubikey-primary` and the PIN is in the login keychain, so a
signature is one Sign click and one touch. It needs the logged-in GUI session.
A commit started over SSH works only while the `yubikey-keychain-agent`
LaunchAgent runs in that session, because the login keychain does not answer a
process started by SSH; when that agent is not running, such a commit fails.
Never read or ask for the PIN.

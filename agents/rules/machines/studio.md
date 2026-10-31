# Studio rules

This machine is `studio`.

## Remote signing

Studio signs through `~/.local/bin/remote-yubikey-sign` over the restricted SSH
alias `macbook-yubikey-sign`. The user approves and touches the YubiKey on the
MacBook, so the MacBook must be awake. Never read or ask for the PIN.

- Do not change the wrapper, disable host key checking, or enable agent
  forwarding. Ordinary SSH to the MacBook (`ssh macbook`) is separate from the
  signing connection.
- An interrupted request can leave the MacBook dialog open for up to 90
  seconds. Do not send another request while one is pending.
- The repository name in the dialog comes from Studio. It does not prove which
  repository is signed.

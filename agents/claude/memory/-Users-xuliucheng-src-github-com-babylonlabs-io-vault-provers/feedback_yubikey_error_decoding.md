---
name: YubiKey-SK signing error decoding
description: "incorrect passphrase" / "invalid format" errors on YubiKey-signed commits usually mean tap timed out, not PIN/key issue
type: feedback
originSessionId: d7b52b96-317e-416d-8760-b142192cd145
---
When `git commit -S` with a FIDO2/SK-backed SSH key fails with messages like:

- `Couldn't sign message: incorrect passphrase supplied to decrypt private key?`
- `Couldn't sign message: invalid format?`

…the diagnosis is usually **the user-presence (tap) confirmation didn't land in time**, not "PIN was wrong" or "key is corrupted." The error messages are misleading — any failure on the user-presence channel surfaces as one of these strings.

**Why:** Save retries on this branch took 4 attempts because the user wasn't physically near the YubiKey when the dialog fired. Each "incorrect passphrase" error read like a PIN-entry problem and prompted retries, but the actual fix was just "tap the YubiKey within the timeout."

**How to apply:**
- On these errors, retry the same command without changing anything — assume the tap was missed.
- If repeated retries fail, ask the user to confirm they're at the device and ready to tap *before* firing the next attempt.
- Don't conclude the YubiKey is in a weird state until 4+ failures with the user actively trying to tap.
- The "Confirm user presence for key ED25519-SK ..." line in the error output is the literal prompt that the YubiKey is waiting on — it's not informational logging.

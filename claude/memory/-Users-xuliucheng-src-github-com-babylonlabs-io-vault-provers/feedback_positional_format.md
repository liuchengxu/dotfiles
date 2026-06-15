---
name: Positional {} in format strings is acceptable
description: User considers positional {} in format macros acceptable despite CLAUDE.md rule, especially for simple expressions like hex::encode
type: feedback
---

Positional `{}` in format strings (e.g. `format!("0x{}", hex::encode(&buf))`) is not considered an issue worth flagging or fixing, even though CLAUDE.md says to use inline interpolation.

**Why:** For simple inline expressions like `hex::encode(&buf)`, positional `{}` is clearer than extracting to a named variable just to use `{name}`.
**How to apply:** Don't flag positional `{}` as a code review issue. Don't "fix" them proactively.

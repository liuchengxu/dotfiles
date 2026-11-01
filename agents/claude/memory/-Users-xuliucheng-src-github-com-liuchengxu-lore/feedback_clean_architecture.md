---
name: Prefer clean architecture over quick solutions
description: User strongly prefers correct/clean architecture over simple/fast approaches, especially when sharing code between apps
type: feedback
---

Always prefer the clean/correct architecture over the simple/fastest approach. Do not duplicate code between apps — invest in proper sharing (shared crates, shared frontend modules with dependency injection).

**Why:** The user explicitly corrected an approach where dictionary frontend code was being copied between apps/desktop and apps/dict. Quick hacks and copy-paste create tech debt that compounds across apps.

**How to apply:** When a feature spans multiple apps (e.g., dictionary UI used by both Lore desktop and Lore Dict), extract shared code to `shared/frontend/` or workspace crates. Make shared JS self-contained via dependency injection rather than assuming globals. Never duplicate — always share. Ask before cutting corners on architecture.

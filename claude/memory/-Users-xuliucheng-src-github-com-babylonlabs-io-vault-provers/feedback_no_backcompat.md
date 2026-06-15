---
name: No backward compatibility for migrations
description: When refactoring or removing fields/APIs, default to hard breaks; never propose deprecation periods, lenient parsing of removed fields, or transitional shims
type: feedback
originSessionId: cb0090a7-6987-46a0-86b3-f24ff9cd34c6
---
When proposing migration plans (chain-spec field removals, API renames, type
moves, breaking serde changes, etc.), default to a single hard break in the
same PR/release. Do NOT suggest:

- ignoring removed config fields for "one release" before erroring
- keeping deprecated APIs alongside renamed ones with `#[deprecated]`
- transitional wrappers preserved purely for back-compat
- gradual rollouts behind feature flags
- "it should either become private or be renamed" hedging — pick one

**Why:** Stated explicitly by the user on 2026-05-05 during the
genesis_slot removal plan review: "we don't need any backward compatibility,
let's be very clear about this." vault-provers' operator and downstream
surface is internal — back-compat shims add tech debt without serving real
users.

**How to apply:** In plans and reviews, treat back-compat as a non-goal unless
the user explicitly asks for it. When you spot a deletion or rename that
would create a "what about old callers/configs" question, just say "hard
break; operators update at upgrade time" and move on. If you have already
written hedging language in a plan ("either … or …", "for one release,
then …"), collapse it to a concrete commit-immediately decision before
submitting.

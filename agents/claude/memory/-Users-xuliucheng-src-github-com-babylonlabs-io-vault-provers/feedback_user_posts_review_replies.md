---
name: User posts review replies
description: Draft GitHub PR review-comment replies and show them to the user; do not post via gh api
type: feedback
originSessionId: cb0090a7-6987-46a0-86b3-f24ff9cd34c6
---
When responding to PR review comments, draft the reply text and present it for the user to copy-paste themselves. Do not post via `gh api`.

**Why:** Two recurring failure modes when posting via `gh api`:
1. The `in_reply_to` ID has to be exact — guessing/incrementing fails with a 422.
2. Transient TLS handshake timeouts to api.github.com cause partial success across batched posts.

The user prefers posting manually because the GitHub UI handles thread context automatically and avoids both classes of failure. Past attempts where I posted on the user's behalf required cleanup or correction.

**How to apply:** When reviewing PR comments, output the draft reply text in a copy-friendly format (headers naming the comment file/line and reviewer; reply body in a quoted block). Don't shell out to `gh api -X POST .../pulls/{n}/comments`. Pushing in-code fixes (commit + force-push) is fine — that's separate from posting prose replies.

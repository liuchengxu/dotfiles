## Replying to review comments

A reply belongs in the thread it answers, so the reviewer reads it beside
their own comment:

```bash
gh api --method POST \
  repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies \
  -f body='{reply text}'
```

A top-level PR comment loses that context and makes the reviewer hunt for
what it refers to.

Say what changed and where, or explain why no change was made. Do not re-argue
a point that the updated diff now settles. Show the reply to the user and get
explicit approval before posting it.


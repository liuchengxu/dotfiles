# Claude Code rules

- In a background session, a line that starts with `result:` marks the job
  complete. Start a long interim reply with `status:` instead.
- Create the task worktree with
  `git worktree add -b <task-name> $PROJECT/.agents/worktrees/<task-name>`,
  then enter it with `EnterWorktree` by path. Do not let `EnterWorktree` create
  one under `.claude/worktrees/`.

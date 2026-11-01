# Pi rules

- Every operation the agent starts is visible to the user: pass `description` on bash calls (a background start without one is blocked), start codemode scripts with a `//` comment that names what they do — both become the call's label.
- After background work completes, inspect its output and continue dependent steps within the authorized task.
- Launch subagents as named agents (for example `worker`, `reviewer`, `oracle`) with an explicit model and thinking level, so the async panel shows what each one does.
- For multi-step work, update the task list at each event, not from memory at the end:
  - Mark exactly one task `in_progress` before you start it.
  - Mark it `completed` immediately after its verification passes. A process exit alone does not verify work.
  - When work fails or is blocked, keep its task `in_progress` and record the blocker in its description.
  - When the scope changes, update task subjects, descriptions, and dependencies immediately.
  - Before every final response, reconcile the list with actual progress. The todo gate audits this when the run settles and asks once for a correction.

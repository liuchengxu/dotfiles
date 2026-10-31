## Operation labels

- Every operation the agent starts is visible to the user: pass `description` on bash calls (a background start without one is blocked), start codemode scripts with a `//` comment that names what they do — both become the call's label.

## Background completion

- After background work completes, inspect its output and continue dependent steps within the authorized task. A successful process exit alone does not mean the task is complete.

## Subagents

- Launch subagents as named agents (for example `worker`, `reviewer`, `oracle`) with an explicit model and thinking level, so the async panel shows what each one does.

## Task list

- Keep the task list current without reminders: update it before launching work and after each result, blocker, or scope change. Mark a task complete only after its verification passes; a worker's successful exit is not verification.

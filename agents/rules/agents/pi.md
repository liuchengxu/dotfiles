## Operation labels

- Every operation the agent starts is visible to the user: pass `description` on bash calls (a background start without one is blocked), start codemode scripts with a `//` comment that names what they do — both become the call's label.

## Background completion

- After background work completes, inspect its output and continue dependent steps within the authorized task. A successful process exit alone does not mean the task is complete.

# Host handoffs

The coordinator must inspect the installed role and effective profile before dispatch. These profiles are scoped to the recorded pilot checks. Effective host permissions remain separate.

## Codex

When the native spawn tool supports `agent_type`, use `task-implementer` with fresh context. The historical native `task-reviewer` is disabled for future reviews. Follow the parent-approved external review route after the output snapshot and required evidence are current. Native role files own model and effort.

This desktop tool can lack `agent_type`. In that case, read the approved role contract/profile and pass the exact model and effort supported by `collaboration.spawn_agent`, with `fork_turns: none`. Include the complete role contract, source identity, authority, scope, and selected skills in the message. Record this as explicit-contract dispatch, not native role selection. If the profile or effective permissions cannot be supplied, continue in the parent and report the missing independence.

## Claude Code

Use the configured named subagent through the native Agent tool. For an isolated CLI task, `claude --agent task-implementer --print --output-format json -- "<bounded task>"` selects that main-session role. The `--` separator keeps a prompt from being consumed by a variadic option. Do not add permission-bypass flags. Use a task-specific working directory and normal authentication. Capture actual model usage and source changes; a role name alone is not proof of the model used.

The `/task-workflow` command loads this entry and preserves the user's arguments. It grants no authority beyond them.

## Pi

Use the installed `pi-subagents` workflow interface. The implementation stage script permits only the parent-validated `implement` stage. Its `review` stage rejects dispatch under the current external-review policy. It calls `runs.run` once with fresh context and the exact parent-approved profile. Give every `runs.run`/`runs.all` child a short verb + behavior `label` (for example, `Bind capture to literal Git objects`); the fleet board shows it beside the agent name, and a launch without one is a dispatch error. In noninteractive print mode, call each bounded stage with `async: false` so its result returns before the parent turn ends. An asynchronous child completing during auto-drain does not establish that the parent resumed. If asynchronous dispatch is necessary, verify the host wakeup and wait for the completed stage before continuing. Never finish the workflow after dispatch alone.

Do not chain implementation directly to review inside the script: return to the coordinator first to validate the patch, run checks, and establish the new source identity.

Architect and reviewer adapters explicitly exclude `contact_supervisor` and `intercom`. The installed SDK's deny-list behavior was tested. Parent-side steering is a separate channel: limit it to neutral requirements, permissions, or requested execution evidence and record it. Do not claim complete communication isolation from role frontmatter alone.

## Limits

The role dispatcher has no installed hook. Its policy must come from the coordinator, outside worker-controlled files. The handoff helper validates existing-file edits; file creation/deletion and patch-return mode require explicit parent patch review before application. Preserve both input and output source identities. The fixed executor only implements its declared hash check; it is not a general build sandbox.

The normal model-driven stage script does not automatically call the Python guard. Its parent-policy validation is a trusted coordinator precondition, not an installed hook. The optional guarded Pi extension calls canonical preflight/completion guards, but live model completion through that extension remains unvalidated and it stays unactivated.

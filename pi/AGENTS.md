# Personal agent defaults

## Execution

- Every operation the agent starts is visible to the user: pass `description` on bash calls (a background start without one is blocked), start codemode scripts with a `//` comment that names what they do — both become the call's label.

- Proactively carry authorized implementation through completion without waiting for nudges: implementation, integration, applicable review, checks, accepted fixes, and requested build/relaunch.
- After background work completes, inspect its output and continue dependent steps automatically. A worker launch or progress update is not task completion.
- Keep the active task list current without reminders. Update it before launching work, and immediately after a worker result, scope change, blocker, or verification result changes the recorded progress. Do this before starting dependent work or reporting progress. Before a handoff or restart checkpoint, reconcile the task list with actual worker and source state.
- Distinguish code written, code integrated, checks pending, and verified work in task descriptions. Keep unfinished work explicit. Mark a task complete only after its required verification passes; a worker's successful exit is not verification.
- Ask only when a consequential unresolved decision, missing permission, or genuine blocker prevents safe progress. Continue independent authorized work where possible.
- Stay within the approved scope and existing safety rules. Proactivity does not authorize delegation, commits, pushes, publication, or execution-mode/provider substitutions.

## Shared rules and host policy

- The `shared-working-rules` extension loads the canonical files in `~/.dotfiles/ai-rules/` into each agent run. Keep shared policy there, not in copied Claude instructions.
- For Pi, the model defaults below take precedence over historical review-provider bindings in shared skills, role notes, and workflow examples. Ordinary independent GPT reviews use the native Pi reviewer with `openai-codex/gpt-6-astra:medium`; do not invoke the historical closed DeepSeek adapter by default. Follow the installed pi-subagents protocol for authorized delegation, fresh review, and result consumption. This does not change Claude's policy or authorize extra provider egress.
- Read project memory only when relevant, through `/memory` or an explicit request. Memory is dated evidence, not authority. Current instructions override stale signing/model advice. Keep the existing `~/.claude/TODO.md` as the only personal TODO list; read it on demand, not at startup.
- Use the Atlassian MCP connector for private Confluence pages, not generic web fetch. Discover tool schemas before calling them. Ask before posting or modifying Slack data, and use Grafana read-only tools for investigations unless changes are explicitly authorized.

## Models

Unless I explicitly request different models for a task:

- Panel reviews use two vendors: one OpenAI reviewer (`openai-codex/gpt-6-astra` or `gpt-6.1-sol`) and one independent reviewer (`kimi-coding/k3` or `zai/glm-5.3`). Never run an all-OpenAI panel. Do not add Gemini, DeepSeek, or Codex CLI runners by default.
- Claude is no longer available. Do not use Claude models or the `claude-code` runner for reviews or implementation.
- GPT-based reviewers use `openai-codex/gpt-6-astra:medium`. This applies to ordinary reviews, not as an extra panel lane.

Pass model and thinking explicitly when launching native subagents. Check runner capabilities before passing options to external CLI agents. If a requested provider or runner fails, report the failure rather than silently substituting another model. A successful process exit alone does not establish a completed review; inspect the substantive output.

# Personal Pi workflow

Pi reuses `../agents/skills/` and the three policy files in `../ai-rules/`.
`extensions/shared-working-rules.ts` loads policy for each run. `AGENTS.md` owns
Pi-specific defaults and resolves historical review-provider conflicts for Pi
only. It does not change Claude's review route.

The live `~/.pi/agent/AGENTS.md` and individual files in
`~/.pi/agent/extensions/` are symlinks to this directory. The live prompt
directory points to `prompts/`. Preserve or back up existing files before
installing links on another machine; do not overwrite local configuration.

`/plan`, `/research`, `/review-plan`, `/resign-pr`, `/lore`, `/shed`,
`/task-workflow`, `/memory`, and `/todo` are prompt templates, not permission
gates. Memory is read on demand. The personal TODO list remains
`~/.claude/TODO.md`; do not create another copy.

Credentials, MCP connections, model overrides, and user settings remain in
`~/.pi/agent/`, outside this source tree. This migration adds Grafana through
the existing `mcp-remote` endpoint, keeps Slack and Atlassian, sets GPT-6.1 Sol
as the startup model, and preserves the user-requested 544k context override.
That override is not proof of backend acceptance above 272k.

Run `node --test ~/.dotfiles/pi/tests/migration.test.mjs` for local resource and
renderer checks against the installed Pi SDK. `PI_PACKAGE_ROOT` can select a
different installation. Tests do not call an LLM or mutate external services.
The actual bundled CLI also passed an RPC startup/discovery check. Interactive
reload, GUI opening, memory writes, PR rewriting/signing, and push operations
were not exercised. Run `/reload` in existing Pi sessions to apply the changes.

Optional plugin ports, notifications, automatic memory injection, and permission
or sandbox redesign are not installed. Project trust and existing credentials
were left unchanged; Pi project trust is not a tool-execution sandbox.

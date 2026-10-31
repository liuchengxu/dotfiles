# Agent configuration

One source for the rules and skills of Codex, Claude Code, and Pi on every
machine. Each machine renders its own instruction files from
these sources. Nothing syncs automatically: preview, apply, then check.

## Layout

| Path | Contents |
|---|---|
| `rules/common.md` | Rules for every agent on every machine. |
| `rules/environment.md` | The machines, their users, and how to reach each one. |
| `rules/machines/<machine>.md` | Rules for one machine. Names the machine. |
| `rules/agents/<agent>.md` | Rules for one agent: `claude`, `codex`, or `pi`. |
| `rules/render.py` | Renders the rules for this machine. |
| `rules/tests/` | Renderer tests. |
| `skills/<skill>/` | One skill. Only skills in use live here. |

## Where a rule belongs

- **`common.md`** — true for every agent on every machine.
- **`environment.md`** — a fact about a machine, not a rule.
- **Machine file** — names a local path, device, or service on one machine.
- **Agent file** — names one agent's tools, commands, or models.
- **Skill** — a procedure for one kind of task.

Put a shared policy in `common.md` and only its local mechanism in the machine
file. Network addresses stay in `~/.ssh/config`; rules use SSH aliases.

## Generated files

| Agent | Generated file |
|---|---|
| Claude Code | `~/.claude/CLAUDE.md` |
| Codex | `~/.codex/AGENTS.md` |
| Pi | `~/.pi/agent/AGENTS.md` |

Each file is `common.md`, `environment.md`, the machine file, and the agent
file, in that order. The first line records the SHA-256 of the rest of the
file. Do not edit these files: edit the sources and render again. An agent
reads its file when a session starts.

## Render

```bash
python3 ~/.dotfiles/agents/rules/render.py            # preview the diff
python3 ~/.dotfiles/agents/rules/render.py --apply    # back up, then write
python3 ~/.dotfiles/agents/rules/render.py --check    # exit 1 on drift
python3 ~/.dotfiles/agents/rules/tests/test-render.py
```

The renderer renders the sources next to itself, so a worktree's copy renders
that worktree's sources.

It refuses to write a generated file that is a symlink or that changed after
rendering. Fold the edit into the sources, move the file aside, then apply.
A missing file is created.

## Skills

Link each skill into two places. Codex and Pi read `~/.agents/skills`; Claude
Code reads `~/.claude/skills`. Do not also link into `~/.pi/agent/skills`, or
Pi loads the skill twice.

```bash
ln -s ~/.dotfiles/agents/skills/<skill> ~/.agents/skills/<skill>
ln -s ~/.dotfiles/agents/skills/<skill> ~/.claude/skills/<skill>
```

Skills in use:

| Skill | Needs |
|---|---|
| `grafana-logs` | The Grafana MCP server in each agent (below). |
| `writing-issues-and-prs` | `gh`. |
| `standalone-docs` | — |

Grafana MCP server, added once per agent. The first query opens a browser
login; the token stays in `~/.mcp-auth`.

```bash
URL=https://grafana-mcp.tooling.babylonlabs.io/mcp
claude mcp add --scope user grafana -- npx -y mcp-remote "$URL"
codex mcp add grafana -- npx -y mcp-remote "$URL"
# Pi: add to "mcpServers" in ~/.pi/agent/mcp.json:
#   "grafana": {"command": "npx", "args": ["-y", "mcp-remote", "<URL>"]}
```

## Local files

These stay on each machine and out of the repository:

| Path | Contents |
|---|---|
| `~/.local/state/agent-rules/machine` | This machine's name, for example `studio`. |
| `~/.local/state/agent-rules/backups/` | Generated files as they were before each apply. |
| `~/.ssh/config` | Address, user, key, and pinned host key for each alias. |

## Add a machine

1. Add a row to `rules/environment.md`.
2. Add `rules/machines/<machine>.md` with the line ``This machine is `<machine>`.``
3. On each peer, add a `Host <alias>` entry to `~/.ssh/config` with a pinned
   host key.
4. On the new machine, write its name to the machine file. Move any existing
   generated files aside, then apply.

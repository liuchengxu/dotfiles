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
| `claude-hud.json` | Claude status line layout (claude-hud plugin). |
| `git-hooks/` | Global git hooks: the pre-push comment check. |

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
that worktree's sources. Preview from a worktree; apply only from `~/.dotfiles`.

It refuses to write a generated file that is a symlink or that changed after
rendering. Fold the edit into the sources, move the file aside, then apply.
A missing file is created.

## Change a rule or skill

1. Edit in a worktree: `~/.dotfiles/.agents/worktrees/<task-name>`.
2. Run the tests, then preview from the worktree:
   `python3 <worktree>/agents/rules/render.py`.
3. Commit in the worktree when the user approves.
4. Fast-forward `~/.dotfiles` to the commit:
   `git -C ~/.dotfiles merge --ff-only <branch>`.
5. Apply and check from `~/.dotfiles`. Skill links point there, so skill
   changes take effect at the same time.
6. Start a new agent session. Running sessions keep the old rules.
7. Push when the user approves. Other machines pull, then apply.

## Skills

Link each skill into two places. Codex and Pi read `~/.agents/skills`; Claude
Code reads `~/.claude/skills`. Do not also link into `~/.pi/agent/skills`, or
Pi loads the skill twice.

```bash
ln -s ~/.dotfiles/agents/skills/<skill> ~/.agents/skills/<skill>
ln -s ~/.dotfiles/agents/skills/<skill> ~/.claude/skills/<skill>
```

Pi silently skips a skill whose frontmatter is not strict YAML; Claude loads
it anyway. Quote a `description` that contains `: `. After adding a skill,
confirm that Pi lists it:
`pi -p --no-session "List your skills by name." < /dev/null`.

Skills in use:

| Skill | Needs |
|---|---|
| `grafana-logs` | The Grafana MCP server in each agent (below). |
| `writing-issues-and-prs` | `gh`. |
| `writing-docs` | — |
| `eli5` | Firefox, to open the page. |
| `ask-models` | `pi` with the requested models' providers signed in. |
| `adversarial-review` | `gh` for PR reviews. |

Grafana MCP server, added once per agent. The first query opens a browser
login; the token stays in `~/.mcp-auth`.

```bash
URL=https://grafana-mcp.tooling.babylonlabs.io/mcp
claude mcp add --scope user grafana -- npx -y mcp-remote "$URL"
codex mcp add grafana -- npx -y mcp-remote "$URL"
# Pi: add to "mcpServers" in ~/.pi/agent/mcp.json:
#   "grafana": {"command": "npx", "args": ["-y", "mcp-remote", "<URL>"]}
```

## Claude plugins

Plugins install per machine. This table is the list to keep in sync; do not
link `~/.claude/settings.json` into the repository, because Claude writes to it
and it holds machine paths.

| Plugin | Marketplace |
|---|---|
| `claude-hud@claude-hud` | `jarrodwatts/claude-hud` |
| `slack@claude-plugins-official` | built in |
| `codex@openai-codex` | `openai/codex-plugin-cc` |

```bash
claude plugin marketplace add jarrodwatts/claude-hud
claude plugin marketplace add openai/codex-plugin-cc
claude plugin install --scope user claude-hud@claude-hud
claude plugin install --scope user slack@claude-plugins-official
claude plugin install --scope user codex@openai-codex
cp ~/.dotfiles/agents/claude-hud.json ~/.claude/plugins/claude-hud/config.json
```

Then, in Claude, run `/claude-hud:setup` once to set the status line. Slack
asks for a login on first use. When you change the HUD layout, copy
`~/.claude/plugins/claude-hud/config.json` back to `agents/claude-hud.json`.

## Git hooks

`git-hooks/` is the global git hooks directory for every repository on the
machine:

```bash
git config --global core.hooksPath ~/.dotfiles/agents/git-hooks
```

- Each hook name links to `hook`, which runs this directory's checks, then the
  repository's own hook of the same name. A global hooks path would otherwise
  hide the repository's hooks.
- **pre-push** runs `check-comments` when the pushed commits add comment lines
  (`//`, `/*`, or `#`) outside Markdown, text, lock, and JSON files. A model
  judges them against `comment-rule.md` and blocks the push on `FAIL`. With no
  verdict (timeout, provider error), the push goes ahead with a warning.
- The model is `zai/glm-5.3-flash`; set `COMMENT_CHECK_MODEL` to change it.
- Skip one push with `SKIP_COMMENT_CHECK=1 git push`. `git push --no-verify`
  also skips the repository's own hook.
- A repository that sets its own `core.hooksPath` does not run these hooks.
  The `pre-commit` framework refuses to install while a global hooks path is
  set: unset it, run `pre-commit install`, then set it again.

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

## Move MacBook off the old setup

The old setup on MacBook (checked 2026-10-31):

| Path | Old setup |
|---|---|
| `~/.claude/CLAUDE.md` | Symlink to `~/.dotfiles/claude/CLAUDE.md`, which `@`-imports `~/.dotfiles/ai-rules/*.md`. |
| `~/.codex/AGENTS.md` | File generated by `~/.dotfiles/codex/build-agents.sh`. |
| `~/.pi/agent/AGENTS.md` | Symlink to `~/.dotfiles/pi/AGENTS.md`. |
| `~/.pi/agent/extensions/shared-working-rules.ts` | Symlink to `~/.dotfiles/pi/extensions/`. Loads `ai-rules/` into every Pi run. |
| `~/.claude/skills`, `~/.agents/skills`, `~/.pi/agent/skills` | Each a symlink to the whole `~/.dotfiles/agents/skills`. |

Steps, each with the user's approval:

1. Bring `~/.dotfiles` up to date with `origin/master`. Check first for local
   changes; preserve any that are not in `origin/master`.
2. Write `macbook` to `~/.local/state/agent-rules/machine`.
3. Move the three rule files aside to
   `~/.local/state/agent-rules/backups/pre-migration-<UTC time>/`, then apply
   and check.
4. Move `shared-working-rules.ts` aside, or Pi loads the old rules as well.
5. Replace the three skill-directory symlinks with real directories. Link each
   skill in use into `~/.agents/skills` and `~/.claude/skills` (see Skills).
   Leave `~/.pi/agent/skills` without these links.
6. Add the Grafana MCP server to Codex. Claude and Pi already have it.
7. Make the Claude plugins match the table in Claude plugins. MacBook also has
   `code-review`, `frontend-design`, `superpowers`, `warp`, and disabled
   `rust-analyzer-lsp`, `andrej-karpathy-skills`, `baby-skills`; ask the user
   before uninstalling any of them.
8. Replace the old global hooks: `core.hooksPath` points to
   `~/.claude/git-hooks` (comment-cleanup and diff-audit gates). Set it to
   `~/.dotfiles/agents/git-hooks` (see Git hooks).
9. Start a new session of each agent and confirm that it loads the new rules,
   skills, plugins, and hooks.

After both machines work, remove `ai-rules/`, `claude/CLAUDE.md`,
`claude/settings.json` (a stale copy), `claude/ZK_SECURITY_CHECKLIST.md` (now
in `adversarial-review`), `claude/scripts/` gates, `codex/build-agents.sh`,
`pi/AGENTS.md`,
and the extension from the repository, and `~/.config/agent-rules/` from
Studio.

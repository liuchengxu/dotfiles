# Claude Code Configuration

This directory contains Claude Code settings and customizations that should be synced across machines.

## Directory Structure

```
~/.dotfiles/claude/
├── README.md           # This file
├── settings.json       # Permissions, hooks config, env vars, plugins
├── CLAUDE.md           # Global instructions for all projects
├── show-rules.sh       # Print CLAUDE.md with its @imports expanded
├── statusline.sh       # Custom status line script
├── commands/           # Custom slash commands
└── hooks/
    └── scripts/        # Hook scripts (auto-format, error handling, etc.)
```

Skills are shared by Claude Code and Codex, so they live outside this
Claude-specific directory:

```
~/.dotfiles/agents/
└── skills/             # Custom skills, read by both agents
```

Both consumers symlink straight to it — `~/.claude/skills` and
`~/.agents/skills`. Neither points at the other, so replacing one does not
silently redirect the second.

## Reading the rules

The model-agnostic rules also live outside this directory, in
`~/.dotfiles/ai-rules/`. `CLAUDE.md` pulls them in with `@` imports;
`codex/build-agents.sh` concatenates the same files into `~/.codex/AGENTS.md`.
One copy, two readers.

That makes `CLAUDE.md` short to maintain but unreadable end to end, so
`show-rules.sh` prints the assembled document:

```bash
claude/show-rules.sh | less -R    # everything Claude loads, in order
```

Each import is announced by an HTML comment naming its source file, so anything
worth changing can be traced back to the file that owns it. Edit the sources —
`show-rules.sh` writes nothing.

## Setup on a New Machine

After cloning your dotfiles repository, create symlinks from `~/.claude/` to this directory:

```bash
# Create ~/.claude if it doesn't exist
mkdir -p ~/.claude

# Create symlinks for config files
ln -sf ~/.dotfiles/claude/settings.json ~/.claude/settings.json
ln -sf ~/.dotfiles/claude/CLAUDE.md ~/.claude/CLAUDE.md
ln -sf ~/.dotfiles/claude/statusline.sh ~/.claude/statusline.sh

# Create symlinks for directories
ln -sf ~/.dotfiles/claude/commands ~/.claude/commands

# Skills are shared with Codex — link both agents at the same canonical copy
mkdir -p ~/.agents
ln -sfn ~/.dotfiles/agents/skills ~/.claude/skills
ln -sfn ~/.dotfiles/agents/skills ~/.agents/skills

# For hooks, symlink the scripts subdirectory
mkdir -p ~/.claude/hooks
ln -sf ~/.dotfiles/claude/hooks/scripts ~/.claude/hooks/scripts
```

Or use a one-liner:

```bash
mkdir -p ~/.claude ~/.claude/hooks ~/.agents && \
ln -sf ~/.dotfiles/claude/{settings.json,CLAUDE.md,statusline.sh,commands} ~/.claude/ && \
ln -sf ~/.dotfiles/claude/hooks/scripts ~/.claude/hooks/scripts && \
ln -sfn ~/.dotfiles/agents/skills ~/.claude/skills && \
ln -sfn ~/.dotfiles/agents/skills ~/.agents/skills
```

`ln -sfn` matters when re-linking: without `-n`, `ln -sf` on an existing
symlink-to-directory creates the link *inside* the target instead of replacing
it.

## What to Sync (in this directory)

| File/Directory | Purpose |
|----------------|---------|
| `settings.json` | Permissions, hooks, env vars, plugins |
| `CLAUDE.md` | Global instructions applied to all sessions |
| `show-rules.sh` | Prints `CLAUDE.md` with `@imports` expanded |
| `statusline.sh` | Custom status line display |
| `commands/` | Custom slash commands |
| `hooks/scripts/` | Hook scripts for automation |
| `../agents/skills/` | Custom skills, shared with Codex |

## What NOT to Sync (machine-specific)

These files/directories in `~/.claude/` should NOT be synced:

| File/Directory | Reason |
|----------------|--------|
| `.credentials.json` | Auth tokens (sensitive) |
| `history.jsonl` | Command history (large, personal) |
| `projects/` | Per-project context and memory |
| `cache/` | Temporary cache |
| `file-history/` | File edit history |
| `todos/` | Session todos |
| `plans/` | Session plans |
| `session-env/` | Session environment |
| `telemetry/` | Usage telemetry |
| `statsig/` | Feature flags |
| `stats-cache.json` | Usage statistics |
| `debug/` | Debug logs |
| `paste-cache/` | Clipboard cache |
| `shell-snapshots/` | Shell state snapshots |
| `plugins/` | Downloaded plugins (auto-installed) |
| `agents/` | Agent configurations |

## Verifying Setup

Check that symlinks are correctly configured:

```bash
ls -la ~/.claude/ | grep -E '^l'
```

Expected output should show symlinks pointing to `~/.dotfiles/claude/`.

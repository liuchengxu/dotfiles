# Claude Code Configuration

This directory contains Claude Code settings and customizations that should be synced across machines.

## Directory Structure

```
~/.dotfiles/claude/
├── README.md           # This file
├── settings.json       # Permissions, hooks config, env vars, plugins
├── CLAUDE.md           # Global instructions for all projects
├── statusline.sh       # Custom status line script
├── commands/           # Custom slash commands
├── skills/             # Custom skills
└── hooks/
    └── scripts/        # Hook scripts (auto-format, error handling, etc.)
```

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
ln -sf ~/.dotfiles/claude/skills ~/.claude/skills

# For hooks, symlink the scripts subdirectory
mkdir -p ~/.claude/hooks
ln -sf ~/.dotfiles/claude/hooks/scripts ~/.claude/hooks/scripts
```

Or use a one-liner:

```bash
mkdir -p ~/.claude ~/.claude/hooks && \
ln -sf ~/.dotfiles/claude/{settings.json,CLAUDE.md,statusline.sh,commands,skills} ~/.claude/ && \
ln -sf ~/.dotfiles/claude/hooks/scripts ~/.claude/hooks/scripts
```

## What to Sync (in this directory)

| File/Directory | Purpose |
|----------------|---------|
| `settings.json` | Permissions, hooks, env vars, plugins |
| `CLAUDE.md` | Global instructions applied to all sessions |
| `statusline.sh` | Custom status line display |
| `commands/` | Custom slash commands |
| `skills/` | Custom skills |
| `hooks/scripts/` | Hook scripts for automation |

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

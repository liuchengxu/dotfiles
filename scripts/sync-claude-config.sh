#!/bin/bash
# Sync Claude Code configuration to dotfiles
# This script sets up symlinks and syncs Claude config to ~/.dotfiles

set -e

DOTFILES_DIR="$HOME/.dotfiles"
CLAUDE_DIR="$HOME/.claude"
CLAUDE_DOTFILES="$DOTFILES_DIR/claude"
# Skills are shared by Claude Code and Codex, so they live outside claude/.
AGENTS_DIR="$HOME/.agents"
AGENTS_DOTFILES="$DOTFILES_DIR/agents"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Claude Code Configuration Sync ===${NC}"

# Create dotfiles structure if it doesn't exist
mkdir -p "$CLAUDE_DOTFILES"/{commands,hooks/scripts}
mkdir -p "$AGENTS_DOTFILES/skills"

# Function to sync a file
sync_file() {
    local src="$1"
    local dest="$2"

    if [ -f "$src" ] && [ ! -L "$src" ]; then
        echo -e "${YELLOW}Moving${NC} $(basename "$src") to dotfiles..."
        cp "$src" "$dest"
        rm "$src"
        ln -sf "$dest" "$src"
        echo -e "${GREEN}✓${NC} Linked $(basename "$src")"
    elif [ -L "$src" ]; then
        echo -e "${GREEN}✓${NC} $(basename "$src") already linked"
    elif [ ! -f "$src" ] && [ -f "$dest" ]; then
        echo -e "${YELLOW}Creating symlink${NC} for $(basename "$src")..."
        ln -sf "$dest" "$src"
        echo -e "${GREEN}✓${NC} Linked $(basename "$src")"
    fi
}

# Function to sync a directory
sync_dir() {
    local src="$1"
    local dest="$2"

    if [ -d "$src" ] && [ ! -L "$src" ]; then
        echo -e "${YELLOW}Moving${NC} $(basename "$src")/ to dotfiles..."
        # Copy contents to dotfiles
        cp -r "$src"/* "$dest/" 2>/dev/null || true
        # Remove original and create symlink
        rm -rf "$src"
        ln -sf "$dest" "$src"
        echo -e "${GREEN}✓${NC} Linked $(basename "$src")/"
    elif [ -L "$src" ]; then
        echo -e "${GREEN}✓${NC} $(basename "$src")/ already linked"
        # Update dotfiles with any new content
        if [ -d "$(readlink "$src")" ]; then
            rsync -a --delete "$(readlink "$src")/" "$dest/"
        fi
    elif [ ! -d "$src" ] && [ -d "$dest" ]; then
        echo -e "${YELLOW}Creating symlink${NC} for $(basename "$src")/..."
        ln -sf "$dest" "$src"
        echo -e "${GREEN}✓${NC} Linked $(basename "$src")/"
    fi
}

# Point a consumer directory at a canonical copy already in dotfiles.
# The canonical copy is the only source; nothing is ever copied back.
# `-n` keeps a re-link from landing inside an existing symlinked directory.
link_dir() {
    local src="$1"
    local dest="$2"

    if [ -e "$src" ] && [ ! -L "$src" ]; then
        echo -e "${YELLOW}Moving${NC} $src into $dest..."
        cp -r "$src"/* "$dest/" 2>/dev/null || true
        rm -rf "$src"
    fi
    mkdir -p "$(dirname "$src")"
    ln -sfn "$dest" "$src"
    echo -e "${GREEN}✓${NC} Linked $src"
}

# Sync individual files
echo -e "\n${BLUE}Syncing configuration files...${NC}"
sync_file "$CLAUDE_DIR/CLAUDE.md" "$CLAUDE_DOTFILES/CLAUDE.md"
sync_file "$CLAUDE_DIR/settings.json" "$CLAUDE_DOTFILES/settings.json"

# Sync directories
echo -e "\n${BLUE}Syncing directories...${NC}"
sync_dir "$CLAUDE_DIR/commands" "$CLAUDE_DOTFILES/commands"
sync_dir "$CLAUDE_DIR/hooks/scripts" "$CLAUDE_DOTFILES/hooks/scripts"

echo -e "\n${BLUE}Linking shared skills...${NC}"
link_dir "$CLAUDE_DIR/skills" "$AGENTS_DOTFILES/skills"
link_dir "$AGENTS_DIR/skills" "$AGENTS_DOTFILES/skills"

# Git operations
echo -e "\n${BLUE}Checking git status...${NC}"
cd "$DOTFILES_DIR"

if [ -d .git ]; then
    # Check if there are changes
    if ! git diff --quiet claude/ agents/ 2>/dev/null || ! git diff --cached --quiet claude/ agents/ 2>/dev/null; then
        echo -e "${YELLOW}Changes detected in Claude config${NC}"
        git status --short claude/ agents/

        read -p "Commit and push changes? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git add claude/ agents/

            # Generate commit message
            COMMIT_MSG="chore: update Claude Code configuration

Synced from ~/.claude at $(date '+%Y-%m-%d %H:%M:%S')"

            git commit -m "$COMMIT_MSG"

            read -p "Push to remote? (y/N) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                git push
                echo -e "${GREEN}✓${NC} Pushed to remote"
            fi
        fi
    else
        echo -e "${GREEN}✓${NC} No changes to commit"
    fi
else
    echo -e "${YELLOW}Warning:${NC} $DOTFILES_DIR is not a git repository"
    echo "Initialize with: cd $DOTFILES_DIR && git init"
fi

echo -e "\n${GREEN}=== Sync complete! ===${NC}"
echo -e "\nSymlinks created:"
echo -e "  ~/.claude/CLAUDE.md -> ~/.dotfiles/claude/CLAUDE.md"
echo -e "  ~/.claude/settings.json -> ~/.dotfiles/claude/settings.json"
echo -e "  ~/.claude/commands -> ~/.dotfiles/claude/commands"
echo -e "  ~/.claude/hooks/scripts -> ~/.dotfiles/claude/hooks/scripts"
echo -e "  ~/.claude/skills -> ~/.dotfiles/agents/skills"
echo -e "  ~/.agents/skills -> ~/.dotfiles/agents/skills"

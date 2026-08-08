#!/usr/bin/env bash
# Print CLAUDE.md with its @imports expanded, so the whole rule set reads as one
# document. Review-only: writes nothing, and the sources stay the single copy
# that Codex's AGENTS.md is also built from.
#
#   claude/show-rules.sh | less -R
#   claude/show-rules.sh > /tmp/rules.md
set -euo pipefail

expand() {
  while IFS= read -r line; do
    if [[ "$line" =~ ^@([~/][^[:space:]]*)$ ]]; then
      path="${BASH_REMATCH[1]/#\~/$HOME}"
      printf '\n<!-- %s -->\n\n' "${path/#$HOME/\~}"
      expand < "$path"
    else
      printf '%s\n' "$line"
    fi
  done
}

src="${1:-${DOTFILES_HOME:-$HOME/.dotfiles}/claude/CLAUDE.md}"

# Imports are printed where the @ line sits, which is how the rules were
# authored. At runtime they arrive differently: the whole parent file first,
# then each imported file after it. Read this for content, not for precedence.
printf '<!-- %s, @imports expanded in authored order -->\n' "${src/#$HOME/\~}"

expand < "$src"

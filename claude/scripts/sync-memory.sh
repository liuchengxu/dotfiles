#!/usr/bin/env bash
# Snapshot Claude Code memory dirs into the dotfiles repo for backup.
# Copies the global store and every project-scoped memory/ dir; the churning
# session transcripts live above memory/, so they are naturally excluded.
# Run on demand (e.g. as part of a dotfiles sync); then commit + push.
set -euo pipefail

SRC_HOME="${HOME}/.claude"
DEST="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/memory"

mkdir -p "${DEST}"

# Global store.
if [ -d "${SRC_HOME}/memory" ]; then
  rsync -a --delete "${SRC_HOME}/memory/" "${DEST}/_global/"
fi

# Per-project stores, keyed by the project dir name.
for d in "${SRC_HOME}"/projects/*/memory; do
  [ -d "${d}" ] || continue
  proj="$(basename "$(dirname "${d}")")"
  rsync -a --delete "${d}/" "${DEST}/${proj}/"
done

echo "Synced memory into ${DEST}"

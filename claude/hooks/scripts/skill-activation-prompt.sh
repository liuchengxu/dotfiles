#!/usr/bin/env bash
#
# skill-activation-prompt.sh
#
# Wrapper script for skill-activation-prompt.ts
# This is a UserPromptSubmit hook that analyzes prompts and suggests relevant skills.

set -euo pipefail

# Get the directory containing this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Pipe stdin to the TypeScript processor
cat | npx tsx "${SCRIPT_DIR}/skill-activation-prompt.ts"

# Exit with the same code as the TypeScript script
exit $?

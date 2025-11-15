#!/usr/bin/env bash
#
# error-handling-reminder.sh
#
# Wrapper script for error-handling-reminder.ts
# This is a Stop hook that provides gentle reminders about error handling.

set -euo pipefail

# Get the directory containing this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Pipe stdin to the TypeScript processor
cat | npx tsx "${SCRIPT_DIR}/error-handling-reminder.ts"

# Exit with the same code as the TypeScript script
exit $?

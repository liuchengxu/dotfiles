#!/usr/bin/env bash
#
# rust-auto-format.sh
#
# PostToolUse hook that automatically formats Rust files after editing.
# Runs rustfmt on edited .rs files to maintain consistent formatting.

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Read JSON input from stdin
input=$(cat)

# Extract file path from the input
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty' 2>/dev/null || echo "")

# Exit early if no file path or not a Rust file
if [ -z "$file_path" ]; then
    exit 0
fi

if [[ "$file_path" != *.rs ]]; then
    exit 0
fi

# Check if file exists
if [ ! -f "$file_path" ]; then
    exit 0
fi

# Check if rustfmt is available
if ! command -v rustfmt &> /dev/null; then
    echo -e "${YELLOW}⚠️  rustfmt not found, skipping auto-format${NC}"
    exit 0
fi

# Format the file
echo "🔧 Auto-formatting Rust file: ${file_path}"

if rustfmt "$file_path" 2>/dev/null; then
    echo -e "${GREEN}✅ Formatted successfully${NC}"
    exit 0
else
    echo -e "${RED}⚠️  Format failed (file may have syntax errors)${NC}"
    # Don't block on format failure - might be mid-edit
    exit 0
fi

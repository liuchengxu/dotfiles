#!/usr/bin/env bash
#
# validate-deps.sh - Check Cargo.toml dependency ordering
#
# This script verifies that dependencies in Cargo.toml are alphabetically sorted.
# Keeping dependencies sorted reduces merge conflicts and improves readability.
#
# Exit codes:
#   0 - Dependencies are properly sorted
#   1 - Dependencies need sorting
#   2 - Error checking dependencies

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in a Rust project
if [ ! -f "Cargo.toml" ]; then
    echo -e "${YELLOW}⚠️  No Cargo.toml found in current directory${NC}"
    echo "Skipping dependency validation"
    exit 0
fi

echo "🔍 Checking Cargo.toml dependency ordering..."

# Function to check if a section is sorted
check_section_sorted() {
    local section="$1"
    local file="Cargo.toml"

    # Extract dependencies from the section
    local deps=$(awk "/^\[${section}\]/,/^\[/ {
        if (\$0 ~ /^[a-zA-Z]/ && \$0 !~ /^\[/) {
            # Extract dependency name (before = or space)
            match(\$0, /^([a-zA-Z0-9_-]+)/, arr)
            if (arr[1]) print arr[1]
        }
    }" "$file")

    if [ -z "$deps" ]; then
        return 0  # No dependencies in this section
    fi

    # Check if sorted
    local sorted=$(echo "$deps" | sort)

    if [ "$deps" = "$sorted" ]; then
        return 0  # Sorted correctly
    else
        echo -e "${RED}❌ Dependencies in [$section] are not alphabetically sorted${NC}"
        echo ""
        echo "Current order:"
        echo "$deps" | sed 's/^/  /'
        echo ""
        echo "Should be:"
        echo "$sorted" | sed 's/^/  /'
        return 1
    fi
}

# Check main sections
has_errors=0

for section in "dependencies" "dev-dependencies" "build-dependencies"; do
    if grep -q "^\[${section}\]" Cargo.toml 2>/dev/null; then
        if ! check_section_sorted "$section"; then
            has_errors=1
        fi
    fi
done

# Check workspace dependencies if present
if grep -q "^\[workspace.dependencies\]" Cargo.toml 2>/dev/null; then
    if ! check_section_sorted "workspace.dependencies"; then
        has_errors=1
    fi
fi

if [ $has_errors -eq 0 ]; then
    echo -e "${GREEN}✅ All dependencies are alphabetically sorted${NC}"
    exit 0
else
    echo ""
    echo "Please sort dependencies alphabetically in Cargo.toml"
    exit 1
fi

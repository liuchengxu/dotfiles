#!/usr/bin/env bash
#
# check-clippy.sh - Run Cargo clippy lints
#
# This script runs cargo clippy to check for common mistakes and improvements.
# All clippy warnings are treated as errors.
#
# Exit codes:
#   0 - No clippy warnings
#   1 - Clippy warnings detected
#   2 - Error running clippy

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in a Rust project
if [ ! -f "Cargo.toml" ]; then
    echo -e "${YELLOW}⚠️  No Cargo.toml found in current directory${NC}"
    echo "Skipping clippy check"
    exit 0
fi

echo "🔍 Running Cargo clippy..."

# Run clippy with all warnings as errors
if cargo clippy --workspace --all-features --all-targets -- -D warnings 2>&1; then
    echo -e "${GREEN}✅ No clippy warnings detected${NC}"
    exit 0
else
    echo -e "${RED}❌ Clippy warnings detected${NC}"
    echo ""
    echo "Fix the warnings above, or run:"
    echo "  cargo clippy --workspace --all-features --all-targets --fix"
    exit 1
fi

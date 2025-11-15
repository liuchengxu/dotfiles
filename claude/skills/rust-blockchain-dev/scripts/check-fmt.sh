#!/usr/bin/env bash
#
# check-fmt.sh - Verify Rust code formatting
#
# This script runs cargo +nightly fmt --check to verify that all Rust code
# is properly formatted according to rustfmt rules.
#
# Exit codes:
#   0 - Code is properly formatted
#   1 - Code needs formatting
#   2 - Error running rustfmt

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in a Rust project
if [ ! -f "Cargo.toml" ]; then
    echo -e "${YELLOW}⚠️  No Cargo.toml found in current directory${NC}"
    echo "Skipping format check"
    exit 0
fi

echo "🔍 Checking Rust code formatting..."

# Run cargo fmt in check mode
if cargo +nightly fmt --all -- --check 2>&1; then
    echo -e "${GREEN}✅ All Rust code is properly formatted${NC}"
    exit 0
else
    echo -e "${RED}❌ Code formatting issues detected${NC}"
    echo ""
    echo "Run the following command to fix formatting:"
    echo "  cargo +nightly fmt --all"
    exit 1
fi

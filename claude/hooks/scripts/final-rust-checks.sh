#!/usr/bin/env bash
#
# final-rust-checks.sh
#
# SessionEnd hook that runs final validation before ending the session.
# Runs cargo fmt --check and cargo clippy to ensure no errors are left behind.

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we're in a Rust project
if [ ! -f "Cargo.toml" ]; then
    # Not a Rust project, exit silently
    exit 0
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔍 FINAL RUST CHECKS${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

has_errors=0

# Check 1: Formatting
echo "📝 Checking code formatting..."
if cargo +nightly fmt --all -- --check 2>&1 | head -20; then
    echo -e "${GREEN}✅ Code is properly formatted${NC}"
else
    echo -e "${RED}❌ Code formatting issues detected${NC}"
    echo ""
    echo "Run to fix:"
    echo "  cargo +nightly fmt --all"
    echo ""
    has_errors=1
fi

echo ""

# Check 2: Clippy
echo "🔎 Running clippy..."
if cargo clippy --workspace --all-features -- -D warnings 2>&1 | head -30; then
    echo -e "${GREEN}✅ No clippy warnings${NC}"
else
    echo -e "${RED}❌ Clippy warnings detected${NC}"
    echo ""
    echo "Run to see all warnings:"
    echo "  cargo clippy --workspace --all-features"
    echo ""
    has_errors=1
fi

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ $has_errors -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed - session can end${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    exit 0
else
    echo -e "${RED}❌ Please fix errors before ending session${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    # Exit with code 2 to block session end
    exit 2
fi

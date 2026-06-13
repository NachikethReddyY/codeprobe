#!/bin/bash
set -e

echo "=== CodeProbe Demo Script ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo -e "${RED}Error: bun is not installed${NC}"
    exit 1
fi

echo -e "${BLUE}1. Clearing previous scans...${NC}"
rm -rf ~/.codeprobe/scans/*
echo -e "${GREEN}✓ Scans cleared${NC}"
echo ""

echo -e "${BLUE}2. Running scan...${NC}"
time bun run src/cli/index.ts scan .
echo -e "${GREEN}✓ Scan complete${NC}"
echo ""

echo -e "${BLUE}3. Displaying report...${NC}"
bun run src/cli/index.ts report
echo ""

echo -e "${BLUE}4. Testing with --json flag...${NC}"
bun run src/cli/index.ts scan . --json | head -20
echo "..."
echo ""

echo -e "${GREEN}✅ Demo successful!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  • Run scan with fix: bun run src/cli/index.ts scan . --fix"
echo "  • View config: bun run src/cli/index.ts config get"
echo "  • Set API key: bun run src/cli/index.ts config set bright_data_api_key <key>"
echo ""

#!/usr/bin/env bash

# install-and-run.sh - Bun installer and CLI runner for CodeProbe
# This script is called by npx when users run `codeprobe`

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Platform detection
OS_TYPE="$(uname -s)"
ARCH="$(uname -m)"

# Bun installation paths
case "$OS_TYPE" in
  Darwin)
    BUN_HOME="${BUN_HOME:-$HOME/.bun}"
    BUN_BIN="$BUN_HOME/bin/bun"
    ;;
  Linux)
    BUN_HOME="${BUN_HOME:-$HOME/.bun}"
    BUN_BIN="$BUN_HOME/bin/bun"
    ;;
  MINGW*|MSYS*|CYGWIN*)
    echo -e "${RED}❌ Windows is not directly supported. Please use WSL (Windows Subsystem for Linux).${NC}"
    echo "To set up Bun on Windows, follow: https://bun.sh/docs/installation#windows"
    exit 1
    ;;
  *)
    echo -e "${RED}❌ Unsupported platform: $OS_TYPE${NC}"
    exit 1
    ;;
esac

# Check if Bun is already installed
if command -v bun &> /dev/null; then
  BUN_BIN="$(command -v bun)"
  echo -e "${GREEN}✓ Bun found at: $BUN_BIN${NC}"
else
  echo -e "${YELLOW}ℹ Bun not found. Installing latest version...${NC}"

  # Download and run Bun installer
  case "$OS_TYPE" in
    Darwin|Linux)
      curl -fsSL https://bun.sh/install | bash
      ;;
  esac

  # Source bun environment
  if [ -f "$BUN_HOME/bin/bun" ]; then
    BUN_BIN="$BUN_HOME/bin/bun"
    export PATH="$BUN_HOME/bin:$PATH"
    echo -e "${GREEN}✓ Bun installed successfully at: $BUN_BIN${NC}"
  else
    echo -e "${RED}❌ Bun installation failed. Please install manually from https://bun.sh${NC}"
    exit 1
  fi
fi

# Verify Bun is executable
if ! "$BUN_BIN" --version &> /dev/null; then
  echo -e "${RED}❌ Bun installation verification failed${NC}"
  exit 1
fi

# Get the package root directory
# When installed via npm/npx, the script is at node_modules/.bin/codeprobe
# We need to find the actual package directory
if [ -f "package.json" ]; then
  # Running from package root
  PACKAGE_ROOT="$(pwd)"
elif [ -f "../../../../package.json" ]; then
  # Running from node_modules/.bin (4 levels up: .bin -> bin -> node_modules -> root)
  PACKAGE_ROOT="$(cd ../../../../ && pwd)"
else
  # Fallback: use the script's directory parent
  PACKAGE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi

# Ensure package root is valid
if [ ! -f "$PACKAGE_ROOT/package.json" ]; then
  echo -e "${RED}❌ Could not locate package.json. Searched at: $PACKAGE_ROOT${NC}"
  exit 1
fi

# Run CodeProbe CLI
"$BUN_BIN" run "$PACKAGE_ROOT/src/cli/index.ts" scan "$@"

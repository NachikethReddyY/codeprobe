#!/bin/bash
# CodeProbe Environment Verification Script

echo "🔍 Checking CodeProbe Environment Setup..."
echo ""

# Check .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "   Create it with: cp .env.example .env"
    exit 1
fi
echo "✅ .env file exists"

# Check required API keys
echo ""
echo "Checking API Keys:"

if grep -q "BRIGHT_DATA_API_KEY=" .env && grep "BRIGHT_DATA_API_KEY=" .env | grep -qv "your_"; then
    echo "✅ BRIGHT_DATA_API_KEY is set"
else
    echo "⚠️  BRIGHT_DATA_API_KEY is missing or not configured"
fi

if grep -q "DAYTONA_API_KEY=" .env && grep "DAYTONA_API_KEY=" .env | grep -qv "your_"; then
    echo "✅ DAYTONA_API_KEY is set"
else
    echo "⚠️  DAYTONA_API_KEY is missing or not configured"
fi

if grep -q "KIMI_API_KEY=" .env && grep "KIMI_API_KEY=" .env | grep -qv "your_"; then
    echo "✅ KIMI_API_KEY is set"
else
    echo "⚠️  KIMI_API_KEY is missing or not configured"
fi

if grep -q "NOSANA_API_KEY=" .env && grep "NOSANA_API_KEY=" .env | grep -qv "your_"; then
    echo "✅ NOSANA_API_KEY is set"
else
    echo "⚠️  NOSANA_API_KEY is missing or not configured"
fi

# Check server configuration
echo ""
echo "Checking Server Configuration:"

if grep -q "PORT=8080" .env; then
    echo "✅ PORT is set to 8080"
else
    echo "⚠️  PORT configuration not found"
fi

if grep -q "NODE_ENV=development" .env; then
    echo "✅ NODE_ENV is set to development"
fi

# Test that Bun loads .env
echo ""
echo "Testing Bun .env loading..."

if command -v bun &> /dev/null; then
    # Try a quick test
    TEST_OUTPUT=$(bun -e "console.log(process.env.PORT)" 2>/dev/null)
    if [ "$TEST_OUTPUT" == "8080" ]; then
        echo "✅ Bun can load .env variables"
    else
        echo "⚠️  Bun may not be loading .env correctly"
    fi
else
    echo "⚠️  Bun not installed - skipping .env load test"
fi

# Check git ignore
echo ""
echo "Checking Security:"

if grep -q ".env" .gitignore 2>/dev/null; then
    echo "✅ .env is in .gitignore (secure)"
else
    echo "⚠️  .env might not be in .gitignore"
fi

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Environment Setup Complete!"
echo ""
echo "To start testing:"
echo ""
echo "  Terminal 1:"
echo "    bun src/api/server-cli.ts"
echo ""
echo "  Terminal 2:"
echo "    SERVER_URL=http://localhost:8080 \\"
echo "    CODEPROBE_SECRET=dev-token \\"
echo "    bun src/cli-server.ts scan ./demo-vulnerable-app"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

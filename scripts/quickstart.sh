#!/bin/bash
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${REPO_ROOT}"

echo "🚀 Blind BTC Intent Markets - Quick Start"
echo "=========================================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v cargo &> /dev/null; then
    echo "❌ Rust not installed. Install from: https://rustup.rs/"
    exit 1
fi

if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL client not found. Local gateway builds need PostgreSQL 15+ binaries."
fi

echo "✅ Prerequisites OK"
echo ""

# Prefer the containerized stack when Docker is available.
if command -v docker &> /dev/null && docker compose version >/dev/null 2>&1; then
    echo "Docker Compose detected."
    echo "1. Copy .env.compose.example to .env and fill real values."
    echo "2. Start the stack with: docker compose up --build"
    echo ""
fi

# Build gateway with an ephemeral schema database so SQLx can compile cleanly.
echo "Building Gateway API..."
./scripts/build_gateway_with_schema.sh "$(pwd)/backend/gateway" blindmarkets-gateway
echo "✅ Gateway ready"
echo ""

# Build coordinator
echo "Building Batch Coordinator..."
cd backend/coordinator
cargo build --release
echo "✅ Coordinator ready"
echo ""

# Build observer
echo "Building Observer..."
cd ../observer
cargo build --release
echo "✅ Observer ready"
echo ""

# Build solver
echo "Building Reference Solver..."
cd ../../solver-reference
cargo build --release
echo "✅ Solver ready"
echo ""

cd ..

echo "🎉 Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Start Gateway API:"
echo "   cd backend/gateway && cargo run --release"
echo ""
echo "2. Start Coordinator (in another terminal):"
echo "   cd backend/coordinator && cargo run --release"
echo ""
echo "3. Start Observer and Solver:"
echo "   cd backend/observer && cargo run --release"
echo "   cd solver-reference && cargo run --release"
echo ""
echo "4. Or run the full stack with containers:"
echo "   cp .env.compose.example .env && docker compose up --build"
echo ""
echo "5. Run tests:"
echo "   ./scripts/test_e2e.sh"
echo ""
echo "📚 Documentation: See README.md and docs/requirements/prd.md"

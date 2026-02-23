#!/bin/bash
set -e

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
    echo "⚠️  PostgreSQL client not found. Install PostgreSQL 15+"
fi

echo "✅ Prerequisites OK"
echo ""

# Setup database
echo "Setting up database..."
read -p "PostgreSQL database URL (press Enter for default): " DB_URL
DB_URL=${DB_URL:-"postgresql://postgres:postgres@localhost:5432/blindmarkets"}

# Create database if it doesn't exist
DB_NAME=$(echo $DB_URL | sed 's/.*\///')
if command -v psql &> /dev/null; then
    psql -lqt | cut -d \| -f 1 | grep -qw $DB_NAME || createdb $DB_NAME 2>/dev/null || true
fi

# Build gateway
echo "Building Gateway API..."
cd backend/gateway
cargo build --release

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    sed -i.bak "s|DATABASE_URL=.*|DATABASE_URL=$DB_URL|" .env
    echo "✅ Created .env file"
fi

# Run migrations
echo "Running database migrations..."
export DATABASE_URL=$DB_URL
sqlx database create 2>/dev/null || true
sqlx migrate run 2>/dev/null || cargo run --bin migrate 2>/dev/null || true

echo "✅ Gateway ready"
echo ""

# Build coordinator
echo "Building Batch Coordinator..."
cd ../coordinator
cargo build --release
echo "✅ Coordinator ready"
echo ""

cd ../..

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
echo "3. Run tests:"
echo "   ./scripts/test_e2e.sh"
echo ""
echo "4. Deploy contracts (optional):"
echo "   ./scripts/deploy_contracts.sh"
echo ""
echo "📚 Documentation: See README.md and prd.md"

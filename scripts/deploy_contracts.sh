#!/bin/bash
set -e

echo "🚀 Blind BTC Intent Markets - Contract Deployment Script"
echo "========================================================="

# Check if scarb is installed
if ! command -v scarb &> /dev/null; then
    echo "❌ Error: scarb is not installed"
    echo "Install from: https://docs.swmansion.com/scarb/download.html"
    exit 1
fi

# Check if starkli is installed
if ! command -v starkli &> /dev/null; then
    echo "❌ Error: starkli is not installed"
    echo "Install from: https://github.com/xJonathanLEI/starkli"
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "❌ Error: .env file not found"
    echo "Create .env with required variables (see .env.example)"
    exit 1
fi

# Required environment variables
required_vars=("STARKNET_RPC_URL" "DEPLOYER_PRIVATE_KEY" "DEPLOYER_ADDRESS" "ADMIN_ADDRESS")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ Error: $var is not set in .env"
        exit 1
    fi
done

echo "✅ Environment validated"
echo ""

# Build contracts
echo "📦 Building contracts..."
scarb build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi

echo "✅ Build successful"
echo ""

# Deploy AssetRegistry
echo "🔧 Deploying AssetRegistry..."
ASSET_REGISTRY_CLASS_HASH=$(starkli declare target/dev/blindmarkets_AssetRegistry.contract_class.json \
    --rpc $STARKNET_RPC_URL \
    --account $DEPLOYER_ADDRESS \
    --private-key $DEPLOYER_PRIVATE_KEY \
    2>&1 | grep "Class hash" | awk '{print $NF}')

ASSET_REGISTRY_ADDRESS=$(starkli deploy $ASSET_REGISTRY_CLASS_HASH \
    $ADMIN_ADDRESS \
    --rpc $STARKNET_RPC_URL \
    --account $DEPLOYER_ADDRESS \
    --private-key $DEPLOYER_PRIVATE_KEY \
    2>&1 | grep "Contract deployed" | awk '{print $NF}')

echo "✅ AssetRegistry deployed at: $ASSET_REGISTRY_ADDRESS"
echo ""

# Deploy GatewayRegistry
echo "🔧 Deploying GatewayRegistry..."
GATEWAY_REGISTRY_CLASS_HASH=$(starkli declare target/dev/blindmarkets_GatewayRegistry.contract_class.json \
    --rpc $STARKNET_RPC_URL \
    --account $DEPLOYER_ADDRESS \
    --private-key $DEPLOYER_PRIVATE_KEY \
    2>&1 | grep "Class hash" | awk '{print $NF}')

GATEWAY_REGISTRY_ADDRESS=$(starkli deploy $GATEWAY_REGISTRY_CLASS_HASH \
    $ADMIN_ADDRESS \
    --rpc $STARKNET_RPC_URL \
    --account $DEPLOYER_ADDRESS \
    --private-key $DEPLOYER_PRIVATE_KEY \
    2>&1 | grep "Contract deployed" | awk '{print $NF}')

echo "✅ GatewayRegistry deployed at: $GATEWAY_REGISTRY_ADDRESS"
echo ""

# Deploy SolverBond (needs bond token address)
echo "🔧 Deploying SolverBond..."
BOND_TOKEN_ADDRESS=${BOND_TOKEN_ADDRESS:-"0x0"} # Use env var or placeholder
TREASURY_ADDRESS=${TREASURY_ADDRESS:-$ADMIN_ADDRESS}

SOLVER_BOND_CLASS_HASH=$(starkli declare target/dev/blindmarkets_SolverBond.contract_class.json \
    --rpc $STARKNET_RPC_URL \
    --account $DEPLOYER_ADDRESS \
    --private-key $DEPLOYER_PRIVATE_KEY \
    2>&1 | grep "Class hash" | awk '{print $NF}')

# Note: BatchAuction and BatchSettlement addresses will be added after deployment
SOLVER_BOND_ADDRESS=$(starkli deploy $SOLVER_BOND_CLASS_HASH \
    $ADMIN_ADDRESS \
    "0x0" \
    "0x0" \
    $BOND_TOKEN_ADDRESS \
    $TREASURY_ADDRESS \
    --rpc $STARKNET_RPC_URL \
    --account $DEPLOYER_ADDRESS \
    --private-key $DEPLOYER_PRIVATE_KEY \
    2>&1 | grep "Contract deployed" | awk '{print $NF}')

echo "✅ SolverBond deployed at: $SOLVER_BOND_ADDRESS"
echo ""

# Deploy IntentRegistry
echo "🔧 Deploying IntentRegistry..."
INTENT_REGISTRY_CLASS_HASH=$(starkli declare target/dev/blindmarkets_IntentRegistry.contract_class.json \
    --rpc $STARKNET_RPC_URL \
    --account $DEPLOYER_ADDRESS \
    --private-key $DEPLOYER_PRIVATE_KEY \
    2>&1 | grep "Class hash" | awk '{print $NF}')

INTENT_REGISTRY_ADDRESS=$(starkli deploy $INTENT_REGISTRY_CLASS_HASH \
    $ADMIN_ADDRESS \
    "0x0" \
    $ASSET_REGISTRY_ADDRESS \
    --rpc $STARKNET_RPC_URL \
    --account $DEPLOYER_ADDRESS \
    --private-key $DEPLOYER_PRIVATE_KEY \
    2>&1 | grep "Contract deployed" | awk '{print $NF}')

echo "✅ IntentRegistry deployed at: $INTENT_REGISTRY_ADDRESS"
echo ""

# Deploy BatchAuction
echo "🔧 Deploying BatchAuction..."
COORDINATOR_ADDRESS=${COORDINATOR_ADDRESS:-$ADMIN_ADDRESS}

BATCH_AUCTION_CLASS_HASH=$(starkli declare target/dev/blindmarkets_BatchAuction.contract_class.json \
    --rpc $STARKNET_RPC_URL \
    --account $DEPLOYER_ADDRESS \
    --private-key $DEPLOYER_PRIVATE_KEY \
    2>&1 | grep "Class hash" | awk '{print $NF}')

BATCH_AUCTION_ADDRESS=$(starkli deploy $BATCH_AUCTION_CLASS_HASH \
    $ADMIN_ADDRESS \
    $SOLVER_BOND_ADDRESS \
    "0x0" \
    $COORDINATOR_ADDRESS \
    --rpc $STARKNET_RPC_URL \
    --account $DEPLOYER_ADDRESS \
    --private-key $DEPLOYER_PRIVATE_KEY \
    2>&1 | grep "Contract deployed" | awk '{print $NF}')

echo "✅ BatchAuction deployed at: $BATCH_AUCTION_ADDRESS"
echo ""

# Deploy BatchSettlement
echo "🔧 Deploying BatchSettlement..."
BATCH_SETTLEMENT_CLASS_HASH=$(starkli declare target/dev/blindmarkets_BatchSettlement.contract_class.json \
    --rpc $STARKNET_RPC_URL \
    --account $DEPLOYER_ADDRESS \
    --private-key $DEPLOYER_PRIVATE_KEY \
    2>&1 | grep "Class hash" | awk '{print $NF}')

BATCH_SETTLEMENT_ADDRESS=$(starkli deploy $BATCH_SETTLEMENT_CLASS_HASH \
    $ADMIN_ADDRESS \
    $INTENT_REGISTRY_ADDRESS \
    $BATCH_AUCTION_ADDRESS \
    $SOLVER_BOND_ADDRESS \
    $COORDINATOR_ADDRESS \
    $TREASURY_ADDRESS \
    --rpc $STARKNET_RPC_URL \
    --account $DEPLOYER_ADDRESS \
    --private-key $DEPLOYER_PRIVATE_KEY \
    2>&1 | grep "Contract deployed" | awk '{print $NF}')

echo "✅ BatchSettlement deployed at: $BATCH_SETTLEMENT_ADDRESS"
echo ""

# Save deployment addresses
echo "💾 Saving deployment addresses..."
cat > deployment_addresses.env << EOF
# Blind BTC Intent Markets - Deployment Addresses
# Generated: $(date)

ASSET_REGISTRY_ADDRESS=$ASSET_REGISTRY_ADDRESS
GATEWAY_REGISTRY_ADDRESS=$GATEWAY_REGISTRY_ADDRESS
SOLVER_BOND_ADDRESS=$SOLVER_BOND_ADDRESS
INTENT_REGISTRY_ADDRESS=$INTENT_REGISTRY_ADDRESS
BATCH_AUCTION_ADDRESS=$BATCH_AUCTION_ADDRESS
BATCH_SETTLEMENT_ADDRESS=$BATCH_SETTLEMENT_ADDRESS
EOF

echo "✅ Deployment addresses saved to deployment_addresses.env"
echo ""

echo "🎉 Deployment Complete!"
echo "======================="
echo ""
echo "📋 Contract Addresses:"
echo "  AssetRegistry:     $ASSET_REGISTRY_ADDRESS"
echo "  GatewayRegistry:   $GATEWAY_REGISTRY_ADDRESS"
echo "  SolverBond:        $SOLVER_BOND_ADDRESS"
echo "  IntentRegistry:    $INTENT_REGISTRY_ADDRESS"
echo "  BatchAuction:      $BATCH_AUCTION_ADDRESS"
echo "  BatchSettlement:   $BATCH_SETTLEMENT_ADDRESS"
echo ""
echo "⚠️  Next Steps:"
echo "  1. Update IntentRegistry with BatchSettlement address"
echo "  2. Update BatchAuction with BatchSettlement address"
echo "  3. Update SolverBond with BatchAuction and BatchSettlement addresses"
echo "  4. Whitelist assets in AssetRegistry"
echo "  5. Register gateway in GatewayRegistry"
echo "  6. Update backend .env files with contract addresses"

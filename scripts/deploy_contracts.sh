#!/bin/bash
set -e

echo "BlindMarkets - Contract Deployment Script"
echo "=========================================="
echo ""

# Check if scarb is installed
if ! command -v scarb &> /dev/null; then
    echo "ERROR: scarb is not installed"
    echo "Install: curl --proto '=https' --tlsv1.2 -sSf https://sh.starkup.sh | sh"
    exit 1
fi

# Check if sncast is installed
if ! command -v sncast &> /dev/null; then
    echo "ERROR: sncast is not installed"
    echo "Install: curl --proto '=https' --tlsv1.2 -sSf https://sh.starkup.sh | sh"
    exit 1
fi

# Load environment variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
else
    echo "ERROR: .env file not found in $(pwd)"
    echo "Create contracts/.env — see README for required variables"
    exit 1
fi

# Required environment variables
required_vars=(
    "DEPLOYER_PRIVATE_KEY"
    "DEPLOYER_ADDRESS"
    "ADMIN_ADDRESS"
    "BOND_TOKEN_ADDRESS"
    "TREASURY_ADDRESS"
    "COORDINATOR_ADDRESS"
)
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "ERROR: $var is not set in .env"
        exit 1
    fi
done

ZERO_ADDRESS="0x0000000000000000000000000000000000000000000000000000000000000000"
ACCOUNT_NAME="bm_deployer"
# sncast built-in network — compatible with RPC v0.10.0 (public free RPCs lag behind)
NETWORK="sepolia"

echo "Environment validated"
echo ""

# Import deployer account (ready = Argent rebranded; fall back to argent for older sncast)
echo "Setting up deployer account..."
sncast account import \
    --name "$ACCOUNT_NAME" \
    --address "$DEPLOYER_ADDRESS" \
    --private-key "$DEPLOYER_PRIVATE_KEY" \
    --network sepolia \
    --type ready \
    --silent 2>/dev/null || \
sncast account import \
    --name "$ACCOUNT_NAME" \
    --address "$DEPLOYER_ADDRESS" \
    --private-key "$DEPLOYER_PRIVATE_KEY" \
    --network sepolia \
    --type argent \
    --silent 2>/dev/null || true
echo "Account ready: $ACCOUNT_NAME"
echo ""

# Build contracts
echo "Building contracts..."
scarb build
echo "Build successful"
echo ""

# sncast JSON helpers — use -j flag to get machine-readable output, no text scraping

# Returns true if output indicates a transient error worth retrying.
# Covers: rate limits, network issues, and "class not declared yet" (tx still propagating).
is_transient_error() {
    echo "$1" | grep -qi "cu limit exceeded\|request too fast\|error sending request\|connection refused\|timed out\|is not declared"
}

# Declare a contract; handles "already declared" by extracting the class hash from the error.
# Retries up to 5 times on rate-limit/network errors with exponential backoff.
declare_contract() {
    local name=$1
    local json attempt wait_sec=15
    for attempt in 1 2 3 4 5; do
        json=$(sncast -j --account "$ACCOUNT_NAME" declare \
            --network sepolia \
            --contract-name "$name" 2>&1)
        echo "[declare $name]: $json" >&2
        if is_transient_error "$json"; then
            echo "  (rate-limited/network error on attempt $attempt, waiting ${wait_sec}s...)" >&2
            sleep $wait_sec
            wait_sec=$((wait_sec + 15))
            continue
        fi
        break
    done
    # Success: {"command":"declare","class_hash":"0x...","transaction_hash":"0x..."}
    # Already declared: {"command":"declare","error":"Contract with class hash 0x... is already declared"}
    local hash
    hash=$(echo "$json" | /usr/bin/sed -n \
        's/.*"class_hash":"\(0x[0-9a-fA-F]*\)".*/\1/p; s/.*class hash \(0x[0-9a-fA-F]*\).*/\1/p' \
        | head -1)
    if [ -z "$hash" ]; then
        echo "ERROR: could not extract class hash for $name — raw output above" >&2
        exit 1
    fi
    # Sleep after fresh declaration — tx must reach ACCEPTED_ON_L2 before deploy can use it.
    # Sepolia block time is 10-60s; 45s covers most cases. deploy_contract also retries.
    if echo "$json" | grep -q '"command":"declare".*"transaction_hash"'; then
        echo "  (waiting 45s for declaration tx to be accepted on L2...)" >&2
        sleep 45
    fi
    echo "$hash"
}

# Deploy a contract by class hash with constructor calldata; returns contract address.
# Retries up to 5 times on rate-limit/network errors with exponential backoff.
deploy_contract() {
    local class_hash=$1
    shift
    if [ -z "$class_hash" ]; then
        echo "ERROR: empty class_hash passed to deploy_contract" >&2
        exit 1
    fi
    local json attempt wait_sec=15
    for attempt in 1 2 3 4 5; do
        json=$(sncast -j --account "$ACCOUNT_NAME" deploy \
            --network sepolia \
            --class-hash "$class_hash" \
            --constructor-calldata "$@" 2>&1)
        echo "[deploy $class_hash]: $json" >&2
        if is_transient_error "$json"; then
            echo "  (rate-limited/network error on attempt $attempt, waiting ${wait_sec}s...)" >&2
            sleep $wait_sec
            wait_sec=$((wait_sec + 15))
            continue
        fi
        break
    done
    # Success: {"command":"deploy","contract_address":"0x...","transaction_hash":"0x..."}
    local addr
    addr=$(echo "$json" | /usr/bin/sed -n \
        's/.*"contract_address":"\(0x[0-9a-fA-F]*\)".*/\1/p')
    if [ -z "$addr" ]; then
        echo "ERROR: could not extract contract address for class $class_hash — raw output above" >&2
        exit 1
    fi
    echo "$addr"
}

# Invoke a contract function (with retry on rate limit).
invoke_contract() {
    local address=$1
    local function=$2
    shift 2
    local json attempt wait_sec=15
    for attempt in 1 2 3 4 5; do
        json=$(sncast -j --account "$ACCOUNT_NAME" invoke \
            --network sepolia \
            --contract-address "$address" \
            --function "$function" \
            --calldata "$@" 2>&1)
        echo "$json" >&2
        if is_transient_error "$json"; then
            echo "  (rate-limited/network error on attempt $attempt, waiting ${wait_sec}s...)" >&2
            sleep $wait_sec
            wait_sec=$((wait_sec + 15))
            continue
        fi
        break
    done
    echo "$json"
}

# ── Deploy AssetRegistry ─────────────────────────────────────────────────────
echo "Deploying AssetRegistry..."
ASSET_REGISTRY_CLASS_HASH=$(declare_contract "AssetRegistry")
echo "  Class hash: $ASSET_REGISTRY_CLASS_HASH"
ASSET_REGISTRY_ADDRESS=$(deploy_contract "$ASSET_REGISTRY_CLASS_HASH" "$ADMIN_ADDRESS")
echo "  Deployed:   $ASSET_REGISTRY_ADDRESS"
echo ""
sleep 15

# ── Deploy GatewayRegistry ───────────────────────────────────────────────────
echo "Deploying GatewayRegistry..."
GATEWAY_REGISTRY_CLASS_HASH=$(declare_contract "GatewayRegistry")
echo "  Class hash: $GATEWAY_REGISTRY_CLASS_HASH"
GATEWAY_REGISTRY_ADDRESS=$(deploy_contract "$GATEWAY_REGISTRY_CLASS_HASH" "$ADMIN_ADDRESS")
echo "  Deployed:   $GATEWAY_REGISTRY_ADDRESS"
echo ""
sleep 15

# ── Deploy SolverBond (batch addresses wired later) ──────────────────────────
echo "Deploying SolverBond..."
SOLVER_BOND_CLASS_HASH=$(declare_contract "SolverBond")
echo "  Class hash: $SOLVER_BOND_CLASS_HASH"
# constructor: admin, batch_auction_contract, batch_settlement_contract,
#   bond_token, treasury,
#   minimum_bond (u256: low high), withdrawal_delay_seconds,
#   slash_window_seconds, max_slashes_before_blacklist,
#   base_reputation (u256: low high), min_attempts_for_reputation,
#   reputation_decay_period,
#   slashing_user_bps, slashing_treasury_bps, slashing_whistleblower_bps (must sum 10000),
#   bond_scaling_threshold (u256: low high), bond_scaling_percentage (u256: low high),
#   minimum_bond_update_delay
SOLVER_BOND_ADDRESS=$(deploy_contract "$SOLVER_BOND_CLASS_HASH" \
    "$ADMIN_ADDRESS" \
    "$ZERO_ADDRESS" \
    "$ZERO_ADDRESS" \
    "$BOND_TOKEN_ADDRESS" \
    "$TREASURY_ADDRESS" \
    "1000000000000000000" "0" \
    "3600" \
    "3600" \
    "3" \
    "100" "0" \
    "5" \
    "604800" \
    "5000" "4000" "1000" \
    "10000000000000000000" "0" \
    "10000" "0" \
    "3600")
echo "  Deployed:   $SOLVER_BOND_ADDRESS"
echo ""
sleep 15

# ── Deploy IntentRegistry (batch_settlement wired later) ─────────────────────
echo "Deploying IntentRegistry..."
INTENT_REGISTRY_CLASS_HASH=$(declare_contract "IntentRegistry")
echo "  Class hash: $INTENT_REGISTRY_CLASS_HASH"
# constructor: admin, batch_settlement_contract (zero for now), asset_registry_contract,
#   batch_window_seconds, genesis_timestamp
INTENT_REGISTRY_ADDRESS=$(deploy_contract "$INTENT_REGISTRY_CLASS_HASH" \
    "$ADMIN_ADDRESS" \
    "$ZERO_ADDRESS" \
    "$ASSET_REGISTRY_ADDRESS" \
    "30" \
    "1700000000")
echo "  Deployed:   $INTENT_REGISTRY_ADDRESS"
echo ""
sleep 15

# ── Deploy BatchAuction (batch_settlement wired later) ───────────────────────
echo "Deploying BatchAuction..."
BATCH_AUCTION_CLASS_HASH=$(declare_contract "BatchAuction")
echo "  Class hash: $BATCH_AUCTION_CLASS_HASH"
# constructor: admin, solver_bond_contract, batch_settlement_contract (zero),
#   coordinator, slashing_user_pool, slashing_whistleblower_pool,
#   solution_window_seconds, auction_resolution_seconds,
#   surplus_weight (u256: low high), fee_weight (u256: low high),
#   reputation_weight (u256: low high)
BATCH_AUCTION_ADDRESS=$(deploy_contract "$BATCH_AUCTION_CLASS_HASH" \
    "$ADMIN_ADDRESS" \
    "$SOLVER_BOND_ADDRESS" \
    "$ZERO_ADDRESS" \
    "$COORDINATOR_ADDRESS" \
    "$ADMIN_ADDRESS" \
    "$ADMIN_ADDRESS" \
    "20" \
    "10" \
    "1" "0" \
    "1" "0" \
    "1" "0")
echo "  Deployed:   $BATCH_AUCTION_ADDRESS"
echo ""
sleep 15

# ── Deploy BatchSettlement ───────────────────────────────────────────────────
echo "Deploying BatchSettlement..."
BATCH_SETTLEMENT_CLASS_HASH=$(declare_contract "BatchSettlement")
echo "  Class hash: $BATCH_SETTLEMENT_CLASS_HASH"
# constructor: admin, intent_registry_contract, batch_auction_contract,
#   solver_bond_contract, coordinator, treasury,
#   slashing_user_pool, slashing_whistleblower_pool, proof_verifier_contract,
#   slash_bps_constraint, slash_bps_commitment_mismatch
BATCH_SETTLEMENT_ADDRESS=$(deploy_contract "$BATCH_SETTLEMENT_CLASS_HASH" \
    "$ADMIN_ADDRESS" \
    "$INTENT_REGISTRY_ADDRESS" \
    "$BATCH_AUCTION_ADDRESS" \
    "$SOLVER_BOND_ADDRESS" \
    "$COORDINATOR_ADDRESS" \
    "$TREASURY_ADDRESS" \
    "$ADMIN_ADDRESS" \
    "$ADMIN_ADDRESS" \
    "$ZERO_ADDRESS" \
    "500" \
    "300")
echo "  Deployed:   $BATCH_SETTLEMENT_ADDRESS"
echo ""

# ── Wire cross-contract addresses ────────────────────────────────────────────
echo "Wiring contract addresses..."

echo "  IntentRegistry <- BatchSettlement"
invoke_contract "$INTENT_REGISTRY_ADDRESS" "set_batch_settlement_contract" "$BATCH_SETTLEMENT_ADDRESS"

echo "  BatchAuction <- BatchSettlement"
invoke_contract "$BATCH_AUCTION_ADDRESS" "set_batch_settlement_contract" "$BATCH_SETTLEMENT_ADDRESS"

echo "  SolverBond <- BatchAuction"
invoke_contract "$SOLVER_BOND_ADDRESS" "set_batch_auction_contract" "$BATCH_AUCTION_ADDRESS"

echo "  SolverBond <- BatchSettlement"
invoke_contract "$SOLVER_BOND_ADDRESS" "set_batch_settlement_contract" "$BATCH_SETTLEMENT_ADDRESS"

echo "Wiring complete"
echo ""

# ── Save deployment addresses ─────────────────────────────────────────────────
cat > deployment_addresses.env << EOF
# BlindMarkets Deployment Addresses
# Generated: $(date)

ASSET_REGISTRY_ADDRESS=$ASSET_REGISTRY_ADDRESS
GATEWAY_REGISTRY_ADDRESS=$GATEWAY_REGISTRY_ADDRESS
SOLVER_BOND_ADDRESS=$SOLVER_BOND_ADDRESS
INTENT_REGISTRY_ADDRESS=$INTENT_REGISTRY_ADDRESS
BATCH_AUCTION_ADDRESS=$BATCH_AUCTION_ADDRESS
BATCH_SETTLEMENT_ADDRESS=$BATCH_SETTLEMENT_ADDRESS
EOF

echo "Deployment addresses saved to deployment_addresses.env"
echo ""
echo "Deployment Complete!"
echo "===================="
echo ""
echo "Contract Addresses:"
echo "  AssetRegistry:     $ASSET_REGISTRY_ADDRESS"
echo "  GatewayRegistry:   $GATEWAY_REGISTRY_ADDRESS"
echo "  SolverBond:        $SOLVER_BOND_ADDRESS"
echo "  IntentRegistry:    $INTENT_REGISTRY_ADDRESS"
echo "  BatchAuction:      $BATCH_AUCTION_ADDRESS"
echo "  BatchSettlement:   $BATCH_SETTLEMENT_ADDRESS"
echo ""
echo "Next Steps:"
echo "  1. Whitelist assets:   sncast invoke AssetRegistry add_asset <TOKEN_ADDRESS>"
echo "  2. Register gateway:   sncast invoke GatewayRegistry register_gateway <GATEWAY_ACCOUNT>"
echo "  3. Fill .env:          cp ../.env.compose.example ../.env — set all addresses above"
echo "  4. Start stack:        cd .. && docker compose up --build"

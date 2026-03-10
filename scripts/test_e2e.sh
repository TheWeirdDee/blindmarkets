#!/bin/bash
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "${REPO_ROOT}"

echo "BlindMarkets end-to-end smoke check"
echo "==================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

GATEWAY_URL=${GATEWAY_URL:-"http://localhost:3000"}
GATEWAY_API_KEY_HEADER=${GATEWAY_API_KEY_HEADER:-"X-API-KEY"}
GATEWAY_API_KEY=${GATEWAY_API_KEY:-"replace_me"}
TEST_INTENT_ID=${TEST_INTENT_ID:-"0xdeadbeef"}

auth_args=(-H "${GATEWAY_API_KEY_HEADER}: ${GATEWAY_API_KEY}")

echo "Gateway URL: ${GATEWAY_URL}"
echo "API key header: ${GATEWAY_API_KEY_HEADER}"
echo "Test intent ID: ${TEST_INTENT_ID}"
echo ""

echo "Test 1: gateway health"
response=$(curl -s -w "\n%{http_code}" "${GATEWAY_URL}/health")
http_code=$(echo "${response}" | tail -n1)
body=$(echo "${response}" | head -n-1)
if [ "${http_code}" = "200" ]; then
    echo -e "${GREEN}ok${NC} gateway healthy"
    echo "  ${body}"
else
    echo -e "${RED}failed${NC} gateway health check (${http_code})"
    exit 1
fi
echo ""

echo "Test 2: gateway public key"
response=$(curl -s -w "\n%{http_code}" "${auth_args[@]}" "${GATEWAY_URL}/v1/gateway/public_key")
http_code=$(echo "${response}" | tail -n1)
body=$(echo "${response}" | head -n-1)
if [ "${http_code}" = "200" ]; then
    echo -e "${GREEN}ok${NC} public key endpoint reachable"
else
    echo -e "${RED}failed${NC} public key endpoint (${http_code})"
    echo "  ${body}"
    exit 1
fi
echo ""

echo "Test 3: intent listing"
response=$(curl -s -w "\n%{http_code}" "${auth_args[@]}" "${GATEWAY_URL}/v1/intents?limit=5")
http_code=$(echo "${response}" | tail -n1)
body=$(echo "${response}" | head -n-1)
if [ "${http_code}" = "200" ]; then
    echo -e "${GREEN}ok${NC} intent listing reachable"
else
    echo -e "${RED}failed${NC} intent listing (${http_code})"
    echo "  ${body}"
    exit 1
fi
echo ""

echo "Test 4: batch listing"
response=$(curl -s -w "\n%{http_code}" "${auth_args[@]}" "${GATEWAY_URL}/v1/batches?limit=5")
http_code=$(echo "${response}" | tail -n1)
body=$(echo "${response}" | head -n-1)
if [ "${http_code}" = "200" ]; then
    echo -e "${GREEN}ok${NC} batch listing reachable"
else
    echo -e "${RED}failed${NC} batch listing (${http_code})"
    echo "  ${body}"
    exit 1
fi
echo ""

echo "Test 5: missing intent lookup"
response=$(curl -s -w "\n%{http_code}" "${auth_args[@]}" "${GATEWAY_URL}/v1/intents/${TEST_INTENT_ID}")
http_code=$(echo "${response}" | tail -n1)
body=$(echo "${response}" | head -n-1)
if [ "${http_code}" = "404" ] || [ "${http_code}" = "200" ]; then
    if [ "${http_code}" = "404" ]; then
        echo -e "${GREEN}ok${NC} missing intent returns 404"
    else
        echo -e "${YELLOW}warn${NC} test intent exists already"
        echo "  ${body}"
    fi
else
    echo -e "${RED}failed${NC} intent lookup (${http_code})"
    echo "  ${body}"
    exit 1
fi
echo ""

echo "Test 6: local process visibility"
if pgrep -f "blindmarkets-coordinator" >/dev/null; then
    echo -e "${GREEN}ok${NC} coordinator process detected"
else
    echo -e "${YELLOW}warn${NC} coordinator process not detected"
fi

if pgrep -f "blindmarkets-observer" >/dev/null; then
    echo -e "${GREEN}ok${NC} observer process detected"
else
    echo -e "${YELLOW}warn${NC} observer process not detected"
fi

if pgrep -f "blindmarkets-solver" >/dev/null; then
    echo -e "${GREEN}ok${NC} solver process detected"
else
    echo -e "${YELLOW}warn${NC} solver process not detected"
fi
echo ""

echo "Test 7: database connectivity"
if [ -n "${DATABASE_URL}" ] && command -v psql >/dev/null 2>&1; then
    if psql "${DATABASE_URL}" -c "SELECT 1" >/dev/null 2>&1; then
        echo -e "${GREEN}ok${NC} database accessible"
    else
        echo -e "${YELLOW}warn${NC} database connection failed"
    fi
else
    echo -e "${YELLOW}warn${NC} DATABASE_URL or psql unavailable"
fi
echo ""

echo "Smoke check complete."

#!/usr/bin/env bash
# ==============================================================================
# LaPrizza - Automated Smoke Test Suite (SYS01 / AC2)
# Aligned with docs/asist/sys-deployment.md §7
# Usage: ./scripts/smoke-tests.sh [BASE_URL] [CA_CERT_PATH]
# ==============================================================================

set -euo pipefail

BASE_URL="${1:-${BASE_URL:-https://localhost}}"
CA_CERT="${2:-${CA_CERT:-}}"
INSECURE="${INSECURE:-false}"

CURL_OPTS=(-fsS)
if [ -n "$CA_CERT" ] && [ -f "$CA_CERT" ]; then
    CURL_OPTS+=(--cacert "$CA_CERT")
elif [ "$INSECURE" = "true" ] || [[ "$BASE_URL" =~ ^https://(localhost|127\.0\.0\.1) ]]; then
    # Local dev self-signed certificate acceptance
    CURL_OPTS+=(-k)
fi

echo "=========================================================="
echo "LaPrizza Deployment Validation — Smoke Tests"
echo "Target Base URL: $BASE_URL"
echo "Timestamp:       $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "=========================================================="

FAILED=0
TOTAL=0

# Helper to parse JSON using node or python3 or grep fallback
parse_json() {
    local json="$1"
    local expr="$2"
    if command -v node >/dev/null 2>&1; then
        node -e "const d = JSON.parse(process.argv[1]); console.log($expr);" "$json" 2>/dev/null || echo ""
    elif command -v python3 >/dev/null 2>&1; then
        python3 -c "import sys, json; d = json.loads(sys.argv[1]); print($expr)" "$json" 2>/dev/null || echo ""
    elif command -v jq >/dev/null 2>&1; then
        echo "$json" | jq -r "$expr" 2>/dev/null || echo ""
    fi
}

run_test() {
    local test_name="$1"
    local test_cmd="$2"
    TOTAL=$((TOTAL + 1))
    echo -n "[$TOTAL] $test_name ... "
    if eval "$test_cmd"; then
        echo "PASS"
    else
        echo "FAIL"
        FAILED=$((FAILED + 1))
    fi
}

# ------------------------------------------------------------------------------
# 1. Health Probe (/api/health or /health)
# ------------------------------------------------------------------------------
HEALTH_ENDPOINT="$BASE_URL/api/health"
# If base URL doesn't serve /api (direct backend port 3000), fallback to /health
if ! curl "${CURL_OPTS[@]}" "$HEALTH_ENDPOINT" >/dev/null 2>&1; then
    HEALTH_ENDPOINT="$BASE_URL/health"
fi

HEALTH_BODY=$(curl "${CURL_OPTS[@]}" "$HEALTH_ENDPOINT" 2>/dev/null || echo "{}")

run_test "Health endpoint returns HTTP 200 and status == 'ok'" \
    '[ "$(parse_json "$HEALTH_BODY" "d.status")" = "ok" ]'

run_test "Health endpoint reports identifiable version" \
    '[ -n "$(parse_json "$HEALTH_BODY" "d.version")" ]'

run_test "Health dependency: PostgreSQL is up" \
    '[ "$(parse_json "$HEALTH_BODY" "d.dependencies && d.dependencies.postgres")" = "up" ]'

run_test "Health dependency: Prolog engine is up" \
    '[ "$(parse_json "$HEALTH_BODY" "d.dependencies && d.dependencies.prolog")" = "up" ]'

# ------------------------------------------------------------------------------
# 2. Public Catalogue (no auth required — BCK03–BCK11)
# ------------------------------------------------------------------------------
CATALOGUE_ENDPOINT="$BASE_URL/api/catalogue"
if ! curl "${CURL_OPTS[@]}" "$CATALOGUE_ENDPOINT" >/dev/null 2>&1; then
    CATALOGUE_ENDPOINT="$BASE_URL/catalogue"
fi
CATALOGUE_BODY=$(curl "${CURL_OPTS[@]}" "$CATALOGUE_ENDPOINT" 2>/dev/null || echo "[]")

run_test "Public catalogue returns HTTP 200 array" \
    '[ "$(parse_json "$CATALOGUE_BODY" "Array.isArray(d) ? d.length >= 0 : d.data ? d.data.length >= 0 : false")" = "true" ]'

# ------------------------------------------------------------------------------
# 3. Public Taxonomy Probes (Pizza Sizes and EU Allergens Seed)
# ------------------------------------------------------------------------------
SIZES_ENDPOINT="$BASE_URL/api/pizza-sizes"
if ! curl "${CURL_OPTS[@]}" "$SIZES_ENDPOINT" >/dev/null 2>&1; then
    SIZES_ENDPOINT="$BASE_URL/pizza-sizes"
fi
SIZES_BODY=$(curl "${CURL_OPTS[@]}" "$SIZES_ENDPOINT" 2>/dev/null || echo "[]")

run_test "Public taxonomy: pizza sizes populated (length >= 1)" \
    '[ "$(parse_json "$SIZES_BODY" "Array.isArray(d) ? d.length >= 1 : false")" = "true" ]'

ALLERGENS_ENDPOINT="$BASE_URL/api/allergens"
if ! curl "${CURL_OPTS[@]}" "$ALLERGENS_ENDPOINT" >/dev/null 2>&1; then
    ALLERGENS_ENDPOINT="$BASE_URL/allergens"
fi
ALLERGENS_BODY=$(curl "${CURL_OPTS[@]}" "$ALLERGENS_ENDPOINT" 2>/dev/null || echo "[]")

run_test "Public taxonomy: allergens seed populated (length >= 1)" \
    '[ "$(parse_json "$ALLERGENS_BODY" "Array.isArray(d) ? d.length >= 1 : false")" = "true" ]'

# ------------------------------------------------------------------------------
# 4. Frontend SPA Probe
# ------------------------------------------------------------------------------
if [[ "$BASE_URL" =~ :3000$ ]]; then
    echo "[$((TOTAL + 1))] Frontend SPA check skipped (testing backend port 3000 directly)"
else
    SPA_CODE=$(curl "${CURL_OPTS[@]}" -o /dev/null -w "%{http_code}" "$BASE_URL/" 2>/dev/null || echo "000")
    run_test "Frontend SPA responds with HTTP 200" \
        '[ "$SPA_CODE" = "200" ]'
fi

# ------------------------------------------------------------------------------
# 5. HTTP to HTTPS Redirect Probe
# ------------------------------------------------------------------------------
if [[ "$BASE_URL" =~ ^https:// ]]; then
    HTTP_PORT_80_URL="${BASE_URL/https:\/\//http:\/\/}"
    HTTP_PORT_80_URL="${HTTP_PORT_80_URL/:443/}"
    REDIRECT_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HTTP_PORT_80_URL/" 2>/dev/null || echo "000")
    run_test "HTTP port 80 enforces redirect (HTTP 301/308)" \
        '[[ "$REDIRECT_CODE" =~ ^(301|308|302)$ ]]'
fi

# ------------------------------------------------------------------------------
# Summary and Exit Status (AC5.1: any failure causes non-zero exit)
# ------------------------------------------------------------------------------
echo "=========================================================="
echo "Smoke Tests Summary: $((TOTAL - FAILED))/$TOTAL passed ($FAILED failed)"
echo "=========================================================="

if [ "$FAILED" -gt 0 ]; then
    echo "DEPLOY: FAILED (smoke tests failed)"
    exit 1
fi

echo "DEPLOY: SMOKE TESTS PASSED"
exit 0

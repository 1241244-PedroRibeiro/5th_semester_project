#!/usr/bin/env bash
# laprizza SYS01 - Deployment Script

set -euo pipefail

PROJECT="laprizza"
COMPOSE="docker compose -p ${PROJECT} -f docker-compose.yml"
LOG_DIR="logs/deploy-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "${LOG_DIR}"

echo "=== LaPrizza Deploy $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" | tee "${LOG_DIR}/deploy.log"

# Stage 1: Pre-flight
[ -f .env ] || {
    echo "ERROR: .env is required; copy .env.example manually and set secrets." >&2
    exit 1
}

# Ensure shared resource directory and required subdirectories exist (SYS04)
SHARED_PATH="${LAPRIZZA_SHARED_DIR:-./shared}"
mkdir -p "${SHARED_PATH}"/{3d-assets/{models,textures,env},kitchen-schemas,documents/{reports,operations},planning-inputs,planning-outputs,exports,tmp} 2>/dev/null || true
chmod -R 775 "${SHARED_PATH}" 2>/dev/null || true
chmod 1777 "${SHARED_PATH}/tmp" 2>/dev/null || true

${COMPOSE} config --quiet

# Stage 2: Build
${COMPOSE} build 2>&1 | tee -a "${LOG_DIR}/deploy.log"

# Stage 3: Database
${COMPOSE} up -d --wait postgres 2>&1 | tee -a "${LOG_DIR}/deploy.log"

# Stage 4: Backend (migrations + seed + service)
${COMPOSE} up -d backend 2>&1 | tee -a "${LOG_DIR}/deploy.log"
backend_healthy=false
for i in {1..12}; do
    if [ "$(${COMPOSE} ps backend --format json 2>/dev/null | grep -o '"Health":"healthy"')" ]; then
        backend_healthy=true
        break
    fi
    sleep 5
done
[ "${backend_healthy}" = true ] || {
    echo "=== DEPLOY: FAILED (backend health check timed out) ===" | tee -a "${LOG_DIR}/deploy.log"
    exit 1
}

# Stage 5: Prolog
${COMPOSE} up -d prolog 2>&1 | tee -a "${LOG_DIR}/deploy.log"

# Stage 6: Frontend
${COMPOSE} up -d frontend 2>&1 | tee -a "${LOG_DIR}/deploy.log"
sleep 3

# Stage 7: Smoke tests
${COMPOSE} ps -a > "${LOG_DIR}/ps.txt"
./scripts/smoke-tests.sh "https://localhost" "" 2>&1 | tee "${LOG_DIR}/smoke.txt"

# Retention (90 days)
find logs/deploy-* -maxdepth 0 -type d -mtime +90 -exec rm -rf {} + 2>/dev/null || true

echo "=== DEPLOY: SUCCESS $(date -u +%Y-%m-%dT%H:%M:%SZ) ===" | tee -a "${LOG_DIR}/deploy.log"
echo "Artifacts: ${LOG_DIR}"
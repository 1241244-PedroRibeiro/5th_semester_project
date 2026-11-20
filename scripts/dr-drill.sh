#!/bin/bash
# laprizza SYS08 - Disaster Recovery Drill script
# Runs monthly to validate RTO/RPO targets
# Simulates DB outage, restores from backup, validates service health

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
LOG_FILE="${BACKUP_DIR}/dr-drill-$(date -u +%Y-%m-%d).log"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== DR Drill started at $(date -u) ==="
START_TIME=$(date +%s)

cleanup() {
    docker compose -p laprizza up -d postgres backend >/dev/null 2>&1 || true
}
trap cleanup EXIT

# Find latest backup
LATEST_BACKUP=$(ls -1t "$BACKUP_DIR"/db-*.dump.gz.age 2>/dev/null | head -1)
if [[ -z "$LATEST_BACKUP" ]]; then
    echo "FAIL: No backup files found"
    exit 1
fi

BACKUP_AGE=$(( $(date +%s) - $(stat -c %Y "$LATEST_BACKUP") ))
BACKUP_AGE_HOURS=$(( BACKUP_AGE / 3600 ))

echo "Latest backup: $LATEST_BACKUP (age: ${BACKUP_AGE_HOURS}h)"

# Step 1: Stop backend (simulate outage)
echo "Step 1: Stopping backend service..."
docker compose -p laprizza stop backend

# Step 2: Stop postgres (simulate DB outage)
echo "Step 2: Stopping PostgreSQL..."
docker compose -p laprizza stop postgres

OUTAGE_START=$(date +%s)

# Step 3: Start postgres
echo "Step 3: Starting PostgreSQL..."
docker compose -p laprizza up -d postgres

# Wait for postgres to be ready
echo "Waiting for PostgreSQL to be ready..."
for i in {1..30}; do
    if docker compose -p laprizza exec -T postgres pg_isready -U laprizza_user >/dev/null 2>&1; then
        break
    fi
    sleep 2
done

# Step 4: Restore database
echo "Step 4: Restoring database from backup..."
/usr/local/sbin/restore.sh "$LATEST_BACKUP" "laprizza_db"

# Step 5: Start backend
echo "Step 5: Starting backend..."
docker compose -p laprizza up -d backend

# Step 6: Wait for health endpoint
echo "Step 6: Waiting for /health endpoint..."
HEALTH_OK=false
for i in {1..60}; do
    if docker compose -p laprizza exec -T backend node -e "fetch('http://127.0.0.1:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))" >/dev/null 2>&1; then
        HEALTH_OK=true
        break
    fi
    sleep 5
done

if [[ "$HEALTH_OK" != "true" ]]; then
    echo "FAIL: Health endpoint not responding within 5 minutes"
    exit 1
fi

HEALTH_TIME=$(date +%s)
RTO=$(( HEALTH_TIME - OUTAGE_START ))
RTO_MIN=$(( RTO / 60 ))

echo "RTO: ${RTO_MIN} minutes (target: ≤ 30 min)"

# Step 7: Validate restored database integration
echo "Step 7: Validating restored database integration..."
TABLE_COUNT=$(docker compose -p laprizza exec -T postgres \
    psql -h 127.0.0.1 -U laprizza_user -d laprizza_db -tAc \
    "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")
if [[ "$TABLE_COUNT" =~ ^[0-9]+$ ]] && [[ "$TABLE_COUNT" -gt 0 ]]; then
    echo "Database integration validation: PASS ($TABLE_COUNT public tables)"
else
    echo "FAIL: Restored database integration validation failed"
    exit 1
fi

# Step 8: Run smoke tests
echo "Step 8: Running smoke tests..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if bash "${SCRIPT_DIR}/smoke-tests.sh"; then
    echo "Smoke tests: PASS"
else
    echo "FAIL: Smoke tests failed"
    exit 1
fi

END_TIME=$(date +%s)
TOTAL_TIME=$(( END_TIME - START_TIME ))
TOTAL_MIN=$(( TOTAL_TIME / 60 ))

echo ""
echo "=== DR Drill completed at $(date -u) ==="
echo "RTO: ${RTO_MIN} min (target: ≤ 30 min)"
echo "RPO: ${BACKUP_AGE_HOURS} h (target: ≤ 24 h)"
echo "Total drill time: ${TOTAL_MIN} min"

if [[ $RTO_MIN -le 30 ]] && [[ $BACKUP_AGE_HOURS -le 24 ]]; then
    echo "RESULT: PASS - RTO and RPO targets met"
    echo "RTO=${RTO_MIN} RPO=${BACKUP_AGE_HOURS} RESULT=pass"
    exit 0
else
    echo "RESULT: FAIL - Targets not met"
    echo "REMEDIATION: investigate the failed target, assign an owner, record a corrective action and schedule a re-test before approval."
    echo "RTO=${RTO_MIN} RPO=${BACKUP_AGE_HOURS} RESULT=fail"
    exit 1
fi
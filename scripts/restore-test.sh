#!/bin/bash
# laprizza SYS08 - Restore test script
# Runs weekly to validate backup integrity and restore procedure
# Output: PASS backup=... parity=OK or FAIL ...

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
PG_CONTAINER="${PG_CONTAINER:-laprizza_postgres}"
DB_USER="${DB_USER:-laprizza_user}"
LOG_FILE="${BACKUP_DIR}/restore-test.log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== Restore test started at $(date -u) ==="

# Find latest backup
LATEST_BACKUP=$(ls -1t "$BACKUP_DIR"/db-*.dump.gz.age 2>/dev/null | head -1)
if [[ -z "$LATEST_BACKUP" ]]; then
    echo "FAIL: No backup files found"
    exit 1
fi

echo "Testing backup: $LATEST_BACKUP"

cleanup() {
    docker exec -i -e "PGPASSWORD=${PGPASSWORD:-laprizza_password}" \
        "$PG_CONTAINER" psql -h 127.0.0.1 -U "$DB_USER" -d postgres \
        -c "DROP DATABASE IF EXISTS laprizza_restore_test;" >/dev/null 2>&1 || true
}
trap cleanup EXIT

# Run restore.sh with test database
if /usr/local/sbin/restore.sh "$LATEST_BACKUP" "laprizza_restore_test"; then
    echo "Comparing row counts..."
    tables=$(docker exec -i -e "PGPASSWORD=${PGPASSWORD:-laprizza_password}" \
        "$PG_CONTAINER" psql -h 127.0.0.1 -U "$DB_USER" -d laprizza_db -Atc \
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;")
    while IFS= read -r table_name; do
        [[ -n "$table_name" ]] || continue
        live_count=$(docker exec -i -e "PGPASSWORD=${PGPASSWORD:-laprizza_password}" \
            "$PG_CONTAINER" psql -h 127.0.0.1 -U "$DB_USER" -d laprizza_db -Atc \
            "SELECT count(*) FROM public.\"${table_name}\";")
        restored_count=$(docker exec -i -e "PGPASSWORD=${PGPASSWORD:-laprizza_password}" \
            "$PG_CONTAINER" psql -h 127.0.0.1 -U "$DB_USER" -d laprizza_restore_test -Atc \
            "SELECT count(*) FROM public.\"${table_name}\";")
        if [[ "$live_count" != "$restored_count" ]]; then
            echo "FAIL: row count mismatch in ${table_name}: live=${live_count} restored=${restored_count}"
            exit 1
        fi
    done <<< "$tables"
    echo "Row counts: IDENTICAL"
    echo "PASS backup=$(basename "$LATEST_BACKUP") parity=OK"
    exit 0
else
    echo "FAIL backup=$(basename "$LATEST_BACKUP")"
    exit 1
fi
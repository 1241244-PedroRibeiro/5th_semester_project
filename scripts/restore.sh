#!/bin/bash
# laprizza SYS08 - Restore script
# Restores PostgreSQL database from encrypted backup with validation
# Usage: restore.sh [backup-file] [target-db-name]

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-laprizza_user}"
DB_ADMIN_USER="${DB_ADMIN_USER:-$DB_USER}"
DB_ADMIN_DB="${DB_ADMIN_DB:-postgres}"
AGE_PRIVKEY_FILE="${AGE_PRIVKEY_FILE:-/etc/laprizza/age.key}"
PG_CONTAINER="${PG_CONTAINER:-laprizza_postgres}"

# Arguments
BACKUP_FILE="${1:-}"
TARGET_DB="${2:-laprizza_restore}"

if [[ ! "$TARGET_DB" =~ ^[a-zA-Z_][a-zA-Z0-9_]*$ ]]; then
    echo "ERROR: target database name must be a simple SQL identifier" >&2
    exit 1
fi

# Log file
LOG_FILE="${BACKUP_DIR}/restore.log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== Restore started at $(date -u) ==="
echo "Target database: $TARGET_DB"

if docker inspect "$PG_CONTAINER" >/dev/null 2>&1; then
    psql_command() {
        docker exec -i -e "PGPASSWORD=${PGPASSWORD:-laprizza_password}" \
            "$PG_CONTAINER" psql -h 127.0.0.1 "$@"
    }
    pg_restore_command() {
        docker exec -i -e "PGPASSWORD=${PGPASSWORD:-laprizza_password}" \
            "$PG_CONTAINER" pg_restore -h 127.0.0.1 "$@"
    }
    pg_dump_command() {
        docker exec -i -e "PGPASSWORD=${PGPASSWORD:-laprizza_password}" \
            "$PG_CONTAINER" pg_dump -h 127.0.0.1 "$@"
    }
else
    psql_command() {
        PGPASSWORD="${PGPASSWORD:-}" psql -h "$DB_HOST" -p "$DB_PORT" "$@"
    }
    pg_restore_command() {
        PGPASSWORD="${PGPASSWORD:-}" pg_restore -h "$DB_HOST" -p "$DB_PORT" "$@"
    }
    pg_dump_command() {
        PGPASSWORD="${PGPASSWORD:-}" pg_dump -h "$DB_HOST" -p "$DB_PORT" "$@"
    }
fi

# Find latest backup if not specified
if [[ -z "$BACKUP_FILE" ]]; then
    BACKUP_FILE=$(ls -1t "$BACKUP_DIR"/db-*.dump.gz.age 2>/dev/null | head -1)
    if [[ -z "$BACKUP_FILE" ]]; then
        echo "ERROR: No backup files found in $BACKUP_DIR" >&2
        exit 1
    fi
    echo "Using latest backup: $BACKUP_FILE"
fi

# Verify backup file exists
if [[ ! -f "$BACKUP_FILE" ]]; then
    echo "ERROR: Backup file not found: $BACKUP_FILE" >&2
    exit 1
fi

# Verify checksum
CHECKSUM_FILE="${BACKUP_FILE}.sha256"
if [[ -f "$CHECKSUM_FILE" ]]; then
    echo "Verifying checksum..."
    if ! sha256sum -c "$CHECKSUM_FILE" --quiet; then
        echo "ERROR: Checksum verification failed!" >&2
        exit 1
    fi
    echo "Checksum: OK"
else
    echo "WARNING: No checksum file found, skipping verification" >&2
fi

# Check age private key exists
if [[ ! -f "$AGE_PRIVKEY_FILE" ]]; then
    echo "ERROR: Age private key not found at $AGE_PRIVKEY_FILE" >&2
    exit 1
fi

# Decrypt and decompress
echo "Decrypting and decompressing..."
TMP_DUMP=$(mktemp --suffix=.dump)
trap "rm -f $TMP_DUMP" EXIT

age -d -i "$AGE_PRIVKEY_FILE" "$BACKUP_FILE" | gunzip > "$TMP_DUMP"
echo "Decrypted dump: $(wc -c < "$TMP_DUMP") bytes"

# Drop and create target database
echo "Dropping and creating target database: $TARGET_DB"
psql_command -U "$DB_ADMIN_USER" -d "$DB_ADMIN_DB" -c "DROP DATABASE IF EXISTS $TARGET_DB;"
psql_command -U "$DB_ADMIN_USER" -d "$DB_ADMIN_DB" -c "CREATE DATABASE $TARGET_DB OWNER $DB_USER;"

# Restore using pg_restore
echo "Restoring database..."
pg_restore_command -U "$DB_USER" -d "$TARGET_DB" --no-owner --no-acl --clean --if-exists < "$TMP_DUMP"

# Verify restore by checking table count
echo "Verifying restore..."
TABLE_COUNT=$(psql_command -U "$DB_USER" -d "$TARGET_DB" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
echo "Tables restored: $TABLE_COUNT"

if [[ $TABLE_COUNT -eq 0 ]]; then
    echo "ERROR: No tables found in restored database!" >&2
    exit 1
fi

# Run entity-schema-parity check (if test script exists)
PARITY_SCRIPT="${PARITY_SCRIPT:-/opt/laprizza/scripts/entity-schema-parity.sh}"
if [[ -f "$PARITY_SCRIPT" ]]; then
    echo "Running entity-schema-parity check..."
    if ! "$PARITY_SCRIPT" "$TARGET_DB"; then
        echo "ERROR: Schema parity check failed!" >&2
        exit 1
    fi
    echo "Schema parity: OK"
else
    echo "WARNING: Parity script not found, skipping" >&2
fi

# Compare schema with live database (optional)
LIVE_DB="${LIVE_DB:-laprizza_db}"
echo "Comparing schema with live database ($LIVE_DB)..."
LIVE_SCHEMA=$(mktemp --suffix=.sql)
RESTORE_SCHEMA=$(mktemp --suffix=.sql)
trap "rm -f $LIVE_SCHEMA $RESTORE_SCHEMA $TMP_DUMP" EXIT

pg_dump_command -U "$DB_USER" -s "$LIVE_DB" > "$LIVE_SCHEMA"
pg_dump_command -U "$DB_USER" -s "$TARGET_DB" > "$RESTORE_SCHEMA"

NORMALIZED_LIVE_SCHEMA=$(mktemp --suffix=.sql)
NORMALIZED_RESTORE_SCHEMA=$(mktemp --suffix=.sql)
trap "rm -f $LIVE_SCHEMA $RESTORE_SCHEMA $NORMALIZED_LIVE_SCHEMA $NORMALIZED_RESTORE_SCHEMA $TMP_DUMP" EXIT
grep -v -F '\restrict ' "$LIVE_SCHEMA" | grep -v -F '\unrestrict ' > "$NORMALIZED_LIVE_SCHEMA"
grep -v -F '\restrict ' "$RESTORE_SCHEMA" | grep -v -F '\unrestrict ' > "$NORMALIZED_RESTORE_SCHEMA"

if diff -u "$NORMALIZED_LIVE_SCHEMA" "$NORMALIZED_RESTORE_SCHEMA" >/dev/null; then
    echo "Schema comparison: IDENTICAL"
else
    echo "WARNING: Schema differences detected:" >&2
    diff -u "$NORMALIZED_LIVE_SCHEMA" "$NORMALIZED_RESTORE_SCHEMA" | head -50
fi

echo "=== Restore completed successfully at $(date -u) ==="
echo "PASS backup=$(basename "$BACKUP_FILE") parity=OK"
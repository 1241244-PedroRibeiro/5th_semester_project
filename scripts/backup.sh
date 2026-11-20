#!/bin/bash
# laprizza SYS08 - Backup script
# Creates encrypted PostgreSQL dump with retention policy
# Usage: backup.sh [daily|weekly|monthly]

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
DB_NAME="${DB_NAME:-laprizza_db}"
DB_USER="${DB_USER:-laprizza_user}"
DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
AGE_PUBKEY_FILE="${AGE_PUBKEY_FILE:-/etc/laprizza/age.pub}"
PG_CONTAINER="${PG_CONTAINER:-laprizza_postgres}"
RETENTION_DAILY=7
RETENTION_WEEKLY=4
RETENTION_MONTHLY=12

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# Determine backup type and retention
BACKUP_TYPE="${1:-daily}"
case "$BACKUP_TYPE" in
    daily)
        RETENTION_DAYS=$RETENTION_DAILY
        ;;
    weekly)
        RETENTION_DAYS=$((RETENTION_WEEKLY * 7))
        ;;
    monthly)
        RETENTION_DAYS=$((RETENTION_MONTHLY * 30))
        ;;
    *)
        echo "Usage: $0 [daily|weekly|monthly]" >&2
        exit 1
        ;;
esac

# Generate timestamp
TIMESTAMP=$(date -u +"%Y%m%dT%H%M%SZ")
BACKUP_FILE="${BACKUP_DIR}/db-${TIMESTAMP}.dump"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"
BACKUP_FILE_ENC="${BACKUP_FILE_GZ}.age"
CHECKSUM_FILE="${BACKUP_FILE_ENC}.sha256"

# Log file
LOG_FILE="${BACKUP_DIR}/backup.log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== Backup started at $(date -u) ==="
echo "Type: $BACKUP_TYPE"
echo "Database: $DB_NAME"
echo "Output: $BACKUP_FILE_ENC"

if docker inspect "$PG_CONTAINER" >/dev/null 2>&1; then
    pg_dump_command() {
        docker exec -i -e "PGPASSWORD=${PGPASSWORD:-laprizza_password}" \
            "$PG_CONTAINER" pg_dump -h 127.0.0.1 "$@"
    }
else
    pg_dump_command() {
        PGPASSWORD="${PGPASSWORD:-}" pg_dump -h "$DB_HOST" -p "$DB_PORT" "$@"
    }
fi

# Check age public key exists
if [[ ! -f "$AGE_PUBKEY_FILE" ]]; then
    echo "ERROR: Age public key not found at $AGE_PUBKEY_FILE" >&2
    exit 1
fi

# Create PostgreSQL custom-format dump
echo "Creating database dump..."
pg_dump_command -U "$DB_USER" -Fc --no-owner --no-acl "$DB_NAME" > "$BACKUP_FILE"
echo "Dump created: $(wc -c < "$BACKUP_FILE") bytes"

# Compress
echo "Compressing..."
gzip -9 "$BACKUP_FILE"
echo "Compressed: $(wc -c < "$BACKUP_FILE_GZ") bytes"

# Encrypt with age
echo "Encrypting with age..."
age -r "$(cat "$AGE_PUBKEY_FILE")" -o "$BACKUP_FILE_ENC" "$BACKUP_FILE_GZ"
echo "Encrypted: $(wc -c < "$BACKUP_FILE_ENC") bytes"

# Remove unencrypted compressed file
rm -f "$BACKUP_FILE_GZ"

# Generate SHA256 checksum
echo "Generating checksum..."
sha256sum "$BACKUP_FILE_ENC" > "$CHECKSUM_FILE"
echo "Checksum: $(cat "$CHECKSUM_FILE")"

# Apply retention policy. Daily backups are kept for 7 days, Sunday backups
# for 4 weeks, and first-of-month backups for 12 months.
echo "Applying retention policy (daily=7d weekly=28d monthly=365d)..."
for encrypted_file in "$BACKUP_DIR"/db-*.dump.gz.age; do
    [[ -f "$encrypted_file" ]] || continue
    filename=$(basename "$encrypted_file")
    if [[ ! "$filename" =~ ^db-([0-9]{8}T[0-9]{6}Z)\.dump\.gz\.age$ ]]; then
        echo "WARNING: skipping unrecognised backup name: $encrypted_file" >&2
        continue
    fi
    timestamp="${BASH_REMATCH[1]}"
    backup_date="${timestamp:0:8}"
    backup_epoch=$(date -u -d "${backup_date:0:4}-${backup_date:4:2}-${backup_date:6:2}" +%s)
    age_days=$(( ( $(date -u +%s) - backup_epoch ) / 86400 ))
    day_of_month="${backup_date:6:2}"
    day_of_week=$(date -u -d "${backup_date:0:4}-${backup_date:4:2}-${backup_date:6:2}" +%u)
    retention_days=7
    if [[ "$day_of_month" == "01" ]]; then
        retention_days=365
    elif [[ "$day_of_week" == "7" ]]; then
        retention_days=28
    fi
    if [[ "$age_days" -gt "$retention_days" ]]; then
        rm -f "$encrypted_file" "${encrypted_file}.sha256"
    fi
done

# List remaining backups
echo "Remaining backups:"
ls -lh "$BACKUP_DIR"/db-*.dump.gz.age 2>/dev/null | awk '{print $9 " " $5 " " $6 " " $7 " " $8}' || echo "  (none)"

echo "=== Backup completed at $(date -u) ==="
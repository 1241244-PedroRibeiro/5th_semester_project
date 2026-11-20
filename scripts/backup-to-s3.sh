#!/bin/bash
# laprizza SYS08 - Backup to S3 script
# Syncs encrypted backups to S3 bucket using rclone
# Re-encrypts with a second key before upload for additional security
# Usage: backup-to-s3.sh

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
S3_REMOTE="${S3_REMOTE:-laprizza-s3}"
S3_BUCKET="${S3_BUCKET:-laprizza-backups}"
S3_PATH="${S3_PATH:-laprizza/}"
AGE_PUBKEY_S3="${AGE_PUBKEY_S3:-/etc/laprizza/age-s3.pub}"
RCLONE_CONFIG="${RCLONE_CONFIG:-/etc/rclone.conf}"

# Log file
LOG_FILE="${BACKUP_DIR}/backup-s3.log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== S3 backup started at $(date -u) ==="
echo "Source: $BACKUP_DIR"
echo "Destination: $S3_REMOTE:$S3_BUCKET/$S3_PATH"

# Check S3 public key exists
if [[ ! -f "$AGE_PUBKEY_S3" ]]; then
    echo "ERROR: S3 age public key not found at $AGE_PUBKEY_S3" >&2
    exit 1
fi

# Create temporary directory for re-encrypted files
TMP_DIR=$(mktemp -d)
trap "rm -rf $TMP_DIR" EXIT

echo "Re-encrypting backups with S3 key..."
for enc_file in "$BACKUP_DIR"/db-*.dump.gz.age; do
    [[ -f "$enc_file" ]] || continue
    
    base_name=$(basename "$enc_file")
    # Decrypt with primary key, re-encrypt with S3 key
    # Note: In production, this would use the private key from secure storage
    # For this script, we assume the primary private key is available at /etc/laprizza/age.key
    age -d -i /etc/laprizza/age.key "$enc_file" | \
        age -r "$(cat "$AGE_PUBKEY_S3")" -o "$TMP_DIR/$base_name.s3.age" -
    
    # Also copy checksum
    cp "${enc_file}.sha256" "$TMP_DIR/${base_name}.sha256" 2>/dev/null || true
done

echo "Uploading to S3..."
rclone --config "$RCLONE_CONFIG" sync "$TMP_DIR/" "$S3_REMOTE:$S3_BUCKET/$S3_PATH" --progress

# Verify upload
echo "Verifying upload..."
LOCAL_COUNT=$(ls -1 "$TMP_DIR"/db-*.dump.gz.age.s3.age 2>/dev/null | wc -l)
REMOTE_COUNT=$(rclone --config "$RCLONE_CONFIG" lsf "$S3_REMOTE:$S3_BUCKET/$S3_PATH" --files-only | grep -c "db-.*\.dump\.gz\.age\.s3\.age$" || echo 0)

echo "Local re-encrypted: $LOCAL_COUNT"
echo "Remote: $REMOTE_COUNT"

if [[ $LOCAL_COUNT -eq $REMOTE_COUNT ]]; then
    echo "Upload verification: OK"
else
    echo "WARNING: Count mismatch!" >&2
fi

echo "=== S3 backup completed at $(date -u) ==="
#!/bin/bash
# laprizza SYS08 - Backup to NAS script
# Syncs encrypted backups to DEI NAS using rsync over SSH
# Usage: backup-to-nas.sh

set -euo pipefail

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backups}"
NAS_HOST="${NAS_HOST:-nas.dei.example.com}"
NAS_USER="${NAS_USER:-laprizza-backup}"
NAS_PATH="${NAS_PATH:-/backups/laprizza}"
NAS_SSH_KEY="${NAS_SSH_KEY:-/etc/laprizza/nas_ssh_key}"
RSYNC_OPTS="${RSYNC_OPTS:- -avz --delete --progress}"

# Log file
LOG_FILE="${BACKUP_DIR}/backup-nas.log"
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=== NAS backup started at $(date -u) ==="
echo "Source: $BACKUP_DIR"
echo "Destination: $NAS_USER@$NAS_HOST:$NAS_PATH"

# Check SSH key exists
if [[ ! -f "$NAS_SSH_KEY" ]]; then
    echo "ERROR: NAS SSH key not found at $NAS_SSH_KEY" >&2
    exit 1
fi

# Ensure NAS directory exists
ssh -i "$NAS_SSH_KEY" -o StrictHostKeyChecking=no "$NAS_USER@$NAS_HOST" "mkdir -p $NAS_PATH"

# Sync backups to NAS
echo "Syncing backups to NAS..."
rsync $RSYNC_OPTS -e "ssh -i $NAS_SSH_KEY -o StrictHostKeyChecking=no" \
    "$BACKUP_DIR"/db-*.dump.gz.age \
    "$BACKUP_DIR"/db-*.dump.gz.age.sha256 \
    "$NAS_USER@$NAS_HOST:$NAS_PATH/"

# Verify sync
echo "Verifying sync..."
LOCAL_COUNT=$(ls -1 "$BACKUP_DIR"/db-*.dump.gz.age 2>/dev/null | wc -l)
REMOTE_COUNT=$(ssh -i "$NAS_SSH_KEY" -o StrictHostKeyChecking=no "$NAS_USER@$NAS_HOST" "ls -1 $NAS_PATH/db-*.dump.gz.age 2>/dev/null | wc -l")

echo "Local backups: $LOCAL_COUNT"
echo "Remote backups: $REMOTE_COUNT"

if [[ $LOCAL_COUNT -eq $REMOTE_COUNT ]]; then
    echo "Sync verification: OK"
else
    echo "WARNING: Count mismatch!" >&2
fi

echo "=== NAS backup completed at $(date -u) ==="
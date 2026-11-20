#!/bin/bash
# laprizza SYS05 - SSH Time Guard
# Kills SSH sessions outside the allowed time window (08:00-22:00 Europe/Lisbon)
# Run via systemd timer every 10 minutes

set -euo pipefail

# Configuration
ALLOWED_START=8   # 08:00
ALLOWED_END=22    # 22:00
TIMEZONE="Europe/Lisbon"

# Get current hour in the configured timezone
CURRENT_HOUR=$(TZ="$TIMEZONE" date +%H)
CURRENT_HOUR=$((10#$CURRENT_HOUR))  # Force base-10 interpretation

# Check if we're outside allowed window
if [[ $CURRENT_HOUR -lt $ALLOWED_START ]] || [[ $CURRENT_HOUR -ge $ALLOWED_END ]]; then
    # Outside allowed window - kill SSH sessions for laprizza admin users
    # Find SSH sessions for our admin users
    pkill -f "sshd: laprizza-admin-" 2>/dev/null || true
    
    # Log the action
    TIMESTAMP_UTC=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    TIMESTAMP_LOCAL=$(TZ="$TIMEZONE" date +"%Y-%m-%d %H:%M:%S %Z")
    HOSTNAME=$(hostname)
    LOG_FILE="/var/log/laprizza/ssh-time-guard.log"
    mkdir -p "$(dirname "$LOG_FILE")"
    echo "TS=$TIMESTAMP_UTC LOCAL=$TIMESTAMP_LOCAL HOST=$HOSTNAME ACTION=KILL_SESSIONS REASON=outside_time_window CURRENT_HOUR=$CURRENT_HOUR" >> "$LOG_FILE"
fi
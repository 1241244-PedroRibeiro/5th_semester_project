#!/bin/bash
# ==============================================================================
# LaPrizza Host Firewall Provisioning (SYS02 / SYS05)
# Discipline: ASIST — Sprint 2
# Purpose: Enforce perimeter source-IP allowlisting for DEI / VPN access,
#          configure administrative SSH access, and enable logging of drops.
# ==============================================================================
set -euo pipefail

# 1. Privileges check
if [ "$(id -u)" -ne 0 ]; then
    echo "ERROR: scripts/firewall.sh must be executed as root (or via sudo)." >&2
    exit 1
fi

# 2. Load environment variables (.env) if present
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [ -f "${ROOT_DIR}/.env" ]; then
    # shellcheck disable=SC1091
    set -a
    source "${ROOT_DIR}/.env"
    set +a
elif [ -f "/opt/laprizza/.env" ]; then
    # shellcheck disable=SC1091
    set -a
    source "/opt/laprizza/.env"
    set +a
fi

# 3. Parameters with fallback defaults (AC1.1, AC1.4)
ALLOWED_SOURCE_CIDRS="${ALLOWED_SOURCE_CIDRS:-10.8.0.0/16}"
ADMIN_SSH_PORT="${ADMIN_SSH_PORT:-2222}"
ALLOW_PUBLIC_HTTPS="${ALLOW_PUBLIC_HTTPS:-false}"

echo "======================================================================"
echo "LaPrizza Host Firewall Setup (ufw)"
echo "Timestamp:            $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "Allowed CIDRs:        ${ALLOWED_SOURCE_CIDRS}"
echo "Admin SSH Port:       ${ADMIN_SSH_PORT}"
echo "Allow Public HTTPS:   ${ALLOW_PUBLIC_HTTPS}"
echo "======================================================================"

# 4. Check ufw availability
if ! command -v ufw >/dev/null 2>&1; then
    echo "ERROR: 'ufw' command not found. Please install ufw (apt-get install -y ufw)." >&2
    exit 1
fi

# 5. Reset to clean baseline
echo "Resetting UFW rules..."
ufw --force reset

# 6. Default policies (AC1.1, AC3.1)
echo "Setting default policies: default deny incoming, default allow outgoing..."
ufw default deny incoming
ufw default allow outgoing

# Enable logging of dropped connections (AC3.1 - Resolves Gap G2)
echo "Enabling UFW logging..."
ufw logging on

# 7. Apply rules for each allowlisted CIDR block
IFS=',' read -ra CIDR_ARRAY <<< "${ALLOWED_SOURCE_CIDRS}"
for raw_cidr in "${CIDR_ARRAY[@]}"; do
    cidr="$(echo "${raw_cidr}" | xargs)" # trim whitespace
    if [ -n "${cidr}" ]; then
        echo "Applying rules for CIDR: ${cidr}"
        
        # HTTPS (Perimeter termination at Nginx)
        ufw allow from "${cidr}" to any port 443 proto tcp comment "HTTPS (${cidr})"
        
        # HTTP redirect to HTTPS
        ufw allow from "${cidr}" to any port 80 proto tcp comment "HTTP-redirect (${cidr})"
        
        # Administrative SSH (SYS05)
        ufw allow from "${cidr}" to any port "${ADMIN_SSH_PORT}" proto tcp comment "SSH (${cidr})"
    fi
done

# 8. Conditional Public HTTPS
if [ "${ALLOW_PUBLIC_HTTPS}" = "true" ]; then
    echo "WARNING: ALLOW_PUBLIC_HTTPS is true — opening port 443/tcp to all sources!"
    ufw allow 443/tcp comment "Public HTTPS (unrestricted)"
fi

# 9. Enable firewall
echo "Enabling UFW..."
ufw --force enable

echo "======================================================================"
echo "UFW Firewall Status & Rules"
echo "======================================================================"
ufw status verbose
echo "Firewall setup completed successfully."

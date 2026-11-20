#!/bin/bash
# ==============================================================================
# LaPrizza Daily Denied Connection Report (SYS02 - AC3.3)
# Discipline: ASIST — Sprint 2
# Purpose: Analyzes /var/log/ufw.log, aggregates dropped/blocked packets,
#          and outputs a summary report to logs/ufw-report/YYYYMMDD.txt.
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

REPORT_DATE="${1:-$(date +%Y%m%d)}"
REPORT_DIR="${ROOT_DIR}/logs/ufw-report"
REPORT_FILE="${REPORT_DIR}/${REPORT_DATE}.txt"
REPORT_EMAIL="${REPORT_EMAIL:-}"

mkdir -p "${REPORT_DIR}"

# Locate log source: arg $2, or /var/log/ufw.log, or /var/log/syslog, or fallback sample
LOG_SOURCE=""
if [ $# -ge 2 ] && [ -f "$2" ]; then
    LOG_SOURCE="$2"
elif [ -f "/var/log/ufw.log" ]; then
    LOG_SOURCE="/var/log/ufw.log"
elif [ -f "/var/log/syslog" ]; then
    LOG_SOURCE="/var/log/syslog"
elif [ -f "${ROOT_DIR}/logs/ufw-sample.log" ]; then
    LOG_SOURCE="${ROOT_DIR}/logs/ufw-sample.log"
fi

{
    echo "======================================================================"
    echo "LaPrizza Security Report — Daily Denied Connections (UFW)"
    echo "Report Date:    ${REPORT_DATE}"
    echo "Generated At:   $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    echo "Log Source:     ${LOG_SOURCE:-None available}"
    echo "======================================================================"
    echo ""

    if [ -z "${LOG_SOURCE}" ] || [ ! -r "${LOG_SOURCE}" ]; then
        echo "WARNING: No accessible UFW log file found (/var/log/ufw.log)."
        echo "Total blocked attempts recorded: 0"
        echo ""
    else
        # Extract lines matching [UFW BLOCK]
        BLOCK_LINES=$(grep "\[UFW BLOCK\]" "${LOG_SOURCE}" || true)

        if [ -z "${BLOCK_LINES}" ]; then
            echo "Status: CLEAN. No denied connection attempts recorded for this period."
            echo "Total blocked attempts: 0"
        else
            TOTAL_BLOCKS=$(echo "${BLOCK_LINES}" | wc -l)
            echo "Total denied connection attempts: ${TOTAL_BLOCKS}"
            echo ""

            echo "--- Top Blocked Source IPs ---"
            echo "${BLOCK_LINES}" | grep -o 'SRC=[^ ]*' | cut -d= -f2 | sort | uniq -c | sort -rn | head -n 10
            echo ""

            echo "--- Top Targeted Destination Ports ---"
            echo "${BLOCK_LINES}" | grep -o 'DPT=[^ ]*' | cut -d= -f2 | sort | uniq -c | sort -rn | head -n 10
            echo ""

            echo "--- Top Protocols ---"
            echo "${BLOCK_LINES}" | grep -o 'PROTO=[^ ]*' | cut -d= -f2 | sort | uniq -c | sort -rn
            echo ""

            echo "--- Sample Block Events (Last 10) ---"
            echo "${BLOCK_LINES}" | tail -n 10
        fi
    fi
    echo ""
    echo "======================================================================"
    echo "End of Report — LaPrizza ASIST Automated Firewall Monitoring"
    echo "======================================================================"
} > "${REPORT_FILE}"

echo "Report generated successfully: ${REPORT_FILE}"
cat "${REPORT_FILE}"

if [ -n "${REPORT_EMAIL}" ]; then
    command -v msmtp >/dev/null 2>&1 || {
        echo "ERROR: REPORT_EMAIL is set but msmtp is not installed." >&2
        exit 1
    }

    {
        printf 'To: %s\n' "${REPORT_EMAIL}"
        printf 'Subject: LaPrizza UFW report %s\n' "${REPORT_DATE}"
        printf 'Content-Type: text/plain; charset=UTF-8\n'
        printf '\n'
        cat "${REPORT_FILE}"
    } | msmtp -t
    echo "Report emailed to ${REPORT_EMAIL}"
fi

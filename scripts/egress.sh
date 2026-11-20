#!/bin/bash
# laprizza SYS03 - Egress Allowlist Enforcement
# Translates config/allowed-endpoints.yml to atomic iptables-restore rules.
# Validates YAML with yq, resolves DNS, applies without restart.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

YAML_FILE="${ROOT_DIR}/config/allowed-endpoints.yml"
EGRESS_LOG="/var/log/laprizza/egress.log"
CHANGES_LOG="/var/log/laprizza/egress-changes.log"
IPTABLES_RESTORE="$(mktemp /tmp/laprizza-egress.XXXXXX.rules)"
CURRENT_RULES="$(mktemp /tmp/laprizza-egress.XXXXXX.current)"
RULES_ONLY=""
CONFIG_JSON=""
trap 'rm -f "${IPTABLES_RESTORE}" "${CURRENT_RULES}"; [ -z "${RULES_ONLY}" ] || rm -f "${RULES_ONLY}"; [ -z "${CONFIG_JSON}" ] || rm -f "${CONFIG_JSON}"' EXIT

DRY_RUN="${DRY_RUN:-false}"
ACTOR="${ACTOR:-$(whoami)}"
SRC_COMMIT="${SRC_COMMIT:-uncommitted}"

mkdir -p "$(dirname "${EGRESS_LOG}")" "$(dirname "${CHANGES_LOG}")"

log() {
    local level="$1"; shift
    echo "[$(date -u +'%Y-%m-%dT%H:%M:%SZ')] [${level}] $*" | tee -a "${EGRESS_LOG}"
}

error_exit() {
    log "ERROR" "$*"
    echo "TS=$(date -u +'%Y-%m-%dT%H:%M:%SZ') ACTOR=${ACTOR} ACTION=apply RESULT=invalid REASON=\"$*\" RULES=0 SHA256= SRC=${SRC_COMMIT}" >> "${CHANGES_LOG}"
    exit 1
}

[ "$(id -u)" -ne 0 ] && error_exit "Must run as root (iptables-restore)"

for cmd in node yq jq dig timeout iptables-restore iptables-save sha256sum; do
    command -v "${cmd}" >/dev/null 2>&1 || error_exit "Required command not found: ${cmd}"
done

[ -f "${YAML_FILE}" ] || error_exit "YAML not found: ${YAML_FILE}"

YAML_SHA256=$(sha256sum "${YAML_FILE}" | cut -d' ' -f1)
log "INFO" "Starting egress apply (actor=${ACTOR}, sha256=${YAML_SHA256}, dry_run=${DRY_RUN})"

# Validate before resolving or changing iptables. Existing rules remain untouched
# when validation or DNS resolution fails.
CONFIG_JSON="$(mktemp /tmp/laprizza-egress.XXXXXX.json)"
yq -o=json '.' "${YAML_FILE}" > "${CONFIG_JSON}" || error_exit "YAML parsing failed"
node "${SCRIPT_DIR}/validate-allowed-endpoints.mjs" "${CONFIG_JSON}" "${ROOT_DIR}/config/allowed-endpoints.schema.json" || error_exit "Schema validation failed"
log "INFO" "YAML validation passed"

# Extract and resolve destinations (skip internal_only: true).
RULES=()
FAILED=()
DNS_RULES=()

while read -r nameserver; do
    DNS_RULES+=("-A OUTPUT -d ${nameserver} -p udp --dport 53 -j ACCEPT")
    DNS_RULES+=("-A OUTPUT -d ${nameserver} -p tcp --dport 53 -j ACCEPT")
done < <(awk '$1 == "nameserver" && $2 ~ /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/ { print $2 }' /etc/resolv.conf | sort -u)

[ ${#DNS_RULES[@]} -gt 0 ] || error_exit "No IPv4 nameserver configured in /etc/resolv.conf"

while IFS=$'\t' read -r name protocol port destination; do
    if [[ "${destination}" == */* ]]; then
        resolved="${destination}"
    else
        resolved=$(timeout 5s dig +short +time=2 +tries=1 "${destination}" A 2>/dev/null | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' || true)
        [ -z "${resolved}" ] && FAILED+=("${destination}")
    fi
    for ip in ${resolved}; do
        if [ "${protocol}" = "icmp" ]; then
            RULES+=("-A OUTPUT -d ${ip} -p icmp -j ACCEPT")
        else
            RULES+=("-A OUTPUT -d ${ip} -p ${protocol} --dport ${port} -j ACCEPT")
        fi
    done
done < <(jq -r '
    .endpoints[]
    | select((.internal_only // false) | not)
    | . as $endpoint
    | ($endpoint.destinations[] as $destination
       | (($endpoint.port // $endpoint.ports[]) as $port
          | [$endpoint.name, $endpoint.protocol, ($port | tostring), $destination]
          | @tsv))
' "${CONFIG_JSON}")

[ ${#FAILED[@]} -gt 0 ] && error_exit "DNS resolution failed: ${FAILED[*]}"

mapfile -t RULES < <(printf '%s\n' "${RULES[@]}" | sed '/^$/d' | sort -u)
[ ${#RULES[@]} -gt 0 ] || error_exit "No external allow rules resolved"
log "INFO" "Resolved ${#RULES[@]} unique allow rules"

# Generate a filter-table restore file from the current rules, replacing only
# filter/OUTPUT. Other tables (nat, raw, mangle) are never restored by SYS03.
iptables-save -t filter > "${CURRENT_RULES}" || error_exit "Unable to read current filter rules"
RULES_ONLY="$(mktemp /tmp/laprizza-egress.XXXXXX.output)"
{
    echo "-A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT"
    echo "-A OUTPUT -p tcp --sport 2222 -d 10.8.0.0/16 -j ACCEPT"
    echo "-A OUTPUT -o lo -j ACCEPT"
    echo "-A OUTPUT -d 172.16.0.0/12 -j ACCEPT"
    echo "-A OUTPUT -d 10.10.0.0/16 -j ACCEPT"
    for rule in "${DNS_RULES[@]}"; do
        echo "${rule}"
    done
    for rule in "${RULES[@]}"; do
        echo "${rule}"
    done
    echo "-A OUTPUT -j LOG --log-prefix \"EGRESS-DENY: \" --log-level 4"
} > "${RULES_ONLY}"

awk -v rules="${RULES_ONLY}" '
    /^\*filter$/ { table="filter"; print; next }
    /^\*/ && $0 != "*filter" { table=""; print; next }
    table == "filter" && /^:OUTPUT / {
        print ":OUTPUT DROP [0:0]"
        next
    }
    table == "filter" && /^-A OUTPUT / { next }
    table == "filter" && /^COMMIT$/ {
        while ((getline line < rules) > 0) print line
        close(rules)
        table=""
    }
    { print }
' "${CURRENT_RULES}" > "${IPTABLES_RESTORE}"

RULE_COUNT=$((${#DNS_RULES[@]} + ${#RULES[@]}))

if [ "${DRY_RUN}" = "true" ]; then
    log "INFO" "DRY RUN - rules that would be applied:"
    awk '
        /^\*filter$/ { filter=1 }
        filter { print }
        filter && /^COMMIT$/ { exit }
    ' "${IPTABLES_RESTORE}" | tee -a "${EGRESS_LOG}"
else
    log "INFO" "Applying ${RULE_COUNT} rules atomically..."
    iptables-restore < "${IPTABLES_RESTORE}" 2>&1 | tee -a "${EGRESS_LOG}" || error_exit "iptables-restore failed"
    log "INFO" "Rules applied successfully"
fi

echo "TS=$(date -u +'%Y-%m-%dT%H:%M:%SZ') ACTOR=${ACTOR} ACTION=apply RESULT=success RULES=${RULE_COUNT} SHA256=${YAML_SHA256} SRC=${SRC_COMMIT}" >> "${CHANGES_LOG}"
chmod 640 "${CHANGES_LOG}" 2>/dev/null || true

log "INFO" "Egress apply complete (success)"
echo "EGRESS: SUCCESS — ${RULE_COUNT} rules applied"
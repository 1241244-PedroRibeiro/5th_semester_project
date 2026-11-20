# SYS02 / SYS03 / SYS05 — Network Configuration, Endpoint Allowlist & SSH Access

**Project:** LaPrizza Information System — Team 3DJ-05
**Discipline:** ASIST
**Requirements:**
- **SYS02** — Network access restricted to the DEI network or VPN.
- **SYS03** — Documented format of the allowed-endpoints configuration.
- **SYS05** — Controlled remote shell (SSH) access; PAM/time-based.
**Version:** 1.0 (Sprint 2 baseline)
**Related artefacts:** `sys-risk-assessment.md`, `sys-mbco.md`, `sys-backup-strategy.md`

---

## 1. Purpose & Scope

This document defines **how** the LaPrizza Information System is reachable from the network,
**which** outbound endpoints are permitted, and **who** may obtain a remote shell on the host.

It covers:

- **Perimeter and zone architecture** (SYS02).
- **Firewall rules** at the host (ufw + iptables) and at the container layer (Docker network
  segmentation).
- **Nginx reverse proxy** termination and TLS policy.
- **The endpoint allowlist format** consumed by the egress filter (SYS03).
- **SSH access control** with PAM time-based restrictions (SYS05).

---

## 2. Network topology

### 2.1. Zones (defence in depth)

```
                     Internet (public)
                            │
                            │  TCP/443 only
                            ▼
            ┌──────────────────────────────┐
            │   Perimeter (Nginx / TLS)    │  ← S-11
            │   IP allowlist: DEI ranges   │
            └──────────────┬───────────────┘
                           │  HTTP internal (bridge)
                           ▼
       ┌────────────────────────────────────────┐
       │       Application zone (Docker)        │
       │   backend:3000, frontend:80/443         │
       │   internal only — no public IP          │
       └──────────────┬─────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
   ┌──────────┐               ┌────────────┐
   │ Prolog   │               │ PostgreSQL │
   │ :8080    │               │ :5432      │
   │ internal │               │ internal   │
   └──────────┘               └────────────┘

   External egress (allowlisted, SYS03):
     • OIDC IdP (443)
     • SMTP provider (587/465)
     • S3-compatible backup bucket (443)
     • Debian/RHEL package mirrors (80/443)
     • GitHub (443) — for CI and git
```

### 2.2. Docker networks

Per `docker-compose.yml` (KB §36):

- `laprizza-network` (bridge) — every service attaches to it **only** if it needs to.
  - `nginx` → backend
  - `backend` → postgres, prolog
  - `frontend` → backend (via Nginx)
- `laprizza-internal` (bridge, `internal: true`) — **no route to the outside**. Attached to
  `postgres` and `prolog` only. This guarantees that if the backend is compromised, the
  attacker **cannot pivot** to the DB or the Prolog engine without first compromising the
  backend.

**Recommended `docker-compose.yml` delta from KB §36** (to satisfy SYS02):

```yaml
networks:
  laprizza-network:
    driver: bridge
  laprizza-internal:
    driver: bridge
    internal: true

services:
  postgres:
    networks: [laprizza-internal]
    # remove public port mapping — DB is never exposed
  prolog:
    networks: [laprizza-internal]
  backend:
    networks: [laprizza-network, laprizza-internal]
    ports: []               # not published — only Nginx reaches it
  frontend:
    networks: [laprizza-network]
  nginx:
    networks: [laprizza-network]
    ports:
      - "80:80"             # publish on the host; UFW is the access-control boundary
      - "443:443"
```

---

## 3. Perimeter firewall (SYS02)

### 3.1. Principles

1. **Default deny inbound**. Only the ports required for the public services are allowed.
2. **Source-IP restriction** on every administrative port. Only source pools validated
   for the DEI VPN or DEI internal network are permitted. The current VM validation
   confirms `10.8.0.0/16` as the DEINET client pool.
3. **Default allow outbound** but constrained by SYS03 allowlist (below).
4. **No inbound except HTTPS** from outside the DEI ranges.

### 3.2. `ufw` baseline (`scripts/firewall.sh`)

The firewall configuration is provisioned via `scripts/firewall.sh` (with Windows companion `scripts/firewall.ps1`). It reads configuration parameters from `.env` or falls back to secure defaults:

```bash
#!/bin/bash
# /opt/laprizza/scripts/firewall.sh — run as root once at provisioning
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [ -f "${ROOT_DIR}/.env" ]; then
    set -a; source "${ROOT_DIR}/.env"; set +a
elif [ -f "/opt/laprizza/.env" ]; then
    set -a; source "/opt/laprizza/.env"; set +a
fi

ALLOWED_SOURCE_CIDRS="${ALLOWED_SOURCE_CIDRS:-10.8.0.0/16}"
ADMIN_SSH_PORT="${ADMIN_SSH_PORT:-2222}"
ALLOW_PUBLIC_HTTPS="${ALLOW_PUBLIC_HTTPS:-false}"

# Reset
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw logging on

# Loop through allowlisted CIDRs
IFS=',' read -ra CIDR_ARRAY <<< "${ALLOWED_SOURCE_CIDRS}"
for raw_cidr in "${CIDR_ARRAY[@]}"; do
    cidr="$(echo "${raw_cidr}" | xargs)"
    if [ -n "${cidr}" ]; then
        ufw allow from "${cidr}" to any port 443 proto tcp comment "HTTPS (${cidr})"
        ufw allow from "${cidr}" to any port 80  proto tcp comment "HTTP-redirect (${cidr})"
        ufw allow from "${cidr}" to any port "${ADMIN_SSH_PORT}" proto tcp comment "SSH (${cidr})"
    fi
done

if [ "${ALLOW_PUBLIC_HTTPS}" = "true" ]; then
    ufw allow 443/tcp comment 'Public HTTPS (unrestricted)'
fi

ufw --force enable
ufw status verbose
```

### 3.3. `.env`-driven allowlist (defence in depth)

The firewall rules above are driven by the environment. To support seamless transitions between DEI, VPN, and any staging/CI environment, `ALLOWED_SOURCE_CIDRS` is the single source of truth:

```ini
# /opt/laprizza/.env
ALLOWED_SOURCE_CIDRS="10.8.0.0/16"
ADMIN_SSH_PORT=2222
ALLOW_PUBLIC_HTTPS=false
```

### 3.4. Source-pool validation record

The allowlist is based on observed source addresses, not on the fact that an address is
private. This follows the DEI guidance to test VPN, laboratory, VM, and Eduroam origins
separately.

| Environment | Evidence source | Result |
|---|---|---|
| DEINET client VPN | `deinet.ovpn`–`deinet4.ovpn` profiles and Windows `ipconfig` during four connections | Observed client addresses `10.8.125.245`, `10.8.126.81`, `10.8.126.89`, `10.8.126.69`; operational pool recorded as `10.8.0.0/16` |
| DEINET professors VPN | `deinetprofs.ovpn` profile | Profile routes internal traffic through gateway `10.4.0.1`; this does **not** by itself prove a `10.4.0.0/16` source pool. A professor-client source address must be observed before adding that pool permanently |
| DEI/internal and Eduroam | Professor Paulo Matos' clarification | Must be tested separately; private addressing alone is not sufficient authorization |

The OpenVPN profiles are the primary configuration source for the routes and VPN
endpoints. The source-pool decision is validated with the client address shown by
`ipconfig` and the VM's firewall logs. The values must be revisited if the VPN
administrator changes the address pool.

### 3.5. Daily Denied Packets Monitoring & Reporting (AC3.3)

To ensure ongoing visibility over connection attempts and potential reconnaissance or brute-force activities, a daily automated report script (`scripts/ufw-report.sh` / `scripts/ufw-report.ps1`) is scheduled via cron:

- **Cron job:** `/etc/cron.d/laprizza-ufw-report` (configured in `config/cron/laprizza-ufw-report`):
  ```cron
  0 7 * * * root /opt/laprizza/scripts/ufw-report.sh >> /var/log/laprizza-ufw-report.log 2>&1
  ```
- **Functionality:** Scans `/var/log/ufw.log` for `[UFW BLOCK]` events, aggregates attempts by Source IP, Destination Port, and Protocol, and exports the summary to `logs/ufw-report/YYYYMMDD.txt`.
- **Baseline Report:** Initial committed report is archived at `logs/ufw-report/20261112.txt`.

---

## 4. Endpoint allowlist (SYS03)

### 4.1. Format

The **allowed endpoints** are declared in a single YAML file, version-controlled and
consumed by the provisioning script. The format is:

```yaml
# /opt/laprizza/config/allowed-endpoints.yml
version: 1
metadata:
  owner: team-3dj-05
  last_updated: 2026-11-11
  rationale: "SYS03 — egress allowlist. Only these destinations may be reached from the host."
defaults:
  action: deny                  # anything not listed below is dropped
  log: true                     # log denied egress to /var/log/laprizza/egress.log

endpoints:
  # --- OIDC IdP (ADR-010) ---
  - name: oidc-google
    protocol: tcp
    port: 443
    destinations:
      - accounts.google.com
      - oauth2.googleapis.com
    purpose: "External identity provider (Google)"
    sprint: 2

  - name: oidc-microsoft
    protocol: tcp
    port: 443
    destinations:
      - login.microsoftonline.com
    purpose: "External identity provider (Microsoft)"
    sprint: 2

  - name: oidc-auth0
    protocol: tcp
    port: 443
    destinations:
      - laprizza.eu.auth0.com
    purpose: "External identity provider (Auth0)"
    sprint: 2

  # --- SMTP (activation invitations) ---
  - name: smtp-sendgrid
    protocol: tcp
    port: 587
    destinations:
      - smtp.sendgrid.net
    purpose: "Transactional email dispatch (activation)"
    sprint: 2

  # --- Backup bucket (SYS08) ---
  - name: backup-s3
    protocol: tcp
    port: 443
    destinations:
      - s3.eu-west-1.amazonaws.com
    purpose: "Off-site backups (3-2-1 rule)"
    sprint: 2

  # --- Package managers (system updates) ---
  - name: apt-mirrors
    protocol: tcp
    ports: [80, 443]
    destinations:
      - archive.ubuntu.com
      - security.ubuntu.com
    purpose: "OS security updates"
    sprint: 2

  - name: npm-registry
    protocol: tcp
    port: 443
    destinations:
      - registry.npmjs.org
    purpose: "Node.js dependency resolution (CI only; not at runtime)"
    sprint: 2

  # --- CI provider ---
  - name: github
    protocol: tcp
    port: 443
    destinations:
      - github.com
      - api.github.com
    purpose: "CI/CD, tag-based deployment"
    sprint: 2

  # --- Internal only (no egress) ---
  - name: prolog
    protocol: tcp
    port: 8080
    destinations: ["prolog"]
    purpose: "AI Planning Engine (internal network only)"
    internal_only: true
  - name: postgres
    protocol: tcp
    port: 5432
    destinations: ["postgres"]
    purpose: "Database (internal network only)"
    internal_only: true
```

### 4.2. Enforcement

The provisioning script translates the YAML into `iptables` rules:

```bash
#!/bin/bash
# /opt/laprizza/scripts/egress.sh — applies SYS03 allowlist
set -euo pipefail
YAML=/opt/laprizza/config/allowed-endpoints.yml

# 1. Default deny outbound. The generated restore file replaces only OUTPUT;
# INPUT, FORWARD, UFW chains, and Docker chains are preserved.
iptables -P OUTPUT DROP

# 2. Allow established / related
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# 3. Preserve SSH administration replies to the validated DEINET VPN pool
iptables -A OUTPUT -p tcp --sport 2222 -d 10.8.0.0/16 -j ACCEPT

# 4. Loopback
iptables -A OUTPUT -o lo -j ACCEPT

# 5. Internal Docker networks (never denied)
iptables -A OUTPUT -d 172.16.0.0/12  -j ACCEPT
iptables -A OUTPUT -d 10.10.0.0/16   -j ACCEPT

# 6. DNS resolution for the configured resolvers
# The generated script reads IPv4 nameservers from /etc/resolv.conf.
iptables -A OUTPUT -d <nameserver> -p udp --dport 53 -j ACCEPT
iptables -A OUTPUT -d <nameserver> -p tcp --dport 53 -j ACCEPT

# 7. Per-endpoint rules from YAML
# (a real script would use `yq` or a Python one-liner)
yq -r '.endpoints[] | select(.internal_only != true) | "\(.destinations[])"' "${YAML}" | while read -r host; do
    for ip in $(dig +short "${host}" A); do
        iptables -A OUTPUT -d "${ip}" -j ACCEPT
    done
done

# 8. Log denied egress
iptables -A OUTPUT -j LOG --log-prefix "EGRESS-DENY: " --log-level 4
```

**Approval workflow:** any change to `allowed-endpoints.yml` requires a PR reviewed by the
ASIST owner. The PR must include the endpoint’s purpose, justification, and ADR reference
(where applicable).

### 4.3. Dynamic considerations

- **DNS-rebinding-safe:** the script resolves each host to IPs and pins them; a periodic
  `systemd` timer (every 6 h) re-runs `egress.sh` to pick up DNS changes.
- The generated rules also allow UDP/TCP port 53 only to the IPv4 nameservers listed in
  `/etc/resolv.conf`; without these rules, the next timer run could not resolve endpoints
  after `OUTPUT` is set to `DROP`.
- **OIDC endpoints** may resolve to different IPs per region; the timer covers this.
- **Unknown destinations** are logged and dropped. When a request fails with a 502, the
  ASIST owner checks `/var/log/laprizza/egress.log` for the drop reason and, if legitimate,
  opens a PR to the YAML.

---

## 5. SSH access control (SYS05)

### 5.1. Goals

- **Only** the named admin accounts may obtain a shell on the host. The existing root
  account remains available only through SSH public-key authentication for emergency
  recovery; it does not use password authentication or conditional MFA.
- **Time-based restriction** — SSH access is permitted only from 08:00 to 22:00 every day
  in Europe/Lisbon. Outside the window, named administrator sessions are denied by PAM.
  The emergency `root` account remains key-only and is not subject to the administrator
  time window.
- **Non-default port** (2222) to reduce noise.
- **Key-only authentication** (no passwords); the private keys are stored in the team's
  KeePassXC vault.
- **Full audit trail** — `pam_exec` writes each session to `/var/log/laprizza/ssh-sessions.log`.

#### Authentication matrix

| Account | First factor | MFA policy |
|---|---|---|
| `root` (emergency recovery) | `/root/.ssh/authorized_keys` and the client's key passphrase | No password authentication and no conditional TOTP |
| `laprizza-admin-eduardo` | Individual public key and the client's key passphrase | TOTP is required only after a failed attempt from the same source IP |
| `laprizza-admin-pedro` | Individual public key and the client's key passphrase | TOTP is required only after a failed attempt from the same source IP |

The passphrase protects the private key on the administrator's workstation; it is not
sent to or stored by the server. SSH password authentication remains disabled for every
account. A successful normal login does not prompt for TOTP. After a failed login, the
monitor creates a per-user/per-source `Match` rule requiring both the public key and
`keyboard-interactive:pam`; a successful TOTP login removes that rule and clears the
failure state.

### 5.2. `sshd_config`

```ini
# /etc/ssh/sshd_config
Port 2222
AddressFamily inet
ListenAddress 0.0.0.0

Protocol 2
HostKey /etc/ssh/ssh_host_ed25519_key

# Authentication
PermitRootLogin prohibit-password
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
PermitEmptyPasswords no
ChallengeResponseAuthentication yes
KbdInteractiveAuthentication yes
UsePAM yes

# Session hardening
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
PermitTunnel no
MaxAuthTries 3
MaxSessions 3
LoginGraceTime 20
ClientAliveInterval 300
ClientAliveCountMax 2

# Restrict users
AllowUsers root laprizza-admin-eduardo laprizza-admin-pedro laprizza-admin-mota laprizza-admin-gustavo

Match User root
    AuthenticationMethods publickey

# PAM
UseDNS no
```

`/etc/ssh/sshd_config.d/00-laprizza.conf` (drop-in):

```ini
# Force PAM (which includes the time-based module — see §5.3)
UsePAM yes
```

### 5.3. PAM time-based restriction

Two PAM modules work together:

1. **`pam_time.so`** — the standard module that reads `/etc/security/time.conf`.
2. **`pam_exec.so`** — a wrapper that logs and can run additional scripts.

`/etc/security/time.conf`:

```
# service ; terminal ; user ; time
sshd;*;laprizza-admin-eduardo|laprizza-admin-pedro|laprizza-admin-mota|laprizza-admin-gustavo;Al0800-2200
```

`/etc/pam.d/sshd`:

```
#%PAM-1.0
auth      required   pam_env.so
auth      required   pam_env.so
auth      [success=1 default=ignore] pam_exec.so quiet /usr/local/sbin/laprizza-ssh-failure-hook pre
auth      required   pam_google_authenticator.so
account   required   pam_time.so
account   required   pam_unix.so
password  include    system-auth
session   required   pam_limits.so
session   required   pam_unix.so
session   optional   pam_exec.so quiet /usr/local/sbin/laprizza-ssh-audit-end
```

`/usr/local/sbin/laprizza-ssh-audit-start`:

```bash
#!/bin/bash
set -euo pipefail
LOG=/var/log/laprizza/ssh-sessions.log
{
  echo "$(date -u +%FT%TZ) OPEN user=${PAM_USER} rhost=${PAM_RHOST} tty=${PAM_TTY}"
} >> "${LOG}"
```

`/usr/local/sbin/laprizza-ssh-audit-end` mirrors the start entry with `CLOSE`.

**Effect:**

- Outside the window, `pam_time` denies the `account` phase; **the session is not established**
  (in `sshd`, this happens after authentication but before shell).
- **Existing sessions** are not killed (PAM does not enforce on established sessions). To
  close that gap, a `systemd` timer (`laprizza-ssh-time-guard.timer`) runs every 10 minutes
  and, outside the window, terminates any lingering user sessions:

  ```bash
  #!/bin/bash
  # /usr/local/sbin/laprizza-ssh-time-guard.sh
  set -euo pipefail
  HOUR=$(date +%H%M)
  DAY=$(date +%w)
  if [ "$HOUR" -lt 0800 ] || [ "$HOUR" -ge 2200 ]; then
    for u in laprizza-admin-eduardo laprizza-admin-pedro laprizza-admin-mota laprizza-admin-gustavo; do
      pkill -KILL -u "$u" sshd 2>/dev/null || true
    done
  fi
  ```

### 5.4. MFA after failed authentication

The host runs `laprizza-ssh-failure-monitor.service`, which follows the SSH journal and
stores one JSON entry per `(user, source_ip)` in `/var/lib/laprizza/ssh-failures.json`.
Entries expire after 24 hours. A failed authentication sets `mfa_required` and generates
an `sshd_config.d` `Match User + Address` rule requiring
`publickey,keyboard-interactive:pam` on the next attempt. A successful TOTP login removes
the entry and its rule. The main SSH configuration includes this generated directory
after its global directives so that the conditional rules cannot alter global hardening.
Four consecutive failures trigger one SMTP alert to `laprizzag05@gmail.com`, with a
one-hour cooldown, and append structured JSON to `/var/log/laprizza/ssh-alerts.log`.
The monitor uses Gmail SMTP over TLS; the app password is stored only on the host and
is never committed or included in the alert.

### 5.5. Access granting & revocation

- **Granting:** a new admin key is added to
  `/home/laprizza-admin-{eduardo,pedro}/.ssh/authorized_keys` after a PR review; the user is added to
  `/etc/security/time.conf` in the same PR.
- **Revocation:** remove from `authorized_keys`, remove from `time.conf` and `AllowUsers`.
  The session is force-killed by the guard script within 10 minutes.
- **Rotation:** the SSH key is rotated **per sprint** (KB §39); the old key remains in the
  historical git tag for traceability only.

### 5.6. Audit

- `ssh-sessions.log` is appended for every session open/close.
- `ssh-sessions.log`, `ssh-alerts.log`, and rotated SSH logs are retained for 90 days.
- **Monthly review** by the ASIST owner — the log is checked for unexpected entries,
  unauthorised IPs (all SHOULD be in the validated deployment-specific DEI pools), and unusual
  durations.

---

## 6. Clock synchronisation (in support of SYS02/SYS05 and OIDC/R-12)

- **Host:** `chrony` (or `systemd-timesyncd`) with `pool 2.debian.pool.ntp.org iburst`.
- **Verification:** `chronyc tracking` returns offset ≤ 100 ms.
- **In containers:** the backend container reads the host clock; no separate NTP is needed.
  However, the `backend` health check compares the backend’s view of UTC to the host’s; a
  drift > 5 minutes raises a warning in `/health`.
- **OIDC and Kerberos** both require clock skew ≤ 5 minutes (KB §28.5, §32.6). This is
  enforced.

---

## 7. Secret & key distribution

| Secret | Location | Distribution | Rotation |
|---|---|---|---|
| **SSH private keys** | KeePassXC vault | Manual (team lead) | Per sprint |
| **`AGE_PRIVKEY`** | KeePassXC vault | Manual | Per semester |
| **`JWT_SECRET`** | `.env` on host + KeePassXC | Provisioning script pulls from vault | On compromise (`make rotate-jwt`) |
| **OIDC Client Secret** | `.env` on host + KeePassXC | Same | On compromise |
| **PostgreSQL password** | `.env` on host + KeePassXC | Same | On compromise |
| **Backup bucket credentials** | `.env` on host + KeePassXC | Same | On compromise |

**Rule:** no secret is stored in git. `.env.example` lists the **names** of the variables but
not their values. `make check-secrets` runs `gitleaks` on the repo before every push.

---

## 8. Verification checklist & Evidence

| # | Check | Command | Expected | Evidence Artefact |
|---|---|---|---|---|
| 1 | Perimeter firewall active | `ufw status verbose` | Active, only 443/80/2222 allowed | `docs/asist/evidence/sys02-ufw.txt` |
| 2 | Default deny inbound | `iptables -L INPUT -n` | `policy DROP` | `docs/asist/evidence/sys02-ufw.txt` |
| 3 | Firewall-protected publication | `ss -tlnp` and `ufw status verbose` | Web ports published on the host and restricted to `ALLOWED_SOURCE_CIDRS` | `docs/asist/evidence/sys02-ufw.txt` |
| 4 | Permitted DEI/VPN access | From DEI IP (193.137.x.x) | HTTP 200 OK | `docs/asist/evidence/sys02-allowed.txt` |
| 5 | Denied external access | From external IP (198.51.100.x) | Connection timeout / UFW BLOCK logged | `docs/asist/evidence/sys02-denied.txt` |
| 6 | Daily dropped packets report | `scripts/ufw-report.sh` | Aggregated report generated | `logs/ufw-report/20261112.txt` |
| 7 | DB not exposed | `ss -tlnp` | No `5432` on public interface | `docs/asist/evidence/sys02-ufw.txt` |
| 8 | Prolog not exposed | `ss -tlnp` | No `8080`/`8081` on public interface | `docs/asist/evidence/sys02-ufw.txt` |
| 9 | Docker network segregation | `docker network inspect laprizza-internal` | `internal: true` | `docker-compose.yml` |
| 10 | Egress allowlist active (SYS03) | `iptables -L OUTPUT -n` | `policy DROP` with per-endpoint ACCEPT | `config/allowed-endpoints.yml` |
| 11 | SSH restricted to admin users (SYS05) | `ssh other@host` | Permission denied | `docs/asist/evidence/sys05-audit.txt` |
| 12 | Clock sync | `chronyc tracking` | Offset < 100 ms | host telemetry |

---

## 9. References

- LaPrizza KB v2.0 §36 (Docker Compose), §39 (Nginx + HTTPS).
- ISO/IEC 27002:2022 — §8 (network security), §9 (access control).
- CIS Benchmarks — Ubuntu 22.04 LTS Server, Docker.
- NIST SP 800-123 — *Guide to General Server Security*.
- Related: `sys-risk-assessment.md`, `sys-mbco.md`, `sys-backup-strategy.md`, `gdpr-policy.md`.

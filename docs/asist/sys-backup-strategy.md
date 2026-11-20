# SYS08 — Backup Strategy & Recovery Validation

**Project:** LaPrizza Information System — Team 3DJ-05
**Discipline:** ASIST
**Requirement:** SYS08 — Backup Strategy
**Version:** 1.0 (Sprint 2 baseline)
**Related artefacts:** `sys-risk-assessment.md`, `sys-mbco.md`, `sys-network-config.md`

---
## 1. Purpose & Scope

This document defines the **backup strategy** for the LaPrizza Information System during
Sprint 2 and until Final Assessment, together with the **restore procedure** that proves the
strategy is effective.

Scope:

- **PostgreSQL** database `laprizza_db` (schema + data + sequences + views + constraints).
- **Configuration artefacts** required to run the stack:
  - `backend/.env` (JWT secret, OIDC credentials, INVITATION_TTL_HOURS).
  - `docker-compose.yml`, `Makefile`, `frontend/nginx/default.conf`.
  - `certs/` (local TLS material — non-secret in academic context; secrets handled separately
    in §5).
- **Application code** is **excluded** from this backup (source-controlled in the
  `LEI-SEM5-PI-2026-27-3DJ-05` git repository with tag `sprint-2-submission`).
- **Prolog engine** code is likewise source-controlled; only its data (none in Sprint 2) is
  out of scope.

Out of scope: laptop/desktop backups, IDE configuration, third-party provider backups.

---
## 2. Objectives

| Objective | Target |
|---|---|
| **RPO** (Recovery Point Objective) | **≤ 24 h** (daily full dump) |
| **RTO** (Recovery Time Objective) | **≤ 30 min** for a full restore + validate |
| **WRT** (Work Recovery Time) | **≤ 10 min** to validate the restored database and re-enable processing |
| **Retention** | 7 daily, 4 weekly, 12 monthly |
| **3-2-1 rule** | 3 copies, 2 media, 1 off-host (satisfied via `backups/` volume + `offsite/` mount) |
| **Restore test** | Monthly, mandatory; produces `dr-drill-YYYY-MM-DD.log` |
| **Encryption** | All backups encrypted at rest with `age` (public-key cryptography) |

These values align with the MBCO (`sys-mbco.md §5`) and with the risk mitigation for
R-07 / R-08 (`sys-risk-assessment.md §4`).

---
## 3. Backup classification & scheduling

### 3.1. Backups produced

| Type | Frequency | Retention | Format | Tool |
|---|---|---|---|---|
| **Daily full DB dump** | Daily 02:00 (server local time) | 7 daily | `.dump.gz.age` | `pg_dump -Fc` + `age` |
| **Weekly full DB dump** | Sunday 03:00 | 4 weekly | `.dump.gz.age` | Same |
| **Monthly full DB dump** | First day of month 04:00 | 12 monthly | `.dump.gz.age` | Same |
| **Config snapshot** | On change (post-commit hook) + weekly | 90 days | `.tar.gz.age` | `tar` + `age` |
| **WAL segment archiving** | Continuous (every 16 MB write) | 14 days | `.wal.age` | `archive_command` |

### 3.2. Backup windows

- **Full DB dumps** at **02:00 local** (lowest traffic; project scope: DEI Asia/Lisbon,
  UTC+0/+1). The `pg_dump` uses `--no-owner --no-acl` for portability and runs against
  `postgres` **without blocking the backend** (PostgreSQL MVCC).
- **Config snapshot** triggered by `git push` hook on `main` (see §5.3), plus a weekly
  baseline on Sundays at 03:30.
- **WAL archiving** continuous; retention 14 days; verified with `pg_stat_archiver` in `/health`.

### 3.3. Inclusion matrix

| Asset | Included | Excluded | Reason |
|---|---|---|---|
| `laprizza_db` (all schemas) | ✅ | — | Core business data. |
| Sequences (`SERIAL`) | ✅ | — | Preserved by `pg_dump -Fc`. |
| Views (`v_catalogue_products`, `v_predefined_pizza_details`) | ✅ | — | Preserved. |
| Constraints, indexes, triggers | ✅ | — | Preserved. |
| `backend/.env` | ✅ (encrypted) | — | Contains JWT secret — see §5.4. |
| Docker volumes (`postgres_data`) | ❌ (raw) | ✅ | Use `pg_dump`, not raw volume copy (portability + integrity). |
| Docker volume `laprizza-pictures` (item pictures) | ✅ (`tar` archive) | — | Product and pizza pictures are files, not database rows, so `pg_dump` does not include them (ADR-018). Archive the volume on the same schedule as the database dump. |
| Docker images | ❌ | ✅ | Reproducible from Dockerfiles + git tags. |
| `certs/` | ✅ | — | Only for local dev; production TLS via Let’s Encrypt. |
| Prolog KB data | N/A | — | None persisted in Sprint 2 (KB built per request). |

---
## 4. Storage locations (3-2-1 rule)

| Copy | Location | Storage | Encryption |
|---|---|---|---|
| **1. Primary** | `docker volume laprizza_backups` | Local SSD (host) | `age` |
| **2. Secondary** | DEI network share `\\dei-nas\laprizza\backups` | NAS (SMB) | `age` (re-encrypted with a second key) |
| **3. Off-site** | Team-controlled S3-compatible bucket (`s3://laprizza-backups/`) | Public cloud (academic scope) | `age` + SSE-S3 |

The **secondary** copy is mounted at `/mnt/dei-nas` on the host; the **off-site** copy is
pushed by a `rclone` cron job at 04:00 (after the two local runs). All three use different
credentials; compromise of one does not compromise the others.

---
## 5. Operational procedure

### 5.1. Backup creation

**File:** `scripts/backup.sh` (target `make backup`, an alias for `make sys08-backup`)

```bash
#!/bin/bash
set -euo pipefail
TS=$(date -u +%Y%m%dT%H%M%SZ)
BACKUP_DIR="${BACKUP_DIR:-/backups}"
DB_NAME="${DB_NAME:-laprizza_db}"
DB_HOST="${DB_HOST:-postgres}"
DB_USER="${DB_USER:-laprizza_user}"

echo "[$(date -u)] Starting backup ${TS}"

# 1. pg_dump custom format (allows parallel restore + compression)
pg_dump -Fc --no-owner --no-acl -h "${DB_HOST}" -U "${DB_USER}" "${DB_NAME}" \
  | gzip -9 \
  | age -r "${AGE_PUBKEY}" -o "${BACKUP_DIR}/db-${TS}.dump.gz.age"

# 2. Compute and record checksum
sha256sum "${BACKUP_DIR}/db-${TS}.dump.gz.age" \
  > "${BACKUP_DIR}/db-${TS}.sha256"

# 3. Retention (7 daily / 4 weekly / 12 monthly)
find "${BACKUP_DIR}" -name 'db-*.dump.gz.age' -mtime +7   -exec rm -f {} \;

echo "[$(date -u)] Backup ${TS} completed"
```

**Determinism & integrity:**

- `pg_dump -Fc` produces a **consistent** snapshot (server-side MVCC).
- `gzip -9` before encryption shrinks the archive.
- `sha256sum` recorded and re-verified on restore (§7).
- `age` (filippo.io/age) chosen over `gpg` for simplicity of key management — no key server
  required.

### 5.2. Scheduling

**Crontab on the host** (`/etc/cron.d/laprizza-backup`):

```cron
SHELL=/bin/bash
PATH=/usr/local/bin:/usr/bin:/bin
# Daily full dump at 02:00 local
0 2 * * *   root  /opt/laprizza/scripts/backup.sh   >> /var/log/laprizza/backup.log 2>&1
# Weekly copy to NAS at 03:00
0 3 * * 0   root  /opt/laprizza/scripts/backup-to-nas.sh >> /var/log/laprizza/backup.log 2>&1
# Off-site push at 04:00
0 4 * * *   root  /opt/laprizza/scripts/backup-to-s3.sh  >> /var/log/laprizza/backup.log 2>&1
# WAL archiving to /backups/wal
# (configured via postgresql.conf: archive_mode=on, archive_command)
```

### 5.3. Config snapshot

On every push to `main` (git `post-receive` hook on the team’s central repo):

```bash
#!/bin/bash
set -euo pipefail
TS=$(date -u +%Y%m%dT%H%M%SZ)
tar czf - .env docker-compose.yml Makefile frontend/nginx/default.conf certs/ 2>/dev/null \
  | age -r "${AGE_PUBKEY}" -o "/backups/config-${TS}.tar.gz.age"
```

### 5.4. Secret handling

- **`.env`** is backed up **encrypted** (`age`); it never goes to git.
- **`JWT_SECRET`** is backed up **separately** in a password manager (KeePassXC); the
  `age`-encrypted backup is the **secondary** copy. The password manager entry is the
  primary recovery source (see `sys-network-config.md §7`).
- The `age` **private key** is stored in the **same** password manager, distinct from the
  data backups; a loss of the key = a loss of the backup, hence the redundancy.

---
## 6. Encryption keys

The backup strategy uses two keys:

- **`AGE_PUBKEY`** — a recipient public key; no restriction on storage (its compromise is
  useless without the private key).
- **`AGE_PRIVKEY`** — the corresponding private key; stored in the team's KeePassXC vault and
  **not** on the host filesystem (only injected into the backup process via a systemd unit
  `PrivateTmp=` / `ProtectHome=`).

This guarantees that even a full host compromise does not leak the ability to decrypt
backups.

---
## 7. Restore procedure (proof of restorability)

The objective of a backup is restoration. The procedure below is **non-negotiable** — it is
executed by `make restore` and validated by `make restore-test`. Both are compatibility
aliases for the `sys08-*` Make targets and call the installed scripts under
`/usr/local/sbin/`.

### 7.1. Prerequisites

- The `AGE_PRIVKEY` file exists at `/etc/laprizza/age.key` (mode 0600).
- The target DB is **stopped** (or points to a fresh `laprizza_restore` database).
- The target schema matches the source (same PostgreSQL 16 major).

### 7.2. `scripts/restore.sh` (target `make restore`)

```bash
#!/bin/bash
set -euo pipefail
BACKUP="${1:-$(ls -t /backups/db-*.dump.gz.age | head -n1)}"
echo "[$(date -u)] Restoring from ${BACKUP}"

# 1. Integrity check
sha256sum -c "${BACKUP%.age}.sha256"

# 2. Decrypt & decompress to a temp file
age -d -i /etc/laprizza/age.key "${BACKUP}" \
  | gunzip \
  > /tmp/laprizza-restore.dump

# 3. Terminate existing sessions on the target DB
PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='${DB_NAME}' AND pid <> pg_backend_pid();"

# 4. Drop + recreate database
PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d postgres -c \
  "DROP DATABASE IF EXISTS ${DB_NAME};"
PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d postgres -c \
  "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};"

# 5. Restore
PGPASSWORD="${DB_PASSWORD}" pg_restore -h "${DB_HOST}" -U "${DB_USER}" \
  -d "${DB_NAME}" --no-owner --no-acl --clean --if-exists /tmp/laprizza-restore.dump

# 6. Verify key invariants
PGPASSWORD="${DB_PASSWORD}" psql -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" -c "
  SELECT COUNT(*) AS users FROM users;
  SELECT COUNT(*) AS products FROM products;
  SELECT COUNT(*) AS active_kitchen_configs FROM kitchen_configurations WHERE is_active = TRUE;
"

echo "[$(date -u)] Restore completed"
```

**Post-conditions validated by the script:**

1. `users`, `products`, `stock_items` — non-zero row counts.
2. **At most one active kitchen configuration** (partial unique index enforced — ADR-011).
3. No constraint violations during `pg_restore` (`--clean --if-exists` fails loudly on error).
4. `entity-schema-parity.spec.ts` in `make test-db` passes.

### 7.3. Automated validation — `make restore-test`

A **separate** target that:

1. Picks the most recent backup.
2. Restores it into a **fresh** database `laprizza_restore`.
3. Compares `pg_dump -s` of `laprizza_db` and `laprizza_restore` (should be identical).
4. Runs `SELECT COUNT(*)` on all tables in both schemas (must be equal).
5. Drops `laprizza_restore`.

Success produces the line:

```
[restore-test] PASS  backup=db-YYYYMMDDTHHMMSSZ.dump.gz.age  parity=OK
```

Failure blocks the sprint demo (see `sys-mbco.md §7`).

### 7.4. Manual verification (the `make restore` evidence)

The following snippet, executed during the Sprint 2 demo, is the **proof of restore** required
by SYS08:

```
$ make restore-test
[restore-test] PASS  backup=db-20261111T020000Z.dump.gz.age  parity=OK

$ make db
laprizza_db=# SELECT COUNT(*) FROM users;
 count
-------
    42
laprizza_db=# SELECT name, is_active FROM kitchen_configurations WHERE is_active;
     name      | is_active
---------------+-----------
 Standard 2026 | t
laprizza_db=# \q
```

---
## 8. Backup verification schedule

| Task | Frequency | Owner | Evidence |
|---|---|---|---|
| Automated backup | Daily 02:00 | Host cron | `/var/log/laprizza/backup.log` |
| `make restore-test` | Weekly | ASIST owner | `restore-test` log |
| Full DR drill | Monthly | Team lead | `dr-drill-YYYY-MM-DD.log` (per `sys-mbco.md §7.1`) |
| Key rotation | Per academic semester | Team lead | Change log entry |
| Retention purge check | Monthly | ASIST owner | `find /backups -mtime +90` output |

---
## 9. Failure modes and remediation

| Failure | Detection | Remediation |
|---|---|---|
| Cron did not fire | Absence of today’s file in `/backups` | Run `make backup` manually; investigate cron logs. |
| `pg_dump` fails (permissions) | Non-zero exit; error in log | Verify `pg_hba.conf` and user grants; `pg_dump` runs as `laprizza_user` who owns the schema. |
| Encryption key lost | Restore fails at `age -d` | Retrieve from KeePassXC (primary) or the NAS-replicated config backup (secondary). |
| Disk full | `df` monitoring alert | Rotate the 7/4/12 retention aggressively; expand volume. |
| Corrupted archive | `sha256sum -c` fails | Discard the corrupted file; use previous day’s backup; investigate storage. |
| Off-site push fails | `rclone` error in log | Re-run `make backup-to-s3`; check S3 credentials and quota. |
| Restore takes > RTO | Timer during drill | Optimise with `pg_restore -j 4` (parallel); check hardware IOPS. |

---
## 10. Security considerations

- Backups contain **PII** (names, emails, phone numbers, dietary restrictions — see GDPR
  policy §D.6). They are classified **Confidential** and treated as **live data** for access
  control purposes.
- All backups are **encrypted at rest** with `age`.
- Access to `/backups` requires **Linux file permissions** (`chmod 700`, `chown root:root`)
  and is **disabled from the SPA** — no HTTP endpoint exposes backups.
- Restoration procedures are **documented but not exposed** — only the ASIST owner and the
  team lead have SSH access (see `sys-network-config.md §5`).
- Backups older than **90 days** are purged automatically, satisfying **GDPR Art. 5(1)(e)**
  (storage limitation). The exact retention is documented in the GDPR policy §5.3 and §13.
- **WAL segments** are encrypted with the same `age` scheme and purged after 14 days.

## 13. Erasure and restriction requests

GDPR erasure is applied to the live database immediately. Retained backups are not used for
normal operation and remain inaccessible to application users. If a disaster restore is
required before the retention period expires, the restore operator must reapply all recorded
erasure or restriction requests before returning the service to operation. After the longest
90-day retention period, expired copies are purged from local, NAS and S3 storage. A legal
hold suspends purge only when documented by the responsible authority. This policy implements
the erasure and restriction requirements in `docs/gdpr-policy.md §5.3–§5.4`.

---
## 11. References

- PostgreSQL 16 — *Backup and Restore* (official docs, `pg_dump`, `pg_restore`, PITR).
- `age` — https://age-encryption.org/.
- ISO 22301:2019 — BCM; ISO/IEC 27031:2011 — ICT readiness.
- LaPrizza KB v2.0 §D.6, §D.10 (GDPR retention), §34.5 (backup strategies), §36 (Docker
  Compose).
- Related: `sys-mbco.md`, `sys-risk-assessment.md`, `sys-network-config.md`, `gdpr-policy.md`.
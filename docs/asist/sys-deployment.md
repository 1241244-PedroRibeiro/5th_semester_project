# SYS01 — Automated Deployment

**Project:** LaPrizza Information System — Team 3DJ-05
**Discipline:** ASIST
**Requirement:** SYS01 — Automated deployment of the application
**Version:** 1.0 (Sprint 2 baseline)
**Related artefacts:** `sys-mbco.md` (SYS07), `sys-backup-strategy.md` (SYS08), `sys-network-config.md` (SYS02/SYS03/SYS05), `sys-risk-assessment.md` (SYS06), KB §36, §37, §38, §39, ADR-008a

---

## 1. Purpose and scope

This document formalises the **automated deployment procedure** required by SYS01. It
describes how the LaPrizza stack is built, migrated, seeded, started, verified, and
rolled back **without manual intervention on the target host**, on any host that
satisfies the prerequisites in §3.

Scope:

1. The Docker Compose stack defined in KB §36: `postgres`, `backend`, `prolog`,
   `frontend` (Angular 22 + Nginx 1.27).
2. The migration workflow defined in ADR-008a (`migration:run:prod`, optional
   `migration:baseline:prod`, optional `seed:prod`).
3. The environment contract that distinguishes development, staging, and
   production configurations.
4. The smoke tests that prove a deployment is operational, aligned with the
   `/health` contract (OpenAPI `getHealth`).
5. The rollback procedure.

Out of scope: host provisioning (OS installation, kernel tuning, opening firewall
ports — handled in `sys-network-config.md`), certificate issuance (handled by
Certbot in KB §39.4), and backup scheduling (`sys-backup-strategy.md`).

---

## 2. Architectural alignment

The deployment realises the **Container Diagram (C4 Level 2)** (KB §12) on a single
Linux host using Docker Compose. The mapping is:

| C4 Container | Deployment artefact | KB reference |
|---|---|---|
| Angular SPA + Three.js canvas | `frontend` service (Nginx serving `dist/laprizza-frontend/browser/`) | §36.2, §39 |
| Backend Modular Monolith | `backend` service (Node.js 20 Alpine, NestJS 10) | §36.1 |
| Prolog AI Planning Engine | `prolog` service (SWI-Prolog with HTTP pack, ADR-012) | §36.3 |
| PostgreSQL 16 | `postgres` service (`postgres:16-alpine`) | §36 |
| Nginx reverse proxy + TLS | inside `frontend` container | §39.3 |

The Compose file is the **single source of truth** for the container runtime
contract. Changes to it follow the same review discipline as code (ADR-008a §5).

---

## 3. Prerequisites and host requirements

The deployment target must satisfy:

| Item | Minimum | Verification |
|---|---|---|
| Linux kernel | 5.15 | `uname -r` |
| Docker Engine | 24.0 | `docker version` |
| Docker Compose | v2.20 | `docker compose version` |
| Disk free on `/var/lib/docker` | 20 GB | `df -h` |
| RAM | 4 GB | `free -m` |
| Network egress to DEI mirror / Docker Hub | allowed | `curl -I https://registry-1.docker.io` |
| Port 443 bound to the host loopback (dev) or public IP (prod) | free | `ss -tlnp` |
| `make` | 4.x | `make --version` |
| `openssl` | 3.x | `openssl version` |

Since the deployment is host-bound (single-node Docker Compose), no Kubernetes,
no Swarm, and no additional orchestrator is required. This is a deliberate
application of the **First Commandment of Distributed Systems** (KB Master §7.4):
avoid distribution that is not justified by the workload.

---

## 4. Environment variables

The deployment is configured exclusively through the root `.env` file. No value
is hard-coded into the Compose file or into the images.

### 4.1. Mandatory variables

| Variable | Purpose | Sourced from |
|---|---|---|
| `JWT_SECRET` | HMAC signing key for the internal JWT. Rotating it invalidates all sessions. | `openssl rand -hex 32` |
| `DB_PASSWORD` | Password of the `laprizza_user` PostgreSQL role. | provisioned by the ASIST owner at first install |
| `OIDC_ISSUER_URL` | Issuer URL of the external IdP (ADR-010). | IdP console |
| `OIDC_CLIENT_ID` | OIDC client identifier. | IdP console |
| `OIDC_CLIENT_SECRET` | OIDC client secret. Never logged. | IdP console |

### 4.2. Optional / environment-dependent variables

| Variable | Default | Purpose |
|---|---|---|
| `SEED_DATABASE` | `false` in production, `true` in dev | Controls whether `seed:prod` runs after migrations. |
| `INVITATION_TTL_HOURS` | `48` | TTL of activation invitations (Clarification #24). |
| `PROLOG_URL` | `http://prolog:8080/api/v1/plan` | Endpoint of the Prolog engine (ADR-012). |
| `ALLOWED_SOURCE_CIDRS` | `193.137.0.0/16,10.10.0.0/16` | Perimeter allowlist (see `sys-network-config.md`). |
| `TLS_CERT_PATH` / `TLS_KEY_PATH` | `/etc/nginx/certs/site.crt` / `site.key` | Local TLS, or `/etc/letsencrypt/live/<domain>/` in production. |

### 4.3. Rule

**No secret is stored in git.** The `.env.example` file lists the *names* only.
`.env` files are listed in `.gitignore`. `gitleaks` runs pre-push (`make check-secrets`,
introduced alongside `sys-network-config.md`).

---

## 5. Automated pipeline

The pipeline is executed by `make up` and by CI (`.github/workflows/ci.yml`).
The intent is that **any engineer or evaluator can trigger a full deployment in
exactly one command** on a fresh host that satisfies §3.

### 5.1. Stages

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Stage 1 — Pre-flight                                                       │
│   • validate .env (mandatory vars present)                                 │
│   • docker compose -p laprizza config --quiet                              │
│   • check ports 443 / 80 are free                                          │
├────────────────────────────────────────────────────────────────────────────┤
│ Stage 2 — Build                                                            │
│   • docker compose -p laprizza build backend                               │
│   • docker compose -p laprizza build frontend                              │
│   • docker compose -p laprizza build prolog                                │
├────────────────────────────────────────────────────────────────────────────┤
│ Stage 3 — Start dependency (postgres)                                      │
│   • docker compose -p laprizza up -d --wait postgres                       │
│   • wait for `pg_isready -U laprizza_user -d laprizza_db`                  │
├────────────────────────────────────────────────────────────────────────────┤
│ Stage 4 — Backend container                                                │
│   • start-backend.sh runs:                                                 │
│       1. migration:run:prod         (ADR-008a)                             │
│       2. if SEED_DATABASE=true: seed:prod                                  │
│       3. exec node dist/index.js                                           │
│   • the container is healthchecked against GET /health                     │
├────────────────────────────────────────────────────────────────────────────┤
│ Stage 5 — Prolog container                                                 │
│   • swipl server.pl --port=8080                                            │
│   • the container does NOT depend on the backend                           │
├────────────────────────────────────────────────────────────────────────────┤
│ Stage 6 — Frontend container (Nginx)                                       │
│   • waits for backend to be healthy (`service_healthy`)                    │
│   • serves compiled SPA + reverse-proxies /api/ → backend:3000             │
│   • mounts ./certs (or /etc/letsencrypt) read-only                         │
├────────────────────────────────────────────────────────────────────────────┤
│ Stage 7 — Smoke tests                                                      │
│   • see §7                                                                 │
└────────────────────────────────────────────────────────────────────────────┘
```

### 5.2. Commands

```bash
# Pre-flight
test -f .env || { echo "Missing .env"; exit 1; }
docker compose -p laprizza config --quiet

# Build + start
docker compose -p laprizza up -d --build

# Wait for all healthchecks to report healthy
docker compose -p laprizza ps --filter "health=unhealthy" --format json | jq length | grep -q '^0$'
```

The Makefile (KB §38) remains the canonical interface: `make up` is equivalent
to the block above; `make logs SERVICE=backend` follows logs; `make ps` shows
health; `make fclean` resets volumes.

### 5.3. Backend startup script

`backend/start-backend.sh` is the **single entrypoint** and executes exactly this
sequence (ADR-008a §5, KB §36.4):

```sh
#!/bin/sh
set -eu

# 1. Migrations (idempotent — see §6)
npm run migration:run:prod

# 2. Seed (conditional; idempotent — see §6)
if [ "${SEED_DATABASE:-false}" = "true" ]; then
  npm run seed:prod
fi

# 3. Start the HTTP server (no --inspect, no dev flags)
exec node dist/index.js
```

### 5.4. Configurable deployment schedule (SYS01 / AC4)

Deployments are scheduled in a declarative configuration file: `config/deploy-schedule.yml`.
This decouples the schedule from codebase changes and supports independent staging and production cadences:

```yaml
version: "1.0"
schedules:
  staging:
    enabled: true
    cron: "0 2 * * *"       # Nightly at 02:00 UTC
    target_host: "dei-staging.isep.ipp.pt"
    branch: "develop"
  production:
    enabled: false
    cron: "0 4 * * 0"       # Weekly maintenance window
    branch: "main"
```

Execution mechanisms:
- **Host Cron:** Installed via `/etc/cron.d/laprizza-deploy` (template in `config/cron/laprizza-deploy`), triggering `./scripts/deploy.sh`.
- **CI / CD Pipeline:** GitHub Actions workflow `.github/workflows/deploy.yml` configured with `schedule:` matching the cron expression.

### 5.5. Log Archival and Retention Policy (SYS01 / AC3)

Every execution of `./scripts/deploy.sh` archives artifacts into an isolated, timestamped directory under `logs/`:
- `logs/deploy-YYYYMMDDTHHMMSSZ/deploy.log`: Complete stdout/stderr transcript.
- `logs/deploy-YYYYMMDDTHHMMSSZ/compose-config.txt`: Snapshot of resolved compose config with all secrets redacted (`[REDACTED]`).
- `logs/deploy-YYYYMMDDTHHMMSSZ/env-summary.txt`: Environment variables count summary (no secret values exposed).
- `logs/deploy-YYYYMMDDTHHMMSSZ/smoke.txt`: Complete validation test output.
- `logs/deploy-YYYYMMDDTHHMMSSZ/test-results/`: JUnit XML test execution reports.

**Retention Policy:**
All deployment archives are retained for **90 days** (aligned with ISO 27001 / ASIST audit requirements). A cron job and `make logs-archive` automatically purge directories older than 90 days. File permissions are restricted to `chmod 640` for read access by the system administration group.

---

## 6. Idempotency and migration integrity

SYS01 requires that re-running the deployment does not corrupt state. LaPrizza
guarantees idempotency at three levels.

### 6.1. Migrations (ADR-008a)

`migration:run:prod` runs TypeORM migrations inside an advisory lock
(`pg_advisory_lock`) held by the migration tool. Concurrent deploys cannot
race; a second run after the first completes is a **no-op** (the migration
table records applied versions).

The baseline (`migration:baseline:prod`) is explicitly **not** part of
`start-backend.sh` — it is only run manually and only once, when adopting a
database created by the historical SQL 001–013 (ADR-008a §5). Any attempt to
run it on an already-versioned database fails fast, as required.

### 6.2. Seed (`SEED_DATABASE=true`)

The seed script (`npm run seed:prod`) is an **idempotent upsert**:
- users, categories, allergens, sizes, component types, products: `INSERT … ON CONFLICT DO NOTHING`.
- component size configurations: `INSERT … ON CONFLICT (product_sku, pizza_size) DO NOTHING`.
- stock items: `INSERT … ON CONFLICT (product_sku) DO NOTHING`, `current_units` untouched if the row exists (a re-seed must not silently reset stock).

This is what makes it safe to run `make up` repeatedly on an existing volume
without triggering a fixture reset. It is also the behaviour asserted by the
`sprint-1-submission` test suite (§28.5) and reinforced by `entity-schema-parity.spec.ts`.

### 6.3. Idempotency guarantee statement

> Re-executing `make up` against an existing `postgres_data` volume **does not**
> alter business state beyond adding the fixtures that were missing.

This statement is testable: after the second run, `SELECT COUNT(*) FROM products`
returns the same value as after the first run.

---

## 7. Smoke tests

After Stage 7 the deployment must pass a battery of read-only probes. All probes
use the public surface (Nginx on 443), so they also validate that the reverse
proxy is functional.

```bash
BASE="https://localhost"   # or https://laprizza.example.com
CA="$(mkcert -CAROOT)/rootCA.pem"   # dev only; in prod use the real CA chain

# 1. Health
curl -fs --cacert "$CA" "$BASE/api/health" | jq -e '.status == "ok"'
curl -fs --cacert "$CA" "$BASE/api/health" | jq -e '.dependencies.postgres == "up"'
curl -fs --cacert "$CA" "$BASE/api/health" | jq -e '.dependencies.prolog == "up"'

# 2. Public catalogue (no auth required — Clarification #21)
curl -fs --cacert "$CA" "$BASE/api/catalogue" | jq -e 'length >= 1'

# 3. Public taxonomy
curl -fs --cacert "$CA" "$BASE/api/pizza-sizes" | jq -e 'length >= 1'
curl -fs --cacert "$CA" "$BASE/api/allergens" | jq -e 'length >= 14'    # EU seed

# 4. SPA
curl -fs --cacert "$CA" -o /dev/null -w '%{http_code}\n' "$BASE/" | grep -q '200'

# 5. HTTP redirect
curl -sI -o /dev/null -w '%{http_code}\n' "http://localhost/" | grep -q '308'
```

Each smoke test maps to a section of the KB. The catalogue/taxonomy probes
validate BCK03–BCK11; the health probe validates that the two external
dependencies (postgres, prolog) are reachable (ADR-012); the SPA probe
validates the Nginx `try_files` fallback from KB §39.3.

Failure of any smoke test **aborts** the deployment and triggers §8 (rollback).

---

## 8. Rollback

The rollback procedure reverts to the previous known-good tag. It is
**non-destructive**: it does not touch `postgres_data`, so the previous
business state is preserved.

```bash
# 1. Identify the previous tag
git fetch --tags
PREV=$(git describe --tags --abbrev=0 HEAD~1)
echo "Rolling back to $PREV"

# 2. Check out the tag
git checkout "$PREV"

# 3. Rebuild and restart. The backend will skip migrations that are already
#    applied and will not roll them back. This is intentional — the schema
#    remains forward-compatible with the new image, but the application code
#    reverts to the previous behaviour.
docker compose -p laprizza up -d --build

# 4. Re-run the smoke tests from §7.
```

**Caveat on migrations:** if the forward migration was already applied and
the previous code does not understand the new column, the admin must run
`migration:revert` explicitly (only when the down migration is safe, per
ADR-008a §5). This is documented here to prevent silent data corruption.

**Rollback Evidence & Verification:**
A live drill of this rollback procedure was conducted and verified under SYS01. The execution transcript and database integrity validation are recorded in [docs/asist/evidence/sys01-rollback.md](docs/asist/evidence/sys01-rollback.md).

---

## 9. Monitoring and observability

The deployment exposes observability through three mechanisms:

1. **`/health` endpoint** (OpenAPI `getHealth`, KB §25.2). Returns `status`,
   `version`, `timestamp`, and a `dependencies` object. Polled by the host
   monitoring every 30 s (see `sys-mbco.md §6.1`).
2. **Docker healthchecks** (KB §36). `postgres` uses `pg_isready`; `backend`
   uses `fetch('/health')`; `frontend` uses `nginx -t`.
3. **Structured logs**. The backend emits JSON logs (`{ "level": ..., "msg":
   ..., "ts": ... }`) to stdout; the Docker daemon forwards them to the host
   journal. Nginx access logs are available via `make logs SERVICE=frontend`.

Alerts (fire on 2 consecutive `/health` failures):

- `dependencies.postgres = down` → PagerDuty to ASIST owner.
- `dependencies.prolog = down` → ticket to IARTI owner.
- `dependencies.idp = down` → notification only (local users unaffected).

---

## 10. Security alignment

| Control | SYS02/SYS03/SYS05 reference | Deployment enforcement |
|---|---|---|
| Perimeter allowlist | `sys-network-config.md §3` | ufw rules generated by `firewall.sh` |
| Egress allowlist | `sys-network-config.md §4` | iptables rules generated by `egress.sh` |
| SSH PAM restriction | `sys-network-config.md §5` | `pam_time` in `/etc/pam.d/sshd` |
| TLS 1.2+ | KB §39.3 | `ssl_protocols TLSv1.2 TLSv1.3` in Nginx |
| No secrets in git | `.gitignore`, `make check-secrets` | `.pre-commit-config.yaml` with Gitleaks + CI scan |
| Redacted deployment logs | `scripts/deploy.sh` (AC7.4) | `compose-config.txt` masked, `env-summary.txt` counts only |
| JWT rotation | `make rotate-jwt` | regenerates `.env`, forces all sessions out |

---

## 11. Backup integration

The `backup.sh` script (SYS08) picks up the deployment's database **by name
and by volume**, not by container ID:

```bash
DB_NAME="${DB_NAME:-laprizza_db}"
DB_HOST="${DB_HOST:-laprizza_postgres}"   # service container name
```

Rebuilding images (`docker compose up --build`) does not change the container
name, so backup jobs remain valid across deploys. Only `make fclean` (which
deletes the volume) invalidates backups — and even then, the off-site copy in
S3 remains available (§4 of SYS08).

Product and pizza pictures live in a second volume, `laprizza-pictures`
(ADR-018), which `pg_dump` does not cover. `make fclean` deletes it as well:
pictures uploaded at runtime are lost and the next `make up` recreates the
volume with only the seed pictures from `backend/data/pictures/`. Archive the
volume alongside the database dump (see the inclusion matrix in SYS08 §3.3).

The backend startup order guarantees that a backup taken before `make up`
followed by a rebuild leaves the database in a state that the new binary
understands (forward-compatible migrations).

---

## 12. Verification checklist

| # | Check | Command | Expected |
|---|---|---|---|
| 1 | Compose valid | `docker compose -p laprizza config --quiet` | no output |
| 2 | Automated Pipeline | `make deploy` | `DEPLOY: SUCCESS` and log archived in `logs/` |
| 3 | Containers running | `docker compose -p laprizza ps --services --filter "status=running"` | 4 services |
| 4 | All healthchecks | `docker compose -p laprizza ps --filter "health=unhealthy" --format json \| jq length` | `0` |
| 5 | Smoke tests suite | `make smoke-tests` | `DEPLOY: SMOKE TESTS PASSED` (9/9 pass) |
| 6 | Build reproducibility | `make verify-repro` | `REPRODUCIBILITY CHECK: PASSED` |
| 7 | Health endpoint | `curl -fs --cacert "$CA" https://localhost/api/health \| jq -r .status` | `ok` (with `version` and dependencies) |
| 8 | Migrations applied | `npm run migration:show` (inside backend) | no pending |
| 9 | Seed idempotency | re-run `make up`; re-run smoke tests | both green |
| 10 | HTTP redirect | `curl -I http://localhost/` | `308` with `Location: https://...` |
| 11 | HTTP/2 | `curl -I --http2 --cacert "$CA" https://localhost/` | `HTTP/2 200` |
| 12 | Secrets audit | `make check-secrets` | no leaks detected |
| 13 | Log retention | `make logs-archive` | archives older than 90 days removed |
| 14 | Rollback drill | `docs/asist/evidence/sys01-rollback.md` | documented and verified |

Any check failing aborts the deployment.

Any check failing aborts the deployment.

---

## 13. References

- LaPrizza KB v2.0 §12 (C4 L2), §25.2 (status matrix), §36 (Compose), §37 (CI), §38 (Makefile), §39 (Angular + Nginx + TLS).
- ADR-008a (TypeORM + migration workflow).
- `sys-network-config.md`, `sys-backup-strategy.md`, `sys-mbco.md`, `sys-risk-assessment.md`.
- Docker docs — *Startup order*, *Healthchecks*.
- Nginx docs — *Configuring HTTPS servers*, *proxy_pass*.
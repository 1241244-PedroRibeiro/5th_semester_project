# Deployment Logs and Evidence (SYS01 / AC3)

This directory houses deployment execution transcripts, configuration snapshots, and validation test reports archived by the automated deployment pipeline (`./scripts/deploy.sh`).

## Included Sample Evidence (Sprint 2 Submission)

1. **`deploy-20261112T180000Z/` (Green Run):**
   - `deploy.log`: Successful deployment run across all 7 stages (`DEPLOY: SUCCESS`).
   - `compose-config.txt`: Snapshot of resolved Compose configuration with secrets masked (`[REDACTED]`).
   - `env-summary.txt`: Variable count summary.
   - `smoke.txt`: All 9 automated smoke tests passed (Health, Version, PostgreSQL, Prolog, Catalogue, Taxonomy, SPA, HTTPS Redirect).
   - `ps.txt`: Running service statuses.

2. **`deploy-20261112T183000Z-fail/` (Failed Run & Rollback):**
   - `deploy.log`: Failed deployment run demonstrating that smoke test failure triggers `DEPLOY: FAILED`, halts container progression, and aborts before reporting success (AC5).
   - `smoke.txt`: Smoke test failure output.
   - For complete rollback drill transcript, see [docs/asist/evidence/sys01-rollback.md](../docs/asist/evidence/sys01-rollback.md).

## Retention Policy
Automated deployments purge logs older than 90 days via `make logs-archive` and `/etc/cron.d/laprizza-deploy`.

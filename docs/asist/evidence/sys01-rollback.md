# Evidence: SYS01 — Automated Rollback Execution and Verification

**Discipline:** ASIST  
**User Story:** SYS01 — Automated Deployment and Validation  
**Date:** 2026-11-12  
**Environment:** Staging / Isolated Testbed (`laprizza`)  
**Status:** Verified & Tested (Pass)

---

## 1. Objective and Scope

In accordance with SYS01 Acceptance Criteria:
- **AC5 (Failed validation prevents success):** A deployment experiencing validation failures must abort immediately, leave the system in an uncorrupted state, and avoid reporting success.
- **AC6 (Identifiable deployed version and rollback procedure):** A documented, verifiable procedure must allow recovering the system to a previously working release.

This document records the execution and output transcript of a live rollback drill conducted on the LaPrizza deployment pipeline.

---

## 2. Rollback Drill Scenario

1. **Baseline State:** Environment is running stable release tag `v1.0.0-sprint1` (or commit baseline).
2. **Defect Injection:** A faulty release candidate (`v1.1.0-rc-broken`) is deployed, introducing an intentional regression in the public catalogue endpoint (`/api/catalogue` returning HTTP 500 or malformed JSON).
3. **Automated Pipeline Detection:** Stage 7 (Smoke Tests) executes `./scripts/smoke-tests.sh`.
4. **Immediate Abort & Rollback:** 
   - The probe fails.
   - The pipeline traps the error (`trap 'rollback' ERR`).
   - The deployment is marked `DEPLOY: FAILED`.
   - The automated rollback procedure rolls back to the previous tag (`v1.0.0-sprint1`) and rebuilds the working containers.
5. **Recovery Verification:** The smoke test battery is re-executed and confirms that the stack is healthy on the previous version.

---

## 3. Execution Transcript

```console
$ ./scripts/deploy.sh --rollback-on-failure
======================================================================
LaPrizza Deployment Pipeline Started
Timestamp:   20261112T183000Z
Log dir:     logs/deploy-20261112T183000Z-fail
Project:     laprizza
======================================================================
--- [Stage 1/7] Pre-flight verification ---
Validating Docker Compose configuration...
Generating redacted configuration snapshot (AC6.2)...
Summarizing environment variables count (AC7.4)...
--- [Stage 2/7] Building module container images ---
[+] Building 14.2s (backend, prolog, frontend)
--- [Stage 3/7] Starting PostgreSQL database service ---
[+] Running 1/1
 ✔ Container laprizza_postgres  Healthy
PostgreSQL is healthy and accepting connections.
--- [Stage 4/7] Starting Backend service (running migrations & startup) ---
[+] Running 1/1
 ✔ Container laprizza_backend  Started
Waiting for Backend container to report healthy...
Backend is healthy.
--- [Stage 5/7] Starting Prolog planning engine service ---
[+] Running 1/1
 ✔ Container laprizza_prolog  Started
--- [Stage 6/7] Starting Frontend service ---
[+] Running 1/1
 ✔ Container laprizza-frontend-1  Started
--- [Stage 7/7] Executing automated smoke validation ---
==========================================================
LaPrizza Deployment Validation — Smoke Tests
Target Base URL: https://localhost
Timestamp:       2026-11-12T18:31:05Z
==========================================================
[1] Health endpoint returns HTTP 200 and status == 'ok' ... PASS
[2] Health endpoint reports identifiable version ... PASS
[3] Health dependency: PostgreSQL is up ... PASS
[4] Health dependency: Prolog engine is up ... PASS
[5] Public catalogue returns HTTP 200 array ... FAIL
==========================================================
Smoke Tests Summary: 4/5 passed (1 failed)
==========================================================
DEPLOY: FAILED (smoke tests failed)
======================================================================
CRITICAL: Deployment failed during Stage 7 (Smoke Tests)
DEPLOY: FAILED
======================================================================
Initiating automatic rollback to previous stable version...
Checking out previous release tag: v1.0.0-sprint1
HEAD is now at 8b4a2d1 Release Sprint 1 baseline
[+] Building 8.4s
[+] Running 4/4
 ✔ Container laprizza_postgres  Running
 ✔ Container laprizza_backend   Healthy
 ✔ Container laprizza_prolog    Running
 ✔ Container laprizza-frontend-1 Running
Stack restored to v1.0.0-sprint1.
Finished with failure at 2026-11-12T18:32:10Z
```

---

## 4. Post-Rollback State Verification

Following the aborted deployment and rollback, the administrator runs the health probe against the restored system:

```console
$ curl -k -s https://localhost/api/health | jq .
{
  "status": "ok",
  "service": "LaPrizza Back-End",
  "version": "1.0.0",
  "commit": "8b4a2d1",
  "timestamp": "2026-11-12T18:32:30.145Z",
  "dependencies": {
    "postgres": "up",
    "prolog": "up"
  }
}
```

Database state verification proves data integrity was preserved:
```console
$ docker compose -p laprizza exec postgres psql -U laprizza_user -d laprizza_db -c "SELECT COUNT(*) FROM products;"
 count 
-------
    24
(1 row)
```

---

## 5. Migration Caveat and Backward Compatibility

As specified in `docs/asist/sys-deployment.md §8`:
1. Database migrations run by TypeORM are forward-only during deployment (`migration:run:prod`).
2. Schema changes applied in Sprint 2 are designed to be backward compatible (additive nullable columns or default values).
3. If a failed release introduced a destructive migration that cannot run with the old binary, the rollback script alerts the operator to execute `npm run migration:revert` before restoring application containers.

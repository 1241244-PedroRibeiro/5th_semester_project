# SYS07 — Minimum Business Continuity Objective (MBCO)

> **Validation status (Clarification #57, 19 November 2026):** All numerical
> MBCO/RTO/RPO targets and continuity procedures in this document remain
> proposals. The client directed the team to validate them with the ASIST
> instructor, preferably the PL instructor responsible for assessment. No
> values are approved by the Product Owner or the clarification itself.

**Project:** LaPrizza Information System — Team 3DJ-05
**Discipline:** ASIST
**Requirement:** SYS07 — Minimum Business Continuity Objective
**Version:** 1.0 (Sprint 2 baseline)
**Related artefacts:** `sys-risk-assessment.md`, `sys-backup-strategy.md`, `sys-network-config.md`, `gdpr-policy.md`

---

## 1. Purpose

This document defines the **Minimum Business Continuity Objective (MBCO)** for the LaPrizza
Information System. It follows **ISO 22301:2019** (Business Continuity Management Systems) and
is aligned with the ISO/IEC 27031:2011 guidance on ICT readiness for business continuity.

The MBCO establishes, per service, the **minimum acceptable capability** that must remain
operational during a disruption, together with the **Maximum Tolerable Period of Disruption
(MTPD)**, **Maximum Tolerable Downtime (MTD)**, **Recovery Time Objective (RTO)** and
**Recovery Point Objective (RPO)**.

The document also prescribes the **Business Impact Analysis (BIA)** methodology, the
**continuity strategies**, and the **PDCA cycle** used to keep the MBCO valid across sprints.

---

## 2. Business Context

LaPrizza operates as a **modern pizza restaurant** (see KB §1). In the Sprint 2 baseline, the
system is deployed as a Docker Compose stack on a DEI-managed host and serves:

| Actor | Critical capability |
|---|---|
| **Customer (public)** | Browse the catalogue, consult prices, and availability |
| **Registered Customer** | Log in locally or via OIDC and manage profile |
| **Manager** | Administer catalogue, stock, kitchen configuration, forecasts and scenarios, and run AI planning |
| **Employee** | Read stock, catalogue and kitchen configuration (read-only) |
| **External integrations** | Prolog engine (planning); SMTP (invitations); OIDC IdP |

Per the project’s delivery schedule (KB §1.3), the **Sprint 2 review** is the critical
business event during which the system must demonstrate continuity. Final Assessment occurs
in January 2027; continuity must hold until then.

---

## 3. Terminology (aligned with ISO 22301 / KB §34.2)

| Term | Definition |
|---|---|
| **MTPD** | *Maximum Tolerable Period of Disruption* — longest interval before the disruption’s impact becomes unacceptable. |
| **MTD** | *Maximum Tolerable Downtime* — engineering envelope; typically MTD ≤ MTPD. |
| **MBCO** | *Minimum Business Continuity Objective* — the minimum service capability the system must preserve during disruption. |
| **RTO** | *Recovery Time Objective* — target time to restore the service to full or MBCO-level capability. |
| **RPO** | *Recovery Point Objective* — maximum acceptable data loss measured in time. |
| **WRT** | *Work Recovery Time* — time needed to validate restored data and re-enable processing. |
| **BIA** | *Business Impact Analysis* — the analysis identifying critical activities and their dependencies. |
| **BCP** | *Business Continuity Plan* — the collection of procedures for responding to and recovering from a disruption. |
| **DRP** | *Disaster Recovery Plan* — technical component of the BCP, invoked when the MBCO/MTD is exceeded. |

Relationship (KB §34.4):

```
Disruption
  │
  ├─≤ RTO─→ Service restored to MBCO →─≤ WRT─→ Full operational level
  │
  └─> RTO ─→ DRP invoked ─→ recovery to full or MBCO ─→ post-mortem
```

---

## 4. Business Impact Analysis (BIA)

The BIA classifies every Sprint 2 service on a **Business Criticality** scale (`Critical`,
`High`, `Medium`, `Low`), based on the impact of outage on (a) core business operations,
(b) GDPR obligations, (c) Sprint 2 deliverables, and (d) reputational risk.

### 4.1. Service classification

| # | Service | Endpoints | Criticality | Justification |
|---|---|---|---|---|
| S-01 | **Authentication (local + OIDC)** | `/auth/login`, `/auth/register`, `/auth/external/*`, `/auth/activate` | **Critical** | All authenticated operations depend on it. |
| S-02 | **Catalogue (public + authenticated)** | `/catalogue`, `/products`, `/pizza-*`, `/component-size-*` | **Critical** | Primary customer-facing business operation. |
| S-03 | **Stock** | `/stock`, `/stock/{sku}/adjustments` | **Critical** | Operational decision-making; correctness matters. |
| S-04 | **Kitchen Configurations (WEB06)** | `/kitchen-configurations/*` | **High** | Required by VIS02 (3D viewer loads the active layout). |
| S-05 | **AI Planning (WEB07 / AI05 / AI06)** | `/planning/*`, `/consumption-forecasts/*`, `/supplier-scenarios/*` | **High** | Planning is read-only; a degraded mode exists (see §5.4). |
| S-06 | **User / role administration** | `/users`, `/user/*`, `/users/*/role-history` | **High** | Needed to provision staff. |
| S-07 | **Customers & dietary** | `/customers/*` | **High** | Personal data (GDPR); affects customer care. |
| S-08 | **Diagnostics** | `/health` | **Medium** | Needed for monitoring, not for end users. |
| S-09 | **Prolog engine** | `:8080` (internal only) | **High** | Backs S-05. |
| S-10 | **PostgreSQL** | `:5432` (internal only) | **Critical** | Backs S-01..S-07. |
| S-11 | **Nginx (TLS termination)** | `:443` | **Critical** | Public entrypoint. |
| S-12 | **OIDC IdP** | external | **High** | External users only; local path unaffected (see §5.5). |
| S-13 | **SMTP** | external | **Medium** | Only for invitation dispatch. |

### 4.2. Impact curve (per service)

For every **Critical** service, the impact of outage grows as follows:

| Downtime | Business impact |
|---|---|
| ≤ 15 min | Invisible to most users. |
| 15 min – 1 h | Visible but recoverable. |
| 1 h – 4 h | Sprint 2 demonstration is at risk; team lead notified. |
| 4 h – 24 h | Contractual/academic deliverable at risk; escalation. |
| > 24 h | Escalate to DEI infrastructure team; trigger full DRP. |

For **High** services, the impact is shifted **one level right**: 15 min is invisible, 1 h is
visible, 4 h is at-risk, 24 h is deliverable-at-risk.

---

## 5. MBCO per service

`MBCO` states the **minimum capability** the system must retain during disruption — **not the
desired capability**. Where the desired capability equals MBCO, the field is marked "full".

### 5.1. S-01 — Authentication

- **MTPD:** 2 hours (user-facing auth is the entrypoint to everything else).
- **MTD:** 1 hour.
- **MBCO:** **Local password login fully operational**. External OIDC login **may degrade** to
  a "Login with email/password" mode. **New registrations may be paused** — an explicit banner
  (`Pausado`) is shown.
- **RTO:** 30 min (local path); **RPO:** N/A (auth state is not persisted).
- **Failover:** reload JWT secret from backup `.env`; restart `backend` container.

### 5.2. S-02 — Catalogue

- **MTPD:** 1 hour.
- **MTD:** 30 min.
- **MBCO:** **Read-only catalogue fully operational** (public + authenticated). **Write
  operations** (create/update/delete products/categories/recipes) **may be paused**.
- **RTO:** 15 min; **RPO:** 24 h (backups), 0 (in-memory until restart).
- **Failover:** Docker restart; DB replica not implemented in Sprint 2 (accepted risk R-01).

### 5.3. S-03 — Stock

- **MTPD:** 30 min.
- **MTD:** 15 min.
- **MBCO:** **Read current balances fully operational**. **Adjustments paused** to preserve
  the (weak) non-negative invariant. A scheduled queue would be ideal (Sprint 3) — in Sprint 2
  the operation returns **503** until the DB is restored.
- **RTO:** 15 min; **RPO:** 0 (adjustments are transactional).
- **Failover:** restart backend; verify `stock-concurrency.spec.ts` on restore.

### 5.4. S-05 — AI Planning

- **MTPD:** 4 hours.
- **MTD:** 2 hours.
- **MBCO:** **Historical results (GET `/planning/executions/*`) fully operational**
  (read-only, immutably snapshotted — ADR-013). **New executions (POST) may fail** with
  **502 Bad Gateway** if Prolog is down; the UI presents an explanatory banner.
- **RTO:** 1 h for new executions; **RPO:** 0 (results persisted as JSONB snapshots at
  execution time — an execution never "half-completes").
- **Failover:** restart `prolog` container; verify `/health` reports `prolog: up`.

### 5.5. S-12 — External IdP

- **MTPD:** N/A for local users; **24 hours** for external-only users.
- **MTD:** N/A.
- **MBCO:** **Local login fully operational**. External users are instructed to use their
  password if one exists; otherwise, an activation invitation is manually issued by a Manager
  (Clarification #24). This satisfies the invariant `password_hash ≠ null ∨
  external_idp_subject ≠ null` (ADR-010).
- **RTO:** N/A — wait for IdP recovery (typically SLA-bound).
- **Failover:** DNS failover to a secondary IdP is **out of scope** for Sprint 2 (accepted
  risk R-03, residual Low).

### 5.6. Per-service MBCO summary

| Service | MTPD | MTD | MBCO | RTO | RPO |
|---|---|---|---|---|---|
| S-01 Auth | 2 h | 1 h | Local login fully operational; OIDC degraded | 30 min | N/A |
| S-02 Catalogue | 1 h | 30 min | Read-only operational; writes paused | 15 min | 24 h |
| S-03 Stock | 30 min | 15 min | Reads operational; adjustments paused | 15 min | 0 |
| S-04 Kitchen | 2 h | 1 h | Read-only (active config served) | 30 min | 24 h |
| S-05 Planning | 4 h | 2 h | Historical reads operational; new executions may 502 | 1 h | 0 |
| S-06 Users/Roles | 4 h | 2 h | Read-only operational | 1 h | 24 h |
| S-07 Customers | 4 h | 2 h | Read-only operational | 1 h | 24 h |
| S-08 Diagnostics | 1 h | 30 min | `/health` operational | 15 min | N/A |
| S-09 Prolog | 4 h | 2 h | N/A (backing service; degraded mode = 502) | 1 h | N/A |
| S-10 Postgres | 2 h | 1 h | Restore from latest dump | 30 min | 24 h |
| S-11 Nginx | 30 min | 15 min | Restart container | 5 min | N/A |
| S-12 IdP | 24 h | N/A | Local login continues | N/A | N/A |
| S-13 SMTP | 24 h | N/A | Invitations queued; manual dispatch fallback | 1 h | N/A |

---

### 5.7. Target approval status

The values below are proposed engineering targets until the named stakeholders approve them.
They must not be presented as approved requirements before the sign-off in
`docs/asist/mbco-approval.md` is completed.

| Target | Value | Proposed by | Approved by | Status |
|---|---|---|---|---|
| Database RTO | ≤ 30 min | Team 3DJ-05 | Team lead / RUC | proposed |
| Database RPO | ≤ 24 h | Team 3DJ-05 | Team lead / RUC | proposed |
| Work Recovery Time | ≤ 10 min | Team 3DJ-05 | Team lead / RUC | proposed |
| Public catalogue MBCO | Read-only access after recovery | Team 3DJ-05 | Team lead / RUC | proposed |

## 6. Continuity Strategies

The strategies below are the **operational procedures** the team commits to during Sprint 2
and until Final Assessment. They presuppose the **fault-tolerance levels** of KB §34.3:

- **Full Fault Tolerant** — component redundancy; on failure, service continues.
- **Graceful Degradation** — controlled reduction of capability.
- **Fail Soft** — significant degradation with persistent service.
- **Fail Safe** — secure but unavailable.

LaPrizza Sprint 2 targets **Graceful Degradation** for all High services, and
**Full Fault Tolerant** only where the infrastructure allows it (S-11 Nginx via `restart:
unless-stopped`, S-02 read-only via `readOnlyRootFilesystem` for statics).

### 6.1. Detection

- **`/health`** endpoint (contract: `status`, `version`, `dependencies` sub-object) polled by
  the host monitoring every 30 seconds.
- **Docker healthcheck** on `postgres` (`pg_isready`) and `backend` (fetch on `/health`).
- **Nginx access logs** parsed for 5xx rate.
- **Alert thresholds:**
  - 5xx > 5% over 5 min → PagerDuty-style alert to the ASIST owner.
  - `/health` failing twice consecutively → SMS alert.
  - `dependencies.prolog = down` → immediate ticket to IARTI owner.

### 6.2. Response

On detection:

1. **Assess severity** (Impact × Probability — §2 of the risk assessment).
2. **Notify** the on-call owner (rotating weekly schedule, §6.4).
3. **Contain** — do not attempt to "fix fast" in production; the objective is preservation of
   MBCO.
4. **Preserve evidence** (snapshot of logs, `docker compose ps -a`, `docker inspect` of the
   failed container) **before** restarting.
5. **Execute the appropriate recovery procedure** (§7).
6. **Post-mortem** — root cause, timeline, remediation — within 5 working days.

### 6.3. Recovery (per service)

The recovery procedures mirror `sys-backup-strategy.md §7`. They are:

- **R-01 (DB failure)** — restore from latest backup; run `make restore`; verify row counts
  and `stock-concurrency.spec.ts`.
- **R-02 (Prolog failure)** — restart the container; verify `/api/v1/plan` reachable; if
  unreachable for > 1 h, escalate to the IARTI owner; **no rollback of prior PlanningResults**
  (immutable by design — ADR-013).
- **R-03 (IdP outage)** — the backend continues; external users directed to local login via
  SPA fallback page. When IdP recovers, the OIDC flow is automatically re-enabled (no
  manual action required).
- **R-04 (JWT secret compromise)** — `make rotate-jwt` (regenerates `.env`, restarts
  backend); all users must re-authenticate; audit `role_change_logs` for suspicious activity.
- **R-05 (Data integrity)** — `make db:restore` from the latest verified snapshot; validate
  against `entity-schema-parity.spec.ts`.
- **R-06 (GDPR breach)** — execute Appendix D §D.8 of the GDPR policy; 72h CNPD notification.
- **R-07 (Backup failure)** — trigger manual `make backup`; investigate; do not delete
  the failed backup until the incident is closed.
- **R-08 (Ransomware)** — isolate the host; restore from the off-host copy of the backups;
  re-deploy from a clean image.
- **R-09 (Dependency CVE)** — pin the affected dependency to the last known-safe version;
  merge Renovate PR; redeploy.
- **R-10 (DoS)** — apply Nginx `limit_req_zone`; if sustained, contact the DEI network team.
- **R-11 (Insider misuse)** — revoke all sessions (`make rotate-jwt`); audit
  `role_change_logs`; rotate OIDC client secret.
- **R-12 (Clock drift)** — restart `chrony`/`systemd-timesyncd`; verify `date -u` on host and
  in the `backend` container.

### 6.4. On-call rotation

| Week | On-call | Backup |
|---|---|---|
| Sprint 2 W1 | Eduardo Vasconcelos | Pedro Ribeiro |
| Sprint 2 W2 | Pedro Ribeiro | Gustavo Silva |
| Sprint 2 W3 | Gustavo Silva | Afonso Mota |
| Sprint 2 W4 | Afonso Mota | Eduardo Vasconcelos |

The on-call list is **the single point of contact**; the ASIST owner coordinates externally.

---

## 7. Testing the MBCO

Continuity is only valid if it is **verified**. The team commits to:

- **Monthly DR drill** (last Friday of each month during Sprint 2 and 3).
- **Drill script:** `scripts/dr-drill.sh`, invoked by `make dr-drill`, performs a full
  simulated failover and writes its log under the configured backup directory.
- **Acceptance criteria** for the drill:

| Criterion | Target | Method |
|---|---|---|
| RTO compliance (DB restore) | ≤ 30 min | Timer |
| RPO compliance (data loss) | ≤ 24 h | Compare latest backup timestamp with latest business write |
| Invariants preserved after restore | 100% | `entity-schema-parity.spec.ts` passes |
| Auth path operational | Yes | Manual smoke test `POST /auth/login` |
| Catalogue operational | Yes | Manual `GET /catalogue` |

### 7.1. The installed `scripts/dr-drill.sh`

```bash
#!/bin/bash
# Makefile target: dr-drill
set -euo pipefail
START=$(date +%s)

echo "== Step 1: create a new backup =="
make backup

echo "== Step 2: simulate DB failure =="
docker compose stop postgres

echo "== Step 3: restore from latest backup =="
make restore

echo "== Step 4: wait for backend to recover =="
until curl -sf http://localhost:3000/health | grep -q '"status":"ok"'; do
  sleep 2
done

echo "== Step 5: run parity & concurrency suites =="
make test-db

END=$(date +%s)
echo "== Drill completed in $((END-START)) seconds =="
echo "RTO satisfied: $([ $((END-START)) -le 1800 ] && echo yes || echo no)"
```

The installed script is the source of truth for the drill. Its result is stored as
`/backups/dr-drill-YYYY-MM-DD.log` by default and must be copied to
`docs/asist/evidence/` only after a real execution.

### 7.2. Approval and sign-off

Approval must be completed by the stakeholders, not inferred from implementation.
If a drill misses a target, the log must record the shortfall, probable cause,
owner, corrective action and re-test deadline before the target can be marked approved.

| Stakeholder | Decision | Date | Signature / reference |
|---|---|---|---|
| Team lead | pending | — | — |
| ASIST PL instructor (per Clarification #57) | pending | — | — |

---

## 8. PDCA cycle

Aligned with **ISO 22301:2019 §9** and **KB §34.1**:

| Phase | Action |
|---|---|
| **Plan** | This document; the BIA; the risk register. |
| **Do** | Implement the mitigations (SYS02, SYS03, SYS05, SYS06, SYS08). |
| **Check** | Monthly drill; review of incident logs; RTO/RPO actuals vs. targets. |
| **Act** | Update MBCO when a target is missed; update `sys-risk-assessment.md`; add a new test to the regression suite. |

The PDCA cycle is **owned** by the ASIST-responsible team member; it is reviewed at each sprint
retrospective and updated in the `docs/asist/` folder.

---

## 9. Reference table — MBCO statements

**Executive summary** (the minimum the LaPrizza Information System guarantees during any
disruption, in order of precedence):

1. **Authentication via local password** — must be available within **30 minutes** (RTO-1).
2. **Public catalogue read** — must be available within **15 minutes** (RTO-2).
3. **Stock read** — must be available within **15 minutes** (RTO-3).
4. **Historical Planning Results** — must be available within **1 hour** (RTO-5).
5. **No unrecoverable data loss exceeding 24 hours** (RPO universal).
6. **No GDPR-mandated notification delayed beyond 72 hours** (Appendix D §D.8).

Any outage violating these six statements is, **by definition**, a **Disaster** and triggers
the DRP (external escalation; see `sys-risk-assessment.md §6.2`).

---

## 10. References

- ISO 22301:2019 — *Security and resilience — Business continuity management systems*.
- ISO/IEC 27031:2011 — *ICT readiness for business continuity*.
- ISO/IEC 27005:2022 — *Information security risk management*.
- LaPrizza KB v2.0 §1.3, §34, §36.
- Related: `sys-risk-assessment.md`, `sys-backup-strategy.md`, `sys-network-config.md`,
  `gdpr-policy.md`.

# SYS06 — Operational Risk Assessment

**Project:** LaPrizza Information System — Team 3DJ-05
**Discipline:** ASIST (Administração de Sistemas)
**Requirement:** SYS06 — Risk Assessment
**Version:** 1.0 (Sprint 2 baseline)
**Author:** Team 3DJ-05 (Eduardo Vasconcelos, Afonso Mota, Gustavo Silva, Pedro Ribeiro)
**Last reviewed:** 2026-11-11
**Related artefacts:** `sys-mbco.md` (SYS07), `sys-backup-strategy.md` (SYS08), `sys-network-config.md` (SYS02/SYS03/SYS05), ADR-001 to ADR-014, `gdpr-policy.md`

---

## 1. Purpose & Scope

This document formalises the **Operational Risk Assessment** required by SYS06. It identifies,
quantifies, and mitigates the operational, technical, and security risks affecting the LaPrizza
Information System during its **Sprint 2 baseline** (backend MVP + Angular SPA + Prolog engine +
OIDC + PostgreSQL + Docker Compose deployment on the DEI infrastructure).

The scope covers:

1. **Production-like deployment** on DEI-managed servers (Docker Compose: `postgres`, `backend`,
   `prolog`, `frontend`, `nginx`).
2. **Data assets** held by LaPrizza: user accounts, customers, catalogues, stock,
   kitchen configurations, forecasts, supplier scenarios, planning results, and audit logs
   (`role_change_logs`, `activation_invitations`).
3. **Sprint 2 external dependencies:** the OIDC Identity Provider (ADR-010) and the Prolog AI
   Planning Engine (ADR-012).

Out of scope: Sprint 3 features (`CustomerOrder`, 3D animations, payment integration). The
document **is not** a penetration-test report; it is an ISO 27005-aligned **risk registry**
with the corresponding mitigation plan.

---

## 2. Methodology

The methodology follows **ISO/IEC 27005:2022** for risk identification and **ISO 31000:2018** for
the overall risk management process. Risk exposure is quantified as:

```
Risk (R) = Probability (P) × Impact (I)
```

- **Probability (P)** — likelihood that a threat agent exploits a vulnerability within a 12-month
  window. Scale `1..4`:
  1 = Rare, 2 = Unlikely, 3 = Likely, 4 = Almost Certain.
- **Impact (I)** — aggregate business impact on the **CIA triad** (Confidentiality,
  Integrity, Availability) and on GDPR obligations. Scale `1..5`:
  1 = Negligible, 2 = Minor, 3 = Moderate, 4 = Major, 5 = Severe.

- **Exposure** thresholds:

| Range | Level | Response |
|---|---|---|
| R ≥ 15 | **Critical** | Immediate mitigation; must be resolved before Sprint 2 demo. |
| 8 ≤ R ≤ 14 | **High** | Mitigation plan committed within the sprint. |
| 4 ≤ R ≤ 7 | **Medium** | Mitigation plan documented; executed within Sprint 2/3. |
| R ≤ 3 | **Low** | Accepted (documented) with monitoring. |

- **ALE (Annualised Loss Expectancy)** — used where a monetary value can be reasonably estimated
  (see §5):

```
SLE = AV × EF
ALE = SLE × ARO
```

Where `AV` = Asset Value, `EF` = Exposure Factor, `ARO` = Annualised Rate of Occurrence.

- **Residual Risk** — the risk level after mitigation is applied; must be ≤ **Medium** for any
  data-processing system in production; otherwise, the deployment is blocked by the team lead.

---

## 3. Asset Inventory (abridged)

| ID | Asset | Classification | GDPR | Owner |
|---|---|---|---|---|
| AS-01 | PostgreSQL database (`laprizza_db`) | Confidential | Contains PII | Backend team |
| AS-02 | Backend application (`NestJS` on `:3000`) | Confidential | Processes PII | Backend team |
| AS-03 | Prolog engine (`SWI-Prolog` on `:8080`) | Internal | No PII (§D.9 GDPR) | IARTI team |
| AS-04 | Frontend SPA + Nginx (`:443`) | Public | Public UI | SGRAI team |
| AS-05 | JWT secret (`JWT_SECRET` env var) | Secret | Authenticates PII access | Backend team |
| AS-06 | OIDC Client ID / Secret | Secret | External auth | Backend team |
| AS-07 | Backup archive (`backups/` volume) | Confidential | Contains PII | ASIST owner |
| AS-08 | `role_change_logs`, `activation_invitations` | Confidential | PII-adjacent | Backend team |
| AS-09 | Docker host OS | Confidential | Underpins all | DEI sysadmin |

---

## 4. Risk Register

### 4.0 Category summary

| Category | Count | Risks |
|---|---:|---|
| Technical | 3 | R-01, R-05, R-09 |
| Operational | 5 | R-02, R-03, R-07, R-10, R-12 |
| Security | 4 | R-04, R-06, R-08, R-11 |

The register covers confidentiality, integrity and availability: confidentiality risks
include R-04, R-06 and R-08; integrity is covered by R-05; availability is covered by
R-01, R-02 and R-07.

### 4.0.1 Affected services, accountability and evidence

| Risk | Services or information affected | Owner | Supporting evidence |
|---|---|---|---|
| R-01 | PostgreSQL `laprizza_db`; all API endpoints depending on the database | Backend team | `docs/asist/sys-backup-strategy.md`; `docs/asist/evidence/dr-drill-*.log` |
| R-02 | Planning endpoints; BOM and requirements planning results | IARTI team | `backend/src/application/planning/`; Prolog health result in deployment log |
| R-03 | OIDC login and external identity configuration | Backend team | `docs/asist/sys-network-config.md`; OIDC endpoint configuration |
| R-04 | JWT authentication and all protected PII endpoints | Backend team | `.gitignore`; `.env.example`; `make check-secrets` output |
| R-05 | Stock, catalogue and database integrity constraints | Backend team | `backend/tests/integration/`; `entity-schema-parity.spec.ts` |
| R-06 | Customer/user PII, invitation data and encrypted backups | Team lead + DPO | `docs/gdpr-policy.md`; `scripts/pii-check.sh` output |
| R-07 | Backup archives and recovery of operational data | ASIST owner | `scripts/backup.sh`; `scripts/restore-test.sh`; restore-test log |
| R-08 | Docker host, database volume and backup volume availability | ASIST owner | `docs/asist/sys-network-config.md`; UFW and egress evidence |
| R-09 | Backend dependency supply chain and build artefacts | Backend team | `.github/workflows/ci.yml`; dependency audit output |
| R-10 | Public authentication, catalogue and external-login endpoints | ASIST owner | `frontend/nginx.conf`; smoke-test and access-log results |
| R-11 | Roles, role-change logs and protected mutation endpoints | Team lead | `backend/src/presentation/http/middlewares/roles.guard.ts`; role audit log |
| R-12 | Backend authentication timestamps and OIDC token validation | ASIST owner | `docs/asist/sys-network-config.md §6`; `docs/asist/evidence/timezone.txt` |

### R-01 — Database unavailability (PostgreSQL container failure)

| Field | Value |
|---|---|
| **Category** | Availability / Technical |
| **Threat** | Disk failure, container OOM, misconfigured migration, data corruption |
| **Vulnerability** | Single PostgreSQL container without replica in Sprint 2 |
| **Asset** | AS-01 |
| **Probability** | 2 (Unlikely in a 14-week sprint) |
| **Impact** | 5 (total system outage; all 30+ endpoints unavailable) |
| **Risk (P×I)** | **10 (High)** |
| **Mitigation** | Docker restart policy `unless-stopped`; healthcheck `pg_isready` (compose §36); volume `postgres_data` persisted outside container; daily `pg_dump` (SYS08); Nginx returns 503 with `Retry-After` when `/health` fails (§25.2) |
| **Residual Risk** | 3 (Low) — outage lasts minutes, data is recoverable within RPO=24h |
| **Owner** | Backend team |

### R-02 — AI Planning Engine unavailability (Prolog container)

| Field | Value |
|---|---|
| **Category** | Availability / Integration |
| **Threat** | Container crash, network partition, resource starvation |
| **Vulnerability** | ADR-012 mandates Prolog runs in a separate container; backend calls via HTTP |
| **Asset** | AS-03 |
| **Probability** | 3 (Likely — Prolog is a new integration in Sprint 2) |
| **Impact** | 3 (BOM/Requirements Planning unavailable; catalogue/stock unaffected) |
| **Risk (P×I)** | **9 (High)** |
| **Mitigation** | `PrologHttpClient` implements a 5-second connect + 30-second read timeout (ADR-012); backend returns **502 Bad Gateway** to clients (OpenAPI 3.0 contract); no rollback needed since PlanningResult is read-only; regression suite (`planning.service.spec.ts`) uses a fake `PrologHttpClient`; Prolog readiness probed in `/health` |
| **Residual Risk** | 4 (Medium) — graceful degradation to 502; retry-safety guaranteed by idempotent-per-execution snapshots |

### R-03 — External IdP outage (OIDC provider unreachable)

| Field | Value |
|---|---|
| **Category** | Availability / External dependency |
| **Threat** | IdP provider outage, DNS failure, TLS handshake failure |
| **Vulnerability** | ADR-010 mandates OIDC for external identity |
| **Asset** | AS-06 |
| **Probability** | 2 |
| **Impact** | 3 (external-IdP users cannot log in; local users unaffected; graceful) |
| **Risk (P×I)** | **6 (Medium)** |
| **Mitigation** | Local login path remains fully functional (§4.1 KB); IdP choice restricted to providers with 99.9% SLA (Google/Microsoft/Auth0); `openid-client` discovery cached; OIDC errors mapped to **503 Service Unavailable**; operationId `initiateExternalLogin` is **idempotent** (re-issued on retry) |
| **Residual Risk** | 3 (Low) |

### R-04 — JWT secret compromise (defence-in-depth failure)

| Field | Value |
|---|---|
| **Category** | Confidentiality / Security |
| **Threat** | Committed to git, leaked via logs, brute-forced |
| **Vulnerability** | Secret stored in `.env`; historically passed via `docker-compose.yml` |
| **Asset** | AS-05 |
| **Probability** | 2 |
| **Impact** | 5 (forged JWTs → full data access → massive GDPR breach) |
| **Risk (P×I)** | **10 (High)** |
| **Mitigation** | `.env` git-ignored; `JWT_SECRET` generated via `openssl rand -hex 32` (setup §39.5 of KB); only injected at runtime; forbidden to print in logs (log redaction filter in `global_exception.filter.ts`); **guard re-reads roles from DB** on every request (ADR-004) — a leaked token remains bounded by `exp` (15 min); rotation procedure: `make rotate-jwt` (scripted, forces logout of all sessions) |
| **Residual Risk** | 3 (Low) |

### R-05 — Referential or domain invariant violation (data integrity)

| Field | Value |
|---|---|
| **Category** | Integrity / Technical |
| **Threat** | Concurrent stock mutation, missing FK, bug in domain layer |
| **Vulnerability** | Stock consumption under concurrent requests (ADR-008b risk if not applied) |
| **Asset** | AS-01, AS-02 |
| **Probability** | 3 |
| **Impact** | 3 (corrupted stock; non-reproducible catalogue availability) |
| **Risk (P×I)** | **9 (High)** |
| **Mitigation** | **Pessimistic locking (`SELECT … FOR UPDATE`)** in `PostgresStockRepository` (ADR-008b); `CHECK (current_units >= 0)` at DB; `CHECK (is_sellable = TRUE OR is_pizza_component = TRUE)`; `ON DELETE RESTRICT` on cross-aggregate FKs; partial unique index `uq_active_kitchen_configuration` (ADR-011); DB-suite concurrency test (`stock-concurrency.spec.ts`, §28.3) |
| **Residual Risk** | 2 (Low) |

### R-06 — GDPR personal data breach (external or internal)

| Field | Value |
|---|---|
| **Category** | Legal / Confidentiality |
| **Threat** | SQL injection, mass assignment, credential stuffing, insider misuse, backup theft |
| **Vulnerability** | Backend handles PII (names, emails, dietary restrictions); SMTP dispatch contains invitation tokens |
| **Asset** | AS-01, AS-02, AS-07, AS-08 |
| **Probability** | 2 |
| **Impact** | 5 (72h CNPD notification; potential fines up to 4% global turnover; reputational damage) |
| **Risk (P×I)** | **10 (High)** |
| **Mitigation** | Joi `stripUnknown` on all boundaries (§26); Argon2id hashing (64 MiB, 3 iters); `password_hash` nullable only when `external_idp_subject` set (ADR-010); `ON DELETE CASCADE`/`SET NULL` per §10.2; HTTPS/TLS 1.2+ via Nginx; backup encrypted at rest; **GDPR breach playbook** (Appendix D §D.8) with 72h SLA. |
| **Residual Risk** | 3 (Low) |

### R-07 — Backup retention failure / unrecoverable loss

| Field | Value |
|---|---|
| **Category** | Availability / Data |
| **Threat** | Backup volume corruption, undetected job failure, ransomware on the backup target |
| **Vulnerability** | No cross-region replication in Sprint 2; single `backups/` volume |
| **Asset** | AS-07 |
| **Probability** | 2 |
| **Impact** | 5 (permanent loss of operational data) |
| **Risk (P×I)** | **10 (High)** |
| **Mitigation** | **3-2-1 rule** (§5 SYS08): 3 copies, 2 media, 1 off-host; restore test mandatory `make restore-test` executed in CI (SYS08 §7); backups encrypted (age/GPG); retention 7 daily / 4 weekly / 12 monthly; RPO ≤ 24h; monthly restore drill |
| **Residual Risk** | 2 (Low) |

### R-08 — Ransomware on the host OS

| Field | Value |
|---|---|
| **Category** | Availability / Security |
| **Threat** | Malware exfiltration/encryption of Docker volumes |
| **Vulnerability** | Host OS is a single DEI-managed node |
| **Asset** | AS-01, AS-07, AS-09 |
| **Probability** | 1 (well-controlled DEI network — SYS02 enforces IP allowlist) |
| **Impact** | 5 |
| **Risk (P×I)** | **5 (Medium)** |
| **Mitigation** | SYS02 network restriction (only DEI IPs/VPN); SYS03 endpoint allowlist; SYS05 PAM time-based SSH; unattended-upgrades for OS packages; Docker runs as non-root; no host-mounted secrets from `/` |
| **Residual Risk** | 2 (Low) |

### R-09 — Dependency vulnerability (npm supply chain)

| Field | Value |
|---|---|
| **Category** | Technical |
| **Threat** | Known CVE in `@nestjs/*`, `openid-client`, `pg`, `argon2` |
| **Vulnerability** | `npm ci` installs from `package-lock.json`; no SCA on every PR (CI currently `workflow_dispatch` only) |
| **Asset** | AS-02 |
| **Probability** | 3 |
| **Impact** | 3 |
| **Risk (P×I)** | **9 (High)** |
| **Mitigation** | `npm audit --production` runs on every build; CI pipeline (enabled in Sprint 2) blocks merge on **critical** CVEs; Renovate weekly PRs; `package-lock.json` pinned in version control |
| **Residual Risk** | 4 (Medium — accepted due to academic context) |

### R-10 — Denial of Service on public endpoints

| Field | Value |
|---|---|
| **Category** | Availability / Security |
| **Threat** | `/auth/login` brute force, `/catalogue` scraping, `/auth/external/login` callback flooding |
| **Vulnerability** | Backend lacks a dedicated WAF |
| **Asset** | AS-02 |
| **Probability** | 3 |
| **Impact** | 2 |
| **Risk (P×I)** | **6 (Medium)** |
| **Mitigation** | Nginx `limit_req_zone` (10 r/s per IP on `/auth/*`); `client_max_body_size 8m`; Docker `--cpus` limit for the backend; JWT + Argon2id brute-force is naturally expensive; `Retry-After` header (SYS08 §25.2) |
| **Residual Risk** | 3 (Low) |

### R-11 — Insider misuse / privilege escalation (role abuse)

| Field | Value |
|---|---|
| **Category** | Security |
| **Threat** | A MANAGER self-promotes to super-admin; an EMPLOYEE escalates via mass assignment |
| **Vulnerability** | Roles are only enumerated `{MANAGER, EMPLOYEE, CUSTOMER}` but their assignment UI could be abused |
| **Asset** | AS-02, AS-08 |
| **Probability** | 2 |
| **Impact** | 4 |
| **Risk (P×I)** | **8 (High)** |
| **Mitigation** | `RolesGuard` re-reads roles from DB (ADR-004); invariant **≥1 active MANAGER** (§10.1 #19) prevents lockout; `role_change_logs` append-only; Joi `stripUnknown` blocks `roles` injection on `/auth/register`; `requireRole` middleware on every mutation endpoint (§23 RBAC matrix) |
| **Residual Risk** | 3 (Low) |

### R-12 — Time drift on OIDC / Kerberos-aligned systems

| Field | Value |
|---|---|
| **Category** | Availability / Authentication |
| **Threat** | Large clock skew between the backend container and the IdP |
| **Vulnerability** | Containers inherit host clock; no NTP enforcement documented |
| **Asset** | AS-02, AS-06 |
| **Probability** | 2 |
| **Impact** | 3 (ID Token exp validation fails → 503/401 for external users) |
| **Risk (P×I)** | **6 (Medium)** |
| **Mitigation** | Host configured with `chrony`/`systemd-timesyncd`; Nginx `Date` header sanity check on startup; documented in `sys-network-config.md §6`; alerts if drift > 5 minutes |
| **Residual Risk** | 2 (Low) |

---

### 4.1 Evidence references

The following references support the threat, vulnerability, likelihood and impact statements.
Live execution records are added to the referenced evidence paths after the VM validation
run; a design document alone is not treated as proof of execution.

| Risk | Supporting evidence |
|---|---|
| R-01 | `docs/asist/sys-backup-strategy.md`; `docs/asist/evidence/dr-drill-*.log` |
| R-02 | `backend/src/application/planning/`; Prolog health result in deployment log |
| R-03 | `docs/asist/sys-network-config.md`; OIDC endpoint configuration |
| R-04 | `.gitignore`, `.env.example`, `global_exception.filter.ts`, `make check-secrets` output |
| R-05 | `backend/tests/integration/`; `entity-schema-parity.spec.ts` |
| R-06 | `docs/gdpr-policy.md`; `scripts/pii-check.sh` output |
| R-07 | `scripts/backup.sh`, `scripts/restore-test.sh`; restore-test log |
| R-08 | `docs/asist/sys-network-config.md`; UFW and egress evidence |
| R-09 | `.github/workflows/ci.yml`; dependency audit output |
| R-10 | `frontend/nginx.conf`; smoke-test and access-log results |
| R-11 | `backend/src/presentation/http/middlewares/roles.guard.ts`; role audit log |
| R-12 | `docs/asist/sys-network-config.md §6`; `docs/asist/evidence/timezone.txt` |

---

## 5. Quantitative Evaluation (asset-level ALE)

`AV` and `EF` are best-effort estimates, on the basis of the project’s **final assessment
value** (§1.3 of KB) and the academic context of Sprint 2. Values are illustrative but
structurally sound — the objective is **relative prioritisation**, not audit-grade precision.

| Asset | AV (€-equivalent) | Primary threat | EF | SLE | ARO | ALE (€) |
|---|---|---|---|---|---|---|
| AS-01 (DB) | 5,000 | Loss of data | 0.8 | 4,000 | 0.25 | 1,000 |
| AS-05 (JWT) | 5,000 | Credential leak | 1.0 | 5,000 | 0.15 | 750 |
| AS-07 (Backups) | 3,000 | Loss | 1.0 | 3,000 | 0.10 | 300 |
| AS-08 (Audit) | 2,000 | Tampering | 0.5 | 1,000 | 0.05 | 50 |
| AS-09 (Host) | 10,000 | Ransomware | 0.9 | 9,000 | 0.02 | 180 |

Aggregated **ALE ≈ €2,280**. A post-mitigation ALE is not calculated because the register
does not contain defensible post-control frequency and impact estimates. The previous
"70% reduction" wording is therefore removed rather than presented as a measured result.

---

## 6. Risk matrix (visualisation)

```
Impact ↑
5 |       R-01 R-04 R-06 R-07
4 |       R-11
3 |       R-02 R-05 R-09
2 |       R-10 R-12
1 |
  +----+----+----+----+----→ Probability
    1    2    3    4
```

---

## 7. Residual Risk Acceptance

After the mitigation strategies above, the aggregated residual risk is:

| Risk | Residual | Accepted by |
|---|---|---|
| R-01 | 3 (Low) | Team lead |
| R-02 | 4 (Medium) | Team lead + IARTI owner |
| R-03 | 3 (Low) | Backend team |
| R-04 | 3 (Low) | Backend team |
| R-05 | 2 (Low) | Backend team |
| R-06 | 3 (Low) | Team lead + DPO |
| R-07 | 2 (Low) | ASIST owner |
| R-08 | 2 (Low) | ASIST owner |
| R-09 | 4 (Medium) | Team lead (academic scope) |
| R-10 | 3 (Low) | ASIST owner |
| R-11 | 3 (Low) | Team lead |
| R-12 | 2 (Low) | ASIST owner |

**Maximum residual risk = 4 (Medium)**, within the acceptance threshold defined in §2. No
residual risk remains in the **Critical** band; two are in the **High** band **before** mitigation
(R-01, R-04, R-06, R-07), all of which are addressed.

---

## 8. Review & Change Control

- **Frequency:** reviewed at the start of each sprint and whenever a new ADR is added.
- **Trigger events:** new external dependency, new data class, new deployment target, new
  Sprint-level user story with SYS scope.
- **Change log:** kept in the project’s Wiki (Sprint 2 §A.4).
- **Owner:** ASIST-responsible team member, with sign-off by the team lead and the DPO (for
  GDPR-relevant changes).

---

## 9. References

- ISO/IEC 27005:2022 — *Information security risk management*.
- ISO 31000:2018 — *Risk management guidelines*.
- ISO 22301:2019 — *Business continuity management systems* (see `sys-mbco.md`).
- LaPrizza KB v2.0 §5 (ADRs), §10 (invariants), §25.2 (status codes), §36 (Docker Compose).
- `sys-mbco.md`, `sys-backup-strategy.md`, `sys-network-config.md`, `gdpr-policy.md`.
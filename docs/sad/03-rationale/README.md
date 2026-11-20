# Architecture Decision Records — Index

**Project:** LaPrizza Information System — Team 3DJ-05
**Folder:** `docs/sad/03-rationale/`
**Count:** 24 ADRs (ADR-001 through ADR-018, with revisions ADR-002.2, ADR-003.2, ADR-004.2 and ADR-005.2, and two ADR-008 and two ADR-016 branches)
**Companion:** KB §5 (`docs/contents/laprizza-knowledge-base.md`)

---

## 1. What is an ADR

An Architecture Decision Record captures a *significant* architectural decision:
its context, the alternatives considered, the decision, and the consequences
(positive and negative). The code says **how**; the ADR says **why**.

The format follows the standard template (KB Master §19.1):

- **Status** — Proposed / Accepted / Superseded / Deprecated.
- **Context** — the problem and the forces at play.
- **Decision** — what was decided and how it is implemented.
- **Alternatives** — what else was considered and why it was rejected.
- **Consequences** — what the team gains and what it trades away.
- **Revision history** — what changed since the ADR was written.

---

## 2. Canonical index

| ADR file | Decision | Status | Date | Supersedes / Superseded by |
|---|---|---|---|---|
| `ADR-0001-architectural-style.md` | Layered Clean/Onion Architecture with Hexagonal Ports & Adapters | **Accepted** (rev. v3.0) | — | — |
| `ADR-002-stack-choosing.md` | Back-End technology stack (rev. v1 — initial) | **Superseded by ADR-002.2** | — | — |
| `ADR-002.2-stack-choosing.md` | Back-End technology stack (rev. v2.2) | **Accepted** | — | Supersedes `ADR-002` |
| `ADR-003-persistence.md` | PostgreSQL as the persistence engine (rev. v1) | **Accepted** (partially superseded) | — | Persistence scope superseded by `ADR-003.2` |
| `ADR-003.2-persistence.md` | PostgreSQL for business data; binary item pictures excluded from its scope | **Accepted** | 2026-11-19 | Partially supersedes `ADR-003` |
| `ADR-004-auth.md` | Original authentication decision (JWT + Argon2id), guard pipeline | **Accepted** (rev. v2.1; partially superseded) | — | Session verification and logout superseded by `ADR-004.2` |
| `ADR-004.2-auth.md` | PostgreSQL-backed revocable JWT sessions and domain encapsulation | **Accepted** | 2026-11-04 | Partially supersedes `ADR-004` |
| `ADR-005-rest-api.md` | REST style (Richardson L2) + OpenAPI 3.0 contract (rev. v1) | **Accepted** (partially superseded) | — | JSON-only representation clause superseded by `ADR-005.2` |
| `ADR-005.2-rest-api.md` | REST style + binary media representations for item pictures | **Accepted** | 2026-11-19 | Partially supersedes `ADR-005` |
| `ADR-006-automated-testing.md` | Multi-tiered automated testing (unit / app / integration / DB / Bruno) | **Accepted** | — | — |
| `ADR-007-api-testing-tooling.md` | Bruno (git-native `.bru`) over Postman for API testing | **Accepted** | — | — |
| `ADR-008-orm-adoption.md` | TypeORM 0.3 (Data Mapper) adoption | **Accepted** | 2026-10-28 | Supersedes the "native pg pool only" choice in `ADR-002.2` |
| `ADR-008-stock-concurrency-control.md` | Pessimistic locking (`SELECT … FOR UPDATE`) for stock adjustments | **Accepted** | 2026-10-30 | — |
| `ADR-009-frontend-framework.md` | Angular as the front-end SPA framework | **Accepted** | 2026-10-30 | Supersedes earlier React preference |
| `ADR-010-external-idp.md` | External IdP (OIDC) integration, Authorization Code + PKCE, JIT provisioning | **Accepted** | 2026-11-04 | — |
| `ADR-011-kitchen-configuration.md` | Kitchen Configuration — opaque JSONB + partial unique active index | **Accepted** | 2026-11-04 | — |
| `ADR-012-ai-planning-engine.md` | Prolog AI Engine — separated container, REST/JSON integration | **Accepted** | 2026-11-04 | — |
| `ADR-013-planning-results.md` | Immutable Planning Results with deep-copied snapshots | **Accepted** | 2026-11-04 | — |
| `ADR-014-3d-asset-pipeline.md` | GLTF 2.0 (GLB) as the exclusive 3D asset format | **Accepted** | 2026-11-04 | — |
| `ADR-015-unauthorized-access-logging.md` | Authenticated forbidden endpoint attempt audit in PostgreSQL | **Accepted** | 2026-11-04 | Complements `ADR-004` and `ADR-004.2` |
| `ADR-017-user-invitations.md` | Emailed user invitations and pending role replacement | **Accepted** | 2026-11-05 | Complements `ADR-004.2` and `ADR-016` |
| `ADR-016-password-recovery.md` | Email password recovery utility, SMTP, and one-use codes | **Accepted** | 2026-11-05 | Complements `ADR-004.2` |
| `ADR-018-item-pictures-volume.md` | Item pictures in a Docker volume, served and uploaded by the Back-End (`ImageController`) | **Accepted** | 2026-11-19 | Triggered `ADR-003.2` and `ADR-005.2` |

**Note on numbering.** The KB refers to *"ADR-008a"* (TypeORM) and *"ADR-008b"*
(stock locking) as distinct records, while the on-disk filenames are
`ADR-008-orm-adoption.md` and `ADR-008-stock-concurrency-control.md`. Both
representations are equivalent; the KB uses `a` / `b` for narrative clarity
because the two decisions are tightly related (both concern persistence
integrity), and the file names use descriptive titles because filenames
travel across tools that dislike `a`/`b` suffixes.

---

## 3. Grouping by sprint

### Sprint 1 baseline (ADR-001 through ADR-009, plus ADR-008a/b)

These decisions underpin the Modular Monolith, stack selection, persistence,
authentication, testing, tooling, ORM, stock concurrency, and SPA framework.

- ADR-001 — Architecture style
- ADR-002 / ADR-002.2 — Stack
- ADR-003 / ADR-003.2 — Persistence engine
- ADR-004 — Original authentication decision
- ADR-004.2 — Revocable JWT sessions and domain encapsulation
- ADR-005 / ADR-005.2 — REST API
- ADR-006 — Testing strategy
- ADR-007 — API testing tooling
- ADR-008a — TypeORM adoption
- ADR-008b — Pessimistic locking
- ADR-009 — Angular SPA

### Sprint 2 additions (ADR-010 through ADR-014)

These decisions introduce external authentication, dynamic 3D kitchen
configuration, AI planning over REST, immutable planning artefacts, and the
3D asset pipeline.

- ADR-010 — External IdP
- ADR-011 — Kitchen Configuration (JSONB & active invariant)
- ADR-012 — AI Planning Engine (Prolog via REST)
- ADR-013 — Immutable Planning Results
- ADR-014 — 3D Asset Pipeline (GLB)
- ADR-015 — Unauthorized endpoint attempt logging
- ADR-016 — Email password recovery

### Sprint 3 additions

- ADR-018 — Item pictures in a Docker volume served by the Back-End

---

## 4. Cross-cutting concerns (navigational view)

If you are looking for the decision about…

| Concern | ADR(s) |
|---|---|
| Overall architecture style | **ADR-001** |
| Language, framework, runtime, hash, validation, testing stack | **ADR-002.2** |
| Database engine | **ADR-003**, **ADR-003.2** |
| Authentication (JWT, Argon2id, sessions, OIDC, guards) | **ADR-004**, **ADR-004.2**, **ADR-010** |
| API conventions, status codes, OpenAPI | **ADR-005**, **ADR-005.2** |
| Test pyramid, coverage, DB isolation | **ADR-006** |
| API client tooling | **ADR-007** |
| Persistence framework and migration workflow | **ADR-008a** |
| Stock concurrency control | **ADR-008b** |
| Front-end framework | **ADR-009** |
| Email password recovery | **ADR-016** |
| Unauthorized endpoint attempt logging | **ADR-015** |
| External identity provider | **ADR-010** |
| Kitchen layout storage and single-active invariant | **ADR-011** |
| AI engine deployment and integration | **ADR-012** |
| Immutability of planning results | **ADR-013** |
| 3D asset format and pipeline | **ADR-014** |
| Item pictures (storage, upload, default picture) | **ADR-018** |

---

## 5. Supersession log

| Superseded ADR | Superseded by | Effective | Reason |
|---|---|---|---|
| Session verification and delayed invalidation in `ADR-004` | `ADR-004.2` | 2026-11-04 | Logout must immediately prevent reuse; introduce PostgreSQL-backed sessions while retaining bearer transport and Argon2id |
| Persistence scope in `ADR-003` | `ADR-003.2` | 2026-11-19 | Item pictures are stored in a Docker volume (ADR-018); PostgreSQL remains the store for business data |
| JSON-only representation clause in `ADR-005` | `ADR-005.2` | 2026-11-19 | The item picture resource (ADR-018) needs `multipart/form-data` uploads and native image responses |
| `ADR-002` (initial) | `ADR-002.2` | Acceptance of ADR-002.2 | Added Argon2id analysis, dropped the "native pg only" claim, revised the framework paragraph to reflect NestJS-internal conventions |
| "native pg pool only" clause in `ADR-002.2` | `ADR-008-orm-adoption` | 2026-10-28 | ADR-008a supersedes the raw-pool access path in favour of TypeORM 0.3 Data Mapper, while retaining the pg driver under the ORM |
| React preference (previously recorded in KB Master §8, now superseded) | `ADR-009` | 2026-10-30 | Team consolidation around Angular's integrated routing/forms/DI; the earlier React note remains visible in the KB's "comparative log" section for traceability |

**Rule.** An ADR is **never** edited to erase a superseded decision. The
history is preserved; the Status field and this log are the source of truth
for what is current.

---

## 6. How to read the ADRs — a guided path for evaluators

If you have ~20 minutes, read them in this order (each one builds on the
previous):

1. **ADR-001** — establishes the dependency rule that every other ADR obeys.
2. **ADR-002.2** — establishes the stack (Node.js / NestJS / PostgreSQL / Argon2id).
3. **ADR-003** — establishes why PostgreSQL (and not MongoDB) for LaPrizza's invariants.
4. **ADR-008a** — establishes how PostgreSQL is accessed (TypeORM Data Mapper).
5. **ADR-008b** — establishes the concurrency control for stock.
6. **ADR-004**, then **ADR-004.2** — read the original JWT decision followed by the revocable-session amendment and domain lifecycle rules.
7. **ADR-005** — establishes the API shape.
8. **ADR-006** and **ADR-007** — establish the testing strategy and tooling.
9. **ADR-009** — establishes the SPA that consumes everything.
10. **ADR-010 → ADR-014** — the Sprint 2 additions.

If you are auditing a **specific** feature, jump directly to §4 above.

---

## 7. References

- LaPrizza KB v2.0 §5 (ADR-001 through ADR-014).
- LaPrizza KB v2.0 §43 (Source Documents Cross-Reference).
- KB Master 4.1 §19 (ADR template and methodology).
- `docs/contents/laprizza-knowledge-base.md` (authoritative English edition).
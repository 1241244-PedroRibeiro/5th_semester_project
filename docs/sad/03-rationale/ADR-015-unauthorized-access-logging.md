# ADR 015: Logging Unauthorized Endpoint Attempts

- **Status:** Accepted
- **Date:** 2026-11-04
- **Decision Makers:** LaPrizza Development Team
- **Relationship:** Complements [ADR-004](ADR-004-auth.md) and [ADR-004.2](ADR-004.2-auth.md). Neither original decision is modified.

## Context

The application must record attempts by authenticated users to access endpoints for which they lack permission. Role and account-status guards reject requests, while controllers and application services can also reject ownership or other authorization checks. Logging only in individual guards would miss these later denials and duplicate persistence code.

The requested audit data is the user identifier, timestamp, and endpoint. PostgreSQL and TypeORM already provide the required persistence. This record is an infrastructure audit concern and does not introduce a domain entity.

## Decision

1. **Centralized recording:** The existing global exception filter records one attempt when an authenticated request produces HTTP `403 Forbidden`, whether the denial comes from a role/status guard, controller, or application service. The identity comes from the validated request user, never from request input or an unverified JWT payload.
2. **Persistence:** Create `unauthorized_attempts` with `user` (FK to `users.username`), `timestamp` (`TIMESTAMPTZ`, default `NOW()`), and `endpoint` (`TEXT`). A generated `BIGSERIAL` primary key distinguishes repeated or concurrent attempts. An index on `(user, timestamp)` supports audit lookup.
3. **Endpoint representation:** Store the HTTP method and registered route pattern, for example `GET /user/:username`. Exclude query strings, concrete path parameters, request bodies, headers, and credentials.
4. **Identity lifecycle:** New attempts require an authenticated username. The FK uses `ON DELETE SET NULL`, so deleting an account preserves its historical attempt rows without preventing account deletion. Anonymous requests, invalid/expired/revoked tokens (`401`), allowed requests, and errors with other status codes do not create these user-linked audit rows. Login denials without a verified request user are also excluded.
5. **Failure handling:** Await insertion before returning the usual `403` response. If audit persistence fails, keep the request denied and emit a generic server diagnostic without exposing database details or request contents. No retry queue or alternate durable storage is introduced.
6. **Infrastructure boundaries:** `IUnauthorizedAttemptRepository` defines the application-facing storage contract; `PostgresUnauthorizedAttemptRepository` and `UnauthorizedAttemptEntity` implement it. No domain class or public log-reading endpoint is added.
7. **Deployment:** TypeORM migration `UnauthorizedAttempts1793836801000` and standalone script `016_create_unauthorized_attempts_table.sql` create the same table and index. Both tolerate the other creation path running first and preserve existing records. The historical TypeORM baseline remains unchanged; apply forward migrations normally.

## Considered Alternatives

### 1. Log separately in authorization guards

- **Advantages:** Direct access to role/status denial decisions.
- **Disadvantages:** Misses ownership denials and service/controller authorization errors; repeats logging code across boundaries.

### 2. Record only application log messages

- **Advantages:** No additional table or migration.
- **Disadvantages:** Does not satisfy the requested relational record and user foreign key.

### 3. Record all rejected authentication attempts using decoded token subjects

- **Advantages:** Includes anonymous and invalid-token traffic.
- **Disadvantages:** Unverified subjects are not trustworthy user identifiers and may not reference a user row. That is a separate authentication-event logging requirement.

## Consequences

### Positive

- **Consistent coverage:** Authenticated `403` responses share one recording path, including ownership checks outside guards.
- **Useful audit data:** Each attempt has a database-generated timestamp, stable endpoint representation, and user relationship.
- **Preserved authorization:** Audit failures never permit a denied operation or expose internal storage errors to the caller.
- **Limited scope:** Uses existing persistence without introducing a domain model, external service, or log-management API.

### Negative / Trade-offs

- **Database work:** Every recorded denial requires an additional insert before the response.
- **Storage availability:** Failed inserts generate an operational diagnostic but cannot produce a durable audit row while storage is unavailable.
- **Bounded coverage:** Anonymous/invalid-token traffic is excluded. A deleted account leaves a null user reference; endpoint patterns do not retain concrete target identifiers.
- **Record growth:** The table grows with denied requests; no automatic retention or cleanup policy is introduced.

## Verification

HTTP tests verify role denials, status denials, controller ownership checks, repeated requests, trusted identity attribution, endpoint sanitization, and unchanged `403` behavior on storage failure. Allowed requests and `401` responses do not create rows. PostgreSQL tests verify defaults, foreign-key enforcement, preservation after account deletion, TypeORM schema alignment, rollback/reapplication, and repeated SQL/TypeORM creation without losing records.

## Revision History & Changes Noted (ADR-015 Revision v1.0)

- **2026-11-04:** Added infrastructure audit persistence for authenticated forbidden endpoint attempts, alongside SQL and TypeORM creation paths and verification.

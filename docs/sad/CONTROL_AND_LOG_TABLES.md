# Control and log tables

This document describes the five tables added for authentication control and account auditing, their TypeORM classes, and the code that writes them. It reflects the implementation as of **2026-11-06**.

## Overview

| Table | Purpose | ORM class |
| --- | --- | --- |
| `auth_sessions` | Control session expiration and revocation | [AuthSessionEntity](backend/src/infrastructure/persistence/entities/AuthSessionEntity.ts) |
| `password_recovery` | Control password-recovery validity, cooldown, and one-use consumption | [PasswordRecoveryEntity](backend/src/infrastructure/persistence/entities/PasswordRecoveryEntity.ts) |
| `unauthorized_attempts` | Record authenticated requests that receive 403 | [UnauthorizedAttemptEntity](backend/src/infrastructure/persistence/entities/UnauthorizedAttemptEntity.ts) |
| `roles_assignment` | Record the roles saved by an administrator | [RolesAssignmentEntity](backend/src/infrastructure/persistence/entities/RolesAssignmentEntity.ts) |
| `status_assignment` | Record initial account status and subsequent status changes | [StatusAssignmentEntity](backend/src/infrastructure/persistence/entities/StatusAssignmentEntity.ts) |

The ORM classes map PostgreSQL rows. Only sessions also have a corresponding domain class, [AuthSession](backend/src/domain/user/AuthSession.ts). Recovery and audit records are utility infrastructure outside the application domain.

## 1. Session control — `auth_sessions`

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | UUID, PK | Unique session identifier, included in the JWT as `sid` |
| `username` | VARCHAR, FK | Account identifier referencing `users.username` |
| `expires_at` | TIMESTAMPTZ | Session expiration |
| `revoked_at` | TIMESTAMPTZ, nullable | Revocation time; NULL means no recorded revocation |

[JwtTokenService](backend/src/infrastructure/security/JwtTokenService.ts) creates a session when issuing a JWT after login or registration. [AuthGuard](backend/src/presentation/auth.guard.ts) checks the stored session for protected requests. A session must belong to the token's user, be unexpired, and have no revocation time.

`POST /auth/logout` calls [AuthService.logout](backend/src/application/auth/AuthService.ts), revokes the current session, and persists it through [PostgresAuthSessionRepository](backend/src/infrastructure/persistence/repositories/PostgresAuthSessionRepository.ts). Password recovery also revokes the recovered account's sessions. Deleting an account cascades to its sessions. The table has an expiration index.

- SQL: [015_create_auth_sessions_table.sql](backend/src/infrastructure/persistence/migrations/015_create_auth_sessions_table.sql)
- ORM migration: [AuthSessions1793836800000](backend/src/infrastructure/persistence/orm-migrations/1793836800000-AuthSessions.ts)

## 2. Password-recovery control — `password_recovery`

| Field | Type | Meaning |
| --- | --- | --- |
| `recovery_code` | VARCHAR(64), PK | SHA-256 digest of the emailed code; the raw code is not stored |
| `email` | VARCHAR, FK | Account email referencing `users.email` |
| `timestamp` | TIMESTAMPTZ | Code generation time, default NOW() |
| `status` | VARCHAR, CHECK | PENDING or USED; default PENDING |

[PasswordRecoveryService](backend/src/application/auth/PasswordRecoveryService.ts) handles `POST /password-recovery` and `POST /password-recovery/new_pass`. [PostgresPasswordRecoveryStore](backend/src/infrastructure/persistence/repositories/PostgresPasswordRecoveryStore.ts) stores and consumes the records using transactions and account-row locks.

Only ACTIVE accounts can request or consume a code. A code is usable once within **5 minutes**, and requests have a **30-minute cooldown**, including after successful use. Successful consumption updates the password, marks the code USED, and revokes existing sessions atomically. Email-submission failure rolls back code creation. Expired unused codes remain PENDING but cannot be consumed.

The email FK cascades account email updates and account deletion. The table has an `(email, timestamp)` index.

- SQL: [018_create_password_recovery_table.sql](backend/src/infrastructure/persistence/migrations/018_create_password_recovery_table.sql)
- ORM migration: [PasswordRecovery1793923200000](backend/src/infrastructure/persistence/orm-migrations/1793923200000-PasswordRecovery.ts)

## 3. Forbidden-request log — `unauthorized_attempts`

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | BIGSERIAL, PK | Unique audit-record identifier |
| `user` | VARCHAR, nullable FK | Authenticated account referencing `users.username` |
| `timestamp` | TIMESTAMPTZ | Event time, default NOW() |
| `endpoint` | TEXT | HTTP method and registered route pattern |

[GlobalExceptionFilter](backend/src/presentation/global_exception.filter.ts) records a row through [PostgresUnauthorizedAttemptRepository](backend/src/infrastructure/persistence/repositories/PostgresUnauthorizedAttemptRepository.ts) when the final response is **403**, an authenticated username is available, and the request matches a registered route. This includes role, status, ownership, and other authenticated forbidden-operation failures.

The endpoint value contains a method and route template, such as `PUT /user/:username/roles`. Query parameters, headers, request bodies, and raw request URLs are not persisted. Anonymous 401 responses do not enter this table.

If audit storage fails, the operation remains denied and the filter logs the storage failure. Deleting the actor sets `user` to NULL and preserves the audit row. The table has a `(user, timestamp)` index.

- SQL: [016_create_unauthorized_attempts_table.sql](backend/src/infrastructure/persistence/migrations/016_create_unauthorized_attempts_table.sql)
- ORM migration: [UnauthorizedAttempts1793836801000](backend/src/infrastructure/persistence/orm-migrations/1793836801000-UnauthorizedAttempts.ts)

## 4. Role-assignment log — `roles_assignment`

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | BIGSERIAL, PK | Unique history-record identifier |
| `assigned_from` | VARCHAR, FK | Assigning administrator referencing `users.username` |
| `role` | VARCHAR, FK | Assigned role referencing `user_roles.name` |
| `assigned_to` | VARCHAR | Recipient's email at the time of assignment |
| `timestamp` | TIMESTAMPTZ | Event time, default NOW() |

[UserService.setRoles](backend/src/application/user/UserService.ts) calls [RolesAssignmentService.recordAssignments](backend/src/application/user/RolesAssignmentService.ts) immediately after `await this.userRepo.save(user)`. [PostgresRolesAssignmentRepository](backend/src/infrastructure/persistence/repositories/PostgresRolesAssignmentRepository.ts) inserts one row per distinct role in the resulting selection.

The actor comes from the authenticated administrator; the recipient email comes from the stored target account. Another successful save can record the same role again. Existing rows remain unchanged. The records describe the resulting role assignments; they do not create separate role-removal events. Registration and invitation flows do not call this particular role-history hook.

`assigned_from` is a **foreign key**, rather than the primary key, so the same administrator can make multiple assignments. Both actor and role deletion are restricted while referenced. `assigned_to` is an email snapshot, not an FK, so later email changes do not rewrite history. Indexes cover actor/time and recipient/time.

This table is separate from [UserRoleAssignmentEntity](backend/src/infrastructure/persistence/entities/UserRoleAssignmentEntity.ts), which maps `user_role_assignments` and stores current membership.

- SQL: [019_create_roles_assignment_table.sql](backend/src/infrastructure/persistence/migrations/019_create_roles_assignment_table.sql)
- ORM migration: [RolesAssignment1794009600000](backend/src/infrastructure/persistence/orm-migrations/1794009600000-RolesAssignment.ts)

## 5. Account-status log — `status_assignment`

| Field | Type | Meaning |
| --- | --- | --- |
| `id` | BIGSERIAL, PK | Unique history-record identifier |
| `assigned_from` | VARCHAR, nullable FK | Acting account referencing `users.username` |
| `status` | VARCHAR, CHECK | ACTIVE, DEACTIVATED, or PENDING_REGISTRATION |
| `assigned_to` | VARCHAR | Recipient's email at the time of the event |
| `timestamp` | TIMESTAMPTZ | Event time, default NOW() |

[StatusAssignmentService.recordAssignment](backend/src/application/user/StatusAssignmentService.ts) writes through [PostgresStatusAssignmentRepository](backend/src/infrastructure/persistence/repositories/PostgresStatusAssignmentRepository.ts). It is called after successful account persistence in [AuthService](backend/src/application/auth/AuthService.ts) and [UserService](backend/src/application/user/UserService.ts).

| Trigger | Recorded status | Actor |
| --- | --- | --- |
| New public registration | ACTIVE | Newly registered user |
| New invitation or staff pre-registration | PENDING_REGISTRATION | Authenticated inviter |
| Completion of pending registration | ACTIVE | Registering user |
| Administrator reactivation | ACTIVE | Authenticated administrator |
| Permitted deactivation | DEACTIVATED | Authenticated administrator or self-deactivating customer |

Invitation resends, role-only edits, and repeating deactivation on an already DEACTIVATED account do not add status events. Failed validation, authorization, or account persistence does not add history. The actor is supplied by the controller or derived from self-registration, not taken from body input.

Hard-deleting the actor sets `assigned_from` to NULL while retaining the history. Normal deactivation retains attribution. Recipient email remains a historical snapshot. Indexes cover actor/time and recipient/time.

- SQL: [020_create_status_assignment_table.sql](backend/src/infrastructure/persistence/migrations/020_create_status_assignment_table.sql)
- ORM migration: [StatusAssignment1794009601000](backend/src/infrastructure/persistence/orm-migrations/1794009601000-StatusAssignment.ts)

## Applying and maintaining the tables

From the repository root:

```bash
npm --prefix backend run migration:run
```

The backend's local database environment must already be configured. The linked SQL scripts provide the standalone creation path; their matching forward ORM migrations preserve existing records when the table has already been created. All five entities are exported through the [entity registry](backend/src/infrastructure/persistence/entities/index.ts). Historical baseline adoption excludes these forward entities until their migrations run.

Role and status history writes are awaited **after** their account save, in a separate transaction. A history-storage failure returns an error but does not roll back the already committed account change. This differs from password recovery, whose code consumption, password update, and session revocation share a transaction.

Existing accounts and historical actions are not backfilled. No automatic audit-retention or cleanup policy is introduced. Seed/import fixtures bypassing these application services do not create history events.

For the wider schema, see [Database Structure](docs/sad/08-database-structure.md) and the [migration instructions](backend/src/infrastructure/persistence/migrations/README.md).

# ADR 016: Email Password Recovery

- **Status:** Accepted
- **Date:** 2026-11-05
- **Decision Makers:** LaPrizza Development Team
- **Relationship:** Complements ADR-004/ADR-004.2 authentication and session revocation. Earlier ADRs are preserved.

## Context

All account roles need a way to recover a forgotten password using a registered email address. Only ACTIVE accounts may receive or consume a recovery code. A code is usable once within five minutes; another request is forbidden for 30 minutes after generation, including after successful use. The records support a utility workflow and must not introduce a domain entity.

## Decision

1. Expose public `POST /password-recovery` with `{email}` and `POST /password-recovery/new_pass` with `{recovery_code, new_password}`. No bearer token is necessary because a user who forgot their password may not be logged in. Controller inputs come only from the request body and reject unexpected fields.
2. Generate an unpredictable 32-byte hexadecimal code. Email the raw code and store its SHA-256 digest in `password_recovery.recovery_code`; codes are never returned through the API or logged. The table has `email` (FK to unique `users.email`, cascading email updates/account deletion), `timestamp`, `recovery_code` (PK), and `status` constrained to PENDING/USED.
3. Serialize issue/reset operations with a PostgreSQL lock on the account row. Request processing checks ACTIVE status and the latest generation time, inserts PENDING, and submits the email inside the transaction. An SMTP submission failure rolls back the record and permits retry. External mail delivery is not transactionally atomic: SMTP acceptance does not guarantee inbox delivery, and a lost SMTP acknowledgement may leave a delivered but rolled-back code.
4. Reset processing locks and checks the account and record, rejects unknown, expired, and USED codes, applies the existing password policy (8–128 characters for recovery), and hashes the password with Argon2id. Update the password, mark USED, and revoke all sessions for that account in one transaction. Concurrent reset attempts can succeed only once. No automatic login occurs.
5. Use Nodemailer with sender `"LaPrizza" <laprizzag05@gmail.com>` and local environment variables `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`. Port 587 requires STARTTLS; 465 uses implicit TLS. SMTP configuration is checked when mail is requested so missing credentials do not prevent unrelated API use. No SMTP secrets are committed or exposed in errors.
6. Use a shared Angular recovery form in both existing login layouts. It supports requesting email, pasting an existing code, choosing/confirming a password, resending after cooldown, and returning to sign-in. Keep codes/passwords in component memory only. Public recovery requests do not carry a saved bearer token; code-related 401 errors stay inline and do not clear an unrelated signed-in session.

## Considered Alternatives

### Raw recovery-code persistence

Simpler manual lookup, but a database read would reveal usable reset credentials. Store digests and deliver raw codes only through email.

### Stateless recovery tokens

Avoids a recovery table but complicates one-use enforcement and the per-account 30-minute cooldown. The required PostgreSQL record gives both explicit state and serialization.

### Require authentication or administrator intervention

Does not support the forgotten-password use case for locked-out users. Public endpoints still require control of the emailed credential before any password changes.

## Consequences

### Positive

- Every active role can recover without an existing login.
- Database locking enforces cooldown and one-use behavior across API instances.
- Password, USED state, and session revocation change atomically.
- Reuses existing password hashing, persistence, mail environment configuration, and office visual themes; no recovery domain class is added.

### Negative / Trade-offs

- SMTP settings and a sender-authorized password must be configured for real delivery. Tests use a local SMTP sink; the application does not expose an inbox/code-reading endpoint.
- SMTP submission occurs while the account lock is held, with bounded network timeouts.
- Expired codes remain PENDING unless consumed successfully; expiry is determined by timestamp, and the cooldown lasts 30 minutes even though validity is five minutes.
- Explicit unknown/inactive-account errors and cooldown messages follow the requested contract and can reveal account eligibility. Anonymous reset attempts do not lock accounts or change passwords.
- Recovery history grows over time; no automatic deletion policy is introduced.

## Verification

PostgreSQL/HTTP tests cover all roles, inactive/pending/unknown accounts, input validation, hash-only persistence, cooldown and concurrent issuance, successful reset, code expiry/reuse, concurrent consumption, login with the new password, and session revocation. A local SMTP server verifies actual Nodemailer message submission, sender, recipient, code, and timing text. Migration tests cover schema alignment and repeated SQL/TypeORM creation. Playwright covers both office forms, narrow/wide layouts, mismatched passwords, cooldown/service errors, and invalid/USED/expired codes without unintended login redirects.

Bruno includes at most five requests per endpoint. Successful resets require a code read from the test account's real inbox; the expiry case uses a separate expired PENDING code. Test artifacts never return raw credentials from the API.

## Revision History & Changes Noted (ADR-016 Revision v1.0)

- **2026-11-05:** Added utility email password recovery, SMTP delivery, public endpoints, SQL/ORM persistence, and responsive customer/staff forms.

## References

- [Nodemailer SMTP transport](https://nodemailer.com/smtp)
- [OWASP Forgot Password guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)

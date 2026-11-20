ma# ADR 017: Emailed User Invitations

- **Status:** Accepted
- **Date:** 2026-11-05
- **Decision Makers:** LaPrizza Development Team
- **Relationship:** Complements ADR-004/ADR-004.2 and ADR-016; earlier ADRs remain unchanged.

## Context

Administrators and managers need to invite an unregistered email with a role, notify the recipient, and revise the role before registration completes. Existing pre-registration already models pending users, while the current backoffice form asks for names and sends no email.

## Decision

1. Add `POST /auth/invite` to AuthController and `invite` to AuthService. Require ACTIVE ADMINISTRATOR or MANAGER and JSON `{email, roleName}`; accept the four existing application roles. Keep the legacy administrator-only `/auth/pre_register` behavior.
2. Reuse the existing User and PENDING_REGISTRATION status. Normalize email, reject registered/deactivated accounts, create a random unusable initial password, and use placeholder names until registration. Repeated invitations replace the pending role, preserving identity. No additional schema or domain class is necessary.
3. Inject a utility invitation mailer using the existing SMTP settings and sender `laprizzag05@gmail.com`. Email instructions to open LaPrizza and use its normal Register button with the same email. No activation link/token or expiry is added.
4. Normal registration replaces pending names with the submitted name, hashes the chosen password, activates the account, retains its roles, and issues the normal session.
5. Save pending state before email submission. Return 503 on configuration/SMTP failure; preserve state so the inviter can retry. Return 201 only after SMTP acceptance; duplicate requests may resend email. SMTP acceptance does not guarantee inbox delivery.
6. Adapt the existing responsive Users invitation modal to email/role. Allow managers to view/filter/paginate the user list and send invitations; retain role editing and deactivation for administrators. Surface email errors inside the modal.

## Considered Alternatives

### A separate invitation table and activation token

Would add an independent lifecycle rather than the requested normal-registration behavior. Reuse pending accounts.

### Roll back the account when email fails

Would lose the assigned invitation after a mail outage. Saved pending state allows explicit retries and role updates.

## Consequences

### Positive

- Existing account, role, password and SMTP infrastructure is reused.
- Invitations can be corrected before normal registration.
- No schema migration is required.

### Negative / Trade-offs

- Both authorized roles can invite any supported role, including ADMINISTRATOR, as requested.
- Normal registration follows existing pre-registration semantics and does not require an emailed token as proof of email ownership.
- Delivery is synchronous, bounded by SMTP timeouts, and retry may produce duplicate messages.
- Placeholder names appear in pending-user listings until registration completes.

## Verification

HTTP tests cover administrator/manager invitations, denied roles/status, validation, role replacement, normal registration, registered-email conflicts and email-failure retries. A local SMTP test verifies sender, recipient, role, registration instructions and TLS settings without delivering real messages. Browser tests cover the form, manager access, inline errors and narrow/wide layouts. Bruno provides five manual requests.

## Revision History & Changes Noted (ADR-017 Revision v1.0)

- **2026-11-05:** Added emailed invitations and pending-role replacement with normal registration completion.
- **2026-11-06:** Restored the user list for managers alongside invitations, including matching read permissions. Account management remains administrator-only.

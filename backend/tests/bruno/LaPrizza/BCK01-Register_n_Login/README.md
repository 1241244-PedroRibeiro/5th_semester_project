Run this folder sequentially, including `00 - Setup`, with Local selected. Setup logs in the seeded manager, registers and logs in a fresh customer, pre-registers staff and logs in the seeded active customer. Tokens and usernames are captured from responses. Registration bodies contain firstName, lastName, email and password, with no username input.

The username is the email local part, an underscore, then the first domain character. The collision requests reuse the fresh customer's local part with example.net and example.org, verifying suffixes 2 and 3. The original login still verifies the original customer's username.

Seeded local fixtures use password **Manager123!**:

| Email | Role | Status | Login result |
| --- | --- | --- | --- |
| manager@laprizza.test | MANAGER | ACTIVE | 200 |
| deactivated-manager@laprizza.test | MANAGER | DEACTIVATED | 403 |
| pending-manager@laprizza.test | MANAGER | PENDING_REGISTRATION | 400 |
| customer@laprizza.test | CUSTOMER | ACTIVE | 200 |
| deactivated-customer@laprizza.test | CUSTOMER | DEACTIVATED | 403 |
| pending-customer@laprizza.test | CUSTOMER | PENDING_REGISTRATION | 400 |

These fixtures are defined in development seeds. Requests 26, 27, 34 and 35 now verify that locally signed legacy JWTs without a persisted session are rejected with **401** even when their signatures are valid. They no longer simulate authenticated inactive/pending sessions. The Jest/Supertest status matrix creates a real session before changing account status and retains coverage of **403** for those authenticated requests. Normal Bruno tokens must come from login or registration; knowing the signing secret alone does not create a server session.

Pre-registration requires an active manager. Customer attempts fail authorization; inactive/pending managers fail the status guard. Errors use `{error: {message}}`. BCK02 creates separate accounts and does not deactivate these fixtures. Test users and invitations remain after a run.


Logout uses `POST /auth/logout` with the current bearer token and returns `204` after PostgreSQL revocation. The same token must then receive `401` on protected reads and writes. Independent logins remain active. Automated replay and unchanged-data assertions are covered in `tests/integration/auth.controller.spec.ts` and `tests/integration/typeorm-api.postgres.spec.ts`.

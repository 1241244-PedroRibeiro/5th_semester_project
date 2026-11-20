# User invitations

For the Docker Compose environment, use `https://localhost/api` as
`baseUrl`. The backend is intentionally not published on host port 3000;
requests enter through the HTTPS reverse proxy.

Run the five requests in order against a test environment. Set `baseUrl` and active fixture credentials `inviteAdministratorEmail`/`inviteAdministratorPassword`, `inviteManagerEmail`/`inviteManagerPassword`, and `inviteCustomerEmail`/`inviteCustomerPassword`. Configure backend SMTP to a test mail server that accepts `@example.test`, or change request 01 to a controlled inbox. The first two successful requests send email; do not run against real recipients unintentionally.

01 creates a pending EMPLOYEE invitation as administrator; 02 replaces that same invitation role with MANAGER and resends email. 03 expects 403 as customer; 04 expects 409 for the signed-in manager's registered email; 05 expects 400 without a role. API bodies contain `{email, roleName}`. If SMTP is unavailable, success requests instead return 503 and keep pending state for retry.

Inspect the test inbox to confirm instructions to use the normal Register button. Complete registration with the request-01 email, own first/last name and a valid password; the result should be ACTIVE with MANAGER role, and another invitation to it should return 409. Automated HTTP and local SMTP tests cover these behaviors without sending external mail.

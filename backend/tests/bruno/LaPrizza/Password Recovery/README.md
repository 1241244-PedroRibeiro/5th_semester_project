# Password recovery

There are exactly **five requests per endpoint**, covering success, malformed/invalid input, the active-account rule, cooldown, expiry, password policy, and one-use behavior. These endpoints are public; no login token is needed. The backend/database and configured SMTP service must be available. Codes are delivered only by email and never returned through the API.

Set these local Bruno environment variables before running:

- `baseUrl`: backend origin, normally `http://localhost:3000`.
- `recoveryEmail`: a registered **ACTIVE** account with an inbox you control. Use a dedicated test account: the successful reset changes its password and ends its existing sessions.
- `recoveryNewPassword`: a new test password satisfying the existing policy (8–128 characters, uppercase, lowercase, number, symbol).
- `recoveryCode`: copy the complete code from the email immediately after request-code test 01. It expires **5 minutes after generation**.
- `recoveryExpiredCode`: a separate, unconsumed (`PENDING`) code older than 5 minutes, for the expiry case. It may belong to a second dedicated test account.
- Optional `recoveryInactiveEmail`: defaults to the seeded deactivated customer; it must refer to an inactive/pending account to exercise that case.

Run request-code cases first; case 02 must follow the successful request to verify the **30-minute cooldown**. Copy the emailed code and run reset cases 01–04 within five minutes. Case 03 also verifies login with the new password and captures the consumed code for case 04. Run expiry case 05 with its separate expired code. No automated five-minute sleep or database mutation is hidden in the collection. Used codes still count toward the request cooldown.

Expected errors: invalid email/body or weak password `400`; unknown valid-format code `401`; unknown/inactive account `404`; consumed code `409`; expired code `410`; cooldown `429` (with `Retry-After`); SMTP/configuration failure `503`. No raw code, password, or password hash is returned in API responses. Do not commit inbox codes or SMTP credentials. SMTP settings belong in the backend's local `.env`, not Bruno.

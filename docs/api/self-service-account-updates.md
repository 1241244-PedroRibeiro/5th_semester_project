# Self-service name, email and password updates

The authenticated account can update its own details using the routes below. Backend paths start with `/user`; the Angular proxy exposes them under `/api/user`. All three use bearer authentication, derive identity from `@CurrentUser`, require status `ACTIVE`, and support customers, managers and employees. Clients must not submit a username, role, status or user ID.

| Method and backend path | JSON body | Success |
| --- | --- | --- |
| `PUT /user/me/name` | `{ "firstName": "Ana", "lastName": "Silva" }` | `200`, public user summary |
| `PUT /user/me/email` | `{ "email": "ana@example.test", "currentPassword": "…" }` | `200`, public user summary |
| `PUT /user/me/password` | `{ "currentPassword": "…", "newPassword": "…" }` | `200`, public user summary |

Names are trimmed and each part must contain 1–75 characters. Email uses the existing `Email` value object: format validation, whitespace trimming and lowercase normalization. Another account's email is rejected; database uniqueness failures during concurrent writes also map to `409`.

Email and password changes compare the submitted current password with the stored hash through the existing Argon2id hasher. Passwords are never trimmed or normalized. A replacement password follows the registration policy: at least eight characters, uppercase, lowercase, numeric and non-whitespace special characters. The shared backend rule is `domain/user/PasswordPolicy.ts`; `AuthService.validatePassword()` delegates to it. Only a newly generated hash is persisted.

Responses contain `username`, `firstName`, `lastName`, `createdAt`, `email`, `roles` and `status`. They never contain passwords, password hashes or a replacement token. Username and account creation time remain stable. Changing email changes the address used for subsequent login; changing password makes the previous password fail subsequent login. These endpoints do not implement email ownership confirmation or JWT revocation: existing signed JWTs remain valid until normal expiry, subject to existing account/status checks. Cookies and CSRF remain a separate proposed migration in ADR-010.

## Errors

Errors retain `{ "error": { "message": "..." } }`.

| Status | Meaning |
| --- | --- |
| `400` | Missing/invalid fields, unsupported properties, invalid names/email or weak replacement password |
| `401` | Missing/invalid/expired authentication, or account absent during authentication |
| `403` | Inactive account or incorrect current password |
| `404` | Account disappears after authentication but before service lookup |
| `409` | Email belongs to another account |

An incorrect current password returns `403` rather than `401` so the frontend can show the validation error without clearing an otherwise valid login session. Infrastructure failures retain the existing generic `500` handling.

## Implementation

- [UserController](../../backend/src/presentation/http/controllers/UserController.ts) declares the PUT routes with the same active-account convention as contact updates.
- [UserService](../../backend/src/application/user/UserService.ts) whitelists request fields, verifies passwords, checks uniqueness and returns public DTOs.
- [User](../../backend/src/domain/user/User.ts) owns name/email/password changes and advances `updatedAt`.
- [PostgresUserRepository](../../backend/src/infrastructure/persistence/repositories/PostgresUserRepository.ts) persists changed identity fields in the existing aggregate transaction. Existing columns and indexes suffice; no schema migration is required.
- [AuthModule](../../backend/src/presentation/auth.module.ts) exports the existing password-hasher provider for `UserService`.

## Backoffice UI

`/backoffice/profile` shows an explicit Name row and Change name, Change email and Change password buttons. The area-owned `AccountDetailsEditor` at `frontend/src/app/backoffice/shared_components/account-details-editor/` composes the shared modal and template-driven forms. Inputs are `mode` and `user`; outputs are `saved` and `closed`.

Email changes require the current password. Password changes require current/new passwords and a matching confirmation; confirmation is checked in the UI and is not sent to the API. Failed requests keep the dialog open and display the backend error. Password fields clear after each submitted request. Native modal behavior and busy state prevent background edits and repeated submission; phone/address changes also prevent opening an account editor while a contact write is running.

After a confirmed response, shared `Auth.updateUser()` updates the displayed identity, sidebar initials and persisted public user summary while retaining the existing token and session/local-storage choice. No password is put in browser storage. Frontoffice credential forms retain their existing unavailable state; this change wires the backoffice only.

## Verification

Unit and HTTP tests cover ownership, active status, invalid input, duplicate email, wrong current password, registration password policy and secret-free responses. HTTP security tests use real Argon2id hashing. PostgreSQL API coverage verifies persistent name/email changes, preservation of contacts and login with the new credentials while old credentials fail. Playwright covers responsive dialogs, inline password errors, matching confirmation and updated session identity after reload.

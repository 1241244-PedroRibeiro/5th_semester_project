# AA02 - External Identity Provider (OIDC)

This folder tests the HTTP boundaries, security constraints, and error handling of the external authentication flow (OIDC Authorization Code + PKCE). 

Because the full "happy path" requires a real user to authenticate on the external IdP (e.g., Google, Microsoft, or Keycloak) and generate a valid authorization code, this suite focuses on what can be deterministically tested at the API boundary: redirect generation, CSRF protection, and input validation.

| Request | Actor | Endpoint | Expected result |
| --- | --- | --- | --- |
| 01 | Public | `GET /auth/external/login` | `302 Found`. Redirects to IdP with `state`, `code_challenge` (S256), and sets the HttpOnly `oidc_ctx` cookie. |
| 02 | Public | `GET /auth/external/callback` | `302` (error redirect) or `400`. Rejects if `code` and `state` are missing. |
| 03 | Public | `GET /auth/external/callback?error=access_denied` | `302`. Redirects to SPA with `?error=cancelled` when the user cancels at the IdP. |
| 04 | Public | `GET /auth/external/callback?code=fake` | `302`. Rejects with `?error=invalid_state` if the `oidc_ctx` cookie is missing (CSRF protection). |
| 05 | Public | `POST /auth/external/exchange` | `400` or `401`. Rejects if the payload is missing the `code` field. |
| 06 | Public | `POST /auth/external/exchange` | `401 Unauthorized`. Rejects fake, expired, or already-used exchange codes. |

## Note on Execution

Request 01 requires the `followRedirects` setting to be **disabled** in Bruno (or set to `false` in the `.yml` file) so the `302 Found` status and the `Location` header can be properly asserted.

The actual OIDC callback (exchanging the real `code` for a token) and the successful internal `exchange` flow cannot be fully automated in Bruno without a real browser interaction. These successful logic paths, including JIT (Just-In-Time) user provisioning and account-linking conflict detection, are heavily covered by the Jest unit tests (`external-auth.service.spec.ts`).

## Security Assertions in this Suite

- **PKCE Generation (Req 01):** Ensures the backend requires `S256` code challenges, preventing authorization code interception attacks.
- **Session Fixation / CSRF (Req 04):** Ensures the callback cannot be exploited without the server-issued, signed `oidc_ctx` cookie. 
- **Code Replay (Req 06):** Ensures the short-lived exchange code store correctly rejects unknown or already-consumed codes.
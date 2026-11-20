# ADR 010: External Identity Provider (OIDC) Integration

- **Status:** Accepted
- **Date:** 2026-11-04
- **Decision Makers:** LaPrizza Development Team

## Context
User Story **AA02 (External Identity Provider Integration)** requires the system to support authentication through an external Identity Provider (IdP) using OpenID Connect (OIDC) with OAuth 2.0. According to the System Specification, this is a strategic requirement to allow users to securely access the integrated application without relying solely on local credentials. 

Client Clarification #25 explicitly states that any OIDC-compliant provider (e.g., Google, Microsoft, Auth0, Keycloak) is acceptable, leaving the architectural choice to the team. Clarification #27 further mandates that the first login via an external IdP must trigger *Just-In-Time (JIT) provisioning*: an active internal `User` account (with the `CUSTOMER` role) is created automatically, bypassing the need for an activation invitation.

The primary architectural challenge is integrating this external flow without compromising the internal Role-Based Access Control (RBAC) system, and without violating the security constraint that external passwords must **never** be collected or stored by the LaPrizza system (AA02). Furthermore, the internal `User` entity must be able to link seamlessly to external identities while preserving the system's strict adherence to **business identifiers** over technical UUIDs.

## Decision
We adopt the **Authorization Code Flow with Proof Key for Code Exchange (PKCE)** via the `openid-client` library integrated into the NestJS backend. 

The integration is structured as follows:
1. **Frontend Initiation:** The Angular SPA redirects the user to the external IdP's authorization endpoint.
2. **Callback Handling:** Upon successful authentication, the IdP redirects the user back to a dedicated backend callback endpoint (`/api/v1/auth/external/callback`) with an authorization code.
3. **Token Exchange:** The backend securely exchanges the authorization code for an ID Token and Access Token directly with the IdP's token endpoint.
4. **Identity Mapping (Business Key Linkage):** The backend extracts the `sub` (subject) claim from the verified ID Token. This stable, unique identifier is stored in the `users` table within a new column: `external_idp_subject`. The internal `User` aggregate remains identified by its business key (`username` or `email`), preserving the domain model's integrity.
5. **JIT Provisioning:** If no internal `User` exists with the matching `external_idp_subject` (or email), the backend creates a new `User` entity using the email as the foundational business identifier. The `password_hash` column is left **NULL**. The user is assigned the `CUSTOMER` role and their status is set to `ACTIVE` (as their identity is already verified by the IdP).
6. **Internal Session Issuance:** The backend generates the standard internal JWT (with internal roles and claims) and returns it to the SPA, standardizing all subsequent API interactions and ensuring the `RolesGuard` remains the single source of truth for authorization.

## Alternatives Considered

### 1. Direct OAuth 2.0 (without OIDC)
- *Description:* Using OAuth 2.0 solely for authorization without the OIDC identity layer.
- *Pros:* Slightly simpler protocol footprint.
- *Cons:* Rejected. OAuth 2.0 provides access tokens, not identity assertions. The system needs to know *who* the user is (identity) to provision a local `User` account and assign roles. OIDC provides the standardized ID Token containing the necessary claims (email, `sub`) to establish the business identity.

### 2. Long-term Storage of External Access Tokens
- *Description:* Storing the IdP's access and refresh tokens in the database to perform actions on behalf of the user later.
- *Pros:* Enables future integrations with third-party APIs (e.g., Google Calendar).
- *Cons:* Rejected. Storing external tokens introduces significant security risks (token leakage) and complex lifecycle management (revocation, expiry). It violates the principle of least privilege and pollutes the domain model with external integration concerns.

### 3. Frontend-Only Token Exchange
- *Description:* The SPA handles the entire OIDC flow and sends the ID token directly to the backend.
- *Pros:* Reduces backend complexity.
- *Cons:* Rejected. It exposes the IdP client secret to the browser (if applicable) or relies entirely on PKCE without a confidential client. It also makes it harder for the backend to securely validate the token's origin and perform JIT provisioning without trusting the frontend implicitly.

## Consequences

### Positive
- **Zero Password Liability:** The system never sees or stores external passwords, eliminating a massive attack vector.
- **Seamless Onboarding (JIT):** Clarification #27 is fully satisfied. Customers can use their existing Google/Microsoft accounts and immediately start using the platform without email confirmation loops.
- **Identity Stability:** Storing the `sub` claim instead of relying solely on email addresses is robust against user email changes on the IdP side. The internal `User` aggregate remains firmly rooted in its internal business identifier (`username`).
- **Unified RBAC:** Once the internal JWT is issued, the `RolesGuard` and `UserStatusGuard` operate exactly the same way for local and external users, maintaining architectural consistency.

### Negative / Trade-offs
- **External Dependency:** The login flow depends on the availability of the external IdP. If the IdP suffers an outage, external users cannot log in (though local users can).
- **Account Linking Complexity:** If a user registers locally (`email@example.com`) and later tries to log in via an IdP with the same email, the system must handle the collision. The current decision dictates that if the email exists but the `external_idp_subject` does not, the system will reject the login or require an authenticated linking process in the SPA to prevent account takeover.
- **Schema Nullability:** The `password_hash` column in the `users` table must be made `NULLABLE` via a database migration to support external-only users.
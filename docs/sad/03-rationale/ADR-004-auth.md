# ADR 004: Authentication, Authorization, and Session Management Strategy

* **Status:** Accepted
* **Context:**
The LaPrizza information system operates with distinct categories of actors (e.g., Managers, Kitchen Staff, Customers) requiring role-based access control (RBAC) to differentiate permissions and restrict protected operations (LEI-2026-27-Sem5-Project_v1-SystemSpecification.pdf, pp. 3, 11).
User Story `BCK01` (User and Authentication Management) mandates that the system maintain registered users, handle secure authentication credentials, enforce roles to distinguish permitted operations, and establish an authorized identity for all subsequent protected requests (LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, p. 5).
Furthermore, individual user stories require operations such as catalogue management, product creation, component configuration, and stock adjustments to be restricted to administrative roles, while customer registration and product catalogue consultation remain publicly or customer-accessible (LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, pp. 5-10).

From an architectural standpoint, HTTP is inherently a stateless protocol that does not inherently maintain user identity across request/response cycles (02 - Node.js - v2.pdf, p. 73).
Additionally, REST architectural principles mandate stateless client-server interactions where no client session state is retained within the server memory (ARQSI_03_REST architectural style.pdf, p. 21; 02 - Node.js - v2.pdf, p. 76).
We must select an authentication mechanism and credential-handling architecture that complies with these security and scalability requirements.

* **Decision:**
We adopt a **Stateless Token-Based Authentication architecture utilizing JSON Web Tokens (JWT, RFC 7519)** combined with **Argon2id password hashing**, structured as follows:

1. **Credential Storage & Invariant Protection:** User passwords are never stored in plain text; they are hashed using **Argon2id** (`argon2` package), providing state-of-the-art memory-hard protection against GPU/ASIC brute-force attacks in accordance with OWASP standards (02 - Node.js - v2.pdf, p. 83). In persistence mappings, credential attributes are protected by default (e.g., hidden from projection queries) to avoid accidental leakage during user profile reads (02 - Node.js - v2.pdf, pp. 82, 90).
2. **Stateless JWT Claims & Issuance:** Upon successful authentication (`POST /api/v1/auth/login`), the server signs and returns a compact JWT containing standard claims: `sub` (User ID), `role` (assigned authorization role), `iat` (issued at), and an explicit expiration timestamp (`exp`, e.g., 15 minutes to 24 hours) signed with a secure HMAC secret (02 - Node.js - v2.pdf, pp. 80-81, 85).
3. **Transport & Delivery Mechanism:** Client requests transmit the token inside standard HTTP authorization headers (e.g., `Authorization: Bearer <token>`) (02 - Node.js - v2.pdf, pp. 77, 87, 89).
4. **Boundary Authentication Middleware:** A decoupled Nest.js guard/middleware intercepts incoming requests to protected routes, verifies token cryptographical integrity against the server secret, checks expiration, and mounts the decoded user claims onto the request context before passing control to downstream handlers (02 - Node.js - v2.pdf, p. 87).
5. **Role-Based Authorization Middleware (RBAC):** High-order authorization guards (e.g., `@Roles('MANAGER')`) enforce permission guards at the routing perimeter; requests with insufficient role privileges are rejected immediately with HTTP `403 Forbidden` without triggering application service execution (02 - Node.js - v2.pdf, pp. 88, 90; 01 - Introduction to Web Development.v2.pdf, p. 49).

* **Considered Alternatives:**
### 1. Traditional Stateful Session-Based Authentication (Server-Side Sessions & Cookies)


* *Description:* Generating a random session identifier stored in server memory (or in a centralized cache like Redis) and issuing a stateful `Set-Cookie` header to the browser (02 - Node.js - v2.pdf, pp. 74-75).
* *Pros:* Immediate token invalidation and revocation; sessions can be terminated instantly by removing the session key from server memory (02 - Node.js - v2.pdf, p. 74).
* *Cons:* Violates REST Architectural Principle 4: "Communicate statelessly" (ARQSI_03_REST architectural style.pdf, p. 21); hampers horizontal scalability because stateful servers require session affinity/sticky sessions or an external centralized shared memory cluster (02 - Node.js - v2.pdf, p. 74; ARQSI_04_architectural_styles.pdf, p. 25); exposes web clients to Cross-Site Request Forgery (CSRF) vulnerabilities unless accompanied by additional anti-CSRF token machinery (02 - Node.js - v2.pdf, p. 74).


### 2. HTTP Basic Authentication


* *Description:* Transmitting Base64-encoded username and password strings inside the `Authorization: Basic` header on every single request.
* *Pros:* Trivially simple to implement; natively stateless.
* *Cons:* Re-exposes raw user credentials over the network on every single HTTP transaction, increasing the surface area for credential interception; requires client applications to store the raw password in local storage or memory; lacks granular expiration mechanisms and native claim payload attachments.


### 3. External Identity Provider / OAuth2 / OpenID Connect (e.g., Keycloak / Auth0)


* *Description:* Delegating user identity, login workflows, and token issuance entirely to an external dedicated IAM server (ARQSI_04_architectural_styles.pdf, p. 69; C4_Model_Complete_BSc.pdf, p. 14).
* *Pros:* Production-grade enterprise authentication, multi-factor authentication (MFA), and unified single sign-on (SSO) across systems (C4_Model_Complete_BSc.pdf, p. 14).
* *Cons:* Introduces substantial architectural infrastructure complexity and external server dependencies that are disproportionate during the initial Sprint 1 phase, where `BCK01` expressly requires the team to establish the fundamental credential and user entities directly within the back-end application (LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, p. 5; principios orientadores ARQSI - English.pdf, p. 2).




* **Consequences:**
### Positive


* **Full Statelessness and Scalability:** No session state is held in server memory, allowing the back-end service to scale horizontally behind a load balancer without sticky sessions or distributed session synchronization (02 - Node.js - v2.pdf, p. 76; ARQSI_04_architectural_styles.pdf, p. 25).
* **CSRF Mitigation:** Because tokens are sent via explicit HTTP request headers (`Authorization: Bearer`) rather than ambient browser cookie storage, API endpoints are naturally resilient against standard Cross-Site Request Forgery attacks (02 - Node.js - v2.pdf, p. 76).
* **Decoupled Cross-Origin Interoperability:** Suitable for cross-origin setups (CORS) between decoupled front-end SPAs, mobile interfaces, or 3D visualization clients and the back-end API (02 - Node.js - v2.pdf, pp. 62, 76).
* **Self-Contained Verification:** Intermediate micro-services or API routing layers can verify user identity and inspect role claims directly from the cryptographic signature without querying the primary database on every single request (02 - Node.js - v2.pdf, pp. 80, 90).
* **Strict Curriculum Alignment:** Accurately reflects the reference authentication and security patterns detailed in the course material while adopting modernized OWASP cryptographic recommendations (02 - Node.js - v2.pdf, pp. 71-90).


### Negative / Trade-offs


* **Delayed Privilege Revocation:** Because JWT verification is self-contained and stateless, permission changes or role revocations do not take immediate effect until the current token reaches its expiration date (`exp`), representing an accepted trade-off between database query overhead and immediate revocation (02 - Node.js - v2.pdf, p. 90).
* **Payload Size and Secret Governance:** Storing extensive claims bloats HTTP header sizes; the cryptographic signing secret (`JWT_SECRET`) must be managed securely through environment variables and never checked into source control (02 - Node.js - v2.pdf, p. 80; base-project-prompts.md, p. 1).



---

## Revision History & Changes Noted (ADR-004 Revision v2.1)

* **Status:** Accepted.
* **Cryptographic Harmonization (bcrypt -> Argon2id):** Updated password hashing from `bcrypt` to `Argon2id` (`argon2` package) to align ADR 004 perfectly with ADR 002 and the project's concrete implementation (`Argon2Hasher.ts`).
* **Framework Integration Update:** Updated middleware references to reflect Nest.js guards and decorators (`@Roles`) in accordance with ADR 002 and Nest.js architecture.
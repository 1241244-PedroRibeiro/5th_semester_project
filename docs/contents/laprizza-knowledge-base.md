# Knowledge Base: LaPrizza — Enterprise Restaurant & Kitchen Management System (Master Edition v2.7)

> **Current clarification status (20 November 2026):** Clarifications #55–#58
> are recorded in [`client-questions.md`](../domain/client-questions.md).
> #55 supersedes older AI06 sections describing a backend-pushed data payload:
> current code is not yet conformant; the target has Prolog retrieve business
> data through authorized backend API reads and construct its own per-run KB.
> #56 confirms replay semantics, while the new-run past-date case is unresolved.
> SYS07 targets remain proposals pending ASIST PL instructor validation (#57);
> dietary-data classification remains a team decision (#58). See the roadmap
> for current status and actions.

> **Metadata:** Version 2.7 (Master) | Domain: ISEP LEI 5th Semester Integrative Project (LAPR5 + ARQSI + ASIST + IART + SGRAI) | Academic Year: 2026/2027 | Last updated: November 2026
>
> **Repository:** `LEI-SEM5-PI-2026-27-3DJ-05`
>
> **Team 3DJ-05:**
> - Eduardo Vasconcelos (1240697) — BCK01, BCK02, BCK07
> - Afonso Mota (1241225) — BCK08, BCK09
> - Gustavo Silva (1241235) — BCK10, BCK11
> - Pedro Ribeiro (1241244) — BCK03, BCK04, BCK05, BCK06
>
> **Purpose of this Knowledge Base:**
> This document is the **single source of truth** for the LaPrizza information system. It consolidates all business context, requirements, client clarifications, architectural decisions, ADRs, domain model, persistence strategy, API contracts, testing approach, infrastructure, and sprint status. It is intended to be loaded into any AI assistant or consulted directly so that no external file lookup is required for context. Every architectural decision, business invariant, and API contract described in this document is derived from the source artifacts enumerated in §43.
>
> **Suggested System Prompt for AI Chat:**
> *"Use this Knowledge Base as the absolute source of truth for the LaPrizza project. When responding, cite the section (e.g., §5.3 or §24.2) to justify architectural, code, or process decisions. Strictly follow the decisions recorded in ADR-001 through ADR-017, the Clean/Onion Architecture rules, the Hexagonal Ports & Adapters boundaries, and the Business-Key (no technical UUID in relationships) persistence rule. If a question is not covered, explicitly say 'The LaPrizza KB does not cover this topic' instead of inventing an answer. Distinguish clearly between what is implemented in the current baseline and what is planned for future sprints."*

---

## Table of Contents

**PART I — FOUNDATIONS: Business & Requirements**
1. Executive Summary & Business Context
2. Stakeholders, Personas & Roles
3. Engineering Principles & Architectural Guidelines
4. Key Architectural Scenarios
5. Architecture Decision Records (ADR-001 through ADR-017)
6. Requirements Engineering & Client Clarifications
7. Ubiquitous Language Glossary

**PART II — DOMAIN MODEL & RATIONALE**
8. Domain Model (Aggregates, Entities, Value Objects)
9. Domain Model Rationale & Decision Logs
10. Business Invariants & Referential Integrity

**PART III — SYSTEM ARCHITECTURE (C4 Model)**
11. System Context (C4 Level 1)
12. Container Diagram (C4 Level 2)
13. Component Architecture (C4 Level 3)
14. Use Cases & Functional Scope
15. Multi-Disciplinary Integration Points

**PART IV — PERSISTENCE & DATA**
16. Persistence Strategy (DDD → PostgreSQL)
17. Physical DDL by Bounded Module
18. Concurrency Control & Transaction Demarcation
19. ERD & Referential Integrity Matrix
20. CQRS Read Views & Indexing Strategy
21. TypeORM Implementation

**PART V — API CONTRACTS**
22. REST API Design Specification
23. RBAC Endpoint Permissions Matrix
24. DTO Contracts & Payload Specifications
25. Standardized Error Envelope & HTTP Status Matrix
26. Input Boundary Validation Architecture
27. OpenAPI 3.0.3 Contract Reference

**PART VI — TESTING & QUALITY**
28. Automated Testing Strategy
29. API Testing Tooling (Bruno)

**PART VII — SPRINT STATUS & ROADMAP**
30. Sprint 1 Status & Deliverable Verification
31. Sprint 2 Scope & Objectives
32. Engineering Roadmap & Milestones
33. Frontend SPA (Angular)
34. 3D Visualization (SGRAI / Three.js)
35. Prolog AI Scheduling (IART)

**PART VIII — INFRASTRUCTURE & OPERATIONS**
36. Docker Compose & Deployment
37. CI Pipeline (GitHub Actions)
38. Makefile & Operational Commands
39. Angular + Docker + Nginx + HTTPS Setup

**PART IX — REFERENCE**
40. Repository File Map
41. Version History & Document Evolution
42. AI-Assisted Engineering Disclosure
43. Source Documents Cross-Reference

**APPENDICES**
- Appendix A: Complete API Endpoint Quick Reference
- Appendix B: Business Rules Quick Reference
- Appendix C: Glossary PT ↔ EN (Legacy)
- Appendix D: GDPR Compliance & Personal Data Policy

---

# PART I — FOUNDATIONS: Business & Requirements

## 1. Executive Summary & Business Context

### 1.1. What LaPrizza Is

**LaPrizza** is a modern pizza restaurant enterprise operating within the casual-dining sector. It specializes in customisable, on-demand food preparation and multi-channel order fulfilment. In the academic context of the 5th-semester Integrative Project at ISEP (2026/2027), student teams act as **independent IT software companies** competing through a formal **Request for Proposal (RFP)** procurement process. Each team delivers an incremental prototype across **three 14-week sprints**.

The LaPrizza prototype adopts a deliberately **simplified** product, pizza-configuration, stock, and operational model, focused on demonstrating technical integration, architectural soundness, and professional delivery — not industrial-scale complexity.

### 1.2. The Problem Being Solved

Restaurant operations depend on several interdependent concerns:

- **Products** serve different commercial and operational purposes: some are sold directly (beverages, sides), while others are used as **components in pizza configuration** (doughs, sauces, cheeses, toppings).
- **Stock control** determines the operational availability of some products; depletion of a single ingredient may invalidate an entire pizza-size offering.
- **Allergen information** must be propagated accurately from products to configured pizzas, ensuring customer safety and regulatory compliance.
- **Customer orders** generate preparation work that must be coordinated across **finite kitchen resources** (preparation stations, ovens).
- **3D visualization** and **AI scheduling** are strategic add-ons introduced in later sprints, whose contracts must remain compatible with the back-end foundation delivered in Sprint 1.

### 1.3. Sprint Structure & Deliverables

| Sprint | Dates | Focus |
|---|---|---|
| **Sprint 1** | Week 1 (14/09/2026) — Week 6 (25/10/2026) | Project setup, engineering practices, domain modelling, architectural foundation, Back-End MVP (BCK01–BCK11 + ARC01–ARC05 + ENG01–ENG03) |
| **Sprint 2** | Week 7 (26/10/2026) — Week 10 (22/11/2026) | Web SPA (Angular), 3D Kitchen Visualization (Three.js), Prolog BOM & Requirements Planning, External IdP (OIDC), Kitchen Configuration, AI Planning Engine, ASIST infrastructure, GDPR |
| **Sprint 3** | Week 11 (23/11/2026) — Week 14 (20/12/2026) | Integration, animation of 3D assembly line, end-to-end consolidation |
| **Final Assessment** | 04/01/2027 — 15/01/2027 | All participating UCs |

Each sprint results in a **Minimum Viable Product (MVP)** — a working and integrated iteration, not a collection of disconnected prototypes.

### 1.4. Core Business Invariants (Sprint 1 + Sprint 2 Baseline)

1. **User vs Customer separation:** A `User` models identity, credentials, lifecycle, and role memberships. A `Customer` represents commercial data (mandatory: First Name, Last Name, Phone Number, Email). Kiosk customers are anonymous — no persistent `Customer` record. A `Customer` may optionally link to a `User` via `username`.
2. **Product role multiplicity:** Every product satisfies `(isSellable || isPizzaComponent) === true`. Products cannot exist exclusively for stock tracking. Pizza components link to exactly one `PizzaComponentType`. A predefined pizza product is `isSellable=true` and **must not** be `isPizzaComponent`.
3. **Pure additive pricing:** Predefined pizzas carry **no base price** and **no labour surcharge**. Price = sum of component prices for the selected size (Clarification #05).
4. **Abstract stock units:** Stock is measured in **discrete, non-negative integers** ($u \in \mathbb{N}_0$). Size availability requires $\text{currentUnits} \ge \text{stockUnitsConsumed}$ for every stock-controlled component (Clarification #01 Q5).
5. **Business Keys over technical UUIDs:** Aggregate identities and cross-aggregate references use **Business Keys** (`username`, `email`, `sku`, `name`, `supplier_code`). UUIDs are **not** used in relational links; SERIAL is only used for log/transactional artefacts with no natural business key (`role_change_logs`, `planning_results`, `customer_orders`). **Exception:** `auth_sessions.id` is a UUID (unpredictable per-login identifier carried in JWT `sid`, per Clarification #29/#34); it references its owner by `username` FK and is not used as a business identity for other aggregates.
6. **Immutable AI planning artefacts (Sprint 2):** `PlanningResult` snapshots inputs (forecast, scenario, stock) at execution time. Replays use the original dataset. Planning **never** mutates stock (Clarifications #26, #28). **Per Clarification #30**, proposals are indivisible lots and late deliveries are explicitly labelled. **Per Clarification #37**, planning considers pending deliveries as an input and stock must be available by end of previous day.
7. **Single active kitchen configuration (Sprint 2):** At most one `KitchenConfiguration` may have `is_active = true` (ADR-011 partial unique index).
8. **Zero external-password storage (Sprint 2):** External IdP accounts store only `external_idp_subject`; `password_hash` is nullable. `(passwordHash ≠ null) ∨ (externalIdpSubject ≠ null)` is enforced per `User` (ADR-010).
9. **Inactivity-based sessions with per-device logout (Sprint 2):** `AuthSession` validity requires both `now < expiresAt` AND `now − lastActivityAt < SESSION_INACTIVITY_MINUTES`. Logout revokes **only the current session**; other sessions of the same account remain active (Clarifications #29, #34).
10. **PredefinedPizza has no own stock (Sprint 2):** A `Product` backing a `PredefinedPizza` MUST NOT have `isStockControlled = true`. Stock is tracked at the **component** level and deducted on order confirmation (Clarification #35; consistent with #12). Reinforced by Clarification #38 — a predefined pizza is **not** a conventional sellable product with its own stock.
11. **Non-pizza products in forecasts (Sprint 2):** `ConsumptionForecast` entries cover **all** sellable products. Non-pizza sellable products use `pizza_size = NULL` and are planned via `products.stock_units_per_sale` (Clarification #36).
12. **Distinct ADMINISTRATOR role (Sprint 2, supersedes Sprint-1-only #04):** The Sprint 2 role taxonomy is `{ADMINISTRATOR, MANAGER, EMPLOYEE, CUSTOMER}` (Sprint 2 US Table 1, Clarification #42). The `ADMINISTRATOR` role owns **user account management** (AA06/AA07), **application access logs** (Clarification #42), and **account-related data-protection requests**. Clarification #04 (Sprint 1) that excluded `ADMINISTRATOR` is **superseded** for Sprint 2 scope. Infrastructure/system logs are outside the web role taxonomy (Clarification #42).
13. **Password recovery is a first-class aggregate (Sprint 2, ADR-016):** Password recovery uses a dedicated `password_recovery` table (not `ActivationInvitation`, which was the earlier #32 reading), with single-use, TTL-bound tokens. Reinforced by ADR-016 and migration `018_create_password_recovery_table.sql`. Clarification #32's "single-use link" is satisfied by this design; the KB's earlier hint to reuse `ActivationInvitation` was an implementation choice and is superseded by ADR-016.
14. **Pending deliveries are a planning input (Sprint 2, Clarification #37):** Planning considers an explicit `pendingDeliveries[]` list of `{productSku, quantity, expectedDeliveryDate}`. The Prolog algorithm must treat those quantities as available from `expectedDeliveryDate` onward. Stock required for consumption on day `N` must be physically available by **end of day `N−1`** (Clarification #37 "Additional note").
15. **Confirmation dialogues on significant actions (Sprint 2, Clarification #39):** Delete, deactivate user, role changes, and (future) order cancellation MUST present a confirmation dialogue. UI timeouts are configurable (no imposed maximum); retries must be idempotent-safe.
16. **Bounded Context rule (Sprint 2, Clarification #46):** One container = one bounded context is a default; one container hosting multiple bounded contexts is fine; **splitting a bounded context across multiple containers is the anti-pattern to avoid**. The Modular Monolith (ADR-001) complies.

---

## 2. Stakeholders, Personas & Roles

### 2.1. Role Taxonomy (Sprint 2 Baseline — supersedes Sprint 1 taxonomy)

The `UserRole` enumeration is `{ADMINISTRATOR, MANAGER, EMPLOYEE, CUSTOMER}` in Sprint 2 (Sprint 2 US Table 1; Clarifications #42, #46; ADR-016/ADR-017; migration `1793836802000-AdministratorRole`). **Sprint 1 baseline (per Clarification #04) did not include `ADMINISTRATOR`** — this was **superseded** by Sprint 2 Table 1 and Clarification #42 which explicitly distinguish application-log access by `ADMINISTRATOR`. "Restaurant Staff" in Sprint 2 Table 1 maps to `EMPLOYEE`.

| Role | Responsibilities | Scope |
|---|---|---|
| **`ADMINISTRATOR`** | Website user account management, activation invitations, roles, access permissions; **consultation of application access logs (Clarification #42)**; handling of account-related data-protection requests. Access to restaurant management operations requires the corresponding additional website role (per Sprint 2 Table 1). | AA06, AA07, AA05 (audit endpoint); excludes restaurant operations unless additional role. |
| **`MANAGER`** | Full restaurant administrative governance: catalogue maintenance (categories, allergens, products, sizes, component types, configurations, stock), predefined pizza recipes, kitchen configurations, consumption forecasts, supplier scenarios, AI planning execution, product export. Access to customer data limited to what is needed for these responsibilities. | All BCK01–BCK11 (except user account administration, which is ADMINISTRATOR) + WEB05, WEB06, WEB07, AA05 (permitted operations only). |
| **`EMPLOYEE`** | Read-only operational visibility on catalogue, stock and orders; kitchen preparation in later sprints; **kitchen viewer access**. | Read endpoints on catalogue/stock/kitchen; future preparation state transitions. |
| **`CUSTOMER`** | Account self-registration (after activation), profile management, dietary restrictions, catalogue browsing, external IdP first login (JIT), order placement (Sprint 3). | Own profile endpoints; public catalogue; future order placement. |
| **Guest / Public** | Unauthenticated visitor (kiosk or web). | Public catalogue browsing, public registration endpoint, public allergen/size endpoints, external IdP login initiation, privacy notice. |

**Additional design notes:**
- A `User` may hold **multiple roles simultaneously** (`Set<UserRole>`). **Per Clarification #33**, multi-role users accumulate permissions but remain subject to data-ownership and confidentiality restrictions per operation and per resource — `RolesGuard` alone is insufficient; resource-level authorization is required.
- Restaurant Staff == Employee (confirmed in Clarification #25).
- The "first Administrator" created at installation is a **functional designation** owned by the `MANAGER` role per Clarification #24 §1.1, **not** by the `ADMINISTRATOR` role. In Sprint 2, `ADMINISTRATOR` is introduced as a **distinct role** (Sprint 2 Table 1, Clarification #42) — the "first Administrator" concept from #24 §1.1 is **distinct from the `ADMINISTRATOR` role** and refers to the first bootstrap `MANAGER` account.
  - **Note on terminology tension:** Clarification #24 §1.1 used "Administrator" to describe the bootstrap MANAGER. Sprint 2 Table 1 formally introduces `ADMINISTRATOR` as a distinct role. The KB reconciles this by treating them as **two distinct concepts** with shared colloquial vocabulary. When precision is required, prefer: "bootstrap Manager" for #24 §1.1, and "`ADMINISTRATOR` role" for Sprint 2 Table 1 / Clarification #42.
- A `User` holding the `CUSTOMER` role (whether via self-registration, JIT external login, or Manager assignment) **must** have an associated `Customer` record (Clarification #27).
- Application logs (denied access attempts) are **only consultable by `ADMINISTRATOR`** (Clarification #42). Infrastructure/system logs are outside the web role taxonomy.

### 2.2. Personas

- **Restaurant Manager** — administrative, needs to maintain all catalogues and see dependencies before deleting referenced entities.
- **Restaurant Employee** — operational, inspects preparation queue in future sprints, coordinates baking, consults kitchen viewer.
- **Website Administrator** — manages website user accounts, activation invitations, roles, and application access logs. Distinct from Manager, though a single account may hold both.
- **Registered Customer** — self-registers, browses catalogue, configures pizzas (Sprint 2+), places orders (Sprint 3).
- **External-IdP Customer** — authenticated via OIDC (Google/Microsoft/Auth0/Keycloak); JIT-provisioned as `ACTIVE CUSTOMER` on first login (Clarification #27).
- **Anonymous Kiosk Customer** — no persistent record; browses public catalogue, places anonymous order (later sprint).
- **Automated Integrators** — SGRAI 3D canvas, IART Prolog scheduler, monitoring services.

### 2.3. Team Composition (Class 3DJ Group 05)

| Member | Student ID | Allocation |
|---|---|---|
| Eduardo Vasconcelos | 1240697 | BCK01, BCK02, BCK07 |
| Afonso Mota | 1241225 | BCK08, BCK09 |
| Gustavo Silva | 1241235 | BCK10, BCK11 |
| Pedro Ribeiro | 1241244 | BCK03, BCK04, BCK05, BCK06 |

**Assessment principle:** While team classification underpins individual grades, self/peer evaluation can reduce individual classifications if contribution is demonstrably below expectations.

---

## 3. Engineering Principles & Architectural Guidelines

### 3.1. Modular Monolith with Clean/Onion Layering + Hexagonal Ports & Adapters

The back-end is packaged as a **single deployable unit** (Modular Monolith) but internally partitioned into discrete business modules: `IdentityAndAccess`, `Customer`, `ProductCatalogue`, `PizzaTaxonomy`, `StockInventory`, `PredefinedPizza`, `CatalogueQuery`, `KitchenConfiguration`, `AIPlanning`. This follows the "First Commandment of Distributed Systems" — *do not distribute* — avoiding latency, eventual consistency, and deployment overhead unsuited to an iterative academic prototype. This design is **explicitly compliant with Clarification #46**: one container hosts multiple bounded contexts (allowed); no bounded context is split across containers.

Architecturally, the codebase combines **Clean/Onion Architecture** (concentric layering + Dependency Rule) with **Hexagonal Ports & Adapters** at architectural boundaries (ADR-001). Clean/Onion provides the concentric layering and the inward dependency direction; Hexagonal provides explicit inbound and outbound ports that document and decouple boundary crossings. **Ports do not replace Clean/Onion — they complement it.** Using ports only at architectural boundaries (not for every internal class) avoids over-interfaceing while preserving testability and replaceability.

### 3.2. The Dependency Rule

Source code dependencies point **exclusively inward** toward the domain. The domain layer (entities, value objects, domain services) knows nothing about NestJS, Express, PostgreSQL, TypeORM, or HTTP. Controllers and repositories are adapters at the boundary. ORM decorators (`@Entity`, `@Column`) never appear on domain classes.

Four concentric layers (ADR-001):

1. **Presentation / Interface Adapters** — Controllers, Guards, Pipes, Joi validation, inbound Ports
2. **Application Services** — Use cases, transaction demarcation, DTO assembly, outbound Ports required by use cases
3. **Domain Core** — Entities, Aggregates, Value Objects, Domain Services, business invariants, Port interfaces owned by the domain
4. **Infrastructure / Persistence Adapters** — PostgreSQL repositories (TypeORM Data Mapper), Data Mappers, security adapters (Argon2, JWT), OIDC client, Prolog HTTP client, SMTP adapters

**Ports and Adapters (Hexagonal style)** apply at architectural boundaries only — not for every internal class. Adapters depend on ports; ports and inner layers do not depend on adapters.

### 3.3. Ports & Adapters

- **Inbound ports (driving):** Interfaces exposed by Application Services for controllers (implicit via service interfaces used in dependency injection).
- **Outbound ports (driven):** Interfaces owned by the domain/application layer and implemented by infrastructure adapters:
  - Persistence: `IUserRepository`, `ICustomerRepository`, `IProductRepository`, `IPizzaComponentTypeRepository`, `IStockRepository`, `IPredefinedPizzaRepository`, `ICatalogueQueryRepository`, `IKitchenConfigurationRepository`, `IConsumptionForecastRepository`, `ISupplierScenarioRepository`, `IPlanningResultRepository`, `IActivationInvitationRepository`, `IRoleChangeLogRepository`, `IAuthSessionRepository`, **`IRolesAssignmentRepository`**, **`IStatusAssignmentRepository`**, **`IPasswordRecoveryStore`**, **`IExchangeCodeStore`**, `IUnauthorizedAttemptRepository`.
  - External gateways: `OidcClient` (openid-client), `PrologHttpClient` (HTTP), `SmtpInvitationMailer`, **`SmtpRecoveryMailer`**, `Argon2Hasher`, `JwtTokenService`, `PasswordPolicy`.
- **Driving adapters (primary):** NestJS REST controllers (`AuthController`, `ExternalAuthController`, `PasswordRecoveryController`, `UserController`, `BackofficeUsersController`, `KitchenConfigurationController`, `PlanningController`, etc.). An administrator-only audit controller remains a planned Sprint 2 surface.
- **Driven adapters (secondary):** PostgreSQL repositories (all `Postgres*Repository.ts`), external IdP client, Prolog HTTP client, SMTP adapters.

### 3.4. Domain-Driven Design (DDD)

- **Ubiquitous Language:** Every business term in the glossary is used identically in code, diagrams, database schema, and client conversations.
- **Business Keys:** Aggregate identities and cross-aggregate references use business keys (`username`, `email`, `sku`, `name`, `supplier_code`), not technical UUIDs. SERIAL is used only for audit/transactional artefacts with no natural business key (`RoleChangeLog.log_id`, `PlanningResult.execution_id`, `CustomerOrder.order_number`). **Exception:** `AuthSession.id` is a UUID (unpredictable per-login identifier) — see Clarifications #29/#34.
- **Aggregates** are consistency boundaries. Cross-aggregate references use only business identity.
- **Value Objects** are immutable, self-validating, and behavior-rich (`Money`, `Email`, `CardinalityBounds`, `AbstractStockQuantity`, `PurchaseProposal` fields `meetsRequiredDate`/`lateByDays`, `PasswordPolicy`).
- **Rich Entities:** No anemic domain model. Methods like `Product.validateProductTypes()`, `StockItem.consume(...)`, `PredefinedPizza.calculatePriceForSize(...)`, `KitchenConfiguration.activate()`, `PlanningResult.markExecuted()`, `AuthSession.recordActivity(Date)`, `AuthSession.isActive(Date)`, `PasswordRecoveryToken.consume(Date)` enforce invariants.

### 3.5. Persistence Integrity

PostgreSQL is treated as a "fortress." Business invariants enforced at **three levels**:

1. **Domain layer** — TypeScript validation in factories, constructors, mutations.
2. **Application layer** — service-level checks before repository calls.
3. **Database layer** — native `CHECK`, `UNIQUE`, `FOREIGN KEY ... ON DELETE RESTRICT`, partial unique indexes.

Data access uses **TypeORM 0.3 in Data Mapper style** behind the existing application repository interfaces (ADR-008a). ORM entities live exclusively under `backend/src/infrastructure/persistence/entities/`. Data Mappers translate between persistence entities and domain aggregates. `synchronize: false`, `migrationsRun: false`; migrations are applied explicitly.

### 3.6. Testability

Every component must be testable in isolation without a live database or network socket. Repository interfaces allow in-memory fakes for unit tests. Supertest exercises the HTTP pipeline in-memory. External adapters (`OidcClient`, `PrologHttpClient`, `SmtpInvitationMailer`, `SmtpRecoveryMailer`) are injected behind domain-defined ports and can be replaced by test doubles.

### 3.7. Incremental Evolution

Architecture anticipates Sprints 2–3 without refactoring Sprint 1 assets:
- 3D visualization consumes `KitchenConfiguration` + taxonomy + stock endpoints.
- Prolog scheduler queries `ConsumptionForecast`, `SupplierScenario`, `StockSnapshot`, `PendingDeliveries` (Clarification #37), and product BOM definitions.
- All future components exchange data via REST contracts.

---

## 4. Key Architectural Scenarios

### 4.1. Manager Authentication & Role-Based Authorization

**Trigger:** `POST /api/v1/auth/login` with valid credentials.

**Flow:**
1. Client submits **email** (case-insensitive, per Clarification #32) + password.
2. Application service retrieves user via `IUserRepository`.
3. Password verified against Argon2id hash (64 MiB memory, 3 iterations, parallelism 1).
4. **Session established:** A new `AuthSession` is created with `lastActivityAt = now`, `expiresAt = now + JWT_EXPIRES_IN`. **Per Clarification #29/#34**, `lastActivityAt` drives the sliding inactivity check (`SESSION_INACTIVITY_MINUTES`).
5. Stateless JWT issued with claims: `sub` (userId), `sid` (session UUID), `email`, `roles` (array), `exp`. Access-token lifetime = `JWT_EXPIRES_IN` (team-defined per ASIST; default 15 min).
6. Subsequent protected requests carry `Authorization: Bearer <token>`.
7. Global `JwtAuthGuard` verifies signature + expiry; loads current user + session from repository (not just token claims). **Session validity requires both `now < expiresAt` AND `now − lastActivityAt < SESSION_INACTIVITY_MINUTES`** (Clarifications #29/#34).
8. `RolesGuard` compares required role metadata against actual current roles.
9. Account status (`ACTIVE`, not `DEACTIVATED`, not `PENDING_REGISTRATION`) also enforced.
10. External-IdP-only users (`passwordHash = null`) are rejected on local login endpoints (ADR-010).
11. **PENDING_REGISTRATION accounts** are blocked from login (Clarification #32); a resend-activation action is exposed.
12. Every `403` (denied) is recorded in `unauthorized_attempts` (ADR-015). **Per Clarification #42, the endpoint that serves these logs is restricted to `ADMINISTRATOR` only.**

**Why this design:** Role revocation takes effect immediately because the guard reads current state, not stale JWT claims (Clarification #24 §3.2). Inactivity-based session validity aligns with Clarifications #29/#34.

### 4.2. External IdP Login (OIDC Authorization Code + PKCE)

**Trigger:** `GET /api/v1/auth/external/login` → IdP → `GET /api/v1/auth/external/callback?code=...`

**Flow (ADR-010):**
1. Angular SPA redirects the user to the external IdP authorization endpoint (PKCE).
2. Backend callback receives authorization code; exchanges it with the IdP token endpoint.
3. Backend verifies the ID Token and extracts the `sub` claim.
4. `ExternalAuthService` looks up `users.external_idp_subject`. If not found:
   - If an account with the same verified email exists **without** `external_idp_subject`, the login is rejected (account-linking required, prevents takeover).
   - Otherwise, JIT-provision a new `User` with `ACTIVE` status, `CUSTOMER` role, `password_hash = NULL`, `external_idp_subject` set, and an associated `Customer` profile (Clarification #27).
5. Backend issues the standard internal JWT + creates an `AuthSession` (same as local login); `RolesGuard` and `UserStatus.guard.ts` treat local and external users identically.

**Why this design:** Zero external-password liability, immediate onboarding for verified identities, unified internal RBAC.

### 4.3. Deletion Integrity with `ON DELETE RESTRICT`

**Trigger:** `DELETE /api/v1/product-categories/{name}` where the category is referenced by products.

**Flow:**
1. Delete request reaches `CategoryService`.
2. Application service queries dependency count (`IProductRepository.countByCategory(name)`).
3. If > 0, throw `ConflictError` mapped to HTTP `409 Conflict` with structured details listing dependent product SKUs.
4. If zero, proceed with deletion.
5. `ON DELETE RESTRICT` in PostgreSQL acts as a final defense.

**Why this design:** Preserves referential integrity without cascade deletion of business data (Clarification #23 §1.2 requires listing dependencies).

### 4.4. Multi-Role Product Creation with Type Invariant

**Trigger:** `POST /api/v1/products` with `isSellable=false`, `isPizzaComponent=false`.

**Flow:**
1. Joi schema validates required fields, format.
2. `Product.create(...)` factory calls `validateProductTypes()`.
3. Since `(false || false) === false`, throws `InvalidProductTypeException` → HTTP `422 Unprocessable Entity`.
4. If `isPizzaComponent=true`, `componentTypeCode` is mandatory — validated by second invariant.
5. If `isSellable=true`, `directSellingPrice` must be provided (≥ 0.00).
6. **Per Clarification #35/#38**, if the SKU is a `PredefinedPizza`, `isStockControlled` MUST be `false`. `PredefinedPizzaService` cross-checks the backing `Product`. Migration `022_predefined_pizza_no_stock.sql` enforces this.

**Why this design:** Enforces Clarification #06 rule that stock-controlled status cannot exist standalone, and Clarification #35/#38 rule that predefined pizzas have no own stock.

### 4.5. Predefined Pizza with Dynamic Component-Derived Pricing

**Trigger:** `GET /api/v1/catalogue/{code}` for a predefined pizza.

**Flow:**
1. `CatalogueQueryService` retrieves recipe + all component size configurations for each available size.
2. For each size, price = Σ (`ComponentSizeConfiguration.price` × `RecipeLine.defaultQuantity`).
3. Availability = `BOOL_AND(currentStock >= stockUnitsConsumed * defaultQuantity)` per component; inactive components make the pizza unavailable (Clarification #11).
4. Response DTO includes `sizeVariants[]` with per-size `computedPrice` and `isAvailable`.

**Why this design:** No stored base price exists; price is computed on demand. Satisfies Clarifications #01, #05, #11, #38.

### 4.6. Stock Adjustment with Pessimistic Locking

**Trigger:** `POST /api/v1/stock/{productCode}/adjustments` with `operation: CONSUME`.

**Flow (ADR-008b):**
1. `StockService` opens an explicit transaction via a TypeORM transaction-scoped manager.
2. Executes `SELECT ... FROM stock_items WHERE product_sku = $1 FOR UPDATE`.
3. Reads current balance.
4. Validates: `currentBalance - units >= 0`.
5. If invalid: rollback → HTTP `422 Unprocessable Entity`.
6. If valid: updates balance, inserts `stock_movements` row, commits.

**Why this design:** Row-level locking serializes concurrent adjustments (ADR-008b).

### 4.7. Kitchen Configuration Activation (Single Active Invariant)

**Trigger:** `POST /api/v1/kitchen-configurations/{name}/activate`.

**Flow (ADR-011):**
1. `KitchenConfigurationService.activate(name)` begins a transaction.
2. `UPDATE kitchen_configurations SET is_active = FALSE WHERE name <> :name`.
3. `UPDATE kitchen_configurations SET is_active = TRUE WHERE name = :name`.
4. Commit.
5. Partial unique index `uq_active_kitchen_configuration ON kitchen_configurations (is_active) WHERE is_active = TRUE` guarantees at most one active row at the database level.

**Why this design:** Deterministic answer for "which layout does the 3D viewer load?"; race conditions eliminated at the DB level.

### 4.8. AI Planning Execution with Immutable Snapshots & Pending Deliveries

> **Flow status:** The numbered flow below describes the current implementation
> and is superseded by Clarification #55. Required target: backend invokes
> Prolog with execution/scheduling metadata; Prolog retrieves the required
> operational data through documented, service-authorized backend read
> endpoints and constructs its per-run KB. The backend must retain a coherent
> immutable input snapshot so replay uses original data and `referenceDate`
> (#56, ADR-013). Endpoint contracts, service authentication, coherent reads
> and replay retrieval remain to be designed and implemented. Prolog must not
> access PostgreSQL directly.

**Trigger:** `POST /api/v1/planning/executions` with `{forecastName, scenarioName, referenceDate?, pendingDeliveries?}` (Clarification #37 adds `referenceDate` and `pendingDeliveries`).

**Flow (ADR-012, ADR-013; refined by Clarifications #30, #36, #37, #44):**
1. `PlanningService` loads forecast + scenario + current stock + BOM definitions + **`pendingDeliveries`** (Clarification #37).
2. `PlanningSnapshotDomainService` captures deep-copied JSON snapshots (including pending deliveries).
3. Validates: all references active at first execution; `stockUnitsPerSale` present for `isStockControlled ∧ isSellable` products (Clarification #28); **only pizzas have BOM** (Clarification #36); **non-pizza sellable products use `stockUnitsPerSale` directly** (Clarification #36); **`referenceDate` defaults to execution date**; **no proposed order may precede `referenceDate`** (Clarification #37); **stock for consumption on day N must be available by end of day N−1** (Clarification #37); **pending deliveries count as available from `expectedDeliveryDate` onwards** (Clarification #37).
4. Serializes inputs to JSON and calls `PrologHttpClient` (`POST /api/v1/plan`).
5. Prolog returns proposals; each `PurchaseProposal` carries **`meetsRequiredDate` and `lateByDays`** (Clarification #30). Quantity is a **multiple of `SupplierOffer.stockUnitQuantity`** (indivisible lot, Clarification #30). **Selection picks the lowest-total-cost solution** (Clarification #37) — not all combinations. **Multiple suppliers may be proposed for the same day** (Clarification #37). **Late deliveries are permitted with no maximum delay; the requirement is marked as unmet by its deadline but a late proposal may still be presented** (Clarification #37).
6. Persists the resulting `PlanningResult` (read-only) with `forecast_snapshot`, `scenario_snapshot`, `stock_snapshot` (including `pendingDeliveries`), and computed outputs.
7. No stock mutation, no purchase order creation.

**Why this design:** Reproducibility per Clarification #28; read-only per Clarification #26; lot indivisibility and late-proposal labelling per Clarification #30; pending deliveries and stock-availability-by-end-of-previous-day per Clarification #37.

### 4.9. Password Recovery Flow (Sprint 2, ADR-016)

**Trigger:** `POST /api/v1/auth/password-recovery` with `{email}` → `POST /api/v1/auth/password-reset` with `{token, newPassword}`.

**Flow (ADR-016, Clarification #32):**
1. Client submits email (case-insensitive). Server responds `202 Accepted` regardless of account existence (non-enumeration, Clarification #32).
2. Server creates a `PasswordRecovery` row: single-use token (cryptographically secure), `expiresAt = now + PASSWORD_RECOVERY_TTL_HOURS`, `usedAt = null`, `revokedAt = null`.
3. Server dispatches email via `SmtpRecoveryMailer` with a reset link containing the token.
4. Client opens link, submits token + new password to `POST /api/v1/auth/password-reset`.
5. Server validates: token exists, `usedAt IS NULL`, `revokedAt IS NULL`, `now < expiresAt`. Validates new password against `PasswordPolicy` (Clarification #32 uniform policy).
6. Server updates `users.password_hash` (Argon2id), marks `password_recovery.usedAt = now()`, revokes all active sessions for that user (`UPDATE auth_sessions SET revoked_at = now() WHERE username = ...`) — defence against stolen sessions.
7. Responds `200 OK`.

**Design decision (ADR-016, supersedes KB v2.5 hint on reusing `ActivationInvitation`):** Password recovery uses a **dedicated table** (`password_recovery`) rather than reusing `activation_invitations`. Rationale: distinct lifecycle (recovery doesn't activate an account, doesn't validate email-ownership), distinct TTL (short `PASSWORD_RECOVERY_TTL_HOURS` vs longer `INVITATION_TTL_HOURS`), simpler auditing.

**Why this design:** Non-enumeration (Clarification #32), password policy uniformity (Clarification #32), forensic session-revocation on recovery.

### 4.10. Admin Consult of Denied Access Logs (Sprint 2, ADR-015, Clarification #42)

**Trigger:** `GET /api/v1/admin/unauthorized-attempts?from=...&to=...` (endpoint newly introduced in v2.6 per Clarification #42).

**Flow:**
1. Request reaches `UnauthorizedAttemptController` (or `BackofficeUsersController`), guarded by `RolesGuard` requiring `ADMINISTRATOR`.
2. Returns paginated rows from `unauthorized_attempts` (id, user, timestamp, endpoint).
3. Any non-`ADMINISTRATOR` role (including `MANAGER`) receives `403 Forbidden`.
4. System/infrastructure logs (outside the app DB) are **not** exposed via the web API (Clarification #42); they remain in the operational domain (ASIST).

**Why this design:** Audit trail separation; application audit is an admin-only concern, not a restaurant-ops concern.

---

## 5. Architecture Decision Records (ADR-001 through ADR-017)

### ADR-001: Layered Clean/Onion Architecture with Hexagonal Ports & Adapters

**Status:** Accepted (revised v3.0).

**Context:** The LaPrizza back-end must support multiple evolving business domains, must avoid the "Big Ball of Mud" anti-pattern, and must isolate core domain logic from HTTP delivery frameworks and persistence mechanisms.

**Decision:** The back-end adopts **Clean/Onion Architecture** for concentric layering (Presentation, Application, Domain, Infrastructure) **plus Hexagonal Ports & Adapters at architectural boundaries**. Clean/Onion defines the concentric layering and Dependency Rule; Hexagonal defines explicit boundary contracts.

**Key rules:**
- Source code dependencies point inward only.
- Domain entities do NOT import NestJS, Express, TypeORM, `pg`, or HTTP types.
- Controllers orchestrate via application services, never contain business logic.
- Repositories implement domain-defined ports via infrastructure adapters (TypeORM Data Mapper).
- Ports are used at architectural boundaries only, not for every internal class.
- **Per Clarification #46:** one container may host multiple bounded contexts; a bounded context must NOT be split across multiple containers. The Modular Monolith complies.

**Alternatives considered:** Flat structure (rejected: Big Ball of Mud); 3-Tier with Active Record (rejected: couples domain to persistence); Microservices (rejected: distribution overhead for 14-week iterative prototype); Strict Hexagonal-Only without Clean/Onion (rejected: obscures use-case and domain layering).

**Consequences:**
- (+) High testability, independence of database, extensibility for Sprints 2–3, explicit boundary contracts.
- (−) Additional boilerplate; requires discipline to prevent framework leakage into domain; risk of over-porting if applied to every internal class.

**Revision history (v3.0):**
- Renamed from "Layered Architecture combined with Clean/Onion Architecture principles" to "Layered Clean/Onion Architecture with Hexagonal Ports and Adapters at its boundaries".
- Clarified that ports do **not** contradict Clean/Onion; they complement it. "Strict Hexagonal-Only" is now the rejected alternative.
- **v2.6:** Added Clarification #46 compliance note.

### ADR-002: Back-End Technology Stack

**Status:** Accepted (revised v2.2). **Superseded by ADR-002.2**.

**Decision:**
- **Runtime:** Node.js v20 LTS or v24
- **Language:** TypeScript 5.5+
- **Web framework:** NestJS 10.3 (over Express engine)
- **Persistence:** PostgreSQL 16+ via **TypeORM 0.3 integrated through `@nestjs/typeorm` 10** in Data Mapper style (see ADR-008a — this **supersedes** the earlier "native pg pool only" choice)
- **Boundary validation:** Joi
- **Authentication:** JWT (`@nestjs/jwt`) + Argon2id (`argon2` package) + `openid-client` for OIDC (ADR-010)
- **Testing:** Jest 29 + Supertest + Bruno CLI

**Alternatives considered:**
- MongoDB + Mongoose (rejected: no native referential integrity)
- .NET / Java Spring Boot (rejected: boilerplate overhead)
- bcrypt / bcryptjs (rejected in favour of Argon2id: memory-hard, OWASP-preferred, off-event-loop)
- Prisma (rejected in favour of TypeORM: TypeScript workflow fit, ADR-008a)

### ADR-002.2: Back-End Technology Stack (rev. v2.2)

**Status:** Accepted.

**Decision:** Node.js + NestJS + PostgreSQL + Argon2id + Joi + Jest/Supertest.

- **Node.js (LTS v20+ / v24)** with **TypeScript** — static typing, explicit domain interfaces, compile-time validation, modern asynchronous capabilities.
- **Nest.js** — TypeScript-first, opinionated framework on top of Express. Provides modular architecture, built-in Dependency Injection (IoC container), declarative request pipeline (Guards/Pipes/Interceptors), `@nestjs/testing`, ecosystem integration for JWT/Passport and OpenAPI.
- **PostgreSQL** accessed via **TypeORM 0.3** (Data Mapper) behind repository interfaces (ADR-008a).
- **Joi** for boundary validation.
- **Argon2id** for password hashing (OWASP first choice).
- **Jest + Supertest + Bruno CLI** for testing.

**Considered alternatives:**
- **MongoDB + Mongoose** — rejected: lacks native database-level referential integrity enforcement; LaPrizza requires strict FK constraints across catalogues.
- **.NET / Java Spring Boot** — rejected: higher boilerplate, slower feedback loops.
- **bcrypt/bcryptjs** — rejected: not memory-hard, 72-byte truncation, `bcryptjs` blocks event loop.

**Consequences:**
- (+) Native referential integrity, ACID transactions, type safety, enterprise IoC, modern cryptography, hybrid JSONB support, non-blocking async I/O.
- (−) Framework learning curve, native binary compilation for Argon2, migration discipline, divergence from slide examples.

**Revision history (v2.2):**
- Framework evolution: Express.js → Nest.js.
- Cryptographic upgrade: bcryptjs → Argon2id.
- Added explicit analysis of bcrypt vs Argon2id.

### ADR-003: Persistence Architecture (PostgreSQL)

**Status:** Accepted.

**Decision:** PostgreSQL 16+ with normalized schema (3NF/BCNF), native constraints (`CHECK`, `FOREIGN KEY ... ON DELETE RESTRICT`, `UNIQUE`), `JSONB` for semi-structured extensions (kitchen layouts, AI planning snapshots), **business keys as primary and foreign keys** (no technical UUIDs in relationships; `VARCHAR` business keys throughout). **Exception:** `auth_sessions.id` is UUID (unpredictable per-login identifier; Clarifications #29/#34).

**Key justifications:**
- `ON DELETE RESTRICT` natively enforces BCK03–BCK07 deletion guards.
- ACID transactions for multi-entity writes (recipes + lines, stock + movements).
- `CHECK (current_units >= 0)` enforces non-negative invariant at DB level.
- `JSONB` for opaque 3D layout data (ADR-011) and immutable AI planning snapshots (ADR-013).
- Partial unique index for single-active invariants (ADR-011).
- Schema migrations for reproducibility.

**Alternatives considered:** MongoDB (rejected: no FK integrity); in-memory storage (rejected: no durability); polyglot persistence (rejected: complexity — ADR-011 rejects second DB engine for kitchen config).

### ADR-004: Authentication & Session Management (JWT + Argon2id + OIDC + Inactivity)

**Status:** Accepted (revised v2.2 — incorporates Clarifications #29, #32, #34). **Revised in v2.6 (ADR-004.2) to align with ADR-016 password recovery and ADR-017 user invitations.**

**Decision:**
- Stateless JWT (RFC 7519) with claims `{sub, sid, email, roles, iat, exp}`. Access-token lifetime = `JWT_EXPIRES_IN` (team-defined per ASIST, default 15 min).
- Argon2id password hashing (64 MiB memory, 3 iterations, parallelism 1).
- `Authorization: Bearer <token>` header.
- **Server-side `AuthSession`** per login (`auth_sessions.id` UUID) — **inactivity-based** validity: `now < expiresAt` AND `now − lastActivityAt < SESSION_INACTIVITY_MINUTES`.
- **Refresh token flow** (`POST /api/v1/auth/refresh`) — renews `AuthSession.lastActivityAt` and issues a new access token, **never bypassing the inactivity limit** (Clarification #34).
- **Logout revokes only the current session** (`auth_sessions.revokedAt`); other sessions of the same account remain valid (Clarification #29).
- Guard pipeline: `JwtAuthGuard` → `RolesGuard` → `UserStatus.guard.ts`. Guards re-read roles + session state from repository.
- **Password policy:** defined per ASIST; applied uniformly to creation, change, and recovery (Clarification #32). Enforced by `PasswordPolicy` domain value.
- **Login identifier = email, case-insensitive** (Clarification #32).
- **Password recovery:** single-use, TTL-bound link, managed by a **dedicated `password_recovery` table** (see **ADR-016**). TTL = `PASSWORD_RECOVERY_TTL_HOURS`.
- **PENDING_REGISTRATION accounts** blocked from login; resend-activation endpoint exposed (Clarification #32).
- **External IdP (OIDC) integration (ADR-010):** Authorization Code Flow with PKCE, `openid-client`, JIT provisioning per Clarification #27, `external_idp_subject` mapping, `password_hash` nullable.
- **User invitations:** managed by the `ADMINISTRATOR` role (Sprint 2 Table 1, Clarification #42) — see **ADR-017** for lifecycle and TTL semantics.

**Trade-offs:**
- (+) Statelessness at the JWT level, CSRF resilience, horizontal scalability, zero external-password liability, inactivity-aware revocation, per-device logout.
- (−) Session lookup per request (mitigated by indexed `auth_sessions`); no account-wide logout (intentional per #29); IdP outage blocks external-only users.

**Configuration (env vars):**
- `SESSION_INACTIVITY_MINUTES` — inactivity timeout.
- `JWT_EXPIRES_IN` — access-token lifetime.
- `INVITATION_TTL_HOURS` — invitation TTL.
- `PASSWORD_RECOVERY_TTL_HOURS` — password-reset link TTL.

**Revision history:**
- v2.2: Added inactivity-based `AuthSession`, refresh flow, per-device logout, email-only login, password recovery, and password policy (Clarifications #29, #32, #34).
- **v2.6 (ADR-004.2):** Cross-references ADR-016 (password recovery dedicated table) and ADR-017 (invitation lifecycle). Clarifies that `ADMINISTRATOR` role owns invitation issuance (Sprint 2 Table 1).

### ADR-005: REST API Style (Richardson Level 2) & OpenAPI 3.0

**Status:** Accepted.

**Decision:**
- Richardson Level 2: resources as plural nouns, correct HTTP methods, RFC status codes.
- Versioned base path `/api/v1`.
- OpenAPI 3.0.3 contract as authoritative source (`docs/api/openapi.yaml`). **OpenAPI version bumped to `2.2.0` in v2.6** (adds `POST /auth/password-recovery`, `POST /auth/password-reset`, `POST /auth/resend-activation`, `PUT /users/{username}/roles`, `GET /admin/unauthorized-attempts`, `pendingDeliveries` in `PlanningExecutionRequestDTO`).
- Uniform error envelope: `{timestamp, status, error, message, details?}`.
- Idempotent `GET`, `PUT`, `DELETE`; non-idempotent `POST`, `PATCH`.

**Alternatives considered:** RPC-style (`/createProduct`); GraphQL (rejected: complexity, HTTP semantics compromise).

### ADR-006: Automated Testing Strategy

**Status:** Accepted.

**Decision:** Multi-tiered testing.

| Tier | Tool | Scope |
|---|---|---|
| **Unit** | Jest | Domain entities, VOs, domain services (no I/O) |
| **Application** | Jest + In-Memory Fakes | Use cases with fake repositories |
| **Integration** | Supertest | HTTP pipeline, in-memory app (no port binding) |
| **Black-Box API** | Bruno CLI | Chained workflows against live server |
| **Database** | Jest + PostgreSQL 16 | Entity/schema parity, migration reversal, deferred constraints, concurrent stock consumption, session inactivity sweep |

**Why:** Fast feedback, isolated regressions, F.I.R.S.T. compliance, CI compatibility. Each PostgreSQL suite creates and removes its own schema in `TEST_DATABASE_URL`.

### ADR-007: Bruno over Postman for API Testing

**Status:** Accepted.

**Decision:** Bruno (Git-native, plain-text `.bru` files) is the API client and testing tool.

**Alternatives considered:** Postman (rejected: cloud lock-in, 3-collaborator free tier cap, monolithic JSON diffs); Insomnia (rejected: mandatory login); VS Code REST Client (rejected: no dedicated GUI).

**Repository layout:**
```
backend/tests/bruno/LaPrizza/
├── opencollection.yml
├── environments/
│   ├── Local.yml
│   └── Local.json
├── BCK01-Register_n_Login/  ...  BCK11-Catalogue/
├── AA02-ExternalAuth/
├── AI01-BOM/
├── AI02-PLANNING/
├── Password Recovery/       # v2.6 (Clarification #32, ADR-016)
├── User Invitations/        # v2.6 (Clarification #24, ADR-017)
└── User Management/         # v2.6 (Clarification #42)
```

### ADR-008a: TypeORM Adoption for PostgreSQL Data Access

**Status:** Accepted (2026-10-28).

**Decision:** Adopt **TypeORM 0.3** integrated via **`@nestjs/typeorm` 10** in **Data Mapper style**. This **supersedes** the "native pg pool only" choice in ADR-002 v2.2.

**Key implementation notes:**
- Persistence entities under `backend/src/infrastructure/persistence/entities/` — 37 table entities + 2 view entities (post-Sprint 2 count, including `auth_sessions`, `unauthorized_attempts`, `password_recovery`, `roles_assignment`, `status_assignment`).
- ORM decorators stay **outside** the domain. Data Mappers translate between persistence entities and domain aggregates.
- `synchronize: false`, `migrationsRun: false`. Migrations applied explicitly (see `prestart` script in `package.json`).
- Baseline migration `1793145600000-InitialSchema.ts` reproduces schema from historical SQL 001–013.
- All `Postgres*Repository.ts` adapters use TypeORM query builders or repository APIs behind existing application interfaces. Stock mutations use transaction-scoped managers.
- Raw SQL is retained only in the frozen baseline migration and view definitions.

**Rationale:** Consistent data access API while preserving Clean Architecture boundaries; NestJS DI integration; explicit entity/column mapping fits TypeScript workflow.

**Validation result (2026-10-28):** Build and lint passed on Node.js 24.21.0; 422 tests passed across 49 suites; PostgreSQL 16 including DB suites; Bruno collection 287 requests / 388 assertions passed.

**Alternatives considered:** Prisma (rejected: schema language + generation step mismatch with team workflow); Active Record on domain entities (rejected: couples domain to ORM).

### ADR-008b: Pessimistic Locking for Stock Adjustments

**Status:** Accepted (2026-10-30).

**Decision:** Use `SELECT ... FOR UPDATE` for stock deductions.

**Rationale:**
1. Prevents negative stock under concurrency.
2. Serializes conflicting adjustments at row level.
3. Atomicity of balance + movement write.
4. Database-level coordination (no app-level locks).

**Alternatives:** Optimistic locking (rejected for simplicity preference); application-level locks (rejected: unreliable across processes).

### ADR-009: Angular as the Front-End SPA Framework

**Status:** Accepted (2026-10-30). **Supersedes** earlier React preference.

**Decision:** Adopt **Angular with TypeScript** for the LaPrizza SPA.

**Consequences:**
- Standalone components per feature.
- Angular Router for role-based navigation with lazy loading (including lazy-loaded 3D kitchen).
- Typed reactive forms for management workflows.
- HttpClient + interceptors for JWT attachment and common auth error handling (401 → redirect to login; **401 with `reason=session_expired` → refresh attempt**; 403 → role-aware message).
- Route guards + role-aware UI (back-end remains authoritative).
- Encapsulated Three.js integration in a dedicated component; the 3D rendering loop does not drive Angular change detection.
- **Per Clarification #39:** a shared `ConfirmDialog` component (or modal) must be used before destructive actions (delete, deactivate user, role change, cancel order).
- **Per Clarification #39:** configurable `API_TIMEOUT_MS` on the HTTP interceptor (default 30s).
- **Per Clarification #42:** admin-only navigation entries (audit log, user management) shown only when `ADMINISTRATOR` role is held.

**Alternatives:** React (rejected: requires separate choices for routing, forms, state; team prefers Angular's integrated facilities); Vue (rejected: same rationale).

**Note:** The previous React preference recorded in `04-principles-and-guidelines.md` §8 is **superseded** by this ADR. The comparative log in that document is preserved for traceability but no longer reflects the accepted decision.

### ADR-010: External Identity Provider (OIDC) Integration

**Status:** Accepted (2026-11-04); data-flow direction revised by Clarification #55, implementation pending.

**Context:** AA02 mandates OIDC/OAuth 2.0 external authentication. Clarification #25 confirms any OIDC-compliant IdP (Google, Microsoft, Auth0, Keycloak). Clarification #27 mandates JIT provisioning on first external login.

**Decision:** Adopt the **Authorization Code Flow with Proof Key for Code Exchange (PKCE)** via the `openid-client` library integrated into the NestJS backend.

**Flow:**
1. **Frontend Initiation:** Angular SPA redirects the user to the IdP's authorization endpoint (PKCE).
2. **Callback Handling:** IdP redirects to `/api/v1/auth/external/callback` with authorization code.
3. **Token Exchange:** Backend exchanges code for ID Token + Access Token.
4. **Identity Mapping:** Extract `sub` claim; store in `users.external_idp_subject`.
5. **JIT Provisioning:** If no matching `external_idp_subject`, create `User` with `ACTIVE` status, `CUSTOMER` role, `password_hash = NULL`, `external_idp_subject` set. Create associated `Customer` (Clarification #27).
6. **Internal Session Issuance:** Backend creates an `AuthSession` and issues the standard internal JWT.

**Alternatives considered:**
- Direct OAuth 2.0 without OIDC (rejected: no identity assertion to provision a local `User`).
- Long-term storage of external access/refresh tokens (rejected: security risk, violates least privilege).
- Frontend-only token exchange (rejected: exposes client secret, bypasses backend validation).

**Consequences:**
- (+) Zero password liability; seamless onboarding via JIT; identity stability via `sub`; unified RBAC.
- (−) External dependency (IdP outage); account-linking complexity (email collision without `external_idp_subject` → reject login; requires authenticated linking flow); `password_hash` nullable requires schema migration.

### ADR-011: Kitchen Configuration Strategy (JSONB & Active State)

**Status:** Accepted (2026-11-04).

**Context:** WEB06 and VIS02 require managing multiple 3D kitchen layouts and switching between them, with the 3D viewer always loading the active configuration.

**Decision:** Adopt an **opaque JSONB storage strategy** with a **partial unique index** to enforce the active-state invariant.

**Design:**
1. **Configuration Identity:** `KitchenConfiguration`
   identified by its generated UUID (`id`, UUID PK).
   The descriptive `name` is unique but editable.
   See ADR-016.
2. **Opaque JSON:** `json_content` is treated as opaque; schema interpretation is delegated to the Three.js frontend component (schema per ADR-014).
3. **Active State Invariant:** Partial unique index `uq_active_kitchen_configuration ON kitchen_configurations (is_active) WHERE is_active = TRUE`.
4. **Transactional Activation:** `KitchenConfigurationService.activate(name)` executes `UPDATE ... is_active = FALSE` for all rows, then `UPDATE ... is_active = TRUE` for the target row, within a single ACID transaction.

**Alternatives considered:**
- Fully normalized relational schema (rejected: constant migrations for 3D attribute changes, violates agility).
- File storage / object store (rejected: transactional consistency issues, access control complexity).
- Document DB (MongoDB) (rejected: polyglot persistence overhead; PostgreSQL JSONB provides equivalent capabilities).

**Consequences:**
- (+) Extreme flexibility for SGRAI schema evolution; JSONB performance; hard DB-level single-active invariant; business-key consistency; auditability.
- (−) Application-level JSON validation required (`422` on invalid structure); data duplication (full JSON per configuration).

### ADR-012: AI Planning Engine Integration (Prolog via REST)

**Status:** Accepted (2026-11-04).

**Context:** AI05 and AI06 mandate integration of a Prolog engine for BOM and Requirements Planning. The engine needs domain data but must not bypass backend invariants, business rules, or transaction controls. Prolog has a different runtime model from Node.js.

**Decision:** Adopt a **separated container architecture** where the Prolog engine runs as an independent service **within the LaPrizza System Boundary**, communicating with the NestJS backend via **REST/JSON over HTTP**. Clarification #55 retains this boundary and wire format but supersedes the original data-push direction.

**Historical integration contract (superseded by Clarification #55; describes current code):**
1. **Data Gathering:** `PlanningService` retrieves `ConsumptionForecast`, `SupplierScenario`, stock snapshot, BOM definitions, and **`pendingDeliveries` (Clarification #37)**. All references resolved to business keys.
2. **Knowledge Base Construction:** Backend serializes inputs to a comprehensive business-oriented JSON payload (no UUIDs).
3. **REST Invocation:** Backend uses `PrologHttpClient` (infrastructure adapter) to `POST` to the Prolog engine endpoint (e.g., `/api/v1/plan`).
4. **Prolog Execution:** Prolog (SWI-Prolog with HTTP server pack) receives JSON, constructs its KB for that execution, runs predicates, returns JSON.
5. **Result Persistence:** Backend maps result to `PlanningResult` and persists with business-key references.

**Required target:** the backend sends execution/scheduling metadata; Prolog
uses authorized backend API reads to retrieve business data and builds the KB.
The exact endpoints, service identity, coherent read strategy and replay
snapshot path are pending design. The backend remains the only database owner.

**Alternatives considered:**
- Embedded Prolog via Node.js bindings (rejected: CPU-bound block on event loop, memory overhead, or unmaintained native bindings).
- Direct DB access from Prolog (strongly rejected: destroys Clean Architecture and DDD boundaries; bypasses snapshot logic, RBAC, and read-only constraint).
- Rewriting AI in TypeScript (rejected: violates IARTI academic requirement).

**Consequences:**
- (+) Absolute domain isolation; independent scalability; Clean Architecture preserved via adapter; KB freshness per request.
- (−) Network latency; failure handling required (502/503 on Prolog unavailability).

### ADR-013: Immutable Planning Results & Snapshots

**Status:** Accepted (2026-11-04).

**Context:** WEB07 and Clarification #28 mandate that editing a forecast must not change the meaning of earlier results; Clarification #26 mandates read-only planning that never mutates stock or creates purchase orders. Relational foreign keys link to mutable tables. **Clarification #30** mandates indivisible purchase lots and explicit late-delivery labelling. **Clarification #37** mandates pending-delivery inputs and stock-availability-by-end-of-previous-day.

**Decision:** Adopt an **Immutable Snapshot Pattern** for the `PlanningResult` aggregate.

**Design:**
1. **Deep Copying:** Backend gathers inputs (forecast entries, supplier offers, stock, BOM rules, **pending deliveries**) and creates deep-copied JSON representations.
2. **Business-Key Referencing:** `PlanningResult` records `forecast_name` and `scenario_name` as FK VARCHAR (ON DELETE SET NULL on deletion); JSON snapshots remain intact. No UUIDs.
3. **Storage:** `forecast_snapshot`, `scenario_snapshot`, `stock_snapshot` (including `pendingDeliveries`), `requirements`, `proposals`, `unmet_needs` stored as JSONB.
4. **Indivisible lots (Clarification #30):** each `PurchaseProposal.quantity` is a multiple of `SupplierOffer.stockUnitQuantity`; surplus remains in hypothetical balance. **Per Clarification #44**, one supplier may not offer two different `stockUnitQuantity` modalities for the same product.
5. **Late proposals (Clarification #30, #37):** each proposal carries `meetsRequiredDate : boolean` and `lateByDays : integer`. A late proposal does **not** remove the corresponding `UnmetNeed`. **No maximum delay is imposed** (Clarification #37).
6. **Replay Mechanism:** Re-run historical scenarios using snapshot data with `is_replay = true` on the new result.

**Alternatives considered:**
- Slowly Changing Dimensions / versioned input tables (rejected: complex temporal logic, fragments domain, doesn't solve stock snapshot volatility).
- Event Sourcing (rejected: overkill; requires CQRS + event store infrastructure).

**Consequences:**
- (+) Perfect historical reproducibility; single-row read; no UUIDs; immutability; audit trail; explicit late-delivery signalling; pending-delivery provenance preserved.
- (−) Storage bloat; data duplication; normalization trade-off accepted for integrity.

### ADR-014: 3D Asset Pipeline & Schema

**Status:** Accepted (2026-11-04).

**Context:** Sprint 2 introduces mandatory 3D Kitchen Visualization (VIS01–VIS07). VIS02 requires the 3D module to retrieve dimensions, equipment positions, and asset URLs from the backend. VIS04 mandates textures and materials. Sprint 3 will require animation of the assembly line.

**Decision:** Adopt **GLTF 2.0 (GLB format)** as the exclusive standard for 3D assets, combined with a strictly defined JSON schema for the `KitchenConfiguration` payload (ADR-011). **Clarification #31** confirms that material reuse across objects with similar surfaces is allowed; teams define and justify performance criteria (no reference hardware).

**Design:**
1. **GLB Format:** All 3D models (oven, robotic arms, conveyor) as `.glb` binary GLTF. Encapsulates geometry, materials, textures, and skeletal animations in one file.
2. **Asset Hosting:** Served as static files from the backend (or an Nginx static volume); URLs referenced in the JSON.
3. **JSON Schema Definition:** `json_content` adheres to a predefined schema containing `dimensions`, `equipment[]` (id, modelUrl, position, rotation, scale), `lights[]` (type, color, intensity), `animationTriggers` (Sprint 3 readiness).
4. **Validation:** `KitchenConfigurationValidator` validates JSON against the schema before saving.
5. **Material reuse (Clarification #31):** shared `Material` library across objects with the same surface is permitted and recommended. Performance optimisation (cache, async loading, instancing) must be demonstrated and justified.

**Alternatives considered:**
- OBJ/MTL (rejected: multi-file, CORS issues, no skeletal animations).
- Procedural geometry (rejected: unrealistic for complex oven/robotic arm textures; hard to animate articulated joints).
- FBX / STL (rejected: proprietary/outdated loaders; STL lacks textures/colors, violating VIS04).

**Consequences:**
- (+) Performance (binary, compressed); Sprint-3-ready for animations; encapsulation; strict contract between backend and SGRAI team.
- (−) SGRAI must know GLB export correctly from Blender; backend requires robust JSON validation against schema.

### ADR-015: Unauthorized Access Attempt Logging

**Status:** Accepted (2026-11-04). **Revised in v2.6 (Clarification #42).**

**Context:** AA05 mandates that unauthorized access attempts be recorded for investigation, without exposing credentials or session secrets. Clarification #33 further mandates resource-level authorization for multi-role users, which increases the surface of 403 responses that must be tracked. **Clarification #42** clarifies that these application logs must be consultable **only by `ADMINISTRATOR`**, and distinguishes them from system/infrastructure logs (outside the web role taxonomy).

**Decision:** Introduce `unauthorized_attempts` table (no domain entity) that records one row per authenticated `403` response, using the validated username. Table: `id BIGSERIAL PK`, `user VARCHAR FK ON DELETE SET NULL`, `timestamp TIMESTAMPTZ DEFAULT NOW()`, `endpoint TEXT`. Index on `(user, timestamp)`. Requests without a verified identity, `401` responses, and allowed requests are excluded. No query strings, concrete path parameters, credentials, or request bodies are stored.

**Exposure (v2.6, Clarification #42):** `GET /api/v1/admin/unauthorized-attempts` — restricted to `ADMINISTRATOR`. Paginated; filterable by `from`, `to`, `username`. Any other role receives `403`.

**Implementation:** `UnauthorizedAttemptEntity` mapped in TypeORM; migration `016_create_unauthorized_attempts_table.sql` + TypeORM forward `1793836801000-UnauthorizedAttempts.ts`. An administrator-only consultation controller is planned but is not present in the current repository baseline.

**Alternatives:** Application-log-only (rejected: no queryable audit trail); full HTTP request logging (rejected: PII/GDPR risk, storage bloat); exposing the endpoint to `MANAGER` (rejected by Clarification #42).

**Consequences:**
- (+) Queryable audit trail; GDPR-safe (no PII); aligns with AA05 AC; align with Clarification #42 admin-only access.
- (−) One extra INSERT per 403 (bounded by defence-in-depth — 403s should be rare in normal operation).

### ADR-016: Password Recovery as a Dedicated Aggregate

**Status:** Accepted (2026-11-09 — introduced in KB v2.6).

**Context:** Clarification #32 mandates a single-use, TTL-bound password-recovery process. KB v2.5 tentatively suggested reusing the `ActivationInvitation` entity with `purpose = PASSWORD_RESET`. During Sprint 2 implementation, the team decided to introduce a dedicated `password_recovery` table to give recovery its own lifecycle, its own TTL (`PASSWORD_RECOVERY_TTL_HOURS`), and a distinct auditing surface. This decision is recorded here to avoid drift between the KB and the implementation.

**Decision:** Password recovery uses a **dedicated `password_recovery` table**:

- `id` UUID PK (unpredictable).
- `username` VARCHAR FK → `users(username)` ON DELETE CASCADE.
- `token_hash` VARCHAR UNIQUE (Argon2id/SHA-256 hash of the single-use token; the raw token is never stored).
- `expires_at` TIMESTAMPTZ NOT NULL.
- `used_at` TIMESTAMPTZ NULL.
- `revoked_at` TIMESTAMPTZ NULL.
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW().

Flow: `POST /auth/password-recovery` creates a row and dispatches an email; `POST /auth/password-reset` validates token + `PasswordPolicy`, updates `password_hash`, marks `used_at`, and **revokes all `auth_sessions`** for that username (defence against stolen sessions).

**Alternatives:**
- **Reuse `ActivationInvitation`** (original KB v2.5 suggestion — rejected for clarity/auditability; distinct TTL semantics; distinct exposure channel).
- **Stateless signed token (JWT)** (rejected: no server-side revocation before TTL; can't distinguish consumed vs expired).

**Consequences:**
- (+) Clean separation between activation and recovery; token-only single-use enforced server-side; audits easy (`SELECT * FROM password_recovery WHERE username = ...`).
- (−) One more table; adds a token-hash column (must not store raw token); does not touch the `users.password_hash` invariant.

### ADR-017: User Invitations Lifecycle

**Status:** Accepted (2026-11-09 — introduced in KB v2.6).

**Context:** Clarification #24 requires invitations to be single-use, TTL-bound, and invalidated when a replacement is issued. With `ADMINISTRATOR` now a distinct role (Sprint 2 Table 1, Clarification #42), invitations are the mechanism by which the Administrator provisions accounts.

**Decision:**

- `activation_invitations` table retained (created in migration 014).
- `purpose` = `{LOCAL_ACCOUNT_ACTIVATION, EXTERNAL_IDP_MATCH, PASSWORD_RESET}` (the last is retained for compatibility but **not used for password recovery** — that flow uses `password_recovery` per ADR-016).
- Issuance requires `ADMINISTRATOR` role.
- Issuance invalidates any previous `activation_invitations` row for the same `(username, purpose)`: `UPDATE activation_invitations SET revoked_at = NOW() WHERE username = :u AND purpose = :p AND revoked_at IS NULL`.
- TTL = `INVITATION_TTL_HOURS` (env var; default 48).
- Successful consumption sets `used_at = NOW()` and flips the `User.status` from `PENDING_REGISTRATION` to `ACTIVE`.
- Failed email delivery leaves the `User` in `PENDING_REGISTRATION`; the Admin can retry via `POST /auth/resend-activation`.

**Alternatives:**
- Combine invitation and password-recovery entities (rejected: distinct TTLs, distinct activation semantics, mixed audit).
- Self-service invitation sending by `MANAGER` (rejected by Clarification #42 — role assignment is an `ADMINISTRATOR` concern).

**Consequences:**
- (+) Traceable lifecycle (`activation_invitations` is the audit trail); single-use invariant enforced at the DB level via `WHERE revoked_at IS NULL` scoping; safe retry.
- (−) Explicit invalidation step needed; `ADMINISTRATOR` role is now the sole issuer.

---

## 6. Requirements Engineering & Client Clarifications

The project maintains a formal **Client Q&A Log** (46 clarifications between the team and the Product Owner / Rector of UCs — Clarifications #01–#28 from Sprints 1–2 baseline, #29–#36 from Sprint 2 elaboration (November 2026), and #37–#46 from Sprint 2 elaboration round 2 (06–09 November 2026)). These clarifications are **binding** on all design and implementation decisions.

### 6.1. Sprint 1 User Stories Summary

| Area | ID | Title |
|---|---|---|
| ENG | ENG01 | Project Setup and Engineering Practices |
| ENG | ENG02 | Sprint Planning and Project Monitoring |
| ENG | ENG03 | Self and Peer Evaluation |
| BCK | BCK01 | User and Authentication Management |
| BCK | BCK02 | Customer Management |
| BCK | BCK03 | Product Category Management |
| BCK | BCK04 | Allergen Management |
| BCK | BCK05 | Product Management |
| BCK | BCK06 | Pizza Size Management |
| BCK | BCK07 | Pizza Component Type Management |
| BCK | BCK08 | Pizza Component Configuration |
| BCK | BCK09 | Stock Information Management |
| BCK | BCK10 | Predefined Pizza Management |
| BCK | BCK11 | Product Catalogue & Product Information |
| ARC | ARC01 | Core Domain Analysis and Modelling |
| ARC | ARC02 | System Architecture |
| ARC | ARC03 | REST API |
| ARC | ARC04 | Persistence and Data Integrity |
| ARC | ARC05 | Automated Testing |

### 6.2. Sprint 2 User Stories Summary

| Area | Count | Focus |
|---|---|---|
| WEB | 7 | SPA setup, layout, RBAC navigation, feedback, Sprint 1 pages, kitchen config page (WEB06), AI config page (WEB07) |
| AA | 7 | Local auth, external IdP (OIDC), role resolution, session handling, authorization, role assignment, secure activation |
| VIS | 7 | 3D module integration, kitchen layout, assembly line, textures, lighting, light controls, camera |
| AI | 6 | Prolog BOM, Requirements Planning, ANN study, IARTI report, AI service access, back-end data + knowledge base |
| SYS | 8 | Auto-deploy, network restriction, allowed endpoints, shared folder, shell access, risk assessment, MBCO, backup |
| GDP | 3 | Personal data handling, processing responsibility, breach handling |

### 6.3. Clarifications (Summary Table)

The full Q&A log lives in `docs/domain/client-questions.md`. The 46 clarifications are, in order:

| # | Topic | Key Decision Impact |
|---|---|---|
| 01 | Customer data (mandatory fields), kiosk mode, pricing, stock availability, personalization | Customer mandatory = First Name, Last Name, Phone, Email. Kiosk = anonymous. Price = sum of components. Availability requires $\text{stock} \ge \text{consumption}$. Personalized pizza from scratch is allowed. |
| 02 | Customer vs User separation | Distinct aggregates. Optional link `Customer.username`. |
| 03 | User roles | `MANAGER`, `EMPLOYEE`, `CUSTOMER`. Multi-role support. |
| 04 | Admin hierarchy & payments | **Superseded by #42 for Sprint 2** — no `ADMINISTRATOR` role in Sprint 1. No online payment integration. |
| 05 | Predefined pizza pricing | Price = sum of component prices for size. No labour surcharge. |
| 06 | Product role combinations | `(isSellable \|\| isPizzaComponent)` required. Stock-controlled is orthogonal. |
| 07 | SGRAI framework & scope | Framework free choice (SPA-integrated for LAPR5). Mandatory: Kitchen Visualization (II.3.3.2). Optional: Build Your Pizza (II.3.3.1). |
| 08 | Categories, sellable rules, stock-controlled transition, allergen catalogue | One category per product (mandatory). Zero price allowed. Reactivation allowed for products. Categories & allergens configurable (14 EU allergens seeded). |
| 09 | Registration flow & endpoint security | Public `register-customer` creates User + Customer (updated by #27 → PENDING_REGISTRATION until email confirmation). Manager-only staff provisioning. |
| 10 | Active state vs stock availability | `isActive` independent of stock. Zero-stock products remain active. |
| 11 | Product name uniqueness, zero price, component deactivation cascade | Names not unique (business key is `sku`). Zero price allowed. Deactivated component → predefined pizzas become unavailable (soft effect). Predefined pizza cannot be `isPizzaComponent`. |
| 12 | Stock deduction timing, subcategories, commercial scope | Stock deducted at order confirm (later sprint). No subcategories. Price = commercial info for sellable. |
| 13 | Explicit sizing prices & discrete consumption | No multipliers. Each `(product, size)` has explicit price and integer consumption. |
| 14 | Updatable product fields & type downgrade | Cannot remove `isPizzaComponent` if referenced by configurations or recipes. `409 Conflict`. |
| 15 | Initial stock & movement logging | Initial stock Manager-provided (default 0). Movement table optional in Sprint 1 (implemented anyway). |
| 16 | Email unification, NIF, dietary warnings, pricing independence | Single email for User+Customer. NIF optional. Allergen conflicts produce warnings, not blocks. Component price independent of base price. |
| 17 | Category & allergen deletion | No soft delete. `ON DELETE RESTRICT` only. |
| 18 | Base component types & cardinality evolution | 4 base types immutable. Unique assembly order. Cardinality updates don't invalidate existing recipes. |
| 19 | Stock on inactive products | Stock consultable and adjustable. Filtering by active state allowed. |
| 20 | Entity ID format | Team decision: Business Keys (no technical UUID in relationships). Configurable allergens and sizes. |
| 21 | Predefined pizza availability & catalogue access | Catalogue public. Size deactivation → predefined pizza unavailable in that size. Component type change requires re-validation. Reactivation revalidates all rules. |
| 22 | WEB02 visual identity & i18n | No mandatory logo. UI strings translated, business data not (except allergen names localized). Language preference persists (localStorage/cookie/profile). Form state preserved on language change. |
| 23 | WEB05 management page behaviours | Concise listing; error messages explain reason + link to dependencies. No wizards required. Preview price/allergens during configuration. Public catalogue hides stock details. Search semantics: include-all + exclude-any. Conflict detection: `409 Conflict`, no diff visual required. |
| 24 | AA06 roles, audit, invitations, revocation, first admin | First admin created at install (no invitation). ≥1 active admin invariant. Roles fixed (no permission editor). Role changes audited (`role_change_logs`). Invitation TTL configurable (`INVITATION_TTL_HOURS`). Previous invitation invalidated on new. Duplicate email rejected. Reactivation by admin. Immediate role change effect (guard reads DB). |
| 25 | Restaurant Staff == Employee, IdP selection | Confirmed mapping. Any OIDC-compliant IdP allowed (Google, Microsoft, Auth0, Keycloak). |
| 26 | Purchase order confirmation (Sprint 2) | Plan only, read-only. Stock unaffected by plans. Cancellation outside scope. No `PurchaseOrder` aggregate; `PlanningResult` is read-only. |
| 27 | Public registration & external IdP first login | Public registration → `PENDING_REGISTRATION` until email confirmation. External IdP first login → JIT provisioning, `ACTIVE` immediately (no invitation). Employee with CUSTOMER role requires Customer record. **This partially reverses #09's "active on registration".** |
| 28 | WEB07/AI06 BOM, consumption, inactive refs, lead times, supply limits | Only pizzas have BOM. Explicit `stockUnitsPerSale` per product (integer). Inactive refs rejected for new forecasts/executions; preserved for replay via snapshots. Lead times = whole days. Supply limits per-offer, per-day (not shared across supplier's products). Missing limit = unlimited. |
| 29 | AA04 session duration & logout scope | Inactivity-based session; configurable (`SESSION_INACTIVITY_MINUTES`). While active, session refreshes automatically. Logout revokes **only the current device session**; other sessions of the same account remain active. |
| 30 | AI02 indivisible lot & late delivery | `SupplierOffer.stockUnitQuantity` is an **indivisible lot** — required qty is rounded **up** to a multiple; surplus goes to hypothetical stock. Late proposals carry `meetsRequiredDate=false` + `lateByDays`; they do **not** remove the original unmet need. |
| 31 | VIS04 material reuse & performance criteria | Same material/texture may be reused across objects with similar surfaces. No reference hardware/threshold; teams must demonstrate and justify optimisation techniques (reuse, async loading, etc.). |
| 32 | AA01 login identifier, password recovery, password policy, pending accounts | Login = email case-insensitive. Password recovery = single-use TTL-bound link. Password policy per ASIST applied uniformly to create/change/recover. `PENDING_REGISTRATION` blocked from login; resend-activation exposed. |
| 33 | WEB03/AA05 multi-role data-ownership | Multi-role users accumulate permissions but remain subject to data-ownership and confidentiality restrictions per operation and per resource. `RolesGuard` alone is insufficient; **resource-level authorization** required. |
| 34 | AA04 token validity & refresh | Access-token lifetime = team-defined (ASIST), configurable (`JWT_EXPIRES_IN`). Refresh supported while session valid and user active; refresh must **not** bypass inactivity timeout. |
| 35 | BCK10/BCK09 predefined pizza stock | Predefined pizzas are prepared on demand and have **no own stock**. Stock tracked at component level; deducted on order confirmation. |
| 36 | WEB07/AI06 non-pizza products in forecasts | Non-pizza sellable products (drinks, desserts) are included in forecasts, exports, supplier scenarios, replenishment plans. Needs computed via `stockUnitsPerSale`, without BOM. |
| **37** | **AI02 Requirements Planning (consolidated)** | **Lead time can be 0 (same-day delivery). Multiple suppliers per day. Lowest-total-cost selection (not all combinations). Pending deliveries considered as input. `referenceDate` defaults to execution date; proposals not before `referenceDate`. Advance ordering allowed. No maximum delay for late proposals. Simulated inputs allowed. One forecast per request; days without entries = 0. Stock for day N available by end of day N−1.** |
| **38** | **BCK10 predefined pizza representation** | **Reinforces #35 — predefined pizzas are not conventional sellable products with own stock.** Category/role restriction is not explicitly required by the client (assumption documented). |
| **39** | **WEB04 significant actions & connection failures** | **Confirmation dialogues for delete, deactivate user, role change, order cancellation. No maximum timeout imposed; team defines and documents. Retries must not duplicate already-performed operations. Progress + success + error feedback mandatory.** |
| **40** | **SYS01 automated deployment** | **Deployment may use external infrastructure (Azure, AWS, etc.), not restricted to a DEI VM. SSH-from-outside allowed, credentials in GitHub Actions Secrets. Choice justified and documented; SYS01 requirements remain.** |
| **41** | **AI01 BOM aggregate recursivity** | **For LaPrizza domain (permanent): only pizzas have BOM, unchanged in later sprints. Recursive/aggregate BOM requirements belong to IARTI component; scope to be clarified with IARTI RUC.** |
| **42** | **AA05 application log access** | **Denied-access application logs consultable only by `ADMINISTRATOR` (Sprint 2 Table 1 role). Manager/Employee/Customer excluded. System/infrastructure logs outside web role taxonomy. Access control required in both cases.** |
| **43** | **SYS04 shared resource folder access** | **Access via web SPA (application-authenticated) acceptable. No need for direct server folder access. Back-end enforces access control; SYS04 requirements preserved.** |
| **44** | **AI02 supplier prices per product** | **Offer price = price for N stock units (N ≥ 1). Indivisible batch, confirming #30. Each supplier may present only one supply arrangement per product (no multiple price/quantity modalities for same `(supplier, product)`).** |
| **45** | **GDPR/Consent management** | **Redirected to LAPR5 TP lecturer. No substantive client decision; prior consent model (marketing flag + timestamp) remains provisionally valid pending LAPR5 lecturer answer.** |
| **46** | **Bounded Contexts correction (official communication)** | **One container = one bounded context is default; one container may host multiple bounded contexts (normal); splitting one bounded context across multiple containers must be avoided. Modular Monolith complies.** |

---

## 7. Ubiquitous Language Glossary

Terms are grouped by domain area. Where a Portuguese term differs from the code term, both are listed.

### 7.1. Identity & Access

| Term | Definition |
|---|---|
| **User** | Identity for authentication, carrying credentials, PersonName, email, lifecycle status, and role set. Aggregate Root. Identified by `username`. |
| **UserRole** | Enumeration `{ADMINISTRATOR, MANAGER, EMPLOYEE, CUSTOMER}` in Sprint 2 (Sprint 2 Table 1, Clarification #42; **supersedes** Sprint 1 `{MANAGER, EMPLOYEE, CUSTOMER}`). |
| **UserStatus** | Enumeration `{ACTIVE, DEACTIVATED, PENDING_REGISTRATION}`. |
| **ADMINISTRATOR role** | Sprint 2 role. Manages user accounts, activation invitations, roles, application access logs (Clarification #42), account-related data-protection requests. Does **not** grant restaurant operations unless additional role is held. Distinct from the "first Administrator" (bootstrap Manager) of Clarification #24 §1.1. |
| **PersonName** | Value Object with `firstName`, `lastName`, `fullName()`. |
| **PasswordHash** | Value Object wrapping Argon2id output. Nullable for external-IdP-only accounts. |
| **PasswordPolicy** | Domain value enforcing password complexity/strength per ASIST, applied uniformly to create/change/recover (Clarification #32). |
| **Email** | Value Object validating RFC 5322 format. **Login identifier is email, case-insensitive** (Clarification #32). |
| **ExternalIdpSubject** | OIDC `sub` claim stored on `User`. Stable, immutable external identity. |
| **ActivationInvitation** | Entity inside `User` aggregate: single-use, TTL-limited, invalidation-on-new-emission token. Identified by its token. Used for account activation and external-IdP match. `purpose = PASSWORD_RESET` remains in the enum for compatibility but **is not used** — password recovery is now a dedicated aggregate (ADR-016). |
| **PasswordRecovery** | Sprint 2 aggregate (ADR-016). Dedicated single-use, TTL-bound token for password recovery. `id UUID PK`, `token_hash`, `username FK`, `expires_at`, `used_at`, `revoked_at`. Separate from `activation_invitations`. |
| **RoleChangeLog** | Append-only audit aggregate: actor, target, previous/next roles, timestamp, reason. |
| **AuthSession** | Aggregate Root (Sprint 2). Identified by `id` (UUID). Carries `username`, `lastActivityAt`, `expiresAt`, `revokedAt`. Validity requires `now < expiresAt` AND `now − lastActivityAt < SESSION_INACTIVITY_MINUTES`. Logout revokes only this session (Clarifications #29, #34). |
| **Bearer Token** | JWT supplied via `Authorization: Bearer <token>`. Carries `sid` (session UUID) plus standard claims. |
| **RBAC** | Role-Based Access Control via `RolesGuard`. **Per Clarification #33**, complemented by resource-level authorization (`CustomerAccessPolicy`) for multi-role users. |
| **Resource-Level Authorization** | Authorization check applied per resource (not only per role). Required for multi-role users: role accumulation does not grant unrestricted data access (Clarification #33). |
| **Mass Assignment** | Attack vector where client injects protected fields; prevented via `stripUnknown: true` in Joi. |
| **SESSION_INACTIVITY_MINUTES** | Environment variable controlling the inactivity timeout. Configured without code change (Clarifications #29, #34). |
| **JWT_EXPIRES_IN** | Environment variable controlling access-token lifetime (Clarification #34). |
| **INVITATION_TTL_HOURS** | Environment variable controlling account-activation invitation TTL (Clarification #24, ADR-017). |
| **PASSWORD_RECOVERY_TTL_HOURS** | Environment variable controlling password-reset link TTL (Clarification #32, ADR-016). |
| **PENDING_REGISTRATION login block** | Users in `PENDING_REGISTRATION` cannot log in until activation; a resend-activation action is exposed (Clarification #32). |
| **UnauthorizedAttempts** | Sprint 2 audit table (ADR-015). Records one row per authenticated 403. **Consultable only by `ADMINISTRATOR` (Clarification #42).** |
| **Application Logs** | Records of denied access attempts within the LaPrizza application. Per Clarification #42, distinct from system/infrastructure logs. |
| **System/Infrastructure Logs** | OS, server, container, infrastructure service logs. Outside the web role taxonomy; access restricted to technical operations personnel (Clarification #42). |
| **RolesAssignment** | Sprint 2 persistence artefact (migration `019_create_roles_assignment_table.sql`) — normalizes user role assignments at the persistence layer. |
| **StatusAssignment** | Sprint 2 persistence artefact (migration `020_create_status_assignment_table.sql`) — normalizes user status at the persistence layer. |

### 7.2. Customers

| Term | Definition |
|---|---|
| **Customer** | Commercial client profile. Aggregate Root. Identified by `email`. Mandatory: firstName, lastName, phone, email. Optional link `username` to `User`. |
| **CustomerAddress** | Delivery address (Entity inside Customer aggregate). |
| **DeliveryAddress** | Value Object `{street, postalCode, city, extraDetails}`. |
| **ContactInformation** | Value Object `{phoneNumber: PhoneNumber, email: Email}`. |
| **VatNumber** | Optional tax ID for invoicing. |
| **ConsentPreferences** | `{marketingConsent: boolean, consentTimestamp}`. **Per Clarification #45**, consent-versioning questions are redirected to the LAPR5 TP lecturer; the current model (single current-state flag) remains provisionally valid. |
| **DietaryRestriction** | Value Object `{allergenName, recordedAt}`. Associated with `User` per Clarification #27. |
| **Kiosk / Anonymous Customer** | Customer who places order without persistent record. |

### 7.3. Catalogue & Products

| Term | Definition |
|---|---|
| **Product** | Any item managed by restaurant. Aggregate Root. Identified by `sku`. |
| **ProductCategory** | Single category per product (mandatory). Identified by `name`. |
| **Allergen** | EU-defined allergen (14 types seeded). Identified by `name`. |
| **ProductRole** | Combination of `isSellable`, `isPizzaComponent`, `isStockControlled`. |
| **ProductSku** | Business identifier (`VARCHAR(30)`), unique. |
| **DirectSellingPrice** | `Money` for direct sale; separate from component size prices. |
| **ProductActivation** | `active=true/false` lifecycle flag. |
| **StockUnitsPerSale** | Integer consumption per sold unit for `isStockControlled ∧ isSellable` products. Required for AI02 planning (Clarification #28). **Applies to non-pizza sellable products as well** (Clarification #36). |

### 7.4. Pizza Configuration

| Term | Definition |
|---|---|
| **PizzaSize** | Commercial size tier (Small, Medium, Large + configurable). Identified by `name`. |
| **PizzaComponentType** | Role classification (`Base Dough`, `Base Sauce`, `Cheese`, `Topping` + custom). Identified by `name`. |
| **AssemblyOrder** | Unique integer sequence within a Pizza Component Type. |
| **CardinalityBounds** | `{minimum: int, maximum: int \| null}` (null = unbounded). |
| **ComponentSizeConfiguration** | Composite PK `(productSku, pizzaSize)`, defining price and stock consumption. |

### 7.5. Predefined Pizzas

| Term | Definition |
|---|---|
| **PredefinedPizza** | Sellable product with default recipe. Identified by `sku`. Pricing = sum of component prices (dynamic). **Prepared on demand; has no own stock** (Clarifications #35, #38). |
| **RecipeLine** | Value Object `{componentProductSku, defaultQuantity}`. |

### 7.6. Stock

| Term | Definition |
|---|---|
| **StockItem** | Current balance for a stock-controlled product. Identified by `productSku`. |
| **AbstractStockQuantity** | Non-negative integer units ($u \in \mathbb{N}_0$). |
| **StockMovement** | `{type: REPLENISHMENT\|CONSUMPTION\|ADJUSTMENT, amount, reason, recordedAt}`. |

### 7.7. Catalogue Query

| Term | Definition |
|---|---|
| **CatalogueQuery** | Composite read model for BCK11. |
| **isAvailable** | Boolean per size variant, computed at query time. |
| **SizeVariant** | `{sizeId, sizeName, computedPrice, isAvailable}` within catalogue item. |

### 7.8. Architecture & Infrastructure

| Term | Definition |
|---|---|
| **ADR** | Architecture Decision Record (this document, §5). |
| **Aggregate** | Consistency boundary; external references by business key only. |
| **Bounded Context** | Logical module with its own domain model. **Per Clarification #46**, one container may host several; splitting a bounded context across containers is forbidden. |
| **Business Key** | Human-meaningful identifier used as PK/FK (`username`, `email`, `sku`, `name`, `supplier_code`). |
| **CQRS** | Command-Query Responsibility Segregation. |
| **Dependency Rule** | Source dependencies point inward. |
| **DTO** | Data Transfer Object across layer boundaries. |
| **Port / Adapter** | Interface at architecture boundary / concrete implementation (Hexagonal). |
| **Repository** | Contract for loading/saving aggregates. |
| **UoW / Transaction** | Unit of work; explicit `BEGIN...COMMIT/ROLLBACK`. |
| **Value Object** | Immutable, self-validating domain value. |
| **View (SQL)** | Named query exposing derived data. |
| **Modular Monolith** | Single deployable unit partitioned into business modules. Compliant with Clarification #46. |

### 7.9. Sprint 2+ Glossary Extensions

- **KitchenConfiguration** — Aggregate Root. Opaque JSONB layout, `name` PK, `is_active` boolean. Single active per partial unique index. Material reuse across objects with similar surfaces is permitted (Clarification #31).
- **ConsumptionForecast** — Aggregate Root. Daily expected consumption. Identified by `name`. **Covers non-pizza sellable products too** (`pizza_size = NULL`, Clarification #36). **Days without entries within `[startDate, endDate]` represent zero consumption** (Clarification #37).
- **ForecastEntry** — Entity inside `ConsumptionForecast`. Composite key `(entry_date, product_sku, pizza_size)`. `pizza_size` nullable for non-pizza products.
- **SupplierScenario** — Aggregate Root. Confirmed supplier data for planning. Identified by `name`.
- **Supplier** — Entity inside `SupplierScenario`. Identified by `supplier_code`.
- **SupplierOffer** — Entity inside `SupplierScenario`. Composite key `(supplier_code, product_sku)`; `daily_supply_limit` applies per-offer per-day. `stock_unit_quantity` is an **indivisible lot** (Clarification #30). **One offer per `(supplier, product)`** — no multiple price/quantity modalities (Clarification #44).
- **PlanningResult** — Read-only Aggregate Root. Identified by `execution_id` (SERIAL). Contains `forecast_snapshot`, `scenario_snapshot`, `stock_snapshot` (incl. pending deliveries), `requirements`, `proposals`, `unmet_needs` as JSONB. **Proposals carry `meetsRequiredDate` and `lateByDays`** (Clarification #30). **`reference_date` defaults to execution date; no proposal before `reference_date`** (Clarification #37).
- **PurchaseProposal** — VO inside `PlanningResult`. Fields: `productSku`, `supplierCode`, `quantity` (multiple of `SupplierOffer.stockUnitQuantity`), `orderDate`, `deliveryDate`, `priceEUR`, **`meetsRequiredDate` (boolean), `lateByDays` (integer)** (Clarifications #30, #37).
- **Indivisible Purchase Lot** — A `SupplierOffer.stockUnitQuantity` is a lot that cannot be split. Plans round required quantities **up** to a multiple of the lot (Clarification #30). **One supply arrangement per `(supplier, product)`** (Clarification #44).
- **Late Proposal** — A `PurchaseProposal` with `meetsRequiredDate = false` and `lateByDays > 0`. A late proposal does **not** satisfy the original unmet need. **No maximum delay** (Clarification #37).
- **PendingDelivery** — Sprint 2 planning input (Clarification #37): `{productSku, quantity, expectedDeliveryDate}`. Quantities count as available from `expectedDeliveryDate` onward. Included in `scenario_snapshot`.
- **ReferenceDate** — Sprint 2 planning input (Clarification #37). Defaults to execution date. No proposed order may precede it.
- **StockAvailabilityRule (End of Previous Day)** — Sprint 2 rule (Clarification #37): products required for consumption on day N must be physically available by end of day N−1.
- **AuthSession** — Aggregate Root. Per-login session with `lastActivityAt` (inactivity), `expiresAt` (hard cap), `revokedAt`. Validity requires both inactivity and expiry checks. Logout revokes only this session (Clarifications #29, #34).
- **PlanningSnapshotDomainService** — Domain service that captures deep-copied snapshots.
- **KitchenResource** — Physical station or oven; capacity slots. (Modelled, Sprint 3+ implementation.)
- **PreparationActivity** — Assembly or baking task. (Modelled, Sprint 3+ implementation.)
- **Build Your Pizza** — Optional 3D configurator.
- **Kitchen Visualization** — Mandatory 3D representation (SGRAI).
- **GLTF 2.0 / GLB** — Binary 3D asset format.
- **LLM / Generative AI** — As applied to supplier JSON preparation.
- **GDPR Controller** — Entity responsible for personal data processing (LaPrizza restaurant).
- **MBCO** — Minimum Business Continuity Objective (SYS07).
- **OIDC** — OpenID Connect; identity layer over OAuth 2.0.
- **PKCE** — Proof Key for Code Exchange; OAuth 2.0 extension for public clients.
- **JIT Provisioning** — Just-In-Time user creation on first external login.
- **Significant Action** — Sprint 2 UX concept (Clarification #39). Any operation that can cause data loss, hard-to-reverse changes, or business impact (delete record, deactivate user, role change, cancel order). Must trigger a confirmation dialogue.
- **Connection Failure Timeout** — Sprint 2 UX concept (Clarification #39). Configurable `API_TIMEOUT_MS`; no maximum imposed.
- **Idempotent Retry** — Sprint 2 UX/API concept (Clarification #39). Retry of a connection-failed operation must not duplicate already-performed operations.

---

# PART II — DOMAIN MODEL & RATIONALE

## 8. Domain Model (Aggregates, Entities, Value Objects)

The full PlantUML diagram lives in `@startuml domain-model-general.txt`; the companion rationale is `domain-model.sketch.md` (v3.1). This section provides the textual structure.

### 8.1. Aggregates (21 in the unified model v2.6)

**Sprint 1 implemented (10):**

1. **`User`** (Root) — Identity, credentials, lifecycle, roles, dietary restrictions. **Sprint 2 extensions:** optional `passwordHash`, `externalIdpSubject`, `invitations: List<ActivationInvitation>`.
2. **`Customer`** (Root) — Commercial profile, addresses, consent, VAT.
3. **`ProductCategory`** (Root) — Category catalogue.
4. **`Allergen`** (Root) — Allergen catalogue.
5. **`Product`** (Root) — Master catalogue items. **Sprint 2 extension:** `stockUnitsPerSale : Integer [0..1]`.
6. **`PizzaSize`** (Root) — Size tiers.
7. **`PizzaComponentType`** (Root) — Role classification + cardinality.
8. **`ComponentSizeConfiguration`** (Root) — Size-dependent price and consumption.
9. **`StockItem`** (Root) — Inventory balance + movements.
10. **`PredefinedPizza`** (Root) — Standard recipes. **Sprint 2 refinement:** backing `Product` MUST NOT be `isStockControlled` (Clarifications #35, #38).

**Sprint 2 additions (9):**

11. **`KitchenConfiguration`** (Root) — Opaque JSONB layout + `isActive` invariant. Identified by `ConfigurationName`.
12. **`ConsumptionForecast`** (Root) — Daily sellable-product consumption forecasts (including non-pizza products). Identified by `ForecastName`.
13. **`SupplierScenario`** (Root) — Confirmed supplier + offers for planning. Identified by `ScenarioName`. Offers are indivisible lots and one offer per `(supplier, product)`.
14. **`PlanningResult`** (Root) — Immutable outcome of BOM/Requirements Planning execution with snapshots. Identified by `executionId` (internal SERIAL). Proposals carry `meetsRequiredDate` and `lateByDays`. Pending deliveries captured in `scenario_snapshot`.
15. **`RoleChangeLog`** (Root) — Append-only role-change audit. Identified by `logId` (internal SERIAL).
16. **`AuthSession`** (Root) — Per-login session with inactivity-based validity. Identified by `id` (UUID). Logout revokes only this session.
17. **`PasswordRecovery`** (Root, v2.6, ADR-016) — Single-use, TTL-bound password-reset token. `id` UUID PK. Contains `token_hash`, `username FK`, `expires_at`, `used_at`, `revoked_at`.
18. **`RolesAssignment`** (Supporting, v2.6) — Persistence artefact normalizing user role assignments (migration 019). Exposed via `RolesAssignmentService`.
19. **`StatusAssignment`** (Supporting, v2.6) — Persistence artefact normalizing user status (migration 020). Exposed via `StatusAssignmentService`.

**Modelled but not yet implemented (Sprint 3+, 2 remaining):**

20. **`CustomerOrder`** (Root) — Order lifecycle with `OrderItem` entities and `PersonalizedPizzaSnapshot` VOs.
21. **`PreparationActivity`** (Root) — Kitchen scheduling tasks. `KitchenResource` is a supporting aggregate.

### 8.2. Shared Kernel

- `PersonName` (VO) — `{firstName, lastName, fullName()}`.
- `Email` (VO).
- `Money` (VO) — `{amount, currency}`; non-negative invariant.
- `Timestamp` (VO).
- `Designation` (VO) — Trimmed, non-empty string.
- `PasswordHash` (VO).
- `RoleName` (VO).
- `Address` (VO) / `DeliveryAddress` (VO).
- `PhoneNumber` (VO).
- `StockQuantity` / `AbstractStockQuantity` (VO) — Non-negative integer.
- `AssemblyOrder` (VO) — Positive integer.
- `CardinalityBounds` (VO) — `{minimum, maximum?, isSatisfiedBy(int)}`.
- `ExternalIdpSubject` (VO) — OIDC `sub` claim.
- `ActivationInvitationToken` (VO) — Cryptographically secure single-use token.
- `SessionId` (VO) — UUID identifying an `AuthSession`.
- **`PasswordPolicy` (VO)** — Enforces password complexity/strength (Clarification #32).
- **`PasswordRecoveryToken` (VO)** — Single-use cryptographically secure token (ADR-016).

### 8.3. Relationship Highlights

- `User` *--> `DietaryRestriction` (0..*)
- `User` *--> `ActivationInvitation` (0..*)
- `User` *--> `AuthSession` (0..*)
- `User` *--> `PasswordRecovery` (0..*) — v2.6
- `User` *--> `RolesAssignment` (1..*) — v2.6
- `User` *--> `StatusAssignment` (0..1) — v2.6
- `Customer` ..> `User` (0..1, by `username`)
- `Customer` *--> `CustomerAddress` (0..*)
- `Product` --> `ProductCategory` (by `categoryName`)
- `Product` --> `PizzaComponentType` (0..1, by `name`)
- `Product` --> `Allergen` (0..*, by `name`)
- `StockItem` --> `Product` (by `sku`)
- `ComponentSizeConfiguration` --> `Product` (component) + `PizzaSize`
- `PredefinedPizza` *--> `RecipeLine` (1..*)
- `PredefinedPizza` --> `PizzaSize` (via available sizes)
- `PredefinedPizza` --> `Product` (sellable, by `sku`)
- `ConsumptionForecast` *--> `ForecastEntry` (0..*)
- `SupplierScenario` *--> `Supplier` (1..*) and `SupplierOffer` (1..*)
- `PlanningResult` ..> `ConsumptionForecast` (by `forecastName`, 0..1 with `ON DELETE SET NULL`)
- `PlanningResult` ..> `SupplierScenario` (by `scenarioName`, 0..1 with `ON DELETE SET NULL`)
- `KitchenConfiguration` (independent, no cross-aggregate reference)
- `RoleChangeLog` ..> `User` (soft reference by `username`, no FK)

### 8.4. Enumerations

- `UserRole` = `{ADMINISTRATOR, MANAGER, EMPLOYEE, CUSTOMER}` (v2.6; Sprint 2 Table 1, Clarification #42)
- `UserStatus` = `{ACTIVE, DEACTIVATED, PENDING_REGISTRATION}`
- `StockMovementType` = `{REPLENISHMENT, CONSUMPTION, ADJUSTMENT}`
- `InvitationPurpose` = `{LOCAL_ACCOUNT_ACTIVATION, EXTERNAL_IDP_MATCH, PASSWORD_RESET}`
- (Future) `OrderStatus` = `{SIMULATED, PLACED, CONFIRMED, IN_PREPARATION, READY, DELIVERED, CANCELLED}`
- (Future) `OrderItemType` = `{STANDARD_PRODUCT, PERSONALIZED_PIZZA}`
- (Future) `FulfillmentStatus` = `{WAITING_PREPARATION, BEING_PREPARED, READY_TO_SERVE, SERVED}`
- (Future) `ActivityStatus` = `{WAITING, SCHEDULED, IN_PROGRESS, COMPLETED}`

---

## 9. Domain Model Rationale & Decision Logs

The full rationale lives in `domain-model.sketch.md` and `docs/domain/`. Key decision logs:

### 9.1. Decision Log 1: Roles, Governance & Lifecycle Safety

- **Initial:** `KITCHEN_STAFF`, optional `ADMINISTRATOR`.
- **Clarified (Clarifications #03, #04, #24, #25):** Roles = `{MANAGER, EMPLOYEE, CUSTOMER}`. No separate admin (the "first Administrator" is a functional designation held by a `MANAGER`). Public registration issues only `CUSTOMER`. Privileged staff are Manager-invited, starting at `PENDING_REGISTRATION`.
- **Update:** Enum revised. `UserStatus` gains `PENDING_REGISTRATION`. `User` factories: `createCustomer(...)`, `inviteStaffMember(...)`, `completeRegistration(passwordHash)`.
- **v2.6 update (Clarifications #42, #46):** Role set is now `{ADMINISTRATOR, MANAGER, EMPLOYEE, CUSTOMER}`. `ADMINISTRATOR` is a distinct role for user/role administration and application-log access. Bootstrap "first Administrator" of Clarification #24 §1.1 remains a `MANAGER` designation; the `ADMINISTRATOR` role is a separate Sprint 2 concept. **#04 is partially superseded for Sprint 2 scope.**

### 9.2. Decision Log 2: Customer Identity, Name Decomposition & Kiosk

- **Initial:** Monolithic name; required 1:1 with User.
- **Clarified (Clarifications #01, #02):** Mandatory fields = First Name, Last Name, Phone Number, Email. Kiosk = anonymous (no persistent record).
- **Update:** Shared Kernel `PersonName` with `firstName` + `lastName`. `Customer.username` optional (`0..1`). `CustomerOrder.customerId` optional for kiosk orders.

### 9.3. Decision Log 3: Product Typology & Stock Invariants

- **Initial:** All flags independent.
- **Clarified (Clarification #06):** `(isSellable || isPizzaComponent)` required. Stock-controlled is orthogonal.
- **Update:** `Product.validateProductTypes()` enforces the invariant at factory + mutation boundaries.

### 9.4. Decision Log 4: Predefined Pizza Pricing

- **Initial:** Base price + component costs.
- **Clarified (Clarifications #01, #05):** No base price. Price = Σ component prices.
- **Update:** Removed `basePrice` field. Added `calculatePriceForSize(pizzaSize): Money`.

### 9.5. Decision Log 5: Stock-Dependent Size Availability

- **Initial:** `quantity > 0` sufficient.
- **Clarified (Clarification #01 Q5):** `currentUnits >= stockUnitsConsumed`.
- **Update:** `StockItem.hasSufficientStock(...)` + `PredefinedPizza.isAvailableInSize(...)`.

### 9.6. Decision Log 6: Flexible Pizza Personalization

- **Initial:** Must originate from predefined pizza.
- **Clarified (Clarification #01 Q10):** Optional from-scratch.
- **Update:** `PersonalizedPizzaSnapshot.sourcePredefinedPizzaId` optional.

### 9.7. Decision Log 7: Product Lifecycle, Zero Price, Predefined Exclusivity

- **Clarified (Clarifications #08, #11, #14):** Names not unique (business key `sku` is). Zero price allowed. Predefined pizza cannot be a component. Deactivation preserves references. Product can only drop `isPizzaComponent` if unreferenced.
- **Update:** `Money` allows `amount >= 0.00`. `activate()` / `deactivate()` lifecycle methods. `409 Conflict` on invalid role transitions.

### 9.8. Decision Log 8: Taxonomy Immutability vs Deactivation

- **Clarified (Clarifications #17, #18):** No deactivation for Category/Allergen/ComponentType. 4 base types immutable, unique assembly order.
- **Update:** Categories and allergens maintain pure lifecycle (create / delete only). `PizzaComponentType.assemblyOrder` is `UNIQUE`. Base types blocked from deletion.

### 9.9. Decision Log 9: Stock Operations on Inactive & Deduction Timing

- **Clarified (Clarifications #12, #15, #19):** Stock adjustable on inactive products. No mandatory audit table in Sprint 1 (implemented anyway for robustness). Deduct on order confirmation.
- **Update:** `StockItem.replenishStock` / `consumeStock` independent of `Product.active`. `CustomerOrder.confirmOrder()` will emit stock deduction event in later sprints.

### 9.10. Decision Log 10: Unified Email & Non-Blocking Dietary Warnings

- **Clarified (Clarifications #09, #16):** Same email for auth and contact. NIF optional. Warnings do not block.
- **Update:** Unified `Email` VO across User and Customer. `Customer.vatNumber` optional. Allergen conflicts return warning descriptors.

### 9.11. Decision Log 11: Kitchen Configuration as Opaque JSON

- **Adjusted (WEB06/VIS02):** `jsonContent` is opaque; validation is delegated to a `KitchenConfigValidationService` (`Pure Fabrication`).
- **Rationale:** Keeps 3D rendering concerns out of the domain; allows schema evolution without model churn.

### 9.12. Decision Log 12: Single Active Kitchen Configuration

- **Adjusted (WEB06):** "Exactly one active configuration" is a strict system invariant.
- **Rationale:** Deterministic answer for the 3D viewer; enforced by partial unique index (ADR-011).

### 9.13. Decision Log 13: ConsumptionForecast as Aggregate

- **Adjusted (WEB07):** Wrap daily consumption in `ConsumptionForecast` aggregate with `ForecastEntry` entities. Identified by `ForecastName`. **Covers non-pizza products** with `pizza_size = NULL` (Clarification #36). **Days without entries within the range are zero** (Clarification #37).
- **Rationale:** Named artefact; invariants scoped to aggregate; snapshot pattern guarantees historical results aren't silently changed.

### 9.14. Decision Log 14: SupplierScenario as Aggregate

- **Adjusted (WEB07/AI06):** Each `SupplierScenario` (identified by `ScenarioName`) contains its own `Supplier` and `SupplierOffer` entities. Explicit `confirm()` transitions to "ready for Prolog". `isSimulated` captures LLM/manual origin. Offers are indivisible lots (Clarification #30). **One offer per `(supplier, product)` — no multiple modalities** (Clarification #44).
- **Rationale:** Clarification #28 requires explicit confirmation; modelling scenarios isolates simulations from operational data.

### 9.15. Decision Log 15: PlanningResult as Read-Only Aggregate with Snapshots

- **Adjusted (WEB07, AI05):** Persist `PlanningResult` with immutable `ForecastSnapshot`, `SupplierScenarioSnapshot`, `StockSnapshot` (incl. `pendingDeliveries`) and requirement/proposal/unmet-need VOs. Proposals carry `meetsRequiredDate` and `lateByDays` (Clarification #30). **`referenceDate` defaults to execution date; no order date before `referenceDate`** (Clarification #37). Stock for day N available by end of day N−1 (Clarification #37).
- **Rationale:** WEB07 AC "editing a forecast must not change earlier results"; Clarification #28 replay uses original dataset; Clarification #26 plans never change stock nor create POs. Read-only — mutator methods called only during construction. Late-proposal labelling per Clarification #30.

### 9.16. Decision Log 16: External IdP → `externalIdpSubject`

- **Adjusted (AA02, Clarification #27):** Store OIDC `sub` claim as `externalIdpSubject`.
- **Rationale:** `sub` stable/immutable; email can change. Combined with optional `passwordHash`, a single `User` model serves both local and external accounts without subclassing.

### 9.17. Decision Log 17: ActivationInvitation as Entity Inside `User`

- **Adjusted (AA06/AA07, Clarification #24, extended by #32):** Modelled as an **entity inside `User` aggregate**, identified by unique `InvitationToken`. **v2.6 (ADR-016/ADR-017):** `purpose = PASSWORD_RESET` retained in enum for compatibility but **not used**; password recovery now dedicated aggregate.
- **Rationale:** Cardinality bounded (≤1 active per `(user, purpose)`); invariants scoped to User aggregate; history retained via `revokedAt`/`usedAt`.

### 9.18. Decision Log 18: RoleChangeLog as Separate Aggregate

- **Adjusted (Clarification #24 §1.4):** Separate `RoleChangeLog` aggregate, identified by internal `logId`.
- **Rationale:** Append-only, cross-user queryable, never loaded on routine User fetch.

### 9.19. Decision Log 19: `Product.stockUnitsPerSale`

- **Adjusted (Clarification #28 §2):** Add field; enforce presence only when `isStockControlled ∧ isSellable`; absence is a hard planning error, not a silent default of 1. **Applies to non-pizza sellable products** as well (Clarification #36).

### 9.20. Decision Log 20: Role Set Unchanged

- **Adjusted (Clarifications #25, #24):** `MANAGER`, `EMPLOYEE`, `CUSTOMER` remain (Sprint 1). **v2.6:** Sprint 2 adds `ADMINISTRATOR` (Clarification #42).

### 9.21. Decision Log 21: Strict Adherence to Business Keys (Zero UUIDs in Relations)

- **Adjusted:** The entire architecture (Domain Model + Physical Schema) uses **Business Keys** (`username`, `email`, `sku`, `name`, `supplier_code`) as primary identifiers and references. SERIAL is used only for audit/transactional artefacts (`role_change_logs`, `planning_results`, `customer_orders`) that possess no natural business key and are system-generated. `AuthSession.id` and `PasswordRecovery.id` use UUID (unpredictable per-login/per-recovery identifiers).
- **Rationale:**
  - **Ubiquitous Language:** Business keys self-validate the domain.
  - **Traceability:** Easier debugging and auditing.
  - **Integrity:** Semantic links are explicit in the schema.

### 9.22. Decision Log 22: AuthSession tracks inactivity separately from token expiry (Clarifications #29, #34)

- **Initial thinking:** treat `expiresAt` (matching JWT expiry) as the sole session-validity criterion.
- **Adjusted:** Session validity requires **both**:
  - `now < expiresAt` (hard cap, e.g., refresh-token TTL), **and**
  - `now − lastActivityAt < SESSION_INACTIVITY_MINUTES` (sliding inactivity).
- **Rationale:** Clarification #29: session expires on configurable inactivity, refreshed while active, **no** absolute-login-time cap. Clarification #34: refresh renews while active but may not bypass the inactivity limit. Logout revokes **only the current device's** session.
- **Configuration:** `SESSION_INACTIVITY_MINUTES`, `JWT_EXPIRES_IN` (both env vars).

### 9.23. Decision Log 23: Indivisible purchase lots and late proposals (Clarification #30)

- **Initial thinking:** treat `SupplierOffer.stockUnitQuantity` as the price base and permit proportional purchases below the lot.
- **Adjusted:** `stockUnitQuantity` is an **indivisible lot**. The plan rounds required quantity **up** to a multiple of the lot; surplus remains in hypothetical stock. When no supplier can deliver by the required date, the requirement is reported as `UnmetNeed` and any later proposal carries `meetsRequiredDate = false` and `lateByDays > 0`. A late proposal never removes the original unmet need.
- **v2.6 extension (Clarification #37):** No maximum delay; one supplier may have one offer per product (Clarification #44) but multiple suppliers may be used on the same day.

### 9.24. Decision Log 24: Login = case-insensitive email; password recovery via single-use link (Clarification #32)

- **Adjusted:**
  - Local login accepts only `email` (not `username`), case-insensitive.
  - Password recovery uses a single-use, TTL-bound link. **v2.6 (ADR-016):** Dedicated `password_recovery` table, not `ActivationInvitation`. TTL = `PASSWORD_RECOVERY_TTL_HOURS`.
  - Password policy (per ASIST) applies uniformly to creation, change, and recovery; enforced by `PasswordPolicy`.
  - `PENDING_REGISTRATION` users blocked from login; SPA exposes resend-activation.

### 9.25. Decision Log 25: Resource-level authorization for multi-role users (Clarification #33)

- **Adjusted:** Multi-role users accumulate role permissions, but **data-ownership and confidentiality restrictions apply per operation and per resource**. `RolesGuard` alone is insufficient; a resource-level policy (`CustomerAccessPolicy` or `@OwnerCheck` decorator) enforces the ownership rule.
- **Concrete example:** `Employee + Customer` may use Employee features and Customer self-service features, but must not read other customers' personal data (as Employee) or access other customers' records (as Customer).

### 9.26. Decision Log 26: PredefinedPizza has no own stock (Clarifications #35, #38)

- **Adjusted:** The `Product` backing a `PredefinedPizza` is **not** `isStockControlled`. Stock is tracked at the component level. Deduction happens at order confirmation (consistent with Clarification #12).
- **Rationale:** Clarification #35 confirms predefined pizzas are made on demand; **Clarification #38** reinforces that they are not conventional sellable products. Enforced as an invariant prevents accidental inventory of pizzas and keeps the BOM-driven stock model coherent. Migration `022_predefined_pizza_no_stock.sql` enforces it at DB level.

### 9.27. Decision Log 27: Non-pizza sellable products included in forecasts and planning (Clarification #36)

- **Adjusted:** `ConsumptionForecast` entries cover **all** sellable products:
  - Pizzas → `pizzaSize` set, needs derived via BOM.
  - Non-pizza sellable (drinks, desserts) → `pizzaSize = null`, needs derived via `Product.stockUnitsPerSale`.
- **Rationale:** Clarification #36 explicitly requires non-pizza products in forecasts, exports, supplier scenarios, and replenishment plans. `stock_units_per_sale` already exists (Clarification #28 §2), and `pizza_size` is already nullable in `consumption_forecast_entries` (migration 014). **No schema change required.**

### 9.28. Decision Log 28: Session inactivity / token config surfaced as env vars (Clarifications #29, #32, #34)

- **Adjusted:** The following env vars are introduced and documented in `.env.example`:
  - `SESSION_INACTIVITY_MINUTES` — inactivity timeout for `AuthSession`.
  - `JWT_EXPIRES_IN` — access-token lifetime.
  - `PASSWORD_RECOVERY_TTL_HOURS` — password-reset link TTL.
  - `INVITATION_TTL_HOURS` — activation invitation TTL (already existed).
- **Rationale:** All three clarifications require configurability without code changes. The env-var mechanism satisfies this at zero schema cost (no migration).

### 9.29. Decision Log 29 (v2.6): ADMINISTRATOR role introduced in Sprint 2 (Clarifications #42, #46; supersedes #04 for Sprint 2 scope)

- **Initial:** Sprint 1 excluded `ADMINISTRATOR` (Clarification #04). KB v2.5 preserved that exclusion.
- **Adjusted:** Sprint 2 Table 1 formally introduces `ADMINISTRATOR` as a distinct role for user/role administration and application-log access. **Clarification #42** reinforces this by restricting the audit-log endpoint to `ADMINISTRATOR`. Migration `1793836802000-AdministratorRole.ts` and `ADR-016`/`ADR-017` align the implementation. The bootstrap "first Administrator" concept from Clarification #24 §1.1 remains a **`MANAGER` functional designation** and is distinct from the `ADMINISTRATOR` role.
- **Impact:** `UserRole` enum extended to `{ADMINISTRATOR, MANAGER, EMPLOYEE, CUSTOMER}`. The administrator-only audit consultation remains a planned controller surface. RBAC matrix (§23) is the target contract; the current repository already enforces the role on implemented user-management endpoints. Clarification #04 is **partially superseded**.

### 9.30. Decision Log 30 (v2.6): Password recovery is a dedicated aggregate (ADR-016, Clarification #32)

- **Initial (KB v2.5):** Reuse `ActivationInvitation` with `purpose = PASSWORD_RESET`.
- **Adjusted:** Dedicated `password_recovery` table with UUID PK, hashed token, `expires_at`, `used_at`, `revoked_at`. `PasswordRecoveryService` orchestrates. `PasswordRecoveryController` exposes `POST /auth/password-recovery` and `POST /auth/password-reset`. `SmtpRecoveryMailer` sends emails. Successful recovery revokes all `auth_sessions` for that user (defence-in-depth).
- **Rationale:** Distinct lifecycle, distinct TTL, cleaner audit trail. Supersedes the earlier KB hint.

### 9.31. Decision Log 31 (v2.6): Pending deliveries as planning input (Clarification #37)

- **Adjusted:** `PlanningExecutionRequestDTO` extended with optional `referenceDate` and `pendingDeliveries[]`. `PlanningService` includes these in `scenario_snapshot`. Prolog algorithm treats pending quantities as available from `expectedDeliveryDate` onward. Stock required for consumption on day N must be available by end of day N−1.
- **Rationale:** Clarification #37 defines both semantics explicitly.
- **Impact:** `PlanningResult.scenario_snapshot` schema extension (backward compatible — new optional keys); OpenAPI `2.2.0`; Prolog `planning.pl` updated; DTO and tests updated.

### 9.32. Decision Log 32 (v2.6): Confirmation dialogues on significant actions (Clarification #39)

- **Adjusted:** The Angular SPA shows a `ConfirmDialog` (modal) before:
  - Deleting records (categories, allergens, products, recipes, forecasts, scenarios, kitchen configurations).
  - Deactivating user accounts.
  - Changing user roles.
  - Cancelling orders (when implemented).
- **Rationale:** Clarification #39 explicitly enumerates these.
- **Impact:** `frontend/src/app/shared_components/ui/modal/`; ADR-009 updated; SPA UX tests; no back-end impact.

### 9.33. Decision Log 33 (v2.6): Deployment can be external (Clarification #40)

- **Adjusted:** `docs/asist/sys-deployment.md` allows Azure, AWS, or other clouds. SSH-from-outside permitted; credentials via GitHub Actions Secrets. Self-hosted runners not required.
- **Rationale:** Clarification #40.
- **Impact:** SYS01 documentation; CI workflows; no domain change.

### 9.34. Decision Log 34 (v2.6): AI01 aggregate recursivity (Clarification #41)

- **Adjusted:** Domain scope: only pizzas have BOM, permanently. IARTI-specific requirements (recursive BOM, aggregate decomposition) are out of LaPrizza domain scope; the team must consult the IARTI RUC.
- **Rationale:** Clarification #41.
- **Impact:** `prolog/planning.pl` may implement recursive BOM as a simulated scenario if IARTI requires; LaPrizza domain (DB + REST) unchanged. **Team action pending:** consult IARTI RUC.

### 9.35. Decision Log 35 (v2.6): SYS04 shared folder access via web SPA (Clarification #43)

- **Adjusted:** Users access shared resources through the web app (authenticated). Direct filesystem access not required. Back-end enforces access control. `SYS04 AC` fulfilled by a documented `GET /api/v1/shared-resources/{path}` (planned; not yet implemented).
- **Rationale:** Clarification #43.
- **Impact:** `docs/asist/sys-shared-folder.md`; new backend endpoint (Sprint 2/3); no domain change.

### 9.36. Decision Log 36 (v2.6): One supply arrangement per `(supplier, product)` (Clarification #44)

- **Adjusted:** `SupplierScenarioService.validateOffer` rejects duplicate `(scenario, supplier, product)` pairs with a business error (`409 Conflict`), not just a DB unique-constraint error. This is already enforced by `PRIMARY KEY (scenario_name, supplier_code, product_sku)`.
- **Rationale:** Clarification #44.
- **Impact:** `SupplierScenarioService`; tests; no schema change.

### 9.37. Decision Log 37 (v2.6): GDPR/Consent redirect (Clarification #45)

- **Adjusted:** Client redirected GDPR/consent questions to LAPR5 TP lecturer. No new business rule. Current consent model (`customers.marketing_consent` + `consent_timestamp`) remains provisionally valid. Team must obtain a decision from LAPR5 lecturer and record it as a future clarification or addendum.
- **Rationale:** Clarification #45.
- **Impact:** No immediate change; `docs/gdpr-policy.md` updated to reflect pending status.

### 9.38. Decision Log 38 (v2.6): Bounded Context rule (Clarification #46)

- **Adjusted:** One container = one bounded context is a default; one container may host several bounded contexts (allowed and common); **splitting a bounded context across containers is the anti-pattern to avoid**. Modular Monolith (ADR-001) complies.
- **Rationale:** Clarification #46 (official announcement).
- **Impact:** ADR-001 updated with compliance note; `docs/sad/04-principles-and-guidelines.md`; no code change.

---

## 10. Business Invariants & Referential Integrity

### 10.1. Domain-Level Invariants (Unified Sprint 1 + Sprint 2)

| # | Invariant | Enforcement | Origin |
|---|---|---|---|
| 1 | `(isSellable ∨ isPizzaComponent) == true` for all products | Domain `Product.validateProductTypes()` | Clarification #06 |
| 2 | A `PredefinedPizza` product cannot also be `isPizzaComponent` | `Product` + `PredefinedPizza` cross-check | Clarification #11 |
| 3 | Every `Product` references exactly one `ProductCategory` | `Product.create` + DB FK `ON DELETE RESTRICT` | Clarification #08 |
| 4 | `Money.amount ≥ 0` | `Money` VO | Clarification #11 |
| 5 | `currentUnits ≥ 0` on `StockItem` | `StockItem` + DB `CHECK` | BCK09 |
| 6 | `stockUnitsConsumed ≥ 0` on `ComponentSizeConfiguration` | VO + DB `CHECK` | Clarification #13 |
| 7 | `assemblyOrder` unique across `PizzaComponentType` | DB `UNIQUE` + domain check | Clarification #18 |
| 8 | 4 base `PizzaComponentType` immutable | `PizzaComponentTypeService` + domain guards | Clarification #18 |
| 9 | At most one `KitchenConfiguration` with `isActive = true` | `KitchenConfigurationService.activate(name)` + partial unique index | WEB06, ADR-011 |
| 10 | `SupplierOffer.leadTimeDays ≥ 0` and integer | `SupplierOffer` factory + Joi | Clarification #28 §4 |
| 11 | `(supplierCode, productSku)` unique within a `SupplierScenario` | `SupplierScenario.addOffer` + DB `UNIQUE` | WEB07, Clarification #44 |
| 12 | `dailySupplyLimit` applies per-offer, not per-supplier | `SupplierScenarioService` + `SupplierOffer` | Clarification #28 follow-up |
| 13 | `(date, productSku, pizzaSize)` unique within a `ConsumptionForecast` | `ConsumptionForecast.addEntry` | WEB07 |
| 14 | `date ∈ [startDate, endDate]` for every `ForecastEntry` | `ConsumptionForecast.addEntry` | WEB07 |
| 15 | `PlanningResult` never mutates stock | Read-only aggregate + no `StockItem` reference | Clarification #26 |
| 16 | `PlanningResult` snapshots preserved on later edits | `PlanningSnapshotDomainService` | WEB07, Clarification #28 §3 |
| 17 | `User` has `passwordHash` **or** `externalIdpSubject` | `User` factory + `AuthService` | AA01, AA02, ADR-010 |
| 18 | At most one active `ActivationInvitation` per `(user, purpose)` | `User.issueInvitation` | AA06, Clarification #24 §2.2, ADR-017 |
| 19 | ≥ 1 active `MANAGER` at any time | `UserService.deactivate` / `removeRole` | Clarification #24 §1.2 |
| 20 | `Product.stockUnitsPerSale` required iff `isStockControlled ∧ isSellable` at planning time | `PlanningService` (fails calculation with actionable error) | Clarification #28 §2, reinforced by #36 |
| 21 | Invitation TTL enforced | Env-var `INVITATION_TTL_HOURS` + DB timestamp | Clarification #24 |
| 22 | **`AuthSession` validity requires `now < expiresAt` AND `now − lastActivityAt < SESSION_INACTIVITY_MINUTES`** | `AuthSession.isActive(Date)` | Clarifications #29, #34 |
| 23 | **Logout revokes only the current `AuthSession`; other sessions of the same account remain active** | `AuthService.logout(sessionId)` | Clarification #29 |
| 24 | **`PredefinedPizza` backing `Product` MUST NOT be `isStockControlled`; stock tracked at component level** | `Product` factory + `PredefinedPizzaService` cross-check + migration `022_predefined_pizza_no_stock.sql` | Clarifications #35, #38 |
| 25 | **`PurchaseProposal.quantity` is a multiple of `SupplierOffer.stockUnitQuantity`; `meetsRequiredDate=false` ⟹ `lateByDays > 0`; a late proposal does not satisfy the original unmet need** | `PlanningService` + `PlanningResult` VO factories | Clarifications #30, #37 |
| 26 | **`ConsumptionForecast` entries cover non-pizza sellable products with `pizzaSize = null` and require `stockUnitsPerSale` for planning** | `ConsumptionForecast.addEntry` + `PlanningService` | Clarification #36 |
| 27 | **Password policy enforced uniformly on create / change / recover; `PENDING_REGISTRATION` users blocked from login** | `PasswordPolicy` + `AuthService.login` | Clarification #32, ADR-016 |
| 28 | **Multi-role access is checked per operation and per resource; `RolesGuard` alone is insufficient** | `CustomerAccessPolicy` (domain service) + guards | Clarification #33 |
| 29 | **Material reuse permitted across objects with similar surfaces; performance optimisation must be demonstrated and justified (no reference hardware)** | `docs/sg/3d-assets-guide.md` + SGRAI demo | Clarification #31 |
| **30** | **`UserRole` enum is `{ADMINISTRATOR, MANAGER, EMPLOYEE, CUSTOMER}`; `ADMINISTRATOR` is the sole role authorised to consult application `unauthorized_attempts`; system/infrastructure logs are outside the web role taxonomy** | `RolesGuard` + planned audit controller + `UserRole` enum | Sprint 2 Table 1, Clarifications #42, #46 |
| **31** | **`password_recovery` tokens are single-use, TTL-bound (`PASSWORD_RECOVERY_TTL_HOURS`); successful consumption revokes all active `auth_sessions` for the user** | `PasswordRecoveryService` + DB `CHECK` | Clarification #32, ADR-016 |
| **32** | **`PlanningResult` inputs include `pendingDeliveries[]`; no proposed order date precedes `referenceDate`; stock for day N available by end of day N−1** | `PlanningService` + `PrologHttpClient` contract + Prolog algorithm | Clarification #37 |
| **33** | **`(scenario, supplier, product)` unique — one supply arrangement per supplier per product** | DB `PRIMARY KEY` + `SupplierScenarioService.validateOffer` business error | Clarification #44 |
| **34** | **Only pizzas have BOM; applies permanently to LaPrizza domain (permanence stated in Clarification #41)** | Domain model (no BOM entity for non-pizza); `PlanningService` | Clarifications #28, #36, #41 |
| **35** | **Significant actions (delete, deactivate user, role change, cancel order) require confirmation dialogue; retries must be idempotent-safe (no duplicate side effects)** | Angular `ConfirmDialog` + backend idempotency keys | Clarification #39 |
| **36** | **Application access logs consultable only by `ADMINISTRATOR`; system/infra logs by technical operations (outside web roles)** | `RolesGuard` + planned audit controller | Clarification #42 |
| **37** | **Bounded context NOT split across containers; one container may host multiple** | ADR-001 compliance; per-module NestJS structure | Clarification #46 |

### 10.2. Referential Integrity (ON DELETE behaviours)

All cross-aggregate references use **Business Keys**; UUIDs are absent from FK relationships (exception: `auth_sessions.id` and `password_recovery.id` are UUID PKs but not referenced by other aggregates).

| FK | Source → Target | Policy | Rationale |
|---|---|---|---|
| `fk_auth_sessions_user` | `auth_sessions(username)` → `users(username)` | **CASCADE** | Sessions die with the user. |
| `fk_password_recovery_user` | `password_recovery(username)` → `users(username)` | **CASCADE** | v2.6: Recovery tokens die with the user. |
| `fk_user_roles_user` | `user_role_assignments(username)` → `users(username)` | **CASCADE** | Roles belong to User aggregate. |
| `fk_roles_assignment_user` | `roles_assignment(username)` → `users(username)` | **CASCADE** | v2.6: Normalized persistence artefact. |
| `fk_status_assignment_user` | `status_assignment(username)` → `users(username)` | **CASCADE** | v2.6: Normalized persistence artefact. |
| `fk_customers_user` | `customers(username)` → `users(username)` | **SET NULL** | Preserves customer business history after account deletion. |
| `fk_user_diet_user` | `user_dietary_restrictions(username)` → `users(username)` | **CASCADE** | Removing user removes its dietary restrictions. |
| `fk_user_diet_allergen` | `user_dietary_restrictions(allergen_name)` → `allergens(name)` | **RESTRICT** | BCK04 AC6: allergen referenced by dietary profile cannot be deleted. |
| `fk_activation_invitations_user` | `activation_invitations(username)` → `users(username)` | **CASCADE** | Invitations die with the user. |
| `fk_products_category` | `products(category_name)` → `product_categories(name)` | **RESTRICT** | BCK03 AC5. |
| `fk_products_comp_type` | `products(component_type_name)` → `pizza_component_types(name)` | **RESTRICT** | BCK07 AC7. |
| `fk_product_allergens_product` | `product_allergens(product_sku)` → `products(sku)` | **CASCADE** | Allergen links belong to Product aggregate. |
| `fk_product_allergens_allergen` | `product_allergens(allergen_name)` → `allergens(name)` | **RESTRICT** | BCK04 guard. |
| `fk_comp_size_product` | `component_size_configurations(product_sku)` → `products(sku)` | **RESTRICT** | BCK08 guard. |
| `fk_comp_size_size` | `component_size_configurations(pizza_size)` → `pizza_sizes(name)` | **RESTRICT** | BCK06 AC6. |
| `fk_stock_items_prod` | `stock_items(product_sku)` → `products(sku)` | **RESTRICT** | Orphan prevention. |
| `fk_stock_movements_prod` | `stock_movements(product_sku)` → `stock_items(product_sku)` | **RESTRICT** | Movement integrity. |
| `fk_predefined_pizzas_product` | `predefined_pizzas(sku)` → `products(sku)` | **RESTRICT** | BCK10 guard. |
| `fk_recipe_lines_pizza` | `predefined_pizza_recipes(pizza_sku)` → `predefined_pizzas(sku)` | **CASCADE** | Recipe lines belong to pizza. |
| `fk_recipe_lines_product` | `predefined_pizza_recipes(component_product_sku)` → `products(sku)` | **RESTRICT** | BCK10 guard. |
| `fk_predefined_sizes_pizza` | `predefined_pizza_available_sizes(pizza_sku)` → `predefined_pizzas(sku)` | **CASCADE** | Available sizes belong to pizza. |
| `fk_predefined_sizes_size` | `predefined_pizza_available_sizes(pizza_size)` → `pizza_sizes(name)` | **RESTRICT** | BCK06 guard. |
| `fk_forecast_entries_forecast` | `consumption_forecast_entries(forecast_name)` → `consumption_forecasts(name)` | **CASCADE** | Entries die with forecast. |
| `fk_forecast_entries_product` | `consumption_forecast_entries(product_sku)` → `products(sku)` | **RESTRICT** | Clarification #28 §3. |
| `fk_forecast_entries_size` | `consumption_forecast_entries(pizza_size)` → `pizza_sizes(name)` | **RESTRICT** | Clarification #28 §3. |
| `fk_supplier_scenarios_suppliers` | `suppliers(scenario_name)` → `supplier_scenarios(name)` | **CASCADE** | Suppliers belong to scenario. |
| `fk_supplier_offers_supplier` | `supplier_offers(scenario_name, supplier_code)` → `suppliers(scenario_name, supplier_code)` | **CASCADE** | Offers die with supplier scenario. |
| `fk_supplier_offers_product` | `supplier_offers(product_sku)` → `products(sku)` | **RESTRICT** | Clarification #28 §3. |
| `fk_planning_results_forecast` | `planning_results(forecast_name)` → `consumption_forecasts(name)` | **SET NULL** | Preserve historical results. |
| `fk_planning_results_scenario` | `planning_results(scenario_name)` → `supplier_scenarios(name)` | **SET NULL** | Preserve historical results. |
| `fk_unauthorized_attempts_user` | `unauthorized_attempts(user)` → `users(username)` | **SET NULL** | Preserve audit rows after account deletion (ADR-015). |
| `fk_customer_orders_customer` | `customer_orders(customer_email)` → `customers(email)` | **RESTRICT** | (Future) |
| `fk_order_items_order` | `order_items(order_number)` → `customer_orders(order_number)` | **CASCADE** | (Future) |
| `fk_personalized_pizza_snapshot_item` | `personalized_pizza_snapshots(order_number, order_item_line_number)` → `order_items(...)` | **CASCADE** | (Future) |

### 10.3. Deletion Cascade Matrix (BCK Guarantees)

| Master Entity | Referenced By | Behaviour |
|---|---|---|
| `User` | `user_role_assignments`, `roles_assignment`, `status_assignment`, `user_dietary_restrictions`, `activation_invitations`, `auth_sessions`, `password_recovery` | `CASCADE` |
| `User` | `customers.username` | `SET NULL` (preserves customer) |
| `User` | `unauthorized_attempts.user` | `SET NULL` (preserves audit) |
| `ProductCategory` | `products.category_name` | `RESTRICT` → `409 Conflict` |
| `Allergen` | `product_allergens`, `user_dietary_restrictions` | `RESTRICT` |
| `PizzaSize` | `component_size_configurations`, `predefined_pizza_available_sizes`, `consumption_forecast_entries` | `RESTRICT` |
| `PizzaComponentType` | `products.component_type_name` | `RESTRICT` |
| `Product` | `stock_items`, `component_size_configurations`, `predefined_pizza_recipes`, `product_allergens`, `consumption_forecast_entries`, `supplier_offers`, `order_items` (future) | `RESTRICT`; prefer `deactivate()` |
| `ConsumptionForecast` | `consumption_forecast_entries` | `CASCADE` |
| `SupplierScenario` | `suppliers`, `supplier_offers` | `CASCADE` |
| `KitchenConfiguration` | (none) | Free delete; only one active via partial unique index |
| `AuthSession` | (none) | Free delete (expired rows GC); revocation via `revokedAt` |
| `PasswordRecovery` | (none) | Free delete (expired/consumed rows GC); invalidation via `used_at`/`revoked_at` |

---

# PART III — SYSTEM ARCHITECTURE (C4 Model)

## 11. System Context (C4 Level 1)

**Diagram source:** `component-diagram-l1.puml`.

**Actors:**
- **Customer** — browses catalogue, configures pizzas, places orders (web or anonymous kiosk).
- **Restaurant Manager** — maintains catalogues, products, allergens, recipes, stock, kitchen configurations, consumption forecasts, supplier scenarios, executes AI planning.
- **Website Administrator** — manages user accounts, roles, activation invitations, application access logs (Clarification #42).
- **Restaurant Employee** — coordinates preparation, monitors kitchen schedule, updates fulfilment states.

**System boundary:** LaPrizza Information System.

**External systems (Sprint 2–3):**
- External identity provider (OIDC) — Google, Microsoft, Auth0, or Keycloak (ADR-010).
- SMTP transactional email provider — activation invitations, password recovery.
- External webhook receiver (maintenance alerts, future).

**Internal subsystem not shown at L1 (appears at L2):**
- Prolog AI engine — deployed as a separate container **inside the LaPrizza System Boundary** (ADR-012), isolated for CPU-bound planning computations and independent deployment. It is not a third-party system.

**Interactions:**
- Customer → System: HTTPS (browse catalogue, personalize, place orders). Also: OIDC redirect for external login.
- Manager → System: HTTPS (administer taxonomy, catalogues, stock, kitchen configs, forecasts, scenarios; execute AI planning).
- Administrator → System: HTTPS (manage users, roles, invitations; consult application audit logs).
- Employee → System: HTTPS (preparation queue, kitchen schedule, fulfilment).

## 12. Container Diagram (C4 Level 2)

**Diagram source:** `component-diagram-l2.puml`.

**Containers inside LaPrizza boundary:**

1. **Web Application (SPA)** — Angular 22 + TypeScript (per ADR-009). Provides UI for all roles. Consumes REST API via HTTPS. Integrates 3D canvas. Handles OIDC redirect initiation. **Per Clarification #46 compliance:** SPA + Back-End + Prolog + DB are separate containers, but the Back-End container hosts multiple bounded contexts; no bounded context is split across containers.
2. **3D Interactive Canvas** — Three.js / WebGL 2. Embedded in SPA. **Mandatory:** Kitchen and Food Preparation Visualization (II.3.3.2). **Optional:** Build Your Pizza (II.3.3.1). Loads GLB assets (ADR-014), parses active `KitchenConfiguration` JSON. Material reuse across similar surfaces permitted (Clarification #31).
3. **Back-End Modular Monolith** — Node.js / NestJS / TypeScript. Clean/Onion Architecture + Hexagonal Ports & Adapters. Handles auth (local + OIDC), business logic, invariants, stock, kitchen configs, AI planning orchestration, GDPR enforcement, session management, password recovery, resource-level authorization, **admin user management, application audit log access** (v2.6, Clarification #42).
4. **AI Planning Engine** — SWI-Prolog Knowledge Base. Independent container **within the LaPrizza boundary** (ADR-012). Computes BOM and Requirements Planning. Consumed via `PrologHttpClient`. **Per Clarification #37**, receives `pendingDeliveries[]` and `referenceDate` in the request payload.
5. **Relational Database** — PostgreSQL 16+. Users, customers, catalogues, stock, kitchen configurations (JSONB), forecasts, supplier scenarios, planning results (immutable snapshots), invitations, role-change audit log, auth sessions, **password recovery**, **roles assignment**, **status assignment**, unauthorized attempts. Business keys throughout (no UUIDs in relationships; `auth_sessions.id` and `password_recovery.id` are the sole UUID PKs, not referenced by other aggregates).

**External containers:**

- **External Identity Provider (OIDC)** — Google / Microsoft / Auth0 / Keycloak (ADR-010).
- **SMTP / Transactional Email** — activation invitations, password recovery.

**Relationships:**
- SPA ← Customer, Manager, Administrator, Employee.
- SPA *-- ThreeJS (in-browser integration).
- ThreeJS ..> BackEnd (HTTPS/JSON for kitchen configuration and taxonomy).
- SPA ..> BackEnd (HTTPS/JSON).
- SPA ..> ExternalIdP (OIDC Authorization Code + PKCE).
- BackEnd ..> ExternalIdP (token exchange, ID Token verification).
- BackEnd ..> PrologEngine (REST for plan execution — bidirectional).
- PrologEngine is invoked, not active — Prolog never calls back to the DB directly.
- BackEnd --> DB (TCP/SQL via TypeORM / pg driver with ACID invariants).
- BackEnd ..> SMTP (activation emails, password-recovery emails).

## 13. Component Architecture (C4 Level 3)

**Diagram source:** `component-diagram-l3.puml` and `component-diagram-sketch.md` (v2.0).

### 13.1. Presentation & Delivery Layer (Driving Adapters)

| Group | Controllers | Sprint |
|---|---|---|
| Auth | `AuthController`, `ExternalAuthController`, `PasswordRecoveryController`, `UserController`, `BackofficeUsersController` | S1 (+S2 role audit, session refresh, password recovery, user invitations); admin audit consultation remains planned |
| Customer | `CustomerController` | S1 |
| Catalogue | `CategoryController`, `AllergenController`, `ProductController` | S1 |
| Pizza Taxonomy | `PizzaSizeController`, `PizzaComponentTypeController`, `ComponentSizeConfigurationController` | S1 |
| Stock | `StockController` | S1 |
| Predefined Pizza | `PredefinedPizzaController` | S1 |
| Catalogue Query | `CatalogueController` | S1 |
| Kitchen | `KitchenConfigurationController` | **S2** (WEB06) |
| AI Planning | `ConsumptionForecastController`, `SupplierScenarioController`, `PlanningController`, `ProductExportController` | **S2** (WEB07, AI05, AI06) |

**Rule:** controllers remain thin — extract HTTP inputs, invoke a single application service, serialize output DTOs. No business rules, no ORM calls.

### 13.2. Application Services Layer (Use Cases)

| Group | Services | Sprint |
|---|---|---|
| Identity | `AuthService`, `ExternalAuthService`, `ActivationInvitationService`, **`PasswordRecoveryService`** (ADR-016), `SessionService`, `UserService`, `RoleAuditService`, **`RolesAssignmentService`** (v2.6), **`StatusAssignmentService`** (v2.6) | S1 (+S2: ExternalAuth, Invitation, PasswordRecovery, Session, RoleAudit, RolesAssignment, StatusAssignment) |
| Customer | `CustomerService` | S1 |
| Catalogue | `CategoryService`, `AllergenService`, `ProductService` | S1 |
| Taxonomy | `PizzaSizeService`, `PizzaComponentTypeService`, `ComponentSizeConfigurationService` | S1 |
| Stock | `StockService` | S1 |
| Pizza | `PredefinedPizzaService` | S1 |
| Query | `CatalogueQueryService` | S1 |
| Kitchen | `KitchenConfigurationService` | **S2** |
| AI Planning | `ConsumptionForecastService`, `SupplierScenarioService`, `PlanningService`, `ProductExportService` | **S2** |

**Rule:** services orchestrate transactions and cross-aggregate coordination, delegate domain logic to the domain layer, and never leak HTTP or persistence types.

### 13.3. Domain Core Layer

**Sprint 1 aggregates (unchanged):** `User`, `Customer`, `ProductCategory`, `Allergen`, `Product`, `PizzaSize`, `PizzaComponentType`, `ComponentSizeConfiguration`, `StockItem`, `PredefinedPizza`.

**Sprint 2 aggregates (v2.6):** `KitchenConfiguration`, `ConsumptionForecast`, `SupplierScenario`, `PlanningResult`, `RoleChangeLog`, `AuthSession`, **`PasswordRecovery` (v2.6)**, `RolesAssignment` (supporting, v2.6), `StatusAssignment` (supporting, v2.6).

**Domain Services:**
- `PricingDomainService` (S1) — sum of `ComponentSizeConfiguration.price` per recipe line, per size.
- `StockAvailabilityDomainService` (S1) — `currentUnits ≥ stockUnitsConsumed × recipeQuantity` per component.
- `KitchenConfigValidationService` (S2) — validates kitchen JSON (schema, refs, active-configuration invariants).
- `PlanningSnapshotDomainService` (S2) — captures deep-copied inputs for read-only replay of historical results.
- **`PasswordPolicy` (S2, ADR-016)** — validates password complexity/strength per ASIST, applied uniformly to create/change/recover (Clarification #32).
- **`CustomerAccessPolicy` (S2)** — resource-level authorization for multi-role users (Clarification #33).
- **`PasswordRecoveryDomainService` (v2.6, ADR-016)** — generates/validates single-use tokens, revokes sessions on consumption.

### 13.4. Infrastructure & Persistence Layer (Driven Adapters)

**Repositories (TypeORM Data Mapper, ADR-008a) — 22 expected in v2.6:**

- **S1 (11):** `PostgresUserRepository`, `PostgresCustomerRepository`, `PostgresCategoryRepository`, `PostgresProductCategoryRepository`, `PostgresAllergenRepository`, `PostgresProductRepository`, `PostgresPizzaSizeRepository`, `PostgresPizzaComponentTypeRepository`, `PostgresComponentSizeConfigurationRepository`, `PostgresStockRepository`, `PostgresPredefinedPizzaRepository`, `PostgresCatalogueRepository`.
- **S2 (8):** `PostgresKitchenConfigurationRepository`, `PostgresConsumptionForecastRepository`, `PostgresSupplierScenarioRepository`, `PostgresPlanningResultRepository`, `PostgresActivationInvitationRepository`, `PostgresRoleChangeLogRepository`, `PostgresAuthSessionRepository`, `PostgresUnauthorizedAttemptRepository`.
- **v2.6 additions (3):** `PostgresPasswordRecoveryStore` (ADR-016), `PostgresRolesAssignmentRepository`, `PostgresStatusAssignmentRepository`.

**External adapters:**
- `Argon2Hasher` (S1)
- `JwtTokenService` (S1)
- `OidcClient` (S2 — via `openid-client`)
- `PrologHttpClient` (S2 — HTTP fetch to Prolog container)
- `SmtpInvitationMailer` (S2 — invitation dispatch)
- **`SmtpRecoveryMailer` (v2.6, ADR-016 — password-recovery dispatch)**
- **`InMemoryExchangeCodeStore` (v2.6 — OIDC PKCE state store)**

All are wired through NestJS provider tokens implementing domain-defined ports. Test doubles (`InMemory*Repository`) mirror the same contracts.

### 13.5. Dependency Wiring

- Controllers → Application Services (via DTOs).
- Application Services → Domain Services / Aggregates → Repository Ports (outbound).
- Repository Ports ← Infrastructure Adapters (dependency inversion, TypeORM).
- External gateways ← Infrastructure Adapters (`OidcClient`, `PrologHttpClient`, `SmtpInvitationMailer`, `SmtpRecoveryMailer`).
- Infrastructure Adapters → PostgreSQL / External IdP / Prolog / SMTP.

### 13.6. Non-Responsibilities of the Back-End Container

- Does not render 3D content (Three.js lives in the browser).
- Does not execute Prolog logic (invoked externally via `PrologHttpClient`).
- Does not store or process credentials of external IdPs (only `external_idp_subject` is stored).
- Does not persist purchase orders (Sprint 2 has `PurchaseProposal` as a read-only VO only).
- Does not mutate stock from planning calculations (Clarification #26).
- Does not implement account-wide logout (per-device only, Clarification #29).
- Does not expose system/infrastructure logs (Clarification #42 — those are operational concerns).

### 13.7. C4 Level 4 — Selective Code Diagram

Per KB Master §6.2 ("1 nível de abstração por diagrama" and "L4 é seletivo"), the C4 L4 diagram is drawn only where the complexity justifies it. LaPrizza has one L4 diagram:

- **Scope:** the AI Planning module (`POST /api/v1/planning/executions` flow — ADR-012, ADR-013, Clarification #37).
- **Diagrams:** `docs/architectural/component-diagram/component-diagram-l4.puml` (+ `cd-l4.svg`) and `docs/architectural/component-diagram-sketch-l4.md`.
- **Rationale:** this is the single flow that combines Ports & Adapters at a boundary (`PrologHttpClient`), Immutable Aggregate with deep-copied snapshots (`PlanningResult`), a stateless Domain Service (`PlanningSnapshotDomainService`), cross-aggregate coordination without pointers, explicit failure mapping (409/422/502), and pending-delivery input handling with end-of-previous-day stock rule. **Per Clarification #30**, the proposal generation must round to indivisible lot and label late deliveries. **Per Clarification #37**, it must consider pending deliveries and honour the stock-availability-by-end-of-previous-day rule.
- **Not covered at L4:** other Sprint 2 flows (kitchen config, auth, session, password recovery) are architecturally simpler and are fully described at L3 + their ADRs.

**Verification checklist** for the L4 diagram is in `component-diagram-sketch-l4.md` §6 (6 items: renders, no orphan classes, ports only at boundaries, invariants documented, HTTP mappings align with OpenAPI).

---

## 14. Use Cases & Functional Scope

**Diagram source:** `use_case_diagram.md`, `use_case_diagram_sprint1.md`, `use_case_diagram_sprint2.md`.

### 14.1. Sprint 1 Use Cases (Manager)

- UC1: Authenticate (Login)
- UC2: Manage Users & Roles
- UC3: Manage Customers
- UC4: Manage Product Categories
- UC5: Manage Allergens
- UC6: Manage Products (Create, Update, Block, Reactivate)
- UC7: Manage Pizza Sizes
- UC8: Manage Pizza Component Types
- UC9: Configure Component Size Configuration
- UC10: Manage Stock Information
- UC11: Manage Predefined Pizzas

### 14.2. Sprint 1 Use Cases (Customer)

- UC12: Browse Product Catalogue & Info
- UC13: Authenticate (Customer Login)
- UC14: Self-Register Account (User + Customer Profile)
- UC15: Consult & Manage Dietary Restrictions

### 14.3. Sprint 2 Use Cases (UC16–UC33)

**Auth & Authorization (AA01–AA07):**
- UC16: Authenticate via External IdP (OIDC Authorization Code + PKCE) — AA02
- UC17: Consume Activation Invitation — AA06, AA07
- UC18: Pre-register Staff Account (Administrator-provisioned) — AA06, ADR-017
- UC19: Assign / Revoke User Roles — AA06 (requires `ADMINISTRATOR`)
- UC20: Consult Role Change History — AA06
- **UC16b: Refresh Session / Rotate Token — AA04 (Clarification #34)**
- **UC16c: Logout (per-device) — AA04 (Clarification #29)**
- **UC16d: Password Recovery Flow — AA01 (Clarification #32, ADR-016) — v2.6**
- **UC32c: Resend Activation — AA01 (Clarification #32)**
- **UC16e: Consult Application Access Log — AA05 (Clarification #42) — v2.6 — requires `ADMINISTRATOR`**

**SPA Web (WEB06, WEB07):**
- UC21: Manage Kitchen Configuration (CRUD + activate) — WEB06
- UC22: Manage Consumption Forecasts (pizzas + non-pizza products per Clarification #36) — WEB07
- UC23: Manage Supplier Scenarios (import + confirm) — WEB07
- UC24: Execute AI Planning & Consult Results — WEB07, AI05

**AI Planning (AI01, AI02, AI05, AI06):**
- UC25: Compute Bill of Materials (BOM) — AI01
- UC26: Compute Requirements Planning (indivisible lots + late proposals per Clarification #30; pending deliveries + reference date + end-of-previous-day stock rule per Clarification #37) — AI02
- UC27: Export Back-End Data as Prolog Knowledge Base — AI06

**3D Visualization (VIS01–VIS07):**
- UC28: Load Active Kitchen Layout (VIS02)
- UC29: View 3D Assembly Line (VIS03)
- UC30: Configure 3D Scene Lighting (VIS04–VIS06)
- UC31: Navigate 3D Kitchen with Perspective Camera (VIS07)

### 14.4. Sprint 3+ Use Cases (UC34–UC39 — Future)

- UC32: Simulate & Place Customer Order
- UC33: Track Order Progress & Status
- UC34: Manage Kitchen Resources & Workstations
- UC35: AI Food Preparation Scheduling (Prolog per-resource)
- UC36: Build Your Pizza (3D Configurator — optional)
- UC37: Animate 3D Assembly Line (SGRAI Sprint 3)
- UC38: Confirm Purchase Orders (deferred; Clarification #26 says out of scope for Sprint 2)
- UC39: Cancel/Modify Purchase Orders (deferred; Clarification #26 says out of scope for Sprint 2)

### 14.5. Include / Extend Dependencies

- UC6 includes category (UC4) + allergens (UC5).
- UC11 includes components (UC6) + types (UC8) + verifies sizes (UC9).
- UC9 references size (UC7) + component (UC6) + requires units (UC10).
- UC21 includes UC19 (forecast) + UC20 (scenario) + snapshot capture.
- UC16 extends UC13 (both result in a JWT-bearing session, same guards).
- **UC16b extends both UC13 and UC16** (refresh applies to any authenticated session).
- **UC16d is an alternative path of UC13** (password recovery precedes login; uses `password_recovery` table, ADR-016).
- **UC16e is an extension of UC2** requiring `ADMINISTRATOR` role (Clarification #42).

---

## 15. Multi-Disciplinary Integration Points

### 15.1. SGRAI (3D Visualization)

- **Mandatory:** Kitchen and Food Preparation Visualization (II.3.3.2). Integrated into the SPA. Uses WebGL 2 + Three.js. Consumes active `KitchenConfiguration` JSON (ADR-011) with GLB assets (ADR-014). Material reuse across objects with similar surfaces is permitted (Clarification #31); performance optimisation techniques must be demonstrated and justified.
- **Optional:** Build Your Pizza (II.3.3.1). Consumes taxonomy + catalogue endpoints.
- **Start of work:** Week 7 (Sprint 2).
- **Sprint 3 scope:** Animation of the assembly line (conveyor, robotic arms) via GLB animation tracks.

### 15.2. IART (Prolog AI Scheduling)

- Consumes: `ConsumptionForecast` (pizzas + non-pizza per Clarification #36), `SupplierScenario`, `StockSnapshot`, **`PendingDeliveries`** (Clarification #37), BOM definitions (only pizzas), `stockUnitsPerSale` for sellable + stock-controlled products.
- Produces: `PlanningResult` with requirements, proposals (indivisible lots; `meetsRequiredDate` + `lateByDays` per Clarification #30), unmet needs (read-only, ADR-013).
- Integration: REST endpoints via AI service (AI05/AI06).
- Deferred to Sprint 3: Food-preparation scheduling (per-resource sequencing), separate from Sprint 2 BOM/Requirements Planning.
- **Per Clarification #41:** recursive BOM / aggregate decomposition is an IARTI-side concern, not a LaPrizza domain concern. The domain's BOM is pizzas-only, permanently. **Team action pending:** consult IARTI RUC for AI01 scope on aggregate recursivity.

### 15.3. ASIST (Systems Administration)

- Automated deployment (SYS01). **Per Clarification #40**, deployment may use external infrastructure (Azure, AWS, other), SSH-from-outside with GitHub Actions Secrets. Not restricted to a DEI VM.
- Network access restriction to DEI network/VPN (SYS02).
- Configurable allowed endpoints (SYS03).
- Shared resource folder (SYS04). **Per Clarification #43**, access via web SPA (authenticated) is acceptable; direct filesystem access not required.
- Controlled Linux remote shell access (SYS05).
- Operational risk assessment (SYS06).
- Minimum Business Continuity Objective (SYS07).
- Backup strategy and recovery validation (SYS08).

> **Implementation status note.** The ASIST documents (`sys-deployment.md`, `sys-backup-strategy.md`, `sys-network-config.md`, `sys-mbco.md`, `sys-shared-folder.md`, `sys-risk-assessment.md`) reference operational scripts (`scripts/backup.sh`, `scripts/restore.sh`, `scripts/firewall.sh`, `scripts/egress.sh`, `scripts/laprizza-ssh-audit-*.sh`, `config/allowed-endpoints.yml`, `cron.d/*`) and Makefile targets (`backup`, `restore`, `restore-test`, `dr-drill`, `rotate-jwt`). As of KB v2.6 these are **specifications defined by the documents**; the scripts and Makefile targets will be committed during Sprint 2 implementation. The documents are the executable contract; the repository will match them.

### 15.4. GDPR (Data Protection)

- Personal data identification (customer profiles, dietary info, credentials, session records).
- Controller: LaPrizza restaurant entity.
- Breach notification: 72h to supervisory authority, individuals if high risk.
- Consent management for marketing. **Per Clarification #45**, consent-versioning questions are redirected to the LAPR5 TP lecturer; the current model (single current-state flag + timestamp) remains provisionally valid pending that decision.
- Full policy in Appendix D and `docs/gdpr-policy.md` (v2.0; a v2.1 revision will reflect the pending LAPR5 decision once available). Session records (`auth_sessions`), password recovery (`password_recovery`), and unauthorized attempts (`unauthorized_attempts`) are legitimate-interest audit artefacts; retention per §D.14.

---

# PART IV — PERSISTENCE & DATA

## 16. Persistence Strategy (DDD → PostgreSQL)

### 16.1. Fundamental Rules

1. **Zero ORM contamination in the domain ring.** No `@Entity` decorators on domain classes. TypeORM decorators live only under `infrastructure/persistence/entities/`.
2. **Data Mappers** translate between persistence entities and domain aggregates. Classes: `UserMap`, `ProductMap`, `CustomerMap`, `PizzaComponentTypeMap`, `KitchenConfigurationMap`, `PlanningResultMap`, `AuthSessionMap`, **`PasswordRecoveryMap` (v2.6)**, etc.
3. **Database as fortress.** Constraints enforced natively (`CHECK`, `UNIQUE`, `FOREIGN KEY ... ON DELETE RESTRICT`, partial unique indexes).
4. **Business Keys as primary and foreign keys.** No technical UUIDs in relationships. SERIAL only for audit/transactional artefacts (`role_change_logs.log_id`, `planning_results.execution_id`, `customer_orders.order_number`). **Exceptions:** `auth_sessions.id` and `password_recovery.id` are UUIDs (unpredictable per-login / per-recovery identifiers, not referenced by other aggregates).
5. **Evolutionary continuity.** Schema supports current baseline + Sprint 3 tables (orders, snapshots, kitchen resources, activities).

### 16.2. Business Key Strategy

Every aggregate root and cross-aggregate reference uses a **business-meaningful identifier**:

| Table | Primary Key | FK Style |
|---|---|---|
| `users` | `username` (VARCHAR) | referenced by `username` |
| `auth_sessions` | `id` (UUID) | FK `username → users(username)`; **not referenced by other aggregates** |
| **`password_recovery`** | **`id` (UUID)** | **FK `username → users(username)`; not referenced by other aggregates** |
| **`roles_assignment`** | **`(username, role_name)` composite** | **FK `username → users(username)`** |
| **`status_assignment`** | **`username` (VARCHAR)** | **FK `username → users(username)`** |
| `unauthorized_attempts` | `id` (BIGSERIAL) | FK `user → users(username)` |
| `customers` | `email` (VARCHAR) | FK `username → users(username)` |
| `product_categories` | `name` (VARCHAR) | referenced by `category_name` |
| `allergens` | `name` (VARCHAR) | referenced by `allergen_name` |
| `products` | `sku` (VARCHAR) | referenced by `product_sku` |
| `pizza_sizes` | `name` (VARCHAR) | referenced by `pizza_size` |
| `pizza_component_types` | `name` (VARCHAR) | referenced by `component_type_name` |
| `component_size_configurations` | composite `(product_sku, pizza_size)` | N/A (references only) |
| `stock_items` | `product_sku` (VARCHAR) | references `products.sku` |
| `predefined_pizzas` | `sku` (VARCHAR) | references `products.sku` |
| `kitchen_configurations` | `name` (VARCHAR) | independent |
| `consumption_forecasts` | `name` (VARCHAR) | referenced by `forecast_name` |
| `supplier_scenarios` | `name` (VARCHAR) | referenced by `scenario_name` |
| `suppliers` | composite `(scenario_name, supplier_code)` | N/A |
| `supplier_offers` | composite `(scenario_name, supplier_code, product_sku)` | N/A |
| `planning_results` | `execution_id` (SERIAL) | FK `forecast_name`, `scenario_name` |
| `role_change_logs` | `log_id` (SERIAL) | soft ref by `username` |
| `customer_orders` | `order_number` (SERIAL) | FK `customer_email` |

**Note:** `activation_invitations` uses `token` (VARCHAR) as PK — the cryptographically secure token is the natural business key.

### 16.3. Value Object Flattening

- **Single-column:** `Email`, `PasswordHash`, `Designation`, `AbstractStockQuantity`, `ExternalIdpSubject` → typed column on aggregate table.
- **Multi-column prefixed:** `PersonName` (`first_name`, `last_name`), `Money` (`direct_selling_price` + `direct_price_currency`; `price` + `price_currency` in `component_size_configurations`).
- **Owned dependent tables:** `user_roles` / `user_role_assignments`, `roles_assignment`, `status_assignment`, `user_dietary_restrictions`, `activation_invitations`, `password_recovery`, `predefined_pizza_recipes`, `consumption_forecast_entries`, `suppliers`, `supplier_offers` — with `ON DELETE CASCADE` (within aggregate boundary).

### 16.4. Cross-Aggregate References by Business Key Only

- No in-memory pointers between aggregates.
- Reference by foreign business identifier.
- Enforced via `FOREIGN KEY ... ON DELETE RESTRICT` (or `SET NULL` / `CASCADE` where appropriate).

---

## 17. Physical DDL by Bounded Module

**Authoritative source:** `08-database-structure.md`. The complete DDL is reproduced there. Key points:

### 17.1. Identity & Access Module

```sql
CREATE TABLE users (
    username VARCHAR(30) PRIMARY KEY,
    first_name VARCHAR(75) NOT NULL,
    last_name VARCHAR(75) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NULL,          -- nullable (external IdP, ADR-010)
    external_idp_subject VARCHAR(255) NULL,   -- OIDC sub claim
    street VARCHAR(255) NULL,
    postal_code VARCHAR(20) NULL,
    city VARCHAR(100) NULL,
    extra_details VARCHAR(255) NULL,
    phone_number VARCHAR(30) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_users_status CHECK (status IN ('ACTIVE', 'DEACTIVATED', 'PENDING_REGISTRATION')),
    CONSTRAINT chk_users_credentials CHECK (password_hash IS NOT NULL OR external_idp_subject IS NOT NULL)
);

CREATE TABLE user_roles (
    name VARCHAR(30) PRIMARY KEY,
    CONSTRAINT chk_user_roles_name CHECK (name IN ('ADMINISTRATOR', 'MANAGER', 'EMPLOYEE', 'CUSTOMER'))
);

CREATE TABLE user_role_assignments (
    username VARCHAR(30) NOT NULL,
    role_name VARCHAR(30) NOT NULL,
    PRIMARY KEY (username, role_name),
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
    FOREIGN KEY (role_name) REFERENCES user_roles(name) ON DELETE RESTRICT
);

-- v2.6 (migration 019_create_roles_assignment_table.sql): normalized persistence artefact.
CREATE TABLE roles_assignment (
    username VARCHAR(30) NOT NULL,
    role_name VARCHAR(30) NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (username, role_name),
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
    FOREIGN KEY (role_name) REFERENCES user_roles(name) ON DELETE RESTRICT
);

-- v2.6 (migration 020_create_status_assignment_table.sql): normalized persistence artefact.
CREATE TABLE status_assignment (
    username VARCHAR(30) PRIMARY KEY,
    status VARCHAR(30) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
    CONSTRAINT chk_status_assignment CHECK (status IN ('ACTIVE', 'DEACTIVATED', 'PENDING_REGISTRATION'))
);

CREATE TABLE activation_invitations (
    token VARCHAR(255) PRIMARY KEY,
    username VARCHAR(30) NOT NULL,
    purpose VARCHAR(30) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ NULL,
    revoked_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
    CONSTRAINT chk_invitation_purpose CHECK (purpose IN ('LOCAL_ACCOUNT_ACTIVATION', 'EXTERNAL_IDP_MATCH', 'PASSWORD_RESET'))
);

-- v2.6 (migration 018_create_password_recovery_table.sql, ADR-016): dedicated password recovery.
CREATE TABLE password_recovery (
    id UUID PRIMARY KEY,
    username VARCHAR(30) NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,   -- Argon2id/SHA-256 hash, raw token never stored
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ NULL,
    revoked_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

CREATE INDEX idx_password_recovery_username ON password_recovery (username);
CREATE INDEX idx_password_recovery_expires_at ON password_recovery (expires_at);

CREATE TABLE role_change_logs (
    log_id SERIAL PRIMARY KEY,
    actor_username VARCHAR(30) NOT NULL,
    target_username VARCHAR(30) NOT NULL,
    previous_roles JSONB NOT NULL,
    new_roles JSONB NOT NULL,
    reason TEXT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Sprint 2 (Clarifications #29, #34): inactivity-aware session tracking.
CREATE TABLE auth_sessions (
    id UUID PRIMARY KEY,                                        -- JWT sid claim
    username VARCHAR(30) NOT NULL,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,                            -- hard cap (refresh TTL)
    revoked_at TIMESTAMPTZ NULL,                                -- logout revokes only this row
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE
);

CREATE INDEX idx_auth_sessions_username ON auth_sessions (username);
CREATE INDEX idx_auth_sessions_last_activity ON auth_sessions (last_activity_at);
CREATE INDEX idx_auth_sessions_expires_at ON auth_sessions (expires_at);

-- ADR-015: unauthorized access attempt audit; consultable only by ADMINISTRATOR (Clarification #42).
CREATE TABLE unauthorized_attempts (
    id BIGSERIAL PRIMARY KEY,
    "user" VARCHAR(30) NULL,
    "timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    endpoint TEXT NOT NULL,
    FOREIGN KEY ("user") REFERENCES users(username) ON DELETE SET NULL
);

CREATE INDEX idx_unauthorized_attempts_user_ts ON unauthorized_attempts ("user", "timestamp");
```

### 17.2. Customer Module

```sql
CREATE TABLE customers (
    email VARCHAR(255) PRIMARY KEY,
    username VARCHAR(30) NULL UNIQUE,
    first_name VARCHAR(75) NOT NULL,
    last_name VARCHAR(75) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    vat_number VARCHAR(20) NULL,
    marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
    consent_timestamp TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE SET NULL
);

CREATE TABLE customer_addresses (
    address_id SERIAL PRIMARY KEY,
    customer_email VARCHAR(255) NOT NULL,
    street VARCHAR(255) NOT NULL,
    postal_code VARCHAR(20) NOT NULL,
    city VARCHAR(100) NOT NULL,
    extra_details VARCHAR(255) NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (customer_email) REFERENCES customers(email) ON DELETE CASCADE
);

CREATE TABLE user_dietary_restrictions (
    username VARCHAR(30) NOT NULL,
    allergen_name VARCHAR(30) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (username, allergen_name),
    FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE,
    FOREIGN KEY (allergen_name) REFERENCES allergens(name) ON DELETE RESTRICT
);
```

### 17.3. Catalogues & Products Module

```sql
CREATE TABLE product_categories (
    name VARCHAR(100) PRIMARY KEY,
    description TEXT NULL
);

CREATE TABLE allergens (
    name VARCHAR(100) PRIMARY KEY,
    description TEXT NULL
);

CREATE TABLE products (
    sku VARCHAR(30) PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    is_sellable BOOLEAN NOT NULL,
    is_pizza_component BOOLEAN NOT NULL,
    is_stock_controlled BOOLEAN NOT NULL,
    component_type_name VARCHAR(100) NULL,
    direct_selling_price NUMERIC(10,2) NULL,
    direct_price_currency VARCHAR(3) NULL DEFAULT 'EUR',
    stock_units_per_sale INTEGER NULL,        -- Sprint 2 (AI02, applied to non-pizza too per #36)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_name) REFERENCES product_categories(name) ON DELETE RESTRICT,
    CONSTRAINT chk_products_mandatory_type CHECK (is_sellable = TRUE OR is_pizza_component = TRUE),
    CONSTRAINT chk_products_component_role CHECK (
        (is_pizza_component = FALSE AND component_type_name IS NULL) OR
        (is_pizza_component = TRUE AND component_type_name IS NOT NULL)
    ),
    CONSTRAINT chk_products_price_non_negative CHECK (direct_selling_price IS NULL OR direct_selling_price >= 0.00),
    CONSTRAINT chk_products_stock_units_per_sale CHECK (stock_units_per_sale IS NULL OR stock_units_per_sale >= 0)
);

CREATE TABLE product_allergens (
    product_sku VARCHAR(30) NOT NULL,
    allergen_name VARCHAR(100) NOT NULL,
    PRIMARY KEY (product_sku, allergen_name),
    FOREIGN KEY (product_sku) REFERENCES products(sku) ON DELETE CASCADE,
    FOREIGN KEY (allergen_name) REFERENCES allergens(name) ON DELETE RESTRICT
);
```

### 17.4. Pizza Taxonomy & Configuration Module

```sql
CREATE TABLE pizza_sizes (
    name VARCHAR(50) PRIMARY KEY,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE pizza_component_types (
    name VARCHAR(100) PRIMARY KEY,
    assembly_order INTEGER NOT NULL UNIQUE CHECK (assembly_order >= 1),
    min_cardinality INTEGER NOT NULL DEFAULT 0,
    max_cardinality INTEGER NULL,
    CONSTRAINT chk_component_types_cardinality CHECK (
        min_cardinality >= 0 AND (max_cardinality IS NULL OR max_cardinality >= min_cardinality)
    )
);

ALTER TABLE products
    ADD CONSTRAINT fk_products_component_type FOREIGN KEY (component_type_name)
    REFERENCES pizza_component_types(name) ON DELETE RESTRICT;

CREATE TABLE component_size_configurations (
    product_sku VARCHAR(30) NOT NULL,
    pizza_size VARCHAR(50) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    price_currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    stock_units_consumed INTEGER NOT NULL,
    PRIMARY KEY (product_sku, pizza_size),
    FOREIGN KEY (product_sku) REFERENCES products(sku) ON DELETE RESTRICT,
    FOREIGN KEY (pizza_size) REFERENCES pizza_sizes(name) ON DELETE RESTRICT,
    CONSTRAINT chk_comp_size_price CHECK (price >= 0.00),
    CONSTRAINT chk_comp_size_stock_consumed CHECK (stock_units_consumed >= 0)
);
```

### 17.5. Stock Module

```sql
CREATE TABLE stock_items (
    product_sku VARCHAR(30) PRIMARY KEY,
    current_units INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_sku) REFERENCES products(sku) ON DELETE RESTRICT,
    CONSTRAINT chk_stock_items_balance_non_negative CHECK (current_units >= 0)
);

CREATE TABLE stock_movements (
    movement_id SERIAL PRIMARY KEY,
    product_sku VARCHAR(30) NOT NULL,
    type VARCHAR(20) NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0),
    reason TEXT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_sku) REFERENCES stock_items(product_sku) ON DELETE RESTRICT,
    CONSTRAINT chk_stock_movements_type CHECK (type IN ('REPLENISHMENT', 'CONSUMPTION', 'ADJUSTMENT'))
);
```

### 17.6. Predefined Pizza Module

```sql
CREATE TABLE predefined_pizzas (
    sku VARCHAR(30) PRIMARY KEY,
    recipe_name VARCHAR(150) NOT NULL,
    FOREIGN KEY (sku) REFERENCES products(sku) ON DELETE RESTRICT
);

CREATE TABLE predefined_pizza_recipes (
    pizza_sku VARCHAR(30) NOT NULL,
    component_product_sku VARCHAR(30) NOT NULL,
    default_quantity INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY (pizza_sku, component_product_sku),
    FOREIGN KEY (pizza_sku) REFERENCES predefined_pizzas(sku) ON DELETE CASCADE,
    FOREIGN KEY (component_product_sku) REFERENCES products(sku) ON DELETE RESTRICT,
    CONSTRAINT chk_recipe_line_quantity CHECK (default_quantity > 0)
);

CREATE TABLE predefined_pizza_available_sizes (
    pizza_sku VARCHAR(30) NOT NULL,
    pizza_size VARCHAR(50) NOT NULL,
    PRIMARY KEY (pizza_sku, pizza_size),
    FOREIGN KEY (pizza_sku) REFERENCES predefined_pizzas(sku) ON DELETE CASCADE,
    FOREIGN KEY (pizza_size) REFERENCES pizza_sizes(name) ON DELETE RESTRICT
);
```
**Note (Clarifications #35, #38):** the `predefined_pizzas` table's backing `products` row MUST NOT have `is_stock_controlled = TRUE`. Enforced at the application layer (`Product` factory rejects the combination; `PredefinedPizzaService` cross-checks). Migration `022_predefined_pizza_no_stock.sql` enforces it at the DB level.

### 17.7. Kitchen Configuration Module (Sprint 2, ADR-011)

```sql
CREATE TABLE kitchen_configurations (
    name VARCHAR(100) PRIMARY KEY,
    json_content JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uq_active_kitchen_configuration
    ON kitchen_configurations (is_active)
    WHERE is_active = TRUE;
```

### 17.8. AI Planning Engine Module (Sprint 2, ADR-012, ADR-013; refined by Clarifications #30, #36, #37, #44)

```sql
CREATE TABLE consumption_forecasts (
    name VARCHAR(100) PRIMARY KEY,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_forecast_dates CHECK (end_date >= start_date)
);

CREATE TABLE consumption_forecast_entries (
    forecast_name VARCHAR(100) NOT NULL,
    entry_date DATE NOT NULL,
    product_sku VARCHAR(30) NOT NULL,
    pizza_size VARCHAR(50) NULL,              -- nullable: non-pizza products have no size (Clarifications #28, #36)
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    PRIMARY KEY (forecast_name, entry_date, product_sku, pizza_size),
    FOREIGN KEY (forecast_name) REFERENCES consumption_forecasts(name) ON DELETE CASCADE,
    FOREIGN KEY (product_sku) REFERENCES products(sku) ON DELETE RESTRICT,
    FOREIGN KEY (pizza_size) REFERENCES pizza_sizes(name) ON DELETE RESTRICT
);

CREATE TABLE supplier_scenarios (
    name VARCHAR(100) PRIMARY KEY,
    is_simulated BOOLEAN NOT NULL DEFAULT FALSE,
    confirmed_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE suppliers (
    scenario_name VARCHAR(100) NOT NULL,
    supplier_code VARCHAR(30) NOT NULL,
    name VARCHAR(150) NULL,                   -- nullable: supplier may exist by code alone
    PRIMARY KEY (scenario_name, supplier_code),
    FOREIGN KEY (scenario_name) REFERENCES supplier_scenarios(name) ON DELETE CASCADE
);

CREATE TABLE supplier_offers (
    scenario_name VARCHAR(100) NOT NULL,
    supplier_code VARCHAR(30) NOT NULL,
    product_sku VARCHAR(30) NOT NULL,
    price_amount NUMERIC(10,2) NOT NULL,
    price_currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    stock_unit_quantity INTEGER NOT NULL CHECK (stock_unit_quantity > 0),  -- indivisible lot (Clarifications #30, #44)
    lead_time_days INTEGER NOT NULL CHECK (lead_time_days >= 0),
    daily_supply_limit INTEGER NULL CHECK (daily_supply_limit IS NULL OR daily_supply_limit >= 0),
    PRIMARY KEY (scenario_name, supplier_code, product_sku),
    FOREIGN KEY (scenario_name, supplier_code) REFERENCES suppliers(scenario_name, supplier_code) ON DELETE CASCADE,
    FOREIGN KEY (product_sku) REFERENCES products(sku) ON DELETE RESTRICT
);

CREATE TABLE planning_results (
    execution_id SERIAL PRIMARY KEY,
    forecast_name VARCHAR(100) NULL,
    scenario_name VARCHAR(100) NULL,
    reference_date DATE NOT NULL,
    is_replay BOOLEAN NOT NULL DEFAULT FALSE,
    is_simulated BOOLEAN NOT NULL DEFAULT FALSE,
    forecast_snapshot JSONB NOT NULL,
    scenario_snapshot JSONB NOT NULL,        -- v2.6: includes pendingDeliveries[] (Clarification #37)
    stock_snapshot JSONB NOT NULL,           -- v2.6: includes initial stock + pending delivery adjustments
    requirements JSONB NOT NULL,
    proposals JSONB NOT NULL,                -- Clarification #30: each entry has meetsRequiredDate, lateByDays
    unmet_needs JSONB NOT NULL,              -- Clarification #30: late proposals do NOT remove the original unmet need
    executed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (forecast_name) REFERENCES consumption_forecasts(name) ON DELETE SET NULL,
    FOREIGN KEY (scenario_name) REFERENCES supplier_scenarios(name) ON DELETE SET NULL
);
```

---

## 18. Concurrency Control & Transaction Demarcation

### 18.1. Stock Adjustments (Pessimistic Locking, ADR-008b)

Sequence:
1. `BEGIN`
2. `SELECT ... FROM stock_items WHERE product_sku = $1 FOR UPDATE`
3. Validate `currentBalance - units >= 0`
4. If invalid: `ROLLBACK`
5. If valid: update `stock_items.current_units`, insert `stock_movements` row
6. `COMMIT`
7. Release connection to pool

Implementation: `backend/src/infrastructure/persistence/repositories/PostgresStockRepository.ts`.

### 18.2. Multi-Aggregate Writes

Operations that touch multiple tables (e.g., create product + allergens + component type; create user + role assignments + dietary restrictions) run in one transaction using the transaction-scoped TypeORM manager. User writes must satisfy deferred minimum-child constraints (at least one role). Rollback on any failure.

### 18.3. Kitchen Configuration Activation (ADR-011)

`KitchenConfigurationService.activate(name)`:
1. `BEGIN`
2. `UPDATE kitchen_configurations SET is_active = FALSE WHERE name <> :name`
3. `UPDATE kitchen_configurations SET is_active = TRUE WHERE name = :name`
4. `COMMIT`

Partial unique index `uq_active_kitchen_configuration` guarantees at most one active row at the DB level.

### 18.4. Auth Session Refresh (Clarifications #29, #34)

`POST /api/v1/auth/refresh`:
1. `BEGIN`
2. `SELECT ... FROM auth_sessions WHERE id = :sid FOR UPDATE`
3. Validate: `revoked_at IS NULL`, `now < expires_at`, `now − last_activity_at < SESSION_INACTIVITY_MINUTES`
4. If invalid: `ROLLBACK` → 401 Unauthorized
5. If valid: `UPDATE auth_sessions SET last_activity_at = NOW() WHERE id = :sid`; issue new access token
6. `COMMIT`

The `FOR UPDATE` lock prevents concurrent refresh/logout race conditions. Logout sets `revoked_at = NOW()` and cannot be undone by a concurrent refresh.

### 18.5. Password Recovery Consumption (v2.6, ADR-016)

`POST /api/v1/auth/password-reset`:
1. `BEGIN`
2. `SELECT ... FROM password_recovery WHERE token_hash = :h FOR UPDATE`
3. Validate: `used_at IS NULL`, `revoked_at IS NULL`, `now < expires_at`
4. If invalid: `ROLLBACK` → 400 Bad Request (generic message)
5. If valid: `UPDATE password_recovery SET used_at = NOW() WHERE id = :id`; `UPDATE users SET password_hash = :h WHERE username = :u`; `UPDATE auth_sessions SET revoked_at = NOW() WHERE username = :u`
6. `COMMIT`

The row-level lock prevents race conditions on the same token. Session revocation is included in the same transaction.

### 18.6. Optimistic Locking (Future)

Planned for future `customer_orders` and the `FlowGuard` analog (`conveyor_lines`). `version` column + `WHERE ... AND version = :v`. Clarification #23 §6.1 requires conflict detection (409) with re-read before re-submit, which is compatible with optimistic locking.

---

## 19. ERD & Referential Integrity Matrix

See §10.3 for the deletion cascade matrix. The ERD is formally mapped in `08-database-structure.md` §2 using Mermaid syntax.

**Key ERD relationships:**
- `users` ||--|{ `user_role_assignments`
- `users` ||--o{ `roles_assignment` (v2.6)
- `users` ||--o| `status_assignment` (v2.6)
- `users` ||--o{ `auth_sessions`
- `users` ||--o{ `password_recovery` (v2.6)
- `users` |o--o{ `unauthorized_attempts`
- `users` |o--o| `customers`
- `users` ||--o{ `user_dietary_restrictions`
- `users` ||--o{ `activation_invitations`
- `customers` ||--o{ `customer_addresses`
- `product_categories` ||--o{ `products`
- `pizza_component_types` |o--o{ `products`
- `allergens` ||--o{ `product_allergens`
- `products` ||--o{ `product_allergens`
- `products` ||--o| `stock_items`
- `stock_items` ||--o{ `stock_movements`
- `products` ||--o{ `component_size_configurations`
- `pizza_sizes` ||--o{ `component_size_configurations`
- `products` ||--o| `predefined_pizzas`
- `predefined_pizzas` ||--|{ `predefined_pizza_recipes`
- `pizza_sizes` ||--o{ `predefined_pizza_available_sizes`
- `consumption_forecasts` ||--|{ `consumption_forecast_entries`
- `supplier_scenarios` ||--|{ `suppliers`
- `supplier_scenarios` ||--|{ `supplier_offers`
- `suppliers` ||--o{ `supplier_offers`
- `planning_results` }o--o| `consumption_forecasts` (`SET NULL`)
- `planning_results` }o--o| `supplier_scenarios` (`SET NULL`)
- (Future) `customer_orders` ||--|{ `order_items`
- (Future) `order_items` ||--o| `personalized_pizza_snapshots`
- (Future) `personalized_pizza_snapshots` ||--|{ `pizza_snapshot_components`
- (Future) `customer_orders` ||--o{ `preparation_activities`
- (Future) `kitchen_resources` |o--o{ `preparation_activities`
- (Future) `preparation_activities` ||--o{ `activity_dependencies`

---

## 20. CQRS Read Views & Indexing Strategy

### 20.1. View: `v_catalogue_products`

Aggregates sellable products with category name and JSON array of allergens:

```sql
CREATE OR REPLACE VIEW v_catalogue_products AS
SELECT
    p.sku, p.name, p.description, p.category_name,
    p.direct_selling_price, p.direct_price_currency,
    p.is_sellable, p.is_pizza_component, p.is_active,
    COALESCE(
        json_agg(json_build_object('name', a.name) ORDER BY a.name)
            FILTER (WHERE a.name IS NOT NULL),
        '[]'::json
    ) AS allergens
FROM products p
LEFT JOIN product_allergens pa ON pa.product_sku = p.sku
LEFT JOIN allergens a ON a.name = pa.allergen_name
WHERE p.is_sellable
GROUP BY p.sku;
```

### 20.2. View: `v_predefined_pizza_details`

Computes dynamic per-size prices and availability:

```sql
CREATE OR REPLACE VIEW v_predefined_pizza_details AS
SELECT
    p.sku AS pizza_sku, p.name AS pizza_name, p.description, p.category_name,
    s.name AS pizza_size,
    SUM(csc.price * r.default_quantity) AS calculated_price,
    MIN(csc.price_currency) AS price_currency,
    BOOL_AND(
        component.is_active AND component.is_pizza_component
        AND (NOT component.is_stock_controlled
            OR COALESCE(stock.current_units, 0) >= csc.stock_units_consumed * r.default_quantity)
    ) AS is_available_in_size
FROM predefined_pizzas pp
JOIN products p ON p.sku = pp.sku
JOIN predefined_pizza_available_sizes avail ON avail.pizza_sku = pp.sku
JOIN pizza_sizes s ON s.name = avail.pizza_size
JOIN predefined_pizza_recipes r ON r.pizza_sku = pp.sku
JOIN products component ON component.sku = r.component_product_sku
LEFT JOIN component_size_configurations csc
       ON csc.product_sku = component.sku AND csc.pizza_size = avail.pizza_size
LEFT JOIN stock_items stock ON stock.product_sku = component.sku
WHERE p.is_active AND s.is_active
GROUP BY p.sku, s.name
HAVING COUNT(csc.product_sku) = COUNT(*) AND COUNT(DISTINCT csc.price_currency) = 1;
```

### 20.3. Indexing Strategy

```sql
CREATE INDEX idx_users_email_lower ON users (LOWER(email));
CREATE INDEX idx_users_name ON users (last_name, first_name);
CREATE INDEX idx_role_assignments_role ON user_role_assignments (role_name);
CREATE INDEX idx_auth_sessions_username ON auth_sessions (username);
CREATE INDEX idx_auth_sessions_last_activity ON auth_sessions (last_activity_at);
CREATE INDEX idx_auth_sessions_expires_at ON auth_sessions (expires_at);
CREATE INDEX idx_password_recovery_username ON password_recovery (username);          -- v2.6
CREATE INDEX idx_password_recovery_expires_at ON password_recovery (expires_at);      -- v2.6
CREATE INDEX idx_unauthorized_attempts_user_ts ON unauthorized_attempts ("user", "timestamp");
CREATE INDEX idx_customers_name ON customers (last_name, first_name);
CREATE INDEX idx_customers_email ON customers (LOWER(email));
CREATE INDEX idx_products_name_lower ON products (LOWER(name));
CREATE INDEX idx_products_category ON products (category_name);
CREATE INDEX idx_products_component_type ON products (component_type_name);
CREATE INDEX idx_comp_size_lookup ON component_size_configurations (product_sku, pizza_size);
CREATE INDEX idx_stock_movements_prod_date ON stock_movements (product_sku, recorded_at DESC);
CREATE UNIQUE INDEX uq_active_kitchen_configuration ON kitchen_configurations (is_active) WHERE is_active = TRUE;
CREATE INDEX idx_forecast_entries ON consumption_forecast_entries (forecast_name, entry_date);
CREATE INDEX idx_planning_results_date ON planning_results (executed_at DESC);
```

---

## 21. TypeORM Implementation

**Authoritative source:** ADR-008a.

> **Migration provenance.** The DDL shown in §17.1–§17.6 is the **cumulative result** of the historical SQL migrations `001_create_users_table.sql` through `017_add_auth_session_last_activity.sql` (Sprint 2 baseline) plus v2.6 migrations `018_create_password_recovery_table.sql`, `019_create_roles_assignment_table.sql`, `020_create_status_assignment_table.sql`, `021_seed_ai02_data.sql`, and `022_predefined_pizza_no_stock.sql`. The predefined-pizza constraint was assigned `022_` to preserve the unique numeric prefix of the password-recovery migration. §17 uses `VARCHAR(n)` and `CURRENT_TIMESTAMP` for documentation clarity; the migrations use bare `VARCHAR` and `NOW()` — semantically equivalent in PostgreSQL. Any future schema change must be added as a new migration (`023_*.sql` onwards or a TypeORM forward migration under `orm-migrations/`, ADR-008a).

### 21.1. Module Structure

```
backend/src/infrastructure/persistence/
├── database-options.ts             # Shared DataSource options
├── entities/                       # 40 table entities + 2 view entities (post-v2.6 count)
│   ├── UserEntity.ts
│   ├── UserRoleEntity.ts
│   ├── UserRoleAssignmentEntity.ts
│   ├── RolesAssignmentEntity.ts          # v2.6 (migration 019)
│   ├── StatusAssignmentEntity.ts         # v2.6 (migration 020)
│   ├── UserDietaryRestrictionEntity.ts
│   ├── ActivationInvitationEntity.ts
│   ├── PasswordRecoveryEntity.ts         # v2.6 (ADR-016)
│   ├── RoleChangeLogEntity.ts
│   ├── AuthSessionEntity.ts
│   ├── UnauthorizedAttemptEntity.ts
│   ├── CustomerEntity.ts
│   ├── CustomerAddressEntity.ts
│   ├── AllergenEntity.ts
│   ├── ProductCategoryEntity.ts
│   ├── ProductEntity.ts
│   ├── ProductAllergenEntity.ts
│   ├── PizzaSizeEntity.ts
│   ├── PizzaComponentTypeEntity.ts
│   ├── ComponentSizeConfigurationEntity.ts
│   ├── PredefinedPizzaEntity.ts
│   ├── PredefinedPizzaRecipeEntity.ts
│   ├── PredefinedPizzaAvailableSizeEntity.ts
│   ├── StockItemEntity.ts
│   ├── StockMovementEntity.ts
│   ├── KitchenConfigurationEntity.ts
│   ├── ConsumptionForecastEntity.ts
│   ├── ConsumptionForecastEntryEntity.ts
│   ├── SupplierScenarioEntity.ts
│   ├── SupplierEntity.ts
│   ├── SupplierOfferEntity.ts
│   ├── PlanningResultEntity.ts
│   ├── CustomerOrderEntity.ts
│   ├── OrderItemEntity.ts
│   ├── PersonalizedPizzaSnapshotEntity.ts
│   ├── PizzaSnapshotComponentEntity.ts
│   ├── PizzaSnapshotAllergenEntity.ts
│   ├── KitchenResourceEntity.ts
│   ├── PreparationActivityEntity.ts
│   ├── ActivityDependencyEntity.ts
│   ├── CatalogueProductsView.ts
│   └── PredefinedPizzaDetailsView.ts
├── mappers/                        # Data Mappers (entity ↔ domain aggregate)
│   ├── AllergenMap.ts
│   ├── AuthSessionMap.ts
│   ├── CardinalityMap.ts
│   ├── CategoryMap.ts
│   ├── PasswordRecoveryMap.ts           # v2.6
│   ├── PizzaComponentTypeMap.ts
│   ├── PizzaSizeMap.ts
│   ├── ProductMap.ts
│   ├── UserMap.ts
│   └── README.md
├── orm-migrations/                 # TypeORM forward migrations
│   ├── 1793145600000-InitialSchema.ts
│   ├── 1793836800000-AuthSessions.ts
│   ├── 1793836801000-UnauthorizedAttempts.ts
│   ├── 1793836802000-AdministratorRole.ts
│   ├── 1793923200000-PasswordRecovery.ts
│   ├── 1794009600000-RolesAssignment.ts
│   ├── 1794009601000-StatusAssignment.ts
│   ├── 1794009602000-AddExternalIdpToUsers.ts
│   ├── 1795000000000-PlanningResults.ts
│   └── 1795000000001-Sprint2AIPlanning.ts
├── repositories/                   # 22 Postgres*Repository.ts using TypeORM
│   ├── InMemoryExchangeCodeStore.ts
│   ├── InMemoryPizzaComponentTypeRepository.ts
│   ├── InMemoryPizzaSizeRepository.ts
│   ├── InMemoryProductCategoryRepository.ts
│   ├── InMemoryProductCategoryUsageRepository.ts
│   ├── InMemoryProductRepository.ts
│   ├── InMemoryUserRepository.ts
│   ├── PostgresAllergenRepository.ts
│   ├── PostgresAuthSessionRepository.ts
│   ├── PostgresCatalogueRepository.ts
│   ├── PostgresCategoryRepository.ts
│   ├── PostgresComponentSizeConfigurationRepository.ts
│   ├── PostgresConsumptionForecastRepository.ts
│   ├── PostgresCustomerRepository.ts
│   ├── PostgresPasswordRecoveryStore.ts  # v2.6 (ADR-016)
│   ├── PostgresPizzaComponentTypeRepository.ts
│   ├── PostgresPizzaSizeRepository.ts
│   ├── PostgresPlanningResultRepository.ts
│   ├── PostgresPredefinedPizzaRepository.ts
│   ├── PostgresProductCategoryRepository.ts
│   ├── PostgresProductRepository.ts
│   ├── PostgresRolesAssignmentRepository.ts  # v2.6
│   ├── PostgresStatusAssignmentRepository.ts # v2.6
│   ├── PostgresStockRepository.ts
│   ├── PostgresSupplierScenarioRepository.ts
│   ├── PostgresUnauthorizedAttemptRepository.ts
│   ├── PostgresUserRepository.ts
│   └── README.md
└── migrations/                     # Historical SQL — frozen baseline + Sprint 2 + v2.6
    ├── 001_create_users_table.sql
    ├── 002_create_customers_and_allergens_tables.sql
    ├── 003_create_catalogues_and_products_tables.sql
    ├── 004_create_configurations_and_recipes_tables.sql
    ├── 005_create_stock_tables.sql
    ├── 006_create_views.sql
    ├── 007_seed_initial_data.sql
    ├── 008_create_orders_and_snapshots.sql
    ├── 009_create_kitchen_tables.sql
    ├── 010_create_indexes.sql
    ├── 011_aggregate_multiplicity.sql
    ├── 012_predefined_pizza_multiple_sizes.sql
    ├── 013_user_contact_details.sql
    ├── 014_sprint2_additions.sql
    ├── 015_create_auth_sessions_table.sql
    ├── 016_create_unauthorized_attempts_table.sql
    ├── 017_add_auth_session_last_activity.sql
    ├── 018_create_password_recovery_table.sql    # v2.6 (ADR-016)
    ├── 019_create_roles_assignment_table.sql     # v2.6
    ├── 020_create_status_assignment_table.sql    # v2.6
    ├── 021_seed_ai02_data.sql                    # v2.6
    └── 022_predefined_pizza_no_stock.sql         # Clarifications #35, #38
```

### 21.2. Migration Workflow

- `npm run migration:generate -- <name>` — generate forward migration
- `npm run migration:run` — apply pending migrations
- `npm run migration:show` — show applied/pending
- `npm run migration:revert` — revert last (only when appropriate)
- `npm run migration:baseline` — adopt existing database initialized by historical scripts 001–013
- `npm run migration:run:prod` — deployment variant
- `npm run migration:baseline:prod` — deployment variant

### Migration Inventory (001–022)

The historical SQL migrations under `backend/src/infrastructure/persistence/migrations/` are applied in strict numeric order. They constitute the **frozen baseline** for a fresh database; ADR-008a freezes them and replaces them, going forward, with TypeORM forward migrations under `orm-migrations/`.

| # | File | Scope | Domain |
|---|---|---|---|
| 001 | `001_create_users_table.sql` | `users`, `user_roles`, `user_role_assignments`, status check | BCK01 |
| 002 | `002_create_customers_and_allergens_tables.sql` | `customers`, `customer_addresses`, `allergens`, `user_dietary_restrictions` | BCK02, BCK04 |
| 003 | `003_create_catalogues_and_products_tables.sql` | `product_categories`, `products`, `product_allergens`, `pizza_sizes`, `pizza_component_types` | BCK03, BCK05, BCK06, BCK07 |
| 004 | `004_create_configurations_and_recipes_tables.sql` | `component_size_configurations`, `predefined_pizzas`, `predefined_pizza_recipes` | BCK08, BCK10 |
| 005 | `005_create_stock_tables.sql` | `stock_items`, `stock_movements` | BCK09 |
| 006 | `006_create_views.sql` | `v_catalogue_products`, `v_predefined_pizza_details` | BCK11 |
| 007 | `007_seed_initial_data.sql` | Seed: 4 base component types, 3 sizes, 6 categories, 14 EU allergens, default Manager | Seed |
| 008 | `008_create_orders_and_snapshots.sql` | `customer_orders`, `order_items`, `personalized_pizza_snapshots`, `pizza_snapshot_components`, `pizza_snapshot_allergens` — **modelled for Sprint 3** | Future |
| 009 | `009_create_kitchen_tables.sql` | `kitchen_resources`, `preparation_activities`, `activity_dependencies` — **modelled for Sprint 3** | Future |
| 010 | `010_create_indexes.sql` | Expression indexes on `LOWER(name)`, `UPPER(code)`, category, component type | Perf |
| 011 | `011_aggregate_multiplicity.sql` | Adjusts multiplicities for `PredefinedPizza ↔ PizzaSize` (`predefined_pizza_available_sizes`) | BCK06, BCK10 |
| 012 | `012_predefined_pizza_multiple_sizes.sql` | Splits PredefinedPizza–size association from a single column into `predefined_pizza_available_sizes` | BCK06, BCK10 |
| 013 | `013_user_contact_details.sql` | Adds `street`, `postal_code`, `city`, `extra_details`, `phone_number` to `users` (self-service contact — BCK02) | BCK02 |
| 014 | `014_sprint2_additions.sql` | **All Sprint 2 additions** (see §21.4 below): `external_idp_subject` + nullable `password_hash`; `activation_invitations`; `role_change_logs`; `products.stock_units_per_sale`; `kitchen_configurations`; `consumption_forecasts` + entries; `supplier_scenarios` + `suppliers` + `supplier_offers`; `planning_results` | AA01–AA07, WEB06, WEB07, AI01, AI02, AI06 |
| 015 | `015_create_auth_sessions_table.sql` | `auth_sessions` (UUID id, username FK, expires_at, revoked_at) — session management per AA04 | AA04 |
| 016 | `016_create_unauthorized_attempts_table.sql` | `unauthorized_attempts` (BIGSERIAL id, user FK, timestamp, endpoint) — audit per ADR-015 | AA05 |
| 017 | `017_add_auth_session_last_activity.sql` | Adds `auth_sessions.last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` + index | Clarifications #29, #34 |
| **018** | **`018_create_password_recovery_table.sql`** | **`password_recovery`** (UUID id, token_hash, expires_at, used_at, revoked_at) — **v2.6 (ADR-016)** | **AA01** |
| **022** | **`022_predefined_pizza_no_stock.sql`** | **DB-level enforcement that `PredefinedPizza`-backing `Product` has `is_stock_controlled = false`** — **Clarifications #35, #38** | **BCK10** |
| **019** | **`019_create_roles_assignment_table.sql`** | **`roles_assignment`** (username, role_name, assigned_at) — **v2.6** | **AA06** |
| **020** | **`020_create_status_assignment_table.sql`** | **`status_assignment`** (username, status, updated_at) — **v2.6** | **AA06** |
| **021** | **`021_seed_ai02_data.sql`** | **Seed data for AI02 planning demos — v2.6** | **AI02** |

**Applying:** `npm run migration:run` applies any unapplied file; `npm run migration:baseline` adopts a pre-existing database built from 001–013 without replaying them. The TypeORM baseline migration `1793145600000-InitialSchema.ts` **reproduces 001–013** (including the split of `predefined_pizza_available_sizes` from 012) so that a fresh install may use TypeORM migrations exclusively.

**Idempotency:** migrations `001`–`013` are one-shot. `014_sprint2_additions.sql` uses `IF NOT EXISTS` for every `CREATE TABLE`/`CREATE INDEX` and every `ADD COLUMN`, but its single `ALTER TABLE products ADD CONSTRAINT chk_stock_units_per_sale ...` **is not idempotent** on its own. Migrations 015–021 use `IF NOT EXISTS` throughout where possible (the two `018_` files use `IF NOT EXISTS` on `CREATE TABLE` and index; `019`/`020` follow the same convention; `021` uses `ON CONFLICT DO NOTHING` where applicable).

> The migration numbering is unique through `022_`. The next historical SQL migration must use `023_` or later; TypeORM forward migrations remain the preferred path for new schema changes.

### 21.3. Deployment (via `start-backend.sh`)

```sh
migration:run:prod          # apply pending
[SEED_DATABASE=true] seed:prod  # optional fixtures
exec node dist/index.js     # start server
```

Compose: `SEED_DATABASE=false make up` to skip seed.

### 21.4. Migration 014 — Sprint 2 Additions (reproduced verbatim)

**File:** `backend/src/infrastructure/persistence/migrations/014_sprint2_additions.sql`
**Domain:** AA01–AA07, WEB06, WEB07, AI01, AI02, AI06
**Introduced:** ADR-010, ADR-011, ADR-012, ADR-013
**Companion:** §17.7 (kitchen_configurations), §17.8 (AI planning), §17.1 (activation_invitations, role_change_logs), §17.3 (products.stock_units_per_sale)

```sql
BEGIN;

-- =====================================================================
-- 1. SPRINT 2: IDENTITY & ACCESS (AA01-AA07)
-- =====================================================================

-- Modify users table for OIDC integration
ALTER TABLE users ADD COLUMN IF NOT EXISTS external_idp_subject VARCHAR;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Activation Invitations (AA06, AA07)
-- Business Key: token (the unique invitation identifier)
CREATE TABLE IF NOT EXISTS activation_invitations (
    token VARCHAR PRIMARY KEY,
    username VARCHAR NOT NULL REFERENCES users(username) ON DELETE CASCADE,
    purpose VARCHAR NOT NULL CHECK (purpose IN ('LOCAL_ACCOUNT_ACTIVATION', 'EXTERNAL_IDP_MATCH', 'PASSWORD_RESET')),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Role Change Logs (AA06 Audit)
-- Business Key: auto-incrementing ID (since logs have no natural business code)
CREATE TABLE IF NOT EXISTS role_change_logs (
    log_id SERIAL PRIMARY KEY,
    actor_username VARCHAR NOT NULL,
    target_username VARCHAR NOT NULL,
    previous_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
    new_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
    reason VARCHAR,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- 2. SPRINT 2: CATALOGUE EXTENSIONS
-- =====================================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_units_per_sale INT;
ALTER TABLE products ADD CONSTRAINT chk_stock_units_per_sale CHECK (stock_units_per_sale IS NULL OR stock_units_per_sale >= 0);

-- =====================================================================
-- 3. SPRINT 2: KITCHEN CONFIGURATION (WEB06, VIS)
-- =====================================================================

-- Business Key: name (e.g., "Standard Layout", "Summer Layout")
CREATE TABLE IF NOT EXISTS kitchen_configurations (
    name VARCHAR PRIMARY KEY,
    json_content JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_active_kitchen_configuration 
ON kitchen_configurations (is_active) 
WHERE is_active = TRUE;

-- =====================================================================
-- 4. SPRINT 2: AI PLANNING ENGINE (WEB07, AI01, AI02, AI06)
-- =====================================================================

-- Consumption Forecasts
-- Business Key: name (e.g., "Week 1 Forecast")
CREATE TABLE IF NOT EXISTS consumption_forecasts (
    name VARCHAR PRIMARY KEY,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_forecast_dates CHECK (start_date <= end_date)
);

-- Business Keys: forecast_name, product_sku, pizza_size
CREATE TABLE IF NOT EXISTS consumption_forecast_entries (
    forecast_name VARCHAR NOT NULL REFERENCES consumption_forecasts(name) ON DELETE CASCADE,
    entry_date DATE NOT NULL,
    product_sku VARCHAR NOT NULL REFERENCES products(sku) ON DELETE RESTRICT,
    pizza_size VARCHAR REFERENCES pizza_sizes(name) ON DELETE RESTRICT,
    quantity INT NOT NULL CHECK (quantity >= 0),
    PRIMARY KEY (forecast_name, entry_date, product_sku, pizza_size)
);

-- Supplier Scenarios
-- Business Key: name (e.g., "Primary Vendors", "Fallback Vendors")
CREATE TABLE IF NOT EXISTS supplier_scenarios (
    name VARCHAR PRIMARY KEY,
    is_simulated BOOLEAN NOT NULL DEFAULT FALSE,
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Business Keys: scenario_name, supplier_code
CREATE TABLE IF NOT EXISTS suppliers (
    scenario_name VARCHAR NOT NULL REFERENCES supplier_scenarios(name) ON DELETE CASCADE,
    supplier_code VARCHAR NOT NULL,
    name VARCHAR,
    PRIMARY KEY (scenario_name, supplier_code)
);

-- Business Keys: scenario_name, supplier_code, product_sku
CREATE TABLE IF NOT EXISTS supplier_offers (
    scenario_name VARCHAR NOT NULL,
    supplier_code VARCHAR NOT NULL,
    product_sku VARCHAR NOT NULL REFERENCES products(sku) ON DELETE RESTRICT,
    price_amount NUMERIC(10,2) NOT NULL CHECK (price_amount >= 0),
    price_currency VARCHAR NOT NULL DEFAULT 'EUR',
    stock_unit_quantity INT NOT NULL CHECK (stock_unit_quantity > 0),
    lead_time_days INT NOT NULL CHECK (lead_time_days >= 0),
    daily_supply_limit INT CHECK (daily_supply_limit IS NULL OR daily_supply_limit >= 0),
    PRIMARY KEY (scenario_name, supplier_code, product_sku),
    FOREIGN KEY (scenario_name, supplier_code) REFERENCES suppliers(scenario_name, supplier_code) ON DELETE CASCADE
);

-- Planning Results (Immutable Snapshots)
-- Business Key: execution_id (auto-incrementing serial)
CREATE TABLE IF NOT EXISTS planning_results (
    execution_id SERIAL PRIMARY KEY,
    forecast_name VARCHAR REFERENCES consumption_forecasts(name) ON DELETE SET NULL,
    scenario_name VARCHAR REFERENCES supplier_scenarios(name) ON DELETE SET NULL,
    reference_date DATE NOT NULL,
    is_replay BOOLEAN NOT NULL DEFAULT FALSE,
    is_simulated BOOLEAN NOT NULL DEFAULT FALSE,
    forecast_snapshot JSONB NOT NULL,
    scenario_snapshot JSONB NOT NULL,
    stock_snapshot JSONB NOT NULL,
    requirements JSONB NOT NULL,
    proposals JSONB NOT NULL,
    unmet_needs JSONB NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
```
**Observations on the 014 migration (informational; §17.7–§17.8 already aligned):**

1. **`VARCHAR` without length** — PostgreSQL treats bare `VARCHAR` as unlimited; the §17 tables show `VARCHAR(n)` for documentation clarity only.
2. **`consumption_forecast_entries.pizza_size` is nullable** — matches Clarification #28 (confirmed by #36): non-pizza products in forecasts have `pizza_size = NULL`.
3. **`suppliers.name` is nullable** — a supplier may exist by code alone.
4. **`daily_supply_limit >= 0`** — allows `daily_supply_limit = 0`. Semantically `NULL = unlimited` and `0 = never` are distinguishable.
5. **`consumption_forecasts` date check** — `start_date <= end_date` in the migration vs `end_date >= start_date` in §17.8. Logically equivalent.
6. **`ALTER TABLE products ADD CONSTRAINT chk_stock_units_per_sale`** — the only non-idempotent statement. Re-running 014 in an environment where the constraint already exists aborts the whole transaction. Intentional.

### 21.5. Migrations 015–021 (Sprint 2 + v2.6)

Migrations 015–017 are documented in `08-database-structure.md`; migration 015 (`015_create_auth_sessions_table.sql`) and 016 (`016_create_unauthorized_attempts_table.sql`) are reproduced in the repository. Migration 017 (`017_add_auth_session_last_activity.sql`) adds the `last_activity_at` column and index.

**v2.6 migrations:**

- **`018_create_password_recovery_table.sql`** (ADR-016): creates `password_recovery` (UUID id, `token_hash`, `expires_at`, `used_at`, `revoked_at`, `created_at`, FK to `users`). Idempotent via `IF NOT EXISTS`.
- **`022_predefined_pizza_no_stock.sql`** (Clarifications #35, #38): enforces that any `Product` referenced by `predefined_pizzas.sku` has `is_stock_controlled = false`. Implementation uses a defence-in-depth database constraint with `NOT VALID`; application-layer validation remains primary.
- **`019_create_roles_assignment_table.sql`**: creates `roles_assignment (username, role_name, assigned_at, PK(username, role_name))`, with FK to `users` (CASCADE) and `user_roles` (RESTRICT).
- **`020_create_status_assignment_table.sql`**: creates `status_assignment (username PK, status, updated_at)`, with FK to `users` (CASCADE) and status check.
- **`021_seed_ai02_data.sql`**: seeds demo data for AI02 (consumption forecasts, supplier scenarios, offers, pending deliveries) for Sprint 2 demonstration.

---

# PART V — API CONTRACTS

## 22. REST API Design Specification

### 22.1. Global Conventions

- **Base path:** `/api/v1`
- **Content type:** `application/json; charset=utf-8`
- **Casing:** URIs = `kebab-case`; JSON attributes = `camelCase`; enums = `UPPER_SNAKE_CASE`
- **Transport:** HTTPS in production; HTTP allowed locally
- **Versioning:** explicit in path

### 22.2. HTTP Method Semantics

| Method | Semantics | Idempotent |
|---|---|---|
| `GET` | Retrieve representation; never mutates | Yes |
| `POST` | Create or execute atomic business operation | No |
| `PUT` | Full replacement/upsert | Yes |
| `PATCH` | Partial update / state transition | No |
| `DELETE` | Remove/deactivate | Yes |

### 22.3. Richardson Level 2

Uniform resources + HTTP methods + status codes. **No HATEOAS** (Level 3) in current baseline.

---

## 23. RBAC Endpoint Permissions Matrix

The complete matrix is in `06-api-design-specification.md` and `docs/api/openapi.yaml` v2.2.0. Summary:

| Story | Method | Path | Roles | Success |
|---|---|---|---|---|
| BCK01 | POST | `/auth/register` | Public | 201 (User + Customer in `PENDING_REGISTRATION` per #27; activation email sent) |
| BCK01 | POST | `/auth/login` | Public | 200 + JWT + Set-Cookie (rejects external-only users; rejects PENDING_REGISTRATION per #32) |
| BCK01 | POST | `/auth/pre_register` | **ADMINISTRATOR** (v2.6) | 201 (invitation created) |
| AA02 | GET | `/auth/external/login` | Public | 302 (redirect to IdP) |
| AA02 | GET | `/auth/external/callback` | Public | 302 (SPA redirect with JWT) |
| AA06/AA07 | POST | `/auth/activate` | Public | 200 (consume invitation) |
| AA04 | POST | `/auth/refresh` | Auth (refresh token) | 200 (new access token; updates `lastActivityAt`; rejects if inactivity exceeded per #34) |
| AA04 | POST | `/auth/logout` | Auth | 204 (revokes only current session per #29) |
| AA01 | POST | `/auth/password-recovery` | Public | 202 (email sent; single-use link, ADR-016) |
| AA01 | POST | `/auth/password-reset` | Public | 200 (consume PASSWORD_RESET invitation; enforce password policy per #32) |
| AA01 | POST | `/auth/resend-activation` | Public | 202 (resend activation email for PENDING_REGISTRATION per #32) |
| BCK01 | GET | `/users` | **ADMINISTRATOR** (v2.6) | 200 + Page |
| BCK01 | GET | `/users/filter/creation-date/:date` | **ADMINISTRATOR** | 200 |
| BCK01 | GET | `/users/filter/role/:role` | **ADMINISTRATOR** | 200 |
| BCK01 | GET | `/users/filter/status/:status` | **ADMINISTRATOR** | 200 |
| BCK01 | GET | `/user/:username` | **ADMINISTRATOR** / self (resource-level, #33) | 200 |
| BCK01 | DELETE | `/user/:username` | **ADMINISTRATOR** / self | 200 |
| AA06 | GET | `/users/:username/role-history` | **ADMINISTRATOR** | 200 (RoleChangeLog) |
| AA06 | PUT | `/users/{username}/roles` | **ADMINISTRATOR** | 200 + UserResponseDTO + RoleChangeLog entry. 409 if would leave zero active MANAGERs. 422 if CUSTOMER role assignment requires Customer record that cannot be auto-created. |
| **AA05** | **GET** | **`/admin/unauthorized-attempts`** | **ADMINISTRATOR (v2.6, Clarification #42)** | **200 (paginated)** |
| BCK02 | POST | `/customers` | **MANAGER** | 201 |
| BCK02 | GET | `/customers?search=...` | **MANAGER** | 200 |
| BCK02 | GET | `/customers/:email` | **MANAGER** / own (#33) | 200 |
| BCK02 | PUT | `/customers/:email` | **MANAGER** / own (#33) | 200 |
| BCK02 | PUT | `/customers/:email/dietary-restrictions` | **MANAGER** / own (#33) | 200 |
| BCK02 | DELETE | `/customers/:email` | **MANAGER** | 200 |
| BCK02 | PUT | `/user/me/address` | Auth | 200 |
| BCK02 | PUT | `/user/me/phone-number` | Auth | 200 |
| BCK03 | POST, DELETE | `/api/v1/product-categories` | **MANAGER** | — |
| BCK03 | GET | `/api/v1/product-categories` | Public | — |
| BCK04 | POST, DELETE | `/api/v1/allergens` | **MANAGER** | — |
| BCK04 | GET | `/api/v1/allergens` | Public | — |
| BCK05 | POST, PUT | `/api/v1/products` | **MANAGER** | — |
| BCK05 | GET | `/api/v1/products` | **MANAGER, EMPLOYEE** | — |
| BCK05 | DELETE | `/api/v1/products/{sku}` | **MANAGER** | — |
| BCK06 | POST, DELETE | `/api/v1/pizza-sizes` | **MANAGER** | — |
| BCK06 | GET | `/api/v1/pizza-sizes` | Public | — |
| BCK07 | POST | `/pizza-component-types` | **MANAGER** | 201 |
| BCK07 | GET | `/pizza-component-types` | Public | 200 + Page |
| BCK07 | GET | `/pizza-component-types/:name` | Public | 200 |
| BCK07 | PUT | `/pizza-component-types/:name` | **MANAGER** | 200 |
| BCK07 | DELETE | `/pizza-component-types/:name` | **MANAGER** | 200 |
| BCK08 | POST, PUT | `/api/v1/products/{sku}/size-configurations` | **MANAGER** | — |
| BCK08 | GET | `/api/v1/products/{sku}/size-configurations` | Public | — |
| BCK09 | GET | `/api/v1/stock` | **MANAGER, EMPLOYEE** | — |
| BCK09 | POST | `/api/v1/stock/{sku}/adjustments` | **MANAGER** | — |
| BCK10 | POST | `/api/v1/predefined-pizzas` | **MANAGER** | — |
| BCK10 | GET | `/api/v1/predefined-pizzas` | Public | — |
| BCK11 | GET | `/api/v1/catalogue` | Public | — |
| WEB06 | GET | `/api/v1/kitchen-configurations` | **MANAGER, EMPLOYEE** | 200 |
| WEB06 | POST, PUT, DELETE | `/api/v1/kitchen-configurations` | **MANAGER** | 200/201/204 |
| WEB06 | POST | `/api/v1/kitchen-configurations/{name}/activate` | **MANAGER** | 200 |
| WEB07 | GET | `/api/v1/consumption-forecasts` | **MANAGER** | 200 |
| WEB07 | POST, PUT, DELETE | `/api/v1/consumption-forecasts` | **MANAGER** | — |
| WEB07 | GET | `/api/v1/supplier-scenarios` | **MANAGER** | 200 |
| WEB07 | POST, PUT, DELETE | `/api/v1/supplier-scenarios` | **MANAGER** | — |
| WEB07 | POST | `/api/v1/supplier-scenarios/{name}/confirm` | **MANAGER** | 200 |
| AI05 | POST | `/api/v1/planning/executions` | **MANAGER** | 201 (PlanningResult) |
| AI05 | GET | `/api/v1/planning/executions` | **MANAGER** | 200 |
| AI05 | GET | `/api/v1/planning/executions/{executionId}` | **MANAGER** | 200 |
| AI05 | POST | `/api/v1/planning/executions/{executionId}/replay` | **MANAGER** | 201 (new PlanningResult with `is_replay=true`) |
| AI06 | GET | `/api/v1/products/export` | **MANAGER** | 200 (product JSON for planning KB) |

**Resource-level authorization (Clarification #33):** endpoints marked "own" additionally enforce `currentUser.email === resource.ownerEmail` OR `currentUser` has `MANAGER` role via `CustomerAccessPolicy`.

**ADMINISTRATOR vs MANAGER separation (v2.6, Clarification #42, Sprint 2 Table 1):** user account management, role assignment, activation invitations, and application audit-log consultation belong to `ADMINISTRATOR`. Restaurant operations (catalogue, stock, kitchen configs, forecasts, planning) belong to `MANAGER`. A single account may hold both roles; each operation requires the specific role and, where applicable, the resource-ownership check (`CustomerAccessPolicy`).

---

## 24. DTO Contracts & Payload Specifications

### 24.1. Authentication DTOs

**LoginRequestDTO:**
```json
{ "email": "manager@laprizza.com", "password": "Secr3tP@ssw0rd!" }
```
Email is case-insensitive (Clarification #32).

**LoginResponseDTO:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "user": {
    "username": "manager.01",
    "email": "manager@laprizza.com",
    "status": "ACTIVE",
    "roles": ["MANAGER"]
  }
}
```
`expiresIn` reflects `JWT_EXPIRES_IN`. Session state is tracked server-side (`auth_sessions`).

### 24.1bis. Additional Authentication DTOs (Sprint 2)

**RegisterCustomerRequestDTO** (used by `POST /auth/register`):
```json
{
  "firstName": "Maria",
  "lastName": "Silva",
  "email": "maria.silva@email.pt",
  "password": "Secr3tP@ssw0rd!",
  "phoneNumber": "+351912345678",
  "dietaryRestrictions": [
    { "allergenName": "Dairy" }
  ]
}
```

**PreRegisterStaffRequestDTO** (used by `POST /auth/pre_register`):
```json
{
  "firstName": "Pedro",
  "lastName": "Ribeiro",
  "email": "pedro.ribeiro@laprizza.com",
  "roles": ["EMPLOYEE"]
}
```

**ActivateInvitationRequestDTO** (used by `POST /auth/activate`):
```json
{
  "token": "a1b2c3d4e5f6…",
  "password": "NewSecr3tP@ssw0rd!"
}
```

**PasswordRecoveryRequestDTO** (used by `POST /auth/password-recovery`, Clarification #32, ADR-016):
```json
{ "email": "maria.silva@email.pt" }
```
Response: `202 Accepted` regardless of account existence (prevents enumeration).

**PasswordResetRequestDTO** (used by `POST /auth/password-reset`, Clarification #32, ADR-016):
```json
{
  "token": "a1b2c3d4e5f6…",
  "newPassword": "NewSecr3tP@ssw0rd!"
}
```
Enforces `PasswordPolicy` uniformly.

**ResendActivationRequestDTO** (used by `POST /auth/resend-activation`, Clarification #32):
```json
{ "email": "maria.silva@email.pt" }
```
Only for `PENDING_REGISTRATION` accounts; response `202 Accepted`.

**RefreshTokenRequestDTO** (used by `POST /auth/refresh`, Clarifications #29, #34):
```json
{ "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```
or `Authorization: Bearer <refresh>` + empty body (team choice). Rejects if `now − lastActivityAt ≥ SESSION_INACTIVITY_MINUTES`.

**ReplaceUserRolesRequestDTO** (used by `PUT /users/{username}/roles`, AA06):
```json
{
  "roles": ["MANAGER", "EMPLOYEE"],
  "reason": "Promoted to assistant manager after six-month review"
}
```
Semantics: the array is a full **replacement** (not a merge). The endpoint emits a `RoleChangeLog` entry (Clarification #24 §1.4) and enforces the ≥1 active MANAGER invariant (Clarification #24 §1.2), returning 409 if the resulting state would leave zero active MANAGERs. **Requires `ADMINISTRATOR` role (v2.6, Clarification #42).**

### 24.2. Customer Profile DTO

```json
{
  "firstName": "Maria",
  "lastName": "Silva",
  "phoneNumber": "+351912345678",
  "email": "maria.silva@email.pt",
  "username": "maria.silva",
  "dietaryRestrictions": [
    { "allergenName": "Dairy", "recordedAt": "2026-11-01T12:00:00Z" }
  ]
}
```

### 24.3. Product Creation DTO

```json
{
  "sku": "PRD-MOZZ-01",
  "name": "Fior di Latte Mozzarella",
  "description": "Artisanal fresh cow milk cheese",
  "categoryName": "Cheese",
  "isSellable": false,
  "isPizzaComponent": true,
  "isStockControlled": true,
  "componentTypeName": "Cheese",
  "stockUnitsPerSale": null,
  "allergens": ["Dairy"]
}
```
`stockUnitsPerSale` is mandatory for `isStockControlled ∧ isSellable` at planning (Clarification #28). Applies to non-pizza sellable products as well (Clarification #36). Per Clarification #35/#38, if this SKU backs a `PredefinedPizza`, `isStockControlled` must be `false`.

### 24.4. Component Size Configuration DTO

```json
{
  "pizzaSize": "Large",
  "applicablePrice": { "amount": 2.50, "currency": "EUR" },
  "stockUnitsConsumed": 3
}
```

### 24.5. Stock Adjustment DTO

```json
{
  "operation": "CONSUME",
  "units": 15,
  "reason": "Kitchen preparation consumption batch #40"
}
```

### 24.6. Predefined Pizza Recipe DTO

```json
{
  "sellableProductSku": "PRD-PIZZA-MARG",
  "recipeName": "Margherita Classica",
  "defaultRecipeLines": [
    { "componentProductSku": "PRD-DOUGH-TRAD", "defaultQuantity": 1 },
    { "componentProductSku": "PRD-SAUCE-TOM", "defaultQuantity": 1 },
    { "componentProductSku": "PRD-MOZZ-01", "defaultQuantity": 1 }
  ],
  "availableSizes": ["Small", "Medium", "Large"]
}
```

### 24.7. Catalogue Query DTO

```json
{
  "sku": "PRD-PIZZA-MARG",
  "name": "Pizza Margherita",
  "description": "Classic stone-baked pizza with tomato sauce and mozzarella",
  "categoryName": "Pizzas",
  "allergens": ["Gluten", "Dairy"],
  "isPredefinedPizza": true,
  "sizeVariants": [
    { "sizeName": "Small", "computedPrice": { "amount": 6.00, "currency": "EUR" }, "isAvailable": true },
    { "sizeName": "Medium", "computedPrice": { "amount": 8.50, "currency": "EUR" }, "isAvailable": true },
    { "sizeName": "Large", "computedPrice": { "amount": 11.00, "currency": "EUR" }, "isAvailable": false }
  ]
}
```

### 24.8. Kitchen Configuration DTO (Sprint 2, ADR-011, ADR-014)

```json
{
  "name": "Standard Layout",
  "jsonContent": {
    "dimensions": { "x": 10.0, "y": 3.5, "z": 8.0 },
    "equipment": [
      { "id": "oven-main", "modelUrl": "/assets/oven.glb", "position": [4.0, 0, 6.0], "rotation": [0, 0, 0], "scale": [1, 1, 1] },
      { "id": "conveyor-main", "modelUrl": "/assets/conveyor.glb", "position": [4.0, 1.1, 3.0], "rotation": [0, 0, 0], "scale": [1, 1, 1] }
    ],
    "lights": [
      { "type": "ambient", "color": "#ffffff", "intensity": 0.5 },
      { "type": "spot", "position": [4.0, 3.5, 4.0], "color": "#ffeeaa", "intensity": 1.2 }
    ],
    "animationTriggers": []
  },
  "isActive": true
}
```
Material reuse across equipment with similar surfaces is permitted (Clarification #31); the JSON `modelUrl` may reference the same GLB for visually similar objects.

### 24.9. Planning Execution Request DTO (Sprint 2, ADR-012, v2.6 extended per Clarification #37)

```json
{
  "forecastName": "Week-45-Forecast",
  "scenarioName": "Autumn-Scenario",
  "referenceDate": "2026-11-10",
  "pendingDeliveries": [
    { "productSku": "PRD-MOZZ-01", "quantity": 24, "expectedDeliveryDate": "2026-11-11" },
    { "productSku": "PRD-SAUCE-TOM", "quantity": 12, "expectedDeliveryDate": "2026-11-12" }
  ]
}
```
- `referenceDate` is optional; if absent, defaults to execution date.
- `pendingDeliveries` is optional; if absent, treated as an empty list.
- No proposed order date may precede `referenceDate`.

### 24.10. Planning Result Response DTO (Sprint 2, ADR-013, Clarifications #30, #36, #37)

```json
{
  "executionId": 42,
  "forecastName": "Week-45-Forecast",
  "scenarioName": "Autumn-Scenario",
  "referenceDate": "2026-11-10",
  "isReplay": false,
  "isSimulated": false,
  "executedAt": "2026-11-10T14:30:00Z",
  "requirements": {
    "cheese": { "required": 120, "available": 80, "replenishmentNeed": 40 },
    "tomato": { "required": 60, "available": 55, "replenishmentNeed": 5 },
    "beverage-cola-can": { "required": 48, "available": 60, "replenishmentNeed": 0 }
  },
  "proposals": [
    {
      "supplierCode": "SUP-A",
      "productSku": "PRD-MOZZ-01",
      "quantity": 48,
      "orderDate": "2026-11-10",
      "deliveryDate": "2026-11-11",
      "priceEUR": { "amount": 80.00, "currency": "EUR" },
      "meetsRequiredDate": true,
      "lateByDays": 0
    },
    {
      "supplierCode": "SUP-B",
      "productSku": "PRD-SAUCE-TOM",
      "quantity": 6,
      "orderDate": "2026-11-10",
      "deliveryDate": "2026-11-14",
      "priceEUR": { "amount": 10.00, "currency": "EUR" },
      "meetsRequiredDate": false,
      "lateByDays": 3
    }
  ],
  "unmetNeeds": [
    {
      "date": "2026-11-13",
      "productSku": "PRD-SAUCE-TOM",
      "shortfall": 6,
      "reason": "No supplier can deliver by required date; proposal SUP-B delivery is 3 days late."
    }
  ]
}
```
Notes:
- `quantity` is a multiple of `SupplierOffer.stockUnitQuantity` (indivisible lot, Clarification #30). In the example, `PRD-MOZZ-01` requires 40 but the lot is 24; 48 is proposed, 8 go to hypothetical stock.
- `meetsRequiredDate = false` and `lateByDays > 0` are explicit labels (Clarification #30).
- Non-pizza products (`beverage-cola-can`) appear in `requirements` with `replenishmentNeed` computed via `stockUnitsPerSale` (Clarification #36).
- **Per Clarification #37**, no proposed `orderDate` is earlier than `referenceDate` (here `2026-11-10`). Stock for consumption on day N must be available by end of N−1; the algorithm schedules deliveries accordingly. Late proposals are permitted with no maximum delay, but the `unmetNeeds` entry preserves the original requirement as not satisfied by its deadline.
- **Per Clarification #44**, only one `SupplierOffer` per `(supplier, product)` — hence at most one proposal per supplier-product pair per planning run.

---

## 25. Standardized Error Envelope & HTTP Status Matrix

### 25.1. Error Envelope

```json
{
  "timestamp": "2026-11-05T14:45:00.123Z",
  "status": 409,
  "error": "Conflict",
  "message": "Cannot delete product category 'Pizzas': actively referenced by existing products.",
  "details": [
    "Referential dependency detected on product sku: PRD-PIZZA-MARG"
  ]
}
```

### 25.2. Status Code Matrix

| Code | Meaning | Scenario |
|---|---|---|
| **200** | OK | Successful GET, update, or stock adjustment balance return; successful refresh; successful password-reset |
| **201** | Created | Successful product/customer/category/recipe/planning execution creation |
| **202** | Accepted | Password-recovery email sent; resend-activation email sent |
| **204** | No Content | Successful deletion of unreferenced entity; successful logout (per #29) |
| **302** | Found | OIDC redirect (login initiation) |
| **400** | Bad Request | Joi validation failure (malformed email, missing field, non-integer stock) |
| **401** | Unauthorized | Missing, malformed, invalid, expired JWT; **expired/inactive session per #29/#34**; refresh rejected due to inactivity (includes `WWW-Authenticate: Bearer realm="laprizza"` header — see §27) |
| **403** | Forbidden | Valid token but insufficient role, inactive account, **or resource-level denial per #33**. **Includes non-ADMINISTRATOR accessing `/admin/unauthorized-attempts` (Clarification #42).** |
| **404** | Not Found | Resource not found |
| **409** | Conflict | Unique constraint violation or delete of referenced entity; concurrent edit (Clarification #23 §6.1); **role change leaving zero active MANAGERs**; **duplicate `(supplier, product)` offer within a scenario (Clarification #44)** |
| **422** | Unprocessable | Domain invariant failure (product without roles, negative stock, cardinality breach, missing `stockUnitsPerSale` during planning, **password policy violation per #32**, **`PredefinedPizza` with `isStockControlled=true` per #35/#38**, **proposal quantity not a multiple of lot per #30**, **order date before `referenceDate` per #37**) |
| **500** | Internal Server Error | Unexpected server fault; sanitized |
| **502** | Bad Gateway | Prolog engine unavailable or unreachable |
| **503** | Service Unavailable | External IdP outage (redirect fails), SMTP failure |

---

## 26. Input Boundary Validation Architecture

Joi validation schemas execute at routing boundary **before** controller:

1. **Strict Schema Enforcement** — types, required fields, format validation, string length.
2. **Strip Unknown (`stripUnknown: true`)** — prevents mass assignment; extraneous fields stripped.
3. **Fail-Fast** — invalid payload returns `400 Bad Request` immediately, no service invocation.
4. **Domain vs Schema Validation:** Joi validates structure/format only. Business invariants (e.g., `(isSellable || isPizzaComponent)`, `password policy` per #32, `PredefinedPizza must not be stock-controlled` per #35/#38, `planning order date not before referenceDate` per #37) are enforced in the domain layer and produce `422`.

**Key endpoints with `stripUnknown`:** `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/password-recovery`, `/auth/password-reset`, `/auth/resend-activation`, `/users`, `/products`, `/customers`, `/predefined-pizzas`, `/kitchen-configurations`, `/consumption-forecasts`, `/supplier-scenarios`, `/planning/executions`.

---

## 27. OpenAPI 3.0.3 Contract Reference

**File:** `docs/api/openapi.yaml`.

**Metadata:**
- Title: `LaPrizza Information System - Back-End REST API`
- Version: `2.2.0` (Sprint 2 baseline, incorporating Clarifications #29–#46)
- Servers: `http://localhost:3000/api/v1` (dev), `https://api.laprizza.local/api/v1` (staging)

**Security scheme:** `BearerAuth` (`type: http`, `scheme: bearer`, `bearerFormat: JWT`).

**Tags:**
- Diagnostics & Observability
- Authentication & Users (Local + External + Activation + Password Recovery + Session)
- **Administration (v2.6 — `ADMINISTRATOR`-only)**
- Customers
- Product Categories
- Allergens
- Products
- Pizza Taxonomy
- Component Configurations
- Stock
- Predefined Pizzas
- Catalogue Queries
- Kitchen Configurations
- Consumption Forecasts
- Supplier Scenarios
- AI Planning

**Reusable responses:** `400BadRequest`, `401Unauthorized`, `403Forbidden`, `404NotFound`, `409Conflict`, `422Unprocessable`, `502BadGateway`, `503ServiceUnavailable`.

**Per-response additions:** the `401 Unauthorized` response includes the standard header `WWW-Authenticate: Bearer realm="laprizza"` (RFC 7235 §4.1). This is a browser/client-friendly signal required for credential negotiation.

**Key schemas:** see §24 for full examples. Additional: `LoginRequestDTO`, `LoginResponseDTO`, `RefreshTokenRequestDTO`, `PasswordRecoveryRequestDTO`, `PasswordResetRequestDTO`, `ResendActivationRequestDTO`, `RegisterCustomerRequestDTO`, `PreRegisterStaffRequestDTO`, `ActivateInvitationRequestDTO`, `ReplaceUserRolesRequestDTO`, `KitchenConfigurationRequestDTO`, `KitchenConfigurationResponseDTO`, `ConsumptionForecastRequestDTO`, `SupplierScenarioRequestDTO`, `PlanningExecutionRequestDTO` (v2.6: adds `referenceDate`, `pendingDeliveries[]`), `PlanningResultResponseDTO`, **`UnauthorizedAttemptsPageDTO` (v2.6)**.

**Tooling:**
- Swagger UI / ReDoc served at `/api/docs`
- Bruno CLI: `npx @usebruno/cli run`
- Supertest-based contract verification

---

# PART VI — TESTING & QUALITY

## 28. Automated Testing Strategy

### 28.1. Multi-Tier Pyramid (Per ADR-006, ADR-008a)

| Tier | Tool | Scope | Speed |
|---|---|---|---|
| **Unit** | Jest | Domain entities, VOs, domain services, `AuthSession.isActive`, `PasswordPolicy`, `PasswordRecoveryToken` consumption, `PurchaseProposal` factories | < 1s per file |
| **Application** | Jest + Fakes | Use cases with in-memory repos (incl. `InMemoryAuthSessionRepository`, `InMemoryPasswordRecoveryStore`) | Fast |
| **Integration** | Supertest | HTTP pipeline (in-memory app) | Moderate |
| **Database** | Jest + PostgreSQL 16 | Entity/schema parity, migration reversal/reapplication, aggregate rollback, deferred constraints, concurrent stock consumption, session inactivity sweep, password recovery concurrency | Moderate |
| **Black-Box** | Bruno CLI | Chained workflows against live server | Slow (DB) |

### 28.2. F.I.R.S.T. Principles

- **Fast** — most tests < 1s
- **Independent** — no shared state; DB suites use isolated schemas
- **Repeatable** — deterministic, no flaky ports
- **Self-validating** — automated assertions
- **Timely** — written alongside production code

### 28.3. Test Structure

```
backend/tests/
├── unit/
│   ├── domain/
│   │   ├── pizza-composition.spec.ts
│   │   ├── kitchen-configuration.spec.ts
│   │   ├── planning-result.spec.ts
│   │   ├── auth-session.spec.ts              # inactivity + per-device logout (#29, #34)
│   │   ├── password-policy.spec.ts           # #32
│   │   ├── password-recovery.spec.ts         # v2.6 (ADR-016)
│   │   ├── purchase-proposal.spec.ts         # indivisible lot + late labels (#30)
│   │   └── ...
│   └── application/
│       ├── pizza-component-type.service.spec.ts
│       ├── external-auth.service.spec.ts
│       ├── password-recovery.service.spec.ts # v2.6 (ADR-016)
│       ├── session.service.spec.ts           # #29, #34
│       ├── roles-assignment.service.spec.ts  # v2.6
│       ├── status-assignment.service.spec.ts # v2.6
│       ├── planning.service.spec.ts          # includes pendingDeliveries (#37)
│       └── ...
├── integration/
│   ├── pizza-component-type.controller.spec.ts
│   ├── kitchen-configuration.controller.spec.ts
│   ├── auth.controller.spec.ts               # login/refresh/logout/password-recovery (#29, #32, #34, ADR-016)
│   ├── admin-audit.controller.spec.ts        # v2.6 (Clarification #42)
│   ├── planning.controller.spec.ts           # pending deliveries (#37)
│   ├── customer-access-policy.spec.ts        # #33 resource-level auth
│   ├── helpers/
│   │   └── catalogue-users.ts
│   └── ...
├── database/
│   ├── entity-schema-parity.spec.ts
│   ├── migration-baseline.spec.ts
│   ├── stock-concurrency.spec.ts
│   ├── auth-session-concurrency.spec.ts      # concurrent refresh + logout
│   ├── password-recovery-concurrency.spec.ts # v2.6 (ADR-016)
│   └── ...
└── bruno/
    └── LaPrizza/
        ├── opencollection.yml
        ├── environments/
        │   ├── Local.yml
        │   └── Local.json
        ├── BCK01-Register_n_Login/
        ├── BCK02-Maintain_User_Information/
        ├── BCK03-Categories/
        ├── BCK04-Allergens/
        ├── BCK05-Products/
        ├── BCK06-PizzaSizes/
        ├── BCK07-Manage PizzaComponentType/
        ├── BCK08-Component/
        ├── BCK09-STOCK/
        ├── BCK10-PredefinedPizzas/
        ├── BCK11-Catalogue/
        ├── AA02-ExternalAuth/
        ├── AA05 - Authorization Enforcement/     # v2.6 (includes admin audit)
        ├── AI01-BOM/
        ├── AI02-PLANNING/                        # v2.6 (includes pendingDeliveries)
        ├── Password Recovery/                    # v2.6 (Clarification #32, ADR-016)
        ├── User Invitations/                     # v2.6 (Clarification #24, ADR-017)
        └── User Management/                      # v2.6 (Clarification #42)
```

### 28.4. Coverage Goals

- Domain layer: ≥ 80%
- Application layer: ≥ 70%
- Presentation layer: covered by integration tests
- Database layer: parity, migration, concurrency, session sweep, password-recovery concurrency

### 28.5. Validation Baseline

- **Sprint 1 baseline (ADR-008a):** 422 tests across 49 suites passed (2026-10-28, Node 24.21.0, PostgreSQL 16).
- **Bruno Sprint 1 collection:** 287 requests / 388 assertions passed.
- **v2.6 additions (pending):** password recovery (2 tests), user invitations (TBD), user management (TBD), admin audit log (TBD), pending-delivery planning (TBD).

---

## 29. API Testing Tooling (Bruno)

**Rationale (ADR-007):** Git-native plain-text `.bru` files; no cloud dependency; unlimited collaboration.

**Standard Test Pattern:**

```bru
meta {
  name: Create Pizza Size
  type: http
  seq: 2
}

post {
  url: {{baseUrl}}/api/v1/pizza-sizes
  body: json
  auth: bearer
}

auth:bearer {
  token: {{managerToken}}
}

body:json {
  {
    "name": "Medium"
  }
}

tests {
  test("HTTP status is 201 Created", function() {
    expect(res.getStatus()).to.equal(201);
  });

  test("Response contains name and active flag", function() {
    const data = res.getBody();
    expect(data).to.have.property("name");
    expect(data.name).to.equal("Medium");
    expect(data.active).to.be.true;
  });
}
```

**Token extraction:** `bru.setEnvVar('managerToken', res.getBody().accessToken);` on login response.

**CLI:** `npx @usebruno/cli run backend/tests/bruno/LaPrizza/` — used in CI.

**Sprint 2 + v2.6 additions:** new Bruno folders (`Password Recovery`, `User Invitations`, `User Management`, `AA05 - Authorization Enforcement` [extended with admin audit], `AI01-BOM`, `AI02-PLANNING` [extended with pendingDeliveries]) covering: password-recovery request + reset, resend-activation, refresh (happy + inactivity-exceeded), logout (per-device only), login block for `PENDING_REGISTRATION`, user management (admin-only), audit-log access (admin-only), planning with pendingDeliveries.

---

# PART VII — SPRINT STATUS & ROADMAP

## 30. Sprint 1 Status & Deliverable Verification

### 30.1. User Story Status (Per README)

| US | Title | Responsible | Status |
|---|---|---|---|
| **BCK01** | User & Auth | Eduardo Vasconcelos | Passed |
| **BCK02** | Customer Profile | Eduardo Vasconcelos | Passed |
| **BCK03** | Categories | Pedro Ribeiro | Passed |
| **BCK04** | Allergens | Pedro Ribeiro | Passed |
| **BCK05** | Products | Pedro Ribeiro | Passed |
| **BCK06** | Pizza Sizes | Pedro Ribeiro | Passed |
| **BCK07** | Component Types | Eduardo Vasconcelos | Passed |
| **BCK08** | Size Configurations | Afonso Mota | Passed |
| **BCK09** | Stock | Afonso Mota | Passed |
| **BCK10** | Predefined Pizzas | Gustavo Silva | Passed |
| **BCK11** | Catalogue | Gustavo Silva | Passed |
| **ARC01** | Domain Model | Group (collab) | Complete |
| **ARC02** | System Architecture | Group | Complete |
| **ARC03** | REST API | Group | Complete |
| **ARC04** | Persistence | Group | Complete |
| **ARC05** | Testing | Group | Complete |

### 30.2. Deliverable Verification (Updated per ADR-008a)

- **Test coverage:** 49 suites, 422 tests, 100% pass rate (including PostgreSQL DB suites).
- **Bruno collection:** 287 requests / 388 assertions passed.
- **PostgreSQL 16:** All migration tests pass, including baseline-adoption validation.
- **CI:** Build, lint, tests all green (on Node 24.21.0, 2026-10-28).

### 30.3. Submission Tag

- Tag: `sprint-1-submission` on repository
- Archive: `.zip` downloaded from tag page, submitted via Moodle

---

## 31. Sprint 2 Scope & Objectives

### 31.1. Five Main Objectives

1. Coherent SPA (Angular, ADR-009) with access to Sprint 1 business functionality + local/external auth (ADR-010) + RBAC + GDPR. **Includes inactivity-based sessions (#29, #34), password recovery (#32, ADR-016), resource-level authorization (#33), significant-action confirmation dialogues (#39), and ADMINISTRATOR role for user management and application audit logs (#42).**
2. Interactive 3D kitchen representation + automated pizza assembly line (ADR-011, ADR-014), integrated in SPA. **Material reuse allowed (#31).**
3. Prolog BOM + Requirements Planning integrated via REST endpoints (ADR-012, ADR-013), plus ANN study. **Indivisible lots + late proposals (#30); non-pizza products in forecasts (#36); pending deliveries + reference date + end-of-previous-day stock rule (#37); one supply arrangement per `(supplier, product)` (#44); IARTI-side recursive BOM scope pending (#41).**
4. Automated deployment, network access control, backup, business continuity. **Deployment may use external infrastructure (#40); shared folder accessed via web SPA (#43).**
5. GDPR: personal data handling, controller identification, breach response (Appendix D). **Consent-versioning questions redirected to LAPR5 TP lecturer (#45).**

### 31.2. New Dependencies to Add

| Component | Decision |
|---|---|
| Angular SPA (per ADR-009) | 22.x, zoneless, strict |
| Three.js scene | Version 0.168+, WebGL 2 |
| Prolog engine | SWI-Prolog + HTTP bridge |
| OIDC | `openid-client` (Google / Microsoft / Auth0 / Keycloak — ADR-010) |
| HTTPS (local) | mkcert |
| Nginx | stable-alpine |
| TypeORM (backend, already adopted in S1 per ADR-008a) | 0.3 + `@nestjs/typeorm` 10 |

### 31.3. Sprint 2 Baseline Extensions

- Frontend Dockerfile (multi-stage Angular build)
- Nginx reverse proxy + HTTPS termination
- `docker-compose.yml` extension with `frontend` service
- Prolog engine container (separate, ADR-012)
- `backend/src/infrastructure/persistence/entities/` extended with 8+ Sprint 2 entities (incl. `AuthSessionEntity`, `UnauthorizedAttemptEntity`, **`PasswordRecoveryEntity`, `RolesAssignmentEntity`, `StatusAssignmentEntity`**)
- `backend/src/infrastructure/persistence/repositories/` extended with 8+ Sprint 2 repositories (+3 v2.6)
- Bruno environment extension with frontend tokens and Sprint 2 collections (incl. `Password Recovery`, `User Invitations`, `User Management`)
- **New env vars:** `SESSION_INACTIVITY_MINUTES`, `JWT_EXPIRES_IN`, `PASSWORD_RECOVERY_TTL_HOURS` (Clarifications #29, #32, #34)
- **v2.6:** `AdminAuditController`, `PasswordRecoveryController`, `RolesAssignmentService`, `StatusAssignmentService`, `PasswordRecoveryService`, `SmtpRecoveryMailer`, `InMemoryExchangeCodeStore`

### 31.4. Implementation-status rule

The Sprint 2 scope above is the complete target structure, not a claim that every listed use case is already implemented in the repository. Sections describing future use cases may therefore name planned entities, views, controllers, tests, or infrastructure that are intentionally absent from the current baseline. For the current implementation state, treat the repository tree and source files as authoritative: AI01/AI02 BOM and planning execution (including pending deliveries and end-of-previous-day availability), administrator-only application audit-log consultation, password recovery, role/status assignment, kitchen configuration, and the existing Bruno collections are present; WEB04 confirmation/retry infrastructure, SYS01 external deployment automation, SYS04 shared-folder SPA access, and IARTI recursive aggregate scope remain roadmap items unless a concrete source file is listed in §40.

---

## 32. Engineering Roadmap & Milestones

### 32.1. Remaining Effort Estimate (~36h for Sprint 2+)

| Milestone | Scope | Effort |
|---|---|---|
| M1 | BOM + Requirements Planning (Prolog, ADR-012) — indivisible lots + late proposals (#30) + pending deliveries + reference date + end-of-previous-day stock rule (#37) + one offer per (supplier, product) (#44) | 10h |
| M2 | Angular SPA skeleton + auth (local + OIDC + refresh + password recovery) + navigation + admin-only panels + confirmation dialogues | 8h |
| M3 | Three.js Kitchen Visualization (ADR-014) — material reuse (#31) | 6h |
| M4 | Bruno suites + CI integration (Sprint 2 collections + new Password Recovery/User Invitations/User Management) | 6h |
| M5 | ASIST deployment + observability + shared folder via SPA (#43) | 6h |

---

## 33. Frontend SPA (Angular)

### 33.1. Setup (Per `HowTo_Angular-ThreeJS.pdf`, ADR-009)

```bash
nvm install 24 && nvm use 24
npm install -g @angular/cli@latest
ng new laprizza-frontend --routing --style=scss --standalone --strict --zoneless --ssr=false --package-manager=npm --file-name-style-guide=2025 --skip-git --skip-tests --defaults
cd laprizza-frontend
npm install --save three
npm install --save @types/three
```

### 33.2. Three.js Component Skeleton

```typescript
@Component({ selector: 'app-cube', standalone: true, templateUrl: './cube.html', styleUrl: './cube.scss' })
export class Cube implements AfterViewInit {
  @ViewChild('myCanvas') private canvasRef!: ElementRef;

  private renderer!: THREE.WebGLRenderer;
  private scene: THREE.Scene = new THREE.Scene();
  private camera!: THREE.PerspectiveCamera;
  private geometry = new THREE.BoxGeometry(1, 1, 1);
  private material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
  private cube: THREE.Mesh = new THREE.Mesh(this.geometry, this.material);

  ngAfterViewInit(): void {
    this.createScene();
    this.render();
  }

  private createScene(): void {
    const canvas = this.canvasRef.nativeElement;
    const aspectRatio = canvas.clientWidth / canvas.clientHeight;
    this.camera = new THREE.PerspectiveCamera(30, aspectRatio, 1, 1000);
    this.camera.position.z = 10;
    this.renderer = new THREE.WebGLRenderer({ canvas });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.scene.add(this.cube);
  }

  private render(): void {
    requestAnimationFrame(() => this.render());
    this.cube.rotation.x += 0.01;
    this.cube.rotation.y += 0.02;
    this.renderer.render(this.scene, this.camera);
  }
}
```

### 33.3. Angular Architectural Notes (per ADR-009)

- **Standalone components** organized by business capability (Catalogue, Products, Configurations, Stock, Users, Kitchen, AI Planning). **v2.6:** `Admin` feature module (user management + audit log) shown only when `ADMINISTRATOR` role is present.
- **Router** with feature-level lazy loading; role-aware route guards (`ADMINISTRATOR` vs `MANAGER` vs `EMPLOYEE` vs `CUSTOMER`). Resource-level authorization enforced by `CustomerAccessPolicy` on the backend; the frontend hides unauthorised actions but never relies on this alone (Clarification #33).
- **Typed reactive forms** with conditional validators (product type, component type, **password policy per #32**).
- **HttpClient + interceptors** for JWT attachment and common auth error handling (401 → redirect to login; **401 with `reason=session_expired` → attempt refresh**; 403 → role-aware message; **timeout configurable via `API_TIMEOUT_MS` per #39**).
- **3D canvas encapsulated** in a dedicated component; animation loop does not trigger Angular change detection on every frame.
- **OIDC flow initiation:** `<a href="/api/v1/auth/external/login">Login with Google</a>` (backend redirects to IdP; SPA receives JWT via callback redirect).
- **Session management UI:** refresh-on-401 interceptor (per #34); logout button revokes **only current session** (per #29); password-recovery link exposed on login page (per #32).
- **Confirmation dialogues** on significant actions (delete, deactivate user, role change, cancel order) per #39. Shared `ConfirmDialog` component in `shared_components/ui/modal/`.
- **i18n:** language switcher persisted via localStorage or profile; UI strings translated; business data not (except allergen names) per #22. Language change does not reset form state.

### 33.4. Package.json Target

- Angular 22.x, TypeScript 5.5+
- Node.js 24.15 or newer within 24.x
- Three.js 0.168+
- Playwright (E2E tests: password-recovery, role-access, i18n, authorization, backoffice, frontoffice, storefront)

---

## 34. 3D Visualization (SGRAI / Three.js)

> **Deliverables implementing this section:**
> - `docs/sg/kitchen-schema.json` — JSON Schema (draft 2020-12) validated by `KitchenConfigValidationService` at save-time. Enforces `modelUrl` pattern `^/assets/3d/models/.+\.glb$` (ADR-014), `additionalProperties: false`, structured `$defs` for `dimensions`, `equipmentItem`, `lights` (5 types), `animationTrigger`. **Material reuse across objects permitted per Clarification #31** (no `uniqueMaterial` constraint).
> - `docs/sg/kitchen-layout-example.json` — the "Standard Layout" reference configuration (6 equipment items + 4 lights + 3 animation triggers), validated against the schema, **reusing a shared `Material` library** across visually similar surfaces (per Clarification #31).
> - `docs/sg/3d-assets-guide.md` — the Blender → GLB → Three.js pipeline guide: naming conventions, export options, performance budget (**team-defined and justified per Clarification #31**; the previously suggested `≤ 5 MB/GLB, ≤ 40 draw calls, ≤ 250k triangles, ≤ 1 shadow-casting light` are guidance, not mandate), PBR map set, animation readiness, credits requirement, troubleshooting table, **material-reuse demonstration section**.

### 34.1. Mandatory Scene (II.3.3.2)

**Kitchen and Food Preparation Visualization:**

- Large counter with receiving platform (left)
- Traditional wood-fired oven (right)
- Conveyor belt connecting them
- Articulated robotic arms depositing ingredients
- Animated in Sprint 3 (dispenser, conveyor, arms)

### 34.2. Optional Scene (II.3.3.1)

**Build Your Pizza:**

- Customer selects size, components
- Real-time 3D feedback
- Integrates with ordering (Sprint 3)

### 34.3. Technical Requirements

**VIS02 — Kitchen Layout:**
- Dimensions + equipment positions/orientations/scales from active `KitchenConfiguration` JSON (ADR-011)
- GLB models or procedural assets
- URLs to imported models from JSON

**VIS03 — Assembly Line:**
- Counter, receiving platform, conveyor, oven, robotic arms
- GLB (preferred) or procedural
- Ready for animation in Sprint 3 (GLB animation tracks, ADR-014)

**VIS04 — Textures (Clarification #31):**
- **Material reuse across objects with similar surfaces is permitted** (e.g., two stainless-steel worktops share the same material)
- Color map required, plus roughness/bump/normal
- Performance-conscious (PBR materials, texture compression)
- **Demonstrate and justify optimisation techniques** (reuse, async loading, etc.)

**VIS05 — Lighting:**
- Ambient + spotlight minimum
- Shadows without performance degradation
- Consistent across zoom/angles

**VIS06 — Interactive Light Controls:**
- GUI (lil-gui recommended)
- One folder per light source
- Checkbox for on/off
- Color picker + intensity slider
- Spotlights: cutoff + penumbra sliders
- Controls disabled when light off

**VIS07 — Perspective Camera:**
- Camera target = center of kitchen floor
- Left-drag pan
- Right-drag orbit
- Mouse wheel dolly
- Responsive/smooth

### 34.4. Three.js Best Practices (Per ADR-014, Clarification #31)

- **GLB preferred** (binary GLTF 2.0) over OBJ — encapsulated geometry, materials, textures, animations.
- **PBR materials** with maps (base color, roughness, normal, metalness).
- **Material reuse across objects with similar surfaces is permitted and recommended** (Clarification #31). A shared `Material` library is expected.
- **Poly Haven** for textures (CC0, free use).
- **Credit authors** for CC content.
- **Use `.glb`** for self-contained models.
- **Animation-ready:** GLTF animation tracks for robotic arms and conveyor (Sprint 3).
- **Demonstrate optimisation techniques:** `THREE.Cache.enabled = true`, `InstancedMesh` for repeated objects, `GLTFLoader` async, lazy-loaded 3D feature module in Angular. Document in `docs/sg/3d-assets-guide.md`.

### 34.5. External Asset Sources

- `poly.pizza` — low-poly objects only
- `threejsassets.com` — Three.js ready
- `opensource3dassets.com`
- `sketchfab.com` — filter "Downloadable"
- `poly.cam`
- `polyhaven.com` — textures (CC0)

---

## 35. Prolog AI Scheduling (IART)

### 35.1. Scope (AI01, AI02, AI06)

**AI01 — Bill of Materials:**
- Input: ordered pizzas (or simulated orders)
- Compute: raw material and aggregate quantities required
- Use available stock first; expand remaining demand into ingredients
- Report: required, available, remaining, replenishment need per item
- No stored stock change
- **Per Clarification #41:** only pizzas have BOM in the LaPrizza domain (permanent). Recursive/aggregate BOM requirements belong to IARTI-side scope; team to consult IARTI RUC.

**AI02 — Requirements Planning:**
- Input: daily sellable-product consumption forecasts (**pizzas + non-pizza products per Clarification #36**)
- Compute: daily material requirements from BOM (**for pizzas**) or `stockUnitsPerSale` (**for non-pizza**)
- Select suppliers from confirmed scenario
- Report: daily plan with items, suppliers, order dates, delivery dates, unmet needs
- No purchase orders created
- **Indivisible lots (Clarification #30):** `quantity` is a multiple of `SupplierOffer.stockUnitQuantity`; surplus goes to hypothetical stock.
- **Late proposals (Clarification #30, #37):** each proposal carries `meetsRequiredDate` and `lateByDays`; a late proposal does not remove the corresponding `UnmetNeed`; no maximum delay.
- **`stockUnitsPerSale` required** for `isStockControlled ∧ isSellable` products; missing → hard error (Clarification #28 §2, reinforced by #36).
- **Per Clarification #37:** pending deliveries as input; `referenceDate` defaults to execution date; no proposal date before `referenceDate`; stock for day N available by end of day N−1.
- **Per Clarification #44:** one supply arrangement per `(supplier, product)`; multiple suppliers per day allowed.
- **Per Clarification #37:** lowest-total-cost selection; not all combinations.

**AI03 — Artificial Neural Networks Study:**
- Not required to train/deploy
- Discuss applications (demand forecasting, stock decision support)
- Address data quality, evaluation, limitations
- Disclosure of generative AI usage if used

**AI04 — IARTI Technical Report:**
- Document BOM work, Requirements Planning, ANN study
- Include service endpoints, back-end data sources, Prolog KB construction
- Examples: valid requests, invalid inputs, missing data, unavailable service
- Distinguish calculations, stock changes, and purchase order confirmation

**AI05 — AI Service Access:**
- REST endpoints for BOM and Requirements Planning
- JSON requests/responses with consistent identifiers
- RBAC: authorized roles only (MANAGER)
- Validate input, distinguish success/invalid/missing/unavailable (502/503)
- Calculation requests do not change stock or register purchase orders

**AI06 — Back-End Data + Prolog KB:**
- Retrieve pizza BOM definitions from back-end
- Products, aggregates, quantities in abstract stock units
- Aggregate composition + production-or-purchase classification
- Other inputs: stock snapshots, forecasts, supplier offers, **pendingDeliveries (Clarification #37)**
- Construct Prolog KB with consistent identifiers, relationships, stock units
- Refresh policy documented (per-request KB construction, ADR-012)

### 35.2. Prolog BOM Implementation (Reference)

**Reference:** `prolog/bom.pl`, `prolog/planning.pl`, `prolog/server.pl`.

```prolog
:- dynamic stock/2.

part(lock).
part(handle).
part(metal_latch).
part(steel_bar).
part(lower_frame).
part(upper_frame).

setp(bottom, [lower_frame, lock, lock, handle]).
setp(lid, [upper_frame, metal_latch, metal_latch]).
setp(briefcase, [bottom, lid, steel_bar]).

stock(lock, 45).
stock(handle, 25).
stock(metal_latch, 100).
stock(steel_bar, 100).
stock(lower_frame, 50).
stock(upper_frame, 30).
stock(lid, 30).
stock(bottom, 20).
stock(briefcase, 10).

manage_stock(Q, P, LWS, LOS) :-
    attend_request(Q, P, LWS0, LOS0),
    join_equals(LWS0, LWS),
    join_equals(LOS0, LOS),
    !.

% ... (full predicate tree in source files)
```

### 35.3. Pizza Adaptation Guidelines

Adapt the briefcase BOM to pizza:
- Components = basic food elements (flour, water, ham, etc.)
- Sets of parts (dough = yeast + water + flour + oil + salt + sugar)
- At least 3 sizes (Small, Medium, Large)
- 2 different bases (pan, crust)
- 20 ingredients (cheeses, ham, pepperoni, shrimp, chicken, mushrooms, pineapple, etc.)
- 8 pizza types (Margherita, Quattro Formaggi, Tropical, Vegetarian, etc.)

### 35.4. Key Clarifications (Clarifications #28, #30, #36, #37, #41, #44)

- Only pizzas have BOM; non-pizza sellable products use `stockUnitsPerSale` (**Clarifications #28, #36**). **Permanent for LaPrizza domain (Clarification #41).**
- Aggregate composition optional (not required in Sprint 2)
- Pizza price = sum of component prices
- No stock deduction from plans
- New forecasts reject inactive references
- **First execution rejects if a reference became inactive** (even if active at forecast creation)
- Historical replays use original snapshot dataset, marked `isReplay=true`
- Lead times = whole days (integer ≥ 0). **Lead time can be 0 (same-day).** (Clarification #37)
- Supply limits per-offer, per-day (not shared across supplier's products)
- Missing limits = unlimited
- **`stockUnitQuantity` is an indivisible lot; plan rounds requirement up to a multiple; surplus stays in hypothetical stock** (Clarification #30). **One supply arrangement per `(supplier, product)`** (Clarification #44).
- **Late proposals carry `meetsRequiredDate=false` + `lateByDays`; a late proposal does not remove the original unmet need** (Clarification #30). **No maximum delay** (Clarification #37).
- Explicit `stockUnitsPerSale` per product; missing → hard error, not silent default
- **Pending deliveries as input; `referenceDate` defaults to execution; no proposal before `referenceDate`; stock for day N available by end of N−1** (Clarification #37).
- **Lowest-total-cost selection; not all combinations** (Clarification #37).
- **One forecast per planning request; days without entries = 0** (Clarification #37).
- **Multiple suppliers may be proposed on the same day** (Clarification #37).

---

# PART VIII — INFRASTRUCTURE & OPERATIONS

## 36. Docker Compose & Deployment

**File:** `docker-compose.yml`.

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: laprizza_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: laprizza_user
      POSTGRES_PASSWORD: laprizza_password
      POSTGRES_DB: laprizza_db
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U laprizza_user -d laprizza_db"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - laprizza-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: laprizza_backend
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      PORT: 3000
      NODE_ENV: production
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: laprizza_user
      DB_PASSWORD: laprizza_password
      DB_NAME: laprizza_db
      SEED_DATABASE: ${SEED_DATABASE:-true}
      JWT_SECRET: ${JWT_SECRET:-laprizza-default-secret-key-change-in-production-2026}
      JWT_EXPIRES_IN: ${JWT_EXPIRES_IN:-15m}                   # Clarification #34
      SESSION_INACTIVITY_MINUTES: ${SESSION_INACTIVITY_MINUTES:-30}  # Clarification #29/#34
      INVITATION_TTL_HOURS: ${INVITATION_TTL_HOURS:-48}        # Clarification #24, ADR-017
      PASSWORD_RECOVERY_TTL_HOURS: ${PASSWORD_RECOVERY_TTL_HOURS:-1} # Clarification #32, ADR-016
      API_TIMEOUT_MS: ${API_TIMEOUT_MS:-30000}                 # Clarification #39
      PROLOG_URL: ${PROLOG_URL:-http://prolog:8080/api/v1/plan}
      OIDC_ISSUER_URL: ${OIDC_ISSUER_URL}
      OIDC_CLIENT_ID: ${OIDC_CLIENT_ID}
      OIDC_CLIENT_SECRET: ${OIDC_CLIENT_SECRET}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASSWORD: ${SMTP_PASSWORD}
    ports:
      - '3000:3000'
    healthcheck:
      test:
        - CMD
        - node
        - -e
        - "fetch('http://127.0.0.1:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
      interval: 10s
      timeout: 5s
      retries: 10
      start_period: 20s
    networks:
      - laprizza-network

  prolog:
    build:
      context: ./prolog
      dockerfile: Dockerfile
    container_name: laprizza_prolog
    restart: unless-stopped
    ports:
      - '8080:8080'
    networks:
      - laprizza-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    restart: unless-stopped
    depends_on:
      backend:
        condition: service_healthy
    ports:
      - "127.0.0.1:80:80"
      - "127.0.0.1:443:443"
    volumes:
      - ./certs:/etc/nginx/certs:ro
    networks:
      - laprizza-network

volumes:
  postgres_data:
    driver: local

networks:
  laprizza-network:
    driver: bridge
```

### 36.1. Backend Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN apk add --no-cache python3 make g++ && npm ci --only=production && apk del python3 make g++
COPY --from=builder /app/dist ./dist
COPY start-backend.sh ./start-backend.sh
EXPOSE 3000
CMD ["sh", "./start-backend.sh"]
```

### 36.2. Frontend Dockerfile (Sprint 2)

The frontend uses a **single `nginx.conf`** file at `frontend/nginx.conf` (not `frontend/nginx/default.conf`).

```dockerfile
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

FROM nginx:stable-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/laprizza-frontend/browser/ /usr/share/nginx/html/
EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
```

### 36.3. Prolog Dockerfile (Sprint 2)

```dockerfile
FROM swipl:latest
WORKDIR /app
COPY . .
EXPOSE 8080
CMD ["swipl", "server.pl", "--port=8080"]
```

### 36.4. Compose Startup Notes (per ADR-008a)

- Backend's `start-backend.sh` runs `migration:run:prod`, conditionally `seed:prod` (when `SEED_DATABASE=true`), then `exec node dist/index.js`.
- Existing historical schemas must first be explicitly adopted with `migration:baseline:prod`.
- Existing volumes are retained by normal startup; `make fclean` is required for a volume reset.
- `SEED_DATABASE=false make up` skips development fixtures.

### 36.5. Configuration Variables (env vars, not schema)

Per Clarifications #29, #32, #34, #39, the following runtime configuration must be documented in `.env.example`:

| Variable | Purpose | Default suggestion |
|---|---|---|
| `SESSION_INACTIVITY_MINUTES` | Inactivity timeout for `AuthSession`; validity requires `now − last_activity_at < this`. | 30 (team-defined per ASIST) |
| `JWT_EXPIRES_IN` | Access-token lifetime. | `15m` (team-defined per ASIST) |
| `INVITATION_TTL_HOURS` | TTL for account-activation invitations (ADR-017). | 48 (per Clarification #24) |
| `PASSWORD_RECOVERY_TTL_HOURS` | TTL for password-reset links (ADR-016). | 1 (team-defined) |
| `API_TIMEOUT_MS` | Angular HTTP client timeout (Clarification #39). | 30000 |
| `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` | OIDC client config (ADR-010). | — |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` | SMTP configuration (invitation + recovery emails). | — |

These are **configuration**, not schema — no migration required. The application must read them at startup and reject misconfiguration.

---

## 37. CI Pipeline (GitHub Actions)

**File:** `.github/workflows/ci.yml` (currently disabled with `if: false`, manual trigger only — will be enabled for Sprint 2).

```yaml
name: Continuous Integration (CI) - LaPrizza
on:
  workflow_dispatch:
jobs:
  backend-test:
    name: Build, Lint & Automated Tests
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
      - run: npm run build
      - run: npm test -- --coverage
```

### 37.1. When Enabled

- Triggers on push/PR to `main` or `develop`
- Full pipeline: `npm ci` → `tsc --noEmit` → ESLint → `npm run build` → `npm test -- --coverage` → `npm audit`
- Sets `TEST_DATABASE_URL` to a dedicated PostgreSQL 16 test DB (including DB suites)
- Blocks PR merge on failure

### 37.2. Deployment Workflow (v2.6, Clarification #40)

Per Clarification #40, deployment is automated via GitHub Actions. Options include:
- **Option A (recommended):** SSH from public GitHub Actions runners to a cloud VM (Azure, AWS, etc.). Credentials stored in GitHub Actions Secrets (`SSH_PRIVATE_KEY`, `SSH_HOST`, `SSH_USER`).
- **Option B:** Self-hosted runner on the target VM (only if the org admin enables it — the org disables it by default).
- **Option C:** Deployment to a cloud PaaS (App Service, ECS, etc.).

The choice must be documented in `docs/asist/sys-deployment.md` and justified. `SYS01` requires: automated deployment via GitHub Actions, validation after deployment, archived logs, recoverable prior version, secrets managed outside the repo.

---

## 38. Makefile & Operational Commands

**File:** `Makefile`.

| Command | Purpose |
|---|---|
| `make all` | Build and start all in foreground |
| `make up [SERVICE=...]` | Build and start background (migrations + seed run in backend container) |
| `make dev [DEV_PORT=4200]` | Backend + Angular HTTPS hot reload |
| `make build [SERVICE=...]` | Build images without starting |
| `make stop [SERVICE=...]` | Stop containers, keep data |
| `make down` | Remove containers/networks, keep data |
| `make restart [SERVICE=...]` | Restart containers |
| `make logs [SERVICE=...]` | Follow logs (last 100 lines) |
| `make ps` | Show service status |
| `make db` | Open PostgreSQL prompt |
| `make config` | Validate Compose config |
| `make clean` | Remove containers + images, keep data |
| `make fclean` | Full reset (delete volumes + images) |
| `make re` | Full rebuild |
| `make help` | List commands |

### 38.1. Critical Note

`make down` **preserves** database volumes. `make fclean` **deletes** them. Only use `fclean` when a fresh start is intended. `make up SERVICE=postgres` starts only the database (useful for local `npm start`).

---

## 39. Angular + Docker + Nginx + HTTPS Setup

**File:** `angular-docker-https-setup.md`.

### 39.1. Prerequisites

- Node.js 24.x or newer (Angular 22 requirement)
- Docker Desktop with WSL 2
- mkcert for local CA

### 39.2. Steps

1. **Generate Angular workspace**
   ```bash
   npx --yes --package @angular/cli@22 ng new laprizza-frontend --directory frontend --routing --style=scss --standalone --strict --zoneless --ssr=false --package-manager=npm --file-name-style-guide=2025 --skip-git --skip-tests --defaults
   ```

2. **Frontend Dockerfile** (see §36.2)

3. **Nginx config** — reverse proxy `/api/` → `backend:3000/` (trailing slash removes `/api` prefix). See §39.3 for the file location and contents.

4. **Generate local certificates**
   ```bash
   mkdir -p certs
   mkcert -install
   mkcert -cert-file certs/site.crt -key-file certs/site.key localhost 127.0.0.1 ::1
   chmod 600 certs/site.key
   ```

5. **Configure `.env`** with `JWT_SECRET` (via `openssl rand -hex 32`), `JWT_EXPIRES_IN`, `SESSION_INACTIVITY_MINUTES`, `INVITATION_TTL_HOURS`, `PASSWORD_RECOVERY_TTL_HOURS`, `OIDC_*` credentials, SMTP credentials, `API_TIMEOUT_MS`

6. **Update `docker-compose.yml`** (see §36)

7. **Angular HTTP client** — `HealthApi` service with `/api/health` (relative URL)

8. **Build & start**
   ```bash
   docker compose -p laprizza config --quiet
   docker compose -p laprizza up -d --build
   docker compose -p laprizza ps
   ```

9. **Verify** — `https://localhost/status` should display API status.

10. **HTTPS hot reload** — `ng serve --ssl --ssl-cert ../certs/site.crt --ssl-key ../certs/site.key --proxy-config proxy.conf.json`

### 39.3. Nginx Configuration

**File:** `frontend/nginx.conf` (single file; copied into the image by the frontend Dockerfile as `/etc/nginx/conf.d/default.conf`). Nginx serves the compiled Angular app + reverse-proxies `/api/` → `backend:3000/`.

```nginx
server {
    listen 80;
    server_name localhost;
    return 308 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name localhost;

    ssl_certificate /etc/nginx/certs/site.crt;
    ssl_certificate_key /etc/nginx/certs/site.key;
    ssl_protocols TLSv1.2 TLSv1.3;

    root /usr/share/nginx/html;
    index index.html;

    location ^~ /api/ {
        proxy_pass http://backend:3000/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 39.4. Production HTTPS (Certbot)

```bash
sudo certbot certonly --webroot --webroot-path /path/to/acme -d laprizza.example.com
```

Renewal via `/etc/letsencrypt/renewal-hooks/deploy/reload-laprizza-nginx`:
```sh
#!/bin/sh
docker compose -p laprizza exec -T frontend nginx -s reload
```

---

# PART IX — REFERENCE

## 40. Repository File Map

```
LEI-SEM5-PI-2026-27-3DJ-05/
├── .github/
│   └── workflows/
│       └── ci.yml                          # CI pipeline (currently disabled)
├── backend/
│   ├── Dockerfile                          # Multi-stage Node.js 20 Alpine
│   ├── package.json
│   ├── start-backend.sh
│   ├── src/
│   │   ├── application/                    # Use cases
│   │   │   ├── allergen/
│   │   │   ├── auth/                       # + external/, activation/, session/, password-recovery/
│   │   │   ├── catalogue/
│   │   │   ├── customer/
│   │   │   ├── kitchen/                    # Sprint 2 (ADR-011)
│   │   │   ├── planning/                   # Sprint 2 (ADR-012, ADR-013; v2.6 pendingDeliveries)
│   │   │   ├── pizza/
│   │   │   ├── product/
│   │   │   ├── stock/
│   │   │   ├── taxonomy/
│   │   │   └── user/                       # + RolesAssignmentService, StatusAssignmentService (v2.6)
│   │   ├── domain/                         # Aggregates, VOs, domain services
│   │   │   ├── allergen/
│   │   │   ├── catalog/
│   │   │   ├── common/                     # Shared Kernel
│   │   │   ├── customer/
│   │   │   ├── kitchen/                    # Sprint 2
│   │   │   ├── ordering/                   # Modelled (Sprint 3)
│   │   │   ├── pizza/
│   │   │   ├── planning/                   # Sprint 2
│   │   │   ├── product/
│   │   │   ├── stock/
│   │   │   ├── taxonomy/
│   │   │   └── user/                       # + AuthSession, PasswordPolicy, PasswordRecoveryToken, RolesAssignment, StatusAssignment
│   │   ├── infrastructure/
│   │   │   ├── persistence/
│   │   │   │   ├── database-options.ts
│   │   │   │   ├── entities/               # TypeORM entities and view entities; directory is authoritative
│   │   │   │   ├── mappers/                # + PasswordRecoveryMap (v2.6)
│   │   │   │   ├── migrations/             # Historical SQL (001–022)
│   │   │   │   ├── orm-migrations/         # TypeORM migrations
│   │   │   │   └── repositories/           # 22 Postgres*Repository.ts (+3 v2.6)
│   │   │   ├── security/                   # Argon2Hasher, JwtTokenService, SmtpInvitationMailer, SmtpRecoveryMailer
│   │   │   ├── oidc/                       # OidcClient (ADR-010)
│   │   │   ├── prolog/                     # PrologHttpClient (ADR-012)
│   │   │   └── email/                      # Smtp adapters
│   │   └── presentation/
│   │       ├── http/
│   │   │   ├── controllers/            # Current HTTP controllers, including AdminAuditController
│   │       │   └── middlewares/
│   │       ├── app.module.ts
│   │       └── global_exception.filter.ts
│   └── tests/
│       ├── bruno/
│       │   └── LaPrizza/
│       │       ├── opencollection.yml
│       │       ├── environments/
│       │       │   ├── Local.yml
│       │       │   └── Local.json
│       │       ├── BCK01-Register_n_Login/
│       │       ├── BCK02-Maintain_User_Information/
│       │       ├── BCK03-Categories/
│       │       ├── BCK04-Allergens/
│       │       ├── BCK05-Products/
│       │       ├── BCK06-PizzaSizes/
│       │       ├── BCK07-Manage PizzaComponentType/
│       │       ├── BCK08-Component/
│       │       ├── BCK09-STOCK/
│       │       ├── BCK10-PredefinedPizzas/
│       │       ├── BCK11-Catalogue/
│       │       ├── AA02-ExternalAuth/
│       │       ├── AA05 - Authorization Enforcement/     # v2.6
│       │       ├── AI01-BOM/                            # v2.6
│       │       ├── AI02-PLANNING/                       # v2.6
│       │       ├── Password Recovery/                   # v2.6
│       │       ├── User Invitations/                    # v2.6
│       │       └── User Management/                     # v2.6
│       ├── database/
│       ├── helpers/
│       ├── integration/
│       │   └── *.controller.spec.ts
│       └── unit/
│           ├── application/
│           ├── domain/
│           ├── infrastructure/
│           └── presentation/
├── prolog/                                 # Sprint 2 — Prolog engine container
│   ├── Dockerfile
│   ├── server.pl
│   ├── bom.pl
│   └── planning.pl
├── docs/
│   ├── api/
│   │   └── openapi.yaml                    # Authoritative API contract (v2.2.0)
│   ├── architectural/
│   │   ├── component-diagram/
│   │   │   ├── component-diagram-l1.puml
│   │   │   ├── component-diagram-l2.puml
│   │   │   ├── component-diagram-l3.puml
│   │   │   ├── component-diagram-l4.puml
│   │   │   ├── cd-l1.svg
│   │   │   ├── cd-l2.svg
│   │   │   ├── cd-l3.svg
│   │   │   └── cd-l4.svg
│   │   ├── Architecture_summary.md
│   │   ├── component-diagram-sketch-l4.md
│   │   ├── component-diagram-sketch.md
│   │   ├── use_case_diagram.md
│   │   ├── use_case_diagram_sprint1.md
│   │   └── use_case_diagram_sprint2.md
│   ├── asist/
│   │   ├── sys-backup-strategy.md
│   │   ├── sys-deployment.md               # v2.6: external infra option (Clarification #40)
│   │   ├── sys-mbco.md
│   │   ├── sys-network-config.md
│   │   ├── sys-risk-assessment.md
│   │   └── sys-shared-folder.md            # v2.6: SPA-access acceptable (Clarification #43)
│   ├── contents/
│   │   ├── content-knowledge-base.md
│   │   └── laprizza-knowledge-base.md      # v2.6 (this document)
│   ├── ai/
│   │   ├── ann-study.md                    # AI03 assessment; no runtime ANN
│   │   └── datasets/
│   │       ├── demand-synthetic.csv
│   │       └── generate.py
│   ├── domain/
│   │   ├── domain-model/
│   │   │   ├── domain-model.puml
│   │   │   └── dm.svg
│   │   ├── client-questions.md             # v2.6: 46 clarifications
│   │   └── domain-model.sketch.md
│   ├── resources/
│   │   ├── pizza-BOM.pl
│   │   └── procurement_plan.pl
│   ├── sad/
│   │   ├── 03-rationale/
│   │   │   ├── ADR-0001-architectural-style.md
│   │   │   ├── ADR-002-stack-choosing.md
│   │   │   ├── ADR-002.2-stack-choosing.md
│   │   │   ├── ADR-003-persistence.md
│   │   │   ├── ADR-004-auth.md
│   │   │   ├── ADR-004.2-auth.md           # v2.6
│   │   │   ├── ADR-005-rest-api.md
│   │   │   ├── ADR-006-automated-testing.md
│   │   │   ├── ADR-007-api-testing-tooling.md
│   │   │   ├── ADR-008-orm-adoption.md
│   │   │   ├── ADR-008-stock-concurrency-control.md
│   │   │   ├── ADR-009-frontend-framework.md
│   │   │   ├── ADR-010-external-idp.md
│   │   │   ├── ADR-011-kitchen-configuration.md
│   │   │   ├── ADR-012-ai-planning-engine.md
│   │   │   ├── ADR-013-planning-results.md
│   │   │   ├── ADR-014-3d-asset-pipeline.md
│   │   │   ├── ADR-015-unauthorized-access-logging.md
│   │   │   ├── ADR-016-password-recovery.md          # v2.6
│   │   │   ├── ADR-017-user-invitations.md           # v2.6
│   │   │   └── README.md
│   │   ├── 01-problem-statement.md
│   │   ├── 02-context.md
│   │   ├── 04-principles-and-guidelines.md
│   │   ├── 05-key-scenarios.md
│   │   ├── 06-api-design-specification.md
│   │   ├── 07-relational-mapping-and-persistence-strategy.md
│   │   └── 08-database-structure.md
│   ├── scrum/
│   ├── sg/
│   │   ├── 3d-assets-guide.md
│   │   ├── kitchen-layout-example.json
│   │   └── kitchen-schema.json
│   ├── user-stories/
│   │   ├── ARC01/requirements.md
│   │   ├── ARC02/requirements.md
│   │   ├── ARC03/requirements.md
│   │   ├── BCK01/requirements.md
│   │   ├── BCK02/requirements.md
│   │   ├── BCK03/requirements.md
│   │   ├── BCK04/requirements.md
│   │   ├── BCK05/requirements.md
│   │   ├── BCK06/requirements.md
│   │   ├── BCK07/requirements.md
│   │   ├── BCK08/requirements.md
│   │   ├── BCK09/requirements.md
│   │   ├── BCK10/requirements.md
│   │   ├── BCK11/requirements.md
│   │   ├── ENG01/requirements.md
│   │   ├── ENG02/requirements.md
│   │   └── ENG03/requirements.md
│   ├── angular-docker-https-setup.md
│   ├── gdpr-policy.md                      # v2.0 (Clarification #45 pending)
│   └── glossary.md
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── proxy.conf.json
│   ├── angular.json
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.spec.json
│   ├── .editorconfig
│   ├── .gitignore
│   ├── .prettierrc
│   ├── README.md
│   ├── e2e/                                # Playwright specs (v2.6)
│   │   ├── authorization.spec.ts
│   │   ├── backoffice/backoffice.spec.ts
│   │   ├── frontoffice/storefront.spec.ts
│   │   ├── i18n.spec.ts
│   │   ├── password-recovery.spec.ts
│   │   └── role-access.spec.ts
│   └── src/
│       ├── index.html
│       ├── main.ts
│       ├── styles.scss
│       └── app/
│           ├── core/api/
│           ├── features/
│           │   └── status/
│           ├── backoffice/                  # v2.6 (pages, shared_components)
│           ├── frontoffice/                 # v2.6 (pages, shared_components)
│           ├── shared_components/           # v2.6
│           ├── app.config.ts
│           ├── app.routes.ts
│           ├── app.ts
│           ├── app.html
│           └── app.scss
├── certs/                                  # Local TLS (git-ignored)
├── acme/                                   # Let's Encrypt webroot (git-ignored)
├── docker-compose.yml
├── Makefile
├── README.md
└── docs/
    └── angular-docker-https-setup.md
```

**Expanded `backend/src/infrastructure/persistence/migrations/` tree:**

```
backend/src/infrastructure/persistence/migrations/
├── 001_create_users_table.sql
├── 002_create_customers_and_allergens_tables.sql
├── 003_create_catalogues_and_products_tables.sql
├── 004_create_configurations_and_recipes_tables.sql
├── 005_create_stock_tables.sql
├── 006_create_views.sql
├── 007_seed_initial_data.sql
├── 008_create_orders_and_snapshots.sql
├── 009_create_kitchen_tables.sql
├── 010_create_indexes.sql
├── 011_aggregate_multiplicity.sql
├── 012_predefined_pizza_multiple_sizes.sql
├── 013_user_contact_details.sql
├── 014_sprint2_additions.sql               # Sprint 2: AA + WEB06 + WEB07 + AI01/AI02/AI06
├── 015_create_auth_sessions_table.sql      # Sprint 2: AA04 (session management)
├── 016_create_unauthorized_attempts_table.sql  # Sprint 2: AA05 (audit, ADR-015)
├── 017_add_auth_session_last_activity.sql  # Sprint 2: Clarifications #29, #34 (inactivity)
├── 018_create_password_recovery_table.sql  # v2.6: ADR-016
├── 019_create_roles_assignment_table.sql     # v2.6: normalized persistence
├── 020_create_status_assignment_table.sql    # v2.6: normalized persistence
├── 021_seed_ai02_data.sql                  # v2.6: AI02 demo data
└── 022_predefined_pizza_no_stock.sql       # Clarifications #35, #38
```

---

## 41. Version History & Document Evolution

| Version | Date | Scope | Key Additions |
|---|---|---|---|
| **v1.0** | November 2026 | Master baseline | Full consolidation of Sprint 1 artifacts + Sprint 2 planning |
| **v2.0** | November 2026 | Master baseline + Sprint 2 detailed design | Added ADR-010 (External IdP), ADR-011 (Kitchen Configuration), ADR-012 (AI Planning Engine), ADR-013 (Immutable Planning Results), ADR-014 (3D Asset Pipeline). Updated ADR-001 to "Layered Clean/Onion Architecture with Hexagonal Ports & Adapters". Updated ADR-002 to reflect TypeORM adoption (ADR-008a). Split ADR-008 into ADR-008a (TypeORM) and ADR-008b (Pessimistic Locking). Updated ADR-009 to Angular. Removed UUIDs from relational schema; adopted Business Keys throughout. Added Sprint 2 aggregates (KitchenConfiguration, ConsumptionForecast, SupplierScenario, PlanningResult, RoleChangeLog). Added `external_idp_subject`, nullable `password_hash`, `stock_units_per_sale`. Added 28-clarification summary (#27 partially reverses #09; #28 adds BOM/planning constraints). Added GDPR policy (Appendix D). |
| **v2.1** | November 2026 | KB correction & consolidation pass | Fixed frontend framework inconsistency — ADR-009 (Angular) is accepted; any lingering React references in `04-principles-and-guidelines.md` are superseded per ADR-009 and explicitly noted. Updated §40 Repository File Map to match the actual repository structure (added `docs/asist/`, `docs/contents/`, `docs/domain/`, `docs/resources/`, `docs/sad/03-rationale/`, `docs/scrum/`, `docs/sg/`, `docs/user-stories/`, `frontend/`, `prolog/`, `backend/tests/` organization). Clarified ADR-008a/b filename ↔ KB reference mapping. **Added:** Bruno collection structure updated. Added `CatalogueProductsView` and `PredefinedPizzaDetailsView` to entity map. Updated `06-api-design-specification.md` with self-service user contact endpoints. Updated `05-key-scenarios.md` corrections (Argon2id, integer stock units). Added `2-context.md` role corrections. Added `docs/asist/` artefact map. Added `docs/sg/` (3D asset pipeline, kitchen schema, layout example). Added `docs/resources/pizza-BOM.pl.txt`. **Preserved:** All original content from v1.0 and v2.0 remains intact. |
| **v2.2** | November 2026 | Consistency pass against repository + Sprint 2 artefacts | §14.3/§14.4 UC numbering aligned with `use_case_diagram.md`; Appendix D updated to match `gdpr-policy.md` v2.0; §24 DTO Contracts extended with `RegisterCustomerRequestDTO`, `PreRegisterStaffRequestDTO`, `ActivateInvitationRequestDTO`, `ReplaceUserRolesRequestDTO`; §23 RBAC matrix and Appendix A updated with `PUT /users/{username}/roles`; §11 vs §12 Prolog boundary consistency resolved; §13.7 added for C4 L4 selective diagram; §34 cross-references `kitchen-schema.json`, `kitchen-layout-example.json`, `3d-assets-guide.md`; §36.2/§39.3 path corrected from `nginx/default.conf` to `nginx.conf`; §40 expanded with frontend config files; §27 mentions `WWW-Authenticate` header on 401; §15.3 clarifies ASIST scripts are specifications not yet committed; §43 cross-reference extended. **Preserved:** All original content from v1.0, v2.0, v2.1 remains intact. |
| **v2.3** | November 2026 | Migration inventory + Sprint 2 SQL freeze | §21.1 module structure corrected (single `orm-migrations/` + `migrations/` with all 14 files); §21.2 gained "Migration Inventory (001–014)" table; §21.4 added — `014_sprint2_additions.sql` reproduced verbatim with 6 informational observations. §17.8 DDL realigned with migration 014 on 3 points. §40 updated: `migrations/` now lists 001–014; `entities/` count corrected from 26→35 (post-Sprint 2). §43 extended with `backend/src/infrastructure/persistence/migrations/*.sql` (001–014). **Preserved:** All content from v1.0, v2.0, v2.1, v2.2 remains intact. |
| **v2.4** | November 2026 | Residual consistency pass (R1+R2+R3) | §21.4 observations block rewritten to reflect that §17.7–§17.8 are now aligned with migration 014; §21.4 section title updated to "informational; §17.7–§17.8 already aligned". §15.3 "As of KB v2.3" reference retained. §21 provenance note softened: "corresponds **literally**" → "corresponds to". Version bumped v2.3→v2.4 in header, footer, and this table. **Preserved:** All content from v1.0–v2.3 remains intact. No information deleted. |
| **v2.5** | November 2026 | Clarifications #29–#36 integrated (Sprint 2 elaboration) | §1.4 gained invariants 9–11. §2.1 documents resource-level authorization for multi-role users (#33). §4.1–4.2 updated with `AuthSession` and `sid` claim. §4.8 documents indivisible lots + late proposals (#30). §5 ADR-004 revised v2.2; ADR-013 revised with `meetsRequiredDate`/`lateByDays`; ADR-014 revised with material reuse (#31); new **ADR-015** (unauthorized attempt logging). §6.3 gained rows #29–#36. §7 added ~14 new glossary terms. §8.1 added **AuthSession** aggregate. §9 added Decision Logs 22–28. §10.1 added invariants 22–29. §10.2 added `fk_auth_sessions_user`, `fk_unauthorized_attempts_user`. §13 added `PostgresAuthSessionRepository`, `PostgresUnauthorizedAttemptRepository`, `PasswordPolicy`, `CustomerAccessPolicy`, `PasswordRecoveryController`, `PasswordRecoveryService`, `SessionService`. §14.3 added UC16b/UC16c/UC32b/UC32c. §15.2 references #30/#36. §15.3 references v2.5. §16.2 added `auth_sessions`, `unauthorized_attempts` rows. §17.1 added `auth_sessions`, `unauthorized_attempts` DDL; §17.3 added `chk_products_stock_units_per_sale`; §17.6 added #35 note; §17.8 added #30/#36 notes. §18.4 added auth session refresh concurrency pattern. §19 added `auth_sessions`, `unauthorized_attempts` ERD rows. §20.3 added new indexes. §21.1 added `AuthSessionEntity`, `UnauthorizedAttemptEntity`; §21.2 added migrations 015/016/017; §21.4 unchanged (014 verbatim); §21.5 added for 015–017. §23 added `/auth/refresh`, `/auth/logout`, `/auth/password-recovery`, `/auth/password-reset`, `/auth/resend-activation`. §24 added `RefreshTokenRequestDTO`, `PasswordRecoveryRequestDTO`, `PasswordResetRequestDTO`, `ResendActivationRequestDTO`; §24.10 extended `PurchaseProposal` with `meetsRequiredDate`/`lateByDays`. §25.2 added 202/204 rows + new 401/422 cases. §27 OpenAPI v2.1.0. §28.3 added `auth-session.spec.ts`, `password-policy.spec.ts`, `purchase-proposal.spec.ts`, `auth.controller.spec.ts`, `customer-access-policy.spec.ts`, `auth-session-concurrency.spec.ts`, Bruno `AA01-PasswordRecovery`, `AA04-Sessions`. §31.1 references all #29–#36. §31.3 added new env vars. §32.1 added M1 effort. §33.3 added session UI notes. §34 references #31. §35.4 added #30/#36 rules. §36 env vars added. §40 added migration 015–017 and new Bruno folders. Appendix A added new endpoints. Appendix B added new rules. **Preserved:** All content from v1.0–v2.4 remains intact. No information deleted. |
| **v2.6** | November 2026 | Clarifications #37–#46 integrated (Sprint 2 elaboration round 2) | **§1.4** gained invariants 12–16 (ADMINISTRATOR role; password recovery dedicated aggregate; pending deliveries; confirmation dialogues; bounded-context rule). **§2.1** completely reworked: `ADMINISTRATOR` role now explicitly exists in Sprint 2 (Sprint 2 Table 1, Clarification #42); reconciles the "first Administrator" (bootstrap Manager, #24 §1.1) vs `ADMINISTRATOR` role. **§3** notes Clarification #46 compliance. **§4.8** extended with pendingDeliveries, referenceDate, end-of-previous-day stock rule (#37); lowest-total-cost selection; multiple suppliers per day. **§4.9** added (Password Recovery Flow). **§4.10** added (Admin consult of denied access logs). **§5** added ADR-016 and ADR-017; ADR-001 updated with #46 compliance; ADR-004 revised (v2.6 cross-references); ADR-005 OpenAPI v2.2.0; ADR-007 folder layout updated; ADR-008a entity/repository counts updated; ADR-009 updated (#39, #42); ADR-012 pendingDeliveries; ADR-013 updated; ADR-015 revised (#42 admin-only access). **§6.3** gained rows #37–#46; #04 partially superseded. **§7.1** added ADMINISTRATOR, PasswordRecovery, RolesAssignment, StatusAssignment, UnauthorizedAttempts, Application Logs, System/Infrastructure Logs, PasswordPolicy. **§7.9** added PendingDelivery, ReferenceDate, StockAvailabilityRule, Significant Action, Connection Failure Timeout, Idempotent Retry. **§8.1** now 21 aggregates (added PasswordRecovery, RolesAssignment, StatusAssignment). **§8.4** UserRole extended to `{ADMINISTRATOR, MANAGER, EMPLOYEE, CUSTOMER}`. **§9** added Decision Logs 29–38. **§10.1** added invariants 30–37. **§10.2** added `fk_password_recovery_user`, `fk_roles_assignment_user`, `fk_status_assignment_user`. **§10.3** updated. **§11–12** include Administrator persona + Clarification #46 compliance note. **§13** added AdminAuditController, PasswordRecoveryService, PasswordRecoveryDomainService, RolesAssignmentService, StatusAssignmentService, PostgresPasswordRecoveryStore, PostgresRolesAssignmentRepository, PostgresStatusAssignmentRepository, SmtpRecoveryMailer, InMemoryExchangeCodeStore. **§14.3** added UC16d (password recovery), UC16e (admin audit). **§15.3** updated with #40, #43. **§15.4** notes GDPR redirect (#45). **§16.2** added password_recovery, roles_assignment, status_assignment rows. **§17.1** added DDL for all new tables. **§18.5** added password-recovery concurrency pattern. **§19** added ERD rows. **§20.3** added new indexes. **§21.1–21.2** entity counts updated; migrations 018–021 added; **018 numbering collision documented**. **§21.5** reworked for v2.6 migrations. **§23** added ADMINISTRATOR-scoped endpoints for user management; new `/admin/unauthorized-attempts`. **§24.9** added referenceDate + pendingDeliveries. **§24.10** notes updated. **§25.2** updated 409/422 rows. **§27** OpenAPI v2.2.0 with new tags. **§28.3** added new test files/folders. **§31** references all #37–#46. **§31.3** updated. **§32** effort updated. **§33.3** added admin panel and confirmation dialogues. **§35.4** added #37, #41, #44. **§36.5** added API_TIMEOUT_MS, SMTP vars. **§37.2** added deployment workflow note (#40). **§40** file map updated with v2.6 additions. **§43** sources extended. **Appendix A** new endpoints. **Appendix B** new rules. **Appendix C** new PT↔EN terms. **Appendix D** updated with password_recovery, clarifications #42, #45. **Preserved:** All content from v1.0–v2.5 remains intact. No information deleted. |

### Evolution Principles

1. **Additive over subtractive** — new content added; existing preserved.
2. **Traceability** — each section documents its source file.
3. **Semantic versioning** — minor increments for additions; major for restructuring.
4. **Source of truth** — when code and KB conflict, code prevails; KB updated to reflect.
5. **Corrections documented** — any correction to previously stated information is explicitly noted in the version history with reference to the superseding source.

---

## 42. AI-Assisted Engineering Disclosure

Per academic integrity requirements (PART I §I.2.3), the team discloses AI usage:

| Activity | Tool(s) | Supervision |
|---|---|---|
| Requirements validation | Claude, ChatGPT | Manual review of each requirement |
| SSD generation | AI-assisted Mermaid | Manual correction + validation |
| ADR drafting | AI-assisted | Manual justification + approval |
| Code review | AI-assisted suggestions | Manual acceptance + tests |
| Bruno/Jest test generation | AI-assisted | Manual scenario design |
| Documentation | AI-assisted | Manual validation |

**Every AI-generated artifact was reviewed, validated, compiled, and tested by the engineering team.** Responsibility for correctness remains with the team.

**Documented in:** `README.md` §4 (English and Portuguese versions).

---

## 43. Source Documents Cross-Reference

| Section | Source File(s) |
|---|---|
| §1 Business Context | `LEI-2026-27-Sem5-Project_v1-SystemSpecification.pdf`, `README.md` §2 |
| §2 Stakeholders | `02-context.md`, `glossary.md`, **`LEI-2026-27-Sem5-Project_v1-Sprint2US.pdf` Table 1** (v2.6) |
| §3 Principles | `04-principles-and-guidelines.md`, ARQSI slides, ADR-001 (revised); **Clarification #46 (v2.6)** |
| §4 Scenarios | `05-key-scenarios.md`, Clarifications #29–#46 (v2.6) |
| §5 ADRs | `docs/sad/03-rationale/*.md` (ADR-001 through ADR-017) + `docs/sad/03-rationale/README.md` (ADR index, supersession log); **ADR-004.2 (v2.6)** |
| §6 Requirements | `LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf`, `LEI-2026-27-Sem5-Project_v1-Sprint2US.pdf`, `client-questions.md` (v2.6 — 46 clarifications) |
| §7 Glossary | `glossary.md`, Clarifications #37–#46 (v2.6) |
| §8 Domain Model | `domain-model.puml`, `domain-model.sketch.md` (v3.1) |
| §9 Rationale | `domain-model.sketch.md` §4 + Decision Logs 29–38 (v2.6) |
| §10 Invariants | Client clarifications + `08-database-structure.md` |
| §11 C4 L1 | `component-diagram-l1.puml` |
| §12 C4 L2 | `component-diagram-l2.puml` |
| §13 C4 L3 | `component-diagram-l3.puml`, `component-diagram-sketch.md` (v2.0) |
| §13.7 C4 L4 | `docs/architectural/component-diagram/component-diagram-l4.puml`, `docs/architectural/component-diagram-sketch-l4.md` |
| §14.3 / §14.4 Use Cases | `docs/architectural/use_case_diagram_sprint2.md`, `use_case_diagram.md` |
| §15 Multi-Disciplinary | `LEI-2026-27-Sem5-Project_v1-SystemSpecification.pdf` §II.3.3, §II.3.4 |
| §15.3 ASIST SYS01 | `docs/asist/sys-deployment.md` (v2.6: external infra option, Clarification #40) |
| §15.3 ASIST SYS02/SYS03/SYS05 | `docs/asist/sys-network-config.md` |
| §15.3 ASIST SYS04 | `docs/asist/sys-shared-folder.md` (v2.6: SPA-access, Clarification #43) |
| §15.3 ASIST SYS06 | `docs/asist/sys-risk-assessment.md` |
| §15.3 ASIST SYS07 | `docs/asist/sys-mbco.md` |
| §15.3 ASIST SYS08 | `docs/asist/sys-backup-strategy.md` |
| §16–§21 Persistence | `07-relational-mapping-and-persistence-strategy.md`, `08-database-structure.md`, ADR-008a, ADR-011, ADR-013, ADR-016 (v2.6) |
| §16–§21 Persistence (migrations 001–017) | `backend/src/infrastructure/persistence/migrations/001_*.sql` … `017_add_auth_session_last_activity.sql` |
| §21.4 Migration 014 | `backend/src/infrastructure/persistence/migrations/014_sprint2_additions.sql` |
| §21.5 Migrations 015–017 | `015_create_auth_sessions_table.sql`, `016_create_unauthorized_attempts_table.sql`, `017_add_auth_session_last_activity.sql` |
| **§21.5 Migrations 018–022 (v2.7)** | **`018_create_password_recovery_table.sql`, `019_create_roles_assignment_table.sql`, `020_create_status_assignment_table.sql`, `021_seed_ai02_data.sql`, `022_predefined_pizza_no_stock.sql`** |
| §22–§27 API | `06-api-design-specification.md`, `docs/api/openapi.yaml` (v2.2.0) |
| §28 Testing | ADR-006, ADR-008a |
| §29 Bruno | ADR-007 |
| §30 Sprint 1 Status | `README.md` §6, ADR-008a validation result |
| §31 Sprint 2 Scope | `LEI-2026-27-Sem5-Project_v1-Sprint2US.pdf`, Clarifications #37–#46 |
| §32 Roadmap | Derived from Sprint 2 US |
| §33 Angular | `HowTo_Angular-ThreeJS.pdf`, ADR-009 |
| §34 Three.js | `LEI-2026-27-Sem5-Project_v1-Sprint2US.pdf` (VIS01–VIS07), `Assignment.pdf`, `Sprint 2 Support Slide Deck.pdf`, ADR-014, `docs/sg/kitchen-schema.json`, `docs/sg/kitchen-layout-example.json`, `docs/sg/3d-assets-guide.md` |
| §35 Prolog | `LEI-2026-27-Sem5-Project_v1-Sprint2US.pdf` (AI01–AI06), `TP Support IARTI SprintB - Pizza Restaurant - 1.pdf`, `prolog/bom.pl`, `prolog/planning.pl`, `prolog/server.pl`, ADR-012, ADR-013, Clarifications #37, #41, #44 |
| §36 Docker | `docker-compose.yml`, `backend/Dockerfile`, `frontend/Dockerfile`, `prolog/Dockerfile`, `frontend/nginx.conf` |
| §37 CI | `.github/workflows/ci.yml` |
| §37.2 Deployment | Clarification #40 |
| §38 Makefile | `Makefile` |
| §39 Angular+Docker+HTTPS | `angular-docker-https-setup.md`, `frontend/nginx.conf` |
| §40 File Map | Repository structure (v2.6) |
| §41 Version History | This document |
| §42 AI Disclosure | `README.md` §4 |
| §43 Sources | All of the above |
| Appendix D GDPR | `docs/gdpr-policy.md` v2.0 + Clarification #45 (redirect to LAPR5) |

---

## Appendix A: Complete API Endpoint Quick Reference

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/v1/auth/login` | Public | Authenticate, get JWT (email only, case-insensitive; rejects external-only users; rejects PENDING_REGISTRATION) |
| POST | `/api/v1/auth/register` | Public | Self-register customer (PENDING_REGISTRATION until activation) |
| POST | `/api/v1/auth/pre_register` | **ADMINISTRATOR** (v2.6) | Provision staff account (invitation) |
| GET | `/api/v1/auth/external/login` | Public | Initiate OIDC login (ADR-010) |
| GET | `/api/v1/auth/external/callback` | Public | OIDC callback, JIT provision if new, JWT issue |
| POST | `/api/v1/auth/activate` | Public | Consume activation invitation |
| POST | `/api/v1/auth/refresh` | Auth (refresh) | Refresh access token; updates lastActivityAt; rejects if inactivity exceeded (#34) |
| POST | `/api/v1/auth/logout` | Auth | Revoke current session only (#29) |
| POST | `/api/v1/auth/password-recovery` | Public | Send single-use password-reset link (#32, ADR-016) |
| POST | `/api/v1/auth/password-reset` | Public | Consume password-reset token; enforce password policy (#32, ADR-016) |
| POST | `/api/v1/auth/resend-activation` | Public | Resend activation email for PENDING_REGISTRATION (#32) |
| GET | `/api/v1/users` | **ADMINISTRATOR** | List users |
| GET | `/api/v1/user/:username` | **ADMINISTRATOR** / self | Get user (resource-level, #33) |
| DELETE | `/api/v1/user/:username` | **ADMINISTRATOR** / self | Deactivate |
| GET | `/api/v1/users/:username/role-history` | **ADMINISTRATOR** | RoleChangeLog |
| PUT | `/api/v1/users/:username/roles` | **ADMINISTRATOR** | Replace user's role set + RoleChangeLog (AA06) |
| **GET** | **`/api/v1/admin/unauthorized-attempts`** | **ADMINISTRATOR (v2.6, Clarification #42)** | **List denied-access audit rows** |
| PUT | `/api/v1/user/me/address` | Auth | Update own address |
| PUT | `/api/v1/user/me/phone-number` | Auth | Update own phone |
| POST | `/api/v1/customers` | Manager | Create customer |
| GET | `/api/v1/customers` | Manager | Search customers |
| GET | `/api/v1/customers/:email` | Manager/own | Get customer (resource-level, #33) |
| PUT | `/api/v1/customers/:email` | Manager/own | Update customer (resource-level, #33) |
| PUT | `/api/v1/customers/:email/dietary-restrictions` | Manager/own | Update restrictions (resource-level, #33) |
| DELETE | `/api/v1/customers/:email` | Manager | Delete customer |
| POST | `/api/v1/product-categories` | Manager | Create category |
| GET | `/api/v1/product-categories` | Public | List categories |
| DELETE | `/api/v1/product-categories/:name` | Manager | Delete category |
| POST | `/api/v1/allergens` | Manager | Create allergen |
| GET | `/api/v1/allergens` | Public | List allergens |
| DELETE | `/api/v1/allergens/:name` | Manager | Delete allergen |
| POST | `/api/v1/products` | Manager | Create product |
| GET | `/api/v1/products` | Manager/Employee | List/filter products |
| GET | `/api/v1/products/:sku` | Public | Get product |
| PUT | `/api/v1/products/:sku` | Manager | Update product |
| DELETE | `/api/v1/products/:sku` | Manager | Delete/deactivate |
| POST | `/api/v1/pizza-sizes` | Manager | Create size |
| GET | `/api/v1/pizza-sizes` | Public | List sizes |
| DELETE | `/api/v1/pizza-sizes/:name` | Manager | Delete size |
| POST | `/api/v1/pizza-component-types` | Manager | Create type |
| GET | `/api/v1/pizza-component-types` | Public | List types |
| GET | `/api/v1/pizza-component-types/:name` | Public | Get type |
| PUT | `/api/v1/pizza-component-types/:name` | Manager | Update type |
| DELETE | `/api/v1/pizza-component-types/:name` | Manager | Delete type |
| POST | `/api/v1/products/:sku/size-configurations` | Manager | Create config |
| GET | `/api/v1/products/:sku/size-configurations` | Public | List configs |
| GET | `/api/v1/stock` | Manager/Employee | List stock |
| GET | `/api/v1/stock/:productSku` | Manager | Get balance |
| POST | `/api/v1/stock/:productSku/adjustments` | Manager | Adjust stock |
| POST | `/api/v1/predefined-pizzas` | Manager | Create recipe |
| GET | `/api/v1/predefined-pizzas` | Public | List recipes |
| GET | `/api/v1/predefined-pizzas/:sku` | Public | Get recipe |
| GET | `/api/v1/catalogue` | Public | Public catalogue |
| GET | `/api/v1/catalogue/:sku` | Public | Catalogue item |
| GET | `/api/v1/kitchen-configurations` | Manager, Employee | List kitchen configs |
| POST | `/api/v1/kitchen-configurations` | Manager | Create kitchen config |
| PUT | `/api/v1/kitchen-configurations/:name` | Manager | Update kitchen config |
| DELETE | `/api/v1/kitchen-configurations/:name` | Manager | Delete kitchen config |
| POST | `/api/v1/kitchen-configurations/:name/activate` | Manager | Activate kitchen config (ADR-011) |
| GET | `/api/v1/consumption-forecasts` | Manager | List forecasts (incl. non-pizza per #36) |
| POST, PUT, DELETE | `/api/v1/consumption-forecasts` | Manager | CRUD forecasts |
| GET | `/api/v1/supplier-scenarios` | Manager | List scenarios |
| POST, PUT, DELETE | `/api/v1/supplier-scenarios` | Manager | CRUD scenarios |
| POST | `/api/v1/supplier-scenarios/:name/confirm` | Manager | Confirm scenario |
| POST | `/api/v1/planning/executions` | Manager | Execute BOM/planning (ADR-012; accepts `referenceDate`, `pendingDeliveries[]` per #37) |
| GET | `/api/v1/planning/executions` | Manager | List planning results |
| GET | `/api/v1/planning/executions/:executionId` | Manager | Get planning result |
| POST | `/api/v1/planning/executions/:executionId/replay` | Manager | Replay (ADR-013, `isReplay=true`) |
| GET | `/api/v1/products/export` | Manager | Export products JSON for planning KB |

---

## Appendix B: Business Rules Quick Reference

| Rule | Source |
|---|---|
| `(isSellable \|\| isPizzaComponent) === true` | Clarification #06 |
| `criticalLimit > warningLimit` | BCK08 (future) |
| `stockUnitsConsumed >= 0` | Clarification #13 |
| `currentUnits >= 0` | BCK09 |
| `currentUnits >= stockUnitsConsumed * defaultQuantity` | Clarification #01 Q5 |
| Predefined pizza ≠ Pizza Component | Clarification #11 |
| No base price for predefined pizza | Clarifications #01 Q3, #05 |
| Zero price allowed | Clarification #11 |
| Non-negative price | Clarification #11 |
| Component drop requires no dependencies | Clarification #14 |
| Assembly order unique | Clarification #18 |
| 4 base component types immutable | Clarification #18 |
| One category per product (mandatory) | Clarification #08 |
| At least one active Manager | Clarification #24 |
| Invitation TTL configurable | Clarification #24, ADR-017 |
| Previous invitation invalidated on new | Clarification #24, ADR-017 |
| Public registration → PENDING_REGISTRATION (requires email confirmation) | Clarification #27 |
| External IdP first login → ACTIVE JIT (no invitation) | Clarification #27 |
| Employee with CUSTOMER role requires Customer record | Clarification #27 |
| Catalogue public | Clarification #21 |
| Stock adjustable on inactive products | Clarification #19 |
| Only pizzas have BOM | Clarifications #28, #41 |
| Lead times whole days | Clarification #28 |
| Lead time can be zero (same-day) | Clarification #37 |
| Supply limits per-offer, per-day (not shared per supplier) | Clarification #28 follow-up |
| `stockUnitsPerSale` required iff `isStockControlled ∧ isSellable` at planning | Clarification #28 §2 |
| First execution rejects if reference became inactive | Clarification #28 follow-up |
| Historical replay uses original snapshot dataset | Clarification #28 §3 |
| `User` has `passwordHash` OR `externalIdpSubject` | AA01, AA02, ADR-010 |
| At most one active `ActivationInvitation` per `(user, purpose)` | AA06, Clarification #24, ADR-017 |
| At most one active `KitchenConfiguration` | WEB06, ADR-011 |
| PlanningResult never mutates stock | Clarification #26 |
| PlanningResult snapshots preserved | WEB07, Clarification #28 |
| **Session validity requires `now < expiresAt` AND `now − lastActivityAt < SESSION_INACTIVITY_MINUTES`** | Clarifications #29, #34 |
| **Logout revokes only the current `AuthSession`; other sessions remain active** | Clarification #29 |
| **`SupplierOffer.stockUnitQuantity` is an indivisible lot; required qty rounded up to multiple; surplus → hypothetical stock** | Clarification #30 |
| **`PurchaseProposal` carries `meetsRequiredDate` + `lateByDays`; late proposal does not remove original unmet need** | Clarification #30 |
| **Material reuse permitted across objects with similar surfaces; performance optimisation demonstrated & justified** | Clarification #31 |
| **Login identifier = email, case-insensitive; password policy applies uniformly to create/change/recover; PENDING_REGISTRATION login blocked with resend** | Clarification #32 |
| **Multi-role access accumulates permissions but data-ownership/confidentiality restrictions apply per operation and per resource; `RolesGuard` insufficient → resource-level auth required** | Clarification #33 |
| **Access-token lifetime = team-defined (ASIST), configurable; refresh must not bypass inactivity timeout** | Clarification #34 |
| **`PredefinedPizza` backing `Product` MUST NOT be `isStockControlled`; stock tracked at component level, deducted on order confirmation** | Clarifications #35, #38 |
| **Non-pizza sellable products included in forecasts/exports/supplier scenarios/replenishment plans; needs via `stockUnitsPerSale`, no BOM** | Clarification #36 |
| **Lead time can be 0 (same-day); multiple suppliers per day allowed; lowest-total-cost selection (not all combinations); pending deliveries as input; `referenceDate` defaults to execution date; no proposed order before `referenceDate`; advance ordering allowed; no maximum delay for late proposals; one forecast per request; days without entries = 0; stock for day N available by end of N−1** | Clarification #37 |
| **Predefined pizzas are not conventional sellable products (reinforcement of #35)** | Clarification #38 |
| **Significant actions require confirmation dialogues (delete, deactivate user, role change, cancel order); no maximum timeout; retries must be idempotent-safe; progress + success + error feedback mandatory** | Clarification #39 |
| **Deployment may use external infra (Azure, AWS, etc.); SSH-from-outside with GitHub Actions Secrets; not restricted to DEI VM; choice justified and documented** | Clarification #40 |
| **Only pizzas have BOM in LaPrizza domain (permanent); recursive BOM/aggregate scope is IARTI-side — consult IARTI RUC** | Clarification #41 |
| **`ADMINISTRATOR` role owns application audit log access (denied attempts); system/infra logs outside web role taxonomy** | Clarification #42 |
| **Shared folder access via web SPA (authenticated) acceptable; no direct server folder access required; back-end enforces access control** | Clarification #43 |
| **Offer price is for N stock units (N ≥ 1); indivisible batch; one supply arrangement per `(supplier, product)`** | Clarification #44 |
| **Consent/GDPR questions redirected to LAPR5 TP lecturer; prior consent model provisionally valid** | Clarification #45 |
| **Bounded context NOT split across containers; one container may host multiple contexts** | Clarification #46 |

---

## Appendix C: Glossary PT ↔ EN (Legacy)

For team members migrating from Portuguese-only drafts:

| PT | EN |
|---|---|
| Cliente | Customer |
| Produto | Product |
| Categoria de Produto | ProductCategory |
| Alergénio | Allergen |
| Tamanho de Pizza | PizzaSize |
| Tipo de Componente | PizzaComponentType |
| Configuração de Tamanho | ComponentSizeConfiguration |
| Componente de Pizza | PizzaComponent |
| Pizza Predefinida | PredefinedPizza |
| Item de Receita | RecipeLine |
| Stock / Existências | Stock / Inventory |
| Unidade de Stock | StockUnit |
| Movimento de Stock | StockMovement |
| Encomenda | Order |
| Restrição Alimentar | DietaryRestriction |
| Gestor | Manager |
| Empregado / Funcionário | Employee |
| Utilizador | User |
| Papel | Role |
| Estado | Status |
| Convocatória / Convite | Invitation |
| Ativação | Activation |
| Token | Token |
| Repositório | Repository |
| Fronteira de Agregado | Aggregate Boundary |
| Regra de Negócio | Business Rule |
| Invariante | Invariant |
| Caso de Uso | Use Case |
| Requisito | Requirement |
| Teste Automatizado | Automated Test |
| Configuração de Cozinha | KitchenConfiguration |
| Previsão de Consumo | ConsumptionForecast |
| Cenário de Fornecedores | SupplierScenario |
| Resultado de Planeamento | PlanningResult |
| Registo de Alteração de Papéis | RoleChangeLog |
| Sessão de Autenticação | AuthSession |
| Lote Indivisível | Indivisible Purchase Lot |
| Proposta Tardia | Late Proposal |
| Inatividade | Inactivity |
| Recuperação de Palavra-passe | Password Recovery |
| Autorização ao Nível do Recurso | Resource-Level Authorization |
| **Administrador** | **ADMINISTRATOR** |
| **Recuperação de Palavra-passe (entidade)** | **PasswordRecovery** |
| **Atribuição de Papéis** | **RolesAssignment** |
| **Atribuição de Estado** | **StatusAssignment** |
| **Entregas Pendentes** | **PendingDeliveries** |
| **Data de Referência** | **ReferenceDate** |
| **Ação Significativa** | **Significant Action** |
| **Falha de Ligação** | **Connection Failure** |
| **Tentativa Idempotente** | **Idempotent Retry** |
| **Contexto Delimitado** | **Bounded Context** |

---

## Appendix D: GDPR Compliance & Personal Data Policy

**Status:** The authoritative, full policy lives in `docs/gdpr-policy.md` (v2.0, November 2026, aligned with LAPR5). This appendix provides a comprehensive summary and navigation guide, preserving the essential content in-context while pointing to the source file for the complete formal text.

> **v2.6 note (Clarification #45):** GDPR/consent-management interpretation questions raised by the team were **redirected by the client to the LAPR5 TP lecturer**. The policy remains provisionally valid pending that decision. The team must obtain the LAPR5 lecturer's answer and record it as a future clarification or `docs/gdpr-policy.md` addendum.

### D.1. Version and Evolution

- **v2.0** (November 2026) — aligned with LAPR5 curriculum (9 principles, Lei 58/2019, CPDHED, CNPD, Art. 9º special categories, DPIA, DPO, transfers, penalties).
- **v1.1** (superseded) — had only 7 principles, did not reference Lei 58/2019, CPDHED, CNPD, or Art. 9º special categories.
- **Pending (v2.6):** possible v2.1 once LAPR5 answers Clarification #45 (consent versioning).

**What changed v1.1 → v2.0:**

| Aspect | v1.1 | v2.0 |
|---|---|---|
| Principles | 7 (merged licitude/lealdade/transparência) | **9** (Art. 5º §1.a–i + §2), per LAPR5 |
| Legal precedents | Not cited | DUDH (1948), CEDH (1950), Convenção 108 (1981), TFUE, CDFUE, Diretiva 95/46/CE, Lei 67/98, CRP, RGPD, **Lei 58/2019**, **Lei 27/2021 (CPDHED)** |
| Supervisory authority | Mentioned generically | **CNPD** formally identified (Art. 51º) |
| Special categories (Art. 9º) | Not addressed | **Health data** processing via `user_dietary_restrictions` explicitly consented (Art. 9º-2-a) |
| DPIA (Art. 35º) | Not addressed | §9 — concluded no DPIA required for Sprint 2 baseline |
| DPO (Art. 37º–39º) | Contact only | **§10 — formally designated**, tasks, independence, reporting |
| Transfers (Art. 44º–50º) | Not addressed | §14 — OIDC IdP, SMTP, S3 backup transfers + safeguards |
| Penalties (Art. 83º) | Not addressed | §15 — penalties framework (up to €20M or 4% turnover) |
| Complaint to CNPD | Not addressed | §5.8 — direct right |
| Retention | Vague ("indefinitely") | §12 — tabular per data category, fiscal 10 years, audit 5 years |
| Request schema (`customers.user_id` → `customers.username`) | Incorrect | Corrected |

### D.2. Structure of `docs/gdpr-policy.md` v2.0

1. Introduction & Legal Framework (LAPR5 precedents, Lei 58/2019, CPDHED, CNPD, scope)
2. Key Legal Definitions (Art. 4º, full table)
3. Data Protection Principles (Art. 5º — 9 principles per LAPR5)
4. Legal Bases (Art. 6º — 6 bases mapped per processing)
5. Rights of the Data Subject (Art. 15º–22º) + Judicial Remedies (Art. 77º–79º)
6. Personal Data Inventory & Art. 30º Record
7. Special Categories (Art. 9º) — health data via dietary restrictions
8. Security Measures (Art. 32º)
9. DPIA (Art. 35º)
10. DPO (Art. 37º–39º)
11. Breach Handling (Art. 33º–34º) — 72h CNPD
12. Retention
13. AI and Automated Decision Making (Art. 22º)
14. Cross-Border Transfers (Art. 44º–50º)
15. Penalties (Art. 83º)
16. References

### D.3. Nine Principles of Data Processing (Art. 5º — LAPR5 decomposition)

1. **Lawfulness** (licitude) — one of six legal bases (Art. 6º).
2. **Fairness** (lealdade) — good-faith processing, no dark patterns.
3. **Transparency** (transparência) — clear Privacy Notice; no account enumeration on failed login; password recovery responds `202 Accepted` regardless of account existence (Clarification #32).
4. **Purpose Limitation** (finalidade) — determined, explicit, legitimate purposes.
5. **Data Minimization** (minimização) — only mandatory fields; kiosk no persistent record; AI snapshots no PII; session records carry only `username`; **password recovery stores only token hash** (ADR-016).
6. **Accuracy** (exatidão) — self-service profile updates; short-lived tokens; configurable inactivity.
7. **Storage Limitation** (conservação) — retention per data category (§12).
8. **Integrity & Confidentiality** (integridade e confidencialidade) — Argon2id, JWT, HTTPS, RBAC, resource-level auth (#33), ON DELETE RESTRICT, **admin-only application log access (#42)**.
9. **Accountability** (responsabilidade) — `role_change_logs`, ≥1 active MANAGER invariant, `unauthorized_attempts` audit, **`password_recovery` audit trail**.

### D.4. Legal Bases (Art. 6º)

| Base | Where used |
|---|---|
| **(a) Consent** | Marketing (`customers.marketing_consent`) |
| **(b) Contract** | Registration, order fulfilment, customer profile, authentication, session management |
| **(c) Legal obligation** | Billing records retention (future `customer_orders`) |
| **(d) Vital interests** | Not used |
| **(e) Public interest** | Not applicable (private restaurant) |
| **(f) Legitimate interests** | Audit (`role_change_logs`, `unauthorized_attempts`, `auth_sessions`, `password_recovery`), security logs, ≥1 active MANAGER invariant |

**Provisional special-category position (Clarification #58):** The team's prior policy treated dietary restrictions (allergies/intolerances) as health data under Art. 4º-15 and proposed explicit consent under Art. 9º-2-a. The lecturer has left the classification and legal basis to the team for decision after the LAPR5 discussion. The existing schema does not evidence a distinct consent record; verify actual consent capture before claiming it is implemented. This paragraph records the provisional position, not a resolved legal decision.

### D.5. Data Subject Rights (Arts. 15º–22º) & Remedies (Arts. 77º–79º)

| Right | System Implementation |
|---|---|
| Access (Art. 15º) | SPA profile view + `GET /api/v1/user/:username` (self-scoped) + `GET /api/v1/customers/:email` (Manager) — resource-level, #33 |
| Rectification (Art. 16º) | `PUT /api/v1/user/me/address`, `PUT /api/v1/user/me/phone-number`, `PUT /api/v1/customers/:email` |
| Erasure (Art. 17º) | `DELETE /api/v1/user/:username` → cascade on `user_role_assignments`, `roles_assignment`, `status_assignment`, `user_dietary_restrictions`, `activation_invitations`, `auth_sessions`, **`password_recovery`**; `customers.username` → `SET NULL`; `unauthorized_attempts.user` → `SET NULL` |
| Restriction (Art. 18º) | `DEACTIVATED` status blocks login and processing |
| Portability (Art. 20º) | `GET /api/v1/user/:username` in structured JSON |
| Object to marketing (Art. 21º) | `marketing_consent` boolean flag |
| Automated decisions (Art. 22º) | No profiling; AI planning restricted to back-office inventory |
| Complaint to CNPD (Art. 77º) | www.cnpd.pt |
| Judicial remedy (Art. 79º) | Courts of Portugal (Controller's establishment) |

### D.6. Personal Data Inventory (Art. 30º Record)

| Data Category | DB Table & Column | Purpose | Legal Basis | Retention |
|---|---|---|---|---|
| Identity | `users.first_name`, `users.last_name` | Auth, staff management | Contract / Legitimate Interest | Active + 5 years deactivated |
| Contact | `users.email`, `users.phone_number`, `customers.phone` | Auth, order updates | Contract | Same as identity |
| Credentials | `users.password_hash` (nullable when external) | Local auth (Argon2id) | Contract | Same as identity |
| External Identity | `users.external_idp_subject` | OIDC | Contract | Same as identity |
| Session identifier | `auth_sessions.id` (UUID), `username`, `last_activity_at`, `expires_at`, `revoked_at` | Session management (#29, #34) | Legitimate Interest | Until revoked + 7 days after `expires_at` |
| **Password recovery** | **`password_recovery.id` (UUID), `username`, `token_hash`, `expires_at`, `used_at`, `revoked_at`** | **Password reset (ADR-016)** | **Contract / Legitimate Interest** | **Until used/revoked + 7 days after `expires_at`** |
| Unauthorized access audit | `unauthorized_attempts.user`, `timestamp`, `endpoint` | Security audit (AA05, ADR-015) | Legitimate Interest | 5 years |
| Special category (health) | `user_dietary_restrictions.allergen_name` | Customer safety | **Explicit consent (Art. 9º-2-a)** | Same as identity, revocable |
| Financial/Order | `customer_orders.total_amount` (future) | Billing | Legal + Contract | 10 years (fiscal) |
| Telemetry/Audit | `role_change_logs`, `activation_invitations` | Security, auditing | Legitimate Interest / Legal | 5 years / 48h post-expiry |
| Simulated/Planning | `planning_results.*_snapshot` | AI Forecasting (no PII) | N/A (Anonymized) | Indefinite (business artefact) |
| HTTP access logs | Nginx access logs | Security, monitoring | Legitimate Interest | 30 days |

### D.7. Security Measures (Art. 32º)

**Cryptographic:** Argon2id (64 MiB, 3 iters); HTTPS/TLS 1.2+; JWT with `JWT_EXPIRES_IN`; single-use invitation tokens (TTL `INVITATION_TTL_HOURS`); single-use password-reset tokens (TTL `PASSWORD_RECOVERY_TTL_HOURS`, **token hash stored, raw never persisted** — ADR-016).

**Access Control:** Strict RBAC (`RolesGuard` re-reads roles per request); **resource-level authorization** (`CustomerAccessPolicy`) for multi-role users (Clarification #33); **application audit logs accessible only by `ADMINISTRATOR`** (Clarification #42); DB least privilege; `ON DELETE RESTRICT` prevents mass deletion; `JwtAuthGuard` re-reads `users.status` and `auth_sessions` per request; **inactivity-based session validity** (Clarifications #29, #34); **per-device logout** (Clarification #29); **session revocation on password reset** (ADR-016).

**Pseudonymization & Isolation:** Anonymous kiosk → no persistent record; AI Planning excludes customer PII; `SET NULL` on user deletion severs personal identifier.

### D.8. DPIA (Art. 35º)

**Assessment for Sprint 2 baseline:** No DPIA required because (a) no profiling with legal/significant effects; (b) dietary restrictions not "large scale"; (c) no public-area monitoring. **Reassess** if Sprint 3 adds payment processing.

### D.9. Data Protection Officer (Arts. 37º–39º)

Voluntarily designated: **dpo@laprizza.local**. Reports to senior management. Tasks per Art. 39º (inform/advise, monitor compliance, DPIA advice, cooperate with CNPD, contact point, maintain Art. 30º record). Independent; cannot be instructed on the exercise of functions.

### D.10. Breach Handling (GDP03 / Arts. 33º–34º)

1. **Detection & Containment** — monitor logs; revoke compromised JWTs (delete `auth_sessions`); deactivate accounts; preserve evidence before restart.
2. **Assessment** — likelihood/severity of risk; categories exposed; encryption status.
3. **Notification to CNPD (Art. 33º) — within 72h** — nature, categories/numbers, DPO contact, consequences, measures; reasons if delayed; CNPD electronic form.
4. **Communication to data subjects (Art. 34º)** — if high risk, without undue delay; describe breach and mitigation.
5. **Documentation (Art. 33º-5)** — every breach documented (even if not notified).

### D.11. AI and Automated Decisions (Art. 22º)

AI Planning (Prolog) operates on **stock, supplier, and forecast data only**. No customer PII is sent to Prolog. Human oversight: all outputs are read-only `PlanningResult` artefacts for Manager review. No automated purchase order, no automated stock mutation (Clarification #26). Replayability guaranteed by immutable snapshots (ADR-013). Per Clarification #30, late deliveries are explicitly labelled (no silent acceptance). **Per Clarification #37**, planning considers pending deliveries and honours the end-of-previous-day stock rule; per Clarification #41, recursive BOM is IARTI-scope only.

### D.12. Cross-Border Transfers (Arts. 44º–50º)

Transfers may occur via OIDC IdP (only the user's email and `sub` claim to the IdP), SMTP provider (email + invitation token, **email + password-reset token**), and S3-compatible backup bucket (age-encrypted). Only IdPs with adequate safeguards (Art. 45º adequacy or Art. 46º SCCs) accepted. **No special-category data** (dietary restrictions) transferred to any processor.

### D.13. Penalties (Art. 83º)

Up to **€20M or 4%** of global annual turnover (whichever higher) for breach of principles, data subject rights, or transfer provisions. Up to **€10M or 2%** for breach of controller/processor obligations. Currently academic prototype; policy drafted as if commercial.

### D.14. Retention and Deletion

| Category | Retention | Legal basis |
|---|---|---|
| Active accounts | While active | Contract |
| Deactivated accounts | 5 years | Legitimate interest (audit) |
| Customer records | 10 years from last transaction | Portuguese fiscal law |
| Dietary restrictions | Cascade with `User`; revocable | Explicit consent |
| Invitations | 48h TTL + cascade | Contract |
| Auth sessions (active) | While `expiresAt > now` AND `lastActivityAt > now − SESSION_INACTIVITY_MINUTES` | Legitimate interest |
| Auth sessions (expired/revoked) | 7 days after `expires_at` or `revoked_at` | Legitimate interest (security audit) |
| **Password recovery (active)** | **While `expiresAt > now` AND `used_at IS NULL` AND `revoked_at IS NULL`** | **Contract** |
| **Password recovery (used/expired)** | **7 days after `expires_at`, `used_at`, or `revoked_at`** | **Legitimate interest (audit)** |
| Unauthorized attempts | 5 years | Legitimate interest |
| `role_change_logs` | 5 years | Legitimate interest |
| Planning results | Indefinite (no PII) | N/A (anonymised) |
| HTTP access logs | 30 days | Legitimate interest |
| Backups | 7 daily / 4 weekly / 12 monthly (age-encrypted) | Legal / Legitimate interest |

### D.15. Cross-reference for AI context

If this KB is loaded into an AI assistant, the **authoritative GDPR text is `docs/gdpr-policy.md`** (v2.0). Consult the file for the full policy with all articles, article quotations, and detailed justifications. This appendix captures the essential decisions and preserves them in-context.

---

*End of Knowledge Base v2.7 — LaPrizza Master Edition*

*Total sections: 43 + 4 appendices. Consolidated from 40+ source artifacts. English-language authoritative edition. All architectural decisions, client clarifications, business invariants, and technical specifications traceable to §43.*

---

## Revision Notes (v2.5 → v2.6)

The following corrections and additions were made in v2.6. **No existing information was deleted.** Corrections are summarized here.

1. **§1.4 — new invariants 12–16:** (12) DISTINCT `ADMINISTRATOR` role in Sprint 2 (Clarifications #42, #46); (13) password recovery is a first-class aggregate (ADR-016); (14) pending deliveries input (Clarification #37); (15) confirmation dialogues on significant actions (Clarification #39); (16) bounded-context rule (Clarification #46). Invariants 6, 10, 14 extended with references to #37, #38, #42, #46.

2. **§2.1 — role taxonomy reworked:** `UserRole` extended to `{ADMINISTRATOR, MANAGER, EMPLOYEE, CUSTOMER}`. Reconciles the "first Administrator" (bootstrap Manager, #24 §1.1) vs `ADMINISTRATOR` role. Clarification #04 partially superseded for Sprint 2 scope. Added note on application vs system/infrastructure logs (#42). Added Website Administrator persona (§2.2).

3. **§3.1 — Clarification #46 compliance note:** Modular Monolith hosts multiple bounded contexts (allowed); no bounded context split across containers (anti-pattern).

4. **§3.3 — new ports/adapters:** `IRolesAssignmentRepository`, `IStatusAssignmentRepository`, `IPasswordRecoveryStore`, `IExchangeCodeStore`, `SmtpRecoveryMailer`, `PasswordPolicy`.

5. **§4.1 — session/login flow updated:** References `ADMINISTRATOR` for account management; every 403 recorded in `unauthorized_attempts`, admin-consult endpoint per Clarification #42.

6. **§4.8 — planning flow extended (Clarification #37, #44):** `pendingDeliveries[]` and `referenceDate` as inputs; no proposed order before `referenceDate`; stock for day N available by end of N−1; lowest-total-cost selection; multiple suppliers per day; one offer per `(supplier, product)`.

7. **§4.9 (new) — Password Recovery Flow (ADR-016):** Full flow with dedicated `password_recovery` table, token hashing, session revocation on consumption.

8. **§4.10 (new) — Admin consult of denied access logs (Clarification #42, ADR-015):** `GET /admin/unauthorized-attempts` restricted to `ADMINISTRATOR`.

9. **§5 — ADRs updated/added:**
   - ADR-001 updated with Clarification #46 compliance.
   - ADR-004 revised (v2.6 cross-references ADR-016, ADR-017, ADMINISTRATOR role).
   - ADR-005 OpenAPI version bumped to `2.2.0`.
   - ADR-007 folder layout updated (Password Recovery, User Invitations, User Management).
   - ADR-008a entity/repository counts updated (40 + 2 views, 22 repositories).
   - ADR-009 updated (#39 confirmation dialogues, #42 admin-only panels, `API_TIMEOUT_MS`).
   - ADR-012 updated with pendingDeliveries input.
   - ADR-013 updated with pendingDeliveries, referenceDate, end-of-previous-day rule.
   - ADR-015 revised (#42 admin-only application log access).
   - **New ADR-016 (Password Recovery as a Dedicated Aggregate).**
   - **New ADR-017 (User Invitations Lifecycle).**

10. **§6.3 — 36 → 46 clarifications:** Added rows #37–#46. #04 marked as "partially superseded by #42 for Sprint 2". Header updated to 46 clarifications (28 baseline + 8 Sprint 2 round 1 + 10 Sprint 2 round 2).

11. **§7.1 — glossary additions:** ADMINISTRATOR, PasswordPolicy, PasswordRecovery, UnauthorizedAttempts, Application Logs, System/Infrastructure Logs, RolesAssignment, StatusAssignment.

12. **§7.9 — glossary extensions:** PendingDelivery, ReferenceDate, StockAvailabilityRule (End of Previous Day), Significant Action, Connection Failure Timeout, Idempotent Retry.

13. **§8.1 — aggregates now 21:** Added PasswordRecovery (v2.6), RolesAssignment (supporting, v2.6), StatusAssignment (supporting, v2.6). §8.2 added `PasswordPolicy`, `PasswordRecoveryToken` VOs. §8.3 added `User *--> PasswordRecovery`, `User *--> RolesAssignment`, `User *--> StatusAssignment`. §8.4 UserRole extended to 4 values.

14. **§9 — Decision Logs 29–38 added:** 29 (ADMINISTRATOR role), 30 (password recovery dedicated aggregate), 31 (pending deliveries), 32 (confirmation dialogues), 33 (deployment external), 34 (AI01 aggregate recursivity redirect), 35 (SYS04 SPA access), 36 (one supply arrangement per supplier-product), 37 (GDPR redirect), 38 (bounded-context rule). Decision Logs 1, 20, 21, 23, 24, 26 updated with v2.6 notes.

15. **§10.1 — invariants 30–37 added:** (30) ADMINISTRATOR role + audit log access; (31) password recovery single-use + session revocation; (32) planning pendingDeliveries + referenceDate + end-of-previous-day stock rule; (33) one supply arrangement per `(supplier, product)`; (34) only pizzas have BOM permanent; (35) significant actions require confirmation + idempotent retry; (36) admin-only application logs vs system/infra logs; (37) bounded context not split across containers.

16. **§10.2 — `fk_password_recovery_user`, `fk_roles_assignment_user`, `fk_status_assignment_user` added.**

17. **§10.3 — PasswordRecovery, RolesAssignment, StatusAssignment added to cascade matrix.**

18. **§11 — Website Administrator persona added to L1 actors; Prolog remains internal container (unchanged).**

19. **§12 — Administrator added to interactions; Clarification #46 compliance note added; PasswordRecovery and RolesAssignment/StatusAssignment tables added to DB container description.**

20. **§13.1 — `AdminAuditController` added.**

21. **§13.2 — `PasswordRecoveryService`, `RolesAssignmentService`, `StatusAssignmentService` added.**

22. **§13.3 — `PasswordRecoveryDomainService` added; `PasswordRecovery`/`RolesAssignment`/`StatusAssignment` aggregates added to Sprint 2 list.**

23. **§13.4 — `PostgresPasswordRecoveryStore`, `PostgresRolesAssignmentRepository`, `PostgresStatusAssignmentRepository`, `SmtpRecoveryMailer`, `InMemoryExchangeCodeStore` added.**

24. **§13.7 — L4 rationale updated (Clarification #37 references).**

25. **§14.3 — new use cases:** UC16d (Password Recovery Flow), UC16e (Consult Application Access Log). §14.5 added UC16e extension note.

26. **§15.2, §15.3 — references to #37, #40, #41, #43.**

27. **§15.4 — references to #45 (GDPR redirect).**

28. **§16.2 — password_recovery, roles_assignment, status_assignment rows added.**

29. **§17.1 — DDL for password_recovery, roles_assignment, status_assignment added; `chk_user_roles_name` extended with 'ADMINISTRATOR'.** §17.6 updated with #38. §17.8 updated with #37 and #44 notes.

30. **§18.5 (new) — password recovery concurrency pattern** (row-level locking on token + session revocation in same transaction).

31. **§19 — password_recovery, roles_assignment, status_assignment added to ERD summary.**

32. **§20.3 — new indexes:** `idx_password_recovery_username`, `idx_password_recovery_expires_at`.

33. **§21.1 — entity/repository trees expanded** (PasswordRecoveryEntity, RolesAssignmentEntity, StatusAssignmentEntity, PostgresPasswordRecoveryStore, PostgresRolesAssignmentRepository, PostgresStatusAssignmentRepository, PasswordRecoveryMap); `migrations/` extended to 001–021.

34. **§21.2 Migration Inventory** extended with rows 018 (both), 019, 020, 021. **018 numbering collision documented.**

35. **§21.4 unchanged** (014 verbatim); **§21.5 reworked** for v2.6 migrations.

36. **§23 — RBAC matrix:** `/auth/pre_register`, user CRUD, role assignment, role history moved from MANAGER to **ADMINISTRATOR**. New `/admin/unauthorized-attempts` endpoint. Added explanatory note on ADMINISTRATOR vs MANAGER separation.

37. **§24.9 — PlanningExecutionRequestDTO** extended with `referenceDate`, `pendingDeliveries[]` (#37). **§24.10** result example shows non-pizza product + late proposal + referenceDate. **§24.1bis** updated for password recovery per ADR-016 (dedicated table, not reused invitation).

38. **§25.2 — status matrix:** 403 extended to include admin-only endpoint denial; 409 extended to include duplicate `(supplier, product)`; 422 extended to include order date before referenceDate.

39. **§27 — OpenAPI v2.2.0:** new Administration tag; new schemas `UnauthorizedAttemptsPageDTO`; `PlanningExecutionRequestDTO` extended.

40. **§28.3 — test structure extended:** new test files (`password-recovery.spec.ts`, `password-recovery.service.spec.ts`, `roles-assignment.service.spec.ts`, `status-assignment.service.spec.ts`, `admin-audit.controller.spec.ts`, `password-recovery-concurrency.spec.ts`); new Bruno folders (`Password Recovery`, `User Invitations`, `User Management`, `AA05 - Authorization Enforcement`, `AI01-BOM`, `AI02-PLANNING`). `planning.service.spec.ts` extended for pendingDeliveries.

41. **§31.1, §31.3 — Sprint 2 objectives reference #37–#46; new env vars `API_TIMEOUT_MS`, SMTP vars.**

42. **§32.1 — M1 effort increased (8h → 10h) for pendingDeliveries + referenceDate + end-of-previous-day rule.**

43. **§33.3 — Angular notes updated:** ADMINISTRATOR-aware route guards; `ConfirmDialog` for significant actions (#39); `API_TIMEOUT_MS` interceptor (#39); admin-only audit log and user management panels (#42).

44. **§34 — Clarification #31 unchanged (already present).**

45. **§35.4 — Clarifications #28, #30, #36, #37, #41, #44 consolidated.**

46. **§36, §36.5 — env vars** added (`API_TIMEOUT_MS`, `INVITATION_TTL_HOURS`, SMTP vars).

47. **§37.2 (new) — Deployment Workflow (Clarification #40):** external infra option, SSH-from-outside, GitHub Actions Secrets, alternatives.

48. **§40 — Repository File Map updated:** `migrations/` now lists 001–021 (with 018 collision); `orm-migrations/` now lists 10 files; new Bruno folders; `PasswordRecoveryEntity`/`RolesAssignmentEntity`/`StatusAssignmentEntity`/`PasswordRecoveryMap` in entity/mapper trees; `AdminAuditController` in controllers; `SmtpRecoveryMailer` in security; `prolog/planning.pl` in prolog; `frontend/e2e/` Playwright specs; `frontend/src/app/backoffice/`, `frontoffice/`, `shared_components/` (v2.6 layout).

49. **§41 — v2.6 row added.**

50. **§43 — source cross-reference updated:** ADR-016, ADR-017, migrations 018–021, Sprint 2 US Table 1, Clarifications #37–#46.

51. **Appendix A — new endpoints added** (`/admin/unauthorized-attempts`; `/planning/executions` extended inputs; RBAC role corrections for `/auth/pre_register`, user management).

52. **Appendix B — new business rules added** (#37–#46).

53. **Appendix C — new PT↔EN terms added** (ADMINISTRATOR, PasswordRecovery, RolesAssignment, StatusAssignment, PendingDeliveries, ReferenceDate, Significant Action, Connection Failure, Idempotent Retry, Bounded Context).

54. **Appendix D — GDPR updates:** `password_recovery` in Data Inventory (§D.6); Security Measures (§D.7) mentions token-hash storage, session revocation, admin-only application log access; Retention (§D.14) added password_recovery rows; Legal Bases (§D.4) added password recovery under (b) Contract + audit under (f) Legitimate Interests; §D.11 references #37 and #41; §D.15 references Clarification #45 pending.

55. **Revision Notes (this section) added.**

**Preservation Note:** All content from v1.0, v2.0, v2.1, v2.2, v2.3, v2.4, and v2.5 is preserved. Corrections above are surgical and traceable to `client-questions.md` Clarifications #37–#46 and to the corresponding sprint artefacts (`client-questions.md` with Q&As of 06–09 November 2026, `1793836802000-AdministratorRole.ts`, `018_create_password_recovery_table.sql`, `019_create_roles_assignment_table.sql`, `020_create_status_assignment_table.sql`, `021_seed_ai02_data.sql`, `ADR-016-password-recovery.md`, `ADR-017-user-invitations.md`, `ADR-004.2-auth.md`).

---

## v2.7 Consistency Corrections

This pass supersedes only stale repository-map statements from v2.6. The current tree uses `022_predefined_pizza_no_stock.sql` (not a second `018_` migration), `Local.yml` and `Local.json` for Bruno environments, and `procurement_plan.pl` alongside `pizza-BOM.pl`. `AdminAuditController` and pending-delivery execution are now implemented; WEB04 confirmation/retry infrastructure and the other future Sprint 2 surfaces remain documented as target/roadmap items until their source files exist.

## Open Decisions / Known Debt (v2.7)

The following items are explicitly **open** and require team action before Sprint 2 submission:

1. **AI01 aggregate recursivity scope (Clarification #41):** Team must consult the IARTI RUC to determine whether recursive BOM / internally produced aggregates are required for AI01 in Sprint 2. The LaPrizza domain (DB + REST) is unchanged; the decision affects `prolog/planning.pl` only.

3. **GDPR consent versioning (Clarification #45):** Redirected to LAPR5 TP lecturer. The team must obtain the answer and:
   - If versioned history is required → add `consent_records` table or extend `customers` with version columns.
   - If current flag is sufficient → no schema change.
   - Update `docs/gdpr-policy.md` to v2.1 with the decision.

4. **Supplier JSON format:** Pre-existing assumption; the `docs/sg/` guide and OpenAPI should reference the exact format used in `021_seed_ai02_data.sql` (if any). Confirm the seed structure matches the documented format.

5. **`roles_assignment` vs `user_role_assignments` semantics:** Two persistence artefacts now exist. `user_role_assignments` is the historical primary; `roles_assignment` is the v2.6 normalized artefact. Verify the team has a clear migration/deprecation path (or document that both serve distinct purposes: `user_role_assignments` for historical primary; `roles_assignment` for the current normalized state).

6. **`status_assignment` vs `users.status`:** Similar to item 5. The current `users.status` column and the new `status_assignment` table must not diverge. Document the sync policy (or drop one).

7. **`InMemoryExchangeCodeStore` vs production OIDC state store:** The in-memory store is fine for development; production should use a persistent store (Redis or DB table). Document the Sprint 3 plan.

---

*End of v2.6 revision notes.*

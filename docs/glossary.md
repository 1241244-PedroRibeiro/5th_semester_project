# LaPrizza Project — Glossary (Sprint 1 + Sprint 2)

Alphabetically organized concepts drawn from **Part II — System Specification (v1.0)**, **Part III — Sprint 1 User Stories (v1.0)**, **Part IV — Sprint 2 User Stories (v1.0)**, the 28 client clarifications, and the repository's domain model, application code, SQL migrations, tests, and tooling.

> **Scope note:** Part II describes the broader envisioned system. Part III and Part IV specify the functionality required for Sprints 1 and 2 respectively. A concept appearing here does **not** necessarily have to be implemented in the current sprint — implementation status is marked with `[S1]` or `[S2]` tags where relevant.

| Concept | Explanation | Source |
|---|---|---|
| **3D Visualization and Interaction** | Interactive graphics modules for visualizing pizza customization and kitchen operations, using WebGL and Three.js. **Sprint 2 scope:** mandatory Kitchen Visualization (II.3.3.2); optional Build Your Pizza (II.3.3.1). | II §II.3.3; S2 VIS01–VIS07 |
| **AA (Authentication & Authorization)** | Sprint 2 User Story group covering local auth (AA01), external IdP (AA02), role resolution (AA03), session handling (AA04), enforcement (AA05), role assignment (AA06), secure activation (AA07). | S2 §AA |
| **Acceptance Criteria** | Conditions a user story must satisfy before its work is complete. | III §III.2.1; S2 |
| **Access Control** | Restrictions determining which operations an identified user or administrator may perform. | II §II.3.2; III BCK01; S2 AA05 |
| **Activation Invitation** | Single-use, time-limited token issued to a `User` for account activation. Contains `purpose` (local activation, external IdP match, password reset), `expiresAt`, `usedAt`, `revokedAt`. Owned by `User` aggregate (Sprint 2). | S2 AA06, AA07; Clarif. #24 |
| **AI (Artificial Intelligence) Module** | Sprint 2 module covering Prolog Bill of Materials (AI01), Requirements Planning (AI02), ANN study (AI03), IARTI report (AI04), service access (AI05), knowledge base (AI06). | S2 §AI |
| **AI Planning Engine** | The Prolog container that receives JSON payloads from the Back-End and returns BOM or Requirements Planning results. External to the NestJS monolith. | S2 AI05, AI06 |
| **Allergen** | A substance or ingredient associated with a product that may raise food-safety concerns. Maintained in a searchable catalogue (14 EU allergens seeded; configurable). | II §II.3.1.2; III BCK04; Clarif. #08 |
| **API (Application Programming Interface)** | Defined interface through which LaPrizza applications/modules exchange information. | II §II.3; III ARC03 |
| **API Contract** | Machine-readable documentation (OpenAPI 3.0.3) describing resources and operations; must match implementation. | III ARC03; ADR-005 |
| **Application Service** | Application-layer class coordinating a use case, validating inputs, invoking domain behavior and repositories, and returning response data. Examples: `AuthService`, `StockService`, `PlanningService` (S2). | `backend/src/application/**` |
| **Architecture Decision Record (ADR)** | Document recording a significant architectural decision, its context, alternatives, and consequences. Repository maintains ADR-001 through ADR-009. | `docs/sad/03-rationale/` |
| **Argon2id** | Password-hashing algorithm used by `Argon2Hasher`. Configured with 64 MiB memory, 3 iterations, parallelism 1. | ADR-004 |
| **Assembly Order** | Unique relative position assigned to each `PizzaComponentType` indicating assembly sequence. | III BCK07; Clarif. #18 |
| **Authentication** | Verification of registered users through credentials or external identity provider. | III BCK01; S2 AA01, AA02 |
| **Authorization** | Determination of whether an authenticated user may perform an operation, based on roles. | II §II.3.2; III BCK01; S2 AA05 |
| **Automated Testing** | Repeatable tests covering business rules, valid/invalid cases, API behavior, and regressions. | III ARC05; ADR-006 |
| **Back-End** | Application implementing and persisting business functionality, exposed via REST APIs. | III §III.2; BCK* |
| **Backup** | Preserved copy of data supporting recovery after failures. | II §II.3.5; S2 SYS08 |
| **Base Dough** | Pizza Component Type representing dough forming the base; cardinality initially exactly 1. Immutable per Clarif. #18. | II §II.3.1.3; III BCK07 |
| **Base Sauce** | Pizza Component Type for sauce; initially 0..1. Immutable per Clarif. #18. | II §II.3.1.3; III BCK07 |
| **Bearer Token** | Authentication credential supplied as `Authorization: Bearer <token>`. Global `JwtAuthGuard` verifies JWT and loads current user from repository. | `backend/src/presentation/auth.guard.ts` |
| **BCK (Business Capability)** | Sprint 1 user-story group (BCK01–BCK11) covering Users, Customers, Categories, Allergens, Products, Pizza Sizes, Component Types, Size Configurations, Stock, Predefined Pizzas, Catalogue. | Sprint 1 US |
| **BOM (Bill of Materials)** | Calculation (Prolog, AI01) of raw-material quantities required for ordered pizzas, respecting sizes, recipes, consumption, and abstract stock units. Only applies to pizzas (Clarif. #28). | S2 AI01, AI06 |
| **Branching Strategy** | Documented team approach for version-control branches and integration. | III ENG01 |
| **Bruno / OpenCollection** | Git-native API testing client storing requests as `.bru`/`.yml`. Collection at `backend/tests/bruno/LaPrizza`. | ADR-007 |
| **Build Your Pizza** | Optional 3D scenario (II.3.3.1) where a customer selects size and components with visual feedback. | II §II.3.3.1; S2 VIS01 |
| **Business Code** | Human-readable identifier (e.g., `CAT-PIZZA`, `PRD-MOZZ`). Distinct from UUID. | `backend/src/domain/product/Product.ts` |
| **Business Invariant** | Rule that must remain true as data changes (e.g., non-negative stock, unique `(component,size)`). | III BCK08–BCK09; ARC04; S2 |
| **Cardinality Bounds** | `{minimum, maximum}` per `PizzaComponentType`; maximum null = unbounded. Applied to all sizes and both predefined and personalized pizzas (Clarif. #18). | III BCK07; BCK10; Clarif. #18 |
| **Case-Insensitive Uniqueness** | Rule treating names/codes differing only in case as duplicates. Enforced via `LOWER(name)`/`UPPER(code)` unique indexes. | Migration 010 |
| **Catalogue Product** | Item recorded in the product catalogue (sellable, pizza component, or both). | II §II.3.1.2 |
| **Check Constraint** | Database condition rejecting invalid rows. Used for user states, roles, non-negative prices/stock, cardinality bounds, role-flag consistency, and (S2) uniqueness/positive constraint on forecasts and supplier offers. | Migrations 001–013; S2 migration 014 |
| **Cheese** | Pizza Component Type; initially 0..1. Immutable per Clarif. #18. | III BCK07 |
| **Clean/Onion Architecture** | Architectural approach separating Presentation, Application, Domain, Infrastructure. Dependency rule points inward. | ADR-001 |
| **Component Size Configuration** | Per-`(component, size)` configuration defining price and (if stock-controlled) abstract units consumed. Explicit values — no multipliers (Clarif. #13). | II §II.3.1.3; III BCK08 |
| **Composite Key** | Key from multiple columns (e.g., `(user_id, role)`, `(date, product, size)` in S2 forecasts). | Migrations 001, 004; S2 migration 014 |
| **Configuration Rule** | Constraint governing valid pizza composition: cardinalities + applicable size configurations. | II §II.3.1.3; III BCK07–BCK10 |
| **Consumption Forecast** | Named, dated aggregate containing daily sellable-product quantity entries (with optional size for pizzas). Owned by `ForecastEntry` entities. Introduced by S2 WEB07. | S2 WEB07, AI02 |
| **Continuous Integration (CI)** | Automated GitHub Actions workflow installing deps, compiling, running Jest with coverage on Node 20. | `.github/workflows/ci.yml` |
| **Controller** | NestJS presentation class declaring HTTP routes and translating requests into application-service calls. Route decorators express roles, permitted account states, public access, and success codes. | `backend/src/presentation/http/controllers/**` |
| **Customer** | Person whose identity, contact details, addresses, VAT, and consent are managed. Mandatory fields: First Name, Last Name, Phone, Email. Distinct from `User` (Clarif. #02). | II §II.3.1.1; III BCK02; Clarif. #01 |
| **Customer Order** | Customer request with one or more Order Items, progressing through preparation/serving. Modelled but not implemented in Sprint 1/2. | II §II.3.1.5 |
| **Customer Role (`CUSTOMER`)** | Domain role assigned to self-registered customers and to external-IdP first logins (JIT provisioning, Clarif. #27). Employees also holding `CUSTOMER` require an associated `Customer` record. | S2 AA03, AA06; Clarif. #27 |
| **Data Integrity** | Preservation of valid, consistent business data, including identifiers, uniqueness, and domain rules. | III ARC04 |
| **Data Mapper** | Adapter translating between database rows and domain objects. | `backend/src/infrastructure/persistence/mappers/**` |
| **Data Protection** | Handling of personal data and consent per GDPR. | II §II.3.6; S2 GDP |
| **Database Index** | Structure supporting lookups or uniqueness. Uses expression indexes for `LOWER(name)`/`UPPER(code)`. | Migrations 005, 010; S2 migration 014 |
| **Database Migration** | Numbered SQL script creating/evolving schema. Baseline `1793145600000-InitialSchema.ts` (TypeORM). | Migrations |
| **Default Pizza Configuration** | Initial set of Pizza Components associated with a Predefined Pizza, used as a starting point for customization. | II §II.3.1.3; III BCK10 |
| **Dependency Injection (DI)** | NestJS mechanism supplying collaborators via provider tokens. Repository and security interfaces connect to implementations via tokens. | `backend/src/presentation/*.module.ts` |
| **Deployment** | Installation and operation of components in a reproducible environment. | II §II.3.5; S2 SYS01 |
| **Dietary Restriction** | Customer-recorded intolerance compared with product/pizza allergens. Non-blocking (warnings only, Clarif. #16). Attached to `User` (Clarif. #27). | II §II.3.1.1; III BCK02 |
| **Direct Selling Price** | Price assigned to a product for direct sale, independent of size-dependent component prices (Clarif. #16). | `backend/src/domain/product/Product.ts` |
| **DTO (Data Transfer Object)** | Object encapsulating data between layers, preventing domain entities from being exposed over REST. | `backend/src/application/**/DTOs` |
| **Docker / Docker Compose** | Container tooling to build/run back-end, frontend, and PostgreSQL together. Multi-stage Alpine images. | `docker-compose.yml` |
| **Domain Error** | Business-rule exception represented by `DomainError` and subclasses. Global filter maps base to HTTP 400; subclasses carry 404/409/422. | `backend/src/domain/common/DomainError.ts` |
| **Domain Model** | Technical UML model of LaPrizza business concepts, relationships, and constraints. | II §II.3.1.7; III ARC01 |
| **Domain-Driven Design (DDD)** | Modeling approach using entities, value objects, aggregates, and business invariants. | `backend/src/domain/**` |
| **Endpoint** | Addressable REST resource/operation exposed by the Back-End. | III ARC03 |
| **Entity** | Domain object with identity and behavior. | `backend/src/domain/**` |
| **Environment Configuration** | Runtime settings via env vars / `.env` loading. Includes HTTP port, DB connection, JWT secret, invitation TTL (`INVITATION_TTL_HOURS`), OIDC client credentials (S2). | `app.module.ts`; `.env.example` |
| **External Identity Provider (IdP)** | OIDC/OAuth 2.0 provider (Google, Microsoft, Auth0, Keycloak — Clarif. #25) used for external authentication (AA02). | S2 AA02 |
| **External IdP Subject** | Stable `sub` claim from an OIDC IdP, stored on `User` as `externalIdpSubject` to correlate external identities to internal accounts. | S2 AA02; Clarif. #27 |
| **Express** | HTTP server framework used through NestJS's Express platform adapter. | `package.json` |
| **Fulfillment Status** | (Modelled) state of an order item through preparation stages. | II §II.3.1.5 |
| **GDP (GDPR)** | Sprint 2 user-story group for personal data handling (GDP01), processing responsibility (GDP02), breach handling (GDP03). | S2 §GDP |
| **GitHub Repository** | Version-controlled project repository with sprint submission tags. | III ENG01 |
| **Global Exception Filter** | NestJS `APP_FILTER` translating exceptions into `{error:{message}}` responses. HTTP 401 responses advertise Bearer auth. | `global_exception.filter.ts` |
| **Guard** | NestJS request check before controller. Auth, Role, and Status guards check metadata + current user. Public-route metadata bypasses auth. | `auth.guard.ts`, `roles.guard.ts`, `UserStatus.guard.ts` |
| **HTTP Method** | Operation type chosen per REST semantics (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`). | III ARC03; ADR-005 |
| **HTTP Status Code** | Response code per RFC semantics. | III ARC03 |
| **IART (IARTI)** | Curricular unit providing Prolog AI content (BOM, Requirements Planning, ANN study). | S2 §AI |
| **Identity and Access Management** | System capability for identifying, authenticating, and enforcing roles. | II §II.3.2; III BCK01; S2 AA |
| **Integration Test** | Test exercising collaborating components through a broader boundary (e.g., Supertest against in-memory Nest app). | `tests/integration/**` |
| **Jest / ts-jest** | Automated testing framework. Config discovers `.spec.ts`/`.test.ts` and supports coverage. | `jest.config.js` |
| **JSON Web Token (JWT)** | Signed authentication token with user identity + roles. Lifetime 15 minutes. Guards re-read roles from repository to reflect revocation. | ADR-004 |
| **Junction Table** | Many-to-many association table (e.g., `product_allergens`, `user_roles`). | Migrations |
| **Kitchen Configuration** | Aggregate holding a JSON layout for the 3D kitchen viewer. Fields: `id`, `name`, `jsonContent`, `isActive`. Exactly one active configuration at a time. | S2 WEB06, VIS02 |
| **Kitchen Resource** | (Modelled) limited-capacity resource required for preparation activities. Scheduling deferred to Sprint 3. | II §II.3.1.6 |
| **Kitchen Visualization** | 3D representation of planned/active preparation work, resources, timing, states. **Mandatory** in S2 SGRAI (II.3.3.2). | II §II.3.3.2; S2 VIS |
| **Kiosk / Anonymous Customer** | Business scenario where an order is placed without persistent customer/user record. No merging with later registrations (Clarif. #01). | Clarif. #01–#02 |
| **LaPrizza** | Fictional modern pizza restaurant acting as the client in the project. | II §§II.2–II.3 |
| **Makefile** | Command entry point wrapping Docker Compose tasks. | `Makefile` |
| **MANAGER role** | Domain role with full administrative rights: users, roles, catalogues, taxonomy, stock, kitchen configurations, forecasts, supplier scenarios, planning execution. Per Clarif. #24 §1.1 first Manager is created at install. | III BCK01; S2 AA06 |
| **MBCO (Minimum Business Continuity Objective)** | Measurable minimum service capability and max downtime during disruption. | S2 SYS07 |
| **Modular Monolith** | Back-End packaged as one application with NestJS modules grouping business capabilities. | `app.module.ts` |
| **Money** | Value object: non-negative `BigDecimal` amount with normalized currency (default EUR). Rejects cross-currency arithmetic. | `Money.ts` |
| **NestJS** | TypeScript Back-End framework for modules, controllers, DI, guards, filters. | `package.json` |
| **Node.js / npm** | JavaScript runtime and package tooling. Docker/CI target Node 20. | `Dockerfile` |
| **OIDC (OpenID Connect)** | Authentication layer on top of OAuth 2.0 for external IdPs. AA02 mandates OIDC/OAuth 2.0 or equivalent. | S2 AA02 |
| **OpenAPI** | Machine-readable API specification at `docs/api/openapi.yaml` (OpenAPI 3.0.3). | ADR-005 |
| **Order Item** | Individual item in a customer order, referencing a sellable product or a personalized pizza snapshot. | II §II.3.1.5 |
| **Order Status** | State tracking an order through lifecycle stages. | II §II.3.1.5 |
| **Pagination** | Bounded retrieval via page number/size. `PageRequest` starts at page 1, default 20, cap 100. | `Pagination.ts` |
| **Parameterized SQL Query** | SQL using `$1` placeholders instead of inline values. Used by repositories. | `Postgres*Repository.ts` |
| **Persistence** | Long-term storage with consistency between relationships and domain rules. | III ARC04 |
| **Personalized Pizza** | Order-specific pizza configuration, possibly from-scratch (Clarif. #01 Q10). Modelled but not implemented in Sprint 1/2. | II §II.3.1.3 |
| **pg / Connection Pool** | Node.js PostgreSQL driver and reusable pool. | `connection.ts` |
| **Pizza Component** | Existing `Product` designated for pizza use; assigned exactly one `PizzaComponentType`. | II §II.3.1.3; III BCK05 |
| **Pizza Component Type** | Configurable classification with assembly order and min/max cardinality. | II §II.3.1.3; III BCK07 |
| **Pizza Composition** | Domain object validating selected component list against types. | `PizzaComposition.ts` |
| **Pizza Configuration** | Selection of Pizza Size + components determining price, allergens, consumption. | II §II.3.1.3 |
| **Pizza Pricing** | Rule: sum of component prices for selected size. No base price/markup. | Clarif. #01, #05 |
| **Pizza Size** | Commercial size tier (Small/Large/...). Configurable (Clarif. #20). | II §II.3.1.3; III BCK06 |
| **Planning Result** | Immutable output of BOM or Requirements Planning. Contains snapshots of forecast, supplier scenario, stock; daily requirements; purchase proposals; unmet needs. Never mutates stock. | S2 AI01, AI02, AI05; Clarif. #26, #28 |
| **Planning Execution** | A single run of a planning calculation against a snapshot. Persisted as `PlanningResult`. | S2 AI05 |
| **PostgreSQL** | Relational database using SQL migrations, UUIDs, FKs, checks, views. | ADR-003 |
| **Predefined Pizza** | Sellable `Product` with valid default composition. Pricing derived (Clarif. #01, #05). Cannot also be `isPizzaComponent` (Clarif. #11). | II §II.3.1.3; III BCK10 |
| **Preparation Activity** | (Modelled) task required to prepare an ordered item. Scheduling deferred to Sprint 3. | II §II.3.1.6 |
| **Product** | Any item handled by LaPrizza. Roles: sellable and/or pizza component; stock-controlled is orthogonal. | II §II.3.1.2; III BCK05; Clarif. #06 |
| **Product Role Invariant** | `(isSellable ∨ isPizzaComponent)`; stock-controlled additional; component requires type, non-component must not have one. | `Product.ts`; Clarif. #06 |
| **Prolog** | Language for the AI Planning Engine (BOM + Requirements Planning). | S2 AI01, AI02 |
| **PrologHttpClient** | Back-End infrastructure adapter calling the Prolog container over HTTP/JSON. | S2 AI05, AI06 |
| **Proof of Concept** | Initial prototype demonstrating feasibility. | II §II.2 |
| **Reconstitution** | Rebuilding a domain object from persisted state while preserving identity. | `UserMap.ts` |
| **Referential Integrity** | Changes/deletions cannot invalidate references. | III BCK02–BCK05; ARC04 |
| **Replenishment** | Increase in available stock for a stock-controlled product. | II §II.3.1.4 |
| **Replay (Planning)** | Re-execution of a past planning using its original snapshot dataset, marked `isReplay = true`. | S2 AI02; Clarif. #28 §3 |
| **Repository** | Contract for loading/saving aggregates; implemented by infrastructure adapters. | `IPostgresRepository` and `Postgres*Repository.ts` |
| **Requirements Planning** | Prolog module computing daily material requirements from forecasts, selecting suppliers from confirmed scenarios, and producing a plan with unmet needs. | S2 AI02 |
| **REST API** | Web interface exposing business capabilities using resources, HTTP methods, and response codes. | III ARC03; ADR-005 |
| **Result** | Success/failure wrapper in domain factories. | `Result.ts` |
| **Role** | Assignment distinguishing user responsibilities and permitted operations. Fixed set: `{MANAGER, EMPLOYEE, CUSTOMER}` (Clarif. #03, #25). | III BCK01; S2 AA06 |
| **Role Change Log** | Append-only audit of role changes: actor, target, previous/new roles, timestamp, reason. | S2 AA06; Clarif. #24 |
| **Role-Based Access Control (RBAC)** | Authorization using `MANAGER`, `EMPLOYEE`, `CUSTOMER`. `RolesGuard` accepts requests when the user has any required role. Tabela 1 (S2) is authoritative. | `roles.guard.ts`; S2 Table 1 |
| **Row-Level Locking** | `SELECT ... FOR UPDATE` used for stock adjustments to serialize concurrent consumption. | ADR-008b |
| **SGRAI** | Curricular unit covering 3D web graphics (WebGL/Three.js). | S2 VIS |
| **Snapshot** | Deep-copied subset of aggregate state, preserved in `PlanningResult` for immutable provenance. | S2 AI05, AI06 |
| **SPA (Single-Page Application)** | Angular application loading once and exchanging JSON with the Back-End. | ADR-009 |
| **SprInt 1 / Sprint 2 tags** | Git tags `sprint-1-submission`, `sprint-2-submission` identifying exact submitted versions. | III ENG01; S2 |
| **SQL View** | Named query exposing derived data. `v_catalogue_products`, `v_predefined_pizza_details` compute prices and availability at query time. | Migration 006 |
| **Stock Consumption** | Number of abstract units needed for a component at a size; sufficient iff `currentBalance ≥ stockUnitsConsumed × recipeQuantity`. | Migration 004; Clarif. #01 Q5 |
| **Stock Control** | Tracking quantities for products marked stock-controlled. Stock state is orthogonal to `active` (Clarif. #10) and to plan calculations (Clarif. #26). | II §II.3.1.4; III BCK09 |
| **Stock Item** | Balance + movements aggregate for a stock-controlled product. | Migration 005 |
| **Stock Movement** | `INCREASE`/`DECREASE` with amount, reason, timestamp. Optional audit in Sprint 1 (Clarif. #15). | Migration 005 |
| **Stock Unit** | Abstract, product-specific normalized unit. | II §II.3.1.4 |
| **Supplier** | Named entity inside a `SupplierScenario`; offers linked by `supplierId`. | S2 WEB07 |
| **Supplier Offer** | Per `(supplier, product)` offer with `priceEUR`, `stockUnitQuantity`, integer `leadTimeDays`, optional `dailySupplyLimit`. | S2 WEB07, AI06; Clarif. #28 |
| **Supplier Scenario** | Confirmed set of suppliers + offers used for planning. `isSimulated` flag captures manual/LLM origin. | S2 WEB07, AI06 |
| **SYS** | Sprint 2 user-story group: automated deployment, network access, allowed endpoints, shared folder, shell access, operational risk, MBCO, backup. | S2 §SYS |
| **Three.js** | JS library for 3D visualization (WebGL 2). | S2 VIS01 |
| **Topping** | Pizza Component Type; 0..∞. Immutable per Clarif. #18. | III BCK07 |
| **Transaction** | Database unit of work: `COMMIT` or `ROLLBACK`. Stock adjustments group row locking, validation, balance, movement insert. | `PostgresStockRepository.ts` |
| **TypeScript / tsc / tsx** | Back-End language and tooling. | `package.json` |
| **Unified Email** | Same email used for `User` (auth) and `Customer` (contact) in registered accounts. | Clarif. #16 |
| **Unique Identifier** | Value distinguishing each entity (User, Customer, Category, Allergen, Product). UUID + business code combination. | Clarif. #20 |
| **Unit Test** | Focused automated test of a class with controlled collaborators. | `tests/unit/**` |
| **User** | System identity: credentials, name, email, lifecycle, roles, dietary restrictions, invitations. Distinct from `Customer`. | `User.ts`; Clarif. #02 |
| **User Story** | Stakeholder-focused behavior statement with acceptance criteria. | III §III.2.1; S2 |
| **UUID** | Identifier format used for entities; business codes are separate. | Migration 003 |
| **Validation Rule** | Condition checked before accepting input or modifying business information. | BCK02–BCK09; ARC03 |
| **Value Object** | Domain type representing a validated value, immutable. Examples: `Money`, `Email`, `CardinalityBounds`, `ForecastSnapshot`. | `ValueObject.ts` |
| **Version Control System (VCS)** | Tool for tracking project changes; GitHub required. | III ENG01 |
| **WEB** | Sprint 2 user-story group: SPA setup (WEB01), layout & navigation (WEB02), role-based navigation (WEB03), feedback & validation (WEB04), Sprint 1 pages (WEB05), kitchen config page (WEB06), AI config page (WEB07). | S2 §WEB |
| **Web Application** | Main interface exposing business capabilities, integrating 3D and AI modules. | II §II.3.2 |
| **WebGL** | Browser graphics tech required for 3D modules. Sprint 2 uses WebGL 2. | II §II.3.3 |
| **Web07 Forecast Execution** | Triggering AI02/BOM from the SPA, obtaining and consulting results. Editing a forecast does not change earlier results (snapshots). | S2 WEB07, AI05 |
| **WebGL 2** | Modern WebGL version required by Three.js and used in Sprint 2. | S2 VIS01 |

## Source documents

- **II:** *PART II — System Specification*, v1.0 (2026/27)
- **III:** *PART III — Sprint 1 — User Stories*, v1.0 (2026/27)
- **IV:** *PART IV — Sprint 2 — User Stories*, v1.0 (2026/27)
- **Clarif. #NN:** Client clarifications (`docs/domain/client-questions.md`)
- **ADR-NNN:** Architecture Decision Records (`docs/sad/03-rationale/`)
- **Repo:** Implementation artifacts under `backend/src/`, `frontend/`, `docs/`, `tests/`

For implementation details, prefer executable code and configuration over older architectural descriptions; a SQL table or documented endpoint alone does not establish an implemented API capability.
# Component Architecture & Structural Design — LaPrizza Back-End (C4 Level 3)

**Version:** 2.0 (unifies Sprint 1 baseline + Sprint 2 additions)
**Scope:** Internal anatomy of the LaPrizza Back-End Modular Monolith Container.
**Companion diagrams:** `component-diagram-l2.puml` (Container) and `component-diagram-l3.puml` (Component).

---

## 1. Framing within the C4 Model

This document anchors the LaPrizza architecture at **C4 Level 3**, zooming into the **Back-End Modular Monolith** identified at Level 2:

- **Level 1 — System Context** (`component-diagram-l1.puml`): `Customer`, `Restaurant Manager`, `Restaurant Employee` interacting with the LaPrizza Information System.
- **Level 2 — Container** (`component-diagram-l2.puml`): SPA (Angular), 3D Canvas (Three.js), Back-End Monolith (NestJS), AI Planning Engine (Prolog), PostgreSQL, plus external IdP and Email provider.
- **Level 3 — Component** (this document + `component-diagram-l3.puml`): the Back-End's controllers, application services, domain core, repository ports, PostgreSQL adapters, and external adapters (OIDC, Prolog, SMTP).

Clean/Onion Architecture and Hexagonal Ports & Adapters remain the architectural spine (ADR-001). Every Sprint 2 addition respects the same dependency rule: **source-code dependencies point inward toward the domain**.

---

## 2. Layer inventory — Sprint 1 + Sprint 2

### 2.1. Presentation & Delivery Layer (Driving Adapters)

| Group | Controller | Sprint | Purpose |
|---|---|---|---|
| Auth | `AuthController` | S1 | Local login/registration (BCK01) |
| Auth | `ExternalAuthController` | **S2** | OIDC login/callback (AA02) |
| Auth | `ActivationController` | **S2** | Invitation consumption (AA06, AA07) |
| Auth | `UserController` / `BackofficeUsersController` | S1 (+S2 role audit) | User CRUD, role assignment |
| Customer | `CustomerController` | S1 | Customer profile (BCK02) |
| Catalogue | `CategoryController`, `AllergenController`, `ProductController` | S1 | BCK03–BCK05 |
| Pizza Taxonomy | `PizzaSizeController`, `PizzaComponentTypeController`, `ComponentSizeConfigurationController` | S1 | BCK06–BCK08 |
| Stock | `StockController` | S1 | BCK09 |
| Predefined Pizza | `PredefinedPizzaController` | S1 | BCK10 |
| Catalogue Query | `CatalogueController` | S1 | BCK11 |
| Kitchen | `KitchenConfigurationController` | **S2** | WEB06 — kitchen JSON config CRUD + activate |
| AI Planning | `ConsumptionForecastController` | **S2** | WEB07 — daily consumption forecasts CRUD |
| AI Planning | `SupplierScenarioController` | **S2** | WEB07 — supplier JSON import + confirm |
| AI Planning | `PlanningController` | **S2** | AI05 — trigger BOM / Requirements Planning |
| AI Planning | `ProductExportController` | **S2** | WEB07 — product JSON export for planning |

**Rule:** controllers remain thin — extract HTTP inputs, invoke a single application service, serialize output DTOs. No business rules, no ORM calls.

### 2.2. Application Services Layer (Use Cases)

| Group | Service | Sprint | Responsibility |
|---|---|---|---|
| Identity | `AuthService` | S1 | Password verification + JWT issue |
| Identity | `ExternalAuthService` | **S2** | OIDC Authorization-Code+PKCE, JIT provisioning, `externalIdpSubject` mapping |
| Identity | `ActivationInvitationService` | **S2** | Invitation creation, TTL, single-use, email dispatch |
| Identity | `UserService` | S1 | CRUD, role assignment, ≥1 active Manager invariant |
| Identity | `RoleAuditService` | **S2** | Append-only writes to `RoleChangeLog` |
| Customer | `CustomerService` | S1 | Profile, addresses, dietary restrictions |
| Catalogue | `CategoryService`, `AllergenService`, `ProductService` | S1 | BCK03–BCK05 |
| Taxonomy | `PizzaSizeService`, `PizzaComponentTypeService`, `ComponentSizeConfigurationService` | S1 | BCK06–BCK08 |
| Stock | `StockService` | S1 | Replenish/consume with pessimistic locking |
| Pizza | `PredefinedPizzaService` | S1 | Recipes + cardinality validation |
| Query | `CatalogueQueryService` | S1 | Composite read (product + recipe + price + availability) |
| Kitchen | `KitchenConfigurationService` | **S2** | JSON validation, single-active invariant, activation transaction |
| AI Planning | `ConsumptionForecastService` | **S2** | Forecast CRUD, active-reference validation, immutability of prior runs |
| AI Planning | `SupplierScenarioService` | **S2** | JSON import/validate/confirm; per-offer daily supply limits |
| AI Planning | `PlanningService` | **S2** | Orchestrates snapshot capture → Prolog HTTP call → PlanningResult persistence |
| AI Planning | `ProductExportService` | **S2** | Exports products as JSON for AI06 knowledge base build |

**Rule:** services orchestrate transactions and cross-aggregate coordination, delegate domain logic to the domain layer, and never leak HTTP or persistence types.

### 2.3. Domain Core Layer

**Sprint 1 aggregates (unchanged):**
`User`, `Customer`, `ProductCategory`, `Allergen`, `Product`, `PizzaSize`, `PizzaComponentType`, `ComponentSizeConfiguration`, `StockItem`, `PredefinedPizza`.

**Sprint 2 aggregates (new):**
- `KitchenConfiguration` — root; holds `jsonContent` (opaque, validated by domain service), `isActive`.
- `ConsumptionForecast` — root; owns `ForecastEntry` entities.
- `SupplierScenario` — root; owns `Supplier` and `SupplierOffer` entities.
- `PlanningResult` — root; owns immutable snapshots (`ForecastSnapshot`, `SupplierScenarioSnapshot`, `StockSnapshot`) plus `DailyRequirement`, `PurchaseProposal`, `UnmetNeed` VOs.
- `RoleChangeLog` — root; append-only audit trail.

**Sprint 2 modifications to Sprint 1:**
- `User` now owns optional `externalIdpSubject` and `List<ActivationInvitation>`, and `passwordHash` becomes optional (external-only accounts).
- `Product` gains `stockUnitsPerSale : Integer [0..1]` — required by AI02 when `isStockControlled ∧ isSellable`.

**Domain Services:**
- `PricingDomainService` (S1) — sum of `ComponentSizeConfiguration.price` per recipe line, per size.
- `StockAvailabilityDomainService` (S1) — `currentBalance ≥ stockUnitsConsumed × recipeQuantity` per component.
- `KitchenConfigValidationService` (S2) — validates kitchen JSON (schema, refs, active-configuration invariants).
- `PlanningSnapshotDomainService` (S2) — captures deep-copied inputs for read-only replay of historical results.

**Rules (unchanged):** aggregate roots only, external references by identity, no bidirectional associations, value objects immutable.

### 2.4. Infrastructure & Persistence Layer (Driven Adapters)

**Sprint 1:** 11 `Postgres*Repository` adapters + `Argon2Hasher` + `JwtTokenService`.

**Sprint 2 additions:**
- 6 new repository adapters: `PostgresKitchenConfigurationRepository`, `PostgresConsumptionForecastRepository`, `PostgresSupplierScenarioRepository`, `PostgresPlanningResultRepository`, `PostgresActivationInvitationRepository`, `PostgresRoleChangeLogRepository`.
- 3 new external adapters: `OidcClient` (via `openid-client`), `PrologHttpClient` (HTTP fetch to Prolog container), `SmtpEmailAdapter` (invitation dispatch).

All are wired through NestJS provider tokens implementing domain-defined ports. Test doubles (`InMemory*Repository`) mirror the same contracts.

---

## 4. Rationale — why each Sprint 2 component exists

### 4.1. KitchenConfiguration module (WEB06, VIS02, VIS03)

- **Why an aggregate:** kitchen layouts are a first-class asset with lifecycle (create/import/edit/activate/delete) and a global invariant ("exactly one active"). Persisting as JSONB under PostgreSQL 16 lets the aggregate stay **opaque** — the domain does not need to know geometry, textures, or model URLs.
- **Why separate from `KitchenResource`:** `KitchenResource` (S1, modelled) is a runtime *kitchen operational* concern; `KitchenConfiguration` is a *design-time layout* concern. Keeping them separate avoids polluting the operational aggregate with layout data.
- **Validation:** performed by `KitchenConfigValidationService` (a `Pure Fabrication` per GRASP). Syntax, unique object identifiers, valid dimension/scale ranges, and asset-reference resolution are non-trivial and belong to a dedicated domain service, not to the aggregate root.

### 4.2. AI Planning module (WEB07, AI01, AI02, AI05, AI06)

The planning module is **one bounded context with three aggregates plus a read-only result aggregate**:

- **`ConsumptionForecast`** — input data; mutable (WEB07 explicitly allows editing), but immutability of prior results is guaranteed because `PlanningResult` snapshots the forecast at execution time.
- **`SupplierScenario`** — input data; explicitly confirmed by Manager before use (AI06). Offers scoped per `(supplier, product)` with optional `dailySupplyLimit` (Clarification #28).
- **`PlanningResult`** — **read-only** output. It never mutates stock (Clarification #26), never creates purchase orders (Sprint 2 scope), and preserves full provenance (forecast + supplier + stock snapshot + `isReplay` flag for historical reproduction).
- **`PlanningService`** orchestrates three steps: (1) capture `StockSnapshot` + snapshots via `PlanningSnapshotDomainService`; (2) call `PrologHttpClient` with the constructed input JSON; (3) persist the resulting `PlanningResult`. It is a `Pure Fabrication` — no business rules live here.

**Why Prolog is external:** the AI engine is a distinct runtime container (IART deliverable). Keeping it out of the Node.js process preserves the Clean Architecture boundary — the Back-End calls it via HTTP, not via embedded scripting.

**Stock units per sale (Product extension):** AI02 needs explicit consumption for sellable + stock-controlled products. The absence of `stockUnitsPerSale` **fails the calculation with a clear error** (Clarification #28 §2) — it is *not* silently assumed to be 1.

### 4.3. Enhanced Auth module (AA01–AA07)

- **`ExternalAuthService` + `OidcClient`:** AA02 mandates OIDC/OAuth 2.0. The `OidcClient` adapter wraps `openid-client`; the service handles JIT provisioning (Clarification #27: external first-login → `ACTIVE` immediately, no invitation required).
- **`ActivationInvitationService` + `ActivationInvitation`:** AA06/AA07 require invitations with TTL, single-use, previous-invitation-invalidation, and retry-on-email-failure. Modelling `ActivationInvitation` as an **entity inside `User`** keeps the invitation lifecycle bound to the user — its cardinality is bounded (typically ≤1 active) and never grows unbounded. If the audit requirement pushed it, it would become its own aggregate (see §4.4).
- **`RoleAuditService` + `RoleChangeLog`:** AA06 ("Role changes audited") + Clarification #24 §1.4 require persistent history of role changes with actor, target, previous/next roles, timestamp. **Separate aggregate** — append-only, never mutated, queried by `targetUsername` or `actorUsername` (used by the "history" page requested in Clarification #24 §1.4). Keeping it out of `User` avoids loading large histories on every `User` retrieval.

### 4.4. Boundary choices — what was deliberately *not* added

| Considered | Rejected because |
|---|---|
| `PurchaseOrder` aggregate | Clarification #26 — Sprint 2 plans are read-only; `PurchaseProposal` VO inside `PlanningResult` is enough. |
| Aggregates decomposition (`RawMaterial`, `Aggregate`) | Clarification #28 §1.1 — BOM only applies to pizzas; other products are individual. |
| `KitchenLayout` as a separate aggregate from `KitchenConfiguration` | Redundant; the JSON *is* the layout. |
| `Audit` aggregate as separate top-level bounded context | Overkill for current scope; `RoleChangeLog` alone suffices (Sprint 2). |
| External-IdP-specific `User` subclasses | `externalIdpSubject` + optional `passwordHash` on the existing `User` avoids a subclass explosion and preserves the multi-role invariant. |

### 4.5. Traceability matrix

| US | Container (L2) | Controllers (L3) | Services (L3) | Domain (L3) | Repos / Adapters |
|---|---|---|---|---|---|
| **BCK01 / AA01** | Backend | `AuthController` | `AuthService` | `User`, `PasswordHash` | `IUserRepository`, `Argon2Hasher`, `JwtTokenService` |
| **AA02** | Backend + IdP | `ExternalAuthController` | `ExternalAuthService` | `User.externalIdpSubject` | `OidcClient` |
| **AA03 / AA05** | Backend | all protected controllers | guards + `UserService` | role set | `IUserRepository` |
| **AA06 / AA07** | Backend + Email | `ActivationController`, `BackofficeUsersController` | `ActivationInvitationService`, `RoleAuditService` | `ActivationInvitation`, `RoleChangeLog` | `IActivationInvitationRepository`, `IRoleChangeLogRepository`, `SmtpEmailAdapter` |
| **WEB05 (S1 pages)** | Backend | all S1 controllers | all S1 services | all S1 aggregates | all S1 repositories |
| **WEB06 / VIS02 / VIS03** | Backend + Three.js | `KitchenConfigurationController` | `KitchenConfigurationService` | `KitchenConfiguration` | `IKitchenConfigurationRepository`, `KitchenConfigValidationService` |
| **WEB07** | Backend | `ConsumptionForecastController`, `SupplierScenarioController`, `ProductExportController` | `ConsumptionForecastService`, `SupplierScenarioService`, `ProductExportService` | `ConsumptionForecast`, `SupplierScenario`, `Product.stockUnitsPerSale` | `IConsumptionForecastRepository`, `ISupplierScenarioRepository`, `IProductRepository` |
| **AI01 / AI02 / AI05 / AI06** | Backend + Prolog | `PlanningController` | `PlanningService` | `PlanningResult`, snapshots | `IPlanningResultRepository`, `PrologHttpClient`, `PlanningSnapshotDomainService` |
| **AI03 / AI04** | — | — | — | — | (document-only deliverables) |
| **GDP01–GDP03** | Backend | (existing GDPR endpoints) | `CustomerService` + policy docs | `Customer`, `ConsentPreferences` | `ICustomerRepository` |

---

## 5. Non-responsibilities of the Back-End Container

To keep the boundary crisp, the Back-End explicitly **does not**:

- Render 3D content (Three.js lives in the browser).
- Execute Prolog logic (invoked externally via `PrologHttpClient`).
- Store or process credentials of external IdPs (only `externalIdpSubject` is stored).
- Persist purchase orders (Sprint 2 has `PurchaseProposal` as a read-only VO only).
- Mutate stock from planning calculations (Clarification #26).

These are all cross-container boundaries that preserve the Modular Monolith's cohesion and testability.
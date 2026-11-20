# Domain Model Analysis & Architectural Rationale — LaPrizza

**Version:** 3.1 (Unified Sprint 1 + Sprint 2, corrected to enforce Business Keys, plus Clarifications #29–#36)
**Companion diagram:** `domain-model.puml` (PlantUML, 17 aggregates + shared kernel)

---

## 1. Scope and DDD Foundations

The LaPrizza Domain Model formalizes the business concepts, relationships, invariants, and aggregate boundaries that the Back-End container realizes. It adheres strictly to Domain-Driven Design (DDD) tactical patterns (refer to Knowledge Base §3) and serves as the direct blueprint for the domain classes implemented under `backend/src/domain/**`.

The decomposition of the domain into aggregates follows four fundamental rules:
1. **One consistency boundary per aggregate** — ACID guarantees apply *inside* the boundary; eventual consistency (BASE) applies *between* boundaries.
2. **External references by identity only** — aggregates never hold direct object references to other aggregates. They reference them exclusively by their **Business Identifiers** (e.g., `Sku`, `Username`, `Email`), never by internal technical IDs or database row identifiers. This preserves the Ubiquitous Language and prevents the leakage of persistence concerns into the domain logic.
3. **Rich domain model** — entities are not mere data structures. They encapsulate behavior, and invariants are strictly enforced in constructors, factories, and mutation methods.
4. **Immutable value objects** — every Value Object (VO) is fully constructed, self-validating, and immutable. Operations that alter a VO return a new instance.

---

## 2. Aggregates — Sprint 1 + Sprint 2

### 2.1. Sprint 1 Baseline (unchanged)

| Aggregate | Root | Responsibility |
|---|---|---|
| **User** | `User` | Credentials, roles, dietary restrictions, lifecycle (`BCK01`). **Extended in S2** (see §3.1). |
| **Customer** | `Customer` | Profile, contact info, addresses, VAT, consent (`BCK02`). |
| **ProductCategory** | `ProductCategory` | Taxonomy for products (`BCK03`). |
| **Allergen** | `Allergen` | EU allergen catalogue (`BCK04`). |
| **Product** | `Product` | Master catalogue item with roles/stock flag/pricing (`BCK05`). **Extended in S2** (see §3.2). |
| **PizzaSize** | `PizzaSize` | Commercial size tiers (`BCK06`). |
| **PizzaComponentType** | `PizzaComponentType` | Structural role + cardinality (`BCK07`). |
| **ComponentSizeConfiguration** | `ComponentSizeConfiguration` | Per-`(component,size)` price and consumption (`BCK08`). |
| **StockItem** | `StockItem` | Balance + movements (`BCK09`). |
| **PredefinedPizza** | `PredefinedPizza` | Standard recipes + dynamic price (`BCK10`). **Refined in S2** (see §3.3). |

### 2.2. Sprint 2 Additions

| Aggregate | Root | Responsibility | Introduced by |
|---|---|---|---|
| **KitchenConfiguration** | `KitchenConfiguration` | Opaque JSON layout + active-flag invariant. Identified by `ConfigurationName`. | WEB06, VIS02, VIS03 |
| **ConsumptionForecast** | `ConsumptionForecast` | Daily sellable-product consumption forecasts (owns `ForecastEntry`). Identified by `ForecastName`. **Covers non-pizza products too** (see §4.27). | WEB07, AI02 |
| **SupplierScenario** | `SupplierScenario` | Supplier + offers confirmed for planning (owns `Supplier`, `SupplierOffer`). Identified by `ScenarioName`. Offers are **indivisible lots**. | WEB07, AI06 |
| **PlanningResult** | `PlanningResult` | Immutable outcome of a BOM or Requirements Planning execution, with snapshots. Identified by `executionId` (internal sequence). Proposals carry **late-delivery metadata**. | AI01, AI02, AI05 |
| **RoleChangeLog** | `RoleChangeLog` | Append-only role-change audit. Identified by `logId` (internal sequence). | AA06, Clarification #24 |
| **AuthSession** | `AuthSession` | Per-login session tracking for AA04. Identified by `id` (UUID). Tracks **inactivity** (`lastActivityAt`) separately from token expiry. | AA04, Clarifications #29, #34 |

### 2.3. Modelled-but-not-yet-implemented (Sprint 3+)

The following aggregates are present in the domain model as a forward-looking design intent but are explicitly deferred to Sprint 3 (Clarification #26 and S2 US):
- `CustomerOrder`, `OrderItem`, `PersonalizedPizzaSnapshot`, `SnapshotComponent` — the ordering pipeline.
- `PreparationActivity`, `KitchenResource` — the kitchen scheduling engine.

---

## 3. Modifications to Sprint 1 Aggregates

### 3.1. `User` — External IdP and Invitation Support

**Motivation:** User Story AA02 mandates OIDC external authentication without storing the external password. User Stories AA06/AA07 require a secure invitation lifecycle.

**Changes:**
| Change | Reason |
|---|---|
| Added `externalIdpSubject : String [0..1]` | AA02 — the OIDC `sub` claim is the stable identifier for mapping external users to internal accounts. It is distinct from `email` (which can change at the IdP). |
| `passwordHash : PasswordHash [0..1]` (now optional) | AA02 — accounts created solely via an external IdP have no local password. `AuthService` must still reject local login attempts for such accounts. |
| Added `invitations : List<ActivationInvitation>` | AA06/AA07 — the invitation lifecycle is strictly bound to the user aggregate. |
| `passwordHash` invariant relaxed | Locally-registered accounts still require it; external-only accounts must not have it. Enforced by a domain rule: `(passwordHash ≠ null) ∨ (externalIdpSubject ≠ null)`. |
| **Added (Clarif. #32):** login identifier is `email` case-insensitive. `PENDING_REGISTRATION` users are blocked from login; a resend-activation flow must be available. Password policy applies uniformly to creation, change, and recovery. | AA01 — refines the authentication contract. |

### 3.2. `Product` — Explicit Consumption for Direct-Sale Stock-Controlled Products

**Motivation:** AI02 requires an explicit `stockUnitsPerSale` value for products that are both `isSellable` and `isStockControlled`. The absence of this value is a hard **error at planning time** (Clarification #28 §2), *not* a silent assumption of `1`. Reinforced by Clarification #36: non-pizza sellable products are also in scope for forecasts and planning.

**Change:** `stockUnitsPerSale : Integer [0..1]` (nullable). The Product aggregate permits `null` so existing Sprint 1 data survives and to allow products to be configured progressively. The enforcement is applied strictly by `PlanningService` at calculation time.

### 3.3. `PredefinedPizza` — No Own Stock (Clarification #35)

**Motivation:** The client confirmed that predefined pizzas are prepared on demand. They do **not** carry their own stock. Stock is tracked at the component level.

**Invariant:** A `Product` that backs a `PredefinedPizza` MUST NOT have `isStockControlled = true`. Component stock is deducted when the order is confirmed (consistent with Clarification #12). See Invariant #23 in §5.

### 3.4. `AuthSession` — Inactivity-Based Session, Per-Device Logout (Clarifications #29, #34)

**Motivation:** The client confirmed that:
- Session expires on **configurable inactivity** (env var).
- While active, session may be refreshed **without** requiring a new login.
- Token lifetime is team-defined and **configurable**.
- Refresh may **not** exceed the inactivity limit.
- Logout affects **only the current device session**, not all sessions of the account.

**Model change:** `AuthSession` gains `lastActivityAt : Timestamp`. Both `lastActivityAt` and `expiresAt` must be checked for validity:
- `now < expiresAt` (session hard cap / refresh-token expiry)
- `now − lastActivityAt < SESSION_INACTIVITY_MINUTES` (inactivity)

Configuration via env vars: `SESSION_INACTIVITY_MINUTES`, `JWT_EXPIRES_IN`.

---

## 4. Decision Log — Sprint 2 Additions

### Decision Log 11: Kitchen configuration as opaque JSON
- **Initial thinking:** model kitchen equipment, positions, orientations, and textures as structured domain classes and relational tables.
- **Adjusted (WEB06/VIS02):** the domain treats `jsonContent` as an **opaque payload**; validation is delegated to a dedicated `KitchenConfigValidationService` (a `Pure Fabrication`).
- **Rationale:** importing a kitchen involves dozens of visual assets and coordinates that would pollute the domain with 3D rendering concerns. Keeping the JSON opaque preserves the domain's integrity, allows schema evolution without model churn, and mirrors the "validated-input" patterns.

### Decision Log 12: Single Active Kitchen Configuration
- **Initial thinking:** allow multiple active configurations for parallel scenarios.
- **Adjusted (WEB06):** "exactly one active configuration" is a strict system invariant.
- **Rationale:** the 3D viewer must always have a deterministic answer to "which layout do I load?". Enforced in `KitchenConfigurationService.activate(name)` under a single transaction (`UPDATE ... SET is_active = false WHERE name <> :name`).

### Decision Log 13: ConsumptionForecast as an aggregate
- **Initial thinking:** track daily consumption as individual rows in a single table.
- **Adjusted (WEB07):** wrap in a `ConsumptionForecast` aggregate with `ForecastEntry` entities.
- **Rationale:** the forecast is a named, versioned artefact (identified by `ForecastName`). Its invariants (`(date, productSku, pizzaSize)` uniqueness, `date ∈ [start, end]`, `quantity ≥ 0`) are aggregate-scoped. Editing a forecast must not silently change existing `PlanningResult` semantics — hence the snapshot pattern (§15).

### Decision Log 14: SupplierScenario as an aggregate
- **Initial thinking:** model suppliers globally as a catalogue.
- **Adjusted (WEB07/AI06):** each `SupplierScenario` (identified by `ScenarioName`) is a **scenario** containing its own set of `Supplier` (identified by `SupplierCode`) and `SupplierOffer` entities. Explicit `confirm()` transitions the scenario into "ready for Prolog". The `isSimulated` flag on the root captures LLM/manual origin.
- **Rationale:** Clarification #28 states supplier data can be prepared manually or with LLM assistance, must be labelled simulated, and confirmed explicitly. Modelling scenarios (not a shared supplier catalogue) isolates simulations from operational data and matches the "confirmation" semantics in AI06.

### Decision Log 15: PlanningResult as a read-only aggregate with snapshots
- **Initial thinking:** return planning output directly from the Prolog response without persistence.
- **Adjusted (WEB07, AI05):** persist a `PlanningResult` aggregate with **immutable snapshots** (`ForecastSnapshot`, `SupplierScenarioSnapshot`, `StockSnapshot`) plus requirement/proposal/unmet-need VOs.
- **Rationale:**
  - WEB07 AC: "Editing a forecast must not change the meaning of earlier results." → Deep-copied snapshots guarantee this.
  - Clarification #28 §3: replay of an old execution must use the **original dataset**, not current data. The `isReplay` flag marks such runs.
  - Clarification #26: plans **never** change stock and **never** create purchase orders. `PlanningResult` is strictly read-only: mutator methods are called only during construction, and the aggregate has no mutation methods after `markExecuted()`.
  - Clarification #30: proposals must record `meetsRequiredDate` and `lateByDays` so that a late proposal is never presented as satisfying the original on-time requirement.

### Decision Log 16: External IdP → `externalIdpSubject` on `User`
- **Initial thinking:** store the external user's email only.
- **Adjusted (AA02, Clarification #27):** store the OIDC `sub` claim as `externalIdpSubject`.
- **Rationale:** the email at the IdP can be changed or shared among accounts; the `sub` claim is stable and immutable. Combined with optional `passwordHash`, a single `User` model serves both local and external accounts without subclassing.

### Decision Log 17: ActivationInvitation as an entity inside `User`
- **Initial thinking:** standalone aggregate.
- **Adjusted (AA06/AA07, Clarification #24):** modelled as an **entity inside the `User` aggregate**, identified by its unique `InvitationToken`.
- **Rationale:**
  - Cardinality is strictly bounded (at most one *active* invitation per `(user, purpose)`).
  - Invariants (single-use, expiry, previous-invalidation on new emission) are naturally scoped to the user aggregate.
  - Retaining history is still possible; older invitations are marked `revokedAt` / `usedAt` and are simply not surfaced.
  - If later analysis showed unbounded growth, it would be promoted to its own aggregate — but current Sprint 2 scope does not justify that.
  - Clarification #32 confirms password recovery reuses this entity with `purpose = PASSWORD_RESET` and a configurable TTL.

### Decision Log 18: RoleChangeLog as a separate aggregate
- **Initial thinking:** embed audit entries in `User`.
- **Adjusted (Clarification #24 §1.4):** a separate `RoleChangeLog` aggregate, identified by an internal `logId`.
- **Rationale:** the log is append-only, must be cross-user queryable by `targetUsername` or `actorUsername` (needed by the "history" page requested in the clarification), and should never be loaded on routine `User` fetch. Separating it keeps the `User` aggregate lean and honours the Single Responsibility Principle.

### Decision Log 19: `Product.stockUnitsPerSale` in the model
- **Adjusted (Clarification #28 §2):** add the field; enforce presence only when `isStockControlled ∧ isSellable`; failure to supply it is a domain/planning error, not a silent default.
- **Rationale:** AI02 explicitly forbids assuming consumption = 1. Keeping the field in the aggregate lets it evolve with the product state, and `PlanningService` may reject the calculation with a clear, actionable error.

### Decision Log 20: Role set unchanged
- **Adjustment (Clarification #25, Table 1 S2):** `MANAGER`, `EMPLOYEE`, and `CUSTOMER` remain the only roles. The "Administrator" role referenced in the S2 Table 1 is a *functional* designation confirmed in Clarification #24 §1.1 ("first Administrator is created during installation"). It is a system-user designation, not a new domain enum value.
- **Alternative rejected:** adding `ADMIN` to the enum would contradict Clarification #04 §1 and #24 §1.2 ("no separate admin profile"). The `MANAGER` role owns administration capabilities.

### Decision Log 21: Strict adherence to Business Keys (Zero UUIDs in relations)
- **Initial thinking:** use UUIDs as technical primary keys and foreign keys to link all tables and aggregate references, as is common in many ORMs.
- **Adjusted:** The entire architecture (Domain Model and Physical Schema) was refactored to use **Business Keys** (`Username`, `Email`, `Sku`, `Name`, `SupplierCode`) as primary identifiers and references.
- **Rationale:**
  - **Ubiquitous Language:** Using UUIDs obscures the domain meaning. A relationship between `Product` and `Category` should be defined by `categoryName`, not an arbitrary string of characters.
  - **Domain Integrity:** Business keys are self-validating. If a `SupplierOffer` references a `productSku`, the domain expert immediately understands the link.
  - **Traceability:** Debugging and auditing become significantly easier when a database row refers to `user@email.com` rather than `550e8400-e29b-41d4-a716-446655440000`.
  - **Exceptions:** BCK02 AC2 requires a UUIDv4 `CustomerId` for the commercial Customer aggregate. That UUID identifies the root only: customer-to-user references use `Username`, and customer address/order/dietary references use the Customer's email business key. Internal audit/session identifiers remain technical identifiers because they are not business relationships.

### Decision Log 22: AuthSession tracks inactivity separately from token expiry (Clarifications #29, #34)

- **Initial thinking:** treat `expiresAt` (matching JWT expiry) as the sole session-validity criterion.
- **Adjusted:** Session validity requires **both**:
  - `now < expiresAt` (hard cap, e.g., refresh-token TTL), **and**
  - `now − lastActivityAt < SESSION_INACTIVITY_MINUTES` (sliding inactivity).
- **Rationale:**
  - Clarification #29: session must expire on configurable inactivity, refreshed while active, with **no** absolute-login-time cap.
  - Clarification #34: refresh may renew while active but may not bypass the inactivity limit.
  - Logout revokes **only the current device's** session — consistent with AuthSession being per-login.
- **Configuration:** `SESSION_INACTIVITY_MINUTES`, `JWT_EXPIRES_IN` (both env vars, no code change to adjust).

### Decision Log 23: Indivisible purchase lots and late proposals (Clarification #30)

- **Initial thinking:** treat `SupplierOffer.stockUnitQuantity` as the price base and permit proportional purchases below the lot.
- **Adjusted:** `stockUnitQuantity` is an **indivisible lot**. The plan rounds the required quantity **up** to a multiple of the lot, and the surplus remains in the hypothetical stock balance.
- **Also:** when no supplier can deliver by the required date, the requirement is reported as an `UnmetNeed` and any later proposal carries `meetsRequiredDate = false` and `lateByDays > 0`. A late proposal never removes the original unmet need.
- **Rationale:** Clarification #30 is explicit about both semantics. `PurchaseProposal` carries the two new fields so the SPA can present late deliveries clearly.

### Decision Log 24: Login = case-insensitive email; password recovery via single-use link (Clarification #32)

- **Adjusted:**
  - Local login accepts only `email` (not `username`), compared case-insensitively. Existing `LOWER(email)` index supports this.
  - Password recovery uses a single-use, TTL-bound link (`InvitationPurpose.PASSWORD_RESET` on the existing `ActivationInvitation` entity — no new aggregate). TTL configured via `PASSWORD_RECOVERY_TTL_HOURS` (or reused `INVITATION_TTL_HOURS` by team decision).
  - Password policy (defined per ASIST) applies uniformly to **creation, change, and recovery**. Enforced in the application layer (a `PasswordPolicy` domain value/validator).
  - `PENDING_REGISTRATION` users are blocked from login; the SPA exposes a resend-activation action.
- **Rationale:** Clarification #32 formalizes all four points. Reusing `ActivationInvitation` for password recovery avoids schema churn and keeps the invitation lifecycle as the single source of truth.

### Decision Log 25: Resource-level authorization for multi-role users (Clarification #33)

- **Adjusted:** Multi-role users accumulate role permissions, but **data-ownership and confidentiality restrictions apply per operation and per resource**. `RolesGuard` alone is insufficient; a resource-level policy (e.g., `CustomerAccessPolicy` or an `@OwnerCheck` decorator) enforces the ownership rule.
- **Concrete example:** `Employee + Customer` may use Employee features and Customer self-service features, but must not read other customers' personal data (as Employee) or access other customers' records (as Customer).
- **Rationale:** Clarification #33 explicitly requires checking "both the user's roles and the data being accessed".

### Decision Log 26: PredefinedPizza has no own stock (Clarification #35)

- **Adjusted:** the `Product` backing a `PredefinedPizza` is **not** `isStockControlled`. Stock is tracked at the component level. Deduction happens at order confirmation (consistent with Clarification #12).
- **Rationale:** Clarification #35 confirms predefined pizzas are made on demand. Enforcing this as an invariant prevents accidental inventory of pizzas and keeps the BOM-driven stock model coherent.

### Decision Log 27: Non-pizza sellable products included in forecasts and planning (Clarification #36)

- **Adjusted:** `ConsumptionForecast` entries cover **all** sellable products, not just pizzas:
  - Pizzas → `pizzaSize` set, needs derived via BOM.
  - Non-pizza sellable (drinks, desserts) → `pizzaSize = null`, needs derived via `Product.stockUnitsPerSale`.
- **Rationale:** Clarification #36 explicitly requires non-pizza products in forecasts, exports, supplier scenarios, and replenishment plans. The `stock_units_per_sale` column already exists (Clarification #28 §2), and `pizza_size` is already nullable in `consumption_forecast_entries` (migration 014). **No schema change required.**

### Decision Log 28: Session inactivity / token config surfaced as env vars (Clarifications #29, #32, #34)

- **Adjusted:** the following env vars are introduced and documented in `.env.example`:
  - `SESSION_INACTIVITY_MINUTES` — inactivity timeout for `AuthSession`.
  - `JWT_EXPIRES_IN` — access-token lifetime.
  - `PASSWORD_RECOVERY_TTL_HOURS` — password-reset link TTL (may alias `INVITATION_TTL_HOURS` by team choice).
- **Rationale:** Clarifications #29, #32, #34 all require configurability without code changes. The env-var mechanism satisfies this at zero schema cost.

---

## 5. Business Invariants — Unified

| # | Invariant | Enforced in | Origin |
|---|---|---|---|
| 1 | `(isSellable ∨ isPizzaComponent)` on all `Product` | `Product` factory | Clarif. #06 |
| 2 | A `PredefinedPizza` product cannot also be `isPizzaComponent` | `Product` + `PredefinedPizza` cross-check | Clarif. #11 |
| 3 | Every `Product` references exactly one `ProductCategory` | `Product.create` + DB FK | Clarif. #08 |
| 4 | `Money.amount ≥ 0` | `Money` VO | Clarif. #11 |
| 5 | `currentUnits ≥ 0` on `StockItem` | `StockItem` + DB `CHECK` | BCK09 |
| 6 | `stockUnitsConsumed ≥ 0` on `ComponentSizeConfiguration` | VO + DB `CHECK` | Clarif. #13 |
| 7 | `assemblyOrder` unique across `PizzaComponentType` | DB `UNIQUE` + domain check | Clarif. #18 |
| 8 | 4 base `PizzaComponentType` immutable | `PizzaComponentTypeService` + domain guards | Clarif. #18 |
| 9 | At most one `KitchenConfiguration` with `isActive = true` | `KitchenConfigurationService.activate(name)` | WEB06 |
| 10 | `SupplierOffer.leadTimeDays ≥ 0` and integer | `SupplierOffer` factory | Clarif. #28 §4 |
| 11 | `(supplierCode, productSku)` unique within a `SupplierScenario` | `SupplierScenario.addOffer` + DB `UNIQUE` | WEB07 |
| 12 | `dailySupplyLimit` applies per-offer, not per-supplier | `SupplierScenarioService` + `SupplierOffer` | Clarif. #28 follow-up |
| 13 | `(date, productSku, pizzaSize)` unique within a `ConsumptionForecast` | `ConsumptionForecast.addEntry` | WEB07 |
| 14 | `date ∈ [startDate, endDate]` for every `ForecastEntry` | `ConsumptionForecast.addEntry` | WEB07 |
| 15 | `PlanningResult` never mutates stock | Read-only aggregate + no `StockItem` reference | Clarif. #26 |
| 16 | `PlanningResult` snapshots preserved on later edits | `PlanningSnapshotDomainService` | WEB07 / Clarif. #28 §3 |
| 17 | `User` has `passwordHash` **or** `externalIdpSubject` | `User` factory + `AuthService` | AA01 + AA02 |
| 18 | At most one active `ActivationInvitation` per `(user, purpose)` | `User.issueInvitation` | AA06 / Clarif. #24 §2.2 |
| 19 | ≥ 1 active `MANAGER` at any time | `UserService.deactivate` / `removeRole` | Clarif. #24 §1.2 |
| 20 | `Product.stockUnitsPerSale` required iff `isStockControlled ∧ isSellable` for planning | `PlanningService` (fails the calculation) | Clarif. #28 §2, reinforced by Clarif. #36 |
| 21 | **`AuthSession` validity requires `now < expiresAt` AND `now − lastActivityAt < SESSION_INACTIVITY_MINUTES`** | `AuthSession.isActive(Date)` | Clarif. #29, #34 |
| 22 | **Logout revokes only the current `AuthSession`; other sessions of the same account remain active** | `AuthService.logout(sessionId)` | Clarif. #29 |
| 23 | **`PredefinedPizza` backing `Product` MUST NOT be `isStockControlled`; stock tracked at component level** | `Product` factory + `PredefinedPizza` cross-check + DB `CHECK` (recommended) | Clarif. #35 |
| 24 | **`PurchaseProposal.quantity` is a multiple of `SupplierOffer.stockUnitQuantity`; `meetsRequiredDate=false` ⟹ `lateByDays > 0`; a late proposal does not satisfy the original unmet need** | `PlanningService` + `PlanningResult` VO factories | Clarif. #30 |
| 25 | **`ConsumptionForecast` entries cover non-pizza sellable products with `pizzaSize = null` and require `stockUnitsPerSale` for planning** | `ConsumptionForecast.addEntry` + `PlanningService` | Clarif. #36 |
| 26 | **Password policy enforced uniformly on create / change / recover; `PENDING_REGISTRATION` users blocked from login** | `PasswordPolicy` + `AuthService.login` | Clarif. #32 |
| 27 | **Multi-role access is checked per operation and per resource; `RolesGuard` alone is insufficient** | `CustomerAccessPolicy` (domain service) + guards | Clarif. #33 |

---

## 6. Referential Integrity Summary

All cross-aggregate references are established exclusively through **Business Keys**, ensuring semantic integrity. Cross-aggregate references that would normally fail `ON DELETE RESTRICT` are handled by application services returning `HTTP 409 Conflict` with a structured list of blockers (per Clarification #23 §1.2).

- `Customer.username → User.username` — `ON DELETE SET NULL`.
- `UserRoleAssignment.username → User.username` — `ON DELETE CASCADE`.
- `ActivationInvitation.username → User.username` — `ON DELETE CASCADE`.
- `AuthSession.username → User.username` — `ON DELETE CASCADE`.
- `Product.categoryName → ProductCategory.name` — `ON DELETE RESTRICT`.
- `Product.componentTypeName → PizzaComponentType.name` — `ON DELETE RESTRICT`.
- `ProductAllergen.allergenName → Allergen.name` — `ON DELETE RESTRICT`.
- `ComponentSizeConfiguration.productSku → Product.sku` — `ON DELETE RESTRICT`.
- `ComponentSizeConfiguration.pizzaSize → PizzaSize.name` — `ON DELETE RESTRICT`.
- `StockItem.productSku → Product.sku` — `ON DELETE RESTRICT`.
- `PredefinedPizzaRecipe.componentProductSku → Product.sku` — `ON DELETE RESTRICT`.
- `ConsumptionForecastEntry.forecastName → ConsumptionForecast.name` — `ON DELETE CASCADE`.
- `ConsumptionForecastEntry.productSku → Product.sku` — `ON DELETE RESTRICT`.
- `SupplierOffer.scenarioName, supplierCode → Supplier.scenarioName, supplierCode` — `ON DELETE CASCADE`.
- `SupplierOffer.productSku → Product.sku` — `ON DELETE RESTRICT`.
- `PlanningResult.forecastName → ConsumptionForecast.name` — `ON DELETE SET NULL`.
- `PlanningResult.scenarioName → SupplierScenario.name` — `ON DELETE SET NULL`.
- `PlanningResult` snapshot references — by value (JSONB), preserving provenance independently of live table mutations.
- `RoleChangeLog` — no FK to `User` (soft reference by `username`, survives user deletion, preserves audit).

---

## 7. Impact on the Physical Schema

The Sprint 2 additions map to new PostgreSQL tables and columns, strictly utilizing Business Keys and eliminating technical UUIDs from relationship links:

- **`kitchen_configurations`**: `name` (PK, VARCHAR), `json_content` (JSONB), `is_active` (BOOLEAN), timestamps. Partial unique index `WHERE is_active = TRUE`.
- **`consumption_forecasts`**: `name` (PK, VARCHAR), `start_date`, `end_date`, timestamps.
- **`consumption_forecast_entries`**: `forecast_name` (PK, FK), `entry_date` (PK), `product_sku` (PK, FK), `pizza_size` (PK, FK, **nullable** — supports non-pizza products per Clarification #36), `quantity`.
- **`supplier_scenarios`**: `name` (PK, VARCHAR), `is_simulated`, `confirmed_at`, timestamps.
- **`suppliers`**: `scenario_name` (PK, FK), `supplier_code` (PK), `name`.
- **`supplier_offers`**: `scenario_name` (PK, FK), `supplier_code` (PK, FK), `product_sku` (PK, FK), `price_amount`, `price_currency`, `stock_unit_quantity`, `lead_time_days`, `daily_supply_limit`.
- **`planning_results`**: `execution_id` (PK, SERIAL), `forecast_name` (FK, VARCHAR), `scenario_name` (FK, VARCHAR), `reference_date`, `is_replay`, `is_simulated`, `executed_at`, and `JSONB` columns for `forecast_snapshot`, `scenario_snapshot`, `stock_snapshot`, `requirements`, `proposals`, `unmet_needs`. Per Clarification #30, each entry in `proposals` JSONB now carries `meetsRequiredDate` and `lateByDays`.
- **`activation_invitations`**: `token` (PK, VARCHAR), `username` (FK, VARCHAR), `purpose` (**includes `PASSWORD_RESET`** for Clarification #32), `expires_at`, `used_at`, `revoked_at`, `created_at`.
- **`auth_sessions`**: `id` (PK, UUID), `username` (FK, VARCHAR), **`last_activity_at` (TIMESTAMPTZ, NOT NULL, DEFAULT NOW())** — added by Clarification #29/#34, `expires_at`, `revoked_at`.
- **`role_change_logs`**: `log_id` (PK, SERIAL), `actor_username`, `target_username`, `previous_roles` (JSONB), `new_roles` (JSONB), `changed_at`, `reason`.
- **`ALTER TABLE products ADD COLUMN stock_units_per_sale INTEGER NULL;`**
- **`ALTER TABLE users ADD COLUMN external_idp_subject VARCHAR(255) NULL; ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;`**

Migration `014_sprint2_additions.sql` implements the Sprint 2 schema changes. Migration `015_create_auth_sessions_table.sql` creates `auth_sessions`; **migration `017_add_auth_session_last_activity.sql` adds `last_activity_at`** (Clarifications #29/#34).

---

## 8. Traceability

| Element | Source |
|---|---|
| All Sprint 1 Decision Logs (1–10) | `client-questions.md` Clarifications #01–#22 |
| Decision Logs 11–21 | `client-questions.md` Clarifications #23–#28 + Sprint 2 User Stories + ARQSI Best Practices |
| Decision Logs 22, 28 | `client-questions.md` Clarifications #29, #34 |
| Decision Log 23 | `client-questions.md` Clarification #30 |
| Decision Log 24 | `client-questions.md` Clarification #32 |
| Decision Log 25 | `client-questions.md` Clarification #33 |
| Decision Log 26 | `client-questions.md` Clarification #35 |
| Decision Log 27 | `client-questions.md` Clarification #36 |
| Invariants | Cross-referenced with KB §5 (Business Invariants) |
| Physical schema implications | ADR-003, ADR-008a, ADR-011, ADR-013 |

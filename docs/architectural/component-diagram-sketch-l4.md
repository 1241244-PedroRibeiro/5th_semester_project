# C4 Level 4 (Code) — Rationale & Design Notes — AI Planning Module

**Companion diagram:** `docs/architectural/component-diagram/component-diagram-l4.puml`
**Scope:** `POST /api/v1/planning/executions` end-to-end flow
**Version:** 1.0 (Sprint 2 baseline)
**Author:** Team 3DJ-05

---

## 1. Why the AI Planning module is selected for L4

Per KB Master §6.2 (C4 Model), **Level 4 Code diagrams are selective** — they
are drawn only where the complexity justifies the cost of maintaining them. The
AI Planning module is the single best candidate in LaPrizza because it combines,
in a single workflow, every architectural pattern the project cares about:

1. **Ports & Adapters at an architectural boundary** (ADR-001, ADR-012):
   the backend talks to the Prolog engine over REST, not through embedded code.
2. **Immutable Aggregate with deep-copied snapshots** (ADR-013): PlanningResult
   is a genuine read-only artefact after `markExecuted()`.
3. **Domain Service** (`PlanningSnapshotDomainService`): the deep-copy logic is
   a stateless, domain-owned responsibility, not a service concern.
4. **Cross-aggregate coordination** without cross-aggregate pointers: four
   aggregates are read (`ConsumptionForecast`, `SupplierScenario`, `StockItem`,
   `Product`, `PredefinedPizza`) and one is written (`PlanningResult`).
5. **Explicit failure modes** (422, 409, 502) mapped to domain invariants.

The other Sprint 2 flows (kitchen config, auth) are architecturally simpler and
are fully covered by the C4 L2 and L3 diagrams plus the corresponding ADRs.

---

## 2. Layer-by-layer breakdown

### 2.1. Presentation (Driving Adapter)

| Class | Responsibility | Outbound dependency |
|---|---|---|
| `PlanningController` | Thin HTTP adapter; extracts query/body, delegates to `PlanningService`, serializes DTO. | `PlanningService` (via DI) |
| `PlanningExecutionRequestDTO` | Input contract (matches `openapi.yaml` §24.9). | — |
| `PlanningResultResponseDTO` | Output contract (matches `openapi.yaml` §24.10). | — |

**Rule enforced:** controller never touches the domain. All access is via
`PlanningService`. Every non-happy-path decision (e.g., "references active",
"stockUnitsPerSale present") is a domain/application concern, not the
controller's.

### 2.2. Application (`PlanningService`)

The **only** class that orchestrates the end-to-end flow. It is a `Pure
Fabrication` (GRASP §4.1): there is no `Planning` concept in the domain model;
the service exists to coordinate use cases.

**Inputs (dependencies):**

- `PlanningSnapshotDomainService` (domain service, stateless).
- 6 outbound ports: `IPrologClient`, `IPlanningResultRepository`,
  `IConsumptionForecastRepository`, `ISupplierScenarioRepository`,
  `IStockRepository`, `IProductRepository`, `IPredefinedPizzaRepository`.

**Orchestration sequence** (mirrored as a note in the `.puml`):

```
1. Load forecast + scenario + stock + BOM (six port calls in parallel where safe).
2. Validate:
   a. forecast and scenario exist → 404.
   b. scenario.confirmedAt ≠ null → 409.
   c. every product/size reference is active → 409.
   d. every stockControlled ∧ sellable product has stockUnitsPerSale → 422.
3. Snapshot = PlanningSnapshotDomainService.captureSnapshot(...).
4. PrologResponse = IPrologClient.plan({...snapshot, recipes}).
   → failure maps to 502 (Prolog unavailable) per ADR-012.
5. Persist: result = PlanningResult.build(...).markExecuted(now);
   return IPlanningResultRepository.save(result).
6. Return the persisted aggregate.
```

**Business rules explicitly NOT in the service:** anything already in a domain
aggregate (e.g., `SupplierScenario.confirm()` is idempotent — the service just
calls it; if already confirmed, 409 is thrown by the aggregate). This preserves
the Information Expert principle.

### 2.3. Domain Core

| Class | Pattern | Key invariant |
|---|---|---|
| `PlanningResult` | Aggregate Root, read-only | Mutators only called during construction. No `StockItem` reference — cannot mutate stock (Clarification #26). |
| `ForecastSnapshot` | Value Object | Deep copy; self-validating. |
| `SupplierScenarioSnapshot` | Value Object | Same; also freezes `confirmedAt` (a confirmed scenario snapshot cannot be invalidated by a later re-edit). |
| `StockSnapshot` | Value Object | Map `Sku → Integer`; captured at execution. |
| `DailyRequirement`, `PurchaseProposal`, `UnmetNeed` | Value Objects | Range-checked; no external references. |
| `PlanningSnapshotDomainService` | Domain Service | Stateless; pure function of its inputs (testable without I/O). |
| `ConsumptionForecast`, `SupplierScenario` | Aggregate Roots (inputs) | Own their entries/offers; validated at construction. |
| `StockItem`, `Product`, `PredefinedPizza` | Aggregate Roots (inputs) | Only read — no side effects. |

**Critical rule:** snapshots are **not** references to live rows. They are
deep JSON copies. Changing the forecast after the execution **cannot** change
earlier results (Clarification #28 §3), and any FK column (`forecast_name`,
`scenario_name`) uses `ON DELETE SET NULL` so the row survives even if the
forecast/scenario is deleted.

### 2.4. Ports (outbound)

All ports are defined in the **domain** (or application) layer, following the
Dependency Rule (ADR-001). Infrastructure adapters implement them, and are
wired via NestJS provider tokens.

- `IPrologClient` — the only port that touches an external system via HTTP.
- `IPlanningResultRepository` — persistence for the read-only aggregate.
- The four input repositories (`IConsumptionForecastRepository`,
  `ISupplierScenarioRepository`, `IStockRepository`, `IProductRepository`,
  `IPredefinedPizzaRepository`) — read-only in this flow.

### 2.5. Infrastructure

| Adapter | Port | Notes |
|---|---|---|
| `PrologHttpClient` | `IPrologClient` | 5 s connect + 30 s read timeout; no internal state; maps transport errors to `502 Bad Gateway`. |
| `PostgresPlanningResultRepository` | `IPlanningResultRepository` | Insert-only after `save()`. `findById` / `list` are read-only projections. |
| `PostgresConsumptionForecastRepository` | `IConsumptionForecastRepository` | Uses TypeORM Data Mapper, per ADR-008a. |
| `PostgresSupplierScenarioRepository` | `ISupplierScenarioRepository` | Same; joins suppliers + offers. |
| `PostgresStockRepository` | `IStockRepository` | Read-only here; stock mutations go through the dedicated `adjustStock` flow (ADR-008b). |
| `PostgresProductRepository` | `IProductRepository` | Read-only. |
| `PostgresPredefinedPizzaRepository` | `IPredefinedPizzaRepository` | Joins recipe lines. |

**No raw SQL in these adapters** (ADR-008a §5). Only the baseline migration and
view definitions retain raw SQL.

---

## 3. Failure modes and HTTP mapping

| Condition | Detected by | HTTP |
|---|---|---|
| Forecast not found | `PlanningService` (before snapshot) | 404 |
| Scenario not found | `PlanningService` | 404 |
| Scenario not confirmed | `SupplierScenario.confirm()` invariant | 409 |
| Reference became inactive since creation | `PlanningService.validateReferences` | 409 |
| `stockUnitsPerSale` missing on stockControlled ∧ sellable | `PlanningService.validateStockUnitsPerSale` | 422 |
| Prolog unreachable | `PrologHttpClient` transport error | 502 |
| Prolog returned malformed JSON | `PlanningService` (schema check on output) | 502 |
| Invariant violated in `PlanningResult.build` | Aggregate factory | 422 |
| Invalid request body | Joi boundary (presentation) | 400 |

These correspond exactly to the responses declared in `openapi.yaml`
`POST /planning/executions`.

---

## 4. What is deliberately NOT shown

To keep L4 "selective" (KB Master §6.2):

- **Entities inside input aggregates** (`ForecastEntry`, `Supplier`,
  `SupplierOffer`, `RecipeLine`) are shown only as multiplicities; their full
  class definitions live in the domain model (§8.1 KB v2.0).
- **DTO assemblers** (entity ↔ DTO) are not shown; they are simple mappers.
- **Transaction boundaries** are shown implicitly through the `PlanningService`
  note; the exact `DataSource.transaction(...)` calls are visible in the code,
  not in the diagram.
- **Guards** (`JwtAuthGuard`, `RolesGuard`, `UserStatusGuard`) run before
  `PlanningController` and are covered in C4 L3 (KB §13.1).

---

## 5. Traceability

| Diagram element | Source |
|---|---|
| `PlanningController`, `PlanningService`, `PlanningResult` | KB §13.1, §13.2, §13.3 |
| `IPrologClient` port | ADR-012 §Integration Contract |
| `PlanningResult` immutability | ADR-013 §Decision, Clarification #26 |
| `ForecastSnapshot` / `SupplierScenarioSnapshot` / `StockSnapshot` | ADR-013 §Design |
| `Product.stockUnitsPerSale` | Clarification #28 §2, KB §9.19 |
| `SupplierScenario.confirm()` | Clarification #28, ADR-012 |
| `422 / 409 / 502` mapping | `openapi.yaml` `POST /planning/executions` responses |
| Dependency Rule | ADR-001 §Key rules |
| Ports at architectural boundary only | ADR-001 §Decision (v3.0) |

---

## 6. Verification checklist

| # | Check | Command |
|---|---|---|
| 1 | Diagram renders | `plantuml -tpng component-diagram-l4.puml` |
| 2 | No orphan classes | (visual: every class has ≥ 1 relation) |
| 3 | Ports only cross layer boundaries | (visual: no port crosses inner→outer) |
| 4 | Aggregate invariants documented | (visual: notes attached to `PlanningResult` and `PlanningService`) |
| 5 | HTTP mappings align with OpenAPI | diff `openapi.yaml` §`POST /planning/executions` responses vs §3 of this doc |
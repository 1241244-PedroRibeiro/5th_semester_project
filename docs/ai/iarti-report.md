# IARTI Technical Report

## 0. Document control

| Field | Value |
|---|---|
| Version | 1.1 |
| Scope | Sprint 2, AI04 |
| Status | Technical report |
| Date | 2026-11-10 |
| Runtime impact | None |
| Source of truth | This Markdown file; PDF export must be generated from it |

This report describes the implementation that exists in the repository. Files
under [`docs/ai/examples/`](examples/) are reproducible request templates;
responses marked *representative* must be captured against the submission
environment before being used as runtime screenshots.

## 1. Executive summary

LaPrizza Sprint 2 uses a NestJS backend as the owner of business data and a
separate SWI-Prolog service for deterministic AI01 (Bill of Materials) and
AI02 (Requirements Planning) calculations. AI03 is a documented ANN feasibility
study and is intentionally not a trained or deployed model.

> **Clarification #55 status:** The implementation description below records
> the existing backend-push flow. The client now requires Prolog to retrieve
> business data through authorized backend endpoints and construct its own KB.
> That change is not implemented yet; AI06 is currently non-conformant. Update
> this report after the service-authenticated read contract, coherent input
> snapshot and replay path are implemented.

The backend gathers data by business key, sends a request-scoped JSON knowledge
base to Prolog, receives requirements, proposals and unmet needs, and persists
an immutable planning snapshot. Planning is read-only: it does not change stock
and does not confirm purchase orders. The baseline has no `PurchaseOrder`
aggregate or `purchase_orders` table, so a proposal is a recommendation only.

## 2. Context: LaPrizza, Sprint 2 and IARTI

AI01 answers how many component units are required for one or more pizza
orders, or how many units a direct stock-controlled product consumes. AI02
simulates requirements over a forecast period and proposes indivisible supplier
lots subject to price, lead time and daily limits. AI03 evaluates whether ANN
support could improve future forecasts or replenishment decisions while keeping
the deterministic planning boundary.

The report follows the IARTI distinction between symbolic logic, optimisation,
machine learning and neural networks. The full ANN study is in
[`ann-study.md`](ann-study.md); this report only summarises it.

## 3. Architecture overview

### 3.1. Current Backend to Prolog Flow (superseded by Clarification #55)

`PlanningController` exposes the two manager-only planning endpoints. 
`PlanningService` reads PostgreSQL through repository interfaces, maps domain
objects to business-key JSON, and calls `PrologHttpClient`. That adapter posts
to `http://prolog:8080/api/v1/plan`. `server.pl` dispatches on
`executionType` (`BOM` or `REQUIREMENTS_PLANNING`), constructs dynamic facts,
executes the rules, and returns JSON.

Prolog has no database credentials. A failed or unavailable Prolog call is
translated by the backend to `502 Bad Gateway`.

Clarification #55 retains the separate service and JSON/HTTP boundary but
changes how planning inputs are obtained. Prolog must fetch business inputs
through authorized backend API reads. The existing implementation does not yet
do this and must not be presented as conformant with AI06.

### 3.2. Data ownership and read-only planning

PostgreSQL and the backend own products, recipes, stock, forecasts, supplier
scenarios and planning-result snapshots. Prolog only calculates. No planning
path calls a stock mutation or creates an order.

### 3.3. Immutable snapshots (ADR-013)

After a successful calculation, the backend stores the forecast/scenario
inputs, stock quantities and returned outputs in `planning_results`. Replay
uses the persisted snapshot rather than silently replacing the original
evidence. The result records whether the run was simulated or a replay.

## 4. Bill of Materials (AI01)

### 4.1. Problem

AI01 expands a pizza order into component requirements, scales quantities by
the ordered quantity, aggregates repeated component SKUs, compares each
requirement with the current stock snapshot and reports replenishment units.
Direct stock-controlled sellable products are handled without a pizza recipe.

### 4.2. Prolog predicates

The actual service entry point is `bom_execution/2` in
[`bom.pl`](../../prolog/bom.pl). Its request-scoped predicates are:

* `bom_recipe_line/3`, `bom_component_config/3` and `bom_component_stock/2`;
* `bom_setp/3` for size-dependent component expansion;
* `bom_required_orders/3` and `bom_sum_by_sku/2` for scaling and aggregation;
* `bom_requirement/2` for stock comparison;
* `bom_cyclic_recipe/1` for cycle protection.

`order/3` is the internal order term. The educational `part/1`, `stock/2` and
`setp/2` vocabulary in the reference resource is represented by the adapted
`bom_*` family; it is not claimed to be an exported HTTP predicate.

### 4.3. Inputs and outputs

The complete request is in
[`bom-valid.http`](examples/bom-valid.http). The backend sends `orders`,
`products`, `boms`, `componentSizeConfigurations`, `referenceDate` and
simulation metadata. The response contains `requirements[]` and
`unmetNeeds[]`; AI01 has no supplier proposals.

### 4.4. Aggregates and depth-1 interpretation

The LaPrizza application scope treats a predefined pizza as the sellable
product and expands its direct recipe lines. It does not recursively expand a
component that itself has another recipe in the current business contract.
This is the one-level interpretation required by Clarification #52.

The separate teaching demonstration at
[`pizza-BOM.pl`](../resources/pizza-BOM.pl) models nested aggregates for the
IARTI exercise: pizzas contain size-specific dough aggregates, which in turn
contain elementary ingredients. It adapts the official `part/1`, `setp/2`,
`stock/2` and `manage_stock/4` model to three sizes, two dough styles, twenty
ingredients and eight pizza recipes. The demonstration consumes available
stock from higher-level assemblies first, expands only the shortage, groups
repeated withdrawals/orders, and provides resettable sufficient, insufficient
and partially available aggregate scenarios. This educational model is kept
separate from the application's one-level HTTP contract and its stock rules.
The demonstration queries still need to be executed in SWI-Prolog before the
report records them as validated.

From the repository root, load the resource in SWI-Prolog and run:

```prolog
?- consult('docs/resources/pizza-BOM.pl').
?- demo_sufficient_stock(LWS, LOS).
?- demo_insufficient_stock(LWS, LOS).
?- demo_partial_aggregate_stock(LWS, LOS).
```

The first query should return an empty `LOS`; the second should return grouped
elementary ingredient shortages; the third should withdraw the available
medium pan dough and expand only the remaining dough demand into ingredients.

### 4.5. Worked example and hand calculation

For a two-unit medium Margherita whose recipe consumes 2 flour units and 1
cheese unit per pizza:

| Step | Flour | Cheese |
|---|---:|---:|
| Recipe quantity | 2 | 1 |
| Ordered quantity | 2 | 2 |
| Required units | `2 × 2 = 4` | `1 × 2 = 2` |
| Stock before | 10 | 1 |
| Remaining | `10 - 4 = 6` | `max(1 - 2, 0) = 0` |
| Replenishment | 0 | `2 - 1 = 1` |

The same calculation is represented by `bom_setp/3`, `scale_components/3` and
`bom_requirement/2`. The request/replay artefact is
[`bom-valid.http`](examples/bom-valid.http).

### 4.6. Replay

The first response is persisted with the input and stock snapshot. A later
replay is expected to reproduce the stored result for that execution even if
the live catalogue changes. A replay is evidence of the original calculation,
not a stock adjustment.

### 4.7. Traceability

| Claim | Evidence |
|---|---|
| AI01 endpoint and manager access | `PlanningController.ts`, OpenAPI `/planning/bom-executions` |
| BOM rules | `prolog/bom.pl`, `bom_execution/2` |
| Request shape | `docs/ai/examples/bom-valid.http`, `PlanningDTOs.ts` |
| Read-only result | `PlanningService.executeBom`, `planning_results` persistence |

## 5. Requirements Planning (AI02)

### 5.1. Problem

AI02 converts forecast demand into daily component or direct-product
requirements, carries hypothetical stock forward, and recommends supplier lots
when a deficit exists. It reports late or impossible demand as unmet needs.

### 5.2. Prolog predicates

The actual entry point is `run_planning/4` in
[`planning.pl`](../../prolog/planning.pl), dispatched by `server.pl`. Its main
families are `forecast_entry/4`, `compute_daily_requirement/3`,
`process_days/5`, `process_skus/6`, `delivery/3`, `take_available_deliveries/3`,
`propose_supplier/6` and `format_output/4`.

The reference name `requirements_planning/2` describes the use case, but is
not the predicate name exported by this implementation.

### 5.3. Daily carry-forward

For each forecast day, Prolog computes demand, adds deliveries available before
that day, satisfies that day's demand first, and carries the hypothetical
remainder forward. Before using a surplus against an overdue need, it reserves
the maximum cumulative future on-time deficit for that SKU after expected
receipts. Overdue needs are then covered from the remaining surplus, newest due
date first to minimize late days. The live database stock is never updated.

The result preserves `unmetNeeds` and adds `unmetOnTime` (per due date, with
original shortage, late fulfilled quantity and remaining shortage) plus
`lateFulfilled` (due date, fulfillment date, quantity and lateness). Each
original unmet row also carries its late fulfillment detail in the existing
JSONB field so saved executions and replays retain the allocation without a
database migration.

Hand check for one direct product with stock 10, daily requirements 4, 5 and
3, and a delivery of 6 available before day 3:

| Day | Opening | Delivery | Requirement | Closing | Deficit |
|---|---:|---:|---:|---:|---:|
| D1 | 10 | 0 | 4 | 6 | 0 |
| D2 | 6 | 0 | 5 | 1 | 0 |
| D3 | 1 | 6 | 3 | 4 | 0 |

This corresponds to `process_days/5` and `process_skus/6`. A delivery on the
consumption date is not counted by `take_available_deliveries/3`; only an
earlier delivery is available.

### 5.4. Supplier selection rationale

Offers are filtered for lot feasibility, lead time, reference date and daily
limit. The implementation scores valid offers first by whether they meet the
required date, then by total lot cost, then by lead time and supplier code
through `sort_offer/3`. It does not split a deficit across multiple offers.

Example for a deficit of 10:

| Offer | Lot | Unit-lot price | Lead | Total | On time |
|---|---:|---:|---:|---:|---|
| SLOW-CHEAP | 10 | 80 EUR | 5 days | 80 EUR | yes |
| FAST-DEAR | 10 | 110 EUR | 1 day | 110 EUR | yes |

The cheaper `SLOW-CHEAP` offer is selected because both offers are on time and
the selection compares total lot cost, not just nominal unit price. If the
cheapest offer were late and the faster offer on time, the on-time criterion
would select the faster offer. Ties are deterministic by the remaining sort
keys.

### 5.5. Limits, lead times and reference date

Lots are rounded up to an indivisible lot. `dailySupplyLimit` is accumulated
per supplier/SKU/order date. A proposal cannot be placed before the supplied
reference date. `pendingDeliveries` are included in the request snapshot and
are available only when their expected date is before the consumption day.

### 5.6. Worked example

For demand 12, stock 5 and a supplier lot of 10:

* deficit = `12 - 5 = 7`;
* lots = `ceil(7 / 10) = 1`;
* proposal quantity = `1 × 10 = 10`;
* hypothetical closing stock after consumption = 0;
* excess proposed supply is visible in the proposal, not silently discarded.

The complete request template is
[`planning-valid.http`](examples/planning-valid.http).

### 5.7. Replay and immutability

AI02 persists the forecast, scenario, pending deliveries, stock snapshot and
returned calculation. The result is a planning recommendation and remains
separate from any later operational purchasing workflow.

### 5.8. Traceability

| Claim | Evidence |
|---|---|
| Endpoint and manager role | `PlanningController.ts`, OpenAPI `/planning/executions` |
| Daily and supplier rules | `prolog/planning.pl`, `run_planning/4` |
| Pending deliveries | `PlanningDTOs.ts`, `planning_forecast/2` |
| Reusable request | `docs/ai/examples/planning-valid.http` |

## 6. Artificial Neural Networks study (AI03)

AI03 is documentation-only. It evaluates two possible future applications:
demand forecasting and stock-related decision support. Demand forecasting has
the strongest score because it maps to existing forecast entries; stock
decision support maps to stock, lead times, lots and limits but has a weaker
baseline.

The study uses a small deterministic synthetic dataset, not customer data. A
seasonal-naive baseline and date-ordered holdout are required before an ANN
could be justified. Relevant metrics include MAE, RMSE, sMAPE, bias and
interval coverage. Risks include overfitting, cold starts, distribution shift,
unexplained outputs and unsafe automatic decisions. Mitigations include human
review, baseline comparison, uncertainty, monitoring, fallback and an ADR
before deployment.

The literature review [1–6] places this proposal in context: foundational ANN
forecasting work and restaurant/catering studies show that neural methods can
be useful, while their performance depends on representative data, operating
conditions, and comparisons with simpler baselines. DeepAR [3] also motivates
probabilistic outputs, but needs related time series that the current
synthetic Sprint 2 data does not provide. Tillster [7] is cited separately as
a commercial sector example, not as scientific evidence. The full synthesis
and bibliography are in [`ann-study.md`](ann-study.md), Sections 4.9 and 10.

No ANN dependency, model, training job or runtime endpoint was added. The full
study and disclosure are in [`ann-study.md`](ann-study.md), including the AI
tools used to draft and validate the documentation.

### Traceability

| Claim | Evidence |
|---|---|
| Two applications and rationale | `docs/ai/ann-study.md` §§3–5 |
| Synthetic data and evaluation | `docs/ai/ann-study.md` §§6–7 |
| No runtime integration | `docs/ai/ann-study.md` document control and §9 |

## 7. Service endpoints (AI05)

### 7.1. Endpoint matrix

| Method | Path | Role | Success |
|---|---|---|---|
| POST | `/planning/bom-executions` | `MANAGER` | 201, planning result |
| POST | `/planning/executions` | `MANAGER` | 201, planning result |
| GET | `/planning/executions/{executionId}` | authenticated planning reader | 200, stored result |
| POST | `/planning/executions/{executionId}/replay` | `MANAGER` | 201, replay result |

Both POST endpoints use JWT, active-user status and role guards. The complete
contract is [`openapi.yaml`](../api/openapi.yaml), version 2.2.0.
AI05 access examples are maintained in
[`bom-execution-examples.md`](bom-execution-examples.md),
[`requirements-planning-examples.md`](requirements-planning-examples.md), and
[`replay-examples.md`](replay-examples.md).
AI06 knowledge-base export examples and validation are maintained in
[`ai06-knowledge-base-examples.md`](ai06-knowledge-base-examples.md).

### 7.2. Error envelope

Validation and domain failures use the backend error envelope with a message.
Relevant examples are kept in [`docs/ai/examples/`](examples/): 400 for
malformed request, 422 for invalid domain data, 404 for missing forecast,
409 for an unconfirmed scenario, and 502 when Prolog is unavailable.

### 7.3. RBAC

Planning execution is manager-only. Customers and ordinary employees do not
access planning execution. Authentication failures are handled before the
planning service; the service does not trust a client-supplied role.

### 7.4. OpenAPI reference

The endpoint paths and schemas are maintained in
[`docs/api/openapi.yaml`](../api/openapi.yaml). Examples must be re-run when
that contract changes.

## 8. Backend data and Prolog knowledge base (AI06)

### 8.1. Data sources

| Input | Repository and read operation |
|---|---|
| Products and referenced SKUs | `PostgresProductRepository.findBySku`; repository also supports filtered `findAll` |
| Pizza recipes | `PostgresPredefinedPizzaRepository.findByProduct` / `findAll` |
| Size consumption | `PostgresComponentSizeConfigurationRepository.findByProduct` / `findAll` |
| Stock | `PostgresStockRepository.findByProductSku`; repository also supports `findAll` |
| Forecast and entries | `PostgresConsumptionForecastRepository.findByName` |
| Scenario, suppliers and offers | `PostgresSupplierScenarioRepository.findByName` |

The requirements document mentions `findAllActive`; the current code path
intentionally fetches referenced products with `findBySku` and checks
`product.active` before sending them. This is the verifiable implementation.

### 8.2. Construction and refresh

The current knowledge base is constructed per request from a full payload sent
by the backend. Dynamic facts are reset before loading a new request; there is
no refresh cache, persistent Prolog database, or background synchronisation.
Under Clarification #55, the required target is for Prolog to retrieve the
authoritative data through service-authorized backend reads and build its own
fresh business-key KB. This target is pending implementation.

### 8.3. Business-key mapping

The complete mapping table is in
[`docs/ai/prolog-kb.md`](prolog-kb.md). In summary, products map to stock and
consumption facts, recipes map to recipe lines, size configurations map to
component configuration facts, forecast entries map to dated demand facts, and
offers map to supplier facts.

### 8.4. PII exclusion

No customer, user, password, email, phone, address or dietary-restriction
fields are sent to Prolog or external AI tools. The input is limited to
operational planning data and business identifiers.

## 9. What the plan does and does not change

### 9.1. Calculations, stock changes and order confirmation

* **Calculation:** Prolog returns requirements, proposals and unmet needs.
* **Stock change:** planning does not call a stock adjustment operation.
* **Purchase-order confirmation:** no `PurchaseOrder` aggregate exists in the
  baseline. A `proposals[]` item is a recommendation, not an order.

The phrase “confirmation of purchase orders” in the AI04 user story is
therefore reconciled as a report finding: confirmation is explicitly
distinguished from the calculations and is outside the implemented baseline.
A future workflow would need a new aggregate, endpoint, authorization,
idempotency rule and ADR.

### 9.2. Evidence and persistence

`PlanningService` captures stock before the call and saves it in the immutable
planning result. No planning code inserts stock movements. The migration
inventory contains no `purchase_orders` table. A before/after stock capture
should be attached to the final PDF submission; the reusable request is
[`planning-valid.http`](examples/planning-valid.http).

## 10. Examples

The request/response files are indexed in
[`examples/index.md`](examples/index.md). They contain no credentials.
The complete reusable set is:
[`bom-valid.http`](examples/bom-valid.http),
[`planning-valid.http`](examples/planning-valid.http),
[`bom-invalid-400.http`](examples/bom-invalid-400.http),
[`planning-invalid-422-missing-stock-units.http`](examples/planning-invalid-422-missing-stock-units.http),
[`planning-invalid-422-inactive.http`](examples/planning-invalid-422-inactive.http),
[`planning-invalid-422-missing-size-config.http`](examples/planning-invalid-422-missing-size-config.http),
[`planning-missing-offer.http`](examples/planning-missing-offer.http),
[`planning-404-forecast.http`](examples/planning-404-forecast.http),
[`planning-409-unconfirmed.http`](examples/planning-409-unconfirmed.http), and
[`planning-502-prolog-down.http`](examples/planning-502-prolog-down.http).

### 10.1. Valid BOM

Run [`bom-valid.http`](examples/bom-valid.http) with a manager token. It
demonstrates two orders, recipe expansion, stock comparison and a 201 result.

### 10.2. Valid requirements planning

Run [`planning-valid.http`](examples/planning-valid.http) with seeded
`Week-45` and `Autumn-Scenario` data. It demonstrates the optional pending
delivery input.

### 10.3. Invalid input

[`bom-invalid-400.http`](examples/bom-invalid-400.http) omits `orders`.
The 422 examples cover missing direct-product `stockUnitsPerSale`, inactive
forecast references and missing pizza size configurations.

### 10.4. Missing data

[`planning-missing-offer.http`](examples/planning-missing-offer.http) shows
that a confirmed scenario may complete with 201 and `unmetNeeds` when no
supplier can fulfil a SKU. The 404 forecast and 409 unconfirmed-scenario
cases are separate files.

### 10.5. Unavailable service

Run `docker compose stop prolog`, execute
[`planning-502-prolog-down.http`](examples/planning-502-prolog-down.http), and
then run `docker compose start prolog`. The backend returns 502 rather than
pretending that planning succeeded. Retrying after the service is healthy is
the documented recovery.

## 11. Assumptions

1. The LaPrizza HTTP service in AI01 uses the accepted depth-1 pizza
   interpretation; the separate IARTI teaching script demonstrates recursive
   aggregate expansion as required by the practical support material.
2. A BOM execution persists `forecastName = null`; this is the current
   distinction between BOM and forecast planning.
3. Supplier deficits are not split across offers.
4. Repository reads use the normal `READ COMMITTED` database behaviour; the
   report does not claim repeatable-read isolation.
5. Customers and ordinary employees do not access planning execution.
6. Prolog is a separate container and may be unavailable.
7. Example responses labelled representative require a fresh capture for
   submission evidence.

## 12. Limitations

* AI03 has a small synthetic dataset and no measured ANN accuracy.
* The LaPrizza AI01 HTTP contract does not recursively expand aggregate
  recipes; recursive expansion is limited to the standalone IARTI teaching
  demonstration.
* No customer PII is available to AI06 or AI03.
* There is no purchase-order aggregate or confirmation endpoint.
* AI02 does not split a deficit across multiple supplier offers.
* The Prolog KB has no cache or independent refresh process.
* HTTP example fixtures are contract evidence, not a substitute for a
  timestamped runtime capture.

## 13. References

* IARTI content knowledge base, §§40–49:
  [`content-knowledge-base.md`](../contents/content-knowledge-base.md).
* LaPrizza project knowledge base:
  [`laprizza-knowledge-base.md`](../contents/laprizza-knowledge-base.md).
* ADR-012, Prolog integration:
  [`ADR-012-ai-planning-engine.md`](../sad/03-rationale/ADR-012-ai-planning-engine.md).
* ADR-013, immutable planning snapshots.
* Reference resource [`pizza-BOM.pl`](../resources/pizza-BOM.pl).
* OpenAPI v2.2.0:
  [`openapi.yaml`](../api/openapi.yaml).
* AI03 full study: [`ann-study.md`](ann-study.md).
* AI03 literature: six academic papers [1–6] and the Tillster industry
  reference [7] are listed and cited in the full study.
* AI01, AI02, AI05 and AI06 requirements and examples.
* Client clarification record:
  [`client-questions.md`](../domain/client-questions.md).
* Sprint 2 user-story specification:
  [`AI04 requirements`](../user-stories/AI04/requirements.md).

## 14. AI-generated content disclosure

| Item | Disclosure |
|---|---|
| Tools used | AI assistant with repository search, file inspection and patch editing |
| Tasks | Drafted report structure, cross-referenced implementation, proposed reusable examples |
| Human validation | Requirements, controller, service, Prolog files, OpenAPI and KB were inspected |
| Runtime validation | Examples are reproducible; representative responses require capture in the running Compose environment |
| Incorporated | Technical claims that map to named code, predicates, endpoints or documents |
| Rejected | Claims of ANN runtime integration, purchase-order confirmation, recursive BOM scope, or persistent Prolog cache |

The ANN-specific disclosure is also recorded in
[`ann-study.md`](ann-study.md) §8. This report does not treat generated prose
as evidence unless it is backed by a repository artefact or a fresh runtime
capture.

## Appendices

### Appendix A — OpenAPI paths

The AI-relevant paths are `/planning/bom-executions`,
`/planning/executions`, `/planning/executions/{executionId}` and
`/planning/executions/{executionId}/replay`, maintained in
[`openapi.yaml`](../api/openapi.yaml).

### Appendix B — Example index

See [`examples/index.md`](examples/index.md).

### Appendix C — Prolog predicate listing

See the actual source files [`bom.pl`](../../prolog/bom.pl),
[`planning.pl`](../../prolog/planning.pl), and
[`server.pl`](../../prolog/server.pl). The mapping and entry-point summary is
also maintained in [`prolog-kb.md`](prolog-kb.md).

### Appendix D — Calculation walkthroughs

The BOM and three-day carry-forward walkthroughs are in §§4.5 and 5.3–5.6.

### Appendix E — Runtime evidence

Attach timestamped captures of the valid Bruno executions, before/after stock,
replay, Prolog execution and the 502 stop/start sequence when exporting the
submission PDF. The repository currently stores the reusable request bodies,
not fabricated screenshots.

### Appendix F — ANN study

The complete study is [`ann-study.md`](ann-study.md).


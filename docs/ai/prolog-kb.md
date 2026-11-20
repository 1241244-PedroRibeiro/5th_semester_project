# Prolog knowledge-base mapping (AI06)

> **Clarification #55 (19 November 2026) — target flow; implementation pending.**
> This document's historical mapping below describes the existing backend-built
> payload and is no longer the required acquisition flow. In the target flow,
> the backend invokes Prolog with execution/scheduling metadata; Prolog obtains
> business data from documented, service-authorized backend read endpoints and
> constructs its per-run KB. Prolog must not access PostgreSQL. Endpoint
> contracts, service authentication, coherent reads and replay snapshot handling
> still require design and implementation.

This document records the business-key mapping used by the AI06 integration.
The backend remains the owner of the database and Prolog does not connect to
PostgreSQL. The mapping remains useful, but its source changes from one pushed
payload to authenticated backend reads under Clarification #55.

## Current implementation construction policy (superseded by #55)

`PlanningService` reads the required repositories, builds a JSON payload, and
calls `POST /api/v1/plan` in the Prolog container. The Prolog server resets its
dynamic facts before each execution and loads the payload into an in-memory
knowledge base. There is no persistent Prolog cache and no database mutation.

The current implementation uses the normal database transaction isolation
provided by the backend connection (`READ COMMITTED`). A future stronger
snapshot policy would require an explicit transaction boundary and an ADR; it
must not be inferred from this report.

## JSON to Prolog mapping

| JSON source | Prolog predicate | Meaning |
|---|---|---|
| `products[].sku`, `currentStock` | `bom_component_stock/2`, `component_stock/2` | Current stock in abstract units |
| `products[].stockUnitsPerSale` | `bom_stock_units_per_sale/2`, `stock_units_per_sale/2` | Direct-product consumption rule |
| `boms[].pizzaSku`, `lines[]` | `bom_recipe_line/3`, `recipe_line/3` | Pizza recipe and default quantities |
| `componentSizeConfigurations[]` | `bom_component_config/3`, `component_config/3` | Size-specific component consumption |
| `forecast.entries[]` | `forecast_entry/4` | Daily product/size consumption |
| `scenario.offers[]` | `offer/6` | Supplier, price, lot, lead time, daily limit |
| `pendingDeliveries[]` | `delivery/3` | Expected incoming stock |
| `orders[]` | `order/3` | BOM request converted from the REST payload |

Identifiers remain business identifiers: SKUs, product sizes, supplier codes,
forecast names, and scenario names. Technical database IDs are not sent to
Prolog.

## Execution predicates

| Concern | Actual entry point | Result |
|---|---|---|
| BOM | `bom_execution/2` | `result(Requirements, UnmetNeeds)` |
| Planning | `run_planning/4` | JSON with `requirements`, `proposals`, `unmetNeeds` |
| BOM recipe expansion | `bom_required_orders/3` and `bom_setp/3` | Aggregated component requirements |
| Planning daily demand | `compute_daily_requirement/3` | Daily requirements |
| Supplier selection | `propose_supplier/6` | One proposal plus possible unmet need |

The educational resource `docs/resources/pizza-BOM.pl` illustrates the
briefcase/pizza style of declarative modelling. It is a reference resource,
not the HTTP service entry point.

## Data excluded from the KB

Customer records, users, credentials, dietary restrictions, and other personal
data are not inputs to AI01/AI02. The planning payload contains only catalogue,
forecast, stock, BOM, supplier, and pending-delivery information.

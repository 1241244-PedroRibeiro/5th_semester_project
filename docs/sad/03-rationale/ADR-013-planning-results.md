# ADR 013: Immutable Planning Results & Snapshots

- **Status:** Accepted
- **Date:** 2026-11-04
- **Decision Makers:** LaPrizza Development Team

## Context
User Story **WEB07 (AI Configuration and Execution)** and Client Clarification #28 impose a strict requirement regarding the results of AI planning executions: *"Editing a forecast must not change the meaning of earlier results."* Furthermore, Clarification #26 dictates that planning results are strictly read-only and must never mutate stored stock or create operational purchase orders.

This means that when a Manager executes a planning run, the output (daily requirements, purchase proposals, unmet needs) is intrinsically tied to the *exact state* of the inputs at the moment of execution. If a Manager later modifies the `ConsumptionForecast` or changes the `SupplierScenario`, or if the stock levels change due to daily sales, historical planning results must remain exactly as they were calculated. 

The challenge is that traditional relational foreign keys link to mutable tables. If the forecast is edited, querying the planning result via the foreign key would yield the *new* forecast data, corrupting the historical record. Additionally, the architecture must maintain the project's mandate of referencing aggregates by **business identifiers** (names, SKUs) rather than technical UUIDs.

## Decision
We adopt an **Immutable Snapshot Pattern** for the `PlanningResult` aggregate. 

When a planning execution is triggered:
1. **Deep Copying:** The backend gathers the inputs (Forecast Entries, Supplier Offers, Stock Balances, BOM Rules) and creates a deep-copied JSON representation of them.
2. **Business-Key Referencing:** The `PlanningResult` table records the `forecast_name` and `scenario_name` as foreign keys (VARCHAR). If a forecast or scenario is deleted, the foreign key is set to `NULL` (`ON DELETE SET NULL`), but the JSON snapshots remain intact. No UUIDs are used for relational linkage.
3. **Storage:** The `PlanningResult` record stores the deep-copied JSON snapshots directly in `JSONB` columns (`forecast_snapshot`, `scenario_snapshot`, `stock_snapshot`), alongside the actual calculated outputs (requirements, proposals, unmet_needs), which are also stored as `JSONB`.
4. **Replay Mechanism:** If a Manager wishes to re-run a historical scenario, they use the snapshot data directly, setting the `is_replay = true` flag on the new result, ensuring historical reproduction without relying on mutated current data.

## Alternatives Considered

### 1. Versioning the Input Tables (Slowly Changing Dimensions)
- *Description:* Every time a forecast or scenario is edited, create a new version (e.g., `forecast_v2`). The `PlanningResult` links to `forecast_name`, `version = 2`.
- *Pros:* Normalized data, smaller storage footprint.
- *Cons:* Extremely complex to implement. It requires complex temporal table logic (e.g., `valid_from`, `valid_to`) and advanced TypeORM query builders. It fragments the domain model heavily and still doesn't solve the issue of the Stock Snapshot, which is highly volatile and usually not "versioned" in a traditional sense.

### 2. Event Sourcing
- *Description:* Storing every change to forecasts and stock as an immutable sequence of events.
- *Pros:* Perfect auditability.
- *Cons:* Massive overkill for the scope of this project. Implementing CQRS and Event Sourcing would require a completely different persistence architecture and infrastructure (e.g., Kafka, EventStore), drastically increasing complexity and violating the "Less is More" principle.

## Consequences

### Positive
- **Perfect Historical Reproducibility:** Clarification #28 is fully satisfied. Historical results can be viewed with total confidence that they reflect the exact input state of that execution.
- **Performance:** Reading a `PlanningResult` is a single database row fetch. No complex joins across multiple tables are required to reconstruct the historical state.
- **No UUIDs:** References to the forecast and scenario are established using their business names (`VARCHAR`), not internal UUIDs, ensuring architectural consistency with the rest of the domain.
- **Immutability:** The `PlanningResult` aggregate is read-only. There are no `UPDATE` endpoints for the calculated results, preventing accidental data corruption.
- **Auditability:** The snapshots act as an audit trail, allowing the team to debug exactly why the Prolog engine produced a certain output.

### Negative / Trade-offs
- **Storage Bloat:** Storing full JSON copies of the inputs and outputs for every execution increases database storage usage significantly. This is an acceptable trade-off for the integrity of the planning data.
- **Data Duplication:** The same forecast data might be duplicated across multiple executions, which violates normalization rules, but is necessary to guarantee isolation.
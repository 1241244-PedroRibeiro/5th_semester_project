# ADR 012: AI Planning Engine Integration (Prolog via REST)

- **Status:** Accepted; data-flow decision revised by Clarification #55 (implementation pending)
- **Date:** 2026-11-04
- **Decision Makers:** LaPrizza Development Team

## Context
User Story **AI05 (AI Service Access)** and **AI06 (Back-End Data and Prolog Knowledge Base)** mandate the integration of a Prolog-based Artificial Intelligence module. This engine is responsible for calculating Bill of Materials (BOM) and Requirements Planning based on daily consumption forecasts, stock levels, and supplier offers.

From an architectural standpoint, the Prolog engine is a distinct logical and technological component. The primary challenge is determining *how* this engine integrates with the NestJS backend while respecting the Clean Architecture boundaries. The AI engine requires complex domain data (Pizza BOMs, inventory balances, supplier constraints). If the AI engine were to access the database directly, it would bypass all backend invariants, business rules, and transaction controls. Furthermore, the backend must remain the single source of truth for all business data, and must enforce the use of **business identifiers** (SKUs, names) over technical UUIDs.

Additionally, Prolog is a logic programming language with a very different runtime model from Node.js. Embedding a Prolog interpreter directly inside the Node.js event loop (e.g., via `tau-prolog` or native bindings) poses severe risks to the backend's stability and concurrency.

## Original decision (data flow superseded by Clarification #55)
We adopt a **separated container architecture** where the Prolog engine runs as an independent service, communicating with the NestJS backend exclusively via **REST/JSON over HTTP**.

The integration contract is defined as follows:
1. **Data Gathering:** The NestJS `PlanningService` orchestrates the retrieval of all necessary inputs from the database (Consumption Forecasts, Supplier Scenarios, Stock Snapshot, and Product BOM definitions). All references are resolved to business keys (e.g., `product.sku`, `forecast.name`, `supplier.code`).
2. **Knowledge Base Construction:** The backend serializes these inputs into a comprehensive JSON payload. This payload is heavily business-oriented and contains no UUIDs.
3. **REST Invocation:** The backend uses an infrastructure adapter (`PrologHttpClient`) to send a `POST` request to the Prolog engine's API endpoint (e.g., `/api/v1/plan`).
4. **Prolog Execution:** The Prolog engine (running SWI-Prolog with an HTTP server pack) receives the JSON, dynamically constructs its internal knowledge base (facts and rules) for that specific execution, runs the BOM/Planning predicates, and returns the result as a JSON payload.
5. **Result Persistence:** The backend receives the result, maps it to the `PlanningResult` aggregate, and persists it, maintaining the business key relationships (e.g., `forecast_name`).

### Wire representation decision (ARQSI B3)

The canonical wire format is a JSON request and JSON response carried by HTTP
`POST` between the NestJS backend and the Prolog service. The request and
response are explicit DTO-shaped data structures, documented in OpenAPI and
validated at the backend boundary. This format is chosen for interoperability
between TypeScript and SWI-Prolog, inspectability during operations, and a
stable service contract that does not expose internal Prolog predicates or
database identifiers.

We considered two alternatives for representing the exchanged data:

1. **Native Prolog terms over a Prolog-specific protocol.** This would couple
   the backend adapter to Prolog syntax and term encoding, complicate
   validation and escaping, and make the interface less usable by other
   clients or tooling. It is rejected because the service boundary should
   remain language-neutral.
2. **HTTP content negotiation through `Accept` (for example, choosing JSON or
   Prolog terms per request).** This adds multiple representations and
   negotiation branches without a current consumer or requirement for an
   alternative format. `Accept` describes the response representation; it
   does not define a safer or more expressive domain request format. The
   application therefore uses JSON as the single supported representation
   and does not negotiate Prolog terms.

The trade-off is that Prolog inputs and outputs must be explicitly serialized
and mapped at both ends. The benefit is a versionable, testable boundary with
clear ownership: the backend validates business input and persists results;
Prolog evaluates the rules and returns data without direct database access.

## Alternatives Considered

### 1. Embedded Prolog (Node.js Bindings)
- *Description:* Integrating a Prolog interpreter directly into the Node.js process.
- *Pros:* Low latency (no network hop).
- *Cons:* Rejected. The available Node.js bindings for SWI-Prolog are often unmaintained or require complex native C++ compilation. More importantly, Prolog computation is highly CPU-intensive. Running it inside the Node.js event loop would block the single thread, freezing the entire REST API for all other users during a calculation. Offloading to a Worker Thread introduces extreme memory overhead and complexity.

### 2. Direct Database Access from Prolog
- *Description:* Giving the Prolog engine its own database credentials to query PostgreSQL directly.
- *Pros:* Bypasses the backend entirely.
- *Cons:* Strongly Rejected. This completely destroys the Clean Architecture and DDD boundaries. Prolog would have direct access to tables, bypassing the backend's `PlanningResult` snapshot logic, transaction control, and RBAC. If the database schema changes, the Prolog engine breaks. It makes it impossible to enforce the "AI results are read-only" constraint because Prolog could easily execute an `UPDATE`.

### 3. Rewriting AI in TypeScript
- *Description:* Implementing the BOM and Planning algorithms in TypeScript instead of Prolog.
- *Pros:* Single language stack.
- *Cons:* Rejected. This directly violates the academic requirements of the IARTI course and User Story AI01/AI02, which explicitly mandate the use of Prolog for the declarative logic.

## Consequences

### Positive
- **Absolute Domain Isolation:** The backend remains the sole gatekeeper of the database. The Prolog engine is stateless and purely functional; it acts merely as a calculation service.
- **Independent Scalability:** If the AI planning execution becomes a bottleneck, the Prolog container can be scaled horizontally independently of the Node.js backend.
- **Clean Architecture:** The backend communicates with the AI via an infrastructure adapter (`PrologHttpClient`) that implements a domain-defined interface. For unit testing, the backend can easily inject a mock `PrologHttpClient`.
- **Knowledge Base Freshness:** Because the KB is built and sent on every request (or per documented refresh policy), there is no risk of the AI operating on stale data.

### Negative / Trade-offs
- **Network Latency:** Serializing the KB and sending it over the network adds latency compared to an in-memory call. This is acceptable for a back-office planning tool where execution times are expected to be in the seconds range.
- **Failure Handling:** The backend must gracefully handle scenarios where the Prolog engine is down or unresponsive, returning a `503 Service Unavailable` or `502 Bad Gateway` to the SPA, rather than crashing.

## Decision Addendum — Clarification #55 (19 November 2026)

Clarification #55 changes **who retrieves business data and constructs the per-run knowledge base**. It does not change the separate-container boundary, JSON/HTTP wire representation, business-key identifiers, backend ownership of persistence, or prohibition on direct database access from Prolog.

The current target flow is:

1. An authorized Manager submits an AI01/AI02 request to the backend.
2. The backend validates the request and invokes the corresponding Prolog predicate over JSON/HTTP with execution and scheduling metadata. It does not include the complete product, stock, BOM, forecast, supplier, or offer dataset in that invocation.
3. Prolog obtains the required business facts from documented backend API endpoints using an authorized service identity. The API exposes read-only planning data and no customer/user personal data.
4. Prolog builds a fresh in-memory KB for that calculation, evaluates it, and returns the result plus sufficient input provenance for the backend to persist an immutable `PlanningResult` snapshot.
5. The backend remains the sole database owner and persists the calculation result. Prolog never receives database credentials and cannot mutate business state.

### Decisions still required before implementation

Clarification #55 does not prescribe the service-authentication technology, exact endpoint paths, or the mechanism that guarantees a coherent data version across Prolog's endpoint reads. The implementation design must specify these in OpenAPI and this ADR. It must also preserve ADR-013 replay: replay must use the original input snapshot and original reference date, never the current business data. A replay-specific authenticated snapshot read or an explicitly supplied immutable replay snapshot may be selected, but the choice must be documented and tested.

Until these decisions and changes are implemented, the code described in the original decision remains the current implementation but is **not conformant with the revised data flow**. The JSON-over-HTTP representation decision above remains in force for both the backend→Prolog invocation and the Prolog→backend API reads.

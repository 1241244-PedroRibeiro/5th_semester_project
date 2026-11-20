# Key Architectural Scenarios — LaPrizza Information System

## 1. Purpose and scope

These scenarios describe the critical end-to-end interactions and architectural qualities of the system at the end of Sprint 2. They are grounded in the Sprint 1 and Sprint 2 user stories, the client clarifications, the current application boundaries, and the architecture decision records (ADRs). They are not a replacement for the acceptance criteria in each user story.

The Sprint 2 baseline adds the Angular SPA, external identity-provider login, staff access control, kitchen configuration and visualization, and read-only AI planning. The use-case catalogue is in [`use_case_diagram_sprint2.md`](../architectural/use_case_diagram_sprint2.md); the full current and future view is in [`use_case_diagram.md`](../architectural/use_case_diagram.md).

### Scope boundary

Sprint 2 planning produces recommendations and immutable simulation results. It does not create purchase orders, mutate stock, accept payment, or implement a customer order lifecycle. The customer cart remains a browser-side draft and checkout/order history are outside the implemented Sprint 2 flow. These are distinct from the restaurant’s back-office stock and planning functions. See [client clarifications](../domain/client-questions.md), [WEB01](../user-stories/WEB01/requirements.md), [AI02](../user-stories/AI02/requirements.md), and [WEB07](../user-stories/WEB07/requirements.md).

AI03 and AI04 are study/report deliverables, not executable runtime use cases. Their research and technical evidence are documented separately in [`ann-study.md`](../ai/ann-study.md) and [`iarti-report.md`](../ai/iarti-report.md).

## 2. Scenario summary

| ID | Scenario | Main quality drivers | Sprint 2 coverage |
|---|---|---|---|
| KS-01 | Authenticate locally or through OIDC; complete a required customer profile | Security, usability, session consistency | AA01–AA04, AA07 |
| KS-02 | Enforce roles, account status, and staff lifecycle rules | Security, auditability, least privilege | AA03, AA05–AA07 |
| KS-03 | Browse and manage the catalogue without violating product invariants | Data integrity, availability, usability | BCK01–BCK11, WEB01–WEB05 |
| KS-04 | Configure a kitchen and view its active 3D layout | Authorization, consistency, usability | WEB06, VIS01–VIS07 |
| KS-05 | Compute a product bill of materials from recipes | Correctness, isolation, read-only behavior | AI01, AI05, AI06 |
| KS-06 | Run daily requirements planning with on-time priority | Correctness, traceability, deterministic replay | AI02, WEB07 |
| KS-07 | Isolate the Prolog service and preserve planning provenance | Modularity, security, resilience | AI05, AI06, ADR-012, ADR-013 |
| KS-08 | Keep customer ordering and supplier purchasing within their actual scope | Scope integrity, financial correctness | WEB01, AI02, WEB07 |

## 3. KS-01 — Local and external authentication with customer profile completion

**Actors:** Guest, customer, employee, manager, external identity provider.

**Trigger:** A person signs in with local credentials or chooses the configured external identity provider.

**Flow:**

1. The SPA sends a local sign-in request or starts the OIDC authorization flow. The identity-provider callback is handled by the authentication boundary; the provider is an authentication mechanism, not an application role.
2. The backend resolves the application user and current roles from its own records. OIDC identity claims do not grant staff privileges by themselves.
3. The backend issues the application session/token. Protected requests are authenticated by the HTTP security middleware.
4. If an externally authenticated customer has no required phone number, the customer is sent to the profile-completion screen and customer ordering/account actions remain gated until the number is saved. The selected country determines the calling code; the persisted phone value is normalized with that code.
5. Login state is shared across tabs in the browser, and logout in one tab invalidates the session in the other tabs.

**Failure and recovery:** Invalid credentials, failed OIDC exchange, inactive accounts, and session expiry do not grant access. Profile-completion failures keep the user on the required step and provide a retry/sign-out path.

**Architectural drivers and evidence:** Authentication and authorization are separate concerns (AA01–AA05). Role resolution is backend-owned. Customer phone completion and cross-tab session behavior follow [client clarifications #50 and #53](../domain/client-questions.md), [AA02](../user-stories/AA02/requirements.md), and [AA04](../user-stories/AA04/requirements.md). Session/cookie and token details must follow the current ADRs and implementation; this scenario deliberately does not assume that every login is a stateless JWT flow.

## 4. KS-02 — Fail-closed authorization and staff account lifecycle

**Actors:** Manager, employee, customer, guest.

**Trigger:** A request reaches a protected operation, or a manager administers staff access.

**Flow:**

1. Authentication middleware establishes the principal, then authorization checks the declared roles and account status at the backend perimeter.
2. Protected operations without an explicit authorization policy are denied by default. Public catalogue and registration operations are explicitly exposed as public; an absent role annotation must not silently make a protected operation accessible.
3. The manager invites staff, assigns or revokes roles, consults role history, and activates/deactivates accounts only through authorized operations.
4. Deactivation/reactivation and role changes are recorded, and the active-manager invariant is maintained so that the restaurant cannot be left without an active manager.
5. The SPA’s route guards and navigation improve usability but do not replace backend authorization.

**Failure and recovery:** Missing/invalid credentials, inactive accounts, missing route policy, or insufficient roles result in denial and a structured error response. Unauthorized state changes do not partially persist.

**Architectural drivers and evidence:** Least privilege, fail-closed behavior, and auditability are required by [AA05](../user-stories/AA05/requirements.md), [AA06](../user-stories/AA06/requirements.md), and the authorization guards in the backend. The current implementation contains an `ADMINISTRATOR` role alongside `MANAGER`; this is a documented implementation detail that must be reconciled with Clarification #24, which describes Administrator as a functional designation of Manager. The scenarios and diagrams therefore do not treat Administrator as a separate business actor or invent permissions for it.

## 5. KS-03 — Catalogue integrity and customer browsing

**Actors:** Manager and customer; the public catalogue is also available to a guest where the route permits it.

**Trigger:** A manager changes catalogue data, or a customer searches/browses products.

**Flow:**

1. Manager commands pass through request validation and application services before reaching domain and persistence operations.
2. Product classification, component type, size configuration, recipe, allergen, and stock invariants are checked before changes are committed.
3. Deletions that would break references are rejected; referential integrity is preserved by domain checks and database constraints.
4. Public catalogue queries return customer-facing product details, prices, allergen information, and availability in the API contract. Search, product-type selection, excluded-allergen filters, availability-only filtering, price range, and sorting are presentation/query behavior; they must not change stored product data.
5. Predefined-pizza price is derived from its configured components and size. Availability is evaluated from the applicable component stock rules; a product may remain visible while an unavailable size is identified as unavailable.

**Failure and recovery:** Invalid relationships and invariant violations are rejected without partial writes. A stale or unavailable item is not silently represented as available.

**Architectural drivers and evidence:** Domain integrity and stable public contracts are described by the Sprint 1 BCK stories, WEB01–WEB05, the system specification, and client clarifications. The current catalogue sort order and supported filters are implementation behavior, not claims of personalized recommendation. WEB05 customer/employee pages have documented incomplete criteria; this scenario does not claim that the full WEB05 acceptance scope is complete.

## 6. KS-04 — Kitchen configuration and active 3D visualization

**Actors:** Manager (configuration); manager and employee (kitchen view).

**Trigger:** A manager edits a kitchen configuration, or a staff member opens the kitchen visualization.

**Flow:**

1. The manager creates or edits layout dimensions and equipment and activates a valid configuration. Configuration writes require manager authorization.
2. The viewer reads the active configuration through the application API; it does not persist changes to the configuration.
3. The SPA embeds the 3D module and represents the configured kitchen and assembly-line equipment using the implemented geometry, materials, lighting, and perspective-camera interactions.
4. Interactive lighting controls affect the current visualization. They do not change the stored kitchen configuration unless a separate authorized save operation is explicitly used.

**Failure and recovery:** Invalid configuration is rejected. If no active layout or the 3D resources cannot be loaded, the UI reports the unavailable state instead of presenting a false saved configuration.

**Architectural drivers and evidence:** WEB06 and VIS01–VIS07 require separation between configuration management and visualization. The kitchen viewer is available to authorized restaurant staff; the editor is manager-only. This scenario does not claim an animated, operational production simulation beyond the VIS03 scope.

## 7. KS-05 — Read-only bill of materials calculation

**Actors:** Manager through the AI planning interface; backend and Prolog service collaborate.

**Trigger:** An authorized manager requests a bill of materials/requirements calculation for the supported product and planning inputs.

**Flow:**

1. The backend obtains the relevant recipe, component, size, stock, and forecast data from its repositories and constructs a bounded knowledge-base/payload for the AI service.
2. The backend calls the Prolog service over the documented HTTP/JSON boundary. The Prolog process evaluates the supplied facts/rules and returns a calculation result.
3. The backend validates and maps the result to application DTOs for the SPA.
4. The calculation is advisory and read-only: it does not mutate stock or create a purchase order.

**Failure and recovery:** Invalid inputs or an unavailable/unparseable Prolog response are surfaced as a controlled service error; partial results are not presented as a successful execution.

**Architectural drivers and evidence:** AI01, AI05, and AI06; [ADR-012](03-rationale/ADR-012-ai-planning-engine.md) and [ADR-013](03-rationale/ADR-013-planning-results.md). Only pizzas are expanded through their recipes; non-pizza products are not recursively expanded. Stock-controlled, directly sold non-pizza products are represented as direct requirements only where the AI01 contract calls for them. See [AI01](../user-stories/AI01/requirements.md) and Clarification #28 in [client clarifications](../domain/client-questions.md).

## 8. KS-06 — Daily planning with on-time priority and immutable results

**Actors:** Manager.

**Trigger:** A manager selects a consumption forecast, a confirmed supplier scenario, and a reference date, then executes planning or replays a previous execution.

**Flow:**

1. The backend verifies the manager’s authority and loads a consistent snapshot of forecast, supplier scenario, pending deliveries, and stock.
2. The planning service exports the required business data to Prolog without customer PII. Planning carries hypothetical remaining stock and deliveries forward across the simulated days, without changing persisted stock.
3. On each day, needs due that day or in the future have priority over needs already overdue. Available stock/deliveries are allocated in that order. Results distinguish unmet on-time needs (`unmetOnTime`) from quantities that satisfy previously late needs (`lateFulfilled`) and preserve any remaining unmet quantities.
4. Supplier proposals identify suggested replenishment and delivery dates. A proposal is a recommendation, not a purchase order or confirmation.
5. The result retains the source snapshot/provenance. Replaying an execution uses the stored execution inputs and does not recalculate it against changed current data.

**Failure and recovery:** Missing or incompatible inputs, Prolog failure, or persistence failure do not yield a successful result. Repeated calls do not change stock or create duplicate operational orders.

**Architectural drivers and evidence:** AI02, WEB07, [client clarifications #26 and #51](../domain/client-questions.md), [ADR-012](03-rationale/ADR-012-ai-planning-engine.md), and [ADR-013](03-rationale/ADR-013-planning-results.md). The UI exposes execution, result inspection, and replay to managers.

## 9. KS-07 — Prolog boundary, data minimization, and resilience

**Actors/components:** SPA, backend API/application services, relational database, Prolog planning service.

**Trigger:** A supported AI operation is requested.

**Flow and constraints:**

1. The SPA calls the backend; it does not connect to the database or Prolog directly.
2. The backend remains the system of record and performs authorization, data selection, validation, DTO mapping, and persistence of the execution/result.
3. The backend sends the Prolog service only the domain facts needed for the calculation, over the documented JSON-over-HTTP contract. Customer identity and unrelated personal data are excluded.
4. Prolog calculates; it has no direct database credentials and cannot commit operational changes.
5. The backend validates the response and stores/returns an immutable result snapshot with its input provenance.

**Quality attributes:** Modifiability through an explicit service boundary; confidentiality through data minimization; resilience through bounded timeouts and controlled error mapping; reproducibility through snapshots.

**Evidence:** AI05, AI06, [ADR-012](03-rationale/ADR-012-ai-planning-engine.md), and [ADR-013](03-rationale/ADR-013-planning-results.md). The interchange decision is JSON over HTTP; native Prolog terms and content-negotiation via `Accept` are not the selected contract.

## 10. KS-08 — Distinguish customer drafts, planning proposals, and transactions

**Actors:** Customer, manager.

**Flow and boundaries:**

1. A customer can browse the catalogue and maintain a local cart draft. The Sprint 2 implementation does not provide an end-to-end checkout, payment, accepted order, or customer order-history transaction.
2. A manager can run AI planning and inspect supplier proposals. A proposal is not a confirmed supplier order, and planning does not alter stock.
3. Stock changes remain explicit back-office stock-management operations. They are not side effects of catalogue browsing or AI planning.

**Architectural drivers and evidence:** This separation prevents the UI or documentation from implying financial or operational effects that do not exist. See WEB01, WEB07, AI02, Clarification #26, and the implementation status recorded in [`frontend-implementation-and-maintenance.md`](../architectural/frontend-implementation-and-maintenance.md).

## 11. Traceability and maintenance

| Scenario | Primary user stories / decisions |
|---|---|
| KS-01 | AA01–AA04, AA07; Clarifications #50, #53 |
| KS-02 | AA03, AA05–AA07; Clarification #24; authorization ADRs |
| KS-03 | BCK01–BCK11, WEB01–WEB05; system specification and product clarifications |
| KS-04 | WEB06, VIS01–VIS07 |
| KS-05 | AI01, AI05, AI06; ADR-012 |
| KS-06 | AI02, WEB07; Clarifications #26, #51; ADR-012, ADR-013 |
| KS-07 | AI05, AI06; ADR-012, ADR-013 |
| KS-08 | WEB01, WEB07, AI02; Clarification #26 |

When requirements or implementation change, update the affected scenario and its traceability together. Do not use this document to claim acceptance criteria are met; acceptance evidence belongs in the corresponding user-story requirements and project validation records.

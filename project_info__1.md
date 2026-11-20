# LaPrizza — Sprint 2 status and close-out roadmap

**Last reviewed:** 20 November 2026

**Purpose:** concise, current view of implementation progress, open work, and validation evidence. This document supersedes the duplicated audit and roadmap sections previously accumulated here.

## How to read this roadmap

- **Implemented** means the capability is present in the code or deliverable inspected. It does not certify every acceptance criterion or an unexecuted operational scenario.
- **Partial** means a known requirement is still absent, differs from the agreed behavior, or lacks evidence required for acceptance.
- **Validate** is evidence work for an implementation already present; it is not listed as a missing implementation.
- Percentages are planning estimates of acceptance-scope coverage, not grades or automated measurements. Where a story depends on external approval or a live environment, evidence gaps lower the estimate.
- Status below reflects the implementation and documentation reviewed for this update.

## Executive status

Sprint 2 has working implementations across authentication, back-office management, AI planning, and 3D kitchen visualization. Clarification #55 exposes a material AI06 architecture mismatch: the running design pushes the full dataset from the backend to Prolog, while the client requires Prolog to pull business data from authenticated backend endpoints. This roadmap does **not** claim 100% project compliance: acceptance evidence and work remain open, particularly AI01/AI02/AI06, SYS05, GDPR decisions, and deployment/continuity evidence. The AA01 non-enumeration regression tests passed. The user has now confirmed the BCK02 customer-management workflow and the relevant WEB05 searches, empty states, permissions, compact layout, and customer back-office redirect in the browser.

The largest functional limitations still open are the AI06 Clarification #55 data-flow mismatch and incomplete SYS05 security controls. The BCK02 commercial `Customer` aggregate and the identified WEB05 searches are implemented; their remaining acceptance checks are listed below. The cart remains a local draft; customer checkout, payment, order history, and purchase-order creation are outside the delivered Sprint 2 scope.

## Implemented work — remove from implementation backlog

| Area | Current implementation / deliverable | Remaining evidence or boundary |
|---|---|---|
| **AA05 authorization defaults** | Protected routes now require explicit `@Roles(...)` or authenticated-only policy; public routes are explicitly marked. Active account status is required by default. Controller inventory and guard regression tests have been added. | Run the new tests and reconcile the stale AA05 note in `requirements.md`; verify the public-route/OpenAPI inventory and ownership rules. |
| **AA01 recovery** | Recovery requests for unknown/inactive accounts use non-enumerating responses. Both account-enumeration regression tests passed, including the email-delivery-failure case. | Verify successful recovery email delivery and password reset end to end in the configured environment. |
| **BCK02 commercial customers** | A distinct commercial `Customer` aggregate supports create/read/update/delete, optional user linking/unlinking, contact and VAT details, delivery addresses/default address, and dietary restrictions. The user confirmed the customer workflow and persistence after refresh/reopen, plus field validation, account/profile operations, and deletion rules in the browser. Migration 024 is applied; customer relations use normalized email FKs. Save displays explicit success feedback. | Acceptance scenarios for this workflow are reported tested by the user. The UUID remains the profile's own identifier, not these relation FKs. |
| **WEB05 customer directory and searches** | `/backoffice/customers` manages commercial customer profiles for authorized Managers, separately from the directory of `User` accounts with the `CUSTOMER` role. The user confirmed the relevant searches, empty states, role behavior, compact layout, and customer-role redirection in the browser. Customers are returned to the restaurant home page when trying a back-office route; anonymous visitors still reach staff login. | The user reports this verification set passed. Broader WEB05 accessibility and non-customer acceptance checks remain tracked at story level. |
| **WEB05 stock and employee view** | A standalone stock page is present; Manager can adjust stock and Employee has read-only access. Active/inactive filtering is available. Employee read-only product, stock, and pizza-size pages are exposed. | Run role-based UI/API checks and verify BCK09 adjustment semantics; no additional required resource filter is currently identified as missing. |
| **Product/menu filtering** | Product management filters include category, allergen, and component type. The public menu supports multiple categories, allergen exclusion, availability, price range, and sorting by price or catalogue order. Allergen labels use the selected locale. | Browser/responsive and accessibility review remains validation work. “Relevance” preserves API/catalogue order; it is not personalized ranking. |
| **Phone collection and external login** | Shared country/phone input stores the normalized international number. OIDC callback routes customers without a phone directly to profile completion and returns them to the requested local page after completion. | Manually verify Google/OIDC first login, an existing phone profile, safe return URLs, and error/retry paths. |
| **Clarification #50** | Customer actions are gated until an externally authenticated customer provides a phone number. | End-to-end identity-provider verification remains open. |
| **Clarification #51 / AI02** | Prolog planning prioritizes on-time needs over overdue needs and returns `unmetOnTime` and `lateFulfilled` details. The stored result retains the execution snapshot. | Confirm exact returned quantities with a direct Prolog/API scenario and add/execute regression coverage. |
| **Clarification #53** | Browser session state and logout synchronize across tabs through `BroadcastChannel('auth')`, with storage-event support for persistent sessions. | Verify multiple tabs and the fallback when `BroadcastChannel` is unavailable. |
| **AI03 / AI04 documentation** | AI03 includes external scientific references and the Tillster industry link. The AI04 validator now documents and checks its actual scope, including the distinction between recommendations and purchase-order confirmation. | Run `make validate-ai-docs`; peer review and instructor/rubric confirmation remain human evidence. The script does not claim full OpenAPI, Prolog, or link validation. |
| **Use-case / architecture scenarios** | Key architectural scenarios and consolidated/Sprint 2 use-case diagrams are aligned with current actors, scope, and permissions. Sprint 1 diagram is labeled as historical. | Review during the final report/oral defense; no runtime implementation is pending from these document updates. |
| **AI planning safety boundary** | Backend and Prolog communicate through JSON over HTTP; Prolog has no direct database access. Planning is read-only and creates proposals, not purchase orders. | The current direction of business-data transfer is non-conformant with new Clarification #55; redesign and document the Prolog pull flow before treating AI06 as complete. |

## User Story progress

Percentages are estimates; they measure implementation and evidence coverage together. “Validate” identifies a test, review, or external proof still required even when implementation exists.

### Authentication and authorization

| Story | Estimate | State and remaining work |
|---|---:|---|
| AA01 | 90% | Non-enumerating responses passed both regression cases (eligible/unknown/inactive/cooldown and delivery failure). Verify successful email delivery and password reset end to end; broader AA01 registration/activation criteria remain under review. |
| AA02 | 90% | OIDC and phone-completion routing implemented; validate with the configured identity provider. |
| AA03 | 85% | Role resolution is implemented; reconcile older requirements with current role assignment and account behavior. |
| AA04 | 90% | Revocable sessions and cross-tab synchronization present; validate reload, new-tab, logout, and fallback cases. |
| AA05 | 90% | Fail-closed guards and regression tests added; execute tests, reconcile the stale requirement note, and finish endpoint/ownership audit. |
| AA06 | 85% | Invitations, role assignment, history, and last-manager protection exist; resolve the documented `ADMINISTRATOR`/`MANAGER` discrepancy across requirements and implementation. |
| AA07 | 90% | Invitation activation exists; verify expiry, single-use, and reissue end to end. |

### Artificial intelligence

| Story | Estimate | State and remaining work |
|---|---:|---|
| AI01 | 85% | BOM calculation and separate teaching example exist; run direct Prolog examples and settle any remaining aggregate-scope clarification. |
| AI02 | 80% | Daily planning and #51 priority implemented. Validate exact late-fulfilment quantities, delivery dates, limits, replay, and clarify new-execution treatment of forecast days on/before `referenceDate` per #56. |
| AI03 | 90% | Study and bibliography are present; complete peer/rubric review. |
| AI04 | 90% | Technical report and bounded validator are present; run validator and finish manual traceability/examples review. |
| AI05 | 90% | Protected backend-to-Prolog service boundary exists; verify timeout/unavailable-service behavior in the target environment. |
| AI06 | 45% | Current implementation conflicts with #55: backend constructs and pushes the business-data payload. Required: Prolog pulls planning data through authenticated backend endpoints, constructs its per-run KB, and remains unable to access the database directly. Preserve input consistency and replay snapshots. |

### Architecture

| Story | Estimate | State and remaining work |
|---|---:|---|
| ARC01 | 85% | Domain model is present; reconcile legacy requirements/terminology with current decisions. |
| ARC02 | 85% | SAD and ADRs exist; resolve the duplicate ADR-016 numbering and check cross-document links. |
| ARC03 | 85% | API/OpenAPI artefacts exist; verify endpoint, role, DTO, and implementation consistency. |

### Back-office domain

| Story | Estimate | State and remaining work |
|---|---:|---|
| BCK01 | 85% | Authentication and user persistence exist; reconcile superseded role/session assumptions in older requirements. |
| BCK02 | 100% | The user reports the BCK02 customer-management acceptance scenarios tested successfully, including create/edit, profile and address persistence, dietary restrictions, account association, validation, deletion rules, and Manager access. Migration 024 and email-based FKs are confirmed in the local database. |
| BCK03 | 90% | Category management exists; execute acceptance-level UI/API checks. |
| BCK04 | 90% | Allergen management and catalogue association exist; execute acceptance-level checks. |
| BCK05 | 90% | Product management exists with expanded filters; complete remaining WEB05 acceptance checks. |
| BCK06 | 90% | Pizza-size management exists; validate role and input edge cases. |
| BCK07 | 90% | Component-type management exists; validate cardinality constraints. |
| BCK08 | 90% | Size-dependent component configuration exists; validate derived price and stock-unit constraints. |
| BCK09 | 80% | Stock page and increase/decrease operations exist; verify correction semantics and no-negative-stock invariant. |
| BCK10 | 90% | Predefined pizza/recipe management exists; validate recipe constraints and derived pricing. |
| BCK11 | 90% | Public catalogue and product details exist; validate availability and allergen behavior. |

### Engineering process and data protection

| Story | Estimate | State and remaining work |
|---|---:|---|
| ENG01 | 70% | Repository and delivery artefacts exist; verify required tag/package and submission evidence. |
| ENG02 | 60% | Board/activity evidence is external to this checkout; confirm team assignments and sprint records. |
| ENG03 | 60% | Individual/peer evaluation evidence is external; confirm submission. |
| GDP01 | 70% | Privacy documentation exists, but #58 assigns classification of dietary restrictions to the team. The existing Art. 9/explicit-consent text must be labelled provisional until the team records its decision; confirm what consent is actually captured. |
| GDP02 | 80% | Rights and data-handling documentation exists; verify implemented request paths and approval. |
| GDP03 | 80% | Security/audit documentation exists; exercise and retain operational evidence. |

### Systems administration and continuity

| Story | Estimate | State and remaining work |
|---|---:|---|
| SYS01 | 85% | Deployment pipeline/scripts exist; validate a reproducible deployment and rollback in the target environment. |
| SYS02 | 75% | Network rules are documented/scripted; prove behavior on the DEI/VPN network. |
| SYS03 | 75% | Egress controls exist; execute and retain allow/deny and rollback evidence. |
| SYS04 | 80% | Shared resource configuration exists; verify host permissions, audit, and revocation. |
| SYS05 | 55% | Partial: required post-failure MFA and alerting are still identified as absent in the story; implement and demonstrate them. |
| SYS06 | 75% | Risk register exists; confirm owners, scoring, and evidence with the team. |
| SYS07 | 70% | Recovery objectives are documented as proposals; obtain approval and run an exercise against them. |
| SYS08 | 80% | Backup/restore scripts and policy exist; produce current restore, retention, and deletion evidence. |

### 3D kitchen visualization

| Story | Estimate | State and remaining work |
|---|---:|---|
| VIS01 | 90% | 3D module is integrated; validate the route and loading in the target browser. |
| VIS02 | 90% | Active kitchen layout and equipment are represented; perform visual/layout review. |
| VIS03 | 90% | Assembly-line equipment representation exists; distinguish static representation from future animation. |
| VIS04 | 85% | Materials/textures are present; verify visual quality and rubric constraints. |
| VIS05 | 90% | Scene lighting and shadows are implemented; review visual/performance behavior in browser. |
| VIS06 | 85% | Interactive light controls exist; confirm applicability to team size and test interaction. |
| VIS07 | 90% | Perspective camera controls exist; verify required interactions in browser. |

### Web application

| Story | Estimate | State and remaining work |
|---|---:|---|
| WEB01 | 85% | Storefront, catalogue, and local cart draft exist; checkout is outside Sprint 2. Validate phone-gated customer actions. |
| WEB02 | 85% | PT/EN, navigation, and responsive structure exist; complete accessibility review. |
| WEB03 | 85% | Role-aware routes/navigation exist; verify stale-session/role-change behavior and direct-route denial. |
| WEB04 | 85% | Validation and feedback components exist; complete error-path and accessibility checks. |
| WEB05 | 95% | User confirmed the relevant resource searches, empty-result behavior, Manager/Employee access checks, compact search layout, and customer-role redirect in the browser. Commercial customer management remains separate from customer-role user search. Remaining percentage reflects broader WEB05 acceptance and accessibility review beyond this verification set. |
| WEB06 | 90% | Kitchen configuration and viewer integration exist; browser/E2E validation remains. |
| WEB07 | 90% | Forecast/scenario management, execution, results, and replay exist; validate read-only and Prolog failure paths. |

## Open work — implementation or decision still required

### Priority 1 — Acceptance gaps

1. **AA01 recovery end-to-end:** verify delivery of a recovery email and a successful password reset in the configured environment. The two account-enumeration unit cases have passed.
2. **SYS05 privileged access:** implement the required post-failure MFA, alert threshold, and evidence lifecycle described in its acceptance criteria. Do not mark this story complete based only on SSH key/time-window controls.
3. **AI01/AI02 Prolog semantics:** run direct predicate scenarios for BOM expansion, on-time/late allocation, delivery dates, indivisible lots, offer limits, and replay. Reconcile any unresolved Clarification #41/#44 interpretation with the accepted story before claiming full conformity.
4. **AI06 / Clarification #55 — architecture change required:** replace the backend-pushed full KB payload with a backend→Prolog invocation carrying execution metadata and Prolog→backend authenticated reads for the required business data. Define service-to-service authentication and endpoint contracts. Reconcile AI06, ADR-012/013, OpenAPI, the project KB, Prolog server/client, and replay. Prolog must never receive DB credentials or write privileges.

### Priority 2 — Requirements and architecture consistency

1. **Clarification #56:** the existing replay path reuses the saved request and original `referenceDate`; preserve this invariant after the #55 redesign. The answer does not settle how a *new* execution treats requirements dated on/before the reference date. Record/confirm the team interpretation before changing that rule.
2. **Clarification #57 / SYS07:** keep all MBCO numbers and procedures marked proposed until the ASIST PL instructor validates them; the Product Owner did not approve them.
3. **Clarification #58 / GDP01:** document the dietary-data classification as provisional and record a team decision after the planned LAPR5 discussion. Do not add category fields or assert the mixed model from the pasted analysis as if it were the teacher's answer. Check whether the explicit consent claimed by the policy is actually captured.
4. **AA05 requirements:** update the stale implementation note that says missing role/status metadata is fail-open; record the current explicit `@Public`, authenticated-only, and role-based policy and the inventory test boundary.
5. **Role terminology:** reconcile `ADMINISTRATOR` and `MANAGER` definitions/permissions across client clarifications, AA06/WEB03 requirements, API, and UI.
6. **ADR numbering:** resolve the duplicate `ADR-016` filenames and update references/index.
7. **AI04 validator:** its documented scope is now accurate. Do not list OpenAPI equivalence, full Markdown link validation, or Prolog predicate verification as implemented by `make validate-ai-docs`; perform these manually or extend the script if they become explicit requirements.
8. **Requirements freshness:** update remaining stale “Current Implementation” sections when a story changes; do not copy roadmap estimates into acceptance criteria as if they were evidence.

### Priority 3 — Operational proof and quality

1. Run the authorization guard and controller-inventory tests, then the complete backend regression suite.
2. Run frontend E2E and responsive/accessibility checks; retain results for authentication/phone completion, back-office permissions, catalogue filters, kitchen, and AI planning.
3. Run `make validate-ai-docs` and execute the direct Prolog examples against the delivered service.
4. Exercise deployment, network controls, SYS05, shared resources, backup/restore, MBCO approval, and incident procedures in the target environment; retain evidence. These cannot be proven from source files alone.
5. Confirm external ENG/GDP approvals and submissions with the team; they are not inferable from this repository.

## Explicit Sprint 2 boundary

The customer cart is a browser-side draft. Sprint 2 does not require or deliver customer checkout, payment, accepted-order history/status, or a purchase-order aggregate/confirmation flow. AI planning returns read-only requirements and supplier recommendations; it does not change stock. Future order or purchasing work needs its own approved requirements and must not be represented as a current Sprint 2 gap.

## Impact of new client clarifications #55–#58

| Clarification | Finding in this project | Required disposition |
|---|---|---|
| **#55 — AI06 Prolog KB responsibility** | **Non-conformant today.** `PlanningService` builds `products`, BOMs, stock, forecast/scenario and offers into a full request; `PrologHttpClient` pushes it to `/api/v1/plan`. The Prolog server has no backend HTTP client. | Major change to AI06/ADR-012, service-authenticated backend read endpoints and Prolog data acquisition. Preserve no-DB-access, no-PII, fresh data, atomicity, result snapshots, and exact replay while changing the data flow. |
| **#56 — past forecast dates/reference date** | Replay currently reuses the stored Prolog request and original reference date. The client has not answered how a new run handles demand dated on/before `referenceDate`. | Keep replay semantics. Treat the past-date case as unresolved; do not attribute option (c) to the client until confirmed by the team/client. |
| **#57 — SYS07 MBCO** | Project MBCO remains a proposal. | Obtain validation from the ASIST PL instructor; do not mark proposed targets approved. |
| **#58 — dietary restrictions/GDPR** | The policy now labels health-data classification and explicit consent as provisional; schema review found no distinct consent record. The clarification leaves the decision to the team and further class discussion. | Record a team decision and rationale after LAPR5 discussion; verify actual consent collection/access/retention before claiming controls are implemented. No schema choice is implied by #58. |

## Verification record for this update

The user ran `PasswordRecoveryService.spec.ts`: 2/2 account-enumeration cases passed, including generic responses for unknown/inactive/sent/cooldown accounts and delivery failure. Backend `npm run build` completed. The user verified the BCK02 customer workflow in the browser, including profile creation/editing, address/default-address and dietary persistence, association behavior, validation feedback, deletion rules, and role access; all reported successful. The user also confirmed WEB05 searches/empty results, permissions, revised compact layout, and customer-role redirection after rebuilding; all reported successful. The frontend production build passed for the latest changes. Earlier local DB inspection confirmed migration `CustomerBusinessKeyRelations1795300000000` and the three email-based FKs (`customer_addresses`, `customer_orders`, `customer_dietary_restrictions` → `customers.email`) with no `customer_id` columns in those tables. Clarifications #55–#58 remain recorded above; the AI06 #55 architecture gap is still open. These checks do not constitute completion of every Sprint 2 acceptance criterion.

## Source of truth

Acceptance scope comes from the official Sprint 1/Sprint 2 User Stories and applicable system specifications. Client clarifications refine that scope. Theoretical support documents inform implementation and justification; they do not override the user stories. Requirements files and code are checked against those sources, while this roadmap remains a summary and must not replace them.

Primary repository references: [`client-questions.md`](docs/domain/client-questions.md), [`content-knowledge-base.md`](docs/contents/content-knowledge-base.md), [`AI04 requirements`](docs/user-stories/AI04/requirements.md), [`AA05 requirements`](docs/user-stories/AA05/requirements.md), [`WEB05 requirements`](docs/user-stories/WEB05/requirements.md), [`AI01 requirements`](docs/user-stories/AI01/requirements.md), [`AI02 requirements`](docs/user-stories/AI02/requirements.md), [`key architectural scenarios`](docs/sad/05-key-scenarios.md), and [`consolidated use cases`](docs/architectural/use_case_diagram.md).

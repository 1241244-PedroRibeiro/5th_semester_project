# Technical Test-Coverage and Robustness Report: LaPrizza Back-End — Sprint 1

**Project:** LaPrizza Information System

**Author:** Eduardo Vasconcelos (1240697)

**Scope:** BCK01 — Registration and Authentication; BCK02 — User Information and Dietary Restrictions; BCK07 — Pizza Component Type Management; associated Jest and Bruno suites.

## 1. Objective and Validation Approach

This report documents the test suites associated with the three user stories I implemented during Sprint 1. The objective is to verify successful workflows, input validation, authorization, ownership, persistence mapping and consistency after rejected operations.

The report follows the structure of the other contributors' reports and describes the current test files and their assertions. Request counts are a source inventory, not execution results. No new Jest, Bruno or build run was performed when preparing this document, so no passing totals or coverage percentages are claimed.

## 2. Individual User Story Analysis

### 2.1. BCK01 — Registration and Authentication

#### 2.1.1. Business Applicability and API Behaviour

BCK01 provides public customer registration and login, together with manager-controlled preregistration of employees and managers. Registration can also complete an existing pending staff account while preserving its identity and assigned roles.

The implemented endpoints are `POST /auth/register`, `POST /auth/login` and `POST /auth/pre_register`. Registration supplies identity details and a password; the backend generates the username. Preregistration requires an active manager and accepts a staff role. Login must reject invalid credentials, pending registrations and deactivated accounts.

#### 2.1.2. Test Scenarios

| Area | Scenarios represented in the suites |
| --- | --- |
| Registration | Successful creation, duplicate email, invalid email, weak password and invalid names. |
| Username generation | Derivation from normalized email, numeric collision suffixes, and a concurrent uniqueness-conflict retry at service level. |
| Authentication | Successful login, wrong password, unknown user, invalid email, pending accounts and deactivated accounts. |
| Staff preregistration | Active-manager success; duplicate email; invalid or missing role; rejection of the customer role; invalid names/email; missing or invalid token; forbidden role/status combinations. |
| Pending registration completion | Service-level verification that completing an invitation preserves the existing username and roles. |
| Token validation | Public-route bypass, invalid/expired tokens, deleted subjects and loading current roles/status from the repository instead of trusting token claims. |

The HTTP assertions include `201` for successful registration/preregistration, `200` for login, `400` for invalid input or pending login, `401` for invalid credentials/authentication, `403` for forbidden access or deactivated login, and `409` for duplicate email. Error status codes are evaluated in their specific scenario rather than treated as interchangeable.

#### 2.1.3. Relevant Suites

- Jest: `tests/unit/application/auth.service.spec.ts`, `tests/unit/presentation/auth.guard.spec.ts` and `tests/integration/auth.controller.spec.ts`.
- Shared domain checks: `tests/unit/domain/user.spec.ts` covers roles, status, identity, passwords and timestamps.
- Bruno: [BCK01 collection](../../../backend/tests/bruno/LaPrizza/BCK01-Register_n_Login/).

The Bruno collection contains **39 HTTP request files**: 8 setup requests, 5 registration-error requests, 9 login-error requests and 17 preregistration-error requests.

### 2.2. BCK02 — User Information, Dietary Restrictions and Contact Details

#### 2.2.1. Business Applicability and API Behaviour

BCK02 lets customers consult their own information, record and consult dietary restrictions, complete their contact details and deactivate their account. Managers can consult user information and restrictions, list/filter accounts and deactivate selected users.

Phone number and address updates are steps within profile maintenance, rather than independent business use cases. The current contact endpoints also allow active employees and managers to update their own contact details.

| Endpoint group | Functionality |
| --- | --- |
| `GET /user/:username` | Consult public user information, subject to role and ownership checks. |
| `GET /user/:username/allergens`, `POST /user/:username/allergen` | Consult restrictions and associate allergen names with the authenticated customer's account. |
| `GET /users`, `GET /users/filter/creation-date/:date`, `GET /users/filter/role/:role`, `GET /users/filter/status/:status` | Manager-only listing and filtering with pagination. |
| `PUT /user/me/address`, `PUT /user/me/phone-number` | Set or replace the authenticated account holder's contact details. |
| `DELETE /user/:username` | Deactivate an account; this is not permanent deletion. |

#### 2.2.2. Test Scenarios

- **Ownership and privacy:** customers can read their own information but cannot read another account. Managers can consult customer records. Shared response fields exclude credentials and `updatedAt`; contact values are returned by the contact-update response without expanding the existing shared profile response.
- **Path identity:** tests check that the path username determines the target even when a body supplies a different username. Access to another customer's restrictions is rejected before application services are called.
- **Dietary restrictions:** record an allergen by name, retrieve the associated names and repeat the association without duplication. Tests also exercise empty selection, forbidden manager writes, and missing/invalid authentication.
- **Filtering and pagination:** manager-only access; role, status and UTC creation-date filters; default pagination; subsequent and empty pages; invalid dates, roles and statuses; invalid page values and page sizes above 100. Service tests also check stable ordering and total counts.
- **Deactivation:** a customer can deactivate their own account and a manager can deactivate another user. A customer cannot deactivate another account.
- **Contact details:** set and replace an address or phone number, reject empty street/invalid phone input, reject extra identifier fields and require authentication. Contact integration tests cover active customers, managers and employees, inactive accounts and deleted token subjects.
- **Preservation:** changing one contact field must preserve the other. Tests also cover optional contacts for existing users, preservation across unrelated aggregate saves, and clearing omitted address `extraDetails` to an empty string.

Authorization precedes lookup in several customer operations. Consequently, an unknown target username returns `403` for customer reads or allergen association, while attempting to deactivate another username currently returns `401`. Manager lookup of a missing account returns `404`. Some historical filenames mention UUIDs, but current routes identify users by username.

#### 2.2.3. Relevant Suites

- Services: `tests/unit/application/user.service.spec.ts` and `tests/unit/application/user.filters.spec.ts`.
- Domain and persistence mapping: `tests/unit/domain/user.spec.ts` and `tests/unit/infrastructure/user.persistence.spec.ts`.
- Presentation and wiring: `tests/unit/presentation/user.controller.spec.ts` and `tests/unit/presentation/user.module.spec.ts`.
- HTTP integration: `tests/integration/user.filters.controller.spec.ts` and `tests/integration/user.contact.controller.spec.ts`.
- Bruno: [BCK02 collection](../../../backend/tests/bruno/LaPrizza/BCK02-Maintain_User_Information/).

The Bruno collection contains **58 HTTP request files**: 4 setup, 5 information reads, 3 path/ownership checks, 17 listing/filtering requests, 16 dietary-restriction requests, 3 deactivation requests, 5 address requests and 5 phone-number requests.

### 2.3. BCK07 — Pizza Component Type Management

#### 2.3.1. Business Applicability and API Behaviour

BCK07 defines the types used to classify pizza components, their assembly sequence and the minimum/maximum number permitted in a pizza. These values support recipe validation and consistent assembly ordering.

Public consultation uses `GET /pizza-component-types` and `GET /pizza-component-types/:name`. Creation, update and deletion require an active manager through `POST /pizza-component-types`, `PUT /pizza-component-types/:name` and `DELETE /pizza-component-types/:name`.

Names are immutable natural identities. Assembly orders must be positive integers and unique; minimum cardinality must be a non-negative integer; a bounded maximum must be an integer at least as large as the minimum. A `null` maximum represents an unbounded cardinality and must survive API/domain/storage mapping.

#### 2.3.2. Test Scenarios

| Area | Scenarios represented in the suites |
| --- | --- |
| Creation | Bounded/unbounded cardinality, duplicate name/order, missing required fields, blank name, zero/fractional/string order, negative/fractional minimum, and invalid maximum. |
| Authorization | Missing authentication and customer mutations; HTTP integration also checks persisted pending/deactivated manager statuses. |
| Consultation | Paginated `items` response, name and assembly-order search, no matches, repeated search-parameter rejection, existing name and missing name. |
| Updates | Immutable name, duplicate order, invalid bounds, successful order/bounds changes, omitted-field preservation, independent bound updates, restoring `null` maximum and missing records. Service tests verify that rejected changes are not persisted. |
| Deletion | Unauthorized request, successful deletion of an unreferenced type, subsequent missing-record response and conflict for a type referenced by an inactive product. |
| Persistence | Name-based parameterized lookup/search, unbounded-value mapping to SQL `NULL`, uniqueness-conflict mapping and foreign-key error translation. |

Expected HTTP outcomes include `201` for creation, `200` for successful reads/updates/deletion, `400` for invalid input or attempted renaming, `401` for missing authentication, `403` for forbidden mutations, `404` for missing types and `409` for duplicate values or protected references.

#### 2.3.3. Relevant Suites

- Domain: `tests/unit/domain/pizza/PizzaComponentType.test.ts`.
- Application: `tests/unit/application/pizza-component-type.service.spec.ts`.
- Persistence mapping: `tests/unit/infrastructure/pizza-component-type.persistence.spec.ts`.
- HTTP integration: `tests/integration/pizza-component-type.controller.spec.ts`.
- Bruno: [BCK07 collection](<../../../backend/tests/bruno/LaPrizza/BCK07-Manage PizzaComponentType/>).

The Bruno collection contains **46 HTTP request files**: 3 setup, 21 POST/create, 5 GET/list, 3 GET/by-name, 10 PUT/update and 4 DELETE/remove requests. The POST and PUT folders include fixture-preparation or supporting operations; these totals describe files, not only requests using the folder's named HTTP method.

## 3. Testing Layers and Evidence

| Layer | What the existing tests check | Evidence limits |
| --- | --- | --- |
| Domain and application tests | Business rules, transitions, ownership of restrictions, update behaviour, filtering and username allocation. | In-memory repositories and mocks do not establish live database behaviour. |
| Guard and controller tests | JWT handling, persisted permissions/status, ownership, HTTP status mapping and response contracts. | The path-parameter controller suite stubs authentication to isolate routing/ownership; other HTTP suites register real guards. |
| Persistence tests | SQL parameters, mapping, nullable contacts/cardinality, transaction calls and database-error translation. | The user and component-type persistence suites mock the PostgreSQL pool; simulated foreign-key errors are not live constraint tests. |
| Bruno collections | HTTP workflows against a running API, including setup dependencies and negative scenarios. | Results depend on the selected environment, schema, seed data, tokens and prior requests. |

### 3.1. Current Bruno Inventory

| Collection | HTTP request files, including setup | Execution status for this report |
| --- | ---: | --- |
| BCK01 | 39 | Not rerun |
| BCK02 | 58 | Not rerun |
| BCK07 | 46 | Not rerun |
| **Total** | **143** | **Inventory only** |

An error response is a successful negative-test outcome when it matches the intended rejection. Conversely, merely returning an error is insufficient: assertions must verify the relevant status, message, response fields or preserved state.

Request-file counts are not assertion counts or total network calls. Several scripts issue additional setup, verification or cleanup requests through `bru.sendRequest`. Parameterized Jest tests likewise expand into multiple cases, so counting test declarations does not provide a reliable execution total.

### 3.2. Reproduction and Environment Requirements

1. Configure the running API and PostgreSQL schema. Existing databases need the applicable migrations, including `013_user_contact_details.sql` for contacts; the Bruno collections do not apply migrations.
2. Select Bruno's Local environment and verify `baseUrl`, seeded manager credentials and the JWT signing secret used by locally signed inactive/pending fixture tokens.
3. Run each collection sequentially from setup. Capture tokens, usernames, names and product SKUs from setup rather than assuming fixed identifiers.
4. In BCK02, repeat setup before rerunning account reads after deactivation. The address and phone folders each create a separate customer and can run independently; their final request deactivates that customer.
5. In BCK07, run setup before the full workflow. It reads all result pages before allocating unique assembly positions. The PUT folder has separate preparation and cleanup, allowing it to run independently from request `00`.
6. Record the runner output, tested revision and environment when reporting pass/fail totals. Recheck the failed request and its prerequisites before changing application behaviour or assertions.

From `backend/`, `npm run build` compiles the application and `npm test -- --watch=false` runs the configured Jest suites. These commands are documented for reproduction, not reported as executed here. Jest selects `.spec.ts` and `.test.ts` files; the adjacent `PizzaComponentType.test.js` is not a separate configured suite.

### 3.3. State and Repeatability Limits

BCK01 leaves registered users and staff invitations in the database. BCK02 leaves accounts and dietary associations, including deactivated test accounts. BCK07 retains the bounded component type and referencing product used to verify deletion protection; blocking the product must not release that reference. Unique fixture names and all-page assembly-order allocation reduce collisions, but do not establish an empty database or guarantee repeatability in every environment.

## 4. Conclusion

The BCK01, BCK02 and BCK07 suites provide checks across domain behaviour, application services, security, HTTP contracts and persistence mapping. Their Bruno collections contain 143 HTTP request files covering successful operations and rejection paths, including account ownership, persisted authorization, profile preservation, cardinality updates and referenced-type deletion protection.

This report documents the existing coverage and how to reproduce it. Actual passing totals and live PostgreSQL reliability require recorded execution against the intended revision and environment; source inspection alone does not establish those results.

# REST API Design Specification & Architectural Contract Guidelines

## Implemented logout contract (2026-11-04)

`POST /auth/logout` accepts the current bearer JWT and returns `204` after revoking its PostgreSQL session. Subsequent protected reads and writes with that JWT return `401`; independently issued sessions remain active. Missing, expired, unknown, legacy (no `sid`), and already revoked credentials return `401`. Storage failures return a server error and must not be presented as completed logout. Angular waits for confirmation before clearing credentials and redirecting. See [ADR-004.2](03-rationale/ADR-004.2-auth.md), which partially supersedes the original authentication decision.

## Unauthorized endpoint attempt logging (2026-11-04)

Authenticated `403 Forbidden` responses create a PostgreSQL audit row with the verified username, timestamp, and method/route pattern. This includes role, account-status, and ownership denials. `401` responses and requests without a verified user are excluded. Responses retain the existing error envelope; a logging failure keeps the operation forbidden and emits only a generic server diagnostic. No new HTTP endpoint is introduced. See [ADR-015](03-rationale/ADR-015-unauthorized-access-logging.md).

## Password recovery (implemented 2026-11-05)

Both recovery endpoints are public and accept JSON body arguments. `POST /password-recovery` takes `{email}` and returns `200` after submitting a PENDING code for a registered ACTIVE account. Invalid input returns `400`, unknown/inactive accounts `404`, cooldown `429` with `Retry-After`, and SMTP/configuration failure `503`. `POST /password-recovery/new_pass` takes `{recovery_code, new_password}` and returns `200` after an atomic password update, USED status, and session revocation. Invalid input/password returns `400`, unknown codes `401`, inactive accounts `404`, USED codes `409`, and expired codes `410`. Codes are usable once within five minutes; requests have a 30-minute per-account cooldown even after use. Responses contain only confirmation/error messages and use no-store caching. See [ADR-016](03-rationale/ADR-016-password-recovery.md).

## Item pictures (implemented 2026-11-19)

Pictures of products and predefined pizzas are served and uploaded by `ImageController` and stored as `<SKU>.<ext>` in the `laprizza-pictures` Docker volume (`/app/data/pictures`). `GET /images/{nameOrSku}` is public and resolves the identifier as a product SKU, then a product name, then a predefined pizza recipe name (names are case-insensitive). It returns the picture in its native media type. When the item or its picture does not exist, it returns `200` with a default SVG picture stating that there is no image related to the item, flagged by `X-Image-Placeholder: true`. An empty identifier returns `400`. `POST /images/{nameOrSku}` requires an ACTIVE MANAGER and a `multipart/form-data` body with one `image` field (JPEG, PNG, WEBP or GIF, at most 5 MB, content matching the declared type). It replaces any previous picture of the item and returns `201` with `{sku, fileName, contentType, size}`. Invalid files return `400`, unknown items `404`, and files over 5 MB `413`. The back-office requires a picture when creating a product or a predefined pizza and uploads it right after the item is saved. See [ADR-018](03-rationale/ADR-018-item-pictures-volume.md) and [ADR-005.2](03-rationale/ADR-005.2-rest-api.md).

## 1. Executive Summary and Contract-First Methodology
In strict compliance with User Story `ARC03` (*REST API*) and the engineering tenets of the 5th-semester Integrative Project at ISEP, this document establishes the formal design guidelines, transport conventions, and Data Transfer Object (DTO) contracts for the **LaPrizza Back-End REST API**[cite: 81, 93].

To ensure multi-team alignment before controllers and route handlers are implemented in Express, the project enforces a strict **API-First / Contract-First** development paradigm[cite: 71, 74, 94]:
1. **Machine-Readable Baseline:** The accompanying OpenAPI 3.0 specification (`docs/api/openapi.yaml`) serves as the authoritative, binding source of truth for all network communication[cite: 74, 94].
2. **Decoupled Client Progress:** The Web Application Single Page Application (SPA), the Three.js 3D interaction canvas (`SGRAI`), and the Prolog scheduling agent (`IART`) build integration fixtures directly against these documented DTO models without waiting for back-end database migrations[cite: 71, 108, 109, 110].
3. **Automated Verification:** End-to-end integration test suites (Jest and Supertest) validate Express routes and status code compliance directly against these declared contracts (`ARC05`)[cite: 74, 75, 95].

---

## 2. Global Conventions, Uniform Resource Identifiers & Protocols

### 2.1. Protocol and Content Negotiation
* **Base Path:** `/api/v1` (explicitly versioned to prevent breaking downstream consumers)[cite: 74].
* **Transport:** HTTPS mandatory in production; unencrypted HTTP accepted exclusively in local container development[cite: 74].
* **Serialization:** Payloads are transmitted exclusively as `application/json` encoded in UTF-8[cite: 74]. The only exception is the item picture resource (`/api/v1/images/{nameOrSku}`), which accepts `multipart/form-data` uploads and returns images in their native media type (see *Item pictures* above and [ADR-005.2](03-rationale/ADR-005.2-rest-api.md)).
* **Casing Standards:**
  * **URIs & Resource Paths:** Lowercase with hyphens (`kebab-case`), e.g., `/api/v1/pizza-component-types`[cite: 74].
  * **JSON Attributes (DTOs):** Camel case (`camelCase`), e.g., `stockUnitsConsumed`, `sellableProductCode`[cite: 74].
  * **Enumerations & Constants:** Screaming snake case (`UPPER_SNAKE_CASE`), e.g., `MANAGER`, `TYPE-CHEESE`[cite: 85].

### 2.2. HTTP Method Semantics
API routes strictly reflect standard REST uniform interface rules as formalized in **ADR 005**[cite: 74]:
* `GET`: Safe and idempotent. Used exclusively to retrieve representations of entities or collections. Must never mutate underlying database state[cite: 74].
* `POST`: Non-idempotent. Used to append new resources to collections (e.g., creating a product) or execute atomic business operations (e.g., `/stock/{code}/adjustments`)[cite: 74]. Returns HTTP `201 Created` with a `Location` header or HTTP `200 OK` for transactional adjustments[cite: 74].
* `PUT`: Idempotent full replacement. Replaces the target entity state with the supplied DTO representation[cite: 74].
* `DELETE`: Idempotent removal or safe lifecycle deactivation. Returns HTTP `204 No Content` upon successful execution[cite: 74].

---

## 3. Role-Based Access Control (RBAC) & Endpoint Permissions Matrix

In accordance with official client clarifications, Sprint 1 enforces three distinct user roles: `MANAGER`, `EMPLOYEE`, and `CUSTOMER`[cite: 85, 101, 105]. Access permissions are guarded at the HTTP routing perimeter via JWT authentication middleware[cite: 73, 85].

The BCK01, BCK02 and BCK07 entries reproduce the endpoints, access rules and outcomes from section 1.6 of their respective requirements documents: [BCK01](../user-stories/BCK01/requirements.md#16-http-api), [BCK02](../user-stories/BCK02/requirements.md#16-http-api) and [BCK07](../user-stories/BCK07/requirements.md#16-http-api). BCK02 describes the required customer API pending implementation. BCK01 and BCK07 paths combine the controller prefix and method route without an API version prefix (for example, `auth` + `register` is `/auth/register`). BCK02 paths use the same notation for its planned customer API; no customer controller currently implements these routes. Other stories retain their existing URI notation. `:parameter` denotes a path parameter; query strings show optional usage examples. For these entries, the listed outcomes take precedence over the general conventions and older DTO examples elsewhere in this document where they differ. An em dash means outcomes have not been specified here for the other stories.

| User Story | HTTP Method | Resource URI | Permitted Roles / Visibility | Scope & Functional Intent | Success | Other outcomes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **BCK01**[cite: 85] | `POST` | `/auth/register` | Public | Registers customers or completes pending registration. | 201, JWT token and user summary | 400 invalid email, password or user details; 409 email already registered outside pending registration |
| **BCK01**[cite: 85] | `POST` | `/auth/login` | Public | Authenticates credentials and issues a JWT linked to a persisted, revocable session. | 200, JWT token and user summary | 400 pending registration; 401 invalid credentials; 403 deactivated account |
| **BCK01**[cite: 85] | `POST` | `/auth/pre_register` | Active Manager | Provisions an account with pending registration status. | 201, user record with pending registration status | 400 invalid email, role or user details; 401/403 access denied; 409 duplicate email |
| **BCK01**[cite: 85] | `GET` | `/users?page=1&pageSize=20` | Active Manager | Lists users with pagination. | 200, paginated users | 400 invalid pagination; 401/403 access denied |
| **BCK01**[cite: 85] | `GET` | `/users/filter/creation-date/:date` | Active Manager | Filters users by creation date (UTC). | 200, paginated users created on the given UTC date | 400 invalid date or pagination; 401/403 access denied |
| **BCK01**[cite: 85] | `GET` | `/users/filter/role/:role` | Active Manager | Filters users by role. | 200, paginated users with the given role | 400 invalid role or pagination; 401/403 access denied |
| **BCK01**[cite: 85] | `GET` | `/users/filter/status/:status` | Active Manager | Filters users by account status. | 200, paginated users with the given status | 400 invalid status or pagination; 401/403 access denied |
| **BCK01**[cite: 85] | `GET` | `/user/:userId` | Active Manager or Customer reading their own account | Retrieves user account information. | 200, user record | 400 malformed UUID; 401/403 access denied; 404 missing user |
| **BCK01**[cite: 85] | `DELETE` | `/user/:userId` | Active Manager or Customer deactivating their own account | Deactivates a user account. | 200, empty body; account deactivated | 400 malformed UUID; 401 unauthorized or Customer targeting another account; 403 role/status denied; 404 missing user |
| **BCK02**[cite: 86] | `POST` | `/customers` | Manager | Registers a customer profile with mandatory contacts. | 201, created customer record | 400 invalid data or references; 401/403 access denied; 409 duplicate customer email |
| **BCK02**[cite: 86] | `GET` | `/customers?search=...` | Manager | Searches registered customer profiles. | 200, matching customer array | 400 invalid search value; 401/403 access denied |
| **BCK02**[cite: 86] | `GET` | `/customers/:id` | Manager | Retrieves a customer profile. | 200, customer record | 400 malformed UUID; 401/403 access denied; 404 missing customer |
| **BCK02**[cite: 86] | `PUT` | `/customers/:id` | Manager | Updates customer profile data. | 200, updated customer record | 400 invalid data, UUID or references; 401/403 access denied; 404 missing customer; 409 duplicate customer email |
| **BCK02**[cite: 86] | `PUT` | `/customers/:id/dietary-restrictions` | Manager or Customer updating their own linked profile | Replaces customer dietary restrictions after validating allergens. | 200, updated dietary restrictions | 400 invalid data/UUID or unknown allergen; 401/403 access denied; 404 missing customer |
| **BCK02**[cite: 86] | `DELETE` | `/customers/:id` | Manager | Removes an unreferenced customer profile. | 200, deletion confirmation | 400 malformed UUID; 401/403 access denied; 404 missing customer; 409 customer referenced by existing business information |
| **BCK02**[cite: 86] | `PUT` | `/user/me/address` | Authenticated active user, own account only | Replaces the user's optional address using `street`, `postalCode`, `city` and optional `extraDetails`. Identity comes exclusively from `@CurrentUser`. | 200, user summary with optional `address` and `phoneNumber` | 400 invalid address or unsupported body fields; 401 missing/invalid authentication or account no longer exists; 403 inactive account; 404 user disappears after authentication |
| **BCK02**[cite: 86] | `PUT` | `/user/me/phone-number` | Authenticated active user, own account only | Replaces the user's optional phone number using `phoneNumber` in E.164 format. Identity comes exclusively from `@CurrentUser`. | 200, user summary with optional `address` and `phoneNumber` | 400 invalid phone number or unsupported body fields; 401 missing/invalid authentication or account no longer exists; 403 inactive account; 404 user disappears after authentication |
| **BCK03**[cite: 86] | `POST` | `/categories` | `MANAGER` | Retains `addCategory`: creates from `categoryName` and optional `description`, returning `{ name }`. | 201, category | 400 invalid input; 401/403; 409 duplicate name |
| **BCK03**[cite: 86] | `GET` | `/categories`, `/categories/:name` | **Public** | Lists/searches categories or reads one by name. List returns an array unless `page`/`pageSize` requests a page (maximum 100 per page). | 200, categories or page/category | 400 invalid query; 404 missing name |
| **BCK03**[cite: 86] | `PUT` | `/categories/:name` | `MANAGER` | Updates name and description; a referenced category may only change its description. | 200, category | 400 invalid input or referenced rename; 401/403; 404 missing; 409 duplicate name |
| **BCK03**[cite: 86] | `DELETE` | `/categories/:name` | `MANAGER` | Deletes an unreferenced category using its URL-encoded name. | 200, confirmation | 401/403; 404 missing; 409 referenced category |
| **BCK04**[cite: 87] | `POST`, `DELETE`| `/api/v1/allergens` | `MANAGER` | Maintains allergen catalogue with delete guard[cite: 87]. | — | — |
| **BCK04**[cite: 87] | `GET` | `/api/v1/allergens` | **Public** | Consults recognized allergens[cite: 87]. | — | — |
| **BCK05**[cite: 87] | `POST`, `PUT` | `/api/v1/products` | `MANAGER` | Registers/updates products (validates type invariants)[cite: 87]. | — | — |
| **BCK05**[cite: 87] | `GET` | `/api/v1/products` | `MANAGER`, `EMPLOYEE` | Administrative querying and filtering of products[cite: 87]. | — | — |
| **BCK05**[cite: 87] | `DELETE` | `/api/v1/products/{code}` | `MANAGER` | Deactivates or removes unreferenced products[cite: 87]. | — | — |
| **BCK06**[cite: 88] | `POST`, `DELETE`| `/api/v1/pizza-sizes` | `MANAGER` | Maintains commercial pizza size tiers[cite: 88]. | — | — |
| **BCK06**[cite: 88] | `GET` | `/api/v1/pizza-sizes` | **Public** | Consults active pizza sizes[cite: 88]. | — | — |
| **BCK07**[cite: 88] | `POST` | `/pizza-component-types` | Manager | Creates a component type with assembly order and cardinality limits. | 201, created record | 400 invalid data; 401/403 access denied; 409 duplicate code/name/order |
| **BCK07**[cite: 88] | `GET` | `/pizza-component-types?search=...&page=1&pageSize=20` | Public | Lists or searches component types by name or exact assembly order, sorted by assembly order. Required `page` and `pageSize` are positive integers (page starts at 1; maximum page size: 100); `search` is optional. | 200, page with `items`, `total`, `page`, `pageSize`, `totalPages`; pages beyond the results have empty `items` and retain the total match count | 400 missing pagination parameters or invalid/repeated search/pagination values |
| **BCK07**[cite: 88] | `GET` | `/pizza-component-types/:id` | Public | Retrieves a component type by UUID. | 200, record | 400 malformed UUID; 404 missing record |
| **BCK07**[cite: 88] | `PUT` | `/pizza-component-types/:name` | Active Manager | Updates `assemblyOrder`, `minCardinality` and/or `maxCardinality`; omitted fields retain their values. The name is immutable; a supplied `name` must match the existing name. `maxCardinality: null` means unbounded. Assembly order must be unoccupied or already belong to this type. | 200, updated record | 400 invalid data or attempted rename; 401/403 access denied; 404 missing type; 409 assembly order occupied by another type |
| **BCK07**[cite: 88] | `DELETE` | `/pizza-component-types/:id` | Manager | Removes an unreferenced component type. | 200, success
| **BCK08**[cite: 89] | `POST`, `PUT` | `/api/v1/products/{code}/size-configurations` | `MANAGER` | Configures size-dependent price and stock consumption[cite: 89]. | — | — |
| **BCK08**[cite: 89] | `GET` | `/api/v1/products/{code}/size-configurations` | **Public** | Consults size pricing and stock consumption rates[cite: 89]. | — | — |
| **BCK09**[cite: 89] | `GET` | `/api/v1/stock` | `MANAGER`, `EMPLOYEE` | Consults abstract stock levels across inventory[cite: 89]. | — | — |
| **BCK09**[cite: 89] | `POST` | `/api/v1/stock/{code}/adjustments` | `MANAGER` | Executes replenishment or consumption transactions[cite: 89, 90]. | — | — |
| **BCK10**[cite: 90] | `POST` | `/api/v1/predefined-pizzas` | `MANAGER` | Registers predefined recipes (checks bounds)[cite: 90]. | — | — |
| **BCK10**[cite: 90] | `GET` | `/api/v1/predefined-pizzas` | **Public** | Queries predefined pizza recipes and supported sizes[cite: 90]. | — | — |
| **BCK11**[cite: 90] | `GET` | `/api/v1/catalogue` | **Public** (Kiosk/Web) | Composite query: sellables, pricing, allergens, stock[cite: 90, 91]. | — | — |

---

## 4. Contract Specifications: DTO Models and Domain Invariants

### 4.1. Authentication DTOs (`BCK01`)
* **`LoginRequestDTO`:**
  ```json
  {
    "email": "manager@laprizza.com",
    "password": "Secr3tP@ssw0rd!"
  }

```

* **`LoginResponseDTO`:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tokenType": "Bearer",
  "expiresIn": 86400,
  "user": {
    "id": "usr-101",
    "email": "manager@laprizza.com",
    "status": "ACTIVE",
    "roles": ["MANAGER"]
  }
}

```



### 4.2. Customer Profile DTO (`BCK02`)

Enforces mandatory contact channels (`name`, `phoneNumber`, `email`) as clarified by the product owner.

```json
{
  "name": "Maria Silva",
  "phoneNumber": "+351912345678",
  "email": "maria.silva@email.pt",
  "userId": "usr-205",
  "dietaryRestrictions": [
    {
      "description": "Lactose Intolerance",
      "allergenCode": "ALL-DAIRY"
    }
  ]
}

```

### 4.3. Multi-Role Product Creation DTO (`BCK05`)

Validates that `(isSellable || isPizzaComponent)` evaluates to `true`. A product cannot be exclusively stock-controlled.

```json
{
  "code": "PRD-MOZZ-01",
  "name": "Fior di Latte Mozzarella",
  "description": "Artisanal fresh cow milk cheese",
  "categoryCode": "CAT-CHEESE",
  "isSellable": false,
  "isPizzaComponent": true,
  "isStockControlled": true,
  "componentTypeCode": "TYPE-CHEESE",
  "allergens": ["ALL-DAIRY"]
}

```

### 4.4. Component Size Configuration DTO (`BCK08`)

Enforces that `stockUnitsConsumed` is a non-negative **integer** number of abstract stock units.

```json
{
  "pizzaSizeId": "SIZE-LRG",
  "applicablePrice": {
    "amount": 2.50,
    "currency": "EUR"
  },
  "stockUnitsConsumed": 3
}

```

### 4.5. Abstract Stock Adjustment DTO (`BCK09`)

Prevents negative inventory invariants. If `currentBalance - units < 0` during a `CONSUME` operation, the transaction is rejected.

```json
{
  "operation": "CONSUME",
  "units": 15,
  "reason": "Kitchen preparation consumption batch #40"
}

```

### 4.6. Predefined Pizza Recipe DTO (`BCK10`)

Contains the sellable product code and default component recipe lines.

```json
{
  "sellableProductCode": "PRD-PIZZA-MARG",
  "recipeName": "Margherita Classica",
  "defaultRecipeLines": [
    { "componentProductCode": "PRD-DOUGH-TRAD", "defaultQuantity": 1 },
    { "componentProductCode": "PRD-SAUCE-TOM", "defaultQuantity": 1 },
    { "componentProductCode": "PRD-MOZZ-01", "defaultQuantity": 1 }
  ]
}

```

### 4.7. Composite Catalogue Query DTO (`BCK11`)

Composite projection delivered to the Single Page Application, self-service kiosks, and the Three.js 3D canvas.

* Predefined pizza prices are **purely component-derived** (calculated dynamically for each size without a static base markup).


* Size availability is determined dynamically: `isAvailable` is `true` if and only if $\text{currentBalance} \ge \text{stockUnitsConsumed}$ for all constituent stock-controlled components.



```json
{
  "productCode": "PRD-PIZZA-MARG",
  "name": "Pizza Margherita",
  "description": "Classic stone-baked pizza with tomato sauce and mozzarella",
  "categoryCode": "CAT-PIZZA",
  "allergens": ["ALL-GLUTEN", "ALL-DAIRY"],
  "isPredefinedPizza": true,
  "sizeVariants": [
    {
      "sizeId": "SIZE-SML",
      "sizeName": "Small",
      "computedPrice": { "amount": 6.00, "currency": "EUR" },
      "isAvailable": true
    },
    {
      "sizeId": "SIZE-MED",
      "sizeName": "Medium",
      "computedPrice": { "amount": 8.50, "currency": "EUR" },
      "isAvailable": true
    },
    {
      "sizeId": "SIZE-LRG",
      "sizeName": "Large",
      "computedPrice": { "amount": 11.00, "currency": "EUR" },
      "isAvailable": false
    }
  ]
}

```

---

## 5. Standardized Error Envelope & HTTP Status Code Mapping

When an error occurs during HTTP processing, the server rejects the request with an RFC-compliant HTTP status code and an immutable error envelope payload:

```json
{
  "timestamp": "2026-10-11T21:45:00.123Z",
  "status": 409,
  "error": "Conflict",
  "message": "Cannot delete product category CAT-PIZZA: actively referenced by existing products.",
  "details": [
    "Referential dependency detected on product code: PRD-PIZZA-MARG"
  ]
}

```

### HTTP Status Code Resolution Matrix

| Status Code | RFC Meaning | Architectural Scenario in LaPrizza |
| --- | --- | --- |
| **`200 OK`**<br> | Success | Safe resource query, stock adjustment balance return, or entity update.

 |
| **`201 Created`**<br> | Resource Created | Successful creation of products, customers, categories, or predefined recipes.

 |
| **`204 No Content`**<br> | Empty Success | Successful deletion of an unreferenced catalogue entity.

 |
| **`400 Bad Request`**<br> | Syntax/Schema Error | Joi boundary validation failure (malformed email, missing required fields, non-integer stock).

 |
| **`401 Unauthorized`**<br> | Missing/Invalid Auth | Bearer token is missing, malformed, cryptographically invalid, or expired.

 |
| **`403 Forbidden`**<br> | Insufficient Privileges | Valid token presented, but user lacks the mandatory role (e.g., `CUSTOMER` attempting product registration).

 |
| **`404 Not Found`**<br> | Missing Resource | Targeted product code, customer ID, or category code does not exist in persistence.

 |
| **`409 Conflict`**<br> | State/Referential Conflict | Unique constraint violation (duplicate code) or attempt to delete a referenced entity (`ARC04`).

 |
| **`422 Unprocessable`**<br> | Domain Invariant Failure | Domain rule violation: product with no roles, stock reduction resulting in negative balance, or pizza cardinality breach.

 |
| **`500 Internal Error`**<br> | Unhandled Exception | Unexpected server-side bug; stack traces are strictly suppressed to avoid leaking internal details (`ARC03`).

 |

---

## 6. Input Boundary Validation Architecture (Joi Middleware)

To maintain clean layer separation, controllers do not perform raw data assertions. Incoming payloads are intercepted by decoupled Express middleware that evaluates inputs against Joi validation schemas prior to controller dispatch:

1. **Schema Sandboxing:** DTO schemas enforce strict typing, mandatory fields, string length constraints, and regex patterns (e.g., phone numbers and RFC 5322 emails).


2. **Strip Unknown Properties:** Any extraneous fields injected by malicious or erroneous clients are automatically stripped (`stripUnknown: true`), preventing mass-assignment security vulnerabilities.
3. **Fail-Fast Boundary:** If an incoming payload violates the Joi schema, the pipeline short-circuits immediately, returning a formatted HTTP `400 Bad Request` envelope without invoking the Application Services layer.

### Self-service User Contact Updates (BCK02)

`PUT /user/me/address` and `PUT /user/me/phone-number` use `Authorization: Bearer <token>` and the existing authentication and active-status guards. They accept no user identifier and apply to the authenticated account for every role. These implemented User routes are separate from the planned customer-profile routes above.

Address request (required non-empty `street`, `postalCode` and `city`; optional `extraDetails` defaults to `""`):

```json
{
  "street": "Rua Nova",
  "postalCode": "1000-001",
  "city": "Lisbon",
  "extraDetails": "Floor 2"
}
```

Phone request (E.164 syntax: `+`, a nonzero initial digit, and at most 15 digits):

```json
{
  "phoneNumber": "+351912345678"
}
```

Both return HTTP 200 with the existing user summary plus contact fields when set:

```json
{
  "username": "customer_l",
  "firstName": "Carlos",
  "lastName": "Santos",
  "createdAt": "2026-10-25T12:00:00.000Z",
  "email": "carlos@example.com",
  "roles": ["CUSTOMER"],
  "status": "ACTIVE",
  "address": {
    "street": "Rua Nova",
    "postalCode": "1000-001",
    "city": "Lisbon",
    "extraDetails": "Floor 2"
  },
  "phoneNumber": "+351912345678"
}
```

Each update replaces only its own value and advances `updatedAt`. Unset contact properties are omitted from the response. Invalid payloads, including unsupported fields such as `username` or `id`, return 400; missing/invalid authentication or a missing account during authentication returns 401; inactive accounts return 403; a user not found after authentication returns 404. Errors retain `{ "error": { "message": "..." } }`; unexpected infrastructure failures return 500.

**Contract open point:** Existing profile and manager-list responses keep their current fields. Whether `GET /user/:username` should expose contact details when the caller owns the account needs a separate contract decision because that endpoint also supports manager access.

The nullable columns are included in the fresh user schema. Migration `013_user_contact_details.sql` adds them for existing databases and has been written without being applied.


## Emailed user invitations (implemented 2026-11-05)

`POST /auth/invite` accepts `{email, roleName}` from an ACTIVE ADMINISTRATOR or MANAGER. Returns `201` with a pending user summary after SMTP accepts instructions; `400` for invalid email/role, `401` without authentication, `403` for denied role/status, `409` for a registered/deactivated email, and `503` for mail configuration/submission errors. An existing pending account keeps its identity and receives the replacement role and another email. The recipient completes normal `/auth/register` using their email, own name, and password, retaining the assigned role. Failed email leaves the pending account saved for retry. No additional table or invitation token is created. See [ADR-017](03-rationale/ADR-017-user-invitations.md).


## Administrator role management

`PUT /user/:username/roles` requires an ACTIVE ADMINISTRATOR and accepts the complete `{roles: [...]}` assignment. At least one supported role is required; duplicates collapse, and omitted roles are removed. Unsupported fields and invalid/empty roles return `400`; missing authentication `401`, denied role/status `403`, and missing user `404`. Successful `200` returns a public user summary, preserving account identity and status. DEACTIVATED targets return `409` and must be reactivated first. The acting administrator cannot remove their own ADMINISTRATOR role. Existing bearer sessions use the new database roles on their next request. The Users Manage dialog groups this operation with the existing separately confirmed `DELETE /user/:username` deactivation action. No new table or migration is required.


## User list visibility correction (2026-11-06)

ACTIVE ADMINISTRATOR and MANAGER accounts can read the paginated `/users` list and its creation-date, role, and status filters. Both roles see the list on the Users page alongside invitations. Only administrators see Manage controls and may change roles or deactivate other accounts. Customer/employee list access remains forbidden.


## Account reactivation (2026-11-06)

`POST /user/:username/reactivate` requires an ACTIVE ADMINISTRATOR. The service loads the target, requires DEACTIVATED status, activates it through User, and persists it without changing its roles or password. Returns `204` on success, `401` without authentication, `403` for an unauthorized/inactive actor, `404` for an unknown target, and `409` if the target is already ACTIVE or PENDING_REGISTRATION. It cannot bypass normal registration for a pending target. The Users dialog switches between confirmed deactivate/reactivate actions based on stored status. Role changes for a DEACTIVATED target are rejected by the service with `409`, and its role controls are disabled in the UI. No schema migration is required. Existing valid sessions remain subject to the current database status; reactivation does not issue a new token or revive revoked/expired sessions.


## Role assignment history (2026-11-06)

Successful role updates through `PUT /user/:username/roles` append a `roles_assignment` record for every distinct resulting role. `assigned_from` comes from the authenticated actor, `assigned_to` from the target's stored email, and timestamp from PostgreSQL. Request bodies cannot choose the actor or timestamp. No history is recorded for validation, authorization, deactivated-target or user-save failures. History storage is awaited after saving the user; a history failure returns an error but does not roll back the prior role update. Responses and frontend controls are unchanged. No history API is added.


## Account status history (2026-11-06)

Creation through public registration, staff pre-registration, and new invitations now records the initial status in `status_assignment`. Completion of a pending registration records ACTIVE. `POST /user/:username/reactivate` and `DELETE /user/:username` record actual state transitions after saving the account. Authenticated actor usernames come from `CurrentUser`; self-registration uses the new account's username. Recipient email is read from the stored account. Status history is awaited after persistence, so its failure returns an error without rolling back the prior account change. No event is added on invitation resend, role-only editing or repeated deactivation of an already deactivated target. Endpoint paths, request bodies, authorization and successful response contracts remain unchanged; no history-read endpoint is introduced.

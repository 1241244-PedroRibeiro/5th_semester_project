# Summary of Services

Every request goes through the same Clean Architecture processing pipeline: **Frontend / Client → Public API Gateway (NestJS) → Controllers & Guards → Application Service(s) → Domain Model & Repositories → PostgreSQL Database**.

The Public API verifies identity and roles via NestJS Guards (`AuthGuard`, `RolesGuard`), Controllers validate request DTO contracts, and Application Services execute transactional use cases and enforce domain invariants.

| Service | Responsibility | Used by |
|---|---|---|
| AuthService | Manages user credentials, generates stateless JWT tokens with role claims, and enforces Argon2id hashing | User Authentication, Registration, Session Verification |
| UserService | Updates user administrative profile, queries user listings, and coordinates staff onboarding | User Management, Customer Lookup, Dietary Restrictions |
| CustomerService | Manages business customer profiles (mandatory Name, Phone, Email, optional VAT/NIF) and addresses | Customer Management, Self-Registration Flow |
| PhoneValidationService | Validates mobile contact formats and geographic portability | Customer Registration, Profile Updates |
| CategoryService | Maintains product categories, enforces code/name uniqueness, and protects referenced categories (AC5) | Product Category Management, Product Creation, Catalogue Filtering |
| AllergenService | Maintains recognized food allergens and prevents deletion of referenced allergens (AC6) | Allergen Management, Product Association, Allergy Warnings |
| ProductService | Manages master products, validates multi-role invariants (`isSellable \|\| isPizzaComponent`), coordinates activation/blocking/reactivation, and handles allergen/component links | All Product Use Cases, Product Filtering, Menu Browsing |
| PizzaSizeService | Maintains pizza size tiers, manages size designation evolution, and guards referenced sizes (AC6) | Pizza Size Management, Component Size Configurations, Recipe Availability |
| PizzaComponentTypeService | Manages configurable component classifications, validates strict unique assembly order, and sets cardinality bounds | Component Type Management, Pizza Recipe Verification |
| ComponentSizeConfigurationService | Manages size-dependent component pricing and discrete abstract stock consumption rates | Pizza Component Configuration, Dynamic Pizza Pricing |
| StockService | Manages non-negative abstract inventory units, supports replenishment and deductions for active and inactive items, and executes row-level locked adjustments | Stock Information Management, Inventory Adjustments |

---

# Summary of Functionalities

## 1. User & Customer Management (`BCK01`, `BCK02`)
- **Public Customer Self-Registration:** Creates an account (`UserRole.CUSTOMER`) and automatically generates the linked `Customer` business profile with mandatory First Name, Last Name, Phone Number, and Email (Clarification #09).
- **Administrative User Provisioning:** Manager-only creation of staff accounts (`MANAGER`, `EMPLOYEE`), starting in `PENDING_REGISTRATION` until credential confirmation.
- **Customer Profile & Dietary Tracking:** Maintains delivery addresses, optional VAT/NIF for invoicing, and registered dietary restrictions.
- **Dietary Restriction Alerts:** During product browsing and order placement, allergen conflicts trigger warnings without blocking operations (Clarification #16).
- **Authentication:** Stateless authentication via JWT (15m expiry) and OWASP-compliant Argon2id password hashing.

## 2. Product Category Management (`BCK03`)
- **Single Category Assignment:** Every product belongs to exactly one category, mandatory upon creation (Clarifications #08, #12).
- **Configurable Taxonomy:** Categories are managed dynamically by the Manager (initial baseline: *Pizzas*, *Beverages*, *Starters*, *Desserts*, *Sides*, *Other*).
- **Referential Integrity (AC5):** Categories associated with products (active or inactive) cannot be deleted (`409 Conflict`). Deactivation/reactivation mechanics are not required for categories (Clarification #17).

## 3. Allergen Management (`BCK04`)
- **European Regulatory Baseline:** Configurable catalogue seeded with the 14 EU-recognized allergens (Regulation 1169/2011).
- **Referential Integrity (AC6):** Allergens referenced by products or customer dietary profiles cannot be deleted (`409 Conflict`). Deactivation mechanics are not applicable (Clarification #17).

## 4. Product Management (`BCK05`)
- **Multi-Role Invariant:** Products must be *Sellable*, *Pizza Component*, or both. Exclusively stock-controlled products or products without roles are strictly rejected (`validateProductTypes()`, Clarifications #06, #08).
- **Commercial Information:** Non-pizza sellable products require a direct selling price ($\ge 0.00\text{ €}$, where zero is valid for promotional items, Clarification #11). Predefined pizzas derive pricing exclusively from component sizes.
- **Lifecycle Control (Soft Deletion & Reactivation):** Products no longer in active use are deactivated (`active = false`). Deactivated products remain accessible for administrative queries and updates, and reactivation (`active = true`) is supported (Clarifications #08, #10).
- **Role Evolution Guard:** A product may cease being a pizza component only if it is not currently referenced in any predefined pizza recipe or component size configuration (Clarifications #08, #14).
- **Multi-Criteria Filtering:** Public retrieval filtered by category, allergen, component type, and partial name matching.

## 5. Pizza Sizes & Component Taxonomy (`BCK06`, `BCK07`, `BCK08`)
- **Pizza Sizes:** Configurable size tiers with soft-evolution support (`active = false`) and foreign key deletion restriction (`AC6`).
- **Base Component Types:** Four mandatory, immutable core types (*Base Dough*, *Base Sauce*, *Cheese*, *Topping*) with strict unique assembly ordering (Clarification #18). Additional types can be created by the Manager.
- **Explicit Size Configurations:** Component prices and discrete integer stock consumption units are explicitly set per size format without multiplicative factors (Clarification #13).

## 6. Stock Control (`BCK09`)
- **Abstract Stock Model:** Inventory quantified in discrete non-negative integer units ($u \in \mathbb{N}_0$).
- **Operations on Inactive Products:** Stock levels of inactive/blocked products can still be consulted, increased (e.g., late deliveries), and decreased (e.g., write-offs) (Clarification #19).
- **Order Confirmation Deduction:** Stock consumption is transacted at order confirmation time (Clarification #12).

---

# Summary of REST Endpoints

**Access Levels:**  
* `Public`: Unauthenticated access.  
* `Customer`: Requires valid JWT holding `CUSTOMER` role.  
* `Manager`: Requires valid JWT holding `MANAGER` role.  
* `Auth`: Requires valid JWT holding any authenticated role.

## Authentication & Users (`BCK01`, `BCK02`)

| Method | Endpoint | Description | Access | Success | Errors |
|---|---|---|---|---|---|
| POST | `/api/v1/auth/login` | Authenticate user credentials and issue JWT | Public | 200 + Token | 400, 401 |
| POST | `/api/v1/auth/register-customer` | Self-register customer (User + Customer profile) | Public | 201 | 400, 409 |
| POST | `/api/v1/users` | Administrative staff provisioning | Manager | 201 | 400, 401, 403, 409 |
| GET | `/api/v1/users` | List users with pagination and role filters | Manager | 200 + Page | 401, 403 |
| GET | `/api/v1/users/records` | Query full customer dossier by email | Manager | 200 + Record | 400, 401, 403, 404 |
| PUT | `/api/v1/users/profile` | Update authenticated customer profile | Customer | 200 | 400, 401, 404 |
| GET | `/api/v1/users/dietary-restrictions` | List allergies of authenticated user | Auth | 200 + List | 401, 404 |

## Categories (`BCK03`)

| Method | Endpoint | Description | Access | Success | Errors |
|---|---|---|---|---|---|
| GET | `/categories` | List and search categories | Public | 200 + Array | - |
| GET | `/categories/:id` | Get category by technical UUID | Public | 200 + Object | 400, 404 |
| POST | `/categories` | Create product category | Manager | 201 + Object | 400, 401, 403, 409 |
| PUT | `/categories/:id` | Update category details | Manager | 200 + Object | 400, 401, 403, 404, 409 |
| DELETE | `/categories/:id` | Remove unreferenced category (AC5 Guard) | Manager | 200 | 400, 401, 403, 404, 409 |

## Allergens (`BCK04`)

| Method | Endpoint | Description | Access | Success | Errors |
|---|---|---|---|---|---|
| GET | `/allergens` | List and search recognized allergens | Public | 200 + Array | - |
| GET | `/allergens/:id` | Get allergen by technical UUID | Public | 200 + Object | 400, 404 |
| POST | `/allergens` | Create allergen entry | Manager | 201 + Object | 400, 401, 403, 409 |
| PUT | `/allergens/:id` | Update allergen designation | Manager | 200 + Object | 400, 401, 403, 404, 409 |
| DELETE | `/allergens/:id` | Remove unreferenced allergen (AC6 Guard) | Manager | 200 | 400, 401, 403, 404, 409 |

## Products (`BCK05`, `BCK11`)

| Method | Endpoint | Description | Access | Success | Errors |
|---|---|---|---|---|---|
| GET | `/products` | List and filter active products (category, allergen, type, name) | Public | 200 + Array | - |
| GET | `/products/:code` | Get product details by business code | Public | 200 + Object | 404 |
| POST | `/products` | Register product (Sellable / Component / Stock) | Manager | 201 + Object | 400, 401, 403, 404, 409 |
| PUT | `/products/:code` | Update product details and characteristics | Manager | 200 + Object | 400, 401, 403, 404, 409 |
| PATCH | `/products/:code/block` | Soft deactivation (marks `active = false`) | Manager | 200 + Object | 401, 403, 404 |
| PATCH | `/products/:code/activate` | Reactivate previously deactivated product | Manager | 200 + Object | 401, 403, 404 |
| POST | `/products/:code/allergens` | Associate allergen with product | Manager | 200 + Object | 400, 401, 403, 404 |
| DELETE | `/products/:code/allergens/:allergenCode` | Disassociate allergen from product | Manager | 200 | 401, 403, 404 |

## Pizza Sizes & Components (`BCK06`, `BCK07`, `BCK08`)

| Method | Endpoint | Description | Access | Success | Errors |
|---|---|---|---|---|---|
| GET | `/pizza-sizes` | List available pizza sizes | Public | 200 + Array | - |
| POST | `/pizza-sizes` | Create commercial pizza size | Manager | 201 + Object | 400, 401, 403, 409 |
| PUT | `/pizza-sizes/:id` | Update size or deactivate (`active: false`) | Manager | 200 + Object | 400, 401, 403, 404, 409 |
| DELETE | `/pizza-sizes/:id` | Remove unreferenced pizza size (AC6 Guard) | Manager | 200 | 400, 401, 403, 404, 409 |
| GET | `/pizza-component-types` | List component types and ordering | Public | 200 + Array | - |
| POST | `/pizza-component-types` | Create custom component type | Manager | 201 + Object | 400, 401, 403, 409 |
| GET | `/component-size-configurations` | Query size-dependent configurations | Public | 200 + Array | - |
| POST | `/component-size-configurations` | Define price and stock units for component per size | Manager | 201 + Object | 400, 401, 403, 409 |

## Stock Information (`BCK09`)

| Method | Endpoint | Description | Access | Success | Errors |
|---|---|---|---|---|---|
| GET | `/stock` | Query stock levels (filterable by active/inactive) | Manager | 200 + Array | 401, 403 |
| GET | `/stock/:productId` | Consult current balance of stock-controlled product | Manager | 200 + Object | 401, 403, 404 |
| POST | `/stock/:productId/increase` | Replenish stock quantity (works for inactive items) | Manager | 200 + Object | 400, 401, 403, 404 |
| POST | `/stock/:productId/decrease` | Deduct stock quantity (prevents negative balance) | Manager | 200 + Object | 400, 401, 403, 404, 422 |

# Frontend Implementation and Maintenance

For the implemented Angular SPA, see [Frontend implementation, structure and maintenance](frontend-implementation-and-maintenance.md). The guide documents frontoffice/backoffice ownership, shared components, routing, API integration, setup, testing, extension workflows and current implementation limits, with links to the source files.

# Bruno API migration

The collection now contains 284 HTTP requests in OpenCollection YAML. YAML structure keeps spaces; embedded JavaScript and JSON use tabs. Repositories and mappings now use the current natural-key schema. The domain and migration files are unchanged. Configuration responses omit updatedAt, and the diagram’s one-size-per-SKU constraint remains in force, as approved. Existing request filenames and folder structure are preserved, including historical names mentioning IDs/codes.

## Current contracts

Public reads require no token except user information, user listing and stock. Management writes require a manager; invitations, user operations and component-type/predefined-pizza management additionally enforce the statuses declared in their controllers. Existing role and status rules remain unchanged.

| Routes | Request / lookup | Response |
| --- | --- | --- |
| POST /auth/register | firstName, lastName, email, password; no username | 201: token and user with username, names, email, roles, status, timestamps |
| POST /auth/login | email, password | 200: token and user with username |
| POST /auth/pre_register | firstName, lastName, email, roleName | 201: staff with generated username, pending status; no token/password |
| GET /user/:username; DELETE /user/:username | username path, no body | 200: public user information / empty deactivation result |
| GET /user/:username/allergens | username path, no body | 200: username and allergen-name array |
| POST /user/:username/allergen | allergens: array of names | 201, own customer only |
| GET /users and /users/filter/creation-date/:date, /role/:role, /status/:status | page, pageSize; date YYYY-MM-DD, role/status enum | 200: items, total, page, pageSize, totalPages; usernames in items |
| GET /categories, /allergens, /pizza-sizes, /pizza-component-types | search, names or exact assembly order for component types | 200: arrays without legacy id/code fields |
| GET /categories/:name, /allergens/:name, /pizza-sizes/:name, /pizza-component-types/:name | natural name, not UUID | 200: aggregate DTO; 404 unknown name |
| POST /categories | categoryName, optional description | 201: name |
| POST /allergens | name, optional description | 201: name, description |
| POST /pizza-sizes | name | 201: name, active |
| POST /pizza-component-types | name, assemblyOrder, minCardinality, maxCardinality (integer or null) | 201: same fields; null remains null |
| PUT /allergens/:name, /pizza-sizes/:name, /pizza-component-types/:name | existing intended update fields | 501 for authorized valid requests, pending domain changes |
| DELETE /categories/:name, /allergens/:name, /pizza-sizes/:name, /pizza-component-types/:name | natural name | 200 message; 409 if referenced; 404 missing |
| GET /products | category, allergen, componentType (names), name | 200 product DTO array; current null-price hydration guard can return 501 |
| GET /products/:sku | SKU | 200 product DTO; 404 missing; null-price hydration 501 |
| POST /products | sku, name, description, categoryName, isSellable, isPizzaComponent, isStockControlled, optional componentTypeName, nullable/optional directSellingPrice | 201 product DTO; current absent/null-price guard returns 501 |
| PUT /products/:sku | existing product update fields | 501, pending domain behavior |
| PATCH /products/:sku/block, /activate | SKU; no body | 200 product with active false/true |
| POST /products/:sku/allergens | allergenName | 200 product with associatedAllergens as names |
| GET /component-size-configurations | search, componentSku, pizzaSize | 200 configuration array |
| GET /component-size-configurations/product/:componentSku; GET /:id | SKU / configuration UUID | 200 configuration array / DTO |
| POST /component-size-configurations | componentSku, pizzaSize, price, stockUnitsConsumed if controlled | 201: id, componentSku, productName, pizzaSize, sizeName, price, stockUnitsConsumed, stockControlled |
| PUT /component-size-configurations/:id; DELETE /:id | configuration UUID; update price and consumption | 200 configuration / deletion message |
| GET /stock; GET /stock/:productSku | search, categoryName, lowStock; SKU lookup | 200 stock DTOs using productSku, productName, currentUnits, updatedAt |
| POST /stock/:productSku/adjustments | adjustmentType INCREASE/DECREASE, positive integer amount, optional reason | 200 stock; 400 invalid input; 422 insufficient units |
| POST /predefined-pizzas | pizzaSku, recipeName, defaultRecipeLines [{componentSku, defaultQuantity}], availableSizes [names] | 201: ids [{pizzaSku,pizzaSize}], pizzaSku, recipeName, defaultRecipeLines, supportedSizes; seeded null-price component currently causes 501 |
| GET /predefined-pizzas; GET /:pizzaSku | optional pizzaSize query for detail | 200: array / grouped DTO with composite ids; 404 absent |
| GET /catalogue; GET /:productSku | category name, comma-separated excludeAllergens names, availableOnly boolean | 200: productSku, name, description, categoryName, allergens, optional directPrice, isPredefinedPizza, isAvailable; recipes/sizeVariants where present |

Errors use {error: {message}}. User reads return username, firstName, lastName, createdAt, email, roles and status; auth responses also include updatedAt. Product responses use sku, categoryName, componentTypeName and associatedAllergens, with flags, active and nullable directSellingPrice. Configuration IDs remain UUIDs. No endpoint was created. Every request matches a mounted controller route; none was deleted for a missing route.

## Tests and ordering

- Verify generated customer/staff usernames; collision requests verify suffixes 2 and 3 using distinct emails with the same generated base. Existing login verifies the captured username.
- Verify numeric and null cardinality independently, without relying on blocked updates.
- Retain omitted/null price requests with 501 assertions and comments; explicitly test both null-price creation and seeded null-price hydration. Priced creates continue to assert actual amounts.
- Separate priced fixtures exercise supported product creation and configuration/reference behavior without converting the original unpriced requests or substituting zero.
- Update natural-name/SKU chains, composite predefined-pizza DTOs, configuration lookups and exact validation/status assertions. Remove contradictory allergen-name-versus-old-ID assertions.
- Remove expired environment tokens, hardcoded UUIDs and empty fixture variables; use setup results. Inactive/pending JWT subjects follow the seeded username rule.
- Fix ambiguous folder positions, insert new requests after their prerequisites, and run catalogue setup before catalogue reads. Negative component-type tests use unique names so duplicate detection does not mask validation.

## Blocked pending domain changes

Authorized category/allergen/size/component-type renames and product updates remain present. Creates with absent/null product prices remain blocked. ProductMap rejects the seeded PRD-MOZZ null price, so unfiltered product listing, the Lactose filter and recipes referencing that seed assert 501 as well. No price is defaulted.

The following 34 requests expect 501 and contain a pending-domain comment:

- `BCK03-Categories/14 - Update Category (Manager Success).yml`
- `BCK03-Categories/16 - Update Category Non-Existent ID (Not Found).yml`
- `BCK03-Categories/17 - Update Category Duplicate Name (Conflict).yml`
- `BCK04-Allergens/14 - Update Allergen (Manager Success).yml`
- `BCK04-Allergens/16 - Update Allergen Non-Existent ID (Not Found).yml`
- `BCK04-Allergens/17 - Update Allergen Duplicate Name (Conflict).yml`
- `BCK05-Products/01 - List Products (Public).yml`
- `BCK05-Products/06 - Create Pizza Component Product (Manager Success).yml`
- `BCK05-Products/08 - Reject Invalid Product Role (Clarification 06 Violation).yml`
- `BCK05-Products/09 - Reject Pizza Component Without ComponentTypeCode (AC5 Violation).yml`
- `BCK05-Products/10 - Reject Non-Component With ComponentTypeCode.yml`
- `BCK05-Products/11 - Duplicate Product Code (Conflict).yml`
- `BCK05-Products/19 - Filter Products by Allergen (Public).yml`
- `BCK05-Products/20 - Update Product Details (Manager Success).yml`
- `BCK05-Products/26 - Create Product With Null Price.yml`
- `BCK05-Products/27 - Read Seeded Product With Null Price.yml`
- `BCK06-PizzaSizes/12 - Update Pizza Size (Manager Success).yml`
- `BCK06-PizzaSizes/13 - Deactivate Pizza Size via Update (Soft Evolution AC5).yml`
- `BCK06-PizzaSizes/15 - Update Pizza Size Non-Existent ID (Not Found).yml`
- `BCK06-PizzaSizes/16 - Update Pizza Size Duplicate Name (Conflict).yml`
- `BCK07-Manage PizzaComponentType/05 - Path Validation/41 - PUT Invalid UUID.yml`
- `BCK07-Manage PizzaComponentType/05 - Path Validation/42 - PUT Missing Record.yml`
- `BCK07-Manage PizzaComponentType/06 - Updates/45 - Reject Update Duplicate Name.yml`
- `BCK07-Manage PizzaComponentType/06 - Updates/46 - Reject Update Duplicate Assembly Order.yml`
- `BCK07-Manage PizzaComponentType/06 - Updates/47 - Reject Code Change.yml`
- `BCK07-Manage PizzaComponentType/06 - Updates/48 - Reject Invalid Update Bounds.yml`
- `BCK07-Manage PizzaComponentType/06 - Updates/50 - Update Name Order and Bounded Limits.yml`
- `BCK07-Manage PizzaComponentType/06 - Updates/51 - Restore Unbounded Maximum.yml`
- `BCK07-Manage PizzaComponentType/07 - Reference Protection/53 - Create Product Referencing Type.yml`
- `BCK08-Component/SETUP COMPONENT PRODUCT.yml`
- `BCK10-PredefinedPizzas/00 - Setup/01 - Setup BCK10 Dough Component.yml`
- `BCK10-PredefinedPizzas/00 - Setup/02 - Setup BCK10 Dough Component Stock.yml`
- `BCK10-PredefinedPizzas/AUTHORIZED/POST-CREATE-PREDEFINED-PIZZA.yml`
- `BCK10-PredefinedPizzas/AUTHORIZED/POST-REJECT-SIZE-WITHOUT-CONFIG.yml`

The following dependent requests explain why the recipe does not exist after the blocked create: detail expects 404, list checks DTO shape without assuming creation, and catalogue detail verifies the existing parent remains a direct-price item. Their intended predefined-pizza scenarios remain pending the same domain change.

- `BCK10-PredefinedPizzas/AUTHORIZED/GET-DETAILS-PREDEFINED-PIZZA.yml`
- `BCK10-PredefinedPizzas/AUTHORIZED/GET-LIST-PREDEFINED-PIZZAS.yml`
- `BCK11-Catalogue/07 - Get Predefined Pizza Details.yml`

## Validation after persistence repair

- All 284 requests pass YAML parsing, JavaScript syntax, JSON-template parsing, mounted-route matching, sequencing and runtime-variable checks. All 168 JSON bodies match the current DTO fields, preserving the explicitly blocked legacy code-change payload.
- The full live Bruno run against the rebuilt Docker backend and PostgreSQL passed: **284/284 requests and 385/385 tests**. No assertions accept unexpected 500 responses.
- Repository queries, joins and writes now use natural keys. Product/configuration currencies are persisted and loaded. Configuration responses no longer expose updatedAt because the diagram has no such column; no replacement timestamp is invented.
- The diagram still permits one predefined size per SKU. The PostgreSQL regression tests verify that a second size is rejected atomically without changing the existing recipe.
- Exact-message assertions match the current allergen/size implementation. Assembly-order search allows legitimate name-substring matches as well as the exact order. Two setup fixtures use unique names so repeated collection runs do not collide with earlier data.
- Real database regression coverage is in `backend/tests/unit/infrastructure/natural-key.postgres.spec.ts`. Enable it with `TEST_DATABASE_URL` pointing to an initialized test database; for example run `npm test -- --runTestsByPath tests/unit/infrastructure/natural-key.postgres.spec.ts` from backend. It checks natural-key reads/writes, reference protection, currencies, configurations, stock history, recipes and derived availability. Its writes are rolled back.
- ProductMap still rejects nullable Money, so the PRD-MOZZ seed blocks the price-dependent recipe creates and product reads identified above. Existing rename/product-update blocks also remain. Their expected 501 responses are not successful implementations of those features.
- Product role/type negative cases with omitted prices encounter the 501 price guard first. Their original intent remains documented and their payloads are retained.
- No domain, migrations, package manifests or lockfiles were changed by the repair. The backend container was rebuilt and restarted. No migrations were created or applied.

## Original collection migration file inventory

### BCK01-Register_n_Login

| Action | File |
| --- | --- |
| Modify | `BCK01-Register_n_Login/00 - Setup/00 - Login Predefined Manager.yml` |
| Modify | `BCK01-Register_n_Login/00 - Setup/01 - Register User.yml` |
| Modify | `BCK01-Register_n_Login/00 - Setup/02 - Login User.yml` |
| Modify | `BCK01-Register_n_Login/00 - Setup/03 - Pre-register Employee (Manager).yml` |
| Modify | `BCK01-Register_n_Login/00 - Setup/04 - Pre-register Manager (Manager).yml` |
| Modify | `BCK01-Register_n_Login/00 - Setup/05 - Login Active Customer Fixture.yml` |
| Modify | `BCK01-Register_n_Login/LoginErrors/25 - Pending Staff Cannot Login.yml` |
| Modify | `BCK01-Register_n_Login/LoginErrors/30 - Login Pending Manager.yml` |
| Modify | `BCK01-Register_n_Login/LoginErrors/32 - Login Pending Customer.yml` |
| Modify | `BCK01-Register_n_Login/PreRegisterErrors/18 - Pre-register Empty Email.yml` |
| Modify | `BCK01-Register_n_Login/PreRegisterErrors/20 - Pre-register Customer Role Rejected.yml` |
| Modify | `BCK01-Register_n_Login/PreRegisterErrors/22 - Pre-register Empty First Name.yml` |
| Modify | `BCK01-Register_n_Login/PreRegisterErrors/23 - Pre-register Empty Last Name.yml` |
| Modify | `BCK01-Register_n_Login/PreRegisterErrors/24 - Pre-register Long Name.yml` |
| Modify | `BCK01-Register_n_Login/PreRegisterErrors/26 - Pre-register Deactivated Manager (Forbidden).yml` |
| Modify | `BCK01-Register_n_Login/PreRegisterErrors/27 - Pre-register Pending Manager (Forbidden).yml` |
| Modify | `BCK01-Register_n_Login/PreRegisterErrors/34 - Pre-register Deactivated Customer (Forbidden).yml` |
| Modify | `BCK01-Register_n_Login/PreRegisterErrors/35 - Pre-register Pending Customer (Forbidden).yml` |
| Modify | `BCK01-Register_n_Login/README.md` |
| Modify | `BCK01-Register_n_Login/RegistrationErrors/05 - Empty First Name.yml` |
| Modify | `BCK01-Register_n_Login/RegistrationErrors/06 - Empty Last Name.yml` |
| Add | `BCK01-Register_n_Login/00 - Setup/06 - Register Username Collision 2.yml` |
| Add | `BCK01-Register_n_Login/00 - Setup/07 - Register Username Collision 3.yml` |

### BCK02-Maintain_User_Information

| Action | File |
| --- | --- |
| Modify | `BCK02-Maintain_User_Information/00 - Setup/01 - Login Manager.yml` |
| Modify | `BCK02-Maintain_User_Information/00 - Setup/02 - Register Fresh Customer.yml` |
| Modify | `BCK02-Maintain_User_Information/00 - Setup/03 - Register Deactivation Target.yml` |
| Modify | `BCK02-Maintain_User_Information/00 - Setup/04 - Select Seeded Allergen.yml` |
| Modify | `BCK02-Maintain_User_Information/01 - Get Information/01 - Customer Reads Own Information.yml` |
| Modify | `BCK02-Maintain_User_Information/01 - Get Information/02 - Customer Cannot Read Another Existing Customer.yml` |
| Modify | `BCK02-Maintain_User_Information/01 - Get Information/03 - Customer Cannot Read Nonexistent User.yml` |
| Modify | `BCK02-Maintain_User_Information/01 - Get Information/04 - Manager Reads Customer Information.yml` |
| Modify | `BCK02-Maintain_User_Information/01 - Get Information/05 - Manager Reads Own Information.yml` |
| Modify | `BCK02-Maintain_User_Information/02 - Path Validation/01 - Customer Cannot Relate Another Customer Allergens.yml` |
| Modify | `BCK02-Maintain_User_Information/02 - Path Validation/02 - Relate Invalid User UUID.yml` |
| Modify | `BCK02-Maintain_User_Information/02 - Path Validation/03 - Deactivate Invalid User UUID.yml` |
| Modify | `BCK02-Maintain_User_Information/03 - Filter Users/01 - Filter By Creation Date.yml` |
| Modify | `BCK02-Maintain_User_Information/03 - Filter Users/02 - Filter By Role.yml` |
| Modify | `BCK02-Maintain_User_Information/03 - Filter Users/03 - Filter By Status.yml` |
| Modify | `BCK02-Maintain_User_Information/03 - Filter Users/04 - Role Filter Second Page.yml` |
| Modify | `BCK02-Maintain_User_Information/03 - Filter Users/05 - Customer Cannot Filter Creation Date.yml` |
| Modify | `BCK02-Maintain_User_Information/03 - Filter Users/06 - Customer Cannot Filter Role.yml` |
| Modify | `BCK02-Maintain_User_Information/03 - Filter Users/07 - Customer Cannot Filter Status.yml` |
| Modify | `BCK02-Maintain_User_Information/03 - Filter Users/08 - Filter Creation Date Without Token.yml` |
| Modify | `BCK02-Maintain_User_Information/03 - Filter Users/09 - Filter Role Without Token.yml` |
| Modify | `BCK02-Maintain_User_Information/03 - Filter Users/10 - Filter Status Without Token.yml` |
| Modify | `BCK02-Maintain_User_Information/03 - Filter Users/11 - Invalid Creation Date.yml` |
| Modify | `BCK02-Maintain_User_Information/03 - Filter Users/12 - Invalid Role.yml` |
| Modify | `BCK02-Maintain_User_Information/03 - Filter Users/13 - Invalid Status.yml` |
| Modify | `BCK02-Maintain_User_Information/03 - Filter Users/14 - Invalid Page.yml` |
| Modify | `BCK02-Maintain_User_Information/03 - Filter Users/15 - Page Size Above Maximum.yml` |
| Modify | `BCK02-Maintain_User_Information/03 - Filter Users/16 - Manager Lists All Users.yml` |
| Modify | `BCK02-Maintain_User_Information/03 - Filter Users/17 - Customer Cannot List All Users.yml` |
| Modify | `BCK02-Maintain_User_Information/04 - Dietary Restrictions/01 - Customer Reads Own Restrictions Without Body.yml` |
| Modify | `BCK02-Maintain_User_Information/04 - Dietary Restrictions/02 - Customer Relates Allergen.yml` |
| Modify | `BCK02-Maintain_User_Information/04 - Dietary Restrictions/03 - Customer Reads Allergen Names.yml` |
| Modify | `BCK02-Maintain_User_Information/04 - Dietary Restrictions/04 - Customer Relates Same Allergen Again.yml` |
| Modify | `BCK02-Maintain_User_Information/04 - Dietary Restrictions/05 - Repeated Save Does Not Duplicate Allergen.yml` |
| Modify | `BCK02-Maintain_User_Information/04 - Dietary Restrictions/06 - Customer Cannot Read Another User.yml` |
| Modify | `BCK02-Maintain_User_Information/04 - Dietary Restrictions/07 - Manager Reads Customer Restrictions.yml` |
| Modify | `BCK02-Maintain_User_Information/04 - Dietary Restrictions/08 - Manager Reads Own Restrictions.yml` |
| Modify | `BCK02-Maintain_User_Information/04 - Dietary Restrictions/09 - Customer Invalid User UUID.yml` |
| Modify | `BCK02-Maintain_User_Information/04 - Dietary Restrictions/10 - Manager Invalid User UUID.yml` |
| Modify | `BCK02-Maintain_User_Information/04 - Dietary Restrictions/11 - Empty Allergen Selection.yml` |
| Modify | `BCK02-Maintain_User_Information/04 - Dietary Restrictions/12 - Manager Cannot Relate Allergens.yml` |
| Modify | `BCK02-Maintain_User_Information/04 - Dietary Restrictions/13 - Read Without Token.yml` |
| Modify | `BCK02-Maintain_User_Information/04 - Dietary Restrictions/14 - Relate Without Token.yml` |
| Modify | `BCK02-Maintain_User_Information/04 - Dietary Restrictions/15 - Read With Invalid Token.yml` |
| Modify | `BCK02-Maintain_User_Information/04 - Dietary Restrictions/16 - Relate With Invalid Token.yml` |
| Modify | `BCK02-Maintain_User_Information/05 - Deactivation/17 - Customer Cannot Deactivate Another User.yml` |
| Modify | `BCK02-Maintain_User_Information/05 - Deactivation/18 - Manager Deactivates Another User.yml` |
| Modify | `BCK02-Maintain_User_Information/05 - Deactivation/19 - Customer Deactivates Himself.yml` |
| Modify | `BCK02-Maintain_User_Information/README.md` |
| Modify | `BCK02-Maintain_User_Information/folder.yml` |

### BCK03-Categories

| Action | File |
| --- | --- |
| Modify | `BCK03-Categories/00 - Setup Manager Token Fixture.yml` |
| Modify | `BCK03-Categories/00b - Setup Customer Token Fixture.yml` |
| Modify | `BCK03-Categories/01 - List Categories (Public).yml` |
| Modify | `BCK03-Categories/02 - Get Category by ID (Public).yml` |
| Modify | `BCK03-Categories/03 - Get Category by Non-Existent ID (Not Found).yml` |
| Modify | `BCK03-Categories/04 - Filter Categories by Search Term.yml` |
| Modify | `BCK03-Categories/05 - Create Category Without Token (Unauthorized).yml` |
| Modify | `BCK03-Categories/06 - Create Category as Customer (Forbidden).yml` |
| Modify | `BCK03-Categories/07 - Create Category (Manager Success).yml` |
| Delete | `BCK03-Categories/08 - Duplicate Category Code (Conflict).yml` |
| Modify | `BCK03-Categories/09 - Duplicate Category Name (Conflict).yml` |
| Delete | `BCK03-Categories/10 - Create Category Empty Code (Bad Request).yml` |
| Modify | `BCK03-Categories/11 - Create Category Empty Name (Bad Request).yml` |
| Modify | `BCK03-Categories/12 - Create Category Missing Description (Bad Request).yml` |
| Modify | `BCK03-Categories/13 - Get Created Category by Dynamic ID (Public).yml` |
| Modify | `BCK03-Categories/14 - Update Category (Manager Success).yml` |
| Modify | `BCK03-Categories/15 - Update Category as Customer (Forbidden).yml` |
| Modify | `BCK03-Categories/16 - Update Category Non-Existent ID (Not Found).yml` |
| Modify | `BCK03-Categories/17 - Update Category Duplicate Name (Conflict).yml` |
| Modify | `BCK03-Categories/18 - Delete Category in Use by Products (Conflict AC5).yml` |
| Modify | `BCK03-Categories/19 - Delete Category as Customer (Forbidden).yml` |
| Modify | `BCK03-Categories/20 - Delete Category Non-Existent ID (Not Found).yml` |
| Modify | `BCK03-Categories/21 - Delete Category Unreferenced (Manager Success).yml` |

### BCK04-Allergens

| Action | File |
| --- | --- |
| Modify | `BCK04-Allergens/00 - Setup Manager Token Fixture.yml` |
| Modify | `BCK04-Allergens/00b - Setup Customer Token Fixture.yml` |
| Modify | `BCK04-Allergens/01 - List Allergens (Public).yml` |
| Modify | `BCK04-Allergens/02 - Get Allergen by Seed ID (Public).yml` |
| Modify | `BCK04-Allergens/03 - Get Allergen by Non-Existent ID (Not Found).yml` |
| Modify | `BCK04-Allergens/04 - Filter Allergens by Search Term (Public).yml` |
| Modify | `BCK04-Allergens/05 - Create Allergen Without Token (Unauthorized).yml` |
| Modify | `BCK04-Allergens/06 - Create Allergen as Customer (Forbidden).yml` |
| Modify | `BCK04-Allergens/07 - Create Allergen (Manager Success).yml` |
| Delete | `BCK04-Allergens/08 - Duplicate Allergen Code (Conflict).yml` |
| Modify | `BCK04-Allergens/09 - Duplicate Allergen Name (Conflict).yml` |
| Delete | `BCK04-Allergens/10 - Create Allergen Empty Code (Bad Request).yml` |
| Delete | `BCK04-Allergens/11 - Create Allergen Code Too Long (Bad Request).yml` |
| Modify | `BCK04-Allergens/12 - Create Allergen Empty Name (Bad Request).yml` |
| Modify | `BCK04-Allergens/13 - Get Created Allergen by Dynamic ID (Public).yml` |
| Modify | `BCK04-Allergens/14 - Update Allergen (Manager Success).yml` |
| Modify | `BCK04-Allergens/15 - Update Allergen as Customer (Forbidden).yml` |
| Modify | `BCK04-Allergens/16 - Update Allergen Non-Existent ID (Not Found).yml` |
| Modify | `BCK04-Allergens/17 - Update Allergen Duplicate Name (Conflict).yml` |
| Modify | `BCK04-Allergens/18 - Delete Allergen in Use by Products (Conflict AC6).yml` |
| Modify | `BCK04-Allergens/19 - Delete Allergen as Customer (Forbidden).yml` |
| Modify | `BCK04-Allergens/20 - Delete Allergen Non-Existent ID (Not Found).yml` |
| Modify | `BCK04-Allergens/21 - Delete Allergen Unreferenced (Manager Success).yml` |
| Modify | `BCK04-Allergens/folder.yml` |

### BCK05-Products

| Action | File |
| --- | --- |
| Modify | `BCK05-Products/00 - Setup Manager Token Fixture.yml` |
| Modify | `BCK05-Products/00b - Setup Customer Token Fixture.yml` |
| Modify | `BCK05-Products/01 - List Products (Public).yml` |
| Modify | `BCK05-Products/02 - Get Product by Non-Existent Code (Not Found).yml` |
| Modify | `BCK05-Products/03 - Create Product Without Token (Unauthorized).yml` |
| Modify | `BCK05-Products/04 - Create Product as Customer (Forbidden).yml` |
| Modify | `BCK05-Products/05 - Create Sellable Product (Manager Success).yml` |
| Modify | `BCK05-Products/06 - Create Pizza Component Product (Manager Success).yml` |
| Modify | `BCK05-Products/07 - Create Dual Role Product (Manager Success).yml` |
| Modify | `BCK05-Products/08 - Reject Invalid Product Role (Clarification 06 Violation).yml` |
| Modify | `BCK05-Products/09 - Reject Pizza Component Without ComponentTypeCode (AC5 Violation).yml` |
| Modify | `BCK05-Products/10 - Reject Non-Component With ComponentTypeCode.yml` |
| Modify | `BCK05-Products/11 - Duplicate Product Code (Conflict).yml` |
| Delete | `BCK05-Products/12 - Create Product Invalid Code Length (Bad Request).yml` |
| Modify | `BCK05-Products/13 - Get Created Product by Code (Public).yml` |
| Modify | `BCK05-Products/14 - Filter Products by Category (Public).yml` |
| Modify | `BCK05-Products/15 - Filter Products by Component Type (Public).yml` |
| Modify | `BCK05-Products/16 - Filter Products by Partial Name (Public).yml` |
| Modify | `BCK05-Products/17 - Associate Allergen to Product (Manager Success).yml` |
| Modify | `BCK05-Products/18 - Associate Allergen as Customer (Forbidden).yml` |
| Modify | `BCK05-Products/19 - Filter Products by Allergen (Public).yml` |
| Modify | `BCK05-Products/20 - Update Product Details (Manager Success).yml` |
| Modify | `BCK05-Products/21 - Update Product as Customer (Forbidden).yml` |
| Modify | `BCK05-Products/22 - Block Product as Customer (Forbidden).yml` |
| Modify | `BCK05-Products/23 - Block Product (Manager Success Soft Delete).yml` |
| Modify | `BCK05-Products/24 - Reactivate Product (Manager Success).yml` |
| Modify | `BCK05-Products/25 - Setup Inactive Stock Product.yml` |
| Add | `BCK05-Products/06b - Create Priced Pizza Component.yml` |
| Add | `BCK05-Products/11b - Duplicate Priced Product SKU.yml` |
| Add | `BCK05-Products/26 - Create Product With Null Price.yml` |
| Add | `BCK05-Products/27 - Read Seeded Product With Null Price.yml` |

### BCK06-PizzaSizes

| Action | File |
| --- | --- |
| Modify | `BCK06-PizzaSizes/00 - Setup Manager Token Fixture.yml` |
| Modify | `BCK06-PizzaSizes/00b - Setup Customer Token Fixture.yml` |
| Modify | `BCK06-PizzaSizes/01 - List Pizza Sizes (Public).yml` |
| Modify | `BCK06-PizzaSizes/02 - Get Pizza Size by Seed ID (Public).yml` |
| Modify | `BCK06-PizzaSizes/03 - Get Pizza Size by Non-Existent ID (Not Found).yml` |
| Modify | `BCK06-PizzaSizes/04 - Filter Pizza Sizes by Search Term (Public).yml` |
| Modify | `BCK06-PizzaSizes/05 - Create Pizza Size Without Token (Unauthorized).yml` |
| Modify | `BCK06-PizzaSizes/06 - Create Pizza Size as Customer (Forbidden).yml` |
| Modify | `BCK06-PizzaSizes/07 - Create Pizza Size (Manager Success).yml` |
| Modify | `BCK06-PizzaSizes/08 - Duplicate Pizza Size Name (Conflict).yml` |
| Modify | `BCK06-PizzaSizes/09 - Create Pizza Size Empty Name (Bad Request).yml` |
| Modify | `BCK06-PizzaSizes/10 - Create Pizza Size Missing Name (Bad Request).yml` |
| Modify | `BCK06-PizzaSizes/11 - Get Created Pizza Size by Dynamic ID (Public).yml` |
| Modify | `BCK06-PizzaSizes/12 - Update Pizza Size (Manager Success).yml` |
| Modify | `BCK06-PizzaSizes/13 - Deactivate Pizza Size via Update (Soft Evolution AC5).yml` |
| Modify | `BCK06-PizzaSizes/14 - Update Pizza Size as Customer (Forbidden).yml` |
| Modify | `BCK06-PizzaSizes/15 - Update Pizza Size Non-Existent ID (Not Found).yml` |
| Modify | `BCK06-PizzaSizes/16 - Update Pizza Size Duplicate Name (Conflict).yml` |
| Modify | `BCK06-PizzaSizes/17 - Delete Pizza Size in Use (Conflict AC6).yml` |
| Modify | `BCK06-PizzaSizes/18 - Delete Pizza Size as Customer (Forbidden).yml` |
| Modify | `BCK06-PizzaSizes/19 - Delete Pizza Size Without Token (Unauthorized).yml` |
| Modify | `BCK06-PizzaSizes/20 - Delete Pizza Size Non-Existent ID (Not Found).yml` |
| Modify | `BCK06-PizzaSizes/21 - Delete Pizza Size Unreferenced (Manager Success).yml` |

### BCK07-Manage PizzaComponentType

| Action | File |
| --- | --- |
| Modify | `BCK07-Manage PizzaComponentType/00 - Setup/00 - Login Manager.yml` |
| Modify | `BCK07-Manage PizzaComponentType/00 - Setup/01 - Login Customer.yml` |
| Modify | `BCK07-Manage PizzaComponentType/00 - Setup/02 - List Types and Allocate Assembly Positions.yml` |
| Modify | `BCK07-Manage PizzaComponentType/01 - Create Read and Search/03 - Create Type with Unbounded Maximum.yml` |
| Modify | `BCK07-Manage PizzaComponentType/01 - Create Read and Search/04 - Get Created Type Publicly.yml` |
| Modify | `BCK07-Manage PizzaComponentType/01 - Create Read and Search/05 - Search by Name.yml` |
| Delete | `BCK07-Manage PizzaComponentType/01 - Create Read and Search/06 - Search by Code.yml` |
| Modify | `BCK07-Manage PizzaComponentType/01 - Create Read and Search/07 - Search by Assembly Order.yml` |
| Modify | `BCK07-Manage PizzaComponentType/01 - Create Read and Search/08 - Search with No Matches.yml` |
| Modify | `BCK07-Manage PizzaComponentType/01 - Create Read and Search/09 - Reject Repeated Search Parameter.yml` |
| Modify | `BCK07-Manage PizzaComponentType/02 - Authorization/10 - POST Without Token.yml` |
| Modify | `BCK07-Manage PizzaComponentType/02 - Authorization/12 - POST as Customer.yml` |
| Modify | `BCK07-Manage PizzaComponentType/02 - Authorization/13 - PUT Without Token.yml` |
| Modify | `BCK07-Manage PizzaComponentType/02 - Authorization/15 - PUT as Customer.yml` |
| Modify | `BCK07-Manage PizzaComponentType/02 - Authorization/16 - DELETE Without Token.yml` |
| Modify | `BCK07-Manage PizzaComponentType/02 - Authorization/18 - DELETE as Customer.yml` |
| Delete | `BCK07-Manage PizzaComponentType/03 - Creation Conflicts/19 - Reject Duplicate Code.yml` |
| Modify | `BCK07-Manage PizzaComponentType/03 - Creation Conflicts/20 - Reject Duplicate Name.yml` |
| Modify | `BCK07-Manage PizzaComponentType/03 - Creation Conflicts/21 - Reject Duplicate Assembly Order.yml` |
| Delete | `BCK07-Manage PizzaComponentType/04 - Input Validation/22 - Reject Empty Code.yml` |
| Delete | `BCK07-Manage PizzaComponentType/04 - Input Validation/23 - Reject Code Too Long.yml` |
| Modify | `BCK07-Manage PizzaComponentType/04 - Input Validation/24 - Reject Blank Name.yml` |
| Delete | `BCK07-Manage PizzaComponentType/04 - Input Validation/25 - Reject Name Too Long.yml` |
| Modify | `BCK07-Manage PizzaComponentType/04 - Input Validation/26 - Reject Zero Assembly Order.yml` |
| Modify | `BCK07-Manage PizzaComponentType/04 - Input Validation/27 - Reject Fractional Assembly Order.yml` |
| Modify | `BCK07-Manage PizzaComponentType/04 - Input Validation/28 - Reject Numeric String Assembly Order.yml` |
| Modify | `BCK07-Manage PizzaComponentType/04 - Input Validation/29 - Reject Negative Minimum.yml` |
| Modify | `BCK07-Manage PizzaComponentType/04 - Input Validation/30 - Reject Fractional Minimum.yml` |
| Modify | `BCK07-Manage PizzaComponentType/04 - Input Validation/31 - Reject Maximum Below Minimum.yml` |
| Modify | `BCK07-Manage PizzaComponentType/04 - Input Validation/32 - Reject Fractional Maximum.yml` |
| Modify | `BCK07-Manage PizzaComponentType/04 - Input Validation/33 - Reject String Maximum.yml` |
| Delete | `BCK07-Manage PizzaComponentType/04 - Input Validation/34 - Reject Missing code.yml` |
| Modify | `BCK07-Manage PizzaComponentType/04 - Input Validation/35 - Reject Missing name.yml` |
| Modify | `BCK07-Manage PizzaComponentType/04 - Input Validation/36 - Reject Missing assemblyOrder.yml` |
| Modify | `BCK07-Manage PizzaComponentType/04 - Input Validation/37 - Reject Missing minCardinality.yml` |
| Modify | `BCK07-Manage PizzaComponentType/04 - Input Validation/38 - Reject Missing maxCardinality.yml` |
| Modify | `BCK07-Manage PizzaComponentType/05 - Path Validation/39 - GET Invalid UUID.yml` |
| Modify | `BCK07-Manage PizzaComponentType/05 - Path Validation/40 - GET Missing Record.yml` |
| Modify | `BCK07-Manage PizzaComponentType/05 - Path Validation/41 - PUT Invalid UUID.yml` |
| Modify | `BCK07-Manage PizzaComponentType/05 - Path Validation/42 - PUT Missing Record.yml` |
| Modify | `BCK07-Manage PizzaComponentType/05 - Path Validation/43 - DELETE Invalid UUID.yml` |
| Modify | `BCK07-Manage PizzaComponentType/05 - Path Validation/44 - DELETE Missing Record.yml` |
| Modify | `BCK07-Manage PizzaComponentType/06 - Updates/45 - Reject Update Duplicate Name.yml` |
| Modify | `BCK07-Manage PizzaComponentType/06 - Updates/46 - Reject Update Duplicate Assembly Order.yml` |
| Modify | `BCK07-Manage PizzaComponentType/06 - Updates/47 - Reject Code Change.yml` |
| Modify | `BCK07-Manage PizzaComponentType/06 - Updates/48 - Reject Invalid Update Bounds.yml` |
| Modify | `BCK07-Manage PizzaComponentType/06 - Updates/49 - Verify Failed Updates Preserve State.yml` |
| Modify | `BCK07-Manage PizzaComponentType/06 - Updates/50 - Update Name Order and Bounded Limits.yml` |
| Modify | `BCK07-Manage PizzaComponentType/06 - Updates/51 - Restore Unbounded Maximum.yml` |
| Modify | `BCK07-Manage PizzaComponentType/07 - Reference Protection/52 - Create Type for Reference Protection.yml` |
| Modify | `BCK07-Manage PizzaComponentType/07 - Reference Protection/53 - Create Product Referencing Type.yml` |
| Modify | `BCK07-Manage PizzaComponentType/07 - Reference Protection/54 - Reject Delete Referenced Type.yml` |
| Modify | `BCK07-Manage PizzaComponentType/07 - Reference Protection/55 - Block Referencing Product.yml` |
| Modify | `BCK07-Manage PizzaComponentType/07 - Reference Protection/56 - Reject Delete Type Referenced by Inactive Product.yml` |
| Modify | `BCK07-Manage PizzaComponentType/07 - Reference Protection/57 - Referenced Type Still Exists.yml` |
| Modify | `BCK07-Manage PizzaComponentType/08 - Deletion/58 - Delete Unreferenced Type.yml` |
| Modify | `BCK07-Manage PizzaComponentType/08 - Deletion/59 - Deleted Type Is Not Found.yml` |
| Modify | `BCK07-Manage PizzaComponentType/README.md` |
| Add | `BCK07-Manage PizzaComponentType/01 - Create Read and Search/09b - Create Bounded Type.yml` |
| Add | `BCK07-Manage PizzaComponentType/07 - Reference Protection/53b - Create Priced Referencing Product.yml` |
| Add | `BCK07-Manage PizzaComponentType/08 - Deletion/60 - Delete Bounded Type.yml` |

### BCK08-Component

| Action | File |
| --- | --- |
| Modify | `BCK08-Component/ALL-CONFIG.yml` |
| Modify | `BCK08-Component/CONFIG-MISSING-PRICE.yml` |
| Modify | `BCK08-Component/CONFIG-NON-COMPONENT-PRODUCT.yml` |
| Modify | `BCK08-Component/CONFIG-NONEXISTENT-PRODUCT.yml` |
| Modify | `BCK08-Component/CONFIG-NONEXISTENT-SIZE.yml` |
| Modify | `BCK08-Component/CONSULT-CONFIG-ID.yml` |
| Modify | `BCK08-Component/CONSULT-PRODUCT.yml` |
| Modify | `BCK08-Component/CREATE-CONFIG.yml` |
| Modify | `BCK08-Component/DUPLICATE-CONFIG.yml` |
| Modify | `BCK08-Component/GET-COMPONENT-PRODUCT-ID.yml` |
| Modify | `BCK08-Component/GET-NON-COMPONENT-PRODUCT-ID.yml` |
| Modify | `BCK08-Component/INTEGER-STOCK.yml` |
| Modify | `BCK08-Component/NEGATIVA-PRICE.yml` |
| Modify | `BCK08-Component/NEGATIVE-STOCK.yml` |
| Modify | `BCK08-Component/SETUP COMPONENT PRODUCT.yml` |
| Modify | `BCK08-Component/SETUP-NON-COMPONENT-PRODUCT.yml` |
| Modify | `BCK08-Component/VALID-UPDATE.yml` |
| Modify | `BCK08-Component/folder.yml` |
| Add | `BCK08-Component/SETUP-PRICED-COMPONENT.yml` |

### BCK09-STOCK

| Action | File |
| --- | --- |
| Modify | `BCK09-STOCK/AUTHORIZED/ADJUST-STOCK-DECIMAL-AMOUNT.yml` |
| Modify | `BCK09-STOCK/AUTHORIZED/ADJUST-STOCK-DECREASE.yml` |
| Modify | `BCK09-STOCK/AUTHORIZED/ADJUST-STOCK-INCREASE-INACTIVE.yml` |
| Modify | `BCK09-STOCK/AUTHORIZED/ADJUST-STOCK-INCREASE.yml` |
| Modify | `BCK09-STOCK/AUTHORIZED/ADJUST-STOCK-NEGATIVE-AMOUNT.yml` |
| Modify | `BCK09-STOCK/AUTHORIZED/ADJUST-STOCK-NEGATIVE-RESULT.yml` |
| Modify | `BCK09-STOCK/AUTHORIZED/ADJUST-STOCK-ZERO-AMOUNT.yml` |
| Modify | `BCK09-STOCK/AUTHORIZED/GET-INACTIVE-PRODUCT-STOCK.yml` |
| Modify | `BCK09-STOCK/AUTHORIZED/GET-STOCK-INACTIVE.yml` |
| Modify | `BCK09-STOCK/AUTHORIZED/GET-STOCK.yml` |
| Modify | `BCK09-STOCK/AUTHORIZED/SETUP-BLOCK-INACTIVE-STOCK-PRODUCT.yml` |
| Modify | `BCK09-STOCK/UNAUTHORIZED/GET-STOCK.yml` |
| Modify | `BCK09-STOCK/folder.yml` |

### BCK10-PredefinedPizzas

| Action | File |
| --- | --- |
| Modify | `BCK10-PredefinedPizzas/00 - Setup/00 - Setup BCK10 Pizza Product.yml` |
| Modify | `BCK10-PredefinedPizzas/00 - Setup/01 - Setup BCK10 Dough Component.yml` |
| Modify | `BCK10-PredefinedPizzas/00 - Setup/02 - Setup BCK10 Dough Component Stock.yml` |
| Modify | `BCK10-PredefinedPizzas/00 - Setup/03 - Get BCK10 Dough Stock ID.yml` |
| Modify | `BCK10-PredefinedPizzas/00 - Setup/04 - Configure BCK10 Dough Small.yml` |
| Modify | `BCK10-PredefinedPizzas/AUTHORIZED/GET-DETAILS-PREDEFINED-PIZZA.yml` |
| Modify | `BCK10-PredefinedPizzas/AUTHORIZED/GET-LIST-PREDEFINED-PIZZAS.yml` |
| Modify | `BCK10-PredefinedPizzas/AUTHORIZED/POST-CREATE-PREDEFINED-PIZZA.yml` |
| Modify | `BCK10-PredefinedPizzas/AUTHORIZED/POST-REJECT-SIZE-WITHOUT-CONFIG.yml` |
| Modify | `BCK10-PredefinedPizzas/UNAUTHORIZED/POST-CREATE-PREDEFINED-PIZZA-UNAUTHORIZED.yml` |
| Modify | `BCK10-PredefinedPizzas/folder.yml` |
| Add | `BCK10-PredefinedPizzas/00 - Setup/02b - Setup Priced Dough Stock.yml` |

### BCK11-Catalogue

| Action | File |
| --- | --- |
| Modify | `BCK11-Catalogue/00 - Setup/00 - Setup Available Product.yml` |
| Modify | `BCK11-Catalogue/00 - Setup/folder.yml` |
| Modify | `BCK11-Catalogue/01 - List Catalogue.yml` |
| Modify | `BCK11-Catalogue/02 - Filter by Category.yml` |
| Modify | `BCK11-Catalogue/03 - Exclude Allergens.yml` |
| Modify | `BCK11-Catalogue/04 - Filter Available Products.yml` |
| Modify | `BCK11-Catalogue/05 - Get Catalogue Item Not Found.yml` |
| Modify | `BCK11-Catalogue/06 - Get Catalogue Item (Created Product).yml` |
| Modify | `BCK11-Catalogue/07 - Get Predefined Pizza Details.yml` |
| Modify | `BCK11-Catalogue/folder.yml` |

### Collection documentation

| Action | File |
| --- | --- |
| Modify | `README.md` |

### environments

| Action | File |
| --- | --- |
| Modify | `environments/Local.json` |
| Modify | `environments/Local.yml` |

This report is also a new collection documentation file. The 12 deleted scenarios only cover removed code fields/search or obsolete identifier/name-length restrictions; their endpoints still exist.

Product categories use only `/categories` through `CategoryController`; the duplicate `/product-categories` routes were removed. `GET /categories` remains an array unless `page` or `pageSize` is supplied, in which case it returns a paginated result (maximum page size 100). `PUT /categories/:name` updates `{ name, description }` for managers and returns 200; the unchanged update method returns 400 for renaming a referenced category. Creation retains `addCategory` with `categoryName` and optional description; deletion uses the URL name without a body.

# Technical Test-Coverage and Robustness Report: LaPrizza Back-End (Sprint 1)

**Project:** LaPrizza Information System  
**Contributor:** 1241235  
**Focus:** BCK10 predefined-pizza tests, BCK11 catalogue tests, and project-level validation

---

## 1. Objective

This report describes the purpose and validation approach of the automated tests relevant to the work on BCK10 and BCK11. The aim is to verify API behaviour through HTTP requests and assertions, while recognising that reliable results depend on correctly configured authentication, environment variables, and test data.

The report does not claim individual Bruno pass counts that have not been confirmed by a complete recorded run.

## 2. BCK10 — Predefined Pizza API Tests

### 2.1. Purpose

BCK10 covers API behaviour related to predefined pizzas. The relevant Bruno requests exercise creation and retrieval of predefined-pizza information.

### 2.2. Relevant Bruno Test Files

- `backend/tests/bruno/LaPrizza/BCK10-PredefinedPizzas/POST-CREATE-PREDEFINED-PIZZA.yml`
- `backend/tests/bruno/LaPrizza/BCK10-PredefinedPizzas/GET-DETAILS-PREDEFINED-PIZZA.yml`

The exact directory name should be checked against the working copy if it differs between branches.

### 2.3. Validation Focus

The test scripts should verify that:

- creation requests use a valid request body and the expected authentication;
- the response status and response structure match the API contract;
- the created resource can be retrieved using the relevant identifier;
- test-script syntax is valid and assertions execute as intended.

During maintenance, an extra closing `});` was removed from the POST and GET test scripts. The correction addressed test-script syntax, not a change to the predefined-pizza business rules.

## 3. BCK11 — Catalogue API Tests

### 3.1. Purpose

BCK11 validates catalogue retrieval and filtering behaviour. The suite includes general listing, category filtering, allergen exclusion, availability filtering, not-found behaviour, retrieval of a created product, and predefined-pizza details.

### 3.2. Suite Structure

| Test file | Main purpose |
|---|---|
| `01 - List Catalogue.yml` | Verify that the catalogue endpoint returns a successful array response and expected product data. |
| `02 - Filter by Category.yml` | Verify category filtering, including that returned items belong to the requested category. |
| `03 - Exclude Allergens.yml` | Exercise the catalogue's allergen-exclusion filter. |
| `04 - Filter Available Products.yml` | Exercise filtering for products that are available. |
| `05 - Get Catalogue Item Not Found.yml` | Verify not-found behaviour for an unknown catalogue item. |
| `06 - Get Catalogue Item (Created Product).yml` | Retrieve a product created for the test scenario. |
| `07 - Get Predefined Pizza Details.yml` | Retrieve predefined-pizza details through the catalogue-related test flow. |
| `00 - Setup/00 - Setup Available Product.yml` | Create an available product used by catalogue scenarios. |

### 3.3. Dynamic Test Data and Setup

The available-product setup sends a `POST /products` request with a generated SKU held in `bck11ProductSku`. The sample payload uses the `Beverages` category, marks the product as sellable, not a pizza component, and not stock-controlled, and sets its direct selling price to `1.75`.

The setup test expects HTTP `201 Created` and checks that the returned SKU and direct selling price match the generated test data.

This approach reduces collisions caused by fixed SKUs, but it does not remove every dependency on environment state. For example, the list and category-filter scripts refer to `dualProductSku`, which is different from `bck11ProductSku`. The intended variable and setup sequence should therefore be checked when running BCK11 on a clean machine or independently of earlier collections.

### 3.4. Main Test Dimensions

The BCK11 scenarios are intended to cover:

- successful catalogue listing and response shape;
- category-based filtering;
- exclusion based on allergens;
- availability filtering;
- retrieval of an unknown item;
- retrieval of a test-created product;
- retrieval of predefined-pizza details;
- setup correctness and dynamic SKU handling.

The actual pass/fail status must be established from the Bruno runner output for the tested environment.

## 4. Project-Level Jest and Build Validation

In the reported local validation run, the project produced the following results:

| Check | Reported result |
|---|---|
| Jest test suites | 44 passed; one suite skipped |
| Individual tests | 355 passed; 3 skipped |
| Backend build | Successful (exit code 0) |

These are project-level results from the reported run and should not be interpreted as BCK10/BCK11-only counts. Bruno API collections are a separate validation layer and should be reported separately after a complete run.

## 5. Repeatability and Troubleshooting Recommendations

For consistent runs across team members:

1. Confirm that Bruno is using the intended `baseUrl` and environment.
2. Confirm that authentication variables, such as the manager token, are configured correctly.
3. Run prerequisite setup requests before tests that rely on created resources.
4. Confirm that variables referenced by assertions exist and identify the intended product.
5. Inspect the actual response body and the first failing assertion instead of relying only on the final collection status.
6. Re-run the relevant tests after changing scripts or test data.

## 6. Conclusion

The BCK10 and BCK11 test work supports API-level verification of predefined pizzas and catalogue behaviour. BCK10 maintenance included a syntax correction in the create/retrieve tests. BCK11 exercises catalogue filters and item retrieval, with dynamic test data created by a setup request. Repeatable execution requires attention to variable names, setup order, authentication, and database state in addition to the correctness of the assertions themselves.

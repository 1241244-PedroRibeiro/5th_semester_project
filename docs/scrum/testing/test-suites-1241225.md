# Technical Compliance, Usability, and Robustness Report: Sprint 1 Back-End Architecture & Test Coverage

**Project:** LaPrizza Information System — Sprint 1 Back-End  
**Author:** 1241225 — Afonso Mota  
**Scope:** User Stories BCK08 (Pizza Component Configuration), BCK09 (Stock Information Management), and associated Jest and Bruno validation

---

## 1. Executive Summary and Engineering Approach

This report documents the implementation and validation work carried out for BCK08 and BCK09 of the LaPrizza Sprint 1 back-end. The work focused on checking the relevant business rules against the API behaviour, correcting a product-domain limitation affecting non-sellable pizza components, and validating the resulting behaviour with automated tests and Bruno API collections.

The main correction concerned the distinction between a product's **direct selling price** and the **size-dependent price** applied when a product is used as a pizza component. A product may be a pizza component without being sold directly to customers, so a direct selling price must not be mandatory for every component. A direct selling price remains mandatory for sellable products. In contrast, a Component Size Configuration must still define the price applicable to a particular pizza size.

The work was validated at several levels: TypeScript build, Jest tests, and Bruno HTTP collections. The build completed successfully, the contributor subsequently confirmed that the Jest test suite passed, and the Bruno Runner reported 18 passing tests for BCK08 and 11 passing tests for BCK09. These results support the tested behaviour; they should not be interpreted as proof that every possible scenario or every clean PostgreSQL deployment has been tested.

## 2. Individual User Story Analysis, Applicability, and Validation

### 2.1. BCK08 — Pizza Component Configuration

#### 2.1.1. Business Applicability and Usability Rationale

BCK08 allows a manager to configure the size-dependent properties of products used as pizza components. Each configuration associates a pizza component with a pizza size and defines the price applicable to that component at that size. When the product is stock-controlled, the configuration also records the number of abstract stock units consumed for that size.

This distinction supports the LaPrizza domain model: a product may be sellable, a pizza component, or both. A component-only product does not need its own direct selling price, while its use in a configured pizza still requires a valid component price for the selected pizza size.

#### 2.1.2. Domain and API Behaviour

The implementation and validation work focused on the following rules:

- Only products designated as pizza components can have Component Size Configurations.
- A configuration identifies a component and a pizza size.
- Duplicate configurations for the same component and size must be rejected.
- A size-specific component price is required and must not be negative.
- For stock-controlled components, stock consumption is represented using non-negative integer abstract stock units.
- Configuration data can be consulted, and requests referring to missing products or sizes must be rejected appropriately.

A limitation was found when attempting to create a non-sellable pizza component without a direct selling price. The product model temporarily rejected this valid business scenario. The product-domain and application handling were adjusted so that a non-sellable component may have no direct selling price, while a sellable product must still have one. The persistence mapping was aligned with this rule so that an absent direct selling price is represented as `NULL`, rather than as a zero-valued price.

The product-price correction is related to BCK08 because it permits valid component products to exist before their size-specific configuration is created. It does not make the price optional within the Component Size Configuration itself.

#### 2.1.3. Testing and Validation

The BCK08 Bruno collection was run against the local API. The Runner summary showed **18 passed, 0 failed, and 0 skipped**.

The visible scenarios covered successful configuration creation and consultation, valid updates, duplicate-configuration rejection, invalid price and stock-consumption values, and requests involving missing products or pizza sizes. The observed response patterns included:

- `201 Created` for successful creation;
- `200 OK` for successful consultation or update;
- `409 Conflict` for a duplicate configuration;
- `400 Bad Request` for invalid input such as a negative price, invalid stock-consumption value, or missing required configuration price;
- `404 Not Found` when a referenced product or pizza size does not exist.

The test for a missing configuration price returning `400 Bad Request` is expected: the direct selling price of the product may be absent, but a Component Size Configuration still needs its own size-specific price.

The product-domain correction also required changes to unit and integration tests. Initial test runs exposed outdated assertions and TypeScript errors caused by the newly optional direct selling price. These were corrected, and the contributor subsequently confirmed that the build and Jest suite passed.

### 2.2. BCK09 — Stock Information Management

#### 2.2.1. Business Applicability and Usability Rationale

BCK09 maintains the current stock quantity for products designated as subject to stock control. The API must allow staff to consult stock levels and increase or decrease them by a specified number of abstract stock units. The rules protect the restaurant from invalid quantities and from operations that would leave the stock balance negative.

Representing stock as abstract integer units keeps the prototype independent of physical measurement units. The implementation can therefore represent product-specific stock consumption without requiring kilograms, litres, portions, or unit-conversion logic.

#### 2.2.2. Domain and API Behaviour

The BCK09 implementation and validation focused on these invariants:

- Stock information is managed for stock-controlled products.
- Current stock is represented as a non-negative integer quantity of abstract units.
- Staff can consult stock information for an individual product and use stock adjustment operations.
- Adjustments must specify a supported operation type, `INCREASE` or `DECREASE`, and a positive integer amount.
- A stock reduction must not produce a negative balance.
- Invalid operations must not modify the resulting stock quantity.

The stock service validates adjustment values and checks whether a requested decrease can be applied. The persistence design also uses transactional handling for stock changes so that the balance and related movement record can be updated consistently.

#### 2.2.3. Testing and Validation

The BCK09 Bruno collection was run against the local API. The Runner summary showed **11 passed, 0 failed, and 0 skipped**.

The visible scenarios included stock consultation, successful increases and decreases, rejection of an adjustment that would result in negative stock, and rejection of negative, decimal, or zero adjustment amounts. Observed responses included:

- `200 OK` for successful stock queries and adjustments;
- `422 Unprocessable Entity` for a decrease that would produce a negative stock balance;
- `400 Bad Request` for invalid adjustment values, including non-positive or non-integer amounts.

These are expected negative-test results: an error response is a passing test when the request intentionally violates a validation rule and the API returns the expected status. The important behavioural requirement is that a rejected adjustment does not change the stored stock balance.

## 3. Multi-Layered Testing and Validation

The validation work combined code-level checks with HTTP-level API tests. Each layer provides different evidence and should be interpreted separately.

### 3.1. TypeScript Build

The command `npm run build` completed successfully after the product-price changes and related test corrections. This confirms that the TypeScript project compiled in the local development environment at that point.

### 3.2. Jest Unit and Integration Tests

The Jest suite initially exposed test expectations that still reflected the previous behaviour in which nullable direct selling prices were temporarily blocked. Some tests also needed their type assertions updated after the product price became optional. These issues were corrected, including a domain test that needed to set the product price to zero before asserting the resulting value.

The contributor subsequently confirmed that the Jest suite passed. The exact final test and suite totals were not captured in the final successful output available for this report, so this report does not state an unverified final count.

### 3.3. Bruno API Collections

The Bruno Runner summaries provide the following recorded results:

| Collection | Passed | Failed | Skipped |
|---|---:|---:|---:|
| BCK08 — Component Configuration | 18 | 0 | 0 |
| BCK09 — Stock Management | 11 | 0 | 0 |

These runs verify the tested HTTP requests, response codes, and assertions in the configured local environment. They are distinct from Jest results: a passing Jest suite does not by itself prove that every Bruno request succeeds, and a passing Bruno collection does not prove that every domain edge case is covered by automated tests.

### 3.4. Persistence and Environment Limitations

The reported build, Jest, and Bruno results are positive evidence for the tested code and local API behaviour. However, the evidence recorded for this report does not include a separate clean PostgreSQL initialization followed by a full end-to-end run of both collections. Persistence behaviour under a freshly initialized database, and repeatability after restarting the application, should therefore be considered additional validation tasks rather than already-proven outcomes.

## 4. Engineering Principles Applied

### 4.1. Domain-Driven Business Rules

The product model distinguishes the role of a product from its pricing. A product can be a pizza component without being directly sellable, while a sellable product must have a direct selling price. Component size pricing remains a separate business concern.

### 4.2. Validation of Business Invariants

BCK08 protects the validity and uniqueness of size-specific component configurations. BCK09 validates stock adjustment types and quantities and prevents reductions that would result in negative stock. Invalid-input tests help verify these boundaries rather than only exercising successful requests.

### 4.3. Persistence Consistency

The product persistence mapping was updated to preserve the distinction between a missing direct selling price and a price of zero. Stock operations require consistency between the updated balance and the corresponding stock movement. These behaviours should continue to be verified against the actual PostgreSQL environment.

### 4.4. Evidence-Based Reporting

The report uses the build result, the contributor's confirmation of a passing Jest suite, and the visible Bruno Runner summaries. It avoids claiming that every possible scenario is covered or that the entire application has absolute or mathematically proven reliability.

## 5. Conclusion

The work focused on BCK08 Pizza Component Configuration and BCK09 Stock Information Management. A key correction enabled non-sellable pizza components to exist without a direct selling price, while preserving the requirement that sellable products have a direct selling price and that each component size configuration has its own required price.

The recorded validation evidence is positive: the TypeScript build succeeded, the contributor confirmed that the Jest suite passed after correcting the remaining test issue, and the Bruno Runner reported 18/18 passing tests for BCK08 and 11/11 for BCK09. The next useful validation step is to confirm the same behaviour against a clean PostgreSQL setup and to ensure that the API documentation remains consistent with the implemented endpoints and payloads.

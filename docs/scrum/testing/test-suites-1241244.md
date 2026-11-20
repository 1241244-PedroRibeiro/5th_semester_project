# Technical Compliance, Usability, and Robustness Report: Sprint 1 Back-End Architecture & Test Coverage

**Project:** LaPrizza Information System (Sprint 1)

**Author:** 1241244-PedroRibeiro

**Scope:** User Stories BCK03, BCK04, BCK05, BCK06 and Associated Test Suites (Jest & Bruno)

---

## 1. Executive Summary and Engineering Philosophy

This document provides a comprehensive technical justification of the architecture, usability, applicability, and test-driven hardening (`blindagem a 100%`) implemented during **Sprint 1** for the **LaPrizza** back-end application.

In enterprise system design, achieving a "green build" across all automated test suites is not merely about writing assertions to satisfy compiler checks; it represents mathematical and logical proof that the implemented business logic strictly adheres to the domain model, database invariants, and REST API contracts. Through the rigorous application of **Domain-Driven Design (DDD)** and **Clean Architecture**, we isolated business invariants inside domain entities and value objects, separated persistence concerns through mappers and repositories, and exposed secure REST endpoints protected by role-based access control (RBAC).

The following sections dissect the individual user stories (**BCK03, BCK04, BCK05, and BCK06**) developed by the author, detailing their business applicability, usability rationale, and the multi-layered testing strategy (Jest unit/integration tests and Bruno declarative API suites) that guarantees absolute robustness.

---

## 2. Individual User Story Analysis, Applicability, and Hardening

### 2.1. BCK03 — Product Category Management

#### 2.1.1. Business Applicability & Usability Rationale

The **Product Category** aggregate (`ProductCategory`) is the foundational structural taxonomy of the LaPrizza information system. Without categories, managing a restaurant catalogue of beverages, sides, desserts, and pizzas becomes operationally chaotic.

* **Usability:** The system exposes both protected management endpoints for Backoffice Managers (`POST /categories`, `DELETE /categories/:name`) and open, publicly accessible consultation endpoints (`GET /categories`, `GET /categories/:name`) to allow customers and SPA interfaces to browse menu classifications seamlessly.
* **Domain Integrity:** In accordance with **Clarification #08** and **Clarification #17**, every product must belong to exactly one category from the moment of creation. Furthermore, categories act as parent taxonomy anchors; deleting a category that is actively referenced by products is strictly prohibited.

#### 2.1.2. Testing & Hardening ("Blindagem") Strategy

* **Database & Domain Safeguards:** Referential integrity is enforced at the PostgreSQL engine level via foreign keys configured with `ON DELETE RESTRICT` (as documented in `08-database-structure.md`), preventing orphan product records. At the application layer, `CategoryService` verifies active references before executing deletions, throwing an explicit domain failure that maps cleanly to an HTTP `409 Conflict` (Acceptance Criteria AC5).


* **Automated Test Coverage:**
* *Jest Unit & Integration (`category.controller.spec.ts`, `category.service.spec.ts`):* Validates natural business key uniqueness (`CategoryName`), duplicate name rejection (409 Conflict), missing mandatory descriptions (400 Bad Request), and foreign key guardrails.
* *Bruno Declarative Suite (`BCK03-Categories`):* Executes 21 discrete test scenarios covering token fixture setup, public listing, search filtering, customer forbidden mutations (403 Forbidden), unauthorized requests (401 Unauthorized), duplicate detection, and AC5 referential guard tests. All 21/21 tests execute at 100% pass rate (`✓ PASS`).



---

### 2.2. BCK04 — Allergen Management

#### 2.2.1. Business Applicability & Usability Rationale

Under strict food safety and consumer protection regulations (such as EU Regulation 1169/2011), maintaining and disclosing allergenic substances (e.g., Gluten, Lactose, Crustaceans) is mandatory.

* **Usability:** The allergen management module provides a master catalogue of recognized substances. Managers can maintain allergen records, while customers and staff can inspect which products contain specific allergens. This data forms the bedrock for future dietary filtering and safety warnings during customer order placement.
* **Domain Integrity:** Following **Clarification #17**, allergens do not support soft deactivation; they are persistent master entities. An allergen can only be permanently deleted if it is not referenced by any active product or registered user dietary restriction.

#### 2.2.2. Testing & Hardening ("Blindagem") Strategy

* **Database & Domain Safeguards:** The junction tables (`product_allergens`, `user_dietary_restrictions`) enforce `ON DELETE RESTRICT` foreign key constraints against the `allergens` table. If a Manager attempts to delete an allergen currently linked to an ingredient or customer profile, the persistence engine aborts the transaction, and the service layer intercepts the database exception, returning an HTTP `409 Conflict` (Acceptance Criteria AC6).


* **Automated Test Coverage:**
* *Jest Unit & Integration (`allergen.controller.spec.ts`, `allergen.service.spec.ts`):* Tests natural key identification (`AllergenName`), description updates, search filtering by keyword, and role-based access enforcement.
* *Bruno Declarative Suite (`BCK04-Allergens`):* Runs 20 automated assertions validating public listing, seed ID retrieval, non-existent lookups (404 Not Found), customer action rejection (403 Forbidden), duplicate name conflicts (409 Conflict), and the strict AC6 deletion guard when referenced by products. All 20/20 requests execute with absolute success (`✓ PASS`).



---

### 2.3. BCK05 — Product Management

#### 2.3.1. Business Applicability & Usability Rationale

**Product Management** is the core operational backbone of LaPrizza. Products represent physical items, ingredients, beverages, and preparations handled by the restaurant.

* **Usability:** The module supports multi-role product typologies (*Sellable*, *Pizza Component*, or *Dual Role*), orthogonal stock control tracking (`isStockControlled`), mandatory category association, allergen linkages, and advanced multi-criteria filtering (by category name, allergen name, component type, and partial name matching).


* **Lifecycle & Business Rules:** In alignment with **Clarification #06** and **Clarification #08**, products can be administratively deactivated (`active: false`) and subsequently reactivated (`active: true`) without compromising historical order snapshots or recipes. Furthermore, sellable items require a direct selling price ($\ge 0.00$ €), while component-only items support nullable prices (`null`) since their commercial value is determined dynamically by size configurations.



#### 2.3.2. Testing & Hardening ("Blindagem") Strategy

* **Domain Invariant Validation:** The `Product` aggregate enforces strict invariants upon creation and update:
1. *Role Consistency:* A product must be either sellable, a pizza component, or both (`isSellable || isPizzaComponent`). It cannot exist exclusively for stock tracking.


2. *Component Type Association:* If designated as a pizza component (`isPizzaComponent: true`), it must be associated with exactly one valid `ComponentTypeName`. Non-component products cannot have a component type.




* **Automated Test Coverage:**
* *Jest Unit & Integration (`product.controller.spec.ts`, `product.service.spec.ts`, `product.spec.ts`):* Verifies domain rule violations, price validation (rejecting negative prices and unpriced sellable products), allergen association handling, and soft deactivation/reactivation workflows.
* *Bruno Declarative Suite (`BCK05-Products`):* Comprises 30 rigorous test cases covering token fixtures, public listing, invalid role rejections (Clarification #06 violation returning 400), missing component type guards (AC5 violation returning 400), duplicate SKU conflicts (409 Conflict), allergen association, product blocking/reactivation, and null-price contract verification. All 30/30 requests pass successfully (`✓ PASS`).



---

### 2.4. BCK06 — Pizza Size Management

#### 2.4.1. Business Applicability & Usability Rationale

The **Pizza Size** module maintains the commercial size formats offered by LaPrizza (e.g., *Small*, *Medium*, *Large*, *Family*).

* **Usability:** Pizza sizes establish the baseline for size-dependent component configurations (BCK08) and predefined pizza availability (BCK10). The system allows Managers to create, search, update, deactivate, and delete pizza sizes through secure REST endpoints.


* **Domain Integrity:** In accordance with **Acceptance Criteria AC5 and AC6**, the set of available sizes can evolve over time, but any size currently referenced by component size configurations (`component_size_configurations`) or predefined pizza size associations (`predefined_pizza_available_sizes`) is strictly protected against deletion, throwing an HTTP `409 Conflict`.



#### 2.4.2. Testing & Hardening ("Blindagem") Strategy

* **Relational Guardrails:** `PizzaSizeService` and `PostgresPizzaSizeRepository` check foreign key references across dependent relational tables before executing removals. Database-level `ON DELETE RESTRICT` constraints on migration `012` (`predefined_pizza_available_sizes`) provide ultimate persistence safety.


* **Automated Test Coverage:**
* *Jest Unit & Integration (`pizza-size.controller.spec.ts`, `pizza-size.service.spec.ts`, `pizza-size.spec.ts`):* Validates designation formatting (`PizzaSizeName`), duplicate name prevention, soft deactivation, and referential usage blocks.
* *Bruno Declarative Suite (`BCK06-PizzaSizes`):* Executes 23 test scripts validating public array listings, seed ID lookups, search term filtering, unauthorized/forbidden mutations, duplicate name conflicts (409 Conflict), empty/missing name validation (400 Bad Request), dynamic ID updates, soft deactivation, in-use deletion guards (AC6), and unreferenced size deletion. All 23/23 requests pass with absolute consistency (`✓ PASS`).



---

## 3. Comprehensive Multi-Layered Testing Architecture

To achieve absolute "blindagem" (bulletproof reliability), the back-end application relies on a robust, multi-layered testing pyramid executed across local environments and automated CI/CD pipelines (`ci.yml`):

```text
       ▲
      / \
     /   \       <-- Bruno Declarative API Suites (End-to-End HTTP / Postman-like Tests)
    /-----\          - Validates controller routing, JWT guards, HTTP status codes,
   /       \           payload validation pipes, and complete business workflows.
  /---------\    <-- Jest Integration Tests (Supertest HTTP controllers & DB connection pools)
 /           \       - Tests database integration, mappers, transactions, and filters.
/-------------\  <-- Jest Unit Tests (Domain aggregates, value objects, and application services)
                     - Tests pure business invariants, domain errors, and mock repositories.

```

### 3.1. Jest Unit and Integration Suites

* **Scope:** 44 test suites (`tests/unit/` and `tests/integration/`) covering domain models, value objects (`Money`, `Sku`, `CategoryName`), application services (`ProductService`, `PizzaSizeService`, `CategoryService`, `AllergenService`), and HTTP controllers using Supertest.
* **Execution Result:** **44/44 Test Suites PASS** (355+ individual unit and integration assertions passing successfully).

### 3.2. Bruno Declarative API Suites

* **Scope:** Declarative API collections (`backend/tests/bruno/LaPrizza/`) covering authentication fixtures (`BCK01`), user maintenance (`BCK02`), categories (`BCK03`), allergens (`BCK04`), products (`BCK05`), pizza sizes (`BCK06`), component configurations (`BCK08`), stock management (`BCK09`), and predefined pizzas (`BCK10`).
* **Execution Result:** **100% Green Build** across all collections, running seamlessly in both single-run and repeated continuous execution modes without state pollution or database collisions (guaranteed by dynamic timestamped SKUs and robust test teardown/setup scripts).

---

## 4. Conclusion

The completion of Sprint 1—specifically encompassing the robust delivery of User Stories **BCK03 (Categories)**, **BCK04 (Allergens)**, **BCK05 (Products)**, and **BCK06 (Pizza Sizes)**—establishes an impeccable technical and architectural foundation for the LaPrizza information system.

By strictly adhering to Clean Architecture, enforcing domain invariants through rich value objects and aggregates, securing endpoints with JWT and RBAC guards, and validating every business rule through an exhaustive multi-layered testing framework (Jest + Bruno), the application achieves absolute robustness and compliance with the academic and professional standards of ARQSI.
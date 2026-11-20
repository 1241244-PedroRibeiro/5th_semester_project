# Problem Statement: LaPrizza Information System

## 1. Executive Summary & Business Context
LaPrizza is a contemporary restaurant enterprise specializing in handcrafted pizzas, beverages, desserts, and complementary food items[cite: 53]. Within the academic framework of the 5th-semester Bachelor's Degree in Informatics Engineering (LEI) at ISEP, student teams simulate independent Information Technology (IT) software engineering companies competing in a formal Request for Proposal (RFP) procurement process over a 14-week prototype divided into three progressive development sprints[cite: 51, 52].

While customer demand emphasizes individualized dining experiences, food safety transparency, and multi-channel accessibility (online web ordering and on-premise self-service kiosks)[cite: 53, 61], commercial restaurant management requires uncompromising control over ingredient inventories, food allergens, production costs, and kitchen operational capacity[cite: 53, 56, 57]. The overarching business challenge is to replace fragmented or manual restaurant workflows with an integrated, extensible, and modular information system balancing consumer-facing customization with back-office governance, inventory accountability, and coordinated kitchen fulfillment[cite: 52, 53].

---

## 2. Core Operational Problems to Solve

### 2.1. Dynamic Customization vs. Cost & Pricing Consistency
Conventional restaurant management platforms often model pizzas as static catalogue items with fixed prices, failing to handle dynamic Bill of Materials (BOM) alterations[cite: 54, 55]. In LaPrizza:
* Pizzas are offered in configurable **Pizza Sizes** (e.g., Small, Medium, Large)[cite: 54].
* Products serve distinct roles: some are directly sellable items (beverages, sides), while others act as **Pizza Components** (doughs, sauces, cheeses, toppings)[cite: 53, 54].
* A **Predefined Pizza** (e.g., Margherita) defines a default recipe of components but does not maintain a static base price[cite: 55]. Its commercial price is derived dynamically as the sum of its constituent component prices for the chosen size, as component pricing already embeds production and labor overhead[cite: 55].
* When customers customize pizzas (adding, replacing, or removing ingredients) or build pizzas from scratch, the system must recalculate prices reliably without arbitrary base markups while validating structural assembly rules (minimum/maximum cardinalities per component type)[cite: 54, 55].

### 2.2. Food Safety & Regulatory Allergen Traceability
Under modern food information regulations (such as EU Regulation 1169/2011), the restaurant is legally obligated to identify and disclose allergenic substances accurately[cite: 53, 54]. 
* Allergens reside at the product/ingredient level (e.g., gluten in dough, lactose in cheese)[cite: 54].
* Because pizzas are dynamically assembled, the allergens of a configured pizza depend strictly on its participating components[cite: 54, 55].
* The system must allow registered customers to record dietary restrictions and cross-reference them against product/pizza allergens, issuing informative alerts on incompatible orders without obstructing customer autonomy[cite: 53, 54].

### 2.3. Normalized Inventory Control without Physical Unit Overhead
Tracking kitchen ingredient stock in varying physical units (grams, milliliters, packages, portions) introduces excessive software overhead and measurement conversions in operational workflows[cite: 56].
* LaPrizza requires an **Abstract Stock Unit** model[cite: 56]. Stock is tracked as discrete, normalized non-negative integers ($u \in \mathbb{N}_0$)[cite: 56].
* Ingredient consumption varies with pizza size (e.g., a Large pizza consumes more mozzarella units than a Small pizza)[cite: 56].
* Product availability in the public catalogue is bounded by stock: a predefined pizza size format is available if and only if all constituent stock-controlled components have sufficient units available ($\text{currentBalance} \ge \text{unitsConsumed}$)[cite: 56].

### 2.4. Data Integrity and Administrative Governance
In interconnected restaurant catalogues, careless deletions compromise operational history and active orders[cite: 39, 40, 41]. 
* Categories, allergens, sizes, and component types actively referenced by products or configurations must be strictly protected against accidental deletion (`ON DELETE RESTRICT`)[cite: 39, 40, 41].
* Products no longer actively offered must support soft deactivation without breaking historical records, while allowing administrative updates, stock adjustments, and future reactivation[cite: 40].

### 2.5. Multi-Disciplinary Progressive Integration
As a semester-long integrative project (LAPR5, ARQSI, SGRAI, IART, ASIST), the back-end application developed in Sprint 1 must serve as a stable foundation for upcoming modules[cite: 51, 52]:
* **Interactive 3D Graphics (SGRAI / Three.js):** Mandatory 3D visualization of kitchen workstations and ovens (II.3.3.2) and optional 3D pizza configurator (II.3.3.1)[cite: 61, 62].
* **Artificial Intelligence (IART / Prolog):** Automated food-preparation scheduling engine allocating assembly and baking tasks across finite kitchen workstations and ovens[cite: 62, 63].
* **Systems Administration (ASIST):** Containerized deployment, database replication, automated backups, and security governance[cite: 63, 64].

---

## 3. High-Level Architectural Objectives & Requirements
To address these challenges, the system architecture achieves the following engineering goals:
1. **Clean Architectural Decomposition:** Implement a Modular Monolith with Clean/Onion Architecture principles, strictly isolating domain invariants from transport frameworks (NestJS) and database access[cite: 25, 26].
2. **Stateless RESTful Contracts:** Expose level-2 REST APIs with OpenAPI 3.0 documentation, consistent resource URIs, and RFC-compliant HTTP status codes (`200`, `201`, `400`, `401`, `403`, `404`, `409`, `422`)[cite: 29].
3. **Robust Security & Role Segregation:** Implement stateless JWT authentication with Argon2id password hashing and Role-Based Access Control (`MANAGER`, `EMPLOYEE`, `CUSTOMER`)[cite: 26, 28].
4. **Guaranteed Data Consistency:** Enforce referential integrity, foreign key restrict policies, and ACID transactional guarantees via PostgreSQL native connection pools (`pg`)[cite: 26, 27].
5. **High Testability:** Ensure that all domain rules, application workflows, and API boundaries are covered by isolated automated unit tests and repeatable end-to-end integration test suites (Supertest and Bruno)[cite: 30, 31].

---

## 4. Sprint 1 Objectives & Engineering Scope
While the system specification establishes the overarching vision for the entire semester, **Sprint 1** focuses strictly on setting up foundational engineering practices and delivering the core back-end increment (LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, pp. 1–2):
* **Project Governance & Environment:** Repository setup under the DEI GitHub organization, project board tracking, branching strategies, and CI/CD pipelines (`ENG01`–`ENG03`).
* **Domain Analysis & Architecture:** Comprehensive DDD core domain analysis (`ARC01`) and software architecture definition via C4 Model views in the Software Architecture Document (`ARC02`).
* **Back-End Implementation:** Persistent management and REST API exposure (`ARC03`, `ARC04`) covering user authentication (`BCK01`), customer records (`BCK02`), product categories (`BCK03`), allergens (`BCK04`), multi-role products (`BCK05`), pizza sizes (`BCK06`), component types (`BCK07`), size-dependent component configurations (`BCK08`), abstract stock units (`BCK09`), and predefined pizza recipes (`BCK10`, `BCK11`).
* **Quality Assurance:** Automated unit and integration testing suites verifying business rules and invariants (`ARC05`).
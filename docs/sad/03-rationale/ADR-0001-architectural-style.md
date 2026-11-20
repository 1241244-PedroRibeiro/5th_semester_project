# ADR 001: Adoption of a Layered Clean/Onion Architecture with Hexagonal Ports and Adapters for the Back-End Application

* **Status:** Accepted
* **Context:**
The LaPrizza information system requires a robust, maintainable, and extensible back-end architecture to support multiple evolving business domains, including customer management, product catalogues, allergen tracking, pizza configuration rules, stock management, and future integrations with 3D visualization and AI-based preparation scheduling (LEI-2026-27-Sem5-Project_v1-SystemSpecification.pdf, p. 2). As an integrative project developed progressively across three sprints (LEI-2026-27-Sem5-Project_v1-SystemSpecification.pdf, p. 1), the back-end application must adapt to changing business rules without requiring structural overhauls.

Furthermore, ARQSI emphasizes that architectural design decisions must precede implementation, avoid the "Big Ball of Mud" anti-pattern, and adhere strictly to separation of concerns, testability, and dependency inversion (ARQSI_01_intro_SW_ARCH.pdf, pp. 1, 19; ARQSI_04_architectural_styles.pdf, pp. 20-21). We must select an architectural style for the Node.js back-end that defines explicit component boundaries, controls technical dependencies, and isolates the core domain logic from HTTP delivery frameworks and persistence mechanisms (ARQSI_04_architectural_styles.pdf, p. 20; 02 - Node.js - v2.pdf, p. 30). The architecture must also make boundary crossings explicit so that HTTP delivery, persistence, and future integration mechanisms can be tested or replaced without leaking technical concerns into the domain.

* **Decision:**
We adopt a **Layered Clean/Onion Architecture with Hexagonal Ports and Adapters at its boundaries** for the LaPrizza back-end application.

Clean/Onion Architecture defines the concentric layering and the Dependency Rule: source code dependencies point exclusively inwards towards domain policies (ARQSI_04_architectural_styles.pdf, p. 21; Uncle Bob, "The Clean Architecture", cleancoder.com). Hexagonal Architecture provides the explicit **ports-and-adapters** boundary style: inbound adapters invoke application use cases through inbound ports, and outbound adapters implement outbound ports required by the application/domain. Ports are interfaces owned by the inner layers; adapters are outer-layer implementations. Inner layers must not import Nest.js, Express, PostgreSQL drivers, HTTP request/response objects, or other technical adapters.

The back-end is partitioned into four concentric layers, with explicit ports and adapters at the boundaries (ARQSI_04_architectural_styles.pdf, pp. 6, 17-18; 02 - Node.js - v2.pdf, p. 30):

1. **Interface Adapters — Inbound Delivery and Controllers:** Nest.js controllers, routers, and middleware responsible for handling HTTP requests, extracting payloads, schema input validation, and returning standardized JSON responses (02 - Node.js - v2.pdf, pp. 27, 30, 52). Controllers remain thin orchestration handlers that translate HTTP requests into application service calls through inbound ports and remain free of business domain invariants (02 - Node.js - v2.pdf, pp. 30-31). These are inbound adapters.

2. **Application Layer — Use Cases and Inbound Ports:** Orchestration of use cases, workflow transaction management, and coordination of domain rules and repository persistence through outbound ports (ARQSI_04_architectural_styles.pdf, pp. 18, 32; 02 - Node.js - v2.pdf, p. 30). This layer defines inbound port interfaces exposed to inbound adapters and outbound port interfaces required from persistence or external gateways.

3. **Domain Layer:** Pure business entities, aggregates, value objects, and domain services containing the core domain logic, invariants, and validation rules; this layer has zero external dependencies on Nest.js infrastructure, HTTP delivery, or database drivers (ARQSI_04_architectural_styles.pdf, pp. 18, 20-21).

4. **Interface Adapters — Outbound Persistence:** Data access components encapsulating PostgreSQL relational queries and connection pool operations, implementing outbound repository ports with `pg` and providing clean abstractions to the application layer without exposing database implementation details or raw driver instances to the domain (ARQSI_04_architectural_styles.pdf, p. 18; 02 - Node.js - v2.pdf, pp. 30, 47). These are outbound adapters.

Ports and adapters are used at architectural boundaries, not for every internal class. The Dependency Rule remains mandatory: adapters depend on ports; ports and inner layers do not depend on adapters.

* **Considered Alternatives:**
1. **Monolithic Flat Structure ("Big Ball of Mud" / No Layering):**
* *Description:* Placing all route handling, validation logic, database queries, and business calculations together inside flat files or controller scripts (02 - Node.js - v2.pdf, p. 29).
* *Pros:* Minimal initial boilerplate; very fast setup for basic CRUD operations or rapid prototypes (02 - Node.js - v2.pdf, p. 29).
* *Cons:* Produces an unmaintainable "Big Ball of Mud" spaghetti architecture (ARQSI_01_intro_SW_ARCH.pdf, p. 19); mixes business rules with HTTP request/response lifecycles, preventing code reuse across different entry points and requiring an active HTTP network/port just to test basic logic (02 - Node.js - v2.pdf, p. 29). Violates the core ARQSI tenet that architecture must be designed to minimize the cost of change (ARQSI_01_intro_SW_ARCH.pdf, p. 11).

2. **Traditional 3-Tier Layered Architecture (Database-Driven Coupling):**
* *Description:* A classic 3-layer arrangement (Presentation -> Business Logic -> Data Access) where the business logic directly references a generic Data Access Layer (DAL) coupled to database constructs (ARQSI_04_architectural_styles.pdf, pp. 7-10).
* *Pros:* Familiar, straightforward decomposition separating UI from database calls (ARQSI_04_architectural_styles.pdf, p. 7).
* *Cons:* Dependencies flow downwards toward the data store rather than inwards towards the domain; domain models are often shaped around database table/document schemas (Active Record anti-pattern) rather than business rules, leaking persistence concerns into the core domain (ARQSI_04_architectural_styles.pdf, p. 8; 02 - Node.js - v2.pdf, p. 33).

3. **Microservices Architecture:**
* *Description:* Splitting the system immediately into distinct, independently deployable services (e.g., separate microservices for Customer Management, Product Catalogue, Stock, and Orders) communicating via REST or message buses (ARQSI_04_architectural_styles.pdf, pp. 68-69).
* *Pros:* Independent scalability and isolated deployment lifecycles per business capability (ARQSI_04_architectural_styles.pdf, p. 68).
* *Cons:* Violates the "First Commandment of Distributed Systems: Don't Distribute" (ARQSI_04_architectural_styles.pdf, p. 23); introduces distributed latency, eventual consistency complexities, complex data synchronization, and heavy operational infrastructure overhead that are disproportionate and counterproductive for an iterative 14-week prototype team (ARQSI_04_architectural_styles.pdf, p. 24; LEI-2026-27-Sem5-Project_v1-SystemSpecification.pdf, p. 1).

4. **Strict Hexagonal-Only Architecture (Ports and Adapters without Clean/Onion Layering):**
* *Description:* Structuring the application primarily around primary/inbound and secondary/outbound ports and adapters for all boundaries, without explicitly adopting Clean/Onion concentric use-case and domain layering (ARQSI_04_architectural_styles.pdf, pp. 14-15).
* *Pros:* Strong isolation of the application core; explicit swappable adapters for delivery mechanisms and persistence (ARQSI_04_architectural_styles.pdf, p. 19).
* *Cons:* Demands significant upfront boilerplate and can obscure use-case and domain layering if applied as the only organizing principle; risks over-interfaceing trivial boundaries and slowing early sprint velocity without delivering substantial additional value over a Clean/Onion structure that uses ports only at architectural boundaries (principios orientadores ARQSI - English.pdf, p. 2).

* **Consequences:**
* *Positive:*
* **High Testability:** Business rules and service workflows can be unit-tested in isolation without mocking HTTP transports, opening network ports, or connecting to live databases (ARQSI_04_architectural_styles.pdf, p. 19; 02 - Node.js - v2.pdf, p. 28). Ports make it straightforward to substitute test doubles at architectural boundaries.
* **Separation of Concerns & Maintainability:** The core business rules (e.g., pizza component cardinality constraints, size configurations, stock calculations) remain decoupled from Nest.js or PostgreSQL, ensuring that changes to technical frameworks do not cascade into business domain rules (ARQSI_04_architectural_styles.pdf, pp. 19-20; LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, p. 12).
* **Independence of Database:** The outbound repository ports and PostgreSQL adapters prevent `pg` query logic from leaking into domain entities and services, keeping data access concerns strictly localized (02 - Node.js - v2.pdf, pp. 33, 47).
* **Explicit Boundary Contracts:** Inbound and outbound ports document how delivery and persistence interact with the application core, supporting dependency inversion and adapter replacement.
* **Extensibility for Subsequent Sprints:** Provides clear component interfaces, making it straightforward to expose new REST endpoints for the 3D visualization and AI Prolog scheduling modules in Sprints 2 and 3 without refactoring existing domain logic (LEI-2026-27-Sem5-Project_v1-SystemSpecification.pdf, pp. 11-13; LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, p. 12).
* **Direct Alignment with ARQSI Principles:** Demonstrates conscious decision-making, clear component ownership, and dependency inversion as required by the course syllabus (principios orientadores ARQSI - English.pdf, p. 2; ARQSI_04_architectural_styles.pdf, p. 20).

* *Negative / Trade-offs:*
* **Increased Initial Boilerplate:** Requires creating dedicated layers, ports, adapters, services, repositories, and data mappers rather than handling queries directly inside route callbacks (02 - Node.js - v2.pdf, pp. 30-31).
* **Discipline Required for Dependency Boundaries:** Team members must strictly prevent inner layers from referencing or importing outer-layer dependencies (e.g., domain entities must never import Nest.js providers, Express `req`/`res` objects, or `pg` clients) (ARQSI_04_architectural_styles.pdf, p. 21; 02 - Node.js - v2.pdf, p. 30).
* **Risk of Over-Porting:** Ports must be used at architectural boundaries, not for every internal class; excessive interfaces would add complexity without architectural value.

---

## Revision History & Changes Noted (ADR-001 Revision v3.0)

* **Status:** Accepted.
* **Architectural Style Terminology Corrected:** Updated the decision from “Layered Architecture combined with Clean/Onion Architecture principles” to “Layered Clean/Onion Architecture with Hexagonal Ports and Adapters at its boundaries” to reflect the actual use of explicit ports for inbound use cases and outbound repositories.
* **Ports Compatibility Clarified:** Clarified that ports are compatible with Clean Architecture. Clean/Onion provides the concentric layering and Dependency Rule; Hexagonal Ports and Adapters provides the explicit boundary contracts. Hexagonal is treated as a boundary implementation style, not as a competing architecture.
* **Layer Count Inconsistency Corrected:** The previous text referred to “four distinct logical layers” while listing five numbered partitions. The document now describes four concentric layers with inbound and outbound interface-adapter partitions.
* **Controllers Partition Folded into Interface Adapters:** The previous separate “Controllers” partition is now treated as thin inbound orchestration within the Interface Adapters layer, not as a separate architectural layer.
* **Explicit Ports and Adapters Added:** Added inbound ports, outbound ports, inbound adapters, and outbound adapters as explicit architectural concepts. The document now states that adapters depend on ports and inner layers do not depend on adapters.
* **Strict Hexagonal Alternative Renamed:** Renamed the previous “Strict Hexagonal Architecture (Ports and Adapters)” alternative to “Strict Hexagonal-Only Architecture (Ports and Adapters without Clean/Onion Layering)” to avoid contradiction with the adopted use of ports.
* **Persistence Framework Alignment (Mongoose -> PostgreSQL Repositories):** Retained the correction from `Mongoose schemas and queries` to `PostgreSQL relational queries and connection pool operations`, aligning ADR 001 with ADR 002, ADR 003, and the actual implementation stack (`pg` connection pool / relational repositories).
* **Framework Terminology Update (Express -> Nest.js):** Retained the update to interface adapter descriptions to reflect Nest.js controllers and routing primitives in accordance with ADR 002.
* **No Inline Correction Markers:** All corrections are summarized in this revision history only.
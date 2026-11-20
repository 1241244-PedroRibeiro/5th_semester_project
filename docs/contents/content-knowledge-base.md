# Knowledge Base: Software Engineering, Architecture, DDD, RDBMS & Web + Systems, AI and Graphics (ISEP - Master Edition v4.0)

> **Metadata:** Version 4.0 (Master) | Scope: ISEP (EAPLI, ESOFT, ARQSI, BDDAD, LAPR5 + ASIST, IARTI, SGRAI) | Last update: November 2026
>
> **KB Structure:**
> - **PART I — Fundamentals of Software Engineering, Architecture and Web** (Sections 1–22): courses oriented towards project structuring, DDD, requirements, ADRs, architectural patterns, REST, persistence, testing, tooling. Applicable transversally.
> - **PART II — Practical Components and Infrastructure** (Sections 23 onwards): courses oriented towards specific technologies and practices — **ASIST** (systems administration), to be completed with **IARTI** (artificial intelligence) and **SGRAI** (graphics systems).
>
> **Suggested System Prompt for Chat:**
> *"Use this Knowledge Base as the absolute source of truth. When you answer, cite the section (e.g., §3.2 or §25.4) to justify your architectural, code or infrastructure decisions. If the KB does not cover a topic, state explicitly 'The KB does not address this topic' instead of inventing. Follow the naming conventions and documentation patterns (ADRs, User Stories, C4) defined. Always distinguish which PART of the KB (I or II) supports the answer."*

## Index
**PART I — Fundamentals of Software Engineering, Architecture and Web**
1. Software Engineering Process & Guiding Principles
2. Requirements Engineering
3. OO Analysis & Domain Model (DDD)
4. OO Design and GRASP Patterns
5. EAPLI Framework & Relational Persistence (JPA / ORM / JPQL)
6. Software Architecture Documentation (SAD & C4 Model)
7. Architectural Styles and Patterns
8. Web Development, JSON & REST Architectural Style
9. Backend Development with Node.js, Express/NestJS & MongoDB/PostgreSQL
10. Coding Best Practices, Exceptions and Conventions
11. Relational Databases (RDBMS), SQL & PL/SQL (Oracle)
12. Global Glossary (Ubiquitous Language PT ↔ EN)
13. Quick Decision Guides
14. Testing and Quality Strategy
15. Frontend Architecture and SPAs
16. Security, DevOps and Observability
17. Distributed Consistency Patterns (Sagas & Outbox)
18. Documentation Templates: User Stories and Client Q&A
19. Architecture Decision Records (ADRs)
20. Domain Model Rationale
21. Physical DB Mapping, ERDs and Optimized Views
22. Continuous Integration (CI), Tooling and Team Troubleshooting

---

## 1. Software Engineering Process & Guiding Principles

Development must never be "Mindless-Driven Development" or result in a *Big Ball of Mud* (spaghetti code without structure). An iterative and incremental process is adopted (integrated with Scrum) where architecture and design precede coding.

### 1.1. The 4 Fundamental Phases

1. **Requirements (Requirements Gathering):** Identify what *stakeholders* need, clarify doubts with the client and record constraints.
2. **Analysis (OO Analysis / DDD):** *"Do the right thing"*. Understand the business, build the Glossary (Ubiquitous Language) and the Domain Model (DM). Check whether the current DM supports the *User Story* (US) or needs to be extended.
3. **Architecture & Design (SW Architecture & OO Design):** *"Do the thing right"*. Make significant decisions (where significance is measured by the cost of change), evaluate *trade-offs*, assign responsibilities (GRASP, SOLID, GoF), draw architectural views (C4, 4+1) and plan tests.
4. **Implementation & Testing (Implementation):** *"Build the thing"*. Code in sync with the Design and Domain Model, run unit, functional/integration tests and continuously integrate into the repository.

### 1.2. Guiding Principles of Architecture (ARQSI)

* **Principle 1 — Architectural Decisions Before Implementation:** Architecture and diagrams support decision-making *before* construction (and evolve iteratively), never serving only to retrospectively describe what has already been coded.
* **Principle 2 — Documentation as a Reasoning Tool:** Documentation exists to think, communicate and justify decisions (*ADRs - Architecture Decision Records*), not to fulfill formalities or fill *checklists*.
* **Principle 3 — Value Above Formalism (*Less is More*):** An artifact should only exist if it brings value and answers a real question from a *stakeholder*. Do not introduce architectural complexity without justification (favor simplicity and evolutionary design / *Walking Skeleton*).
* **Principle 4 — Focus on Decisions and *Trade-offs*, not Technology:** The focus is on *why* a solution was chosen, what the *trade-offs* are (compromises between quality attributes) and dependencies, not on the syntax of specific commands or APIs.
* **Principle 5 — Systems as a Set of Components:** Clearly understand the existing components, their responsibilities, published interfaces (*provided*), consumed interfaces (*required*), dependencies and API ownership.
* **Principle 6 — Architecture is Argumentation:** There is no single "correct" architecture; a good architecture is one that solves the problem, is coherent and is justifiable against the forces of User, Business and System.
* **Principle 7 — Responsible Use of AI:** AI tools are encouraged as support, but the engineer is 100% responsible for everything they deliver and must understand and be able to defend all architectural and code decisions.
* **Principle 8 — Continuous Evidence-Based Evaluation:** Progress is demonstrated continuously throughout the sprint through granular commits, diagram evolution, decision records and technical reviews.

---

## 2. Requirements Engineering

### 2.1. Functional Requirements Artifacts

* **Glossary & Ubiquitous Language (Ubiquitous Language):** Alphabetical list of business terms in the singular (including acronyms and synonyms).
  * **DDD Rule:** Everyone (programmers and domain experts) must use exactly the same terms in conversations, diagrams and code (class names, methods, variables and tests). Challenge technical jargon: if the domain expert says *"a patron requests a copy and the loan becomes overdue"*, the code must use `Patron`, `BookCopy`, `Loan` and `loan.isOverdue()`, and never generic terms like `createCheckoutRecord()`.
* **User Story (US):** Short description from the user's perspective: *"As a `<user role>`, I want to `<do something>`, so that `<benefit>`"*.
  * **3C's of the User Story:** *Card* (description), *Conversation* (clarifications with the client) and *Confirmation* (Acceptance Criteria).
* **Use Case (UC):** Textual story focused on Elementary Business Processes (EBP). Describes the system as a **black box** (focus on the **what** / responsibilities and never on the **how** / technical or UI procedures).
  * *Correct Example:* "The user confirms" / "The system records the sale".
  * *Incorrect Example:* "The user clicks the OK button" / "The system executes an SQL INSERT".
  * **Formats:** *Brief* (1 paragraph, main scenario), *Casual* (multiple paragraphs), *Fully-dressed* (detailed sections: Primary actor, Preconditions, Postconditions, Basic Flow, Alternative/Extension Flows, Special Requirements).
* **US vs UC Relationship (in ESOFT):** Typically \(1 \text{ UC} : * \text{ US}\) (where each US represents a specific success scenario or extension of the UC) or \(1:1\).
* **System Sequence Diagram (SSD):** Visually represents (in UML) a scenario of a UC/US. Shows the Actor(s) and the `:System` (as a black box), highlighting the system events generated by the actor and the system responses.

### 2.2. Non-Functional Requirements, Quality Attributes and FURPS+

* **Key Scenarios (Architecturally Significant Scenarios):** Critical scenarios that represent technical risks/unknowns, intersection of quality attributes with functionality or direct *trade-offs* between quality attributes (e.g., Performance vs. Maintainability, Consistency vs. Availability/Concurrency).
* If they are specific to a US/UC, they are recorded in the **Acceptance Criteria** (US) or **Special Requirements** (UC).
* If they are transversal to the system, they remain in the **Supplementary Specification**, categorized according to the **FURPS+** model:
  * **F**unctionality: Transversal functionalities (Auditing, Security, Email, Printing, Reporting, Localization, Workflow).
  * **U**sability: User interface, error prevention, aesthetics, consistency, accessibility.
  * **R**eliability: Availability, failure frequency, recoverability (disaster recovery), calculation accuracy.
  * **P**erformance: Response time, startup, memory/CPU consumption, load capacity, scalability.
  * **S**upportability: Testability, adaptability, maintainability, configurability, installability, extensibility.
  * **+ (Constraints):** Design, Implementation (languages, OS), Interface (external systems, formats) and Physical (hardware) constraints.

---

## 3. OO Analysis & Domain Model (DDD)

The **Domain Model (DM)** is a UML visual representation of the conceptual classes of the business. It follows the tactical patterns of **Domain-Driven Design (DDD)** and serves as a direct basis for the classes of the domain layer (they must always be in sync).

### 3.1. Rules and Conventions of the Domain Model

* **Concept Names:** Nouns in the singular, starting with a capital letter (`PascalCase`).
* **Attribute Names:** Simple/primitive types, starting with a lowercase letter (`camelCase`).
* **Associations:** Names with expressive business verbs in lowercase (avoid vague verbs like "has" or "inserted"). Always include multiplicities (`1`, `0..1`, `*`, `1..*`) and navigability/reading direction.
  * **Pragmatic simplification:** Remove unnecessary associations, avoid \(N:M\) relationships (qualifying the relationship or introducing intermediate concepts) and **force single traversal direction** (bidirectional relationships forbidden in the DM).
* **Concept vs. Attribute:** Primitive types (`int`, `String`) are not the best option for domain concepts (they violate the *Single Responsibility Principle*). If something has its own structure (e.g., Address), format/validation rules (e.g., `Barcode`, `NIF`, `EmailAddress`) or operations (e.g., `Money`, `Color`), it must be a **Value Object**.
* **Attribute vs. Association:** Never place references to other concepts as attributes (e.g., do not place `createdBy: String` in a `Category` class, but rather an association `created by` to `Administrator`).
* **Inheritance / Specialization:** Only create conceptual subclasses if the *"100% is-a"* rule holds and if the subclass has its own attributes, its own associations or distinct business behavior. Avoid inheritance to model dynamic roles if the same person can assume multiple roles simultaneously (use composition/association for *Roles*).

### 3.2. Tactical DDD Patterns in the Domain Model

1. **Entity (`<<entity>>`):** Concept with continuity over time and its own lifecycle, whose state can change.
   * It matters for its **business identity** (`private final LoanId id;`). Two instances are equal (`equals` / `sameAs`) if they have the same business ID.
   * **Rich Domain Model vs. Anemic Domain Model:** Entities **are not data bags** with *getters* and *setters*. They must have **rich behavior** (business methods that protect invariants, such as `loan.renew(policy)` or `car.repaint(blue)` instead of `setDueDate` or `setColor`). Do not expose public *setters* for identity or for states controlled by rules.

2. **Value Object (`<<value object>>`):** Concept without its own identity, defined only by the value of its attributes (e.g., `Color`, `Money`, `Address`).
   * **Immutable:** All attributes must be `private final`, without *setters* (mutators).
   * **Functional operations:** Methods that change values return a **new instance** of the Value Object (e.g., `Color mixed = red.combinedWith(blue);` or `Money total = price.add(tax);`).
   * **Fluent Semantics:** Avoid `get`/`set` prefixes in methods (use `color.redComponent()`, `loan.id()`, `person.name()`).
   * Can be freely shared between multiple entities/aggregates and completely replaced when an entity changes a characteristic.

3. **Aggregate (`<<aggregate>>`) & Aggregate Root (`<<root>>`):**
   * An Aggregate is a *cluster* of Entities and Value Objects treated as a consistency boundary (transactional) for data changes and invariant guarantees.
   * **Golden Rules of Aggregates:**
     1. The **Aggregate Root** has global identity; internal entities have only local identity (unique within the aggregate).
     2. **Nothing outside the aggregate boundary can hold a reference to internal objects** (only to the `AggregateRoot`, and even when referencing another `AggregateRoot`, an aggregate must not directly alter another aggregate).
     3. Only `AggregateRoots` can be obtained directly by database queries (`Repository`). Internal objects are accessed by navigation from the root.
     4. Deleting the `AggregateRoot` must remove everything within the aggregate boundary at once (`CascadeType.ALL`).
     5. When a change in an aggregate is submitted (*commit*), all invariants of the entire aggregate must be satisfied.

### 3.3. Designing Aggregate Boundaries and Consistency (ACID vs. BASE)

* **Ideal DDD Rule:** A use case (transaction) should update **only one aggregate**.
* **Within an Aggregate -> ACID Consistency** (Immediate / Transactional).
* **Outside an Aggregate (between aggregates) -> BASE Consistency** (*Basic Availability, Soft state, Eventual consistency*).
* **Trade-offs in Aggregate Design (Example: `Account`, `Balance` and `Movement` in eCafeteria):**
  * **Scenario (A) - Single Large Aggregate** (`Account` aggregates a collection of `Movement` with `cascade=ALL` and has `Balance`):
    * *Advantages:* High consistency (ACID), natural modeling.
    * *Disadvantages:* Low concurrency, high memory consumption (loads all movements), write performance penalty.
  * **Scenario (B) - Separate Aggregates with Persisted Balance** (`Account` with `Balance` in one aggregate; `Movement` as `<<root>>` in another aggregate with `cascade=NONE`):
    * *Advantages:* High concurrency, low memory consumption.
    * *Disadvantages:* Eventual consistency (BASE), less natural modeling.
    * *Eventful Approach:* The main use case saves only the `Booking` and publishes a `BookedEvent` to the `EventPublisher`. A dedicated `WatchDog` intercepts the event and creates the `Movement`, publishing `MovementRegisteredEvent`. Another `WatchDog` updates the `Balance` in the `Account`. Each step alters **only one aggregate** per transaction!
  * **Scenario (C) - Separate Aggregates with Calculated/Derived Balance** (`Account` without persisted balance; `Movement` in another aggregate; `Balance` is `<<derived>>`):
    * *Difference:* The performance penalty moves to **reading**. The `MovementRepository` calculates the balance (e.g., `balanceOf(username)`) or a `DomainService` is used.

### 3.4. Domain Model Validation Checklist

* \[ \] Absence of concepts that are "verbs" or actions (e.g., *Processing*, *Validation*).
* \[ \] Absence of artificial global concepts like "System" or "Company" (except if they are genuinely part of the multi-company domain).
* \[ \] All associations have an expressive name, navigability and cardinality.
* \[ \] **Absence of bidirectional associations** (force traversal direction).
* \[ \] References between aggregates point exclusively to the `<<root>>` of the target aggregate.
* \[ \] All entities have an explicit business identity (`ValueObject`).
* \[ \] All concepts (Entities, VOs, Aggregates) are described in the Glossary with terms from the specification document (Ubiquitous Language, without technical DB or UI terms).
* \[ \] It is possible to answer all use cases by "navigating" the relationships of the Domain Model.

---

## 4. OO Design and GRASP Patterns

OO Design is based on **Responsibility-Driven Design (RDD)** — assigning responsibilities of **Knowing** and **Doing** to collaborative objects.

### 4.1. Fundamental GRASP Patterns

* **Pure Fabrication:** Assign responsibilities to an artificial class that does not exist in the domain to maintain High Cohesion and Low Coupling. Examples: UI Classes, Repositories, Technical Services, Controllers, WatchDogs, Adapters.
* **Controller:** First object after the UI layer that receives and coordinates a system event. Acts as a boundary to decouple the UI from the Domain (**the UI never communicates directly with domain entities**).
  * **1 Controller per Use Case / User Story** is adopted: `<UCName>Controller`.
  * The Controller is a **delegator/orchestrator**: it coordinates the flow, but **never performs calculations or business validations directly**.
* **Information Expert:** Assign a responsibility to the class that holds the information necessary to fulfill it, collaborating along the object graph.
* **Creator:** Class `B` instantiates `A` if: (1) `B` contains/aggregates `A`, (2) `B` records `A`, (3) `B` closely uses `A`, or (4) `B` has the initialization data for `A`. (For complex creation, use `Factory` or `Builder`).
* **Local vs. Global Validation:**
  * **Local Validation:** The Entity or Value Object itself validates its internal attributes and invariants at construction time (*Information Expert* + `Preconditions` / `Invariants`).
  * **Global Validation:** Whoever knows the collection/set of objects (e.g., aggregating class or `Repository`) guarantees global rules such as uniqueness/non-duplication.

### 4.2. Special Use Cases: Bootstrap and Reporting

* **Bootstrap Use Cases:** Initialization of base system data. They must reuse the *Controllers* or *Services* of normal creation use cases, respecting the order of dependencies.
* **Reporting Use Cases (Listings/Complex Queries):**
  * They must not alter or pollute the Domain Model.
  * Create a dedicated *Reporting* repository separate from domain repositories, returning **DTOs (Data Transfer Objects)** directly (e.g., `SELECT NEW` in JPQL), avoiding loading heavy graphs into memory.
* **Data Volume:** Never use `findAll()` without control on large tables; limit results or use pagination.

---

## 5. EAPLI Framework & Relational Persistence (JPA / ORM / JPQL)

### 5.1. Structure and Modules of `eapli.framework`

* **`eapli.framework.core`:**
  * **DDD (`eapli.framework.domain.model`):** Interfaces `ValueObject`, `DomainEntity<I>`, `AggregateRoot<I>`, `Identifiable<T>`, `DomainFactory`.
  * **General Objects:** `Money`, `Designation`, `Description`, `EmailAddress`, `DateInterval`.
  * **Validations (`eapli.framework.validations`):** `Preconditions` (validates arguments, throws `IllegalArgumentException`) and `Invariants` (validates internal state, throws `IllegalStateException`).
  * **Patterns and Utilities:** `Action` (Command pattern), `DTO` / `DTOable`, `Visitable` / `Visitor`, `Console`.
* **`eapli.framework.infrastructure.authz`:** Authentication, sessions, `SystemUser`, `Username`, `Role`.
* **`eapli.framework.infrastructure.pubsub`:** Domain event publication and subscription (`DomainEvent`, `DomainEventBase`, `EventPublisher`, `EventDispatcher`, `EventHandler`).

### 5.2. Repository and JPA Architecture (`javax.persistence`)

* **1 Repository per `AggregateRoot`:** Interface in the domain layer; implementations (`InMemoryDomainRepository` and `JpaBaseRepository` / `JpaAutoTxRepository`) in the infrastructure/persistence layer, instantiated via `RepositoryFactory`.
* **Base Annotations on JPA Entities:**
  * `@Entity` (requires a `protected` or `public` empty constructor), `@Table`, `@Id`, `@GeneratedValue`, `@Column(unique=true, nullable=false)`, `@Transient` (not persisted), `@Temporal`, `@Enumerated(EnumType.STRING)`, `@Lob` + `@Basic(fetch=FetchType.LAZY)`.
* **Value Objects (`@Embeddable`):**
  * Embedded in the entity's table. Use `@AttributeOverrides` if an entity has two VOs of the same type. Use `@ElementCollection` for collections of VOs (`Set<Phone>`). Use `@EmbeddedId` for a business primary key.
* **Association Mapping and `CascadeType` Rules with DDD (CRITICAL):**
  * **Within the same Aggregate:** Use **`CascadeType.ALL`** (e.g., `@OneToMany(cascade = CascadeType.ALL)` with `@JoinColumn` to avoid an unnecessary intermediate table in unidirectional relationships).
  * **To OTHER Aggregates:** Use **`CascadeType.NONE`** (default in `@ManyToOne`). The other aggregate must be previously persisted in its own repository.
  * **FetchType Default:** `EAGER` in `@ManyToOne` / `@OneToOne` (can be forced to `LAZY` for optimization); `LAZY` in `@OneToMany` / `@ManyToMany`.
* **JPA Inheritance (`@Inheritance`):** `SINGLE_TABLE` (1 table with `@DiscriminatorColumn`, fast but with `NULL` columns), `JOINED` (1 table per class linked by FK, normalized but requires joins), `TABLE_PER_CLASS` (1 table per concrete class).
* **Concurrency:** *Optimistic Locking* (`@Version private Long version;`, detects conflict at commit) vs. *Pessimistic Locking* (`LockModeType.PESSIMISTIC_READ` / `WRITE` / `FORCE_INCREMENT`).
* **Lifecycle in `EntityManager`:** `Transient` (new) -> `Managed` (`persist`, `find`, return of `merge`) -> `Detached` (`close`, `detach`) -> `Removed` (`remove`).

### 5.3. Queries with JPQL

* Operates over **Java Classes and Attributes (case-sensitive)** and never over SQL tables/columns.
* Always use **Named Parameters (`:param`)** with `query.setParameter("param", valueOfCorrectType)`.
* **Joins:** Implicit navigation by dot in `@ManyToOne` (`ca.car.carGroup.name`), explicit `JOIN` in `@OneToMany` collections, `LEFT JOIN FETCH` to load `LAZY` collections in the same query.
* **Direct Projection into DTOs:** `SELECT new package.ClassDTO(t.acronym, COUNT(d)) FROM Dish d JOIN d.dishType t GROUP BY t.acronym HAVING COUNT(d) > 2`.

---

## 6. Software Architecture Documentation (SAD & C4 Model)

*"Code doesn't tell the whole story."* The goal of the **Software Architecture Document (SAD)** is to complement the code, describing the main components, the *drivers* (requirements, constraints and principles), the infrastructure and the **explicit justification** of decisions. It is a living document (kept in version control / Wiki) and oriented to **Stakeholders** and their *concerns*.

### 6.1. Architectural View Models (4+1 and SEI Views & Beyond)

No single diagram serves all audiences. A set of complementary views is used:

* **Kruchten's 4+1 Model (RUP):**
  1. **Logical View:** Static structure and functionality (Classes, Packages, Components).
  2. **Process View:** Dynamic aspects, concurrency, execution flows (Sequence, Activity Diagrams).
  3. **Development / Implementation View:** Organization of modules, layers and files in the development environment (Packages, Components).
  4. **Physical / Deployment View:** Mapping of software onto hardware/infrastructure nodes (Deployment Diagram).
  5. **Scenarios / Use Case View (+1):** Convergence point that validates the 4 views through key scenarios (Use Cases, SSDs).
* **SEI Views and Beyond (3 View Categories):**
  1. **Module Views (Static / Code):** *Decomposition* (submodules), *Uses* (dependencies between modules), *Layered* (layers), *Class* (inheritance/instantiation).
  2. **Component-and-Connector (C&C) Views (Runtime):** Components in execution and connectors (pipes, HTTP/RPC calls, queues). Examples: *Client-Server*, *Process*, *Concurrency*, *Shared Data*.
  3. **Allocation Views (Mapping to External Environments):** *Deployment* (hardware/network), *Implementation* (physical files/artifacts `.jar`/`.ear`), *Work Assignment* (teams).
* **Recommended Content per View:** Description of the view + Primary presentation (diagram with legend) + **Element Catalog** (responsibilities and interfaces of each element) + Rationale/Justification.

### 6.2. The C4 Model (Simon Brown)

*"Abstraction-first"* approach with 4 hierarchical levels of *zoom* (like a geographic map), complemented by dynamic and *deployment* views:

| Level | Diagram Name | Question it Answers | Elements Included | Target Audience | 
| ----- | ----- | ----- | ----- | ----- | 
| **Level 1** | **System Context** | *What are we building and how does it fit into the environment?* | The System in focus (central box), People/Actors and External Systems. | Everyone (executives, business and technical). | 
| **Level 2** | **Container** | *What runs inside?* | Independently executable/deployable applications (Web App, SPA, Mobile App, Backend API, Workers) and Data Stores (Databases, Queues, Object Stores). *(Note: C4 Container* \(\neq\) *Docker!)* | Technical leadership, architects and development team. | 
| **Level 3** | **Component** | *What responsibilities live inside a Container?* | Logical groupings of functionality (Controllers, Services, Repositories, Adapters) within a single specific Container. | Development team. | 
| **Level 4** | **Code** | *How is it implemented?* | Classes, interfaces, functions, tables (typically UML class diagrams generated only where complexity justifies it). | Programmers. | 

* **Supporting Views in C4:**
  * **System Landscape:** View of multiple systems in the organization (above Level 1).
  * **Dynamic View:** Numbered/ordered runtime interactions between Containers or Components for a specific scenario.
  * **Deployment View:** How Container instances are mapped onto infrastructure nodes (Clouds, Subnets, Kubernetes Clusters, DB Servers).
* **C4 Quality Rules and Anti-Patterns:**
  * **1 Level of Abstraction per Diagram:** Never mix internal components or deployment nodes in a Context diagram.
  * **Expressive Relationships:** Arrows without labels or with vague text like *"uses"* are forbidden. Always use active verbs and indicate the protocol/technology at technical levels (e.g., *"Submits orders via \[JSON/HTTPS\]"*).
  * **Avoid "Container Smells":** Do not draw a generic box called "Backend" that hides everything; do not leave databases without an owner or improperly shared between multiple services; do not show internal libraries as if they were Containers.
  * **Architecture as Code:** Prefer text-based tools versioned in Git (e.g., **Structurizr DSL**, **C4-PlantUML**, **Mermaid C4**). For most projects, **Context + Container** deliver most of the value (levels 3 and 4 are selective).

---

## 7. Architectural Styles and Patterns

### 7.1. Layered Architecture vs. Tiers

* **Layers (Logical Division):** Organization of code into levels of abstraction (*Presentation*, *Application/Service*, *Business/Domain*, *Infrastructure/Data Access*).
  * *Warning:* A generic component in the data layer that only executes SQL strings (`ExecutesSelect(String sql)`) forces the business layer to know SQL — therefore, **it is not a true Data Access Layer (DAL)**. The DAL/Repository must completely hide persistence and SQL details from the business layer.
* **Tiers (Physical Division):** Where layers are physically installed and executed (e.g., Thin Client Browser -> Web Farm -> Application Farm -> Database Cluster).

### 7.2. Concentric Architectures (Hexagonal, Onion, Clean Architecture)

They isolate the business core (*Application Core* = *Domain Model* + *Domain Services* + *Application Services / Use Cases*) from external technical concerns (UI, Database, Frameworks, Web Services).

* **The Dependency Rule:** Source code dependencies point **exclusively inward** (toward the domain). Inner layers (policies/business) know absolutely nothing about outer layers (mechanisms/infrastructure).
* **Dependency Inversion (Ports & Adapters):**
  * **Ports:** Input interfaces (Use Cases) and output interfaces (Repository Interfaces, Notification/Payment Interfaces) defined in the *Application Core*.
  * **Adapters:** Technical implementations in the outer layer that connect to the ports (e.g., *Driving Adapters* such as `CLI Presentation`, `Web UI`, `REST API Controllers`; and *Driven Adapters* such as `JPA Persistence Implementation`, `StripePaymentAdapter`, `EmailNotificationAdapter`).
* **Domain Services vs Application Services:**
  * **Domain Service:** Contains business logic that does not naturally belong to any Entity or Value Object (e.g., complex interest calculation involving multiple aggregates). It is *stateless*.
  * **Application Service (Use Case):** Orchestrates workflow, transactions and security. Delegates business logic to the Domain. Has no business rules.
* **Benefits:** Framework-independent system, 100% testable in isolation, independent of UI and independent of Database.

### 7.3. MV\* Family (MVC, MVP, MVVM) and SPA vs. MPA

* **MPA (Multi-Page Application):** Traditional lifecycle — each action/POST generates a new request to the server which returns a complete HTML page, forcing *Page Reload* in the browser.
* **SPA (Single-Page Application):** Loads the initial HTML/JS only once and communicates asynchronously in the background (AJAX / `fetch`) exchanging only data in **JSON** (DTOs) with a REST API on the server.
* **UI Interaction Patterns (`MV*`):**
  * **MVC (Model-View-Controller):** The `Controller` receives user/HTTP inputs, manipulates the `Model` (logic/state) and selects the `View` (which renders the Model state).
  * **MVP (Model-View-Presenter):** The `View` is passive (does not know the Model); the `Presenter` mediates everything between View and Model, facilitating unit testing (mocking the View).
  * **MVVM (Model-View-ViewModel):** Uses automatic *Data Binding* and commands between the `View` and the `ViewModel` (which maintains the view state and communicates with the Model).

### 7.4. Distributed Systems and Service Patterns

* **1st Commandment of Distributed Systems:** *"Do not distribute"* (distribution introduces network latency, partial failures and the need for serialization). Do not confuse distributing business layers across separate servers (which degrades performance) with **Load Balancing** (replicating the complete module behind a load balancer for horizontal scalability).
* **Distributed Communication Patterns:**
  * **Remote Façade:** Provides a *coarse-grained* interface over fine-grained objects to minimize the number of network calls.
  * **Data Transfer Object (DTO) & Assembler:** Simple object without behavior that transports data between processes/layers, built by an *Assembler* from domain entities.
  * **Service Gateway:** Object that acts as a *Proxy* on the client, encapsulating the connection code to the external service, network protocols and data translation.
  * **Service Locator:** Hides the complexity of discovering and instantiating *Service Gateways* or services.
  * **Service Layer:** Defines the application boundary and the set of operations available to external clients.
* **Anti-Patterns and Service Patterns:** Avoid *CRUDY* interfaces (verbose and data-coupled) or *Loosey-Goosey* (without a clear contract, e.g., exposing SQL). Prefer document-based contracts (*Document Processor*), **Idempotent Operations** (repeating the request produces the same result without duplicate side effects) and **Reservation** (for long transactions without locking the DB, using compensation procedures).

### 7.5. Pipes and Filters, Event-Driven, Messaging and CQRS

* **Pipes and Filters:** Divides a complex data stream processing task into a sequence of independent and reusable steps (**Filters**, e.g., *Decrypt -> Authenticate -> De-Dup*) connected by channels (**Pipes**).
* **Event-Driven & Message-Based Architectures (Publish-Subscribe):**
  * An **Event** is a significant state change in the business that has already occurred, always named in the **past** (e.g., `CustomerWasBilled`, `OrderPlaced`).
  * **Publish-Subscribe:** Decouples producers from consumers through channels/topics.
  * **Queue-based Load Leveling & Web/Worker Roles:** A message queue (*Message Queue*) between the *Web Role* (which accepts fast requests) and the *Worker Role* (which processes heavy tasks in the background, possibly with *Competing Consumers*) absorbs load peaks and allows both to scale independently.
* **CQRS (Command Query Responsibility Segregation):**
  * Separates the write model (**Command Model** — transactional, focused on business rules, invariants and normalization) from the read model (**Query Model** — denormalized, optimized for fast reads and projections/DTOs, synchronized periodically or via events).
  * **Task-based UI & Intentional API:** Instead of sending a giant DTO in a generic `updateCustomer(dto)` (CRUD style that loses the user's intention), the UI and API capture the **business intention** through explicit commands: `deactivateCustomer(id, reason)`, `changeAddress(id, newAddress)`.
  * **Polyglot Persistence & Microservices:** CQRS and DDD Bounded Contexts combine naturally with Microservices (where each service manages its context and scales autonomously behind an *API Gateway*) and Polyglot Persistence (use RDBMS for finance, MongoDB for catalogs, Redis for sessions, etc.).

---

## 8. Web Development, JSON & REST Architectural Style

### 8.1. HTTP, URL and JSON Fundamentals

* **URL Syntax:** `scheme://userinfo@hostname:port/path?query#fragment`.
* **JSON (JavaScript Object Notation):** Lightweight, language-independent format based on two universal structures: **Objects** (`{ "key": value }`) and **Arrays** (`[ value1, value2 ]`). Supported value types: `string`, `number`, `object`, `array`, `true`, `false`, `null`.

### 8.2. The 5 Fundamental Principles of REST (Roy Fielding)

REST (*REpresentational State Transfer*) is an **architectural style** for distributed hypermedia systems (and **not** a technology or mere synonym for CRUD).

1. **Give every "thing" an ID (Resources and URIs):**
   * The central abstraction is the **Resource**. Move from an RPC mentality oriented to verbs (`getBookmark`, `createUser`) to **Domain Nouns** (`/bookmarks`, `/users`).
   * Even business processes, calculations or service orders must be modeled as resources (e.g., instead of `POST /books/{id}/print` in RPC style, do `POST /printorders` which creates a resource `/printorders/3Af42X` whose state can be consulted with `GET` or cancelled with `DELETE`).
   * **URI Design Rules:**
     * Use **plural nouns** for collections (`/customers`, `/orders`) and hierarchical paths for individual elements (`/customers/{id}`, `/orders/{id}/items`).
     * Use verbs only for controller resources/non-CRUD processes (`/carts/{id}/checkout`, `/students/{id}/register`).
     * **Forbidden to use CRUD function names in URIs** (use `DELETE /users/12` and never `GET /deleteUser/12`).
     * Use the **Query String** for filtering, searching and pagination of collections (`GET /users?role=admin&pageSize=25&pageStartIndex=50`).

2. **Use Standard Methods (Uniform HTTP Interface):**

| HTTP Method | Semantics on Collections (`/orders`) | Semantics on Elements (`/orders/{id}`) | Safe (No side effects) | Idempotent (Repeatable with same effect) | 
| ----- | ----- | ----- | ----- | ----- | 
| **`GET`** | List collection members | Obtain resource representation | **Yes** | **Yes** | 
| **`PUT`** | Replace the entire collection *(rare)* | Update complete resource or create if the client defines the ID (*Upsert*) | No | **Yes** | 
| **`PATCH`** | — | Partial update of the resource | No | No *(generally)* | 
| **`POST`** | Create new resource in the collection (server assigns URI and returns `201 Created` + `Location` header) | Submit data for processing / create sub-resource | No | **No** | 
| **`DELETE`** | Delete the entire collection | Delete the specified resource | No | **Yes** | 
| **`HEAD` / `OPTIONS`** | Obtain only headers / Obtain supported methods | Obtain only headers / Obtain supported methods | **Yes** | **Yes** | 

3. **Provide Multiple Representations (Content Negotiation):**
   * The same resource can have multiple representations (`application/json`, `application/xml`, `text/vcard`, `application/pdf`).
   * **Always use HTTP Content Negotiation** through the `Accept:` header in the request and `Content-Type:` in the response (avoid placing `.json` extensions or `?format=xml` in the URL). Apply the *Postel's Law*: be conservative in what you send and liberal in what you accept.

4. **Communicate Statelessly (No Session State on the Server):**
   * The server does not store client session between requests. The state is either **Resource State** (on the server/DB, addressed by URI) or **Application/Client State** (kept on the client and sent in each request, e.g., request `GET /resources?page=2` instead of `GET /resources/getNextPage`).

5. **Link Things Together (HATEOAS — *Hypermedia as the Engine of Application State*):**
   * Representations returned by the API must contain **hypermedia links** (`rel` and `href`/`uri`) that indicate to the client how to navigate to related resources and **which next actions/state transitions are dynamically allowed** according to the current state of the resource (e.g., if a bank account has a negative balance, the representation only includes the link `rel="deposit"` and omits `rel="withdraw"`).

### 8.3. Richardson Maturity Model & HTTP Status Codes

* **Richardson Maturity Model:**
  * **Level 0:** *The Swamp of POX* (use HTTP only as a transport tunnel for a single RPC/XML/JSON endpoint).
  * **Level 1:** **Resources** (multiple URIs identifying distinct resources, but still using a single verb for everything).
  * **Level 2:** **HTTP Verbs** (correct use of `GET`, `POST`, `PUT`, `DELETE` and HTTP status codes).
  * **Level 3:** **Hypermedia Controls / HATEOAS** (*Glory of REST* — self-descriptive representations with links that guide the application state).
* **Main HTTP Status Codes (Response Status Codes):**
  * **1xx (Informational):** `100 Continue`, `101 Switching Protocols`.
  * **2xx (Success):** `200 OK` (general success), `201 Created` (resource created, include `Location` header), `202 Accepted` (accepted for asynchronous/batch processing), `204 No Content` (success without response body, common in `DELETE` or `PUT`).
  * **3xx (Redirection):** `301 Moved Permanently`, `302 Found`, `303 See Other`, `304 Not Modified` (caching), `307 Temporary Redirect` / `308 Permanent Redirect` (forbid changing the original HTTP method).
  * **4xx (Client Error):** `400 Bad Request` (syntax/validation error), `401 Unauthorized` (not authenticated — missing valid credential/token), `403 Forbidden` (authenticated, but without permissions/authorization for the resource), `404 Not Found` (resource does not exist), `405 Method Not Allowed`, `406 Not Acceptable` (content negotiation failure), `409 Conflict` (state/business duplication conflict), `422 Unprocessable Entity` (semantic error), `429 Too Many Requests` (rate limiting).
  * **5xx (Server Error):** `500 Internal Server Error` (unhandled server error), `501 Not Implemented`, `502 Bad Gateway`, `503 Service Unavailable` (maintenance/overload, use `Retry-After` header), `504 Gateway Timeout`.

---

## 9. Backend Development with Node.js, Express/NestJS & MongoDB/PostgreSQL (ARQSI)

### 9.1. Node.js Fundamentals and Asynchronous Programming

* **Node.js Architecture:** Server-side JavaScript platform based on the **V8** engine. It executes JavaScript code on a **single main thread** (*Single-Threaded Call Stack*) coordinated by the **Event Loop**.
* **Non-Blocking I/O:** I/O operations (network, database, file system, timers) are delegated to the Operating System APIs or to a **Worker Pool** (for heavy CPU/file tasks) without blocking the main thread. When they finish, results enter the *Promise Jobs Queue* (microtasks) or *Callbacks Queue* to be executed on the Call Stack.
* **Asynchronous Patterns:**
  * Use modern ES modules (`"type": "module"` in `package.json`, `import` / `export` syntax) and **`async` / `await`** over **Promises** (avoid legacy nested callbacks).
  * The `await` command only pauses the current `async` function until the Promise resolves, **not blocking the Event Loop** for other concurrent requests.
  * Note: `EventEmitter` (`node:events`) is a useful mechanism for event-oriented programming (internal pub/sub), but it is not the engine of Node.js asynchronous I/O.
  * To invoke external APIs from Node.js (v18+), use the native **`fetch()`** function with `async/await`.

### 9.2. Modular Structure and Layered Architecture with Express / NestJS

* **Separation between `src/app.js` and `src/server.js` (Critical Best Practice for Testability):**
  * `app.js`: Builds, configures middlewares (`express.json()`, `cors()`, routes, `errorHandler`) and exports the Express application **without opening a port or connecting to the DB**. Allows integration tests (e.g., with *Supertest*) to import `app` directly in memory.
  * `server.js`: Entry point that establishes the database connection (`await connect()`) and starts the HTTP server (`app.listen(port)`).
* **Division of Responsibilities per Module (`routes` -> `validation` -> `controller` -> `service` -> `repository` -> `model`):**
  1. **Routes (`*.routes.js`):** Uses `express.Router()`. Defines HTTP paths, applies authentication/authorization and **input validation** middlewares, and forwards to the Controller.
  2. **Input Validation Middleware (`*.validation.js` with `Joi` or `celebrate`):** Validates the shape and types of `req.body` / `req.query` / `req.params` **at the boundary (before the Controller)**. If it fails, it immediately returns `400 Bad Request` and interrupts the flow.
  3. **Controller (`*.controller.js`):** Knows only HTTP (`req` and `res`). Extracts data from the request, calls the `Service` and returns the appropriate HTTP status code and JSON.
  4. **Service (`*.service.js`):** Contains the **business rules**. It does not know `req` or `res`, and **never imports Mongoose models directly** (communicates only with the `Repository`). Throws domain/application errors (e.g., `ConflictError`, `UnauthorizedError`).
  5. **Repository (`*.repository.js`):** **The only module that imports the Mongoose/ORM `Model`.** Hides all persistence details (queries, projections and `.populate()` calls) from the service layer.
  6. **Global Error Handler (`middleware/error-handler.js`):** In **Express 5 / NestJS**, exceptions thrown in `async` functions are automatically forwarded to the error middleware (`errorHandler(err, req, res, next)` or `APP_FILTER` in NestJS) without the need for repetitive `try/catch` blocks in controllers. It must return a consistent JSON format using `err.status ?? 500`.

### 9.3. Document Persistence with MongoDB and Mongoose (ODM) vs Relational (PostgreSQL)

* **Data Modeling in MongoDB (Embedding vs. Referencing):**
  * **Denormalized (Embedded Sub-documents):** Related data stored within the same document (fast reading in a single query and atomic write in a single document; maximum limit of 16 MB per document). Ideal for Value Objects and \(1:\text{Few}\) relationships always read together.
  * **Normalized (References via `ObjectId`):** Uses `{ type: Schema.Types.ObjectId, ref: 'ModelName' }`. Use when the "many" side grows indefinitely, when data is updated independently or when shared by multiple parents.
* **Critical Rules with Mongoose:**
  * **Schema Validation:** Runs automatically in a `pre('save')` hook. *Warning:* `required: true` on an `Array` only validates that the array exists (even if empty `[]`); to require at least 1 element, use a custom validator.
  * **Referential Integrity on `DELETE`:** MongoDB does not automatically guarantee referential integrity (foreign keys) when a referenced document is deleted. The implementation of `DELETE` operations must explicitly validate whether the document is still referenced in other documents before deleting it.
  * **Where to use `.populate()`:** Reference resolution with `.populate()` belongs **exclusively to the Repository** (never to the Service). Avoid calling `populate()` inside loops or chaining multiple deep levels to avoid the **N+1 Queries** performance problem.
* **When to choose RDBMS (PostgreSQL) instead of NoSQL:**
  * When the domain requires **strict referential integrity** (e.g., impossibility of deleting a category if it has associated products). In PostgreSQL this is native (`ON DELETE RESTRICT`); in MongoDB it requires application validations (vulnerable to race conditions).
  * When strong ACID consistency in multi-entity transactions is required.
  * When data is highly normalized.
  * *Note:* PostgreSQL supports `JSONB` columns for semi-structured data, offering the best of both worlds.

### 9.4. CORS Configuration and Authentication/Authorization with JWT

* **CORS (Cross-Origin Resource Sharing):**
  * Controlled relaxation of the browser's *Same-Origin Policy* (two URLs only have the same origin if they have exactly the same `scheme`, `host` and `port`).
  * Never leave `cors()` open to any origin (`*`) in APIs with authenticated users; configure `origin` via environment variable or *allowlist* pointing to the Frontend origin (e.g., `http://localhost:5173`).
* **Stateless Authentication with JWT (JSON Web Token — RFC 7519) vs. Sessions:**
  * In-memory server sessions harm horizontal scalability and require CSRF protection in cookies.
  * **JWT (`header.payload.signature`):** Stored on the client and sent in each request in an HTTP header (e.g., `Authorization: Bearer <token>` or `x-access-token`). Signed on the server with a secret (`JWT_SECRET`).
* **Mandatory Security Rules in Authentication & Authorization (A&A):**
  1. **Never trust `req.body` for permission fields:** Attributes such as `isAdmin`, `role` or the user's `id` **must never** be accepted from client input during registration or update (prevent *Mass Assignment / Privilege Escalation*).
  2. **Hide passwords at the Schema level:** Always define `password: { type: String, required: true, select: false }` in the Mongoose Schema (or omit in SQL queries) (storing the hash generated with `bcrypt.hash(password, 10)` or `Argon2id`). This way, no query returns the hash by accident; only login explicitly requests `.select('+password')`.
  3. **Identical error message on Login:** Return exactly the same response (`401 Unauthorized - "Invalid email or password"`) whether the email does not exist or the password is wrong, preventing enumeration of registered users.
  4. **JWT Payload Trade-off:** Including the role (`role` / `isAdmin`) in the JWT payload *claims* avoids going to the database on each request in the `verifyToken` and `requireRole(role)` middlewares, but implies that permission changes only take effect when the token expires (`expiresIn`).

### 9.5. Rules for Creating Base Project Skeletons (ARQSI Prompts)

When only the **initial technical skeleton (*starting skeleton*)** of a Backend or Frontend project is requested:
* Keep the skeleton 100% agnostic of the domain (no business entities, no DB connection, no authentication, no Docker/CI and no imposing architecture folders if the team still has to decide and justify them).
* Include environment variable configuration (`.env.example`), linter/formatter (`.editorconfig`), initial OpenAPI/Swagger documentation, configurable CORS, global JSON error handler, diagnostic endpoint `GET /api/v1/health` (returning `{ status: "ok", version, timestamp }`) and 1 passing automated test for that endpoint.

---

## 10. Coding Best Practices, Exceptions and Conventions

### 10.1. Naming and Style (Clean Code)

* **Single Language:** All code, comments, identifiers and commit messages must be written in **English**. Never mix languages.
* **Meaningful Names Aligned with Ubiquitous Language:**
  * Forbidden to use vague names like `data`, `value`, `info`, `obj`, or prefixes like `o_`, `m_`.
  * **Classes / Types:** Nouns in `PascalCase` (e.g., `CheckingAccount`).
  * **Interfaces:** Adjectives (`Comparable`, `Identifiable`) or nouns in `PascalCase` (`UserRepository`).
  * **Methods / Functions:** Verbs in `camelCase` that reflect business operations (`registerExpense()`, `isOverdue()`, `hasIdentity()`).
  * **Variables:** Descriptive `camelCase` (`initialBalance`). **Constants:** `UPPER_SNAKE_CASE` (`MAX_WIDTH`).
* **Formatting and Statements:**
  * Always use braces `{` and `}` in conditional blocks and loops.
  * Return boolean expressions directly (`return a == b && c == d;`).

### 10.2. Code Smells & Refactoring

* **Always construct objects in a valid state:** Never allow an object to be instantiated with violated invariants.
* **Data Class (Anemic Domain Model):** Avoid classes that only have attributes, *getters* and *setters*. Move behavior to the class that holds the data (*Move Method* / *Information Expert*).
* **Long Method & Duplicated Code:** Extract cohesive submethods (*Extract Method*).
* **Long Parameter List & Data Clumps:** Group parameters that always go together into a Value Object or Parameter Object (*Introduce Parameter Object*).
* **Comments (Deodorant):** Comments must explain the **why** and not the **what**. If the code needs a comment to explain what it does, refactor and give better names to methods.

### 10.3. Exception Handling

* **Checked (`Exception`) vs. Unchecked (`RuntimeException` in Java):** Use *Checked* if the client can recover from the error; use *Unchecked* for precondition violations or unrecoverable errors.
* **Golden Rules:** Never silence exceptions (empty `catch`). If a layer does not know how to handle the exception, it must not catch it — it must let it propagate to the Controller, UI or Global Error Handler. Create custom exception classes only when they represent business rules or specific status codes (`ConflictError`, `InsufficientBalanceException`).

---

## 11. Relational Databases (RDBMS), SQL & PL/SQL (Oracle)

### 11.1. The Database System Development Lifecycle
* **Conceptual:** Conceptual model of the business (Entities and Relationships), highly based on the Domain Model.
* **Logical:** Mapping to the relational paradigm. **Normalization** is applied.
* **Physical:** Implementation in a specific DBMS (e.g., Oracle) through SQL scripts (DDL).

### 11.2. The Relational Model
* **Relation (Table):** Set of tuples.
* **Attribute (Column):** Domain of values.
* **Tuple (Row):** Occurrence.
* **Degree:** Number of attributes of a relation.
* **Cardinality:** Number of tuples (rows) in a relation.
* **Keys:**
  * *Superkey:* Any set of attributes that uniquely identifies a tuple.
  * *Candidate Key:* Minimal superkey.
  * *Primary Key (PK):* Candidate key chosen to identify tuples.
  * *Foreign Key (FK):* Attribute(s) that reference the PK of another relation (or the same one).

### 11.3. Normalization
Process to eliminate redundancy and update anomalies, ensuring data integrity.
* **1NF (First Normal Form):** All attributes contain only atomic values. There are no repeating groups (e.g., a column cannot have a list of values).
* **2NF (Second Normal Form):** It is in 1NF and **all non-key attributes functionally depend on the entirety of the primary key**. Eliminates partial dependencies (crucial when the PK is composite).
* **3NF (Third Normal Form):** It is in 2NF and **there are no transitive dependencies**. No non-key attribute depends on another non-key attribute.
* **BCNF (Boyce-Codd):** Stricter version of 3NF. Every determinant is a candidate key. Resolves anomalies in tables with multiple overlapping candidate keys.
* **4NF & 5NF:** Deal with multi-valued and join dependencies, respectively (rarely applied in practice).
* *Note:* Denormalization (introducing controlled redundancy) can be used to improve read performance, but degrades writing and increases the risk of inconsistency.

### 11.4. SQL (Structured Query Language)
Subdivided into:
* **DDL (Data Definition Language):** `CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`, `CREATE INDEX`.
* **DML (Data Manipulation Language):** `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
* **DCL (Data Control Language):** `GRANT`, `REVOKE`.

**Essential Syntax and Data Types (Oracle):**
* `VARCHAR2(size)`, `NUMBER(p, s)`, `DATE`, `TIMESTAMP`.
* `CREATE TABLE Name ( ID NUMBER GENERATED AS IDENTITY PRIMARY KEY, Name VARCHAR2(100) NOT NULL UNIQUE, CONSTRAINT chk_val CHECK (Value > 0) );`
* **Referential Integrity:** `FOREIGN KEY (Column) REFERENCES OtherTable(PK) ON DELETE CASCADE` (use with caution).

**Queries (SELECT):**
* Structure: `SELECT [DISTINCT] ... FROM ... [WHERE ...] [GROUP BY ...] [HAVING ...] [ORDER BY ...]`.
* **Joins:**
  * `INNER JOIN`: Only records with a match in both tables.
  * `LEFT JOIN` / `RIGHT JOIN`: Includes all records from one table and the matching ones from the other (fills with `NULL` if no match).
  * `FULL OUTER JOIN`: All records from both tables.
* **Subqueries:**
  * *Scalar:* Return a single value. Can be used in `SELECT`, `WHERE` or `HAVING`.
  * *Multi-row:* Return multiple rows. Use operators like `IN`, `ANY`, `ALL`, `EXISTS`.
  * *Correlated:* The inner subquery references columns from the outer query (executes N times).
  * *Non-Correlated:* Executes only once.
* **Set Operators:** `UNION` (unites and removes duplicates), `UNION ALL` (unites and keeps duplicates), `INTERSECT` (intersection), `MINUS` / `EXCEPT` (difference).
* **WITH Clause (CTE - Common Table Expression):** Creates named temporary tables for complex queries, improving readability and reuse.

### 11.5. PL/SQL (Procedural Language/SQL)
Oracle extension that adds procedural (imperative) logic to SQL.
* **Anonymous Blocks:** `DECLARE` (variables) -> `BEGIN` (logic) -> `EXCEPTION` (error handling) -> `END;`.
* **Named Blocks (Subprograms):**
  * **Procedures:** Execute an action. Do not return a value directly (use `OUT` parameters). Called via `EXEC name_proc()`.
  * **Functions:** Have a `RETURN` clause and must return a value. Can be called in SQL queries (if they do not violate DML restrictions).
* **Parameters:** `IN` (input, default value), `OUT` (output, pass by reference), `IN OUT` (input/output).
* **Cursors:** Pointers to the memory area (UGA) where the result of a query is processed.
  * *Implicit:* Automatically created for `SELECT INTO`, `INSERT`, `UPDATE`, `DELETE`. The `SELECT INTO` requires the query to return exactly 1 row.
  * *Explicit:* Declared by the user (`CURSOR c IS SELECT...`). Lifecycle: `OPEN`, `FETCH`, `CLOSE`.
  * *Attributes:* `%ROWCOUNT`, `%ISOPEN`, `%FOUND`, `%NOTFOUND`.
  * *Cursor FOR Loop:* `FOR reg IN c LOOP ... END LOOP;` (opens, fetches and closes automatically).
  * *SYS_REFCURSOR:* Dynamic cursor that can be passed as a parameter or returned by functions.
* **Exceptions:** `RAISE_APPLICATION_ERROR(-20001, 'Message')` to throw custom errors.

### 11.6. Triggers
PL/SQL blocks that fire automatically in response to events (DML: INSERT/UPDATE/DELETE, DDL, or system events).
* **Syntax:** `CREATE TRIGGER ... BEFORE | AFTER | INSTEAD OF ... ON Table [FOR EACH ROW]`.
* **Row-level (`FOR EACH ROW`):** Fires for each row affected by the statement. Uses the special records `:OLD` and `:NEW`.
* **Statement-level:** Fires once, regardless of the number of affected rows. Does not use `:OLD`/`:NEW`.
* **Use Cases:** Auditing (save history), complex validations that cannot be done with `CHECK` constraints, automatic data generation (e.g., fill IDs).
* **Warning:** Excessive use of triggers can create *Cascading Triggers* (one trigger fires another) that are difficult to maintain and debug.

### 11.7. Transactions (ACID)
A sequence of operations that must be executed as an atomic unit.
* **Atomicity:** All or nothing. If it fails midway, it undergoes *rollback* (undone).
* **Consistency:** The DB moves from one valid state to another valid state.
* **Isolation:** Concurrent transactions do not interfere with each other (as if they were sequential).
* **Durability:** After `COMMIT`, changes are permanent (written to disk/log).
* **Commands:** `COMMIT` (confirms), `ROLLBACK` (aborts and undoes).
* **Locks:** Can cause deadlocks or the Oracle error `ORA-00054: resource busy`.

### 11.8. Oracle 19c Architecture
* **Instance (Memory + Processes):**
  * **SGA (System Global Area):** Shared memory. Includes the *Buffer Cache* (data read from disk), *Shared Pool* (Library Cache for compiled queries, Data Dictionary Cache) and *Large Pool*.
  * **PGA (Program Global Area):** Private memory of each server process (includes the UGA for dedicated sessions).
  * **Background Processes:** E.g., `DBWn` (writes buffers to disk), `LGWR` (writes transaction log), `CKPT` (checkpoint), `SMON`/`PMON` (recovery/cleanup).
* **Database (Physical Files):** Datafiles (tables), Control Files (metadata), Redo Log Files (transactions).

---

## 12. Global Glossary (Ubiquitous Language PT ↔ EN)

| Business Term (PT) | Code Term (EN) | Description / Context |
| :--- | :--- | :--- |
| Utente / Cliente | `Patron` / `Customer` | User who requests a service. |
| Exemplar | `BookCopy` | Physical copy of a book (in the library context). |
| Empréstimo | `Loan` | Action of requesting a copy. |
| Atraso | `Overdue` | State of a loan that has passed its due date. |
| Fatura | `Invoice` | Commercial document generated after a sale. |
| Encomenda | `Order` | Request for goods/services. |
| Armazém | `Warehouse` | Storage location. |
| Stock | `Stock` / `Inventory` | Available quantity of a product. |
| Conta Bancária | `BankAccount` | Account where transactions occur. |
| Saldo | `Balance` | Current value of the account. |
| Movimento | `Movement` / `Transaction` | Money in or out. |
| Voo | `Flight` | Planned air trip. |
| Tripulação | `Crew` | Set of employees on a flight. |
| Composição Ferroviária | `Train` / `Freight` | Set of wagons and locomotives. |
| Vagão | `Wagon` | Cargo transport vehicle. |
| Estação | `Station` | Stopping point. |

---

## 13. Quick Decision Guides (When to use X vs Y)

### 13.1. Entity vs Value Object (DDD)
* **Question:** If I change the attributes of this object, does it remain the "same thing"?
  * **Yes:** It is an **Entity** (e.g., John changed address, but is still John). It has an ID.
  * **No:** It is a **Value Object** (e.g., a 10€ note exchanged for two 5€ notes has the same value). It has no ID, it is immutable.

### 13.2. Layer vs Hexagonal/Clean
* **Layer:** Suitable for simple CRUDs, small projects, junior teams or very short deadlines.
* **Hexagonal/Clean:** Essential when the domain is complex, isolated testability is critical, or when the infrastructure (DB, UI) may change frequently. Adds initial complexity (more interfaces), but facilitates long-term maintenance.

### 13.3. SQL (Relational) vs MongoDB (Document)
* **SQL (RDBMS):** Highly structured data, complex relationships, need for strict ACID transactions (e.g., finance, critical inventory). Rigid schema.
* **MongoDB (NoSQL):** Semi-structured data, rapid schema evolution, intensive reading of aggregates (e.g., product catalogs, user profiles, logs). Horizontal writing. Eventual consistency.

### 13.4. Embedding vs Referencing (MongoDB)
* **Embedding:** 1-to-few relationship, data is always read together, and the parent document does not grow indefinitely (16MB limit). E.g., User addresses.
* **Referencing:** 1-to-many or N-to-N relationship. Data changes independently or is shared. E.g., Comments on a post (can be thousands).

### 13.5. JWT vs Session (Server-side)
* **JWT (Stateless):** REST APIs, microservices, mobile apps. Scalable (does not store state on the server). Disadvantage: a token cannot be easily revoked before it expires.
* **Session (Stateful):** Traditional web applications (MPA), need for immediate revocation of access (forced logout). Requires shared storage (e.g., Redis) in distributed environments.

### 13.6. Normalization vs Denormalization
* **Normalize (up to 3NF/BCNF):** By default in OLTP (transactional) systems. Minimizes redundancy and anomalies.
* **Denormalize:** In OLAP (analytical/Data Warehouse) systems or to optimize extremely frequent reads (accepting the cost of maintaining consistent redundancy).

---

## 14. Testing and Quality Strategy

### 14.1. The Testing Pyramid
1. **Unit Tests (Base):** Fast, isolated. Test individual classes/methods (using *Mocks* for dependencies). Tools: JUnit, Mockito (Java), Jest, Vitest (Node).
2. **Integration Tests (Middle):** Test the interaction between modules or with the DB. E.g., Test a `Repository` talking to H2/Testcontainers. Tools: Spring Boot Test, Supertest (Node/Express).
3. **End-to-End / UI Tests (Top):** Slow, fragile. Test the complete application flow (UI -> API -> DB). Tools: Cypress, Playwright, Selenium.

### 14.2. Best Practices (TDD)
* **Red-Green-Refactor:** Write the failing test (Red), implement the minimum code to pass (Green), improve the code (Refactor).
* **F.I.R.S.T:** Tests must be *Fast*, *Independent*, *Repeatable*, *Self-validating* and *Timely*.
* **Test Doubles:** *Dummy* (passed but not used), *Stub* (returns fixed data), *Spy* (records calls), *Mock* (defines expectations), *Fake* (simplified implementation, e.g., in-memory DB).

---

## 15. Frontend Architecture and SPAs

### 15.1. Componentization and State
* **Components:** Building blocks of the UI (e.g., React, Vue, Angular). Divide into *Smart Components* (connected to state/API) and *Dumb Components* (only receive props and render UI).
* **State Management:** For local state, use `useState` (React). For global state (e.g., authenticated user, theme, shopping cart), use Context API, Redux, Zustand or Pinia.
* **Routing:** In SPAs, routing is managed on the client (e.g., React Router). The server must be configured to redirect all unknown routes to `index.html` (Fallback Routing).

### 15.2. Communication with the API (REST)
* Centralize HTTP calls in an `api.js` module or `services/` (Axios or native Fetch).
* Always handle loading, error and success states in the UI (e.g., show spinners, error toasts).
* Handle JWT expiration: intercept `401 Unauthorized` responses and redirect to login or attempt token refresh.

---

## 16. Security, DevOps and Observability

### 16.1. Security (OWASP Top 10)
* **Injection (SQL/NoSQL):** Always use *Prepared Statements* (Java/JPA) or ORMs (Mongoose) that parameterize queries.
* **Broken Access Control:** Validate permissions *on the server* (never just hide buttons on the frontend). Use `@PreAuthorize` (Java) or `requireRole` middlewares (Node).
* **Cryptographic Failures:** Passwords stored with bcrypt (cost 10+) or Argon2id. Sensitive data encrypted at rest.
* **Cross-Site Scripting (XSS):** Sanitize inputs. Modern frameworks (React) already escape HTML by default.
* **Cross-Site Request Forgery (CSRF):** If using session cookies, use CSRF tokens. (Less problematic with JWT in Authorization headers).

### 16.2. DevOps & CI/CD
* **Pipeline (GitHub Actions, GitLab CI):**
  1. *Lint & Format* (ESLint, Prettier, Checkstyle).
  2. *Build* (compilation).
  3. *Test* (unit and integration).
  4. *Security Scan* (npm audit, Snyk, OWASP Dependency-Check).
  5. *Deploy* (Staging/Production).
* **Conventional Commits:** `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`.

### 16.3. Observability
* **Logging:** Use structured logs (JSON) with levels (INFO, WARN, ERROR). Include *Correlation IDs* to trace requests between microservices.
* **Metrics:** Response time, error rate, CPU/RAM usage (Prometheus/Grafana).
* **Tracing:** Trace the path of a request across multiple services (OpenTelemetry, Jaeger).

---

## 17. Distributed Consistency Patterns (Sagas & Outbox)

In microservices architectures, guaranteeing ACID transactions between services is impossible. Patterns are used for eventual consistency.

### 17.1. Saga Pattern
* A business transaction is divided into a sequence of local transactions. If one fails, **compensating transactions** are executed to undo the previous ones.
* **Choreography:** Each service publishes events and reacts to events from others (decentralized). Good for simple flows.
* **Orchestration:** A central "Saga Orchestrator" tells each service what to do and handles failures. Good for complex flows.

### 17.2. Transactional Outbox Pattern
* Problem: How to guarantee that a change in the DB and the publication of an event (e.g., to Kafka) are atomic? (If you publish first and the DB fails, there is inconsistency; if you save to the DB and publication fails, the event is lost).
* Solution: In a single DB transaction, save the business change AND the event in an `Outbox` table. A separate process (Message Relay or CDC - Change Data Capture) reads the `Outbox` table and publishes the events to the broker, marking them as processed.

---

## 18. Documentation Templates: User Stories and Client Q&A
*(Based on excellence patterns for Requirements Engineering)*

### 18.1. Mandatory Structure of a User Story (Template)
A well-documented User Story is not just the card "As a... I want... so that...". It must include:
1. **Requirements Engineering:**
   * **Description:** The classic "As a `<role>`, I want to `<action>`, so that `<benefit>`".
   * **Client Specifications:** Direct quotes from the specification document and Product Owner clarifications (with references, e.g., *Clarification #01*).
   * **Acceptance Criteria (ACs):** Numbered list of conditions that prove the US is complete (e.g., *AC1: The system must validate X*, *AC2: The user must be notified*).
   * **Dependencies:** What must exist before (Preceding) and what depends on this (Succeeding).
   * **Inputs and Outputs (Data):** Input payloads (DTOs) with their types and constraints (e.g., `sku: string (unique, 2-30 chars)`).
2. **System Sequence Diagrams (SSD):** Sequence diagrams (Mermaid or UML) showing the normal flow, alternative paths (alt/else) and errors (401, 404, 409).
3. **Technical Notes:** Database constraints (e.g., `CHECK (is_sellable = TRUE OR is_pizza_component = TRUE)`), security (RBAC) and integrations.

### 18.2. Client Clarification Log (Client Q&A Log)
Communication with the client/PO is volatile and prone to forgetfulness. It must be centralized in a versioned document:
* **Format:**
  * **Clarification #X:** Short title.
  * **Question Origin:** Student / Group Y.
  * **Answer Origin:** Client / Product Owner / Professor.
  * **Question:** The exact text of the doubt (with context).
  * **Answer:** The exact PO answer.
  * **Notes and Inferences for the Project:** What this means for the architecture, the DB and the code (e.g., *"Confirmed: Stock cannot be negative. Apply constraint CHECK (stock >= 0)"*).

---

## 19. Architecture Decision Records (ADRs) - Structure and Methodology
*(Based on excellence patterns for architectural documentation)*

An ADR captures a significant architectural decision, its context, the alternatives considered and its consequences. The code says *how*, the ADR says *why*.

### 19.1. ADR Template
* **Title:** `ADR-00X: [Decision Name]`
* **Status:** Proposed / Accepted / Rejected / Superseded.
* **Context:** What is the problem? What are the forces at play (technical, business, time constraints)?
* **Decision:** What was the decision made and how will it be implemented?
* **Alternatives Considered:** For each alternative (including the chosen one): Description, Pros, Cons.
* **Consequences:**
  * **Positive:** What problems does it solve? What benefits does it bring?
  * **Negative / Trade-offs:** What problems does it create? What are we sacrificing?
* **Revision History:** What changed since the creation of this ADR?

### 19.2. Examples of Common ADRs (and what they should contain)
* **ADR-0001 (Architectural Style):** Choice between Layered/Clean vs. Hexagonal vs. Microservices. Justification of the Dependency Rule.
* **ADR-002 (Stack Choosing):** Choice of Language/Framework (e.g., Node.js + NestJS vs. Java Spring Boot). Justification of productivity vs. performance.
* **ADR-003 (Persistence):** Choice between RDBMS (PostgreSQL) and NoSQL (MongoDB). Justification based on strong consistency and referential integrity vs. schema flexibility.
* **ADR-004 (Auth):** Choice between Sessions vs. JWT. Justification of stateless scalability vs. immediate revocation.
* **ADR-005 (REST API):** Definition of API rules (plural URIs, HTTP verbs, status codes). Choice of OpenAPI/Swagger for documentation.
* **ADR-006 (Testing):** Testing strategy (Unit with Mocks vs. Integration with Supertest). Choice of Tools (Jest, Vitest).
* **ADR-007 (API Tooling):** Choice of HTTP testing tools (e.g., Bruno vs. Postman). Justification based on Git-native (text files) vs. Cloud-locked (Postman free tier restrictions).

---

## 20. Domain Model Rationale (Justification of Modeling Decisions)
*(How to document the defense of a Domain Model)*

The Domain Model must not be just a UML diagram (PlantUML/Mermaid). It must be accompanied by a document that explains *why* the boundaries were drawn that way. This document is vital to show the professor/evaluator that you did not just draw boxes, but applied tactical DDD.

### 20.1. What to include in the Rationale Document:
1. **Adopted Principles:** E.g., "Ubiquitous Language First", "High Cohesion and Low Coupling", "ACID within Aggregates, BASE between Aggregates".
2. **Evolutionary Decision Log:** Show that the model evolved.
   * *Initial Decision:* What was thought first (e.g., "We created a generic `SystemUser` entity").
   * *Clarification (PO/Professor):* What made you change (e.g., "The PO said it doesn't make sense to have a generic user because the actors are very distinct").
   * *Current Model and Justification:* What was done (e.g., "We removed `SystemUser` and created `Pilot`, `Manager`, `Customer` as separate aggregates").
3. **Justification of Boundaries (Aggregate Boundaries):**
   * Why is X an Aggregate Root and Y is not? (E.g., "`FlightPlan` is not an Aggregate because its identity does not exist outside `Flight`. It is a local entity subject to `CascadeType.ALL`").
   * Why are two concepts separate? (E.g., "`AirControlArea` and `Airport` are separate to avoid concurrency and table locks. The Airport references the Area by ID").
4. **Value Objects vs Entities:** Justify why `Email` was used as a Value Object instead of `String`, or why a `PlaneModel` is an entity and a `SeatConfiguration` is a Value Object.

---

## 21. Physical DB Mapping, ERDs and Optimized Views
*(From Logical to Physical Model with Performance and Integrity)*

### 21.1. From DDD to SQL (Mapping)
* **Keys:** Use UUIDs (e.g., `gen_random_uuid()`) for internal technical keys and/or *Business Codes* (e.g., `VARCHAR(30)`) for business identifiers that the client knows (e.g., `SKU`, `NIF`).
* **Value Objects:** Map simple VOs into columns (e.g., `Email` -> `email VARCHAR(255)`), or composite VOs into prefixed columns (e.g., `Money` -> `amount NUMERIC(10,2), currency VARCHAR(3)`).
* **Cross References:** NEVER use direct ORM joins between aggregates. Use foreign IDs (`customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT`).
* **Domain Constraints (VERY IMPORTANT):** SQL must protect the DDD invariants.
  * `CHECK (current_balance >= 0)` for non-negative stock.
  * `CHECK (is_sellable = TRUE OR is_pizza_component = TRUE)` to guarantee product type rules.
  * `ON DELETE RESTRICT` for referential integrity (prevent deleting categories in use).

### 21.2. Using Views for Performance (CQRS in the DB)
Instead of doing N+1 queries in the application (e.g., fetch products, then fetch their allergens, then fetch the price), create **SQL Views** for optimized reading.
* **Example:** A view `v_catalogue_products` that JOINs products, categories and uses `JSON_AGG` to group allergens in a single JSON field.
* **Example:** A view `v_predefined_pizza_details` that calculates the dynamic price of the pizza (sum of components for the size) and checks stock availability (`BOOL_AND(current_stock >= required_stock)`).

### 21.3. DB Diagrams in Mermaid (ERD)
Mermaid supports ER (Entity-Relationship) diagrams. Excellent for versioning the DB in Git.
* **Syntax:** `USERS ||--|{ USER_ROLE_ASSIGNMENTS : holds` (1 User has 1 or many Roles).
* **Data Types:** `VARCHAR`, `UUID`, `INT`, `NUMERIC`, `TIMESTAMPTZ`, `BOOLEAN`.
* **Constraint Matrix:** A markdown table explaining each Foreign Key and its DELETE action (CASCADE, SET NULL, RESTRICT) and why.

---

## 22. Continuous Integration (CI), Tooling and Team Troubleshooting

### 22.1. GitHub Actions (CI Workflow)
The CI pipeline is mandatory to ensure that code compiles and tests pass before merging.
* **YAML Structure:**
  * `on: [push, pull_request]` (triggers on pushes and PRs).
  * `runs-on: ubuntu-latest`.
  * `steps: actions/checkout@v4` (pulls the code).
  * `actions/setup-java` or `actions/setup-node` (configures the version and caches Maven/npm dependencies).
  * `mvn clean verify` or `npm ci && npm run build && npm test` (runs the tests).
* **Goal:** Detect errors early. If a dev submits a PR that breaks the tests, GitHub Actions blocks the merge.

### 22.2. API Testing Tools (Postman vs. Bruno)
* **Postman (Cloud):** Good for quick exploration, but limited in the free tier (max. 3 collaborators). Stores collections on Postman servers (cloud-locked).
* **Bruno (Git-Native):** Stores collections as text files (`.bru` and `.yml`) in the Git repository. No user limits. Allows JavaScript asserts and token extraction (`bru.setEnvVar`). The modern choice for agile teams.

### 22.3. Common Troubleshooting in Projects (What goes wrong and how to fix it)
* **CI Pipeline breaks (but passes locally):**
  * *Cause:* Environment differences (Node/Java version), outdated local caches, or missing commits (e.g., an interface was changed but not committed).
  * *Solution:* Run `npm ci` (cleans node_modules) or `mvn clean compile -U` locally before pushing. Ensure dependencies are in package.json/pom.xml.
* **JPA/ORM Mapping Errors (`UnknownEntityException`):**
  * *Cause:* A new `@Entity` class was created, but you forgot to register it in `persistence.xml` (Java) or the ORM module.
  * *Solution:* Check the ORM configuration. Hibernate/NestJS does not guess entities.
* **Git Conflicts with binary files (`target/`, `.class`):**
  * *Cause:* Compiled files were committed to the repository. When another dev pulls, there are impossible conflicts to resolve in binaries.
  * *Solution:* Use a strict `.gitignore` (ignore `target/`, `dist/`, `node_modules/`, `.idea/`, `.vscode/`). If they are already in history, use `git rm --cached` and rebase to clean the history.

---

# PART II — PRACTICAL COMPONENT COURSES
## (ASIST, IARTI, SGRAI)

> **Introductory note:** The following sections complement Part I. While Part I focuses on **how to structure and think about software** (process, requirements, architecture, code), this part focuses on **concrete technological components** and the operational practices that support them. The goal is to provide a solid conceptual basis to integrate these areas into any system, without presupposing a specific project.

**Part II Index**
23. ASIST — Framework and the Role of the Systems Administrator
24. Servers, Storage and File Systems
25. Virtualization and Containers
26. Storage Architectures (DAS / NAS / SAN / RAID)
27. Users, Groups and Permissions
28. Centralized Identity (AD / LDAP / NIS / NSS / PAM / Kerberos)
29. Network Services (DHCP, DNS, Routing, VLANs)
30. File and Printer Sharing (SMB/CIFS, NFS, Samba)
31. Firewalls, Access Control and Traffic Management (QoS)
32. Cryptography and Public Key Infrastructure (PKI)
33. Access Management (AAA, RADIUS, TACACS+, Diameter, NAC)
34. Business Continuity Management (BCM, HA, Backups)
35. Clustering, Failover and Load Balancing
36. Logging, Monitoring and Auditing
37. Scripting, Automation and DevOps
38. Software-Defined Infrastructure (SDN, SD-WAN, MPLS, NDN)
39. Windows–Linux Integration Tools
40. IARTI — Fundamentals of Artificial Intelligence
41. IARTI — Logic and Logic Programming (PROLOG)
42. IARTI — Automatic Problem Solving: Uninformed Search
43. IARTI — Informed Search Methods and Optimization
44. IARTI — Genetic Algorithms
45. IARTI — Artificial Neural Networks and Deep Learning
46. IARTI — Computer Vision
47. IARTI — Intelligent Robotics
48. IARTI — Natural Language, LLMs and Agents
49. IARTI — Opportunities, Risks and Ethics in AI
50. SGRAI — Fundamentals of 3D Computer Graphics on the Web
51. SGRAI — Three.js: Base Concepts, Geometries and Lines
52. SGRAI — Transformations, Hierarchy and Model Loading
53. SGRAI — Materials and Lighting
54. SGRAI — Shadows, Sky and Textures
55. SGRAI — UV Mapping, Sprites and Billboard
56. SGRAI — Graphical Interfaces (lil-gui) and 3D Picking

---

## 23. ASIST — Framework and the Role of the Systems Administrator

### 23.1. Scope and Positioning

**ASIST (Systems Administration)** studies the practices, technologies and responsibilities associated with the operation of IT infrastructures — servers, networks, storage, security and service continuity. It is a discipline of **implementation and operation**, complementary to software architecture (ARQSI) and requirements engineering (ESOFT/EAPLI).

The three major operational pillars:

1. **Availability** — the system must be operational according to what is agreed (SLA).
2. **Security** — confidentiality, integrity and authenticity of information and access.
3. **Recoverability** — ability to restore service and data after failure (BCM/DR).

These pillars articulate with the **CIA** triad (Confidentiality, Integrity, Availability) of information security (see §32.1).

### 23.2. The Systems Administrator

A system and its infrastructure require:

- Care in **normal operation**.
- **Intervention** when a problem occurs.
- **Recovery strategies** for data and service.

**Responsibilities of the Systems Administrator:**

- Plan, implement, verify and act on the infrastructure and systems.
- Train and coach the team.
- Define the **backup and recovery strategy** for data and applications.
- Guarantee the intended operation (selection of repair/replacement strategy for failed equipment).
- Solve application problems.
- Define **user management criteria**.
- Provide technical support to users.
- Plan and implement the **update strategy** for OSs and applications.
- Document all aspects of systems and infrastructure.
- Prepare **recovery plans**.
- Produce constraint reports.

**Principle of uniqueness:** regardless of the organization's size (and even when there are specialists per domain — networks, systems, security), there must be **one** Systems Administrator with a global vision, because any change in one item can affect the global strategy or the performance of other items.

Most of these tasks can be **automated**, but it is up to the administrator to define the automation and validate that it was executed successfully.

### 23.3. Data Center / CPD (Data Processing Center)

Concentrating infrastructure in a **Data Center** brings operational advantages:

- Single location where **environmental conditions** (temperature, humidity, dust) are guaranteed.
- Ease of adopting **alternative power sources** (UPS, generator).
- Raised floor/ceiling for **cabling** and distribution.
- Appropriate **racks**.
- Single location where **fire safety** is guaranteed.

**Typical costs of a CPD:**

- **Servers** (largest share) — typically amortized over ~3 years.
- **Network equipment** (amortization ~4 years).
- **Power distribution and cooling**.
- **Energy** (consumption growing with equipment and cooling).
- **Infrastructure** (amortization ~10 years).

**Economic pressure:** cost reduction through two avenues — energy and *not installing new equipment for each service*. Historically, each new service implied a new server ("don't touch what works"), generating low utilization. The modern response is **virtualization** (see §25).

---

## 24. Servers, Storage and File Systems

### 24.1. Server Operating Systems

Three dominant families:

- **Microsoft Windows Server** (since Windows NT Server 1993; current versions: 2016, 2019, 2022).
- **Open source Unix** — with emphasis on **Linux** (Debian/Ubuntu and RedHat/RHEL families) and **BSD** (NetBSD, FreeBSD, OpenBSD).
- **macOS Server** (currently merged with macOS desktop).

**Windows Server editions:** Essentials, Standard, Datacenter, Hyper-V. Installation options:
- **Server Core** — no GUI, command-line administration (equivalent to Linux in this respect).
- **Nano Server** — even lighter, exclusively remote administration.

**Linux distributions:** although there is a single Linux kernel, a collection of additional software is needed to obtain a functional system. Families are distinguished by **package management** and **organization of configuration files**:
- **Debian/Ubuntu:** `apt`, `/etc/network/interfaces`, `apt install`.
- **RedHat/Fedora/RHEL:** `dnf`/`yum`.

**LTS versions** (Long Term Support) are preferable on servers (stability and longevity). Ubuntu LTS: new versions every 2 years, 5-year support. RHEL is the commercial option with direct support.

### 24.2. Partitions and Partition Tables

A **disk** can be divided into **partitions** (independent contiguous zones). Each partition can be formatted with a distinct **file system**.

**Partition tables:**

| Type | Limit | Advantages | Disadvantages |
|---|---|---|---|
| **MBR** (Master Boot Record) | Max. 4 primary partitions (+1 extended with N logical) | Legacy compatibility | No partitions beyond 2 TB; no integrity check; no backup of the table |
| **GPT** (GUID Partition Table) | Up to 128 primary partitions | Integrity validation (CRC), alternative backup on disk, supports > 2 TB | Requires OS with GPT support (maintains a "protective MBR" for compatibility) |

**Identification:**

- **Linux:** `/dev/sda`, `/dev/sdb` (in order of detection); partitions `/dev/sdb5` (5th partition of the 2nd disk).
- **Windows:** `Disk 0`, `Disk 1`; partitions "Disk 0 partition 3"; volumes receive **letters** (`C:`, `D:`, ...).

### 24.3. File Systems

Minimum requirements for a server:

- **ACL (Access Control List)** — per-object permissions.
- **Journaling** — recording of write operations before applying them, avoiding full disk verification after failure.

**Main ones:**

| OS | Default FS | ACL | Journaling | Quotas |
|---|---|---|---|---|
| Linux | **EXT4** | POSIX + extended | Yes | Yes |
| Windows | **NTFS** | NTFS ACLs (more flexible) | Yes | Yes |

**Windows - basic vs dynamic disks:**

- **Basic:** only **simple volumes** (can expand if there is contiguous space).
- **Dynamic:** support **spanned** (aggregates space from multiple disks), **striped** (RAID 0), **mirrored** (RAID 1).

**Linux - mounting and `/etc/fstab`:**

The kernel mounts the **root file system** (via bootloader parameters, e.g., `root=/dev/sda1 init=/sbin/init`). The rest are mounted according to `/etc/fstab`:

```
device  mounting-point  type  options  dump  fscheckseq
UUID=...  /             ext4  defaults 0     1
LABEL=... /home         ext4  nodev,nosuid 0 2
```

- `device`: by path, `LABEL`, or `UUID` (via `blkid`).
- `options`: `ro`, `rw`, `nodev`, `nosuid`, `relatime`, etc.
- `dump`: `0`/`1` — include in backup via `dump`.
- `fscheckseq`: verification order (`0`=do not check; `1`=first; `2`=after).

**SWAP (Linux):**

- Complements RAM via **paging** (blocks) and **swapping** (entire processes).
- There can be multiple SWAP partitions (on separate disks).
- Rule of thumb: SWAP size ≈ RAM size. A giant SWAP doesn't make sense — insufficient RAM is the root of the problem.

### 24.4. Boot Process (Linux)

1. **BIOS/UEFI** → selects boot device.
2. Primary **bootloader** (MBR) → **GRUB** (or LILO on older systems).
3. **GRUB** loads the **kernel** and the **initrd** (initial RAM disk).
4. Kernel mounts **root filesystem** (`root=...` parameter).
5. Kernel executes `/sbin/init` (or `systemd` on modern distros).
6. `init`/`systemd` starts the remaining processes.

Support for **NFSROOT** (diskless machines) and **initramfs**.

### 24.5. Network Interface Configuration on Servers

Servers must have **static configuration** (not DHCP) — reduces external dependencies and guarantees availability even if the DHCP service fails.

**Required elements:**

- Static IP + mask + default gateway.
- DNS server addresses + local domain.

**Linux:** files per distro/version:
- Debian/Ubuntu 16.04: `/etc/network/interfaces`.
- Ubuntu 18.04+: Netplan (`/etc/netplan/50-cloud-init.yaml`).

**Commands:** `ip addr show`, `ip address add`, `ip link set ... up`, `ip route add`, `ip -6 route`.

**Windows:** GUI (Control Panel) for IPv4/IPv6; `route print`/`route add` for routing tables.

### 24.6. Multi-IP and VLANs

An interface can have multiple IPs (on different networks or on the same network, creating **virtual servers**).

**VLANs (IEEE 802.1q):** A single physical interface carries traffic from several physical networks through **VLANID tags**.

- **Linux:** `vconfig add ens160 300` → creates `ens160.300` (tag 300); configure IP with `ip addr add`.
- **Windows:** **NIC Teaming** to group several physical interfaces into a logical interface (load-balancing + failover), and to create VLANs over that interface.

Difference between **multiple IPs without VLAN** vs **with VLAN**: without VLAN the distinction is made at layer 3 (IP), which breaks generic multicast/broadcast and prevents correct segmentation by switches; with VLAN the distinction is at layer 2, and each VLAN is a fully separate logical network.

---

## 25. Virtualization and Containers

### 25.1. Server Virtualization

A **host** (physical server, typically more powerful) runs a **virtualization application** that creates multiple **guests** (virtual servers) independent of each other.

- Each guest has its **own operating system**.
- Resources (disk, memory, network) are dynamically allocated.
- The virtualization application **limits** each guest's maximum consumption.

**Advantages:**

- Increases host physical utilization rate.
- Reduces the number of physical equipment.
- Simplifies administration (snapshot, clone, migration between hosts).
- Reduces administration and energy costs.

**Disadvantages:**

- Host failure brings down all guests (mitigable via **host redundancy**).
- Host undersizing degrades performance.
- Each guest requires its **own OS license**.

### 25.2. Hyper-V (Windows Server)

Microsoft's virtualization platform. Requires the **Hyper-V** role.

**Virtual switch types:**

| Type | Scope | Functionality |
|---|---|---|
| **External** | Communication with the outside via the host's physical interface | Bridge or NAT; supports VLANs |
| **Internal** | Communication between guests and the host itself | No access to the outside |
| **Private** | Communication only between guests of the same private switch | Fully isolated |

**Integration Services:** packages that improve guest↔host integration:

- Shutdown via Hyper-V.
- Clock synchronization.
- Heartbeat / watchdog.
- Backup (volume snapshot) without stopping the VM.
- Guest services (copy objects directly to the guest's file system).

### 25.3. Containers

A lighter alternative to full virtualization.

- Containers **share the kernel** and libraries with the host.
- No OS per guest is needed.
- Higher guest density (fewer physical resources).
- Ideal when **the intended OS is the same** in all guests (e.g., application development).

**Limitations:**

- **Does not support** guests with an OS different from the host.
- **Security:** malware on the host or on a guest can spread (isolation is less than that of VMs).
- Host failure still brings down the guests.

**Use cases:** microservices, development/testing environments, CI/CD, reproducible deploy.

### 25.4. Virtualization vs Containers Decision Matrix

| Criterion | Virtualization (VMs) | Containers |
|---|---|---|
| Guest OS | Independent of host | Shared with host |
| Isolation | Strong | Moderate |
| Density | Low | High |
| Boot time | Minutes | Seconds |
| Portability | Lower | High (image) |
| Typical use cases | Multi-OS, legacy environments | Microservices, CI/CD |

---

## 26. Storage Architectures (DAS / NAS / SAN / RAID)

### 26.1. DAS (Direct Attached Storage)

Storage connected **directly** to a server (block device).

- **Pros:** simple, low latency.
- **Cons:** exclusive use by the server; adding/removing requires physical intervention; backup on the server itself consumes resources; no economies of scale.

### 26.2. NAS (Network Attached Storage)

Storage **shared via network**, presented to the OS as a *file system* (not as a block).

- **Pros:** economical; quick to install; supports internal RAID; per-file/folder permissions; high utilization.
- **Cons:** occupies the network (IP); latency higher than DAS; performance dependent on the network.

**Protocols:** SMB/CIFS (Windows), NFS (Unix) — see §30.

### 26.3. SAN (Storage Area Network)

**Dedicated** storage network, separate from the LAN, with high performance and reliability.

- Presents **LUNs** (Logical Units) to servers as if they were local disks.
- **Management and maintenance** is done on the SAN, without stopping the servers.
- Allows **snapshots**, **clones** and **synchronous/asynchronous replication** between SANs (essential for DR).

**Technologies:**

| Protocol | Base | Notes |
|---|---|---|
| **FC (Fibre Channel)** | Dedicated fiber | High performance, specific hardware (HBA, FC switches) |
| **FCoE (FC over Ethernet)** | Ethernet | Convergence (CNA — Converged Network Adapter) |
| **iSCSI** | TCP/IP | Native in modern OSs; initiator/target by software; economical |
| **FCIP** | TCP/IP | Interconnects remote SANs at the SAN level |
| **iFCP** | TCP/IP | Interconnects remote SANs at the device level |
| **FC-NVMe** | PCIe over FC | Support for NVMe SSDs |

**Identification in iSCSI:** **IQN (iSCSI Qualified Name)** — e.g., `iqn.2000-08.pt.ipp.isep.dei:server1-lun0`. Authentication via **CHAP** (username/password).

**Initiator (Linux):**
- Discovery: `iscsiadm -m discovery -p <server> -t st`
- Login: `iscsiadm -m node -T <IQN> -p <server> -l`
- Upon login, a new `/dev/sdX` appears (treated as a local disk).

**Target (Linux):** `tgt` package, configuration in `/etc/tgt/targets.conf` and files in `/etc/tgt/conf.d/`.

**Target (Windows):** *File Server* and *iSCSI Target Server* roles; virtual disks *Fixed Size*, *Dynamically Expanding*, *Differencing*.

### 26.4. RAID (Redundant Array of Independent Disks)

Combines several physical disks to obtain **redundancy** and/or **performance**.

| Level | Type | Minimum disks | Usable space | Fault tolerance |
|---|---|---|---|---|
| **RAID 0** | Striping | 2 | 100% | **None** |
| **RAID 1** | Mirroring | 2 | 50% | 1 disk |
| **RAID 5** | Striping + distributed parity | 3 | (N−1)/N | 1 disk |
| **RAID 6** | Striping + double parity | 4 | (N−2)/N | 2 disks |
| **RAID 10** | Mirror + Stripe | 4 | 50% | 1 per mirror |

**Sizing formulas (example: 4 disks of 120 GB):**

- RAID 0: 4×120 = 480 GB, no redundancy.
- RAID 1: 120 GB (with 2 disks); with 4 disks in RAID 10: 240 GB.
- RAID 5: 120×(4−1) = 360 GB.
- RAID 10: (120+120) = 240 GB.

**Software vs Hardware:**

- **Software RAID:** supported by the OS (`mdadm` on Linux, Dynamic Disks on Windows).
- **Hardware RAID:** dedicated controller (more performance and transparency).

**Advanced levels (hardware):** RAID 2 (bit-level), 3 (bit-level + dedicated parity), 4 (block-level + dedicated parity), 50 (RAID 5 over RAID 0), 60 (RAID 6 over RAID 0).

---

## 27. Users, Groups and Permissions

### 27.1. User and Group Accounts

- **Linux:** UID (user) and GID (group). Database:
  - `/etc/passwd` — `login:hash:UID:GID:description:home:shell`.
  - `/etc/shadow` — password hashes (protected).
  - `/etc/group` — groups and secondary members.
- **Windows:** SID (*Security Identifier*). Local accounts in **SAM**; domain accounts in **Active Directory**.

**Typical rules:**

- **Linux:** names ≤ 31 characters, lowercase, no spaces; first character lowercase or `_`. A user belongs to **1 primary group** + N secondary groups. **Only users** are members of groups.
- **Windows:** up to 64 characters, case-insensitive; spaces allowed (discouraged). **Groups can be members of groups** (nesting).

**Linux commands:** `useradd`, `usermod`, `userdel`, `groupadd`, `groupmod`, `groupdel`, `chfn`, `chsh`, `passwd`.

### 27.2. Implicit Groups

- **Linux:** group `others` (all valid users).
- **Windows:**
  - `Everyone` — everyone, including `Guest` and system accounts.
  - `Authenticated Users` — authenticated by user/password.

### 27.3. POSIX Model (Linux Base)

Each object has **owner**, **group** and **others** (9 bits `rwx`) + **3 special bits**:

| Bit | Effect |
|---|---|
| **setuid** | Process runs with the UID of the executable's owner (e.g., `passwd`, `sudo`, `ping`). |
| **setgid** | Process runs with the group's GID; in folders, new files inherit the folder's group. |
| **sticky** | In shared folders, only the object's owner can delete/rename it (e.g., `/tmp`). |

Octal representation: `owner` / `group` / `others` (e.g., `644 = rw-r--r--`; `755 = rwxr-xr-x`).

**Note:** removing/renaming files requires **write permission on the folder**, not on the file. Without `x` on the folder, objects become inaccessible regardless of permissions.

**UMASK:** mask of denied permissions applied to new objects. Common values: `0022` (removes `w` from group/others), `0077` (total privacy).

### 27.4. Extended ACLs

**Linux:** `getfacl` / `setfacl`. In addition to owner/group/others, permissions can be assigned to additional users and groups. They support *Default ACL* (inheritance in folders) and *mask* (maximum effective limit).

**Windows (NTFS ACLs):** list of ACEs with detailed permissions. **Basic** permissions: Full Control, Modify, Read & Execute, List Folder Contents, Read, Write. Automatic **inheritance** from parent folders; precedence:

```
Explicit Deny > Explicit Allow > Inherited Deny > Inherited Allow
```

**DACL** (Discretionary ACL) controls access; **SACL** (System ACL) records auditing.

### 27.5. Home Directories, Profiles and Quotas

**Home directory:** personal folder (account attribute). On a network, mounted via NFS (Linux) or Windows share (domain).

**Windows User Profiles:**

- **Local:** user folder; configuration + `NTuser.dat`.
- **Roaming:** folder on a network share (`\\SERVER\PROFILES\{user}`); synchronizes at login/logout.
- **Mandatory:** file `NTuser.man` (read-only); always resets the profile to the same.
- **Super-mandatory:** `.man` folder; blocks login if the share is unavailable.

**Disk quotas:**

- **Linux:** per partition and per user/group. Supports limits on **blocks** (space) and **inodes** (number of objects). Two limits: **soft** (warning) and **hard** (block), with *grace period*. Activation: `/etc/fstab` with `usrquota`/`grpquota`, `quotacheck`, `quotaon`. Commands: `setquota`, `edquota`, `quota`, `repquota`.
- **Windows:**
  - **Disk Quotas:** per volume (user-level); does not support group quotas.
  - **Directory Quotas:** per folder, but **aggregated** (not per user); useful only for occupancy alerts.

### 27.6. Symbolic Links

Objects that point to others (files or folders). **Transparent** to users and applications.

- **Windows:** `mklink [ /D ] SYMLINK TARGET`. Requires the *Create Symbolic Links* right (by default, only Administrators). File Explorer treats them as shortcuts (≠ shortcuts, which are `.lnk` files).
- **Linux:** `ln -s TARGET [SYMLINK]`. Link permissions are illusory; the target object's permissions count. If TARGET disappears, the link becomes *broken*.

### 27.7. Login Scripts

- **Linux:** the login **shell** executes startup files in sequence:
  - `bash`: `/etc/profile` → `~/.bash_profile` → `~/.bash_login` → `~/.profile`.
  - `csh/tcsh`: `/etc/csh.cshrc` → `/etc/csh.login` → `~/.cshrc` → `~/.login`.
- **Windows:** the account's **Logon Script** attribute; in a domain, it must reside on the `NETLOGON` share (replicated between DCs).

---

## 28. Centralized Identity (AD / LDAP / NIS / NSS / PAM / Kerberos)

### 28.1. Motivation

Maintaining **local per-server** user databases is unfeasible in multi-server environments. The solution is a **central account database** accessible over the network:

- **One credential** for all resources.
- **Centralized authentication** (the user authenticates once and gains access to services).
- **Single Sign-On (SSO):** after the first login, transparent access to all resources (Windows domain model).

### 28.2. Lightweight Directory Access Protocol (LDAP)

Protocol (RFC 4511) for expedited access to information services (queries), optimized for reading.

**Model:**

- **DIT (Directory Information Tree):** tree structure.
- **Objects:** instances of classes; contain attributes.
- **Classes** (defined in schema — RFC 4512):
  - **ABSTRACT** — top class, not instantiable.
  - **STRUCTURAL** — instantiable; each object belongs to **exactly one**.
  - **AUXILIARY** — adds attributes to objects of a structural class; there can be several.
- **Inheritance** between classes: subclass inherits attributes from the superclass.

**Names:**

- **DN (Distinguished Name):** unique and absolute identifier in the DIT.
- **RDN (Relative DN):** unique identifier within the branch (can be repeated in another branch).
- **Root DN:** DN of the root, defined by the administrator; conventionally corresponds to the inverted DNS in `dc`:
  - DNS `dei.isep.ipp.pt` → root-DN `dc=dei,dc=isep,dc=ipp,dc=pt`.

**Operations:**
- Commands: `ldapadd`, `ldapdelete`, `ldapmodify`.
- File format: **LDIF** (LDAP Data Interchange Format).

**LDAP servers:**
- **OpenLDAP** (Linux) — configuration in `slapd.conf` or in the DIT `cn=config`.
- **Microsoft Active Directory** — LDAP implementation optimized for Windows domains.

### 28.3. Active Directory (AD)

Microsoft's central directory service, based on LDAP and DNS.

**Logical structure:**

- **Domain** — DNS name; root of the DIT.
- **Domain Tree** — set of domains with contiguous DNS (e.g., `company.pt` + `sul.company.pt`).
- **Forest** — set of trees. **Security boundary**; bidirectional transitive trust between all domains of the forest.
- **Site** — **physical** concept (subnets); optimizes replication between DCs.
- **Organizational Unit (OU)** — logical division for administrative delegation and GPOs.

**User identification:**

- **Down-level logon:** `DOMAIN\user`.
- **UPN (User Principal Name):** `user@domain.dns`.

**Groups:**

- **Types:** *Security* (permissions in ACLs) vs *Distribution* (distribution lists, does not assign permissions).
- **Scope:**
  - **Local** — only on the machine; not in AD.
  - **Domain Local** — in the domain; can include users, global, universal from the forest.
  - **Global** — members of the own domain.
  - **Universal** — members of any domain of the forest.
- **Possible conversions:** Global→Universal, Domain Local→Universal; Universal→Global/Domain Local.

**Domain Controllers (DCs):**

- Each AD domain requires ≥1 DC; recommended ≥2 (fault tolerance).
- **Multimaster replication** between DCs.
- **RODC** (Read-Only DC) — for remote locations with low security.
- **Special roles** (Single-Master Operations):
  - Forest-wide: **Schema Master**, **Domain Naming Master**.
  - Domain-wide: **PDC Emulator**, **Infrastructure Master**, **RID Master**.
- **Global Catalog** — replica of the most relevant attributes of all domains of the forest.

**GPO (Group Policy Objects):**

- Set of user and computer settings (registry, firewall settings, permissions, startup scripts, etc.).
- Associated with **Site**, **Domain** or **OU**.
- **Application order:** Local Policy → Site GPOs → Domain GPOs → OU GPOs (from the top of the tree down to the leaf).
- Overlap: each GPO overrides the previous ones for the elements it defines.
- **Applied to User/Computer**, not to Group.

**Trusts:**

| Type | Scope | Transitivity |
|---|---|---|
| **Parent-child** | Within the same tree | Bidirectional, transitive (implicit) |
| **Tree-root** | Between trees of the same forest | Bidirectional, transitive (implicit) |
| **External** | Between domains of different forests | One-way or two-way, **non-transitive** |
| **Forest** | Between forests | One-way or two-way, **transitive** |
| **Realm** | AD ↔ Kerberos realm (Linux/Unix) | One/two-way, trans/non-transitive |
| **Shortcut** | Within the forest, between trees | One/two-way, transitive (login optimization) |

### 28.4. NIS / NSS / PAM (Unix)

**NIS (Network Information Service)** — predecessor of LDAP in Unix environments (also "Yellow Pages"). Central server + clients query it.

**NSS (Name Service Switch):** modular system that integrates multiple repositories in Linux. Configuration in `/etc/nsswitch.conf`:

```
passwd: files ldap winbind nis
group:  files ldap winbind nis
hosts:  files nis dns winbind
```

Query order: the first repository that returns a result ends the search.

Typical modules: `libnss_files` (local), `libnss_ldap`, `libnss_nis`, `libnss_winbind`, `libnss_dns`, `libnss_compat`.

**PAM (Pluggable Authentication Module):** modular library used by applications/services for authentication. Management in 4 groups:

- `account` — validations before/after authentication.
- `auth` — authentication itself.
- `password` — password change.
- `session` — session environment setup.

Configuration in `/etc/pam.d/<service>`:

```
<type>  <action>  <module>  <parameters>
```

Actions:
- `required` — failure does not stop the chain, but fails the result.
- `requisite` — failure stops immediately.
- `sufficient` — success (without previous failures) ends with success.
- `optional` — does not determine success/failure.

Each module can return several codes; actions can be mapped by code (`[success=ok default=bad]`, etc.).

### 28.5. Kerberos

Ticket-based authentication protocol (RFC 4120). Authentication base of Active Directory.

**Concepts:**

- **Realm** — Kerberos administrative domain.
- **KDC (Key Distribution Center)** — central server, with:
  - **AS (Authentication Server)** — authenticates the principal.
  - **TGS (Ticket Granting Service)** — issues tickets for resources.
- **Principal** — any entity (user, service, host): `name@REALM`, `service/host@REALM`.
- **TGT (Ticket Granting Ticket)** — proof of authentication at the KDC; has a lifetime and requires clock synchronization (typically < 5 min skew).

**Summary flow:**

1. Principal requests authentication from the KDC.
2. AS validates credentials; returns TGT + session key (encrypted with password hash).
3. Principal requests access to a resource, presenting the TGT to the TGS.
4. TGS issues a **Service Ticket** (encrypted with the service's key).
5. Principal presents the Service Ticket to the resource.
6. Resource validates (with the KDC, if needed) and opens a session.

**Trusts between realms:** defined by the sharing of an *inter-realm key*; transitive if there is a hierarchy.

**Limitations:** KDC is a **SPOF**; keys depend on passwords (weak password → weak key); it does not have its own fault-tolerance mechanisms (it is necessary to replicate KDCs and configure failover).

---

## 29. Network Services (DHCP, DNS, Routing, VLANs)

### 29.1. Routing

To communicate with remote networks, a **default gateway** is required (or several routes).

- **Linux:** `ip route add`/`ip route show`; IPv4 and IPv6 independent.
- **Windows:** `route add`/`route print`; changes persisted by the OS.

### 29.2. DHCP (Dynamic Host Configuration Protocol)

Dynamically assigns network configuration (IP, mask, gateway, DNS, domain).

**IPv4 flow:** `Discover` (broadcast) → `Offer` → `Request` → `ACK`.

**DHCPv6 flow:** similar, but multicast link-local (`ff02::1:2`); IPv6 configuration depends on **NDP (Neighbor Discovery Protocol)** — `Router Solicitation`/`Router Advertisement` messages.

**M and O bits in Router Advertisement:**
- **M=1**: client uses DHCPv6 for the address.
- **M=0**: client uses **SLAAC** (Stateless Address Autoconfiguration).
- **O=1** (with M=0): DHCPv6 only for additional parameters.

**Servers:**
- **Windows:** *DHCP Server* role; *Scopes* per network; supports DHCPv4 and DHCPv6.
- **Linux:** ISC DHCP Server (`/etc/dhcpd.conf` — `subnet`, `range`, `option` blocks).

**High availability:** two DHCP servers on the same network (broadcast domain), each with a **distinct pool**. Microsoft recommends 80/20 split (primary/secondary).

**DHCP Relay:** allows a client to contact a DHCP server on another network (via an intermediary agent).

### 29.3. DNS (Domain Name System)

Resolves names into IP addresses.

**Hierarchical structure** from the top `.`; each domain has a **master** (authoritative source) and ≥1 **slave**.

**Zone types:**

- **Forward:** name → IP; records `A` (IPv4), `AAAA` (IPv6), `CNAME` (alias), `MX` (mail), `TXT`, `NS`, `SOA`.
- **Reverse:** IP → name; subdomain `.in-addr.arpa` (IPv4) or `.ip6.arpa` (IPv6); `PTR` records.

**SOA record:** first record of the zone; includes:
- **master-name**, admin email (`.` instead of `@`).
- **serial** (`yyyymmddss`) — increments with each change.
- **refresh**, **retry**, **expiry** — slave↔master synchronization parameters.
- **nx** — TTL for `NXDOMAIN` responses.

**Zone transfer:** slave compares the serial with the master's; if different, requests **AXFR** (full) or **IXFR** (incremental).

**BIND (Linux):** configuration in `named.conf`; `zone` with `type master|slave`, `file`, `masters`, `allow-query`, `allow-transfer`. **Forwarders** for delegation.

**Windows Server:** *DNS Server* role; when a server is promoted to DC, automatic installation of the DNS role is recommended; the base is replicated via AD DS between DCs.

**Round-robin DNS:** multiple `A`/`AAAA` records with the same name, served rotatively — a simple form of *load balancing* and *failover* (see §35.3).

---

## 30. File and Printer Sharing (SMB/CIFS, NFS, Samba)

### 30.1. SMB/CIFS (Windows)

File/printer sharing protocol.

- **Dialect negotiation:** client and server agree on the version supported by both (CIFS = NT LM 0.12; recent versions SMB2/SMB3).
- **Session-oriented access:** user authentication → *share list* per user.
- **UNC (Universal Naming Convention):** `\\SERVER\SHARE`.
- **Share permissions:** Full Control / Change / Read (do not override NTFS).
- **Common practice:** give Full Control to the `Everyone` group on the share and control via **NTFS ACLs** (actual decision).
- **Home folders / Roaming profiles:** shares `\\SERVER\HOMES\{user}` and `\\SERVER\PROFILES\{user}` in the domain.

### 30.2. NFS (Unix/Linux)

Unix *file system* sharing protocol.

- **Export:** folder exported by the server (`/etc/exports`); **mount:** client mounts it (`mount -t nfs server:/folder /mnt`).
- **NFSv2/v3:** **IP-based** authentication + *reserved port* (<1024); no user authentication.
  - **root squash:** UID 0 from the client has no root privileges on the server.
  - **Security requirements:** trust the client's admin, the network (vulnerable to IP spoofing) and name resolution (use IPs, not DNS names).
- **NFSv4:** supports user authentication.
- **Home directories in a pool:** centralize UIDs/GIDs via LDAP/NIS; export `/users/home` with `rw` to all servers.

### 30.3. Samba (Windows–Linux integration)

SMB/CIFS implementation on Linux. Usage scenarios:

| Mode | Authentication | Notes |
|---|---|---|
| **Standalone Server** | Local accounts (Linux + Samba shadow) | No domain |
| **PDC** (NT-compat) | Local accounts + shadow | Supports Single Sign-On, home dirs, roaming profiles, logon scripts |
| **Domain Member** | AD (via Winbind) | Native AD integration |
| **AD DC** | Internal LDAP + DNS + Samba Kerberos | Complete AD domain; automatic replication between DCs |

**SID ↔ UID/GID:** Samba maintains a mapping between **Windows SID** and **Linux UID/GID** (via **Winbind** in Domain Member mode).

**Passwords:** NT-hash + IM-hash (compat); synchronized with the Linux password.

**Files and ACLs:**
- POSIX base ACLs + extensions (stored as Linux extended ACLs).
- When running as an AD DC, share ACLs are **native Windows ACLs** — **do not store them in Linux extended permissions** → it is recommended that a Samba AD DC does not accumulate the *file server* role.

**Printers:** fully supported (CUPS/LPRng); supports automatic driver installation on Windows clients; virtual PDF printer option.

**Kerberos + NTP:** AD requires Kerberos 5 (KDC on the DC). Messages with *timestamp* (tolerance ≤ 300 s) → **NTP synchronization** mandatory.

---

## 31. Firewalls, Access Control and Traffic Management (QoS)

### 31.1. Network Defense

**Perimeter vs. Defense in Depth:**

- **Perimeter** — defense at the internal/external contact point. Insufficient with wireless, social engineering, *insider threats*.
- **Defense in depth** — multiple layers of protection; failure of one does not compromise the following.

**Typical zones:**

- **Datacenter / DMZ** — servers exposed externally.
- **Internal network** — exclusively internal servers, workstations.
- **External networks** — Internet and access devices.

**DMZ (Demilitarized Zone):** isolated subnet for publicly accessible servers. Topologies:
- **Two-legged** (1 firewall): protected internal network, exposed DMZ.
- **Two firewall two-legged**: DMZ protected by a dedicated firewall.
- **Three-legged** (1 firewall, 3 interfaces): a single firewall protects two networks.

**Segmentation with VLANs:** *not* a security mechanism (it is logical, not physical). It must be treated as a shared transmission network from a security standpoint.

### 31.2. Firewall Types

| Type | Layer | Description |
|---|---|---|
| **Packet filter** (stateless) | L3 (IP) | Static rules on the IP header. |
| **Stateful packet inspection** | L3–L4 | Dynamic rules based on recent connections. |
| **Application-level / Proxy / Bastion host** | L7 | Relay per traffic type (TELNET, FTP, SMTP, HTTP). |
| **NGFW** (Next Generation) | L3–L7 | Packet filter + stateful + IPS + sandbox + application control. |

**Firewall limitations:**
- They do not protect against attacks **encapsulated in allowed traffic**.
- They do not protect against **internal** attacks.
- They do not protect against **downloaded malware**.
- They are frequently configured "permissive" on the internal output.
- If an internal user is compromised, malicious code can inhibit the firewall.

### 31.3. Operating System Firewalls

**Windows Firewall with Advanced Security:**

- **Inbound** and **Outbound** rules.
- Actions: **Allow**, **Block**, **Allow if secure**.
- Inbound: traffic only passes if it matches an Allow and does not match a Block (no match = **blocked**).
- Outbound: traffic is only blocked if it matches a Block (no match = **allowed**).
- Criteria: **programs/services**, **protocols/ports**, **scope (IPs)**, **local principals** (local users), **remote users**, **remote computers**, **profile** (Domain/Private/Public).

**iptables (Linux Netfilter):**

- Tables: **filter** (default), **nat**, **mangle**, **raw**, **security**.
- **Built-in** chains per table:
  - filter: INPUT, FORWARD, OUTPUT.
  - nat: PREROUTING, INPUT, OUTPUT, POSTROUTING.
- Common **targets**: `ACCEPT`, `DROP`, `RETURN`, `SNAT`, `DNAT`, `LOG`, `-g <chain>` (jumps to custom chain).
- **Criteria**: `-i` (input interface), `-o` (output), `-p` (protocol), `-s`/`-d` (IPs), `--sport`/`--dport` (ports), `-m state --state` (NEW, ESTABLISHED, RELATED).
- **Chain management:** `-N` (new), `-X` (delete), `-F` (flush), `-P` (policy), `-A` (append), `-I` (insert), `-R` (replace), `-D` (delete), `-L` (list).
- **Routing:** `net.ipv4.ip_forward=1` (and `net.ipv6.conf.all.forwarding=1`) in `/etc/sysctl.conf` to enable forwarding.

### 31.4. DoS and DDoS

- **DoS:** attack from a single system (often with *zombies*).
- **DDoS:** concerted by multiple systems.

Classic example: **SYN flood** (floods the server's *SYN queue* with SYN packets without completing the *handshake*).

Mitigation: *stateful inspection*, rate limiting, *SYN cookies*, upstream scrubbing.

### 31.5. Quality of Service (QoS)

Networks operate by default in **best-effort** (FIFO). Traffic pressure generates delays and losses. QoS allows **prioritization**.

**Delay types:**

- **Processing:** constant.
- **Waiting:** queue; ≈ (average packet × arrival rate) / transmission speed.
- **Transmission:** packet size / speed.
- **Propagation:** distance / propagation speed.

**Soft QoS (shared):**

| Algorithm | Description |
|---|---|
| **PQ (Priority Queuing)** | Strict priorities; risk of starvation of low classes. |
| **CQ (Custom Queuing)** | Round-robin with byte limit per queue. |
| **FQ (Fair Queuing)** | Dynamic round-robin (one queue per flow). |
| **WFQ (Weighted Fair Queuing)** | FQ with weights; proportional bandwidth. |

**Hard QoS (reserved):**

- Static bandwidth reservation per class.
- Can waste capacity when the class has no traffic.
- Complemented by:
  - **Traffic Policing** — discards traffic that exceeds.
  - **Traffic Shaping** — retains and retransmits when the channel is free (token bucket, leaky bucket).

**DiffServ (Differentiated Services):**

- **DSCP** (6 bits) — service class (includes the 3 legacy IP Precedence bits).
- **ECN** (2 bits) — explicit congestion notification.

**IntServ (Integrated Services):**

- Flow-oriented and multicast; focus on **reservations** and admission.
- **RSVP** protocol (Resource Reservation Protocol): reservation per receiver; lifetime ~30 s.

**RED / WRED:**

- **RED** (Random Early Detection): probabilistically discards when the queue exceeds `Min_th` (probability growing up to `Max_th`, from which all are discarded). Avoids *tail-drop*.
- **WRED**: RED with priorities per class.

**Header compression:**

- **CTCP** (RFC 1144) — IPv4+TCP.
- **IPHC** (RFC 2507) — IPv4/IPv6, UDP, TCP, RTP.
- **CRTP** (RFC 2508) — IPv4/IPv6, UDP, RTP.
- **ROHC** (RFC 3095) — IPv4/IPv6, ESP.

**Overhead / Efficiency:**

```
overhead = (Total transmitted information − Useful information) / Total transmitted information
efficiency = Useful information / Total transmitted information
```

**LFI (Link Fragmentation and Interleaving):** fragments large packets to reduce delay of priority packets.

**TCP congestion control:**

- **cwnd** (congestion window), **rwnd** (receiver window); effective window = min(cwnd, rwnd).
- **Slow start** (cwnd grows exponentially up to `ssthresh`) → **Congestion avoidance** (linear growth).
- **Fast Retransmit / Fast Recovery:** after 3 duplicate ACKs, retransmits without waiting for RTO; `ssthresh` drops to 50% of `cwnd`.
- **RTO** based on RTT (RTO ≈ 3×RTT after initial measurements).

---

## 32. Cryptography and Public Key Infrastructure (PKI)

### 32.1. CIA Triad and Properties

- **Confidentiality (C):** secrecy at each node; prevent leaks.
- **Integrity (I):** accuracy; detection of alterations.
- **Availability (A):** SLA, predictable performance.

Cryptographic tools support **C** and **I**; **A** depends on distinct mechanisms (redundancy, SPOF mitigation).

**Additional properties:**
- **Authenticity** — prove that the communication is with whom you think.
- **Non-repudiation** — impossibility of denying authorship (e.g., digital signature).

### 32.2. Symmetric vs. Asymmetric

**Symmetric cryptography (shared key):**
- Same key encrypts and decrypts (`Ke = Kd`).
- Fast; suitable for large volumes.
- Problem: secure key distribution; for N entities there are C(N, 2) keys.
- Distribution methods: manual; mutual generation; secure channel; **KDC**.

**Asymmetric cryptography (public key):**
- `Ke ≠ Kd`. Public key can be disclosed.
- **Slow** — not suitable for large volumes.
- Used to **negotiate a symmetric key** or to sign (see §32.4).
- Authenticity depends on ensuring that the **public key** is authentic.

### 32.3. Historical Ciphers and Block Modes

**Substitution** (Caesar): each letter mapped. Insecure (frequencies).

**Transposition (permutation):** reorders characters. Requires sharing the key (order).

**Vigenère:** polyalphabetic substitution with repeated key. Solves the weakness of simple substitution (same characters → different ciphers).

**Block cipher:** text divided into blocks, encrypted with the same key.

- **Padding** vs **truncating the key** in the last block (both valid).
- **ECB** (Electronic Code Book): equal block → equal cipher. Vulnerable to frequency analysis.
- **CBC** (Cipher Block Chaining): current block combines with the previous cipher (XOR), avoiding repetitions.
- **CTR** (Counter): counter + key → block key; allows parallelization.

**Stream cipher:** parts encrypted with different keys (sometimes periodic — `K1, K2, K1, K2, ...`).

**One-Time Pad (OTP):** key as long as the text, random, never reused. **Unbreakable** (but impractical).

### 32.4. Hash Functions and Digital Signature

**Cryptographic hash (one-way):**
- Input P → digest H of fixed size.
- **Irreversible** (impractical to invert).
- **Collision resistance** (impractical to find P1 ≠ P2 with H(P1) = H(P2)).

Applications: **MAC** (Message Authentication Code) to authenticate messages; **digital signature**.

**Digital signature:**
- Hash of the message + encryption with the sender's **private key**.
- Receiver decrypts with the sender's **public key** and verifies the hash.
- Guarantees **integrity + authenticity + non-repudiation**.

### 32.5. Public Key Infrastructure (PKI)

Set of rules, procedures, policies and applications to manage **keys** and **certificates** securely.

**Public key certificate:**
- Data block containing: **Subject** (owner), **Issuer** (certifying entity), **validity**, **public key**, **digital signature** of the issuer.
- Validated by: **expiration date**, **CN vs. server DNS**, **chain of trust up to a Root CA**.

**Certification chain:** Each CA is trusted if its certificate was issued by another trusted CA. At the top, a **Root CA** — with **self-signature** (self-signed), pre-installed in the OS/application trust list.

**Revocation:**
- Certificates can be revoked before expiration (compromised key).
- Main mechanism: **OCSP** (*Online Certificate Status Protocol*); the issuer includes the DNS of the *OCSP responder*.
- Alternative: **CRL** (Certificate Revocation List).

**Tools:**
- **openssl** — `req` (generate CSR or self-signed), `x509` (process certificates).
- **Windows Server** — *Active Directory Certificate Services* + *Online Responder* role; Enterprise CA (with AD) or Standalone CA; optionally *Web Enrollment* (`/certsrv`).

### 32.6. Combined Use and Best Practices

- **Hybrid:** use asymmetric to negotiate a symmetric key and, from then on, encrypt symmetrically. E.g., SSH, TLS, IPsec, WPA (802.11i), VPNs.
- **Cryptography is not the solution to all problems**; it is a **part** of the solution. Apply it **proportionally** to the value of the information; encrypting everything generates processing and bandwidth costs.
- **Encrypting data at rest** is as important as encrypting data in transit.
- **Cost and policy:** known algorithms (not secret) → cryptanalysis already done; security depends on the **key secrecy**.

---

## 33. Access Management (AAA, RADIUS, TACACS+, Diameter, NAC)

### 33.1. NAC (Network Access Control)

Concept of access control to the infrastructure based on **security policies**.

**Criteria:**
- **Pre-admission:** the system must meet requirements before communicating (e.g., updated OS, antivirus).
- **Post-admission:** access granted/denied based on **activity** (pre-established authorization matrix).

### 33.2. Authentication: PAP, CHAP, EAP

- **PAP (Password Authentication Protocol):** identification + password in **clear text**. Simple and insecure.
- **CHAP (Challenge-Handshake Authentication Protocol):** challenge (random number) sent by the server; client responds with hash (challenge + password). Periodic validation; passwords never in clear text.
- **EAP (Extensible Authentication Protocol):** *framework*; supports cards, biometrics, etc. Allows the *PEP* to be transparent. **PEAP** variant encapsulates EAP in a TLS tunnel. WPA/WPA2 use PEAP.

### 33.3. AAA (Authentication, Authorization, Accounting)

- **Authentication** — prove identity.
- **Authorization** — verify permission for the resource.
- **Accounting** — record accesses (granted/denied) and resources used.

### 33.4. Policy Points

- **PEP (Policy Enforcement Point)** — applies the decision (access point, VPN, NAS).
- **PDP (Policy Decision Point)** — decides (authenticates).
- **PIP (Policy Information Point)** — provides attributes for authorization.

Flow: User → PEP → PDP (→ PIP) → decision → PEP applies.

### 33.5. AAA Protocols

| Protocol | Base | Notes |
|---|---|---|
| **RADIUS** | UDP (RFC 2865) | 8-bit AV pairs; Accounting recorded at the beginning/end of the session; PIP and accounting local or remote (extensions). |
| **TACACS+** | TCP | Separates authentication and authorization; reauthorizes each command (common in equipment administration). |
| **Diameter** | TCP/SCTP | Evolution of RADIUS (not compatible); supports EAP, 32-bit AVPs, failover, mobile networks (3G/4G/LTE/IMS). |

### 33.6. SSO with Tickets (Kerberos)

See §28.5. It is the basis of SSO in AD.

---

## 34. Business Continuity Management (BCM, HA, Backups)

### 34.1. BCM (Business Continuity Management)

Standards **ISO 27000 / 22301 / 22313**. **Top-down** methodology; without management support it is not feasible. **PDCA** model (Plan-Do-Check-Act) of continuous improvement.

### 34.2. Key Criteria

| Acronym | Meaning |
|---|---|
| **MTPD** | Maximum Tolerable Period of Disruption |
| **MTD** | Maximum Tolerable Downtime |
| **MBCO** | Minimum Business Continuity Objective (minimum level of operability during disruption) |
| **SLA** | Service Level Agreement (agreed service levels) |
| **BIA** | Business Impact Analysis (critical activities and dependencies) |
| **RA** | Risk Assessment (scenarios, probability, impact) |
| **BCP** | Business Continuity Plan (respond, recover, restore) |
| **DRP** | Disaster Recovery Plan (applied when MBCO/MTD are violated) |

**Risk:** `Risk = Impact × Probability` (typical scales 1–5 and 1–4). Risk matrix supports prioritization.

### 34.3. Reliability and Availability Metrics

- **MTTF** (Mean Time To Fail), **MTTR** (Mean Time To Repair/Replace).
- **MTBF** = MTTF + MTTR.
- **Availability** = MTTF / MTBF.

**Failure rate:** λ = 1/MTBF; **FIT** = failures per 10⁹ hours.

**Systems in series (no redundancy):**

```
FIT_total = Σ FIT_i
λ_total = Σ λ_i
MTBF_total = 1 / λ_total
```

**Systems in parallel (with redundancy):**

```
λ_total = λ1 × λ2 × … × λn
MTBF_total = 1 / λ_total
```

**Fault Tolerance Levels:**

- **Full Fault Tolerant** — remains functional.
- **Graceful Degradation** — controlled degradation.
- **Fail Soft** — significant/prolonged degradation.
- **Fail Safe** — unavailable but intact.

**SPOF (Single Point of Failure):** component whose failure brings down the system. It must be eliminated.

**CMF (Common-Mode Fault):** failure that simultaneously affects several redundant components (e.g., shared power supply). **Every SPOF is CMF**, but the converse is not true.

### 34.4. Recovery Metrics

- **RTO (Recovery Time Objective)** — average recovery time.
- **RPO (Recovery Point Objective)** — maximum acceptable data loss (time).
- **WRT (Work Recovery Time)** — time to restore data/applications and test.

**MTTR includes backup restore time.**

### 34.5. Backup Strategies

| Strategy | Copy | Advantages | Disadvantages |
|---|---|---|---|
| **Full** | Everything | Simple restore, short WRT | Slow, high RPO |
| **Incremental** | Changes since the last backup (full or incremental) | Fast | Sequential restore (full + N incrementals) |
| **Differential** | Changes since the last **full** | Restore = full + 1 differential | Copies grow over time |

**Best practices:**
- Weekly full + daily incremental/differential.
- Automation by scheduler (outside peak hours).
- **Duplication** + remote location.
- **Periodic restore tests**.

**Mirroring vs. Backup:**
- **Mirroring (synchronous/asynchronous):** RPO ≈ 0 (synchronous) or very low (asynchronous); low WRT; but requires ensuring confidentiality/integrity → latency.
- **Backup:** flexible; higher RPO.

### 34.6. Cost-Benefit Analysis

- **AV** (Asset Value) × **EF** (Exposure Factor) = **SLE** (Single Loss Expectancy).
- **ALE** = SLE × **ARO** (Annualized Rate of Occurrence).
- The mitigation action must cost ≤ ALE.

### 34.7. Backup Tools

- **Windows Server Backup:** automatic full + incrementals; `bare metal recovery`; local destination or share.
- **tar** (Linux): `-c` create, `-x` extract, `-z` gzip, `-p` preserve permissions, `-g` snapshot log (incremental), `-G` extract incremental, `-C` destination.
- **rsync** (Linux): remote via SSH or `rsyncd`; public key authentication.
- **AMANDA:** central server + clients (Linux/Windows) — aggregates native tar/ssh.
- **Specific services:** `mysqldump` (MySQL), `slapcat` (OpenLDAP).

---

## 35. Clustering, Failover and Load Balancing

### 35.1. Concepts

- **Fault Tolerance** — system remains functional with component failures; implies **redundancy** and failure detection.
- **Failover** — multiple redundant components, **one active**, others on standby ready to take over.
- **Load Balancing** — all redundant components **active simultaneously**, distributing load.

Both require a **controller** (which can be a SPOF) and **state synchronization** if the components are *stateful*.

### 35.2. Implementation Levels

- **L2 (Ethernet):**
  - **STP** (Spanning Tree Protocol) — path failover.
  - **LACP / Link Aggregation** — load balancing with fault tolerance.
  - **NIC Teaming / Bonded NIC** — bonding of server interfaces (Windows/Linux).
- **L3 (IP):**
  - **Dynamic routing** — all routing protocols provide failover; load balancing depends on the metric.
- **Application / Server cluster:**
  - Central controller with **virtual IP** or **single DNS name**.
  - **DNS round-robin** (short TTL) as simple load balancing.
  - **Client-side failover** — client receives a list of servers and tries in order (DNS, SMTP, LDAP).

### 35.3. HAProxy (Linux)

*The Reliable, High Performance TCP/HTTP Load Balancer*.

- **Frontend** — client access point (`bind`).
- **Backend** — group of destination servers.
- **Configuration sections:** `global`, `defaults`, `frontend`, `backend`, `listen`.
- **Modes:** `mode tcp` (transparent relay) or `mode http` (parse and validate).
- **Balance algorithms:** `roundrobin` (by default, dynamically weighted), `leastconn`, etc.
- **Stickiness / stick-tables:** maintains client ↔ server association between requests.
- **Health check:** `check` option on servers; `backup` marks a backup server.
- **SSL/TLS termination:** accepts HTTPS from the client and speaks HTTP internally (avoids distributing certificates across members).

### 35.4. Windows NLB (Network Load Balancing)

**Distributed** approach, without a central controller (no SPOF): all members share the **cluster virtual IP**; all receive each request, but **only one responds**.

- **Unicast mode:** original MAC disabled; all use the common MAC `02:BF:...`. Each member is no longer individually accessible (only via the cluster); requires a 2nd interface for individual access.
- **Multicast mode:** original MAC maintained; additional multicast MAC for the cluster. Requires multicast-aware switches; supports IGMP for optimization.
- **Priority:** 1 (highest) to 32; determines who responds in `single host` mode.
- **Port Rules** (per virtual address):
  - **Filtering modes:**
    - **Single Host** — failover (only the highest priority responds).
    - **Multiple Host** — distribution across all.
    - **Disable** — traffic blocked.
  - **Affinity:**
    - `none` — no persistence (simple UDP).
    - `single` — same origin → same member.
    - `network` — same Class C subnet → same member.
  - **Percentage** of requests per member in Multiple Host (configured per member).

**NLB limitations:**
- All members must be on the same **L2 network** (broadcast domain).
- Preferably a **dedicated network** (the cluster "floods" the broadcast domain).
- **ARP:** responds with the cluster MAC but a different source MAC → some nodes reject; solution: static ARP entry.

### 35.5. Comparative Matrix

| Criterion | HAProxy | Windows NLB |
|---|---|---|
| Architecture | Central controller | Distributed |
| SPOF | Yes (the controller) | No |
| Flexibility | High (TCP/HTTP, ACLs, SSL termination) | Limited (TCP/UDP) |
| Layer | L4/L7 | L3/L4 |
| Complexity | Medium | Low |

---

## 36. Logging, Monitoring and Auditing

### 36.1. Principles

- **Logs** record events with **severity**, **source** and **descriptive text**.
- Log analysis is the **first step** of diagnosis and anomaly detection.
- Logging level **configurable per source** (increase during troubleshooting, reduce afterwards).

### 36.2. Centralization

- **Log server** aggregates events from the entire infrastructure.
- **PUSH** (sources send) vs. **PULL** (collector collects).
- **PULL:** configure equipment on the collector.
- **PUSH:** configure the log server on each equipment.

### 36.3. Windows Event Logs

- **Event Viewer** — logs by *theme* (System, Application, Security, ...).
- **Custom Views** — aggregation by filters.
- **Subscriptions** — centralization (Collector-Initiated or Source-Initiated); HTTP/HTTPS protocol.

### 36.4. Linux Syslog / rsyslog

- `syslogd` daemon (or `rsyslogd`) collects events via API.
- Classification by **facility** (auth, cron, daemon, kern, mail, user, local0-7, ...) and **severity** (debug, info, notice, warning, err, crit, alert, emerg).
- Configuration `/etc/syslog.conf` (or `/etc/rsyslog.conf`): `facility.severity` pairs → **action**:
  - Local file (`-` for deferred sync).
  - Users (`root,admin` or `*`).
  - External command (`|` + path).
  - Remote server (`@host` UDP, `@@host` TCP).
- **UDP/514 transport** by default — **no authentication**; restrict by network and firewall; TCP when possible.
- **logrotate** — rotation (`/etc/logrotate.conf`): periodicity, compression, number of generations, size limit, email.

### 36.5. Login Audit (Unix)

Binary files (not directly readable):

- `/var/run/utmp` — **current** sessions (terminal, user, origin, time); deleted on logout.
- `/var/log/lastlog` — last login per UID.
- `/var/log/wtmp` — history of **all** entries/exits.

Queries: `who`, `w`, `users`, `last`, `lastlog`, `ac`, `rwho`.

### 36.6. Access Auditing (AAA)

Accounting records are part of **AAA** (see §33.3) and typically reside on RADIUS/TACACS+/Diameter servers.

**Rules:**
- Restricted access to records.
- Documented retention (compatible with GDPR/legislation).
- Do not store passwords or session secrets.

---

## 37. Scripting, Automation and DevOps

### 37.1. Shell Scripts (Linux)

- **Shebang** `#!` at the beginning of the file, followed by the interpreter: `#!/bin/bash`, `#!/bin/csh`, `#!/usr/bin/python3`.
- The file must have execution permission (`chmod +x`).
- Structures: `if`/`while`/`for`, variables, `$1`, `$2` (arguments), `$(...)` (command substitution).
- `#` starts a comment.
- The shebang line does not interfere (it is a comment for the interpreter).

**Advantage:** available on any Linux, without installing anything.
**Other languages:** Perl, Python — more expressive, require installation.

### 37.2. Windows Scripts

| Extension | Interpreter |
|---|---|
| `.BAT` / `.CMD` | `cmd.exe` |
| `.JS` / `.JSE` | JScript (WSH) |
| `.VBS` / `.VBE` | VBScript (WSH) |
| `.WSF` | XML multi-language (WSH) |
| `.PS1` | PowerShell |

**WSH (Windows Script Host):** accesses WMI, ADSI, file system, etc.

**PowerShell:**
- **Cmdlets** named verb-noun: `Get-...`, `Set-...`, `Start-...`.
- **Help:** `Get-Help <cmdlet>`.
- **Autocomplete:** TAB.
- **ISE (Integrated Scripting Environment):** graphical IDE.

### 37.3. Scheduler / Task Scheduler

- **Windows:** GUI; granularity **1 minute**; scheduling by hour, startup, idle, condition, deadline; runs with a specific user account.
- **Linux:** `cron` — `/etc/crontab` (format: `m h dom mon dow user command`) or `/var/spool/cron/<user>` (via `crontab -e`, without user field).
  - `*` = all values; `*/5` = step 5; `0-59` = interval; lists with commas.
  - Access control: `/etc/cron.allow`, `/etc/cron.deny`.

### 37.4. DevOps

**Principles:**
- Dev ↔ Ops collaboration.
- Automation.
- Continuous measurement and monitoring.
- Continuous feedback.

**Practices:**
- **Version control** (Git) for code, scripts, infrastructure.
- **CI** (Continuous Integration) — frequent integration + build + automated tests.
- **CD** (Continuous Delivery/Deployment) — automated deploy to staging/production.
- **IaC** (Infrastructure as Code) — Ansible, Terraform, Puppet, Chef, etc.
- **Observability** — Prometheus/Grafana, structured logs, tracing.

**Typical tools:** Git, Jenkins/GitLab CI, Ansible/Terraform/Puppet/Chef, Docker/Kubernetes, Prometheus/Grafana.

**Example pipeline (Node.js):**

```yaml
stages: [build, test, deploy]
build:  npm install
test:   npm test
deploy: only on main
```

**Best practices:**
- Clear KPIs.
- PoC before adoption.
- Continuous training.
- Active monitoring.

**Challenges:**
- Resistance to change.
- Complexity in legacy systems.
- Learning curve (SDN/SD-WAN).
- Need for multidisciplinary teams.

### 37.5. WDS (Windows Deployment Services)

- Only in an AD environment; requires **DHCP** and clients with **PXE**.
- **Unattended** installation over the network (multicast images).
- Image managed on the WDS server (`imageX`); can be created outside or on the server.
- Changes (software, drivers) automatically propagated to all workstations (*deploy*).
- Configuration of machine name and domain entry during installation.

### 37.6. inetd and libwrap (Linux)

**inetd:** daemon that replaces multiple inactive servers — a single process manages multiple sockets and does `fork()`+`exec()` of the correct server when there is a request.

- Configuration `/etc/inetd.conf`: `service-name socket-type protocol wait/nowait user exec-file args`.
- `wait` (UDP, typically 1 client at a time) vs. `nowait` (TCP, multiple).
- `internal` for services internal to inetd.

**libwrap:** service access control library.

- Check: `ldd /path/to/binary | grep libwrap`.
- Files: `/etc/hosts.allow` (evaluated first), `/etc/hosts.deny` (second), no match = **allow**.
- Format: `DAEMONS-LIST : CLIENTS-LIST`; `ALL` in both lists.
- `tcpd` — wrapper used when the service does not have native libwrap support.

---

## 38. Software-Defined Infrastructure (SDN, SD-WAN, MPLS, NDN)

### 38.1. SDN (Software-Defined Networking)

Separation between **control plane** and **data plane**:

- **Control plane (northbound):** applications ↔ SDN control platform.
- **Data plane (southbound):** platform ↔ physical/virtual equipment.

**Benefits:**
- Centralized management.
- Network programmability.
- Better bandwidth utilization / latency reduction.

### 38.2. SD-WAN

Applies SDN principles to **WAN**.

- Supports on-premises, public/private cloud, SaaS applications.
- Replaces rigid routing tables/ACLs with **intelligent per-application routing**.
- Per application class: differentiated QoS and routing policy.

**Benefits:**
- Centralized WAN management.
- Optimized use of multiple link types (MPLS, broadband, ...).
- Better QoS and performance.

### 38.3. MPLS (Multiprotocol Label Switching)

- Operates between L2 and L3.
- Adds a **label** to the packet (RFC 3032 format: 20-bit label, 3-bit Exp, 1-bit S, 8-bit TTL).
- Compatible with various L2 protocols (Ethernet, ATM, Frame Relay).
- **Disadvantages:** cost, implementation time, lack of native encryption, cloud challenges.

### 38.4. NDN (Named Data Networking)

Alternative to IP routing — routing **by data name**.

- **Interest packet** (consumer requests name) + **Data packet** (producer returns).
- Each router maintains: **Content Store** (cache), **PIT** (Pending Interest Table), **FIB** (Forwarding Information Base).
- Data packet follows the reverse path of the Interest.

---

## 39. Windows–Linux Integration Tools

(Systematization of the tools used for interoperability — see §§28, 30, 36.)

- **DNS, LDAP, NFS, SMB/CIFS, Kerberos 5, iSCSI** — standard protocols supported by both sides.
- **Samba** — SMB/CIFS implementation on Linux; can act as Standalone, PDC, Domain Member, AD DC.
- **Winbind** — SID↔UID/GID mapping; integrates domain accounts into NSS/PAM.
- **nss_ldap / pam_ldap** — LDAP integration.
- **libnss_winbind / pam_winbind** — AD integration via Winbind.
- **Kerberos + NTP** — base of domain authentication.
- **Syslog** — can receive from Windows equipment via non-Microsoft implementations (rsyslog).

**Integration recommendations:**
- Do not overload Samba AD DCs with the *file server* role (ACLs).
- Prefer **IPs** to DNS names in sensitive contexts (NFSv2/v3).
- Ensure **NTP synchronization** in AD domains.
- Document name/UID/SID mappings.

---

## Cross-References between Parts

| Topic | Part I (Fundamentals) | Part II (Components) |
|---|---|---|
| Information security | §16 (OWASP, Auth) | §31 (Firewalls), §32 (Crypto/PKI), §33 (AAA) |
| Authentication/Authorization | §16 (JWT, RBAC) | §28 (AD/LDAP/Kerberos), §33 (RADIUS/NAC) |
| Persistence/DB | §5, §11, §21 | §24 (FS), §26 (SAN/NAS), §34 (Backups) |
| DevOps/CI-CD | §16, §22 | §37 (Automation, WDS), §38 (SDN/SD-WAN) |
| Resilience/High availability | §17 (Sagas, Outbox) | §34 (BCM), §35 (Clustering, HAProxy, NLB) |
| Observability | §16.3 | §36 (Logging, Monitoring) |
| Network infrastructure | §9, §15 | §29 (DHCP/DNS/Routing/VLAN), §30 (SMB/NFS), §31 (QoS) |

---

## 40. IARTI — Fundamentals of Artificial Intelligence

### 40.1. Scope and Positioning

**IARTI (Artificial Intelligence)** studies the foundations and techniques to build systems that **interpret the surrounding environment**, **model and analyze complex problems**, **reason and learn automatically**, and **propose or execute actions** on the environment. It complements the software engineering courses (Part I) and infrastructure courses (ASIST): here the object of study is **intelligent behavior**, not the code nor the infrastructure that supports it.

Two operational definitions:

- AI (broad sense): science that studies the foundations and develops systems in diverse domains with the goal of **approaching or surpassing** human intelligence capabilities, collaborating with humans in solving complex problems.
- AI System (technical sense): system with capabilities of **perception**, **representation**, **reasoning**, **learning**, **interaction** and **action**, capable of dealing with data failures, unforeseen situations and adaptation to context, following moral and ethical principles.

### 40.2. Historical Framework

- **1943** — McCulloch & Pitts: first **artificial neuron** model.
- **1950** — Turing proposes the **Turing Test**.
- **1956** — **Dartmouth Summer Research Project**: the term *Artificial Intelligence* is born (John McCarthy).
- **1957** — Rosenblatt: **Perceptron**.
- **1958–1962** — first chess/checkers programs.
- **1969** — XOR problem (Minsky & Papert) → first AI "winter".
- **1986** — **Backpropagation** (Rumelhart, Hinton et al.) → rebirth of neural networks.
- **1995** — SVMs; **1997** — Deep Blue beats Kasparov at chess.
- **2012** — **AlexNet**: *deep learning* revolution.
- **2016** — **AlphaGo** beats Lee Sedol.
- **2017** — **Transformer** ("Attention is all you need", Vaswani et al.).
- **2020** — GPT-3; **2022** — **ChatGPT** → popularization of **Generative AI**.

### 40.3. AI Areas

AI **is not just Machine Learning** (although ML is today present in almost all areas). Main areas:

- **Natural Language (NLP)** — understanding and generation of text/speech.
- **Computer Vision** — interpretation of images and video.
- **Automated Planning** — generation of action sequences to achieve goals.
- **Multi-Agent Systems** — cooperation/competition between agents.
- **Expert Systems** — systems based on specialized knowledge.
- **Intelligent Robotics**, **IoT**, **AmI (Ambient Intelligence)**, **Affective Computing**.
- **Machine Learning (ML)** and, within it, **Artificial Neural Networks (ANN)** and **Deep Learning (DL)**.
- **Generative AI** — use of *Transformers* to generate text, image, video, code, audio.

**Inclusive hierarchy:** AI ⊃ ML ⊃ ANN ⊃ DL ⊃ (Generative AI based on Transformers).

### 40.4. The Intelligent Agent

An **intelligent agent** continuously executes three functions (Hayes-Roth 1995):

1. **Perception** of the dynamic conditions of the environment (sensors).
2. **Action** to affect the conditions of the environment (actuators).
3. **Reasoning** to interpret perceptions, solve problems, infer and determine actions.

Components:

- **Sensors** (passive or active): temperature, position, image, LiDAR, etc.
- **Actuators:** robot, CNC machine, automaton, screen, etc.
- **Intelligence:** inference, reasoning, planning, optimization, understanding, learning.
- **Communication / Interaction / Access:** with other agents, humans, DB, web, services.

**Multi-agent system:** several agents cooperate/compete in problem solving and resource sharing.

**Environment types and approach:**

| Information | World | Typical approach |
|---|---|---|
| Complete and correct | Structured | **Deliberative** (e.g., chess, Deep Blue) |
| Incomplete / uncertain | Unstructured | **Reactive** (with deliberative parts) — e.g., autonomous vehicles |

**Embodied AI:** physical agents with action in the real world (robots).

### 40.5. Machine Learning — Overview

**Definition:** area of AI in which the system **learns patterns from data** instead of being explicitly programmed. It reverses the traditional logic: *Traditional Programming* = Data + Program → Output; *ML* = Data + Output → Program.

**Classic typology:**

| Category | Goal | Examples |
|---|---|---|
| **Supervised** | Predict label/value from labeled data | Classification (Naive-Bayes, Decision Trees, KNN, SVM, Neural Networks); Regression (Linear, Polynomial, Ridge/Lasso) |
| **Unsupervised** | Discover structure without labels | Clustering (K-Means, DBSCAN, Hierarchical); Dimensionality Reduction (PCA, t-SNE, LDA); Association (Apriori, FP-Growth) |
| **Reinforcement (RL)** | Learn policy by trial-and-error | Q-Learning, SARSA, DQN, A3C |
| **Ensemble** | Combine multiple models | Bagging, Boosting (AdaBoost, XGBoost), Stacking |
| **Neural Networks / DL** | Deep learning with multiple layers | CNN, RNN, LSTM, Transformer, GAN, Autoencoders |

**Fundamental limitations:**

- They only identify what they learned to recognize (dependent on training).
- They classify and predict, but **do not explain** easily (*black box*).
- They require **quality data** and significant volumes.
- They are biased by the training data (*bias*).

---

## 41. IARTI — Logic and Logic Programming (PROLOG)

### 41.1. Logic as Knowledge Representation

Two central logics in AI:

- **Propositional Logic** — atomic propositions; operators applied to symbols.
- **Predicate Logic (First Order)** — relations between objects, quantifiers.

| Operator | Symbols |
|---|---|
| **Conjunction (AND)** | ∧, `&`, `,`, `∩` |
| **Disjunction (OR)** | ∨, `∪`, `+` |
| **Negation (NOT)** | ¬, `~`, `\+` |
| **Implication** | →, `⊃`, `:-` |
| **Equivalence** | ≡ |
| **XOR** | ⊕ (defined as `(A ∧ ¬B) ∨ (¬A ∧ B)`) |

### 41.2. Propositional Logic

Each atomic proposition is a boolean variable. Allows reasoning with truth tables, but **does not capture internal structure** ("Porto is in Portugal" is not decomposed).

### 41.3. Predicate Logic

Introduces **predicates** (relations) and **arguments** (objects). Example: `is_in(portugal, europe)`. Allows:

- **Variables** (uppercase): `X`, `Y`, `C`.
- **Universal quantifier** (∀): `∀C, [cat(C) → like(C, fish)]`.
- **Existential quantifier** (∃): `∃O, [ocean(O) ∧ bath(O, portugal)]`.
- **Atoms** (lowercase): domain constants.

**Unification:** *matching* mechanism between terms that instantiates variables to make two terms equal. Basis of automatic inference.

**Resolution Principle (Proof by Refutation):**

1. Convert axioms into **clausal form** (disjunctions of literals).
2. Add **¬A** (negation of the theorem).
3. Apply the **resolution rule** (cancel complementary literals).
4. If the **empty clause** is reached (contradiction), then ¬A is false ⇒ **A is true**.

Canonical example — prove `eat(teco, fish)` from `cat(X) → like(X, fish)`, `like(X, Y) → eat(X, Y)`, `cat(teco)`:

```
¬cat(C) ∨ like(C, fish)
¬like(C, X) ∨ eat(C, X)
cat(teco)
¬eat(teco, fish)       ← negation of the goal
```

Resolving successively until obtaining `□` (empty clause) → proof concluded.

### 41.4. Reasoning Mechanisms

| Mechanism | Direction | Guarantees truth? | Typical use |
|---|---|---|---|
| **Deduction** | General → Particular | **Yes** (if premises true) | Logical reasoning |
| **Induction** | Particular → General | No (probabilistic) | Knowledge discovery, ML |
| **Abduction** | Effect → Probable cause | No (explanation) | Diagnosis, explanations |

**Modus Ponens:** `p` and `p → q` ⇒ `q`. Basis of rule-based reasoning.

**Modus Tollens:** `p → q` and `¬q` ⇒ `¬p`.

### 41.5. Logic Programming — Paradigm

Program = **declarative description** of the problem in terms of logical axioms, not a sequence of imperative steps. Execution = **controlled deduction** from Horn clauses (`a ∧ b ∧ c → d`).

**PROLOG** (Alain Colmerauer, 1972) is the reference language:

- Uses the **Resolution Principle** + **Depth-First Search** with **backtracking**.
- Variables in two states: **uninstantiated** or **instantiated**.
- **Closed World Assumption**: what is not defined is assumed **false**.
- Extensions with **strong negation** (¬) and **weak/default negation** (`not`/`no`): `train(Line) → cross(Line)` vs `no train(Line) → cross(Line)`.

**Base syntax:**

```prolog
% Fact (axiom without conditions)
father(john, mary).

% Rule (implication)
grandfather(X, Z) :- father(X, Y), father(Y, Z).

% Query
?- grandfather(john, Who).
```

- **Fact** = `functor(args).`
- **Rule** = `conclusion :- condition1, condition2.`
- **Query** = `?- goal.`
- Conjunction `,`; disjunction `;`; negation `\+`.
- **`=` (symbolic unification)** vs **`is` (numeric assignment)** — `N is N+1`; `N = N+1` **does not** increment.

**Control structures:**

| Structure | Effect |
|---|---|
| `true` | Immediate success. |
| `fail` | Forced failure. |
| `repeat` | Success in a loop until failure. |
| `!` (*cut*) | Blocks *backtracking* to before the `!`. |

**`!` (cut):** eliminates upstream alternatives, optimizes, but can suppress legitimate solutions. Classic error: using `!` in `member/2` turns it from a selector into a *matcher*.

**Recursion:** fundamental mechanism. `factorial(0,1) :- !.` as base case + recursive case.

**Lists:** `[H|T]` (head + tail); `[]` (empty list). Heterogeneous elements allowed.

Useful predicates and their semantics:

| Predicate | Effect |
|---|---|
| `member(X, L)` | `X` belongs to `L`; also **generates** elements. |
| `append(L1, L2, L3)` | Concatenates `L1` and `L2` into `L3`; also **partitions** `L3`. |
| `reverse(L, LI)` | Reverses. |
| `findall(X, Q, L)` | Collects solutions of `Q` into `L`; never fails (`L=[]` if empty). |
| `setof(X, Q, L)` | Same, sorted and without duplicates; fails if `Q` has no solutions. |
| `bagof(X, Q, L)` | Same as `findall` but fails if `Q` has no solutions. |

**Complementary aspects:**

- **Consult files:** `[file]` or `consult(file)`; reconsult: `[-file]` or `reconsult(file)`.
- **Directive `:-` at the top** executes what is on the right before interpreting the rest.
- **Dynamic knowledge base:** `assert`, `asserta` (beginning), `assertz` (end), `retract`. Requires `:- dynamic predicate/arity`.
- **I/O:** `read/1`, `write/1`, `nl/0`, `get/1`, `get0/1`, `see/1` + `seen/0` (input), `tell/1` + `told/0` (output).
- **Terms:** `functor(T, F, N)`, `arg(N, T, A)`, `T =.. L` (conversion term ↔ list).
- **Custom operators:** `:- op(Precedence, Notation, Name)`; notations: `fx`, `fy` (prefix), `xf`, `yf` (postfix), `xfx`, `xfy`, `yfx` (infix).
- **Atom ↔ list of codes conversion:** `name/2`.

---

## 42. IARTI — Automatic Problem Solving: Uninformed Search

### 42.1. Problem Formulation

A **problem** is characterized by:

- **Initial state**.
- **Goal state(s)**.
- **Operators** (transitions between states).
- **Constraints / rules**.
- **Cost function** (optional).

Types of desired solution: **best solution** (optimization) or **solution within useful time** (satisfaction with heuristics).

Challenges: **combinatorial explosion**, absence of solution, excess of constraints.

### 42.2. Uninformed Search

Does not use knowledge about proximity to the goal.

**Depth-First Search (DFS):**

- Advances until the solution or a dead end.
- **Low memory** (linear depth); good for problems with multiple solutions.
- Requires **backtracking** (otherwise it can lose the solution).
- Uninformed; does not guarantee the best solution.
- Basis of search in **PROLOG**.
- Problems: in large graphs, it can visit many unnecessary nodes.

**Breadth-First Search (BFS):**

- Explores all nodes of level N before advancing to N+1.
- **Guarantees a solution at the level closest to the root** (does not guarantee the best in cost).
- **Very high memory consumption** in large problems.
- Uninformed.

**Application to concrete graphs** (e.g., highway map, weighted network):

- DFS chooses a branch and follows it to exhaustion (with *backtracking*).
- BFS expands in width by levels.
- Both **ignore costs**; to use costs, use informed methods (§43).

---

## 43. IARTI — Informed Search Methods and Optimization

### 43.1. Best First Search (BestFS)

Combines DFS with **local heuristic** — expands the node that seems most promising according to a criterion.

- **Requires an estimation function** `h(n)` (e.g., Euclidean distance to the destination).
- Does not guarantee the best solution.
- Requires **backtracking** to correct wrong local decisions.
- Typical implementation: candidate list ordered by `h`.

### 43.2. Branch and Bound (B&B)

- Explores the node with the **lowest accumulated cost** `g(n)` from the root.
- **Can "jump"** between branches (the next expanded node does not have to be a descendant of the last one).
- **Guarantees the best solution** when all leaf nodes have accumulated cost ≥ the best solution found.
- **Does not use heuristics** — therefore, it can expand many nodes.

### 43.3. A* (A-Star)

Combines the best of BestFS and B&B.

- Evaluation function: **`f(n) = g(n) + h'(n)`**
  - `g(n)`: **known** cost from the origin to `n`.
  - `h'(n)`: **estimate** (heuristic) of the cost from `n` to the solution.
- **Fundamental property:** to **guarantee optimality**, `h'(n)` must be a **lower bound** (admissible) of the real cost, in the case of minimization; or **upper bound** in the case of maximization.
- If `h'(n) = 0` **on all nodes**, A* degenerates into B&B.
- If `h'(n)` = real optimal cost, A* is **direct** to the optimal solution.
- A* is **more efficient** than B&B, but requires a good heuristic.
- It terminates when: solution found **and** no node in the list has `f(n)` lower than the cost of the solution found.

**Typical PROLOG implementation (skeleton):**

```prolog
aStar(Orig, Dest, Cam, Cost) :- aStar2(Dest, [(_, [Orig])], Cam, Cost).

aStar2(Dest, [(Cost, [Dest|T]) | _], Cam, Cost) :- reverse([Dest|T], Cam).

aStar2(Dest, [(Ca, LA) | Others], Cam, Cost) :-
    LA = [Act | _],
    findall((CEX, CaX, [X|LA]),
            (Dest \== Act, edge(Act, X, CostX), \+ member(X, LA),
             CaX is CostX + Ca,
             estimate(X, Dest, EstX),
             CEX is CaX + EstX),
            New),
    append(Others, New, All),
    sort(All, AllOrd),
    aStar2(Dest, AllOrd, Cam, Cost).
```

### 43.4. Comparison

| Method | Guarantees solution? | Guarantees optimum? | Uses heuristic? | Memory |
|---|---|---|---|---|
| DFS | Yes (if with backtracking) | No | No | Low |
| BFS | Yes | Only in #steps | No | High |
| BestFS | Yes (with backtracking) | No | Yes | Medium |
| B&B | Yes | **Yes** | No | High |
| A* | Yes | **Yes** (with admissible `h'`) | Yes | High |

---

## 44. IARTI — Genetic Algorithms

### 44.1. Inspiration and Principles

Methods of **Evolutionary Computation** (John Holland, 1970s). Each solution is an **individual** of a population; the genotype (chromosome) encodes the solution; the population evolves through **selection**, **crossover** and **mutation** over generations.

**Biological analogy:**

| Natural evolution | Genetic Algorithm |
|---|---|
| Individual | Solution |
| Gene | Part of a solution |
| Genotype / chromosome | Representation of the solution |
| Reproduction | Selection + crossover |
| Mutation | Gene alteration |
| Population | Set of solutions |
| Generation | Iteration |

### 44.2. Base Algorithm

```
1. Generate initial population (random or with heuristics)
2. Evaluate each individual
3. Repeat until stopping criterion:
   a. Select parents
   b. Crossover → offspring
   c. Mutate some offspring
   d. Evaluate offspring
   e. Form new population (with possible elitism)
4. Return the best individual
```

### 44.3. Operators

**Selection:**

- **Roulette Wheel** — probability proportional to evaluation; better individuals have more chance, but the worst are not excluded.
- **Stochastic Universal Selection** — a single spin with multiple equally spaced pointers.
- **Tournament** — direct confrontations; the one with the best evaluation wins.

**Crossover:**

- **1 cut point** — swaps tails from a point.
- **2 cut points** — swaps central segment.
- **Uniform (with binary mask)** — swaps bit by bit according to mask.
- **Order Crossover (OX)** — preserves relative order (essential in permutation problems, such as TSP/scheduling); avoids infeasible offspring.

Example 1 point (`P1=10110010`, `P2=11010110`, cut after the 5th bit):

```
P1 = 10110|010
P2 = 11010|110
D1 = 10110|110 = 10110110
D2 = 11010|010 = 11010010
```

**Mutation:**

- Substitution of a gene by another viable value (in binary, flips the bit).
- In permutation problems, mutation **by swapping positions** preserves viability.
- Maintains **genetic diversity**; avoids premature convergence to local optima.

### 44.4. Parameterization

| Parameter | Effect | Typical values |
|---|---|---|
| Population size | Diversity vs. cost | Depends on the number of solutions |
| Crossover rate | Generation renewal | 60%–80% |
| Mutation rate | Exploration; avoid local optima | ~1% |
| Replacement rate | % of population renewed per generation | Related to crossover |
| Stopping criterion | Number of generations / fitness / time / stabilization | According to problem |

**Evaluation vs. Fitness:**

- **Evaluation** = **absolute** performance measure of an individual.
- **Fitness** = probability of survival/reproduction, **relative** to the population.

**Cautions:**

- Avoid **duplicates** in the initial population.
- Ensure **genetic diversity** (do not fix positions with the same value in all individuals).
- Consider heuristics (EDD, SPT in scheduling) to generate part of the initial population.
- Avoid pure elitism (loses diversity).

### 44.5. Canonical Examples

- **Maximization of f(x)=x²** with `x ∈ [0, 63]` encoded in 6 bits: converges through successive crossovers, but without mutation it can get stuck (never explores the 5th bit = 1 if all individuals have 0 in that position → demonstrates the need for mutation).
- **Scheduling of 5 tasks on one machine** (minimize Σwj·Tj): chromosome = permutation of tasks; crossover must be OX; mutation by swapping positions.

---

## 45. IARTI — Artificial Neural Networks and Deep Learning

### 45.1. Biological Neuron → Artificial Neuron

**McCulloch-Pitts model (1943):** weighted sum of inputs, comparison with threshold, binary activation.

**Perceptron (Rosenblatt, 1957):**

- Supervised binary classifier.
- Output: `f(x1,...,xn) = 1 if Σ(xi·wi) + b > 0; 0 otherwise`.
- **Linear decision boundary** in ℝⁿ (hyperplane).
- **Limitation:** does not solve **non-linearly separable** problems (e.g., XOR).

**Inverting polarity:** swap the signs of `wi` and `b`.

### 45.2. Multilayer Perceptron (MLP)

Stacking neurons in **layers** resolves the linearity limitation:

- **Input Layer**.
- **Hidden Layers** — linear intersections that approximate complex shapes (ellipses, etc.).
- **Output Layer**.

**Geometric intuition:** the more lines (neurons) are combined, the closer the classifier approximates the real shape of the regions → fewer false positives/negatives.

### 45.3. Classification Metrics

From the **confusion matrix**:

| | Label + | Label − |
|---|---|---|
| **Predicted +** | **TP** (True Positive) | **FP** (False Positive) |
| **Predicted −** | **FN** (False Negative) | **TN** (True Negative) |

Metrics:

- **Accuracy** = (TP + TN) / (TP + TN + FP + FN)
- **Error** = 1 − Accuracy
- **Precision** = TP / (TP + FP)
- **Recall** = TP / (TP + FN)
- **F1-score** = 2 · (Precision · Recall) / (Precision + Recall) = 2·TP / (2·TP + FN + FP)

**Practical interpretation:** *Precision* answers "when I say positive, how many times am I right?"; *Recall* answers "of all real positives, how many did I capture?".

### 45.4. Training — Backpropagation and Gradient Descent

**Iterative process:**

1. Present example to the network (forward pass).
2. Compare output with the desired value → **error**.
3. **Propagate the error backwards** (backpropagation), adjusting weights.
4. Repeat until the error converges.

**Gradient Descent (the best-known method):**

- Define error function (e.g., mean squared error).
- Calculate the **gradient** `∇E[w]` with respect to the weights.
- Update: `Δw = −η · ∇E[w]` (η = *learning rate*, e.g., 0.1).
- Repeat until stopping criterion.

**Visible effect:** error curve decreasing over training epochs; after training, outputs close to the desired values (e.g., 0.99 / 0.01 instead of random values).

**Example network for voice recognition:**

- Input: frequency spectrum (60 bins).
- 6 hidden layers.
- 2 outputs (two classes: "Steve" / "David").
- After training: values ~0.01 / 0.99 consistent with the class.

### 45.5. Deep Learning

**Definition:** artificial neural network with **many layers** between input and output, generally with **specialized architectures** — not just fully connected MLPs.

**Architecture families:**

| Architecture | Typical domain | Key idea |
|---|---|---|
| **CNN (Convolutional Neural Network)** | Image | Convolutional layers + pooling; each neuron is only affected by a neighborhood of the previous layer. |
| **RNN (Recurrent Neural Network)** | Sequences (text, time series) | Internal state that carries information between steps. |
| **LSTM / GRU** | Long sequences | "Memory" mechanisms that mitigate gradient vanishing. |
| **Transformer** | Sequences in general | **Attention** mechanism (*self-attention*, *multi-head attention*); parallelizable. Basis of LLMs and Generative AI. |
| **Autoencoders / GAN** | Generation, compression | Encoding-decoding and generator-discriminator competition. |

**Success of DL — factors:**

- More layers + **semantics** per layer (low → mid → high-level features).
- Libraries (TensorFlow, PyTorch, Keras).
- **Big Data** — enormous volumes of available data.
- **Hardware** (GPUs, TPUs, FPGAs, NPUs) → viable training.
- More efficient training algorithms.
- Networks with **millions of neurons**.

**Costs of DL:**

- Significant hardware (parallelism).
- Very long training (days, months), but **fast inference**.
- Relevant environmental impact (data center electricity consumption).

**Emblematic case — ImageNet / ILSVRC:** image classification/detection challenge with millions of annotated images. Classification error dropped from ~28% (2010) to ~2.3% (2017), surpassing human accuracy.

**Main tools:** Scikit-Learn, PyTorch, TensorFlow/Keras, Weka, KNIME, RapidMiner, Apache Mahout.

---

## 46. IARTI — Computer Vision

### 46.1. Scope

Automatic interpretation of images and video. Typical applications: industry (*bin picking*), health (assisted radiology, pneumonia detection in X-ray), autonomous vehicles, security.

### 46.2. Typical Pipeline (CNN)

1. **Raw data** (image).
2. **Low-level features** — edges, gradients (initial convolutional layers).
3. **Mid-level features** — textures, shapes.
4. **High-level features** — objects, classes.
5. **Classification** — softmax in the final (fully connected) layer.

**Essential operations:** *Convolution* + *ReLU* + *Pooling* (reduces dimension, preserves patterns).

### 46.3. Common Tasks

- **Classification** (image → class).
- **Detection** (image → bounding boxes + classes).
- **Segmentation** (image → per-pixel mask).
- **Facial recognition**, **3D reconstruction**, **image generation** (with GANs/ViT).

### 46.4. Visual Transformers (ViT)

Application of Transformer to image: divide the image into **patches**, project linearly, treat as a sequence. Recently, they have replaced CNNs in many tasks with superior performance on large datasets.

---

## 47. IARTI — Intelligent Robotics

### 47.1. Scope and Challenges

Intelligent Robotics = **Embodied AI**: physical agents with sensors (LiDAR, depth cameras, IMU, tactile sensors) and actuators (motors, arms, hands). Challenges:

- Perception of the real world (noise, lighting, occlusions).
- Trajectory planning and manipulation in a dynamic environment.
- Interaction with humans.
- Safety and reliability.

### 47.2. Typical Components (Service Humanoid)

- **Perception:** HD camera, LiDAR, depth camera, microphone array, TOF sensors (anti-fall), tactile sensors (hands).
- **Actuation:** motor joints (arms, legs, head, torso), dexterous hands with articulated fingers.
- **Processing:** CPU + GPU/SoC with AI capability.
- **Communication:** Wi-Fi, Bluetooth, speakers, screens.
- **Power:** rechargeable batteries (automatic docking).
- **Software:** firmware + development SDK + model integration (edge LLM, vision).

### 47.3. Research and Development Areas

- **Manipulation**: pick-and-place, manipulation of deformable objects, force control.
- **Locomotion**: bipedal, quadrupedal, with articulated arm (robotic dog).
- **Human-robot interaction (HRI)**: speech recognition, expression, gestures.
- **Autonomous navigation**: SLAM, semantic mapping, planning in unknown environments.
- **Reinforcement learning** applied to robotics (simulation → transfer to real).

### 47.4. Platform Examples

- **Humanoids**: Unitree G1, Booster T1, iGORY, Pepper, NAO, Optimus (Tesla), Atlas (Boston Dynamics).
- **Quadrupeds with arm**: Unitree Go2 + arm, Boston Dynamics Spot + arm.
- **Robotic hands**: Unitree Dex3-1 (3 fingers, 7 DoF, 33 tactile sensors, 10g–2.5kg perception).

**Cross-cutting goal:** endow robots with **intelligence** (perception + reasoning + learning), not just pre-programmed control.

---

## 48. IARTI — Natural Language, LLMs and Agents

### 48.1. Natural Language Processing (NLP)

Applications:

- **Understanding** sentences/texts.
- **Generation** of text.
- **Machine translation**.
- **Interfaces** (bots, assistants: Siri, Alexa, ChatGPT).
- **Code generation**.
- **Information access** (RAG — *Retrieval Augmented Generation*).
- **Text mining**.

### 48.2. Transformers and Generative AI

**Transformer** (Vaswani et al., 2017) introduced the **attention** mechanism (*self-attention*, *multi-head attention*) that replaces recurrences:

- **Encoder**: processes the input; produces contextual representations.
- **Decoder**: generates the output sequentially, with attention over the input and over the previous output.
- **Positional Encoding**: injects order into the sequence.
- **Parallelizable** (much faster training than RNNs).

Basis of:

- **LLMs** (*Large Language Models*): GPT, Claude, Gemini, Llama.
- **Multimodal Generative AI**: text, image (DALL·E, Stable Diffusion), video (Sora), code, audio, music.

**LLM evolutionary stack:**

```
Static prompts
 → Prompt templates
 → Contextual prompts
 → Prompt chaining
 → RAG (Retrieval-Augmented Generation)
 → Prompt pipelines
 → Autonomous agents
 → Prompt tuning / Soft prompts
```

### 48.3. Large Language Models (LLM)

- DL models trained on **large volumes of text** to **summarize, translate, predict, generate** text with almost human quality.
- Emergent capabilities: chain-of-thought reasoning, *few-shot learning*, tool use.
- **Limitations**: hallucinations, bias, prompt sensitivity, absence of updated factual knowledge (without RAG).

### 48.4. LLM-based Agents

- The LLM is no longer "just" a generator and becomes an **orchestrator** that decides which tools to invoke, what steps to execute, how to iterate.
- Patterns: **ReAct** (Reasoning + Acting), **Tool use**, **Planning**, **Reflection**.
- Applications: process automation, coding assistants, intelligent RPA.

### 48.5. Physical AI and the Next Step

**Physical AI** — integration of LLMs and generative models with **robots and physical systems**. E.g., commanding a humanoid in natural language, generating manipulation plans, adapting to real environments.

---

## 49. IARTI — Opportunities, Risks and Ethics in AI

### 49.1. AI Types (by capability)

| Type | Definition |
|---|---|
| **Narrow AI** | Systems that perform specific tasks; **it is the current state**. |
| **General AI (AGI)** | At the level of the best humans in the generality of tasks. |
| **Super AI (ASI)** | Broadly superior to the human being. |

**Singularity:** moment when AI reaches or surpasses the human level in all areas. Speculative and controversial concept.

### 49.2. Opportunities

- **Efficiency and automation** in industry, health, energy, logistics.
- **Decision support** (medical diagnosis, financial analysis, scientific research).
- **Knowledge discovery** (AlphaFold, materials, drugs).
- **New jobs**: Data Scientist, ML Engineer, Prompt Engineer, AI Ethics Officer, AI Auditor.
- **Augmentation of human capabilities** (cognitive extension: see better, decide better, act more safely).

### 49.3. Risks and Challenges

**Technical:**

- *Black box* / opacity — need for **XAI** (eXplainable AI).
- Hallucinations and silent errors.
- *Bias* in training data.
- Vulnerability to *adversarial attacks*.
- Dependence on large volumes of data and hardware.

**Economic and social:**

- Destruction of traditional jobs (translators, accountants, drivers, potentially software engineers).
- Concentration of technological power.
- Inequalities in access to AI.

**Ethical and legal:**

- **Privacy and data protection** (GDPR).
- **Informed consent** for automated decisions.
- **Responsibility** for AI decisions.
- **Manipulation** (deepfakes, disinformation).
- **Human autonomy** in critical decisions (e.g., autonomous weapons, medical decisions).
- **Bias and algorithmic discrimination**.

**Environmental:**

- Massive electricity consumption of training *data centers* (order of TWh).
- Carbon footprint associated with training and inference of LLMs and DL.
- Discussion on the cost-benefit of development.

### 49.4. Regulation and Best Practices

- **EU AI Act** (Regulation 2024/1689) — European framework by risk levels.
- **Principles**: transparency, *accountability*, human oversight, robustness, privacy, non-discrimination.
- **Responsible engineering practice:**
  - Document origin and quality of training data.
  - Evaluate *bias* and performance in subgroups.
  - Provide explanations and recourse mechanisms.
  - Maintain **human oversight** (*human-in-the-loop*) in critical decisions.
  - Use of AI by engineers: **responsibility is not transferred to the tool**.

### 49.5. The Vision of Extension (and not substitution)

AI is a **cognitive extension tool** — just as glasses, binoculars, microscopes amplify vision, AI amplifies reasoning, decision and action capabilities. The professional trained in AI must be able to **ideate, specify, develop, test, manage, maintain and evolve intelligent systems**, with ethical and social awareness.

---

## Cross-References (add to the final table)

| Topic | Part I | Part II (ASIST) | Part II (IARTI) |
|---|---|---|---|
| Formal logic / reasoning | §3, §4 | — | §41 |
| Algorithms and complexity | §13 | — | §42, §43, §44 |
| Knowledge representation | §2, §3 | — | §41 |
| Security and trust in systems | §16 | §31, §32, §33 | §49 |
| Ethics and governance | — | — | §49 |
| Domain modeling (knowledge) | §3 | — | §41 (formal basis) |
| Persistence and knowledge | §11, §21 | §26, §34 | §41 (knowledge bases), §45 (training data) |

# Addition to the Knowledge Base — SGRAI (Part II)

The complete block to integrate into **Part II** of the KB follows, after section 49. It maintains the style, density and level of abstraction of the ASIST and IARTI sections. **It does not replace anything that exists.**

**Update:** the subtitle of Part II should change from `(ASIST, IARTI, SGRAI)` → `(ASIST, IARTI, SGRAI — completed)`, and the introductory note no longer refers to "to be completed". The Part II index is complete with sections 50–56.

---

## Part II Index (final version)

```
**Part II Index**
23–39. ASIST — Systems Administration
40. IARTI — Fundamentals of Artificial Intelligence
41. IARTI — Logic and Logic Programming (PROLOG)
42. IARTI — Automatic Problem Solving: Uninformed Search
43. IARTI — Informed Search Methods and Optimization
44. IARTI — Genetic Algorithms
45. IARTI — Artificial Neural Networks and Deep Learning
46. IARTI — Computer Vision
47. IARTI — Intelligent Robotics
48. IARTI — Natural Language, LLMs and Agents
49. IARTI — Opportunities, Risks and Ethics in AI
50. SGRAI — Fundamentals of 3D Computer Graphics on the Web
51. SGRAI — Three.js: Base Concepts, Geometries and Lines
52. SGRAI — Transformations, Hierarchy and Model Loading
53. SGRAI — Materials and Lighting
54. SGRAI — Shadows, Sky and Textures
55. SGRAI — UV Mapping, Sprites and Billboard
56. SGRAI — Graphical Interfaces (lil-gui) and 3D Picking
```

---

## 50. SGRAI — Fundamentals of 3D Computer Graphics on the Web

### 50.1. Scope and Positioning

**SGRAI (Graphics Systems and Interaction)** studies the foundations and techniques to create, visualize and interact with **3D scenes in a web environment**, typically with **WebGL** (or **WebGPU**) as the graphics acceleration layer and **Three.js** as the abstraction library. It complements the software engineering courses (Part I), ASIST and IARTI: here the object of study is the **interactive visual representation** of information — not the business domain nor the infrastructure that supports it.

**Two major components:**
- **Graphics Systems** — how to describe, illuminate and render 3D objects in a perceptually plausible way.
- **Interaction** — how the user manipulates the virtual world (camera, picking, GUI, animation).

### 50.2. The Web Computer Graphics Stack

```
HTML + JavaScript (application)
        ↓
Three.js (high-level abstraction: Scene, Mesh, Material, Light, Camera)
        ↓
WebGL 2 / WebGPU (browser graphics context)
        ↓
GPU (triangle rasterization, shaders)
```

**Practical rule:** write the application in Three.js (not "raw" WebGL) unless there is a specific technical need; Three.js drastically reduces the *boilerplate* (shader compilation, buffer management, uniforms).

### 50.3. The Mental Model: Scene / Camera / Renderer

Every 3D application in Three.js is based on three fundamental components:

| Component | Question it answers | Examples |
|---|---|---|
| **Scene** | *What are we drawing?* | Root container; contains `Mesh`, `Light`, `Group`, `Object3D`, `Camera` (helper) |
| **Camera** | *How are we seeing?* | `PerspectiveCamera` (conical projection) or `OrthographicCamera` (parallel projection) |
| **Renderer** | *With what technology do we draw?* | `WebGLRenderer` (WebGL 2, with fallback) or `WebGPURenderer` (WebGPU with fallback to WebGL 2) |

**Rendering cycle:**
1. Build/update the scene (positions, rotations, materials).
2. Call `renderer.render(scene, camera)` per frame.
3. Repeat via `renderer.setAnimationLoop(animate)` (replaces the old `requestAnimationFrame`).

### 50.4. Axis Conventions

**Three.js uses a right-handed system:**
- **+X** to the right.
- **+Y** up.
- **+Z** "out of the screen" (towards the observer).

**Default camera:** positioned at the origin, looking at **−Z**. If an object is at the origin and the camera also is, the object is not visible (the camera must be moved away, typically `camera.position.z = 5`).

**Comparison with other conventions:**
- Blender exports by default with **+Y up** (OBJLoader handles the conversion).
- Traditional OpenGL is **−Z towards the screen**.

### 50.5. Cameras: Perspective vs Orthographic

| Characteristic | `PerspectiveCamera` | `OrthographicCamera` |
|---|---|---|
| Projection | Conical | Parallel |
| Parameters | `fov, aspect, near, far` | `left, right, top, bottom, near, far` |
| Feel | Realistic depth; distant objects appear smaller | No perspective distortion; "technical blueprint" |
| Typical use | Simulation, games, immersive visualization | Isometric view, CAD, editors |

**`fov`** (field of view) is the vertical angle (in degrees) of the camera frustum; **`aspect`** = width/height (prevents distortion); **`near`/`far`** define the *clipping planes* — objects outside this range are not drawn.

**Convention for `OrthographicCamera`:** `near` can be 0 but not negative; `far` must include the scene.

---

## 51. SGRAI — Three.js: Base Concepts, Geometries and Lines

### 51.1. Anatomy of a Minimal Application

```html
<script type="importmap">
{
  "imports": {
    "three": "https://unpkg.com/three@0.168.0/build/three.module",
    "three/": "https://unpkg.com/three@0.168.0/"
  }
}
</script>
<script type="module">
  import * as THREE from 'three';
  const scene    = new THREE.Scene();
  const camera   = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(innerWidth, innerHeight);
  document.body.appendChild(renderer.domElement);
</script>
```

**Critical points:**
- **Import map** allows `import 'three'` without a bundler; the version is **pinned** (avoids *breaking changes*).
- Modern Three.js supports **only WebGL 2** (WebGPU as a progressive alternative).
- `renderer.setSize` adapts the graphics buffer to the window size; without this the image becomes blurry.

### 51.2. Mesh — the Basic Visual Unit

A **`Mesh`** = **`Geometry`** + **`Material`**.

- **`Geometry`** — the **vertices and faces** (or indices, normals, colors, UVs).
- **`Material`** — how the surface reacts to light / how it is painted.

**Geometry and material can be shared** among multiple `Mesh` — memory advantage: creating 100 identical cubes uses 1 `BoxGeometry` + 1 `Material` (or few).

```js
const geometry = new THREE.BoxGeometry();
const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const cube     = new THREE.Mesh(geometry, material);
scene.add(cube);
camera.position.z = 5;
```

### 51.3. Native Geometries (Built-in)

**Flat shapes and circles:**

| Geometry | Main parameters | Use |
|---|---|---|
| `PlaneGeometry(w, h, wSeg, hSeg)` | width, height, segments | Floor, walls, "frames"; segment for better lighting |
| `CircleGeometry(r, seg)` | radius, segments | Discs, "coins", icons |

**Solids:**

| Geometry | Notes |
|---|---|
| `BoxGeometry(w, h, d, wSeg, hSeg, dSeg)` | Cube/parallelepiped; segmentation affects per-vertex lighting quality |
| `SphereGeometry(r, wSeg, hSeg)` | Sphere; `r` = radius |
| `CylinderGeometry(rTop, rBottom, h, radialSeg)` | Cylinders and truncated cones |
| `ConeGeometry(r, h, radialSeg)` | Cones |
| `TorusGeometry(r, tubeR, radialSeg, tubularSeg)` | Rings |
| `TorusKnotGeometry(...)` | Toroidal knots |
| `TetrahedronGeometry`, `OctahedronGeometry`, `DodecahedronGeometry`, `IcosahedronGeometry` | Regular polyhedra |

**Derived shapes (more advanced):**

| Geometry | Input | Use |
|---|---|---|
| `ExtrudeGeometry` | `Shape` 2D + depth | Extrusion of profiles (letters, outlines) |
| `LatheGeometry` | vector of 2D points | Revolution (vases, bottles) |
| `ParametricGeometry` | function `(u,v) → (x,y,z)` | Parametric mathematical surfaces |
| `ShapeGeometry` | `Shape` 2D | Arbitrary polygons in the plane |
| `TextGeometry` | 3D font + string | 3D text |
| `TubeGeometry` | 3D `Curve` + radius | Tubes along curves |

### 51.4. `BufferGeometry` — Generic Geometry

**Base class** of all geometries above. Stores data in **TypedArrays** ready for GPU upload:

- **Positions** (vertices).
- **Indices** (triangle connections).
- **Normals** (for lighting).
- **Colors**, **UVs**, etc.

**Indexed vs. Non-Indexed:**

| Approach | Description | Cost |
|---|---|---|
| **Non-indexed** | Each triangle repeats the vertex coordinates | Duplicates shared vertices |
| **Indexed** | Unique vertices + index array pointing to them | Eliminates duplication; preferable |

**Example — square (2 triangles) indexed:**
```js
const vertices = [
  new THREE.Vector3(-5,  5, 0),  // 0
  new THREE.Vector3(-5, -5, 0),  // 1
  new THREE.Vector3( 5, -5, 0),  // 2
  new THREE.Vector3( 5,  5, 0),  // 3
];
const indices = [0, 1, 3,  1, 2, 3];   // triangle A: 0-1-3; triangle B: 1-2-3
const geometry = new THREE.BufferGeometry().setFromPoints(vertices);
geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
```

**Winding order:** Three.js draws by default faces with vertices in **counter-clockwise** order (seen from outside). This reduces to ~half the faces drawn on solids.

**`DoubleSide`** — material that draws both sides (necessary for surfaces without thickness, e.g., planes):
```js
new THREE.MeshBasicMaterial({ color: 0x0000ff, side: THREE.DoubleSide })
```

### 51.5. Lines and Line Types

| Class | Behavior |
|---|---|
| `Line` | Continuous polyline (N vertices → N−1 segments) |
| `LineLoop` | Like `Line` but connects the last to the first (closes the cycle) |
| `LineSegments` | Each pair of vertices forms an independent segment (vertices 0-1, 2-3, …) |

**`Line` example:**
```js
const material = new THREE.LineBasicMaterial({ color: 0x0000ff });
const points = [
  new THREE.Vector3(-10, 0, 0),
  new THREE.Vector3(  0, 10, 0),
  new THREE.Vector3( 10, 0, 0)
];
const geometry = new THREE.BufferGeometry().setFromPoints(points);
scene.add(new THREE.Line(geometry, material));
```

**`LineDashedMaterial`** — dashed line:
```js
new THREE.LineDashedMaterial({ color: 0xd00000, dashSize: 3, gapSize: 1, scale: 1 })
```
- Mandatory: `line.computeLineDistances()` **after** creating the line (otherwise the dash does not work).
- `linewidth > 1` is **ignored** in most WebGL implementations (known limitation).

### 51.6. Animation

```js
function animate() {
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.02;
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);   // better than manual requestAnimationFrame
```

**`setAnimationLoop`** synchronizes with the screen refresh and is recommended in modern Three.js (replaces `requestAnimationFrame(animate)`).

---

## 52. SGRAI — Transformations, Hierarchy and Model Loading

### 52.1. The Three Fundamental Transformations (TRS)

**Every `Object3D`** has three properties (all `Vector3` except `rotation` which is `Euler`):

| Property | Effect | Methods |
|---|---|---|
| `position` | Translation | `translateX/Y/Z(delta)` |
| `rotation` | Rotation (Euler: `x, y, z` in radians) | `rotateX/Y/Z(delta)` |
| `scale` | Scale | `scale.set(x, y, z)` |

**Important differences:**

- `cube.rotation.z += 0.01` (increment on the **local** Z axis) ≠ `cube.rotateZ(0.01)` (rotates around the **local** Z axis, applies in Euler order).
- `cube.position.x += 0.01` (translation on the **parent's** X axis) ≠ `cube.translateX(0.01)` (translation on the **object's own** X axis, after rotation).
- **Negative `scale`** → mirror effect.

**Intrinsic application order:** TRS transformations are composed as **T · R · S** (translation, then rotation, then scale) — order matters.

### 52.2. Scene Hierarchy (Scene Graph)

The scene is a **tree** where:
- Each node is an **`Object3D`** (or subclass: `Mesh`, `Group`, `Light`, …).
- Nodes in the **same branch** accumulate transformations.
- Nodes in **different branches** are independent.

**Fundamental consequence:** moving a parent **moves all children** — the parent's transformation applies in cascade.

**Example — articulated doll (head/torso/arm/forearm):**
```
Group (root)
├── T + R + S → torso (Mesh)
│   ├── T + R → head (Mesh Sphere)
│   └── arm (Group):
│       ├── T + R + T → shoulder (Mesh Cube)
│       └── T + R + T + S → forearm (Mesh Cube)
```

**`Group` vs `Object3D`:** functionally identical; `Group` exists only for **semantic clarity** (indicates "this is a logical grouping, not a visual object").

### 52.3. Geometry Sharing

`makeInstance(geometry, color, x)` — function that returns a `Mesh` with the same `Geometry` and a new `Material`:

```js
function makeInstance(geometry, color, x) {
  const material = new THREE.MeshPhongMaterial({ color });
  const cube = new THREE.Mesh(geometry, material);
  cube.position.x = x;
  return cube;
}
scene.add(makeInstance(geometry, 0x44aa88,  0));
scene.add(makeInstance(geometry, 0x8844aa, -2));
scene.add(makeInstance(geometry, 0xaa8844,  2));
```

**Advantage:** 1 `BufferGeometry` + 3 `Material` → much less GPU memory than 3 identical geometries.

### 52.4. Loading External Models

**Supported formats (with loaders):**

| Format | Loader | Notes |
|---|---|---|
| **OBJ** | `OBJLoader` | Geometry + groups; no embedded materials |
| **MTL** | `MTLLoader` | Materials for OBJ; referenced separately |
| **GLTF / GLB** | `GLTFLoader` | Modern standard; geometry + materials + animations + hierarchy in a single file |
| **FBX, STL, PLY, DAE** | specific loaders | Legacy/industry formats |

**Blender → OBJ/MTL → Three.js pipeline:**

1. **Export** to OBJ in Blender (with `Apply Modifiers`, `Write Normals`, `Include UVs`, `Write Materials`).
2. **Unpack textures:** `File → External Data → Unpack All into Files`; choose `Write Files to Current Directory`.
3. Place `.obj`, `.mtl` and images **in the same folder**.
4. Load:
   ```js
   const mtlLoader = new MTLLoader();
   mtlLoader.load('windmill.mtl', (mtl) => {
     mtl.preload();
     objLoader.setMaterials(mtl);
     objLoader.load('windmill.obj', (root) => scene.add(root));
   });
   ```

**Common problems with OBJ/MTL:**

- **One-sided material:** fix with `mtl.materials.Material.side = THREE.DoubleSide`.
- **Normal map ignored:** MTLLoader expects `map_Bump` but Blender exports `norm`; **edit the `.mtl`** with a text editor to swap the keyword.
- **Textures not loading:** verify that `.jpg`/`.png` files are in the correct folder and that the loader has permission to fetch them (CORS on static servers).

**GLTF/GLB** is preferable for new projects: **single binary**, embedded materials, animations and hierarchy included.

### 52.5. Helper Utilities

Three.js includes **helpers** that make debugging easier: `DirectionalLightHelper`, `PointLightHelper`, `SpotLightHelper`, `CameraHelper`, `AxesHelper`, `GridHelper`. They are `Object3D` that draw the visual representation of the corresponding object — they do not affect the final scene render.

---

## 53. SGRAI — Materials and Lighting

### 53.1. Materials: Realism Scale

| Material | Lighting? | Realism | Properties |
|---|---|---|---|
| **`MeshBasicMaterial`** | **No** | Flat (no shading) | `color`, `opacity`, `transparent` |
| **`MeshLambertMaterial`** | Yes (diffuse) | Matte / dull | `color`, `emissive` |
| **`MeshPhongMaterial`** | Yes (diffuse + specular) | Plastic / shiny | `color`, `shininess`, `specular` |
| **`MeshStandardMaterial`** | Yes (PBR) | Physical (metal/rough) | `color`, `metalness`, `roughness`, `envMap` |
| **`MeshPhysicalMaterial`** | Yes (extended PBR) | Glass, clearcoat, etc. | Adds `transmission`, `clearcoat`, etc. |

**Choice rule:**
- **Basic** — "non-light-interactive" surfaces (HUD, backgrounds).
- **Lambert** — matte surfaces (unpolished wood, fabric).
- **Phong** — plastic, ceramic, simple polished metals.
- **Standard (PBR)** — physically correct result; ideal when there is an `envMap` and we want quality; **more costly**.
- **Physical** — only with specific requirements (glass, water, car paint).

### 53.2. Lighting: Types

| Type | Direction | Shadows | Cost | Typical use |
|---|---|---|---|---|
| **`AmbientLight`** | No direction; illuminates everything equally | No | Trivial | Avoid absolutely black zones; low intensity |
| **`HemisphereLight`** | Two colors: sky (up) / ground (down) | No | Trivial | Soft outdoor lighting (natural environment) |
| **`DirectionalLight`** | Parallel rays (direction defined by `position` and `target`) | Yes | Low | Sun, directional fill light |
| **`PointLight`** | Point that emits in all directions (attenuation with distance) | Yes (6 cameras — slow) | Medium-high | Lamps, torches |
| **`SpotLight`** | Cone from a point (2 cones: inner + outer) | Yes (1 perspective camera) | Medium | Spots, spotlights |
| **`RectAreaLight`** | Rectangular area (diffuse window light) | **No** (by default) | Medium | Softbox simulation |
| **`SunLight`** *(addon)* | Like `DirectionalLight` but with **cascaded shadow maps** | Yes (optimized) | Medium | Large outdoor scenes (realistic sun) |

**Common properties:** `color` (hex), `intensity` (float).

**`RectAreaLight` — restrictions:**
- Only works with `MeshStandardMaterial` and `MeshPhysicalMaterial`.
- Requires `RectAreaLightUniformsLib.init()` before use.
- **Does not use `target`** — oriented by `rotation`.

**`SpotLight` — key properties:**
- `angle` — **outer** cone angle (in radians; use `THREE.MathUtils.degToRad(degrees)`).
- `penumbra` — percentage of the outer cone corresponding to the **inner** cone; light fades between the two.
- `decay`, `distance` — attenuation with distance.

**`SunLight` — note:**
- Explicitly imported: `import { SunLight } from 'three/addons/lights/SunLight.js'`.
- No `target` (direction is position → origin).
- Generates **cascaded shadow maps** for large outdoor scenes.

### 53.3. Lighting Best Practices

- **Never leave the scene in absolute black** — `AmbientLight` (even with intensity 0.01–0.1) avoids completely dark zones.
- **Typical 3-point combination:** a main `DirectionalLight` + `AmbientLight` for fill + `HemisphereLight` for natural environment.
- **Helpers** (`DirectionalLightHelper`, `CameraHelper`) visually show what each light is doing — useful for debugging.
- **Lighting affects the final result:** the same `Material` changes radically depending on the light scheme.
- **`envMap` (Environment Map)** — IBL (Image-Based Lighting) technique for reflections; essential in **`MeshStandardMaterial`**.

### 53.4. Environment Maps and Cube Mapping

**Environment mapping** — image-based lighting approximation for reflective surfaces.

**Cube Mapping** — the environment is projected onto the 6 faces of a cube:

```js
const loader = new THREE.CubeTextureLoader();
loader.setPath('textures/cube/Bridge2/');
const textureCube = loader.load([
  'posx.jpg', 'negx.jpg', 'posy.jpg', 'negy.jpg', 'posz.jpg', 'negz.jpg'
]);
textureCube.mapping = THREE.CubeReflectionMapping;   // default
// or:
textureCube.mapping = THREE.CubeRefractionMapping;   // refraction (glass)

scene.background = textureCube;                       // optional
material.envMap = textureCube;
```

**Environment map limitations:**
- All radiation comes from **infinity** — no parallax.
- The object **does not see its own reflection** (it is convex, does not self-reflect).
- Only the environment is reflected, not other objects in the scene.

**For dynamic and realistic reflections:** use `RenderTarget` or `CubeCamera` (outside the introductory scope).

---

## 54. SGRAI — Shadows, Sky and Textures

### 54.1. How Shadows Work in Three.js

Three.js uses **shadow maps**. For each light that casts shadows:
1. The scene is **rendered from the light's point of view** (virtual camera at the light, pointing to the scene).
2. The result is a **depth texture** (shadow map).
3. In the final render, each fragment tests whether it is **"behind"** the geometry seen by the light — if so, it is in shadow.

**Cost consequence:** with N lights that cast shadows, the scene is rendered **N+1 times** per frame.

### 54.2. Enabling Shadows (3 levels)

```js
// 1. Renderer
renderer.shadowMap.enabled = true;

// 2. Light (DirectionalLight, PointLight, SpotLight or SunLight)
light.castShadow = true;

// 3. Mesh — each one chooses what it does
mesh.castShadow    = true;   // casts shadow
mesh.receiveShadow = true;   // receives shadow
```

**Possible combinations:**
- `castShadow=true, receiveShadow=false` — object that casts but does not receive (e.g., pole).
- `castShadow=false, receiveShadow=true` — floor that receives but does not cast (e.g., plane).
- `castShadow=true, receiveShadow=true` — object that does both (common).

### 54.3. Shadow Camera Configuration

**`DirectionalLight`** — orthographic camera (parallel):

```js
light.shadow.camera.left   = -20;
light.shadow.camera.right  =  20;
light.shadow.camera.top    =  20;
light.shadow.camera.bottom = -20;
light.shadow.mapSize.width  = 1024;   // default 512
light.shadow.mapSize.height = 1024;
```

**`SpotLight`** — perspective camera (fov controlled by `light.angle`).

**`PointLight`** — **6 cameras** (one per cube face) → **very slow**; avoid in scenes with shadows.

**`mapSize` trade-off:**
- Larger `mapSize` → sharper shadows.
- But: more memory + more pixels → **slower**.
- Rule: use the minimum viable for the desired effect; each GPU has its own limits.

**Typical shadow problem:** the light frustum is too small → "cut off" shadows. Solution: widen `left/right/top/bottom` **only as necessary** (widening too much degrades resolution).

**Useful helpers:**
```js
scene.add(new THREE.CameraHelper(light.shadow.camera));
```
Shows the light camera frustum; helps diagnose.

### 54.4. Cascaded Shadow Maps

For large outdoor scenes, the `DirectionalLight` frustum is divided into **cascades** based on distance to the camera:

- **Near objects** — cascade with high resolution.
- **Distant objects** — cascade with lower resolution (less detailed shadows, but still plausible).
- **Blending** between adjacent cascades — smooth transition.

**`SunLight`** implements this mechanism automatically.

### 54.5. Fake Shadows

**Cheap alternative** for simple scenes: draw a **dark ellipse/texture** under the object (via `Texture` with alpha channel).

- **Advantage:** almost null cost.
- **Disadvantage:** does not react to light changes, does not interact with real geometry.

Useful in scenes with many objects, mobile devices, or when real shadows are not critical for reading the scene.

### 54.6. Sky (Sky and SkyMesh)

Three.js provides two objects for realistic sky:

| Class | Backend | Notes |
|---|---|---|
| **`Sky`** | WebGL | Addon; simulates atmosphere with Rayleigh/Mie shaders |
| **`SkyMesh`** | WebGPU | Modern version for the WebGPU backend |

**Cost:** sky with atmospheric shaders is **heavier** than a solid color or a `CubeTexture` as background — reserve for scenes where the sky is a relevant visual element.

### 54.7. Textures: Fundamental Concepts

A **`Texture`** is essentially a wrapper over an **HTML image** with specific definitions for graphics use. It can come from:
- **Image files** (`TextureLoader`): PNG, JPG, GIF, BMP.
- **Specialized formats** (HDR, EXR, TGA): dedicated loaders (`RGBELoader`, `EXRLoader`, `TGALoader`).
- **Video** (`VideoTexture`).
- **Canvas** (`CanvasTexture`).
- **3D textures** (`Data3DTexture`).
- **Cubemaps** (`CubeTextureLoader`) — environment.
- **Compressed textures** (Ktx2, DDS) — performance.

**Asynchronous loading — attention:**
```js
const texture = new THREE.TextureLoader().load('earth.jpg');
material.map = texture;
```
If the scene renders **before** the image is loaded, the material appears **black**. Solution: `loader.load(url, onLoad, onProgress, onError)` and only then `render()`; or use a `LoadingManager`.

### 54.8. Main Properties of a Texture

| Property | Effect | Notes |
|---|---|---|
| **`offset`** | Offset (Vector2) | `texture.offset.set(u, v)` |
| **`repeat`** | Repetition (Vector2) | `texture.repeat.set(nx, ny)` |
| **`rotation`** | Rotation (radians) | Rotates the texture on the surface |
| **`center`** | Rotation center (Vector2) | Default `(0, 0)` = bottom-left corner |
| **`wrapS`** | Horizontal behavior (U) | `RepeatWrapping`, `ClampToEdgeWrapping`, `MirroredRepeatWrapping` |
| **`wrapT`** | Vertical behavior (V) | Same |
| **`minFilter`** | Filter when **far** | `LinearFilter`, `NearestFilter`, `LinearMipmapLinearFilter` (default) |
| **`magFilter`** | Filter when **near** | Same |
| **`anisotropy`** | Quality on inclined surfaces | Increases quality at performance cost |

**WebGL 1 restriction (historical):** `repeat` only works if the image dimensions are **powers of 2** (2, 4, 8, …, 2048). **WebGL 2 removes this limitation** — modern Three.js uses WebGL 2, so it is not a problem.

### 54.9. Texture Maps in Materials (PBR)

`MeshStandardMaterial` accepts multiple maps that combine:

| Map | Property | Effect |
|---|---|---|
| **Base color** | `map` | Diffuse surface color |
| **Bump (fake)** | `bumpMap` + `bumpScale` | Simulates small bumps via shading |
| **Normal** | `normalMap` + `normalScale` | Perturbs the normal per pixel — more realistic than bump |
| **Roughness** | `roughnessMap` | Spatial variation of roughness |
| **Metalness** | `metalnessMap` | Spatial variation of metalness |
| **Ambient occlusion** | `aoMap` | Shading in corners/crevices |
| **Alpha** | `alphaMap` | Transparency (combined with `transparent: true`) |
| **Emissive** | `emissiveMap` | Regions that emit light |

**Material-texture interaction:** the **material color (`material.color`) modulates the texture**. If `color = 0xFFFFFF` (white), the texture remains faithful. If `color = 0xFFFF00` (yellow), the texture becomes yellowish. This allows **reusing the same texture** for color variations.

**Example — Earth with multiple maps:**
```js
const loader = new THREE.TextureLoader();
material.map        = loader.load('earthmap1k.jpg');
material.bumpMap    = loader.load('earthbump1k.jpg');   material.bumpScale    = 0.3;
material.roughnessMap = loader.load('earthroughness1k.jpg');
```

**Cloud layer with alpha:**
```js
const cloudMat = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.9,
  alphaMap: loader.load('earthcloudsa1k.jpg'),
  side: THREE.DoubleSide
});
const cloudMesh = new THREE.Mesh(sphereGeo, cloudMat);
earthMesh.add(cloudMesh);   // inherits Earth's rotation
```

### 54.10. Where to Obtain Textures

- **Three.js examples repository** (`examples/textures`) — free, public domain.
- **Dedicated sites:** freepbr.com, freestocktextures.com, 3dtextures.me, polyhaven (PBR).
- **Watch out for licenses** — always check terms of use before using in deliverable projects.

---

## 55. SGRAI — UV Mapping, Sprites and Billboard

### 55.1. The UV Mapping Problem

**Texture** is a 2D image. **3D surface** is a mesh. A **mapping** from each 3D vertex to a point on the image is necessary.

**UV coordinates:**
- **U** — horizontal image axis (0 to 1, from left to right).
- **V** — vertical image axis (0 to 1, from bottom to top).
- Independent of the image's **aspect ratio**: a 100×100 square and a 200×100 rectangle both map to (0,0)–(1,1).
- **Critical note:** the origin **(0,0)** is at the **bottom-left corner** in Three.js/OpenGL — frequently confused with other APIs (which use top-left).

**Native geometries already have UVs defined:**
- `SphereGeometry` — spherical projection (equirectangular).
- `BoxGeometry` — each face with (0,0)–(1,1).
- `CylinderGeometry` — cylindrical projection.
- `PlaneGeometry`, `CircleGeometry` — direct planar projection.

**Custom UVs (via `BufferGeometry`):**
```js
const uvs = new Float32Array([
  // triangle A
  0.0, 1.0,   // v0 → top-left corner of the image
  0.0, 0.0,   // v1 → bottom-left corner
  1.0, 1.0,   // v2 → top-right corner
  // triangle B
  0.0, 0.0,  1.0, 0.0,  1.0, 1.0
]);
geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
```

**UVs can go outside [0,1]** — the behavior outside the range depends on `wrapS`/`wrapT` (see §54.8). Values like (2, 0) repeat the image **twice** horizontally if `wrapS = RepeatWrapping`.

**3D modeling software** (Blender, Maya) manages complex UV mapping — exporting the geometry with ready-made UVs is preferable to doing this manually in code.

### 55.2. Sprites and Billboard

**Billboard** — object that **is always facing the camera**, regardless of scene rotation. Useful for:
- **Labels** (object names).
- **HUD icons**.
- **"Fake 3D" elements** (trees, clouds, particles) — much cheaper than complete 3D models.

**In Three.js: `Sprite` + `SpriteMaterial`.**

| Aspect | `Mesh` | `Sprite` |
|---|---|---|
| Geometry | Explicit (`BoxGeometry`, etc.) | **None** (implicit: quad facing the camera) |
| Material | `MeshStandardMaterial`, etc. | **`SpriteMaterial`** (mandatory) |
| Rotation | Free in X, Y, Z | **Only in Z** (roll) — because X/Y are fixed to the camera |
| Scale | `scale.set(x,y,z)` | `scale.set(x,y,1)` — Z ignored |

```js
const spriteMat = new THREE.SpriteMaterial({
  map: new THREE.TextureLoader().load('label.png'),
  transparent: true,
  color: 0xffffff
});
const sprite = new THREE.Sprite(spriteMat);
sprite.position.set(0, 5, 0);
sprite.scale.set(2, 1, 1);   // width 2, height 1 (maintains image aspect ratio)
scene.add(sprite);
```

**Sprite advantages:**
- **Performance** — 1000 trees in `Sprite` vs. 1000 trees in `Mesh` → drastic reduction in draw calls.
- **Simplicity** — no dealing with 3D geometry for flat objects.

**Limitations:**
- No own shadows (it is always a flat quad facing the camera).
- No "real" depth interaction — if the Sprite is behind a 3D object, it may be occluded, but depth reading can be confusing.

---

## 56. SGRAI — Graphical Interfaces (lil-gui) and 3D Picking

### 56.1. lil-gui — Controls for the Scene

**lil-gui** is a lightweight GUI library that allows **modifying JavaScript variables in real time**, without redeploy. It is the maintained fork of **dat.gui** (Google Data Arts Team, discontinued).

**Advantages for 3D development:**
- Adjust parameters (position, color, opacity) and see the result **immediately**.
- **Debugging** of interactive scenes.
- **Demos** for stakeholders — without needing to change code.

**Import** (Three.js ≥ r131 includes lil-gui in examples):
```js
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
```

**Basic structure:**
```js
const gui = new GUI();

// Folder with controls
const earthFolder = gui.addFolder('Earth');
earthFolder.add(earthMesh.rotation, 'x', 0, Math.PI * 2);
earthFolder.add(earthMesh.rotation, 'y', 0, Math.PI * 2);
earthFolder.open();

// Slider with min/max/step
gui.add(cloudMaterial, 'opacity').min(0).max(1).step(0.25);

// Dropdown of named values
gui.add(cloudMaterial, 'opacity', { None: 0, Std: 0.5, Full: 1 });

// Boolean
gui.add(cloudMaterial, 'transparent');

// Free text
gui.add(cloudMaterial, 'metalness');

// Color — requires onChange
const params = { color: 0xffffff };
gui.addColor(params, 'color').onChange(() => {
  cloudMaterial.color.set(params.color);
});

// Synchronization — gui reflects external changes
earthFolder.add(earthMesh.rotation, 'y', 0, Math.PI * 2).listen();

// Application internal state (animation parameters)
const animParams = { speedEarth: 1.0, speedClouds: 1.0 };
gui.add(animParams, 'speedEarth').min(-2).max(2).step(0.1);
```

**`.listen()`** — when the value is changed outside the GUI (animation, event), the slider updates automatically.

**Typical pattern:** one `folder` per logical group (Earth, Camera, Lights, Animation) — clear visual hierarchy.

### 56.2. 3D Picking — Detecting Clicks on Objects

**Picking** — discovering **which object** the user clicked/touched in the 3D scene.

**Raycasting** (standard technique):
1. Convert the mouse position (2D, in pixels) into a **normalized coordinate** (NDC — Normalized Device Coordinates) between −1 and +1.
2. Launch a **ray** from the camera, through the corresponding frustum point.
3. Calculate **intersections** with the triangles of each object.
4. The **closest** object is the one "hit".

**Three.js: `Raycaster`.**

### 56.3. Normalizing the Mouse Position

```js
function getCanvasRelativePosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * canvas.width  / rect.width,
    y: (event.clientY - rect.top ) * canvas.height / rect.height
  };
}

function setPickPosition(event) {
  const pos = getCanvasRelativePosition(event);
  pickPosition.x =  (pos.x / canvas.width ) * 2 - 1;   // [-1, +1]
  pickPosition.y = (pos.y / canvas.height) * -2 + 1;   // [-1, +1] — V inverted!
}

function clearPickPosition() {
  // "Far" values — makes the ray hit nothing
  pickPosition.x = -100000;
  pickPosition.y = -100000;
}

window.addEventListener('mousemove', setPickPosition);
window.addEventListener('mouseout',  clearPickPosition);
window.addEventListener('mouseleave', clearPickPosition);
```

**Critical points:**
- **NDC coordinates** — X and Y between −1 and +1; Z implicit from `setFromCamera`.
- **V inverted** — in the browser, Y grows **downwards**; in 3D space, Y grows **upwards**. Multiplying by −2 and adding 1 corrects this.
- **`getBoundingClientRect`** — ensures correction if the canvas does not occupy the entire window.
- **`clearPickPosition`** — if the mouse leaves the canvas, "clear" to avoid persistent picking.

**Touch support (mobile):**
```js
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();                              // blocks scroll
  setPickPosition(e.touches[0]);
}, { passive: false });
canvas.addEventListener('touchmove',  (e) => setPickPosition(e.touches[0]));
canvas.addEventListener('touchend',   clearPickPosition);
```

### 56.4. `PickHelper` — Recommended Pattern

Encapsulate picking in a **class** (`Pure Fabrication`, see §4.1) — separates detection logic from application logic.

```js
class PickHelper {
  constructor() {
    this.raycaster = new THREE.Raycaster();
    this.pickedObject = null;
    this.pickedObjectSavedColor = 0;
  }

  pick(normalizedPosition, scene, camera, time) {
    // 1. Restore the color of the previously "picked" object
    if (this.pickedObject) {
      this.pickedObject.material.emissive.setHex(this.pickedObjectSavedColor);
      this.pickedObject = undefined;
    }

    // 2. Launch the ray
    this.raycaster.setFromCamera(normalizedPosition, camera);

    // 3. Intersections ordered by distance (first = closest)
    const intersected = this.raycaster.intersectObjects(scene.children);

    if (intersected.length > 0) {
      this.pickedObject = intersected[0].object;

      // 4. Save the emissive color and highlight (yellow/red flash)
      this.pickedObjectSavedColor = this.pickedObject.material.emissive.getHex();
      this.pickedObject.material.emissive.setHex(
        (time * 8) % 2 > 1 ? 0xFFFF00 : 0xFF0000
      );
    }
  }
}
```

**Use in `render`:**
```js
const pickHelper = new PickHelper();
function render(time) {
  time *= 0.001;                                        // seconds
  pickHelper.pick(pickPosition, scene, camera, time);
  renderer.render(scene, camera);
}
renderer.setAnimationLoop(render);
```

### 56.5. When to Perform Picking

- **Every frame** — real-time feedback when hovering the mouse (like the example above).
- **Only on click** — `mousedown`/`pointerdown` events instead of `mousemove`; more efficient.
- **Every N frames** — in heavy scenes, picking every 2-3 frames is sufficient.

**Cost:** `intersectObjects` traverses all triangles of all objects — in large scenes, consider:
- Filtering objects (`intersectObjects([target1, target2])` instead of `scene.children`).
- Using **bounding boxes** first (`Raycaster` already does this by default).
- For thousands of objects, consider optimizations (BVH).

---

## Cross-References (update final table)

| Topic | Part I | Part II (ASIST) | Part II (IARTI) | Part II (SGRAI) |
|---|---|---|---|---|
| Application architecture | §1, §7, §15 | — | — | §50, §51 |
| Design patterns | §4, §7 | — | — | §56.4 (`PickHelper`) |
| UI state management | §15 | — | — | §56 (lil-gui) |
| Performance / optimization | §13, §22 | §35, §38 | §45 | §51, §54, §55 |
| 3D computer graphics | — | — | §46 (Vision) | §50–§56 |
| Human-computer interaction | §15 | — | §47 (HRI) | §55, §56 |
| 3D modeling and assets | — | — | — | §52.4 (Blender → OBJ/GLTF) |

---

`(*End of Knowledge Base V. Master 4.1*)`
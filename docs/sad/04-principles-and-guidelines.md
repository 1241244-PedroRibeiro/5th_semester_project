# Architectural Principles and Guidelines

## 1. Modular Monolith and Architectural Style
The LaPrizza information system follows a **Modular Monolith** architecture during its initial development stages, structuring the back-end application into explicit business modules rather than a distributed microservices topology (ARQSI_04_architectural_styles.pdf, pp. 65-66). 
- **Simplicity Over Distributed Complexity:** Adheres directly to the fundamental course principle (*"First commandment of distributed systems: Don't distribute"*) to avoid unnecessary network latency, eventual consistency overhead, and deployment complexities unsuited for an iterative academic prototype (ARQSI_04_architectural_styles.pdf, pp. 23-24).
- **Encapsulated Boundaries:** Each business module owns its internal domain and persistence components while exposing explicit, versioned interfaces for inter-module collaboration (ARQSI_01_intro_SW_ARCH.pdf, p. 27; ARQSI_04_architectural_styles.pdf, p. 65)[cite: 27].

## 2. Separation of Concerns and Layered Architecture
The back-end codebase enforces a rigorous multi-layered structure based on Clean Architecture principles, ensuring that code responsibilities are cleanly partitioned (ARQSI_04_architectural_styles.pdf, pp. 17-21; 02 - Node.js - v2.pdf, p. 30):
- **Routing & Presentation Layer:** Express routers and middleware handle HTTP transport mechanics, boundary request schema validation (via Joi), and response formatting (02 - Node.js - v2.pdf, pp. 27, 52).
- **Controller Layer:** Thin orchestration components translating HTTP actions into service requests without containing business logic (02 - Node.js - v2.pdf, pp. 30-31).
- **Application Services Layer:** Coordinates transaction boundaries, use cases, and business workflows (ARQSI_04_architectural_styles.pdf, p. 18; 02 - Node.js - v2.pdf, p. 30).
- **Domain Layer:** Pure business entities, aggregates, and value objects encapsulating core domain rules, invariants, and calculations (ARQSI_04_architectural_styles.pdf, pp. 18, 20).
- **Persistence / Data Access Layer:** Repositories encapsulating database access, data mappers, and ORM schemas to isolate storage mechanisms from domain rules (ARQSI_04_architectural_styles.pdf, p. 18; 02 - Node.js - v2.pdf, pp. 30, 47).

## 3. The Dependency Rule
In accordance with Clean and Onion architectural styles, source code dependencies must point exclusively inwards (ARQSI_04_architectural_styles.pdf, pp. 18, 21; Uncle Bob, "The Clean Architecture"):
- **Inner Independence:** The core Domain layer is completely independent of external agencies, web frameworks, persistence drivers, and UI libraries (ARQSI_04_architectural_styles.pdf, pp. 18, 20).
- **Control of Direction:** Outer layers (Infrastructure, Persistence, Web Routing) depend on inner layers through explicit abstractions, never vice-versa (ARQSI_04_architectural_styles.pdf, pp. 18, 21).

## 4. API-First Design and RESTful Standards
External communication is governed by strict REST architectural constraints operating over HTTP (ARQSI_03_REST architectural style.pdf, p. 4; 01 - Introduction to Web Development.v2.pdf, p. 28):
- **Resource Taxonomy:** URIs identify domain concepts using plural nouns (e.g., `/api/v1/products`, `/api/v1/allergens`) rather than remote procedure call action verbs (ARQSI_03_REST architectural style.pdf, p. 7; 01 - Introduction to Web Development.v2.pdf, p. 40).
- **Uniform Interface:** Standard HTTP verbs (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) and RFC-compliant status codes (`200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `422`, `500`) are enforced uniformly (ARQSI_03_REST architectural style.pdf, pp. 13-15; 01 - Introduction to Web Development.v2.pdf, pp. 33, 41-53).
- **Machine-Readable Contracts:** All public endpoints are documented using OpenAPI 3.0 specifications to ensure seamless integration across frontend clients, 3D visualization modules, and AI planners (base-project-prompts.md, p. 1; LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, p. 13).

## 5. Domain-Driven Design (DDD) and Maintainability
Software design reflects the ubiquitous language and conceptual boundaries established in the system specification (LEI-2026-27-Sem5-Project_v1-SystemSpecification.pdf, pp. 8-10):
- **Aggregates and Invariants:** Business rules—such as component cardinality bounds, non-negative stock limits (`BCK09`), and referential deletion guards (`BCK02`–`BCK07`)—are modeled explicitly within domain aggregates and enforced persistently (LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, pp. 6-10).
- **Modular Cohesion:** Files and packages are organized by business capabilities rather than flat technical categories, reducing inter-module coupling and supporting long-term maintenance (ARQSI_01_intro_SW_ARCH.pdf, p. 27; principios orientadores ARQSI - English.pdf, p. 2)[cite: 2, 27].

## 6. Testability and Quality Assurance
Testability is treated as a primary architectural driver rather than an afterthought (ARQSI_04_architectural_styles.pdf, p. 19; 02 - Node.js - v2.pdf, p. 28):
- **Isolated Unit Testing:** Core domain rules, services, and value objects can be tested completely in isolation without requiring live database connections or network sockets (ARQSI_04_architectural_styles.pdf, p. 19; LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, p. 14).
- **Automated Integration Testing:** End-to-end API workflows are verified automatically using integration test suites (Supertest) to prevent regressions across sprint iterations (02 - Node.js - v2.pdf, p. 28; LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, p. 14).

## 7. Data Integrity and Persistence Constraints
Persistence mechanisms are designed to uphold absolute business consistency (LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, pp. 13-14):
- **Relational Constraints:** PostgreSQL enforces database-level referential integrity (`FOREIGN KEY ... ON DELETE RESTRICT`) and check constraints to protect business invariants against concurrent anomalies (02 - Node.js - v2.pdf, p. 36).
- **Reproducible Evolution:** Schema changes are version-controlled via formal database migration scripts and reproducible seed configurations (LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, pp. 13-14).

## 8. Incremental Evolution and Multi-Disciplinary Integration Roadmap
The architecture anticipates future system expansion without compromising current progress, establishing explicit integration contracts for multi-disciplinary components (LEI-2026-27-Sem5-Project_v1-SystemSpecification.pdf, pp. 11-13):
- **Mandatory vs. Optional 3D Visualization Scope (SGRAI):** For student cohorts enrolled in LAPR5, the 3D visualization module developed in WebGL / Three.js must be integrated directly into the client-side Single-Page Application (SPA). In direct accordance with course academic instructions, the mandatory 3D scenario is **Kitchen and Food Preparation Visualization (II.3.3.2)**, designed to spatially animate ovens, prep stations, and task progression in tandem with the scheduling system. The **Build Your Pizza (II.3.3.1)** scenario is designated as an optional, secondary module. Development of SGRAI components formally initiates in week 7 (Sprint 2), ensuring Sprint 1 remains dedicated to foundational back-end and domain models.
- **Frontend SPA Independence:** The team retains full autonomy over the frontend SPA framework selection (React, Angular, Svelte, or Vue), choosing React/TypeScript to maximize component composition, reactivity, and WebGL canvas encapsulation.
- **Decoupled AI Planning Integration (IART):** The Prolog AI food preparation scheduler consumes pending orders, activity dependency graphs, and resource capacities over stateless RESTful interfaces, providing optimized schedules that directly drive the 3D kitchen canvas.

## 9. Simplicity and Value Over Formalism
In strict accordance with ARQSI operational principles, artifacts and design patterns are adopted only when they provide tangible business or engineering value (principios orientadores ARQSI - English.pdf, p. 2)[cite: 2]:
- **Avoidance of Premature Complexity:** The team avoids introducing speculative architectural frameworks, overly complex distributed patterns, or unverified tools unless explicitly justified by concrete architectural drivers or user stories (principios orientadores ARQSI - English.pdf, p. 2)[cite: 2].

## 10. Architectural Traceability and Reasoning
Documentation serves as an active tool for thought, communication, and decision justification rather than a bureaucratic formality (principios orientadores ARQSI - English.pdf, pp. 1-2; ARQSI_02_sw_ach_documentation.pdf, p. 3)[cite: 1, 2, 36]:
- **Architecture as Argumentation:** Significant design choices are recorded via Architecture Decision Records (ADRs), capturing context, trade-offs, and consequences (principios orientadores ARQSI - English.pdf, p. 3)[cite: 3].
- **C4 Visualization:** System structure is mapped hierarchically using C4 Model views to communicate system context, containers, and components clearly to all stakeholders (C4_Model_Complete_BSc.pdf, pp. 7, 11)[cite: 92, 96].

---

## Comparative Log: Initial vs. Current Information

### Section: 8. Incremental Evolution and Multi-Disciplinary Integration Roadmap
* **Initial Information:**
  > "## 8. Incremental Evolution and Future Integration  
  > The architecture anticipates future system expansion without compromising current progress (LEI-2026-27-Sem5-Project_v1-SystemSpecification.pdf, pp. 11-13):  
  > - **Decoupled Consumers:** The REST API and modular back-end design ensure that upcoming modules—such as the Three.js 3D visualization canvas and the Prolog AI scheduling engine—can consume backend services without invasive refactoring (LEI-2026-27-Sem5-Project_v1-SystemSpecification.pdf, pp. 11-13; LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, p. 13)."
* **Current Information (Corrected):**
  > "## 8. Incremental Evolution and Multi-Disciplinary Integration Roadmap  
  > The architecture anticipates future system expansion without compromising current progress, establishing explicit integration contracts for multi-disciplinary components (LEI-2026-27-Sem5-Project_v1-SystemSpecification.pdf, pp. 11-13):  
  > - **Mandatory vs. Optional 3D Visualization Scope (SGRAI):** For student cohorts enrolled in LAPR5, the 3D visualization module developed in WebGL / Three.js must be integrated directly into the client-side Single-Page Application (SPA). In direct accordance with course academic instructions, the mandatory 3D scenario is **Kitchen and Food Preparation Visualization (II.3.3.2)**, designed to spatially animate ovens, prep stations, and task progression in tandem with the scheduling system. The **Build Your Pizza (II.3.3.1)** scenario is designated as an optional, secondary module. Development of SGRAI components formally initiates in week 7 (Sprint 2), ensuring Sprint 1 remains dedicated to foundational back-end and domain models.  
  > - **Frontend SPA Independence:** The team retains full autonomy over the frontend SPA framework selection (React, Angular, Svelte, or Vue), choosing React/TypeScript to maximize component composition, reactivity, and WebGL canvas encapsulation.  
  > - **Decoupled AI Planning Integration (IART):** The Prolog AI food preparation scheduler consumes pending orders, activity dependency graphs, and resource capacities over stateless RESTful interfaces, providing optimized schedules that directly drive the 3D kitchen canvas."
* **Justification:**
  Updated to incorporate formal course clarifications issued by the SGRAI Course Coordinator (Prof. João Paulo Pereira):
  1. Affirms that for LEI students enrolled in LAPR5, the 3D visualization cannot be a standalone sandbox and must be embedded within the project's web SPA.
  2. Clarifies that framework choice is non-prescriptive, legitimizing the team's architectural selection of React/TypeScript over Angular.
  3. Establishes the official curricular boundary that Section II.3.3.2 (*Kitchen Visualization*) is the mandatory baseline scenario integrating with Prolog, while Section II.3.3.1 (*Build Your Pizza*) is strictly optional.
  4. Notes that SGRAI implementation starts in Week 7 (Sprint 2), confirming that Sprint 1 implementation is entirely isolated to backend and foundational domain modeling.
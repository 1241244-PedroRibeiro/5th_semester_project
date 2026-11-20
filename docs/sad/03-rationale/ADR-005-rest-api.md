# ADR 005: REST API Architectural Style and Contract Documentation

- **Status:** Accepted

- **Context:**
The LaPrizza information system requires externalized access to its back-end capabilities, allowing interactions with management clients, future web front-end interfaces, interactive 3D WebGL modules, and external AI scheduling services (LEI-2026-27-Sem5-Project_v1-SystemSpecification.pdf, pp. 2, 11-13)[cite: 449, 458, 459, 460]. 
For Sprint 1, the back-end application must expose operational capabilities across eleven distinct user stories—including customer profiles, categories, allergens, multi-role products, pizza sizes, component types, size configurations, stock movements, predefined pizzas, and public catalogue queries (LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, pp. 4-10)[cite: 467, 468, 469, 470, 471, 472].

According to User Story `ARC03`, all business functionality must be exposed through well-defined, standardized interfaces with consistent resource naming, correct HTTP semantics, standardized response codes, input boundary validation, and machine-readable API documentation (LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, p. 13)[cite: 475]. 
Furthermore, the project principles state that published interfaces must be stable, versioned, and easily understood by all collaborating teams and modules (ARQSI_01_intro_SW_ARCH.pdf, p. 27; principios orientadores ARQSI - English.pdf, p. 2)[cite: 2, 27]. We need to formalize the API architectural style, contract conventions, and documentation framework adopted for the system.

- **Decision:**
We adopt the **REST (Representational State Transfer) architectural style** operating over HTTP, designed to achieve **Level 2 of the Richardson Maturity Model** with clean resource structures (ARQSI_03_REST architectural style.pdf, pp. 4, 24, 27; 01 - Introduction to Web Development.v2.pdf, pp. 28, 30)[cite: 148, 168, 171, 331, 333].

The API design adheres strictly to the following principles:
1. **Resource-Oriented URI Taxonomy (Nouns over Verbs):** Endpoints represent business entities and collections using plural nouns rather than remote procedure call (RPC) verbs (e.g., `/api/v1/products`, `/api/v1/pizza-sizes`, `/api/v1/allergens`) (ARQSI_03_REST architectural style.pdf, pp. 7, 9, 39; 01 - Introduction to Web Development.v2.pdf, pp. 37, 40)[cite: 151, 153, 183, 340, 342]. Sub-resources express explicit ownership or configuration associations (e.g., `/api/v1/products/{id}/size-configurations`) (ARQSI_03_REST architectural style.pdf, p. 7; 01 - Introduction to Web Development.v2.pdf, p. 40)[cite: 151, 342].
2. **Strict HTTP Method Semantics:** We strictly enforce standard uniform interface conventions (ARQSI_03_REST architectural style.pdf, pp. 12-13; 01 - Introduction to Web Development.v2.pdf, pp. 32-33)[cite: 156, 157, 335, 336]:
   - `GET`: Safe and idempotent retrieval of resource representations (ARQSI_03_REST architectural style.pdf, p. 13)[cite: 157].
   - `POST`: Non-idempotent creation of new resources within a collection or execution of complex domain operations (e.g., `/api/v1/stock/{id}/adjustments`) (ARQSI_03_REST architectural style.pdf, pp. 13-14, 53)[cite: 157, 158, 197].
   - `PUT`: Idempotent full replacement or atomic upsert of a targeted resource URI (ARQSI_03_REST architectural style.pdf, pp. 13-14)[cite: 157, 158].
   - `PATCH`: Selective, partial modification of resource state (e.g., updating active/inactive status) (01 - Introduction to Web Development.v2.pdf, p. 32)[cite: 335].
   - `DELETE`: Idempotent removal or safe deactivation of a resource (ARQSI_03_REST architectural style.pdf, pp. 13-14)[cite: 157, 158].
3. **Semantic HTTP Status Codes:** Every response conveys explicit processing status through RFC-compliant status codes (`200 OK`, `201 Created` with a `Location` header, `204 No Content`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `422 Unprocessable Entity`, and `500 Internal Server Error`) (ARQSI_03_REST architectural style.pdf, p. 15; 01 - Introduction to Web Development.v2.pdf, pp. 41-53)[cite: 159, 343, 344, 345, 346, 347, 348, 349, 350, 351, 352, 353, 354, 355].
4. **Representational Neutrality & Statelessness:** Data exchange utilizes standard `application/json` payloads with UTF-8 encoding (01 - Introduction to Web Development.v2.pdf, pp. 20, 28)[cite: 323, 331]. All communications are completely stateless, with authorization context passed in HTTP headers without server session state (ARQSI_03_REST architectural style.pdf, p. 21; 02 - Node.js - v2.pdf, p. 76)[cite: 165, 431].
5. **Contract First & Machine-Readable Documentation:** Contracts are formally declared and maintained using the **OpenAPI 3.0** specification, served interactively via Swagger UI middleware directly from the backend project (base-project-prompts.md, p. 1; LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, p. 13)[cite: 446, 475].

- **Alternativas consideradas:**

  ### 1. Remote Procedure Call (RPC) / Action-Based API (e.g., `/createProduct`, `/updateStock`)
  - *Description:* Designing URLs as verbs mapping directly to service methods (ARQSI_03_REST architectural style.pdf, pp. 9, 33)[cite: 153, 177].
  - *Pros:* Straightforward to mentally map against backend procedural code.
  - *Cons:* Violates REST design principles and the `ARC03` explicit acceptance criteria requiring uniform resources and HTTP semantics (ARQSI_03_REST architectural style.pdf, p. 9; LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, p. 13)[cite: 153, 475]; creates tight coupling between client invocation patterns and backend internal method signatures; eliminates HTTP intermediate caching benefits (ARQSI_03_REST architectural style.pdf, p. 10)[cite: 154].

  ### 2. GraphQL
  - *Description:* Exposing a single HTTP POST endpoint where clients define queries and mutations to request specific data graphs.
  - *Pros:* Prevents over-fetching and under-fetching, enabling frontend clients to tailor query responses precisely.
  - *Cons:* Unnecessary architectural complexity for the initial backend scope; compromises standard HTTP status code semantics (GraphQL often returns HTTP 200 with an internal error payload); adds schema parsing and authorization complexity that contradicts the course principle of simplicity and value over formalism (principios orientadores ARQSI - English.pdf, p. 2)[cite: 2].

- **Consequências:**

  ### Positivas
  - **Interoperability & Decoupling:** Conforms to universal HTTP conventions, enabling straightforward consumption by any technology client (React/Angular SPA, Three.js canvas, Prolog HTTP connectors, and curl/Postman testing suites) without proprietary client libraries (01 - Introduction to Web Development.v2.pdf, p. 2; ARQSI_03_REST architectural style.pdf, p. 71)[cite: 213, 305].
  - **Contract Consistency & Self-Documentation:** Using OpenAPI 3.0 ensures that the documentation is verifiable, machine-readable, and kept synchronized with production routes, fulfilling `ARC03` acceptance criteria (LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, p. 13; base-project-prompts.md, p. 1)[cite: 446, 475].
  - **Predictable Error Handling:** Standardized error envelopes accompanied by RFC HTTP status codes (`400`, `404`, `409`, `422`) allow clients to distinguish validation errors from internal server crashes without exposing internal database or stack trace details (ARQSI_03_REST architectural style.pdf, p. 15; LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, p. 13)[cite: 159, 475].

  ### Negativas / Trade-offs
  - **Non-CRUD Workflow Translation:** Complex domain operations (such as reducing stock or validating customized pizza configurations) cannot always be mapped to pure table CRUD; they must be modeled as first-class domain resources or process submissions (e.g., `POST /api/v1/stock/{id}/adjustments` rather than `PATCH /stock`) (ARQSI_03_REST architectural style.pdf, pp. 50, 52-53, 62)[cite: 194, 196, 197, 206].
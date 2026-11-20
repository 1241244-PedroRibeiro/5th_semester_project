# ADR 006: Automated Testing Strategy and Quality Assurance

- **Status:** Accepted

- **Context:**
The LaPrizza information system requires rigorous verification of its business rules, domain invariants, and API contracts as mandated by User Story `ARC05` (Automated Testing) (LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, p. 14)[cite: 476]. 
As domain complexity increases—spanning pricing rules, size-dependent component configurations, strict component type cardinalities, non-negative stock invariants, and JWT authentication guards—manual testing becomes inefficient and prone to regressions. 

According to ARQSI design guidelines, architectural layers must be testable in total isolation from external infrastructure components such as databases and network adapters (ARQSI_04_architectural_styles.pdf, p. 19; 02 - Node.js - v2.pdf, p. 28)[cite: 236, 383]. 
We need to establish a structured, repeatable, and automated testing strategy that satisfies the quality criteria for Sprint 1 and supports long-term system evolution.

- **Decision:**
We adopt a **Multi-Tiered Automated Testing Strategy** combining **Unit Testing** and **Integration Testing**, powered by **Jest** (or Vitest) and **Supertest** (base-project-prompts.md, p. 1; LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, p. 14)[cite: 446, 476].

The testing architecture is partitioned into two distinct scopes:
1. **Domain and Service Unit Tests:** Focused on pure business logic, value objects, domain entities, and application services. Repositories and external database calls are mocked or substituted with test doubles, allowing instantaneous execution and verifying complex business rules (e.g., validating that component cardinalities match component types or checking non-negative stock limits) in total isolation (ARQSI_04_architectural_styles.pdf, p. 19)[cite: 236].
2. **API Integration Tests (Supertest):** Focused on validating the HTTP perimeter. Tests execute end-to-end request/response cycles against the Express application mounted in test mode (without opening physical TCP listener ports), verifying routing middleware, Joi input validation payloads, authentication headers, and correct HTTP status codes (`200`, `201`, `400`, `401`, `404`, `409`) (02 - Node.js - v2.pdf, p. 28; base-project-prompts.md, p. 1)[cite: 383, 446].

- **Alternativas consideradas:**

  ### 1. Manual Testing Only
  - *Description:* Relying entirely on manual verification via Postman or browser clients after code modifications.
  - *Pros:* Zero initial setup overhead.
  - *Cons:* Violates User Story `ARC05` acceptance criteria which explicitly mandate automated test suites; highly prone to human error; fails to detect regressions introduced in underlying domain layers as new features are added across subsequent sprints (LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, p. 14)[cite: 476].

  ### 2. End-to-End (E2E) UI & Browser Testing Only (e.g., Cypress / Playwright)
  - *Description:* Testing business logic exclusively by driving automated browser interactions through the front-end user interface.
  - *Pros:* Validates the complete integrated stack from UI down to the database.
  - *Cons:* Excessively slow execution times; fragile against front-end markup changes; difficult to isolate specific domain business rule failures; impractical for back-end-focused development phases like Sprint 1 where the web application frontend is not yet fully implemented.

- **Consequências:**

  ### Positivas
  - **Regression Prevention & High Confidence:** Enables the team to refactor domain models or repository queries with immediate automated feedback confirming that existing business invariants remain intact (`ARC05`) (LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, p. 14)[cite: 476].
  - **Environment Portability:** Tests are repeatable and run seamlessly across any developer machine or continuous integration pipeline (GitHub Actions) without complex external environment setups (LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, p. 14)[cite: 476].
  - **Adherence to Clean Architecture:** Enforces architectural discipline; if a service or domain model is difficult to unit test without spinning up a database or mocking complex web frameworks, it indicates an architectural coupling flaw that must be refactored (ARQSI_04_architectural_styles.pdf, p. 19)[cite: 236].

  ### Negativas / Trade-offs
  - **Initial Development Overhead:** Writing automated unit and integration tests alongside production code requires additional upfront effort during early sprint days compared to code-first delivery.
  - **Test Maintenance:** Changes to business rule contracts or API response envelopes require corresponding updates in test assertions.
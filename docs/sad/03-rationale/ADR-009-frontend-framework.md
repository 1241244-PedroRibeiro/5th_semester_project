# ADR-009: Angular as the Front-End SPA Framework

- **Status:** Accepted
- **Date:** 2026-10-30
- **Decision Makers:** LaPrizza Development Team

## Context

LaPrizza requires a Single-Page Application (SPA) serving customers, restaurant employees, and managers. The interface must support authentication, role-dependent navigation, catalogue consultation, and management of products, categories, allergens, pizza sizes, component types, size-dependent configurations, stock, users, and predefined pizzas. Subsequent development will introduce ordering and preparation workflows.

The existing back-end uses NestJS and TypeScript and exposes REST endpoints with JWT authentication and role-based authorization. The front-end must consume these contracts while keeping presentation concerns separate from the business rules enforced by the back-end.

Several management workflows involve related fields and conditional validation. For example, a sellable product requires a selling price, a pizza component requires a component type, and component-size configurations associate a component with a pizza size, price, and applicable stock consumption. These workflows require consistent form state, validation feedback, and handling of API errors.

The SGRAI kitchen and food preparation visualization must be embedded in the SPA using WebGL / Three.js. The framework must therefore accommodate a canvas with its own rendering lifecycle alongside conventional forms and navigation. The framework choice is open to the team, as recorded in the client clarifications; Angular is not an academic requirement.

The alternatives considered are Angular, React, and Vue. The principal decision drivers are consistency across contributions, support for complex forms, maintainability, REST integration, testability, and compatibility with the required 3D visualization. No existing front-end implementation in this repository constrains the choice.

## Decision

The team adopts **Angular with TypeScript** for the LaPrizza front-end SPA.

The application will use:

1. **Standalone components organized by business capability:** Catalogue, products, configurations, stock, users, and kitchen visualization will have explicit feature boundaries. Shared controls and layout components will be reused across features.
2. **Angular Router:** Routes will separate customer, employee, and manager workflows. Feature routes will be lazy-loaded where appropriate, including the 3D kitchen, to avoid loading all application code at startup.
3. **Typed reactive forms:** Management screens will use explicit form models and conditional validators for related fields. Client-side validation will provide immediate feedback; the back-end remains responsible for authoritative validation and business invariants.
4. **Angular HttpClient and injectable API services:** Components will access REST resources through feature services. HTTP interceptors will centralize JWT attachment for requests to the configured back-end API and common authentication error handling. Request and response types will follow the actual API contracts; TypeScript types do not validate network payloads at runtime.
5. **Route guards and role-aware presentation:** Navigation and available actions will reflect the authenticated user's roles and account state. These controls improve the user experience; authorization remains enforced by the existing back-end guards.
6. **Encapsulated Three.js integration:** A dedicated component will own canvas initialization, resizing, rendering, and cleanup. The animation loop will avoid driving Angular template updates on every frame; only meaningful application events will update the surrounding UI. This decision does not require an Angular-specific Three.js wrapper.

This ADR supersedes the earlier React/TypeScript selection recorded in [Architectural Principles and Guidelines, section 8](../04-principles-and-guidelines.md#8-incremental-evolution-and-multi-disciplinary-integration-roadmap) and the React label in the [Level 2 container diagram source](../../architectural/component-diagram/component-diagram-l2.puml). Angular is the accepted framework for subsequent front-end implementation.

## Rationale

1. **Consistent application structure:** Angular supplies an integrated approach to routing, dependency injection, HTTP access, and forms. Using these facilities reduces the number of independent architectural choices the team must coordinate across management features. This is a project-specific maintainability preference, rather than a claim that other frameworks cannot support a consistent architecture.
2. **Fit for management forms:** Typed reactive forms provide explicit models for validation, dirty and touched states, and submission. They suit LaPrizza's conditional product fields and component-size configuration workflows without requiring the team to select a separate forms library.
3. **Conceptual continuity with NestJS:** TypeScript, injectable services, decorators, and dependency injection are already present in the back-end. Familiar concepts can help the team understand the front-end structure, although Angular components, templates, forms, and reactive programming still require separate learning. The two applications communicate through REST rather than sharing framework internals.
4. **Centralized API integration:** Injectable services and HTTP interceptors provide clear locations for endpoint access, authentication headers, and common error handling. This supports consistent behavior across stock, catalogue, product, and user screens.
5. **Testable responsibilities:** Components, API services, validators, and guards can be verified separately, with HTTP dependencies replaced in tests. This supports the isolation principles established in ADR-006.
6. **Compatibility with the complete application scope:** Three.js can be integrated directly into an Angular component. React's declarative 3D tooling is valuable, but the team gives greater weight to a cohesive framework for the full set of business workflows than to a framework-specific scene renderer.

## Alternatives Considered

### React with TypeScript

- **Advantages:** Flexible component composition, a choice of routing and form solutions, and declarative Three.js integration through React Three Fiber. React can support all required LaPrizza workflows.
- **Trade-offs:** A client SPA assembled around React requires additional choices for routing, forms, HTTP conventions, and server-state handling. The team would need to select and maintain a common combination of libraries and usage patterns across contributors. Hooks and effect lifecycles also require care when coordinating API requests and canvas resources.
- **Reason not selected:** The team prioritizes Angular's integrated application facilities and explicit form models over React's flexibility and React Three Fiber integration. This replaces the earlier preference for React; it does not indicate a compatibility limitation.

### Vue with TypeScript

- **Advantages:** HTML-oriented templates, reactive state, Single-File Components, and TypeScript support. Vue Router and Pinia provide official routing and shared-state solutions, and TresJS offers declarative Three.js integration.
- **Trade-offs:** The team would still need to establish conventions for forms, API access, dependency management, and feature organization. Developers must learn Vue's reactivity and Composition API. Vue can support complex applications; the decision is not based on a limitation in scale or capability.
- **Reason not selected:** Vue offers a viable balance of flexibility and structure, but Angular provides the specific combination of typed reactive forms, dependency injection, HTTP tooling, and routing selected for LaPrizza's management workflows.

## Consequences

### Positive Consequences

- Features share a common approach to forms, navigation, API access, and dependency injection.
- Conditional management forms can be modeled explicitly and reused consistently.
- The front-end retains TypeScript while communicating with the existing NestJS back-end through REST contracts.
- The kitchen visualization can remain an isolated feature with its own canvas lifecycle.
- Responsibilities can be tested independently, supporting maintenance as new workflows are introduced.

### Negative Consequences

- Angular introduces an initial learning cost for templates, reactive forms, dependency injection, and RxJS where used. NestJS familiarity only partially reduces this cost.
- A complete framework can require more initial structure than a minimal React or Vue prototype. The team must avoid adding abstractions or global state libraries without a concrete need.
- Framework and tooling upgrades require coordinated dependency maintenance.
- Direct Three.js integration requires explicit ownership of animation frames, event listeners, resize handling, and GPU resource cleanup. Rendering performance must be measured with representative scenes.
- Lazy loading and careful dependency selection are necessary to control startup costs. This decision makes no unmeasured claim that Angular is faster or produces smaller bundles than React or Vue.
- Existing architectural descriptions and diagram labels that select React need to be aligned with this accepted decision; historical records should preserve the earlier choice as superseded.

## Verification

During front-end implementation, verify the decision through representative workflows:

- Create and edit products with conditional price and component-type validation, displaying server-side validation and conflict responses.
- Authenticate users and verify role-dependent navigation, API authentication, and handling of unauthorized or forbidden responses.
- Adjust stock and refresh the displayed balance after success, while preserving back-end rejection messages for invalid operations.
- Enter and leave the lazy-loaded kitchen view repeatedly, checking canvas resizing, rendering responsiveness, and resource cleanup.
- Test API services, form validators, guards, and key user workflows with isolated dependencies where appropriate.

These checks describe expected implementation validation; this ADR does not assert that a front-end has already been implemented or tested.

## References

- [ADR-002 — Back-End Technology Stack](ADR-002-stack-choosing.md), [ADR-005 — REST API](ADR-005-rest-api.md), and [ADR-006 — Automated Testing](ADR-006-automated-testing.md).
- [BCK05 — Product Management](../../user-stories/BCK05/requirements.md) and [BCK08 — Component Size Configuration](../../user-stories/BCK08/requirements.md).
- [Client Questions and Clarifications](../../domain/client-questions.md) — SPA integration and freedom of framework selection.
- [Product DTOs](../../../backend/src/application/product/ProductDTOs.ts) and [Component Size Configuration Controller](../../../backend/src/presentation/http/controllers/ComponentSizeConfigurationController.ts).
- Angular documentation: [Dependency Injection](https://angular.dev/guide/di), [Typed Reactive Forms](https://angular.dev/guide/forms/typed-forms), [HTTP Interceptors](https://angular.dev/guide/http/interceptors), [Route Guards](https://angular.dev/guide/routing/route-guards), and [Component Lifecycle](https://angular.dev/guide/components/lifecycle).
- [React — Building an Application from Scratch](https://react.dev/learn/build-a-react-app-from-scratch) and [React Three Fiber — Introduction](https://r3f.docs.pmnd.rs/getting-started/introduction).
- [Vue — Introduction](https://vuejs.org/guide/introduction.html), [Vue — TypeScript Support](https://vuejs.org/guide/typescript/overview.html), and [TresJS — Introduction](https://docs.tresjs.org/getting-started).

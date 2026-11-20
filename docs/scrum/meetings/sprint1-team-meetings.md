# Meetings Log - Sprint 1

### Date: 12/10/2026
#### Start Time: 10:00
#### End Time: 12:30
#### Place: ISEP

**Attendees:**
Pedro Ribeiro, Eduardo Vasconcelos, Afonso Mota and Gustavo Silva

Sprint 1 Kickoff and team reorganization. Review of team structure (departure of Filipe Pereira and Enes) and redistribution of user stories and responsibilities for the backend module (TypeScript / NestJS / PostgreSQL).

**Work made by team member:**
- Pedro Ribeiro: Assigned USs BCK03 to BCK06. Outlined architectural guidelines based on Clean Architecture and DDD.
- Eduardo Vasconcelos: Assumed responsibility for core setup and authentication user stories (BCK01, BCK02, BCK07).
- Afonso Mota: Assumed responsibility for sizing and stock user stories (BCK08, BCK09).
- Gustavo Silva: Assumed responsibility for predefined pizzas and public catalogue user stories (BCK10, BCK11).

--------------------------------------------------------------------------------------------------------------------------------------------
### Date: 13/10/2026
#### Start Time: 21:00
#### End Time: 22:00
#### Place: Online (Discord)

**Attendees:**
Pedro Ribeiro, Eduardo Vasconcelos, Afonso Mota and Gustavo Silva

Daily synchronization meeting. Review of database migrations and initial repository structures.

**Work made by team member:**
- Pedro Ribeiro: Set up product categories repository scaffolding (BCK03).
- Eduardo Vasconcelos: Worked on user registration and authentication guards (BCK01).
- Afonso Mota: Analyzed component sizing constraints (BCK08).
- Gustavo Silva: Initialized catalogue query view structures (BCK11).

--------------------------------------------------------------------------------------------------------------------------------------------
### Date: 14/10/2026
#### Start Time: 11:00
#### End Time: 13:00
#### Place: ISEP

**Attendees:**
Pedro Ribeiro, Eduardo Vasconcelos, Afonso Mota and Gustavo Silva

Progress update on master catalogue entities (Categories and Allergens). Clarification on natural keys vs surrogate UUIDs.

**Work made by team member:**
- Pedro Ribeiro: Completed BCK03 (Product Category Management) implementation and Jest unit tests.
- Eduardo Vasconcelos: Completed BCK01 (User & Authentication Management).
- Afonso Mota: Worked on database migration scripts for pizza sizes.
- Gustavo Silva: Aligned DTO structures for product catalogues.

--------------------------------------------------------------------------------------------------------------------------------------------
### Date: 15/10/2026
#### Start Time: 21:30
#### End Time: 22:30
#### Place: Online (Discord)

**Attendees:**
Pedro Ribeiro, Eduardo Vasconcelos, Afonso Mota and Gustavo Silva

Daily meeting and alignment on Allergen Management (BCK04) and Product Management (BCK05) invariants.

**Work made by team member:**
- Pedro Ribeiro: Started development on BCK04 (Allergen Management) and established natural key validation.
- Eduardo Vasconcelos: Implemented user profile maintenance (BCK02).
- Afonso Mota: Implemented pizza size CRUD operations (BCK06).
- Gustavo Silva: Implemented component type management (BCK07).

--------------------------------------------------------------------------------------------------------------------------------------------
### Date: 16/10/2026
#### Start Time: 09:00
#### End Time: 11:30
#### Place: ISEP

**Attendees:**
Pedro Ribeiro, Eduardo Vasconcelos, Afonso Mota and Gustavo Silva

Integration sync and resolution of foreign key constraint behaviors (`ON DELETE RESTRICT`) for master entities.

**Work made by team member:**
- Pedro Ribeiro: Finalized BCK04 (Allergen Management) and corresponding Bruno CLI test collection.
- Eduardo Vasconcelos: Reviewed authentication middleware and role guards.
- Afonso Mota: Finalized BCK06 (Pizza Size Management) endpoints.
- Gustavo Silva: Worked on component configuration mapping (BCK08).

--------------------------------------------------------------------------------------------------------------------------------------------
### Date: 19/10/2026
#### Start Time: 14:00
#### End Time: 15:00
#### Place: Online (Discord)

**Attendees:**
Pedro Ribeiro, Eduardo Vasconcelos, Afonso Mota and Gustavo Silva

Review of the universal Product Aggregate Root (BCK05) and multi-role typology requirements (Clarification #06).

**Work made by team member:**
- Pedro Ribeiro: Started implementation of BCK05 (Product Management), enforcing domain role consistency invariants.
- Eduardo Vasconcelos: Supported security test suites.
- Afonso Mota: Started working on stock management logic (BCK09).
- Gustavo Silva: Worked on predefined pizza aggregate boundaries (BCK10).

--------------------------------------------------------------------------------------------------------------------------------------------
### Date: 20/10/2026
#### Start Time: 12:00
#### End Time: 13:45
#### Place: ISEP

**Attendees:**
Pedro Ribeiro, Eduardo Vasconcelos, Afonso Mota and Gustavo Silva

Mid-sprint integration review. Testing API endpoints with Bruno CLI.

**Work made by team member:**
- Pedro Ribeiro: Resolved product role combination validations and direct pricing semantics in BCK05.
- Eduardo Vasconcelos: Checked user filters and dietary restrictions.
- Afonso Mota: Implemented stock adjustments and concurrency locking (BCK09).
- Gustavo Silva: Developed predefined pizza creation logic (BCK10).

--------------------------------------------------------------------------------------------------------------------------------------------
### Date: 21/10/2026
#### Start Time: 22:00
#### End Time: 23:00
#### Place: Online (Discord)

**Attendees:**
Pedro Ribeiro, Eduardo Vasconcelos, Afonso Mota and Gustavo Silva

Daily status report. Discussion on handling null direct selling prices for non-sellable pizza components.

**Work made by team member:**
- Pedro Ribeiro: Refined Product domain model to support nullable prices and soft deactivation/reactivation.
- Eduardo Vasconcelos: Fixed minor bugs in authentication controllers.
- Afonso Mota: Handled stock calculations for inactive products per Clarification #19.
- Gustavo Silva: Integrated size-dependent pricing into predefined pizzas.

--------------------------------------------------------------------------------------------------------------------------------------------
### Date: 22/10/2026
#### Start Time: 08:30
#### End Time: 11:00
#### Place: ISEP

**Attendees:**
Pedro Ribeiro, Eduardo Vasconcelos, Afonso Mota and Gustavo Silva

Pair programming session to align persistence mappers with natural business keys across all modules.

**Work made by team member:**
- Pedro Ribeiro: Updated `ProductMap` and `PostgresProductRepository` to handle natural keys and currency properties cleanly.
- Eduardo Vasconcelos: Validated user persistence mappers.
- Afonso Mota: Refined `PostgresStockRepository` queries.
- Gustavo Silva: Tested catalogue repository projections.

--------------------------------------------------------------------------------------------------------------------------------------------
### Date: 23/10/2026
#### Start Time: 21:30
#### End Time: 22:45
#### Place: Online (Discord)

**Attendees:**
Pedro Ribeiro, Eduardo Vasconcelos, Afonso Mota and Gustavo Silva

Code review and integration merge preparation. Branch merging strategy and conflict resolution guidelines.

**Work made by team member:**
- Pedro Ribeiro: Prepared pull request for BCK03, BCK04, and BCK05, resolving merge conflicts in `ProductService` and `Product.ts`.
- Eduardo Vasconcelos: Reviewed security and user module integrations.
- Afonso Mota: Verified stock management Bruno collections (BCK09).
- Gustavo Silva: Checked public menu catalogue integration tests (BCK11).

--------------------------------------------------------------------------------------------------------------------------------------------
### Date: 24/10/2026
#### Start Time: 10:00
#### End Time: 13:00
#### Place: ISEP

**Attendees:**
Pedro Ribeiro, Eduardo Vasconcelos, Afonso Mota and Gustavo Silva

Comprehensive automated test execution (Jest unit/integration suites and Bruno CLI end-to-end test suites).

**Work made by team member:**
- Pedro Ribeiro: Achieved 100% green test status on product and catalogue modules, fixing persistence expectations.
- Eduardo Vasconcelos: Verified auth and user test suites.
- Afonso Mota: Fixed inactive product stock test failures in BCK09.
- Gustavo Silva: Verified predefined pizza and catalogue test suites (BCK10, BCK11).

--------------------------------------------------------------------------------------------------------------------------------------------
### Date: 25/10/2026
#### Start Time: 15:00
#### End Time: 17:00
#### Place: Online (Discord)

**Attendees:**
Pedro Ribeiro, Eduardo Vasconcelos, Afonso Mota and Gustavo Silva

Sprint 1 final wrap-up, documentation review, and release preparation for final integration into `origin main`.

**Work made by team member:**
- Pedro Ribeiro: Finalized BCK05 and BCK06 requirements documentation and verified complete Bruno test suite execution.
- Eduardo Vasconcelos: Consolidated user management documentation.
- Afonso Mota: Verified stock audit trail requirements.
- Gustavo Silva: Reviewed openapi.yaml specifications against implemented controllers.
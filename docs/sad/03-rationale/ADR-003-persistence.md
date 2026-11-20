# ADR 003: Persistence Architecture and Database Engine Selection

- **Status:** Accepted

- **Context:**
The LaPrizza information system requires a robust and persistent data store to manage its business domain, which encompasses users, customers, product categories, allergens, multi-role products, pizza sizes, pizza component types, size configurations, stock quantities, and predefined pizza recipes (LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, pp. 5-10)[cite: 467, 468, 469, 470, 471, 472]. 

User Story `ARC04` (Persistence and Data Integrity) establishes explicit non-functional criteria:
1. Business identifiers and uniqueness constraints must be strictly enforced (LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, p. 13)[cite: 475].
2. Relationships between persisted business entities must preserve referential and business consistency (LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, p. 13)[cite: 475].
3. Persistence mechanisms must prevent business invariants established by the domain model from being bypassed (LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, p. 13)[cite: 475].
4. The persistence layer must be separated from domain logic and allow reproducible seeding and schema evolution (LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, pp. 13-14)[cite: 475, 476].

Furthermore, individual Sprint 1 user stories (`BCK02`, `BCK03`, `BCK04`, `BCK05`, `BCK06`, `BCK07`) explicitly mandate that entities currently referenced by other operational data (e.g., an allergen assigned to a product, or a category with existing items) cannot be deleted if doing so compromises system consistency (LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, pp. 6-8)[cite: 468, 469, 470]. Additionally, `BCK09` mandates an absolute invariant that stock reductions can never yield negative stock units (LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, pp. 9-10)[cite: 471, 472].
While the RFP does not mandate a specific persistence tool by decree (base-project-prompts.md, p. 1)[cite: 446], we must select an engine that reliably upholds these invariants without excessive application overhead.

- **Decision:**
We select a **Relational Database Management System (RDBMS) powered by PostgreSQL**, abstracted through a repository pattern and an Object-Relational Mapping (ORM) framework (e.g., Prisma or TypeORM).

We will model master catalogue entities as normalized relational tables with explicit SQL constraints (`FOREIGN KEY ... ON DELETE RESTRICT`, `UNIQUE`, and `CHECK` constraints) (02 - Node.js - v2.pdf, p. 36)[cite: 391]. For semi-structured configurations that emerge in future sprints (such as dynamic 3D configuration coordinates or custom pizza ingredient variations), we leverage PostgreSQL's native `JSONB` data types to combine relational integrity with document-like schema flexibility.

- **Alternativas consideradas:**

  ### 1. Document Database (MongoDB / NoSQL)
  - *Description:* Storing data as JSON-like BSON documents using Mongoose schemas and references (`ObjectId`) (02 - Node.js - v2.pdf, pp. 35, 39, 43)[cite: 390, 394, 398].
  - *Pros:* Matches JavaScript native objects seamlessly; excellent for data that is naturally self-contained and read/written in a single operation (02 - Node.js - v2.pdf, pp. 36, 44)[cite: 391, 399]. It is also the technology showcased in the introductory ARQSI course slides (02 - Node.js - v2.pdf, p. 36)[cite: 391].
  - *Cons:* MongoDB does not enforce declarative referential integrity at the database level (02 - Node.js - v2.pdf, p. 46)[cite: 401]. Meeting the mandatory acceptance criteria across `BCK03`–`BCK07` (forbidding the deletion of referenced items) requires custom application-level checks in every service method before executing deletions (02 - Node.js - v2.pdf, pp. 46-47; LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, pp. 6-8)[cite: 401, 402, 468, 469, 470]. In concurrent execution environments, this application-level approach is susceptible to race conditions and dangling references unless coordinated with complex distributed transactions (02 - Node.js - v2.pdf, p. 46)[cite: 401].

  ### 2. In-Memory / File-Based Storage (e.g., SQLite / Local JSON files)
  - *Description:* Using local file storage or embedded lightweight database engines for data persistence.
  - *Pros:* Zero infrastructure setup and trivial local deployment.
  - *Cons:* Inadequate for multi-client concurrent operations; lacks production-grade data integrity mechanisms, backup automation, and recovery capabilities required by enterprise infrastructure standards (LEI-2026-27-Sem5-Project_v1-SystemSpecification.pdf, p. 13)[cite: 460].

  ### 3. Dedicated Hybrid / Multi-Model Database (Polyglot Persistence)
  - *Description:* Running both PostgreSQL (for relational master data) and MongoDB (for order/pizza configurations) simultaneously (ARQSI_04_architectural_styles.pdf, pp. 65, 67)[cite: 282, 284].
  - *Pros:* Tailors the storage mechanism perfectly to each individual data shape (ARQSI_04_architectural_styles.pdf, p. 67)[cite: 284].
  - *Cons:* Introduces excessive operational overhead, distributed data synchronization challenges, and dual-database maintenance that violates the principles of simplicity and value over formalism for a student project prototype (principios orientadores ARQSI - English.pdf, p. 2)[cite: 2].

- **Consequences:**

  ### Positive
  - **Native Enforcement of Referential Consistency:** Foreign key relationships natively block destructive cascading deletions (`ON DELETE RESTRICT`), ensuring compliance with `BCK02`, `BCK03`, `BCK04`, `BCK05`, `BCK06`, and `BCK07` directly in the database layer (LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, pp. 6-8)[cite: 468, 469, 470].
  - **ACID Transaction Invariants:** Crucial for `BCK09` (Stock Information Management) and `BCK10` (Predefined Pizza Management), where stock unit modifications and composite component configurations must succeed or roll back atomically without partial state corruption (LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, pp. 9-10; 02 - Node.js - v2.pdf, p. 36)[cite: 391, 471, 472].
  - **Check Constraints for Domain Rules:** Allows database-level enforcement of business invariants, such as ensuring stock unit balances remain non-negative (`CHECK (stock_units >= 0)`) as demanded by `BCK09` (LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, p. 10)[cite: 472].
  - **Structured Migrations & Reproducibility:** Schema definitions are version-controlled through formal migration files, satisfying the `ARC04` requirement for reproducible environment setup (LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf, p. 14)[cite: 476].

  ### Negative / Trade-offs
  - **Rigid Schema Evolution:** Adding or restructuring attributes requires authoring and applying formal database migration scripts, unlike the schema-less flexibility of MongoDB (02 - Node.js - v2.pdf, p. 36)[cite: 391].
  - **Object-Relational Impedance Mismatch:** Complex hierarchical aggregations (e.g., retrieving a pizza along with all nested component types, allergens, and size pricing) require relational join queries (`JOIN`) or ORM mapping logic, which must be carefully tuned to prevent the N+1 query problem (02 - Node.js - v2.pdf, p. 49)[cite: 404].
# ADR 008: Adoption of TypeORM for PostgreSQL Data Access

- **Status:** Accepted
- **Date:** 2026-10-28
- **Implementation:** Implemented across all backend PostgreSQL repository adapters. The legacy native connection pool has been removed.

- **Context:**
The LaPrizza back-end uses NestJS, TypeScript, and PostgreSQL, with persistence isolated behind application repository interfaces. [ADR 003](ADR-003-persistence.md) originally established the use of an ORM without selecting a framework. [ADR 002 revision v2.2](ADR-002.2-stack-choosing.md) subsequently documented native `pg` connection pools and handwritten SQL, which this implementation replaces.

Before this change, repositories such as `PostgresUserRepository`, `PostgresProductRepository`, and `PostgresStockRepository` managed queries, connections, transactions, and relational collections explicitly. Mappers such as `UserMap` reconstructed domain aggregates and value objects from database rows. This approach gave precise control over SQL but required repeated persistence code as the domain grew.

Adopting an ORM must preserve the Clean/Onion boundaries established in [ADR 001](ADR-0001-architectural-style.md), the database integrity requirements of `ARC04`, and the testing separation in [ADR 006](ADR-006-automated-testing.md). The existing SQL scripts also contain PostgreSQL-specific views, constraints, and deferred triggers that must survive the transition. Previously, Docker Compose applied these scripts only when initializing an empty database volume; this did not provide an upgrade mechanism for existing databases.

- **Decision:**
We adopt **TypeORM in the Data Mapper style**, integrated through **`@nestjs/typeorm`**, as the standard persistence framework for the existing PostgreSQL database. This decision refines ADR 003 and supersedes the native-pool-only data access choice in ADR 002 revision v2.2. All existing PostgreSQL adapters now use TypeORM behind their application repository interfaces.

The selection is based on TypeORM's repository and query-builder APIs and NestJS integration for provider injection and asynchronous configuration. These capabilities fit the existing repository structure and decorator-enabled TypeScript configuration. We prefer explicit persistence entity classes and query-builder control for the existing joins, filters, and locking requirements. Prisma could also preserve the same architectural boundaries; this selection reflects the project's preferred implementation workflow. See the [NestJS TypeORM integration documentation](https://docs.nestjs.com/data/typeorm) and [TypeORM repository APIs](https://typeorm.io/docs/working-with-entity-manager/repository-api/).

1. **Keep ORM models in infrastructure:** Define persistence entity classes under `backend/src/infrastructure/persistence/entities/`, separate from domain aggregates. ORM decorators and types must remain outside domain entities, application services, and repository interfaces. Existing mappers will translate persistence entities to domain objects through their established creation or reconstitution methods, and domain state back to persistence records.

2. **Preserve the existing relational model:** Explicitly map table names, column names, natural and composite keys, nullable fields, numeric precision, timestamps, and relationships to the schema defined by the SQL scripts. For example, users retain `username` as their primary key, with roles in `user_role_assignments`; no generated user ID is introduced. Preserve database constraints and deferred triggers, and configure relationship loading and writes explicitly. TypeORM supports explicit table and column mappings; see its [entity documentation](https://typeorm.io/docs/entity/entities/).

3. **Use a shared, managed data source:** Configure TypeORM through a NestJS persistence module using the existing `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` settings. Retain `pg` as the PostgreSQL driver. Keep application repository injection tokens, such as `USER_REPOSITORY`, stable while replacing their implementations. During migration, bound the combined connection budget of the legacy pool and the TypeORM pool; remove `getDatabasePool()` once no repository uses it.

4. **Preserve transactional behavior:** Persist an aggregate and its owned collections in one transaction. User writes must include role assignments and dietary restrictions before commit, satisfying deferred minimum-child constraints. Stock changes must retain row locking and atomic balance/movement writes. All operations participating in a transaction must use its transaction-scoped manager or query runner. Parameterized SQL remains available inside infrastructure for PostgreSQL-specific operations and measured query needs.

5. **Control schema evolution explicitly:** Set `synchronize: false` and `migrationsRun: false`; apply reviewed migrations as a deployment step. The initial TypeORM migration reproduces the schema resulting from historical SQL scripts `001`–`013`, including the separate predefined-pizza size association introduced by `012`. It also installs the three role names needed for registration. Existing databases must validate and record this baseline without replaying creation or fixture scripts. New schema changes belong to the TypeORM migration history, with SQL used where required for views, functions, and triggers. Automatic synchronization must never replace these objects. See the [TypeORM migration setup documentation](https://typeorm.io/docs/migrations/setup/).

- **Considered Alternatives:**

  ### 1. Continue Using Native `pg` Repositories
  - *Description:* Retain the current connection pool, SQL repositories, and row mappers.
  - *Pros:* No framework migration; direct control over queries and existing PostgreSQL behavior.
  - *Cons:* Leaves the ORM choice in ADR 003 unresolved and retains repeated query, transaction, and relational mapping code.

  ### 2. Prisma ORM
  - *Description:* Use a declarative Prisma schema and generated query client behind the repository interfaces. See the [NestJS database overview](https://docs.nestjs.com/data/overview).
  - *Pros:* Provides a typed client and keeps generated persistence models separate from domain objects.
  - *Cons:* Introduces a schema language and client-generation step alongside the existing TypeScript workflow. For this project, TypeORM's entity classes and NestJS repository injection are a closer fit. Either option still requires explicit handling of the existing PostgreSQL-specific schema objects.

  ### 3. Decorate Domain Entities Directly / Active Record
  - *Description:* Turn domain aggregates into ORM entities with persistence operations attached to them.
  - *Pros:* Reduces the number of separate persistence classes and mappers.
  - *Cons:* Couples domain construction and business logic to ORM metadata and persistence behavior, conflicting with ADR 001 and isolated domain testing.

- **Consequences:**

  ### Positive
  - **Consistent Data Access:** Repository APIs provide a shared approach to routine queries and persistence while retaining explicit SQL where needed.
  - **Preserved Domain Boundaries:** Services continue to depend on application repository interfaces, and domain objects remain independent of TypeORM.
  - **Incremental Delivery:** Individual repository implementations can migrate without changing public API contracts or replacing the database.
  - **Explicit Schema Upgrades:** A baseline and forward migration history provide an upgrade path beyond Docker's empty-volume initialization.

  ### Negative / Trade-offs
  - **Additional Mapping and Dependencies:** Separate persistence models and domain mappers remain necessary; implementation must select package versions compatible with the existing NestJS and Node.js stack.
  - **Query Performance Requires Review:** Relationship loading and collection joins can introduce N+1 queries, duplicate roots, or incorrect pagination. Generated queries must be checked for catalogue and user filtering workloads.
  - **Explicit Transaction Ownership:** Every operation in an aggregate transaction must use its transaction-scoped TypeORM manager. The completed migration removes the legacy native pool.
  - **Migration Discipline:** ORM metadata does not replace database constraints, custom SQL, or review of generated migrations.

- **Implementation and Validation:**

1. **Setup:** TypeORM `0.3` and `@nestjs/typeorm` `10` match the existing NestJS 10 application. The shared configuration in `backend/src/infrastructure/persistence/database-options.ts` reads `DATABASE_URL` or explicit `DB_*` environment variables without fallback credentials. Runtime, CLI, and seeds share this configuration; startup and shutdown are managed by NestJS.
2. **Entities:** The `entities/` directory contains 26 table entities and two read-only view entities. Columns preserve the existing SQL names, types, nullability, defaults, keys, checks, and indexes. Association tables have explicit entities, relations have no automatic cascades or eager loading, and domain timestamps remain under domain control. No new application columns or public routes are introduced.
3. **Repositories:** All 11 `Postgres*Repository.ts` adapters use TypeORM repositories and query builders. User, product, configuration, recipe, and stock writes use transactions. Stock mutations lock the stock and product rows. Catalogue projections and supported-size lookups load related records in batches. Existing domain mappers and in-memory test doubles remain in use.
4. **SQL exceptions:** Runtime repositories execute no raw SQL. SQL remains in the frozen schema migration and view definitions to preserve PostgreSQL-specific objects. The explicit baseline-adoption command uses catalog queries and session-local comparison views to validate an existing installation before recording migration history.
5. **Deployment and seeds:** Forward migrations live in `orm-migrations/`, separate from the historical SQL files. Docker Compose no longer mounts the old initialization scripts. After PostgreSQL becomes healthy, the backend container's startup script applies pending TypeORM migrations, runs the idempotent development seed when `SEED_DATABASE=true`, and then starts Node. Compose enables this seed by default for the local Make workflow. Local `npm start` performs the migration step through `prestart`; local Node users may still seed explicitly. A migration or enabled seed failure prevents the application from launching. The application itself keeps `migrationsRun: false`; migration and seed execution belong to setup, with no separate migration service.
6. **Checks:** Build and lint cover the TypeScript backend. PostgreSQL integration tests cover entity/schema parity, legacy database adoption, migration reversal/reapplication, aggregate rollback, deferred role constraints, concurrent stock consumption, and real HTTP contracts. Each PostgreSQL suite creates and removes its own schema in `TEST_DATABASE_URL`.

**Validation result (2026-10-28):** Build and lint passed on Node.js 24.21.0. All 422 tests passed across 49 suites with PostgreSQL 16, including the database suites. The migration-generation CLI reported no schema changes. Compiled baseline adoption, fixture seeding, backend startup, public endpoint reads, login, and authenticated user listing were also verified against an isolated test database. Docker continues to target Node.js 20; the frontend and existing project database volumes were not used for these checks.

**Automatic development seed verification:** A fresh isolated deployment started through the normal Make workflow populated its fixtures without a manual seed command. The complete Bruno collection then passed all 287 requests and 388 test checks. This setup retains the original Makefile targets and the two-service Compose structure.

## Backend Data Access Inventory

All repository files below are in `backend/src/infrastructure/persistence/repositories/`. Module files are in `backend/src/presentation/`; controller files are in its `http/controllers/` directory. Services retain their existing application-layer interfaces.

| Modules and route families | Controllers / services | Repository files |
| --- | --- | --- |
| `auth.module.ts`, `user.module.ts`: `/auth`, `/user`, `/users` | `AuthController`, `UserController`, `BackofficeUsersController`; `AuthService`, `UserService`; `AuthGuard` also reads users | `PostgresUserRepository.ts` |
| `category.module.ts`: `/categories` | `CategoryController`; `CategoryService` | `PostgresCategoryRepository.ts` |
| `product-category.module.ts`: provider-only module; category HTTP routes are consolidated under `category.module.ts` | `ProductCategoryService` (unchanged, no HTTP controller) | `PostgresProductCategoryRepository.ts` |
| `allergen.module.ts`: `/allergens` | `AllergenController`; `AllergenService` | `PostgresAllergenRepository.ts` |
| `product.module.ts`: `/products` | `ProductController`; `ProductService` | `PostgresProductRepository.ts` |
| `pizza-size.module.ts`: `/pizza-sizes` | `PizzaSizeController`; `PizzaSizeService` | `PostgresPizzaSizeRepository.ts` |
| `pizza-component-type.module.ts`: `/pizza-component-types` | `PizzaComponentTypeController`; `PizzaComponentTypeService` | `PostgresPizzaComponentTypeRepository.ts` |
| `component-size-configuration.module.ts`: `/component-size-configurations` | `ComponentSizeConfigurationController`; `ComponentSizeConfigurationService` | `PostgresComponentSizeConfigurationRepository.ts` |
| `stock.module.ts`: `/stock` | `StockController`; `StockService` | `PostgresStockRepository.ts` |
| `predefined-pizza.module.ts`: `/predefined-pizzas` | `PredefinedPizzaController`; `PredefinedPizzaService` | `PostgresPredefinedPizzaRepository.ts` |
| `catalogue.module.ts`: `/catalogue` | `CatalogueController`; `CatalogueService` | `PostgresCatalogueRepository.ts` |

Customer, order, snapshot, and kitchen tables have entity mappings but currently have no database-backed application services or HTTP modules. Their existing domain classes remain independent of TypeORM. `/health` does not access the database.

## Entity and Migration Inventory

All table classes below are in `backend/src/infrastructure/persistence/entities/`, with one class per file:

- **Identity:** `UserEntity`, `UserRoleEntity`, `UserRoleAssignmentEntity`, `UserDietaryRestrictionEntity`.
- **Customers:** `CustomerEntity`, `CustomerAddressEntity`.
- **Catalogues and products:** `AllergenEntity`, `ProductCategoryEntity`, `ProductEntity`, `ProductAllergenEntity`, `PizzaSizeEntity`, `PizzaComponentTypeEntity`, `ComponentSizeConfigurationEntity`.
- **Recipes:** `PredefinedPizzaEntity`, `PredefinedPizzaRecipeEntity`, `PredefinedPizzaAvailableSizeEntity`.
- **Stock:** `StockItemEntity`, `StockMovementEntity`.
- **Orders and snapshots:** `CustomerOrderEntity`, `OrderItemEntity`, `PersonalizedPizzaSnapshotEntity`, `PizzaSnapshotComponentEntity`, `PizzaSnapshotAllergenEntity`.
- **Kitchen:** `KitchenResourceEntity`, `PreparationActivityEntity`, `ActivityDependencyEntity`.
- **Views:** `CatalogueProductsView`, `PredefinedPizzaDetailsView` map the existing PostgreSQL projections.

The migration is `backend/src/infrastructure/persistence/orm-migrations/1793145600000-InitialSchema.ts` (`InitialSchema1793145600000`). Its initial-schema replay is rejected if application tables already exist. Reverting this migration explicitly drops its application tables; it is intended for an isolated fresh installation, not rollback of an adopted database containing operational data.

## Running the Backend

Run npm commands from `backend/`. Copy `.env.example` to `.env` and set the database connection. Existing database volumes must be retained.

For a fresh database:

```sh
cp -n .env.example .env
# Review .env and use the credentials of your PostgreSQL instance.
docker compose -p laprizza -f ../docker-compose.yml up -d --wait postgres
npm ci
npm run build
npm start
```

The environment-file copy preserves an existing `.env`. The Docker command starts only PostgreSQL and keeps its existing volume; omit it when using another PostgreSQL server. If a `laprizza_postgres` container already exists under another Compose project, use `docker start laprizza_postgres` to reuse it rather than creating a competing container. The example's `DB_HOST=localhost` is for a backend process running on the host; the Compose backend service receives `DB_HOST=postgres` from its container environment. `npm start` automatically applies pending migrations through `prestart`. After startup, optionally run `npm run seed` from another terminal to install development accounts and catalogue fixtures. The initial migration already provides the role names required for customer registration.

For a database already initialized by historical scripts `001`–`013`, run `npm run migration:baseline` once before its first `npm start`. This validates entity/schema compatibility, view definitions, and required deferred triggers, then records the baseline without replaying table creation or fixtures. It stops if the schema differs. The adoption helper currently requires the initial migration to be the only configured migration; perform baseline adoption before adding forward migrations.

For subsequent schema changes:

```sh
npm run migration:generate -- src/infrastructure/persistence/orm-migrations/DescribeChange
# Review the generated migration before applying it.
npm run migration:run
npm run migration:show
# Explicitly undo the last applied migration only when its down operation is appropriate:
npm run migration:revert
```

Compiled deployments use `migration:run:prod`, `migration:baseline:prod`, and `seed:prod`.

For Docker development, run these commands from the repository root:

```sh
make up       # Build, migrate, seed development fixtures, and start in the background.
make logs SERVICE=backend
```

The original Makefile targets are preserved. `make` builds and starts the backend and database while attaching to logs in the foreground; `make up` keeps them running in the background. Pressing Ctrl+C in foreground `make` stops the services. Each backend start runs pending migrations and the enabled development seed inside that same container before starting the HTTP server. The seed inserts missing fixtures while retaining existing accounts and stock balances. No separate seed command, migration service, or additional Make target is required for the default Docker workflow. `make up SERVICE=postgres` starts only the database when running Node locally; wait for PostgreSQL readiness before `npm start`.

Compose waits for healthy PostgreSQL using its [startup dependency condition](https://docs.docker.com/compose/how-tos/startup-order/). The backend's `start-backend.sh` then runs `migration:run:prod`, conditionally runs `seed:prod`, and finishes with `exec node dist/index.js`, preserving normal shutdown signal handling. Compose contains only `postgres` and `backend`. To start without development fixtures, use `SEED_DATABASE=false make up`; the Docker image itself leaves seeding disabled when the flag is absent. Existing historical schemas must first be explicitly adopted with `migration:baseline:prod`; normal startup retains the initial migration's protection against overwriting existing tables. Existing volumes are retained by normal startup; a volume reset is unnecessary.

Validation commands:

```sh
npm run lint
npm run build
npm test
# Export TEST_DATABASE_URL pointing to a dedicated PostgreSQL 16 test database to include database tests.
# Then rerun npm test; its PostgreSQL suites use isolated schemas.
```

The deployment account needs access to the configured schema; migration/baseline commands also need DDL and temporary-view privileges. The test account needs permission to create and drop its own schemas. The frontend and other architecture documents are unchanged by this implementation.

# PostgreSQL creation scripts

These scripts now create the 25-table natural-key schema in the relational diagram supplied in this conversation and in `docs/sad/08-database-structure.md` (section 2).

| Files | Purpose |
| --- | --- |
| `001`–`005` | Users/roles, customers/allergens, products, configurations/recipes, and stock |
| `006` | Catalogue and predefined-pizza read views using natural keys and currency columns |
| `007` | Existing local authentication/catalogue fixtures, rewritten for natural keys |
| `008` | Orders, items, personalized snapshots and snapshot components/allergens |
| `009` | Kitchen resources, preparation activities and dependencies |
| `010` | Lookup indexes and default-address uniqueness |
| `011` | Deferred constraints for the diagram's required child collections |

This is a rewritten **fresh-database baseline**, following the requested container reset. The old UUID/code upgrade scripts have been replaced; this chain does not upgrade an existing legacy volume. The current Docker deployment uses backend TypeORM migrations. If this directory is mounted into `/docker-entrypoint-initdb.d` in a SQL-based deployment, PostgreSQL runs the files in filename order only when initializing an empty data directory. No replacement `database/` directory is needed.

The application must supply usernames; there is no client-controlled username default. Local fixtures derive usernames from the email local part, underscore, and first domain character, with collision suffixes starting at 2. The six existing local accounts retain their emails, names, roles, statuses, password hashes and shared test password `Manager123!`.

`max_cardinality` remains nullable. Direct product price and currency are both nullable and must be supplied together; omitted prices are never converted to zero. Component configuration prices carry their own currency.

The diagram explicitly marks predefined pizza SKU as unique, in addition to the `(sku, pizza_size)` primary key. This baseline therefore permits only one predefined size variant per product, and recipe/snapshot source foreign keys reference that unique SKU. The chosen snapshot size remains an independent pizza-size reference. No domain change was made to reconcile the diagram with a domain that supports multiple variants per SKU.

The required `1..*` collections use deferred constraint triggers. Create/update the parent and children in a single transaction: users need a role assignment, predefined pizzas need a recipe line, orders need an item, and snapshots need a component. Optional relationships and empty optional collections remain allowed.

Repository SQL and mappers now use these natural-key tables and currency columns. Configuration API responses omit `updatedAt` because the relational model does not store that timestamp. The one-size-per-SKU constraint remains in force. These repository repairs required no changes to this migration baseline or the domain.


Authentication session revocation is created by `015_create_auth_sessions_table.sql`
for SQL-based initialization and by the TypeORM forward migration
`../orm-migrations/1793836800000-AuthSessions.ts` for application deployments.
Both create the same table and expiration index and tolerate either creation path
having run first, without deleting existing session records.
Run `npm run migration:run` before using the updated backend. Legacy adoption
validates and records only the frozen initial schema (001–013); run forward
migrations afterward. It must never fake the session migration. Sprint 2 SQL
additions in 014 are not part of that frozen baseline and require separate review.


Unauthorized endpoint attempts are created by `016_create_unauthorized_attempts_table.sql`
or TypeORM migration `../orm-migrations/1793836801000-UnauthorizedAttempts.ts`.
Both paths create `unauthorized_attempts` and its user/timestamp index without
replacing existing records. Run forward migrations before starting the updated
backend. These audit records are infrastructure data, not a domain aggregate.


Password recovery uses `018_create_password_recovery_table.sql` or TypeORM
migration `../orm-migrations/1793923200000-PasswordRecovery.ts`. The table is
utility infrastructure, not a domain aggregate. `recovery_code` stores a SHA-256
digest, not the emailed raw code. Its email FK follows account email changes
and account deletion. The historical initial baseline remains unchanged.


Role-assignment history uses `019_create_roles_assignment_table.sql` or TypeORM
migration `../orm-migrations/1794009600000-RolesAssignment.ts`. Both create
`roles_assignment` and its actor/time and recipient/time indexes while preserving
existing rows. This table is separate from current `user_role_assignments`.
`assigned_from` is an FK to users.username; a separate BIGSERIAL `id` is the PK
so one administrator can assign many roles over time. `assigned_to` is a historical
email snapshot. No domain class or initial-schema edit is required.


Status history uses `020_create_status_assignment_table.sql` or TypeORM migration
`../orm-migrations/1794009601000-StatusAssignment.ts`. Both create `status_assignment`
with a nullable actor FK to users.username (DELETE SET NULL), a checked status, historical recipient email,
and a database timestamp, plus actor/time and recipient/time indexes. A separate
BIGSERIAL id supports repeated events from the same actor. Initial account
creation, registration completion and real activation/deactivation changes are
recorded; no existing accounts or seed history are backfilled.

Commercial customer dietary restrictions are introduced by
`023_bck02_customer_management.sql` for SQL initialization and
`../orm-migrations/1795200000000-BCK02CustomerManagement.ts` for backend
deployments. Forward migration `024_customer_business_key_relations.sql` and
`../orm-migrations/1795300000000-CustomerBusinessKeyRelations.ts` then replace
the customer UUID FKs in addresses, orders and dietary restrictions with the
customer email business key. They add an exact unique index on `customers.email`
for FK support while preserving the case-insensitive uniqueness rule. The UUID
customer ID remains the profile identifier, but is not used as a relationship
key. Apply both migrations before using the BCK02 Manager endpoints.

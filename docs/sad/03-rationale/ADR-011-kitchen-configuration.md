# ADR 011: Kitchen Configuration Strategy (JSONB & Active State)

- **Status:** Superseded (identity decision superseded by ADR-016)
- **Date:** 2026-11-04
- **Decision Makers:** LaPrizza Development Team

## Context
User Stories **WEB06 (Kitchen Configuration Page)** and **VIS02 (Kitchen Layout and Equipment)** require the system to manage multiple 3D kitchen layouts. A critical requirement is the ability for a Manager to switch between different layouts, and the 3D viewer must always load the *currently active* configuration.

The problem domain dictates that kitchen layouts are highly variable: different restaurants might have different equipment, and even the same restaurant might rearrange its layout (e.g., placing the oven on the left side of the kitchen vs. the right side). A kitchen layout consists of dimensions, equipment types (ovens, fryers), positions (x, y, z), orientations (rotations), scales, and asset URLs for 3D models. 

Storing this data in highly normalized relational tables (e.g., `kitchen_walls`, `kitchen_ovens`, `kitchen_robotic_arms`) would result in a massive, rigid schema. Any new piece of equipment or visual property introduced by the 3D team (SGRAI) would require a database migration, violating the principle of agility and creating tight coupling between the frontend rendering needs and the backend schema. Furthermore, there must be a strict invariant: **exactly one configuration can be active at any given time**. We must also respect the architectural mandate of using semantic business keys rather than technical UUIDs for aggregate identities.

## Decision
We adopt an opaque **JSONB** storage strategy for kitchen layouts within PostgreSQL, combined with a partial unique index to enforce the active-state invariant.

The design is as follows:
1. **Business Identifier:** The `KitchenConfiguration` aggregate is identified by its `name` (e.g., "Standard Layout", "Summer Layout"), which serves as the `VARCHAR` Primary Key. This maintains the ubiquitous language and prevents the leakage of technical UUIDs into the domain model.
2. **Opaque JSON:** The backend treats `json_content` as an opaque payload. It does not map the internal JSON keys (dimensions, equipment arrays, lights) to SQL columns. It is the sole responsibility of the Three.js frontend component to parse and interpret this JSON according to the schema defined in ADR-014.
3. **Active State Invariant:** To guarantee that only one configuration is active, we implement a **Partial Unique Index** at the database level:
   ```sql
   CREATE UNIQUE INDEX uq_active_kitchen_configuration 
   ON kitchen_configurations (is_active) 
   WHERE is_active = TRUE;
   ```
4. **Transactional Activation:** The `KitchenConfigurationService.activate(name)` method executes an `UPDATE` that sets `is_active = FALSE` for all rows, and `is_active = TRUE` for the target row within a single ACID transaction. If the transaction fails (e.g., due to concurrency), the previous active configuration remains untouched.

## Alternatives Considered

### 1. Fully Normalized Relational Schema
- *Description:* Creating tables for `Equipment`, `RoomDimensions`, `AssetUrls`, etc., and linking them to a `KitchenLayout` table.
- *Pros:* Strong relational typing; native SQL constraints on coordinates or scales.
- *Cons:* Rejected. The 3D rendering domain (SGRAI) is highly volatile. A normalized schema would require constant database migrations every time the 3D team adds a new visual attribute (e.g., light intensity, texture mapping, new robotic arm models). It severely limits the agility of the visualization module and violates the "Value over Formalism" principle.

### 2. File Storage (JSON Files on Disk / S3)
- *Description:* Storing the layout as a `.json` file on the server's file system or an object store.
- *Pros:* Zero database schema impact.
- *Cons:* Rejected. Managing transactional consistency (updating the file and the database record atomically) is extremely difficult. If the server crashes mid-write, the file could become corrupted. Access control and versioning are also much harder to manage outside the database.

### 3. Document Database (MongoDB)
- *Description:* Storing the entire configuration in a NoSQL database.
- *Pros:* Natural fit for JSON documents.
- *Cons:* Rejected. Introducing a second database engine (Polyglot Persistence) purely for this feature violates the "Keep it Simple" principle (ADR-003). PostgreSQL's native `JSONB` type provides the exact same document-store capabilities (including indexing) without the operational overhead of a new database system.

## Consequences

### Positive
- **Extreme Flexibility:** The 3D team can evolve the JSON schema (adding new lighting properties, model URLs, or textures) without triggering backend deployments or database migrations.
- **Performance:** PostgreSQL `JSONB` stores data in a decomposed binary format, which is highly efficient to query and retrieve. Loading a configuration is a single `SELECT` statement.
- **Hard Invariant Guarantee:** The partial unique index makes it physically impossible at the database level to have two active configurations, completely eliminating race conditions.
- **Business-Key Consistency:** The system continues the Sprint 1 architectural pattern of using business identifiers (names) instead of technical UUIDs for aggregate identities.
- **Auditability:** Previous configurations are not deleted; they are simply set to `is_active = FALSE`, allowing the Manager to revert to a previous layout if needed.

### Negative / Trade-offs
- **Application-Level Validation:** The database cannot natively verify that the JSON payload matches the required 3D schema (e.g., that a `position.x` is a valid number). The backend must implement a robust validation step (e.g., using Zod or Joi) in the `KitchenConfigurationService` before saving, rejecting invalid structures with `422 Unprocessable Entity`.
- **Data Duplication:** If multiple configurations share the exact same layout but differ in a minor detail, the entire JSON payload is duplicated. This is acceptable given the relatively small size of the JSON files.

> **Current identity decision:** The configuration identity
> is now a generated UUID, while `name` is a unique,
> editable descriptive field. See ADR-016.
>
> The original business-key decision below is retained
> for historical traceability and is no longer applicable.
# BCK04 - As a LaPrizza Manager, I want to maintain the allergens recognized by the restaurant.

## 1. Requirements Engineering

### 1.1. User Story Description

As a LaPrizza Manager, I want to maintain the allergens recognized by the restaurant, so that products can be associated with appropriate allergen information.

### 1.2. Customer Specifications and Clarifications

#### From the specification document

> Requirements extracted directly from *PART III – Sprint 1 – User Stories* (Section BCK04, p. 7) and *PART II – System Specification* (Section II.3.1.2 Products and Allergens, pp. 3–4).

* **Food Safety & Compliance:** Maintaining recognized allergenic substances (e.g., Gluten, Lactose, Crustaceans) is mandatory under food information regulations (EU Regulation 1169/2011) to inform consumers and staff.
* **Identification & Natural Key Representation:** In strict alignment with Domain-Driven Design (DDD) and the updated domain model (`domain-model.puml`), each allergen is uniquely identified by its natural business name (`AllergenName`, e.g., `"Gluten"`, `"Lactose"`), accompanied by a description. Surrogate database row UUIDs and separate technical codes are omitted in favor of clean natural business keys.
* **Integrity Invariant & Absence of Deactivation (AC6 & Clarification #17):** An allergen referenced by existing products or registered user dietary restrictions must never be removed (`409 Conflict`). The physical database schema enforces this via foreign keys configured with `ON DELETE RESTRICT`. Deactivation/reactivation mechanisms are not required for allergens.
* **Access Policies:** Modification actions (create, update, delete) are restricted to authenticated users holding the `MANAGER` role, whereas consultation and search endpoints are publicly accessible.

### 1.3. Acceptance Criteria

* **AC1:** The system must maintain a catalogue of recognized allergens.
* **AC2:** Each allergen must have a unique natural business identifier (`AllergenName`) and a descriptive summary.
* **AC3:** Allergens must be available for association with food products and ingredients via their `AllergenName`.
* **AC4:** A product may be associated with zero, one, or multiple allergens.
* **AC5:** Allergens must be searchable and listable using relevant identifying information (name).
* **AC6:** An allergen referenced by existing business information (products or user dietary restrictions) must not be removed in a manner that compromises data consistency (enforced via application checks and database `ON DELETE RESTRICT`).

### 1.4. Found out Dependencies

* **Preceding Dependencies:**
* **BCK01 (User and Authentication Management):** Mutating allergen operations require an authenticated user with the `MANAGER` role (validated via `AuthGuard` and `RolesGuard`).


* **Succeeding Dependencies:**
* **BCK05 (Product Management):** Products depend directly on `Allergen`, as food items can be linked to multiple allergenic substances by `allergenName`.
* **BCK02 (User / Customer Management):** User dietary restrictions map directly to recognized allergens (`allergenName`) to support allergy alerts during ordering.



### 1.5. Input and Output Data

#### Inputs:

* **Creation Payload (`CreateAllergenDTO`):**
* `name`: string (mandatory, unique natural key designation, e.g., `"Gluten"`)
* `description`: string (optional/mandatory descriptive details)


* **Update Payload (`UpdateAllergenDTO`):**
* `name`: string (path parameter identifying the allergen by its natural key, and updated name in body)
* `description`: string (descriptive details)


* **Search Criteria:**
* `search`: string query parameter (optional case-insensitive text filtering by name)


* **Deletion:**
* `name`: string (path parameter identifying the allergen by its natural key)



#### Outputs:

* **Allergen Record (`AllergenResponseDTO`):** JSON object containing `name` and `description`.
* **Allergen Collection:** Array of Allergen Records matching search criteria.
* **HTTP Status Codes:** 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict.

---

### 1.6. System Sequence Diagrams (SSD)

#### 1.6.1. Add Allergenic Substance (Manager Only)

```mermaid
sequenceDiagram
autonumber
title: BCK04 - Add Allergenic Substance
    actor user as Manager
    participant FE as Frontend (SPA)
    participant API as Public API (NestJS Gateway)
    participant Ctrl as AllergenController
    participant Svc as AllergenService
    participant db as PostgreSQL Database

    user->>FE: Fill in name and description, click "Add Allergen"
    FE->>FE: Client-side validation (name required)

    alt client-side validation fails
        rect rgba(255, 200, 200, 0.4)
            FE-->>user: Show form input validation errors
        end
    else client-side validation passes
        FE->>API: POST /allergens (name, description) [Authorization: Bearer <token>]
        API->>API: AuthGuard & RolesGuard (Verify JWT and check MANAGER role)

        alt not authenticated or unauthorized
            rect rgba(255, 200, 200, 0.4)
                API-->>FE: 401 Unauthorized / 403 Forbidden
                FE-->>user: Show "Access denied" error
            end
        else authorized
            API->>Ctrl: create(CreateAllergenDTO)
            Ctrl->>Ctrl: Validate payload format

            alt invalid payload format
                rect rgba(255, 200, 200, 0.4)
                    Ctrl-->>API: 400 Bad Request
                    API-->>FE: 400 Bad Request
                    FE-->>user: Show "Invalid request parameters" error
                end
            else valid payload
                Ctrl->>Svc: createAllergen(dto)
                Svc->>db: findByName(name)
                db-->>Svc: existingAllergen / null

                alt allergen name already exists
                    rect rgba(255, 220, 180, 0.4)
                        Svc-->>Ctrl: Result.fail("Allergen name already exists")
                        Ctrl-->>API: 409 Conflict
                        API-->>FE: 409 Conflict
                        FE-->>user: Show "Allergen name already in use" error
                    end
                else unique allergen
                    rect rgba(200, 240, 200, 0.4)
                        Svc->>Svc: Allergen.create({ name, description })
                        Svc->>db: INSERT INTO allergens (name, description)
                        db-->>Svc: OK
                        Svc-->>Ctrl: Result.ok(allergenResponseDto)
                        Ctrl->>API: 201 Created (JSON)
                        API-->>FE: 201 Created
                        FE-->>user: Show success notification, refresh allergen catalogue
                    end
                end
            end
        end
    end

```

#### 1.6.2. Search and List Allergens (Public Access)

```mermaid
sequenceDiagram
autonumber
title: BCK04 - Search and List Allergens
    actor user as Customer / Manager
    participant FE as Frontend (SPA)
    participant API as Public API (NestJS Gateway)
    participant Ctrl as AllergenController
    participant Svc as AllergenService
    participant db as PostgreSQL Database

    user->>FE: Request allergen list or enter search term
    FE->>API: GET /allergens?search=query
    API->>API: AuthGuard (Detects @Public() metadata, allows anonymous access)
    API->>Ctrl: getAll(searchQuery)
    Ctrl->>Svc: getAllergens(searchQuery)
    Svc->>db: SELECT name, description FROM allergens WHERE name ILIKE ... ORDER BY name ASC
    db-->>Svc: Array of allergen persistence rows
    Svc->>Ctrl: Result.ok(allergenDTOList)
    Ctrl->>API: 200 OK (JSON array)
    API-->>FE: 200 OK
    FE-->>user: Render sorted allergen catalogue listing

```

#### 1.6.3. Remove Allergenic Substance (Manager Only & AC6 Guard)

```mermaid
sequenceDiagram
autonumber
title: BCK04 - Remove Allergenic Substance
    actor user as Manager
    participant FE as Frontend (SPA)
    participant API as Public API (NestJS Gateway)
    participant Ctrl as AllergenController
    participant Svc as AllergenService
    participant db as PostgreSQL Database

    user->>FE: Select allergen, click "Delete Allergen"
    FE->>FE: Display confirmation modal dialog

    alt user cancels action
        FE-->>user: Dismiss modal
    else user confirms deletion
        FE->>API: DELETE /allergens/:name [Authorization: Bearer <token>]
        API->>API: AuthGuard & RolesGuard (Verify JWT and check MANAGER role)

        alt unauthorized
            rect rgba(255, 200, 200, 0.4)
                API-->>FE: 401 Unauthorized / 403 Forbidden
                FE-->>user: Show "Access denied" error
            end
        else authorized
            API->>Ctrl: delete(name)
            Ctrl->>Svc: deleteAllergen(name)
            Svc->>db: findByName(name)
            db-->>Svc: allergen / null

            alt allergen not found
                rect rgba(255, 220, 180, 0.4)
                    Svc-->>Ctrl: Result.fail("Allergen not found")
                    Ctrl-->>API: 404 Not Found
                    API-->>FE: 404 Not Found
                    FE-->>user: Show "Allergen not found" error
                end
            else allergen found
                Svc->>db: isReferenced(name)
                db-->>Svc: isReferenced (boolean across products or user dietary restrictions)

                alt allergen referenced by products or user profiles (AC6 Violation)
                    rect rgba(255, 220, 180, 0.4)
                        Svc-->>Ctrl: Result.fail("Allergen is referenced by existing business information and cannot be deleted")
                        Ctrl-->>API: 409 Conflict
                        API-->>FE: 409 Conflict
                        FE-->>user: Show "Cannot delete: allergen is currently associated with active products or dietary profiles" error
                    end
                else allergen not in use
                    rect rgba(200, 240, 200, 0.4)
                        Svc->>db: DELETE FROM allergens WHERE name = :name
                        db-->>Svc: OK
                        Svc->>Ctrl: Result.ok()
                        Ctrl->>API: 200 OK
                        API-->>FE: 200 OK
                        FE-->>user: Show "Allergen removed successfully", update catalogue table
                    end
                end
            end
        end
    end

```

---

### 1.7. Other Relevant Remarks

* **Relational Integrity Protection (`08-database-structure.md`):** The physical schema guarantees at the database engine level that no allergen can be deleted if referenced by products or user dietary restrictions, using its natural business key (`name`):

```sql
CREATE TABLE allergens (
    name VARCHAR PRIMARY KEY,
    description TEXT NOT NULL DEFAULT ''
);

-- Constraints enforced in junction tables:
-- product_allergens (allergen_name VARCHAR NOT NULL REFERENCES allergens(name) ON DELETE RESTRICT)
-- user_dietary_restrictions (allergen_name VARCHAR NOT NULL REFERENCES allergens(name) ON DELETE RESTRICT)

```

* **API Boundary & Role Verification:** Mutating endpoints rely on NestJS `@UseGuards(RolesGuard)` with metadata `@Roles(UserRole.MANAGER)`. The global `AuthGuard` automatically inspects incoming Bearer tokens, while `@Public()` explicitly exposes read routes (`GET /allergens`) to unauthenticated clients.
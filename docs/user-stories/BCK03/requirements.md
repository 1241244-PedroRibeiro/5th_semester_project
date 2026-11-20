# BCK03 - As a LaPrizza Manager, I want to maintain product categories.

## 1. Requirements Engineering

### 1.1. User Story Description

As a LaPrizza Manager, I want to maintain product categories, so that the products managed by the restaurant can be appropriately classified.

### 1.2. Customer Specifications and Clarifications

#### From the specification document

> Requirements extracted directly from *PART III – Sprint 1 – User Stories* (Section BCK03, p. 6) and *PART II – System Specification* (Section II.3.1.2 Products and Allergens, pp. 3–4).

* **Category Taxonomy:** Products are classified into categories (e.g., *Pizzas*, *Beverages*, *Desserts*) to structure the commercial catalogue and kitchen operations.
* **Identification & Natural Key Representation:** In strict alignment with Domain-Driven Design (DDD) and the updated domain model (`domain-model.puml`), each product category is identified by a natural business key (`CategoryName`, e.g., `"Pizzas"`, `"Beverages"`), accompanied by a description. Surrogate database row UUIDs or separate technical codes are omitted in favor of clean natural business keys.
* **Integrity Invariant (AC5):** A category referenced by existing products must not be removed. The persistence engine enforces referential consistency via foreign keys configured with `ON DELETE RESTRICT` (returning `409 Conflict`).
* **Access Policies:** Modification operations (create, update, delete) are restricted to authenticated users holding the `MANAGER` role, whereas consultation/search endpoints are publicly accessible to allow menu browsing.

### 1.3. Acceptance Criteria

* **AC1:** The system must maintain a catalogue of Product Categories.
* **AC2:** Each Product Category must have a unique natural business identifier (`CategoryName`) and a description.
* **AC3:** Products must be associable with an appropriate Product Category via its name.
* **AC4:** Product Categories must be searchable and listable using relevant identifying information or search terms.
* **AC5:** A Product Category referenced by existing products must not be removed in a manner that compromises the consistency of the corresponding business information (enforced at service level and via database `ON DELETE RESTRICT`).

### 1.4. Found out Dependencies

* **Preceding Dependencies:**
* **BCK01 (User and Authentication Management):** Mutating category operations are protected and require an authenticated user with the `MANAGER` role (validated via `AuthGuard` and `RolesGuard`).


* **Succeeding Dependencies:**
* **BCK05 (Product Management):** Products depend directly on `ProductCategory`, as every product must reference an existing category name.
* **BCK11 (Product Catalogue):** Public menu display and filtering aggregate products grouped by their category.



### 1.5. Input and Output Data

#### Inputs:

* **Creation Payload (`CreateCategoryDTO`):**
* `name`: string (mandatory, unique category designation, e.g., `"Beverages"`)
* `description`: string (mandatory, descriptive summary)


* **Update Payload (`UpdateCategoryDTO`):**
* `name`: string (path parameter identifying the category by its natural key)
* `description`: string (mandatory)


* **Search Criteria:**
* `search`: string query parameter (optional text filtering category names)


* **Deletion:**
* `name`: string (path parameter identifying the category by its natural key)



#### Outputs:

* **Category Record (`CategoryResponseDTO`):** JSON object containing `name` and `description`.
* **Category Collection:** Array of Category Records matching search criteria.
* **HTTP Status Codes:** 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict.

---

### 1.6. System Sequence Diagrams (SSD)

#### 1.6.1. Add Product Category (Manager Only)

```mermaid
sequenceDiagram
autonumber
title: BCK03 - Add Product Category
    actor user as Manager
    participant FE as Frontend (SPA)
    participant API as Public API (NestJS Gateway)
    participant Ctrl as CategoryController
    participant Svc as CategoryService
    participant db as PostgreSQL Database

    user->>FE: Fill in name and description, click "Add Category"
    FE->>FE: Client-side validation (all fields mandatory)

    alt client-side validation fails
        rect rgba(255, 200, 200, 0.4)
            FE-->>user: Show form input validation errors
        end
    else client-side validation passes
        FE->>API: POST /categories (name, description) [Authorization: Bearer <token>]
        API->>API: AuthGuard & RolesGuard (Verify JWT and check MANAGER role)

        alt not authenticated or unauthorized
            rect rgba(255, 200, 200, 0.4)
                API-->>FE: 401 Unauthorized / 403 Forbidden
                FE-->>user: Show "Access denied" error
            end
        else authorized
            API->>Ctrl: create(CreateCategoryDTO)
            Ctrl->>Ctrl: Validate payload format

            alt invalid payload format
                rect rgba(255, 200, 200, 0.4)
                    Ctrl-->>API: 400 Bad Request
                    API-->>FE: 400 Bad Request
                    FE-->>user: Show "Invalid request parameters" error
                end
            else valid payload
                Ctrl->>Svc: createCategory(dto)
                Svc->>db: findByName(name)
                db-->>Svc: existingCategory / null

                alt category name already exists
                    rect rgba(255, 220, 180, 0.4)
                        Svc-->>Ctrl: Result.fail("Category name already exists")
                        Ctrl-->>API: 409 Conflict
                        API-->>FE: 409 Conflict
                        FE-->>user: Show "Category name already in use" error
                    end
                else unique category
                    rect rgba(200, 240, 200, 0.4)
                        Svc->>Svc: ProductCategory.create({ name, description })
                        Svc->>db: INSERT INTO product_categories (name, description)
                        db-->>Svc: OK
                        Svc-->>Ctrl: Result.ok(categoryResponseDto)
                        Ctrl-->>API: 201 Created (JSON)
                        API-->>FE: 201 Created
                        FE-->>user: Show success notification, refresh category catalogue
                    end
                end
            end
        end
    end

```

#### 1.6.2. Search and List Product Categories (Public Access)

```mermaid
sequenceDiagram
autonumber
title: BCK03 - Search and List Product Categories
    actor user as Customer / Manager
    participant FE as Frontend (SPA)
    participant API as Public API (NestJS Gateway)
    participant Ctrl as CategoryController
    participant Svc as CategoryService
    participant db as PostgreSQL Database

    user->>FE: Request category list or enter search term
    FE->>API: GET /categories?search=query
    API->>API: AuthGuard (Detects @Public() metadata, allows anonymous access)
    API->>Ctrl: getAll(searchQuery)
    Ctrl->>Svc: getCategories(searchQuery)
    Svc->>db: SELECT name, description FROM product_categories WHERE name ILIKE ... ORDER BY name ASC
    db-->>Svc: Array of category persistence rows
    Svc-->>Ctrl: Result.ok(categoryDTOList)
    Ctrl->>API: 200 OK (JSON array)
    API-->>FE: 200 OK
    FE-->>user: Render sorted category listing

```

#### 1.6.3. Remove Product Category (Manager Only & AC5 Guard)

```mermaid
sequenceDiagram
autonumber
title: BCK03 - Remove Product Category
    actor user as Manager
    participant FE as Frontend (SPA)
    participant API as Public API (NestJS Gateway)
    participant Ctrl as CategoryController
    participant Svc as CategoryService
    participant db as PostgreSQL Database

    user->>FE: Select category, click "Remove Category"
    FE->>FE: Display confirmation modal dialog

    alt user cancels action
        FE-->>user: Dismiss modal
    else user confirms deletion
        FE->>API: DELETE /categories/:name [Authorization: Bearer <token>]
        API->>API: AuthGuard & RolesGuard (Verify JWT and check MANAGER role)

        alt unauthorized
            rect rgba(255, 200, 200, 0.4)
                API-->>FE: 401 Unauthorized / 403 Forbidden
                FE-->>user: Show "Access denied" error
            end
        else authorized
            API->>Ctrl: delete(name)
            Ctrl->>Svc: deleteCategory(name)
            Svc->>db: findByName(name)
            db-->>Svc: category / null

            alt category not found
                rect rgba(255, 220, 180, 0.4)
                    Svc-->>Ctrl: Result.fail("Category not found")
                    Ctrl-->>API: 404 Not Found
                    API-->>FE: 404 Not Found
                    FE-->>user: Show "Category not found" error
                end
            else category found
                Svc->>db: isReferencedByProducts(name)
                db-->>Svc: hasProducts (boolean)

                alt category referenced by existing products (AC5 Violation)
                    rect rgba(255, 220, 180, 0.4)
                        Svc-->>Ctrl: Result.fail("Category is referenced by existing products and cannot be deleted")
                        Ctrl-->>API: 409 Conflict
                        API-->>FE: 409 Conflict
                        FE-->>user: Show "Cannot delete: category has associated products" error
                    end
                else category not in use
                    rect rgba(200, 240, 200, 0.4)
                        Svc->>db: DELETE FROM product_categories WHERE name = :name
                        db-->>Svc: OK
                        Svc-->>Ctrl: Result.ok()
                        Ctrl-->>API: 200 OK
                        API-->>FE: 200 OK
                        FE-->>user: Show "Category removed successfully", update catalogue table
                    end
                end
            end
        end
    end

```

---

### 1.7. Other Relevant Remarks

* **Relational Integrity Protection (`08-database-structure.md`):** The physical schema utilizes natural business keys as primary keys and foreign keys, enforcing referential consistency at the database engine level:

```sql
CREATE TABLE product_categories (
    name VARCHAR PRIMARY KEY,
    description TEXT NOT NULL DEFAULT ''
);

-- Constraint enforced in products table (BCK05):
-- category_name VARCHAR NOT NULL REFERENCES product_categories(name) ON DELETE RESTRICT

```

* **API Boundary & Role Verification:** Mutating endpoints rely on NestJS `@UseGuards(RolesGuard)` with metadata `@Roles(UserRole.MANAGER)`. The global `AuthGuard` automatically inspects incoming Bearer tokens, while `@Public()` explicitly exposes read routes (`GET /categories`) to unauthenticated clients.
# BCK06 - As a LaPrizza Manager, I want to maintain the pizza sizes offered by the restaurant

## 1. Requirements Engineering

### 1.1. User Story Description



As a LaPrizza Manager, I want to maintain the pizza sizes offered by the restaurant, so that pizza configurations and size-dependent information can refer to a consistent set of available sizes.

### 1.2. Customer Specifications and Clarifications



#### From the specification document



> Extracted directly from *PART III – Sprint 1 – User Stories* (Section BCK06, p. 8) and *PART II – System Specification* (Section II.3.1.3 Pizzas, Sizes, and Components, pp. 4–5).
> 
> 

* A **Pizza Size** characterizes the commercial size of a pizza (e.g., *Small*, *Medium*, *Large*, *Family*) and establishes the baseline for pricing and ingredient consumption.


* Pizza sizes and component types are independent concepts. A pizza size establishes the size of the pizza being configured.


* The size-dependent characteristics of a pizza component are linked to a Pizza Size through a *Component Size Configuration* (BCK08).


* Predefined pizzas and customer-configured pizzas are made available in specific Pizza Sizes.


* The set of available Pizza Sizes must be able to evolve over time without breaking or corrupting existing business information.



### 1.3. Acceptance Criteria



* **AC1:** The system must maintain the Pizza Sizes recognized by LaPrizza.


* **AC2:** Each Pizza Size must have a unique identifier and a descriptive name.


* **AC3:** Pizza Sizes must be available for use in pizza-related configurations.


* **AC4:** Pizza Sizes must be searchable using relevant identifying information.


* **AC5:** The system must allow the set of available Pizza Sizes to evolve without compromising existing business information.


* **AC6:** A Pizza Size referenced by existing business information (e.g., component size configurations, predefined pizzas, historical orders) must not be removed in a manner that compromises its consistency.



### 1.4. Found out Dependencies



* **Preceding Dependencies:**
* **BCK01 (User and Authentication Management):** All creation, update, and removal operations on Pizza Sizes are protected operations restricted to an authenticated LaPrizza Manager holding the `MANAGER` role (enforced via `AuthGuard` and `RolesGuard`).




* **Succeeding Dependencies:**
* **BCK08 (Pizza Component Configuration):** Associates a Pizza Component with a Pizza Size.


* **BCK10 (Predefined Pizza Management):** Determines the Pizza Sizes in which a Predefined Pizza can be offered.


* **BCK11 (Product Catalogue):** Presents available Pizza Sizes to customers.





### 1.5. Input and Output Data



#### Inputs:



* `name`: string (mandatory, unique designation using value object `Designation`, e.g., "Small", "Medium", "Large")


* `search`: string query parameter (optional text filtering)


* `id`: UUID (path parameter for update/delete operations)



#### Outputs:



* **Pizza Size Record:** JSON object containing `id` (UUID), `name`, and `active` status.


* **Pizza Size Collection:** Array of Pizza Size records matching search criteria.


* **HTTP Status Codes:** 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict.



---

### 1.6. System Sequence Diagrams (SSD)



#### 1.6.1. Add Pizza Size (Manager Only)



```mermaid
sequenceDiagram
autonumber
title: BCK06 - Add Pizza Size
    actor user as Manager
    participant FE as Frontend (SPA)
    participant API as Public API (NestJS Gateway)
    participant Ctrl as PizzaSizeController
    participant Svc as PizzaSizeService
    participant db as PostgreSQL Database

    user->>FE: Fill in pizza size name, click "Add Size"[cite: 13, 69]
    FE->>FE: Client-side validation (name required)[cite: 13, 69]

    alt client-side validation fails
        rect rgba(255, 200, 200, 0.4)
            FE-->>user: Show field errors[cite: 13, 69]
        end
    else client-side validation passes
        FE->>API: POST /pizza-sizes (name)[cite: 13, 69]
        API->>API: AuthGuard & RolesGuard (Verify JWT and check MANAGER role)[cite: 13, 69]

        alt not authenticated or not authorized
            rect rgba(255, 200, 200, 0.4)
                API-->>FE: 401 Unauthorized / 403 Forbidden[cite: 13, 69]
                FE-->>user: Show "Access denied" error[cite: 13, 69]
            end
        else authorized
            API->>Ctrl: create(CreatePizzaSizeDTO)[cite: 13, 69]
            Ctrl->>Ctrl: Validate input format (ValidationPipe)[cite: 13, 69]

            alt invalid input
                rect rgba(255, 200, 200, 0.4)
                    Ctrl-->>API: 400 Bad Request[cite: 13, 69]
                    API-->>FE: 400 Invalid request[cite: 13, 69]
                    FE-->>user: Show "Invalid request" error[cite: 13, 69]
                end
            else valid input
                Ctrl->>Svc: createPizzaSize(dto)[cite: 13, 69]
                Svc->>db: findByName(name)[cite: 13, 69]
                db-->>Svc: pizza size record / null[cite: 13, 69]

                alt pizza size already exists
                    rect rgba(255, 220, 180, 0.4)
                        Svc-->>Ctrl: Result.fail("Pizza size name already exists")[cite: 13, 69]
                        Ctrl-->>API: 409 Conflict[cite: 13, 69]
                        API-->>FE: 409 Conflict[cite: 13, 69]
                        FE-->>user: Show "Pizza size already exists" error[cite: 13, 69]
                    end
                else pizza size name available
                    rect rgba(200, 240, 200, 0.4)
                        Svc->>Svc: PizzaSize.create(id, { name, active })[cite: 13, 69]
                        Svc->>db: INSERT INTO pizza_sizes (id, name, is_active)[cite: 13, 69]
                        db-->>Svc: OK[cite: 13, 69]
                        Svc-->>Ctrl: Result.ok(pizzaSizeResponseDto)[cite: 13, 69]
                        Ctrl-->>API: 201 Created[cite: 13, 69]
                        API-->>FE: 201 Created[cite: 13, 69]
                        FE-->>user: Show success, refresh pizza size list[cite: 13, 69]
                    end
                end
            end
        end
    end

```

#### 1.6.2. Search / List Pizza Sizes (Public Access)



```mermaid
sequenceDiagram
autonumber
title: BCK06 - Search / List Pizza Sizes
    actor user as Manager / Customer
    participant FE as Frontend (SPA)
    participant API as Public API (NestJS Gateway)
    participant Ctrl as PizzaSizeController
    participant Svc as PizzaSizeService
    participant db as PostgreSQL Database

    user->>FE: Request pizza sizes (optional search query)[cite: 13, 69]
    FE->>API: GET /pizza-sizes?search=query[cite: 13, 69]
    API->>API: AuthGuard (Detects @Public() metadata, allows anonymous access)[cite: 69]
    API->>Ctrl: getAll(search)[cite: 13, 69]
    Ctrl->>Svc: getPizzaSizes(search)[cite: 13, 69]
    Svc->>db: SELECT id, name, is_active FROM pizza_sizes WHERE ... ORDER BY name ASC[cite: 13, 69]
    db-->>Svc: List of pizza size rows[cite: 13, 69]
    Svc-->>Ctrl: Result.ok(pizzaSizeList)[cite: 13, 69]
    Ctrl-->>API: 200 OK (JSON array)[cite: 13, 69]
    API-->>FE: 200 OK[cite: 13, 69]
    FE-->>user: Display list of pizza sizes[cite: 13, 69]

```

#### 1.6.3. Remove Pizza Size (Manager Only & AC6 Guard)



```mermaid
sequenceDiagram
autonumber
title: BCK06 - Remove Pizza Size
    actor user as Manager
    participant FE as Frontend (SPA)
    participant API as Public API (NestJS Gateway)
    participant Ctrl as PizzaSizeController
    participant Svc as PizzaSizeService
    participant db as PostgreSQL Database

    user->>FE: Select pizza size, click "Remove"[cite: 13, 69]
    FE->>FE: Client-side validation (identifier selected)[cite: 13, 69]

    alt client-side validation fails
        rect rgba(255, 200, 200, 0.4)
            FE-->>user: Show field errors[cite: 13, 69]
        end
    else client-side validation passes
        FE->>API: DELETE /pizza-sizes/:id[cite: 13, 69]
        API->>API: AuthGuard & RolesGuard (Verify JWT and check MANAGER role)[cite: 13, 69]

        alt not authenticated or not authorized
            rect rgba(255, 200, 200, 0.4)
                API-->>FE: 401 Unauthorized / 403 Forbidden[cite: 13, 69]
                FE-->>user: Show "Access denied" error[cite: 13, 69]
            end
        else authorized
            API->>Ctrl: delete(id)[cite: 13, 69]
            Ctrl->>Svc: deletePizzaSize(id)[cite: 13, 69]
            Svc->>db: findById(id)[cite: 13, 69]
            db-->>Svc: pizza size record / null[cite: 13, 69]

            alt pizza size not found
                rect rgba(255, 220, 180, 0.4)
                    Svc-->>Ctrl: Result.fail("Pizza size not found")[cite: 13, 69]
                    Ctrl-->>API: 404 Not Found[cite: 13, 69]
                    API-->>FE: 404 Not Found[cite: 13, 69]
                    FE-->>user: Show "Pizza size not found" error[cite: 13, 69]
                end
            else pizza size found
                Svc->>db: isReferenced(id) (checks component_size_configurations & predefined_pizza_available_sizes)[cite: 13, 69]
                db-->>Svc: inUse (boolean)[cite: 13, 69]

                alt pizza size in use by business information (AC6 Violation)[cite: 69]
                    rect rgba(255, 220, 180, 0.4)
                        Svc-->>Ctrl: Result.fail("Pizza size is referenced by existing configurations or products and cannot be deleted")[cite: 13, 69]
                        Ctrl-->>API: 409 Conflict[cite: 13, 69]
                        API-->>FE: 409 Conflict[cite: 13, 69]
                        FE-->>user: Show "Pizza size is in use by existing configurations or products" error[cite: 13, 69]
                    end
                else pizza size not in use
                    rect rgba(200, 240, 200, 0.4)
                        Svc->>db: DELETE FROM pizza_sizes WHERE id = :id[cite: 13, 69]
                        db-->>Svc: OK[cite: 13, 69]
                        Svc-->>Ctrl: Result.ok()[cite: 13, 69]
                        Ctrl-->>API: 200 OK[cite: 13, 69]
                        API-->>FE: 200 OK[cite: 13, 69]
                        FE-->>user: Show success, refresh pizza size list[cite: 13, 69]
                    end
                end
            end
        end
    end

```

---

### 1.7. Other Relevant Remarks



* **Relational Integrity Guarantees (`08-database-structure.md`):** Business information referencing a Pizza Size (such as `component_size_configurations` or `predefined_pizza_available_sizes`) is protected from corruption. Foreign keys enforce `ON DELETE RESTRICT` at the PostgreSQL engine level, complementing the application-level check (`isReferenced`).


* **Scope Distinction:** BCK06 manages the **catalogue of Pizza Sizes**. Sizing prices and stock consumption for individual ingredients are configured in **BCK08** (*Pizza Component Configuration*), and component cardinalities/roles belong to **BCK07** (*Pizza Component Type Management*).
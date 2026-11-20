# BCK08 - As a LaPrizza Manager, I want to configure the size-dependent characteristics of products used as pizza components.

## 1. Requirements Engineering

### 1.1. User Story Description

As a LaPrizza Manager, I want to configure the size-dependent characteristics of products used as pizza components, so that the system can determine the information applicable when a component is used in a pizza of a particular size.

### 1.2. Customer Specifications and Clarifications

#### From the specification document

> Extracted directly from *PART III – Sprint 1 – User Stories* (Section BCK08, p. 9) and *PART II – System Specification* (Section II.3.1.3 Pizzas, Sizes, and Components, pp. 4–5).

* **Component Size Configuration Concept:** Stock-unit consumption and prices vary independently per Pizza Size; a larger pizza may consume more abstract stock units of a topping without necessarily following a linear ratio.


* **Entity Structure & Domain Model Alignment:** In alignment with the DDD domain model and relational database schema (`component_size_configurations`), each entry represents a `PizzaComponent` (or portion configuration) characterized by a `productId`, a `sizeId`, a specific portion size quantity, and a computed or explicitly set price.


* **Pricing & Multipliers:** Prices can be issued by a mathematical expression based on standard price multipliers or custom-edited by management.


* **Referential Integrity Invariant:** Changes or deletions must preserve the consistency of existing relationships across product inventories and sizing matrices.



### 1.3. Acceptance Criteria

* **AC1:** Only products designated for use as Pizza Components may have Component Size Configurations.


* **AC2:** A Component Size Configuration must associate a Pizza Component with a Pizza Size.


* **AC3:** For a given Pizza Component and Pizza Size, at most one applicable Component Size Configuration may exist.


* **AC4:** A Component Size Configuration must define the price applicable to the component when used in a pizza of the corresponding size.


* **AC5:** When the corresponding product is subject to stock control, the Component Size Configuration must allow the number of abstract stock units consumed for that Pizza Size to be represented.


* **AC6:** Prices and stock-consumption values must satisfy corresponding business validation rules (non-negative price, positive quantity size).


* **AC7:** The system must allow the size-dependent configurations of a Pizza Component to be consulted.


* **AC8:** Changes to Component Size Configurations must preserve the consistency of existing business information.



### 1.4. Found out Dependencies

* **Preceding Dependencies:**
* **BCK01 (User and Authentication Management):** Administrative mutations are protected and restricted to authenticated users holding the `MANAGER` role (enforced via `AuthGuard` and `RolesGuard`).


* **BCK05 (Product Management):** Only products designated as Pizza Components can possess a size configuration.


* **BCK06 (Pizza Size Management):** Each configuration is bound to a recognized `PizzaSize`.




* **Succeeding Dependencies:**
* **BCK10 (Predefined Pizza Management):** A Predefined Pizza may only be offered in Pizza Sizes for which all its component parts possess a valid Component Size Configuration.





### 1.5. Input and Output Data

#### Inputs:

* `productId`: UUID (reference to an existing component product)


* `sizeId`: UUID (reference to an existing pizza size)


* `size` (portion size / stock units consumed): number ($\ge 0$)


* `price` / `updatedPrice`: number ($\ge 0$)



#### Outputs:

* Created or updated Component Size Configuration record


* List of size-dependent configurations for a given component


* Standard HTTP status codes: 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict



---

### 1.6. System Sequence Diagrams (SSD)

#### 1.6.1. Create Portion (Component Size Configuration)

```mermaid
sequenceDiagram
autonumber
title: BCK08 - Create Portion Configuration
    actor user as Manager
    participant FE as Frontend (SPA)
    participant API as Public API (NestJS Gateway)
    participant Ctrl as PortionController
    participant Svc as PizzaComponentService
    participant ProdSvc as ProductService
    participant SizeSvc as PizzaSizeService
    participant db as PostgreSQL Database

    user->>FE: Select product and size, fill in portion size and price, click "Create"[cite: 16]
    FE->>FE: Client-side validation (all fields required, portion size above zero, price not negative)[cite: 16]

    alt client-side validation fails
        rect rgba(255, 200, 200, 0.4)
            FE-->>user: Show field errors[cite: 16]
        end
    else client-side validation passes
        FE->>API: POST /portions (productId, sizeId, size, price)[cite: 16]
        API->>API: AuthGuard & RolesGuard (Verify JWT and check MANAGER role)[cite: 16]

        alt not authenticated or not authorized
            rect rgba(255, 200, 200, 0.4)
                API-->>FE: 401 Unauthorized / 403 Forbidden[cite: 16]
                FE-->>user: Show "Access denied" error[cite: 16]
            end
        else authorized
            API->>Ctrl: createPizzaComponent(productId, sizeId, size, price)[cite: 16]
            Ctrl->>Ctrl: Validate input format (ValidationPipe)[cite: 16]

            alt invalid input
                rect rgba(255, 200, 200, 0.4)
                    Ctrl-->>API: 400 Bad Request[cite: 16]
                    API-->>FE: 400 Invalid request[cite: 16]
                    FE-->>user: Show "Invalid request" error[cite: 16]
                end
            else valid input
                Ctrl->>Svc: createPizzaComponent(productId, sizeId, size, price)[cite: 16]
                Svc->>ProdSvc: findPizzaComponentById(productId)[cite: 16]
                ProdSvc->>db: findPizzaComponentByProductId(productId)[cite: 16]
                db-->>ProdSvc: pizza component / null[cite: 16]
                ProdSvc-->>Svc: pizza component / null[cite: 16]

                alt pizza component not found
                    rect rgba(255, 220, 180, 0.4)
                        Svc-->>Ctrl: NotFoundError[cite: 16]
                        Ctrl-->>API: 404 Not Found[cite: 16]
                        API-->>FE: 404 Not Found[cite: 16]
                        FE-->>user: Show "Pizza component not found" error[cite: 16]
                    end
                else pizza component found
                    Svc->>SizeSvc: findSizeById(sizeId)[cite: 16]
                    SizeSvc->>db: findPizzaSizeById(sizeId)[cite: 16]
                    db-->>SizeSvc: size record / null[cite: 16]
                    SizeSvc-->>Svc: size / null[cite: 16]

                    alt size not found
                        rect rgba(255, 220, 180, 0.4)
                            Svc-->>Ctrl: NotFoundError[cite: 16]
                            Ctrl-->>API: 404 Not Found[cite: 16]
                            API-->>FE: 404 Size not found[cite: 16]
                            FE-->>user: Show "Size not found" error[cite: 16]
                        end
                    else size found
                        Svc->>db: findPortion(productId, sizeId)[cite: 16]
                        db-->>Svc: portion record / null[cite: 16]

                        alt portion already exists (AC3 Violation)
                            rect rgba(255, 220, 180, 0.4)
                                Svc-->>Ctrl: ConflictError[cite: 16]
                                Ctrl-->>API: 409 Conflict[cite: 16]
                                API-->>FE: 409 Conflict[cite: 16]
                                FE-->>user: Show "Portion already exists for this size" error[cite: 16]
                            end
                        else portion does not exist
                            rect rgba(200, 240, 200, 0.4)
                                Svc->>db: createPortion(productId, sizeId, size, price)[cite: 16]
                                db-->>Svc: OK[cite: 16]
                                Svc-->>Ctrl: portion created[cite: 16]
                                Ctrl-->>API: 200 OK[cite: 16]
                                API-->>FE: 200 OK[cite: 16]
                                FE-->>user: Show success, refresh portions[cite: 16]
                            end
                        end
                    end
                end
            end
        end
    end

```

#### 1.6.2. Update Portion Price

```mermaid
sequenceDiagram
autonumber
title: BCK08 - Update Portion Price
    actor user as Manager
    participant FE as Frontend (SPA)
    participant API as Public API (NestJS Gateway)
    participant Ctrl as PortionController
    participant Svc as PizzaComponentService
    participant ProdSvc as ProductService
    participant SizeSvc as PizzaSizeService
    participant db as PostgreSQL Database

    user->>FE: Select product and size, type new price, click "Update"[cite: 17]
    FE->>FE: Client-side validation (product, size and price required, price not negative)[cite: 17]

    alt client-side validation fails
        rect rgba(255, 200, 200, 0.4)
            FE-->>user: Show field errors[cite: 17]
        end
    else client-side validation passes
        FE->>API: PATCH /portions/price (productId, sizeId, updatedPrice)[cite: 17]
        API->>API: AuthGuard & RolesGuard (Verify JWT and check MANAGER role)[cite: 17]

        alt not authenticated or not authorized
            rect rgba(255, 200, 200, 0.4)
                API-->>FE: 401 Unauthorized / 403 Forbidden[cite: 17]
                FE-->>user: Show "Access denied" error[cite: 17]
            end
        else authorized
            API->>Ctrl: updatePizzaComponentPrice(productId, sizeId, updatedPrice)[cite: 17]
            Ctrl->>Ctrl: Validate input format (ValidationPipe)[cite: 17]

            alt invalid input
                rect rgba(255, 200, 200, 0.4)
                    Ctrl-->>API: 400 Bad Request[cite: 17]
                    API-->>FE: 400 Invalid request[cite: 17]
                    FE-->>user: Show "Invalid request" error[cite: 17]
                end
            else valid input
                Ctrl->>Svc: updatePizzaComponentPrice(productId, sizeId, updatedPrice)[cite: 17]
                Svc->>ProdSvc: findPizzaComponentById(productId)[cite: 17]
                ProdSvc->>db: findPizzaComponentByProductId(productId)[cite: 17]
                db-->>ProdSvc: pizza component / null[cite: 17]
                ProdSvc-->>Svc: pizza component / null[cite: 17]

                alt pizza component not found
                    rect rgba(255, 220, 180, 0.4)
                        Svc-->>Ctrl: NotFoundError[cite: 17]
                        Ctrl-->>API: 404 Not Found[cite: 17]
                        API-->>FE: 404 Not Found[cite: 17]
                        FE-->>user: Show "Pizza component not found" error[cite: 17]
                    end
                else pizza component found
                    Svc->>SizeSvc: findSizeById(sizeId)[cite: 17]
                    SizeSvc->>db: findPizzaSizeById(sizeId)[cite: 17]
                    db-->>SizeSvc: size record / null[cite: 17]
                    SizeSvc-->>Svc: size / null[cite: 17]

                    alt size not found
                        rect rgba(255, 220, 180, 0.4)
                            Svc-->>Ctrl: NotFoundError[cite: 17]
                            Ctrl-->>API: 404 Not Found[cite: 17]
                            API-->>FE: 404 Size not found[cite: 17]
                            FE-->>user: Show "Size not found" error[cite: 17]
                        end
                    else size found
                        Svc->>db: findPortion(productId, sizeId)[cite: 17]
                        db-->>Svc: portion record / null[cite: 17]

                        alt portion not found
                            rect rgba(255, 220, 180, 0.4)
                                Svc-->>Ctrl: NotFoundError[cite: 17]
                                Ctrl-->>API: 404 Not Found[cite: 17]
                                API-->>FE: 404 Not Found[cite: 17]
                                FE-->>user: Show "Portion not found" error[cite: 17]
                            end
                        else portion found
                            rect rgba(200, 240, 200, 0.4)
                                Svc->>db: updatePortionPrice(productId, sizeId, updatedPrice)[cite: 17]
                                db-->>Svc: OK[cite: 17]
                                Svc-->>Ctrl: price updated[cite: 17]
                                Ctrl-->>API: 200 OK[cite: 17]
                                API-->>FE: 200 OK[cite: 17]
                                FE-->>user: Show success, refresh portions[cite: 17]
                            end
                        end
                    end
                end
            end
        end
    end

```

#### 1.6.3. Update Portion Size (Stock Units Consumed)

```mermaid
sequenceDiagram
autonumber
title: BCK08 - Update Portion Size
    actor user as Manager
    participant FE as Frontend (SPA)
    participant API as Public API (NestJS Gateway)
    participant Ctrl as PortionController
    participant Svc as PizzaComponentService
    participant ProdSvc as ProductService
    participant SizeSvc as PizzaSizeService
    participant db as PostgreSQL Database

    user->>FE: Select product and size, type new portion size, click "Update"[cite: 18]
    FE->>FE: Client-side validation (product, size and portion size required, portion size above zero)[cite: 18]

    alt client-side validation fails
        rect rgba(255, 200, 200, 0.4)
            FE-->>user: Show field errors[cite: 18]
        end
    else client-side validation passes
        FE->>API: PATCH /portions/size (productId, sizeId, updatedSize)[cite: 18]
        API->>API: AuthGuard & RolesGuard (Verify JWT and check MANAGER role)[cite: 18]

        alt not authenticated or not authorized
            rect rgba(255, 200, 200, 0.4)
                API-->>FE: 401 Unauthorized / 403 Forbidden[cite: 18]
                FE-->>user: Show "Access denied" error[cite: 18]
            end
        else authorized
            API->>Ctrl: updatePizzaComponentSize(productId, sizeId, updatedSize)[cite: 18]
            Ctrl->>Ctrl: Validate input format (ValidationPipe)[cite: 18]

            alt invalid input
                rect rgba(255, 200, 200, 0.4)
                    Ctrl-->>API: 400 Bad Request[cite: 18]
                    API-->>FE: 400 Invalid request[cite: 18]
                    FE-->>user: Show "Invalid request" error[cite: 18]
                end
            else valid input
                Ctrl->>Svc: updatePizzaComponentSize(productId, sizeId, updatedSize)[cite: 18]
                Svc->>ProdSvc: findPizzaComponentById(productId)[cite: 18]
                ProdSvc->>db: findPizzaComponentByProductId(productId)[cite: 18]
                db-->>ProdSvc: pizza component / null[cite: 18]
                ProdSvc-->>Svc: pizza component / null[cite: 18]

                alt pizza component not found
                    rect rgba(255, 220, 180, 0.4)
                        Svc-->>Ctrl: NotFoundError[cite: 18]
                        Ctrl-->>API: 404 Not Found[cite: 18]
                        API-->>FE: 404 Not Found[cite: 18]
                        FE-->>user: Show "Pizza component not found" error[cite: 18]
                    end
                else pizza component found
                    Svc->>SizeSvc: findSizeById(sizeId)[cite: 18]
                    SizeSvc->>db: findPizzaSizeById(sizeId)[cite: 18]
                    db-->>SizeSvc: size record / null[cite: 18]
                    SizeSvc-->>Svc: size / null[cite: 18]

                    alt size not found
                        rect rgba(255, 220, 180, 0.4)
                            Svc-->>Ctrl: NotFoundError[cite: 18]
                            Ctrl-->>API: 404 Not Found[cite: 18]
                            API-->>FE: 404 Size not found[cite: 18]
                            FE-->>user: Show "Size not found" error[cite: 18]
                        end
                    else size found
                        Svc->>db: findPortion(productId, sizeId)[cite: 18]
                        db-->>Svc: portion record / null[cite: 18]

                        alt portion not found
                            rect rgba(255, 220, 180, 0.4)
                                Svc-->>Ctrl: NotFoundError[cite: 18]
                                Ctrl-->>API: 404 Not Found[cite: 18]
                                API-->>FE: 404 Not Found[cite: 18]
                                FE-->>user: Show "Portion not found" error[cite: 18]
                            end
                        else portion found
                            rect rgba(200, 240, 200, 0.4)
                                Svc->>db: updatePortionSize(productId, sizeId, updatedSize)[cite: 18]
                                db-->>Svc: OK[cite: 18]
                                Svc-->>Ctrl: size updated[cite: 18]
                                Ctrl->>API: 200 OK[cite: 18]
                                API-->>FE: 200 OK[cite: 18]
                                FE-->>user: Show success, refresh portions[cite: 18]
                            end
                        end
                    end
                end
            end
        end
    end

```

---

### 1.7. Other Relevant Remarks

* **Relational Integrity Guarantees (`08-database-structure.md`):** Component size configurations link products and sizes via composite foreign keys:
```sql
CREATE TABLE component_size_configurations (
    product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
    size_id UUID REFERENCES pizza_sizes(id) ON DELETE RESTRICT,
    portion_size NUMERIC(10, 2) NOT NULL CHECK (portion_size > 0),
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    PRIMARY KEY (product_id, size_id)
);

```


* **Independent Size Scaling:** Stock consumption and pricing vary per pizza size to support non-linear recipe economics.
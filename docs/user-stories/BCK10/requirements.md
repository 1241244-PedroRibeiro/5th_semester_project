# BCK10 --- Predefined Pizza Management

## 1. Requirements Engineering

### 1.1. User Story Description

As a LaPrizza Manager, I want to define and manage predefined pizzas, so
that the restaurant can maintain the standard pizza configurations
offered to its customers.

### 1.2. Customer Specifications and Clarifications

#### From the specification document

-   **Sellable Product Representation:** A predefined pizza is
    represented by a product that is offered for sale. It is not a
    separate kind of product component; it is a standard pizza
    configuration associated with a sellable product.
-   **Default Recipe:** Each predefined pizza must define a default
    configuration made from products designated as Pizza Components. The
    component products remain independent products with their own
    identity and information.
-   **Active Component Eligibility:** Only products that are currently
    active and designated as Pizza Components can be included in a
    default recipe.
-   **No Repeated Component Entries:** A Pizza Component product must
    not be registered more than once as a separate entry in the same
    recipe. In the supplied relational model, a recipe line is
    identified by the pair
    `(predefined_pizza_id, component_product_id)`. `default_quantity`
    represents the quantity associated with that single line.
-   **Component-Type Cardinality:** A default recipe must respect the
    minimum and maximum cardinality configured for each Pizza Component
    Type. A minimum may require a type to be represented; a maximum may
    limit how many components of that type can be selected; an unbounded
    maximum is allowed.
-   **Compatible Pizza Sizes:** A predefined pizza can be offered in a
    Pizza Size only when every component in its default recipe has a
    corresponding Component Size Configuration for that size. This
    connects BCK10 to the size-dependent product data maintained by
    BCK08.
-   **Future Customization:** The default recipe must be maintained in a
    form that can later be used as the starting point for customer
    customization, such as adding, removing, or replacing components.
    BCK10 itself does not require implementing the future customization
    workflow.


### 1.3. Acceptance Criteria

The following eight criteria preserve the requirements stated by the
official BCK10 user story while making them individually verifiable.

-   **AC1 --- Sellable Product:** Every Predefined Pizza must be
    represented by an appropriate sellable product.
-   **AC2 --- Default Pizza Configuration:** Every Predefined Pizza must
    define a default configuration composed of products designated as
    Pizza Components.
-   **AC3 --- Active Components Only:** Only active products currently
    designated as Pizza Components may be included in a default pizza
    configuration.
-   **AC4 --- No Duplicate Component:** The same Pizza Component product
    must not occur more than once in the same default pizza
    configuration.
-   **AC5 --- Cardinality Validation:** The default configuration must
    satisfy the minimum and maximum cardinality rules defined for each
    Pizza Component Type, including an unbounded maximum where
    configured.
-   **AC6 --- Compatible Sizes:** A Predefined Pizza may only be made
    available in Pizza Sizes for which every Pizza Component in its
    default configuration has a corresponding Component Size
    Configuration.
-   **AC7 --- Configuration Consultation:** The system must allow the
    default configuration of a Predefined Pizza to be consulted.
-   **AC8 --- Future Customization Foundation:** The information
    maintained for a Predefined Pizza must provide an appropriate basis
    for the pizza customization functionality introduced in subsequent
    sprints.

### 1.4. Found Dependencies

#### Preceding dependencies

-   **BCK01 --- User and Authentication Management:** Management
    operations are intended for an authenticated LaPrizza Manager. The
    proposed protected endpoints use the project's JWT-based
    authentication and Manager-role authorization conventions.
-   **BCK05 --- Product Management:** The predefined pizza must link to
    an existing sellable product. Recipe entries must reference
    existing, active products designated as Pizza Components.
-   **BCK06 --- Pizza Size Management:** Available-size entries
    reference the Pizza Sizes maintained by the system. Only valid,
    active sizes should be considered when offering a predefined pizza.
-   **BCK07 --- Pizza Component Type Management:** Each component is
    associated with a Pizza Component Type, whose configurable minimum
    and maximum cardinality rules govern recipe validation.
-   **BCK08 --- Pizza Component Configuration:** Each component included
    in an offered size must have a Component Size Configuration for that
    size. These configurations also provide the component-level prices
    used by the project's dynamic pricing model.

#### Succeeding dependencies

-   **BCK11 --- Product Catalogue and Product Information:** The
    catalogue can present a predefined pizza together with its default
    configuration and supported sizes.
-   **Future pizza customization:** The default configuration serves as
    the initial recipe from which a customer can add, remove, or replace
    components in a personalized pizza.
-   **Future ordering and operational workflows:** Recipe components,
    quantities, size-dependent pricing, allergen data, and
    stock-consumption data can support subsequent order, availability,
    and preparation processes. Those workflows are outside the direct
    BCK10 implementation scope.

### 1.5. Input and Output Data

The official user story does not define an API payload. The following
fields are a proposed contract consistent with the relational model.

#### Inputs

-   **Manager authentication:** A valid JWT Bearer token for a user
    authorized to manage predefined pizzas.
-   **Sellable product reference:** `productId` (UUID) referencing an
    existing product with `is_sellable = true`.
-   **Predefined pizza details:** `recipeName` (string) and, where
    supported by the API, an optional management description derived
    from the linked product record.
-   **Default recipe lines:** A non-empty array of objects containing:
    -   `componentProductId`: UUID of a product designated as a Pizza
        Component;
    -   `defaultQuantity`: positive integer, defaulting to `1` only if
        that default is explicitly adopted by the API contract.
-   **Available sizes:** `availableSizeIds`, an array of Pizza Size
    UUIDs selected for this predefined pizza. Each requested size must
    pass the component-size-configuration validation.
-   **Consultation identifier:** `productId` (UUID) for retrieving a
    specific predefined pizza.
-   **Optional management filters:** search text or pagination may be
    added to a collection endpoint, but these are usability extensions
    rather than explicit BCK10 acceptance criteria.

#### Outputs

-   **Predefined Pizza record:**
    -   `productId`: UUID of the linked sellable product;
    -   `productName` and other relevant product information;
    -   `recipeName`;
    -   `components`: list of component product references, names,
        types, and `defaultQuantity` values;
    -   `availableSizes`: the Pizza Sizes in which the default
        configuration is valid;
    -   `createdAt` and `updatedAt`, if maintained by persistence.
-   **Size-dependent pricing information:** Where exposed, the
    calculated price for a size is the sum of each recipe component's
    configured price for that size multiplied by its `defaultQuantity`.
    No fixed price should be stored on the predefined-pizza record under
    the supplied database design.
-   **Validation failures:** A structured error identifying invalid
    input, unauthorized access, a missing reference, a duplicate recipe
    entry, an invalid component/cardinality, or an incompatible size.
-   **Proposed HTTP status codes:** `200 OK`, `201 Created`,
    `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`,
    `404 Not Found`, `409 Conflict`, and `422 Unprocessable Entity`. The
    final mapping must follow the project's API conventions.

### 1.6. System Sequence Diagrams (SSD)

> **Design note:** The routes and class names below are proposals for
> illustrating the interactions. They must be renamed or adjusted to
> match the implemented `src/application/pizza`, domain, and
> infrastructure modules. The business validation rules remain derived
> from BCK10 and the supplied model.

#### 1.6.1. Define a Predefined Pizza

``` mermaid
sequenceDiagram
    autonumber
    title BCK10 - Define Predefined Pizza
    actor manager as LaPrizza Manager
    participant FE as Frontend
    participant API as Public API
    participant Ctrl as PredefinedPizzaController
    participant Svc as PredefinedPizzaService
    participant DB as PostgreSQL Database

    manager->>FE: Enter product, default recipe and available sizes
    FE->>FE: Validate required fields and positive quantities
    FE->>API: POST /predefined-pizzas
    API->>API: Validate JWT and Manager role
    alt Not authenticated or not authorized
        API-->>FE: 401 Unauthorized / 403 Forbidden
        FE-->>manager: Display access-denied message
    else Authorized
        API->>Ctrl: createPredefinedPizza(payload)
        Ctrl->>Ctrl: Validate payload format
        alt Invalid payload
            Ctrl-->>API: 400 Bad Request
            API-->>FE: 400 Bad Request
            FE-->>manager: Display input-validation errors
        else Valid payload
            Ctrl->>Svc: createPredefinedPizza(payload)
            Svc->>DB: BEGIN TRANSACTION
            Svc->>DB: Load sellable product, components, component types, sizes and size configurations
            DB-->>Svc: Referenced records
            Svc->>Svc: Validate sellable product, active components, uniqueness, cardinality and size compatibility
            alt Business rule or reference validation fails
                Svc->>DB: ROLLBACK
                Svc-->>Ctrl: Domain validation error
                Ctrl-->>API: 404 / 409 / 422
                API-->>FE: Error response
                FE-->>manager: Display reason the predefined pizza was rejected
            else Valid predefined pizza
                Svc->>DB: INSERT predefined_pizzas, recipe lines and available sizes
                Svc->>DB: COMMIT
                DB-->>Svc: Persisted predefined pizza
                Svc-->>Ctrl: Created record
                Ctrl-->>API: 201 Created
                API-->>FE: 201 Created + predefined pizza details
                FE-->>manager: Confirm creation and display recipe
            end
        end
    end
```

#### 1.6.2. Consult a Predefined Pizza's Default Configuration

``` mermaid
sequenceDiagram
    autonumber
    title BCK10 - Consult Default Configuration
    actor manager as LaPrizza Manager
    participant FE as Frontend
    participant API as Public API
    participant Ctrl as PredefinedPizzaController
    participant Svc as PredefinedPizzaService
    participant DB as PostgreSQL Database

    manager->>FE: Select a predefined pizza
    FE->>API: GET /predefined-pizzas/:productId
    API->>API: Validate JWT and Manager role
    alt Not authenticated or not authorized
        API-->>FE: 401 Unauthorized / 403 Forbidden
        FE-->>manager: Display access-denied message
    else Authorized
        API->>Ctrl: getPredefinedPizza(productId)
        Ctrl->>Svc: getByProductId(productId)
        Svc->>DB: Query linked product, recipe lines, component types and available sizes
        DB-->>Svc: Record set / no record
        alt No predefined pizza found
            Svc-->>Ctrl: Not found
            Ctrl-->>API: 404 Not Found
            API-->>FE: 404 Not Found
            FE-->>manager: Display that the predefined pizza does not exist
        else Predefined pizza found
            Svc-->>Ctrl: Predefined pizza details
            Ctrl-->>API: 200 OK + details
            API-->>FE: 200 OK + details
            FE-->>manager: Display default recipe and supported sizes
        end
    end
```

#### 1.6.3. Update a Default Recipe and Its Available Sizes

``` mermaid
sequenceDiagram
    autonumber
    title BCK10 - Update Default Recipe
    actor manager as LaPrizza Manager
    participant FE as Frontend
    participant API as Public API
    participant Ctrl as PredefinedPizzaController
    participant Svc as PredefinedPizzaService
    participant DB as PostgreSQL Database

    manager->>FE: Edit components, quantities or available sizes
    FE->>FE: Validate basic payload fields
    FE->>API: PUT /predefined-pizzas/:productId/recipe
    API->>API: Validate JWT and Manager role
    alt Not authenticated or not authorized
        API-->>FE: 401 Unauthorized / 403 Forbidden
        FE-->>manager: Display access-denied message
    else Authorized
        API->>Ctrl: updateDefaultRecipe(productId, payload)
        Ctrl->>Svc: updateDefaultRecipe(productId, payload)
        Svc->>DB: BEGIN TRANSACTION
        Svc->>DB: Load predefined pizza and all referenced component/size configurations
        DB-->>Svc: Existing and requested references
        Svc->>Svc: Validate active components, no duplicate product entries, cardinality and size compatibility
        alt Predefined pizza missing or requested data invalid
            Svc->>DB: ROLLBACK
            Svc-->>Ctrl: Not found or validation error
            Ctrl-->>API: 404 / 409 / 422
            API-->>FE: Error response
            FE-->>manager: Display validation errors without changing the saved recipe
        else Valid update
            Svc->>DB: Replace recipe lines and available-size records
            Svc->>DB: COMMIT
            DB-->>Svc: Updated record
            Svc-->>Ctrl: Updated predefined pizza
            Ctrl-->>API: 200 OK + updated details
            API-->>FE: 200 OK + updated details
            FE-->>manager: Display the updated default configuration
        end
    end
```



### 1.8. Implementation alignment notes (archive reviewed)

- The implemented API uses SKU-based references and DTO field names (for example `pizzaSku`, `componentSku`, and `availableSizes`) rather than the UUID field names proposed in §1.5. Treat §1.5 as conceptual data, not an exact request/response schema.
- The linked product must be active and sellable in persistence. Recipe components are checked for active status and Pizza Component designation. Keep the invariant that the linked sellable product is not itself a Pizza Component explicit in the service/domain validation; do not claim this is enforced unless that validation is added.
- Duplicate recipe component entries are rejected by persistence uniqueness. Domain-level validation should reject duplicates before persistence to provide a clear validation error.
- Component-type cardinality and component-size configuration are validated. Compatible sizes are derived from the component configurations; they are not an independent fixed list.
- BCK10 stores the default recipe as the basis for later customization; it does not implement customization, ordering, or stock reservation.

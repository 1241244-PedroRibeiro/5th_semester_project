# Relational Mapping & Persistence Strategy: LaPrizza Back-End (ARC04)

## 1. Executive Summary and Scope of Document

In accordance with User Story `ARC04` (*Persistence and Data Integrity*), this document formalizes the mapping strategy between the canonical Domain-Driven Design (DDD) model and the physical relational schema in PostgreSQL 16+.

As established across architectural guidelines and decision records (**ADR-001**, **ADR-002**, **ADR-003**), the system enforces strict layer separation under Clean/Onion Architecture:

1. **Domain Purity:** Domain entities, aggregate roots, and value objects must contain zero persistence annotations (e.g., no `@Entity()`, `@Column()`, or schema decorations). The domain remains pure TypeScript.
2. **Explicit Data Mappers & Native Pool Repositories:** The persistence layer isolates SQL mappings and driver interactions using PostgreSQL connection pools (`pg` Pool). Dedicated Bidirectional Mappers (`EntityMapper<Domain, Persistence>`) translate between encapsulated domain aggregates and normalized relational records.
3. **Database-Level Invariant Enforcement:** Critical business invariants that protect system consistency are mirrored natively at the database schema level via foreign key cascade guards, check constraints, and unique indexes.
4. **Living Architectural Document:** This specification serves as a living baseline. It details Sprint 1 master catalogues, configurations, and stock tables, establishing the concrete migration baseline while outlining evolutionary hooks for Sprint 2 and Sprint 3 (Orders, Personalization, Preparation Scheduling).

---

## 2. Global Mapping Patterns (DDD to Relational Schema)


```

+------------------------------------+          +------------------------------------+
|            DOMAIN LAYER            |          |         PERSISTENCE LAYER          |
|                                    |          |                                    |
|  +------------------------------+  |          |  +------------------------------+  |
|  |     Aggregate Root / Entity  |  | Mapper   |  |      Relational Data Record /|  |
|  |  - Encapsulated Business ID  |  |<-------->|  |      PostgreSQL Mapper       |  |
|  |  - Invariants & Methods      |  | Contract |  |  - Primary Key (UUID/TEXT)   |  |
|  |  - Value Objects (Embedded)  |  |          |  |  - Normalized Columns        |  |
|  +------------------------------+  |          |  |  - Foreign Key Constraints   |  |
|                                    |          |  +------------------------------+  |
+------------------------------------+          +------------------------------------+
|
v
+------------------------------------+
|       POSTGRESQL RELATIONAL DB     |
|  - ON DELETE RESTRICT (ARC04)      |
|  - CHECK Constraints (BCK09)       |
|  - Unique Indexes & Foreign Keys   |
|  - Native pg Connection Pool       |
+------------------------------------+

```

### 2.1. Identity Strategy: Business IDs vs. Persistence Keys

* **Domain Perspective:** Aggregates are identified globally through strongly typed Value Objects (`UserId`, `CustomerId`, `ProductCode`, `PizzaSizeId`, `CategoryCode`, `AllergenCode`, `ComponentTypeCode`, `StockItemId`).
* **Relational Schema:** Master business identifiers serve directly as natural Primary Keys (`VARCHAR`/`TEXT` with primary key constraints) to enforce uniqueness natively without artificial proxy translation overhead. Where internal surrogate keys are needed for composite cross-aggregate associations (e.g., `ComponentSizeConfiguration`), generated `UUIDv4` identifiers are assigned.

### 2.2. Value Objects Mapping (Immutability & Granularity)

Value Objects possess no distinct database identity and are mapped using one of three explicit strategies:

1. **Inline Column Flattening (Single Attribute VOs):** Simple Value Objects wrapping a single primitive (e.g., `Email`, `PasswordHash`, `Designation`, `AbstractStockQuantity`) are flattened directly into column attributes of the owning entity table (e.g., `email VARCHAR(255)`, `password_hash VARCHAR(255)`, `current_balance INTEGER`).
2. **Composite Embedded Flattening (Multi-Attribute VOs):** Structured Value Objects representing cohesive domain units (e.g., `Money`: amount + currency; `ContactInformation`: phone number + primary email; `PersonName`: first name + last name) are mapped onto multiple prefixed columns inside the owning table:
   * `direct_price_amount NUMERIC(10, 2) NULL`
   * `direct_price_currency VARCHAR(3) NULL`
   * `contact_phone VARCHAR(20) NOT NULL`
   * `contact_email VARCHAR(255) NOT NULL`
   * `first_name VARCHAR(75) NOT NULL`
   * `last_name VARCHAR(75) NOT NULL`
3. **Dedicated Auxiliary Tables (Collections of Value Objects):** When an aggregate root contains a collection of value objects (e.g., `PredefinedPizza` composed of `PizzaRecipeLine[]`; `User` recording `DietaryRestriction[]`), the collection is mapped to a dedicated dependent table containing a Foreign Key pointing back to the aggregate root with `ON DELETE CASCADE`. Because the line items have no global identity outside the aggregate boundary, deleting or updating the aggregate root cascades entirely to its private child lines without affecting external references.

### 2.3. Cross-Aggregate References by Identifier Only

Strictly respecting canonical DDD rules (Evans / Vernon) and EAPLI/ARQSI guidance:

* An aggregate root **never** holds a memory pointer or direct relational table join inside its domain boundary.
* Cross-aggregate relationships are maintained solely by storing the foreign identifier value object (e.g., `Product` holds `categoryCode: CategoryCode` and `componentTypeCode: ComponentTypeCode`).
* At the PostgreSQL level, these links are declared as formal `FOREIGN KEY` constraints configured with `ON DELETE RESTRICT` to enforce referential consistency natively (`ARC04`) without permitting dangling pointers.

---

## 3. Physical Relational Schema Specifications (Sprint 1 Baseline)

### 3.1. Identity & Customer Subsystems (`BCK01`, `BCK02`)

```sql
-- Table: users (BCK01)
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    first_name VARCHAR(75) NOT NULL,
    last_name VARCHAR(75) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT chk_users_status CHECK (status IN ('ACTIVE', 'DEACTIVATED', 'PENDING_REGISTRATION'))
);

-- Table: user_roles (BCK01 - Multi-Role Support)
CREATE TABLE user_roles (
    user_id VARCHAR(36) NOT NULL,
    role VARCHAR(30) NOT NULL,
    CONSTRAINT pk_user_roles PRIMARY KEY (user_id, role),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_user_roles_name CHECK (role IN ('MANAGER', 'EMPLOYEE', 'CUSTOMER'))
);

-- Table: customers (BCK02)
CREATE TABLE customers (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NULL,
    first_name VARCHAR(75) NOT NULL,
    last_name VARCHAR(75) NOT NULL,
    contact_phone VARCHAR(25) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    vat_number VARCHAR(20) NULL,
    marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
    consent_timestamp TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_customers_user_id UNIQUE (user_id),
    CONSTRAINT fk_customers_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE SET NULL
);

-- Table: user_dietary_restrictions (BCK02 - Attached to User Account per Migration 009)
CREATE TABLE user_dietary_restrictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(36) NOT NULL,
    description TEXT NOT NULL,
    allergen_code VARCHAR(30) NULL,
    CONSTRAINT fk_user_diet_user FOREIGN KEY (user_id) 
        REFERENCES users(id) ON DELETE CASCADE
);

```

### 3.2. Master Catalogues & Multi-Role Products (`BCK03`, `BCK04`, `BCK05`)

```sql
-- Table: product_categories (BCK03)
CREATE TABLE product_categories (
    code VARCHAR(30) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: allergens (BCK04)
CREATE TABLE allergens (
    code VARCHAR(30) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Link Table: user_dietary_restrictions to allergens
ALTER TABLE user_dietary_restrictions
    ADD CONSTRAINT fk_user_diet_allergen FOREIGN KEY (allergen_code)
    REFERENCES allergens(code) ON DELETE RESTRICT;

-- Table: products (BCK05)
CREATE TABLE products (
    code VARCHAR(30) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    category_code VARCHAR(30) NOT NULL,
    is_sellable BOOLEAN NOT NULL,
    is_pizza_component BOOLEAN NOT NULL,
    is_stock_controlled BOOLEAN NOT NULL,
    component_type_code VARCHAR(30) NULL,
    direct_price_amount NUMERIC(10, 2) NULL,
    direct_price_currency VARCHAR(3) NULL DEFAULT 'EUR',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_category FOREIGN KEY (category_code) 
        REFERENCES product_categories(code) ON DELETE RESTRICT,
    -- Client Clarification Q6: Must be sellable OR pizza component OR both; cannot be exclusively stock controlled
    CONSTRAINT chk_products_mandatory_type CHECK (
        (is_sellable = TRUE) OR (is_pizza_component = TRUE)
    ),
    -- Consistency constraint: pizza components must indicate component type
    CONSTRAINT chk_products_component_role CHECK (
        (is_pizza_component = FALSE AND component_type_code IS NULL) OR
        (is_pizza_component = TRUE AND component_type_code IS NOT NULL)
    ),
    -- Consistency constraint: non-negative direct selling price if sellable (0.00 is valid per Clarification #11)
    CONSTRAINT chk_products_price_non_negative CHECK (
        direct_price_amount IS NULL OR direct_price_amount >= 0.00
    )
);

-- Table: product_allergens (BCK04, BCK05 - Many-to-Many Association)
CREATE TABLE product_allergens (
    product_code VARCHAR(30) NOT NULL,
    allergen_code VARCHAR(30) NOT NULL,
    CONSTRAINT pk_product_allergens PRIMARY KEY (product_code, allergen_code),
    CONSTRAINT fk_prod_allergens_product FOREIGN KEY (product_code) 
        REFERENCES products(code) ON DELETE CASCADE,
    CONSTRAINT fk_prod_allergens_allergen FOREIGN KEY (allergen_code) 
        REFERENCES allergens(code) ON DELETE RESTRICT
);

```

### 3.3. Pizza Taxonomy, Sizing & Configuration (`BCK06`, `BCK07`, `BCK08`)

```sql
-- Table: pizza_sizes (BCK06)
CREATE TABLE pizza_sizes (
    id VARCHAR(30) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Table: pizza_component_types (BCK07)
CREATE TABLE pizza_component_types (
    code VARCHAR(30) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    assembly_order INTEGER NOT NULL,
    cardinality_min INTEGER NOT NULL,
    cardinality_max INTEGER NULL, -- NULL denotes unbounded maximum
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_component_types_order UNIQUE (assembly_order),
    CONSTRAINT chk_component_types_cardinality CHECK (
        cardinality_min >= 0 AND 
        (cardinality_max IS NULL OR cardinality_max >= cardinality_min)
    )
);

-- Add Foreign Key to products for component type
ALTER TABLE products
    ADD CONSTRAINT fk_products_component_type FOREIGN KEY (component_type_code)
    REFERENCES pizza_component_types(code) ON DELETE RESTRICT;

-- Table: component_size_configurations (BCK08)
CREATE TABLE component_size_configurations (
    id VARCHAR(36) PRIMARY KEY,
    component_product_code VARCHAR(30) NOT NULL,
    pizza_size_id VARCHAR(30) NOT NULL,
    price_amount NUMERIC(10, 2) NOT NULL,
    price_currency VARCHAR(3) NOT NULL DEFAULT 'EUR',
    stock_units_consumed INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_comp_size_config UNIQUE (component_product_code, pizza_size_id),
    CONSTRAINT fk_comp_size_product FOREIGN KEY (component_product_code) 
        REFERENCES products(code) ON DELETE RESTRICT,
    CONSTRAINT fk_comp_size_size FOREIGN KEY (pizza_size_id) 
        REFERENCES pizza_sizes(id) ON DELETE RESTRICT,
    CONSTRAINT chk_comp_size_price CHECK (price_amount >= 0.00),
    CONSTRAINT chk_comp_size_stock_consumed CHECK (stock_units_consumed >= 0)
);

```

### 3.4. Inventory & Predefined Recipes (`BCK09`, `BCK10`)

```sql
-- Table: stock_items (BCK09)
CREATE TABLE stock_items (
    id VARCHAR(36) PRIMARY KEY,
    product_code VARCHAR(30) NOT NULL,
    current_balance INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_stock_items_product UNIQUE (product_code),
    CONSTRAINT fk_stock_items_product FOREIGN KEY (product_code) 
        REFERENCES products(code) ON DELETE RESTRICT,
    -- Client Clarification & BCK09 Invariant: Stock units are strictly non-negative integers
    CONSTRAINT chk_stock_items_balance_non_negative CHECK (current_balance >= 0)
);

-- Table: predefined_pizzas (BCK10)
CREATE TABLE predefined_pizzas (
    id VARCHAR(36) PRIMARY KEY,
    sellable_product_code VARCHAR(30) NOT NULL,
    recipe_name VARCHAR(150) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_predefined_pizzas_product UNIQUE (sellable_product_code),
    CONSTRAINT fk_predefined_pizzas_product FOREIGN KEY (sellable_product_code) 
        REFERENCES products(code) ON DELETE RESTRICT
);

-- Table: predefined_pizza_recipe_lines (BCK10 - Dependent Value Object Lines)
CREATE TABLE predefined_pizza_recipe_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    predefined_pizza_id VARCHAR(36) NOT NULL,
    component_product_code VARCHAR(30) NOT NULL,
    component_type_code VARCHAR(30) NOT NULL,
    default_quantity INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT uk_pizza_recipe_unique_component UNIQUE (predefined_pizza_id, component_product_code),
    CONSTRAINT fk_recipe_lines_pizza FOREIGN KEY (predefined_pizza_id) 
        REFERENCES predefined_pizzas(id) ON DELETE CASCADE,
    CONSTRAINT fk_recipe_lines_product FOREIGN KEY (component_product_code) 
        REFERENCES products(code) ON DELETE RESTRICT,
    CONSTRAINT fk_recipe_lines_comp_type FOREIGN KEY (component_type_code) 
        REFERENCES pizza_component_types(code) ON DELETE RESTRICT,
    CONSTRAINT chk_recipe_line_quantity CHECK (default_quantity > 0)
);

```

---

## 4. Referential Integrity & Deletion Invariant Matrix (`ARC04`)

The acceptance criteria across `BCK02`, `BCK03`, `BCK04`, `BCK05`, `BCK06`, and `BCK07` mandate that entities referenced by active operational records cannot be purged in ways that compromise data consistency.

The physical schema implements this requirement using strict database constraints combined with application repository guards:

| Master Entity | Referenced By | Physical Foreign Key Rule | Domain & Application Service Behavior |
| --- | --- | --- | --- |
| `ProductCategory` (`BCK03`) | `products.category_code` | `ON DELETE RESTRICT` | Reject deletion with HTTP `409 Conflict` if any product is assigned. |
| `Allergen` (`BCK04`) | `product_allergens.allergen_code` | `ON DELETE RESTRICT` | Reject deletion with HTTP `409 Conflict` if associated with products. |
| `Allergen` (`BCK04`) | `user_dietary_restrictions` | `ON DELETE RESTRICT` | Reject deletion with HTTP `409 Conflict` if cited in user dietary profiles. |
| `PizzaSize` (`BCK06`) | `component_size_configurations` | `ON DELETE RESTRICT` | Reject deletion with HTTP `409 Conflict` if active configurations exist. |
| `PizzaComponentType` (`BCK07`) | `products.component_type_code` | `ON DELETE RESTRICT` | Reject deletion with HTTP `409 Conflict` if components are classified under it. |
| `PizzaComponentType` (`BCK07`) | `predefined_pizza_recipe_lines` | `ON DELETE RESTRICT` | Reject deletion with HTTP `409 Conflict` if participating in pizza recipes. |
| `Product` (`BCK05`) | `stock_items.product_code` | `ON DELETE RESTRICT` | Soft deactivation (`Product.deactivate()`) preferred; hard delete blocked if stock exists. |
| `Product` (`BCK05`) | `predefined_pizzas` / `recipe_lines` | `ON DELETE RESTRICT` | Hard deletion permanently blocked; products must remain deactivated for auditability. |

---

## 5. Transaction Management & Seeding Reproducibility

### 5.1. Atomic Multi-Aggregate Transactions

Operations that mutate multi-table state must execute within an explicit database transaction (`BEGIN ... COMMIT / ROLLBACK`) orchestrated via database transactional contexts using the PostgreSQL connection pool:

* **Stock Adjustments (`BCK09`):** Reading current inventory, verifying sufficiency against consumption requirements, and updating `current_balance` executes under `SERIALIZABLE` or `READ COMMITTED` with row-level locks (`SELECT ... FOR UPDATE`) to prevent concurrent inventory overselling.
* **Predefined Pizza Formulation (`BCK10`):** Registering a predefined pizza together with its composite recipe lines and verifying that `ComponentSizeConfiguration` records exist for all supported sizes executes atomically. A failure in any line rolls back the entire recipe insertion.

### 5.2. Reproducible Seed Script Structure (`ARC04`)

To satisfy the Sprint 1 deliverable requirement for automated, reproducible initialization (`ARC04`, `LEI-2026-27-Sem5-Project_v1-Sprint1US.pdf`, p. 14), database seed scripts (`007_seed_initial_data.sql`) are structured in strict dependency order:

1. **Taxonomy & Infrastructure Seeds:**
* Insert baseline `PizzaComponentTypes` with default sequences and bounds (*Base Dough*, *Base Sauce*, *Cheese*, *Topping*).
* Insert default `PizzaSizes`: `Small` (`SIZE-SML`), `Medium` (`SIZE-MED`), `Large` (`SIZE-LRG`).
* Insert primary `ProductCategories`: `Pizzas`, `Beverages`, `Cheeses`, `Doughs`, `Sauces`, `Toppings`.
* Insert common `Allergens`: `Gluten` (`ALL-GLUTEN`), `Dairy` (`ALL-DAIRY`), `Soy` (`ALL-SOY`), `Nuts` (`ALL-NUTS`).


2. **User & Identity Seeds (`BCK01`):**
* Insert default `MANAGER` administrative user with securely hashed credentials (**`Argon2id`**).
* Insert test `EMPLOYEE` and `CUSTOMER` profiles.


3. **Master Product & Component Configuration Seeds (`BCK05`, `BCK08`):**
* Register component products (e.g., Traditional Dough, Wholemeal Dough, Tomato Sauce, Fior di Latte Mozzarella, Ham, Mushrooms, Canned Soda).
* Create complete `ComponentSizeConfiguration` records for all components across Small, Medium, and Large sizes.


4. **Inventory Balances (`BCK09`):**
* Initialize abstract integer stock records for all stock-controlled components and sellables.


5. **Predefined Pizza Recipes (`BCK10`):**
* Register sellable product `Pizza Margherita` and associate its default recipe lines (Traditional Dough + Tomato Sauce + Mozzarella).



---

## 6. Living Evolution Log: Sprint 1 to Sprints 2 & 3

```
+----------------------------------------------------------------------------------------------------+
| SPRINT 1 (CURRENT BASELINE)                                                                        |
| - Users, Roles, Customers, User Dietary Restrictions (BCK01, BCK02)                                |
| - Categories, Allergens, Multi-Role Products (BCK03, BCK04, BCK05)                                 |
| - Pizza Sizes, Component Types, Size Configurations (BCK06, BCK07, BCK08)                          |
| - Abstract Stock Balances (BCK09)                                                                  |
| - Predefined Pizza Recipes (BCK10)                                                                 |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v (Planned Evolution / Living Contract)
+----------------------------------------------------------------------------------------------------+
| SPRINTS 2 & 3 (EVOLUTIONARY TABLES)                                                                |
| - customer_orders & order_items: Order lifecycle, item states, kiosk anonymous orders (II.3.1.5)  |
| - order_item_customized_snapshots: JSONB / normalized storage of personalized pizza snapshots      |
| - kitchen_resources: Preparation stations and ovens with capacity slots (II.3.1.6, II.3.4)         |
| - preparation_activities: Assembly and baking tasks, dependency graph, durations (II.3.1.6)       |
+----------------------------------------------------------------------------------------------------+

```

### 6.1. Anticipated Database Schema Expansion

* **Customer Orders & Kiosk Orders (`customer_orders`):** Will incorporate `customer_id VARCHAR(36) NULL` to natively support anonymous kiosk checkouts.
* **Personalized Pizza Snapshots (`order_item_customized_snapshots`):** Will leverage PostgreSQL's native `JSONB` data type (established in **ADR-002** and **ADR-003**) to store the immutable frozen snapshot of components, prices, and derived allergens without polluting the general product catalogue.
* **Kitchen Operational Entities (`kitchen_resources`, `preparation_activities`):** Will establish state tables storing resource capacities (oven slots) and preparation dependencies (assembly before baking) to support the Prolog AI scheduling engine (`IART`).
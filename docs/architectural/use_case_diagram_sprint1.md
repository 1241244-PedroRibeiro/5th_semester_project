# LaPrizza — Developed Use Cases

# Historical Sprint 1 snapshot

> This file preserves the Sprint 1 use-case view for historical traceability. It is not the current consolidated use-case model and must not be used to infer Sprint 2 scope or current authorization. Consult [`use_case_diagram.md`](use_case_diagram.md) for the consolidated view and [`use_case_diagram_sprint2.md`](use_case_diagram_sprint2.md) for Sprint 2.

```mermaid
flowchart LR
    VISITOR["Visitor"]
    ACCOUNT["Account Holder"]
    CUSTOMER["Customer"]
    EMPLOYEE["Restaurant Employee"]
    MANAGER["LaPrizza Manager"]

    CUSTOMER -.->|is a| ACCOUNT
    EMPLOYEE -.->|is a| ACCOUNT
    MANAGER -.->|is a| ACCOUNT

    subgraph SYSTEM["LaPrizza — Developed Functionalities"]
        direction TB

        subgraph COMMON["Registration, Authentication and Public Consultation"]
            REGISTER(["Register Account"])
            LOGIN(["Log In"])
            BROWSE(["Browse Catalogue and Product Information"])
        end

        subgraph PERSONAL["Personal Account"]
            CONTACT(["Complete and Maintain Own Profile"])
            OWN_ACCOUNT(["Consult and Deactivate Own Account"])
            DIETARY(["Record and Consult Own Dietary Restrictions"])
        end

        subgraph ADMIN["Restaurant Administration"]
            USERS(["Manage User Accounts"])
            RESTRICTIONS(["Consult User Dietary Restrictions"])
            CATEGORIES(["Manage Product Categories"])
            ALLERGENS(["Manage Allergen Catalogue"])
            PRODUCTS(["Manage Products"])
            SIZES(["Manage Pizza Sizes"])
            TYPES(["Manage Pizza Component Types"])
            CONFIGURATIONS(["Configure Component Prices and Stock Consumption by Size"])
            STOCK(["Consult and Adjust Stock"])
            RECIPES(["Define Predefined Pizza Recipes"])
        end
    end

    VISITOR --- REGISTER
    VISITOR --- LOGIN
    VISITOR --- BROWSE

    ACCOUNT --- LOGIN
    ACCOUNT --- BROWSE
    ACCOUNT --- CONTACT

    CUSTOMER --- OWN_ACCOUNT
    CUSTOMER --- DIETARY

    MANAGER --- USERS
    MANAGER --- RESTRICTIONS
    MANAGER --- CATEGORIES
    MANAGER --- ALLERGENS
    MANAGER --- PRODUCTS
    MANAGER --- SIZES
    MANAGER --- TYPES
    MANAGER --- CONFIGURATIONS
    MANAGER --- STOCK
    MANAGER --- RECIPES

    classDef actor fill:#f1f5f9,stroke:#475569,color:#0f172a;
    class VISITOR,ACCOUNT,CUSTOMER,EMPLOYEE,MANAGER actor;
```

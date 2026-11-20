# LaPrizza — Consolidated Use Case Diagram

This is the consolidated view of customer, staff, and manager interactions across the delivered Sprint 1 and Sprint 2 scope, plus clearly marked candidate Sprint 3 capabilities. See [`use_case_diagram_sprint1.md`](use_case_diagram_sprint1.md) for the historical Sprint 1 view and [`use_case_diagram_sprint2.md`](use_case_diagram_sprint2.md) for the detailed Sprint 2 view.

**Status convention:** solid actor links and blue/amber use cases describe delivered application capabilities; grey dotted use cases are future scope and must not be read as implemented. AI03 and AI04 are reports/studies rather than runtime use cases and are intentionally excluded.

```mermaid
flowchart LR
    CUSTOMER([Registered customer])
    STAFF([Restaurant employee])
    MANAGER([Restaurant manager])
    GUEST([Guest])
    IDP([External identity provider])

    subgraph AUTH_SCOPE[Shared authentication and authorization]
        UC09([Resolve roles and authorize protected requests])
    end

    subgraph CUSTOMER_SCOPE[Customer and public capabilities]
        UC01([Browse and filter catalogue])
        UC02([View product, price, allergen, and availability details])
        UC03([Register customer account])
        UC04([Authenticate locally or with OIDC])
        UC05([Activate invited account])
        UC06([Complete required phone profile])
        UC07([Manage own dietary restrictions])
        UC08([Maintain local cart draft])
    end

    subgraph MANAGER_SCOPE[Restaurant management]
        UC10([Manage users and staff roles])
        UC11([Invite and activate staff])
        UC12([Consult role-change history])
        UC13([Access customer-management capabilities — partial WEB05 scope])
        UC14([Manage categories and allergens])
        UC15([Manage products and availability])
        UC16([Manage pizza sizes and component types])
        UC17([Configure component sizes and stock units])
        UC18([Manage stock balances])
        UC19([Manage predefined pizza recipes])
        UC20([Manage kitchen configuration])
        UC21([Manage consumption forecasts])
        UC22([Manage supplier scenarios])
        UC23([Execute, inspect, and replay AI planning])
    end

    subgraph STAFF_SCOPE[Restaurant staff view]
        UC24([View active 3D kitchen])
    end

    subgraph AI_SCOPE[Internal AI support]
        UC25([Calculate bill of materials])
        UC26([Calculate daily requirements and supplier proposals])
        UC27([Prepare backend data for Prolog])
    end

    subgraph VIS_SCOPE[3D visualization]
        UC28([Embed 3D module])
        UC29([Load active kitchen layout])
        UC30([View assembly-line representation])
        UC31([View materials and textures])
        UC32([Render and adjust scene lighting])
        UC33([Navigate with perspective camera])
    end

    subgraph FUTURE_SCOPE[Sprint 3 candidate scope — not delivered in Sprint 2]
        UC40([Submit customer order and checkout])
        UC41([View accepted order history and status])
        UC42([Confirm supplier purchase order])
        UC43([Schedule production by kitchen resources])
        UC44([Animate production process])
        UC45([Configure pizza in 3D])
    end

    CUSTOMER --- UC01
    CUSTOMER --- UC02
    CUSTOMER --- UC03
    CUSTOMER --- UC04
    CUSTOMER --- UC06
    CUSTOMER --- UC07
    CUSTOMER --- UC08
    GUEST --- UC01
    GUEST --- UC02
    GUEST --- UC03
    GUEST --- UC04
    GUEST --- UC05
    IDP --- UC04

    MANAGER --- UC04
    MANAGER --- UC10
    MANAGER --- UC11
    MANAGER --- UC12
    MANAGER --- UC13
    MANAGER --- UC14
    MANAGER --- UC15
    MANAGER --- UC16
    MANAGER --- UC17
    MANAGER --- UC18
    MANAGER --- UC19
    MANAGER --- UC20
    MANAGER --- UC21
    MANAGER --- UC22
    MANAGER --- UC23
    MANAGER --- UC24
    STAFF --- UC04
    STAFF --- UC24

    UC04 -. establishes identity .-> UC09
    UC09 -. gates protected operations .-> UC10
    UC09 -. gates protected operations .-> UC20
    UC09 -. gates protected operations .-> UC23
    UC11 -. activation .-> UC05
    UC15 -. classified by .-> UC14
    UC19 -. uses .-> UC15
    UC19 -. uses .-> UC16
    UC19 -. uses .-> UC17
    UC23 -. uses selected forecast .-> UC21
    UC23 -. uses confirmed scenario .-> UC22
    UC23 -. invokes .-> UC25
    UC23 -. invokes .-> UC26
    UC25 -. uses prepared data .-> UC27
    UC26 -. uses prepared data .-> UC27
    UC24 -. renders .-> UC28
    UC28 -. loads .-> UC29
    UC30 -. extends view .-> UC29
    UC31 -. styles .-> UC30
    UC32 -. applies to .-> UC29
    UC33 -. navigates .-> UC29

    CUSTOMER -. future checkout .-> UC40
    CUSTOMER -. future order history .-> UC41
    MANAGER -. future purchasing .-> UC42
    MANAGER -. future scheduling .-> UC43
    MANAGER -. future production animation .-> UC44
    CUSTOMER -. possible future configurator .-> UC45

    classDef actor fill:#f1f5f9,stroke:#475569,color:#0f172a;
    classDef delivered1 fill:#fef3c7,stroke:#d97706,color:#0f172a;
    classDef delivered2 fill:#dbeafe,stroke:#3b78c4,color:#0f172a;
    classDef partial fill:#ffedd5,stroke:#ea580c,color:#0f172a,stroke-dasharray:4 3;
    classDef future fill:#e5e7eb,stroke:#6b7280,color:#0f172a,stroke-dasharray:5 5;
    class CUSTOMER,STAFF,MANAGER,GUEST,IDP actor;
    class UC01,UC02,UC03,UC07,UC08,UC10,UC14,UC15,UC16,UC17,UC18,UC19 delivered1;
    class UC04,UC05,UC06,UC09,UC11,UC12,UC20,UC21,UC22,UC23,UC24,UC25,UC26,UC27,UC28,UC29,UC30,UC31,UC32,UC33 delivered2;
    class UC13 partial;
    class UC40,UC41,UC42,UC43,UC44,UC45 future;
```

## Interpretation and boundaries

- The public catalogue can be browsed without an account. Customer account and phone-profile requirements apply to the protected customer actions described in AA02/AA07.
- “Maintain local cart draft” is not a server-side order. Sprint 2 does not deliver checkout, payment, accepted customer orders, or customer order history.
- Kitchen configuration is manager-managed. Both managers and employees can view the active kitchen visualization; viewing does not grant configuration-write access.
- AI planning is a manager capability. AI01/AI02 are calculations backed by AI05/AI06; Prolog is an internal service, not an end-user actor. A proposal is not a purchase order, and planning does not mutate stock.
- Sprint 3 items are explicit future candidates, not claims about a committed or completed Sprint 3 requirement. In particular, purchase-order confirmation and customer order lifecycle require their own approved requirements.
- “Administrator” in the AA06 story is a functional designation of Manager per Clarification #24. The current code’s `ADMINISTRATOR` role remains an implementation/requirements discrepancy to reconcile; this diagram does not introduce a separate business actor.
- WEB05 customer-management and employee query pages have recorded acceptance-criteria gaps. UC13 is marked partial to avoid representing the whole story as complete.

# LaPrizza — Use Cases — Sprint 2

This diagram models the implemented Sprint 2 application use cases and their supporting services. It complements [`use_case_diagram_sprint1.md`](use_case_diagram_sprint1.md) and the [full current/future diagram](use_case_diagram.md).

**Scope:** Sprint 2 adds authentication/authorization stories AA01–AA07, WEB06–WEB07, AI01–AI02/AI05–AI06, and VIS01–VIS07. AI03 and AI04 are academic/report deliverables, so they are intentionally not shown as runtime use cases. Customer checkout, payment, accepted-order lifecycle, and purchase-order creation are not implemented Sprint 2 use cases. AI planning is read-only.

```mermaid
flowchart LR
    CUSTOMER([Registered customer])
    STAFF([Restaurant employee])
    MANAGER([Restaurant manager])
    GUEST([Guest])
    IDP([External identity provider])

    subgraph AUTH[Authentication and authorization]
        AA01([AA01 Local authentication])
        AA02([AA02 OIDC authentication])
        AA03([AA03 Resolve application roles])
        AA04([AA04 Manage browser session])
        AA05([AA05 Authorize protected operations])
        AA06a([AA06 Invite staff])
        AA06b([AA06 Assign or revoke roles])
        AA06c([AA06 View role history])
        AA06d([AA06 Activate or deactivate account])
        AA07a([AA07 Register customer])
        AA07b([AA07 Activate invited account])
        PHONE([Complete required customer phone profile])
    end

    subgraph WEB[Back-office web capabilities]
        WEB06a([WEB06 Manage kitchen configuration])
        WEB06b([View active 3D kitchen])
        WEB07a([WEB07 Manage consumption forecasts])
        WEB07b([WEB07 Manage supplier scenarios])
        WEB07c([WEB07 Execute, inspect, and replay planning])
    end

    subgraph AI[AI planning capabilities]
        AI01([AI01 Calculate bill of materials])
        AI02([AI02 Calculate daily requirements and proposals])
        AI05([AI05 Call AI service through backend])
        AI06([AI06 Export bounded backend data to Prolog])
    end

    subgraph VIS[3D visualization]
        VIS01([VIS01 Embed visualization module])
        VIS02([VIS02 Load active kitchen layout])
        VIS03([VIS03 View assembly-line representation])
        VIS04([VIS04 View materials and textures])
        VIS05([VIS05 Render scene lighting])
        VIS06([VIS06 Adjust lighting interactively])
        VIS07([VIS07 Navigate with perspective camera])
    end

    CATALOG([Browse and filter public catalogue])
    DIET([Manage own dietary restrictions])

    CUSTOMER --- AA01
    CUSTOMER --- AA02
    CUSTOMER --- PHONE
    CUSTOMER --- CATALOG
    CUSTOMER --- DIET
    GUEST --- AA01
    GUEST --- AA02
    GUEST --- AA07a
    GUEST --- AA07b
    GUEST --- CATALOG
    IDP --- AA02

    STAFF --- AA01
    STAFF --- AA02
    STAFF --- WEB06b
    MANAGER --- AA01
    MANAGER --- AA02
    MANAGER --- AA06a
    MANAGER --- AA06b
    MANAGER --- AA06c
    MANAGER --- AA06d
    MANAGER --- WEB06a
    MANAGER --- WEB06b
    MANAGER --- WEB07a
    MANAGER --- WEB07b
    MANAGER --- WEB07c

    AA01 -. resolves roles .-> AA03
    AA02 -. resolves roles .-> AA03
    AA03 -. establishes session .-> AA04
    AA04 -. protects requests .-> AA05
    AA02 -. missing phone .-> PHONE
    AA06a -. issues activation invitation .-> AA07b
    AA06b -. records changes .-> AA06c

    WEB07c -. calls .-> AI05
    AI05 -. delegates calculation .-> AI01
    AI05 -. delegates calculation .-> AI02
    AI05 -. obtains calculation facts .-> AI06
    WEB07c -. selects .-> WEB07a
    WEB07c -. selects .-> WEB07b

    WEB06b -. reads active configuration .-> WEB06a
    WEB06b -. realizes .-> VIS01
    VIS01 -. loads .-> VIS02
    VIS03 -. specializes view .-> VIS02
    VIS04 -. styles .-> VIS03
    VIS05 -. lights .-> VIS02
    VIS06 -. controls .-> VIS05
    VIS07 -. navigates .-> VIS02

    classDef actor fill:#f1f5f9,stroke:#475569,color:#0f172a;
    classDef s2 fill:#dbeafe,stroke:#3b78c4,color:#0f172a;
    class CUSTOMER,STAFF,MANAGER,GUEST,IDP actor;
    class AA01,AA02,AA03,AA04,AA05,AA06a,AA06b,AA06c,AA06d,AA07a,AA07b,PHONE,WEB06a,WEB06b,WEB07a,WEB07b,WEB07c,AI01,AI02,AI05,AI06,VIS01,VIS02,VIS03,VIS04,VIS05,VIS06,VIS07,CATALOG,DIET s2;
```

## Reading notes

- A manager manages kitchen configurations; employees may view the active kitchen but do not receive the configuration editor use case.
- AI planning and its supporting endpoints are manager-authorized. Customers do not execute planning.
- OIDC is a sign-in method, not a distinct application user role. The identity provider participates only in the OIDC authentication use case.
- AA06’s user-story language calls the actor “Administrator”, while Clarification #24 defines that as the functional designation of a Manager. The implementation currently also has an `ADMINISTRATOR` role in some account lifecycle operations; this discrepancy is tracked in the story/clarification and is not represented here as an independent business actor.
- AI06 is an internal backend-to-Prolog data preparation capability, not a direct user interaction. Prolog receives bounded JSON over HTTP and has no direct database access.
- `AI02` outputs planning proposals, not purchase orders; planning does not mutate stock. The customer cart remains a draft and no Sprint 2 checkout/order lifecycle is implied.

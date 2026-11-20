# AI06 knowledge-base access examples

> **Clarification #55:** `GET /products/export` is an existing
> manager-authorized diagnostic export, not the service-to-service API contract
> required for Prolog to build its KB. The target needs documented, read-only,
> service-authorized endpoint(s) for the relevant planning data. Exact paths,
> authentication and snapshot/replay semantics remain to be designed; the
> current planning implementation still pushes a complete payload.

The current implementation exposes a manager-authorized product and BOM
diagnostic export. It is not the Prolog service's data source required by #55:

```http
GET /products/export
Authorization: Bearer <manager-token>
```

The response is one complete business-key payload. It contains:

- `products[]`, including current stock and `stockUnitsPerSale`;
- `boms[]`, including recipe lines and available pizza sizes;
- `componentSizeConfigurations[]`, preserving stock-unit consumption per
  component and size;
- `exportedAt`, identifying when the input set was retrieved.

The export does not contain customer, user, authentication or dietary data.
The response is read-only and does not change stock or create purchase orders.

## Authorization

- Missing or invalid authentication returns `401`.
- A non-manager authenticated user returns `403`.
- A manager receives `200` and the complete payload.

## Relationship with planning

**Current implementation (superseded by #55):** `PlanningService` constructs a
fresh, request-specific Prolog payload from backend repositories. The export
endpoint is a diagnostic and authorized representation of the catalogue/BOM
part of that knowledge base; Prolog does not read the database directly.

**Required target:** Prolog retrieves the data it needs through the new
service-authorized backend API and constructs its own per-run KB. It still must
not read the database directly. The backend must retain a coherent immutable
input snapshot so replay reproduces the original calculation.

The Bruno collection
[`AI06-DATA-KB`](../../backend/tests/bruno/LaPrizza/AI06-DATA-KB)
checks authorization, required sections, business identifiers, size-dependent
stock consumption and the absence of personal-data keys.

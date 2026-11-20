# AI05 access examples: AI01 BOM

All examples use JSON business identifiers and require a bearer token issued to
an active `MANAGER`. The backend remains authoritative; the browser must not
be treated as an authorization boundary.

## Access control — 401 and 403

Requests without a bearer token, or with an invalid/expired token, return
`401 Unauthorized`. A valid token for `CUSTOMER` or another non-manager role
returns `403 Forbidden`; the controller is not entered and the attempt is
audited.

## Success — 201

```http
POST /planning/bom-executions HTTP/1.1
Authorization: Bearer <manager-token>
Content-Type: application/json

{"orders":[{"productSku":"PIZ-MARGHERITA","pizzaSize":"Medium","quantity":2}],"referenceDate":"2026-11-05","isSimulated":true,"source":"simulated"}
```

The response is a `PlanningResultResponseDTO` with `requirements` and
`unmetNeeds`. It contains no UUID-based product references.

## Domain validation — 422

```http
POST /planning/bom-executions HTTP/1.1
Authorization: Bearer <manager-token>
Content-Type: application/json

{"orders":[{"productSku":"PRD-NOT-A-PIZZA","quantity":1}],"isSimulated":true,"source":"simulated"}
```

The response identifies the offending business SKU. A structurally malformed
body, such as a missing `orders` array, is `400` instead.

## Upstream unavailable — 502

```http
POST /planning/bom-executions HTTP/1.1
Authorization: Bearer <manager-token>
Content-Type: application/json

{"orders":[{"productSku":"PIZ-MARGHERITA","pizzaSize":"Medium","quantity":1}],"isSimulated":true,"source":"simulated"}
```

If the Prolog container is stopped, the backend returns `502` and does not
fabricate a successful result. Restart the container and retry explicitly.

# AI05 access examples: AI02 Requirements Planning

## Success — 201

```http
POST /planning/executions HTTP/1.1
Authorization: Bearer <manager-token>
Content-Type: application/json

{"forecastName":"Week-45","scenarioName":"Autumn-Scenario","referenceDate":"2026-11-05"}
```

The response contains `requirements`, `proposals` and `unmetNeeds`. Supplier
codes, forecast names and scenario names remain business identifiers.

## Invalid/domain data — 422

```http
POST /planning/executions HTTP/1.1
Authorization: Bearer <manager-token>
Content-Type: application/json

{"forecastName":"Week-Missing-Units","scenarioName":"Autumn-Scenario"}
```

The backend rejects a stock-controlled sellable product with missing
`stockUnitsPerSale`. Missing forecast or scenario aggregates are `404`; an
unconfirmed scenario is `409`.

## Upstream unavailable — 502

Stop Prolog with `docker compose stop prolog`, repeat the valid request, and
expect `502`. Run `docker compose start prolog` and retry only after the health
check succeeds.

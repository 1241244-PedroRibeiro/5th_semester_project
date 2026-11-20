# AI05 access examples: history and replay

## History

```http
GET /planning/executions?pageSize=20&pageStartIndex=0 HTTP/1.1
Authorization: Bearer <manager-token>
```

This returns the most recent `PlanningResultResponseDTO` records first. Optional
`forecastName` and `scenarioName` filters use business names.

## Detail

```http
GET /planning/executions/42 HTTP/1.1
Authorization: Bearer <manager-token>
```

An unknown execution returns `404`.

## Replay

```http
POST /planning/executions/42/replay HTTP/1.1
Authorization: Bearer <manager-token>
```

Replay uses the request-scoped Prolog payload stored with the original
immutable snapshot, creates a new result with `isReplay: true`, and leaves the
original result unchanged. A Prolog failure returns `502`.

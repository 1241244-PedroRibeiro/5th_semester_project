# AA05 - Authorization Enforcement

These four requests exercise authorization and HTTP delivery of the access-denied route with active accounts and valid sessions:

| Request | Actor | Endpoint | Expected result |
| --- | --- | --- | --- |
| 01 | MANAGER | `GET /users?page=1&pageSize=2` | `200`, paginated user list without credentials |
| 02 | CUSTOMER (without MANAGER role) | `GET /user/:ownUsername` | `200`, only the authenticated customer's profile |
| 03 | CUSTOMER (without MANAGER role) | Same manager-only endpoint as request 01 | `403`, standard forbidden response without user-list data |
| 04 | CUSTOMER (without MANAGER role) | Manager-only API request, then frontend `GET /unauthorized` | API `403`, then frontend `200` HTML application shell |

Select the collection's **Local** environment and run this folder, or run any request independently. The backend/database must be running with current migrations and active development fixtures. Every request logs in first through `bru.sendRequest`, validates the actor's role/status, and uses the returned token, including its persisted session. No stale environment token or locally signed JWT is used. Runtime variables use the `aa05` prefix and tokens are not written to the environment file.

Defaults match the development fixtures: `manager@laprizza.test` and `customer@laprizza.test`, both with password `Manager123!`. If needed, set `aa05ManagerEmail`, `aa05ManagerPassword`, `aa05CustomerEmail`, and `aa05CustomerPassword` in your local environment. The customer fixture must not have the MANAGER role. A missing/inactive fixture or failed login stops the request rather than confusing an authentication failure (`401`) with the expected authorization denial (`403`).

The requests do not change business data. Logins create normal sessions, which expire after 15 minutes. With unauthorized-attempt logging enabled, requests 03 and 04 each add one audit row for the customer with endpoint `GET /users`; the successful endpoint requests do not add audit rows. These Bruno tests assert the HTTP behavior. They do not query the audit table because no log-reading API is exposed; persisted audit behavior is covered by the backend PostgreSQL integration tests.


## Error-page delivery (request 04)

Request 04 logs in a customer, verifies `GET /users` is denied with `403`, and explicitly fetches the frontend `/unauthorized` URL. Both the backend and frontend must be running. Set `aa05FrontendBaseUrl` to the browser-facing origin; the default is `https://localhost` for Docker/Nginx. For Angular development, set it to your actual frontend URL, such as `http://localhost:4200` or `https://localhost:4200`. Use your existing certificate trust configuration for local HTTPS.

The frontend URL intentionally receives no bearer token from this test. It is public and returns `200` with the Angular HTML shell. The original API request remains a JSON `403`; the server does not send an HTTP redirect or a rendered error page.

Bruno does not execute Angular, so this test checks HTTP delivery of the error-page route after a denial. It cannot assert the visible **Access denied** heading or automatic navigation. Those behaviors are covered by `frontend/e2e/authorization.spec.ts`, including customer/staff denials and reloads.

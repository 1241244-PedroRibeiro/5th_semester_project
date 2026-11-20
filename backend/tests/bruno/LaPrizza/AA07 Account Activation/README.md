# AA07 account activation

For the Docker Compose environment, use `https://localhost/api` as
`baseUrl`. The backend is intentionally not published on host port 3000;
requests enter through the HTTPS reverse proxy. If Bruno rejects the local
development certificate, enable its insecure/self-signed certificate option
for this environment.

To prepare the variables automatically, run this from the repository root:

```powershell
& '.\backend\tests\bruno\LaPrizza\AA07 Account Activation\prepare-aa07-environment.ps1'
```

The script logs in with the local manager fixture, creates the external
invitation, reads the local and used tokens from PostgreSQL, and writes the
ignored file `backend/tests/bruno/LaPrizza/environments/AA07.local.json`.
Import that file into Bruno and select the `AA07 Local` environment. To use
different fixture emails or credentials:

```powershell
& '.\backend\tests\bruno\LaPrizza\AA07 Account Activation\prepare-aa07-environment.ps1' `
  -ManagerEmail 'manager@laprizza.test' `
  -ManagerPassword 'Manager123!' `
  -LocalEmail 'josealves@laprizza.test' `
  -ExternalEmail 'pedro.teste@laprizza.com'
```

The generated file contains environment-specific invitation tokens and is
ignored by Git. Never commit it or share it outside the test environment.

These requests validate the public invitation inspection and local activation
failure cases. They do not create or expose invitation tokens. Before running
the collection, set these variables in the Bruno environment:

- `activationToken`: an unused `LOCAL_ACCOUNT_ACTIVATION` token;
- `usedActivationToken`: a token already consumed by a successful activation;
- `externalActivationToken`: an unused `EXTERNAL_IDP_MATCH` token;
- `weakPassword`: a password that fails the password policy.

Run the requests in any order. Request 01 should return `200`, request 02
should return `404`, request 03 should return `410`, request 04 should return
`422`, and request 05 should return `422`. The token values must belong to a
test environment and must not be committed.

To validate role and consent preservation after a successful activation, record
the result of this query before and after the activation:

```powershell
docker exec laprizza_postgres psql -U laprizza_user -d laprizza_db -c "SELECT u.username, u.status, u.marketing_consent, COALESCE(string_agg(ura.role_name, ',' ORDER BY ura.role_name), '') AS roles FROM users u LEFT JOIN user_role_assignments ura ON ura.username = u.username WHERE u.username = '<username>' GROUP BY u.username, u.status, u.marketing_consent;"
```

The status must change from `PENDING_REGISTRATION` to `ACTIVE`, while
`marketing_consent` and the role list must remain unchanged.

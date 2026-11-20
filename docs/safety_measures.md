# Safety Measures


## Rate limiting

Nginx limits API traffic before forwarding it to the backend. This reduces request floods and
protects backend resources. It is not a replacement for upstream DDoS protection: requests still
reach Nginx, and a distributed attack can remain below each IP's allowance.

```nginx
limit_req_zone $binary_remote_addr zone=api_per_ip:10m rate=2r/s;

server {
	...

	location ^~ /api/ {
		limit_req zone=api_per_ip burst=20 nodelay;
		limit_req_status 429;

		...
	}

	...
}
```

The limit applies per client IP to `/api/`, with a sustained rate of two requests per second and
20 excess burst slots. Allowed bursts are forwarded immediately; requests beyond the allowance
receive HTTP `429`. Static frontend assets are outside this limit.

### Item pictures

Item pictures are served by the backend (ADR-018), and a catalogue page requests one picture per
item at once, which would exhaust the 20-slot burst above. The picture routes (`/api/images/` and
`/api/v1/images/`) therefore have their own locations that share the same `api_per_ip` zone and
two-requests-per-second sustained rate, but allow 100 burst slots. They also raise
`client_max_body_size` to `6m` so 5 MB uploads reach the backend; every other route keeps Nginx's
default 1 MB body limit.

```nginx
location ^~ /api/images/ {
	limit_req zone=api_per_ip burst=100 nodelay;
	limit_req_status 429;
	client_max_body_size 6m;
	...
}
```

The backend validates every upload again: only `MANAGER` accounts may upload, files are limited to
5 MB, only JPEG, PNG, WEBP and GIF are accepted, and the file's leading bytes must match its
declared type. Pictures are stored under a file name derived from the item's SKU, never from the
uploaded file name, so an upload cannot write outside the pictures directory. The default picture
for items without one is an SVG whose item name is XML-escaped and which is sent with
`X-Content-Type-Options: nosniff` and a restrictive `Content-Security-Policy`.

## Login attempts correlated with IP addresses

`POST /auth/login` has additional backend protection because an IP limit alone cannot stop many
computers targeting the same account. `LoginRateLimitGuard` reads the client IP from the HTTP
request (`request.ip`, with the socket address as a fallback), then calls `LoginAbuseService`
before credentials are verified. The controller reports the authentication result afterward.

| Scope | Policy | Protection |
| --- | --- | --- |
| IP, across all submitted accounts | At most 20 login attempts in a rolling minute, including successes and account-throttled requests | Slows one source making many guesses or trying many different accounts |
| Normalized email and IP pair | Five failed attempts in 15 minutes trigger a five-minute pause for that pair | Stops repeated guessing against one account from one source |
| Normalized email, across every IP | Ten failed attempts in 15 minutes trigger an account-wide password-login cooldown | Stops an attacker bypassing account protection by changing IPs or distributing guesses across computers |

Account cooldowns escalate with repeated batches: 1, 2, 4, 8, then 15 minutes, capped at 15 minutes.
Each triggered cooldown starts a fresh failure batch. A successful login clears previous failures
for the account and the successful pair, and resets their escalation. It does not reset the IP
quota or other pairs. Pending, deactivated, and unknown accounts receive the same counter policy;
the existing account-status responses are preserved. Malformed email submissions still consume
the IP quota. Infrastructure failures release their reserved slots and do not count as incorrect
passwords.

The threshold attempt receives the usual authentication error; subsequent requests during the
cooldown receive a generic HTTP `429` with a `Retry-After` header in seconds. These responses do
not identify which limit was exceeded. No permanent account deactivation is performed, existing
sessions remain valid, and password recovery remains available under its existing controls.
Temporary account restrictions can still be deliberately triggered to inconvenience a user;
bounded cooldowns limit this risk. Tune thresholds using legitimate traffic and false rejections.

### Shared state and concurrent requests

Counters live in PostgreSQL's `login_attempt_buckets` table, mapped by TypeORM's
`LoginAttemptBucketEntity`, shared by all backend instances and retained across application
restarts. The store uses entity repositories and the query builder for inserts, reads, updates,
and bounded cleanup. Short transactions lock bucket rows in a consistent order.
Each admitted login reserves an account and pair slot before password verification; those slots
count toward the thresholds while verification is in progress. This prevents simultaneous
requests from all passing the same check. Password hashing and session creation run outside
these transactions, so they do not hold database row locks while performing expensive work.

Completion converts reservations to failures or releases them. Reservations expire after two
minutes if a process crashes. Storage or lock failures fail closed with HTTP `503`; credentials
are not checked if admission cannot be recorded. Buckets expire after 24 hours without updates,
including escalation history. Each store operation removes up to 100 expired rows using an
expiry index and skipping locked rows; cleanup resumes with traffic after idle periods.

Bucket keys are SHA-256 digests of scope, normalized email (trimmed and lowercased), and/or IP.
Counter state contains attempt IDs, timestamps, reservation flags, and cooldown information.
Submitted passwords, raw emails, and raw IPs are not stored in this table. These deterministic
digests are pseudonymous identifiers, not anonymous data. This table is bounded counter state,
not a permanent login audit log.

### Trusted proxy boundary

Express accepts forwarded client addresses only from IPs/CIDRs explicitly listed in
`TRUSTED_PROXY_CIDRS`. An empty value means direct connections use the socket IP; arbitrary
`X-Forwarded-For`, `X-Real-IP`, or request-body IP fields cannot select a different counter.
The application rejects proxy hop counts, `true`, and `/0` networks as configuration values.

Docker Compose gives the Nginx container the fixed address `172.30.240.10` on the private
`172.30.240.0/24` network and configures the backend to trust only `172.30.240.10/32`.
Nginx overwrites forwarding headers with its observed client address. The backend no longer
publishes port 3000 to the host; traffic reaches it through Nginx's `/api/` proxy. Local development
outside Docker still supports direct backend connections with no trusted proxy configured.
If this subnet conflicts with your environment, change the subnet, Nginx address, and trusted
proxy value together.

If another proxy or CDN is placed ahead of Nginx, configure Nginx's real-IP handling to trust only
that upstream provider's actual addresses. Otherwise Nginx will see the upstream proxy as the
client, grouping its users into one IP quota. Never trust forwarding headers from arbitrary peers.

### Deployment and verification

Run the new TypeORM migration before serving login traffic (`npm run migration:run` for local
TypeScript development). The container's production startup already runs pending migrations.
Recreate the Docker services when adopting the private-network changes; no live deployment or
database migration is performed by this source change.

Tests cover rolling windows, normalized identities, pair isolation, distributed attacks,
cooldown escalation and expiration, success resets, concurrent reservations, spoofed HTTP
headers, `429`/`Retry-After`, and storage failures. PostgreSQL tests use isolated schemas to
verify atomic updates across independent service instances, cleanup, and migration rollback.

These controls slow online password guessing and credential stuffing. They cannot guarantee
that a correct stolen password is rejected on its first attempt, prevent offline cracking of
leaked password hashes, or stop every low-volume distributed attack. MFA/passkeys and upstream
traffic protection provide additional layers.

References: [OWASP authentication guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html),
[Express proxy configuration](https://expressjs.com/en/guide/behind-proxies/),
and [Nginx request limiting](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html).

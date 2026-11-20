Open this directory in Bruno and select **Local**. The collection uses OpenCollection YAML: structural indentation uses spaces, and embedded JavaScript and JSON use tabs.

Start the backend at the configured `baseUrl` (default `http://localhost:3000`) with its PostgreSQL database and current seed data available. Run BCK01 through BCK11 sequentially, including setup folders. The manager/customer fixture credentials are `manager@laprizza.test` and `customer@laprizza.test`, both with password `Manager123!`. Login requests populate runtime tokens; no expired JWTs or database UUIDs are stored in the environment.

Users use `username`; categories, allergens, sizes and component types use names; products and stock use SKUs. Component size configuration records retain their UUID `id`. Registration sends no username: the server derives it from the email and appends 2, 3, etc. on collisions.

Authorized rename/product update requests and creates with absent or null product prices currently assert 501 with a pending-domain comment. Their intended payloads remain intact apart from the identifier migration. Separate priced-product requests exercise supported creation and provide fixtures for configuration/reference tests; they do not change the unpriced requests to use a default price. Component types cover both numeric and null maxima.

The collection creates test accounts and products. Product fixtures remain because the existing API has no product deletion route. Rerun each folder's setup before individual dependent requests. BCK08–BCK11 also depend on earlier fixture folders. The inactive/pending authentication cases sign local fixture tokens; configure `JWT_SECRET` only if the backend overrides its local default.

From this directory, with the Bruno CLI installed:

```sh
bru run -r --env Local --sandbox developer --bail
```

See [API-MIGRATION.md](API-MIGRATION.md) for current contracts, file changes, blocked requests and validation limitations.

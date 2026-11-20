# ADR 018: Item Pictures Stored in a Docker Volume and Served by the Back-End

- **Status:** Accepted
- **Date:** 2026-11-19
- **Decision Makers:** LaPrizza Development Team
- **Relationship:** Complements [ADR-001](ADR-0001-architectural-style.md) (new outbound port and adapter), [ADR-003.2](ADR-003.2-persistence.md) (binary media kept outside PostgreSQL) and [ADR-005.2](ADR-005.2-rest-api.md) (binary media representations on the REST API).

## Context

The storefront and back-office show a picture for every sellable item (products such as beverages and sides, and predefined pizzas). Until now these pictures were static files bundled into the Angular SPA (`frontend/src/app/frontoffice/assets/images`), and the SPA picked the file through a hard-coded SKU-to-file map in `storefront-models.ts`, with a name-based regular expression as a fallback.

This created three problems:

1. **Pictures were not product data.** A Manager creating a product or a predefined pizza in the back-office had no way to give it a picture. New items appeared without an image until a developer changed the front-end code and rebuilt the SPA image.
2. **Coupling between catalogue and front-end build.** Every new item required a front-end change (new file plus a new map entry). The Back-End API, which owns the catalogue (ADR-005), had no knowledge of the pictures.
3. **No persistence across deployments.** Pictures uploaded at runtime cannot live inside the immutable Nginx/SPA container image; they would be lost on every rebuild or redeploy.

We must decide where item pictures are stored, which component serves them, how they are uploaded, and what the client sees when an item has no picture.

## Decision

Item pictures are **stored as files in a named Docker volume** (`laprizza-pictures`) mounted in the back-end container at **`/app/data/pictures`**, and are **served and uploaded exclusively through the Back-End REST API** by a dedicated `ImageController` and `ImageService`.

1. **Storage:** Each picture is stored as `<SKU>.<ext>` (e.g., `PIZ-MARGHERITA.jpg`). The SKU is the item's business identifier, so a product and its predefined pizza share one picture. Uploading a new picture replaces any previous one for the same SKU, whatever its extension. The directory is configurable through `PICTURES_DIR` (default `data/pictures` relative to the working directory, for local development without Docker).
2. **Layering (ADR-001):** `ImageService` (application layer) depends only on the outbound port `IImageStorage` (`find`, `save`). The filesystem is accessed solely by the outbound adapter `FileSystemImageStorage` (`infrastructure/storage`), wired in `ImageModule`. Item resolution reuses the existing `IProductRepository` and `IPredefinedPizzaRepository` ports.
3. **Retrieval — `GET /api/v1/images/{nameOrSku}`:** Public endpoint (`@Public()`), so `<img>` elements can load it without a bearer token. The identifier is resolved in order: product SKU, product name (case-insensitive), then predefined pizza recipe name (case-insensitive). The response is the binary image with its `Content-Type`, `X-Content-Type-Options: nosniff` and a short `Cache-Control`.
4. **Default picture:** When the item does not exist or has no stored picture, the endpoint returns `200 OK` with a generated SVG placeholder that states *"No image available — There is no picture related to this item"* and the requested name. The response carries `X-Image-Placeholder: true` and `Cache-Control: no-cache`, so a picture uploaded later replaces it immediately. User-supplied text in the SVG is XML-escaped and the response is sent with a restrictive `Content-Security-Policy`.
5. **Upload — `POST /api/v1/images/{nameOrSku}`:** Restricted to `MANAGER` with the standard guard pipeline (`JwtAuthGuard`, `StatusGuard`, `RolesGuard`), following `ProductController`. The body is `multipart/form-data` with a single `image` field (NestJS `FileInterceptor`, in memory). Only JPEG, PNG, WEBP and GIF up to 5 MB are accepted, and the file's magic bytes must match its declared type. Failures are thrown as Nest exceptions (`400`, `404`) and rendered by the `GlobalExceptionFilter`. Success returns `201 Created` with `{ sku, fileName, contentType, size }`.
6. **Back-office flow:** Creating a product or a predefined pizza **requires** a picture; editing accepts an optional replacement. The SPA saves the item first and then uploads the picture for the returned SKU.
7. **Storefront:** `productImage()` always returns `/api/images/{sku or name}`; the hard-coded map and bundled item pictures are removed. Decorative, non-item artwork (e.g., hero banners) remains in the SPA.
8. **Gateway:** Nginx exposes `/api/images/` through its own location, with a higher rate-limit burst than `/api/` (a catalogue page loads many pictures at once) and `client_max_body_size 6m` for uploads.
9. **Seed pictures:** The initial pictures live in `backend/data/pictures/` and are copied into the back-end image (`COPY data/pictures ./data/pictures`). Docker initialises a new, empty named volume from that directory, so a fresh deployment starts with the seeded pictures, while an existing volume keeps the pictures uploaded at runtime.

## Considered Alternatives

### 1. Keep pictures bundled in the Angular SPA
- *Description:* Maintain the static files and the SKU-to-file map in the front-end.
- *Pros:* No back-end work; served directly by Nginx with no API round-trip.
- *Cons:* Rejected. Managers cannot attach a picture when creating an item; every new item needs a code change and a front-end rebuild; the catalogue owner (the API) does not know about pictures.

### 2. Store pictures in PostgreSQL (`BYTEA` column)
- *Description:* Persist the picture bytes in a table referencing `products.sku`.
- *Pros:* Transactional with the product row; included in database backups; referential integrity with the product.
- *Cons:* Rejected. Inflates the database and its backups with binary media, adds memory pressure on every row load through TypeORM, and needs a migration for no business invariant gain: a picture carries no rule that PostgreSQL must enforce (ADR-003.2).

### 3. External object storage (S3-compatible, e.g., MinIO)
- *Description:* Store pictures in a bucket and serve them via pre-signed or public URLs.
- *Pros:* Scales horizontally; standard for production media.
- *Cons:* Rejected for now. Adds another container, credentials and SDK for a single-instance deployment, contrary to the simplicity principle followed in ADR-003 and ADR-012. The `IImageStorage` port allows replacing the filesystem adapter with an object-storage adapter later without changing the application layer.

### 4. Serve the volume directly from Nginx as static files
- *Description:* Mount the volume read-only in the Nginx container and expose `/pictures/<SKU>.jpg`.
- *Pros:* Fastest delivery, no back-end involvement on reads.
- *Cons:* Rejected. Lookup by product name or pizza recipe name and the default picture require catalogue knowledge that only the back-end has; uploads still need the back-end, so storage rules would be split across two components.

## Consequences

### Positive
- **Pictures become catalogue data:** Managers attach and replace pictures from the back-office; the SPA needs no change for new items.
- **Durability:** Runtime uploads survive container rebuilds and redeploys because they live in a named volume, not in an image.
- **Single owner:** The Back-End API owns retrieval, upload validation, authorization and the default picture; clients only build a URL.
- **Graceful degradation:** Items without a picture always render the default image instead of a broken `<img>`.
- **Replaceable storage:** The `IImageStorage` port isolates the filesystem; moving to object storage only needs a new adapter.

### Negative / Trade-offs
- **Single-instance storage:** A local named volume is not shared between hosts. Scaling the back-end horizontally would require a shared volume or object storage (Alternative 3).
- **Backups:** Pictures are not included in PostgreSQL backups; the `laprizza-pictures` volume must be backed up separately.
- **No referential integrity:** Renaming or removing a product does not touch its picture file; an orphan picture is harmless but is not cleaned up automatically.
- **Two-step creation:** The item is saved before its picture is uploaded. If the upload fails, the item exists without a picture (the default image is shown) and the back-office reports the partial save.
- **Seeds only on first creation:** New seed pictures added to `backend/data/pictures/` are not copied into an already existing volume; they must be uploaded through the API or the volume recreated.

## Verification

Unit tests (`tests/unit/application/image.service.spec.ts`) cover retrieval by SKU, product name and pizza recipe name; the default placeholder (including XML escaping of the item label); replacement of a previous picture with a different extension; and rejection of unknown items, missing files, mismatched magic bytes, unsupported types and empty identifiers.

## Revision History & Changes Noted (ADR-018 Revision v1.0)

- **2026-11-19:** Recorded the move of item pictures from the SPA bundle to the `laprizza-pictures` Docker volume, served and uploaded through `ImageController` / `ImageService` behind the `IImageStorage` port, with a default picture for items without one. Triggered revisions ADR-003.2 (storage scope) and ADR-005.2 (binary media on the REST API).

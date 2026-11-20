# Product categories

Product category HTTP routes are consolidated in `CategoryController`, registered by `CategoryModule`. `ProductCategoryController` and its `/product-categories` API have been removed. The original `addCategory` method uses the unchanged `ProductCategoryService`; listing, read-by-name, update and delete use the unchanged `CategoryService`. `CategoryModule` adapts the shared `ICategoryRepository` for `ProductCategoryService` so both services use the same store, including in-memory mode. No category service implementation was changed during consolidation.

- `GET /categories`: public array of `{ name, description }`; optional `search` filters names.
- `GET /categories?page=1&pageSize=20`: public `Page` of the same DTOs. Either pagination parameter enables pagination; page size is at most 100. The controller slices the unchanged service's result.
- `GET /categories/:name`: public lookup by encoded natural name.
- `POST /categories`: manager-only; body `{ "categoryName": "Pizza", "description": "Pizzas" }`; description is optional and defaults to an empty string; returns `{ name }` with HTTP 201.
- `PUT /categories/:name`: manager-only; required body `{ "name": "Pizza", "description": "Pizzas" }`; returns the updated DTO.
- `DELETE /categories/:name`: manager-only; no body; returns HTTP 200 with `{ "message": "Category removed successfully" }`.

Invalid input returns 400, missing categories 404, and duplicate names or deletion of referenced categories 409. The original update method returns 400 when attempting to rename a referenced category. Referenced categories cannot be removed or renamed, but their descriptions can be updated.

API clients of the removed controller must use `/categories`, retain `categoryName` and optional description for creation, use `name` plus required description for updates, and move the deletion identity from the body to the URL.

`ProductCategoryModule` remains a provider-only module for `ProductCategoryService` consumers and its existing unit tests. It exports `PRODUCT_CATEGORY_REPOSITORY` and `PRODUCT_CATEGORY_USAGE_REPOSITORY`, choosing in-memory adapters only when `USE_IN_MEMORY_REPO=true`, otherwise PostgreSQL adapters. It no longer registers an HTTP controller and is not needed in the root application imports for category routes.

The backoffice SPA route is `/backoffice/product-categories`; the frontend proxy maps `/api/categories` to backend `/categories`. See `docs/architectural/frontend-implementation-and-maintenance.md` for UI components and maintenance guidance.

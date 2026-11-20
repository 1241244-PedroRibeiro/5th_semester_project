q# Frontoffice, backoffice and shared components

Application code under `src/app/` is separated into three directories. `frontoffice` owns the customer application, `backoffice` owns staff management, and `shared_components` owns code used by both. Each office has its own `shared_components` directory. Shared services, contracts and styles are grouped under `core/` and `styles/` within the relevant owner.

The Angular bootstrap files stay at the application root. `app.routes.ts` registers the shared `/unauthorized` page, the two office route collections, and the fallback route. This remains one SPA: all existing browser URLs, API requests, storage keys and access rules are preserved.

## Directory structure

```text
src/app/
	app.ts, app.html, app.scss, app.config.ts, app.routes.ts
	frontoffice/
		frontoffice.routes.ts
		pages/
			home/, menu/, order/, account/, login/, register/
		shared_components/
			product-card/, product-customizer/, customer-auth-form/, ...
		core/
			storefront-api.ts, storefront-models.ts, cart.ts, customer-profile.ts
			auth/guards.ts
		assets/images/
		styles/_frontoffice.scss
	backoffice/
		backoffice.routes.ts
		pages/
			products/, users/, pizzas/, configurations/, orders/
			product-categories/, pizza-components/, pizza-sizes/, allergens/
			login/, register/, status/
		shared_components/
			layout/, staff-auth-form/, resource-management/, data-table/, ...
		core/
			api/backoffice-api.ts, api/health-api.ts, api/models.ts
			auth/guards.ts
		assets/images/
		styles/_backoffice.scss
	shared_components/
		ui/icon/, ui/modal/
		core/api/models.ts, api-errors.ts, resource-lookups.ts
		core/auth/auth.ts
		styles/_base.scss
```

`frontend/e2e/frontoffice/` and `frontend/e2e/backoffice/` contain the respective browser suites. Build configuration, package files, public favicon and documentation stay in the usual project-level locations. Source indentation uses tabs, configured by `.prettierrc` and `.editorconfig`; YAML uses spaces.

## Ownership rules

| Code                                                     | Location                                          |
| -------------------------------------------------------- | ------------------------------------------------- |
| One page’s component, template, styles and configuration | That office’s `pages/<page-name>/`                |
| Components reusable within the customer application      | `frontoffice/shared_components/<component-name>/` |
| Components reusable within staff management              | `backoffice/shared_components/<component-name>/`  |
| Components used by both offices                          | `shared_components/ui/<component-name>/`          |
| Customer-only API/state/DTOs and guards                  | `frontoffice/core/`                               |
| Staff-only API/DTOs and guards                           | `backoffice/core/`                                |
| Shared sessions, common DTOs and HTTP helpers            | `shared_components/core/`                         |
| Office-owned images and style rules                      | That office’s `assets/` and `styles/`             |

Neither office imports code from the other. Both can import the top-level `shared_components`. Promote code there when both offices actually need it. Keep a new page-specific helper beside its page until it has an area-wide use.

Each shared component has its own directory, holding its `.ts`, `.html` and `.scss` files where applicable. Small components keep templates/styles inline. Assigned class names and selectors are retained from the previous implementation; moving a file does not require changing how its component is used.

## Page entrypoints and routes

Each navigable page has its own directory and component. Login and registration use thin page components around one shared form per office. The generic staff management screen similarly has four page entrypoints and four page-owned configurations, while keeping the implementation reusable.

| Office      | Page directory            | Assigned page class    | Browser URL                                           |
| ----------- | ------------------------- | ---------------------- | ----------------------------------------------------- |
| Frontoffice | `pages/home/`             | `HomePage`             | `/`                                                   |
| Frontoffice | `pages/menu/`             | `MenuPage`             | `/menu`                                               |
| Frontoffice | `pages/order/`            | `CustomerOrderPage`    | `/order`                                              |
| Frontoffice | `pages/account/`          | `AccountPage`          | `/account`                                            |
| Frontoffice | `pages/login/`            | `CustomerLoginPage`    | `/login`                                              |
| Frontoffice | `pages/register/`         | `CustomerRegisterPage` | `/register`                                           |
| Backoffice  | `pages/login/`            | `StaffLoginPage`       | `/backoffice/login`                                   |
| Backoffice  | `pages/register/`         | `StaffRegisterPage`    | `/backoffice/register`                                |
| Backoffice  | `pages/products/`         | `Products`             | `/backoffice/products`                                |
| Backoffice  | `pages/users/`            | `Users`                | `/backoffice/users`                                   |
| Backoffice  | `pages/pizzas/`           | `Pizzas`               | `/backoffice/pizzas`                                  |
| Backoffice  | `pages/configurations/`   | `Configurations`       | `/backoffice/component-configurations`                |
| Backoffice  | `pages/orders/`           | `Orders`               | `/backoffice/orders`                                  |
| Backoffice  | `pages/kitchen/`          | `KitchenPage`          | `/backoffice/kitchen`                                 |
| Backoffice  | `pages/profile/`          | `StaffProfilePage`     | `/backoffice/profile`                                 |
| Backoffice  | `pages/product-categories/`    | `ProductCategoriesPage`     | `/backoffice/product-categories`                           |
| Backoffice  | `pages/pizza-components/` | `PizzaComponentsPage`  | `/backoffice/pizza-components`                        |
| Backoffice  | `pages/pizza-sizes/`      | `PizzaSizesPage`       | `/backoffice/pizza-sizes`                             |
| Backoffice  | `pages/allergens/`        | `AllergensPage`        | `/backoffice/allergens`                               |
| Shared | `shared_components/pages/unauthorized/` | `UnauthorizedPage` | `/unauthorized` (`/backoffice/access` redirects here) |
| Backoffice  | `pages/status/`           | `Status`               | `/status` (existing public health-check URL retained) |

Add customer routes to `frontoffice/frontoffice.routes.ts` and staff routes to `backoffice/backoffice.routes.ts`. Use `routerLink` for navigation and lazy-load page components. `customerGuard` belongs to `frontoffice/core/auth/guards.ts`; `staffGuard` and `managerGuard` belong to `backoffice/core/auth/guards.ts`. Session state and the HTTP interceptor remain in `shared_components/core/auth/auth.ts`.

## Shared components and reuse

| Owner        | Class names                                                                   | Responsibility                                                                  |
| ------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Both offices | `Icon`, `Modal`                                                               | Icons, native dialogs, focus restoration and scroll handling                    |
| Both offices | `Auth`, `ResourceLookups`, `errorMessage()`                                   | Sessions, paginated public lookups and consistent HTTP errors                   |
| Backoffice   | `Backoffice`, `Brand`                                                         | Staff navigation/layout and Forno branding                                      |
| Backoffice   | `NavigationTooltip`, `StaffProfile`                                           | Compact navigation labels, staff identity and sign-out control                  |
| Backoffice   | `SidebarAction`, `ProductAllergenEditor`                                      | Reusable bottom navigation action and product allergen association editor       |
| Backoffice   | `PageHeader`, `Panel`, `Badge`, `Tabs`, `DataTable`, `Pagination`, `Feedback` | Staff page composition and tabular resource management                          |
| Backoffice   | `Resources`                                                                   | Shared CRUD implementation for categories, component types, sizes and allergens |
| Backoffice   | `AuthPage`                                                                    | Shared staff login/registration form                                            |
| Frontoffice  | See the customer component catalogue below                                    | Storefront layout, catalogue/cart controls and account editors                  |

Import standalone components into the consuming page’s `imports` array. Supply their inputs and handle outputs in the parent. For example, from `backoffice/pages/products/`, import `Panel` from `../../shared_components/panel/panel` and `Modal` from `../../../shared_components/ui/modal/modal`.

`DataTable` receives `columns`, `rows`, `label` and a unique `trackKey`. A projected `ng-template` receives the current row as `$implicit` and the column key as `column`. `Panel` projects toolbar actions through `[panel-actions]`; `Modal` projects footer actions through `[modal-actions]`. `Tabs` and `Pagination` emit `(changed)` with the requested filter/page. `Feedback` emits `(retry)`.

Feature classes use Angular signals for state and computed signals for filtered data. Forms use `FormsModule` and `ngModel`; API operations return RxJS observables. Follow the existing pages for loading/error handling and `takeUntilDestroyed` cleanup.

## Where to put backend endpoints

Paths below are relative to `src/app/` unless stated otherwise.

| What you want to change                                                                                     | File                                                     |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Customer resource HTTP paths, verbs, bodies and query parameters                                            | `frontoffice/core/storefront-api.ts`                     |
| Customer request/response interfaces and cart types                                                         | `frontoffice/core/storefront-models.ts`                  |
| Staff resource HTTP operations                                                                              | `backoffice/core/api/backoffice-api.ts`                  |
| Staff-only write DTOs, stock and predefined recipe contracts                                                | `backoffice/core/api/models.ts`                          |
| DTOs used by both offices (`Page`, `User`, `Session`, `Product`, `NamedResource`, `ComponentConfiguration`) | `shared_components/core/api/models.ts`                   |
| Login and registration HTTP calls                                                                           | `shared_components/core/auth/auth.ts`                    |
| Shared public resource pagination                                                                           | `shared_components/core/api/resource-lookups.ts`         |
| Generic staff resource endpoint suffix                                                                      | `backoffice/pages/<page>/<page>.config.ts`, field `path` |
| Existing health-check request                                                                               | `backoffice/core/api/health-api.ts`                      |
| Local backend host/port                                                                                     | `frontend/proxy.conf.json`, field `target`               |
| Docker/production backend upstream                                                                          | `frontend/nginx.conf`, directive `proxy_pass`            |

The browser requests `/api/...`; the existing development and production proxies remove `/api` before forwarding to NestJS. Keep URLs relative. Dynamic path segments should use `encodeURIComponent`, and query parameters should use `HttpClient`’s `params`. The shared interceptor attaches authentication to resource requests and handles expired authenticated sessions.

For a new customer resource, add a typed method to `StorefrontApi`, inject that service into the relevant frontoffice page, and handle its observable there. Use `BackofficeApi` for the same pattern in staff pages. An endpoint method requires a matching implemented backend route; this reorganization does not add backend behavior.

## Adding a page

1. Create `frontoffice/pages/<page-name>/` or `backoffice/pages/<page-name>/`. Put its page component, template, stylesheet and page-specific helpers there.
2. Import the office’s reusable UI from its local `shared_components`, and cross-office primitives from the application-level `shared_components`.
3. Add the route to the office’s route file. Register a sidebar entry in `backoffice/shared_components/layout/backoffice.ts` if it should appear in staff navigation.
4. Put HTTP operations in the office’s core API service and DTOs in the appropriate contract file. Reuse the existing shared lookup/session services.
5. Add browser coverage under that office’s `e2e/` subdirectory and update these guides.

For another name-based CRUD page, follow `backoffice/pages/product-categories/`: its page component renders `<app-resources />`, and `product-categories.config.ts` defines a typed `ResourceConfig`. The route imports that configuration and supplies it through `data.resource`.

```ts
// backoffice/pages/my-resources/my-resources.config.ts
import type { ResourceConfig } from '../../shared_components/resource-management/resources';

export const myResourcesConfig: ResourceConfig = {
	path: 'my-resources', // GET /api/my-resources, when that backend route exists
	title: 'My Resources',
	singular: 'Resource',
	description: 'Manage your resources.',
	editable: true,
};
```

The page component imports `Resources` from the same module and renders its existing `app-resources` selector. Add a guarded child route in `backoffice.routes.ts` with `loadComponent` pointing at that page and `data: { resource: myResourcesConfig }`. The shared resource implementation reads the current page’s route data through `ActivatedRoute`.

This generic component expects name-based records and either an array or `Page<NamedResource>` list response. `editable: false` hides the update action; `component: true` enables the existing pizza-component assembly/cardinality fields. Different request bodies, identifiers or interactions need a dedicated page/API operation.

## Responsive backoffice navigation

`Backoffice` in `backoffice/shared_components/layout/` keeps the full sidebar above 1100px. At 1100px and below it switches to a persistent 72px icon rail; at 540px and below the rail is 64px. The workspace offsets its content by the rail width, and narrow-screen header spacing leaves room for the current page title. The sidebar scrolls independently on short screens.

The **Open navigation** button expands a temporary sidebar with text labels, including on touch devices. Selecting a destination, pressing Escape, clicking the backdrop or tabbing outside closes it. Closing it with Escape or its close controls returns focus to the menu button. Resizing closes the expanded view. Active links keep `aria-current="page"`, and all icon-only actions retain accessible names and at least 44px touch targets.

The area-owned reusable components are:

- `Brand` (`app-brand`, `brand/brand.ts`): optional boolean `compact` input displays just the mark; its default still displays the full name on authentication pages.
- `NavigationTooltip` (`app-navigation-tooltip`, `navigation-tooltip/navigation-tooltip.ts`): `text`, `top` and `left` inputs; `entered` and `leftTooltip` outputs let the owner keep the label visible while hovered. `Backoffice` displays it on hover/focus, associates it with the triggering action and dismisses it on Escape, navigation, scrolling or resize. It renders outside the scrolling rail so labels are not clipped.
- `StaffProfile` (`app-staff-profile`, `staff-profile/`): `user`, `compact` and `hintId` inputs; `signedOut`, `hintRequested` and `hintDismissed` outputs. It displays staff initials/name/role and an accessible sign-out action; authentication remains owned by the parent/shared `Auth` service.

Keep the 1100px media query in `backoffice.scss` aligned with the `matchMedia` query in `backoffice.ts`. Both determine the compact state. All new rules are component-scoped and change files only within `frontend/`. The backoffice Playwright suite covers mouse/keyboard tooltips, touch expansion, employee link visibility, landscape scrolling and page/dialog layouts at 320, 390, 768, 1024 and 1440px.

## Kitchen, staff profile and product allergens

`KitchenPage` in `backoffice/pages/kitchen/` provides a staff-accessible `/backoffice/kitchen` route with the existing page header/panel aesthetic and an empty visualization region. No 3D implementation, fabricated kitchen data or kitchen API request is added. The bottom sidebar's **Kitchen Visualization** link is available to managers and employees, including in the compact rail.

`SidebarAction` (`app-sidebar-action`, `backoffice/shared_components/sidebar-action/`) renders this reusable action. Inputs: `path`, `label`, `icon`, `compact`, `hintId`. Outputs: `activated`, `hintRequested`, `hintDismissed`. It supports active-route styling, accessible labels and the existing rail tooltip. `StaffProfile` now links its avatar and name to `/backoffice/profile`, with `profileHintId`, `profileHintRequested`, `profileHintDismissed` and `profileOpened` integrating the same tooltip/close behavior.

`StaffProfilePage` in `backoffice/pages/profile/` displays the signed-in staff member's name, email, username, roles and status. Phone and address use separate responsive forms, validation, success notices and retryable errors. A shared operation lock prevents concurrent contact writes to the same user record. `BackofficeApi.saveOwnPhone()` calls `PUT /api/user/me/phone-number` with `{ phoneNumber }`; `saveOwnAddress()` calls `PUT /api/user/me/address` with `{ street, postalCode, city, extraDetails }`. Neither payload supplies a username: the server derives identity from authentication. Both routes work for active managers and employees. Name, email and password changes use the AccountDetailsEditor described below. Profile photo changes remain unavailable.

`AccountDetailsEditor` (`app-account-details-editor`, `backoffice/shared_components/account-details-editor/`) accepts `mode: name/email/password` and `user`, and emits `saved`/`closed`. It uses the shared modal and existing styling. `PUT /api/user/me/name` accepts `{ firstName, lastName }`; `PUT /api/user/me/email` accepts `{ email, currentPassword }`; `PUT /api/user/me/password` accepts `{ currentPassword, newPassword }`. Email/password changes require the previous password. New-password confirmation is checked in the UI, and the shared frontend password policy mirrors registration. Incorrect current passwords return 403 and leave the editor open without signing out. Password fields clear after each request; no secret is persisted. `Auth.updateUser()` refreshes public identity and sidebar initials while preserving session/local-storage selection. See [account API contracts](../docs/api/self-service-account-updates.md).

`StaffContacts` in `backoffice/core/staff-contacts.ts` retains only confirmed contact-write responses, per username, in memory and `sessionStorage` under `forno-contact:<username>`. The existing user GET does not provide contact values and is not available to employee-only accounts, so this page does not call it or invent existing values. Cached confirmations prefill revisits/reloads in the same browser session. This cache is not an authoritative backend contact-read service. The new self-service `GET /api/user/me/contact-details` is available for future backoffice read integration; the frontoffice account page already uses it.

`ProductAllergenEditor` (`app-product-allergen-editor`, `backoffice/shared_components/product-allergen-editor/`) appears inside **Update product**. Its `product` input supplies the current associations; `updated` emits each confirmed product response and `busyChanged` prevents conflicting saves or modal closure. It loads every page of `GET /api/allergens` using `BackofficeApi.allResources()`, supports lookup retry, and associates checked new names via `POST /api/products/:sku/allergens` with `{ allergenName }`. Saved associations stay checked/locked because no removal endpoint exists.

**Add selected allergens** saves associations independently from **Save changes**, which saves product details/stock. Additions execute sequentially to avoid concurrent read/modify/write losses. Each confirmation updates the selected product and list without discarding other draft edits. If a later addition fails, confirmed names remain saved and only remaining selections can be retried. Errors never report an unconfirmed association as successful. No backend code or endpoint was added.

For browser tests while your own development server uses port 4200, select an isolated test port: `PLAYWRIGHT_PORT=4217 npm test`. The default remains 4200. Tests cover both staff roles, kitchen/profile navigation, contact-write payloads, contact failures, paginated allergen loading, partial-association retries, lookup errors and responsive pages/dialogs from 320px through desktop.

## Styles, assets and tests

`src/styles.scss` only assembles the style entrypoints: `frontoffice/styles/_frontoffice.scss`, `shared_components/styles/_base.scss` and `backoffice/styles/_backoffice.scss`. Customer styling remains scoped under `.storefront`; common native controls, modal helpers, typography defaults and accessibility utilities are shared.

Decorative photos live in `frontoffice/assets/images/` and `backoffice/assets/images/`. `angular.json` copies them to their existing public URLs (`/images/storefront/...` and `/images/kitchen.jpg`). Product and pizza pictures are not stored here: the backend serves them from the `laprizza-pictures` Docker volume through `/api/images/{nameOrSku}` (see ADR-018). Moving the source does not change browser asset URLs. The shared public favicon stays in `frontend/public/`.

Run `npm run build` from `frontend/`. For browser checks, install Chromium once with `npm run test:e2e:install`, then run `npm test` for both offices, or `npm test -- e2e/frontoffice` / `npm test -- e2e/backoffice` for one suite. Start local development with `npm start -- --proxy-config proxy.conf.json` and the existing backend on port 3000. The original HTTPS command remains `npm run dev`.

## Reorganization changes

The previous `features/`, `core/`, `shared/` and `src/styles/` source trees have been replaced by the three owned areas above. Imports, lazy routes, templates/styles, test locations and Angular asset configuration have been updated. No compatibility copies or cross-office source imports are required. New thin page classes keep each route in its own directory while reusing the existing forms and CRUD implementation. Existing component names, URLs, endpoint contracts, session/cart keys and current service limits remain unchanged.

## Customer application component catalogue

The LaPrizza Basic designs are implemented as responsive HTML/CSS components, not full-page SVG backgrounds. Source uses tab indentation. The backoffice remains a separate route/layout branch.

All customer UI files below are under `src/app/frontoffice/shared_components/<component-name>/`. Each component is standalone: import its class in the consuming feature’s `imports` array. Most have a `.ts` controller, `.html` template and `.scss` stylesheet; smaller components keep markup/styles inline. Inputs are signal inputs, and interaction outputs are Angular events.

| Assigned class             | Selector                         | Responsibility and public interface                                                                                                   |
| -------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `StorefrontLayout`         | `app-storefront-layout`          | Public shell with navigation, account link, cart count, skip link, page outlet and footer                                             |
| `StorefrontBrand`          | `app-storefront-brand`           | LaPrizza wordmark and circle emblem                                                                                                   |
| `StorefrontFooter`         | `app-storefront-footer`          | Responsive checkerboard footer made with CSS                                                                                          |
| `StorefrontButton`         | `[shopButton]`                   | Directive for consistent pill buttons and links; `tone` is `primary`/`secondary`, `small` adjusts size                                |
| `OrderHero`                | `app-order-hero`                 | Reusable pizza invitation and menu link, shown on home; the order page has a distinct empty-cart state                                |
| `ProductCard`              | `app-product-card`               | `item: CatalogueItem`; emits `(customize)` and `(added)` with the product                                                             |
| `ProductCustomizer`        | `app-product-customizer`         | `item: CatalogueItem`; loads size/ingredient options; emits `(closed)` or `(added)` with a complete draft line                        |
| `MenuFeedback`             | `app-menu-feedback`              | `state: loading/error/empty`, optional `message`; emits `(retry)`                                                                     |
| `QuantityControl`          | `app-quantity-control`           | `value`, `min`, `max`, `disabled`, `label`; emits `(changed)` with the requested integer quantity                                     |
| `AllergenChips`            | `app-allergen-chips`             | `names`, `selectable`, `selected`, `locked`; emits `(toggled)` with an allergen name                                                  |
| `OrderLineItem`            | `app-order-line-item`            | `line: CartLine`; emits `(quantityChanged)` and `(removed)`                                                                           |
| `OrderTotals`              | `app-order-totals`               | `subtotal`, `currency`, optional `delivery`/`tax`, `checkoutEnabled`; emits `(checkout)` and projects delivery content                |
| `AddressEditor`            | `app-address-editor`             | Optional `initial: Address`; emits `(closed)` or `(saved)` after a successful API update                                              |
| `PhoneEditor`              | `app-phone-editor`               | Initializes from the confirmed contact cache; emits `(closed)` or `(saved)` after a successful API update                             |
| `AllergyEditor`            | `app-allergy-editor`             | `initial: string[]`; locks existing allergies, loads additional options and emits `(saved)` after adding them                         |
| `CustomerAuthPage`         | `app-customer-auth-page`         | Shared customer authentication form, composed by `CustomerLoginPage` and `CustomerRegisterPage`; route data selects registration mode |
| `PasswordRules`            | `app-password-rules`             | `value: string`; displays the backend’s four password requirements. The module also exports `validPassword()`                         |
| `CredentialEditor`         | `app-credential-editor`          | `kind: password/email`; displays the designed form with an unavailable explanation and disabled save; emits `(closed)`                |
| `ServiceUnavailableDialog` | `app-service-unavailable-dialog` | `title`, `message`; reusable explanation for unavailable order history and other unsupported actions; emits `(closed)`                        |

These components also reuse `Modal` (`app-modal`) and `Icon` (`app-icon`) from `shared_components/ui/`. Native modal behavior, focus restoration and scrolling are shared with the backoffice. Customer colors and typography inherit from the `.storefront` host; use these components within `StorefrontLayout` or another host with that class.

The feature classes under `src/app/frontoffice/pages/` are:

| Assigned class         | Folder      | Browser route                        |
| ---------------------- | ----------- | ------------------------------------ |
| `HomePage`             | `home/`     | `/`                                  |
| `MenuPage`             | `menu/`     | `/menu`                              |
| `CustomerOrderPage`    | `order/`    | `/order`                             |
| `AccountPage`          | `account/`  | `/account` (active session required) |
| `CustomerLoginPage`    | `login/`    | `/login`                             |
| `CustomerRegisterPage` | `register/` | `/register`                          |

`AuthPage` is the shared Forno staff form in `backoffice/shared_components/staff-auth-form/`, composed by `StaffLoginPage` and `StaffRegisterPage` at `/backoffice/login` and `/backoffice/register`. Public sign-in permits customer accounts. Staff routes still require staff/manager guards. Both contexts share `Auth` and the bearer-token interceptor from `shared_components/core/auth/auth.ts`. Their route guards belong to the corresponding office’s `core/auth/guards.ts`.

### Reusing customer components

Import the components/directive and provide page-owned state:

```ts
imports: [ProductCard, ProductCustomizer, StorefrontButton];
```

```html
<app-product-card
	[item]="product"
	(customize)="selected.set($event)"
	(added)="addProduct($event)"
/>
@if (selected(); as item) {
<app-product-customizer [item]="item" (closed)="selected.set(null)" (added)="addLine($event)" />
}
```

`MenuPage` shows the complete implementation: `addLine` calls `Cart.add()` and closes the dialog only if the draft accepts the item. Product cards remain reusable in other lists because the parent decides what their interaction events do. `OrderLineItem` and `OrderTotals` can likewise be used on a future checkout page.

### Customer resource endpoints and state

Add customer HTTP operations to `StorefrontApi` in `frontoffice/core/storefront-api.ts`, and their contracts to `storefront-models.ts`. Keep HTTP calls out of presentation-only components such as product cards and order lines. Account/customization editors own their specific requests; feature pages coordinate list loading and page state. Both API contexts use `ResourceLookups` from `shared_components/core/api/resource-lookups.ts` for paginated public form options, and `errorMessage()` from `shared_components/core/api/api-errors.ts` for error text. Customer code does not depend on `BackofficeApi`.

| Operation                 | Frontend request                                   | Current backend behavior                                                                |
| ------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Load public menu          | `GET /api/catalogue`                               | Full catalogue with availability, allergens, direct prices and predefined size variants |
| Ingredient lookup         | `GET /api/products`                                | Product/component flags, component type and associated allergens                        |
| Ingredient type lookup    | `GET /api/pizza-component-types?page=…&pageSize=…` | Assembly order and cardinality; every page is followed for form options                 |
| Ingredient prices by size | `GET /api/component-size-configurations`           | Ingredient-size prices and stock consumption                                            |
| Load allergen options     | `GET /api/allergens`                               | Current allergen names                                                                  |
| Read profile              | `GET /api/user/me/contact-details`                 | Own identity and optional persisted address/phone                                       |
| Read saved allergies      | `GET /api/user/:username/allergens`                | Saved names; customer-own-account or manager access                                     |
| Add allergies             | `POST /api/user/:username/allergen`          | Additive only, customer-own-account access; sends `{ allergens: [...] }`                |
| Save address              | `PUT /api/user/me/address`                         | Sends `{ street, postalCode, city, extraDetails }`; returns confirmed contact data      |
| Save phone                | `PUT /api/user/me/phone-number`                    | Sends `{ phoneNumber }` in international E.164 format; returns confirmed contact data   |
| Login / register          | `POST /api/auth/login`, `POST /api/auth/register`  | Shared `Auth` service; registration uses first name, last name, email and password      |

The proxy mapping remains `/api/...` in the browser → `/...` on NestJS. Change `proxy.conf.json` for a local backend address or `nginx.conf` for the hosted/Docker upstream. No backend source or API documentation outside `frontend/` was changed for the customer pages.

`Cart` (`frontoffice/core/cart.ts`) stores the current draft in the `laprizza-cart-v1` local-storage key and exposes read-only `lines`, `count`, `currency` and `subtotal` signals. Use `add`, `setQuantity`, `remove` and `clear` to update it. Identical product/size/ingredient/price combinations merge, while different configurations stay separate. One currency is allowed per draft, and 1–99 units per line is a frontend limit. Stored data is validated on restore. This is a device-local draft, not an order accepted by the restaurant.

`CustomerProfile` (`frontoffice/core/customer-profile.ts`) retains only server-confirmed address/phone responses, keyed by username, in memory and session storage (`laprizza-contact:<username>`). The account page reads persisted values through `GET /api/user/me/contact-details` on every load, so a fresh browser/session displays saved contacts without updating them first. Each successful read replaces cached values, including clearing fields absent from the server response; successful writes also refresh the cache. Identity comes from the shared authenticated session. Failed mutations do not update confirmed contact state.

### Design coverage and intentional API limits

- `Home Order.svg` maps to `OrderHero`; `Footer.svg` maps to `StorefrontFooter`.
- `Menu correct load.svg`, `Menu loading.svg` and `Menu load error.svg` map to `MenuPage`, `ProductCard` and `MenuFeedback`.
- Both customization SVGs map to `ProductCustomizer`. Pizza options use actual size configurations and ingredient types instead of hardcoded crust/sauce choices. Changing size restores the default recipe. Fixed-price products support quantities; fictional dip/extra prices are not added.
- `Order Summary.svg`, `Order item.svg` and `Summary Item.svg` map to `CustomerOrderPage`, `OrderLineItem` and `OrderTotals`. Checkout stays disabled, tax/delivery are not invented, and history explains that it is unavailable.
- `Login Page.svg` and the two register SVGs map to `CustomerAuthPage`. Username and date of birth are not collected because the registration DTO cannot save them. Optional phone is saved through its own supported endpoint after successful registration. If that second operation fails, the account is still created and the UI offers continuation without resubmitting registration.
- `My Account.svg` and its dialog variants map to `AccountPage`, `AddressEditor`, `AllergyEditor`, `CredentialEditor` and `PhoneEditor`. Despite its filename, `My Account - Update Address-1.svg` depicts the email-change form and is implemented as that credential-dialog variant.
- `templates.svg` is used as a component/style reference. Food images from it were moved to the backend (`backend/data/pictures/`, one `<SKU>.jpg` per item) and are seeded into the `laprizza-pictures` volume. `productImage()` in `storefront-models.ts` returns `/api/images/{sku or name}`; the backend answers with the item's picture or with a default picture saying there is no image related to the item.

Customer account password/email editors remain unconnected to the existing self-service endpoints; forgotten-password recovery is implemented through the login forms. Social authentication, order submission/history and allergy removal still require additional support. Their controls cannot report a successful operation or send invented endpoints. Draft customization totals use the current catalogue and configuration prices, with backend confirmation still required before any future checkout.

### Customer validation

`e2e/frontoffice/storefront.spec.ts` exercises public routing, loading/error/retry states, search/categories, availability, pizza cardinality/quantity/price changes, draft persistence/removal, customer authentication, registration, contact updates, additive allergies and unavailable actions. Responsive cases cover 390, 768 and 1440 pixel widths and capture the rendered customer pages/dialogs. `e2e/backoffice/backoffice.spec.ts` retains the backoffice regression tests with the relocated staff auth URLs. Run `npm test` from `frontend/` after installing Chromium with `npm run test:e2e:install`. These tests mock HTTP responses and do not verify a live database or an order service.

### Product category management

`ProductCategoriesPage` in `backoffice/pages/product-categories/` renders the shared `Resources` component using `productCategoriesConfig`. The SPA route remains `/backoffice/product-categories`; `/backoffice/product-types` redirects there. The page route is separate from the API path.

`CategoryController`, registered by `CategoryModule` in `AppModule`, is the sole HTTP controller for product categories. The duplicate `ProductCategoryController` and `/product-categories` API were removed. `ProductCategoryModule` remains a provider-only module for existing service consumers; both category services are unchanged. `CategoryModule` supplies `ProductCategoryService` with a repository adapter over the same `ICategoryRepository` used by `CategoryService`, so creation and subsequent reads/updates/deletes share data in both PostgreSQL and in-memory modes. The frontend now calls `/api/categories` through `BackofficeApi` and `ResourceLookups`.

| Action | Request | Response |
| --- | --- | --- |
| List | `GET /api/categories?page=1&pageSize=8` | `Page` containing `{ name, description }` items |
| Search | `GET /api/categories?search=drinks&page=1&pageSize=8` | Matching categories, then paginated |
| Read one | `GET /api/categories/:name` | `{ name, description }` |
| Create | `POST /api/categories` with `{ categoryName, description? }` | `{ name }`, HTTP 201 |
| Update | `PUT /api/categories/:name` with `{ name, description }` | Updated category |
| Remove | `DELETE /api/categories/:name` | HTTP 200 with `{ message }`; no request body |

All reads are public. Writes require an authenticated manager. Creation requires a string `categoryName`; its description is optional and defaults to an empty string. Update retains its original `{ name, description }` body and requires both fields. Names in URLs are encoded with `encodeURIComponent`. Duplicate names and deletion of referenced categories return 409; the unchanged update method returns 400 when renaming a referenced category; updating a referenced category's description remains supported. Missing categories return 404; invalid bodies or pagination return 400.

With neither pagination parameter, GET returns the existing array response. Supplying either parameter returns a page (defaults: page 1, page size 20; maximum 100). `CategoryController` validates pagination with `PageRequest` and slices the result from the unchanged `CategoryService`; pagination currently loads matching categories before slicing. For large catalogues, move pagination into the repository in a separate service change.

`ResourceConfig.descriptionField` enables the description column and form field (optional on creation, required on update); `NamedResource.description` carries the value. The category configuration enables this flag and Update actions. Other resource forms retain their existing fields. Product category selectors use `allResources('categories')` and follow every result page. `BackofficeApi.saveResource` maps `name` to `categoryName` only for category creation. Updates retain `name`.

Existing API clients must migrate from `/product-categories` to `/categories`, send `{ categoryName, description? }` on creation and `{ name, description }` on update, and put the category name in the DELETE URL. The original `ProductCategoryController.addCategory` creation behavior is retained; read-by-name, update and delete retain their original `CategoryController` implementation. Only listing was extended, as requested, to combine search and pagination. The browser page URL is unchanged.

Regression coverage is in `backend/tests/integration/app.categories.spec.ts`, the existing category controller/service suites and `frontend/e2e/backoffice/backoffice.spec.ts`. Restart/rebuild the backend and frontend after deployment (`docker compose up -d --build backend frontend`).

### Menu category options

`MenuPage` loads `GET /api/catalogue` and derives category buttons from the distinct `categoryName` values in that response. Only the `All` option is fixed. A category appears only when at least one product returned in the catalogue belongs to it; creating an empty category in the database does not add a menu button. The menu does not request `/api/categories`.

Search and Available only filter products without changing the category buttons. The backoffice category management page continues to use `/api/categories` independently.


## Default 403 page

The shared HTTP interceptor sends every `/api/` response with status `403` to the public `/unauthorized` route, including login and account-change denials. The page displays a generic access-denied message and recovery links without rendering server details or clearing the user's session. It makes no API requests and has no authentication guard, so it can be loaded or refreshed without a redirect loop. It focuses its heading for accessibility and supports customer and staff layouts at narrow widths.

`managerGuard` also uses this page, and the previous `/backoffice/access` URL redirects to it. `401` handling remains separate: expired/invalid authenticated requests clear the session and go to the relevant login page. `403` responses continue to propagate to request subscribers after navigation is requested; their local cleanup still runs. REST responses remain JSON `403` errors; the error page is browser presentation.


## Email password recovery

`shared_components/ui/password-recovery-form/` implements the common request/code/password flow. The customer auth card renders it with customer styling, while the staff auth layout retains its story panel and renders the same form in the staff form area. Both use the existing **Forgot your password?** control and return to their original sign-in form after confirmation.

`Auth.requestPasswordRecovery` and `Auth.resetPassword` call the public `/api/password-recovery` endpoints. They are excluded from bearer attachment and authenticated-401 redirects so invalid recovery codes remain inline and do not clear another signed-in account. The server enforces ACTIVE status, five-minute validity, one-use consumption, and the 30-minute cooldown. The UI validates password confirmation, disables duplicate submission, handles cooldown/expired/used/SMTP errors, and keeps codes/passwords out of storage and URLs.


## Emailed invitations

The Users page calls `/api/auth/invite` with email and role only. Its existing responsive modal sends instructions and can update a pending invitation by submitting the same email with another role. Administrators keep the full management view; managers can view the user list, use filters/pagination, and invite users. SMTP errors remain inside the open modal for retry. Normal registration supplies the invited person's real name/password and retains their latest invited role.


## Existing user management

The administrator Users table opens the same management dialog from the user’s name, username, or **Manage** button. Name and username controls are keyboard-accessible buttons; managers see them as plain text. A responsive modal starts with the stored role selection; Save roles sends the complete nonempty list to `PUT /api/user/:username/roles`. Unchecking removes a role, and multiple roles can be selected. Errors leave the modal open. Successful saves reload the filtered/paginated list and update the signed-in user's cached identity when appropriate. The acting administrator's Administrator checkbox is protected. Deactivation requires a separate confirmation and discards unsaved role edits. Self-deactivation is disabled in this dialog. Deactivated accounts have disabled role controls and a **Reactivate account** button instead; the confirmed action calls `POST /api/user/:username/reactivate`, reloads the list, and restores role editing once ACTIVE. Pending registrations cannot be activated through this endpoint. Managers can view, filter, and paginate users and send invitations; Manage remains administrator-only.

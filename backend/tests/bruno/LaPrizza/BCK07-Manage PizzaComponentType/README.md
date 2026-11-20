Run the folders sequentially with the Local environment selected:

1. `00 - Setup`: log in as manager/customer and allocate fixture names and assembly positions after reading every result page.
2. `01 - POST - Create`: test creation, authorization, conflicts and input validation; create the bounded type and referencing product used by DELETE. The product is then blocked to verify that inactive references still prevent deletion.
3. `02 - GET - List`: list and search component types using explicit `page` and `pageSize` parameters. Assertions read the paginated `items` response.
4. `03 - GET - By Name`: read existing types publicly and check missing names.
5. `04 - PUT - Update`: test authorization, immutable names, occupied assembly orders, invalid bounds, successful updates and missing types. Omitted fields keep their values; a null maximum restores an unbounded cardinality. This folder can also run independently: request `00` logs in, reads every result page and creates a separate fixture using `bck07Put*` variables. Request `09` removes that fixture without affecting the fixture used by DELETE.
6. `05 - DELETE - Remove`: five requests, in order:
   - Without authentication: 401; no bearer token is sent.
   - Active manager deletes the existing unreferenced type: 200.
   - Active manager deletes that same, now missing type: 404.
   - Active manager attempts to delete the bounded type referenced by the blocked product: 409.
   - Active manager attempts to delete Base Dough, Base Sauce, Cheese and Topping: each must return 401 with the `PizzaComponentUnauthorizedDeletionException` message and remain publicly available. This request logs in independently and verifies the manager's active status and role before attempting deletion. The API has no separate component type deactivation endpoint.

The five interaction folders correspond to the BCK07 rows in [the API specification](../../../../../docs/sad/06-api-design-specification.md). The implementation uses natural names in resource paths; the specification still describes UUIDs for individual resources. Manager PUT requests update cardinality bounds and available assembly orders; names remain immutable.

The successful DELETE removes the unbounded type. The bounded type and its referencing product remain as the reference-protection fixtures because there is no product deletion endpoint. Each run uses unique names and product SKUs. Setup and PUT preparation scan all pages before choosing assembly orders, so retained fixtures from previous runs are included. Run the complete PUT folder from request `00` when repeating its tests; the final request cleans up its fixture.

Run the whole folder sequentially with Local selected, including setup. Setup logs in the manager, registers two fresh customers and selects a seeded allergen. Variables use the bck02 prefix. Tokens and usernames come from responses; no UUIDs are supplied as user identifiers.

The existing user routes are GET /user/:username, GET /user/:username/allergens, POST /user/:username/allergen and DELETE /user/:username. Customer ownership checks run before lookup. Unknown usernames therefore return 403 for customer reads/relating allergens, 401 for customer deactivation of another username, and 404 for manager reads. A formerly invalid UUID string is now a valid unknown username.

Relating allergens sends only `{allergens: ["Gluten", "Lactose"]}`. Responses contain `{username, allergens: [names]}`. Repeating a relation must not duplicate the allergen. Public user responses contain username, firstName, lastName, createdAt, email, roles and status, excluding passwords and updatedAt.

Manager-only listing uses GET /users and filters /users/filter/creation-date/:date, /users/filter/role/:role and /users/filter/status/:status. Pagination uses page and pageSize (maximum 100); responses contain items, total, page, pageSize and totalPages. Date filters use UTC calendar days. Paging assertions compare usernames.

The existing account tests finish with deactivation. Rerun setup before repeating customer reads, since inactive customers fail the status guard. The suite leaves accounts and dietary restrictions in the database. PostgreSQL, current tables and migration 007 fixtures must be available; the collection does not apply migrations.

`06 - Set Address` and `07 - Set Phone Number` each contain exactly five requests: set, replace, invalid input, username injection and unauthenticated access. Run each complete folder in sequence. The first request registers its own fresh customer, so these folders also run independently and after the earlier deactivation tests. Variables use separate `bck02Address` and `bck02Phone` prefixes.

A follow-up update of the other contact field verifies that the first value was saved and survives another repository load/save. Replacement requests verify that the other contact field remains intact; omitting address `extraDetails` resets it to an empty string. The final request deactivates the folder's customer as cleanup. Customer records remain, following the existing deactivation behavior. Migration `013_user_contact_details.sql` must already have been applied to existing PostgreSQL databases; the collection does not apply migrations.

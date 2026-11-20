# Customer application

`CustomerService` creates and retrieves customer profiles and coordinates the
contact, address and consent operations on `domain/customer/Customer`.
`CustomerDTOs` exposes plain values, nullable username/VAT fields and ISO timestamps
corresponding to the database fields. Addresses belong to the aggregate and map
to the separate `customer_addresses` table.

The service receives `ICustomerRepository` through the `CUSTOMER_REPOSITORY`
injection token. A persistence adapter must implement this interface and enforce
the database's username uniqueness and user foreign key constraints. No HTTP
controller, module registration or database adapter is included here.

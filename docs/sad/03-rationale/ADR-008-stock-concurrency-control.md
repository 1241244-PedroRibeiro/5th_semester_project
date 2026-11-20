# ADR-008: Pessimistic Locking for Stock Adjustments

- **Status:** Accepted
- **Date:** 2026-10-30
- **Decision Makers:** LaPrizza Development Team

## Context

The BCK09 — Stock Information Management user story allows authorized users to consult and adjust stock quantities. Stock adjustments must preserve data consistency and ensure that stock quantities never become negative.

Stock adjustments involve reading the current quantity, validating the requested operation, updating the stock balance, and recording the corresponding stock movement. When multiple requests attempt to adjust the same stock item concurrently, these operations may interfere with each other if they are not properly coordinated.

For example, if a stock item has 5 units available and two concurrent requests each attempt to consume 4 units, both requests could read the original quantity before either update is committed. Without appropriate concurrency control, both requests might incorrectly succeed, resulting in an invalid stock balance.

## Decision

The team decided to use PostgreSQL pessimistic locking through `SELECT ... FOR UPDATE` when adjusting stock quantities.

The stock repository acquires a row-level lock on the relevant stock item within a database transaction. This prevents other transactions from concurrently acquiring an incompatible lock on the same row while the current transaction performs the stock adjustment.

The transaction includes the stock item update and the creation of the corresponding stock movement. It is committed only when the operation succeeds; otherwise, it is rolled back.

## Rationale

This approach was selected for the following reasons:

1. **Data consistency:** Concurrent adjustments to the same stock item are serialized, preventing requests from independently relying on the same outdated stock quantity.
2. **Prevention of negative stock:** The current quantity is checked while the row is locked, ensuring that a consumption operation cannot succeed based on a stale quantity.
3. **Atomicity:** Updating the stock balance and recording its movement occur within the same transaction.
4. **Database-level coordination:** PostgreSQL provides row-level locking, avoiding the need to implement application-level locking mechanisms.
5. **Implementation simplicity:** The solution fits the existing PostgreSQL repository and transaction model without introducing additional infrastructure.

## Alternatives Considered

### Optimistic Locking

Optimistic locking could use a version column or conditional update to detect concurrent modifications and retry or reject conflicting operations.

This approach can be effective when conflicts are infrequent, but it requires additional conflict-detection and retry logic. Pessimistic locking was selected to make the stock adjustment sequence explicit and straightforward.

### Application-Level Locking

Locks implemented in application memory would not reliably coordinate requests handled by different application instances or processes. PostgreSQL row-level locking provides coordination through the shared database.

### Unprotected Read and Update

Reading the quantity and updating it without locking could allow concurrent requests to validate against the same previous balance. This approach was rejected because it could compromise stock consistency.

## Consequences

### Positive Consequences

- Concurrent adjustments to the same stock item are coordinated by PostgreSQL.
- Stock validation is performed against the locked row's current state.
- Stock balance updates and movement records can be committed or rolled back together.
- The implementation remains within the existing repository and transaction architecture.

### Negative Consequences

- Transactions may wait when another transaction holds a lock on the same stock item.
- Long-running transactions can increase contention and reduce throughput.
- The repository must handle transaction cleanup correctly, including rollback and connection release after errors.

## Implementation

The decision is implemented in:

`backend/src/infrastructure/persistence/repositories/PostgresStockRepository.ts`

The repository uses a transaction with the following sequence:

1. Begin the transaction.
2. Select the stock item using `SELECT ... FOR UPDATE`.
3. Validate and apply the requested adjustment.
4. Update the stock quantity and persist the corresponding movement.
5. Commit the transaction, or roll it back if an error occurs.
6. Release the database connection.

The database schema also constrains stock quantities to non-negative values, providing an additional integrity safeguard.

## Verification

The implementation should be verified with automated tests covering:

- Successful stock increases.
- Successful stock decreases when sufficient stock is available.
- Rejection of decreases exceeding the available quantity.
- Rollback when an adjustment fails.
- Concurrent adjustments to the same stock item, ensuring that the resulting quantity remains valid and that conflicting consumption requests cannot both succeed when the available stock is insufficient.

## References

- BCK09 — Stock Information Management.
- `backend/src/infrastructure/persistence/repositories/PostgresStockRepository.ts`
- `backend/src/domain/stock/StockItem.ts`
- `backend/src/domain/stock/StockQuantity.ts`
- `backend/src/infrastructure/persistence/migrations/005_create_stock_tables.sql`

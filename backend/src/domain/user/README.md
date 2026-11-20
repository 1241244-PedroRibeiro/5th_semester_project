# User domain

`User` owns account identity, roles, status, and account changes.

`AuthSession` represents one login session, associated with a `Username` rather than embedded in the user aggregate. It owns UUID v4 identity validation, expiration and ownership checks, and irreversible, idempotent revocation. Session timestamps use the existing immutable `Timestamp` value object. `create` starts an unrevoked session; `reconstitute` preserves expired/revoked persisted state.

The application loads and saves sessions through `IAuthSessionRepository`. JWTs and cookies are transport concerns; database mapping belongs to `AuthSessionMap` and `AuthSessionEntity` in infrastructure. No ORM or framework dependency enters the domain class.

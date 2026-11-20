# BCK01 - As a LaPrizza Manager, I want the system to maintain users and roles and authenticate registered users.

## 1. Requirements Engineering

### 1.1. User Story Description
As a LaPrizza Manager, I want the system to maintain users and roles and authenticate registered users, so that access to protected operations can be associated with an identified and authorized user.

### 1.2. Customer Specifications and Clarifications

#### From the specification document
> Requirements extracted from *PART III – Sprint 1 – User Stories* (Section BCK01, p. 5) and *PART II – System Specification* (Section II.3.1, "Business Overview", and Section II.3.2, "Identity and Access Management").

#### From Customer / Product Owner Q&A Log
- **User Roles Taxonomy (Clarification #03):** The system must support at least three standard roles: `MANAGER`, `EMPLOYEE`, and `CUSTOMER`. A user can accumulate multiple roles simultaneously (`Set<UserRole>`).
- **Administrative Governance (Clarification #04):** There is no separate `ADMINISTRATOR` role. User provisioning and role assignment are governed by users with the `MANAGER` role.
- **Account Segregation (Clarifications #01 & #02):** A `User` is an authentication account (credentials, password hash, status, roles) and is conceptually distinct from a `Customer` profile (commercial persona). Anonymous kiosk orders do not create or require a `User` entity.
- **Privilege Escalation Prevention (ARQSI Slide 90):** Public registration (`POST /auth/register`) strictly assigns the `CUSTOMER` role with `ACTIVE` status. Elevated staff accounts (`EMPLOYEE`, `MANAGER`) are created exclusively by Managers in a `PENDING_REGISTRATION` state until completed by the user.
- **Stateless Tokens (ADR-002 & ADR-004):** Authentication produces signed JSON Web Tokens (JWT) with embedded subject and role claims. Tokens are stateless and not stored in the database.
- **Password Hardening (ADR-002):** Passwords are salted and hashed using **Argon2id** (memory-hard, resistant to GPU brute-force attacks).

### 1.3. Acceptance Criteria

- **AC1:** The system must support the registration and management of the users required to access protected system functionality.
- **AC2:** Each user must have a unique identifier and appropriate authentication credentials (unique email and password).
- **AC3:** The system must support the roles required to distinguish responsibilities (`MANAGER`, `EMPLOYEE`, `CUSTOMER`), allowing multi-role assignments.
- **AC4:** Registered users must be able to authenticate using their credentials.
- **AC5:** Successful authentication must establish the identity and role context of the user via a signed, stateless JWT token for subsequent protected operations.
- **AC6:** Invalid authentication attempts must be rejected with generic credentials errors (HTTP 401 Unauthorized) without leaking specific user existence details.
- **AC7:** Authentication credentials must be hashed and stored using Argon2id conforming to OWASP guidelines.
- **AC8:** Unactivated accounts (`PENDING_REGISTRATION`) or deactivated accounts (`DEACTIVATED`) must not be granted access to protected functionality.

### 1.4. Found out Dependencies

- **Preceding Dependencies:** None. This is the foundational identity provider for the entire system.
- **Succeeding Dependencies:** All protected operations across Sprint 1 (`BCK02` through `BCK10`) rely on the JWT token verification and Role-Based Access Control (`RolesGuard`) established here.

### 1.5. Input and Output Data

#### Inputs:
- **Public Registration:**
  - `email`: string (valid email format, unique, mandatory)
  - `password`: string (minimum 8 characters, mandatory)
- **Staff Provisioning / Invite (Manager only):**
  - `email`: string (valid email format, unique, mandatory)
  - `roles`: array of UserRoles (`MANAGER`, `EMPLOYEE`, mandatory)
- **Authentication / Login:**
  - `email`: string (mandatory)
  - `password`: string (mandatory)

#### Outputs:
- **Registration Success:** HTTP 201 Created + JWT token + user summary (`id`, `email`, `roles`, `status`).
- **Staff Provisioning Success:** HTTP 201 Created + user record with `status: PENDING_REGISTRATION`.
- **Login Success:** HTTP 200 OK + JWT bearer token + user summary (`id`, `email`, `roles`, `status`).
- **Failure Statuses:** HTTP 400 Bad Request, HTTP 401 Unauthorized, HTTP 403 Forbidden, HTTP 409 Conflict.

---

### 1.6. HTTP API

The paths below are relative to the application's configured API prefix. This section describes the current authentication and user controllers. In particular, staff provisioning uses `/auth/pre_register`; `/users/invite` in the SSD below and `/auth/users` in the OpenAPI document are not the implemented route.

| Method | Path | Access | Success | Other outcomes |
| --- | --- | --- | --- | --- |
| POST | `/auth/register` | Public | 201, JWT token and user summary | 400 invalid email, password or user details; 409 email already registered outside pending registration |
| POST | `/auth/login` | Public | 200, JWT token and user summary | 400 pending registration; 401 invalid credentials; 403 deactivated account |
| POST | `/auth/pre_register` | Active Manager | 201, user record with pending registration status | 400 invalid email, role or user details; 401/403 access denied; 409 duplicate email |
| GET | `/users?page=1&pageSize=20` | Active Manager | 200, paginated users | 400 invalid pagination; 401/403 access denied |
| GET | `/users/filter/creation-date/:date` | Active Manager | 200, paginated users created on the given UTC date | 400 invalid date or pagination; 401/403 access denied |
| GET | `/users/filter/role/:role` | Active Manager | 200, paginated users with the given role | 400 invalid role or pagination; 401/403 access denied |
| GET | `/users/filter/status/:status` | Active Manager | 200, paginated users with the given status | 400 invalid status or pagination; 401/403 access denied |
| GET | `/user/:username` | Active Manager or Customer reading their own account | 200, user record | 400 malformed identifier; 401/403 access denied; 404 missing user |
| DELETE | `/user/:username` | Active Manager or Customer deactivating their own account | 200, empty body; account deactivated | 400 malformed identifier; 401 unauthorized or Customer targeting another account; 403 role/status denied; 404 missing user |

Registration accepts `firstName`, `lastName`, `email` and `password`. Passwords require at least eight characters, including uppercase and lowercase letters, a number and a special character. Login accepts `email` and `password`. Both successful responses contain `{ "token": "...", "user": { ... } }`; the user summary includes `id`, `firstName`, `lastName`, `createdAt`, `updatedAt`, `email`, `roles` and `status`.

Example staff provisioning:

```json
{
  "firstName": "Ana",
  "lastName": "Silva",
  "email": "ana.silva@laprizza.com",
  "roleName": "EMPLOYEE"
}
```

The provisioning payload uses a single `roleName`, rather than the `roles` array shown in the earlier requirements. The current service accepts the standard roles `MANAGER`, `EMPLOYEE` and `CUSTOMER`. Registration can complete a pending account; the service retains its assigned roles and also includes `CUSTOMER`.

Protected requests use `Authorization: Bearer <token>`. Filter routes accept optional `page` and `pageSize` query parameters, defaulting to 1 and 20; both must be positive integers and `pageSize` cannot exceed 100. Dates use `YYYY-MM-DD`; role and status filters use the enum values listed above. Collection responses contain `items`, `total`, `page`, `pageSize` and `totalPages`. Individual user reads omit `updatedAt` from the authentication summary fields.

Deletion deactivates the authentication account. Errors use the existing global exception filter's `{ "error": { "message": "..." } }` shape. Unexpected infrastructure failures return 500.

---

### 1.7. System Sequence Diagrams (SSD)

#### 1.7.1. Public User Registration (Self-Service Customer)

```mermaid
sequenceDiagram
autonumber
title: BCK01 - Public Customer Registration
    actor user as Customer
    participant FE as Frontend (SPA)
    participant API@{ "type": "boundary" } as Public API (NestJS Gateway)
    participant Ctrl as AuthController
    participant Svc@{ "type": "control" } as AuthService
    participant User as User
    participant Repo as UserRepository
    participant Hasher as Argon2Hasher
    participant Token@{ "type": "control" } as JwtTokenService
    participant db@{ "type": "database" } as Database

    user->>FE: Fill in email & password, click "Register"
    FE->>FE: Client-side validation (email syntax, password min length >= 8)

    alt client-side validation fails
        rect rgba(255, 200, 200, 0.4)
            FE-->>user: Show validation errors
        end
    else client-side validation passes
        FE->>API: POST /auth/register (email, password)
        API->>Ctrl: register(RegisterUserDTO)
        Ctrl->>Ctrl: Validate payload format

        alt payload format invalid
            rect rgba(255, 200, 200, 0.4)
                Ctrl-->>API: 400 Bad Request
                API-->>FE: 400 Bad Request
                FE-->>user: Show "Invalid email or password format"
            end
        else valid payload
            Ctrl->>Svc: register(dto)
            Svc->>Repo: exists(email)
            Repo->>db: SELECT user existence by email
            db-->>Repo: matching row / no rows
            Repo-->>Svc: boolean exists

            alt email already registered
                rect rgba(255, 220, 180, 0.4)
                    Svc-->>Ctrl: Result.fail("User with this email already exists")
                    Ctrl-->>API: 409 Conflict
                    API-->>FE: 409 Conflict
                    FE-->>user: Show "Email is already registered"
                end
            else email available
                rect rgba(200, 240, 200, 0.4)
                    Svc->>Hasher: hash(plainPassword)
                    Hasher-->>Svc: passwordHash (Argon2id)
                    Svc->>User: create(id, {email, passwordHash, status=ACTIVE, roles=[CUSTOMER]})
                    User-->>Svc: Result.ok(userAggregate)
                    Svc->>Repo: save(userAggregate)
                    Repo->>db: BEGIN TRANSACTION
                    Repo->>db: INSERT INTO users (id, email, password_hash, status)
                    Repo->>db: INSERT INTO user_roles (user_id, role) VALUES (id, 'CUSTOMER')
                    Repo->>db: COMMIT
                    db-->>Repo: OK
                    Repo-->>Svc: saved
                    Svc->>Token: generateToken(userAggregate)
                    Token-->>Svc: jwtToken
                    Svc-->>Ctrl: Result.ok({ token, userSummary })
                    Ctrl-->>API: 201 Created (JSON)
                    API-->>FE: 201 Created
                    FE-->>user: Store token, redirect to dashboard / menu
                end
            end
        end
    end

```

#### 1.7.2. User Authentication (Login)

```mermaid
sequenceDiagram
autonumber
title: BCK01 - User Authentication (Login)
    actor user as User (Customer / Staff / Manager)
    participant FE as Frontend (SPA)
    participant API@{ "type": "boundary" } as Public API (NestJS Gateway)
    participant Ctrl as AuthController
    participant Svc@{ "type": "control" } as AuthService
    participant User as User
    participant Repo as UserRepository
    participant Hasher as Argon2Hasher
    participant Token@{ "type": "control" } as JwtTokenService
    participant db@{ "type": "database" } as PostgreSQL Database

    user->>FE: Fill in email & password, click "Login"
    FE->>FE: Client-side validation (email syntax, password entered)

    alt client-side validation fails
        rect rgba(255, 200, 200, 0.4)
            FE-->>user: Show validation errors
        end
    else client-side validation passes
        FE->>API: POST /auth/login (email, password)
        API->>Ctrl: login(LoginDTO)
        Ctrl->>Svc: login(dto)
        Svc->>Repo: findByEmail(email)
        Repo->>db: SELECT user with user_roles by email
        db-->>Repo: user record / null
        opt user record found
            Repo->>Repo: UserMap.toDomain(record)
            Repo->>User: create(id, props) via UserMap
            User-->>Repo: Result.ok(user)
        end
        Repo-->>Svc: user / null

        alt user not found
            rect rgba(255, 220, 180, 0.4)
                Svc-->>Ctrl: Result.fail("Invalid email or password")
                Ctrl-->>API: 401 Unauthorized
                API-->>FE: 401 Unauthorized
                FE-->>user: Show "Invalid email or password"
            end
        else user found
            Svc->>User: get status
            User-->>Svc: status
            alt account is DEACTIVATED or PENDING_REGISTRATION
                rect rgba(255, 220, 180, 0.4)
                    Svc-->>Ctrl: Result.fail("Account inactive or pending activation")
                    Ctrl-->>API: 401 Unauthorized
                    API-->>FE: 401 Unauthorized
                    FE-->>user: Show "Account not active. Please complete registration or contact manager."
                end
            else account is ACTIVE
                Svc->>User: get passwordHash
                User-->>Svc: storedHash
                Svc->>Hasher: compare(password, storedHash)
                Hasher-->>Svc: boolean match

                alt password mismatch
                    rect rgba(255, 220, 180, 0.4)
                        Svc-->>Ctrl: Result.fail("Invalid email or password")
                        Ctrl-->>API: 401 Unauthorized
                        API-->>FE: 401 Unauthorized
                        FE-->>user: Show "Invalid email or password"
                    end
                else password matches
                    rect rgba(200, 240, 200, 0.4)
                        Svc->>Token: generateToken(user) [sub: userId, email, roles]
                        Token-->>Svc: jwtToken
                        Svc-->>Ctrl: Result.ok({ token, userSummary })
                        Ctrl-->>API: 200 OK + Bearer token
                        API-->>FE: 200 OK + Bearer token
                        FE->>FE: Store token in secure storage, configure authorization header
                        FE-->>user: Redirect to authorized area based on role
                    end
                end
            end
        end
    end

```

#### 1.7.3. Privileged Staff Provisioning (Manager Only)

```mermaid
sequenceDiagram
autonumber
title: BCK01 - Staff Provisioning & Role Assignment
    actor manager as Restaurant Manager
    participant FE as Frontend (SPA)
    participant API@{ "type": "boundary" } as Public API (NestJS Gateway)
    participant Ctrl as UserController
    participant Svc@{ "type": "control" } as AuthService
    participant User as User
    participant Repo as UserRepository
    participant Hasher as Argon2Hasher
    participant db@{ "type": "database" } as PostgreSQL Database

    manager->>FE: Enter staff email & select roles (EMPLOYEE, MANAGER), click "Invite Staff"
    FE->>API: POST /users/invite (email, roles) [Header: Authorization: Bearer <managerToken>]
    API->>API: AuthGuard & RolesGuard (Verify token & assert MANAGER role)

    alt unauthorized or insufficient permissions
        rect rgba(255, 200, 200, 0.4)
            API-->>FE: 401 Unauthorized / 403 Forbidden
            FE-->>manager: Show "Access denied: Manager role required"
        end
    else authorized
        API->>Ctrl: inviteStaff(InviteStaffDTO)
        Ctrl->>Svc: inviteStaff(dto)
        Svc->>Repo: exists(email)
        Repo->>db: SELECT user existence by email
        db-->>Repo: matching row / no rows
        Repo-->>Svc: boolean exists

        alt email already exists
            rect rgba(255, 220, 180, 0.4)
                Svc-->>Ctrl: Result.fail("User with this email already exists")
                Ctrl-->>API: 409 Conflict
                API-->>FE: 409 Conflict
                FE-->>manager: Show "User email already in use"
            end
        else email available
            rect rgba(200, 240, 200, 0.4)
                Svc->>Svc: Generate temporary random password
                Svc->>Hasher: hash(tempPassword)
                Hasher-->>Svc: tempPasswordHash
                Svc->>User: inviteStaffMember(id, email, tempPasswordHash, roles) [status=PENDING_REGISTRATION]
                User-->>Svc: Result.ok(user)
                Svc->>Repo: save(user)
                Repo->>db: BEGIN TRANSACTION
                Repo->>db: INSERT INTO users (id, email, password_hash, status) VALUES (..., 'PENDING_REGISTRATION')
                loop for each assigned role
                    Repo->>db: INSERT INTO user_roles (user_id, role) VALUES (...)
                end
                Repo->>db: COMMIT
                db-->>Repo: OK
                Repo-->>Svc: saved
                Svc-->>Ctrl: Result.ok(staffResponseDto)
                Ctrl-->>API: 201 Created
                API-->>FE: 201 Created
                FE-->>manager: Show "Staff member invited successfully"
            end
        end
    end

```

---

### 1.8. Other Relevant Remarks

* **Security & Password Storage Compliance:** Implements Argon2id with memory cost 64 MB ($2^{16}$) and 3 iterations, fulfilling OWASP Application Security Verification Standards (ASVS) and ADR-002.
* **Relational Integrity Guarantees (ADR-003 & 08-database-structure.md):** The physical schema enforces:
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DEACTIVATED', 'PENDING_REGISTRATION')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(30) NOT NULL CHECK (role IN ('MANAGER', 'EMPLOYEE', 'CUSTOMER')),
    PRIMARY KEY (user_id, role)
);

```


* **Boundary Cleanliness:** Address registration and dietary restrictions are completely decoupled from this User Story and handled strictly under **BCK02** (`Customer Management`).

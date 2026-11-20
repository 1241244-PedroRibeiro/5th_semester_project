# ADR 007: Adoption of Bruno over Postman for Exploratory and Declarative REST API Testing

* **Status:** Accepted
* **Context:**
The LaPrizza information system exposes its business capabilities via a versioned RESTful HTTP API developed with NestJS, adhering to Richardson Maturity Level 2. Throughout Sprint 1, the backend implements operational endpoints across multiple user stories—spanning authentication, customer records, catalogues, product taxonomies, component sizing, and inventory movements (`BCK01`–`BCK11`).



In accordance with User Stories `ARC03` (*REST API*) and `ARC05` (*Automated Testing*), API operations must be verifiably correct, preserve domain invariants, and return standardized status codes and error payloads. While programmatic end-to-end integration tests are implemented inside the repository using Jest and Supertest, developers and evaluators require an interactive HTTP client tool to:

1. Perform ad-hoc exploratory testing against running local and containerized server instances.
2. Build and share reproducible end-to-end user story workflows (e.g., authenticating as a `MANAGER`, persisting the issued JWT token into execution context, and issuing mutating requests to restricted catalogue endpoints).


3. Maintain API interaction artifacts under project version control so that all team members share an identical, synchronized testing workspace.



Traditionally, academic and industrial projects have adopted **Postman** for this role. However, recent policy updates and pedagogical recommendations in the ARQSI course unit highlighted critical operational constraints with Postman's current licensing model. We must evaluate API client tooling and formalize our selection.

* **Decision:**
We adopt **Bruno** as the official API client and declarative HTTP testing tool for the LaPrizza project, establishing the shared collection within the repository tree under `backend/tests/bruno/LaPrizza/` using the open-standard `opencollection.yml` format.

The decision is guided by the following architectural and workflow foundations:

1. **Plain-Text, Git-Native Persistence:** Bruno stores collections, folders, environments, and request definitions as plain-text files using the human-readable `.bru` syntax alongside declarative configuration manifests (`opencollection.yml` or `bruno.json`). Consequently, API requests live directly inside the Git repository, branching, merging, and versioning alongside production application code without external synchronization intermediaries.


2. **Pedagogical and Economic Alignment:** Addressing explicit recommendations from the ARQSI course faculty, Bruno circumvents Postman's cloud-enforced workspace restrictions, eliminating artificial team size limits (previously capped at 3 collaborators on Postman free tiers) and avoiding mandatory cloud account dependencies.
3. **Frictionless Team Collaboration:** Team members do not need to manage cloud invites or manually export/import JSON files. A standard `git pull` instantly synchronizes new or updated API requests across all workstations.


4. **Offline and Privacy-First Operation:** Bruno operates completely offline and client-side. Sensitive configuration parameters, authentication tokens, and headers are not synchronized to third-party commercial clouds, conforming to strict security best practices and data privacy boundaries.


5. **Declarative Assertions and Scripting:** Bruno supports Node.js-compatible pre-request scripts and post-response assertion blocks (`tests { ... }`), enabling automated verification of HTTP status codes, response schemas, and automatic capture of authorization Bearer tokens (`bru.setEnvVar(...)`) for seamless chaining across sequential user stories.


6. **Command-Line Interface (CLI) Readiness:** Bruno provides an open-source CLI runner (`@usebruno/cli`) capable of executing entire collection folders via `bru run`, establishing a direct pathway for automated API acceptance testing inside GitHub Actions CI pipelines (`.github/workflows/ci.yml`).



* **Considered Alternatives:**
### 1. Postman (Proprietary Cloud Workspace)


* *Description:* The incumbent industry API platform providing desktop and web interfaces, cloud-hosted workspaces, and runner automation via Newman.
* *Pros:* Universally recognized, extensive documentation, built-in mock servers, and widespread familiarity across developers.


* *Cons:* Postman transitioned to a cloud-first model where collections reside primarily on Postman's servers rather than the local filesystem. The free tier restricts real-time collaboration to a maximum of 3 team members per workspace, creating an immediate operational blocker for standard 5-to-6-member student engineering teams. Sharing collections manually via JSON file exports is error-prone, introduces merge conflicts in single monolithic JSON files, and frequently leads to out-of-sync local states across teammates.


### 2. Insomnia (Kong)


* *Description:* A popular open-source/freemium desktop REST and GraphQL client.
* *Pros:* Clean user interface, lightweight memory footprint, and intuitive request builder.
* *Cons:* Starting with version 2023.5+, Insomnia introduced mandatory cloud logins and restricted local scratchpads, raising severe privacy concerns and causing breaking changes in git-sync workflows for teams relying purely on open-source repositories without enterprise subscriptions.


### 3. VS Code REST Client / Thunder Client


* *Description:* In-editor extensions allowing HTTP execution directly from `.http` files inside Visual Studio Code.
* *Pros:* Extreme proximity to source code; plain-text storage fully native to Git.
* *Cons:* Lacks a dedicated, feature-rich graphical interface for inspecting complex nested responses, multipart payloads, or visual test execution reports. Scripting capabilities for token extraction and variable propagation across folders are less intuitive and require custom extension-specific configurations that do not standardize across different IDEs (e.g., WebStorm/IntelliJ).


* **Consequences:**
### Positive


* **Zero Cost and Infinite Scalability:** Eliminates licensing barriers and team size ceilings, allowing the entire engineering team and academic evaluators to collaborate without payment or account creation.
* **Single Source of Truth in Git:** API request definitions, assertions, and local environment definitions are committed directly into the project repository under `backend/tests/bruno/LaPrizza/`, ensuring complete traceability alongside code commits (`ARC05`).


* **Enhanced Code Review and Diffing:** Changes to request headers, query parameters, or expected payloads produce concise line-by-line Git diffs in pull requests, avoiding the unreadable multi-thousand-line diffs generated by monolithic Postman collection JSON exports.


* **Streamlined User Story Verification:** Enables automated token capture upon calling `POST /api/v1/auth/login`, allowing subsequent protected endpoints (`POST /api/v1/pizza-sizes`, `POST /api/v1/products`) to execute in Bruno without tedious manual copy-pasting of Bearer tokens.


* **Continuous Integration Potential:** The collection can be executed headlessly in Linux environments (GitHub Actions CI) using `bru run`, verifying that live staging instances comply with the REST specification without opening proprietary network tunnels.




### Negative / Trade-offs


* **Emerging Ecosystem:** While rapidly growing and actively maintained, Bruno has fewer third-party visual reporting extensions and enterprise mock-server integrations compared to the mature Postman ecosystem.
* **Tool Installation Prerequisite:** Each team member must install the standalone Bruno application (or the `@usebruno/cli` package) on their local operating system (Windows, macOS, or Linux).
* **Learning Curve for Advanced Scripting:** Developers accustomed to Postman's proprietary `pm.*` sandbox API must adapt to Bruno's Node.js-based `bru.*` and Chai-like `expect(...)` assertions.



---

## 2. Directory Layout & Repository Integration

In alignment with **ADR-001** (Clean Architecture separation) and **ADR-005** (REST standards), the collection is segregated from production source code under `backend/tests/bruno/LaPrizza/`:

```text
backend/tests/bruno/LaPrizza/
├── opencollection.yml          # Core collection manifest and metadata
├── environments/
│   ├── Local.bru              # Target: http://localhost:3000 (committed)
│   └── Docker.bru             # Target: http://localhost:8080 (containerized)
├── BCK01-Auth/
│   ├── 01-Register Customer.bru
│   └── 02-Login Manager.bru   # Extracts managerToken via bru.setEnvVar
├── BCK02-Customers/
│   ├── 01-Create Customer Profile.bru
│   └── 02-Get Customer By Email.bru
├── BCK03-Categories/
│   ├── 01-List Categories (Public).bru
│   └── 02-Create Category (Manager).bru
├── BCK04-Allergens/
│   ├── 01-List Allergens (Public).bru
│   └── 02-Create Allergen (Manager).bru
├── BCK05-Products/
│   ├── 01-List Products Filtered.bru
│   ├── 02-Create Sellable Product.bru
│   └── 03-Block Product.bru
└── BCK06-PizzaSizes/
    ├── 01-Get All Pizza Sizes (Public).bru
    ├── 02-Create Pizza Size (Manager).bru
    └── 03-Delete Pizza Size Guarded.bru

```

---

## 3. Standardized Test Scripting Pattern

Every mutating request committed to the repository must include declarative assertions verifying status codes and schema conformance, matching the contract rules defined in `06-api-design-specification.md`:

```bru
meta {
  name: Create Pizza Size
  type: http
  seq: 2
}

post {
  url: {{baseUrl}}/api/v1/pizza-sizes
  body: json
  auth: bearer
}

auth:bearer {
  token: {{managerToken}}
}

body:json {
  {
    "name": "Medium"
  }
}

tests {
  test("HTTP status is 201 Created", function() {
    expect(res.getStatus()).to.equal(201);
  });

  test("Response payload contains technical ID and designation", function() {
    const data = res.getBody();
    expect(data).to.have.property("id");
    expect(data.name).to.equal("Medium");
    expect(data.active).to.be.true;
  });
}
```
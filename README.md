# LaPrizza — Enterprise Restaurant & Kitchen Management System

---

### Language Selection / Selecção de Idioma

Select your preferred language version below to jump directly to the comprehensive technical documentation:

* [🇬🇧 English Documentation](#-english-version) — Global project overview, architecture, layered components, and automated test execution.
* [🇵🇹 Versão em Português (Antigo A.O.)](#-versão-em-português-antigo-ao) — Visão global do projecto, arquitectura de camadas, especificações de negócio e execução de testes.

---

# 🇬🇧 English Version

## 1. Project Identification & Engineering Team

The **LaPrizza** information system is an enterprise-grade platform developed in the academic context of the **5th Semester Integrative Project** in the Bachelor's Degree in Informatics Engineering (**LEI**) at the **Instituto Superior de Engenharia do Porto (ISEP)** during the 2026/2027 academic year[cite: 56]. The project establishes an integrative framework bridging multiple course units: Software Architecture (**ARQSI**), Laboratory Project V (**LAPR5**), Systems Administration (**ASIST**), Artificial Intelligence (**IART**), and Computer Graphics and Interaction (**SGRAI**)[cite: 56].

The software engineering team is **Class 3DJ, Group 5**:

| Student Number | Full Name | Academic E-mail Address | Primary Responsibilities & Functional Allocations |
| --- | --- | --- | --- |
| **1240697** | Eduardo Vasconcelos | `1240697@isep.ipp.pt` | **BCK01, BCK02, BCK07:** User Authentication, RBAC Security, Customer Management, and Pizza Component Types[cite: 43, 44] |
| **1241225** | Afonso Mota | `1241225@isep.ipp.pt` | **BCK08, BCK09:** Component Size Configurations, Abstract Stock Information, and Inventory Management[cite: 48, 49] |
| **1241235** | Gustavo Silva | `1241235@isep.ipp.pt` | **BCK10, BCK11:** Predefined Pizza Recipes, Multi-Size Variants, and Product Catalogues[cite: 48] |
| **1241244** | Pedro Ribeiro | `1241244@isep.ipp.pt` | **BCK03, BCK04, BCK05, BCK06:** Product Categories, Allergen Management, Master Product Taxonomies, and Pizza Sizes[cite: 45, 46, 47, 51, 53] |

Repository Identification: `LEI-SEM5-PI-2026-27-3DJ-05`[cite: 41]

---

## 2. Business Overview & System Context

**LaPrizza** is a modern restaurant enterprise operating within the casual dining sector, specialising in customisable, on-demand food preparation and multi-channel order processing[cite: 31, 58]. The platform is engineered as a modular monolith back-end REST application capable of servicing customer orders, configuring intricate pizza assemblies, managing raw ingredient inventories, auditing food-safety allergens, and scheduling downstream kitchen preparation across constrained physical assets (assembly stations and industrial ovens)[cite: 22, 58].

```
+----------------------------------------------------------------------------------------------------+
|                                  C4 LEVEL 1: SYSTEM CONTEXT                                        |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|    +--------------------+       +-----------------------+       +-----------------------------+    |
|    |  Customer (Web /   |       |  Restaurant Employee  |       |    Restaurant Manager       |    |
|    |  Anonymous Kiosk)  |       |   [Role: EMPLOYEE]    |       |     [Role: MANAGER]         |    |
|    +--------------------+       +-----------------------+       +-----------------------------+    |
|              |                              |                                   |                  |
|              | Browses & Orders             | Preparation Queue                 | Administers Core |
|              | [HTTPS / JSON]               | [HTTPS / JSON]                    | [HTTPS / JSON]   |
|              v                              v                                   v                  |
|    +------------------------------------------------------------------------------------------+    |
|    |                         LaPrizza Modular Monolith Information System                     |    |
|    |            (Node.js 20+ LTS / NestJS / Clean Architecture / PostgreSQL 16+)              |    |
|    +------------------------------------------------------------------------------------------+    |
|              |                                                                  |                  |
|              | Evaluates Stock & Orders                                         | Kitchen Schedule |
|              v                                                                  v                  |
|    +--------------------------------------+            +--------------------------------------+    |
|    |  Prolog AI Scheduling Engine         |            |  Three.js 3D Interactive Canvas      |    |
|    |  (Task Sequencing & Oven Bounding)   |            |  (Kitchen Ops & Prep Visualization)  |    |
|    +--------------------------------------+            +--------------------------------------+    |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+

```

### Core Business Invariants Enforced in Sprint 1

1. **User Account vs. Customer Separation (Clarifications #01 & #02):** A `User` models system identity, access credentials, lifecycle state (`ACTIVE`, `DEACTIVATED`, `PENDING_REGISTRATION`), and role memberships (`MANAGER`, `EMPLOYEE`, `CUSTOMER`)[cite: 26, 28, 29]. A `Customer` represents a distinct commercial entity requiring mandatory First Name, Last Name, Phone Number, and E-mail Address[cite: 26, 27, 29]. Self-service kiosk checkouts execute anonymously, storing orders without generating persistent customer rows[cite: 26, 27, 29].
2. **Product Role Multiplicity (Clarification #06):** Products satisfy the invariant `(isSellable || isPizzaComponent) === true`[cite: 26, 27, 29, 34]. Items cannot exist exclusively for stock tracking[cite: 26, 27, 29, 34]. Products marked as pizza components must link to exactly one `PizzaComponentType`[cite: 28, 29, 34, 46].
3. **Pure Additive Pricing Engine (Clarifications #01 & #05):** Predefined pizzas store zero arbitrary base markups or manual labor surcharges[cite: 26, 27, 29]. The price of any pizza configuration is dynamically evaluated as the exact mathematical sum of its constituent component prices for the target size from `ComponentSizeConfiguration`[cite: 26, 27, 28, 29].
4. **Abstract Integer Stock Tracking (BCK09):** Stock is maintained using non-negative integer units ($currentBalance \ge 0$)[cite: 28, 29, 48]. Size availability is evaluated dynamically: a pizza size is available if and only if $\text{currentBalance} \ge \text{stockUnitsConsumed}$ for every stock-controlled component in that recipe[cite: 22, 26, 27, 29].

---

## 3. High-Level Technical Architecture

The back-end container is developed in **NestJS** and **TypeScript** following the tenets of **Clean Architecture** (Onion model), enforcing strict inward-pointing dependencies as dictated by **ADR-001** and **ADR-002**[cite: 30, 32, 36]:

```
+----------------------------------------------------------------------------------------------------+
|                                  CLEAN ARCHITECTURE LAYERING                                       |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|    +------------------------------------------------------------------------------------------+    |
|    | 1. PRESENTATION & DELIVERY LAYER (Interface Adapters)                                    |    |
|    |    - NestJS Controllers (AuthController, ProductController, PizzaSizeController, etc.)   |    |
|    |    - Request Guards (JwtAuthGuard, RolesGuard) & Parameter Decorators (@Roles, @Public)  |    |
|    |    - Global Exception Filters & Validation Pipes (Joi DTO validation)                    |    |
|    +------------------------------------------------------------------------------------------+    |
|                                                 |                                                  |
|                                                 | Invokes Application Use Cases via DTOs           |
|                                                 v                                                  |
|    +------------------------------------------------------------------------------------------+    |
|    | 2. APPLICATION SERVICES LAYER (Use Cases & Workflow Orchestration)                       |    |
|    |    - Services (AuthService, ProductService, PizzaSizeService, StockService)              |    |
|    |    - Transactional Demarcation, Cross-Aggregate Validation, DTO Serialization            |    |
|    +------------------------------------------------------------------------------------------+    |
|                                                 |                                  |               |
|                                                 | Operates on Entities             | Inverts Repo  |
|                                                 v                                  v Dependencies  |
|    +--------------------------------------+      +--------------------------------------------+    |
|    | 3. DOMAIN CORE LAYER                 |      | 4. INFRASTRUCTURE & PERSISTENCE ADAPTERS   |    |
|    |    - Aggregates & Root Entities      |      |    - Repository Ports (IRepository)        |    |
|    |    - Pure Value Objects (Money, etc.)|      |    - PostgreSQL Repositories (pg Pool)     |    |
|    |    - Domain Services (Pricing, Stock)|      |    - In-Memory Doubles for Unit Testing    |    |
|    |    - Business Invariants & Results   |      |    - Relational Mappers (EntityMap)        |    |
|    +--------------------------------------+      +--------------------------------------------+    |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+

```

### Technology Matrix

* **Language & Runtime:** Node.js v20+ LTS, TypeScript 5.5+[cite: 36].
* **Web Framework:** NestJS 10.3 (Modular Architecture, Built-in IoC Dependency Injection, Declarative Guards)[cite: 36].
* **Persistence Engine:** PostgreSQL 16+ utilizing a dedicated connection pool (`pg`), backed by relational constraints (`ON DELETE RESTRICT`, `CHECK`)[cite: 29, 34, 36].
* **Security & Token Management:** Stateless JSON Web Tokens (`@nestjs/jwt`), Argon2id password hashing (`argon2` package) meeting OWASP guidelines[cite: 36].
* **Testing Harness:** Jest 29, Supertest 7, and Bruno Declarative HTTP Client[cite: 36, 53].

---

## 4. Artificial Intelligence Assisted Engineering Disclosure

In strict adherence to academic transparency and professional engineering ethics, this repository acknowledges the utilization of **Artificial Intelligence (AI)** tools during Sprint 1 by all team members (Eduardo Vasconcelos, Afonso Mota, Gustavo Silva, and Pedro Ribeiro). AI assistance was engaged as an augmented engineering partner across the following structural workflows:

1. **Requirements Alignment & Formal Analysis:** Systematic validation of user story requirements (`requirements.md` for BCK01 through BCK11) against client clarifications and project specifications[cite: 26, 40, 58].
2. **System Sequence Diagrams (SSD):** Generation and standardization of UML/Mermaid sequence diagrams across all user stories, ensuring accurate lifelines from boundary controllers to database transactions[cite: 25, 33, 35].
3. **Architecture Decision Records (ADRs):** Assisting in the structured composition of rationale documents, comparative tradeoff matrices, and technical justifications (**ADR-001** through **ADR-007**)[cite: 30, 35, 36].
4. **Code Review & Architectural Hygiene:** Refactoring import casing inconsistencies, eliminating layer bleeding between domain entities and framework dependencies, and designing robust value objects for domain safety[cite: 28, 30].
5. **Declarative Test Automation:** Drafting automated test scenarios for the Bruno API client workspace and Jest integration test suites, ensuring complete functional coverage prior to manual review.

*Every line of code, diagram, and architectural decision produced with AI assistance underwent rigorous manual technical review, validation, compilation, and automated test verification by the engineering team.*

---

## 5. Directory Structure & File Map

```
LEI-SEM5-PI-2026-27-3DJ-05/
├── .github/                                # Continuous Integration and GitHub workflows
│   └── workflows/
│       └── ci.yml                          # Automated build and Jest test runner pipeline
├── backend/                                # Modular Monolith Back-End (NestJS / TypeScript)
│   ├── src/
│   │   ├── application/                    # Application Layer: Use cases, DTOs, and ports
│   │   │   ├── allergen/                   # Allergen use case workflows and contracts[cite: 46]
│   │   │   ├── auth/                       # Identity orchestration and token services[cite: 44]
│   │   │   ├── catalogue/                  # Product category management services[cite: 45]
│   │   │   ├── customer/                   # Customer profile coordination services[cite: 45]
│   │   │   ├── pizza/                      # Pizza taxonomy and size application logic[cite: 47]
│   │   │   ├── product/                    # Core product operations and category services[cite: 46]
│   │   │   ├── stock/                      # Inventory management and balance adjustment[cite: 48]
│   │   │   └── taxonomy/                   # Component types and cardinality interfaces[cite: 47]
│   │   ├── domain/                         # Domain Core Layer: Aggregates, VOs, invariants
│   │   │   ├── allergen/                   # Allergen Aggregate Root and AllergenCode VO[cite: 28]
│   │   │   ├── catalog/                    # ProductCategory Aggregate Root and CategoryCode[cite: 28]
│   │   │   ├── common/                     # Shared Kernel: Designation, Money, Result, Entity[cite: 28]
│   │   │   ├── customer/                   # Customer Aggregate Root and contact VOs[cite: 28]
│   │   │   ├── pizza/                      # PizzaSize, PizzaComponentType, AssemblyOrder[cite: 28]
│   │   │   ├── product/                    # Product Aggregate Root and ProductCode VO[cite: 28]
│   │   │   ├── stock/                      # StockItem Aggregate and AbstractStockQuantity[cite: 28]
│   │   │   └── user/                       # User Aggregate, Email, PasswordHash, UserRole[cite: 28]
│   │   ├── infrastructure/                 # Infrastructure: Persistence and Security Adapters
│   │   │   ├── persistence/
│   │   │   │   ├── connection.ts           # PostgreSQL connection pool configuration[cite: 36]
│   │   │   │   ├── mappers/                # Bidirectional Data Mappers (EntityMap)[cite: 34]
│   │   │   │   ├── migrations/             # SQL DDL Migration scripts (001 to 013)[cite: 29, 34]
│   │   │   │   └── repositories/           # PostgreSQL and In-Memory repository adapters[cite: 30, 36]
│   │   │   └── security/                   # Argon2id hasher and JWT token infrastructure[cite: 36]
│   │   └── presentation/                   # Presentation Layer: HTTP delivery, REST Controllers
│   │       ├── http/
│   │       │   ├── controllers/            # NestJS Controllers (Auth, Product, Sizes, etc.)[cite: 33, 35]
│   │       │   └── middlewares/            # RolesGuard, JwtAuthGuard, and Decorators[cite: 33, 36]
│   │       ├── app.module.ts               # Root NestJS application dependency wiring[cite: 36]
│   │       └── global_exception.filter.ts  # RFC-compliant error envelope serialization[cite: 33]
│   └── tests/                              # Automated Verification Suites
│       ├── bruno/                          # Declarative Bruno API Client Workspace
│       │   └── LaPrizza/                   # Collections: BCK01 to BCK11 + Environments
│       ├── integration/                    # Supertest Controller E2E integration test suites[cite: 36, 53]
│       └── unit/                           # Isolated domain invariant and application unit tests[cite: 36, 53]
├── docs/                                   # Formal Engineering Documentation
│   ├── api/                                # OpenAPI 3.0 specification contract (openapi.yaml)[cite: 33, 35]
│   ├── architectural/                      # C4 Architecture Diagrams (L1, L2, L3) and Summaries[cite: 22, 23, 24, 25]
│   ├── domain/                             # PlantUML Domain Model (domain-model.puml) and sketches[cite: 27, 28]
│   ├── sad/                                # Software Architecture Document and ADRs (001-007)[cite: 30, 35, 36]
│   └── user-stories/                       # Requirements documents & SSDs (BCK01 to BCK11)[cite: 44, 45, 46, 47, 48]
├── docker-compose.yml                      # Containerized PostgreSQL 16 local environment
└── README.md                               # Project entrypoint and technical documentation

```

---

## 6. Sprint 1 Deliverable Status & User Story Traceability

| User Story | Title & Functional Scope | Responsible Team Member | Implementation & Documentation Artifacts | Verification Status |
| --- | --- | --- | --- | --- |
| **BCK01** | User and Authentication Management[cite: 44] | Eduardo Vasconcelos | `AuthService`, `Argon2Hasher`, `JwtTokenService`, `AuthController`[cite: 36] | Passed |
| **BCK02** | Customer Profile Management[cite: 45] | Eduardo Vasconcelos | `Customer` entity, decoupled contact VOs, database migrations[cite: 28, 29] | Passed |
| **BCK03** | Product Category Management[cite: 45] | Pedro Ribeiro | `ProductCategory`, `CategoryService`, `CategoryController`[cite: 28] | Passed |
| **BCK04** | Recognized Allergen Management[cite: 46] | Pedro Ribeiro | `Allergen`, `AllergenCode`, `AllergenService`, `AllergenController`[cite: 28] | Passed |
| **BCK05** | Master Product Management[cite: 46] | Pedro Ribeiro | `Product`, `Money` VO, `ProductService`, `ProductController`[cite: 28] | Passed |
| **BCK06** | Pizza Size Management[cite: 47] | Pedro Ribeiro | `PizzaSize`, `PizzaSizeId`, `PizzaSizeService`, `PizzaSizeController`[cite: 28] | Passed |
| **BCK07** | Pizza Component Types[cite: 47] | Eduardo Vasconcelos | `PizzaComponentType`, `AssemblyOrder`, cardinality bounds[cite: 28] | Passed |
| **BCK08** | Component Size Configurations[cite: 48] | Afonso Mota | Pricing matrix contracts, sizing consumption rate logic[cite: 28, 29] | Passed |
| **BCK09** | Abstract Stock Information[cite: 48] | Afonso Mota | `StockItem`, `AbstractStockQuantity`, non-negative constraints[cite: 28, 29] | Passed |
| **BCK10** | Predefined Pizza Management[cite: 30] | Gustavo Silva | `PredefinedPizza`, recipe lines, multi-size available variants[cite: 28, 30] | Passed |
| **BCK11** | Product Catalogue & Information[cite: 30] | Gustavo Silva | Public menu views (`v_catalogue_products`), filtering[cite: 29, 30] | Passed |
| **ARC01** | Core Domain Analysis & Modeling[cite: 50] | Group 5 (Collaborative) | `domain-model.puml`, 11 Aggregates + Shared Kernel[cite: 27, 28] | Complete |
| **ARC02** | System Architecture (C4 Model)[cite: 51] | Group 5 (Collaborative) | Level 1 Context, Level 2 Containers, Level 3 Components[cite: 22, 23, 24, 25] | Complete |
| **ARC03** | REST API Formal Specification[cite: 52] | Group 5 (Collaborative) | `docs/api/openapi.yaml`, REST Level 2 design, RFC status mapping[cite: 33, 35] | Complete |
| **ARC04** | Persistence and Data Integrity[cite: 52] | Group 5 (Collaborative) | PostgreSQL migrations 001–013, `ON DELETE RESTRICT` constraints[cite: 29, 34] | Complete |
| **ARC05** | Automated Testing Suites[cite: 53] | Group 5 (Collaborative) | 18 test suites, 93 unit/integration tests, 100% pass rate[cite: 53] | Complete |

---

## 7. Setup, Local Execution & Verification Guide

### Prerequisites

* **Node.js:** v20.x or v22.x LTS (with `npm` v10+)[cite: 36]
* **Docker & Docker Compose:** For running containerized PostgreSQL 16 instances
* **Bruno Application:** (Optional) For executing the visual declarative HTTP testing suite

### 1. Repository Setup & Dependencies

```bash
git clone https://github.com/Department-of-Engineering-Informatics/LEI-SEM5-PI-2026-27-3DJ-05.git
cd LEI-SEM5-PI-2026-27-3DJ-05/backend
npm install

```

### 2. Database Initialization (Docker Compose)

Start the PostgreSQL 16 database container from the project root:

```bash
# From repository root
docker-compose up -d

```

The database boots on port `5432`. The backend startup runs TypeORM migrations and, when `SEED_DATABASE=true` (the Compose default), inserts local accounts, taxonomy, and a sample catalogue with pizzas, sides, sellable beverages and desserts. See [development seed setup](backend/src/bootstrap/seed/README.md) for the fixtures and safe reseeding commands. Existing database volumes are retained.

Product and pizza pictures live in the `laprizza-pictures` Docker volume, mounted in the backend at `/app/data/pictures` and served through `/api/images/{nameOrSku}` ([ADR-018](docs/sad/03-rationale/ADR-018-item-pictures-volume.md)). A new volume starts with the seed pictures from `backend/data/pictures/` (one `<SKU>.jpg` per item); an existing volume keeps the pictures uploaded at runtime and does not receive seed pictures added later. To reload them, remove the volume (`docker volume rm laprizza_laprizza-pictures`, which also deletes uploaded pictures) or upload them through the back-office.

### 3. Application Execution

```bash
# In backend/ directory
npm run dev
# Server initializes on http://localhost:3000

```

### 4. Running Automated Tests (Jest & Supertest)

```bash
# Execute isolated unit and controller integration tests with coverage
npm test -- --coverage

```

### 5. Running Declarative API Tests (Bruno)

1. Open the **Bruno** desktop application.
2. Select **Open Collection** and choose the directory `backend/tests/bruno/LaPrizza`.
3. In the upper-right corner, select the **`Local`** environment (`baseUrl: http://localhost:3000`).
4. Execute test folders sequentially (`BCK01` through `BCK11`) to observe green assertions.

---

---

# 🇵🇹 Versão em Português (Antigo A.O.)

## 1. Identificação do Projecto e Equipa de Engenharia

O sistema de informação **LaPrizza** é uma plataforma empresarial desenvolvida no âmbito académico do **Projecto Integrador do 5.º Semestre** da Licenciatura em Engenharia Informática (**LEI**) no **Instituto Superior de Engenharia do Porto (ISEP)**, no ano lectivo de 2026/2027[cite: 56]. O projecto constitui um eixo de convergência prática entre diversas unidades curriculares: Arquitectura de Sistemas (**ARQSI**), Laboratório e Projecto V (**LAPR5**), Administração de Sistemas (**ASIST**), Inteligência Artificial (**IART**), e Sistemas Gráficos e Interacção (**SGRAI**)[cite: 56].

A equipa de desenvolvimento é constituída pela **Turma 3DJ, Grupo 5**:

| Número Mecanográfico | Nome Completo | Correio Electrónico Institucional | Responsabilidades e Alocação Funcional |
| --- | --- | --- | --- |
| **1240697** | Eduardo Vasconcelos | `1240697@isep.ipp.pt` | **BCK01, BCK02, BCK07:** Autenticação, Controlo de Acesso RBAC, Gestão de Clientes e Tipos de Componentes[cite: 43, 44] |
| **1241225** | Afonso Mota | `1241225@isep.ipp.pt` | **BCK08, BCK09:** Configurações de Componentes por Tamanho e Gestão de Stock Abstrato[cite: 48, 49] |
| **1241235** | Gustavo Silva | `1241235@isep.ipp.pt` | **BCK10, BCK11:** Receitas de Pizzas Predefinidas, Variantes Múltiplas e Catálogo[cite: 48] |
| **1241244** | Pedro Ribeiro | `1241244@isep.ipp.pt` | **BCK03, BCK04, BCK05, BCK06:** Categorias, Alergénios, Taxonomia de Produtos e Tamanhos de Pizza[cite: 45, 46, 47, 51, 53] |

Identificador Oficial do Repositório: `LEI-SEM5-PI-2026-27-3DJ-05`[cite: 41]

---

## 2. Visão de Negócio e Contexto Operacional

A **LaPrizza** é uma empresa de restauração moderna inserida no sector de restauração informal rápida, especializada na preparação de produtos alimentares sob encomenda, altamente personalizáveis, e na gestão multicanal de pedidos[cite: 31, 58]. O sistema materializa-se como uma aplicação modular monolítica de retaguarda (*back-end* REST), apta a processar encomendas de clientes, gerir composições e configurações de pizzas, monitorizar existências de inventário, auditar substâncias alergénicas regulamentares e calendarizar as actividades operacionais da cozinha em recursos de capacidade física e térmica limitada (estações de montagem e fornos de cozedura)[cite: 22, 58].

```
+----------------------------------------------------------------------------------------------------+
|                                  C4 NÍVEL 1: CONTEXTO DO SISTEMA                                   |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|    +--------------------+       +-----------------------+       +-----------------------------+    |
|    |  Cliente (Web ou   |       |   Empregado de Mesa   |       |      Director / Gestor      |    |
|    |  Quiosque Anónimo) |       |   [Papel: EMPLOYEE]   |       |       [Papel: MANAGER]      |    |
|    +--------------------+       +-----------------------+       +-----------------------------+    |
|              |                              |                                   |                  |
|              | Consulta e Encomenda         | Fila de Confecção                 | Administra o     |
|              | [HTTPS / JSON]               | [HTTPS / JSON]                    | Sistema [HTTPS]  |
|              v                              v                                   v                  |
|    +------------------------------------------------------------------------------------------+    |
|    |                        Sistema de Informação LaPrizza                                    |    |
|    |            (Node.js 20+ LTS / NestJS / Arquitectura Limpa / PostgreSQL 16+)              |    |
|    +------------------------------------------------------------------------------------------+    |
|              |                                                                  |                  |
|              | Avaliação de Stock e Pedidos                                     | Directivas       |
|              v                                                                  v de Preparação    |
|    +--------------------------------------+            +--------------------------------------+    |
|    |  Motor de Escalonamento em Prolog    |            |  Módulo Gráfico 3D em Three.js       |    |
|    |  (Optimização de Recursos/Fornos)    |            |  (Visualização Operacional Cozinha)  |    |
|    +--------------------------------------+            +--------------------------------------+    |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+

```

### Invariantes de Negócio Fundamentais Validadas no Sprint 1

1. **Segregação entre Conta de Acesso (`User`) e Perfil de Negócio (`Customer`) (Esclarecimentos #01 e #02):** A entidade `User` encapsula a identidade de autenticação, credenciais cifradas, estado do ciclo de vida (`ACTIVE`, `DEACTIVATED`, `PENDING_REGISTRATION`) e perfis de segurança (`MANAGER`, `EMPLOYEE`, `CUSTOMER`)[cite: 26, 28, 29]. A entidade `Customer` representa o parceiro comercial, exigindo obrigatoriamente Nome Próprio, Apelido, Número de Telefone e Correio Electrónico[cite: 26, 27, 29]. Os pedidos efectuados no quiosque presencial operam de modo anónimo, prescindindo de persistência na tabela de clientes[cite: 26, 27, 29].
2. **Classificação e Papéis de Produto (Esclarecimento #06):** Todo o produto satisfaz imperativamente o invariante `(isSellable || isPizzaComponent) === true`[cite: 26, 27, 29, 34]. Nenhum produto pode ser mantido unicamente para efeitos de inventário[cite: 26, 27, 29, 34]. Qualquer produto marcado como componente de pizza referencia obrigatoriamente um único `PizzaComponentType`[cite: 28, 29, 34, 46].
3. **Mecanismo Dinâmico e Puramente Aditivo de Preços (Esclarecimentos #01 e #05):** As pizzas predefinidas não possuem margens fixas nem custos adicionais de mão-de-obra[cite: 26, 27, 29]. O preço de venda de qualquer pizza é computado estritamente através do somatório aritmético dos preços dos componentes seleccionados para o tamanho correspondente a partir das configurações em `ComponentSizeConfiguration`[cite: 26, 27, 28, 29].
4. **Controlo de Stock em Unidades Abstratas (BCK09):** O stock é quantificado através de unidades inteiras não-negativas ($currentBalance \ge 0$)[cite: 28, 29, 48]. Um tamanho só é dado como disponível para venda se e só se $\text{currentBalance} \ge \text{stockUnitsConsumed}$ para todos os componentes com controlo de inventário activo[cite: 22, 26, 27, 29].

---

## 3. Arquitectura Técnica de Retaguarda

O contentor de retaguarda adopta a framework **NestJS** sobre a linguagem **TypeScript**, estruturado rigorosamente sob o estilo de **Arquitectura Limpa** (*Clean Architecture* / modelo concêntrico), onde as dependências apontam sem excepção para o interior do domínio, cumprindo as directivas **ADR-001** e **ADR-002**[cite: 30, 32, 36]:

```
+----------------------------------------------------------------------------------------------------+
|                                ORGANIZAÇÃO POR CAMADAS CONCÊNTRISTRAS                              |
+----------------------------------------------------------------------------------------------------+
|                                                                                                    |
|    +------------------------------------------------------------------------------------------+    |
|    | 1. CAMADA DE APRESENTAÇÃO E ENTREGA HTTP (Adaptadores de Interface)                      |    |
|    |    - Controladores NestJS (AuthController, ProductController, PizzaSizeController, etc.) |    |
|    |    - Guardas de Segurança (JwtAuthGuard, RolesGuard) e Anotações Declarativas            |    |
|    |    - Filtros Globais de Excepção e Filtros de Validação Sintáctica (Joi DTO)             |    |
|    +------------------------------------------------------------------------------------------+    |
|                                                 |                                                  |
|                                                 | Invoca Casos de Uso com DTOs                     |
|                                                 v                                                  |
|    +------------------------------------------------------------------------------------------+    |
|    | 2. CAMADA DE SERVIÇOS DE APLICAÇÃO (Casos de Uso e Coordenação)                          |    |
|    |    - Serviços Aplicacionais (AuthService, ProductService, PizzaSizeService, etc.)        |    |
|    |    - Demarcação Transaccional ACID, Validações Transversais e Mapeamento de Resposta     |    |
|    +------------------------------------------------------------------------------------------+    |
|                                                 |                                  |               |
|                                                 | Opera sobre Entidades            | Inverte Repo  |
|                                                 v                                  v Dependência   |
|    +--------------------------------------+      +--------------------------------------------+    |
|    | 3. NÚCLEO DO DOMÍNIO (Domain Core)   |      | 4. ADAPTADORES DE INFRAESTRUTURA           |    |
|    |    - Agregados e Raízes de Agregado  |      |    - Abstracções e Portos (IRepository)    |    |
|    |    - Objectos de Valor (Money, etc.) |      |    - Implementações Postgres (Pool nativo) |    |
|    |    - Serviços de Domínio Puros       |      |    - Duplos de Teste em Memória            |    |
|    |    - Regras de Validação e Invariantes|     |    - Mapeadores Bidireccionais (EntityMap) |    |
|    +--------------------------------------+      +--------------------------------------------+    |
|                                                                                                    |
+----------------------------------------------------------------------------------------------------+

```

### Síntese das Tecnologias Adoptadas

* **Linguagem e Plataforma de Execução:** Node.js versão LTS 20+, TypeScript versão 5.5+[cite: 36].
* **Framework de Aplicação Web:** NestJS 10.3 (Injecção de Dependências por Inversão de Controlo, Módulos Encapsulados, Guardas de Rota)[cite: 36].
* **Motor de Persistência Relacional:** PostgreSQL 16+ acedido através de conjunto de ligações dedicadas (`pg`), com salvaguardas relacionais integradas (`ON DELETE RESTRICT`, restrições de validação `CHECK`)[cite: 29, 34, 36].
* **Segurança e Controlo de Acesso:** Emissão de JSON Web Tokens com sessões revogáveis em PostgreSQL (`@nestjs/jwt`), cifra criptográfica de credenciais com Argon2id em conformidade com as normas internacionais da OWASP[cite: 36].
* **Aferição de Qualidade:** Jest 29, Supertest 7 e cliente HTTP declarativo Bruno[cite: 36, 53].

---

## 4. Declaração do Uso de Ferramentas de Inteligência Artificial

Em integral concordância com os princípios de integridade académica e transparência profissional, declara-se que o desenvolvimento dos artefactos do Sprint 1 contou com o suporte assistido de **Inteligência Artificial (IA)** por parte de todos os elementos da equipa (Eduardo Vasconcelos, Afonso Mota, Gustavo Silva e Pedro Ribeiro). A utilização destes modelos operou como co-piloto técnico nas seguintes vertentes de engenharia:

1. **Engenharia de Requisitos e Auditoria:** Validação sistemática e reformulação dos documentos de requisitos funcionais (`requirements.md` das histórias BCK01 a BCK11) em confronto com os esclarecimentos prestados pelo cliente[cite: 26, 40, 58].
2. **Modelação de Diagramas de Sequência do Sistema (SSD):** Desenho e padronização visual em notação Mermaid de todos os fluxos de interacção ponta-a-ponta, alinhando actores, controladores de perímetro, serviços e bases de dados[cite: 25, 33, 35].
3. **Elaboração de Registos de Decisão Arquitectural (ADRs):** Estruturação argumentativa, contextualização de compromissos (*trade-offs*) e fundamentação das decisões de engenharia relativas ao estilo arquitectural, persistência, autenticação e ferramentas de teste (**ADR-001** a **ADR-007**)[cite: 30, 35, 36].
4. **Revisão de Código e Consistência Estrutural:** Identificação e resolução de anomalias de nomenclatura sensíveis a maiúsculas/minúsculas no sistema de ficheiros, correcção de fronteiras entre camadas e desenvolvimento de objectos de valor para segurança do domínio[cite: 28, 30].
5. **Automação de Testes de Aceitação da API:** Geração dos ficheiros declarativos de pedido e asserção para o cliente Bruno e baterias Jest, assegurando a verificação prévia de contratos antes da entrega.

*Salienta-se que todo o código-fonte, diagramas, esquemas relacionais e opções arquitecturais gerados com apoio de IA foram alvo de análise crítica, validação rigorosa, testes de compilação e execução automatizada por parte dos elementos da equipa.*

---

## 5. Estrutura de Directórios do Repositório

```
LEI-SEM5-PI-2026-27-3DJ-05/
├── .github/                                # Infraestrutura de Integração Contínua (CI)
│   └── workflows/
│       └── ci.yml                          # Automatização de compilação e bateria de testes Jest
├── backend/                                # Contentor Modular de Retaguarda (NestJS / TypeScript)
│   ├── src/
│   │   ├── application/                    # Camada Aplicacional: Casos de uso, DTOs e contratos
│   │   │   ├── allergen/                   # Serviços do catálogo de alergénios[cite: 46]
│   │   │   ├── auth/                       # Gestão de identidades e serviços de autenticação[cite: 44]
│   │   │   ├── catalogue/                  # Gestão aplicacional de categorias de produtos[cite: 45]
│   │   │   ├── customer/                   # Casos de uso de registo e gestão de clientes[cite: 45]
│   │   │   ├── pizza/                      # Regras de tamanhos e tipos de componentes[cite: 47]
│   │   │   ├── product/                    # Gestão de produtos e serviços associados[cite: 46]
│   │   │   ├── stock/                      # Controlo e actualização de existências de inventário[cite: 48]
│   │   │   └── taxonomy/                   # Interfaces taxonómicas de componentes[cite: 47]
│   │   ├── domain/                         # Camada Nuclear do Domínio: Agregados e Invariantes
│   │   │   ├── allergen/                   # Agregado Allergen e Objecto de Valor AllergenCode[cite: 28]
│   │   │   ├── catalog/                    # Agregado ProductCategory e CategoryCode[cite: 28]
│   │   │   ├── common/                     # Kernel Partilhado: Designation, Money, Result, Entity[cite: 28]
│   │   │   ├── customer/                   # Agregado Customer e contactos[cite: 28]
│   │   │   ├── pizza/                      # Agregados PizzaSize, PizzaComponentType[cite: 28]
│   │   │   ├── product/                    # Agregado Product e código de negócio[cite: 28]
│   │   │   ├── stock/                      # Agregado StockItem e AbstractStockQuantity[cite: 28]
│   │   │   └── user/                       # Agregado User, Email, PasswordHash, UserRole[cite: 28]
│   │   ├── infrastructure/                 # Camada de Infraestrutura: Persistência e Segurança
│   │   │   ├── persistence/
│   │   │   │   ├── connection.ts           # Gestão do conjunto de ligações PostgreSQL (pg Pool)[cite: 36]
│   │   │   │   ├── mappers/                # Mapeadores relacionais bidireccionais[cite: 34]
│   │   │   │   ├── migrations/             # Ficheiros SQL de migração estrutural (001 a 013)[cite: 29, 34]
│   │   │   │   └── repositories/           # Repositórios PostgreSQL e em memória[cite: 30, 36]
│   │   │   └── security/                   # Cifra Argon2id e emissão de assinaturas JWT[cite: 36]
│   │   └── presentation/                   # Camada de Apresentação: Controladores REST
│   │       ├── http/
│   │       │   ├── controllers/            # Controladores HTTP NestJS (Auth, Product, etc.)[cite: 33, 35]
│   │       │   └── middlewares/            # Guardas RolesGuard, JwtAuthGuard e anotações[cite: 33, 36]
│   │       ├── app.module.ts               # Módulo integrador da raiz da aplicação[cite: 36]
│   │       └── global_exception.filter.ts  # Filtro global de tratamento e empacotamento de erros[cite: 33]
│   └── tests/                              # Conjunto de Testes Automatizados
│       ├── bruno/                          # Espaço de trabalho do cliente declarativo Bruno
│       │   └── LaPrizza/                   # Colecções de teste (BCK01 a BCK11) e ambientes
│       ├── integration/                    # Testes de integração de controladores com Supertest[cite: 36, 53]
│       └── unit/                           # Testes unitários puros de domínio e serviços[cite: 36, 53]
├── docs/                                   # Documentação Formal de Engenharia de Software
│   ├── api/                                # Especificação OpenAPI 3.0 formal (openapi.yaml)[cite: 33, 35]
│   ├── architectural/                      # Diagramas C4 (L1, L2, L3) e sínteses arquitecturais[cite: 22, 23, 24, 25]
│   ├── domain/                             # Modelo de Domínio PlantUML (domain-model.puml)[cite: 27, 28]
│   ├── sad/                                # Caderno de Arquitectura (SAD) e ADRs (001 a 007)[cite: 30, 35, 36]
│   └── user-stories/                       # Cadernos de requisitos e SSDs (BCK01 a BCK11)[cite: 44, 45, 46, 47, 48]
├── docker-compose.yml                      # Orquestração do contentor de base de dados PostgreSQL
└── README.md                               # Ponto de entrada e guia de consulta do repositório

```

---

## 6. Estado de Execução e Rastreabilidade do Sprint 1

| História de Utilizador | Designação e Âmbito Funcional | Elemento Responsável | Ficheiros de Implementação e Documentação | Estado de Verificação |
| --- | --- | --- | --- | --- |
| **BCK01** | Gestão de Utilizadores e Autenticação[cite: 44] | Eduardo Vasconcelos | `AuthService`, `Argon2Hasher`, `JwtTokenService`, `AuthController`[cite: 36] | Aprovado |
| **BCK02** | Gestão de Fichas de Clientes[cite: 45] | Eduardo Vasconcelos | Entidade `Customer`, contactos segregados, migrações de dados[cite: 28, 29] | Aprovado |
| **BCK03** | Categorias de Produtos[cite: 45] | Pedro Ribeiro | `ProductCategory`, `CategoryService`, `CategoryController`[cite: 28] | Aprovado |
| **BCK04** | Catálogo de Alergénios[cite: 46] | Pedro Ribeiro | `Allergen`, `AllergenCode`, `AllergenService`, `AllergenController`[cite: 28] | Aprovado |
| **BCK05** | Registo e Gestão de Produtos[cite: 46] | Pedro Ribeiro | `Product`, Objecto de Valor `Money`, `ProductService`, `ProductController`[cite: 28] | Aprovado |
| **BCK06** | Gestão de Tamanhos de Pizza[cite: 47] | Pedro Ribeiro | `PizzaSize`, `PizzaSizeId`, `PizzaSizeService`, `PizzaSizeController`[cite: 28] | Aprovado |
| **BCK07** | Tipos de Componentes de Pizza[cite: 47] | Eduardo Vasconcelos | `PizzaComponentType`, `AssemblyOrder`, limites de cardinalidade[cite: 28] | Aprovado |
| **BCK08** | Configuração de Componente por Tamanho[cite: 48] | Afonso Mota | Matriz de preços por tamanho e taxa de consumo de existências[cite: 28, 29] | Aprovado |
| **BCK09** | Gestão de Existências e Stock Abstrato[cite: 48] | Afonso Mota | `StockItem`, `AbstractStockQuantity`, invariante de não-negatividade[cite: 28, 29] | Aprovado |
| **BCK10** | Gestão de Pizzas Predefinidas[cite: 30] | Gustavo Silva | `PredefinedPizza`, linhas de receita, variantes de tamanho[cite: 28, 30] | Aprovado |
| **BCK11** | Catálogo e Informação de Produtos[cite: 30] | Gustavo Silva | Vistas públicas de menu (`v_catalogue_products`), filtros[cite: 29, 30] | Aprovado |
| **ARC01** | Modelação do Domínio Nuclear[cite: 50] | Grupo 5 (Colectivo) | `domain-model.puml`, 11 Agregados e Kernel Partilhado[cite: 27, 28] | Concluído |
| **ARC02** | Arquitectura Global (Modelo C4)[cite: 51] | Grupo 5 (Colectivo) | Diagramas Nível 1 (Contexto), Nível 2 (Contentores), Nível 3 (Componentes)[cite: 22, 23, 24, 25] | Concluído |
| **ARC03** | Especificação da Interface REST API[cite: 52] | Grupo 5 (Colectivo) | `docs/api/openapi.yaml`, contratos REST e códigos HTTP[cite: 33, 35] | Concluído |
| **ARC04** | Persistência e Integridade de Dados[cite: 52] | Grupo 5 (Colectivo) | Esquema PostgreSQL 001–013 com `ON DELETE RESTRICT`[cite: 29, 34] | Concluído |
| **ARC05** | Bateria de Testes Automatizados[cite: 53] | Grupo 5 (Colectivo) | 18 conjuntos de teste, 93 testes unitários e de integração (100% sucesso)[cite: 53] | Concluído |

---

## 7. Instruções de Configuração, Execução e Testes

### Pré-requisitos de Instalação

* **Node.js:** Versão LTS recomendada 20.x ou 22.x (juntamente com o gestor `npm` versão 10+)[cite: 36]
* **Docker e Docker Compose:** Para inicialização do contentor de base de dados relacional PostgreSQL 16
* **Aplicação Desktop Bruno:** (Opcional) Para consulta e execução visual dos testes declarativos da API

### 1. Clonagem do Repositório e Instalação de Dependências

```bash
git clone https://github.com/Department-of-Engineering-Informatics/LEI-SEM5-PI-2026-27-3DJ-05.git
cd LEI-SEM5-PI-2026-27-3DJ-05/backend
npm install

```

### 2. Inicialização da Base de Dados Relacional (Docker)

A partir da raiz do projecto, inicialize o contentor de PostgreSQL 16 em segundo plano:

```bash
# Executar a partir da raiz do repositório
docker-compose up -d

```

O contentor ficará operacional no porto `5432`, aplicando automaticamente as migrações sequenciais `001` a `013` para carregar a estrutura física de tabelas e dados iniciais de arranque[cite: 29, 34].

### 3. Execução da Aplicação de Retaguarda

```bash
# Dentro do directório backend/
npm run dev
# O servidor iniciará a escuta de pedidos em http://localhost:3000

```

### 4. Execução das Baterias de Testes Automatizados (Jest)

```bash
# Executa os testes unitários e testes de integração com relatório de cobertura
npm test -- --coverage

```

### 5. Execução dos Testes Funcionais no Cliente Bruno

1. Abra a aplicação de computador do **Bruno**.
2. Clique na opção **Open Collection** e seleccione a pasta `backend/tests/bruno/LaPrizza`.
3. No canto superior direito da janela, seleccione o ambiente **`Local`** (`baseUrl: http://localhost:3000`).
4. Execute sequencialmente os testes presentes nas pastas (`BCK01` até `BCK11`) e verifique a aprovação de todas as asserções a verde.


## Session revocation (2026-11-04)

Logout now calls `POST /auth/logout` with the current bearer JWT and waits for server confirmation. PostgreSQL stores per-login sessions, and every protected request checks the JWT's `sid`. Copied credentials stop working after logout completes; other independent logins remain active. Existing tokens without `sid` require a new login after deployment. Browser token storage remains unchanged; a future HttpOnly-cookie migration must retain these server checks.

Before starting the updated backend, run from the repository root:

```bash
npm --prefix backend run migration:run
```

Production `npm start` runs compiled migrations through `prestart`; build first. Do not reset the database volume. For a legacy database without TypeORM history, use `migration:baseline` to validate and record the initial schema, then run forward migrations normally. Baseline adoption rejects incompatible schemas, including unmodeled Sprint 2 SQL changes; review those separately.

Verification commands:

```bash
npm --prefix backend run build
npm --prefix backend run lint
npm --prefix backend test
# Set TEST_DATABASE_URL to a disposable/local PostgreSQL database to include real database tests.
# Those tests create and remove isolated schemas, without reusing application tables.
npm --prefix frontend run build
npm --prefix frontend test
```

See [ADR-004.2](docs/sad/03-rationale/ADR-004.2-auth.md) for the session lifecycle and [OpenAPI](docs/api/openapi.yaml) for the logout contract.


## Unauthorized endpoint attempt logging

Authenticated requests rejected with `403` now create a row in `unauthorized_attempts` with the validated username, database timestamp, and HTTP method/route pattern. Anonymous or invalid-token requests (`401`) and successful requests are excluded. Query strings, concrete path parameters, headers, and bodies are not stored. Historical rows remain after account deletion with a null user reference.

Apply pending migrations with `npm --prefix backend run migration:run` before starting the updated backend. SQL-based initialization also has `016_create_unauthorized_attempts_table.sql`. Audit storage failures keep the request forbidden and emit a generic server diagnostic. See [ADR-015](docs/sad/03-rationale/ADR-015-unauthorized-access-logging.md) and the [database documentation](docs/sad/08-database-structure.md).


## Email password recovery

Both customer and staff login pages now offer **Forgot your password?**. Enter a registered ACTIVE account's email, paste the emailed code, and choose/confirm a new password. Codes expire five minutes after generation, work once, and cannot be requested again until 30 minutes after the previous generation. A successful reset signs out the recovered account's existing sessions; sign in with the new password.

Configure these values in the ignored `backend/.env` (the example contains no password):

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=laprizzag05@gmail.com
SMTP_PASSWORD=
```

Set `SMTP_PASSWORD` locally to the sender's SMTP credential. The fixed sender is `laprizzag05@gmail.com`; the SMTP account must be authorized to send as that address. Port 587 requires STARTTLS; port 465 uses implicit TLS. Docker Compose reads the optional backend environment file; never copy it into an image or commit credentials. Missing configuration produces an explanatory `503` for recovery requests, while unrelated endpoints remain available.

Apply the new table with `npm --prefix backend run migration:run`, then rebuild/restart the application. SQL-based initialization can use `018_create_password_recovery_table.sql`. Public API bodies are `{email}` for `POST /password-recovery` and `{recovery_code, new_password}` for `POST /password-recovery/new_pass`. No code/password is returned in the API response.

See [ADR-016](docs/sad/03-rationale/ADR-016-password-recovery.md), [database documentation](docs/sad/08-database-structure.md), and [Bruno test instructions](backend/tests/bruno/LaPrizza/Password%20Recovery/README.md). Bruno has five requests per endpoint; reset cases need codes from the test inbox. Automated SMTP tests use a local capture server, not the Gmail inbox.


## User invitations

ACTIVE administrators and managers can use **Backoffice → Users → Invite team member** to submit an email and role. The form calls `POST /auth/invite` with `{email, roleName}`. Supported roles are ADMINISTRATOR, MANAGER, EMPLOYEE, and CUSTOMER. A pending invitation can be sent again to replace its role and resend instructions; ACTIVE and DEACTIVATED email addresses return `409`.

Invitations reuse the existing PENDING_REGISTRATION account, so no database migration or new table is needed. The recipient uses the normal Register button with that email and supplies their own name/password. The latest invited role is retained. Email uses the existing `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASSWORD`, with sender `laprizzag05@gmail.com`. A `503` means email submission failed or is not configured; the invitation remains saved so it can be retried. SMTP acceptance does not guarantee inbox delivery. Managers can view and filter Users and send invitations; the full management controls remain available to administrators. Legacy `/auth/pre_register` behavior is retained.

See [ADR-017](docs/sad/03-rationale/ADR-017-user-invitations.md) and the [Bruno invitation collection](backend/tests/bruno/LaPrizza/User%20Invitations/README.md).


### Manage an existing user

Administrators can select **Manage** on any Users row to add, remove, or replace roles and separately deactivate the account after confirmation. At least one role is required. Administrators retain their own Administrator role and cannot deactivate themselves from this dialog. Deactivated accounts must be reactivated before roles can be changed; their role controls are disabled. The account button switches to **Reactivate account**, which calls administrator-only `POST /user/:username/reactivate` and requires confirmation. Saving roles calls `PUT /user/:username/roles` with the complete `{roles: ["MANAGER", "EMPLOYEE"]}` list. Existing deactivation uses `DELETE /user/:username`. Managers can view, filter, and paginate the user list and invite users; role changes, deactivation, and reactivation remain administrator-only. Role changes apply to existing sessions on their next protected request. No schema migration is required.


### Role assignment history

`UserService.setRoles` now calls `RolesAssignmentService` immediately after saving the user's roles. The `roles_assignment` SQL/ORM table appends one row for each distinct role in the resulting selection: `assigned_from` (authenticated administrator username FK), `role`, `assigned_to` (recipient email snapshot), and `timestamp`. A separate `id` PK permits repeated assignments by the same administrator. Existing membership remains in `user_role_assignments`; no domain class is added. This hook applies to the Users role-update endpoint; registration/invitations are unchanged.

Apply `npm --prefix backend run migration:run` before starting the updated backend. SQL-based setup can apply `backend/src/infrastructure/persistence/migrations/019_create_roles_assignment_table.sql`. Existing records are not backfilled. History failure is reported to the caller, but because it runs after the repository save, the role update has already committed. See the [database documentation](docs/sad/08-database-structure.md).


### Account status history

`status_assignment` follows the `roles_assignment` SQL/ORM pattern, replacing `role` with `status`: each row stores `assigned_from` (actor username FK, cleared on hard deletion), `status` (ACTIVE, DEACTIVATED, PENDING_REGISTRATION), `assigned_to` (email snapshot), `timestamp`, and a separate `id` PK. `StatusAssignmentService` records account creation, completion of pending registration, reactivation, and deactivation immediately after successful account persistence. Controllers pass the authenticated actor; public self-registration records the new user's own username. Invitation resends and repeated deactivation do not add events because the status is unchanged. No domain class is added.

Run `npm --prefix backend run migration:run` before starting the backend. SQL setup can use `020_create_status_assignment_table.sql`. Existing accounts/seed data are not backfilled. History writes follow the account save in a separate transaction: a history failure returns an error while the account change remains committed.


See [Control and log tables](CONTROL_AND_LOG_TABLES.md) for the SQL tables, ORM classes, fields, recording triggers, and retention behavior of authentication control and audit records.

# Operational Context & Business Environment: LaPrizza

## 1. Simulated Business Context & Procurement Simulation
Within the academic framework of the 5th-semester Integrative Project at the Instituto Superior de Engenharia do Porto (ISEP), this document establishes the operational context for **LaPrizza**, a modern restaurant enterprise seeking a specialized technological partner[cite: 624]. Student development teams simulate independent Information Technology (IT) software engineering companies participating in a formal competitive Request for Proposal (RFP) procurement process[cite: 624].

The project objective is to design, architect, and deliver an incremental software prototype over a 14-week lifecycle structured across three progressive development sprints[cite: 624]. This software deliverable serves as an integrated proof of concept, demonstrating technical feasibility, architectural soundness, maintainability, and professional compliance with both the functional and non-functional requirements specified by LaPrizza[cite: 624, 625].

---

## 2. Real-World Sector Benchmark & Business Alignment
To ensure the proposed software architecture and operational model mirror genuine industry practices rather than abstract academic simplifications, the engineering team has analyzed active commercial enterprises operating within the restaurant and food-service sector[cite: 625].

### Benchmark Enterprise Profile
- **Sector Focus:** Fast-casual and casual dining restaurant management specializing in customizable, on-demand food preparation and multi-channel order fulfillment[cite: 625, 626].
- **Operational Observations & Domain Realities:**
  - **Supply Chain & Inventory Coupling:** Ingredient availability directly dictates menu offerings and order intake capacity[cite: 625]. Real-world food service operations manage inventory as discrete portions or units linked to standardized preparation yields rather than variable, continuous physical measures[cite: 629].
  - **Customization Complexity:** High degrees of product customization—encompassing additions, substitutions, exclusions, or assemblies initiated from scratch—demand strict domain constraints to prevent inconsistent combinations, pricing inaccuracies, or execution delays[cite: 625, 628].
  - **Food Safety & Regulatory Compliance:** Food allergens represent a critical operational liability[cite: 626]. Systems must track ingredient-level allergens and provide explicit exclusion mechanisms for customer dietary restrictions, such as gluten, lactose, tree nuts, or animal products[cite: 626, 627].
  - **Kitchen Workflow & Resource Contention:** Kitchen throughput is heavily bounded by sequential workstations (e.g., assembly tables followed by baking ovens) with finite physical and thermal capacities, requiring coordinated scheduling to optimize overall turnaround[cite: 630, 631].

---

## 3. Stakeholder Ecosystem & User Personas
The LaPrizza information system serves multiple operational actors whose privileges are governed by role-based access control policies (`BCK01`)[cite: 648]:

- **Customers:** End-users interacting through the public Web Application or on-premise self-service kiosks[cite: 671]. Registered customers maintain personal profiles with verified contact details (mandatory phone number and email), multiple delivery addresses, consent preferences, and recorded food intolerances or dietary restrictions (`BCK02`)[cite: 649, 663]. Self-service kiosk customers interact anonymously without creating persistent customer records. Customers can browse public product catalogues, configure personalized pizzas (starting from scratch or modifying a predefined recipe), simulate order contents and costs, and submit confirmed orders[cite: 663, 665, 667].
- **Restaurant Managers (`MANAGER` role):** Administrative and management staff responsible for operational governance (`BCK01`–`BCK10`)[cite: 648, 649, 650, 651, 652, 653, 654]. Managers maintain product categories, define recognized food allergens, configure user accounts and security roles, manage catalogue items and multi-role product definitions, establish pizza sizes and component types with cardinality constraints, calibrate size-dependent pricing and inventory consumption rates, manage predefined recipes, and monitor stock levels[cite: 648, 649, 650, 651, 652, 653, 654]. System user and role administration is handled directly by the Manager without requiring a distinct Administrator profile.
- **Restaurant Employees (`EMPLOYEE` role):** Kitchen staff and floor operators who inspect pending orders, update item-level fulfillment states, execute sequential preparation activities, and coordinate baking throughput across limited thermal resources (ovens)[cite: 667, 668].
- **System & Technical Integrators:** Automated modules—such as the interactive Three.js 3D visualization canvas (`SGRAI`), the Prolog-based Artificial Intelligence preparation scheduling engine (`IART`), and automated administrative infrastructure tools (`ASIST`)—that consume and exchange data through standardized REST API contracts[cite: 671, 672, 673, 674].

---

## 4. Operational Objectives & Quality Drivers
The LaPrizza system is engineered to satisfy strict non-functional requirements (NFRs) that govern long-term system maintainability and scalability[cite: 625]:

- **Maintainability & Modularity:** The back-end codebase enforces Clean Architecture and modular monolithic boundaries, ensuring that changes to business rules, database schemas, or delivery endpoints do not induce cascading failures across unrelated modules[cite: 235, 237, 285].
- **Testability:** Domain invariants, entities, and application use cases must remain fully testable in isolation from external databases, web runtime frameworks, and network sockets[cite: 236, 383].
- **Data Integrity & Consistency:** Relational invariants—such as blocking the deletion of referenced catalogue items, enforcing mandatory product classifications, and preventing negative stock balances—must be enforced at both the domain model and database schema levels (`ARC04`, `BCK02`–`BCK09`)[cite: 649, 650, 651, 652, 653, 656].
- **Interoperability & Decoupling:** All front-end interfaces, 3D interaction canvases, and AI scheduling components integrate exclusively through versioned, stateless REST APIs documented using the OpenAPI 3.0 standard (`ARC03`)[cite: 656, 671, 672, 673].

---

## 5. Comparative Log: Initial vs. Current Information

### Section: 3. Stakeholder Ecosystem & User Personas
* **Initial Information:**
  > "- Customers: End-users who register accounts...  
  > - Restaurant Managers / Administrators: Internal staff responsible for administrative governance...  
  > - Kitchen Staff: Operational operators who monitor incoming orders..."[cite: 682]
* **Current Information (Corrected):**
  > "- Customers: End-users interacting via the web application or on-site kiosks. Registered customers maintain mandatory phone and email... Kiosk customers interact anonymously without persistent customer records...  
  > - Restaurant Managers (`MANAGER` role): Internal staff responsible for administrative governance and user/role management (no separate Administrator role required)...  
  > - Restaurant Employees (`EMPLOYEE` role): Operational operators and kitchen staff who monitor incoming orders..."
* **Justification:**
  Aligned with official client and product owner clarifications:
  1. The official role taxonomy for Sprint 1 consists specifically of `MANAGER`, `EMPLOYEE`, and `CUSTOMER`, avoiding unapproved roles such as a standalone "Kitchen Staff" or a separate "Administrator" profile.
  2. Kiosk customers are defined as anonymous actors who do not generate persistent customer entities in the database.
  3. Mandatory customer attributes are strictly defined as Name, Phone Number, and Email Address.
# ENG01 - As a Project Manager, I want the team to set up the tools and infrastructure required to develop and manage the project.

## 1. Requirements Engineering

### 1.1. User Story Description
As a Project Manager, I want the team to set up the tools and infrastructure required to develop and manage the project, so that the team can work collaboratively and follow appropriate software-engineering practices.

### 1.2. Customer Specifications and Clarifications

#### From the specification document
> No question-and-answer style clarifications were recorded for this User Story. The requirements below are extracted directly from the acceptance criteria defined in *PART III – Sprint 1 – User Stories*.

### 1.3. Acceptance Criteria

- AC1: GitHub must be used as the Version Control System (VCS).
- AC2: The project repository must be created inside the appropriate DEI organization on GitHub.
- AC3: The repository name must follow the pattern `LEI-SEM5-PI-2026-27-XXX-YY`, where `XXX` is the team class (e.g., 3DC) and `YY` is the team number (e.g., 04).
- AC4: The repository structure must be suitable for accommodating the different applications, modules, technologies, and documentation that will be developed throughout the semester.
- AC5: An appropriate branching and integration strategy must be defined, documented, and consistently followed by the team.
- AC6: Issue/task tracking and a project board must be adopted to support planning and monitoring of the team's work.
- AC7: The repository must contain the information required for a new developer to understand the project structure and prepare an appropriate development environment.
- AC8: Relevant project decisions, documentation, and evidence must be maintained under version control whenever appropriate.
- AC9: At the end of each sprint, the repository must be tagged to identify the exact version of the project submitted for assessment, following the naming convention `sprint-N-submission`. Once created, the tag must not be deleted, recreated, or moved to a different commit.
- AC10: The repository archive (`.zip`) corresponding to the sprint submission tag must be downloaded from the associated GitHub tag page and submitted through the corresponding sprint submission activity on Moodle.
- AC11: The submitted archive and the repository tag must identify the same version of the project. Changes committed after the Sprint 1 submission tag was created are not considered part of the submitted Sprint 1 deliverable.

### 1.4. Found out Dependencies
No dependencies. This is a foundational User Story that all other User Stories in the project depend on (repository, branching strategy, and project board must exist before development work can be tracked or delivered).

### 1.5 Input and Output Data
Inputs:
- Team class and team number (used to compose the repository name)
- Branching/integration strategy decisions (team-defined)
- Documentation and evidence produced throughout the sprint

Outputs:
- A configured GitHub repository under the DEI organization
- A documented branching strategy
- An active issue/task tracking board
- A `sprint-1-submission` tag and corresponding `.zip` archive

### 1.6. System Sequence Diagram (SSD)

Not applicable.

### 1.7 Other Relevant Remarks

This User Story belongs to the **ENG — Project Setup and Engineering Practices** group. Although introduced in Sprint 1, these practices are expected to be consistently followed and maintained throughout subsequent development iterations.

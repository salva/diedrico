---

description: "Task list template for feature implementation"
---

# Tasks: [FEATURE NAME]

**Input**: Design documents from `/specs/[###-feature-name]/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The examples below include test tasks. Per Diedrico Constitution (Principle VII: Pragmatic Testing), tests are expected where they add clear value (complex domain logic, commands/operations, and critical user journeys). Tests may be written before or after implementation depending on what is most effective.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Constitution Compliance**: All tasks MUST respect:
- Layered Architecture (Principle I) - No cross-layer violations
- Command Pattern (Principle II) - User actions as commands
- Frontend-First (Principle III) - Separation of concerns
- Technology Discipline (Principle IV) - Approved tech stack only

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- **Web app** (DIEDRICO DEFAULT): `backend/src/`, `frontend/src/`
- **Mobile**: `api/src/`, `ios/src/` or `android/src/`
- Paths shown below assume web app structure - adjust based on plan.md structure

<!-- 
  ============================================================================
  IMPORTANT: The tasks below are SAMPLE TASKS for illustration purposes only.
  
  The /speckit.tasks command MUST replace these with actual tasks based on:
  - User stories from spec.md (with their priorities P1, P2, P3...)
  - Feature requirements from plan.md
  - Entities from data-model.md
  - Endpoints from contracts/
  
  Tasks MUST be organized by user story so each story can be:
  - Implemented independently
  - Tested independently
  - Delivered as an MVP increment
  
  DO NOT keep these sample tasks in the generated tasks.md file.
  ============================================================================
-->

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Create project structure per implementation plan
- [ ] T002 Initialize [language] project with [framework] dependencies
- [ ] T003 [P] Configure linting and formatting tools

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

Examples of foundational tasks (adjust based on your project):

- [ ] T004 Setup frontend/backend folder structure per constitution architecture constraints
- [ ] T005 [P] Configure TypeScript for frontend and backend (Principle IV: Technology Discipline)
- [ ] T006 [P] Setup Vue.js 3 with Vite in frontend/ (Principle IV)
- [ ] T007 [P] Setup Node.js with Express/Fastify in backend/ (Principle IV)
- [ ] T008 [P] Create base Command interface/class (Principle II: Command Pattern)
- [ ] T009 Configure error handling and logging infrastructure
- [ ] T010 Setup API routing structure in backend/src/routes/
- [ ] T011 Setup Vitest for unit testing (frontend and backend)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - [Title] (Priority: P1) 🎯 MVP

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 1 (Per Constitution Principle V: TDD) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T012 [P] [US1] Unit test for [Command] in frontend/tests/unit/commands/test_[name].spec.ts
- [ ] T013 [P] [US1] Integration test for [API endpoint] in backend/tests/integration/test_[name].spec.ts
- [ ] T014 [P] [US1] E2E test for [user journey] in frontend/tests/e2e/[name].spec.ts

### Implementation for User Story 1

**Frontend Tasks** (Presentation & Application Layers):

- [ ] T015 [P] [US1] Create [Entity] model interface in frontend/src/models/[entity].ts (Domain Layer)
- [ ] T016 [P] [US1] Create [Command] class in frontend/src/commands/[command].ts (Application Layer - Principle II)
- [ ] T017 [US1] Create [Component] in frontend/src/components/[component].vue (Presentation Layer)
- [ ] T018 [US1] Create API service client in frontend/src/services/[service].ts
- [ ] T019 [US1] Wire command to component and test undo/redo functionality

**Backend Tasks** (Data Layer):

- [ ] T020 [P] [US1] Create [Entity] schema in backend/src/models/[entity].ts
- [ ] T021 [P] [US1] Create [Command] handler in backend/src/commands/[command].ts (Principle II)
- [ ] T022 [US1] Implement storage service in backend/src/storage/[entity]-storage.ts
- [ ] T023 [US1] Create API route in backend/src/routes/[resource].ts
- [ ] T024 [US1] Add validation and error handling
- [ ] T025 [US1] Verify layered architecture compliance (no cross-layer violations)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - [Title] (Priority: P2)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 2 (Per Constitution Principle V: TDD) ⚠️

- [ ] T026 [P] [US2] Unit test for [Command] in frontend/tests/unit/commands/test_[name].spec.ts
- [ ] T027 [P] [US2] Integration test for [API endpoint] in backend/tests/integration/test_[name].spec.ts

### Implementation for User Story 2

- [ ] T028 [P] [US2] Create [Entity] model in frontend/src/models/[entity].ts
- [ ] T029 [P] [US2] Create [Command] in frontend/src/commands/[command].ts (Principle II)
- [ ] T030 [US2] Create [Component] in frontend/src/components/[component].vue
- [ ] T031 [US2] Implement backend storage and API route
- [ ] T032 [US2] Integrate with User Story 1 components (if needed)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - [Title] (Priority: P3)

**Goal**: [Brief description of what this story delivers]

**Independent Test**: [How to verify this story works on its own]

### Tests for User Story 3 (Per Constitution Principle V: TDD) ⚠️

- [ ] T033 [P] [US3] Unit test for [Command] in frontend/tests/unit/commands/test_[name].spec.ts
- [ ] T034 [P] [US3] Integration test for [API endpoint] in backend/tests/integration/test_[name].spec.ts

### Implementation for User Story 3

- [ ] T035 [P] [US3] Create [Entity] model in frontend/src/models/[entity].ts
- [ ] T036 [P] [US3] Create [Command] in frontend/src/commands/[command].ts (Principle II)
- [ ] T037 [US3] Create [Component] in frontend/src/components/[component].vue
- [ ] T038 [US3] Implement backend storage and API route

**Checkpoint**: All user stories should now be independently functional

---

[Add more user story phases as needed, following the same pattern]

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] TXXX [P] Documentation updates in docs/
- [ ] TXXX Code cleanup and refactoring
- [ ] TXXX Performance optimization across all stories
- [ ] TXXX [P] Additional unit tests (if requested) in tests/unit/
- [ ] TXXX Security hardening
- [ ] TXXX Run quickstart.md validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - May integrate with US1 but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - May integrate with US1/US2 but should be independently testable

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before endpoints
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel
- All Foundational tasks marked [P] can run in parallel (within Phase 2)
- Once Foundational phase completes, all user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together (if tests requested):
Task: "Contract test for [endpoint] in tests/contract/test_[name].py"
Task: "Integration test for [user journey] in tests/integration/test_[name].py"

# Launch all models for User Story 1 together:
Task: "Create [Entity1] model in src/models/[entity1].py"
Task: "Create [Entity2] model in src/models/[entity2].py"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence

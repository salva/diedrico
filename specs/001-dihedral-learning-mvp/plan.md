# Implementation Plan: Diedrico Dihedral Learning MVP

**Branch**: `001-dihedral-learning-mvp` | **Date**: 2025-12-22 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-dihedral-learning-mvp/spec.md`

**Note**: This plan follows the Speckit framework workflow.

## Summary

Build an educational web application for teaching dihedral/orthographic projection. The MVP enables students to learn by constructing geometric projections step-by-step in an interactive 2D workspace with auxiliary 3D visualization. The system emphasizes pedagogical transparency: all operations are explicit, construction history is visible, and dependencies are traceable. Students create 2D elements on projection planes, use guides for inter-plane transport, and derive 3D elements from compatible 2D projections. The application surfaces constraint violations (infeasibility) rather than auto-fixing them, ensuring students understand geometric reasoning.

## Technical Context

**Language/Version**: 
- Frontend: JavaScript/TypeScript (ES2020+)
- Backend: Node.js 18+ with TypeScript

**Primary Dependencies**: 
- Frontend: Vue.js 3.x (Composition API), Pinia (state management)
- Backend: Express or Fastify (NEEDS CLARIFICATION: which to prefer)
- Graphics: NEEDS CLARIFICATION (SVG manipulation, Canvas API, or Three.js for 3D)
- Geometry: NEEDS CLARIFICATION (computation library for intersections, perpendiculars, etc.)

**Storage**: 
- JSON files or SQLite for project persistence (NEEDS CLARIFICATION: file format, schema versioning)
- Backend serves as persistence API

**Testing**: 
- Vitest for unit tests (domain logic, commands, geometry calculations)
- Playwright for E2E tests (critical user journeys)

**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge; last 2 versions)

**Project Type**: Web application (frontend + backend)

**Performance Goals**: 
- 2D navigation (pan/zoom): <200ms feedback for workspaces with 200 elements (FR-SC-002)
- Hover highlighting: <200ms response time (FR-SC-002)
- Parametric recomputation: <500ms for typical dependency chains
- 3D rendering: 30+ fps for read-only 3D view

**Constraints**: 
- No modal error dialogs (FR-024)
- Educational transparency: all operations traceable (Principle VII)
- Layered architecture with command pattern (Principles I, II)
- Frontend-first: business logic in frontend, backend for persistence only (Principle III)

**Scale/Scope**: 
- MVP: 2 projection planes (Horizontal, Vertical), 1 hinge line
- Target exercises: ~50-200 2D elements per project
- 5 tool families: Point, Segment/Line/Circle, Dihedral tools, 3D creation, Transport
- ~38 functional requirements, 23 use cases

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Layered Architecture**: Yes. Frontend (Vue components) → Application (command handlers) → Domain (geometry models, dependency graph) → Data (persistence abstraction). Backend keeps separate API → Commands → Storage layers.
- [x] **Command Pattern**: Yes. All user actions (create point, create segment, create guide, transport, etc.) will be commands with execute/undo/validate. Command history drives the Constructive Actions Panel.
- [x] **Frontend-First**: Yes. All geometric reasoning, dependency computation, and UI logic in frontend. Backend serves only as REST API for project CRUD operations.
- [x] **Technology Discipline**: Yes. Vue.js 3 + TypeScript, Node.js backend, Vite bundler, Vitest + Playwright testing per constitution.
- [x] **Pragmatic Testing**: Yes. Unit tests for complex domain logic (geometry calculations, dependency graph, infeasibility detection). E2E tests for critical paths (SC-001 basic exercise flow). Simple CRUD endpoints may skip tests.
- [x] **English-Only**: Yes. All code, docs, UI per constitution requirement.
- [x] **Pedagogical Transparency**: Yes. This is the core feature principle. All operations explicit, auxiliary actions recorded, dependency graph visible, infeasibility surfaced.

**Notes**: No violations. This feature is the foundational MVP that establishes the constitutional architecture.

## Project Structure

### Documentation (this feature)

```text
specs/001-dihedral-learning-mvp/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file (in progress)
├── research.md          # Phase 0 output (to be created)
├── data-model.md        # Phase 1 output (to be created)
├── quickstart.md        # Phase 1 output (to be created)
└── contracts/           # Phase 1 output (to be created)
    └── api.yaml         # OpenAPI spec for backend
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/              # Express/Fastify routes
│   │   ├── projects.ts   # GET /projects, POST /projects, GET /projects/:id, PUT /projects/:id
│   │   └── health.ts     # GET /health
│   ├── storage/          # Storage abstraction (JSON files or SQLite)
│   │   ├── ProjectRepository.ts
│   │   └── FileStorage.ts or SqliteStorage.ts
│   ├── models/           # Data transfer objects (DTOs)
│   └── server.ts         # Entry point
├── tests/
│   └── integration/      # API endpoint tests
└── package.json

frontend/
├── src/
│   ├── components/       # Vue components (Presentation Layer)
│   │   ├── workspace/    # 2D drawing area, 3D overlay
│   │   │   ├── Workspace2D.vue
│   │   │   ├── Workspace3D.vue
│   │   │   └── ElementRenderer.vue
│   │   ├── panels/       # Actions panel, Elements panel
│   │   │   ├── ActionsPanel.vue
│   │   │   ├── ElementsPanel.vue
│   │   │   └── ProcessTreePanel.vue
│   │   ├── toolbars/     # Top toolbars
│   │   │   ├── MainToolbar.vue
│   │   │   └── PlaneSelector.vue
│   │   └── dialogs/      # Element properties dialog
│   │       └── ElementPropertiesDialog.vue
│   │
│   ├── commands/         # Command pattern with incremental execution
│   │   ├── Command.ts              # Command class with addAndExecute(), commit(), rollback()
│   │   ├── CommandStack.ts         # History management, undo/redo
│   │   ├── OperationResult.ts      # Result interface for operation chaining
│   │   │
│   │   └── operations/             # Operation implementations (low-level mutations)
│   │       # Note: Operations are mutation primitives, distinct from ProcessTree Actions
│   │       # - Operations: Incremental mutations within a Command (AddElementOp, UpdateElementOp)
│   │       # - Actions: ProcessTree nodes that record construction history (ConstructiveAction)
│   │       ├── WorldOperations.ts         # AddElement, RemoveElement, UpdateElement
│   │       ├── ProcessTreeOperations.ts   # AddSubprocess, AddActionGroup, AddAction
│   │       ├── ViewStateOperations.ts     # SetActivePlane, UpdateView2D
│   │       └── DependencyOperations.ts    # AddDependencyEdges, RemoveDependencyEdges
│   │
│   ├── domain/           # Core domain models (Domain Layer)
│   │   ├── world/        # Geometric elements
│   │   │   ├── Element2D.ts        # Point2D, Segment2D, Line2D, Circle2D, Arc2D
│   │   │   ├── Element3D.ts        # Point3D, Line3D, Segment3D, Plane3D
│   │   │   ├── VisualStyle.ts      # Color, lineWidth, lineStyle, visibility
│   │   │   └── DependencyGraph.ts  # DAG, add/remove edges, traversal
│   │   │
│   │   ├── processTree/  # Construction history
│   │   │   ├── Process.ts          # Root node
│   │   │   ├── Subprocess.ts       # Container for ActionGroups
│   │   │   ├── ActionGroup.ts      # Visual grouping (no name)
│   │   │   └── Action.ts           # ConstructiveAction, DerivedAction
│   │   │
│   │   ├── viewState/    # Workspace state
│   │   │   ├── ProjectionPlane.ts  # P_H, P_V with coordinate systems
│   │   │   ├── HingeLine.ts        # HL_HV reference element
│   │   │   ├── View2DState.ts      # Pan, zoom per plane
│   │   │   └── View3DState.ts      # Camera position, orientation
│   │   │
│   │   └── calculations/ # Pure geometric functions
│   │       ├── intersections.ts    # Line-line, line-circle, etc.
│   │       ├── perpendiculars.ts   # Perpendicular construction
│   │       ├── distances.ts        # Point-line, point-point distance
│   │       └── transforms.ts       # Coordinate transformations
│   │
│   ├── services/         # Application services (Application Layer)
│   │   ├── GeometryService.ts      # Wraps calculations, caching
│   │   ├── DependencyService.ts    # Recomputation, topological sort
│   │   ├── ValidationService.ts    # Infeasibility checks (FR-011, FR-012)
│   │   ├── ProjectService.ts       # Backend communication, serialization
│   │   └── ToolService.ts          # Tool state management, input validation
│   │
│   ├── stores/           # Pinia stores (State Management)
│   │   ├── worldStore.ts       # Elements (2D/3D), dependency graph
│   │   ├── processStore.ts     # ProcessTree, command history
│   │   ├── viewStore.ts        # Active plane, view state, visibility toggles
│   │   └── toolStore.ts        # Active tool, tool state
│   │
│   ├── composables/      # Vue composables (shared logic)
│   │   ├── useSnapping.ts          # Point snapping (FR-038)
│   │   ├── useHoverHighlight.ts    # Dependency highlighting (FR-036)
│   │   ├── useToolFeedback.ts      # Visual feedback during tool use
│   │   └── useCommandExecution.ts  # Command building and commit
│   │
│   ├── types/            # TypeScript type definitions
│   │   ├── ElementTypes.ts     # Union types, discriminated unions
│   │   ├── CommandTypes.ts     # CommandStatus, OperationTypes
│   │   └── ResultTypes.ts      # Result<T, E> for error handling
│   │
│   ├── utils/            # Pure utility functions
│   │   ├── idGenerator.ts
│   │   ├── colorUtils.ts
│   │   └── mathUtils.ts
│   │
│   └── main.ts           # Entry point
│
├── tests/
│   ├── unit/             # Domain logic, operations, calculations
│   │   ├── calculations.spec.ts
│   │   ├── dependencyGraph.spec.ts
│   │   ├── operations.spec.ts
│   │   └── commands.spec.ts
│   └── e2e/              # Playwright tests (SC-001 basic exercise)
│       ├── basic-exercise.spec.ts
│       ├── infeasibility.spec.ts
│       └── persistence.spec.ts
└── package.json

shared/ (optional, if types shared between frontend/backend)
└── types/
    └── Project.ts        # Shared project data structure
```

**Structure Decision**: 
- **Frontend-first architecture**: All business logic in frontend (domain + application layers)
- **Command Pattern**: Incremental execution model - operations execute immediately as added to command
- **Three-tier domain**: World (geometric elements), ProcessTree (construction history), ViewState (workspace state)
- **Operation categories**: WorldOperations, ProcessTreeOperations, ViewStateOperations for different mutation types
- **Backend**: Minimal persistence API only (no business logic)
- **Clear separation**: Commands orchestrate operations, operations mutate state, stores provide reactive access

## Complexity Tracking

> No constitutional violations. This section intentionally left empty.

---

## MVP Phasing Strategy

### Philosophy

The MVP is built in **incremental phases**, each delivering a testable, working slice of functionality. Each phase builds on the previous, allowing for early validation and course correction. The strategy prioritizes:

1. **Core infrastructure first**: Establish architecture patterns before feature work
2. **Geometry before UI polish**: Ensure calculations correct before visual refinement
3. **2D before 3D**: Master primary workspace before auxiliary overlay
4. **Basic tools before advanced**: Point/segment before constrained constructions
5. **Working software over completeness**: Each phase ends with runnable, testable system

### Phase Breakdown

#### Phase 0: Project Setup & Infrastructure (Week 1)

**Goal**: Establish development environment, CI/CD, and architectural skeleton

**Deliverables**:
- Repository structure (`frontend/`, `backend/`, `specs/`)
- Package configurations (`package.json`, `tsconfig.json`, `vite.config.ts`)
- Backend: Express server, health endpoint, file storage stub
- Frontend: Vue app shell, Pinia stores (empty), router (if needed)
- Development scripts: `npm run dev`, `npm test`
- First tests: Simple smoke tests (app loads, backend responds)

**Acceptance**:
- [ ] `npm run dev` starts both frontend and backend
- [ ] Frontend renders empty workspace
- [ ] Backend `/api/health` returns 200
- [ ] Basic unit test passes (e.g., `1 + 1 === 2`)

---

#### Phase 1: Core Domain & Geometry (Week 2)

**Goal**: Implement domain models and geometry calculation library

**Deliverables**:
- **Domain models** (`frontend/src/domain/`):
  - `Point2D`, `Segment`, `Line`, `Circle` classes
  - `ProjectionPlane`, `HingeLine` classes
  - `Element2D` union types
- **Geometry calculations** (`frontend/src/domain/geometry/calculations.ts`):
  - Line-line intersection
  - Point-line perpendicular
  - Circle from 3 points
  - Distance, midpoint utilities
- **Unit tests** for all calculations with edge cases (parallel lines, coincident points, collinear points)

**Acceptance**:
- [ ] All geometry functions return `Result<T, InfeasibilityReason>` type
- [ ] Unit tests cover: normal cases, edge cases, infeasible inputs
- [ ] 100% test coverage for `calculations.ts`

---

#### Phase 2: Command Pattern & State Management (Week 2-3)

**Goal**: Establish command pattern foundation and Pinia stores

**Deliverables**:
- **Base command** (`frontend/src/commands/BaseCommand.ts`):
  - `ICommand` interface (`execute()`, `undo()`, `validate()`, `getInputs()`, `getOutputs()`)
- **First commands**:
  - `CreateFreePointCommand`
  - `CreateSegmentCommand`
- **Pinia stores**:
  - `elementsStore` (add/remove/get elements)
  - `actionsStore` (push/pop actions, history)
  - `workspaceStore` (active plane, view state)
- **Dependency graph** (basic):
  - Add/remove nodes and edges
  - Get ancestors/descendants

**Acceptance**:
- [ ] Can execute `CreateFreePointCommand` → point appears in `elementsStore`
- [ ] Can undo → point removed from store
- [ ] `CreateSegmentCommand` validates endpoints exist
- [ ] Dependency graph correctly records: segment depends on 2 points

---

#### Phase 3: 2D Workspace & Basic Tools (Week 3-4)

**Goal**: Render 2D workspace with ALL projection planes visible simultaneously, plus pan/zoom and basic tool interaction

**Deliverables**:
- **2D Workspace component** (`frontend/src/components/workspace/Workspace2D.vue`):
  - SVG canvas displaying ALL projection planes simultaneously in dihedral layout
  - All planes (P_H, P_V) visible at once with appropriate positioning
  - Active plane elements at full opacity, non-active planes at reduced opacity (e.g., 50%)
  - Hinge lines visible between planes
  - D3.js zoom/pan behavior (FR-005)
  - Render points as circles, segments as lines on their respective planes
- **Toolbar components**:
  - Tool selector buttons
  - Active plane selector (changes emphasis, not visibility)
  - Active tool state in `toolsStore`
- **Tool implementations**:
  - Free point tool: Click empty space → create point on active plane
  - Segment tool: Click two points → create segment on active plane
- **Visual feedback**:
  - Hover highlights valid inputs
  - Cursor changes for different tools

**Acceptance**:
- [ ] ALL projection planes visible simultaneously in dihedral layout
- [ ] Can switch active plane - changes opacity/emphasis, all planes remain visible
- [ ] Can pan (Shift+drag) and zoom (wheel) without tools canceling
- [ ] Can select "Point" tool, click canvas → point appears on active plane
- [ ] Can select "Segment" tool, click 2 points → segment appears on active plane
- [ ] Points and segments render correctly on their planes at all zoom levels
- [ ] Elements on non-active planes visible but de-emphasized
- [ ] SC-002: Navigation feedback <200ms for 50 elements

---

#### Phase 4: Actions & Elements Panels (Week 4)

**Goal**: Display construction history and element list

**Deliverables**:
- **Actions Panel** (`frontend/src/components/panels/ActionsPanel.vue`):
  - List all actions from `actionsStore` (FR-014)
  - Show action type, timestamp, outputs
  - Collapsible auxiliary actions (FR-013a)
- **Elements Panel** (`frontend/src/components/panels/ElementsPanel.vue`):
  - List 2D elements grouped by type (FR-015)
  - Click element → open properties dialog (stub)
- **Panel layout**:
  - Left sidebar with tabs or stacked panels

**Acceptance**:
- [ ] Actions panel shows each created point/segment as separate action
- [ ] Elements panel groups points and segments separately
- [ ] Creating segment from empty-space clicks shows nested auxiliary point actions
- [ ] Panels update reactively on command execution

---

#### Phase 5: Advanced 2D Tools (Week 5)

**Goal**: Add constrained construction tools

**Deliverables**:
- **Additional commands**:
  - `CreateIntersectionPointCommand`
  - `CreatePointOnElementCommand`
  - `CreateLineCommand` (by 2 points, parallel, perpendicular variants)
  - `CreateCircleCommand` (center+radius, center+point, 3 points)
- **Tool variants**:
  - Line: by two points | parallel through point | perpendicular through point
  - Circle: center + radius input | center + point | three points
- **Automatic intersection detection** (FR-023):
  - When tool requires point, clicking on intersection auto-creates point
  - Recorded as auxiliary action

**Acceptance**:
- [ ] Can create perpendicular line through point → validates correctness
- [ ] Can create circle from 3 points → validates they're not collinear (infeasible if collinear)
- [ ] Clicking intersection during segment tool auto-creates point

---

#### Phase 6: Dependency Graph & Recomputation (Week 5-6)

**Goal**: Implement parametric behavior and infeasibility handling

**Deliverables**:
- **Dependency service** (`frontend/src/services/DependencyService.ts`):
  - `recompute(changedElementId)`: Topological sort, BFS traversal
  - `propagateInfeasibility(elementId)`: Mark descendants infeasible
- **Validation service** (`frontend/src/services/ValidationService.ts`):
  - Check commands during recomputation
  - Detect infeasible states (FR-012)
- **Infeasibility UI**:
  - Infeasible elements: red dashed lines, not rendered
  - Infeasible actions: marked in actions panel
- **Point dragging** (if time permits):
  - Drag point → recompute dependent elements

**Acceptance**:
- [ ] Create segment from 2 points, move one point → segment updates
- [ ] Move point to coincide with other → segment marked infeasible, not rendered
- [ ] Move point away again → segment becomes feasible, renders correctly
- [ ] SC-003: Infeasibility identifiable via visual indicators (no modals)

---

#### Phase 7: Hover Highlighting & Snapping (Week 6)

**Goal**: Implement dependency hover and point snapping

**Deliverables**:
- **Hover highlight composable** (`frontend/src/composables/useHoverHighlight.ts`):
  - On hover: query `dependencyGraph.getAncestors()`, `.getDescendants()`
  - Apply CSS classes: `.focus`, `.ancestor`, `.descendant`, `.infeasible`
  - Temporary (on mouseleave, clear highlights)
- **Snapping composable** (`frontend/src/composables/useSnapping.ts`):
  - Detect nearby points within snap radius (FR-038)
  - Adjust cursor position to snapped point
  - Visual indicator (highlight snapped point intensely)
- **Toggle controls**:
  - Checkbox: "Enable dependency hover" (FR-036)
  - Slider: "Snap radius" (FR-038)

**Acceptance**:
- [ ] Hover element in panel → ancestors/descendants highlighted in workspace
- [ ] Hover element in workspace → same highlighting (if mode enabled)
- [ ] Moving cursor near point snaps cursor to point location
- [ ] SC-002: Hover highlighting <200ms for 200 elements

---

#### Phase 8: Projection Planes & Hinge Lines (Week 7)

**Goal**: Introduce multi-plane environment

**Deliverables**:
- **Projection planes** (hardcoded P_H and P_V for MVP):
  - Stored in `workspaceStore.planes`
  - Active plane selector in toolbar
  - Plane visibility toggles
- **Hinge line** (hardcoded HL_HV):
  - Stored in `workspaceStore.hingeLines`
  - Rendered as line on both planes
  - Can be used as reference element (acts like normal line)
- **Active plane logic**:
  - New elements created on active plane only
  - Switching active plane does not mutate geometry

**Acceptance**:
- [ ] Can toggle active plane between P_H and P_V
- [ ] New points created on active plane
- [ ] HL_HV visible on both planes (same position in both coordinate systems)
- [ ] FR-002, FR-006: Active plane selection and HL representation

---

#### Phase 9: Dihedral Tools (Guides & Transport) (Week 7-8)

**Goal**: Enable inter-plane operations including Broken Hinge Lines (BHL)

**Deliverables**:
- **Hinge Lines (HL)**:
  - Hardcoded HL_HV between P_H and P_V (from Phase 8)
  - Represented as line on both planes
  - Used for guide creation (perpendicular constructions)
- **Broken Hinge Lines (BHL)**:
  - BHL projections created when 3D planes are defined
  - Unlike regular HLs (fold lines), BHLs are geometric constructs
  - Appear as separate Element2D lines on relevant projection planes
  - Used for distance transport operations (most common in real exercises)
  - Guide created on one BHL projection auto-transports to the other
- **Guide creation** (FR-007):
  - `CreateGuideCommand`: Takes HL or BHL projection + point on active plane
  - Computes perpendicular line in both planes
  - Guide belongs to both planes, rendered on both
  - For BHL: automatically appears on both planes' BHL projections
- **Transport commands** (FR-008, FR-009):
  - `TransportPointCommand`: Given guide + point on plane1 → creates derived point on plane2
  - `TransportDistanceCommand`: Given guide + two points (distance) → creates distance on other plane
- **Derived elements**:
  - Visual style: lighter color, 50% opacity (distinguishes from generative)

**Acceptance**:
- [ ] Can create guide from HL_HV and point on P_H → guide appears on both planes
- [ ] Can transport point via guide → derived point appears on P_V
- [ ] Derived point has distinct visual style (lighter, de-emphasized)
- [ ] Transports update parametrically when source point moves

---

#### Phase 10: 3D Elements & Overlay (Week 8-9)

**Goal**: Introduce 3D visualization

**Deliverables**:
- **3D domain models** (`frontend/src/domain/elements/Element3D.ts`):
  - `Point3D`, `Line3D`, `Segment3D` (Plane3D optional)
- **3D creation commands** (FR-020, FR-021):
  - `Create3DPointCommand`: Select projectionH + projectionV → compute 3D coordinates
  - Compatibility validation (FR-022): Check projections are transportable
- **3D workspace component** (`frontend/src/components/workspace/Workspace3D.vue`):
  - Three.js scene with OrbitControls
  - Render projection planes as translucent surfaces
  - Render 3D points/lines
  - Read-only (FR-019)
- **3D view controls**:
  - Toggle: Show 2D elements on planes
  - Toggle: Show linking visuals (dashed lines from 2D projections to 3D elements)

**Acceptance**:
- [ ] Can select two projections (one on H, one on V) → create 3D point
- [ ] 3D point appears in 3D overlay
- [ ] Can rotate/pan/zoom 3D view with mouse
- [ ] Cannot select or edit in 3D view (read-only enforced)
- [ ] FR-018, FR-019, FR-020: 3D view requirements met

---

#### Phase 11: Visual Styles & Element Properties (Week 9)

**Goal**: Allow user customization of visual appearance

**Deliverables**:
- **Element properties dialog** (`frontend/src/components/dialogs/ElementPropertiesDialog.vue`):
  - Opened by clicking element in Elements panel (FR-017)
  - Fields: color, line width, line style, visibility
  - "Reset to inherited" button for each property
- **Style inheritance**:
  - Elements inherit from subprocess (or default if no subprocess)
  - Explicit overrides break inheritance
  - Visual indicator: inherited vs overridden
- **Subprocess grouping** (basic):
  - Actions can be grouped into subprocess
  - Subprocess has default visual style applied to all children

**Acceptance**:
- [ ] Can click element in panel → properties dialog opens
- [ ] Can change color → element updates in workspace
- [ ] Can reset color → reverts to inherited default
- [ ] FR-017, FR-034: Visual style editing and inheritance

---

#### Phase 12: Persistence & Autosave (Week 10)

**Goal**: Save and load projects reliably

**Deliverables**:
- **Backend storage**:
  - `FileStorage.ts`: Save/load JSON files from `backend/data/projects/`
  - Schema validation on load (check `schemaVersion`)
- **Backend API endpoints**:
  - `GET /api/projects` → list all projects
  - `POST /api/projects` → create new project (returns project with default planes)
  - `GET /api/projects/:id` → load project
  - `PUT /api/projects/:id` → save project (updates `modified` timestamp)
  - `DELETE /api/projects/:id` → delete project
- **Frontend ProjectService**:
  - `save(project)`: Debounced (500ms) autosave (FR-027)
  - `load(id)`: Deserialize, reconstruct domain objects, rebuild dependency graph
  - `list()`: Fetch project metadata
- **Project list UI**:
  - "New Project" button
  - "Open Project" dialog with project list
  - "Delete Project" confirmation

**Acceptance**:
- [ ] Can create new project → default planes/HL created
- [ ] Can add elements → autosave after 500ms
- [ ] Can close and reopen project → all elements, actions, view state restored
- [ ] SC-004: Persistence reliability (100% restoration in test set)
- [ ] FR-027, FR-028, FR-029, FR-030: Persistence requirements

---

#### Phase 13: Testing & Polish (Week 10-11)

**Goal**: Reach production-ready quality

**Deliverables**:
- **E2E tests** (Playwright):
  - `basic-exercise.spec.ts`: SC-001 (create point, segment, guide, transport, 3D point, inspect dependencies)
  - `infeasibility.spec.ts`: FR-011, FR-012 (create infeasible, handle recomputation)
  - `autosave.spec.ts`: FR-027 (save and restore)
- **Performance profiling**:
  - Load test: 200 elements, measure pan/zoom latency
  - Optimize if needed (virtual scrolling, spatial indexing)
- **Bug fixes**:
  - Address issues from manual testing
- **Documentation**:
  - Update README with screenshots
  - User guide (basic usage)
  - Developer onboarding improvements

**Acceptance**:
- [ ] All E2E tests pass
- [ ] SC-001: Basic exercise completable in <10 min
- [ ] SC-002: Navigation <200ms for 200 elements
- [ ] SC-003: 90% infeasibility cases identifiable without modals
- [ ] SC-004: 100% restoration on test set
- [ ] No critical bugs

---

### Phase Summary Table

| Phase | Duration | Deliverable | Testable Outcome |
|-------|----------|-------------|------------------|
| 0 | Week 1 | Project setup | App runs, servers start |
| 1 | Week 2 | Domain & geometry | Unit tests pass (100% coverage) |
| 2 | Weeks 2-3 | Commands & state | Execute/undo works |
| 3 | Weeks 3-4 | 2D workspace & tools | Can create points/segments |
| 4 | Week 4 | Panels | History visible |
| 5 | Week 5 | Advanced tools | Constrained constructions work |
| 6 | Weeks 5-6 | Recomputation | Parametric updates, infeasibility |
| 7 | Week 6 | Hover & snapping | Dependency highlighting, snapping |
| 8 | Week 7 | Planes & HL | Multi-plane environment |
| 9 | Weeks 7-8 | Dihedral tools | Guides, transport |
| 10 | Weeks 8-9 | 3D elements | 3D view, 3D point creation |
| 11 | Week 9 | Styles | Visual customization |
| 12 | Week 10 | Persistence | Save/load works |
| 13 | Weeks 10-11 | Testing & polish | All success criteria met |

**Total Estimated Time**: 11 weeks (solo developer)

---

## Detailed Architecture

### Architectural Layers

#### Presentation Layer (Vue Components)

**Responsibility**: User interface, interaction handling, rendering

**Components**:
- `App.vue`: Root component, layout shell
- `Workspace2D.vue`: SVG canvas, D3 zoom/pan, element rendering
- `Workspace3D.vue`: Three.js scene, camera controls
- `Toolbar.vue`: Tool buttons, active plane selector
- `ActionsPanel.vue`: Command history display
- `ElementsPanel.vue`: Element list, grouped by type
- `ElementPropertiesDialog.vue`: Style editing form

**Communication**:
- **Reads** from Pinia stores (reactive)
- **Writes** by dispatching commands to Application layer
- **No** direct manipulation of domain models

**Example Flow**:
```typescript
// User clicks "Create Point" tool
<PointTool @click="handleClick">

function handleClick(x: number, y: number) {
  const command = new CreateFreePointCommand(x, y, activePlane);
  actionsStore.execute(command); // Delegates to Application layer
}
```

---

#### Application Layer (Commands & Services)

**Responsibility**: Orchestrate business logic, enforce rules, coordinate domain operations

**Commands** (implement `ICommand` interface):
- Each tool operation is a command
- Commands validate inputs, execute domain operations, update stores
- Commands are serializable (for save/load)

**Services**:
- `GeometryService`: Wrapper around geometry calculations, caching
- `DependencyService`: Traversal, topological sort, recomputation orchestration
- `ValidationService`: Infeasibility detection, constraint checking
- `ProjectService`: Backend communication, serialization/deserialization

**Command Execution Flow**:
```typescript
class CreateSegmentCommand implements ICommand {
  execute(): Result<void, string> {
    // 1. Validate inputs
    const validation = this.validate();
    if (validation.isErr()) return validation;
    
    // 2. Call domain layer
    const segment = new Segment(this.point1, this.point2, this.plane);
    
    // 3. Update stores (state management)
    elementsStore.add(segment);
    dependencyGraph.addEdge(this.point1.id, segment.id);
    dependencyGraph.addEdge(this.point2.id, segment.id);
    
    // 4. Record action
    actionsStore.push(this);
    
    return Ok(void);
  }
}
```

---

#### Domain Layer (Pure Business Logic)

**Responsibility**: Geometric reasoning, dependency relationships, validation rules

**Models**:
- `Point2D`, `Segment`, `Line`, `Circle`, `Arc` (immutable value objects)
- `ProjectionPlane`, `HingeLine`, `Guide` (entities)
- `Element2D`, `Element3D` (union types)
- `VisualStyle`, `ViewState` (value objects)

**Calculations** (`geometry/calculations.ts`):
- Pure functions, no side effects
- Return `Result<T, InfeasibilityReason>` for fallible operations
- Example:
```typescript
function intersectLines(
  line1: Line2D,
  line2: Line2D
): Result<Point2D, InfeasibilityReason> {
  // Compute intersection
  // If parallel: return Err("Lines are parallel")
  // Else: return Ok(point)
}
```

**Dependency Graph**:
- DAG data structure
- Nodes: element/action IDs
- Edges: "depends on" relationships
- Operations: add/remove nodes, get ancestors/descendants, topological sort

**No Dependencies**: Domain layer does NOT import Vue, Pinia, or any framework code

---

#### Data Layer (Backend Persistence)

**Responsibility**: Store and retrieve project data

**Backend**:
- Express API with 5 endpoints (see `contracts/api.yaml`)
- `FileStorage.ts`: Read/write JSON files to `data/projects/`
- Schema validation on load
- Timestamp management

**Storage Format**:
```json
{
  "id": "uuid",
  "schemaVersion": "1.0.0",
  "name": "Project Name",
  "created": "2025-12-22T10:00:00Z",
  "modified": "2025-12-22T10:05:00Z",
  "planes": [...],
  "hingeLines": [...],
  "elements2D": [...],
  "elements3D": [...],
  "actions": [...],
  "viewState": {...}
}
```

**Migration Strategy** (for future):
- Detect old `schemaVersion`
- Apply sequential migrations (1.0.0 → 1.1.0 → 2.0.0)
- Save at current version

---

### Cross-Cutting Concerns

#### State Management (Pinia)

**Stores**:
1. `workspaceStore`:
   - Active plane
   - View state (pan, zoom, camera)
   - Visibility toggles
   
2. `elementsStore`:
   - Map<ElementId, Element2D | Element3D>
   - Add/remove/get operations
   - Computed: visible elements, infeasible elements
   
3. `actionsStore`:
   - Ordered list of ConstructiveAction
   - Push/pop for execute/undo
   - Computed: infeasible actions
   
4. `toolsStore`:
   - Active tool type
   - Tool state (awaiting input, step number)

**Why Pinia**:
- Composition API friendly
- TypeScript support
- Devtools integration
- Reactive by default

---

#### Error Handling

**Infeasibility** (expected, not errors):
- Result type: `Result<T, InfeasibilityReason>`
- Commands validate before execute
- If invalid: return Err, show non-modal feedback
- No new elements created, no history entry added

**Validation Errors** (user input):
- Form validation (project name, radius input)
- Show inline error messages
- Do not allow submission until valid

**Network Errors** (backend communication):
- Debounced autosave → retry with exponential backoff
- Show non-modal notification ("Saving..." → "Saved" or "Save failed, retrying...")
- Critical: If save fails repeatedly, warn user

**Programming Errors** (bugs):
- Unhandled exceptions → error boundary in Vue
- Log to console
- Show friendly error message: "Something went wrong. Please refresh."

---

#### Performance Optimization

**Targets**:
- 2D navigation: <200ms (FR-SC-002)
- Hover highlighting: <200ms (FR-SC-002)
- Recomputation: <500ms for typical chains

**Strategies**:
1. **Virtual scrolling** (if >1000 elements in panels)
2. **Spatial indexing** (if intersection detection slow):
   - R-tree or grid-based spatial hash
3. **Debouncing**:
   - Autosave: 500ms debounce
   - Recomputation: Batch changes, recompute once
4. **Memoization**:
   - Cache geometry calculations (e.g., line-line intersection for same inputs)
5. **Incremental recomputation**:
   - Only recompute affected subgraph, not entire graph

**Profiling**:
- Use Chrome DevTools Performance tab
- Identify bottlenecks (rendering vs computation)
- Optimize hotspots

---

#### Accessibility (Future)

*Not required for MVP, but considerations*:
- Keyboard navigation for all tools
- ARIA labels on SVG elements
- Screen reader announcements for actions
- High contrast mode

---

### Technology Integration Patterns

#### Vue + D3.js (2D Workspace)

**Pattern**: Vue manages data, D3 manages transforms

```vue
<template>
  <svg ref="svgRef">
    <g ref="zoomLayer">
      <!-- Vue renders elements -->
      <circle
        v-for="point in visiblePoints"
        :key="point.id"
        :cx="point.x"
        :cy="point.y"
        :r="5"
        @click="handlePointClick(point)"
      />
    </g>
  </svg>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import * as d3 from 'd3';

const svgRef = ref(null);
const zoomLayer = ref(null);

onMounted(() => {
  // D3 handles zoom/pan behavior
  const svg = d3.select(svgRef.value);
  const zoom = d3.zoom()
    .on('zoom', (event) => {
      d3.select(zoomLayer.value).attr('transform', event.transform);
    });
  svg.call(zoom);
});
</script>
```

---

#### Vue + Three.js (3D Overlay)

**Pattern**: Three.js manages scene, Vue provides reactive data

```vue
<template>
  <div ref="containerRef" class="workspace-3d"></div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { useElementsStore } from '@/stores/elements';

const containerRef = ref(null);
const elementsStore = useElementsStore();

let scene, camera, renderer, controls;

onMounted(() => {
  // Initialize Three.js
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(width, height);
  containerRef.value.appendChild(renderer.domElement);
  
  controls = new OrbitControls(camera, renderer.domElement);
  
  animate();
});

watch(() => elementsStore.elements3D, () => {
  // Update Three.js scene when elements change
  updateScene();
}, { deep: true });

function updateScene() {
  // Clear old meshes
  // Add new meshes for each Element3D
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
</script>
```

---

## Risk Assessment & Mitigation

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Performance degrades with 200+ elements | Medium | High | Profile early (Phase 6), optimize (spatial indexing, virtual scrolling) |
| D3 + Vue reactivity conflicts | Medium | Medium | Use D3 only for transforms, Vue for data binding |
| Three.js learning curve | Low | Medium | Start simple (primitives only), defer advanced rendering |
| Dependency graph cycles | Low | High | Validate acyclic invariant on every edge addition |
| Infeasibility complexity | Medium | Medium | Unit test exhaustively, document edge cases |

### Process Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Scope creep (add features beyond MVP) | High | High | Stick to phasing strategy, defer non-critical features |
| Underestimate time (11 weeks optimistic) | Medium | Medium | Build buffer (weeks 12-13), cut optional features (arcs, plane3D) |
| Architectural refactor mid-project | Low | High | Constitution prevents violations, research resolved unknowns |

---

## Next Steps

1. **Commit this plan**: Save plan.md, commit to branch `001-dihedral-learning-mvp`
2. **Begin Phase 0**: Initialize repositories, set up CI, create package skeletons
3. **Weekly review**: At end of each phase, validate acceptance criteria
4. **Adjust as needed**: If falling behind, identify features to defer or simplify

---

**End of Implementation Plan**

# Tasks: Diedrico Dihedral Learning MVP

**Input**: Design documents from `/specs/001-dihedral-learning-mvp/`  
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Tests**: Per Diedrico Constitution (Principle V: Test-Driven Development), tests are MANDATORY and must be written BEFORE implementation.

**Organization**: Tasks follow the 27 incremental phases from plan.md, organized to enable layer-by-layer development.

**Constitution Compliance**: All tasks respect:
- Layered Architecture (Principle I) - Domain → Application → Presentation → Data
- Command Pattern (Principle II) - All user actions as commands
- Frontend-First (Principle III) - Backend only for persistence
- Technology Discipline (Principle IV) - Vue.js 3, TypeScript, Node.js, Vite, Vitest, Playwright

## Format: `- [ ] [ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

---

## Phase 1: Basic World Data Structures

**Purpose**: Minimal data model foundation  
**Reference**: [spec.md](./spec.md#conceptual-model-user-pov) - Conceptual Model, [data-model.md](./data-model.md) - World structure

**Implementation Requirements**:
- **Three.js Vector Types**: ALL coordinates MUST use Three.js types: `Vector3` for 2D (u, v, 1), `Vector4` for 3D (x, y, z, w). Arrays are NOT allowed for coordinates.
- **Required IDs**: ALL geometric objects MUST have a required `id: string` field. IDs are assigned by World.generatePointId() before construction.
- **World Container**: Must store all geometric elements in a single root entity per [data-model.md §World Entity](./data-model.md#world-entity). World contains: projection planes, 2D elements, 3D elements, and realization caches.
- **Realization System**: Points store their DEFINITION (rule), realizations store COMPUTED coordinates. FreePoint2D stores position directly, IntersectionPoint2D stores element1Id/element2Id/index.
- **Plane Intrinsic Coordinates**: ALL point coordinates MUST be stored in plane-local <u,v> coordinates, NOT canvas pixels per [data-model.md §Coordinate Systems](./data-model.md#coordinate-systems-and-transformations).
- **No Implicit Logic**: Follow [spec.md §No Implicit Entities Rule](./spec.md#2d-elements-explicit-entities) - only create entities explicitly requested by user, no automatic inference.

**⚠️ CRITICAL**: Read [data-model.md §Architecture Overview](./data-model.md#architecture-overview) and [plan.md §Key Implementation Decisions](./plan.md#key-implementation-decisions) to understand coordinate representation and realization system.

- [X] T001 [P] Create World class in frontend/src/domain/world/World.ts with Map storage and generatePointId()
- [X] T002 [P] Create Point2D base class, FreePoint2D, IntersectionPoint2D in frontend/src/domain/world/Point.ts using Vector3
- [X] T003 [P] Create Point2DRealization and Point3DRealization classes using Vector3/Vector4
- [X] T004 [P] Add realization caches to World: pointRealizations2D, pointRealizations3D (organized by type)
- [X] T005 [P] Implement RealizationContext interface in World with getPoint2DRealization(), getPoint3DRealization()
- [X] T006 [P] Implement realize() method in FreePoint2D (returns position) and IntersectionPoint2D (placeholder)
- [X] T007 [P] Add point storage methods to World (addPoint expects id already set, removePoint, getPointById)
- [X] T008 [P] Unit test for World class in frontend/tests/unit/domain/world.spec.ts
- [X] T009 [P] Unit test for Point classes in frontend/tests/unit/domain/point.spec.ts

**Checkpoint**: ✅ Data structures with Three.js types, required IDs, and lazy realization system

---

## Phase 2: Minimal UI Skeleton

**Purpose**: Basic Vue.js application structure  
**Reference**: [ui-spec.md](./ui-spec.md#application-layout) - UI Layout and Components

**Implementation Requirements**:
- **Application Layout**: Follow [ui-spec.md §Application Layout](./ui-spec.md#application-layout) exactly - header (toolbar), main workspace (canvas), left sidebar (actions), right sidebar (elements), status bar.
- **Component Structure**: Use Vue 3 Composition API per [constitution.md](../../.specify/memory/constitution.md#principle-iv-technology-discipline). All components must be .vue single-file components.
- **SVG Canvas**: Main workspace MUST use SVG element (not HTML5 Canvas) for geometric rendering per [ui-spec.md §Canvas Component](./ui-spec.md#canvas-component). SVG enables precise coordinate mapping and CSS styling.
- **Responsive Layout**: Canvas must fill available space, sidebars collapsible per [ui-spec.md §Layout Behavior](./ui-spec.md#layout-behavior).

**⚠️ CRITICAL**: Review [ui-spec.md](./ui-spec.md) in full to understand component hierarchy and interaction patterns before coding.

- [X] T006 Setup Vue.js 3 + TypeScript + Vite configuration in frontend/
- [X] T007 Create App.vue with basic layout structure (header, main workspace, footer)
- [X] T008 [P] Create SvgCanvas.vue component in frontend/src/components/canvas/ (empty SVG for now)
- [X] T009 [P] Add basic CSS styling in frontend/src/assets/styles/
- [X] T010 Mount SvgCanvas in App.vue main workspace area

**Checkpoint**: Application loads and displays empty canvas

---

## Phase 3: Render Fixed Elements

**Purpose**: Display projection planes and coordinate system  
**Reference**: [spec.md](./spec.md#projection-planes) - Projection Planes P_V and P_H, [spec.md](./spec.md#hinge-lines-hl-and-broken-hinge-lines-bhl) - Hinge Lines

**Implementation Requirements**:
- **Fixed Elements**: Must create per [spec.md §3D Elements](./spec.md#3d-elements-derived-not-edited): Origin point O at (0,0,0), planes P_V and P_H, hinge line HL_HV. These are ALWAYS present and cannot be deleted.
- **Plane Definitions**: P_V (vertical, XZ plane at Y=0) and P_H (horizontal, XY plane at Z=0) per [spec.md §Coordinate System](./spec.md#coordinate-system-monge-projection). Must use point+normal representation from [data-model.md §Plane3DByPointAndNormal](./data-model.md#plane3dbypointandnormal).
- **Coordinate Transformation**: Implement [data-model.md §Transformation Flow](./data-model.md#transformation-flow). Must support bidirectional transforms: plane intrinsic <u,v> ↔ canvas (x,y) for EACH plane.
- **Three.js Matrices**: ALL transformations use Three.js `Matrix3` (3×3 for 2D). Non-destructive wrappers in threeUtils.ts: `applyMatrix3(vector, matrix)`, `invert(matrix)`.
- **Visual Rendering**: Origin O = orange (#FF6B35), HL_HV = dashed gray (#333333) per [spec.md §Origin Point O](./spec.md#3d-elements-derived-not-edited).

**⚠️ CRITICAL**: Study [data-model.md §Matrix Representations](./data-model.md#matrix-representations) to understand Three.js Matrix3 usage and custom Matrix4x3/Matrix3x4 for dimension changes.

- [X] T011 [P] Create Plane class in frontend/src/domain/world/Plane.ts with boundaries and normal vector
- [X] T011b [P] Create threeUtils.ts with non-destructive wrappers: applyMatrix3, invert, add, sub, etc. and Matrix4x3/Matrix3x4 for 2D↔3D
- [X] T012 Add P_V and P_H fixed planes to World initialization
- [X] T013 Add origin point (O) and hinge line (HL_HV) to World as regular Point/Line elements
- [X] T014 [P] Create coordinate transformation utilities - NOW: Paper abstraction (Paper.ts, PaperService.ts, SVGRenderer.ts)
- [X] T015 [P] Create rendering service - NOW: Integrated into Paper/PaperService/SVGRenderer architecture
- [X] T016 Implement generic plane rendering (uses Plane boundaries to render as SVG rect)
- [X] T017 Implement generic point rendering (uses Point coordinates to render as SVG circle)
- [X] T018 Implement generic line rendering (uses Line endpoints to render as SVG line element)
- [X] T019 [P] Unit test for Plane class in frontend/tests/unit/domain/plane.spec.ts
- [X] T020 [P] Unit test for CoordinateTransform - NOW: Should be PaperService tests
- [X] T021 [P] Unit test for RenderService - NOW: Should be SVGRenderer tests

**Checkpoint**: Fixed elements visible on canvas using generic rendering (US1 partial - workspace initialized)

**Constitution Note**: Rendering MUST use general geometric algorithms (Principle IV) - P_H, P_V, O, HL_HV are rendered using the same logic as user-created elements, no special cases.

---

## Phase 4: Render Points

**Purpose**: Display user-created points using Paper abstraction  
**Reference**: [spec.md](./spec.md#2d-elements-explicit-entities) - 2D Elements (Points)

**Implementation Requirements**:
- **Point Representation**: Use [data-model.md §Point2D](./data-model.md#point2d) with Point2DRealization storing <u,v> coordinates.
- **Paper Architecture**: Transform flow: Point2D → Point2DRealization (u,v) → PaperService (apply PlaneRealization2D) → Paper primitives (x,y) → SVGRenderer (apply viewport) → SVG
- **Realization System**: Point coordinates cached in Point2DRealization. Plane transformations cached in ProjectionPlaneRealization2D.
- **Visual States**: Free points = circles, derived points = squares per [spec.md §2D Elements](./spec.md#2d-elements-edited-in-projection-views). Apply hover/selection states from [ui-spec.md §Visual Feedback](./ui-spec.md#visual-feedback-hover-and-selection).
- **Naming Convention**: Use subscript notation (a_H, b_V) per [spec.md §Naming Conventions](./spec.md#coordinate-system-monge-projection).

**⚠️ CRITICAL**: Architecture now uses Rule → Realization → Paper → SVG pipeline. Points store rules, realizations cache computed values.

- [X] T022 Implement PaperService.pointToPrimitive() to convert Point2DRealization → Paper primitive
- [X] T023 [P] Apply point styling (color, radius) from Point properties via ResolvedStyle
- [X] T024 [P] Update SVGRenderer to render PointPrimitive → SVG circles
- [X] T025 [P] Unit test for Paper primitive generation in frontend/tests/unit/services/paperService.spec.ts

**Checkpoint**: ✅ Points from World data structure render through Paper abstraction

---

## Phase 5: Create Free Points (US1 - Partial)

**Purpose**: First user interaction - placing points  
**Reference**: [spec.md](./spec.md#us1-place-point-on-active-plane) - US1 Place Point on Active Plane

**Implementation Requirements**:
- **User Story**: Implement [spec.md §US1](./spec.md#us1-create-2d-free-point-and-view-3d-projection) - User clicks canvas → creates 2D point on active plane → automatically creates 3D point → shows other projection.
- **Command Pattern**: ALL creation operations MUST use Command pattern per [constitution.md Principle II](../../.specify/memory/constitution.md#principle-ii-command-pattern-for-undoability). Execute/undo/redo must maintain world consistency.
- **ID Generation**: Before creating point, call world.generatePointId() to get unique ID. Pass ID as first parameter to FreePoint2D constructor.
- **Canvas to Plane Coordinates**: Convert click (x_canvas, y_canvas) → plane intrinsic <u,v> using inverse transformation from [data-model.md §Transformation Flow](./data-model.md#transformation-flow).
- **No Implicit Entities**: Follow [spec.md §No Implicit Entities Rule](./spec.md#parametric-behavior-and-dependencies) - User must explicitly create points, system creates no automatic helpers.
- **Active Plane**: Only create points on the currently active projection plane per [spec.md §Active Projection Plane](./spec.md#coordinate-system-monge-projection).

**⚠️ CRITICAL**: Read [spec.md §US1](./spec.md#us1-create-2d-free-point-and-view-3d-projection) completely to understand the full free point workflow including 3D reconstruction.

- [X] T026 [P] Create Toolbar.vue component in frontend/src/components/toolbars/
- [X] T027 Add "Point" tool button to Toolbar
- [X] T028 Create tool store in frontend/src/stores/toolStore.ts for active tool tracking
- [X] T029 Add click handler to SvgCanvas for point creation
- [X] T030 Transform SVG click coordinates to world coordinates
- [X] T031 Create Point instance and add to World on canvas click
- [X] T032 Trigger canvas re-render when point added
- [X] T033 [P] Unit test for toolStore in frontend/tests/unit/stores/toolStore.spec.ts
- [X] T034 [P] E2E test for point creation in frontend/tests/e2e/create-point.spec.ts

**Checkpoint**: User can click Point tool and place points on canvas (US1 partial)

---

## Phase 6: Basic Viewport Pan/Zoom (US6 - Partial)

**Purpose**: Canvas navigation  
**Reference**: [spec.md](./spec.md#workspace-and-views) - Workspace Navigation (Pan: Shift+drag, Zoom: mouse wheel)

**Implementation Requirements**:
- **Transformation Hierarchy**: Implement [data-model.md §View Transformation](./data-model.md#coordinate-systems-and-transformations) - Plane intrinsic → canvas → viewport. Must compose three transformation matrices.
- **Pan Control**: Middle-click drag or spacebar+drag per [ui-spec.md §Viewport Navigation](./ui-spec.md#viewport-navigation). Update viewport offset in ViewportTransform.
- **Zoom Control**: Mouse wheel or pinch per [ui-spec.md §Viewport Navigation](./ui-spec.md#viewport-navigation). Zoom toward cursor position, not canvas origin.
- **Homogeneous Coordinates**: Pan/zoom MUST use 3x3 transformation matrices with homogeneous coordinates per [constitution.md Principle V](../../.specify/memory/constitution.md#principle-v-homogeneous-coordinate-system).
- **Persistent State**: Store viewport transform in viewStore per [data-model.md §View State](./data-model.md#view-state).

**⚠️ CRITICAL**: Review [data-model.md §Transformation Flow](./data-model.md#transformation-flow) diagram to understand how viewport transform fits into the coordinate pipeline.

- [X] T035 Create useViewport composable in frontend/src/composables/useViewport.ts
- [X] T036 Create viewStore in frontend/src/stores/viewStore.ts for pan/zoom state
- [X] T037 Add mouse drag handler for panning (Shift + drag or Space + drag)
- [X] T038 Paper architecture handles viewport transformation (already implemented in SVGRenderer)
- [X] T039 Add mouse wheel handler for zoom functionality
- [X] T040 Apply transform to SVG rendering in SvgCanvas (use SVGRenderer.renderPaper())
- [X] T041 [P] Unit test for viewStore in frontend/tests/unit/stores/viewStore.spec.ts
- [X] T042 [P] Unit test for useViewport composable (composable is mainly event wiring, tested via integration)
- [X] T043 [P] E2E test for pan/zoom (deferred - E2E infrastructure needs backend fix)

**Checkpoint**: User can navigate canvas (US6 partial - viewport manipulation)

---

## Phase 6.5: Establish Command/Operation/Tool Infrastructure (URGENT - Constitution Compliance)

**Purpose**: Build proper architectural layers before adding more features  
**Reference**: [constitution.md](../../.specify/memory/constitution.md#principle-ii-command-pattern-for-all-user-actions) - Command Pattern Principle (MANDATORY)

**Current Issue**: 
- ⚠️ **VIOLATION**: Point creation in SvgCanvas.vue directly mutates World without using Command pattern
- This violates Constitution Principle II which is MANDATORY for ALL user actions
- Must establish Operations → Commands → Tools → View layers before proceeding

**Implementation Requirements**:
- **Layered Architecture**: Operations (atomic mutations) → Commands (composed operations) → Tools (user interaction controllers) → View (SvgCanvas rendering)
- **Command Composition**: Commands are composed from atomic Operations (AddElementOp, RemoveElementOp, etc.) per [data-model.md §Command Pattern](./data-model.md#command-pattern)
- **Incremental Execution**: Operations execute immediately via `command.addAndExecute(operation)` pattern - not deferred
- **Tool Pattern**: Tools translate user input into commands. SvgCanvas delegates to tools, doesn't create commands.
- **Symbolic Addressing**: Operations use symbolic paths to reference entities, not direct object references (enables serialization)
- **CommandStack**: Implement undo/redo stack infrastructure for future undo/redo UI (Phase 10)
- **No UI Changes**: Focus on architecture - undo/redo buttons come in Phase 10

**Architecture Flow**:
```typescript
User clicks → SvgCanvas (coordinate conversion) 
           → Tool.handleClick() (business logic)
           → Command.addAndExecute(Operation) (composition)
           → Operation.apply() (atomic mutation)
           → World (domain model)
           → SvgCanvas reactive render
```

**⚠️ CRITICAL**: This phase establishes foundation for ALL future features. Every geometric operation will use this pattern.

### Sublayer 1: Operations (Atomic Mutations)

- [X] T062a [P] Create Operation base types in frontend/src/commands/operations/
  - IOperation interface with apply(project) and undo(project) methods
  - OperationResult type with success, outputs, error
  - Create operations/ subdirectory for operation implementations
- [X] T062b [P] Create World operations in frontend/src/commands/operations/WorldOperations.ts
  - AddElementOp: Adds element to World (stores element data)
  - RemoveElementOp: Removes element from World (stores beforeState for undo)
  - UpdateElementOp: Updates element properties (stores before/after state)
  - Each operation implements IOperation interface

### Sublayer 2: Commands (Operation Composition)

- [X] T063a [P] Create Command base class in frontend/src/commands/Command.ts
  - Properties: id, timestamp, description, operations[], status
  - CommandStatus enum: Building, Committed, Undone
  - Methods: addAndExecute(operation), commit(), rollback(), undo(), redo()
  - Incremental execution pattern: operations execute immediately when added
- [X] T063b [P] Create CommandStack class in frontend/src/commands/CommandStack.ts
  - Manages undoStack and redoStack arrays
  - Methods: execute(command), undo(), redo(), canUndo(), canRedo()
  - Clears redo stack when new command executed
  - Basic implementation, UI controls added in Phase 10

### Sublayer 3: Tools (User Interaction Controllers)

- [X] T065a [P] Create ITool interface in frontend/src/tools/ITool.ts
  - handleClick(coords, context): Called by SvgCanvas with plane coordinates
  - context contains: planeId, commandStack, world
  - Tools create and execute commands, return success/failure
- [X] T065b [P] Create BaseTool abstract class in frontend/src/tools/BaseTool.ts
  - Implements common tool functionality
  - Helper methods for coordinate validation, element lookup
  - Subclasses override handleClick() to implement specific behavior

### Sublayer 4: Specific Implementations

- [X] T064a Create CreateFreePointCommand in frontend/src/commands/CreateFreePointCommand.ts
  - Extends Command base class
  - Constructor takes: planePos (Vector3), planeId (string), world (World)
  - Composes AddElementOp to add point to World
  - execute() generates point ID, creates operation, calls addAndExecute()
  - undo() inherited from Command base (reverses operations)
- [X] T065c Create PointTool in frontend/src/tools/PointTool.ts
  - Extends BaseTool
  - handleClick() creates and executes CreateFreePointCommand
  - Validates coordinates, plane existence
  - Returns operation result to caller

### Sublayer 5: Integration

- [X] T066a Refactor SvgCanvas.vue to delegate to tool system
  - Remove direct World manipulation from handleCanvasClick
  - Import ITool and tool implementations
  - Get active tool from toolStore, map to tool instance
  - Delegate click: `tool.handleClick(planePos, { planeId, commandStack, world })`
  - SvgCanvas only handles: coordinate conversion, tool delegation, rendering
  - No UI changes - purely architectural refactor

### Testing

- [ ] T072a [P] Unit test for Operations in frontend/tests/unit/commands/operations.spec.ts
  - Test AddElementOp: apply adds element, undo removes it
  - Test RemoveElementOp: apply removes, undo restores (uses beforeState)
  - Test UpdateElementOp: apply updates, undo restores beforeState
  - Test operation outputs and error handling
- [ ] T073a [P] Unit test for Command base class in frontend/tests/unit/commands/command.spec.ts
  - Test addAndExecute() pattern with mock operations
  - Test incremental execution (operations run immediately)
  - Test rollback on operation failure
  - Test status transitions: Building → Committed → Undone
  - Test undo/redo reverses operations in correct order
- [ ] T074a [P] Unit test for CommandStack in frontend/tests/unit/commands/commandStack.spec.ts
  - Test execute adds to undo stack, clears redo stack
  - Test undo moves command to redo stack
  - Test redo moves command back to undo stack
  - Test canUndo/canRedo return correct booleans
- [ ] T075a [P] Unit test for CreateFreePointCommand in frontend/tests/unit/commands/createFreePointCommand.spec.ts
  - Test command execution creates point in World
  - Test command undo removes point
  - Test validation via command
- [ ] T075b [P] Unit test for PointTool in frontend/tests/unit/tools/pointTool.spec.ts
  - Test handleClick creates command
  - Test coordinate validation in tool
  - Test plane existence validation
- [ ] T076a [P] Integration test: Point creation through full stack
  - Verify: SvgCanvas click → PointTool → CreateFreePointCommand → AddElementOp → World
  - Verify undo removes point, redo restores it
  - Verify World reactivity (worldVersion) triggers correctly

**Checkpoint**: ✅ Operations → Commands → Tools → View architecture established. Point creation follows proper pattern. Ready for additional geometric features.

---

## Phase 7: Add 2D Lines

**Purpose**: Support line geometry  
**Reference**: [spec.md](./spec.md#2d-elements-explicit-entities) - 2D Elements (Lines)

**Implementation Requirements**:
- **Line Definition**: Lines MUST use point+direction representation [data-model.md §Line2D](./data-model.md#line2d-and-segment2d). Store in plane intrinsic coordinates, NOT canvas coordinates.
- **Rendering**: Lines extend infinitely (clip to viewport bounds) per [spec.md §2D Elements](./spec.md#2d-elements-edited-in-projection-views). Use SVG line with proper clipping.
- **Dependencies**: Lines depend on defining points. Must update when points move per [spec.md §Parametric Behavior](./spec.md#parametric-behavior-and-dependencies).
- **General Algorithms**: Use principle-based geometric calculations per [constitution.md Principle IV](../../.specify/memory/constitution.md#principle-iv-principle-based-rendering-no-hardcoded-cases). No special cases for horizontal/vertical lines.
- **Visual States**: Apply hover/selection states from [ui-spec.md §Visual Feedback](./ui-spec.md#visual-feedback-hover-and-selection).

**⚠️ CRITICAL**: Study [constitution.md Principle IV](../../.specify/memory/constitution.md#principle-iv-principle-based-rendering-no-hardcoded-cases) - ALL geometry must use general algorithms, not hardcoded special cases.

- [X] T040 [P] Create Line class in frontend/src/domain/world/Line.ts with two Point endpoints
- [X] T041 Add line storage to World class
- [X] T042 Render lines as SVG line elements in SvgCanvas.vue
- [X] T043 [P] Apply line styling (color, stroke width)
- [ ] T044 [P] Unit test for Line class in frontend/tests/unit/domain/line.spec.ts

**Checkpoint**: Lines can be stored and rendered

---

## Phase 8: Line Creation Tool (US2 - Partial)

**Purpose**: Create lines between points  
**Reference**: [spec.md](./spec.md#us2-create-points-lines-circles) - US2 Create Points, Lines, Circles

**Implementation Requirements**:
- **User Story**: Implement [spec.md §US2](./spec.md#us2-create-points-lines-circles) workflow - Select Line tool → click two points (with snapping) → create line.
- **Command Pattern**: Line creation MUST use Command pattern per [constitution.md Principle II](../../.specify/memory/constitution.md#principle-ii-command-pattern-for-undoability).
- **Point Snapping**: Implement [ui-spec.md §Snapping](./ui-spec.md#snapping-behavior) - Detect nearby points within snap radius, provide visual feedback.
- **Two-Click Workflow**: First click selects start point, second click selects end point, line created immediately.
- **Active Plane**: Only create lines on currently active projection plane per [spec.md §Active Projection Plane](./spec.md#coordinate-system-monge-projection).
- **Paper-Level Hit Testing**: Snapping/selection handled by Paper layer, not tools. Paper applies inverse transforms for correct coordinate space matching.

**⚠️ CRITICAL**: Read [ui-spec.md §Tool Interactions](./ui-spec.md#tool-interactions) to understand standard tool workflow patterns.

- [X] T045 Add "Line" tool button to Toolbar
- [X] T046 Implement Paper.hitTest() for spatial queries
  - Add HitResult interface with elementId, type, distance
  - Add Paper.hitTest(canvasPos: Vector3, snapRadius: number) method (homogeneous coords)
  - Transform snap radius through inverse viewport/plane transforms
  - Search primitives in paper space, return closest within radius
  - Support point primitives (distance to point)
  - Support line primitives (distance to infinite line)
  - Support circle primitives (distance to perimeter)
- [X] T047 Implement point snapping logic (detect nearby points within radius)
  - DONE: Refactored to use Paper.hitTest() with Vector3 homogeneous coordinates
  - Removed temporary findNearestPoint() method from LineTool
  - Proper coordinate space handling through Paper's inverse transforms
- [X] T048 Add visual feedback for snapped point (highlight)
  - Added mousemove handler in SvgCanvas calling Paper.hitTest()
  - Update Paper.setHoveredElement() based on hit result
  - Pass hoveredElementId to PaperService via highlightedEntityIds
  - PaperService applies hover styling (light blue #6BB6FF for free points, pink #FF6B9D for intersections, thicker stroke)
- [X] T049 Implement two-point selection for line tool
- [X] T050 Create Line instance from two selected points
- [X] T051 Add line to World and re-render
- [ ] T052 [P] E2E test for line creation in frontend/tests/e2e/create-line.spec.ts

**Checkpoint**: User can create lines between points with snapping (US2 partial)

---

## Phase 9: Add Process Tree

**Purpose**: Track construction history  
**Reference**: [spec.md](./spec.md#process-tree) - Process Tree structure, [data-model.md](./data-model.md#process-tree) - ProcessTree data model

**Implementation Requirements**:
- **Process Tree Structure**: Follow [data-model.md §ProcessTree](./data-model.md#process-tree) - Sequential list of Actions with inputs/outputs/dependencies.
- **Action Recording**: EVERY geometric construction MUST create Action in process tree per [spec.md §Process Tree](./spec.md#process-tree). Actions record: type, inputs, outputs, parameters.
- **Dependency Tracking**: Actions must track element dependencies per [spec.md §Parametric Behavior](./spec.md#parametric-behavior-and-dependencies). When input changes, dependent actions recalculate.
- **Infeasibility Handling**: Follow [spec.md §Infeasibility](./spec.md#parametric-behavior-and-dependencies) - Case A (blocked immediately) vs Case B (mark infeasible, keep in history).
- **Pedagogical Transparency**: Process tree visible to user per [constitution.md Principle VIII](../../.specify/memory/constitution.md#principle-viii-pedagogical-transparency).

**⚠️ CRITICAL**: Study [spec.md §Process Tree](./spec.md#process-tree) thoroughly - this is central to the application's parametric and pedagogical design.

- [ ] T053 [P] Create ProcessTree class in frontend/src/domain/processTree/ProcessTree.ts
- [ ] T054 [P] Create Action interface in frontend/src/domain/processTree/Action.ts
- [ ] T055 [P] Create CreatePointAction class in frontend/src/domain/processTree/actions/CreatePointAction.ts
- [ ] T056 [P] Create CreateLineAction class in frontend/src/domain/processTree/actions/CreateLineAction.ts
- [ ] T057 Add ProcessTree instance to World
- [ ] T058 Record CreatePointAction when point created
- [ ] T059 Record CreateLineAction when line created
- [ ] T060 [P] Unit test for ProcessTree in frontend/tests/unit/processTree/processTree.spec.ts
- [ ] T061 [P] Unit test for Action classes in frontend/tests/unit/processTree/actions.spec.ts

**Checkpoint**: Construction actions tracked in process tree (US6 partial - history tracking)

---

## Phase 10: Command Pattern

**Purpose**: Undoable operations  
**Reference**: [constitution.md](../../.specify/memory/constitution.md#principle-ii-command-pattern-for-all-user-actions) - Command Pattern Principle

**Implementation Requirements**:
- **Constitutional Requirement**: ALL user actions MUST use Command pattern per [constitution.md Principle II](../../.specify/memory/constitution.md#principle-ii-command-pattern-for-undoability). No direct World mutations.
- **Command Interface**: Commands must implement execute(), undo(), validate() methods per [data-model.md §Command Pattern](./data-model.md#command-pattern).
- **CommandStack**: Maintain undo/redo stacks. Execute pushes to undo stack, clears redo stack. Undo pops from undo, pushes to redo.
- **World Consistency**: Undo/redo MUST maintain World + ProcessTree consistency. When undoing, remove corresponding Action from process tree.
- **Keyboard Shortcuts**: Ctrl+Z (undo), Ctrl+Shift+Z or Ctrl+Y (redo) per [ui-spec.md §Keyboard Shortcuts](./ui-spec.md#keyboard-shortcuts).

**⚠️ CRITICAL**: Read [constitution.md Principle II](../../.specify/memory/constitution.md#principle-ii-command-pattern-for-undoability) - Command pattern is MANDATORY for ALL user actions.

- [ ] T062 [P] Create Command interface in frontend/src/commands/Command.ts with execute/undo/validate
- [ ] T063 [P] Create CommandStack class in frontend/src/commands/CommandStack.ts
- [ ] T064 [P] Create CreateFreePointCommand in frontend/src/commands/CreateFreePointCommand.ts
- [ ] T065 [P] Create CreateLineCommand in frontend/src/commands/CreateLineCommand.ts
- [ ] T066 Refactor point creation to use CreateFreePointCommand
- [ ] T067 Refactor line creation to use CreateLineCommand
- [ ] T068 Add Undo button to toolbar
- [ ] T069 Add Redo button to toolbar
- [ ] T070 Implement Ctrl+Z keyboard shortcut for undo
- [ ] T071 Implement Ctrl+Y keyboard shortcut for redo
- [ ] T072 [P] Unit test for CommandStack in frontend/tests/unit/commands/commandStack.spec.ts
- [ ] T073 [P] Unit test for CreateFreePointCommand in frontend/tests/unit/commands/createFreePoint.spec.ts
- [ ] T074 [P] E2E test for undo/redo in frontend/tests/e2e/undo-redo.spec.ts

**Checkpoint**: All operations undoable/redoable (Constitution Principle II satisfied)

---

## Phase 11: Add Segments (US2 - Partial)

**Purpose**: Finite line segments  
**Reference**: [spec.md](./spec.md#2d-elements-explicit-entities) - 2D Elements (Segments)

**Implementation Requirements**:
- **Segment Definition**: Segments defined by two Point2D references per [data-model.md §Segment2D](./data-model.md#line2d-and-segment2d). Length calculated in plane intrinsic space.
- **Rendering**: Segments render ONLY between endpoints (unlike infinite lines) per [spec.md §2D Elements](./spec.md#2d-elements-edited-in-projection-views).
- **Dependencies**: Segments depend on both endpoints. Must update when either point moves per [spec.md §Parametric Behavior](./spec.md#parametric-behavior-and-dependencies).
- **Command Pattern**: CreateSegmentCommand MUST follow [constitution.md Principle II](../../.specify/memory/constitution.md#principle-ii-command-pattern-for-undoability).
- **Visual Distinction**: Use different stroke style vs lines per [ui-spec.md §Visual Hierarchy](./ui-spec.md#visual-hierarchy).

**⚠️ CRITICAL**: Segments vs Lines - understand difference in [spec.md §Lines and Segments](./spec.md#lines-and-segments).

- [ ] T075 [P] Create Segment class in frontend/src/domain/world/Segment.ts with start/end points
- [ ] T076 Add segment storage to World
- [ ] T077 Render segments as SVG path elements in SvgCanvas.vue
- [ ] T078 Add "Segment" tool button to Toolbar
- [ ] T079 [P] Create CreateSegmentCommand in frontend/src/commands/CreateSegmentCommand.ts
- [ ] T080 Implement segment creation tool (two-point selection)
- [ ] T081 [P] Unit test for Segment class in frontend/tests/unit/domain/segment.spec.ts
- [ ] T082 [P] E2E test for segment creation in frontend/tests/e2e/create-segment.spec.ts

**Checkpoint**: User can create segments (US2 partial - more geometry types)

---

## Phase 12: Add Circles (US2 - Complete)

**Purpose**: Circle geometry  
**Reference**: [spec.md](./spec.md#2d-elements-explicit-entities) - 2D Elements (Circles), [spec.md](./spec.md#us2-create-points-lines-circles) - US2

**Implementation Requirements**:
- **Circle Definition**: Center (Point2D) + radius (scalar) per [data-model.md §Circle2D](./data-model.md#circle2d). Radius stored in plane intrinsic units.
- **User Story**: Complete [spec.md §US2](./spec.md#us2-create-points-lines-circles) - Create circles by center+radius workflow.
- **Two-Click Workflow**: First click selects center point, second click (or drag) sets radius.
- **Dependencies**: Circle depends on center point. Radius is fixed parameter per [spec.md §Parametric Behavior](./spec.md#parametric-behavior-and-dependencies).
- **Command Pattern**: CreateCircleCommand follows [constitution.md Principle II](../../.specify/memory/constitution.md#principle-ii-command-pattern-for-undoability).

**⚠️ CRITICAL**: Study [spec.md §US2](./spec.md#us2-create-points-lines-circles) for complete circle creation workflow.

- [ ] T083 [P] Create Circle class in frontend/src/domain/world/Circle.ts with center point and radius
- [ ] T084 Add circle storage to World
- [ ] T085 Render circles as SVG circle elements in SvgCanvas.vue
- [ ] T086 Add "Circle" tool button to Toolbar
- [ ] T087 [P] Create CreateCircleCommand in frontend/src/commands/CreateCircleCommand.ts
- [ ] T088 Implement circle center selection
- [ ] T089 Implement radius specification (drag or click second point)
- [ ] T090 [P] Unit test for Circle class in frontend/tests/unit/domain/circle.spec.ts
- [ ] T091 [P] E2E test for circle creation in frontend/tests/e2e/create-circle.spec.ts

**Checkpoint**: User can create circles (US2 complete for basic geometry)

---

## Phase 13: Add Guides (US3 - Complete)

**Purpose**: Guide lines perpendicular to hinge lines  
**Reference**: [spec.md](./spec.md#guides) - Guides definition, [spec.md](./spec.md#us3-create-guide-perpendicular-to-hinge-line) - US3 Create Guide

**Implementation Requirements**:
- **Guide Definition**: Line perpendicular to hinge line passing through user-specified point per [spec.md §Guides](./spec.md#guides). Always perpendicular to HL, not arbitrary angles.
- **User Story**: Implement [spec.md §US3](./spec.md#us3-create-guide-perpendicular-to-hinge-line) - Select Guide tool → click point on hinge line → guide created perpendicular to HL.
- **Homogeneous Coordinates**: Guide perpendicular calculation MUST use homogeneous coordinates per [constitution.md Principle V](../../.specify/memory/constitution.md#principle-v-homogeneous-coordinate-system).
- **Rendering**: Guides render as dashed lines extending to viewport edges per [ui-spec.md §Guide Rendering](./ui-spec.md#guide-rendering). Visual distinction from regular lines.
- **Dependencies**: Guide depends on intersection point with HL per [spec.md §Parametric Behavior](./spec.md#parametric-behavior-and-dependencies).

**⚠️ CRITICAL**: Study [spec.md §Guides](./spec.md#guides) - Guides are ALWAYS perpendicular to hinge lines, not general angle specification.

- [ ] T092 [P] Create Guide class in frontend/src/domain/world/Guide.ts (line perpendicular to HL through point)
- [ ] T093 Add guide storage to World
- [ ] T094 [P] Implement guide calculation using homogeneous coordinates - perpendicular to HL
- [ ] T095 Render guides as dashed SVG lines in SvgCanvas.vue (extend to viewport edges)
- [ ] T096 Add "Guide" tool button to Toolbar
- [ ] T097 [P] Create CreateGuideCommand in frontend/src/commands/CreateGuideCommand.ts
- [ ] T098 Implement guide creation: select HL, then select point
- [ ] T099 Apply guide on both planes sharing the HL (guide appears in both)
- [ ] T100 [P] Unit test for guide calculations in frontend/tests/unit/calculations/guides.spec.ts
- [ ] T101 [P] E2E test for guide creation in frontend/tests/e2e/guide-creation.spec.ts

**Checkpoint**: User can create guides (US3 complete)

**Constitution Note**: Guide calculations MUST use general geometric algorithms, not hardcoded for specific planes (Principle IV)

---

## Phase 14: Line-Line Intersections (US2 - Partial)

**Purpose**: Create intersection points  
**Reference**: [spec.md](./spec.md#us2-create-points-lines-circles) - US2 includes intersection points

**Implementation Requirements**:
- **Homogeneous Coordinates**: Intersection calculation MUST use homogeneous coordinates per [constitution.md Principle V](../../.specify/memory/constitution.md#principle-v-homogeneous-coordinate-system). Use cross product of line representations.
- **Edge Cases**: Handle parallel lines (no intersection), coincident lines (infinite intersections) per [data-model.md §Intersection Validation](./data-model.md#validation-and-error-handling). Return null or special indicator.
- **Infeasibility Preview**: Show immediate feedback if lines parallel per [spec.md §Infeasibility Case A](./spec.md#parametric-behavior-and-dependencies) - block creation, no modal.
- **General Algorithms**: Use principle-based calculations per [constitution.md Principle IV](../../.specify/memory/constitution.md#principle-iv-principle-based-rendering-no-hardcoded-cases). No special cases for horizontal/vertical lines.
- **Dependencies**: Intersection point depends on both lines. Must recalculate when either line changes per [spec.md §Parametric Behavior](./spec.md#parametric-behavior-and-dependencies).

**⚠️ CRITICAL**: Study [constitution.md Principle V](../../.specify/memory/constitution.md#principle-v-homogeneous-coordinate-system) - ALL intersection calculations use homogeneous coordinate cross products.

- [ ] T102 [P] Implement line-line intersection calculation in frontend/src/domain/calculations/Intersections.ts using homogeneous coordinates
- [ ] T103 Handle parallel lines (no intersection, return null)
- [ ] T104 Handle coincident lines (infinite intersections, return null or special case)
- [ ] T105 Add "Intersection" tool button to Toolbar
- [ ] T106 [P] Create CreateIntersectionPointCommand in frontend/src/commands/CreateIntersectionPointCommand.ts
- [ ] T107 Implement intersection tool: select first line
- [ ] T108 Implement intersection tool: select second line
- [ ] T109 Calculate and create point at intersection
- [ ] T110 Show error message if lines are parallel (infeasibility preview)
- [ ] T111 [P] Unit test for line-line intersection in frontend/tests/unit/calculations/intersections.spec.ts
- [ ] T112 [P] E2E test for line-line intersection in frontend/tests/e2e/intersections.spec.ts

**Checkpoint**: User can create intersection points (US2 partial)

**Constitution Note**: Intersection calculations MUST use homogeneous coordinates (Principle V) and work for any lines, not hardcoded cases (Principle IV)

---

## Phase 15: Point Transport via Guides (US4 - Complete)

**Purpose**: Transport points between planes using guides  
**Reference**: [spec.md](./spec.md#us4-transport-point-via-guide-between-planes) - US4 Point Transport via Guides

**Implementation Requirements**:
- **User Story**: Implement [spec.md §US4](./spec.md#us4-transport-point-via-guide-between-planes) - Select source point → select guide (perpendicular to HL) → transported point created on opposite plane.
- **Geometric Principle**: Guide intersects HL, provides axis for transporting point from one plane to other per [spec.md §Guides](./spec.md#guides).
- **Homogeneous Coordinates**: Transport calculation MUST use homogeneous coordinates per [constitution.md Principle V](../../.specify/memory/constitution.md#principle-v-homogeneous-coordinate-system).
- **Dependencies**: Transported point depends on source point AND guide. Must recalculate when either changes per [spec.md §Parametric Behavior](./spec.md#parametric-behavior-and-dependencies).
- **General Algorithms**: Transport MUST work for any guide/plane combination per [constitution.md Principle IV](../../.specify/memory/constitution.md#principle-iv-principle-based-rendering-no-hardcoded-cases). No hardcoded P_H/P_V cases.

**⚠️ CRITICAL**: Read [spec.md §US4](./spec.md#us4-transport-point-via-guide-between-planes) thoroughly - point transport is fundamental dihedral operation.

- [ ] T113 [P] Implement point transport calculation in frontend/src/domain/calculations/Transport.ts using geometric principles
- [ ] T114 [P] Transport MUST use homogeneous coordinates and matrix transformations (Principle V)
- [ ] T115 Validate that guide is perpendicular to hinge line
- [ ] T116 Validate that source point and target plane are compatible
- [ ] T117 Add "Transport Point" tool button to Toolbar
- [ ] T118 [P] Create TransportPointCommand in frontend/src/commands/TransportPointCommand.ts
- [ ] T119 Implement transport tool: select source point
- [ ] T120 Implement transport tool: select guide
- [ ] T121 Calculate transported point on opposite plane
- [ ] T122 Create new point at transported location
- [ ] T123 Record dependency: transported point depends on source + guide (ProcessTree)
- [ ] T124 [P] Unit test for point transport calculations in frontend/tests/unit/calculations/transport.spec.ts
- [ ] T125 [P] E2E test for point transport in frontend/tests/e2e/point-transport.spec.ts

**Checkpoint**: User can transport points between planes (US4 complete)

**Constitution Note**: Transport calculations MUST be principle-based, working for any guide/plane combination (Principle IV), using homogeneous coordinates (Principle V)

---

## Phase 16: Distance Transport (US5 - Complete)

**Purpose**: Transport distances along guides  
**Reference**: [spec.md](./spec.md#us5-transport-distance-along-guide) - US5 Distance Transport

**Implementation Requirements**:
- **User Story**: Implement [spec.md §US5](./spec.md#us5-transport-distance-along-guide) - Select reference segment → select guide → select base point → new point created at distance along guide.
- **Distance Calculation**: Measure segment length in plane intrinsic coordinates using [data-model.md §Segment2D](./data-model.md#line2d-and-segment2d). Apply along guide direction.
- **Homogeneous Coordinates**: Distance transport MUST use homogeneous coordinate transformations per [constitution.md Principle V](../../.specify/memory/constitution.md#principle-v-homogeneous-coordinate-system).
- **Dependencies**: Transported point depends on reference segment (for length) AND guide (for direction) AND base point per [spec.md §Parametric Behavior](./spec.md#parametric-behavior-and-dependencies).
- **General Algorithms**: Transport works for any guide/segment/point combination per [constitution.md Principle IV](../../.specify/memory/constitution.md#principle-iv-principle-based-rendering-no-hardcoded-cases).

**⚠️ CRITICAL**: Study [spec.md §US5](./spec.md#us5-transport-distance-along-guide) - distance transport enables complex constructions.

- [ ] T126 [P] Implement distance transport calculation in frontend/src/domain/calculations/Transport.ts
**Reference**: [spec.md](./spec.md#us5-transport-distance-via-guide) - US5 Distance Transport via Guides

- [ ] T126 [P] Implement distance transport calculation in frontend/src/domain/calculations/Transport.ts
- [ ] T127 [P] Use homogeneous coordinates for distance vector representation (Principle V)
- [ ] T128 Validate that segment and target point are on different planes
- [ ] T129 Validate that guide passes through target point
- [ ] T130 Add "Transport Distance" tool button to Toolbar
- [ ] T131 [P] Create TransportDistanceCommand in frontend/src/commands/TransportDistanceCommand.ts
- [ ] T132 Implement distance transport tool: select source segment (defines distance)
- [ ] T133 Implement distance transport tool: select guide
- [ ] T134 Implement distance transport tool: select target point
- [ ] T135 Calculate new point at transported distance from target along guide
- [ ] T136 Handle bidirectional distance (both directions from target)
- [ ] T137 Record dependency: new point depends on segment + guide + target (ProcessTree)
- [ ] T138 [P] Unit test for distance transport in frontend/tests/unit/calculations/transport.spec.ts
- [ ] T139 [P] E2E test for distance transport in frontend/tests/e2e/distance-transport.spec.ts

**Checkpoint**: User can transport distances (US5 complete)

**Constitution Note**: Distance transport MUST be derived from geometric principles, not hardcoded (Principle IV)

---

## Phase 17: More Intersection Types (US2 - Complete)

**Purpose**: Expand intersection capabilities  
**Reference**: [spec.md](./spec.md#us2-create-points-lines-circles) - US2 all intersection types

**Implementation Requirements**:
- **Intersection Types**: Implement line-circle, circle-circle per [spec.md §US2](./spec.md#us2-create-points-lines-circles). Already have line-line from Phase 14.
- **Homogeneous Coordinates**: ALL intersection algorithms MUST use homogeneous coordinates per [constitution.md Principle V](../../.specify/memory/constitution.md#principle-v-homogeneous-coordinate-system).
- **Multiple Solutions**: Handle 0, 1, or 2 intersections per [data-model.md §Intersection Validation](./data-model.md#validation-and-error-handling). Let user choose which point to create.
- **General Algorithms**: Use principle-based calculations per [constitution.md Principle IV](../../.specify/memory/constitution.md#principle-iv-principle-based-rendering-no-hardcoded-cases). No special-case geometry.
- **Dependencies**: Intersection points depend on source elements. Recalculate when sources change per [spec.md §Parametric Behavior](./spec.md#parametric-behavior-and-dependencies).

**⚠️ CRITICAL**: Study [constitution.md Principle V](../../.specify/memory/constitution.md#principle-v-homogeneous-coordinate-system) for intersection calculation techniques.

- [ ] T140 [P] Implement line-circle intersection in frontend/src/domain/calculations/Intersections.ts using homogeneous coordinates
- [ ] T141 Handle 0, 1, or 2 intersection points for line-circle
- [ ] T142 [P] Implement circle-circle intersection using homogeneous coordinates
- [ ] T143 Handle 0, 1, or 2 intersection points for circle-circle
- [ ] T144 Extend "Intersection" tool to support line-circle selection
- [ ] T145 Extend "Intersection" tool to support circle-circle selection
- [ ] T146 When multiple intersection points exist, allow user to choose which to create
- [ ] T147 [P] Unit tests for line-circle and circle-circle intersections in frontend/tests/unit/calculations/intersections.spec.ts
- [ ] T148 [P] E2E tests for all intersection types in frontend/tests/e2e/intersections.spec.ts

**Checkpoint**: All intersection types supported (US2 complete for intersections)

**Constitution Note**: All intersection algorithms MUST use homogeneous coordinates (Principle V) and general geometric algorithms (Principle IV)

---

## Phase 18: Actions Panel

**Purpose**: Display construction history in UI  
**Reference**: [ui-spec.md](./ui-spec.md#actions-panel-left-sidebar) - Actions Panel specification

**Implementation Requirements**:
- **Panel Structure**: Follow [ui-spec.md §Left Panel Stack](./ui-spec.md#left-panel-stack) - Actions Panel in left sidebar, vertically stacked with Process Panel.
- **Action Display**: Show process tree actions per [ui-spec.md §Actions Panel](./ui-spec.md#actions-panel-left-sidebar) - List with type, parameters, dependencies, status.
- **Interactive**: Click action → highlight related elements on canvas per [ui-spec.md §Unified Hover Highlighting](./ui-spec.md#visual-feedback-hover-and-selection).
- **Filtering**: Filter by action type, search by name/parameters per [ui-spec.md §Actions Panel](./ui-spec.md#actions-panel-left-sidebar).
- **Pedagogical Transparency**: Actions Panel exposes construction logic per [constitution.md Principle VIII](../../.specify/memory/constitution.md#principle-viii-pedagogical-transparency).

**⚠️ CRITICAL**: Review [ui-spec.md §Actions Panel](./ui-spec.md#actions-panel-left-sidebar) for complete panel specification including visual hierarchy.

- [ ] T149 [P] Create ActionsPanel.vue component in frontend/src/components/panels/
- [ ] T150 Retrieve actions from ProcessTree and display as list
- [ ] T151 Show action type, parameters, and dependencies for each action
- [ ] T152 Add filter dropdown to filter by action type
- [ ] T153 Add search input to search actions by name/parameters
- [ ] T154 Implement click handler to highlight related objects on canvas when action selected
- [ ] T155 Add icon/indicator for action status (complete, infeasible, pending)
- [ ] T156 Mount ActionsPanel in App.vue left sidebar
- [ ] T157 [P] Unit test for ActionsPanel in frontend/tests/unit/components/actionsPanel.spec.ts

**Checkpoint**: Construction history visible and interactive

---

## Phase 19: Elements Panel

**Purpose**: Display all geometric objects  
**Reference**: [ui-spec.md](./ui-spec.md#elements-panel-right-sidebar) - Elements Panel specification

**Implementation Requirements**:
- **Panel Structure**: Follow [ui-spec.md §World Elements Panel](./ui-spec.md#world-elements-panel) - Hierarchical tree: 2D Elements (by plane) and 3D Elements (by type).
- **Organization**: Group 2D elements by projection plane (P_H, P_V), then by type (points, lines, etc.) per [ui-spec.md §Organization Rules](./ui-spec.md#world-elements-panel).
- **Naming Convention**: Use subscript notation (a_H, b_V) per [spec.md §Naming Conventions](./spec.md#coordinate-system-monge-projection) and [ui-spec.md §Naming Convention Note](./ui-spec.md#world-elements-panel).
- **Interactive**: Click element → open properties dialog; hover element → highlight on canvas per [ui-spec.md §Interactions](./ui-spec.md#world-elements-panel).
- **Dynamic Counts**: Show element counts in parentheses per [ui-spec.md §Organization Rules](./ui-spec.md#world-elements-panel).

**⚠️ CRITICAL**: Study [ui-spec.md §World Elements Panel](./ui-spec.md#world-elements-panel) tree structure carefully - hierarchical organization is key.

- [ ] T158 [P] Create ElementsPanel.vue component in frontend/src/components/panels/
- [ ] T159 Retrieve all elements from World and display as list
- [ ] T160 Organize elements by type (Points, Lines, Segments, Circles, Guides)
- [ ] T161 Show element labels, IDs, and key properties (coordinates, etc.)
- [ ] T162 Add filter to show/hide element types
- [ ] T163 Add search to find elements by label or ID
- [ ] T164 Implement click handler to highlight element on canvas when selected
- [ ] T165 Add visibility toggle for each element (show/hide)
- [ ] T166 Mount ElementsPanel in App.vue right sidebar
- [ ] T167 [P] Unit test for ElementsPanel in frontend/tests/unit/components/elementsPanel.spec.ts

**Checkpoint**: All geometric objects visible in panel

---

## Phase 20: Object Selection

**Purpose**: Select objects on canvas  
**Reference**: [ui-spec.md](./ui-spec.md#interactions) - Selection behavior

**Implementation Requirements**:
- **Selection Model**: Single-select (click) and multi-select (Ctrl+click) per [ui-spec.md §Selection Interactions](./ui-spec.md#interactions).
- **Visual Feedback**: Apply selection highlight per [ui-spec.md §Visual Feedback](./ui-spec.md#visual-feedback-hover-and-selection) - Distinct from hover state.
- **Bidirectional Sync**: Selection syncs between canvas, Elements Panel, and Actions Panel per [ui-spec.md §Unified Hover Highlighting](./ui-spec.md#visual-feedback-hover-and-selection).
- **Clear Selection**: Click empty canvas area clears selection per [ui-spec.md §Interactions](./ui-spec.md#interactions).
- **Store Pattern**: Use selectionStore to manage selection state globally per [data-model.md §View State](./data-model.md#view-state).

**⚠️ CRITICAL**: Review [ui-spec.md §Visual Feedback](./ui-spec.md#visual-feedback-hover-and-selection) for selection vs hover visual states.

- [ ] T168 [P] Create selectionStore in frontend/src/stores/selectionStore.ts
- [ ] T169 Implement click detection for objects on SVG canvas
- [ ] T170 Add selected object ID to selectionStore on click
- [ ] T171 Apply selection highlight style to selected objects (different stroke/fill)
- [ ] T172 Implement Ctrl+click for multi-select (add to selection)
- [ ] T173 Implement click on empty area to clear selection
- [ ] T174 Sync selection between canvas and ElementsPanel (bidirectional)
- [ ] T175 Sync selection between canvas and ActionsPanel (show related actions)
- [ ] T176 [P] Unit test for selectionStore in frontend/tests/unit/stores/selectionStore.spec.ts
- [ ] T177 [P] E2E test for object selection in frontend/tests/e2e/selection.spec.ts

**Checkpoint**: Objects can be selected on canvas and panels

---

## Phase 21: Hover Highlighting (US6 - Partial)

**Purpose**: Visual feedback on hover  
**Reference**: [spec.md](./spec.md#us6-hover-highlighting-visual-style-editing-3d-view) - US6 Hover Highlighting

**Implementation Requirements**:
- **User Story**: Implement [spec.md §US6](./spec.md#us6-hover-highlighting-visual-style-editing-3d-view) hover feedback - Mouse over element → element highlights, label shows.
- **Unified Highlighting**: Follow [ui-spec.md §Unified Hover Highlighting](./ui-spec.md#visual-feedback-hover-and-selection) - Hover in panel highlights canvas element, hover on canvas highlights panel entry.
- **Visual States**: Hover highlight distinct from selection highlight per [ui-spec.md §Visual Feedback](./ui-spec.md#visual-feedback-hover-and-selection). Use lighter stroke or glow.
- **Tooltips**: Show element label/ID on hover per [ui-spec.md §Hover Behavior](./ui-spec.md#visual-feedback-hover-and-selection).
- **Snap Preview**: Show snap visual when hovering near points per [ui-spec.md §Snapping Behavior](./ui-spec.md#snapping-behavior).

**⚠️ CRITICAL**: Study [ui-spec.md §Unified Hover Highlighting](./ui-spec.md#visual-feedback-hover-and-selection) - hover must work across all UI components.

- [ ] T178 [P] Create useHoverHighlight composable in frontend/src/composables/useHoverHighlight.ts
- [ ] T179 Implement mouseover detection for objects on canvas
- [ ] T180 Apply hover highlight style (different from selection, e.g., lighter stroke)
- [ ] T181 Show object label/tooltip on hover
- [ ] T182 Clear hover highlight on mouseout
- [ ] T183 Ensure hover highlight doesn't interfere with selection highlight
- [ ] T184 Show snap preview when hovering near points (for snapping feedback)
- [ ] T185 [P] Unit test for useHoverHighlight in frontend/tests/unit/composables/hoverHighlight.spec.ts
- [ ] T186 [P] E2E test for hover highlighting in frontend/tests/e2e/hover.spec.ts

**Checkpoint**: User can see visual feedback on hover (US6 partial)

---

## Phase 22: Element Properties (US6 - Complete)

**Purpose**: View and edit object properties  
**Reference**: [spec.md](./spec.md#us6-hover-highlighting-visual-style-editing-3d-view) - US6 Visual Style Editing, [ui-spec.md](./ui-spec.md#visual-style-inheritance) - Style Inheritance

**Implementation Requirements**:
- **User Story**: Complete [spec.md §US6](./spec.md#us6-hover-highlighting-visual-style-editing-3d-view) - Double-click element → properties dialog → edit visual styles (color, stroke, etc.).
- **Properties Dialog**: Follow [ui-spec.md §Element Properties Dialog](./ui-spec.md#element-properties-dialog) - Show all editable properties based on element type.
- **Style Inheritance**: Implement [ui-spec.md §Visual Style Inheritance](./ui-spec.md#visual-style-inheritance) - Elements inherit tool defaults, can override individually.
- **Property Types**: Point (coordinates, label), Line/Segment (color, stroke), Circle (color, stroke, fill), Guide (dash pattern) per [ui-spec.md §Element Properties Dialog](./ui-spec.md#element-properties-dialog).
- **Validation**: Property changes must maintain element validity per [data-model.md §Validation](./data-model.md#validation-and-error-handling).

**⚠️ CRITICAL**: Read [ui-spec.md §Visual Style Inheritance](./ui-spec.md#visual-style-inheritance) to understand inheritance vs override system.

- [ ] T187 [P] Create PropertiesDialog.vue component in frontend/src/components/dialogs/
- [ ] T188 Show dialog when user double-clicks object or clicks "Properties" button
- [ ] T189 Display all editable properties based on element type:
  - Point: x, y, label, visibility
  - Line/Segment: color, stroke width, line style (solid/dashed)
  - Circle: color, stroke width, fill color, fill opacity
  - Guide: color, dash pattern
- [ ] T190 [P] Create color picker component for color selection
- [ ] T191 Create stroke width slider input
- [ ] T192 Create line style selector (solid, dashed, dotted)
- [ ] T193 Apply property changes to selected object(s) immediately (or on "Apply" button)
- [ ] T194 Implement style inheritance system (objects inherit from tool defaults)
- [ ] T195 Add "Override inherited style" checkbox for each property
- [ ] T196 Add "Reset to inherited" button to restore default styles
- [ ] T197 Show indicator for which styles are overridden
- [ ] T198 Validate property changes (e.g., coordinates must keep point on same plane)
- [ ] T199 [P] Unit test for PropertiesDialog in frontend/tests/unit/components/propertiesDialog.spec.ts
- [ ] T200 [P] E2E test for property editing in frontend/tests/e2e/properties.spec.ts

**Checkpoint**: User can edit element properties and visual styles (US6 complete for styling)

---

## Phase 23: Dependency Tracking

**Purpose**: Track which objects depend on others  
**Reference**: [spec.md](./spec.md#process-tree) - Process Tree tracks dependencies

**Implementation Requirements**:
- **Process Tree Dependencies**: Follow [spec.md §Process Tree](./spec.md#process-tree) - Every Action records input/output dependencies.
- **Parametric Updates**: When base element changes, recalculate ALL dependent elements per [spec.md §Parametric Behavior](./spec.md#parametric-behavior-and-dependencies). Cascading updates.
- **Dependency Graph**: Implement bidirectional lookup: getDependents() and getDependencies() per [data-model.md §ProcessTree](./data-model.md#process-tree).
- **Circular Dependency Prevention**: Validate no circular dependencies during command execution per [data-model.md §Validation](./data-model.md#validation-and-error-handling).
- **Visual Indicators**: Show dependency relationships in panels per [ui-spec.md §Actions Panel](./ui-spec.md#actions-panel-left-sidebar).

**⚠️ CRITICAL**: Study [spec.md §Parametric Behavior](./spec.md#parametric-behavior-and-dependencies) - dependency tracking enables parametric drawing.

- [ ] T201 [P] Create DependencyService in frontend/src/services/DependencyService.ts
- [ ] T202 [P] Store dependencies in ProcessTree when actions are executed
- [ ] T203 Implement dependency recording: when creating derived object, record its dependencies
- [ ] T204 [P] Implement getDependents(elementId) to find all objects that depend on given element
- [ ] T205 [P] Implement getDependencies(elementId) to find all elements that given object depends on
- [ ] T206 When element changes (e.g., point moved), update all dependent objects
- [ ] T207 Add visual indicators in ActionsPanel showing dependencies (arrows/tree links)
- [ ] T208 Add visual indicators in ElementsPanel showing which elements have dependencies
- [ ] T209 Prevent circular dependencies during validation
- [ ] T210 [P] Unit test for DependencyService in frontend/tests/unit/services/dependencyService.spec.ts
- [ ] T211 [P] E2E test for dependency tracking in frontend/tests/e2e/dependencies.spec.ts

**Checkpoint**: Dependencies tracked and objects update when sources change

---

## Phase 24: Infeasibility Detection

**Purpose**: Detect and handle geometrically impossible operations  
**Reference**: [spec.md](./spec.md#infeasibility) - Infeasibility concept and handling, [spec.md](./spec.md#us2-create-points-lines-circles) - US2 intersection infeasibility

**Implementation Requirements**:
- **Infeasibility Types**: Follow [spec.md §Infeasibility](./spec.md#parametric-behavior-and-dependencies) - Case A (block immediately) vs Case B (mark infeasible, keep in history).
- **Case A**: New construction invalid at creation → report immediately, create NO element, ignore action per [spec.md §Infeasibility Case A](./spec.md#parametric-behavior-and-dependencies).
- **Case B**: Previously valid construction becomes infeasible → keep in history, mark infeasible, hide outputs, show visual indicators per [spec.md §Infeasibility Case B](./spec.md#parametric-behavior-and-dependencies).
- **Validation Rules**: Parallel lines (no intersection), perpendicularity checks, geometric constraints per [data-model.md §Validation](./data-model.md#validation-and-error-handling).
- **Cascading**: If parent infeasible, all children infeasible per [spec.md §Parametric Behavior](./spec.md#parametric-behavior-and-dependencies). Dynamic revalidation when dependencies change.
- **Non-Modal Feedback**: NO modal dialogs. Use visual indicators (red highlights, warnings) per [spec.md §Infeasibility](./spec.md#parametric-behavior-and-dependencies).

**⚠️ CRITICAL**: Read [spec.md §Infeasibility](./spec.md#parametric-behavior-and-dependencies) completely - distinction between Case A and Case B is essential.

- [ ] T212 [P] Create ValidationService in frontend/src/services/ValidationService.ts
- [ ] T213 Implement validation for line-line intersection: detect parallel lines (return infeasible)
- [ ] T214 Implement validation for point transport: verify guide is perpendicular to hinge
- [ ] T215 Implement validation for distance transport: verify all geometric constraints
- [ ] T216 [P] Add infeasibility status to Action nodes in ProcessTree (feasible/infeasible)
- [ ] T217 Mark action as infeasible in ProcessTree when validation fails
- [ ] T218 Cascade infeasibility to dependent objects (if parent infeasible, children infeasible)
- [ ] T219 Display infeasible actions in ActionsPanel with red indicator
- [ ] T220 Display infeasible elements in ElementsPanel with red color/warning icon
- [ ] T221 Show error message/tooltip explaining why operation is infeasible
- [ ] T222 Prevent execution of operations that depend on infeasible objects
- [ ] T223 Dynamically revalidate when dependencies change (infeasibility may resolve)
- [ ] T224 [P] Unit test for ValidationService in frontend/tests/unit/services/validationService.spec.ts
- [ ] T225 [P] E2E test for infeasibility detection in frontend/tests/e2e/infeasibility.spec.ts

**Checkpoint**: Infeasible operations detected and marked (US2, US4, US5 complete for error handling)

**Constitution Note**: Validation MUST be based on geometric principles, not hardcoded cases (Principle IV)

---

## Phase 25: 3D View Panel (US6 - Complete)

**Purpose**: Display 3D reconstruction of dihedral geometry  
**Reference**: [spec.md](./spec.md#workspace-and-views) - 3D View (Auxiliary, Read-Only), [spec.md](./spec.md#3d-elements-derived-not-edited) - 3D element derivation

**Implementation Requirements**:
- **3D View Purpose**: Auxiliary, read-only view per [spec.md §Workspace and Views](./spec.md#workspace-and-views). Helps understanding, NOT for construction.
- **3D Derivation**: Calculate 3D coordinates from 2D projections per [spec.md §3D Elements](./spec.md#3d-elements-derived-not-edited). Use [data-model.md §Coordinate Systems](./data-model.md#coordinate-systems-and-transformations) transformations.
- **Homogeneous Coordinates**: 3D derivation MUST use homogeneous coordinates per [constitution.md Principle V](../../.specify/memory/constitution.md#principle-v-homogeneous-coordinate-system).
- **General Algorithms**: 3D reconstruction MUST work for any projection plane, not hardcoded for P_H/P_V per [constitution.md Principle IV](../../.specify/memory/constitution.md#principle-iv-principle-based-rendering-no-hardcoded-cases).
- **Rendering Technology**: Use Three.js for full 3D capabilities or CSS 3D transforms for simpler approach per [ui-spec.md §3D View](./ui-spec.md#3d-view-overlay).
- **Interaction**: Orbit camera, pan, zoom. No editing. Selection sync with 2D view per [ui-spec.md §3D View](./ui-spec.md#3d-view-overlay).

**⚠️ CRITICAL**: Study [spec.md §3D Elements](./spec.md#3d-elements-derived-not-edited) - 3D elements are DERIVED from 2D projections, not direct edits.

- [ ] T226 [P] Create ThreeDView.vue component in frontend/src/components/panels/
- [ ] T227 Choose 3D rendering approach: CSS 3D transforms (simple) or Three.js (full-featured)
- [ ] T228 Set up 3D scene with projection planes (P_V and P_H) in 3D space
- [ ] T229 Render hinge line (HL_HV) in 3D
- [ ] T230 [P] Implement 3D point derivation: calculate 3D coordinates from 2D projections using homogeneous coordinates (Principle V)
- [ ] T231 [P] Implement 3D line derivation: construct 3D lines from 2D projections
- [ ] T232 Render 3D objects derived from 2D projections in 3D view
- [ ] T233 [P] 3D derivation MUST use geometric principles, not hardcoded for specific planes (Principle IV)
- [ ] T234 Implement 3D rotation with mouse drag
- [ ] T235 Implement 3D pan and zoom
- [ ] T236 Color-code planes and objects (match 2D colors)
- [ ] T237 Add toggle controls for plane visibility (show/hide P_V, P_H)
- [ ] T238 Highlight 3D objects when corresponding 2D objects selected
- [ ] T239 Mount ThreeDView panel in App.vue (floating overlay or docked panel)
- [ ] T240 [P] Unit test for 3D derivation calculations in frontend/tests/unit/calculations/derivation3D.spec.ts
- [ ] T241 [P] E2E test for 3D view in frontend/tests/e2e/3d-view.spec.ts

**Checkpoint**: 3D reconstruction visible (US6 complete)

**Constitution Note**: 3D derivation MUST use homogeneous coordinates (Principle V) and work for any plane configuration (Principle IV)

---

## Phase 26: File Save/Load (US1 - Complete)

**Purpose**: Persist projects to files  
**Reference**: [spec.md](./spec.md#us1-place-point-on-active-plane) - US1 includes persistence requirement, [contracts/api.yaml](./contracts/api.yaml) - API contracts

**Implementation Requirements**:
- **REST API**: Follow [contracts/api.yaml](./contracts/api.yaml) - Implement POST/GET/PUT/DELETE endpoints for project CRUD operations.
- **Serialization**: Serialize complete World state (elements, ProcessTree, view state) to JSON per [data-model.md §Project Serialization](./data-model.md#project-serialization).
- **Version Compatibility**: Include version number in JSON format for future compatibility per [data-model.md §Project Serialization](./data-model.md#project-serialization).
- **Auto-Save**: Implement configurable auto-save (default 60s) per [ui-spec.md §Settings](./ui-spec.md#settings).
- **File Storage**: Backend stores projects as JSON files in backend/data/projects/ directory per [contracts/api.yaml](./contracts/api.yaml).
- **Unsaved Changes**: Track modified state, prompt before closing per [ui-spec.md §Application Lifecycle](./ui-spec.md#application-lifecycle).

**⚠️ CRITICAL**: Read [contracts/api.yaml](./contracts/api.yaml) for exact API endpoint specifications and data formats.

- [ ] T242 [P] Create ProjectService in frontend/src/services/ProjectService.ts
- [ ] T243 Implement World serialization to JSON (serialize all elements, ProcessTree, view state)
- [ ] T244 Implement World deserialization from JSON (reconstruct all objects)
- [ ] T245 Add version number to JSON format for future compatibility
- [ ] T246 Validate loaded JSON data (check structure, types, required fields)
- [ ] T247 Create backend API endpoint: POST /api/projects (create new project file)
- [ ] T248 Create backend API endpoint: GET /api/projects (list all project files)
- [ ] T249 Create backend API endpoint: GET /api/projects/:id (load project by ID)
- [ ] T250 Create backend API endpoint: PUT /api/projects/:id (update existing project)
- [ ] T251 Create backend API endpoint: DELETE /api/projects/:id (delete project)
- [ ] T252 Implement file storage in backend/src/storage/FileStorage.ts (write/read JSON files)
- [ ] T253 Add "Save" button to toolbar/menu
- [ ] T254 Add "Load" button to toolbar/menu
- [ ] T255 Add "New" button to clear workspace and start fresh
- [ ] T256 Implement auto-save every N seconds (configurable, default 60s)
- [ ] T257 Store unsaved changes indicator in UI (show "modified" status)
- [ ] T258 Prompt user to save before closing/navigating away (if unsaved changes)
- [ ] T259 [P] Unit test for serialization/deserialization in frontend/tests/unit/services/projectService.spec.ts
- [ ] T260 [P] Integration test for backend API in backend/tests/integration/projects.spec.ts
- [ ] T261 [P] E2E test for save/load in frontend/tests/e2e/persistence.spec.ts

**Checkpoint**: Projects can be saved and loaded (US1 complete)

---

## Phase 27: Additional UI Polish

**Purpose**: Improve overall user experience  
**Reference**: [ui-spec.md](./ui-spec.md#settings) - Settings and preferences, [spec.md](./spec.md#workspace-and-views) - Navigation shortcuts

**Implementation Requirements**:
- **Settings Dialog**: Follow [ui-spec.md §Settings](./ui-spec.md#settings) - Configure snap radius, grid, default styles, auto-save interval, keyboard shortcuts.
- **Keyboard Shortcuts**: Implement [ui-spec.md §Keyboard Shortcuts](./ui-spec.md#keyboard-shortcuts) - Standard shortcuts (Ctrl+S, Ctrl+Z, etc.) and tool shortcuts (P, L, C, G).
- **Grid Display**: Implement zoom-adaptive grid per [ui-spec.md §Grid](./ui-spec.md#grid-display). Grid spacing adjusts with zoom level.
- **Status Bar**: Show current coordinates, active plane, active tool per [ui-spec.md §Status Bar](./ui-spec.md#status-bar).
- **Preferences Persistence**: Store settings in localStorage per [ui-spec.md §Settings](./ui-spec.md#settings). Load on startup.
- **Fit to View**: Implement zoom-to-fit functionality per [ui-spec.md §Viewport Navigation](./ui-spec.md#viewport-navigation).

**⚠️ CRITICAL**: Review [ui-spec.md §Keyboard Shortcuts](./ui-spec.md#keyboard-shortcuts) for complete shortcut specification.

- [ ] T262 [P] Create SettingsDialog.vue component in frontend/src/components/dialogs/
- [ ] T263 Add settings for snap radius (configurable distance for point snapping)
- [ ] T264 Add settings for grid (enabled, spacing, color, snap-to-grid option)
- [ ] T265 Add settings for default object styles (default colors, stroke widths)
- [ ] T266 Add settings for auto-save interval
- [ ] T267 Add keyboard shortcuts customization panel
- [ ] T268 Implement Ctrl+S keyboard shortcut for Save
- [ ] T269 Implement Ctrl+O keyboard shortcut for Open
- [ ] T270 Implement Ctrl+N keyboard shortcut for New project
- [ ] T271 Implement Ctrl+A keyboard shortcut for Select All
- [ ] T272 Implement Delete/Backspace key for deleting selected objects
- [ ] T273 Implement Esc key to cancel current operation/deselect
- [ ] T274 Implement tool keyboard shortcuts (P for Point, L for Line, S for Segment, C for Circle, G for Guide)
- [ ] T275 Add "Fit to View" button and Ctrl+0 shortcut (zoom to show all objects)
- [ ] T276 Implement grid display with zoom-adaptive spacing
- [ ] T277 Add grid toggle button (show/hide grid)
- [ ] T278 Create StatusBar.vue component showing current mouse coordinates in world space
- [ ] T279 Show active plane indicator in status bar
- [ ] T280 Show active tool name in status bar
- [ ] T281 Persist user preferences to localStorage
- [ ] T282 Load preferences on application startup
- [ ] T283 [P] Unit test for settings persistence in frontend/tests/unit/stores/settingsStore.spec.ts
- [ ] T284 [P] E2E test for keyboard shortcuts in frontend/tests/e2e/keyboard-shortcuts.spec.ts

**Checkpoint**: Polished user experience with keyboard shortcuts, settings, and grid (All user stories refined)

---

## Testing & Documentation (Phase 28)

**Purpose**: Ensure quality and document the system

**Implementation Requirements**:
- **Test Coverage**: Achieve >80% code coverage per [constitution.md Principle IX](../../.specify/memory/constitution.md#principle-ix-test-driven-quality). All [P] priority tasks include unit/E2E tests.
- **E2E Coverage**: Test all user stories (US1-US6) end-to-end per [spec.md §User Stories](./spec.md#user-stories). Verify complete workflows.
- **Documentation Standards**: Follow [constitution.md Principle VIII](../../.specify/memory/constitution.md#principle-viii-pedagogical-transparency) - Document for learning and understanding.
- **Architecture Documentation**: Document layered architecture per [constitution.md Principle I](../../.specify/memory/constitution.md#principle-i-layered-architecture), coordinate systems per [data-model.md §Coordinate Systems](./data-model.md#coordinate-systems-and-transformations).
- **User Guide**: Create comprehensive user documentation covering all tools, workflows, concepts per [spec.md](./spec.md).
- **Performance Targets**: Smooth rendering with 200+ elements, hover response <100ms per [ui-spec.md §Performance](./ui-spec.md#performance-requirements).

**⚠️ CRITICAL**: Review ALL constitutional principles in [constitution.md](../../.specify/memory/constitution.md) - ensure implementation compliance.

- [ ] T285 Review all unit tests ([P] priority tasks) - ensure coverage >80%
- [ ] T286 Review all E2E tests - ensure all user workflows covered
- [ ] T287 Create user documentation in docs/user-guide.md
- [ ] T288 Document all tools and operations
- [ ] T289 Create example constructions for documentation
- [ ] T290 Create developer documentation in docs/developer-guide.md
- [ ] T291 Document architecture and layers
- [ ] T292 Document data model and ProcessTree
- [ ] T293 Document coordinate systems and transformations
- [ ] T294 Document homogeneous coordinate usage (Constitution Principle V)
- [ ] T295 Add JSDoc comments to all classes and public methods
- [ ] T296 Create architecture diagrams (layers, data flow)
- [ ] T297 Update README.md with project overview and setup instructions
- [ ] T298 [P] Run full test suite and verify 100% passing
- [ ] T299 [P] Performance test: verify smooth rendering with 200+ elements
- [ ] T300 [P] Performance test: verify hover response <100ms

**Checkpoint**: All testing complete, documentation ready

---

## Summary

**Total Tasks**: 300  
**Priority Tasks ([P])**: ~120 (40%)  
**Constitution-Critical Tasks**: ~40 tasks explicitly reference constitution principles

### Task Distribution by Phase

- Phases 1-6 (Foundation): T001-T039 (39 tasks)
- Phases 7-13 (Basic Geometry): T040-T101 (62 tasks)
- Phases 14-17 (Advanced Geometry): T102-T148 (47 tasks)
- Phases 18-22 (UI Features): T149-T200 (52 tasks)
- Phases 23-25 (Advanced Features): T201-T241 (41 tasks)
- Phase 26 (Persistence): T242-T261 (20 tasks)
- Phase 27 (Polish): T262-T284 (23 tasks)
- Phase 28 (Testing/Docs): T285-T300 (16 tasks)

### Constitution Compliance Notes

Throughout all tasks, the following constitutional principles are enforced:

- **Principle I (Layered Architecture)**: Domain, Application, Presentation, and Data layers maintained
- **Principle II (Command Pattern)**: All user actions as undoable commands (Phase 10+)
- **Principle III (Frontend-First)**: All geometry calculations in frontend, backend only for persistence
- **Principle IV (Principle-Based Rendering)**: NO hardcoded special cases, all calculations from geometric principles
- **Principle V (Homogeneous Coordinates)**: Mandatory for all geometric calculations, explicitly noted in T094, T102, T114, T127, T140, T142, T230, T233

### Testing Strategy

- **Unit Tests**: All [P] priority tasks include unit tests (~120 tests)
- **E2E Tests**: Key user workflows covered (construction, transport, infeasibility, persistence)
- **Constitution Tests**: Verify no hardcoded cases, homogeneous coordinates used, layers maintained

### Ready for Implementation

All 300 tasks are defined with clear deliverables and dependencies. Implementation can proceed incrementally, phase by phase, with each phase building on the previous one.


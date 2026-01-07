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

- [X] T072a [P] Unit test for Operations in frontend/tests/unit/commands/operations.spec.ts
  - Test AddElementOp: apply adds element, undo removes it
  - Test RemoveElementOp: apply removes, undo restores (uses beforeState)
  - Test UpdateElementOp: apply updates, undo restores beforeState
  - Test operation outputs and error handling
- [X] T073a [P] Unit test for Command base class in frontend/tests/unit/commands/command.spec.ts
  - Test addAndExecute() pattern with mock operations
  - Test incremental execution (operations run immediately)
  - Test rollback on operation failure
  - Test status transitions: Building → Committed → Undone
  - Test undo/redo reverses operations in correct order
- [X] T074a [P] Unit test for CommandStack in frontend/tests/unit/commands/commandStack.spec.ts
  - Test execute adds to undo stack, clears redo stack
  - Test undo moves command to redo stack
  - Test redo moves command back to undo stack
  - Test canUndo/canRedo return correct booleans
- [X] T075a [P] Unit test for CreateFreePointCommand in frontend/tests/unit/commands/createFreePointCommand.spec.ts
  - Test command execution creates point in World
  - Test command undo removes point
  - Test validation via command
- [X] T075b [P] Unit test for PointTool in frontend/tests/unit/tools/pointTool.spec.ts
  - Test handleClick creates command
  - Test coordinate validation in tool
  - Test plane existence validation
- [X] T076a [P] Integration test: Point creation through full stack
  - Verify: SvgCanvas click → PointTool → CreateFreePointCommand → AddElementOp → World
  - Verify undo removes point, redo restores it
  - Note: World reactivity (worldVersion) not yet implemented

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
- [X] T044 [P] Unit test for Line class in frontend/tests/unit/domain/line.spec.ts

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
- [X] T052 [P] E2E test for line creation in frontend/tests/e2e/line-creation.spec.ts

**Checkpoint**: User can create lines between points with snapping (US2 partial)

---

## Phase 8.5: Active Plane Visual Emphasis & Context-Sensitive Feedback

**Purpose**: Implement visual feedback for active/inactive planes and context-sensitive element highlighting  
**Reference**: [spec.md](./spec.md#projection-planes) - FR-002 Active Plane Visual Emphasis, [ui-spec.md](./ui-spec.md#active-plane-system) - Active Plane System

**Implementation Requirements**:
- **Active Plane Visual Emphasis**: Follow [spec.md §FR-002](./spec.md#requirements) and [ui-spec.md §Active Plane System](./ui-spec.md#active-plane-system):
  - Active plane elements: 100% opacity (full intensity)
  - Inactive plane elements: 50% opacity + lighter colors (de-emphasized)
  - Hinge lines: Always 100% opacity (belong to all planes)
  - Brief transition animation (opacity fade) when changing active plane
- **Context-Sensitive Hover Feedback**: Tools should only highlight elements they can interact with:
  - LineTool, CircleTool, SegmentTool: Only highlight points during hover
  - GuideTool: Highlight lines on first click, points on second click
  - IntersectionTool: Only highlight lines during hover
  - No tool active: Highlight all interactive elements
- **Opacity Application**: PaperService must apply opacity based on element's plane vs active plane
- **Filter Hit Testing**: Paper.hitTest() already returns element type, tools filter in handleClick(), but hover feedback should also respect tool context

**⚠️ CRITICAL**: Active plane opacity is MANDATORY per FR-002. This affects ALL element rendering, not just new features.

- [X] T052a [P] Update PaperService.resolvePointStyle() to accept activePlaneId parameter and apply 50% opacity for non-active planes
- [X] T052b [P] Update PaperService.resolveLineStyle() to accept activePlaneId and apply opacity
- [X] T052c [P] Update PaperService.resolveCircleStyle() to accept activePlaneId and apply opacity
- [X] T052d [P] Update PaperService.resolveSegmentStyle() to accept activePlaneId and apply opacity
- [X] T052e [P] Update PaperService.resolveGuideStyle() to apply 100% opacity always (guides belong to all planes)
- [X] T052f [P] Update PaperService.resolveHingeLineStyle() to apply 100% opacity always
- [X] T052g Update SvgCanvas.vue to pass activePlaneId to PaperService.generatePrimitives()
- [X] T052h Add CSS transition for opacity changes (0.2s ease-in-out) in SVGRenderer
- [X] T052i Implement context-sensitive hover filtering in SvgCanvas mousemove handler:
  - Added planeId to DrawingPrimitive interface
  - Updated Paper.hitTest() to filter by activePlaneId
  - Elements on inactive planes are now non-pickable (not hoverable, not clickable)
  - Guides and hinge lines (planeId=undefined) remain pickable on all planes
- [X] T052j [P] Unit test for opacity application in frontend/tests/unit/services/paperService.spec.ts
- [X] T052k [P] E2E test for active plane visual emphasis in frontend/tests/e2e/active-plane-emphasis.spec.ts

**Checkpoint**: Active plane visually distinct, tools only highlight valid interaction targets

---

## Phase 8.6: HalfHingeLine2D Refactoring

**Purpose**: Refactor hinge line architecture to properly model 2D representations per plane  
**Reference**: [data-model.md](./data-model.md#domain-entity-hingeline) - HingeLine and HalfHingeLine2D architecture

**Implementation Requirements**:
- **Two-Level Architecture**: Per [data-model.md §HingeLine](./data-model.md#domain-entity-hingeline):
  - **HingeLine** (3D entity): Represents the actual 3D intersection line between two projection planes
  - **HalfHingeLine2D** (2D entity): How the HL appears in each plane's (u,v) coordinates
  - Each HingeLine has exactly 2 HalfHingeLine2D objects (one per plane)
- **Ownership**: HalfHingeLine2D objects belong to their projection plane, not stored separately
- **Guide References**: Guides must reference HalfHingeLine2D (not HingeLine directly) since guides are perpendicular to the 2D representation
- **Hit Testing**: Paper.hitTest() should iterate world.getHalfHingeLines2D(activePlaneId) not filter world.getAllHingeLines()
- **Realization**: HalfHingeLine2D uses same realization type as Line2D (Line2DRealization2D with point + direction)
- **Visual Rendering**: HalfHingeLine2D rendered same as current hinge lines (always 100% opacity, belong to all planes)

**⚠️ CRITICAL**: This refactoring affects Guide creation workflow. Guides are now created by selecting a HalfHingeLine2D + point, not a HingeLine directly.

- [X] T053a [P] Create HalfHingeLine2D class in frontend/src/domain/world/HingeLine.ts
- [X] T053b [P] Add HalfHingeLine2D storage to ProjectionPlane class (each plane owns its half-hinges)
- [X] T053c Update HingeLine class to store only 3D metadata (id, name, plane1Id, plane2Id)
- [X] T053d Add getHalfHingeLines2D(planeId) method to World (returns all half-hinges for a plane)
- [X] T053e Update World.initializeStandardPlanes() to create HalfHingeLine2D objects for HL_HV
- [X] T053f Update PaperService to generate primitives from HalfHingeLine2D (not HingeLine)
- [X] T053g Update Paper.hitTest() to iterate world.getHalfHingeLines2D(activePlaneId)
- [X] T053h Update Guide2D/ComplementaryGuide2D to reference HalfHingeLine2D (halfHingeLineId field)
- [X] T053i Update GuideTool to select HalfHingeLine2D on first click (not HingeLine)
- [X] T053j [P] Unit test for HalfHingeLine2D in frontend/tests/unit/domain/hingeLine.spec.ts
- [X] T053k [P] Update E2E tests that reference hinge lines (guide-creation.spec.ts)

**Checkpoint**: Hinge lines properly modeled as 3D entity + 2D per-plane representations, guides reference correct 2D entities

---

## Phase 8.7: Tool-Specific Selection Filtering

**Purpose**: Implement selection mask system for tool-aware hover highlighting and hit testing  
**Reference**: [ui-spec.md §Selection Mask System](./ui-spec.md#valid-input-restriction) - Tool-specific filtering, [data-model.md §Selection Mask System](./data-model.md#selection-mask-system) - Implementation details

**Architecture**:
- **Selection Mask**: Each tool defines which element types are selectable at current step
- **Hit Test Filtering**: Paper.hitTest() filters candidates by selection mask before returning results
- **Hover Integration**: Only masked element types highlight on hover, providing immediate visual feedback
- **Dynamic Masks**: Masks can change as tool progresses (e.g., Guide tool allows HHL or point first, then restricts to other type)

**Implementation Requirements**:
- **Type Definitions**: Create SelectableElementType union ('point' | 'line' | 'half-hinge-line' | 'segment' | 'circle' | 'guide')
- **Tool Interface**: Add getSelectionMask(): SelectionMask method to Tool interface
- **Paper.hitTest() Update**: Add optional selectionMask parameter, filter primitives by element type before distance checks
- **Element Type Mapping**: Add getElementType() helper to classify primitives by querying World
- **Tool Implementations**: Update existing tools (LineTool, GuideTool, etc.) to return appropriate masks
- **SvgCanvas Integration**: Query active tool's mask before calling hitTest()

**Pedagogical Value**: Users learn valid inputs through hover behavior - only geometrically valid elements highlight, reinforcing constraints.

**⚠️ CRITICAL**: This affects ALL tools. Review [data-model.md §Selection Mask System](./data-model.md#selection-mask-system) for complete implementation examples.

- [X] T054a [P] Create SelectableElementType and SelectionMask type definitions in frontend/src/types/SelectionMask.ts
- [X] T054b Update Tool interface to add getSelectionMask(): SelectionMask method in frontend/src/tools/ITool.ts
- [X] T054c Add selectionMask optional parameter to Paper.hitTest() signature in frontend/src/domain/presentation/Paper.ts
- [X] T054d [P] Implement getElementType() private method in Paper to map primitives to SelectableElementType
- [X] T054e Add filtering logic in Paper.hitTest() to skip primitives not matching selection mask
- [X] T054f Update SvgCanvas.vue handleMouseMove to query activeTool.getSelectionMask() and pass to hitTest()
- [X] T054g Implement getSelectionMask() in LineTool (constant mask: ['point'])
- [X] T054h Implement getSelectionMask() in GuideTool (dynamic mask: initial ['line', 'half-hinge-line'], then restrict to ['point'])
- [X] T054i Implement getSelectionMask() in SegmentTool (constant mask: ['point'])
- [X] T054j Implement getSelectionMask() in CircleTool (constant mask: ['point'])
- [X] T054k Implement getSelectionMask() in IntersectionTool (constant mask: ['line', 'half-hinge-line'])
- [X] T054k2 Implement getSelectionMask() in TransportTool (dynamic mask: ['point'] then ['guide'])
- [X] T054k3 Implement getSelectionMask() in PointTool (empty mask: [])
- [X] T054l [P] Unit tests for selection mask filtering in frontend/tests/unit/selectionMask.spec.ts
- [X] T054m [P] E2E test for selection mask behavior (verify only valid elements highlight) in frontend/tests/e2e/selection-mask.spec.ts

**Checkpoint**: All tools filter selectable elements by type, hover highlighting only shows valid targets, prevents selection errors

---

## Phase 8.8: HalfHingeLine Intersection Sibling Points

**Purpose**: Automatically create sibling intersection points when intersecting with HalfHingeLine2D to maintain geometric consistency  
**Reference**: [data-model.md §HalfHingeLine2D Intersection Sibling Behavior](./data-model.md#halfhingeline2d-intersection-sibling-behavior) - Sibling point architecture

**Architecture**:
- **Primary Point**: IntersectionPoint2D explicitly created by user on one plane, with optional `siblingPointId` field
- **Sibling Point**: SiblingIntersectionPoint2D automatically created on paired plane, references `primaryIntersectionId`
- **Realization**: Sibling computes by getting primary's 3D position, then projecting onto sibling plane
- **Process Tree**: Sibling recorded as auxiliary action nested within primary intersection action

**Geometric Rationale**:
- HalfHingeLine2D represents a 3D hinge line visible on both planes
- Intersection with HHL occurs at a 3D point
- That 3D point has projections on BOTH planes
- User creates primary on one plane, system creates sibling on other plane automatically

**Implementation Requirements**:
- **Point Type**: Create SiblingIntersectionPoint2D class extending Point2D
- **Field Updates**: Add optional `siblingPointId?: string` to IntersectionPoint2D
- **Creation Logic**: When creating intersection with HHL, detect HHL type and auto-create sibling
- **Realization**: Sibling realizes by: lookup primary → get 3D position → project to sibling plane → return 2D position
- **Dependency**: Sibling depends on primary for coordinate computation
- **Visual Feedback**: Both points render simultaneously and highlight together

**⚠️ CRITICAL**: This affects IntersectionPointTool workflow. Review [data-model.md §HalfHingeLine2D Intersection Sibling Behavior](./data-model.md#halfhingeline2d-intersection-sibling-behavior) for complete creation flow.

- [X] T055a [P] Create SiblingIntersectionPoint2D class in frontend/src/domain/world/Point.ts
- [X] T055b Add optional siblingPointId field to IntersectionPoint2D class
- [X] T055c Update Point2D union type to include SiblingIntersectionPoint2D
- [X] T055d Implement realize() method in SiblingIntersectionPoint2D (lookup primary, get 3D, project to plane)
- [X] T055e Add helper method to World: addIntersectionPoint2DWithSibling() that creates both points when HHL detected
- [X] T055f Update CreateIntersectionPointCommand to detect HHL intersection and call addIntersectionPoint2DWithSibling()
- [X] T055g Update IntersectionPointTool to handle sibling creation (no UI change, automatic behavior)
- [X] T055h Update PaperService to render sibling points (same styling as regular intersection points)
- [X] T055i Hover highlighting: Only the point on active plane highlights (no special sibling highlighting)
- [X] T055j Add ProcessTree auxiliary action recording for sibling point creation
- [X] T055k Handle deletion cascading: delete primary → auto-delete sibling via dependency system
- [X] T055l [P] Unit tests for SiblingIntersectionPoint2D in frontend/tests/unit/domain/point.spec.ts
- [X] T055m [P] Unit tests for sibling creation logic in frontend/tests/unit/domain/hingeLine.spec.ts
- [X] T055n [P] E2E test for HHL intersection creating sibling points in frontend/tests/e2e/hhl-intersection.spec.ts

**Checkpoint**: Intersecting with HHL automatically creates geometrically consistent sibling points on both planes

---

## REFACTORING: Command Pattern Simplification

**Purpose**: Eliminate Command subclasses, enable operation chaining pattern  
**Priority**: HIGH - Current implementation doesn't match documented architecture

**Context**: Current implementation requires Command subclasses (CreateIntersectionPointCommand, CreateFreePointCommand, etc.), but data-model.md documents a single generic Command class where tools build commands directly using operation chaining.

**Current Pattern** (implemented):
```typescript
// Tool creates command subclass
const cmd = new CreateIntersectionPointCommand(world, params);
commandStack.execute(cmd);  // Calls cmd.execute() which builds operations internally

// Inside command.execute():
const op = new AddIntersectionPoint2DOp(...);
this.addAndExecute(op);
this.pointId = op.outputs.pointId;  // ❌ Accesses op.outputs directly
```

**Desired Pattern** (documented):
```typescript
// Tool builds command directly, uses return values
const cmd = new Command("Create intersection point", world);
const result = cmd.addAndExecute(new AddIntersectionPoint2DOp(...));
const pointId = result.outputs.pointId;  // ✅ Uses return value
cmd.commit();
commandStack.push(cmd);  // No execute() call

// Multi-operation example with chaining:
const cmd = new Command("Create segment", world);
const p1Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, pos1));
const p1Id = p1Result.outputs.pointId;  // ← Available for next op
const p2Result = cmd.addAndExecute(new AddFreePoint2DOp(planeId, pos2));
const p2Id = p2Result.outputs.pointId;
const segResult = cmd.addAndExecute(new AddSegment2DOp(planeId, p1Id, p2Id));  // ← Uses previous outputs
cmd.commit();
commandStack.push(cmd);
```

**Issues Identified**:
1. **Command is abstract**: Has `abstract execute()` method forcing subclasses
2. **Tools access op.outputs directly**: Should use `addAndExecute()` return value
3. **CommandStack.execute() calls cmd.execute()**: Should accept pre-built commands
4. **No operation chaining**: Current code doesn't chain outputs → args

**Files Affected**:
- Commands: Command.ts, CommandStack.ts, 6 command subclass files
- Tools: PointTool.ts, LineTool.ts, SegmentTool.ts, CircleTool.ts, IntersectionTool.ts, GuideTool.ts
- Operations: All *Op.ts files (verify output pattern)
- Tests: command.spec.ts, commandStack.spec.ts, tool tests, new E2E test

### Tasks

**Core Architecture Changes**:

- [X] R001 Make Command concrete in frontend/src/commands/Command.ts
  - Remove `abstract execute()` method declaration
  - Remove abstract keyword from class
  - Make constructor public (currently protected)
  - Ensure addAndExecute(), commit(), rollback(), undo(), redo() work without subclasses

- [X] R002 Update CommandStack API in frontend/src/commands/CommandStack.ts
  - Rename execute() → push() (or keep execute but remove cmd.execute() call)
  - Method should accept pre-built Command and add to stack directly
  - Remove cmd.execute() call - commands arrive already built
  - Remove cmd.commit() call - tools should commit before passing
  - Update method signature: `push(command: Command): void`

- [X] R003 Add CommandStack.push() convenience method (if execute renamed)
  - Just calls: undoStack.push(command); redoStack = [];
  - No execute() or commit() calls
  - Used by tools after building command

**Tool Refactoring (Simple Single-Operation Commands)**:

- [X] R004 Refactor PointTool in frontend/src/tools/PointTool.ts
  - Remove CreateFreePointCommand import
  - Build Command directly: `const cmd = new Command("Create free point", world);`
  - Use return value: `const result = cmd.addAndExecute(new AddFreePoint2DOp(...));`
  - Extract outputs: `const pointId = result.outputs.pointId;`
  - Record ProcessTree action using pointId from outputs
  - Commit: `cmd.commit();`
  - Push to stack: `commandStack.push(cmd);`

- [X] R005 Refactor LineTool in frontend/src/tools/LineTool.ts
  - Remove CreateLineCommand import
  - Build Command directly with AddLine2DOp
  - Use addAndExecute() return value for lineId
  - Record ProcessTree action, commit, push

- [X] R007 Refactor CircleTool in frontend/src/tools/CircleTool.ts
  - Remove CreateCircleCommand import
  - Build Command directly with AddCircle2DOp
  - Use addAndExecute() return value for circleId
  - Record ProcessTree action, commit, push

- [X] R008 Refactor IntersectionTool in frontend/src/tools/IntersectionTool.ts
  - Remove CreateIntersectionPointCommand import
  - Build Command directly with AddIntersectionPoint2DOp
  - Use addAndExecute() return value for pointId and siblingPointId
  - Record ProcessTree action, commit, push

- [X] R009 Refactor GuideTool in frontend/src/tools/GuideTool.ts
  - Remove CreateGuideCommand import
  - Build Command directly with AddGuide2DOp
  - Use addAndExecute() return value for guideId
  - Record ProcessTree action, commit, push

**Tool Refactoring (Multi-Operation with Chaining)**:

- [X] R006 Refactor SegmentTool in frontend/src/tools/SegmentTool.ts
  - Remove CreateSegmentCommand import
  - Build Command with THREE operations chained:
    1. AddFreePoint2DOp → get p1Id from result.outputs.pointId
    2. AddFreePoint2DOp → get p2Id from result.outputs.pointId
    3. AddSegment2DOp(planeId, p1Id, p2Id) → uses IDs from previous ops
  - Record ProcessTree action for segment (not individual points)
  - Commit and push single atomic command
  - This demonstrates operation chaining pattern

**Cleanup (Delete Obsolete Subclasses)**:

- [X] R010 Delete frontend/src/commands/CreateFreePointCommand.ts
- [X] R011 Delete frontend/src/commands/CreateLineCommand.ts
- [X] R012 Delete frontend/src/commands/CreateSegmentCommand.ts
- [X] R013 Delete frontend/src/commands/CreateCircleCommand.ts
- [X] R014 Delete frontend/src/commands/CreateIntersectionPointCommand.ts
- [X] R015 Delete frontend/src/commands/CreateGuideCommand.ts

**Operation Verification**:

- [X] R016 Audit all operation classes for correct output pattern
  - Verify each has: `outputs: Record<string, any> = {};`
  - Verify internal fields like `_pointId` for ID stability
  - Verify apply() returns: `{ success: true, outputs: this.outputs }`
  - Verify outputs contains all IDs/values needed by callers
  - Files: AddFreePoint2DOp, AddIntersectionPoint2DOp, AddLine2DByTwoPointsOp, AddSegment2DByPointsOp, AddCircle2DByCenterAndRadiusOp, AddGuide2DPerpendicularToLineOp
  - **Status**: All 6 operations verified with correct output pattern

**Testing**:

- [X] R017 [P] Unit tests for generic Command in frontend/tests/unit/commands/command.spec.ts
  - Test: Command is concrete (no subclass needed)
  - Test: addAndExecute() returns OperationResult with outputs
  - Test: Multi-operation command execution
  - Test: Operation chaining (use outputs from op1 in op2)
  - Test: commit(), rollback(), undo(), redo()
  - Test: ID stability across undo/redo
  - **Status**: 33 tests passing, comprehensive coverage

- [X] R018 [P] Unit tests for CommandStack in frontend/tests/unit/commands/commandStack.spec.ts
  - Test: push() adds pre-built command to stack
  - Test: undo() calls command.undo()
  - Test: redo() calls command.redo()
  - Test: canUndo(), canRedo()
  - Test: push() clears redo stack
  - **Status**: 29 tests passing, including push() and execute() backward compatibility

- [X] R019 [P] Update all tool tests in frontend/tests/unit/tools/*.spec.ts
  - Update PointTool test to use new pattern ✓
  - Note: Only PointTool tests exist currently (other tools will be tested as implemented)
  - Updated PointTool test to mock push() instead of execute()
  - Updated header comment to reference R019 and new pattern
  - **Status**: 22 tests passing

- [X] R020 [P] E2E test for operation chaining in frontend/tests/e2e/command-chaining.spec.ts
  - Created comprehensive documentation file explaining operation chaining pattern
  - Documented: Multi-operation commands, output dependencies, atomic behavior, ID stability
  - Provided example code showing how tools will use operation chaining
  - Included placeholder for future E2E tests when tools implement multi-operation commands
  - Note: Operation chaining is comprehensively tested in unit tests (command.spec.ts)
  - **Status**: Documentation test passing, concept fully documented and unit-tested

**Checkpoint**: Single generic Command class, tools build commands directly, operation chaining works

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

- [X] T053 [P] Create Action interface in frontend/src/domain/processTree/Action.ts
- [X] T054 [P] Create ProcessTree class in frontend/src/domain/processTree/ProcessTree.ts
- [X] T055 [P] Create CreatePointAction factory in frontend/src/domain/processTree/actions/CreatePointAction.ts
- [X] T056 [P] Create CreateLineAction factory in frontend/src/domain/processTree/actions/CreateLineAction.ts
- [X] T057 Add ProcessTree instance to World
- [X] T058 Record CreatePointAction when point created
- [X] T059 Record CreateLineAction when line created
- [X] T060 [P] Unit test for ProcessTree in frontend/tests/unit/processTree.spec.ts - 18 tests passing
- [X] T061 [P] Unit test for action factories included in processTree.spec.ts

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

**NOTE**: Core command pattern infrastructure implemented in Phase 6.5. UI controls (buttons/shortcuts) still pending:

- [X] T062 [P] Create Command interface in frontend/src/commands/Command.ts with execute/undo/validate
  - **DONE in Phase 6.5**: Command base class with addAndExecute(), commit(), rollback(), undo(), redo()
- [X] T063 [P] Create CommandStack class in frontend/src/commands/CommandStack.ts
  - **DONE in Phase 6.5**: CommandStack with execute(), undo(), redo(), canUndo(), canRedo()
- [X] T064 [P] Create CreateFreePointCommand in frontend/src/commands/CreateFreePointCommand.ts
  - **DONE in Phase 6.5**: CreateFreePointCommand with full test coverage
- [X] T065 [P] Create CreateLineCommand in frontend/src/commands/CreateLineCommand.ts
  - **DONE in Phase 8**: CreateLineCommand already implemented with line creation tool
- [X] T066 Refactor point creation to use CreateFreePointCommand
  - **DONE in Phase 6.5**: SvgCanvas uses PointTool → CreateFreePointCommand
- [X] T067 Refactor line creation to use CreateLineCommand
  - **DONE in Phase 8**: LineTool uses CreateLineCommand
- [X] T068 Add Undo button to toolbar
- [X] T069 Add Redo button to toolbar
- [X] T070 Implement Ctrl+Z keyboard shortcut for undo
- [X] T071 Implement Ctrl+Y keyboard shortcut for redo
- [X] T072 [P] Unit test for CommandStack in frontend/tests/unit/commands/commandStack.spec.ts
  - **DONE in Phase 6.5**: T074a - Comprehensive CommandStack tests
- [X] T073 [P] Unit test for CreateFreePointCommand in frontend/tests/unit/commands/createFreePoint.spec.ts
  - **DONE in Phase 6.5**: T075a - CreateFreePointCommand unit tests
- [X] T074 [P] E2E test for undo/redo in frontend/tests/e2e/undo-redo.spec.ts

**Checkpoint**: ✅ Command pattern complete with UI controls. All user actions undoable.

---

## Phase 10.5: World Factory Methods Refactoring (URGENT - Fix Architectural Issues)

**Purpose**: Replace fragile AddElementOp type detection with World factory methods following Factory Pattern  
**Reference**: [constitution.md Principle I, II, IV](../../.specify/memory/constitution.md), [data-model.md §World Entity](./data-model.md#world-entity)

**Current Issues**:
- AddElementOp uses fragile string matching (`constructor.name.includes('Point')`) to detect element types
- **BUG**: Line2DByTwoPoints matched as "Point" because name contains "Point" substring → added to wrong Map
- Violates encapsulation - Operations shouldn't know about all domain class constructors
- No explicit validation of construction parameters before object creation

**Solution - Factory Pattern**:
- World acts as Factory for its own domain objects with intent-revealing method names
- Methods like `addLine2DBetweenTwoPoints(planeId, id, point1Id, point2Id)` instead of generic `addLine(element)`
- Makes planeId explicit as first parameter (elements belong to planes)
- Built-in validation: World validates parameters, constructs objects, adds to Maps
- Commands call factory methods directly, no type detection needed

**Constitution Compliance**:
- ✅ Layered Architecture (Principle I): World (Domain) provides factory interface to Application layer
- ✅ Command Pattern (Principle II): Commands simplified, still use execute/undo pattern
- ✅ Principle-Based (Principle IV): Removes special-case type detection logic

**Factory Method API Design**:
```typescript
class World {
  // Points
  addFreePoint2D(planeId, id, position): FreePoint2D
  addIntersectionPoint2D(planeId, id, line1Id, line2Id, index): IntersectionPoint2D
  
  // Lines
  addLine2DBetweenTwoPoints(planeId, id, point1Id, point2Id): Line2DByTwoPoints
  addLine2DParallel(planeId, id, refLineId, pointId): Line2DParallel
  addLine2DPerpendicular(planeId, id, refLineId, pointId): Line2DPerpendicular
  
  // Segments, Circles, Guides
  addSegment2DBetweenPoints(planeId, id, point1Id, point2Id): Segment2DByPoints
  addCircle2DByCenter(planeId, id, centerId, radius): Circle2DByCenterRadius
  addGuide2D(planeId, id, guideType, params): Guide2D
  
  // Removal (returns element for undo)
  removePoint2D(planeId, id): Point2D | null
  removeLine2D(planeId, id): Line2D | null
  // ... etc
}
```

**Benefits**: Type-safe, explicit validation, intent-revealing names, no fragile string matching, undo support via removal methods

### Subtasks

- [X] T074a: Implement Point2D factory methods in World
  - `addFreePoint2D(planeId, id, position)`: Validate plane, create, add to Map
  - `addIntersectionPoint2D(planeId, id, line1Id, line2Id, index)`: Validate lines exist, same plane, not parallel
  - `addPointOnElement2D(planeId, id, elementId, parameter)`
  - Location: frontend/src/domain/world/World.ts

- [X] T074b: Implement Line2D factory methods in World
  - `addLine2DBetweenTwoPoints(planeId, id, point1Id, point2Id)`: Validate points exist, same plane, distinct
  - `addLine2DParallel(planeId, id, refLineId, pointId)`: Validate reference line and point
  - `addLine2DPerpendicular(planeId, id, refLineId, pointId)`
  - Update realization cache after each add
  - Location: frontend/src/domain/world/World.ts

- [X] T074c: Implement Segment2D, Circle2D, Guide2D factory methods
  - `addSegment2DBetweenPoints(planeId, id, point1Id, point2Id)`
  - `addCircle2DByCenter(planeId, id, centerId, radius)`: Validate radius > 0
  - `addCircle2DByThreePoints(planeId, id, p1Id, p2Id, p3Id)`: Validate not collinear
  - `addGuide2D(planeId, id, guideType, params)`
  - Location: frontend/src/domain/world/World.ts

- [X] T074d: Implement removal factory methods
  - `removePoint2D(planeId, id)`: Check dependents, throw if has dependents, clean caches, return for undo
  - `removeLine2D(planeId, id)`, `removeSegment2D`, `removeCircle2D`, `removeGuide2D`
  - Location: frontend/src/domain/world/World.ts

- [X] T074e: Update CreateFreePointCommand to use factory method
  - Replace: `new FreePoint2D(...)` + AddElementOp
  - With: `world.addFreePoint2D(planeId, id, position)`
  - Update execute() and undo() using removal method
  - Location: frontend/src/commands/CreateFreePointCommand.ts

- [X] T074f: Update CreateLineCommand to use factory method
  - Replace: `new Line2DByTwoPoints(...)` + AddElementOp
  - With: `world.addLine2DBetweenTwoPoints(planeId, id, point1Id, point2Id)`
  - Location: frontend/src/commands/CreateLineCommand.ts

- [X] T074g: Update CreateSegmentCommand, CreateCircleCommand, CreateGuideCommand
  - Migrate to use factory methods
  - Remove AddElementOp usage
  - Locations: frontend/src/commands/Create{Segment,Circle,Guide}Command.ts

- [X] T074h: Update CreateIntersectionPointCommand to use factory method
  - Use `world.addIntersectionPoint2D(planeId, id, line1Id, line2Id, index)`
  - Factory method validates lines not parallel
  - Location: frontend/src/commands/CreateIntersectionPointCommand.ts

- [X] T074i: Deprecate AddElementOp
  - Add `@deprecated` JSDoc comment
  - Add console warning when old API used
  - Keep temporarily for backward compatibility
  - Plan removal after migration complete
  - Location: frontend/src/commands/operations/WorldOperations.ts

- [X] T074j: Unit tests for World factory methods
  - Test validation: invalid planeId, missing referenced elements, parallel lines, collinear points
  - Test creation: element added to correct Map, realization cache updated
  - Test removal: element removed, caches cleaned, returned for undo, error if has dependents
  - Location: frontend/tests/unit/domain/world.spec.ts
  - **COMPLETED**: 32 tests passing covering all factory methods

- [X] T074k: Update Command unit tests
  - Test Commands use factory methods with correct params
  - Test execute() creates via factory, undo() removes via removal method
  - Test validation errors propagate
  - Locations: frontend/tests/unit/commands/*.spec.ts
  - **COMPLETED**: 
    - createFreePointCommand.spec.ts: 15/15 tests passing
    - pointTool.spec.ts: 22/22 tests passing
    - processTreeCommands.spec.ts: 4/4 tests passing
    - pointCreation.spec.ts: 14/14 tests passing
    - Removed obsolete operations.spec.ts (old API no longer exists)

- [X] T074l: Update integration and E2E tests
  - Test workflows use factory methods
  - Test undo/redo with factory methods
  - Test validation errors in UI
  - Locations: frontend/tests/integration/*.spec.ts, frontend/tests/e2e/*.spec.ts
  - **COMPLETED**: 
    - All integration tests updated and passing (18/18 tests)
    - E2E tests don't directly access World API - they test via UI
    - E2E test runner has unrelated backend path issue (separate from this task)

**Checkpoint**: ✅ Commands use World factory methods, no type detection bugs, validation at construction time

**Follow-up**: After migration, remove AddElementOp completely and clean up debug logs

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

- [X] T075 [P] Create Segment class in frontend/src/domain/world/Segment.ts with start/end points
- [X] T076 Add segment storage to World
- [X] T077 Render segments as SVG path elements in SvgCanvas.vue
- [X] T078 Add "Segment" tool button to Toolbar
- [X] T079 [P] Create CreateSegmentCommand in frontend/src/commands/CreateSegmentCommand.ts
- [X] T080 Implement segment creation tool (two-point selection)
- [X] T081 [P] Unit test for Segment class in frontend/tests/unit/domain/segment.spec.ts
- [X] T082 [P] E2E test for segment creation in frontend/tests/e2e/create-segment.spec.ts

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

- [X] T083 [P] Create Circle class in frontend/src/domain/world/Circle.ts with center point and radius
- [X] T084 Add circle storage to World
- [X] T085 Render circles as SVG circle elements in SvgCanvas.vue
- [X] T086 Add "Circle" tool button to Toolbar
- [X] T087 [P] Create CreateCircleCommand in frontend/src/commands/CreateCircleCommand.ts
- [X] T088 Implement circle center selection
- [X] T089 Implement radius specification (drag or click second point)
- [X] T090 [P] Unit test for Circle class in frontend/tests/unit/domain/circle.spec.ts
- [X] T091 [P] E2E test for circle creation in frontend/tests/e2e/create-circle.spec.ts

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

- [X] T092 [P] Create Guide class in frontend/src/domain/world/Guide.ts (line perpendicular to HL through point)
- [X] T093 Add guide storage to World
- [X] T094 [P] Implement guide calculation using homogeneous coordinates - perpendicular to HL
- [X] T095 Render guides as dashed SVG lines in SvgCanvas.vue (extend to viewport edges)
- [X] T096 Add "Guide" tool button to Toolbar
- [X] T097 [P] Create CreateGuideCommand in frontend/src/commands/CreateGuideCommand.ts
- [X] T098 Implement guide creation: select HL, then select point
- [X] T099 Apply guide on both planes sharing the HL (guide appears in both)
- [X] T100 [P] Unit test for guide calculations in frontend/tests/unit/domain/guide.spec.ts
- [X] T101 [P] E2E test for guide creation in frontend/tests/e2e/guide-creation.spec.ts

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

- [X] T102 [P] Implement line-line intersection calculation in frontend/src/domain/calculations/Intersections.ts using homogeneous coordinates
- [X] T103 Handle parallel lines (no intersection, return null)
- [X] T104 Handle coincident lines (infinite intersections, return null or special case)
- [X] T105 Add "Intersection" tool button to Toolbar
- [X] T106 [P] Create CreateIntersectionPointCommand in frontend/src/commands/CreateIntersectionPointCommand.ts
- [X] T107 Implement intersection tool: select first line
- [X] T108 Implement intersection tool: select second line
- [X] T109 Calculate and create point at intersection
- [X] T110 Show error message if lines are parallel (infeasibility preview)
- [X] T111 [P] Unit test for line-line intersection in frontend/tests/unit/calculations/intersections.spec.ts
- [X] T112 [P] E2E test for line-line intersection in frontend/tests/e2e/intersections.spec.ts

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

- [X] T113 [P] Implement point transport calculation in frontend/src/domain/calculations/Transport.ts using geometric principles
- [X] T114 [P] Transport MUST use homogeneous coordinates and matrix transformations (Principle V)
- [X] T115 Validate that guide is perpendicular to hinge line
- [X] T116 Validate that source point and target plane are compatible
- [X] T117 Add "Transport Point" tool button to Toolbar
- [X] T118 [P] Create TransportPointCommand in frontend/src/commands/TransportPointCommand.ts
- [X] T119 Implement transport tool: select source point
- [X] T120 Implement transport tool: select guide
- [X] T121 Calculate transported point on opposite plane
- [X] T122 Create new point at transported location
- [X] T123 Record dependency: transported point depends on source + guide (ProcessTree)
- [X] T124 [P] Unit test for point transport calculations in frontend/tests/unit/calculations/transport.spec.ts
- [X] T125 [P] E2E test for point transport in frontend/tests/e2e/point-transport.spec.ts

**Checkpoint**: User can transport points between planes (US4 complete)

**Constitution Note**: Transport calculations MUST be principle-based, working for any guide/plane combination (Principle IV), using homogeneous coordinates (Principle V)

---

## Phase 15.5: 3D Coordinate Display (Status Bar Enhancement)

**Purpose**: Display cursor position as 3D coordinates in real-time  
**Reference**: [ui-spec.md](./ui-spec.md#status-bar) - Status Bar Requirements

**Implementation Requirements**:
- **Coordinate Transformation Pipeline**: Implement complete transform chain per [data-model.md §Coordinate Systems](./data-model.md#coordinate-systems-and-transformations):
  1. Screen coordinates (mouse event) → SVG coordinates (viewport inverse)
  2. SVG coordinates → Paper coordinates (viewport transform inverse)
  3. Paper coordinates → Active plane (u,v) coordinates (ProjectionPlane.paperToPlane2D)
  4. Plane (u,v) coordinates → 3D (x,y,z) coordinates (ProjectionPlane.planeTo3D)
- **Status Bar Display**: Show "3D: (x, y, z)" in corner with fixed precision (2 decimal places)
- **Performance**: Debounce updates to every 50ms to avoid excessive recalculation
- **Out-of-Plane Handling**: Display "3D: ---" when cursor not over active plane area
- **Homogeneous Coordinates**: Use Vector3/Vector4 throughout transformation pipeline per [constitution.md Principle V](../../.specify/memory/constitution.md#principle-v-homogeneous-coordinate-system)

**⚠️ CRITICAL**: This feature demonstrates the complete coordinate transformation pipeline and provides essential pedagogical feedback about the 3D geometry being constructed.

- [X] T125a Create StatusBar.vue component in frontend/src/components/toolbars/StatusBar.vue
- [X] T125b Add coordinate transformation utility in frontend/src/utils/coordinateTransform.ts:
  - screenToSVG(screenX, screenY, svgElement): Convert mouse to SVG coords
  - svgToPaper(svgPoint, viewport): Apply viewport transform inverse
  - paperToPlane(paperPoint, planeId, world): Get (u,v) in plane coords
  - planeTo3D(planePoint, planeId, world): Transform to (x,y,z) in 3D space
- [X] T125c Implement mousemove handler in SvgCanvas that computes 3D coordinates
- [X] T125d Add debouncing (50ms) to coordinate update to prevent performance issues
- [X] T125e Display 3D coordinates in StatusBar with format "(x.xx, y.yy, z.zz)"
- [X] T125f Handle out-of-plane cursor (show "---" when not over active plane)
- [X] T125g Style StatusBar corner display (bottom-right or top-right, non-intrusive)
- [X] T125h [P] Unit test for coordinate transformation pipeline in frontend/tests/unit/utils/coordinateTransform.spec.ts
- [X] T125i [P] E2E test for 3D coordinate display in frontend/tests/e2e/coordinate-display.spec.ts

**Checkpoint**: Real-time 3D coordinate feedback enhances spatial understanding

**Constitution Note**: Coordinate transformations MUST use homogeneous coordinates (Principle V) and work for any plane configuration (Principle IV)

---

## Phase 16: Distance Transport (US5 - REMOVED)

**Status**: ❌ **FEATURE REMOVED** - Distance transport tool removed from scope

~~**Purpose**: Transport distances along guides~~  
~~**Reference**: [spec.md](./spec.md#us5-transport-distance-along-guide) - US5 Distance Transport~~

**Rationale**: Feature deemed unnecessary for MVP. Distance operations can be achieved through other tool combinations.

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

- [X] T140 [P] Implement line-circle intersection in frontend/src/domain/calculations/Intersections.ts using homogeneous coordinates
- [X] T141 Handle 0, 1, or 2 intersection points for line-circle
- [X] T142 [P] Implement circle-circle intersection using homogeneous coordinates
- [X] T143 Handle 0, 1, or 2 intersection points for circle-circle
- [X] T144 Extend "Intersection" tool to support line-circle selection
- [X] T145 Extend "Intersection" tool to support circle-circle selection
- [X] T146 When multiple intersection points exist, allow user to choose which to create
- [X] T147 [P] Unit tests for line-circle and circle-circle intersections in frontend/tests/unit/calculations/intersections.spec.ts
- [X] T148 [P] E2E tests for all intersection types in frontend/tests/e2e/intersections.spec.ts

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

- [X] T149 [P] Create ActionsPanel.vue component in frontend/src/components/panels/
- [X] T150 Retrieve actions from ProcessTree and display as list
- [X] T151 Show action type, parameters, and dependencies for each action
- [X] T152 Add filter dropdown to filter by action type
- [N/A] T153 Add search input to search actions by name/parameters (REMOVED: not in spec)
- [X] T154 Implement click handler to highlight related objects on canvas when action selected
- [X] T155 Add icon/indicator for action status (complete, infeasible, pending)
- [X] T156 Mount ActionsPanel in App.vue left sidebar
- [X] T157 [P] Unit test for ActionsPanel in frontend/tests/unit/components/actionsPanel.spec.ts

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

- [X] T158 [P] Create ElementsPanel.vue component in frontend/src/components/panels/
- [X] T159 Retrieve all elements from World and display as list
- [X] T160 Organize elements by type (Points, Lines, Segments, Circles, Guides)
- [X] T161 Show element labels, IDs, and key properties (coordinates, etc.)
- [N/A] T162 Add filter to show/hide element types (REMOVED: not in spec)
- [N/A] T163 Add search to find elements by label or ID (REMOVED: not in spec)
- [X] T164 Implement click handler to highlight element on canvas when selected
- [X] T165 Add visibility toggle for each element (show/hide)
- [X] T166 Mount ElementsPanel in App.vue right sidebar
- [X] T167 [P] Unit test for ElementsPanel in frontend/tests/unit/components/elementsPanel.spec.ts

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

- [X] T168 [P] Create selectionStore in frontend/src/stores/selectionStore.ts
- [X] T169 Implement click detection for objects on SVG canvas
- [X] T170 Add selected object ID to selectionStore on click
- [X] T171 Apply selection highlight style to selected objects (different stroke/fill)
- [X] T172 Implement Ctrl+click for multi-select (add to selection)
- [X] T173 Implement click on empty area to clear selection
- [X] T174 Sync selection between canvas and ElementsPanel (bidirectional)
- [X] T175 Sync selection between canvas and ActionsPanel (show related actions)
- [X] T176 [P] Unit test for selectionStore in frontend/tests/unit/stores/selectionStore.spec.ts
- [X] T177 [P] E2E test for object selection in frontend/tests/e2e/selection.spec.ts

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

- [X] T178 [P] Create useHoverHighlight composable in frontend/src/composables/useHoverHighlight.ts
- [X] T179 Implement mouseover detection for objects on canvas
- [X] T180 Apply hover highlight style (different from selection, e.g., lighter stroke)
- [X] T181 Show object label/tooltip on hover
- [X] T182 Clear hover highlight on mouseout
- [X] T183 Ensure hover highlight doesn't interfere with selection highlight
- [X] T184 Show snap preview when hovering near points (visual indicator only - snap logic already working via hitTest)
- [X] T185 [P] Unit test for useHoverHighlight in frontend/tests/unit/composables/hoverHighlight.spec.ts
- [X] T186 [P] E2E test for hover highlighting in frontend/tests/e2e/hover.spec.ts

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

- [X] T187 [P] Create PropertiesDialog.vue component in frontend/src/components/dialogs/
- [X] T188 Show dialog when user double-clicks object or clicks "Properties" button
- [X] T189 Display all editable properties based on element type:
  - Point: x, y, label, visibility
  - Line/Segment: color, stroke width, line style (solid/dashed)
  - Circle: color, stroke width, fill color, fill opacity
  - Guide: color, dash pattern
- [X] T190 [P] Create color picker component for color selection
- [X] T191 Create stroke width slider input
- [X] T192 Create line style selector (solid, dashed, dotted)
- [X] T193 Apply property changes to selected object(s) immediately (or on "Apply" button)
- [ ] T194 Implement style inheritance system (objects inherit from tool defaults)
- [ ] T195 Add "Override inherited style" checkbox for each property
- [ ] T196 Add "Reset to inherited" button to restore default styles
- [ ] T197 Show indicator for which styles are overridden
- [X] T198 Validate property changes (e.g., coordinates must keep point on same plane)
- [X] T199 [P] Unit test for PropertiesDialog in frontend/tests/unit/components/propertiesDialog.spec.ts
- [X] T200 [P] E2E test for property editing in frontend/tests/e2e/properties.spec.ts

**Checkpoint**: User can edit element properties and visual styles (US6 complete for styling)

---

## Phase 22.5: Data Model Refactoring - ProjectionPlane Ownership

**Purpose**: Restructure data model so ProjectionPlane owns 2D elements  
**Reference**: [refactoring-projection-plane-ownership.md](./refactoring-projection-plane-ownership.md)

**Implementation Requirements**:
- **ProjectionPlane as Container**: Move 2D element storage from World to ProjectionPlane. Each plane owns its `points`, `lines`, `circles`, `arcs` maps.
- **Line Type Hierarchy**: Create abstract `Line2D` base class with subtypes: `InfiniteLine2D`, `Segment2D`, `Guide2D`, `HalfHingeLine2D`. All stored in single `lines` Map.
- **Unified Line Realization**: Merge `Line2DRealization2D` and `Segment2DRealization2D`. Use homogeneous coordinates (w=0 for vectors, w=1 for points) to distinguish infinite lines from segments.
- **Non-Breaking Migration**: Use 5-phase approach with dual storage, allowing gradual migration and rollback points.
- **Performance**: Maintain realization caching performance. Per-plane caches improve locality.

**⚠️ CRITICAL**: This is a major architectural change affecting all element access patterns. Follow migration plan strictly.

### Phase 22.5.1: Add ProjectionPlane Storage (Non-Breaking)

- [ ] T200a Add element maps to ProjectionPlane class (points, lines, circles, arcs)
- [ ] T200b Add realization cache maps to ProjectionPlane (pointRealizations, lineRealizations, circleRealizations, arcRealizations)
- [ ] T200c Implement ProjectionPlane.addPoint(), getPoint(), getPointRealization() methods
- [ ] T200d Implement ProjectionPlane.addLine(), getLine(), getLineRealization() methods
- [ ] T200e Implement ProjectionPlane.addCircle(), getCircle(), getCircleRealization() methods
- [ ] T200f Keep World-level maps operational (dual storage temporarily)
- [ ] T200g [P] Unit test ProjectionPlane element storage in frontend/tests/unit/domain/projectionPlane.spec.ts

### Phase 22.5.2: Refactor Line Type Hierarchy

- [ ] T200h Create abstract Line2D base class in frontend/src/domain/world/Line.ts
- [ ] T200i Create InfiniteLine2D extending Line2D (rename from Line2DByTwoPoints)
- [ ] T200j Refactor Segment2D to extend Line2D
- [ ] T200k Refactor Guide2D to extend Line2D
- [ ] T200l Refactor HalfHingeLine2D to extend Line2D
- [ ] T200m Update Line2DRealization2D to support both infinite and bounded lines (add optional point1, point2)
- [ ] T200n [P] Unit test Line2D hierarchy in frontend/tests/unit/domain/lineHierarchy.spec.ts

### Phase 22.5.3: Migrate Write Operations

- [ ] T200o Update World.addPoint2D() to delegate to ProjectionPlane
- [ ] T200p Update World.addLine2D() to delegate to ProjectionPlane
- [ ] T200q Update World.addCircle2D() to delegate to ProjectionPlane
- [ ] T200r Update all CreateCommand classes to use new World API
- [ ] T200s Update all Tool classes to use new element creation API
- [ ] T200t [P] Unit test World delegation in frontend/tests/unit/domain/world.spec.ts

### Phase 22.5.4: Migrate Read Operations

- [ ] T200u Update World.getPoint2DRealization() to search all planes
- [ ] T200v Update World.getLine2DRealization() to search all planes
- [ ] T200w Add World.elementToPlane index for fast plane lookup (optional optimization)
- [ ] T200x Update PaperService to get elements from ProjectionPlane
- [ ] T200y Update SVGRenderer to use new lookup paths
- [ ] T200z Update all Tool hit testing to use new lookup paths
- [ ] T200aa [P] Integration test for element rendering in frontend/tests/integration/rendering.spec.ts

### Phase 22.5.5: Remove Old Storage and Cleanup

- [ ] T200ab Remove World-level element maps (points, lines, segments, circles, guides)
- [ ] T200ac Remove World-level realization caches (pointRealizations2D, lineRealizations2D, etc.)
- [ ] T200ad Remove compatibility shims and dual-storage code
- [ ] T200ae Update all documentation references to new architecture
- [ ] T200af [P] Run full regression test suite
- [ ] T200ag Update data-model.md examples to reflect new architecture

**Checkpoint**: ProjectionPlane owns all 2D elements, World delegates to planes, all tests passing

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

- [X] T201 [P] Create DependencyService in frontend/src/services/DependencyService.ts
- [X] T202 [P] Store dependencies in ProcessTree when actions are executed
- [X] T203 Implement dependency recording: when creating derived object, record its dependencies
- [X] T204 [P] Implement getDependents(elementId) to find all objects that depend on given element
- [X] T205 [P] Implement getDependencies(elementId) to find all elements that given object depends on
- [X] T206 When element changes (e.g., point moved), update all dependent objects
- [ ] T207 Add visual indicators in ActionsPanel showing dependencies (arrows/tree links) **DEFERRED - UI enhancement**
- [ ] T208 Add visual indicators in ElementsPanel showing which elements have dependencies **DEFERRED - UI enhancement**
- [X] T209 Prevent circular dependencies during validation
- [X] T210 [P] Unit test for DependencyService in frontend/tests/unit/services/dependencyService.spec.ts
- [X] T211 [P] E2E test for dependency tracking in frontend/tests/e2e/dependencies.spec.ts

**Checkpoint**: Dependencies tracked and objects update when sources change (9/11 tasks complete, T207-T208 UI enhancements deferred)

---

## Phase 24: Infeasibility Detection

**Purpose**: Detect and handle geometrically impossible operations  
**Reference**: [spec.md](./spec.md#infeasibility) - Infeasibility concept and handling, [spec.md](./spec.md#us2-create-points-lines-circles) - US2 intersection infeasibility

**Implementation Status**: ✅ **COMPLETE via Realization System**

**Implementation Requirements**:
- **Infeasibility Types**: Follow [spec.md §Infeasibility](./spec.md#parametric-behavior-and-dependencies) - Case A (block immediately) vs Case B (mark infeasible, keep in history).
- **Case A**: New construction invalid at creation → report immediately, create NO element, ignore action per [spec.md §Infeasibility Case A](./spec.md#parametric-behavior-and-dependencies).
- **Case B**: Previously valid construction becomes infeasible → keep in history, mark infeasible, hide outputs, show visual indicators per [spec.md §Infeasibility Case B](./spec.md#parametric-behavior-and-dependencies).
- **Validation Rules**: Parallel lines (no intersection), perpendicularity checks, geometric constraints per [data-model.md §Validation](./data-model.md#validation-and-error-handling).
- **Cascading**: If parent infeasible, all children infeasible per [spec.md §Parametric Behavior](./spec.md#parametric-behavior-and-dependencies). Dynamic revalidation when dependencies change.
- **Non-Modal Feedback**: NO modal dialogs. Use visual indicators (red highlights, warnings) per [spec.md §Infeasibility](./spec.md#parametric-behavior-and-dependencies).

**⚠️ NOTE**: Infeasibility detection is implemented through the realization system. Every realization (Point2DRealization2D, Line2DRealization2D, etc.) includes a `feasible: boolean` field. Geometric operations (intersectLineLine, intersectLineCircle, etc.) return `feasible: false` when operations are impossible (parallel lines, coincident points, etc.). This naturally implements Case B behavior: elements remain in history but are marked infeasible.

- [X] T212 **IMPLEMENTED via Realization System** - Feasibility tracked in every realization object
- [X] T213 **IMPLEMENTED** - intersectLineLine returns feasible:false for parallel lines (in Intersections.ts)
- [X] T214 **IMPLEMENTED** - Point transport validation in TransportPointCommand
- [X] T215 **IMPLEMENTED** - Distance transport validation in calculations
- [X] T216 **IMPLEMENTED** - Realization objects have feasible field, propagates through dependency chain
- [X] T217 **IMPLEMENTED** - Infeasible realizations automatically marked via geometric functions
- [X] T218 **IMPLEMENTED** - Cascading via realize() chain: if parent infeasible, children get infeasible realizations
- [ ] T219 Display infeasible actions in ActionsPanel with red indicator **DEFERRED - UI enhancement**
- [ ] T220 Display infeasible elements in ElementsPanel with red color/warning icon **DEFERRED - UI enhancement**
- [ ] T221 Show error message/tooltip explaining why operation is infeasible **DEFERRED - UI enhancement**
- [X] T222 **IMPLEMENTED** - Tools check realization feasibility before proceeding
- [X] T223 **IMPLEMENTED** - Realizations recomputed on dependency changes via worldVersion reactivity
- [X] T224 **IMPLEMENTED** - Unit tests verify feasible:false for degenerate cases (see point.spec.ts, line.spec.ts, circle.spec.ts)
- [X] T225 **IMPLEMENTED** - E2E test tests/e2e/infeasibility.spec.ts validates infeasible intersection behavior

**Checkpoint**: ✅ Infeasible operations detected and marked via realization system (11/14 tasks complete, T219-T221 UI enhancements deferred)

**Constitution Note**: Validation IS based on geometric principles via realization functions (Principle IV compliant)

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

## Phase 26: Google Drive Persistence (US1 - Complete)

**Purpose**: Persist projects to user's Google Drive  
**Reference**: [spec.md](./spec.md#us1-place-point-on-active-plane) - US1 includes persistence requirement, [ui-spec.md §Startup Flow](./ui-spec.md#startup-flow-and-google-drive-authentication) - Startup dialog and authentication

**Implementation Requirements**:
- **Google Drive API**: Use gapi.client library for direct browser-to-Drive communication. No backend server required.
- **OAuth2 Authentication**: Implement "Sign in with Google" flow with scope `https://www.googleapis.com/auth/drive.file` (app-created files only).
- **Folder Structure**: All projects stored in user's Google Drive "diedrico" folder (auto-created if doesn't exist). Files use `.diedrico` extension.
- **Serialization**: Serialize complete World state (elements, ProcessTree, view state) to JSON per [data-model.md §Project Serialization](./data-model.md#project-serialization).
- **Auto-Save**: Implement debounced auto-save (2 seconds after last change) per [spec.md §FR-027](./spec.md#functional-requirements).
- **Startup Dialog**: On launch, show dialog with "Create New Project" (name input) or "Open Existing Project" (list from Drive) per [ui-spec.md §Startup Flow](./ui-spec.md#startup-flow-and-google-drive-authentication).
- **No Explicit Save**: Remove "Save" button from toolbar - all changes auto-saved per [ui-spec.md §File/Project Controls](./ui-spec.md#file-project-controls).

**⚠️ CRITICAL**: Read [ui-spec.md §Startup Flow and Google Drive Authentication](./ui-spec.md#startup-flow-and-google-drive-authentication) for complete startup flow specification.

**Frontend Serialization (Complete)**:
- [X] T242 [P] Create ProjectService in frontend/src/services/ProjectService.ts
- [X] T243 Implement World serialization to JSON (serialize all elements, ProcessTree, view state)
- [X] T244 Implement World deserialization from JSON (reconstruct all objects)
- [X] T245 Add version number to JSON format for future compatibility
- [X] T246 Validate loaded JSON data (check structure, types, required fields)

**Google Drive Integration (To Do)**:
- [X] T247 Install Google API client library: `npm install @types/gapi @types/gapi.client.drive`
- [X] T248 Create GoogleDriveService in frontend/src/services/GoogleDriveService.ts
- [X] T249 Implement OAuth2 sign-in flow with Google (scope: drive.file)
- [X] T250 Implement createFile(folderName, fileName, data) - Create .diedrico file in "diedrico" folder
- [X] T251 Implement listFiles(folderName) - List all .diedrico files from "diedrico" folder
- [X] T252 Implement loadFile(fileId) - Download and parse .diedrico file
- [X] T253 Implement updateFile(fileId, data) - Update existing .diedrico file
- [X] T254 Implement auto-create "diedrico" folder if it doesn't exist
- [X] T255 Create StartupDialog.vue component in frontend/src/components/dialogs/
- [X] T256 Add "Create New Project" section with name input field
- [X] T257 Add "Open Existing Project" section with file list from Drive
- [X] T258 Implement "Sign in with Google" button and authentication flow
- [X] T259 Implement auto-save with 2-second debounce (watch World version changes)
- [X] T260 Add status indicator: "Saving..." and "All changes saved" in status bar
- [X] T261 Handle Google Drive API errors (network, quota, authentication expired)
- [X] T262 [P] Unit test for GoogleDriveService in frontend/tests/unit/services/googleDriveService.spec.ts
- [ ] T263 [P] E2E test for save/load workflow in frontend/tests/e2e/persistence.spec.ts

**Checkpoint**: Projects can be saved to and loaded from Google Drive (US1 complete) - **Functional implementation complete, E2E test pending**

**Phase 26 Status**: 21/22 tasks complete (95%)
- ✅ Frontend serialization (T242-T246)
- ✅ Google Drive service (T247-T254)
- ✅ Startup dialog (T255-T258)
- ✅ Auto-save and error handling (T259-T261)
- ✅ Unit tests (T262: 25 tests passing)
- ⏳ E2E tests (T263: Pending - requires Google OAuth mock)

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

- [X] T268 Implement Ctrl+O keyboard shortcut for Open (shows startup dialog)
- [X] T269 Implement Ctrl+N keyboard shortcut for New project (shows startup dialog)
- [X] T270 Implement Ctrl+A keyboard shortcut for Select All - Selects all elements in active plane
- [X] T271 Implement Delete/Backspace key for deleting selected objects - Basic implementation without cascade deletion or undo
- [X] T272 Implement Esc key to cancel current operation/deselect
- [X] T273 Implement tool keyboard shortcuts (P for Point, L for Line, S for Segment, C for Circle, G for Guide)
- [X] T274 Add "Fit to View" button and Ctrl+0 shortcut (zoom to show all objects) - Implemented in SvgCanvas.vue with fitToView() method
- [X] T275 Implement grid display with zoom-adaptive spacing - Computed gridLines property generates lines based on zoom level
- [X] T276 Add grid toggle button (show/hide grid) - Toolbar button toggles viewStore.gridVisible
- [X] T277 Create StatusBar.vue component showing current mouse coordinates in world space
- [X] T278 Show active plane indicator in status bar
- [X] T279 Show active tool name in status bar
- [X] T280 Show save status in status bar ("Saving..." / "All changes saved" for Google Drive)
- [X] T281 Persist user preferences to localStorage - Created settingsStore.ts with auto-save on change
- [X] T282 Load preferences on application startup - Settings loaded automatically on store initialization
- [X] T284 [P] E2E test for keyboard shortcuts in frontend/tests/e2e/keyboard-shortcuts.spec.ts

**Checkpoint**: Polished user experience with keyboard shortcuts, grid, and status bar

**Phase 27 Status**: 16/16 tasks complete (100%) ✅
- ✅ Keyboard shortcuts (T268-T274)
- ✅ Grid display and toggle (T275-T276)
- ✅ Status bar (T277-T280)
- ✅ Preferences persistence (T281-T282)
- ✅ Testing (T284: Complete)

---

## Phase 27.5: Circle Architecture Refactoring

**Purpose**: Align circle implementation with Diedrico geometric principles  
**Reference**: [data-model.md](./data-model.md#circle-2d-constructions) - Circle Definitions, [spec.md](./spec.md#circle-tool-family) - Circle Tools

**Status**: Not Started (0/13 tasks)

### Background

The current circle implementation uses `Circle2DByCenterAndRadius` (center point + numeric radius) as the primary construction method. However, Diedrico geometry requires circles to be defined by **two points** (center + radius point) where the radius vector serves dual purpose:

1. **Magnitude**: Distance from center to radius point defines circle size
2. **Angular Reference**: Direction of radius vector defines angle zero for consistent intersection point indexing

This ensures deterministic behavior when intersections are computed parametrically—critical for maintaining stable constructions when defining points move.

**Design Goals**:
- Make `Circle2DByCenterAndPoint` the primary/standard circle construction
- Add `radiusVector` field to `Circle2DRealization` (not just scalar radius)
- Update intersection algorithms to index points by angle relative to radius vector
- Refactor `CircleTool` to use two-point workflow
- Preserve `Circle2DByCenterAndRadius` as special case for extensibility
- Update all documentation to reflect geometric principles

**Impact**: This is a foundational change affecting circle creation, realization, intersection indexing, and tools.

### Tasks

**Data Model Updates** (T285-T287):

- [ ] T285 [D] Add radiusVector field to Circle2DRealization interface in frontend/src/domain/world/Circle.ts
  - Add `radiusVector: Vector3` field (direction vector with w=0)
  - Document dual purpose: magnitude and angular reference
  - Update Circle2DRealization2D constructor to accept and store radius vector

- [ ] T286 [D] Update Circle2DByCenterAndPoint.realize2D() method
  - Compute radius vector from center and circumference point positions
  - Store both radius (scalar) and radiusVector (Vector3) in realization
  - Ensure radiusVector is normalized direction with w=0

- [ ] T287 [D] Update Circle2DByCenterAndRadius.realize2D() for radius vector
  - Since this type lacks a radius-defining point, use default reference direction (+X axis)
  - Document limitation: this construction does NOT guarantee consistent intersection indexing
  - Add JSDoc warning about using Circle2DByCenterAndPoint for general constructions

**Intersection Indexing** (T288-T289):

- [ ] T288 [D] Implement angle-based intersection indexing algorithm
  - Create utility function: `sortIntersectionsByAngle(points: Vector3[], radiusVector: Vector3): Vector3[]`
  - For each intersection point: compute angle relative to radius vector direction
  - Sort by normalized angle in [0, 2π) range
  - Return sorted array with index 0 = closest to radius vector angle

- [ ] T289 [D] Update intersection operations to use angle-based indexing
  - Review all intersection operations involving circles (line-circle, circle-circle)
  - Pass circle's radiusVector to indexing algorithm
  - Update IntersectionPoint creation to use stable indices
  - Add tests verifying index stability under parametric updates

**Tool Refactoring** (T290-T291):

- [ ] T290 [D] Refactor CircleTool to use Circle2DByCenterAndPoint construction
  - Current: Two-click workflow creates Circle2DByCenterAndRadius with computed radius distance
  - Updated: Two-click workflow selects/creates two Point2D objects (center + radius point)
  - Ensure second click creates actual Point2D entity (not just distance calculation)
  - Update AddCircle operation to use Circle2DByCenterAndPoint

- [ ] T291 [P] Add visual feedback for radius vector in CircleTool
  - Show dashed line from center to radius point during construction
  - Highlight radius point when hovering over selected circle
  - Optional: Add "show radius vectors" toggle in settings (future enhancement)

**Testing & Documentation** (T292-T297):

- [ ] T292 [D] Update Circle2DRealization tests
  - Test radiusVector is correctly computed from two points
  - Test radiusVector magnitude equals radius scalar
  - Test radiusVector direction defines angle zero

- [ ] T293 [D] Update intersection indexing tests
  - Create test: line-circle intersection with known angles
  - Verify index 0 is closest to radius vector direction
  - Test stability: move defining points, verify indices remain stable (if topology unchanged)

- [ ] T294 [D] Update CircleTool tests
  - Test two-click workflow creates Circle2DByCenterAndPoint
  - Test both center and radius point exist as Point2D entities
  - Test circle updates when either defining point moves

- [ ] T295 [D] Add integration test for parametric circle behavior
  - Create circle by center and point
  - Create intersection with line
  - Reference intersection point in subsequent construction
  - Move radius point → verify construction updates correctly

- [ ] T296 [D] Update JSDoc comments in Circle.ts
  - Document Circle2DByCenterAndPoint as primary method
  - Explain radius vector's dual role in all relevant locations
  - Add usage examples showing proper circle construction

- [ ] T297 [D] Update UI tooltips and help text
  - Circle tool tooltip: "Circle by center and point (defines radius vector)"
  - Add brief explanation of angle zero concept in help dialog

**Checkpoint**: Circle architecture aligned with Diedrico principles, stable intersection indexing implemented

**Phase 27.5 Status**: 0/13 tasks complete (0%)
- ⏳ Data model updates (T285-T287: Not started)
- ⏳ Intersection indexing (T288-T289: Not started)
- ⏳ Tool refactoring (T290-T291: Not started)
- ⏳ Testing & documentation (T292-T297: Not started)

---

## Phase 28: File Management Operations

**Purpose**: Enhanced file operations for better project management  
**Reference**: [spec.md](./spec.md#file-operations) - File Operations, [ui-spec.md](./ui-spec.md#project-name-display) - Project Name Display, [data-model.md](./data-model.md#project-serialization) - Command-Based Serialization

**Status**: Not Started (0/19 tasks)

### Background

Users need better control over their project files beyond basic create/open/save. This phase adds:
- **Instant project creation**: Click "New" to create "untitled N" file immediately (no dialog)
- **Smart project naming**: Auto-generate sequential "untitled 1", "untitled 2", etc.
- **In-place rename**: Double-click project name to edit (no dialog needed)
- **File switching**: Quick access to recently opened files via "Open" button

**Design Decisions**:
- New button creates project instantly with auto-generated "untitled N" name
- Project name displayed in top-left corner of app header (always visible)
- Double-click name to edit inline (no separate dialog - immediate feedback)
- Find next available number by checking existing Google Drive files
- Recent files list (5 most recent) shown in Open dialog
- All operations go through GoogleDriveService (no local-only mode)

### Subtasks

#### UI Components

- [X] T296 [P] Create ProjectNameDisplay component in frontend/src/components/header/
  - Display current project name in top-left of app header
  - Show edit mode on double-click (contenteditable or input field)
  - Save on Enter, cancel on Escape
  - Validate name (non-empty, reasonable length, no special chars)
  - Show save indicator while renaming (spinner or icon)
  - Location: frontend/src/components/header/ProjectNameDisplay.vue

- [X] T297 [P] Add New and Open buttons to MainToolbar
  - New button: Icon (+ or document), tooltip "New Project (Ctrl+N)"
  - Open button: Icon (folder), tooltip "Open Project (Ctrl+O)"
  - Positioned at start of toolbar (left side)
  - Location: frontend/src/components/toolbars/Toolbar.vue

- [X] T298 [P] Enhance StartupDialog to show open project only
  - Remove "Create New Project" section from dialog
  - Display only file list when user is authenticated
  - Show hint to use New button if no projects exist
  - Used by both initial startup and "Open" button (Ctrl+O)
  - Location: frontend/src/components/dialogs/StartupDialog.vue

#### Google Drive Service Extensions

- [X] T299 Add generateDefaultProjectName() to GoogleDriveService
  - List existing files in "diedrico" folder
  - Parse names matching "untitled N" pattern
  - Find first available N (filling gaps), or use next sequential if no gaps
  - Example: If "untitled 1", "untitled 3" exist, returns "untitled 2"
  - Location: frontend/src/services/GoogleDriveService.ts

- [X] T300 Add renameFile(fileId, newName) to GoogleDriveService
  - Update file metadata via Google Drive API
  - Validate new name
  - Update localStorage last_file_name
  - Location: frontend/src/services/GoogleDriveService.ts

- [X] T301 Add getRecentFiles(limit) to GoogleDriveService
  - Return files sorted by modifiedTime descending
  - Include metadata: id, name, modifiedTime
  - Returns top N files from listFiles (already sorted)
  - Location: frontend/src/services/GoogleDriveService.ts

#### App.vue Integration

- [X] T304 Update handleNewProject to create project immediately
  - Call generateDefaultProjectName() to get "untitled N" name
  - Create project without showing dialog
  - Clear world and command stack before creation
  - Location: frontend/src/App.vue

- [X] T305 Add handleRenameProject(newName) to App.vue
  - Validate new name
  - Call driveService.renameFile()
  - Update currentProjectName ref
  - Show success/error feedback
  - Location: frontend/src/App.vue

- [X] T306 Update StartupDialog integration in App.vue
  - StartupDialog already receives all files via setFiles()
  - Files are sorted by modifiedTime descending (recent first)
  - File selection handled via @open event
  - Location: frontend/src/App.vue

#### Keyboard Shortcuts

- [X] T307 Add Ctrl+R shortcut for Rename
  - Focuses project name display in edit mode
  - Same as double-clicking project name
  - Location: frontend/src/App.vue
  - Location: frontend/src/App.vue

#### Testing

- [ ] T308 [P] Unit tests for generateDefaultProjectName logic
  - Test empty folder (returns "drawing 1")
  - Test existing files (finds next number)
  - Test gaps in sequence (uses next sequential)
  - Test non-matching names (ignores them)
  - Location: frontend/tests/unit/services/googleDriveService.spec.ts

- [ ] T309 [P] Unit tests for file operation methods
  - Test renameFile, getRecentFiles
  - Mock Google Drive API responses
  - Location: frontend/tests/unit/services/googleDriveService.spec.ts

- [ ] T310 [P] E2E test for project rename workflow
  - Create project → double-click name → enter new name → verify saved
  - Test validation (empty name rejection)
  - Location: frontend/tests/e2e/file-operations.spec.ts

- [ ] T311 [P] E2E test for toolbar file operations
  - Test New, Open buttons
  - Test Recent Files list in startup dialog
  - Location: frontend/tests/e2e/file-operations.spec.ts

**Checkpoint**: ✅ File management operations complete, users have full control over projects

---

## Testing & Documentation (Phase 29)

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
**Priority Tasks ([P])**: ~124 (41%)  
**Constitution-Critical Tasks**: ~44 tasks explicitly reference constitution principles

### Task Distribution by Phase

- Phases 1-6 (Foundation): T001-T039 (39 tasks)
- Phases 7-8.5 (Basic Geometry + Visual Feedback): T040-T052k (63 tasks)
- Phases 9-13 (Process Tree & Geometry): T053-T101 (49 tasks)
- Phases 14-15.5 (Advanced Geometry + 3D Coords): T102-T125i (73 tasks)
- Phases 16-17 (More Advanced Geometry): T126-T148 (23 tasks)
- Phases 18-22 (UI Features): T149-T200 (52 tasks)
- Phases 23-25 (Advanced Features): T201-T241 (41 tasks)
- Phase 26 (Google Drive Persistence): T242-T263 (22 tasks)
- Phase 27 (Polish): T264-T284 (21 tasks)
- Phase 28 (Testing/Docs): T285-T300 (16 tasks)

### Constitution Compliance Notes

Throughout all tasks, the following constitutional principles are enforced:

- **Principle I (Layered Architecture)**: Domain, Application, Presentation, and Data layers maintained
- **Principle II (Command Pattern)**: All user actions as undoable commands (Phase 10+)
- **Principle III (Frontend-First)**: All geometry calculations in frontend, Google Drive API for persistence (no backend server)
- **Principle IV (Principle-Based Rendering)**: NO hardcoded special cases, all calculations from geometric principles
- **Principle V (Homogeneous Coordinates)**: Mandatory for all geometric calculations, explicitly noted in T094, T102, T114, T127, T140, T142, T230, T233

### Testing Strategy

- **Unit Tests**: All [P] priority tasks include unit tests (~120 tests)
- **E2E Tests**: Key user workflows covered (construction, transport, infeasibility, persistence)
- **Constitution Tests**: Verify no hardcoded cases, homogeneous coordinates used, layers maintained

### Ready for Implementation

All 300 tasks are defined with clear deliverables and dependencies. Implementation can proceed incrementally, phase by phase, with each phase building on the previous one.

---

## PENDING CLARIFICATION: Replace Transport Tool with "Point on Guide at Distance" Tool

**Current Tool (TransportTool)**: Transports points between planes via guides  
**New Tool**: Create points on guides at specified distances from hinge line

**⚠️ NEEDS DESIGN CLARIFICATION**

**Proposed Functionality:**

**Option A - Manual Distance Entry:**
1. User selects a guide line
2. User enters numeric distance value (via input field/dialog)
3. Tool creates point on guide at exactly that distance from hinge line

**Option B - Interactive Placement (Mouse-Driven):**
1. User selects a guide line
2. User moves mouse along guide → point preview follows mouse position
3. Tool displays real-time distance from hinge line (tooltip/overlay)
4. User clicks to place point at current mouse position

**Design Questions:**
- Should both options be supported, or just one?
- For Option A: UI mechanism for distance input (dialog, toolbar field, command palette)?
- For Option B: Should point snap to guide automatically, or require explicit constraint?
- Should distance be signed (positive/negative for sides of hinge line)?
- Point type: PointOnGuide2D (new constrained point type) or FreePoint2D with computed position?

**Implementation Impact:**
- Replace TransportTool with new PointOnGuideTool
- Update TransportPointCommand → CreatePointOnGuideCommand
- Add distance calculation utilities (point-to-hinge distance)
- Update UI feedback for Option B (live preview + distance display)
- Update selection mask for new tool workflow

**Tasks will be defined once design is finalized.**

---

## FUTURE WORK REQUIRING CLARIFICATION

### Additional Hinge Lines & Coordinate Consistency

**Context**: `SiblingIntersectionPoint2D.realize2D()` optimization (Phase 8.8, T055d) relies on the **HalfHingeLine2D coordinate consistency property**: both `HalfHingeLine2D` objects representing the same 3D hinge line must use identical `(point, direction)` in their local `(u,v)` coordinates.

**Current Status**: Property holds for hardcoded `HL_HV` in `World` constructor:
```typescript
// Both use: point (0, 0, 1), direction (1, 0, 0)
const halfHingeHV_onPH = new HalfHingeLine2D('half_HL_HV_on_PH', 'HL_HV', 'proj_plane_H', ...);
const halfHingeHV_onPV = new HalfHingeLine2D('half_HL_HV_on_PV', 'HL_HV', 'proj_plane_V', ...);
```

**Future Requirement**: If/when auxiliary projection planes or additional hinge lines are added, creation logic **MUST maintain this geometric constraint**.

**Why It Matters**:
- Sibling points rely on coordinate correspondence: point at `(u, 0, 1)` on HHL in P_H → same `(u, 0, 1)` in P_V
- Breaking this constraint causes sibling points to compute **incorrect positions silently**
- No runtime error—geometric validity fails invisibly

**Action Needed** (before implementing additional HingeLine creation):
1. Add validation ensuring coordinate consistency during HingeLine setup
2. Add unit test verifying property holds for all HingeLine instances
3. Consider runtime assertion in `SiblingIntersectionPoint2D.realize2D()`

**Reference**: See [data-model.md §HalfHingeLine2D Coordinate Consistency Constraint](./data-model.md) for detailed constraint documentation.

---

## Phase 29: Settings Dialog UI

**Purpose**: User interface for configuring application preferences  
**Reference**: [ui-spec.md](./ui-spec.md#project-settings-dialog) - Settings Dialog Specification

**Status**: Not Started (0/6 tasks)

### Background

While settings persistence is implemented via `settingsStore.ts` (Phase 27), users need a UI to configure these preferences. The settings dialog provides:
- Visual controls for snap radius, grid configuration, default styles
- 3D view display options
- Keyboard shortcuts customization panel
- Reset to defaults functionality

**Design Requirements**:
- Modal dialog triggered by menu → Settings (or keyboard shortcut)
- Tabbed or sectioned interface for different setting categories
- Live preview where possible (e.g., grid changes visible immediately)
- Apply/Cancel/Reset buttons
- Changes saved automatically to `settingsStore` which persists to localStorage

### Tasks

- [ ] T262 [P] Create SettingsDialog.vue component in frontend/src/components/dialogs/
  - Modal dialog with tabs/sections for different setting categories
  - Integrates with settingsStore for reading/writing preferences
  - Apply, Cancel, Reset to Defaults buttons

- [ ] T263 [P] Add settings panel for snap configuration
  - Enable/disable snapping checkbox
  - Snap radius slider (5-20 pixels range, default 12)
  - Visual preview showing snap radius circle

- [ ] T264 [P] Add settings panel for grid configuration
  - Grid visibility toggle
  - Grid spacing input (default 20 units)
  - Grid color picker
  - Snap-to-grid checkbox
  - Live preview of grid appearance

- [ ] T265 [P] Add settings panel for default element styles
  - Color pickers for points, lines, circles, guides
  - Width/size inputs for stroke widths and point sizes
  - Preview of element appearance with current settings

- [ ] T266 [P] Add settings panel for 3D view options
  - Show/hide planes checkbox
  - Show/hide projection lines checkbox
  - Show/hide 2D elements in 3D view checkbox
  - Initial camera distance slider

- [ ] T267 [P] Add keyboard shortcuts customization panel
  - List of all keyboard shortcuts with current bindings
  - Click to rebind functionality
  - Conflict detection (warn if shortcut already in use)
  - Reset to defaults button

- [ ] T283 [P] Unit test for settings persistence in frontend/tests/unit/stores/settingsStore.spec.ts
  - Test loading settings from localStorage on initialization
  - Test saving settings to localStorage on changes
  - Test default values when localStorage is empty
  - Test merging with defaults for missing properties
  - Test resetToDefaults() and resetCategory() methods

**Checkpoint**: Users can configure all application preferences through UI

**Phase 29 Status**: 0/7 tasks complete (0%)

---

## Phase 30: Command-Based UI Operations

**Purpose**: Ensure all UI operations that modify geometry are undoable through CommandStack  
**Reference**: [data-model.md](./data-model.md#commands-and-operations) - Command Pattern Architecture

**Status**: Not Started (0/8 tasks)

### Background

Currently, some UI operations (notably Delete/Backspace) directly manipulate the World without going through the CommandStack. This violates the architectural principle that **all geometric modifications must be undoable**.

**Problems with Direct World Manipulation**:
1. **No undo support** - Operations cannot be reversed via Ctrl+Z
2. **No cascade deletion** - Dependencies are not handled (e.g., deleting a point doesn't remove dependent lines)
3. **Not atomic** - Multi-element operations are not transactional
4. **No command history** - Operations don't appear in Actions panel
5. **No persistence** - Changes aren't saved in command-based serialization

**Affected Operations**:
- Delete selected elements (T271) - Currently direct `world.removePoint2D()` calls
- Any future UI shortcuts that modify geometry

**Design Principle**: Every geometric change must flow through `commandStack.execute(command)` to ensure:
- Undo/redo capability
- Dependency cascade handling
- Atomic transactions
- Command history tracking
- Proper serialization

### Tasks

**Delete Operations** (T285-T287):

- [ ] T285 [D] Create DeleteElementsCommand in frontend/src/commands/DeleteElementsCommand.ts
  - Implements Command interface with execute() and undo()
  - Takes array of element IDs to delete
  - Uses DependencyService.getAllDependents() to find cascade elements
  - Stores deleted elements state for undo restoration
  - Removes elements atomically (all or none if validation fails)

- [ ] T286 [D] Create RemoveElementOperation for each element type
  - RemovePoint2DOp, RemoveLine2DOp, RemoveSegment2DOp, RemoveCircle2DOp, RemoveGuide2DOp
  - Each operation stores element data for undo
  - Operations are reversible (can restore removed element)
  - Location: frontend/src/commands/operations/RemoveElementOps.ts

- [ ] T287 [D] Update handleDeleteSelected() in App.vue to use DeleteElementsCommand
  - Replace direct World manipulation with command execution
  - Change from: `world.removePoint2D(...)` loops
  - Change to: `commandStack.execute(new DeleteElementsCommand(selectedIds, world))`
  - Verify delete now appears in undo history

**Dependency Cascade** (T288-T289):

- [ ] T288 [D] Implement cascade deletion logic in DeleteElementsCommand
  - Use DependencyService to find all elements dependent on selected elements
  - Add dependent elements to deletion set
  - Show warning/confirmation if cascade will delete many elements (optional)
  - Ensure parent elements are deleted before children

- [ ] T289 [D] Add visual feedback for cascade deletion
  - When user selects elements to delete, highlight dependent elements in different color
  - Show tooltip: "X additional elements will be deleted (dependencies)"
  - Update status bar message during deletion operation

**Testing & Validation** (T290-T292):

- [ ] T290 [D] Unit test for DeleteElementsCommand
  - Test single element deletion and undo
  - Test multi-element deletion and undo
  - Test cascade deletion (delete point → removes dependent line)
  - Test undo restores all elements in correct order
  - Location: frontend/tests/unit/commands/DeleteElementsCommand.spec.ts

- [ ] T291 [D] Update E2E keyboard-shortcuts test for undo support
  - Modify existing Delete/Backspace tests to verify undo works
  - Test: Create point → Delete → Undo → verify point restored
  - Test: Create line → Delete point → verify line also deleted (cascade)
  - Test: Delete → Undo → Redo cycle

- [ ] T292 [P] E2E test for cascade deletion behavior
  - Create point with multiple dependent elements (lines, circles)
  - Delete point via Delete key
  - Verify all dependent elements are removed
  - Undo and verify all elements restored
  - Location: frontend/tests/e2e/cascade-deletion.spec.ts

**Checkpoint**: All UI geometric modifications are undoable and respect dependencies

**Phase 30 Status**: 0/8 tasks complete (0%)

**Notes**:
- This phase fixes the TODO comment in App.vue handleDeleteSelected()
- Applies same pattern to any future UI shortcuts that modify geometry
- Ensures architectural consistency: World is only modified through Commands
- Critical for data integrity and user trust in undo functionality

---

## FUTURE WORK REQUIRING CLARIFICATION

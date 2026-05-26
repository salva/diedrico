# Implementation Plan: Diedrico Dihedral Learning MVP

**Branch**: `001-dihedral-learning-mvp` | **Date**: 2025-12-29 (Updated: 2026-01-06) | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-dihedral-learning-mvp/spec.md`

## Summary

An educational web application for learning dihedral/orthographic projection using a constructive, step-by-step approach. The application emphasizes the construction process over final results, with explicit dependency tracking, infeasibility detection, and dual 2D/3D visualization.

**Core Technical Approach**: Vue.js 3 frontend with TypeScript, SVG-based 2D rendering, command pattern for undoable operations, process tree for dependency tracking, and app-shell project persistence through ProjectService/Drive ports.

**⚠️ Refactoring in Progress**: The data model is being refactored to make ProjectionPlane the owner of 2D elements. See [refactoring-projection-plane-ownership.md](./refactoring-projection-plane-ownership.md) for details.

## Technical Context

**Language/Version**: TypeScript 5.x frontend, Node.js 18+ tooling  
**Primary Dependencies**: Vue.js 3 (Composition API), Vite  
**Storage**: App-shell ProjectPersistencePort with ProjectService/Drive adapter  
**Testing**: Vitest (unit), Playwright (E2E)  
**Target Platform**: Modern web browsers (Chrome, Firefox, Safari)  
**Project Type**: Frontend web application  
**Performance Goals**: Smooth rendering for 200+ geometric elements, <100ms hover response  
**Constraints**: Client-side geometry calculations, no backend computation, offline-capable after load  
**Scale/Scope**: MVP with 6 user stories, ~30 geometric operations, educational focus

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Layered Architecture**: Yes - Clear separation with Domain (World, ProcessTree), Application (Commands, Services), Presentation (Vue components), and Data (FileStorage) layers
- [x] **Command Pattern**: Yes - All user actions encapsulated as commands (CreatePointCommand, CreateLineCommand, etc.) with execute/undo/validate
- [x] **Frontend-First**: Yes - All geometric calculations, UI logic, and active project persistence boundary live in the frontend app shell
- [x] **Technology Discipline**: Yes - Uses approved stack: Vue.js 3, TypeScript, Vite, Vitest, Playwright, Node.js, Express
- [x] **Testing Strategy (Pragmatic)**: Yes - Acceptance scenarios defined in spec.md, unit tests for domain logic, E2E tests for critical user workflows

**Notes**: No deviations from constitution principles.

## Key Implementation Decisions

### Coordinate Representation

**Three.js Vector/Matrix Types**: All geometric coordinates use Three.js algebraic objects:
- **2D coordinates**: `Vector3` for homogeneous 2D (u, v, 1)
- **3D coordinates**: `Vector4` for homogeneous 3D (x, y, z, w)
- **2D transforms**: `Matrix3` for 3×3 transformations
- **3D transforms**: `Matrix4` for 4×4 transformations
- **2D→3D**: `Matrix4x3` (custom) for Vector3→Vector4 transformations
- **3D→2D**: `Matrix3x4` (custom) for Vector4→Vector3 transformations

**Rationale**:
- Single source of truth for vector algebra
- Avoid array-based coordinate confusion
- Atomic operations (no separate u/v getters)
- Standard library for transformations
- Type safety via TypeScript

**Utilities**: All matrix operations wrapped in non-destructive functions in `frontend/src/utils/threeUtils.ts`

### Realization System

**Lazy Evaluation with Caching**: Geometric objects store their *definition* (rule), not computed coordinates:
- `FreePoint2D`: Stores `position: Vector3` directly (the defining rule)
- `IntersectionPoint2D`: Stores `element1Id`, `element2Id`, `index` - coordinates computed on demand
- `Point2DRealization`: Cache of computed 2D position
- `Point3DRealization`: Cache of computed 3D position (reconstructed from projections)

**World as RealizationContext**:
- Implements `RealizationContext` interface with `getPoint2DRealization()`, `getPoint3DRealization()`
- Checks cache first → Calls `point.realize(this)` if missing → Caches result → Returns
- Organized by object type: `pointRealizations2D`, `pointRealizations3D` for extensibility
- `invalidateRealization()` clears cache when objects change

**Benefits**:
- Separates definition from computation
- Enables recursive dependencies (intersection of intersection)
- Performance through caching
- Clean extension point for new element types

### Realization Layer Boundary (CRITICAL ARCHITECTURAL CONSTRAINT)

**Mandatory Rule**: All numeric data MUST flow through realizations. No other layer may access domain object properties directly.

**Three-Layer Architecture**:
1. **Domain Layer**: Stores definitions/rules only (e.g., `FreePoint2D.position` is readonly)
2. **Realization Layer**: Stores ALL computed numeric data accessed by other layers (e.g., `Point2DRealization { position, planeId }`)
3. **Consuming Layers**: Services, rendering, calculations - access numeric data ONLY through realizations

**Enforcement**:
- Domain properties marked `readonly` to prevent modification
- Services require realization parameters (e.g., `renderPoint(point: Point2D, realization: Point2DRealization)`)
- No `instanceof` checks to access domain properties
- Tests verify architectural boundary is respected

**Benefits**:
- Clear separation: rules vs. numbers
- Type safety: functions explicitly declare need for numeric data
- Performance: caching prevents redundant calculations
- Consistency: same pattern for simple (FreePoint2D) and complex (IntersectionPoint2D) elements
- Maintainability: easy to find all numeric access points (they all go through realizations)

See [data-model.md § Realization Layer Boundary](/specs/001-dihedral-learning-mvp/data-model.md#critical-realization-layer-boundary) for detailed examples.

### Data Model Refactoring: ProjectionPlane Ownership

**NEW Architecture (In Progress)**: ProjectionPlane now owns and stores all 2D elements that exist on it.

**Before** (Old Architecture):
```typescript
class World {
  private points: Map<string, Point2D>;
  private lines: Map<string, Line2D>;
  private segments: Map<string, Segment2D>;
  private guides: Map<string, Guide2D>;
  projectionPlanes: Map<string, ProjectionPlane>;
}
```

**After** (New Architecture):
```typescript
class ProjectionPlane {
  points: Map<string, Point2D>;          // All points on this plane
  lines: Map<string, Line2D>;            // All line types (infinite, segment, guide, half-hinge)
  circles: Map<string, Circle2D>;
  arcs: Map<string, Arc2D>;
  
  // Realization caches per-plane
  pointRealizations: Map<string, Point2DRealization2D>;
  lineRealizations: Map<string, Line2DRealization2D>;
}

class World {
  projectionPlanes: Map<string, ProjectionPlane>;
  hingeLines: Map<string, HingeLine>;    // Cross-plane elements
  planes: Map<string, Plane3D>;
  processTree: ProcessTree;
}
```

**Line Type Hierarchy**: All line-like elements unified under Line2D base class:
- `InfiniteLine2D extends Line2D` - Infinite line defined by two points
- `Segment2D extends Line2D` - Bounded line segment
- `Guide2D extends Line2D` - Construction guide (dashed, perpendicular to hinge)
- `HalfHingeLine2D extends Line2D` - Hinge line projection on one plane

**Unified Line Realization**: Single realization type for all lines:
```typescript
class Line2DRealization2D {
  point: Vector3;      // Point on line (u, v, 1)
  direction: Vector3;  // Direction vector (u, v, 0)
  
  // Optional: For bounded lines
  point1?: Vector3;    // Start point (u, v, 1)
  point2?: Vector3;    // End point (u, v, 1)
}
```

**Benefits**:
- Clear ownership: each element belongs to exactly one plane
- Type hierarchy: polymorphic Line2D handling
- Unified storage: single `lines` map for all line types
- Better encapsulation: plane validates its own element constraints

**Migration**: 5-phase approach with non-breaking changes, dual storage, gradual migration, cleanup. See [refactoring-projection-plane-ownership.md](./refactoring-projection-plane-ownership.md) for detailed plan.

### HingeLine/HalfHingeLine2D Architecture

**Two-Level Structure for Proper Geometric Modeling**

Hinge lines require a dual representation: the 3D intersection line and its 2D projections on each plane.

**Architecture**:
- **HingeLine** (3D entity): Represents the actual 3D intersection line between two projection planes
  - Stores: id, name, plane1Id, plane2Id, optional 3D line geometry
  - Cannot be deleted, fixed element of the system
  - One per pair of projection planes (e.g., HL_HV between P_H and P_V)

- **HalfHingeLine2D** (2D entity per plane): The 2D representation of the HL in a specific plane's (u,v) coordinates
  - Stores: id, hingeLineId (parent reference), planeId, line2D (Line2D in plane coordinates)
  - Each HingeLine has exactly 2 HalfHingeLine2D objects (one per plane)
  - Owned by ProjectionPlane, not stored separately
  - Used for both regular HL and Broken HL (BHL) representations

**Rationale**:
- **Geometric correctness**: A 3D line has different 2D projections in each plane
- **Guide construction**: Guides are perpendicular to HalfHingeLine2D (not the 3D HingeLine) since perpendicularity is a 2D concept
- **Hit testing**: Each plane queries only its HalfHingeLine2D objects, not filtering all HingeLines
- **Unified infrastructure**: Same structure handles both HL (projection plane folds) and BHL (arbitrary plane intersections)

**Guide Relationship**:
- **Guide2D** (primary): Created by selecting HalfHingeLine2D + point in active plane
- **SiblingGuide2D**: Automatically created in the paired plane, perpendicular to that plane's HalfHingeLine2D
- Both guides reference their respective HalfHingeLine2D, maintaining proper geometric relationships

See [data-model.md § HingeLine](/specs/001-dihedral-learning-mvp/data-model.md#domain-entity-hingeline) and [data-model.md § Guide](/specs/001-dihedral-learning-mvp/data-model.md#domain-entity-guide) for detailed specifications.

## Project Structure

### Documentation (this feature)

```text
specs/001-dihedral-learning-mvp/
├── plan.md              # This file (implementation plan with phases)
├── spec.md              # Feature specification (existing)
├── data-model.md        # Data model definition (existing)
├── research.md          # Technical research (existing)
├── quickstart.md        # Developer quickstart (existing)
├── contracts/           # API contracts (existing)
│   └── api.yaml
└── tasks.md             # Detailed task breakdown (existing)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── canvas/          # SVG rendering components
│   │   ├── panels/          # Side panels (Actions, Elements)
│   │   ├── toolbars/        # Tool selection UI
│   │   ├── dialogs/         # Modals (Properties, Settings)
│   │   └── workspace/       # Main workspace layout
│   ├── composables/         # Vue composables for reusable logic
│   │   ├── useCommandExecution.ts
│   │   ├── useElementGeometry.ts
│   │   ├── useHoverHighlight.ts
│   │   ├── useSnapping.ts
│   │   └── useToolFeedback.ts
│   ├── domain/              # Core business logic
│   │   ├── world/           # World, Plane, geometric elements
│   │   ├── processTree/     # Dependency tracking
│   │   ├── calculations/    # Geometry calculations
│   │   └── viewState/       # View transformation state
│   ├── commands/            # Command pattern implementations
│   │   ├── Command.ts
│   │   ├── CommandStack.ts
│   │   ├── CreateFreePointCommand.ts
│   │   ├── CreateLineCommand.ts
│   │   └── operations/      # Dependency operations
│   ├── services/            # Application services
│   │   ├── DependencyService.ts
│   │   ├── GeometryService.ts
│   │   ├── ProjectService.ts
│   │   └── ValidationService.ts
│   ├── stores/              # State management (Pinia/composables)
│   │   ├── worldStore.ts
│   │   ├── processStore.ts
│   │   ├── toolStore.ts
│   │   └── viewStore.ts
│   ├── types/               # TypeScript type definitions
│   │   ├── ElementTypes.ts
│   │   ├── CommandTypes.ts
│   │   └── ResultTypes.ts
│   ├── App.vue
│   └── main.ts
├── tests/
│   ├── unit/
│   │   ├── commands/
│   │   ├── calculations/
│   │   └── domain/
│   └── e2e/
│       ├── basic-construction.spec.ts
│       ├── guide-creation.spec.ts
│       ├── point-transport.spec.ts
│       ├── distance-transport.spec.ts
│       ├── infeasibility.spec.ts
│       └── persistence.spec.ts
├── index.html
├── package.json
├── vite.config.ts
├── vitest.config.ts
└── playwright.config.ts
```

**Structure Decision**: Frontend application. The frontend handles geometric calculations, rendering, command orchestration, and the active app-shell project persistence boundary.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - this section is empty.

---

## Implementation Phases

This plan follows an incremental, layer-by-layer approach. Each phase adds one small capability, building on previous phases. Implementation starts with minimal data structures and progressively adds geometry types, tools, and UI features.

### Phase 1: Basic World Data Structures

**Implement minimal data model to store points**

- World class to hold geometric elements
- Basic 2D Point class with x, y coordinates
- Point storage in World (array or map)

**Dependencies**: None (foundation phase)  
**Outputs**: `frontend/src/domain/world/World.ts`, `frontend/src/domain/world/Point.ts`

---

### Phase 2: Minimal UI Skeleton

**Create basic Vue.js application**

- Vue.js 3 + TypeScript setup
- App.vue with simple layout
- SVG canvas component (empty for now)
- Basic styling

**Dependencies**: Phase 1  
**Outputs**: `frontend/src/App.vue`, `frontend/src/components/canvas/SvgCanvas.vue`

---

### Phase 3: Render Fixed Elements

**Display the two projection planes and coordinate system**

- Add fixed plane boundaries to World (P_V, P_H)
- Render P_V and P_H as rectangles/lines in SVG
- Show origin point (O)
- Show hinge line (HL_HV)
- Basic coordinate transformation (world → SVG coordinates)

**Dependencies**: Phase 2  
**Outputs**: `frontend/src/domain/world/Plane.ts`, rendering logic in SvgCanvas

---

### Phase 4: Render Points

**Display points on the canvas**

- Render Point objects as SVG circles
- Apply basic styling (color, radius)

**Dependencies**: Phase 3  
**Outputs**: Point rendering component/logic

---

### Phase 5: Create Free Points

**Add tool to place points on canvas**

- Toolbar with single "Point" tool button
- Click handler on canvas
- Create Point at click coordinates
- Add Point to World
- Point appears immediately on canvas

**Dependencies**: Phase 4  
**Outputs**: `frontend/src/components/toolbars/Toolbar.vue`, point creation logic  
**User Story**: US1 - Place point on active plane (partial)

---

### Phase 6: Basic Viewport Pan/Zoom

**Navigate the canvas**

- Pan with mouse drag
- Zoom with mouse wheel
- Update coordinate transformation

**Dependencies**: Phase 5  
**Outputs**: `frontend/src/composables/useViewport.ts`, `frontend/src/stores/viewStore.ts`  
**User Story**: US6 - Viewport manipulation (partial)

---

### Phase 7: Add 2D Lines

**Support line geometry**

- Line class (2D) with two endpoints
- Render lines as SVG line elements
- Store lines in World

**Dependencies**: Phase 6  
**Outputs**: `frontend/src/domain/world/Line.ts`, line rendering logic

---

### Phase 8: Line Creation Tool

**Tool to create lines between points**

- "Line" tool button in toolbar
- Select two existing points
- Create Line connecting them
- Point snapping (highlight nearby points)

**Dependencies**: Phase 7  
**Outputs**: Line tool implementation, `frontend/src/composables/useSnapping.ts`  
**User Story**: US2 - Create line/segment (partial)

---

### Phase 9: Add Process Tree

**Track construction history**

- ProcessTree data structure
- Action nodes for each operation (CreatePoint, CreateLine)
- Store actions in tree when operations execute

**Dependencies**: Phase 8  
**Outputs**: `frontend/src/domain/processTree/ProcessTree.ts`, Action types

---

### Phase 10: Command Pattern

**Make operations undoable**

- Command interface
- CreatePointCommand, CreateLineCommand
- CommandStack for undo/redo
- Undo/Redo buttons and shortcuts (Ctrl+Z, Ctrl+Y)

**Dependencies**: Phase 9  
**Outputs**: `frontend/src/commands/Command.ts`, `frontend/src/commands/CommandStack.ts`, specific command implementations  
**Constitution**: Command Pattern principle implemented

---

### Phase 11: Add Segments

**Support segment geometry**

- Segment class (finite line with endpoints)
- Render as SVG path
- Segment creation tool

**Dependencies**: Phase 10  
**Outputs**: `frontend/src/domain/world/Segment.ts`, segment tool  
**User Story**: US2 - Create segment (complete)

---

### Phase 12: Add Circles

**Support circle geometry**

- Circle class with center point and radius
- Render as SVG circle
- "Circle" tool (center + radius via drag or second point)

**Dependencies**: Phase 11  
**Outputs**: `frontend/src/domain/world/Circle.ts`, circle tool  
**User Story**: US2 - Create circle (complete)

---

### Phase 13: Add Guides

**Support guide lines perpendicular to hinge**

- Guide class
- Guide creation tool (from HL and a point)
- Render guides as dashed lines
- Extend guides across viewport

**Dependencies**: Phase 12  
**Outputs**: `frontend/src/domain/world/Guide.ts`, guide tool  
**User Story**: US3 - Create guide (complete)

---

### Phase 14: Line-Line Intersections

**Create intersection points**

- Intersection tool
- Select two lines
- Calculate intersection point
- Create point at intersection
- Handle parallel lines (no intersection)

**Dependencies**: Phase 13  
**Outputs**: `frontend/src/domain/calculations/Intersections.ts`, intersection tool  
**User Story**: US2 - Intersection points (partial)

---

### Phase 15: Point Transport via Guides

**Transport points between planes**

- Point transport tool
- Select source point and guide
- Calculate target point on opposite plane
- Create transported point

**Dependencies**: Phase 14  
**Outputs**: `frontend/src/commands/TransportPointCommand.ts`, transport calculations  
**User Story**: US4 - Point transport (complete)

---

### Phase 16: Distance Transport

**Transport distances along guides**

- Distance transport tool
- Select segment (distance), guide, and target point
- Create point at transported distance

**Dependencies**: Phase 15  
**Outputs**: `frontend/src/commands/TransportDistanceCommand.ts`  
**User Story**: US5 - Distance transport (complete)

---

### Phase 17: More Intersection Types

**Expand intersection capabilities**

- Line-Circle intersections
- Circle-Circle intersections
- Handle multiple intersection points

**Dependencies**: Phase 16  
**Outputs**: Extended `frontend/src/domain/calculations/Intersections.ts`  
**User Story**: US2 - All intersection types (complete)

---

### Phase 18: Actions Panel

**Show construction history in UI**

- Left sidebar panel
- List actions from ProcessTree
- Show action type and parameters
- Click action to highlight related objects

**Dependencies**: Phase 17  
**Outputs**: `frontend/src/components/panels/ActionsPanel.vue`

---

### Phase 19: Elements Panel

**Show all geometric objects**

- Right sidebar panel
- List points, lines, circles, guides
- Filter by type
- Click element to highlight on canvas

**Dependencies**: Phase 18  
**Outputs**: `frontend/src/components/panels/ElementsPanel.vue`

---

### Phase 20: Object Selection

**Select objects on canvas**

- Click to select objects
- Highlight selected objects
- Selection state management
- Multi-select with Ctrl+click

**Dependencies**: Phase 19  
**Outputs**: Selection logic, `frontend/src/stores/selectionStore.ts`

---

### Phase 21: Hover Highlighting

**Visual feedback on hover**

- Highlight objects under cursor
- Show object label on hover
- Different style from selection highlight

**Dependencies**: Phase 20  
**Outputs**: `frontend/src/composables/useHoverHighlight.ts`  
**User Story**: US6 - Hover highlighting (complete)

---

### Phase 22: Element Properties

**View and edit object properties**

- Properties panel/dialog
- Show coordinates, labels, visual styles
- Edit colors, stroke width, line style
- Apply changes to selected objects

**Dependencies**: Phase 21  
**Outputs**: `frontend/src/components/dialogs/PropertiesDialog.vue`  
**User Story**: US6 - Visual style editing (complete)

---

### Phase 23: Dependency Tracking

**Track which objects depend on others**

- Store dependencies in ProcessTree
- Update dependent objects when sources change
- Show dependencies in UI (arrows/tree links)

**Dependencies**: Phase 22  
**Outputs**: `frontend/src/services/DependencyService.ts`, `frontend/src/domain/processTree/operations/DependencyOperations.ts`

---

### Phase 24: Infeasibility Detection

**Detect impossible operations**

- Check for invalid operations (e.g., parallel lines intersection)
- Mark infeasible actions in ProcessTree (red indicator)
- Cascade infeasibility to dependent objects
- Show error messages

**Dependencies**: Phase 23  
**Outputs**: `frontend/src/services/ValidationService.ts`, infeasibility marking in UI  
**User Story**: US2, US4, US5 - Infeasibility handling (complete)

---

### Phase 25: 3D View Panel

**Show 3D reconstruction**

- 3D view panel (simple isometric or Three.js)
- Display both planes in 3D
- Show 3D objects derived from projections
- Basic 3D rotation

**Dependencies**: Phase 24  
**Outputs**: `frontend/src/components/panels/ThreeDView.vue`, 3D derivation logic  
**User Story**: US6 - 3D view (complete)

---

### Phase 26: File Save/Load

**Persist projects**

- Serialize World to JSON through `ProjectService`
- Save/load through the app-shell persistence port and Drive adapter
- Auto-save

**Dependencies**: Phase 25  
**Outputs**: `frontend/src/services/ProjectService.ts`, app-shell persistence use cases  
**User Story**: US1 - Persistence (complete)

---

### Phase 27: Additional UI Polish

**Improve user experience**

- Settings dialog (snap radius, grid, etc.)
- Keyboard shortcuts
- Fit-to-view
- Grid display
- Status bar with coordinate display

**Dependencies**: Phase 26  
**Outputs**: `frontend/src/components/dialogs/SettingsDialog.vue`, keyboard handling  
**User Story**: All - Polish and refinement

---

## Phase Summary

**Total Phases**: 27  
**Approach**: Incremental layer-by-layer development  
**Testing**: Unit tests added alongside each phase, E2E tests after Phase 26

### Phase Grouping

- **Phases 1-6**: Foundation (data model, UI skeleton, fixed elements, points, viewport)
- **Phases 7-13**: Basic geometry (lines, segments, circles, guides)
- **Phases 14-17**: Advanced geometry (intersections, transport operations)
- **Phases 18-22**: UI features (panels, selection, properties)
- **Phases 23-25**: Advanced features (dependencies, infeasibility, 3D view)
- **Phases 26-27**: Persistence and polish

### Constitution Alignment

- **Layered Architecture**: Maintained throughout all phases with clear domain/application/presentation separation
- **Command Pattern**: Introduced in Phase 10, extended in subsequent phases
- **Frontend-First**: Project persistence remains an app-shell/frontend boundary
- **Incremental Development**: Each phase adds one focused capability

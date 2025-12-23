# Data Model: Diedrico MVP

**Date**: 2025-12-22  
**Purpose**: Define domain entities, relationships, validation rules, and state transitions

---

## Entity Catalog

### Core Domain Entities

#### 1. Project

**Purpose**: Root aggregate containing all user work for one dihedral drawing exercise

**Fields**:
```typescript
interface Project {
  id: ProjectId;                    // UUID
  name: string;                     // User-provided name
  schemaVersion: string;            // "1.0.0" (semantic versioning)
  created: Date;                    // ISO 8601 timestamp
  modified: Date;                   // ISO 8601 timestamp, auto-updated
  planes: ProjectionPlane[];        // At least 2 (P_H, P_V)
  hingeLines: HingeLine[];          // At least 1 (HL_HV)
  elements2D: Element2D[];          // User-created 2D geometry
  elements3D: Element3D[];          // Derived 3D geometry
  actions: ConstructiveAction[];    // Command history (ordered)
  viewState: ViewState;             // UI state (zoom, camera, visibility)
}
```

**Relationships**:
- 1 Project → N ProjectionPlanes (min 2)
- 1 Project → N HingeLines (min 1)
- 1 Project → N Element2D
- 1 Project → N Element3D
- 1 Project → N ConstructiveActions (ordered list)
- 1 Project → 1 ViewState

**Validation Rules**:
- `name` must be non-empty, max 100 characters
- Must have at least 2 `planes` (H and V for MVP)
- Must have at least 1 `hingeLine` connecting those planes
- `schemaVersion` must match current or migrateable version
- `actions` order defines command history (immutable past)

**State Transitions**:
- **New** → **Active**: Created with default P_H, P_V, HL_HV
- **Active** → **Saved**: Persisted to storage (autosave every 500ms after edit)
- **Active** → **Closed**: User closes project, discards unsaved (no unsaved in MVP due to autosave)

---

#### 2. ProjectionPlane

**Purpose**: Named 2D surface where 2D elements exist

**Fields**:
```typescript
interface ProjectionPlane {
  id: PlaneId;                      // UUID
  name: string;                     // "P_H", "P_V", "P_A1", etc.
  isActive: boolean;                // Exactly one plane is active at a time
  isVisible: boolean;               // Toggle visibility in UI
  transform2DTo3D: Matrix4x4;       // Position/orientation in 3D space for 3D view
  color: Color;                     // Base color for plane representation in 3D
}
```

**Relationships**:
- 1 ProjectionPlane → N Element2D (elements belong to one plane)
- 2 ProjectionPlanes → 1 HingeLine (shared intersection)

**Validation Rules**:
- `name` must follow naming convention: "P_{identifier}"
- Exactly one plane in project must have `isActive = true`
- `transform2DTo3D` defines how 2D coordinates map to 3D space

**State Transitions**:
- **Inactive** ↔ **Active**: Clicking plane selector makes it active, previous active becomes inactive
- **Visible** ↔ **Hidden**: Toggle visibility (does not affect active state)

**Invariants**:
- Global invariant: Exactly 1 active plane per project
- Changing active plane does not mutate existing geometry

---

#### 3. HingeLine

**Purpose**: Intersection line shared by two **projection planes** (the physical fold line); used for guide creation

**Important**: A HingeLine entity represents the fold between two **projection planes** (like P_H and P_V). It is NOT used to represent **broken hinge lines (BHLs)**—intersections between arbitrary 3D planes.

**Broken Hinge Lines (BHL)**: When two arbitrary 3D planes intersect, the intersection is called a broken hinge line. BHLs are **projected** onto the projection planes as regular Element2D lines.

**Example**: With planes A, B, C:
- HL_AB and HL_AC are HingeLine entities (actual folds between projection planes)
- BHL_BC (intersection of planes B and C) is NOT stored as a HingeLine entity
- Instead, BHL_BC appears as two separate Element2D lines (projections on planes B and C)
- Distance transport occurs between these BHL projections (Element2D lines)

**Fields**:
```typescript
interface HingeLine {
  id: HingeLineId;                  // UUID
  name: string;                     // "HL_HV", "HL_HA1", etc.
  plane1: PlaneId;                  // Reference to first plane
  plane2: PlaneId;                  // Reference to second plane
  line2DInPlane1: Line2D;           // Representation in plane1 coordinates
  line2DInPlane2: Line2D;           // Representation in plane2 coordinates
}
```

**Relationships**:
- 1 HingeLine → 2 ProjectionPlanes
- 1 HingeLine → N Guides (guides are perpendicular to HL)

**Validation Rules**:
- `plane1` and `plane2` must exist and be distinct
- `name` follows convention: "HL_{id1}{id2}" (e.g., HL_HV)
- For geometry, HL acts like a regular line (can compute intersections, perpendiculars)

**Invariants**:
- Each pair of projection planes shares at most one HL (in MVP, exactly one: HL_HV)
- Only used for folds between projection planes, not for general plane intersections

---

#### 4. Guide

**Purpose**: Line perpendicular to HL/BHL used for transporting points/distances between planes

**Fields**:
```typescript
interface Guide {
  id: GuideId;                      // UUID
  name: string;                     // Auto-generated "g1", "g2", etc.
  referenceLineId: ElementId;       // Reference to HL or BHL projection (any line element)
  sourcePoint: Point2DId;           // Point on one plane that defines guide
  line2DInPlane1: Line2D;           // Perpendicular to reference line in plane1
  line2DInPlane2: Line2D;           // Perpendicular to reference line in plane2
  visualStyle: VisualStyle;         // Inherited or overridden
}
```

**Relationships**:
- 1 Guide → 1 Element2D (reference line: HL representation or BHL projection)
- 1 Guide → 1 Point2D (source point)
- N Elements → 1 Guide (elements created via guide transport)

**Validation Rules**:
- `line2DInPlane1` and `line2DInPlane2` must be perpendicular to the reference line
- `sourcePoint` must belong to one of the planes where the reference line exists
- Guide belongs to **both** planes associated with the reference line

**Computation**:
- Given: Reference line (HL or BHL projection) and point P on plane1
- Compute: Line through P perpendicular to reference line
- Result: Guide represented in both plane1 and plane2 coordinate systems

**BHL Behavior**:
- When guide is created from a BHL projection on plane1, it is **automatically transported** to plane2
- This establishes immediate correspondence between the BHL projections on both planes
- The guide update is atomic (both projections appear simultaneously)

---

#### 5. Element2D

**Purpose**: 2D geometric entity on a projection plane

**Subtypes**:
```typescript
type Element2D = Point2D | Segment2D | Line2D | Circle2D | Arc2D;

interface Point2D {
  id: ElementId;
  name: string;                     // "a", "b", "p1", etc.
  plane: PlaneId;                   // Belongs to exactly one plane
  x: number;                        // Coordinate in plane's 2D space
  y: number;
  visualStyle: VisualStyle;
  createdBy: ActionId;              // Which action created this
}

interface Segment2D {
  id: ElementId;
  name: string;                     // "s1", "s2", etc.
  plane: PlaneId;
  point1: Point2DId;                // Start point
  point2: Point2DId;                // End point
  visualStyle: VisualStyle;
  createdBy: ActionId;
}

interface Line2D {
  id: ElementId;
  name: string;                     // "r1", "r2", etc.
  plane: PlaneId;
  point1: Point2DId;                // Two points define infinite line
  point2: Point2DId;
  // Alternatively: pointOnLine + directionVector
  visualStyle: VisualStyle;
  createdBy: ActionId;
}

interface Circle2D {
  id: ElementId;
  name: string;                     // "c1", "c2", etc.
  plane: PlaneId;
  center: Point2DId;
  radius: number;                   // Or: defined by 3 points
  visualStyle: VisualStyle;
  createdBy: ActionId;
}

interface Arc2D {
  id: ElementId;
  name: string;                     // "arc1", "arc2", etc.
  plane: PlaneId;
  center: Point2DId;
  startPoint: Point2DId;
  endPoint: Point2DId;
  // Or: center + radius + startAngle + endAngle
  visualStyle: VisualStyle;
  createdBy: ActionId;
}
```

**Relationships**:
- 1 Element2D → 1 ProjectionPlane (belongs to)
- 1 Element2D → 1 ConstructiveAction (createdBy)
- 1 Element2D → N Element2D (dependencies: segments depend on points, etc.)
- N Element2D → M Element3D (2D elements are projections of 3D elements)

**Validation Rules**:
- **Point2D**: No constraints beyond plane existence
- **Segment2D**: `point1` and `point2` must exist on same plane, must not be coincident
- **Line2D**: `point1` and `point2` must exist on same plane, must not be coincident
- **Circle2D**: `center` must exist, `radius > 0`
- **Arc2D**: `center`, `startPoint`, `endPoint` must exist on same plane, must define valid arc

**Naming Convention**:
- Lowercase for 2D elements: `a`, `b`, `s1`, `r1`, `c1`
- Suffixes for projections: `A_H`, `A_V` (3D point A projected onto H/V planes)

**Infeasibility**:
- An Element2D becomes infeasible if:
  - Its defining inputs become infeasible (e.g., segment's points)
  - Computation fails (e.g., circle from 3 collinear points)
- Infeasible elements are not rendered, marked in panels

---

#### 6. Element3D

**Purpose**: 3D geometric entity derived from compatible 2D projections

**Subtypes**:
```typescript
type Element3D = Point3D | Line3D | Segment3D | Plane3D;

interface Point3D {
  id: ElementId;
  name: string;                     // "A", "B", etc. (uppercase)
  projectionH: Point2DId;           // Projection on P_H
  projectionV: Point2DId;           // Projection on P_V
  x: number;                        // Computed 3D coordinates
  y: number;
  z: number;
  visualStyle: VisualStyle;
  createdBy: ActionId;
}

interface Line3D {
  id: ElementId;
  name: string;                     // "L1", "L2", etc.
  projectionH: Line2DId;            // Projection on P_H
  projectionV: Line2DId;            // Projection on P_V
  visualStyle: VisualStyle;
  createdBy: ActionId;
}

interface Segment3D {
  id: ElementId;
  name: string;                     // "S1", "S2", etc.
  point1: Point3DId;                // 3D endpoints
  point2: Point3DId;
  visualStyle: VisualStyle;
  createdBy: ActionId;
}

interface Plane3D {
  id: ElementId;
  name: string;                     // "Pi1", "Pi2", etc.
  traceH: Line2DId;                 // Horizontal trace (plane's intersection with P_H)
  traceV: Line2DId;                 // Vertical trace (plane's intersection with P_V)
  visualStyle: VisualStyle;
  createdBy: ActionId;
}
```

**Relationships**:
- 1 Element3D → N Element2D (projections)
- 1 Element3D → 1 ConstructiveAction (createdBy)

**Validation Rules**:
- **Point3D**: `projectionH` and `projectionV` must exist, must be compatible (transportable via guide or geometrically consistent)
- **Line3D**: `projectionH` and `projectionV` must exist, must be compatible projections of same 3D line
- **Segment3D**: `point1` and `point2` must exist, must not be coincident
- **Plane3D**: `traceH` and `traceV` must exist, must not be parallel (define unique plane)

**Compatibility Check**:
- For Point3D: projections must align via guide transport or geometric constraints
- If incompatible inputs selected, creation fails (FR-022)

**Derived vs Generative**:
- **Generative projections**: The 2D elements explicitly selected to create 3D element
- **Derived projections**: 2D elements created as a consequence of 3D element existing
- Visual distinction: generative rendered normally, derived de-emphasized (lighter color, dashed)

---

#### 7. ConstructiveAction

**Purpose**: Records one user operation; builds command history; defines dependencies

**Fields**:
```typescript
interface ConstructiveAction {
  id: ActionId;                     // UUID
  type: ActionType;                 // "CreatePoint", "CreateSegment", "CreateGuide", "TransportPoint", etc.
  timestamp: Date;                  // When action was performed
  inputs: ElementId[];              // Dependencies (what this action consumes)
  outputs: ElementId[];             // Results (what this action produces)
  parameters: Record<string, any>;  // Tool-specific params (e.g., radius, angle)
  auxiliaryActions: ConstructiveAction[]; // Nested actions (e.g., auto-created points)
  subprocess?: SubprocessId;        // Optional grouping for collapsible sections
  infeasible: boolean;              // Computed from validation
  infeasibilityReason?: string;     // Human-readable explanation
  visualStyle?: VisualStyle;        // Style applied to outputs (inherited by elements)
}

enum ActionType {
  // Point tools
  CreateFreePoint = "CreateFreePoint",
  CreatePointOnElement = "CreatePointOnElement",
  CreateIntersectionPoint = "CreateIntersectionPoint",
  CreateMidpoint = "CreateMidpoint",
  
  // Segment/Line tools
  CreateSegment = "CreateSegment",
  CreateLine = "CreateLine",
  CreateParallelLine = "CreateParallelLine",
  CreatePerpendicularLine = "CreatePerpendicularLine",
  
  // Circle tools
  CreateCircleCenterRadius = "CreateCircleCenterRadius",
  CreateCircleThreePoints = "CreateCircleThreePoints",
  
  // Dihedral tools
  CreateGuide = "CreateGuide",
  TransportPoint = "TransportPoint",
  TransportDistance = "TransportDistance",
  
  // 3D tools
  Create3DPoint = "Create3DPoint",
  Create3DLine = "Create3DLine",
  Create3DSegment = "Create3DSegment",
  Create3DPlane = "Create3DPlane",
  
  // Future: group, style, transform
}
```

**Relationships**:
- 1 Action → N Elements (inputs)
- 1 Action → N Elements (outputs)
- 1 Action → N Actions (auxiliary actions, nested)
- N Actions → 1 Subprocess (optional grouping)

**Validation Rules**:
- `inputs` must all exist (or action is infeasible)
- `type` must match a known ActionType
- `outputs` are created by executing the action's command
- `auxiliaryActions` execute before main action, provide inputs

**State Transitions**:
- **Executable** → **Executed**: Command validates and executes successfully
- **Executed** → **Infeasible**: Upstream input changes, validation fails during recomputation
- **Infeasible** → **Executed**: Upstream input corrected, validation passes

**Auxiliary Actions Pattern**:
- When user clicks intersection → action creates intersection point as auxiliary
- When user clicks empty space → action creates free point as auxiliary
- UI shows main action with expandable nested actions:
  ```
  ▼ Create segment s1
    └─ Create free point a (auxiliary)
    └─ Create free point b (auxiliary)
  ```

---

#### 8. DependencyGraph

**Purpose**: Directed acyclic graph (DAG) of element/action relationships for recomputation

**Structure**:
```typescript
interface DependencyGraph {
  nodes: Map<ElementId | ActionId, GraphNode>;
  edges: Map<ElementId | ActionId, Set<ElementId | ActionId>>; // adjacency list
}

interface GraphNode {
  id: ElementId | ActionId;
  type: "element" | "action";
  infeasible: boolean;
}
```

**Operations**:
- `addNode(id, type)`: Add element or action to graph
- `addEdge(from, to)`: Add dependency (to depends on from)
- `removeNode(id)`: Remove element/action and its edges
- `getAncestors(id)`: Get all inputs (BFS upward)
- `getDescendants(id)`: Get all outputs (BFS downward)
- `topologicalSort()`: Order for recomputation
- `propagateInfeasibility(id)`: Mark all descendants as infeasible

**Recomputation Algorithm**:
1. Element changes (e.g., point moved)
2. Mark element as changed
3. `getDescendants(element)` → affected actions
4. `topologicalSort(affected)` → execution order
5. For each action in order:
   - Validate inputs
   - If valid: recompute outputs
   - If invalid: mark infeasible, skip descendants
6. Update UI

**Validation Rules**:
- Graph must be acyclic (no circular dependencies)
- Detect cycles during edge addition, reject if cycle would form
- Each element has exactly one creator action
- Actions can have multiple input elements

---

#### 9. VisualStyle

**Purpose**: Non-geometric styling properties with inheritance

**Fields**:
```typescript
interface VisualStyle {
  color?: Color;                    // Unset → inherit from subprocess/default
  lineWidth?: number;               // Unset → inherit
  lineStyle?: LineStyle;            // "solid" | "dashed" | "dotted" | unset
  visibility?: boolean;             // Unset → inherit (default true)
  opacity?: number;                 // 0-1, unset → inherit
}

interface Color {
  r: number; // 0-255
  g: number;
  b: number;
  a: number; // 0-1
}

type LineStyle = "solid" | "dashed" | "dotted";
```

**Inheritance Rules**:
- Elements inherit from containing subprocess's style
- Subprocess inherits from parent subprocess or default
- Explicit overrides break inheritance for that property only
- "Reset to inherited" removes override, restores inheritance

**Special Styles**:
- **Infeasible elements**: Red color, dashed line (system override, not user-settable)
- **Derived projections**: 50% opacity, lighter color (distinguishes from generative)
- **Hover highlight**: Temporary glow/outline (CSS, not persisted)

**Validation Rules**:
- `color` components in valid ranges
- `lineWidth` > 0
- `opacity` in [0, 1]

---

#### 10. ViewState

**Purpose**: UI state for pan/zoom/camera/visibility (non-geometric, per-project)

**Fields**:
```typescript
interface ViewState {
  // 2D view
  view2D: {
    pan: { x: number; y: number };    // Pan offset
    zoom: number;                      // Zoom level (1.0 = 100%)
    activePlane: PlaneId;              // Currently active plane
  };
  
  // 3D view
  view3D: {
    camera: {
      position: { x: number; y: number; z: number };
      target: { x: number; y: number; z: number };
      up: { x: number; y: number; z: number };
    };
    show2DElements: boolean;           // Toggle 2D elements on 3D planes
    showLinkingVisuals: boolean;       // Toggle dashed connectors between 2D/3D
  };
  
  // Visibility toggles
  visibility: {
    planes: Map<PlaneId, boolean>;     // Per-plane visibility
    hingeLines: Map<HingeLineId, boolean>;
    guides: Map<GuideId, boolean>;
  };
  
  // UI preferences
  ui: {
    dependencyHoverEnabled: boolean;   // FR-036: toggle hover highlighting
    snapRadius: number;                // FR-038: point snapping radius (pixels)
  };
}
```

**Relationships**:
- 1 Project → 1 ViewState
- ViewState is saved/loaded with project

**Validation Rules**:
- `zoom` > 0 (typically in range [0.1, 10.0])
- `activePlane` must exist in project
- Camera vectors must be valid (non-zero, orthogonal up/forward)

---

## Entity Relationships Diagram

```
Project (1) ──┬── (N) ProjectionPlane
              │       │
              │       └─ (1) Element2D (N)
              │
              ├── (N) HingeLine ── (2) ProjectionPlane
              │       │
              │       └── (N) Guide ── (1) Point2D
              │
              ├── (N) Element2D ──┬── (N) ConstructiveAction (inputs)
              │                   └── (1) ConstructiveAction (createdBy)
              │
              ├── (N) Element3D ──┬── (N) Element2D (projections)
              │                   └── (1) ConstructiveAction (createdBy)
              │
              ├── (N) ConstructiveAction ──┬── (N) Element (inputs)
              │                            ├── (N) Element (outputs)
              │                            └── (N) ConstructiveAction (auxiliary)
              │
              ├── (1) DependencyGraph ── (N) Element + Action
              │
              └── (1) ViewState
```

---

## Validation Rules Summary

### Global Invariants

1. **Single Active Plane**: Exactly one `ProjectionPlane.isActive = true` per project
2. **Acyclic Dependencies**: `DependencyGraph` must be DAG (no circular dependencies)
3. **Element Ownership**: Each `Element2D` belongs to exactly one `ProjectionPlane`
4. **Action History**: `Project.actions` is append-only ordered list (immutable past)

### Per-Entity Constraints

| Entity | Constraint | Error Handling |
|--------|-----------|----------------|
| Segment2D | Endpoints not coincident | Infeasible at creation (FR-011) |
| Line2D | Two distinct points | Infeasible at creation |
| Circle2D | Radius > 0 or 3 non-collinear points | Infeasible at creation |
| Guide | Perpendicular to HL | Computed, cannot fail if HL valid |
| Point3D | Compatible projections | Infeasible at creation (FR-022) |
| ConstructiveAction | All inputs exist and valid | Infeasible if inputs change (FR-012) |

---

## State Transition Diagrams

### Element Lifecycle

```
[Non-existent] 
    ↓ (command.execute())
[Valid] ←→ [Infeasible]
    │           ↑
    │           │ (upstream change invalidates)
    │           │
    │           ↓ (upstream change restores)
    │       [Valid]
    ↓ (command.undo())
[Deleted]
```

### Action Lifecycle

```
[Pending Execution]
    ↓ (validation passes)
[Executed - Valid] 
    ↓ (upstream changes)
[Recomputing]
    ↓ (validation fails)
[Infeasible]
    ↓ (upstream corrected)
[Recomputing]
    ↓ (validation passes)
[Executed - Valid]
```

### Project Lifecycle

```
[New]
    ↓ (user adds elements)
[Active - Unsaved]
    ↓ (autosave after 500ms)
[Active - Saved]
    ↓ (user closes)
[Closed]
    ↓ (user reopens)
[Active - Saved]
```

---

## Data Access Patterns

### Query Patterns

1. **Get visible elements on active plane**:
   - Filter `elements2D` by `plane === activePlane && visualStyle.visibility !== false`
   - Used by: 2D workspace rendering
   - Performance: O(N) where N = total elements; optimize with indexed store

2. **Get dependency descendants for hover highlight**:
   - Call `dependencyGraph.getDescendants(hoveredElementId)`
   - Returns Set of ElementIds
   - Used by: Hover highlight composable (FR-016)
   - Performance: O(E) where E = edges; typically <100ms for 200 elements

3. **Get infeasible actions**:
   - Filter `actions` by `infeasible === true`
   - Used by: Actions panel (visual indicator)
   - Performance: O(A) where A = actions; fast, actions list is <1000

4. **Get elements created by action** (for undo):
   - Access `action.outputs`
   - Used by: Command.undo()
   - Performance: O(1) array lookup

5. **Get 2D projections of 3D element**:
   - Access `element3D.projectionH`, `element3D.projectionV`
   - Used by: 3D view rendering, linking visuals
   - Performance: O(1) direct references

### Persistence Strategy

**Serialization**:
- Serialize entire `Project` to JSON
- Include `schemaVersion` for migrations
- Embed full dependency graph (can reconstruct on load)

**Deserialization**:
- Parse JSON
- Validate schema version
- Reconstruct domain objects
- Rebuild `DependencyGraph` from action inputs/outputs
- Validate global invariants

**Optimizations**:
- Incremental save: Only serialize changed elements (future)
- Compress JSON with gzip for storage
- Lazy load: Load project metadata (id, name, modified) separate from full data

---

## Summary

This data model defines 10 core entities with clear relationships, validation rules, and state transitions. Key design decisions:

1. **Explicit creation**: No implicit entities; all geometry traceable to actions
2. **Dependency graph**: Enables parametric recomputation and hover highlighting
3. **Infeasibility as state**: Temporary condition, not deletion; aids learning
4. **Style inheritance**: Separates visual from geometric concerns
5. **Frontend-owned**: All domain logic in frontend; backend stores JSON

**Next**: Generate API contracts for backend persistence endpoints.

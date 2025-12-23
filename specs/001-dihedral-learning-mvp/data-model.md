# Data Model: Diedrico MVP

**Date**: 2025-12-22  
**Purpose**: Define domain entities, relationships, validation rules, and state transitions

---

## Architecture Overview

The data model is organized into three distinct layers:

### 1. **Domain Layer** (Geometric Truth)
Contains the pure geometric definitions and construction rules:
- **3D Entities**: 3D points, lines, segments, planes defined by their construction rules
- **2D Entities**: 2D geometric elements on projection planes with their defining rules
- **Construction Metadata**: Hinge lines, guides, projection planes, actions, subprocesses

**Key characteristic**: Domain entities store **how** elements are defined, not **how** they're rendered. They contain:
- Geometric parameters (coordinates, references to defining elements)
- Dependency relationships (which action created this, which elements it depends on)
- Metadata (name, visual style properties)
- Validation state (infeasible flag)

**What domain entities contain**:
- Construction rules and defining parameters
- Pointers to generating action (`createdBy: ActionId`) - subprocess membership obtained through action
- Visual style properties (`visualStyle: VisualStyle`) - note: inheritance resolved in presentation layer
- Geometric coordinates/references (defining elements, not rendering coordinates)

### 2. **Presentation Layer** (Rendering Primitives)
Low-level representation ready for direct SVG conversion:
- **Render Primitives**: Points, paths, circles, arcs with concrete screen-space or world-space coordinates
- **Source References**: Each primitive points back to its source domain entity
- **Visual Attributes**: Stroke, fill, width, style, visibility state

**Key characteristic**: Presentation entities are computed from domain entities and contain all information needed for rendering (coordinates, styles, visibility).

### 3. **Persistence Layer** (Project State)
Project-level container and metadata:
- Project info, schema version, timestamps
- View state (zoom, pan, camera)
- Collections of domain entities

---

## Layer 1: Domain Entities

### Domain Entity: World

**Purpose**: Contains all problem domain data - the geometric construction (the "what" that is being built)

**Fields**:
```typescript
interface World {
  planes: ProjectionPlane[];        // Projection planes (min 2: P_H, P_V)
  hingeLines: HingeLine[];          // Hinge lines connecting planes (min 1: HL_HV)
  elements2D: Element2D[];          // 2D geometric elements on projection planes
  elements3D: Element3D[];          // 3D elements derived from 2D projections
  dependencyGraph: DependencyGraph; // DAG of element/action dependencies
}
```

**Relationships**:
- 1 World → N ProjectionPlanes (min 2)
- 1 World → N HingeLines (min 1) 
- 1 World → N Element2D
- 1 World → N Element3D
- 1 World → 1 DependencyGraph

**Validation Rules**:
- Must have at least 2 `planes` (H and V for MVP)
- Must have at least 1 `hingeLine` connecting those planes
- `dependencyGraph` must be acyclic (DAG)
- Exactly one plane must have `isActive = true`

---

### Persistence Entity: Project

**Purpose**: Root aggregate containing all user work for one dihedral drawing exercise

**Fields**:
```typescript
interface Project {
  id: ProjectId;                    // UUID
  name: string;                     // User-provided name
  schemaVersion: string;            // "1.0.0" (semantic versioning)
  created: Date;                    // ISO 8601 timestamp
  modified: Date;                   // ISO 8601 timestamp, auto-updated
  world: World;                     // All domain/construction data (the "what")
  processTree: ProcessTree;         // The process that builds/manipulates the world (the "how")
  viewState: ViewState;             // UI state (zoom, camera, visibility)
}
```

**Conceptual Model**:
- **World**: The geometric construction - planes, elements, dependencies
- **ProcessTree**: The construction process - actions organized in subprocesses/groups
- **ViewState**: UI presentation state

The process tree manipulates the world through actions that create/modify elements.

**Relationships**:
- 1 Project → 1 World
- 1 Project → 1 ProcessTree
- 1 Project → 1 ViewState

**Validation Rules**:
- `name` must be non-empty, max 100 characters
- `schemaVersion` must match current or migrateable version
- `world` must satisfy World validation rules
- `processTree` must satisfy ProcessTree validation rules

**State Transitions**:
- **New** → **Active**: Created with default World (P_H, P_V, HL_HV) and empty ProcessTree
- **Active** → **Saved**: Persisted to storage (autosave every 500ms after edit)
- **Active** → **Closed**: User closes project, discards unsaved (no unsaved in MVP due to autosave)

---

## Process Layer (Construction History)

### Domain Entity: ProcessTree

**Purpose**: Unified tree structure representing the construction process - how the world was built

**Fields**:
```typescript
interface ProcessTree {
  root: Process;                    // Single root process (logically a Subprocess)
}

// Base interface for all nodes in the tree
interface ProcessNodeBase {
  id: string;                       // UUID
  type: "subprocess" | "actionGroup" | "action";
  created: Date;
}

// Common ancestor for nodes that can contain children
interface ProcessContainer extends ProcessNodeBase {
  name: string;                     // User-defined or auto-generated
}

// All possible node types
type ProcessNode = Subprocess | ActionGroup | ConstructiveAction;
```

**Tree Structure**:
- **Process** (root): Special Subprocess containing all construction history
- **Subprocess** nodes: can contain Subprocess or ActionGroup children (mixed, ordered by creation time)
- **ActionGroup** nodes: can contain Action children only (one or more)
- **Action** nodes: leaf nodes (no children, MUST be inside ActionGroup)

**Traversal**:
- Depth-first traversal gives execution order
- Children are ordered by creation time (immutable history)
- Actions are executed in tree order
- ALL actions must be inside an ActionGroup (even if it's the only action in the group)

**Example Tree**:
```
ProcessTree.root (Process)
├─ Subprocess "Construction Phase 1"
│  ├─ ActionGroup "Create segment s1"
│  │  └─ Action "Create segment s1"
│  ├─ ActionGroup "Auxiliary for s1"
│  │  ├─ Action "Create free point a"
│  │  └─ Action "Create free point b"
│  └─ ActionGroup "Create circle c1"
│     └─ Action "Create circle c1"
└─ Subprocess "Transport Operations"
   ├─ Subprocess "Guide Setup" (nested)
   │  └─ ActionGroup "Create guide g1"
   │     └─ Action "Create guide g1"
   └─ ActionGroup "Auxiliary for transport"
      └─ Action "Create intersection point"
```

**Relationships**:
- 1 ProcessTree → 1 Process (root)
- 1 Process → N (Subprocess | ActionGroup) (children, mixed and ordered)
- 1 Subprocess → N (Subprocess | ActionGroup) (children, mixed and ordered - NO direct Action children)
- 1 ActionGroup → N Action (children, ordered - at least 1)
- ProcessNodes form a single unified tree

**Validation Rules**:
- Tree must be valid (no cycles, each node has at most one parent)
- Process is root node (single entry point)
- Action execution order determined by depth-first tree traversal
- Children ordered by creation time (immutable)
- ActionGroups can only contain Actions (no nesting of containers)
- ActionGroups must contain at least one Action
- Subprocesses can contain Subprocesses or ActionGroups (mixed) - NEVER direct Actions
- ALL Actions must be inside an ActionGroup

---

## Layer 1: Domain Entities

### Domain Entity: ProjectionPlane

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

### Domain Entity: HingeLine

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

### Domain Entity: Guide

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

### Domain Entity: Element2D

**Purpose**: 2D geometric entity on a projection plane with full construction and metadata

**Subtypes**:
```typescript
type Element2D = Point2D | Segment2D | Line2D | Circle2D | Arc2D;

interface Point2D {
  id: ElementId;
  name: string;                     // "a", "b", "p1", etc.
  plane: PlaneId;                   // Belongs to exactly one plane
  x: number;                        // Coordinate in plane's 2D space (defining, not rendering)
  y: number;
  
  // Metadata and relationships (Domain Layer concerns)
  createdBy: ActionId;              // Which action created this (action contains subprocess)
  visualStyle: VisualStyle;         // Style properties (inheritance not resolved yet)
  infeasible: boolean;              // Validation state
}

interface Segment2D {
  id: ElementId;
  name: string;                     // "s1", "s2", etc.
  plane: PlaneId;
  point1: Point2DId;                // Start point (defining reference)
  point2: Point2DId;                // End point (defining reference)
  
  // Metadata and relationships
  createdBy: ActionId;              // Action contains subprocess membership
  visualStyle: VisualStyle;
  infeasible: boolean;
}

interface Line2D {
  id: ElementId;
  name: string;                     // "r1", "r2", etc.
  plane: PlaneId;
  point1: Point2DId;                // Two points define infinite line
  point2: Point2DId;
  // Alternatively: pointOnLine + directionVector
  
  // Metadata and relationships
  createdBy: ActionId;
  visualStyle: VisualStyle;
  infeasible: boolean;
}

interface Circle2D {
  id: ElementId;
  name: string;                     // "c1", "c2", etc.
  plane: PlaneId;
  center: Point2DId;
  radius: number;                   // Or: defined by 3 points
  
  // Metadata and relationships
  createdBy: ActionId;
  visualStyle: VisualStyle;
  infeasible: boolean;
}

interface Arc2D {
  id: ElementId;
  name: string;                     // "arc1", "arc2", etc.
  plane: PlaneId;
  center: Point2DId;
  startPoint: Point2DId;
  endPoint: Point2DId;
  // Or: center + radius + startAngle + endAngle
  
  // Metadata and relationships
  createdBy: ActionId;
  subprocess?: SubprocessId;
  visualStyle: VisualStyle;
  infeasible: boolean;
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

### Domain Entity: Element3D

**Purpose**: 3D geometric entity derived from compatible 2D projections

**Subtypes**:
```typescript
type Element3D = Point3D | Line3D | Segment3D | Plane3D;

interface Point3D {
  id: ElementId;
  name: string;                     // "A", "B", etc. (uppercase)
  projectionH: Point2DId;           // Projection on P_H (defining reference)
  projectionV: Point2DId;           // Projection on P_V (defining reference)
  x: number;                        // Computed 3D coordinates
  y: number;
  z: number;
  
  // Metadata and relationships
  createdBy: ActionId;
  visualStyle: VisualStyle;
  infeasible: boolean;
}

interface Line3D {
  id: ElementId;
  name: string;                     // "L1", "L2", etc.
  projectionH: Line2DId;            // Projection on P_H (defining reference)
  projectionV: Line2DId;            // Projection on P_V (defining reference)
  
  // Metadata and relationships
  createdBy: ActionId;
  visualStyle: VisualStyle;
  infeasible: boolean;
}

interface Segment3D {
  id: ElementId;
  name: string;                     // "S1", "S2", etc.
  point1: Point3DId;                // 3D endpoints (defining references)
  point2: Point3DId;
  
  // Metadata and relationships
  createdBy: ActionId;
  visualStyle: VisualStyle;
  infeasible: boolean;
}

interface Plane3D {
  id: ElementId;
  name: string;                     // "Pi1", "Pi2", etc.
  traceH: Line2DId;                 // Horizontal trace (defining reference)
  traceV: Line2DId;                 // Vertical trace (defining reference)
  
  // Metadata and relationships
  createdBy: ActionId;
  visualStyle: VisualStyle;
  infeasible: boolean;
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

## Layer 2: Presentation Entities (Rendering Primitives)

**Purpose**: Low-level representation optimized for SVG rendering, computed from domain entities

### RenderPrimitive

All presentation entities derive from a base RenderPrimitive:

```typescript
interface RenderPrimitive {
  id: PrimitiveId;                  // Unique ID for this render primitive
  sourceEntity: ElementId;          // Reference to domain entity (Element2D or Element3D)
  layer: RenderLayer;               // Which SVG layer to render in
  visible: boolean;                 // Computed from element visibility, plane visibility, etc.
  style: ComputedStyle;             // Resolved visual style (no inheritance, fully computed)
  infeasible: boolean;              // Copied from source entity
}

enum RenderLayer {
  HingeLines = "hinge-lines",       // Physical fold lines between projection planes
  Guides = "guides",                // Transport guides
  Elements = "elements",            // Regular geometric elements
  BHLProjections = "bhl-projections", // Broken hinge line projections (may be dashed)
  Highlights = "highlights",        // Hover/selection highlights
  Snap = "snap",                    // Snap indicators
  Cursor = "cursor"                 // Cursor feedback
}

interface ComputedStyle {
  stroke: string;                   // Hex color, fully resolved
  strokeWidth: number;              // Pixels
  strokeStyle: "solid" | "dashed" | "dotted";
  fill: string;                     // Hex color for closed shapes
  opacity: number;                  // 0.0 - 1.0
  zIndex: number;                   // Within layer
}
```

### Presentation Primitives by Type

```typescript
type PresentationPrimitive = 
  | PointPrimitive 
  | PathPrimitive 
  | CirclePrimitive 
  | ArcPrimitive
  | TextPrimitive;

interface PointPrimitive extends RenderPrimitive {
  type: "point";
  x: number;                        // World coordinates (for 2D) or screen coordinates
  y: number;
  radius: number;                   // Display radius in pixels
}

interface PathPrimitive extends RenderPrimitive {
  type: "path";
  points: Array<{x: number, y: number}>; // Line segments, polylines
  closed: boolean;                  // Connect last to first?
}

interface CirclePrimitive extends RenderPrimitive {
  type: "circle";
  cx: number;                       // Center X (world coordinates)
  cy: number;                       // Center Y
  r: number;                        // Radius (world units)
}

interface ArcPrimitive extends RenderPrimitive {
  type: "arc";
  cx: number;
  cy: number;
  r: number;
  startAngle: number;               // Radians
  endAngle: number;
  largeArc: boolean;                // SVG large-arc-flag
  sweep: boolean;                   // SVG sweep-flag
}

interface TextPrimitive extends RenderPrimitive {
  type: "text";
  x: number;
  y: number;
  text: string;                     // Element name label
  fontSize: number;                 // Pixels
  anchor: "start" | "middle" | "end";
}
```

### Presentation Conversion

Domain entities are converted to presentation primitives by the **PresentationService**:

```typescript
class PresentationService {
  // Convert a single domain entity to one or more render primitives
  entityToPrimitives(entity: Element2D | Element3D, context: RenderContext): PresentationPrimitive[];
  
  // Rebuild entire presentation layer from domain
  rebuildPresentationLayer(project: Project): PresentationPrimitive[];
  
  // Incremental update when entity changes
  updatePrimitives(entityId: ElementId): PresentationPrimitive[];
}

interface RenderContext {
  viewState: ViewState;             // Current zoom, pan
  highlightedEntities: Set<ElementId>; // Hover/selection state
  activeSnap?: SnapTarget;          // Current snap target
}
```

**Key behaviors**:
- **Domain entity changes** → recompute affected primitives
- **Style inheritance resolved** → primitives contain final computed style
- **Visibility computed** → from element.visible && plane.visible && !infeasible
- **Coordinates finalized** → primitives have exact rendering coordinates

**Example conversion**:

```typescript
// Domain: Segment2D connecting two points
const segment: Segment2D = {
  id: "seg-123",
  plane: "plane-H",
  point1: "p1",
  point2: "p2",
  visualStyle: { strokeWidth: 2 } // Inherits color from subprocess
};

// Presentation: PathPrimitive for SVG <line>
const primitive: PathPrimitive = {
  id: "prim-seg-123",
  sourceEntity: "seg-123",
  layer: RenderLayer.Elements,
  visible: true,
  style: {
    stroke: "#000000",              // Resolved from inheritance
    strokeWidth: 2,
    strokeStyle: "solid",
    fill: "none",
    opacity: 1.0,
    zIndex: 10
  },
  infeasible: false,
  type: "path",
  points: [
    { x: 100, y: 200 },             // Computed from point1 position
    { x: 300, y: 400 }              // Computed from point2 position
  ],
  closed: false
};
```

---

## Layer 3: Persistence Entities

### Domain Entity: Subprocess

**Purpose**: User-created hierarchical grouping of process nodes with default visual properties and visibility control

**Fields**:
```typescript
interface Subprocess extends ProcessNodeBase {
  type: "subprocess";
  name: string;                     // User-defined name
  children: (Subprocess | ActionGroup)[];  // ONLY Subprocess or ActionGroup, NEVER direct Actions
  
  // Visual properties
  defaultStyle?: VisualStyle;       // Default style inherited by contained elements
  visible: boolean;                 // Controls element visibility in drawing (cascades to children)
}
```

**Tree Position**:
- Can be root (Process) or nested within other Subprocesses
- Children: Subprocesses or ActionGroups ONLY (never direct Actions)
- All actions must be wrapped in ActionGroups
- Forms organizational hierarchy

**Two Types of Visibility**:

1. **Element Visibility** (in the drawing workspace):
   - Controlled by subprocess.visible
   - Determines whether geometric elements are rendered in the 2D/3D view
   - Cascades to all child nodes in tree

2. **UI Visibility** (in the construction panel):
   - Controlled by ViewState (panelCollapseState)
   - Determines whether subprocess content is shown/hidden in the action list
   - Independent from element visibility

**Visibility Cascade for Elements**:
```typescript
function isElementVisible(element: Element2D | Element3D): boolean {
  // 1. Element must not be infeasible
  if (element.infeasible) return false;
  
  // 2. Get element's process node via action
  const action = findActionInProcessTree(element.createdBy);
  const parentNode = findParentNode(action);
  
  // 3. Walk up tree to check subprocess visibility
  if (!isProcessNodeVisible(parentNode)) return false;
  
  // 4. Check plane visibility (for 2D elements)
  if (element instanceof Element2D) {
    const plane = world.planes.find(p => p.id === element.plane);
    if (!plane.isVisible) return false;
  }
  
  return true;
}

function isProcessNodeVisible(node: ProcessNode): boolean {
  if (node.type === "action" || node.type === "actionGroup") {
    // Actions and ActionGroups don't control visibility - check parent
    const parent = findParentNode(node);
    return parent ? isProcessNodeVisible(parent) : true;
  }
  
  if (node.type === "subprocess") {
    if (!node.visible) return false;
    const parent = findParentNode(node);
    return parent ? isProcessNodeVisible(parent) : true;
  }
  
  return true;
}
```

**Default Style Inheritance**:
- Subprocess defines `defaultStyle` (e.g., color, line width)
- Elements in subprocess inherit these defaults unless explicitly overridden
- Style resolution happens in presentation layer:
  1. Element's explicit `visualStyle` properties (highest priority)
  2. Subprocess's `defaultStyle` properties (walk up tree)
  3. Global defaults (lowest priority)

**Validation Rules**:
- `children` must form valid tree structure
- Cannot create cycles in tree
- All child nodes must be valid ProcessNodes

**State Transitions**:
- **Visible** ↔ **Hidden**: Affects rendering of all elements created by descendant actions
- **Empty** → **Populated**: Child nodes added
- **Populated** → **Empty**: All child nodes moved/deleted

---

### Domain Entity: ConstructiveAction

**Purpose**: Records one user operation; leaf node in process tree; manipulates World

**Fields**:
```typescript
interface ConstructiveAction extends ProcessNodeBase {
  type: "action";
  actionType: ActionType;           // "CreatePoint", "CreateSegment", "CreateGuide", "TransportPoint", etc.
  timestamp: Date;                  // When action was performed
  inputs: ElementId[];              // Dependencies (what this action consumes from World)
  outputs: ElementId[];             // Results (what this action produces in World)
  parameters: Record<string, any>;  // Tool-specific params (e.g., radius, angle)
  
  // Validation
  infeasible: boolean;              // Computed from validation
  infeasibilityReason?: string;     // Human-readable explanation
  
  // Style
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
- 1 Action → N Elements in World (inputs)
- 1 Action → N Elements in World (outputs)
- 1 Action → 1 ProcessNode (parent in tree)

**Tree Position**:
- Leaf node in ProcessTree (no children)
- Must be child of ActionGroup
- Execution order determined by tree traversal

---

### Domain Entity: ActionGroup

**Purpose**: Groups one or more actions together; can be auxiliary (auto-created) or regular (user-created)

**Fields**:
```typescript
interface ActionGroup extends ProcessContainer {
  type: "actionGroup";
  children: ConstructiveAction[];   // One or more actions (ordered by creation time)
  mainAction?: ActionId;            // Reference to primary action (for auxiliary groups only)
}
```

**ActionGroup Types**:

1. **Regular ActionGroup**: User-created container for normal actions
   - Created when user performs an action
   - `mainAction` is undefined
   - Name can be user-defined or auto-generated from first action
   - Can contain single action or multiple related actions

2. **Auxiliary ActionGroup**: Auto-created for auxiliary actions
   - Created when a main action needs auxiliary actions (e.g., auto-created free points)
   - `mainAction` references the triggering action
   - Name auto-generated (e.g., "Auxiliary for segment s1")
   - Properties locked (user cannot edit)

**ActionGroup Pattern**:
- ALL actions must be inside an ActionGroup (even if it's the only action)
- ActionGroup is inserted as a sibling to the main action in the parent Subprocess (for auxiliary)
- **Element Visibility**: Elements created by actions in ActionGroup inherit visibility from parent Subprocess
  - ActionGroup does NOT have independent visibility control
  - Visibility is determined by walking up tree to find parent Subprocess
- **UI Display**: ActionGroup and its actions are shown in construction panel
  - Regular groups: displayed normally
  - Auxiliary groups: special visual treatment (lighter color, gear icon ⚙)
  - Actions grouped together distinctly
  - Can be collapsed/expanded independently (state stored in ViewState)
- **Properties**: Regular groups editable, auxiliary groups locked

**Tree Position**:
- Must be child of a Subprocess
- Children: Actions only (at least one, no nesting of containers)
- Regular ActionGroups: user-created
- Auxiliary ActionGroups: automatically created and managed by system

**Two Types of Visibility for ActionGroups**:

1. **Element Visibility** (in the drawing workspace):
   - ActionGroups do NOT control visibility
   - Elements in ActionGroup inherit visibility from parent subprocess only
   - No visibility toggle for ActionGroups

2. **UI Visibility** (in the construction panel):
   - Controlled by ViewState (panelCollapseState)
   - Determines whether group content is shown/hidden in the action list
   - Independent from element visibility

**Relationships**:
- 1 ActionGroup → 1 Subprocess (parent in tree)
- 1 ActionGroup → 1 Action (main action reference)
- 1 ActionGroup → N Actions (auxiliary actions as children)

**Validation Rules**:
- `children` must all be ConstructiveAction nodes
- Must contain at least one Action
- Cannot contain other ActionGroups or Subprocesses
- Children ordered by creation time (immutable)
- If `mainAction` is set, must exist in tree (auxiliary group)
- If `mainAction` is undefined, it's a regular group

**UI Presentation in Construction Panel**:

The construction panel shows two different visibility concepts:

1. **Panel Collapse State** (ViewState.panelCollapseState):
   - Controls whether subprocess/ActionGroup content is shown in the panel
   - Both subprocesses and ActionGroups can be collapsed/expanded
   - State stored in ViewState, not in domain entities

2. **Drawing Visibility** (subprocess.visible):
   - Subprocesses have eye icon to toggle element visibility in drawing
   - ActionGroups do NOT have visibility control (inherit from parent subprocess)
   - Auxiliary subprocesses have NO visibility toggle (always inherit from parent)

**Regular Subprocess Display**:
```
▼ 👁 Construction Phase 1         ← visibility toggle, collapse/expand
  ▶ ActionGroup "Create segment s1"
  ▶ ⚙ Auxiliary (2 actions)       ← auxiliary group, no visibility toggle
  ▶ ActionGroup "Create circle c1"
  ▼ 👁 Nested Subprocess          ← nested subprocess with visibility control
    ▶ ActionGroup "Create guide g1"
```

**ActionGroup Display** (different visual treatment):
```
▼ 👁 Construction Phase 1
  ▼ ActionGroup "Create segment s1"  ← regular action group
    ○ Create segment s1
  ┌─────────────────────────────┐
  │ ⚙ Auxiliary (2 actions)    │  ← auxiliary group: boxed/indented, lighter color, gear icon
  │   ○ Create free point a    │
  │   ○ Create free point b    │
  └─────────────────────────────┘
  ▼ ActionGroup "Create circle c1"
    ○ Create circle c1
```

Or with icons:
```
▼ 👁 Construction Phase 1
  ▼ ActionGroup "Create segment s1"  ← regular group
    ○ Create segment s1
  ▼ ⚙ Auxiliary (2 actions)           ← auxiliary group: gear icon, lighter text
    ⋅ Create free point a             ← bullet instead of circle
    ⋅ Create free point b
  ▼ ActionGroup "Create circle c1"
    ○ Create circle c1
```

**State Transitions**:
- **Executable** → **Executed**: Command validates and executes successfully
- **Executed** → **Infeasible**: Upstream input changes, validation fails during recomputation
- **Infeasible** → **Executed**: Upstream input corrected, validation passes

**UI Presentation for ActionGroups**:
```
▼ Construction Phase 1
  ▶ ActionGroup "Create segment s1"  ← regular action group, collapsed
  ▶ ⚙ Auxiliary (2 actions)           ← auxiliary group, collapsed
  ▶ ActionGroup "Create circle c1"
```

When expanded:
```
▼ Construction Phase 1
  ▼ ActionGroup "Create segment s1"
    └─ Create segment s1
  ▼ ⚙ Auxiliary (2 actions)           ← grayed out, properties not editable
    └─ Create free point a
    └─ Create free point b
  ▼ ActionGroup "Create circle c1"
    └─ Create circle c1
```

**Special Treatment for ActionGroups**:
- Displayed with special icon (e.g., ⚙ gear icon)
- Rendered with different styling (e.g., lighter color, italics)
- Name and properties cannot be edited by user
- Can be collapsed/expanded like subprocesses
- Visible alongside regular actions in the subprocess tree
- No visibility toggle (inherits visibility from parent subprocess)

---

### Domain Entity: DependencyGraph

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

### Domain Entity: VisualStyle

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

### Persistence Entity: ViewState

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
  
  // Panel state
  panelCollapseState: {
    subprocesses: Map<SubprocessId, boolean>;  // true = collapsed, false = expanded
    actionGroups: Map<ActionGroupId, boolean>; // true = collapsed, false = expanded
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
Project (1) ──┬── (1) World ──┬── (N) ProjectionPlane
              │               │       │
              │               │       └─ (N) Element2D
              │               │
              │               ├── (N) HingeLine ── (2) ProjectionPlane
              │               │       │
              │               │       └── (N) Guide ── (1) Point2D
              │               │
              │               ├── (N) Element2D ──┬── (N) ConstructiveAction (inputs)
              │               │                   └── (1) ConstructiveAction (createdBy)
              │               │
              │               ├── (N) Element3D ──┬── (N) Element2D (projections)
              │               │                   └── (1) ConstructiveAction (createdBy)
              │               │
              │               └── (1) DependencyGraph ── (N) Element + Action
              │
              ├── (1) ProcessTree ──┬── (N) ProcessNode (tree structure)
              │                     │
              │                     ├── Subprocess ──┬── ProcessNode children
              │                     │                └── VisualStyle
              │                     │
              │                     ├── ActionGroup ──┬── ConstructiveAction children
              │                     │                 └── mainAction reference
              │                     │
              │                     └── ConstructiveAction ──┬── Element inputs (World)
              │                                               └── Element outputs (World)
              │
              └── (1) ViewState
```

---

## Validation Rules Summary

### Global Invariants

1. **Single Active Plane**: Exactly one `ProjectionPlane.isActive = true` per World
2. **Acyclic Dependencies**: `World.dependencyGraph` must be DAG (no circular dependencies)
3. **Element Ownership**: Each `Element2D` belongs to exactly one `ProjectionPlane`
4. **Process Tree Structure**: `ProcessTree` must be valid tree (no cycles, proper parent-child relationships)
5. **Action Order**: Depth-first traversal of ProcessTree defines action execution order (immutable history)

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

## Data Flow and Layer Interactions

### User Action → Domain → Presentation Pipeline

```
1. User Action (e.g., "Create Segment")
   ↓
2. Command Execution
   - Creates Domain Entities (Element2D)
   - Updates DependencyGraph
   - Records ConstructiveAction
   ↓
3. Domain Layer Update
   - New Element2D added to Project
   - Dependencies computed
   - Validation performed
   ↓
4. Presentation Layer Rebuild (affected entities only)
   - PresentationService converts Element2D → PresentationPrimitive
   - Resolves style inheritance
   - Computes visibility
   - Generates coordinates
   ↓
5. Rendering (Vue + SVG)
   - PresentationPrimitives → SVG elements
   - Direct 1:1 mapping to <circle>, <line>, <path>
   - No computation in render layer
```

### Recomputation Flow (Parametric Update)

```
1. Base element changes (e.g., point moves)
   ↓
2. DependencyGraph traversal
   - Find all dependent actions
   - Topological sort for execution order
   ↓
3. Reexecute dependent actions
   - Update derived domain entities
   - Mark infeasible if validation fails
   ↓
4. Incremental presentation update
   - Only rebuild primitives for changed entities
   - Preserve unchanged primitives (optimization)
   ↓
5. Vue reactivity triggers re-render
   - Only affected SVG elements update
```

### Layer Responsibilities

| Layer | Responsibilities | Does NOT Handle |
|-------|-----------------|-----------------|
| **Domain** | Geometric truth, construction rules, dependencies, validation | Rendering, coordinates resolution, SVG generation |
| **Presentation** | SVG-ready data, resolved styles, visibility computation, coordinates | Geometric logic, validation, user actions |
| **Persistence** | Serialization, storage, project metadata | Real-time computation, rendering |

### Benefits of Layered Architecture

1. **Separation of Concerns**: Geometric logic separate from rendering concerns
2. **Testability**: Domain entities testable without UI/SVG
3. **Performance**: Incremental presentation updates; only rebuild what changed
4. **Reusability**: Domain layer could support multiple rendering backends (Canvas, WebGL)
5. **Clarity**: Each layer has single responsibility

---

## Summary

This data model defines entities across three clear layers:

**Domain Layer** (geometric truth):
- ProjectionPlane, HingeLine, Guide
- Element2D (Point, Segment, Line, Circle, Arc)
- Element3D (Point, Line, Segment, Plane)
- ConstructiveAction, DependencyGraph, VisualStyle

**Presentation Layer** (rendering):
- RenderPrimitive (base)
- PointPrimitive, PathPrimitive, CirclePrimitive, ArcPrimitive, TextPrimitive
- PresentationService (conversion logic)

**Persistence Layer** (storage):
- Project (root aggregate)
- ViewState (UI state)

Key design principles:

1. **Explicit creation**: No implicit entities; all geometry traceable to actions
2. **Dependency graph**: Enables parametric recomputation and hover highlighting
3. **Infeasibility as state**: Temporary condition, not deletion; aids learning
4. **Style inheritance**: Separates visual from geometric concerns (resolved in presentation layer)
5. **Frontend-owned**: All domain logic in frontend; backend stores JSON
6. **Layered separation**: Domain defines "what", Presentation defines "how to render"

**Next**: Generate API contracts for backend persistence endpoints.

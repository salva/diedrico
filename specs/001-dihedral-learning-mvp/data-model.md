# Data Model: Diedrico MVP

**Date**: 2025-12-22  
**Purpose**: Define domain entities, relationships, validation rules, and state transitions

---

## Architecture Overview

**⚠️ Coordinate System Note**: The domain model uses a **left-handed coordinate system** following Monge projection conventions where the viewer is at (0, -∞, 0) looking along +Y toward the origin. When converting to Three.js rendering (which uses a right-handed coordinate system), the Y-axis direction must be inverted: `threeY = -domainY`.

---

## **CRITICAL: Realization Layer Boundary**

### **Architectural Principle: All Numeric Data Flows Through Realizations**

This is a **MANDATORY architectural constraint** that enforces separation between definition (what) and computation (how):

**Three-Layer Architecture**:

```
┌──────────────────────────────────────────────────────────┐
│  DOMAIN LAYER (Definitions/Rules)                        │
│  - Point2D, Line2D, Circle2D domain objects             │
│  - Store WHAT the element is, not WHERE it is           │
│  - Example: IntersectionPoint2D stores element IDs      │
│  - Properties are IMMUTABLE (readonly position)         │
│  ❌ Other layers MUST NOT access domain properties      │
└─────────────────────┬────────────────────────────────────┘
                      │
                      │ realize(context) method
                      │ Called lazily when needed
                      │
                      ↓
┌──────────────────────────────────────────────────────────┐
│  REALIZATION LAYER (Computed Results)                    │
│  - Point2DRealization, Line2DRealization, etc.          │
│  - Store ONLY NUMERIC data (coordinates, vectors)       │
│  - Example: Point2DRealization { position: Vector3 }    │
│  - NO structural data (id, planeId) - that's in domain  │
│  - Cached in World maps (key = pointId)                 │
│  ✅ Other layers MUST ONLY access realizations          │
└─────────────────────┬────────────────────────────────────┘
                      │
                      │ Read-only access
                      │
                      ↓
┌──────────────────────────────────────────────────────────┐
│  CONSUMING LAYERS (Services, Rendering, Calculations)    │
│  - PaperService, RenderService, GeometryService         │
│  - Access numeric data ONLY through realizations        │
│  - Never instanceof checks or domain property access    │
│  ✅ Correct: realization.position                       │
│  ❌ Incorrect: point.position (violates boundary!)      │
└──────────────────────────────────────────────────────────┘
```

### **Enforcement Rules**

**✅ CORRECT PATTERNS:**

```typescript
// ✅ Domain layer: Store definition only
class FreePoint2D extends Point2D {
  readonly position: Vector3;  // IMMUTABLE - the defining rule
  
  realize(context: RealizationContext): Point2DRealization {
    return new Point2DRealization(this.position);  // Only numeric data
  }
}

// ✅ Realization layer: Store ONLY numeric data
class Point2DRealization {
  position: Vector3;  // Computed position - THIS is what other layers use
  // NO pointId, NO planeId - that's structural info in domain objects
}

// ✅ Service layer: Access numeric data from realization, structural from point
class PaperService {
  pointToPrimitive(point: Point2D, realization: Point2DRealization, transform: Matrix3) {
    const paperPos = applyMatrix3(realization.position, transform);  // ✅ Numeric from realization
    const planeTransform = context.planeTransforms.get(point.planeId);  // ✅ Structural from point
    return { x: paperPos.x, y: paperPos.y, ... };
  }
}

// ✅ Rendering: Numeric from realization, structural from point
function renderPoint(point: Point2D, realization: Point2DRealization) {
  const [cx, cy] = planeToCanvas(
    realization.position.x,    // ✅ Numeric from realization
    realization.position.y,
    point.planeId              // ✅ Structural from point
  );
  // ...
}
```

**❌ INCORRECT PATTERNS (VIOLATIONS):**

```typescript
// ❌ VIOLATION: Service accessing domain property directly
class RenderService {
  render(point: FreePoint2D) {
    const pos = point.position;  // ❌ WRONG! Bypasses realization layer
    // Should be: realization.position
  }
}

// ❌ VIOLATION: instanceof checks to access properties
function render(point: Point2D) {
  if (point instanceof FreePoint2D) {
    const pos = point.position;  // ❌ WRONG! Type discrimination to bypass boundary
  }
  // Should require realization parameter instead
}

// ❌ VIOLATION: Rendering without realization
function renderPoint(point: Point2D) {  // ❌ Missing realization parameter
  // Cannot access position without violating boundary
}
```

### **Exception: Fixed Elements**

For **fixed elements** (origin, hinge line, plane boundaries) that don't change:

```typescript
// ✅ Plain coordinate objects OK for constants
const hingeLineStart = { u: -500, v: 0, planeId: 'plane_H' };
const hingeLineEnd = { u: 500, v: 0, planeId: 'plane_H' };

// These are passed to functions expecting realizations or coordinate objects
renderLine(hingeLineStart, hingeLineEnd, 'HL_HV', ...);
```

### **Transformation Flow**

Even for elements defined by coordinates (like FreePoint2D), transformations follow this flow:

```
1. DOMAIN: FreePoint2D stores { id, position: Vector3(100, 50, 1), planeId: 'plane_H' }
   ↓
2. REALIZE: Create Point2DRealization { position: Vector3(100, 50, 1) }  // ONLY numeric
   ↓
3. CACHE: Store in world.pointRealizations2D map  (key='point_id' → value=realization)
   ↓
4. ACCESS: Other layers get realization from world + point from world
   ↓
5. TRANSFORM: Apply matrices to realization.position, use point.planeId for context
   ↓
6. RENDER: Use transformed coordinates for display
```

**Key insight**: Structural info (id, planeId) stays in domain Point2D object. Numeric data (position) goes in realization. World caches use pointId as map key, so no need to duplicate it in the value.
- **Consistent architecture** across all element types
- **Cache invalidation** works uniformly
- **No special cases** in consuming code
- **Future extensibility** (can add transformation to realizations without changing consumers)

### **Benefits**

1. **Clear Separation**: Domain = rules, Realization = numbers
2. **Type Safety**: Functions requiring numeric data explicitly declare it via realization parameters
3. **Performance**: Caching prevents redundant calculations
4. **Consistency**: Same pattern for simple (FreePoint2D) and complex (IntersectionPoint2D) elements
5. **Maintainability**: Easy to find all numeric access points (they all go through realizations)
6. **Extensibility**: Can add new properties to realizations without changing domain objects

### **Validation**

**Anti-pattern detection**:
- Search for: `point.position` in service/rendering code → Should use `realization.position`
- Search for: `instanceof FreePoint2D` to access properties → Should require realization parameter
- Functions with Point2D parameter but no realization → Missing realization parameter

**Test coverage**:
- Architecture tests should verify services never access domain properties directly
- Mock realizations for testing to ensure proper boundary

---

## Coordinate Systems and Transformations

### **Critical Architecture Principle**

The application uses **three distinct coordinate spaces**:

1. **Plane Intrinsic Coordinates <u,v>** (Storage & Calculation Layer)
   - Each projection plane defines its own 2D coordinate system with basis vectors <u,v>
   - **ALL Element2D coordinates are stored in their plane's <u,v> basis**
   - **ALL geometric calculations (distance, intersection, perpendicular) operate in <u,v> space**
   - This is the "source of truth" - element data is independent of visualization

2. **2D Canvas Coordinates (x_canvas, y_canvas)** (2D Visualization Layer)
   - SVG pixel coordinates on the 2D drawing workspace
   - Each plane's <u,v> space is mapped to canvas via `transform_to_canvas` matrix
   - Multiple planes positioned on canvas without overlap (e.g., P_H at top, P_V below)
   - User mouse clicks in canvas space → converted to <u,v> for storage

3. **3D World Coordinates (x, y, z)** (3D Visualization Layer)
   - Three.js 3D space (right-handed, Y inverted from domain)
   - Each plane's <u,v> space mapped to 3D via `transform_to_3d` matrix
   - Enables 3D visualization of dihedral constructions

### **Transformation Flow**

```
┌─────────────────────────────────────────────────────────────┐
│  USER INPUT (Mouse Click)                                   │
│  Canvas Space: (x_canvas, y_canvas)                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ INVERSE(transform_to_canvas)
                     │ Required for: point creation, element placement
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  STORAGE (Element2D)                                         │
│  Plane Intrinsic Space: (u, v)                              │
│  FreePoint2D { position: [u, v, 1], planeId }               │
│  IntersectionPoint2D { element1Id, element2Id, index }      │
└─────────────┬─────────────────────────┬─────────────────────┘
              │                         │
              │ All geometry            │
              │ calculations            │
              │ in <u,v>                │
              │                         │
              │                         │
   ┌──────────▼──────────┐   ┌─────────▼──────────┐
   │  2D RENDERING       │   │  3D RENDERING      │
   │  (SVG/Canvas)       │   │  (Three.js)        │
   └──────────┬──────────┘   └─────────┬──────────┘
              │                         │
              │ FORWARD                 │ FORWARD
              │ transform_to_canvas     │ transform_to_3d
              ↓                         ↓
   ┌──────────────────────┐   ┌──────────────────────┐
   │  Canvas Display      │   │  3D Display          │
   │  (x_canvas, y_canvas)│   │  (x_3d, y_3d, z_3d)  │
   └──────────────────────┘   └──────────────────────┘
```

**Bidirectional Transformations**:

1. **Forward (for rendering)**: Plane intrinsic (u,v) → Display coordinates
   - Used when: Drawing elements on canvas, rendering in 3D view
   - Formula: display_coords = transform × [u, v]

2. **Inverse (for input)**: Display coordinates → Plane intrinsic (u,v)
   - Used when: Mouse clicks, drag operations, element creation
   - Formula: [u, v] = inverse(transform) × display_coords
   - **Critical**: Must be computed for user interaction to work

### **Matrix Representations**

**Implementation**: All matrices use Three.js types:
- **2D transforms**: `Matrix3` (3×3 for homogeneous 2D coordinates)
- **3D transforms**: `Matrix4` (4×4 for homogeneous 3D coordinates)
- **2D→3D transforms**: `Matrix4x3` (custom - 4×3 matrix, Vector3→Vector4)
- **3D→2D transforms**: `Matrix3x4` (custom - 3×4 matrix, Vector4→Vector3)

**2D Canvas Transform** (Three.js Matrix3)
```
Forward: Matrix3
  x_canvas = m11*u + m12*v + m13
  y_canvas = m21*u + m22*v + m23

Inverse: Matrix3 (computed via matrix.invert())
  u = m11'*x_canvas + m12'*y_canvas + m13'
  v = m21'*x_canvas + m22'*y_canvas + m23'

Application (non-destructive):
  import { applyMatrix3 } from '@/utils/threeUtils';
  const canvasPos = applyMatrix3(planePos, planeToPaperMatrix);
```

**2D→3D Reconstruction** (Custom Matrix4x3)
```
Forward: Matrix4x3 (4 rows, 3 columns)
  Transforms Vector3 (u, v, 1) → Vector4 (x, y, z, w)
  
  [x]   [m11 m12 m13] [u]
  [y] = [m21 m22 m23] [v]
  [z]   [m31 m32 m33] [1]
  [w]   [m41 m42 m43]

Application (non-destructive):
  import { applyMatrix4x3, Matrix4x3 } from '@/utils/threeUtils';
  const point3D = applyMatrix4x3(point2D, reconstructionMatrix);
```

**3D→2D Projection** (Custom Matrix3x4)
```
Forward: Matrix3x4 (3 rows, 4 columns)
  Transforms Vector4 (x, y, z, w) → Vector3 (u, v, 1)
  
  [u]   [m11 m12 m13 m14] [x]
  [v] = [m21 m22 m23 m24] [y]
  [1]   [m31 m32 m33 m34] [z]
                           [w]

Application (non-destructive):
  import { applyMatrix3x4, Matrix3x4 } from '@/utils/threeUtils';
  const point2D = applyMatrix3x4(point3D, projectionMatrix);
```

**Storage Strategy**:
- **Store both forward and inverse matrices** in ProjectionPlane
- Inverse is computed once when plane is created/modified
- Cached inverse avoids recomputation on every mouse event (performance optimization)
- When `transform_to_canvas` is updated, `inverse_transform_to_canvas` must be recomputed atomically

### Viewport Transformation (2D Display Layer)

The **viewport transformation** is a global affine matrix that applies to the entire 2D canvas workspace:

**Purpose**:
- Handles pan (translation) and zoom (uniform scaling) of the display
- Applied AFTER plane transformations (composition: `viewport * transform_to_canvas`)
- Affects ALL projection planes uniformly
- Allows users to navigate the workspace without modifying plane data

**Matrix Representation**:
```
viewport_transform: [scale, 0, 0, scale, pan_x, pan_y]  (6 numbers)
inverse_viewport_transform: [1/scale, 0, 0, 1/scale, -pan_x/scale, -pan_y/scale]
```

**Composition for Rendering** (2D workspace):
```
screen_coords = viewport_transform * transform_to_canvas * plane_coords
screen_coords = viewport_transform * (transform_to_canvas * [u, v, 1])
```

**Composition for Input** (mouse clicks):
```
plane_coords = inverse_transform_to_canvas * inverse_viewport_transform * screen_coords
plane_coords = inverse_transform_to_canvas * (inverse_viewport_transform * [x_screen, y_screen, 1])
```

**Storage Location**:
- Viewport transform is NOT stored in ProjectionPlane (it's global)
- Stored in 2D workspace component state (e.g., `Workspace2D.vue`)
- Updated by pan/zoom gestures (mouse wheel, drag, pinch)

**Benefits**:
- Pan/zoom does NOT require recalculating plane transformations
- ProjectionPlane data remains unchanged during navigation
- Single matrix update affects all planes simultaneously
- Separation of concerns: plane layout vs. viewport navigation
```
- Can be converted to SVG: `matrix(a,b,c,d,e,f)`
- **Inverse required for mouse input processing**

**3D World Transform** (16 numbers: 4×4 matrix, column-major)
```
Forward: Matrix4 transforms [u, v, 0, 1]ᵀ → [x, y, z, 1]ᵀ
```
- Encodes origin + u_axis + v_axis in single matrix
- Used by Three.js for rendering
- **Inverse NOT typically needed** (3D is read-only visualization)

### **Why This Architecture?**

✅ **Geometric calculations stay simple**: Distance between points is `√((u₂-u₁)² + (v₂-v₁)²)` directly  
✅ **Transformation independence**: Element data doesn't change when adjusting canvas layout or 3D view  
✅ **Future-proof**: Auxiliary planes can have arbitrary orientations without affecting stored data  
✅ **Standard approach**: Matches how CAD/geometry systems work (intrinsic coords + view transforms)  

---

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

The presentation layer provides an intermediate drawing representation called **Paper** that sits between domain geometry and final SVG rendering.

**Architecture**: Domain → Realization → Paper → SVG

**Paper Abstraction**:
- Unified coordinate system (not per-plane u,v coordinates)
- All projection planes transform their elements into this common paper space
- Primitives ready for direct SVG conversion with viewport transform

**Coordinate Flow**:
```
Plane <u,v> → PlaneTransform (3x3 matrix) → Paper <x,y> → ViewportTransform → Canvas → SVG
```

**Components**:
- **Render Primitives**: Points, paths, circles, arcs in paper coordinates
- **Source References**: Each primitive points back to its source domain entity
- **Visual Attributes**: Stroke, fill, width, style, visibility state (fully resolved, no inheritance)
- **Transformation System**:
  - **PlaneTransform**: 3x3 homogeneous matrix transforming plane u,v → paper x,y
    - For P_H, P_V: Hardcoded constant matrices
    - For auxiliary planes: Computed from geometric unfolding (see ProjectionPlane section)
  - **ViewportTransform**: Pan/zoom transformation: paper x,y → canvas pixels
  - Both transforms provide inverse operations for mouse input (canvas → paper → plane u,v)

**Key characteristic**: Presentation entities are computed from domain entities and contain all information needed for rendering (coordinates in paper space, resolved styles, visibility state).

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
  commandStack: CommandStack;       // Command history for undo/redo
}
```

**Conceptual Model**:
- **World**: The geometric construction - planes, elements, dependencies
- **ProcessTree**: The construction process - actions organized in subprocesses/groups
- **ViewState**: UI presentation state
- **CommandStack**: History of all user operations for undo/redo

All mutations to World, ProcessTree, and ViewState happen through Commands, which are composed of reversible Operations.

**Relationships**:
- 1 Project → 1 World
- 1 Project → 1 ProcessTree
- 1 Project → 1 ViewState
- 1 Project → 1 CommandStack

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

// Common ancestor for nodes that can contain children and need a name
interface ProcessContainer extends ProcessNodeBase {
  name: string;                     // User-defined or auto-generated (for Subprocess)
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

**Purpose**: Named 2D surface where 2D elements exist. Defines the plane's intrinsic coordinate system <u,v> and how it maps to both 3D space and 2D canvas display.

**Critical Coordinate System Principle**:
- **All Element2D coordinates are stored in the plane's intrinsic <u,v> basis**
- **All geometric calculations (distance, intersection, etc.) operate in <u,v> space**
- **Transformations are ONLY for visualization (3D view and 2D canvas rendering)**

**Fields**:
```typescript
interface ProjectionPlane {
  id: PlaneId;                      // UUID
  name: string;                     // "P_H", "P_V", "P_A1", etc.
  isActive: boolean;                // Exactly one plane is active at a time
  isVisible: boolean;               // Toggle visibility in UI
  color: Color;                     // Base color for plane representation
  plane_3d_id: string;              // Reference to Plane3D element (geometric definition)
  
  // 3D transformation matrix: (u,v) → 3D space (x,y,z)
  // Stored as 4×4 matrix (16 numbers, column-major order)
  // Usage: For rendering plane elements in 3D visualization (Three.js)
  transform_to_3d: number[];        // Matrix4: point_3d = M × [u, v, 0, 1]ᵀ
  
  // 2D canvas transformation matrix: (u,v) → canvas pixel coords
  // Stored as 2D affine transform (6 numbers: [a, b, c, d, e, f])
  // Represents: x' = a*u + c*v + e, y' = b*u + d*v + f
  // Usage: For rendering plane elements on 2D drawing workspace (SVG)
  transform_to_canvas: number[];    // Forward: [a, b, c, d, tx, ty]
  
  // Inverse transformation matrix: canvas pixel coords → (u,v)
  // Stored as 2D affine transform (6 numbers: [a', b', c', d', e', f'])
  // Computed from transform_to_canvas, but cached for performance
  // Usage: For converting mouse clicks to plane coordinates
  // Note: Could be computed on-demand, but caching avoids recomputation on every mouse event
  inverse_transform_to_canvas: number[];  // Inverse: [a', b', c', d', tx', ty']
}
```

**Coordinate System Flow**:

```
┌─────────────────────────────────────────────────────────────────┐
│                   STORAGE & CALCULATION LAYER                    │
│                                                                   │
│  Element2D coordinates stored in plane's <u, v> basis           │
│  All geometry calculations (distance, intersection) in <u, v>   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ (for visualization only)
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│   2D RENDERING PATH      │   │   3D RENDERING PATH      │
│                          │   │                          │
│  Step 1:                 │   │  Step 1:                 │
│  transform_to_canvas     │   │  transform_to_3d         │
│  (u,v) → canvas coords   │   │  (u,v) → (x, y, z)      │
│                          │   │                          │
│  Step 2:                 │   │  Step 2:                 │
│  viewport_transform      │   │  Three.js camera         │
│  canvas → screen pixels  │   │  (built-in viewport)     │
│  (handles pan/zoom)      │   │                          │
│                          │   │  Final: Three.js canvas  │
│  Final: SVG rendering    │   │                          │
└──────────────────────────┘   └──────────────────────────┘
              │
              │ (inverse for input)
              ▼
┌──────────────────────────┐
│  USER INPUT HANDLING     │
│  (2D workspace only)     │
│                          │
│  Step 1: Screen click →  │
│  inverse_viewport_transform │
│  → canvas coordinates    │
│                          │
│  Step 2: Canvas coords → │
│  inverse_transform_to_canvas │
│  → plane <u, v>         │
└──────────────────────────┘
```

**Matrix Representations**:

**For P_H (horizontal plane) - Hardcoded**:
- Fixed position in paper coordinate system
- `transform_to_3d`: Maps (u,v) to (u, v, 0) in 3D
- Plane-to-paper transformation: Predetermined constant matrix

**For P_V (vertical plane) - Hardcoded**:
- Fixed position in paper coordinate system
- `transform_to_3d`: Maps (u,v) to (u, 0, v) in 3D  
- Plane-to-paper transformation: Predetermined constant matrix

**For auxiliary planes - Geometrically Derived**:

Auxiliary planes are positioned through a deterministic geometric unfolding process:

1. **Traces**: Auxiliary plane intersects both P_H and P_V
   - `traceH`: Intersection line on P_H
   - `traceV`: Intersection line on P_V

2. **Hinge Selection**: User selects which trace to use as hinge line (HL)
   - If `traceH` is chosen → auxiliary plane unfolds onto P_H
   - If `traceV` is chosen → auxiliary plane unfolds onto P_V

3. **Unfolding**: 180° rotation around chosen hinge line
   - **Direction rule**: Rotate away from origin O
   - Prevents overlap with central construction area

4. **Coordinate System** for auxiliary plane:
   - **u-axis**: Aligned with hinge line
     - Direction: Choose alignment that best matches base plane's coordinate system
   - **v-axis**: Perpendicular to hinge line
     - Direction: Grows away from hinge line (outward into unfolded plane)

5. **Transformation Computation**:
   - `transform_to_3d`: Computed from plane normal and 3D position
   - Plane-to-paper transformation: Derived from:
     - Which trace is the HL (determines base plane)
     - HL position and orientation in base plane
     - u-axis aligned with HL (proper direction)
     - v-axis perpendicular to HL, growing away from it
     - Base plane's transformation to paper

**Key Principle**: Auxiliary plane positioning is NOT arbitrary - it's completely determined by the plane's geometric definition and user's choice of hinge line.

### Viewport Transformation (2D Display Layer)

The **viewport transformation** is a global affine matrix that applies to the entire 2D canvas workspace:

**Purpose**:
- Handles pan (translation) and zoom (uniform scaling) of the display
- Applied AFTER plane transformations (composition: `viewport * transform_to_canvas`)
- Affects ALL projection planes uniformly
- Allows users to navigate the workspace without modifying plane data

**Matrix Representation**:
```
viewport_transform: [scale, 0, 0, scale, pan_x, pan_y]  (6 numbers)
inverse_viewport_transform: [1/scale, 0, 0, 1/scale, -pan_x/scale, -pan_y/scale]
```

**Composition for Rendering** (2D workspace):
```
screen_coords = viewport_transform * transform_to_canvas * plane_coords
screen_coords = viewport_transform * (transform_to_canvas * [u, v, 1])
```

**Composition for Input** (mouse clicks):
```
plane_coords = inverse_transform_to_canvas * inverse_viewport_transform * screen_coords
plane_coords = inverse_transform_to_canvas * (inverse_viewport_transform * [x_screen, y_screen, 1])
```

**Storage Location**:
- Viewport transform is NOT stored in ProjectionPlane (it's global)
- Stored in 2D workspace component state (e.g., `Workspace2D.vue`)
- **Both forward and inverse must be stored** (same caching strategy as plane transforms)
- Inverse is needed for every mouse event to convert screen → canvas coordinates
- Updated by pan/zoom gestures (mouse wheel, drag, pinch)
- When viewport updates, inverse must be recomputed atomically

**Storage Strategy**:
```typescript
// In Workspace2D.vue or viewStore
{
  viewport_transform: number[];          // [scale, 0, 0, scale, pan_x, pan_y]
  inverse_viewport_transform: number[];  // [1/scale, 0, 0, 1/scale, -pan_x/scale, -pan_y/scale]
}
```

**Benefits**:
- Pan/zoom does NOT require recalculating plane transformations
- ProjectionPlane data remains unchanged during navigation
- Single matrix update affects all planes simultaneously
- Separation of concerns: plane layout vs. viewport navigation
- Cached inverse avoids recomputation on every mouse event (performance)

**Relationships**:
- 1 ProjectionPlane → N Element2D (elements belong to one plane)
- 2 ProjectionPlanes → 1 HingeLine (shared intersection)
- 1 ProjectionPlane → 1 Plane3D (geometric definition reference)

**Validation Rules**:
- `name` must follow naming convention: "P_{identifier}"
- Exactly one plane in project must have `isActive = true`
- `transform_to_3d` must be invertible (det ≠ 0) for correct 3D visualization
- **`transform_to_canvas` MUST be invertible** (det = ad - bc ≠ 0) **for user input processing**
  - Without invertible canvas transform, mouse clicks cannot be converted to plane coordinates
  - Application MUST validate invertibility before storing transformation matrix

**Invariants**:
- Element2D coordinates are ALWAYS in plane's intrinsic (u,v) basis
- Canvas transform inverse is computable at all times (no singular matrices)
- Changing canvas layout (repositioning planes) does NOT change Element2D data
- User interactions always follow: canvas click → inverse transform → (u,v) storage

**State Transitions**:
- **Inactive** ↔ **Active**: Clicking plane selector makes it active, previous active becomes inactive
- **Visual Emphasis**: Active plane elements render at full opacity (100%), non-active at reduced opacity (e.g., 50%)
- **Note**: In MVP, all projection planes are ALWAYS visible. Plane visibility toggles may be added in future versions.

**Invariants**:
- Global invariant: Exactly 1 active plane per project
- Global invariant (MVP): All projection planes are always visible simultaneously
- Changing active plane does not mutate existing geometry
- Changing active plane only updates visual emphasis (opacity), not visibility

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

**Coordinate System**: All Element2D coordinates (x, y) are stored in the **plane's intrinsic <u,v> basis**, NOT in canvas pixels or 3D space. This ensures:
- Geometry calculations (distance, intersections) work directly with stored coordinates
- Plane transformations do not affect stored element data
- Elements remain independent of visualization choices (canvas layout, 3D orientation)

**Subtypes** (discriminated unions by construction method):
```typescript
type Element2D = Point2D | Segment2D | Line2D | Circle2D | Arc2D | Guide2D | BHLProjection;

// === POINT 2D CONSTRUCTIONS ===

// IMPORTANT: Points store their DEFINITION/RULE, not coordinates
// Actual coordinates are computed and cached in Point2DRealization objects

// Free point - defined by user-specified position
interface FreePoint2D {
  kind: 'FreePoint2D';              // Discriminator (TypeScript: type: 'free')
  id: string;                       // REQUIRED - unique identifier
  label?: string;                   // Optional display label ("a", "b", "p1", etc.)
  planeId: string;                  // REQUIRED - belongs to exactly one plane
  locked?: boolean;                 // If true, cannot be moved or deleted
  
  // THE RULE: "User placed it at this position"
  position: Vector3;                // Position in plane's intrinsic basis (u, v, 1) - Three.js Vector3
  
  // Implementation: TypeScript class
  // constructor(id: string, position: Vector3, planeId: string, label?: string)
  // realize(context: RealizationContext): Point2DRealization
}

// Point at intersection of two elements
interface IntersectionPoint2D {
  kind: 'IntersectionPoint2D';      // Discriminator (TypeScript: type: 'intersection')
  id: string;                       // REQUIRED - unique identifier
  label?: string;                   // Optional display label
  planeId: string;                  // REQUIRED - belongs to exactly one plane
  
  // THE RULE: "Intersection of element1 and element2 at index"
  // No coordinates stored - computed from the two elements
  element1Id: string;               // First intersecting element
  element2Id: string;               // Second intersecting element
  index: number;                    // Which intersection (0 or 1 for line-circle, 0 or 1 for circle-circle)
  
  // Implementation: TypeScript class
  // constructor(id: string, element1Id: string, element2Id: string, index: number, planeId: string, label?: string)
  // realize(context: RealizationContext): Point2DRealization
}

type Point2D = FreePoint2D | IntersectionPoint2D;

// === SEGMENT 2D CONSTRUCTIONS ===

// Segment defined by two endpoints
interface Segment2DByPoints {
  kind: 'Segment2DByPoints';        // Discriminator
  id: ElementId;
  name: string;                     // "s1", "s2", etc.
  planeId: PlaneId;
  
  // Defining relations
  point1Id: ElementId;              // Start point
  point2Id: ElementId;              // End point
  
  createdBy: ActionId;
  visualStyle: VisualStyle;
}

type Segment2D = Segment2DByPoints;

// === LINE 2D CONSTRUCTIONS ===

// Line through two points
interface Line2DByTwoPoints {
  kind: 'Line2DByTwoPoints';        // Discriminator
  id: ElementId;
  name: string;                     // "r1", "r2", etc.
  planeId: PlaneId;
  
  // Defining relations
  point1Id: ElementId;              // First point on line
  point2Id: ElementId;              // Second point on line
  
  createdBy: ActionId;
  visualStyle: VisualStyle;
}

// Line parallel to another line through a point
interface Line2DParallelThroughPoint {
  kind: 'Line2DParallelThroughPoint'; // Discriminator
  id: ElementId;
  name: string;
  planeId: PlaneId;
  
  // Defining relations
  referenceLineId: ElementId;       // Line to be parallel to
  throughPointId: ElementId;        // Point the new line passes through
  
  createdBy: ActionId;
  visualStyle: VisualStyle;
}

// Line perpendicular to another line through a point
interface Line2DPerpendicularThroughPoint {
  kind: 'Line2DPerpendicularThroughPoint'; // Discriminator
  id: ElementId;
  name: string;
  planeId: PlaneId;
  
  // Defining relations
  referenceLineId: ElementId;       // Line to be perpendicular to
  throughPointId: ElementId;        // Point the new line passes through
  
  createdBy: ActionId;
  visualStyle: VisualStyle;
}

type Line2D = 
  | Line2DByTwoPoints 
  | Line2DParallelThroughPoint 
  | Line2DPerpendicularThroughPoint;

// === CIRCLE 2D CONSTRUCTIONS ===

// Circle by center point and radius value
interface Circle2DByCenterAndRadius {
  kind: 'Circle2DByCenterAndRadius'; // Discriminator
  id: ElementId;
  name: string;                     // "c1", "c2", etc.
  planeId: PlaneId;
  
  // Defining data
  centerPointId: ElementId;
  radius: number;                   // User-specified radius
  
  createdBy: ActionId;
  visualStyle: VisualStyle;
}

// Circle by center point and point on circumference
interface Circle2DByCenterAndPoint {
  kind: 'Circle2DByCenterAndPoint'; // Discriminator
  id: ElementId;
  name: string;
  planeId: PlaneId;
  
  // Defining relations
  centerPointId: ElementId;
  circumferencePointId: ElementId;
  
  createdBy: ActionId;
  visualStyle: VisualStyle;
}

// Circle through three points
interface Circle2DByThreePoints {
  kind: 'Circle2DByThreePoints';    // Discriminator
  id: ElementId;
  name: string;
  planeId: PlaneId;
  
  // Defining relations
  point1Id: ElementId;
  point2Id: ElementId;
  point3Id: ElementId;
  
  createdBy: ActionId;
  visualStyle: VisualStyle;
}

type Circle2D = 
  | Circle2DByCenterAndRadius 
  | Circle2DByCenterAndPoint 
  | Circle2DByThreePoints;

// === ARC 2D CONSTRUCTIONS ===

// Arc by center, start point, end point
interface Arc2DByCenterAndPoints {
  kind: 'Arc2DByCenterAndPoints';   // Discriminator
  id: ElementId;
  name: string;                     // "arc1", "arc2", etc.
  planeId: PlaneId;
  
  // Defining relations
  centerPointId: ElementId;
  startPointId: ElementId;
  endPointId: ElementId;
  
  createdBy: ActionId;
  visualStyle: VisualStyle;
}

type Arc2D = Arc2DByCenterAndPoints;

// === GUIDE 2D ===

// Guide perpendicular to hinge line or BHL projection
interface Guide2DPerpendicularToLine {
  kind: 'Guide2DPerpendicularToLine'; // Discriminator
  id: ElementId;
  name: string;                     // Auto-generated "g1", "g2", etc.
  planeId: PlaneId;
  
  // Defining relations
  referenceLineId: ElementId;       // HL or BHL projection
  throughPointId: ElementId;        // Point on one plane that defines guide
  
  createdBy: ActionId;
  visualStyle: VisualStyle;
}

type Guide2D = Guide2DPerpendicularToLine;

// === BHL PROJECTION ===

// Broken hinge line projection (computed from 3D plane)
interface BHLProjection2D {
  kind: 'BHLProjection2D';          // Discriminator
  id: ElementId;
  name: string;
  planeId: PlaneId;
  
  // Defining relations
  sourcePlane3DId: ElementId;       // Parent 3D plane
  
  createdBy: ActionId;
  visualStyle: VisualStyle;
}

type BHLProjection = BHLProjection2D;
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

**Defining Relations vs. Current Realization**:

Elements are stored separately from their computed geometric state:

1. **Elements** (persistent, stored in world state):
   - Store only **defining relations** (element IDs, construction parameters)
   - Define dependencies in the dependency graph
   - Never contain computed geometric coordinates or equations
   - Example: `Line2DByTwoPoints` stores only `point1Id` and `point2Id`

2. **Realizations** (computed, stored in cache):
   - Concrete geometric data needed for rendering and calculations
   - Computed from element's defining relations
   - Stored in separate realization caches (not in element objects)
   - Invalidated and recomputed when dependencies change
   - Example: Line realization contains point + direction vector (not equation)

**Realization Cache Structure**:
```typescript
// Separate caches organized by object type for extensibility
// World class manages these caches and provides RealizationContext interface
interface RealizationCache {
  // 2D realizations
  pointRealizations2D: Map<string, Point2DRealization>;
  // Future: lineRealizations2D, circleRealizations2D, etc.
  
  // 3D realizations
  pointRealizations3D: Map<string, Point3DRealization>;
  // Future: lineRealizations3D, planeRealizations3D, etc.
}

// World implements RealizationContext for lazy evaluation
interface RealizationContext {
  getPoint2DRealization(pointId: string): Point2DRealization | undefined;
  getPoint3DRealization(pointId: string): Point3DRealization | undefined;
  // Future: getLine2DRealization, getCircle2DRealization, etc.
}

// Implementation in World class:
// - getPoint2DRealization(): Check cache → Compute via point.realize(this) → Cache → Return
// - invalidateRealization(pointId): Clear cache for point and dependents

// Realization types for 2D elements
type Element2DRealization = 
  | Point2DRealization
  | Line2DRealization
  | Segment2DRealization
  | Circle2DRealization
  | Arc2DRealization;

// CRITICAL ARCHITECTURE: Rule vs Realization Separation
// 
// Elements store RULES (how to construct), not computed values
// Realizations store COMPUTED VALUES (evaluated geometry)
//
// Example for Points:
//   - FreePoint2D stores position [u, v, 1] - the rule is "use this position"
//   - IntersectionPoint2D stores element1Id, element2Id, index - the rule is "compute intersection"
//   - Point2DRealization stores coordinates [u, v, 1] - the result after applying the rule
//
// All point types share the SAME realization class because:
//   - The rule determines HOW to get coordinates
//   - The realization is just the coordinates themselves
//   - Rendering doesn't care about the rule, only the coordinates
//   - Structural info (pointId, planeId) stays in domain Point2D object
//   - World cache uses pointId as key: Map<string, Point2DRealization>

interface Point2DRealization {
  position: Vector3;                // Position in plane coordinates (u, v, 1) - ONLY NUMERIC DATA
  
  // NO pointId - that's the map key in world.pointRealizations2D
  // NO planeId - that's in the Point2D domain object
  
  // Implementation: TypeScript class
  // constructor(position: Vector3)
  // getPosition(): Vector3
}

interface Line2DRealization {
  point: [number, number, number];  // [x, y, 1] - point on line (homogeneous)
  direction: [number, number, number]; // [dx, dy, 0] - direction vector (normalized, w=0)
}

interface Segment2DRealization {
  startPoint: [number, number, number]; // [x1, y1, 1] - start point (homogeneous)
  endPoint: [number, number, number];   // [x2, y2, 1] - end point (homogeneous)
}

interface Circle2DRealization {
  center: [number, number, number]; // [cx, cy, 1] - center point (homogeneous)
  radius: number;
}

interface Arc2DRealization {
  center: [number, number, number]; // [cx, cy, 1] - center point (homogeneous)
  radius: number;
  startAngle: number;               // Radians
  endAngle: number;
}

// Realization types for 3D elements
type Element3DRealization =
  | Point3DRealization
  | Line3DRealization
  | Segment3DRealization
  | Plane3DRealization;

interface Point3DRealization {
  position: Vector4;                // Position in 3D space (x, y, z, 1) - ONLY NUMERIC DATA
  
  // NO pointId - that's the map key in world.pointRealizations3D
  
  // Implementation: TypeScript class
  // constructor(position: Vector4)
  // getPosition(): Vector4
  
  // Computed from 2D projections using 3D reconstruction
}

interface Line3DRealization {
  point: [number, number, number, number];     // [x, y, z, 1] - point on line (homogeneous)
  direction: [number, number, number, number]; // [dx, dy, dz, 0] - direction vector (normalized, w=0)
}

interface Segment3DRealization {
  startPoint: [number, number, number, number]; // [x1, y1, z1, 1] - start point (homogeneous)
  endPoint: [number, number, number, number];   // [x2, y2, z2, 1] - end point (homogeneous)
}

interface Plane3DRealization {
  normal: [number, number, number, number]; // [a, b, c, d] - plane equation: ax + by + cz + d = 0
}
```

**Homogeneous Coordinates**:
- **2D Points**: `[u, v, 1]` - regular points with `w=1`
- **2D Vectors/Directions**: `[dx, dy, 0]` - with `w=0` to distinguish from points
- **3D Points**: `[x, y, z, 1]` - regular points with `w=1`
- **3D Vectors/Directions**: `[dx, dy, dz, 0]` - with `w=0` to distinguish from points
- **Special cases**: Points at infinity use `w=0` (e.g., ideal points)

---

## Realization System: Lazy Evaluation with Caching

### Overview

The realization system implements a **lazy evaluation with caching** pattern that separates geometric *definitions* (rules) from *computed results* (coordinates). This architecture enables:

- **Performance**: Expensive calculations done once and cached
- **Recursive dependencies**: Intersection of intersections handled automatically
- **Clear separation**: Domain objects define "what", realizations compute "how"
- **Extensibility**: Easy to add new element types with custom realization logic

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│  DOMAIN LAYER (What)                                        │
│  Point2D stores RULE/DEFINITION                             │
│  - FreePoint2D: "position is Vector3(100, 50, 1)"          │
│  - IntersectionPoint2D: "intersection of line1 & line2"    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ realize(context) method
                     │ Called on-demand, not at construction
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  REALIZATION LAYER (Computed Results)                       │
│  Point2DRealization stores COMPUTED COORDINATES             │
│  - Cached in World.pointRealizations2D Map                  │
│  - Same realization class for all point types               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Used by rendering
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER                                          │
│  Paper primitives, SVG rendering                            │
└─────────────────────────────────────────────────────────────┘
```

### Lazy Evaluation Flow

**1. Domain Object Creation** (no computation):
```typescript
// FreePoint2D: stores position directly as the rule
const pointA = new FreePoint2D(
  'point_a',                    // id (required)
  new Vector3(100, 50, 1),     // position - the rule
  'plane_H'                    // planeId (required)
);
world.addPoint(pointA);         // No realization computed yet

// IntersectionPoint2D: stores dependency relationship as the rule
const pointB = new IntersectionPoint2D(
  'point_b',                   // id (required)
  'line_1',                    // element1Id
  'line_2',                    // element2Id
  0,                          // index (which intersection)
  'plane_H'
);
world.addPoint(pointB);        // No realization computed yet
```

**2. On-Demand Realization** (first access):
```typescript
// Rendering needs coordinates
const realization = world.getPoint2DRealization('point_b');

// Inside world.getPoint2DRealization():
// 1. Check cache: pointRealizations2D.get('point_b') → undefined (not cached)
// 2. Get point: points.get('point_b') → IntersectionPoint2D
// 3. Call realize: point.realize(this) → computes intersection
// 4. Cache result: pointRealizations2D.set('point_b', realization)
// 5. Return: realization with position Vector3(x, y, 1)
```

**3. Cached Access** (subsequent accesses):
```typescript
// Same request again
const realization2 = world.getPoint2DRealization('point_b');

// Inside world.getPoint2DRealization():
// 1. Check cache: pointRealizations2D.get('point_b') → found!
// 2. Return immediately: realization (same object as before)
// No computation, instant return
```

### Implementation: World as RealizationContext

**World class implements RealizationContext interface**:

```typescript
export class World implements RealizationContext {
  private pointRealizations2D: Map<string, Point2DRealization>;
  private pointRealizations3D: Map<string, Point3DRealization>;
  
  /**
   * Get 2D realization - cache-first pattern
   */
  getPoint2DRealization(pointId: string): Point2DRealization | undefined {
    // 1. CHECK CACHE FIRST (fast path)
    let realization = this.pointRealizations2D.get(pointId);
    if (realization) {
      return realization;  // Already computed, return immediately
    }

    // 2. NOT CACHED - COMPUTE IT (slow path)
    const point = this.points.get(pointId);
    if (!point) return undefined;  // Point doesn't exist

    // 3. ASK POINT TO REALIZE ITSELF
    // Pass "this" as context so point can access other realizations
    realization = point.realize(this);
    
    // 4. CACHE THE RESULT
    this.pointRealizations2D.set(pointId, realization);
    
    return realization;
  }
  
  /**
   * Invalidate cache when definition changes
   */
  invalidateRealization(pointId: string): void {
    this.pointRealizations2D.delete(pointId);
    this.pointRealizations3D.delete(pointId);
    
    // TODO: Also invalidate dependent objects
    // Need dependency graph to know which objects depend on this one
  }
}
```

### Object-Specific Realization Methods

Each element type implements `realize(context)` with its own logic:

**FreePoint2D - Direct Access**:
```typescript
class FreePoint2D extends Point2D {
  position: Vector3;  // The rule: "it's at this position"
  
  realize(context: RealizationContext): Point2DRealization {
    // Simple case: position is directly available, no computation needed
    return new Point2DRealization(this.position);  // Only numeric data
  }
}
```

**IntersectionPoint2D - Recursive Computation**:
```typescript
class IntersectionPoint2D extends Point2D {
  element1Id: string;
  element2Id: string;
  index: number;       // The rule: "intersection of elem1 & elem2 at index"
  
  realize(context: RealizationContext): Point2DRealization {
    // 1. GET REALIZATIONS OF DEFINING ELEMENTS
    //    This may recursively trigger THEIR realization if not cached
    const line1Realization = context.getLine2DRealization(this.element1Id);
    const line2Realization = context.getLine2DRealization(this.element2Id);
    
    if (!line1Realization || !line2Realization) {
      throw new Error('Cannot realize intersection: defining elements not found');
    }
    
    // 2. COMPUTE INTERSECTION GEOMETRY
    const intersections = computeLineLineIntersection(
      line1Realization,
      line2Realization
    );
    
    if (intersections.length <= this.index) {
      throw new Error(`Intersection index ${this.index} out of bounds`);
    }
    
    // 3. RETURN REALIZATION WITH COMPUTED POSITION (only numeric data)
    return new Point2DRealization(
      intersections[this.index]  // Computed intersection point (Vector3)
    );
  }
}
```

### Recursive Dependency Example

**Scenario**: Point C is intersection of Line 1 and Line 2, where Line 1 passes through Point A and Point B (both free), and Line 2 passes through Point D and Point E (both free).

```
Point A (free) ────┐
                   ├─→ Line 1 ────┐
Point B (free) ────┘               │
                                   ├─→ Point C (intersection)
Point D (free) ────┐               │
                   ├─→ Line 2 ────┘
Point E (free) ────┘
```

**First call to `world.getPoint2DRealization('point_c')`**:

```
1. world.getPoint2DRealization('point_c')
   → Cache miss, call pointC.realize(world)

2. pointC.realize(world)
   → Needs line1Realization
   
3. world.getLine2DRealization('line_1')
   → Cache miss, call line1.realize(world)
   
4. line1.realize(world)
   → Needs pointA.realize() and pointB.realize()
   
5. world.getPoint2DRealization('point_a')
   → Cache miss, call pointA.realize(world)
   
6. pointA.realize(world)
   → Returns Vector3(10, 20, 1) immediately (free point)
   → Cached in pointRealizations2D
   
7. world.getPoint2DRealization('point_b')
   → Cache miss, call pointB.realize(world)
   
8. pointB.realize(world)
   → Returns Vector3(100, 80, 1) immediately (free point)
   → Cached in pointRealizations2D
   
9. Back to line1.realize()
   → Computes line from points A and B
   → Returns Line2DRealization
   → Cached in lineRealizations2D
   
10. Similar process for line2 (points D and E)
    → Cached in lineRealizations2D
    
11. Back to pointC.realize()
    → Has both line realizations
    → Computes intersection
    → Returns Point2DRealization(pointC, Vector3(55, 50, 1), 'plane_H')
    → Cached in pointRealizations2D
    
12. Returns realization to caller
```

**Second call to `world.getPoint2DRealization('point_c')`**:

```
1. world.getPoint2DRealization('point_c')
   → Cache hit!
   → Returns cached Point2DRealization immediately
   → No computation, instant return
```

**Third call for any dependent object**:
```
1. world.getPoint2DRealization('point_a')
   → Cache hit! Returns immediately
2. world.getLine2DRealization('line_1')
   → Cache hit! Returns immediately
```

### Cache Invalidation

When a definition changes, caches must be cleared:

```typescript
// User drags Point A to new position
pointA.position = new Vector3(200, 100, 1);

// Invalidate Point A's realization
world.invalidateRealization('point_a');

// TODO: Also invalidate dependents:
// - Line 1 realization (depends on A)
// - Point C realization (depends on Line 1)
// - Any other objects depending on C...

// Next render will recompute affected objects
const realization = world.getPoint2DRealization('point_a');
// → Cache miss → Recompute → Cache → Return
```

### Cache Organization

Caches are organized **by object type** for extensibility:

```typescript
interface World {
  // 2D realizations by type
  pointRealizations2D: Map<string, Point2DRealization>;
  lineRealizations2D: Map<string, Line2DRealization>;        // Future
  circleRealizations2D: Map<string, Circle2DRealization>;    // Future
  
  // 3D realizations by type  
  pointRealizations3D: Map<string, Point3DRealization>;
  lineRealizations3D: Map<string, Line3DRealization>;        // Future
  planeRealizations3D: Map<string, Plane3DRealization>;      // Future
}
```

**Benefits**:
- Clear organization by geometry type
- Easy to add new element types
- Separate concerns (2D vs 3D)
- Explicit about what's cached

### Usage in Rendering Pipeline

**RENDERING PATTERN: Walk → Realize → Render**

The rendering pipeline follows a simple three-step pattern:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. WALK: Iterate domain objects in World                    │
│    for (const point of world.points.values())              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. REALIZE: Get numeric data from cache                     │
│    const realization = world.getPoint2DRealization(point.id)│
│    → Returns Point2DRealization { position: Vector3 }       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. RENDER: Generate primitives/SVG using:                   │
│    - Numeric data from realization (position)               │
│    - Structural data from point (id, type, planeId)         │
└─────────────────────────────────────────────────────────────┘
```

**Paper Service** (transforms domain → primitives):

```typescript
class PaperService {
  generatePrimitives(context: PrimitiveContext): Primitive[] {
    const primitives: Primitive[] = [];
    
    // 1. WALK: Iterate over all points in the world
    for (const point of context.world.points.values()) {
      
      // 2. REALIZE: Get computed position (numeric data)
      const realization = context.world.getPoint2DRealization(point.id);
      if (!realization) continue;  // Skip if realization failed
      
      // Get plane transformation matrix (from structural context)
      const planeToPaperMatrix = context.planeTransforms.get(point.planeId);
      
      // 3. RENDER: Generate primitive using:
      //    - realization.position (numeric data)
      //    - point.id, point.type, point.planeId (structural data)
      const paperPos = applyMatrix3(realization.position, planeToPaperMatrix);
      
      primitives.push({
        type: 'point',
        id: `point-${point.id}`,        // From domain object
        x: paperPos.x,                   // From realization
        y: paperPos.y,                   // From realization
        radius: point.type === 'free' ? 5 : 4,  // Styling from domain
        style: this.resolvePointStyle(point, ...),  // From domain
        sourceEntityId: point.id         // From domain
      });
    }
    
    return primitives;
  }
}
```

**Key Insight**: Rendering never accesses domain object properties for numeric data (like `point.position`). It always goes through the realization layer. This ensures:
- Consistent architecture across all element types
- Cache invalidation works uniformly
- No special cases for FreePoint2D vs IntersectionPoint2D

### Key Design Principles

1. **Lazy Evaluation**: Don't compute until needed
2. **Cache Everything**: Once computed, never compute again (until invalidated)
3. **Recursive Safe**: Objects can depend on other objects' realizations
4. **Context Passing**: World passed as context to enable realization lookup
5. **Type Organization**: Separate caches by geometry type for clarity
6. **Same Realization Class**: All point types use Point2DRealization (definition determines how to compute, realization just stores result)

### Benefits Summary

**Performance**:
- Expensive calculations (intersections, transformations) done once
- Subsequent accesses are O(1) Map lookups
- No redundant computation

**Correctness**:
- Recursive dependencies handled automatically
- No risk of stale data (explicit invalidation)
- Clear contract via RealizationContext interface

**Maintainability**:
- Clean separation: rules in domain, results in realizations
- Easy to add new element types (just implement realize())
- Explicit caching strategy (no hidden state)

**Extensibility**:
- Pattern works for any element type (points, lines, circles, etc.)
- Easy to add new realization types (2D, 3D, projections)
- Future: dependency tracking for smart invalidation

---

**Conventions**:
- Regular geometric points: **always use w=1**
- Direction vectors: **always use w=0**
- Actual Cartesian coordinates from homogeneous: divide by w (x/w, y/w) or (x/w, y/w, z/w)
- For w=1, no division needed: `[x, y, 1]` represents point (x, y)

**Benefits**:
- Unified treatment of points and vectors
- Matrix transformations handle translation and linear operations uniformly
- Intersection/projection calculations simplified
- Points at infinity represented naturally when needed

**Why Separate Elements from Realizations?**
- **Elements**: Persistent data, saved to disk, define construction rules and dependencies
- **Realizations**: Ephemeral data, recomputed on load or when dependencies change
- **Cache invalidation**: When element changes, mark its realization and dependent realizations as stale
- **Parametric geometry**: Intersection points automatically update when parent elements move
- **Memory efficiency**: Only store rules, not redundant computed coordinates
- **Memory efficiency**: Realizations can be cleared and regenerated without affecting world state

**Recomputation**:
- When an element's defining inputs change, its realization is marked as stale
- During the next render cycle, stale realizations are recomputed
- Recomputation propagates through the dependency graph
- If recomputation fails (e.g., collinear points), element becomes infeasible

**Infeasibility** (computed during rendering, not stored):
- An Element2D is considered infeasible if:
  - Its defining inputs are infeasible (e.g., segment's points)
  - Computation fails (e.g., circle from 3 collinear points)
  - Validation fails (e.g., parallel lines don't intersect)
- Infeasibility is determined dynamically by traversing the dependency graph
- Infeasible elements are not rendered, marked visually in panels
- Not persisted as a field in the element data structure

---

### Domain Entity: Element3D

**Purpose**: 3D geometric entity derived from compatible 2D projections or defined by geometric rules

**Subtypes**:
```typescript
type Element3D = Point3D | Line3D | Segment3D | Plane3D;

// Point defined by explicit 3D coordinates (e.g., origin O)
interface Point3DByCoordinates {
  kind: 'Point3DByCoordinates';
  id: ElementId;
  name: string;                     // "O" for origin
  
  // Defining data (hardcoded coordinates)
  coordinates: [number, number, number, number];  // [x, y, z, 1] - homogeneous 3D coordinates
  
  // Computed projections (element IDs, not geometric data)
  projectionH: Point2DId;           // Projection on P_H
  projectionV: Point2DId;           // Projection on P_V
  
  // Metadata and relationships
  createdBy: ActionId;              // "system:init" for O
  visualStyle: VisualStyle;
}

// Point derived from two 2D projections
interface Point3DFromProjections {
  kind: 'Point3DFromProjections';
  id: ElementId;
  name: string;                     // "A", "B", etc. (uppercase)
  
  // Defining relations
  projectionH: Point2DId;           // Projection on P_H
  projectionV: Point2DId;           // Projection on P_V
  
  // Metadata and relationships
  createdBy: ActionId;
  visualStyle: VisualStyle;
}

type Point3D = Point3DByCoordinates | Point3DFromProjections;

// Line derived from two 2D line projections
interface Line3DFromProjections {
  kind: 'Line3DFromProjections';
  id: ElementId;
  name: string;                     // "L1", "L2", etc.
  
  // Defining relations
  projectionH: Line2DId;            // Projection on P_H
  projectionV: Line2DId;            // Projection on P_V
  
  // Metadata and relationships
  createdBy: ActionId;
  visualStyle: VisualStyle;
}

// Line defined as intersection of two planes (e.g., hinge lines)
interface Line3DFromPlaneIntersection {
  kind: 'Line3DFromPlaneIntersection';
  id: ElementId;
  name: string;                     // "HL_HV", "BHL_AB", etc.
  
  // Defining relations
  plane1: Plane3DId;                // First plane (e.g., P_H)
  plane2: Plane3DId;                // Second plane (e.g., P_V)
  
  // Computed projections (element IDs, not geometric data)
  projectionH: Line2DId;            // Projection on P_H
  projectionV: Line2DId;            // Projection on P_V
  
  // Metadata and relationships
  createdBy: ActionId;              // "system:init" for HL_HV
  visualStyle: VisualStyle;
}

type Line3D = Line3DFromProjections | Line3DFromPlaneIntersection;

interface Segment3D {
  id: ElementId;
  name: string;                     // "S1", "S2", etc.
  
  // Defining relations
  point1: Point3DId;                // 3D endpoints
  point2: Point3DId;
  
  // Metadata and relationships
  createdBy: ActionId;
  visualStyle: VisualStyle;
}

// Plane from two trace lines (user-constructed planes)
interface Plane3DByTraces {
  kind: 'Plane3DByTraces';
  id: ElementId;
  name: string;                     // "Pi1", "Pi2", etc.
  
  // Defining relations
  traceH: Line2DId;                 // Horizontal trace
  traceV: Line2DId;                 // Vertical trace
  
  // Metadata and relationships
  createdBy: ActionId;
  visualStyle: VisualStyle;
}

// Plane defined by point and normal vector (projection planes)
interface Plane3DByPointAndNormal {
  kind: 'Plane3DByPointAndNormal';
  id: ElementId;
  name: string;                     // "P_H", "P_V", etc.
  origin: Point3DId;                // Point on plane (e.g., O)
  normal: [number, number, number, number];  // Normal vector [nx, ny, nz, 0] - homogeneous
  
  // Metadata and relationships
  createdBy: ActionId;              // "system:init" for P_H, P_V
  visualStyle: VisualStyle;
}

type Plane3D = Plane3DByTraces | Plane3DByPointAndNormal;
```

**Special System Elements**:

The following elements are always present from workspace initialization (`createdBy: "system:init"`):

1. **Origin Point O** (`Point3DByCoordinates`):
   - Coordinates: [0, 0, 0, 1]
   - Projections: O_H on P_H, O_V on P_V
   - Cannot be deleted or moved

2. **Horizontal Plane P_H** (`Plane3DByPointAndNormal`):
   - Origin: O with coordinates [0, 0, 0, 1]
   - Normal: [0, 0, 1, 0] — Z-axis direction vector
   - The plane for "top views"

3. **Vertical Plane P_V** (`Plane3DByPointAndNormal`):
   - Origin: O with coordinates [0, 0, 0, 1]
   - Normal: [0, 1, 0, 0] — Y-axis direction vector
   - The plane for "front views"

4. **Hinge Line HL_HV** (`Line3DFromPlaneIntersection`):
   - Intersection of P_H and P_V
   - Projections: HL_HV_H on P_H, HL_HV_V on P_V
   - The "ground line" or "fold line"

**Relationships**:
- 1 Element3D → N Element2D (projections)
- 1 Element3D → 1 ConstructiveAction (createdBy)

**Validation Rules**:
- **Point3DByCoordinates**: Coordinates must be valid numbers
- **Point3DFromProjections**: `projectionH` and `projectionV` must exist, must be compatible (transportable via guide or geometrically consistent)
- **Line3DFromProjections**: `projectionH` and `projectionV` must exist, must be compatible projections of same 3D line
- **Line3DFromPlaneIntersection**: `plane1` and `plane2` must exist and intersect (not parallel)
- **Segment3D**: `point1` and `point2` must exist, must not be coincident
- **Plane3DByTraces**: `traceH` and `traceV` must exist, must not be parallel (define unique plane)
- **Plane3DByPointAndNormal**: `origin` must exist, `normal` must be non-zero vector

**Compatibility Check**:
- For Point3DFromProjections: projections must align via guide transport or geometric constraints
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
  x: number;                        // Paper coordinates (unified coordinate system)
  y: number;                        // Paper coordinates
  radius: number;                   // Display radius in pixels
}

interface PathPrimitive extends RenderPrimitive {
  type: "path";
  points: Array<{x: number, y: number}>; // Paper coordinates, for line segments, polylines
  closed: boolean;                  // Connect last to first?
}

interface CirclePrimitive extends RenderPrimitive {
  type: "circle";
  cx: number;                       // Center X (paper coordinates)
  cy: number;                       // Center Y (paper coordinates)
  r: number;                        // Radius (paper units)
}

interface ArcPrimitive extends RenderPrimitive {
  type: "arc";
  cx: number;                       // Center X (paper coordinates)
  cy: number;                       // Center Y (paper coordinates)
  r: number;                        // Radius (paper units)
  startAngle: number;               // Radians
  endAngle: number;
  largeArc: boolean;                // SVG large-arc-flag
  sweep: boolean;                   // SVG sweep-flag
}

interface TextPrimitive extends RenderPrimitive {
  type: "text";
  x: number;                        // Paper coordinates
  y: number;                        // Paper coordinates
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
  type: "path",
  points: [
    { x: 100, y: 200 },             // Computed from point1 position
    { x: 300, y: 400 }              // Computed from point2 position
  ],
  closed: false
};
```

### Paper Layer: Spatial Query Engine

**Purpose**: Paper provides spatial query services (hit testing, snapping) by leveraging its unified coordinate system and knowledge of all primitives.

**Architecture Principle**: Paper becomes the **spatial query engine** rather than just a rendering intermediate. Tools and UI components query Paper for element selection and proximity detection instead of directly querying World.

**Why Paper for Hit Testing?**

Paper is the ideal layer for spatial queries because:
1. **Unified coordinate system** - All primitives transformed to common paper space
2. **Knows all primitives** - Has complete scene with element IDs
3. **Has transform pipeline** - Can apply inverse transforms (canvas → paper → plane)
4. **Snap radius handling** - Can transform radius vector through same inverse pipeline
5. **Extensibility** - Easy to add new primitive types (lines, circles) in one place

**Coordinate Flow for Hit Testing**:
```
User Click (canvas pixels)
  ↓
Paper.hitTest(canvasPos: Vector2, snapRadius: number)
  ↓
1. Inverse viewport transform: canvas → paper
   paperPos = (canvasPos / zoom) - pan
   paperRadius = snapRadius / zoom
  ↓
2. Search primitives in paper space
   For each primitive:
     distance = distanceToPrimitive(primitive, paperPos)
     if distance <= paperRadius: record hit
  ↓
3. Return closest hit
   HitResult { elementId, type, distance }
  ↓
Tool uses elementId to create command
```

**Hit Testing API**:

```typescript
interface HitResult {
  elementId: string;      // Source domain element ID ("point_1", "line_2")
  elementType: string;    // "point" | "line" | "circle" | "segment"
  primitiveId: string;    // Primitive ID ("point-point_1")
  distance: number;       // Distance in canvas pixels (for UI feedback)
  snapPoint?: Vector2;    // Exact snap position (paper coordinates)
}

class Paper {
  private primitives: Primitive[] = [];
  private viewportTransform: ViewportTransform;
  private planeTransforms: Map<string, Matrix3>;
  private hoveredElementId?: string;  // For visual feedback
  
  /**
   * Find nearest element within snap radius.
   * Uses Vector2 for coordinates (never separate x,y parameters).
   * 
   * @param canvasPos - Click position in canvas pixel coordinates
   * @param snapRadius - Snap threshold in canvas pixels
   * @returns HitResult if element found within radius, null otherwise
   */
  hitTest(canvasPos: Vector2, snapRadius: number): HitResult | null {
    // Transform canvas → paper using inverse viewport
    const paperPos = this.canvasToPaper(canvasPos);
    const paperRadius = snapRadius / this.viewportTransform.zoom;
    
    // Search primitives for closest within radius
    let closestHit: HitResult | null = null;
    let minDistance = paperRadius;
    
    for (const primitive of this.primitives) {
      const distance = this.distanceToPrimitive(paperPos, primitive);
      
      if (distance < minDistance) {
        closestHit = {
          elementId: primitive.sourceEntityId,
          elementType: primitive.type,
          primitiveId: primitive.id,
          distance: distance * this.viewportTransform.zoom, // Convert to canvas pixels
          snapPoint: this.getSnapPoint(primitive)
        };
        minDistance = distance;
      }
    }
    
    return closestHit;
  }
  
  /**
   * Set which element should be visually highlighted (hover feedback).
   * This triggers re-generation of primitives with hover styling.
   */
  setHoveredElement(elementId: string | undefined): void {
    if (this.hoveredElementId !== elementId) {
      this.hoveredElementId = elementId;
      // Mark as needing re-render
    }
  }
  
  getHoveredElement(): string | undefined {
    return this.hoveredElementId;
  }
  
  private canvasToPaper(canvasPos: Vector2): Vector2 {
    // Inverse viewport transform
    return new Vector2(
      canvasPos.x / this.viewportTransform.zoom - this.viewportTransform.panX,
      canvasPos.y / this.viewportTransform.zoom - this.viewportTransform.panY
    );
  }
  
  private distanceToPrimitive(paperPos: Vector2, primitive: Primitive): number {
    switch (primitive.type) {
      case 'point':
        return this.distanceToPoint(paperPos, primitive as PointPrimitive);
      case 'line':
        return this.distanceToLine(paperPos, primitive as LinePrimitive);
      case 'circle':
        return this.distanceToCircle(paperPos, primitive as CirclePrimitive);
      default:
        return Infinity;
    }
  }
  
  private distanceToPoint(pos: Vector2, primitive: PointPrimitive): number {
    const dx = primitive.x - pos.x;
    const dy = primitive.y - pos.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  
  private distanceToLine(pos: Vector2, primitive: LinePrimitive): number {
    // Parametric line: P(t) = point + t * direction
    const lineStart = new Vector2(primitive.point.x, primitive.point.y);
    const lineDir = new Vector2(primitive.direction.x, primitive.direction.y);
    
    // Project pos onto infinite line
    const toPos = pos.clone().sub(lineStart);
    const t = toPos.dot(lineDir); // lineDir is normalized
    
    // Closest point on line
    const closest = lineStart.clone().add(lineDir.multiplyScalar(t));
    
    // Distance to infinite line
    return pos.distanceTo(closest);
  }
  
  private distanceToCircle(pos: Vector2, primitive: CirclePrimitive): number {
    // Distance to circle perimeter (not center)
    const dx = pos.x - primitive.cx;
    const dy = pos.y - primitive.cy;
    const distToCenter = Math.sqrt(dx * dx + dy * dy);
    return Math.abs(distToCenter - primitive.r);
  }
}
```

**Tool Usage Pattern**:

```typescript
// OLD (INCORRECT): Tools query World directly with coordinate transform issues
class LineTool {
  handleClick(context: ToolContext): ToolResult {
    const SNAP_RADIUS = 20; // pixels - but comparing in WRONG space!
    for (const point of world.getAllPoints()) {
      const planePos = world.getPoint2DRealization(point.id);
      const distance = /* compare plane coords with pixel radius - WRONG! */
      if (distance < SNAP_RADIUS) { /* ... */ }
    }
  }
}

// NEW (CORRECT): Tools use Paper.hitTest() with proper transforms
class LineTool {
  handleClick(context: ToolContext): ToolResult {
    const hit = paper.hitTest(
      new Vector2(context.canvasCoords.x, context.canvasCoords.y),
      20 // snap radius in pixels - correctly transformed by Paper
    );
    
    if (!hit || hit.elementType !== 'point') {
      return this.failure('Click near a point to select it');
    }
    
    // Use hit.elementId directly - no coordinate calculations needed
    if (this.state === 'waiting-first') {
      this.firstPointId = hit.elementId;
      this.state = 'waiting-second';
      return this.success(`Selected point: ${hit.elementId}`);
    } else {
      // Create line from firstPointId to hit.elementId
      const command = new CreateLineCommand(this.firstPointId, hit.elementId, ...);
      context.commandStack.execute(command);
      return this.success('Line created');
    }
  }
}
```

**Hover Feedback Integration**:

```typescript
// In SvgCanvas.vue
function handleMouseMove(event: MouseEvent) {
  if (!svgElement.value || !paper) return;
  
  const canvasPos = screenToCanvas(event.clientX, event.clientY);
  const hit = paper.hitTest(new Vector2(canvasPos.x, canvasPos.y), 20);
  
  // Update hover state - triggers primitive re-generation with highlight style
  paper.setHoveredElement(hit?.elementId);
  
  // Re-render to show hover feedback
  worldVersion.value++;
}

// In PaperService.generatePrimitives()
generatePrimitives(context: PrimitiveContext): Primitive[] {
  const hoveredId = this.paper.getHoveredElement();
  
  for (const point of context.world.getAllPoints()) {
    const isHovered = point.id === hoveredId;
    const style = this.resolvePointStyle(point, context, isHovered);
    // Apply hover styling: orange fill, thicker stroke
  }
}
```

**Benefits**:

1. **Correct Coordinate Spaces** - All distance checks in paper space with properly scaled snap radius
2. **Tool Simplification** - Tools just call `paper.hitTest()`, no coordinate math required
3. **Extensibility** - Easy to add line/circle snapping by adding distance functions to Paper
4. **Performance** - Single pass through primitives, efficient spatial queries
5. **Separation of Concerns** - Paper handles rendering AND selection, tools handle logic
6. **Testability** - Paper.hitTest() can be unit tested independently
7. **Consistent Architecture** - Same pattern for all tools (point, line, circle, etc.)

**Vector-First Design Principle**:

Always use `Vector2` or `Vector3` for coordinates, never separate `x, y` parameters:

```typescript
// ✓ GOOD - Type-safe, explicit transformations
hitTest(canvasPos: Vector2, snapRadius: number): HitResult | null

// ✗ BAD - Easy to confuse parameter order, unclear intent
hitTest(x: number, y: number, snapRadius: number): HitResult | null
```

This ensures type safety, makes coordinate transforms explicit, and prevents mixing coordinate spaces.

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
  // 1. Element must not be infeasible (computed dynamically)
  if (isInfeasible(element)) return false;
  
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
- 1 Action → N Elements in World (outputs)
- 1 Action → 1 ProcessNode (parent in tree)
- Action inputs (dependencies) are derived from outputs' construction rules (e.g., segment references its two points)

**Tree Position**:
- Leaf node in ProcessTree (no children)
- Must be child of ActionGroup
- Execution order determined by tree traversal

---

### Domain Entity: ActionGroup

**Purpose**: Groups one or more actions together; can be auxiliary (auto-created) or regular (user-created)

**Fields**:
```typescript
interface ActionGroup extends ProcessNodeBase {
  type: "actionGroup";
  children: ConstructiveAction[];   // One or more actions (ordered by creation time)
}
```

**Creation Patterns**:

ActionGroups can be created in two ways:

1. **User-initiated**: When user performs an action, an ActionGroup is created to contain it
   - Can contain single action or multiple related actions
   - Displayed normally in UI

2. **Auto-created (auxiliary)**: When an action needs auxiliary elements (e.g., auto-created free points for a segment)
   - System automatically creates an ActionGroup for the auxiliary actions
   - Displayed with special visual treatment in UI (bounding box, vertical line, lighter color, gear icon ⚙)
   - Properties typically locked from editing

**Important**: Once created, all elements become first-class objects in the World. The grouping is purely informative to help users understand construction history.

**ActionGroup Pattern**:
- ALL actions must be inside an ActionGroup (even if it's the only action)
- **Element Visibility**: Elements created by actions in ActionGroup inherit visibility from parent Subprocess
  - ActionGroup does NOT have independent visibility control
  - Visibility is determined by walking up tree to find parent Subprocess
- **UI Display**: ActionGroup and its actions are shown in construction panel
  - User-created groups: displayed normally
  - Auto-created (auxiliary) groups: special visual treatment (lighter color, gear icon ⚙)
  - Actions grouped together distinctly
  - Can be collapsed/expanded independently (state stored in ViewState)

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
- 1 ActionGroup → N Actions (children, at least one)

**Validation Rules**:
- `children` must all be ConstructiveAction nodes
- Must contain at least one Action
- Cannot contain other ActionGroups or Subprocesses
- Children ordered by creation time (immutable)

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
  ▶ Create segment s1
  ▶ ⚙ [Auxiliary actions]          ← auxiliary group indicator, no name
  ▶ Create circle c1
  ▼ 👁 Nested Subprocess          ← nested subprocess with visibility control
    ▶ Create guide g1
```

**ActionGroup Display** (visual grouping without names):
```
▼ 👁 Construction Phase 1
  ▼ ○ Create segment s1            ← regular action in group (expandable to show group)
  ┌─────────────────────────────┐
  │ ⚙ ⋅ Create free point a    │  ← auxiliary group: boxed, lighter color, gear icon
  │   ⋅ Create free point b    │  ← no group name needed
  └─────────────────────────────┘
  ▼ ○ Create circle c1
```

Or with vertical line grouping:
```
▼ 👁 Construction Phase 1
  ○ Create segment s1
  │ ⚙ ⋅ Create free point a       ← auxiliary: vertical line, gear icon, lighter text
  │   ⋅ Create free point b       ← bullet instead of circle
  ○ Create circle c1
```

Collapsed auxiliary group:
```
▼ 👁 Construction Phase 1
  ○ Create segment s1
  ▶ ⚙ [2 auxiliary actions]        ← collapsed, shows count
  ○ Create circle c1
```

**State Transitions**:
- **Executable** → **Executed**: Command validates and executes successfully
- **Executed** → **Infeasible**: Upstream input changes, validation fails during recomputation
- **Infeasible** → **Executed**: Upstream input corrected, validation passes

**UI Presentation for ActionGroups**:
```
▼ Construction Phase 1
  ▶ Create segment s1              ← regular action, collapsed
  ▶ ⚙ [2 auxiliary actions]        ← auxiliary group, collapsed (shows count)
  ▶ Create circle c1
```

When expanded:
```
▼ Construction Phase 1
  ▼ Create segment s1
  │ ⚙ ⋅ Create free point a       ← grayed out, vertical line grouping
  │   ⋅ Create free point b
  ▼ Create circle c1
```

**Special Treatment for Auxiliary ActionGroups**:
- Displayed with special icon (e.g., ⚙ gear icon)
- Rendered with visual grouping (bounding box or vertical line)
- Rendered with different styling (e.g., lighter color, italics)
- Properties locked (user cannot modify grouping)
- Can be collapsed/expanded like subprocesses
- When collapsed, shows count of contained actions
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

**Building the Graph**:
- When an action creates elements, add nodes for action and outputs
- Determine input dependencies from outputs' construction rules:
  - Segment2D: depends on point1, point2
  - Circle2D: depends on center (and possibly 3 points)
  - Point3D: depends on projectionH, projectionV
  - etc.
- Add edges from input elements → action → output elements

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
    activePlane: PlaneId;              // Currently active plane (determines where new elements created + visual emphasis)
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
  // NOTE: In MVP, all projection planes are ALWAYS visible (planes map not used)
  // Visual emphasis (opacity) is controlled by activePlane, not visibility flags
  visibility: {
    planes: Map<PlaneId, boolean>;     // Per-plane visibility (future feature, MVP=all true)
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

## Command Pattern (Undo/Redo)

### Domain Entity: Command

**Purpose**: Represents a user action that can be executed and undone; operations are added and executed incrementally

**Fields**:
```typescript
interface Command {
  id: CommandId;                    // UUID
  timestamp: Date;                  // When command was created
  description: string;              // Human-readable description (e.g., "Create segment s1")
  operations: Operation[];          // List of operations (added incrementally as executed)
  status: CommandStatus;            // "building" | "committed" | "undone"
}

enum CommandStatus {
  Building = "building",            // Operations being added/executed
  Committed = "committed",          // Command complete, in undo stack
  Undone = "undone"                 // Command has been undone
}
```

**Key Concepts**:
- **Incremental Execution**: Operations are executed immediately as they're added to the command
- **Dependency Resolution**: Later operations can use outputs (e.g., IDs) from earlier operations
- **Atomic Rollback**: If command fails or is undone, all operations are reversed in order
- **Transaction Pattern**: Command acts like a transaction - building → committed → undone

**Execution Flow**:
```typescript
// 1. Create command (status = "building")
const cmd = new Command({ description: "Create segment s1" });

// 2. Add and execute operations incrementally
const p1 = cmd.addAndExecute(new AddElementOp({ 
  element: { type: "FreePoint2D", position: [100, 200, 1], ... }
}));
// p1 now has generated ID, exists in World

const p2 = cmd.addAndExecute(new AddElementOp({
  element: { type: "FreePoint2D", position: [300, 400, 1], ... }
}));
// p2 now has generated ID, exists in World

const segment = cmd.addAndExecute(new AddElementOp({
  element: { type: "Segment2D", point1: p1.id, point2: p2.id, ... }
}));
// segment references p1 and p2 IDs (available from previous operations)

// 3. Commit command to stack (status = "committed")
commandStack.commit(cmd);
// Now available for undo

// 4. Later, user undoes
commandStack.undo();
// All operations reversed in reverse order: segment removed, p2 removed, p1 removed
```

**Example Command**:
```typescript
// Creating a segment with incremental execution
const cmd = new Command({ description: "Create segment s1" });

try {
  // Each operation executes immediately and can fail
  const p1Result = cmd.addAndExecute(new AddElementOp({
    element: { id: generateId(), type: "FreePoint2D", position: [100, 200, 1], ... },
    beforeState: null
  }));
  
  const p2Result = cmd.addAndExecute(new AddElementOp({
    element: { id: generateId(), type: "FreePoint2D", position: [300, 400, 1], ... },
    beforeState: null
  }));
  
  // Segment operation can use IDs from previous operations
  const segmentResult = cmd.addAndExecute(new AddElementOp({
    element: { 
      id: generateId(), 
      type: "Segment2D", 
      point1: p1Result.element.id,  // Available from previous operation
      point2: p2Result.element.id,  // Available from previous operation
      ... 
    },
    beforeState: null
  }));
  
  // Add action to ProcessTree
  cmd.addAndExecute(new AddActionToGroupOp({
    actionGroupId: currentActionGroup.id,
    action: { 
      id: generateId(), 
      actionType: "CreateSegment", 
      outputs: [p1Result.element.id, p2Result.element.id, segmentResult.element.id],
      ...
    },
    position: currentActionGroup.children.length
  }));
  
  // Update dependency graph
  cmd.addAndExecute(new AddDependencyEdgesOp({
    edges: [
      { from: p1Result.element.id, to: action.id },
      { from: p2Result.element.id, to: action.id },
      { from: action.id, to: segmentResult.element.id }
    ]
  }));
  
  // All operations succeeded, commit to stack
  commandStack.commit(cmd);
  
} catch (error) {
  // Any operation failed, rollback all executed operations
  cmd.rollback();
  throw error;
}
```

**Relationships**:
- 1 Command → N Operations (added incrementally)
- N Commands → 1 CommandStack

**Validation Rules**:
- `operations` can be empty while status = "building"
- `operations` must not be empty when status = "committed"
- All operations must be valid
- `description` must be non-empty

**State Transitions**:
- **Created** → **Building**: Command created, operations being added
- **Building** → **Committed**: Command.commit() finalizes and adds to stack
- **Building** → **Rolled Back**: Command.rollback() reverses all operations (discarded)
- **Committed** → **Undone**: CommandStack.undo() reverses all operations
- **Undone** → **Committed**: CommandStack.redo() reapplies all operations

**Command Interface**:
```typescript
class Command {
  private operations: Operation[] = [];
  private status: CommandStatus = CommandStatus.Building;
  
  // Add and immediately execute an operation
  addAndExecute<T extends Operation>(operation: T): OperationResult {
    if (this.status !== CommandStatus.Building) {
      throw new Error("Cannot add operations to non-building command");
    }
    
    try {
      // Execute operation immediately
      const result = operation.apply(project);
      
      // Store operation for undo
      this.operations.push(operation);
      
      return result;
    } catch (error) {
      // Operation failed, rollback entire command
      this.rollback();
      throw error;
    }
  }
  
  // Finalize command and add to stack
  commit(): void {
    if (this.operations.length === 0) {
      throw new Error("Cannot commit empty command");
    }
    this.status = CommandStatus.Committed;
  }
  
  // Rollback all executed operations (for failed commands)
  rollback(): void {
    for (let i = this.operations.length - 1; i >= 0; i--) {
      this.operations[i].undo(project);
    }
    this.operations = [];
    this.status = CommandStatus.Building;
  }
  
  // Undo committed command
  undo(): void {
    if (this.status !== CommandStatus.Committed) {
      throw new Error("Can only undo committed commands");
    }
    
    for (let i = this.operations.length - 1; i >= 0; i--) {
      this.operations[i].undo(project);
    }
    this.status = CommandStatus.Undone;
  }
  
  // Redo undone command
  redo(): void {
    if (this.status !== CommandStatus.Undone) {
      throw new Error("Can only redo undone commands");
    }
    
    this.operations.forEach(op => op.apply(project));
    this.status = CommandStatus.Committed;
  }
}
```

---

## Symbolic Addressing

**Purpose**: All elements in the system are addressable via symbolic paths, not direct object references

**Rationale**: 
- Operations must be serializable for persistence and undo/redo
- Direct object references cannot be serialized
- Symbolic paths enable stable references across save/load cycles
- Path-based addressing provides clear hierarchical structure

**Path Format**:
```typescript
type ElementPath = string;  // Format: "/world/elements2D/{id}" or "/world/elements3D/{id}"
type ActionPath = string;   // Format: "/process/subprocess/{id}/actionGroup/{id}/action/{id}"
type PlanePath = string;    // Format: "/world/planes/{id}"
```

**Examples**:
```typescript
// Element paths
"/world/elements2D/p1"              // Point2D with id="p1"
"/world/elements2D/s1"              // Segment2D with id="s1"
"/world/elements3D/point3d_1"       // Point3D
"/world/planes/P_H"                 // Horizontal projection plane
"/world/hingeLines/HL_HV"           // Hinge line

// Process tree paths
"/process/root"                                    // Root Process node
"/process/subprocess/sp1"                          // Subprocess with id="sp1"
"/process/subprocess/sp1/actionGroup/ag1"          // ActionGroup
"/process/subprocess/sp1/actionGroup/ag1/action/a1" // Action

// ViewState paths
"/viewState/activePlane"            // Current active plane reference
"/viewState/view2D/P_H"             // View2D state for horizontal plane
"/viewState/view3D"                 // 3D view state
```

**Path Resolution**:
```typescript
interface PathResolver {
  resolve<T>(path: string, project: Project): Result<T, PathError>;
  buildPath(entity: any): string;
}

// Usage example
const resolver = new PathResolver();
const point = resolver.resolve<Point2D>("/world/elements2D/p1", project);
if (point.isOk()) {
  const realization = world.getPointRealization(point.value.id);
  console.log(realization.u, realization.v);
}
```

**Validation Rules**:
- All operation parameters must use symbolic paths, not direct references
- Paths must be absolute (start with `/`)
- Path resolution must handle missing entities gracefully (return Result type)
- Generated paths must be deterministic (same entity → same path)

---

### Domain Entity: Operation

**Purpose**: Atomic, reversible mutation on World, ProcessTree, or ViewState

**Key Principle**: Operations use **symbolic paths** to reference entities, never direct object references

**Base Interface**:
```typescript
interface OperationBase {
  type: string;                     // Operation type identifier
  parameters: Record<string, any>;  // Contains both "before" and "after" state for reversibility
}

type Operation = 
  | WorldOperation 
  | ProcessTreeOperation 
  | ViewStateOperation;
```

**World Operations** (manipulate geometric domain):
```typescript
type WorldOperation =
  | AddElementOp
  | RemoveElementOp
  | UpdateElementOp
  | AddDependencyEdgesOp
  | RemoveDependencyEdgesOp;

interface AddElementOp extends OperationBase {
  type: "AddElement";
  parameters: {
    elementPath: ElementPath;        // Where to add: "/world/elements2D/{id}" or "/world/elements3D/{id}"
    elementData: Record<string, any>; // Element fields (type, construction params, style)
    beforeState: null;               // Element didn't exist (for consistency)
  };
}

interface RemoveElementOp extends OperationBase {
  type: "RemoveElement";
  parameters: {
    elementPath: ElementPath;        // Symbolic path to element
    beforeState: Record<string, any>; // Full element state before removal (for undo)
  };
}

interface UpdateElementOp extends OperationBase {
  type: "UpdateElement";
  parameters: {
    elementPath: ElementPath;        // Symbolic path to element
    beforeState: Record<string, any>; // Fields before change
    afterState: Record<string, any>;  // Fields after change
  };
}

// Example: Move point (using symbolic path)
{
  type: "UpdateElement",
  parameters: {
    elementPath: "/world/elements2D/p1",
    beforeState: { x: 100, y: 200 },
    afterState: { x: 150, y: 250 }
  }
}

interface AddDependencyEdgesOp extends OperationBase {
  type: "AddDependencyEdges";
  parameters: {
    edges: Array<{ 
      from: ElementPath | ActionPath;  // Symbolic path to source
      to: ElementPath | ActionPath;    // Symbolic path to target
    }>;
  };
}

interface RemoveDependencyEdgesOp extends OperationBase {
  type: "RemoveDependencyEdges";
  parameters: {
    edges: Array<{ 
      from: ElementPath | ActionPath;  // Symbolic path to source
      to: ElementPath | ActionPath;    // Symbolic path to target
    }>;
  };
}
```

**ProcessTree Operations** (manipulate construction history):
```typescript
type ProcessTreeOperation =
  | AddSubprocessOp
  | RemoveSubprocessOp
  | AddActionGroupOp
  | RemoveActionGroupOp
  | AddActionToGroupOp
  | RemoveActionFromGroupOp
  | UpdateSubprocessOp;

interface AddSubprocessOp extends OperationBase {
  type: "AddSubprocess";
  parameters: {
    parentPath: string;               // Symbolic path: "/process/subprocess/{parentId}"
    subprocessData: Record<string, any>; // Subprocess fields (name, visible, etc.)
    position: number;                 // Index in children array
  };
}

interface RemoveSubprocessOp extends OperationBase {
  type: "RemoveSubprocess";
  parameters: {
    subprocessPath: string;           // Symbolic path: "/process/subprocess/{id}"
    beforeState: Record<string, any>; // Full subprocess state (for undo)
    parentPath: string;               // Parent subprocess path
    position: number;
  };
}

interface AddActionGroupOp extends OperationBase {
  type: "AddActionGroup";
  parameters: {
    parentPath: string;               // Subprocess path: "/process/subprocess/{id}"
    actionGroupData: Record<string, any>; // ActionGroup fields
    position: number;
  };
}

interface AddActionToGroupOp extends OperationBase {
  type: "AddActionToGroup";
  parameters: {
    actionGroupPath: ActionPath;      // "/process/subprocess/{id}/actionGroup/{id}"
    actionData: Record<string, any>;  // Action fields (type, timestamp, outputs)
    position: number;                 // Index in children array
  };
}

interface UpdateSubprocessOp extends OperationBase {
  type: "UpdateSubprocess";
  parameters: {
    subprocessPath: string;           // "/process/subprocess/{id}"
    beforeState: Record<string, any>; // Fields before change (e.g., visible, name)
    afterState: Record<string, any>;  // Fields after change
  };
}
```

**ViewState Operations** (manipulate UI state):
```typescript
type ViewStateOperation =
  | SetActivePlaneOp
  | UpdateView2DOp
  | UpdateView3DOp
  | TogglePlaneVisibilityOp
  | UpdatePanelCollapseOp;

interface SetActivePlaneOp extends OperationBase {
  type: "SetActivePlane";
  parameters: {
    beforePlanePath: PlanePath;       // "/world/planes/{beforeId}"
    afterPlanePath: PlanePath;        // "/world/planes/{afterId}"
  };
}

interface UpdateView2DOp extends OperationBase {
  type: "UpdateView2D";
  parameters: {
    planePath: PlanePath;             // Which plane's view to update
    beforeState: Record<string, any>; // Pan, zoom values before
    afterState: Record<string, any>;  // Pan, zoom values after
  };
}

interface TogglePlaneVisibilityOp extends OperationBase {
  type: "TogglePlaneVisibility";
  parameters: {
    planePath: PlanePath;             // "/world/planes/{id}"
    beforeVisible: boolean;
    afterVisible: boolean;
  };
}

interface UpdatePanelCollapseOp extends OperationBase {
  type: "UpdatePanelCollapse";
  parameters: {
    nodePath: string;                 // Subprocess or ActionGroup path
    nodeType: "subprocess" | "actionGroup";
    beforeCollapsed: boolean;
    afterCollapsed: boolean;
  };
}
```

**Operation Execution**:
```typescript
interface IOperation {
  apply(project: Project): OperationResult;  // Apply operation, return result
  undo(project: Project): void;              // Reverse operation (use beforeState)
  outputs: Record<string, any>;              // Stored outputs after execution (symbolic paths or values)
}

interface OperationResult {
  success: boolean;
  outputs: Record<string, any>;              // Dictionary of named outputs (symbolic paths or fixed values)
  error?: string;
}

// Output value types
type OutputValue = 
  | string        // Symbolic path (e.g., "/world/elements2D/p1")
  | number        // Numeric value (e.g., x: 100, angle: 45)
  | boolean       // Boolean value (e.g., visible: true)
  | null;         // Null value

// Example outputs
// { "elementPath": "/world/elements2D/p1", "x": 100, "y": 200 }
// { "segmentPath": "/world/elements2D/s1", "length": 250.5 }
// { "actionPath": "/process/subprocess/sp1/actionGroup/ag1/action/a1" }

// Example implementation
class AddElementOperation implements IOperation {
  outputs: Record<string, any> = {};  // Stored after execution
  
  constructor(private params: AddElementOp["parameters"]) {}
  
  apply(project: Project): OperationResult {
    // Parse path to determine collection
    const path = this.params.elementPath;
    const elementData = this.params.elementData;
    
    // Create element from data
    const element = this.createElementFromData(elementData);
    
    if (path.startsWith("/world/elements2D/")) {
      project.world.elements2D.push(element as Element2D);
    } else if (path.startsWith("/world/elements3D/")) {
      project.world.elements3D.push(element as Element3D);
    } else {
      return { success: false, outputs: {}, error: `Invalid element path: ${path}` };
    }
    
    // Build outputs dictionary with symbolic path and relevant values
    const outputs = {
      elementPath: this.params.elementPath,      // Symbolic path
      elementId: element.id,                      // ID for convenience
      elementType: element.type,                  // Type for reference
      // Note: Coordinates not included - use Point2DRealization for computed coordinates
      ...(element.type === "Segment2D" ? { length: this.computeLength(element) } : {})
    };
    
    // Store outputs in operation for later reference
    this.outputs = outputs;
    
    return { 
      success: true, 
      outputs
    };
  }
  
  undo(project: Project): void {
    const path = this.params.elementPath;
    const elementId = path.split("/").pop();  // Extract ID from path
    
    // Remove from world using symbolic path
    if (path.startsWith("/world/elements2D/")) {
      project.world.elements2D = project.world.elements2D.filter(e => e.id !== elementId);
    } else if (path.startsWith("/world/elements3D/")) {
      project.world.elements3D = project.world.elements3D.filter(e => e.id !== elementId);
    }
  }
  
  private createElementFromData(data: Record<string, any>): Element2D | Element3D {
    // Factory method to construct element from data
    // Uses data.type to determine which constructor to call
    // ...
  }
}
```

**Validation Rules**:
- `beforeState` and `afterState` must contain all fields needed for reversibility
- Operations must be idempotent (applying twice = applying once)
- Operations must validate inputs before execution

---

### Persistence Entity: CommandStack

**Purpose**: Maintains history of executed commands for undo/redo functionality

**Fields**:
```typescript
interface CommandStack {
  commands: Command[];              // All commands in chronological order
  currentIndex: number;             // Points to last executed command (-1 if empty)
  maxSize: number;                  // Maximum commands to keep (e.g., 100)
}
```

**Operations**:
```typescript
class CommandStack {
  // Commit a built command to the stack
  commit(command: Command): void {
    if (command.status !== CommandStatus.Building) {
      throw new Error("Can only commit building commands");
    }
    
    // Finalize command
    command.commit();
    
    // Remove any commands after currentIndex (from redo history)
    this.commands = this.commands.slice(0, this.currentIndex + 1);
    
    // Add to stack
    this.commands.push(command);
    this.currentIndex++;
    
    // Enforce max size
    if (this.commands.length > this.maxSize) {
      this.commands.shift();
      this.currentIndex--;
    }
  }
  
  // Undo last command
  undo(): void {
    if (this.currentIndex < 0) return; // Nothing to undo
    
    const command = this.commands[this.currentIndex];
    command.undo();
    
    this.currentIndex--;
  }
  
  // Redo next command
  redo(): void {
    if (this.currentIndex >= this.commands.length - 1) return; // Nothing to redo
    
    this.currentIndex++;
    const command = this.commands[this.currentIndex];
    command.redo();
  }
  
  // Check if undo/redo available
  canUndo(): boolean { return this.currentIndex >= 0; }
  canRedo(): boolean { return this.currentIndex < this.commands.length - 1; }
  
  // Clear all history
  clear(): void {
    this.commands = [];
    this.currentIndex = -1;
  }
}
```

**Relationships**:
- 1 Project → 1 CommandStack
- 1 CommandStack → N Commands

**Validation Rules**:
- `currentIndex` must be in range [-1, commands.length - 1]
- All commands at index <= currentIndex must have `status = "committed"`
- All commands at index > currentIndex must have `status = "undone"`

**State Tracking**:
```typescript
interface CommandStackState {
  totalCommands: number;            // commands.length
  executedCommands: number;         // currentIndex + 1
  undoAvailable: boolean;           // currentIndex >= 0
  redoAvailable: boolean;           // currentIndex < commands.length - 1
  lastCommandDescription: string;   // commands[currentIndex]?.description
  nextCommandDescription: string;   // commands[currentIndex + 1]?.description
}
```

**Example Usage**:
```typescript
// User creates a segment (incremental execution with symbolic paths)
const cmd = new Command({ description: "Create segment s1" });

try {
  // Generate IDs upfront for symbolic paths
  const p1Id = generateId();  // e.g., "p1"
  const p2Id = generateId();  // e.g., "p2"
  const segmentId = generateId();  // e.g., "s1"
  
  // Create first point using symbolic path
  const p1Result = cmd.addAndExecute(new AddElementOp({ 
    elementPath: `/world/elements2D/${p1Id}`,
    elementData: { id: p1Id, kind: "FreePoint2D", position: [100, 200, 1], planeId: "P_H", ... },
    beforeState: null
  }));
  // p1Result.outputs = { elementPath: "/world/elements2D/p1", elementId: "p1", elementType: "FreePoint2D" }
  
  // Create second point using symbolic path
  const p2Result = cmd.addAndExecute(new AddElementOp({ 
    elementPath: `/world/elements2D/${p2Id}`,
    elementData: { id: p2Id, kind: "FreePoint2D", position: [300, 400, 1], planeId: "P_H", ... },
    beforeState: null
  }));
  // p2Result.outputs = { elementPath: "/world/elements2D/p2", elementId: "p2", elementType: "FreePoint2D" }
  
  // Create segment using outputs from previous operations
  const segmentResult = cmd.addAndExecute(new AddElementOp({ 
    elementPath: `/world/elements2D/${segmentId}`,
    elementData: { 
      id: segmentId, 
      type: "Segment2D", 
      point1: p1Result.outputs.elementId,  // Use ID from previous operation output
      point2: p2Result.outputs.elementId,  // Use ID from previous operation output
      plane: "P_H",
      ... 
    },
    beforeState: null
  }));
  // segmentResult.outputs = { elementPath: "/world/elements2D/s1", elementId: "s1", length: 282.8 }
  
  // Add action to process tree using symbolic paths from outputs
  const actionResult = cmd.addAndExecute(new AddActionToGroupOp({ 
    actionGroupPath: "/process/subprocess/sp1/actionGroup/ag1",
    actionData: { 
      id: generateId(),
      type: "ConstructiveAction",
      timestamp: new Date(),
      outputs: [segmentResult.outputs.elementId]  // References element by ID from output
    },
    position: 0
  }));
  // actionResult.outputs = { actionPath: "/process/subprocess/sp1/actionGroup/ag1/action/a1" }
  
  // Add dependency edges using symbolic paths from outputs
  cmd.addAndExecute(new AddDependencyEdgesOp({ 
    edges: [
      { from: p1Result.outputs.elementPath, to: segmentResult.outputs.elementPath },
      { from: p2Result.outputs.elementPath, to: segmentResult.outputs.elementPath }
    ]
  }));
  // Outputs = { edgeCount: 2 }
  
  // All operations succeeded, commit to stack
  commandStack.commit(cmd);
  
} catch (error) {
  // Some operation failed, rollback already occurred in addAndExecute
  console.error("Command failed:", error);
}

// User moves a point using symbolic path
const moveCmd = new Command({ description: "Move point a" });
moveCmd.addAndExecute(new UpdateElementOp({
  elementPath: "/world/elements2D/p1",
  beforeState: { position: [100, 200, 1] },
  afterState: { position: [150, 250, 1] }
}));
commandStack.commit(moveCmd);

// User presses Ctrl+Z (undo)
commandStack.undo(); // Point moves back to [100, 200, 1], segment updated

// User presses Ctrl+Y (redo)
commandStack.redo(); // Point moves to [150, 250, 1] again
```

**Persistence**:
- CommandStack is NOT serialized to storage by default (too large, ephemeral)
- Only current project state (World, ProcessTree, ViewState) is saved
- For advanced features (session replay), commands can be optionally logged

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
              │               ├── (N) Element2D ──── (1) ConstructiveAction (createdBy)
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
              │                     ├── ActionGroup ──── ConstructiveAction children
              │                     │
              │                     └── ConstructiveAction ──── Element outputs (World)
              │                                               (inputs derived from outputs' construction rules)
              │
              ├── (1) ViewState
              │
              └── (1) CommandStack ──── (N) Command ──── (N) Operation
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
| ConstructiveAction | All inputs exist and valid (derived from outputs) | Infeasible if inputs change (FR-012) |

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
- Rebuild `DependencyGraph` from element construction rules (element references)
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

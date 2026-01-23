# Feature Specification: Diedrico Dihedral Learning MVP

**Feature Branch**: `001-dihedral-learning-mvp`  
**Created**: 2025-12-22  
**Status**: Draft  
**Input**: Derived from `pre-spec.md` and `pre-spec-ui.md` (project documentation is in Spanish; this specification is intentionally in English per constitution).

## Conceptual Model (User POV)

This section defines the user-facing mental model, terminology, and UI components of the application. The goal is to make the *constructive process* explicit: the user performs deliberate operations, sees intermediate steps, and understands dependencies.

### Purpose and Learning Focus

- The application is an educational tool for **dihedral/orthographic projection** commonly taught in engineering programs.
- The primary value is the **constructive process** (how the drawing is built), not only the final drawing.
- The application does not “fix” mistakes or silently complete constructions; it surfaces infeasibility and lets the learner adjust inputs.

### Workspace and Views

From the user’s perspective, the workspace has two synchronized views:

- **2D View (Primary)**: The main drawing area where all constructions are performed.
  - The 2D view is where constructions are performed on the active plane; projection plane surfaces are visualized in the 3D overlay.
  - One plane is always the **active plane** (new 2D elements are created there).
  - Navigation is always available:
    - Pan: `Shift` + drag
    - Zoom: mouse wheel
- **3D View (Auxiliary, Read-Only)**: A floating overlay used only to improve spatial understanding.
  - Supports rotate, pan, zoom.
  - Does not allow selecting or editing geometry.
  - Can optionally show 2D elements on planes and linking visuals between 3D elements and their 2D projections.

### Projection Planes

A **projection plane** is a named 2D surface where the user draws 2D geometry.

- Default planes:
  - `P_H`: Horizontal plane (typically displayed horizontally in the 2D view)
  - `P_V`: Vertical plane (typically displayed vertically in the 2D view)
- **All projection planes are displayed simultaneously** in the 2D workspace, arranged in dihedral configuration around their shared hinge lines.
- The system may include additional projection planes later (auxiliary, profile, etc.).
- The **active plane** determines only *where new elements are created*; it does NOT control visibility.
- Changing the active plane:
  - does not hide or show planes,
  - does not modify existing geometry,
  - only changes which plane receives new constructions,
  - updates visual emphasis (active plane elements at full intensity, others de-emphasized).

### Hinge Lines (HL) and Broken Hinge Lines (BHL)

A **hinge line** (HL) is the intersection line shared by two **projection planes** (the actual drawing planes themselves).

- Naming convention: `HL_XY` where `X` and `Y` are plane identifiers.
  - Example: `HL_HV` is the hinge line shared by `P_H` and `P_V` (the ground line).
- Hinge lines are the **physical fold lines** between projection planes.
- For geometric reasoning, hinge lines behave like regular 2D lines.

**Broken Hinge Lines (BHL)**: When two arbitrary 3D planes intersect (not projection planes), their intersection line is called a **broken hinge line**. For example, with three planes A, B, C:
- `HL_AB` and `HL_AC` are regular hinge lines (folds between projection planes)
- `BHL_BC` is the broken hinge line (intersection of planes B and C in 3D space)
- The BHL_BC appears as **projected lines** on planes B and C (two separate 2D Element lines)
- Distance transport typically occurs between these BHL projections, not between regular HLs

**Key difference**: Regular HLs are structural (fold lines). BHLs are geometric constructs whose projections are used for transport operations.

### Guides

A **guide** is a key dihedral learning construct:

- Created from:
  - a hinge line (HL or BHL projection), and
  - a point on the active plane.
- Result:
  - a line **perpendicular** to the selected HL/BHL,
  - belonging to **both** planes associated with that HL/BHL.

**Important behavior with BHLs**: When a guide is created perpendicular to a BHL projection on one plane, it is **automatically transported** to the other plane's BHL projection. This establishes immediate geometric correspondence between the two projections.

Guides enable transporting points and distances between planes in an explicit, traceable way.

### 2D Elements (Explicit Entities)

2D elements exist on exactly one projection plane and are created explicitly by the user:

- Point
- Segment
- Line
- Circle
- Arc (optional)

**No implicit entities rule (critical)**:
- The UI must not create “implicit points” (e.g., a click somewhere along a segment is *not* treated as a point-on-segment).
- If a later operation needs a point-on-curve/line/segment, the user must first create an explicit 2D point entity (e.g., point-on-element or intersection).

#### Element Construction Methods

Elements of the same type can be constructed in fundamentally different ways. Each construction method becomes a distinct **element variation** with its own creation tool and behavior:

**Points**:
- **Free Point**: User clicks to position anywhere on the active plane
  - Tool: Free Point Tool
  - Example: Drawing a triangle's vertices
  - Special case: Origin points (O_H, O_V) are Free Points with locked=true

**Note**: Intersection point variations (Line-Line, Line-Circle, Circle-Circle) will be added in future phases.

**Lines**:
- **Free Line**: User picks two existing points to define the line
  - Tool: Line Tool + point selection
  - Example: Connecting two traced points

**Note**: Line variations (Parallel, Perpendicular) will be added in future phases.

**Circles**:
- **Circle by Center and Point**: Defined by center point and a point on the circumference
  - Tool: Circle Tool + point selection
  - Example: Creating an arc construction

**Planes** (3D, created from 2D traces):
- **Fixed Plane**: P_H and P_V with hard-coded orientations (**INITIALIZATION ONLY**)
  - **CRITICAL**: NO user tool - users CANNOT create fixed planes via UI
  - Created only during world initialization (bootstrapping)
  - P_H at z=0 (horizontal), P_V at y=0 (vertical)
  - This variation exists solely to represent the fundamental H and V projection planes

**CRITICAL - Initialization-Only Elements**:
- **Fixed Planes (Plane3DFixed)**: Created automatically during world setup, NO UI tools
  - P_H and P_V only - these are the horizontal and vertical projection planes
- **Origin points O_H, O_V**: Created as locked FreePoint2D during initialization
- **Main hinge line HL_HV**: Created during world initialization

**Note**: User-creatable plane variations (such as auxiliary planes) and 3D object manipulation are deferred to future phases when full 3D support is implemented.

**Why Construction Methods Matter**:
1. **Different parameters**: Free points need position; intersections need parent elements
2. **Different dependencies**: Intersections update when parents move; free points don't
3. **Different validity**: Intersections can become infeasible; free points can't
4. **Different UI behavior**: Some need index selection; others don't
5. **Different visualization**: Derived elements (intersections) appear de-emphasized

The construction method is part of the element's identity and persists through undo/redo and save/load.
### 3D Elements (Derived, Not Edited)

3D elements are derived artifacts created explicitly from compatible 2D inputs:

- 3D point: from two compatible 2D projections (e.g., a point projection on `P_H` and a point projection on `P_V`).
- 3D line: from compatible 2D projections.
- 3D segment: from two compatible 2D segments (one per plane) with compatible endpoints.
- 3D plane: from compatible 2D traces.

3D elements:
- are not edited directly,
- exist as a consequence of 2D constructions,
- are visualized in the 3D view to support learning.

**Origin Point O** (special 3D element):

Every workspace contains a special **origin point** named `O`:

- `O` is a **3D element** defined by hardcoded coordinates (0, 0, 0) in 3D space.
- Type: `Point3DByCoordinates` (not derived from projections)
- Geometrically, it sits at the intersection of projection planes `P_H` and `P_V` (on the hinge line `HL_HV`).
- Its 2D projections are **stored as 2D Point objects** in the World:
  - `O_H` on `P_H`: locked Point with local coordinates (0, 0) — on the hinge line
  - `O_V` on `P_V`: locked Point with local coordinates (0, 0) — on the hinge line
- The 3D point `O` is **defined by** its two projections `O_H` and `O_V` (standard dihedral geometry).
- The origin point is **always present** from the moment a workspace is created.
- It is always visible and cannot be deleted or moved (points are locked).
- It can be used as a reference point in constructions like any other 3D point.
- Visual appearance: regular point rendering (not a special crosshair), distinguishable by color (#FF6B35 orange).

**Projection Planes P_H and P_V** (special 3D elements):

Every workspace contains two fundamental **projection planes** defined by point + normal vector:

- `P_H`: Horizontal projection plane
  - Type: `Plane3DByPointAndNormal`
  - Origin: point `O` (0, 0, 0)
  - Normal vector: (0, 0, 1) — pointing upward along Z-axis
  - The plane where "top views" are drawn
- `P_V`: Vertical projection plane
  - Type: `Plane3DByPointAndNormal`
  - Origin: point `O` (0, 0, 0)
  - Normal vector: (0, 1, 0) — pointing toward viewer along Y-axis
  - The plane where "front views" are drawn

These planes are **always present**, cannot be deleted, and serve as the fundamental reference surfaces for dihedral projection.

**Hinge Line HL_HV** (special 3D element):

The hinge line between `P_H` and `P_V`:

- `HL_HV` is a **3D element** defined as the intersection of two planes.
- Type: `Line3DFromPlaneIntersection`
- Defined by: intersection of `P_H` and `P_V`
- 3D position: X-axis where y=0 AND z=0 (parametric: (x, 0, 0) for all x)
- Its 2D projections (`HL_HV_H`, `HL_HV_V`) appear as horizontal lines on each plane:
  - `HL_HV_H` on `P_H`: horizontal line at v = 0 (plane intrinsic coordinates)
  - `HL_HV_V` on `P_V`: horizontal line at v = 0 (plane intrinsic coordinates)
- Visual appearance: dashed gray line (#333333)
- The hinge line is the "fold line" or "ground line" in traditional dihedral drawings
- Position is derived from plane intersection, not hardcoded (v=0 is the geometric result)
- It is **always present** and cannot be deleted

### Coordinate System (Monge Projection)

The application uses **Monge projection** (descriptive geometry) with the following coordinate system conventions:

#### 3D Space Definition

- **Origin**: O at (0, 0, 0)
- **Basis vectors**:
  - **i** = (1, 0, 0) - X-axis (horizontal, pointing right)
  - **j** = (0, 1, 0) - Y-axis (depth, pointing away from viewer)
  - **k** = (0, 0, 1) - Z-axis (vertical, pointing up)
- **Viewer position**: Located at (0, -∞, 0), looking toward origin along +Y direction

**⚠️ Coordinate System Handedness**: This is a **left-handed coordinate system** following Monge projection conventions. The viewer looks along +Y toward the origin, with X to the right and Z upward.

#### Projection Planes in 3D

- **P_V (Vertical plane)**: XZ plane at Y = 0
  - Basis vectors: **<i, k>** = {(1,0,0), (0,0,1)}
  - Normal vector: **j** = (0,1,0) pointing toward viewer
  - What the viewer sees directly (front view)

- **P_H (Horizontal plane)**: XY plane at Z = 0
  - Basis vectors: **<i, j>** = {(1,0,0), (0,1,0)}
  - Normal vector: **k** = (0,0,1) pointing up
  - Top view (perpendicular to viewer's line of sight)

- **HL_HV (Hinge Line)**: X-axis
  - Direction: **i** = (1,0,0)
  - The intersection line between P_H and P_V
  - Horizontal axis shared by both plane drawings

#### 2D Coordinate Systems on Projection Planes

Each projection plane has its own 2D coordinate system defined by the plane's basis vectors:

**P_V (Vertical Plane) - Front View**:
- 2D basis: **<i, k>** where:
  - **u-axis** (horizontal on paper) = **i** = (1,0,0) → X in 3D
  - **v-axis** (vertical on paper) = **k** = (0,0,1) → Z in 3D
- Transformation: 2D point (u, v) → 3D point **(u, 0, v)**
- Example: (5, 4) on P_V paper = 3D point (5, 0, 4)

**P_H (Horizontal Plane) - Top View**:
- 2D basis: **<i, j>** where:
  - **u-axis** (horizontal on paper) = **i** = (1,0,0) → X in 3D
  - **v-axis** (downward on paper) = **j** = (0,1,0) → Y in 3D
- Transformation: 2D point (u, v) → 3D point **(u, v, 0)**
- Example: (5, 3) on P_H paper = 3D point (5, 3, 0)
- **Note**: Y increases downward on the P_H paper (away from viewer in 3D)

#### 2D Paper Layout (Unfolded Monge Representation)

```
     ┌─────────────────────────┐
     │  P_V (Vertical/Front)   │
     │                         │
     │      Z ↑                │
     │        |                │
     │        O────→ X         │
     │                         │
     └─────────────────────────┘
     ══════════════════════════ HL_HV (X-axis: y=0 z=0 in 3D, v=0 in planes)
     ┌─────────────────────────┐
     │        O────→ X         │
     │        |                │
     │        ↓ Y              │
     │                         │
     │  P_H (Horizontal/Top)   │
     │  (rotated down 90°)     │
     └─────────────────────────┘
                                  (v=0 in plane intrinsic coordinates)
```

#### Y Coordinate Behavior on P_H

Relative to the hinge line on P_H (using plane intrinsic v coordinate):
- **Away from HL** (v > 0): Y < 0 in 3D (toward viewer, below horizontal plane)
- **At HL** (v = 0): Y = 0 in 3D (on hinge line, the X-axis)
- **Toward viewer from HL** (v < 0): Y > 0 in 3D (away from viewer, above horizontal plane)

#### Reconstructing 3D from 2D Projections

Given compatible projections:
- Point A_H at (x_h, y_h) on P_H
- Point A_V at (x_v, z_v) on P_V
- Both representing the same 3D point A

The 3D coordinates are:
- **A_3D = (x_h, y_h, z_v)** if **x_h === x_v** (compatibility requirement)

The X-coordinate must match because the hinge line (X-axis) is shared between both planes.

#### General Algorithm for Projection Plane Coordinate Systems

For any 3D plane that needs to be represented as a projection plane, the 2D coordinate system is computed using the following algorithm:

##### Rule 1: Base Planes (Hardcoded)

**P_H** and **P_V** use predefined coordinate systems:

- **P_H**:
  - Origin: **O** = (0, 0, 0)
  - U-axis: **i** = (1, 0, 0)
  - V-axis: **j** = (0, 1, 0)
  - Transformation: (u, v) → (u, v, 0)

- **P_V**:
  - Origin: **O** = (0, 0, 0)
  - U-axis: **i** = (1, 0, 0)
  - V-axis: **k** = (0, 0, 1)
  - Transformation: (u, v) → (u, 0, v)

##### Rule 2: Auxiliary Planes (Computed from Geometry)

For any other 3D plane α (e.g., auxiliary planes from BHL constructions):

**Step 1: Compute Origin**

The origin is placed at the intersection of plane α with the X-axis (the line y=0, z=0):

```
Plane equation: n·(P - P₀) = 0, where n is the normal and P₀ is a point on the plane
X-axis: (t, 0, 0) for t ∈ ℝ

Solve: n·((t, 0, 0) - P₀) = 0
       nx·(t - P₀.x) + ny·(0 - P₀.y) + nz·(0 - P₀.z) = 0
       nx·t = nx·P₀.x + ny·P₀.y + nz·P₀.z
       t = P₀.x + (ny·P₀.y + nz·P₀.z) / nx

Origin = (t, 0, 0)
```

**Note**: This only works if the plane intersects the X-axis (nx ≠ 0). Planes parallel to the X-axis are not valid projection planes in this system.

**Step 2: Compute U-axis (from trace on P_H)**

The U-axis is determined by the **trace of plane α on P_H** (the horizontal trace):

1. Compute the intersection line between plane α and P_H (z=0 plane)
2. This line has direction vector **t** = (tx, ty, 0)
3. Normalize: **u** = **t** / ||**t**||
4. **Disambiguate direction**: Choose the orientation with positive X component
   - If tx > 0: use **u**
   - If tx < 0: use **-u**
   - If tx ≈ 0 and ty > 0: use **u**
   - If tx ≈ 0 and ty < 0: use **-u**

**Rationale**: The trace on P_H provides a natural geometric reference that ensures consistency with the horizontal projection view.

**Step 3: Compute V-axis (perpendicular, oriented upward)**

The V-axis is perpendicular to U-axis and lies on plane α:

1. Compute: **v_candidate** = **n** × **u** (cross product of normal and U-axis)
2. Normalize: **v** = **v_candidate** / ||**v_candidate**||
3. **Ensure upward orientation**: Check that **u** × **v** points toward +Z
   ```
   cross_product = u × v
   if cross_product.z > 0:
       V-axis = v
   else:
       V-axis = -v  (flip to ensure upward)
   ```

**Rationale**: This ensures that when viewing the plane in 2D, the V-axis points "upward" on the paper, consistent with the convention that Z is up in the 3D space.

##### Summary: Coordinate System Properties

For any projection plane (P_H, P_V, or auxiliary):

1. **Origin**: At intersection with X-axis (y=0, z=0)
   - For P_H and P_V: origin = (0, 0, 0)
   - For auxiliary plane: origin = (t, 0, 0) computed from plane equation

2. **U-axis**: Along the horizontal trace (trace on P_H)
   - For P_H and P_V: u = **i** = (1, 0, 0)
   - For auxiliary plane: computed from trace direction

3. **V-axis**: Perpendicular to U-axis, on the plane, oriented toward +Z
   - For P_H: v = **j** = (0, 1, 0)
   - For P_V: v = **k** = (0, 0, 1)
   - For auxiliary plane: v = **n** × **u**, disambiguated for upward orientation

4. **Transformation**: 2D (u, v) → 3D = origin + u·**u** + v·**v**

##### Example: Auxiliary Plane

Given a 3D plane α with equation **2x + y + z = 6**:

**Step 1: Origin**
- Normal: **n** = (2, 1, 1)
- Point on plane: P₀ = (3, 0, 0) (satisfies equation)
- Intersection with X-axis (y=0, z=0):
  ```
  2x = 6 → x = 3
  Origin = (3, 0, 0)
  ```

**Step 2: U-axis**
- Trace on P_H (z=0): 2x + y = 6 → y = 6 - 2x
- Direction: parallel to (-2, 1, 0) / ||(−2, 1, 0)|| = (0, 1, 0) when parametrized
- Actually the line passes through (3, 0, 0) with direction along y
- Trace direction: perpendicular to (2, 1, 0) in XY plane = (-1, 2, 0)
- Normalized: **u** = (-1, 2, 0) / √5 = (-0.447, 0.894, 0)
- Check: u.x < 0, so flip: **u** = (0.447, -0.894, 0)

**Step 3: V-axis**
- **v_candidate** = **n** × **u** = (2, 1, 1) × (0.447, -0.894, 0)
- Result: **v** = (0.894, 0.447, -2.236) / ||...|| (normalized)
- Check: (**u** × **v**) · **k** > 0 to ensure upward orientation

**Resulting coordinate system for plane α**:
- Origin: (3, 0, 0)
- U-axis: computed from horizontal trace
- V-axis: perpendicular, pointing generally upward

### Projections: Generative vs Derived

The user distinguishes between two kinds of projections in the 2D view:

- **Generative projections**: projections explicitly used to define a 3D element.
- **Derived projections**: projections produced as a consequence of other constructions.

Derived projections are visually de-emphasized compared to generative projections.

### Parametric Behavior and Dependencies

The drawing is parametric:

- Every constructive operation introduces dependencies.
- When a base element changes, dependent results are recomputed.

**Infeasibility**:
- **Case A — Invalid at creation time (blocked immediately)**: if the user attempts to complete a *new* construction and its current inputs/parameters do not define a valid result, the system MUST:
  - report the invalidity immediately (no modal dialogs),
  - create **no new geometric output element** (nothing new appears in the drawing as a created element),
  - ignore the attempted action after feedback (i.e., do not add a new action entry to history).
- **Case B — Becomes infeasible after change (allowed for previously valid work)**: if a construction was previously valid, but later an upstream edit triggers recomputation and the construction can no longer be computed, the system MUST:
  - keep the construction/action in the history,
  - mark it as infeasible,
  - draw no infeasible outputs (downstream results are ignored until inputs are corrected),
  - expose the infeasibility via non-modal visual indicators (panels + highlighting).

In both cases, the application does not “fix” inputs automatically; the learner resolves infeasibility by adjusting explicit inputs.

### Constructive Actions (The “Process”)

Every operation performed through a tool creates a **constructive action** that:

- records what was created and what it depends on,
- updates automatically when its inputs change,
- can be reviewed in the action history panel.

Actions may be grouped into **subprocesses** (collapsible groups) to reflect reasoning steps and improve readability.

### UI Components (User-Facing)

The UI is organized into four main areas:

1. **Top Toolbars**
   - Active plane selector
   - 2D navigation tools (optional, since shortcuts are always available)
   - 2D drawing tools (point/segment/line/circle/arc) with explicit variants
   - Dihedral tools (HL, guides, transports)
   - 3D creation tools (derive 3D elements from selected 2D inputs)
2. **Central 2D Drawing Area**
3. **Overlay 3D View (auxiliary)**
4. **Left Stacked Panels**
   - Constructive actions panel (history; hierarchical; hover highlights dependencies)
   - Elements panel (2D and 3D sections; click opens properties)
  - Within each section, items are grouped by nature (e.g., points, lines, segments, planes).
  - Not all types exist in both sections; for example, planes and projection planes appear only under **3D**.

**Element properties dialog**:
- Opened by clicking an element in the elements panel.
- Controls visual style only (color, line width, line style, visibility, inheritance reset).
- Visual style properties are **unset by default** and their effective values are inherited from the construction subprocess that contains the element; per-element overrides are explicit and can be reset back to inheritance.

### Tool Families and Interaction Rules

**For comprehensive UI interaction patterns, toolbar organization, cursor feedback, and viewport interaction modes, see [ui-spec.md](ui-spec.md).**

At a conceptual level, the UI is designed so that:

- Tools are grouped by operation type and may offer **explicit variants** the user deliberately chooses.
- Constructive inputs are explicit:
  - **No arbitrary point-on-element inputs**: clicking on a segment away from intersections does not create a point.
  - **Automatic but traceable exceptions**: intersections and free space clicks create explicit points recorded as auxiliary actions.
- Hover is a non-destructive inspection mechanism (unified dependency-hover highlighting when enabled).
- Point snapping assists selection without introducing implicit geometry.

### Delete Operations

**Description**: Delete selected elements via Delete or Backspace key.

**Behavior**:
- Deletes all currently selected elements
- Automatically includes dependent elements (cascade deletion)
- Uses DependencyService to compute transitive closure of dependencies
- Operation is atomic (all elements deleted together or none)
- Fully undoable via Ctrl+Z (restores all deleted elements)
- Cannot delete fundamental elements (P_H, P_V, HL_HV)

**Cascade Deletion Logic**:
1. User selects element(s) to delete
2. System computes all dependent elements using DependencyService
3. Visual feedback highlights dependent elements in different color
4. User presses Delete/Backspace
5. DeleteElementsCommand executes atomically:
   - Removes all selected elements
   - Removes all dependent elements
   - Stores state for undo
6. Status bar shows: "X elements deleted (Y dependencies)"

**Example**: Deleting a point that defines a line:
- User selects point P1
- System highlights line L1 (depends on P1) in cascade preview
- User presses Delete
- Both P1 and L1 are deleted atomically
- Ctrl+Z restores both P1 and L1

**Architecture**: All delete operations must go through CommandStack via DeleteElementsCommand. Direct World manipulation (e.g., `world.removePoint2D()`) is forbidden to ensure undo capability and dependency integrity.

**Note**: This is part of the broader architectural principle that ALL application state modifications (geometric, view, settings) should go through the CommandStack for consistent undo/redo behavior and state management.

### Naming Conventions (Visible in UI)

The application uses consistent naming to support learning:

- 2D elements use lowercase identifiers (e.g., `a`, `b`).
- 3D elements use uppercase identifiers (e.g., `A`, `B`).
- Projections use suffixes that indicate the plane (e.g., `A_H`, `A_V`).
- `P` and `HL` prefixes are reserved for projection planes and hinge lines.

---

## File Operations

### Project Creation and Naming

**Default Naming Convention**:
- When users click "New Project" or press Ctrl+N, a new project is created immediately with an auto-generated name.
- The system automatically generates names following the pattern "untitled N", where N finds the first available number (filling gaps).
- The system scans existing projects in the user's Google Drive to find the next available number.
- Examples: If "untitled 1" and "untitled 3" exist, creates "untitled 2" (fills gap before incrementing)

**Purpose**:
- Zero-friction project creation - no dialog needed
- Users can start working immediately
- Projects can be renamed later via double-click or Ctrl+R
- Provides consistent naming convention across projects
- Avoids duplicate names even when Google Drive allows them

**User Workflow**:
1. User clicks "New Project" button or presses Ctrl+N
2. System queries Google Drive for existing "untitled N" files
3. System finds first available N (checking gaps: 1, 2, 3...) or uses next sequential if no gaps
4. Project is created immediately with auto-generated name
5. User can start drawing right away
6. User can rename project anytime by double-clicking the name in the header

### Project Name Display and Editing

**Location**: Top-left corner of application header (always visible)

**Display**:
- Shows current project name prominently
- Uses larger font than other header elements
- Clickable/editable indicator (subtle underline or icon on hover)

**In-Place Editing**:
- **Trigger**: Double-click the project name
- **UI Behavior**:
  - Project name becomes editable (inline input or contenteditable)
  - Current name is pre-selected for easy replacement
  - Save button appears (or just use Enter key)
  - Cancel button appears (or just use Escape key)
- **Validation**:
  - Name cannot be empty
  - Name length limit: 1-100 characters
  - Special characters allowed: spaces, hyphens, underscores, parentheses
  - No file system reserved characters: / \ : * ? " < > |
- **Saving**:
  - Press Enter or click Save → updates Google Drive file name
  - Shows brief "Saving..." indicator
  - Confirms success or shows error
  - Updates app header immediately
- **Canceling**:
  - Press Escape or click Cancel → reverts to original name
  - No Google Drive operation performed

**Design Rationale**:
- No separate rename dialog needed - immediate, contextual editing
- Project name always visible - user knows what they're working on
- Quick, low-friction renaming - encourages good organization

### Toolbar Buttons

**Location**: Top toolbar (alongside other tool buttons)

**Available Buttons**:

1. **New** (Ctrl+N)
   - Icon: "New document" or "+" symbol
   - Creates new empty project immediately
   - Auto-generates name: "untitled 1", "untitled 2", etc.
   - Scans existing projects to find next available number
   - Does not show dialog - creates project directly
   - Tooltip: "New Project (Ctrl+N)"

2. **Open** (Ctrl+O)
   - Icon: "Folder" or "Open" symbol
   - Shows file picker dialog with Google Drive files
   - Displays project name, last modified date, recent files
   - Save current project before opening (if unsaved changes)
   - Tooltip: "Open Project (Ctrl+O)"

**Additional Operations** (via project name):

3. **Rename** (Ctrl+R)
   - No button - triggered by double-clicking project name or Ctrl+R
   - Focuses name display in edit mode

### Google Drive Integration Details

**File Storage**:
- All projects stored in "diedrico" folder in user's Google Drive
- Files use `.diedrico.json` extension (MIME type: `application/json`)
- File names are user-visible project names

**Operations**:
- **Create**: `files.create` with metadata + content
- **Read**: `files.get` with `alt=media`
- **Update**: `files.update` with new content (preserves file ID)
- **Rename**: `files.update` with new name in metadata only
- **Delete**: `files.update` with `trashed: true` (soft delete)
- **List**: `files.list` with query `'diedrico' in parents and trashed = false`

**Caching**:
- File list cached for 5 minutes (reduces API calls)
- Invalidate cache after create/rename/delete operations
- Recent files list cached separately

**Error Handling**:
- Network errors: Show "Unable to connect" message, allow retry
- Permission errors: Show "Access denied" message
- Quota exceeded: Show "Storage full" message with upgrade link
- All errors logged to console for debugging

---

## User Interface (Detailed)

**For comprehensive UI architecture, layout, interaction patterns, and component specifications, see [ui-spec.md](ui-spec.md).**

This section describes user-visible components and behaviors at a functional level, focusing on what tools do and how they fulfill learning objectives. For detailed interaction flows, cursor feedback, panel structures, and visual design, refer to ui-spec.md.

### Overall Layout

**UI Details**: For complete layout architecture with ASCII diagrams, component positioning, responsive behavior, and visual hierarchy, see:\n- [ui-spec.md - Overall Layout Architecture](ui-spec.md#overall-layout-architecture)
- [ui-spec.md - Layout Principles](ui-spec.md#layout-principles)

The interface is organized into four main areas:

1. **Top toolbars** (primary controls)
2. **Central 2D drawing area** (primary workspace)
3. **Auxiliary 3D view overlay** (read-only, for spatial understanding)
4. **Left-side stacked panels** (actions, elements)

The application is designed for mouse + keyboard use.

### Central 2D Drawing Area

**Also called**: Main Viewport in ui-spec.md

The 2D view is the main work area where all constructive operations are performed.

- **All projection planes are displayed simultaneously** in a dihedral layout (e.g., P_H and P_V arranged around their shared hinge line HL_HV).
- All elements on all planes are visible at all times, creating a complete multi-plane dihedral drawing.
- Exactly one plane is the **active plane** at all times (determines where new elements are created).
- Elements on the active plane are rendered at full intensity/opacity.
- Elements on non-active planes are de-emphasized (reduced opacity, softer colors) but remain fully visible and interactive.
- Hinge lines between planes are always visible.

**Measurable Background Grid**:

- The 2D view includes an optional **background grid** that can be toggled on/off.
- When enabled, the grid provides a measurable reference:
  - Regular grid spacing (e.g., 10, 20, or 50 units depending on zoom level).
  - Grid lines are visually subtle (light gray or similar) to avoid interfering with geometry.
  - Major grid lines (e.g., every 5 or 10 intervals) may be slightly emphasized.
  - Grid labels or tick marks may display coordinate values at regular intervals.
- The grid serves as a **visual reference only** and does not affect geometric constructions or snapping behavior.
- Grid visibility preference is saved with the project.

**Navigation (always available)**:

- Pan: `Shift` + left-drag.
- Zoom: mouse wheel.

Navigation:
- does not cancel the active tool operation,
- does not modify geometry.

**2D element interaction**:

- Elements can be selected by click.
- Selection may be single or multiple depending on the active tool.
- When dependency-hover mode is enabled, hovering an element can activate dependency highlighting.

### Auxiliary 3D View Overlay

**UI Details**: For complete 3D view specifications including positioning, resizing, movement, controls, camera settings, display options, and visual styling, see:
- [ui-spec.md - 3D View Overlay](ui-spec.md#3d-view-overlay)
- [ui-spec.md - Positioning and Layout](ui-spec.md#positioning-and-layout)
- [ui-spec.md - Resizing and Movement](ui-spec.md#resizing-and-movement)
- [ui-spec.md - 3D View Controls](ui-spec.md#3d-view-controls)
- [ui-spec.md - Display Options](ui-spec.md#display-options)

The 3D view is a read-only overlay providing spatial understanding.

**Purpose**: Exclusively visual; helps learners understand 3D spatial relationships.

**Interaction**:
- Allowed: rotate (drag), pan (`Shift` + drag), zoom (mouse wheel)
- Not allowed: select elements for editing; create or modify geometry

**Display Options** (toggles within 3D overlay controls):
- Show 2D constructive elements on projection planes in 3D view
- Show linking visuals between 3D elements and their 2D projections (dashed connectors)
- Manage projection plane visibility and associated elements

### Top Toolbars

The top toolbars contain the primary user controls, grouped by operation type.

**For detailed toolbar interaction patterns, sequential flows, cursor feedback, and visual design, see [ui-spec.md](ui-spec.md#top-toolbar-system).**

#### Toolbar Interaction Model (Summary)

The toolbars follow a structured interaction model designed to make geometric reasoning explicit:

**Core Principles**:
- **Single active tool**: Exactly one tool is active at any time, determining how clicks are interpreted
- **Tool families**: Tools grouped into functional families with sub-tool variants
- **Sequential flow**: Each tool defines explicit steps that must be completed in order
- **Valid input restriction**: Only elements valid for the current step can be selected
- **Continuous feedback**: Constant visual feedback via highlighting, snapping, previews, and cursor changes
- **Explicit results**: All constructions explicitly recorded as traceable actions
- **Navigation separation**: Pan/zoom available at any time without canceling active tool
- **No hidden inferences**: Every entity used as input must exist explicitly

**Constructive Interaction Constraints**:
- Tools do not accept arbitrary point-on-element input unless that point exists explicitly
- **Automatic auxiliary actions** (recorded as nested actions):
  - **Intersection points**: Clicking on visible intersection auto-creates intersection point
  - **Free points**: Clicking empty space (when tool expects point) auto-creates free point
- **Point snapping**: Cursor snaps to existing points and intersections within snap radius
- Visual aids (highlighting, snapping, intersection markers, cursor changes) guide user choices

**Pedagogical Objective**: Make geometric reasoning explicit, avoid ambiguities, reinforce action-result relationships, enable mental reconstruction of the construction process.

#### Active Plane Selector

**UI Details**: For dropdown design, plane list display, visual emphasis animations, color schemes, and toolbar positioning, see:
- [ui-spec.md - Top Toolbar System](ui-spec.md#top-toolbar-system)
- [ui-spec.md - Active Plane System](ui-spec.md#active-plane-system)

- Dropdown showing available planes (e.g., P_H, P_V, auxiliary planes)
- Click a plane to make it the active plane
- **All planes remain visible** regardless of which is active

**Behavior**:
- Changing active plane does not hide/show planes or modify geometry
- Only affects where new 2D elements are created
- Updates visual emphasis (active plane full intensity, others de-emphasized)
- Hinge lines always visible regardless of active plane

**Classification**: Active plane selection is **ViewState** (presentation state). Switching the active plane is **not** a constructive action, is **not** recorded in the ProcessTree, and is **not** part of undo/redo.

#### Navigation Toolbar

Provides explicit navigation controls (complementary to the always-available shortcuts):

- pan,
- optional “fit/reset view”.

#### 2D Drawing Toolbar (Primitives + Explicit Variants)

**UI Details**: For toolbar organization, tool family dropdowns, sequential interaction flow, cursor feedback during tool use, and visual styling, see:
- [ui-spec.md - Top Toolbar System](ui-spec.md#top-toolbar-system)
- [ui-spec.md - Toolbar Interaction Model](ui-spec.md#toolbar-interaction-model)
- [ui-spec.md - Viewport Interaction Modes](ui-spec.md#viewport-interaction-modes)

Contains tools for creating 2D primitives on the active plane. Tools may expose explicit variants (e.g., via a dropdown), and variants are never automatic: the user deliberately chooses the intended construction.

**Point** tool family:

- **Free point**:
  - **Description**: Creates a point at an arbitrary location on the active plane.
  - **Steps**: 
    1. Activate the free point tool.
    2. Click at the desired location in the 2D view.
  - **Result**: A new point entity is created at the clicked coordinates on the active plane.

- **Intersection point**:
  - **Description**: Creates a point at the intersection of two elements.
  - **Steps**:
    1. Activate the intersection point tool.
    2. Select the first element.
    3. Select the second element.
  - **Result**: A new point entity is created at the intersection. If multiple intersections exist, the system may prompt for selection or create all intersection points.
  - **Sibling Intersections with Hinge Lines**: When one of the intersecting elements is a hinge line (HL or BHL projection), the system automatically creates **both** intersection points:
    - The **primary intersection** on the active plane (explicitly created by the user).
    - The **sibling intersection** on the paired plane (automatically created to show the complete 3D relationship).
    - Both points represent the same 3D position projected onto their respective planes.
    - Both points are visible and update together, maintaining geometric consistency.
    - Deletion: Deleting the primary intersection automatically removes the sibling (dependency relationship).
  - **Infeasibility**: If the elements do not intersect, the construction is invalid and blocked at creation time.

**Segment** tool family:

- **Segment by two points (new points)**:
  - **Description**: Creates a segment by specifying two point locations.
  - **Steps**:
    1. Activate the segment-by-two-points tool.
    2. Click to specify the first endpoint:
       - Click on an existing point to use it.
       - Click on an intersection to automatically create an intersection point (recorded as auxiliary action).
       - Click on empty space to automatically create a free point (recorded as auxiliary action).
    3. Click to specify the second endpoint (same options as step 2).
  - **Result**: A segment entity connecting the two points is created as the main action. Any automatically created points are recorded as auxiliary actions nested within the main segment creation action.
  - **Action history**: In the Constructive Actions Panel, this appears as one main action ("Create segment") with nested auxiliary actions for any automatically created points ("Create free point" or "Create intersection point").

- **Segment between existing points**:
  - **Description**: Creates a segment connecting two points.
  - **Steps**:
    1. Activate the segment-between-points tool.
    2. Specify the first point (click on existing point, intersection, or empty space).
    3. Specify the second point (click on existing point, intersection, or empty space).
  - **Result**: A new segment entity is created connecting the two points. Any automatically created points are recorded as auxiliary actions nested within the main action.
  - **Dependency**: The segment updates if either endpoint moves.
  - **Note**: This tool is functionally similar to "Segment by two points" but may have a different UI affordance (e.g., expecting users to select existing geometry vs. freely placing points).

**Line** tool family:

- **Line by two points**:
  - **Description**: Creates an infinite line passing through two points.
  - **Steps**:
    1. Activate the line-by-two-points tool.
    2. Specify the first point (click on existing point, intersection, or empty space).
    3. Specify the second point (click on existing point, intersection, or empty space).
  - **Result**: A new infinite line entity is created passing through both points. Any automatically created points are recorded as auxiliary actions.
  - **Dependency**: The line orientation updates if either defining point moves.
  - **Infeasibility**: If both points coincide, the construction is invalid.

- **Parallel line through point**:
  - **Description**: Creates a line passing through a point and parallel to an existing line.
  - **Steps**:
    1. Activate the parallel-line tool.
    2. Select the reference line.
    3. Specify the point (click on existing point, intersection, or empty space).
  - **Result**: A new line entity is created parallel to the reference line and passing through the specified point. Any automatically created point is recorded as an auxiliary action.
  - **Dependency**: The new line remains parallel to the reference line and updates if the reference line or the point moves.

- **Perpendicular line through point**:
  - **Description**: Creates a line passing through a point and perpendicular to an existing line.
  - **Steps**:
    1. Activate the perpendicular-line tool.
    2. Select the reference line.
    3. Specify the point (click on existing point, intersection, or empty space).
  - **Result**: A new line entity is created perpendicular to the reference line and passing through the specified point. Any automatically created point is recorded as an auxiliary action.
  - **Dependency**: The new line remains perpendicular to the reference line and updates if the reference line or the point moves.

- **Line tangent to circle through point**:
  - **Description**: Creates a line tangent to a circle and passing through an external point.
  - **Geometric Principle**: For a point outside a circle, there exist exactly two tangent lines that touch the circle. The system automatically determines which tangent line to create based on the mouse click position relative to the circle's radius vector angle, using the same indexing convention as circle intersections (see §Intersection Point Indexing on Circles in data-model.md).
  - **Steps**:
    1. Activate the tangent-line-through-point tool.
    2. Select the circle.
    3. Specify the point (click on existing point, intersection, or empty space). The mouse position at this click determines which of the two tangent lines is created.
  - **Result**: A new line entity is created that is tangent to the circle and passes through the specified point. Any automatically created point is recorded as an auxiliary action.
  - **Dependency**: The tangent line updates when either the circle or the point moves, maintaining tangency and passing through the point.
  - **Infeasibility**: If the point is inside the circle or exactly on the circle, the construction is invalid and blocked at creation time.
  - **Index Determination**: The tool computes both tangent contact points on the circle, calculates their angles relative to the circle's radius vector (using the same algorithm as `sortPointsByAngleFromRadiusVector()`), then determines which tangent point's angle is closer to the mouse click position angle. Index 0 = smaller relative angle from radius vector; Index 1 = larger relative angle (counterclockwise).

- **Line tangent to circle parallel to reference line**:
  - **Description**: Creates a line tangent to a circle and parallel to an existing reference line.
  - **Geometric Principle**: For a circle and an external line, there exist two tangent lines parallel to the reference line (one on each side of the circle). The system automatically determines which tangent line to create based on the mouse click position (when selecting the reference line) relative to the circle's radius vector angle, using the same indexing convention as circle intersections (see §Intersection Point Indexing on Circles in data-model.md).
  - **Steps**:
    1. Activate the tangent-line-parallel tool.
    2. Select the circle.
    3. Select the reference line. The mouse position at this click determines which of the two tangent lines is created.
  - **Result**: A new line entity is created that is tangent to the circle and parallel to the reference line. No auxiliary points are created (line is fully determined by circle and reference direction).
  - **Dependency**: The tangent line updates when either the circle or the reference line moves, maintaining tangency and parallelism.
  - **Infeasibility**: If the reference line intersects the circle (secant case) or is tangent to the circle, the construction is invalid and blocked at creation time.
  - **Index Determination**: The tool computes both tangent contact points on the circle, calculates their angles relative to the circle's radius vector (using the same algorithm as `sortPointsByAngleFromRadiusVector()`), then determines which tangent point's angle is closer to the mouse click position angle. Index 0 = smaller relative angle from radius vector; Index 1 = larger relative angle (counterclockwise).

**Circle** tool family:

**Geometric Principle**: In Diedrico geometry, circles are primarily defined by **two points**: a center point and a radius point on the circumference. The vector from center to radius point serves dual purpose: (1) its magnitude defines the circle radius, and (2) its direction defines angle zero for consistent intersection point indexing.

- **Circle by center and point** (PRIMARY METHOD):
  - **Description**: Creates a circle defined by its center and a point on the circumference. This is the standard circle construction method.
  - **Steps**:
    1. Activate the circle-center-point tool.
    2. Specify the center point (click on existing point, intersection, or empty space).
    3. Specify a point on the circumference (click on existing point, intersection, or empty space).
  - **Result**: A new circle entity is created with the specified center and radius (distance from center to the second point). Any automatically created points are recorded as auxiliary actions.
  - **Radius Vector**: The vector from center to the circumference point defines angle zero for intersection indexing. This ensures deterministic behavior when intersections are computed parametrically.
  - **Dependency**: The circle updates if the center or the circumference point moves.

- **Circle by center and radius** (SPECIAL CASE):
  - **Description**: Creates a circle with a specified center and a numeric radius value. This is a special case construction useful for specific geometric parameters.
  - **Limitation**: This construction does NOT provide an angular reference for intersection indexing. For general use, prefer "Circle by center and point".
  - **Steps**:
    1. Activate the circle-center-radius tool.
    2. Specify the center point (click on existing point, intersection, or empty space).
    3. Enter the radius value (numeric input).
  - **Result**: A new circle entity is created with the specified center and radius. Any automatically created center point is recorded as an auxiliary action.
  - **Parameters**: The radius is a geometric parameter that can be edited later.
  - **Dependency**: The circle updates if the center moves or if the radius parameter is changed.
  - **Infeasibility**: If the radius value is zero or negative, the construction is invalid.

- **Circle by three points**:
  - **Description**: Creates a circle passing through three non-collinear points.
  - **Steps**:
    1. Activate the circle-three-points tool.
    2. Specify the first point (click on existing point, intersection, or empty space).
    3. Specify the second point (click on existing point, intersection, or empty space).
    4. Specify the third point (click on existing point, intersection, or empty space).
  - **Result**: A new circle entity is created passing through all three points. Any automatically created points are recorded as auxiliary actions.
  - **Dependency**: The circle updates if any of the defining points moves.
  - **Infeasibility**: If the three points are collinear, the construction is invalid and blocked at creation time.

**Arc** tool family (optional):

- **Arc by center and two points**:
  - **Description**: Creates a circular arc with a specified center, start point, and end point.
  - **Steps**:
    1. Activate the arc-center-two-points tool.
    2. Specify the center point (click on existing point, intersection, or empty space).
    3. Specify the start point (click on existing point, intersection, or empty space).
    4. Specify the end point (click on existing point, intersection, or empty space).
  - **Result**: A new arc entity is created as a circular sector from the start point to the end point, centered at the specified center. Any automatically created points are recorded as auxiliary actions.
  - **Convention**: The arc direction (clockwise/counterclockwise) may be determined by the order of point selection or by a visual preview.
  - **Dependency**: The arc updates if the center or either endpoint moves.

- **Arc by center, start point, and angle**:
  - **Description**: Creates a circular arc with a specified center, start point, and angular extent.
  - **Steps**:
    1. Activate the arc-center-point-angle tool.
    2. Specify the center point (click on existing point, intersection, or empty space).
    3. Specify the start point (click on existing point, intersection, or empty space).
    4. Enter the angular extent (numeric input, e.g., degrees).
  - **Result**: A new arc entity is created with the specified center, radius (distance to start point), and angular extent. Any automatically created points are recorded as auxiliary actions.
  - **Parameters**: The angle is a geometric parameter that can be edited later.
  - **Dependency**: The arc updates if the center or start point moves, or if the angle parameter is changed.

- **Arc by three points**:
  - **Description**: Creates a circular arc passing through three points in order.
  - **Steps**:
    1. Activate the arc-three-points tool.
    2. Specify the first point (start) - click on existing point, intersection, or empty space.
    3. Specify the second point (intermediate, on the arc) - click on existing point, intersection, or empty space.
    4. Specify the third point (end) - click on existing point, intersection, or empty space.
  - **Result**: A new arc entity is created passing through all three points in the given order. Any automatically created points are recorded as auxiliary actions.
  - **Dependency**: The arc updates if any of the defining points moves.
  - **Infeasibility**: If the three points are collinear, the construction is invalid and blocked at creation time.

#### Guides and Transport Toolbar (Dihedral Tools)

**UI Details**: For toolbar layout, tool activation, sequential steps with visual feedback, and cursor states, see:
- [ui-spec.md - Top Toolbar System](ui-spec.md#top-toolbar-system)
- [ui-spec.md - Toolbar Interaction Model](ui-spec.md#toolbar-interaction-model)

Contains dihedral-specific tools related to hinge lines (HL), guides, and transport operations between projection planes.

**Guide** tool:

- **Create guide from HL/BHL and point**:
  - **Description**: Creates a guide line perpendicular to a hinge line (HL) or BHL projection, passing through a point on the active plane.
  - **Steps**:
    1. Activate the create-guide tool.
    2. Select a hinge line (HL) or BHL projection (any line element).
    3. Specify a point on the active plane (click on existing point, intersection, or empty space).
  - **Result**: A new guide entity is created that:
    - is perpendicular to the selected HL/BHL,
    - passes through the specified point,
    - belongs to both projection planes associated with the HL/BHL.
  - **Special case for BHLs**: When created from a BHL projection, the guide is **automatically transported** to appear on both planes where the BHL exists. This happens immediately upon guide creation.
  - Any automatically created point is recorded as an auxiliary action.
  - **Purpose**: Guides enable explicit transport of geometric information between planes.
  - **Dependency**: The guide updates if the HL/BHL or the defining point moves.

**Transport** tool family:

- **Transport point via guide**:
  - **Description**: Transports a point from one projection plane to another along an existing guide.
  - **Steps**:
    1. Activate the transport-point tool.
    2. Select the guide to use for transport.
    3. Select the point to transport (on one of the planes associated with the guide).
  - **Result**: A new point entity is created on the other plane, positioned such that it lies on the guide at the correct transported location.
  - **Dependency**: The transported point updates if the source point or the guide moves.
  - **Purpose**: Makes explicit the classical dihedral operation of transporting points between views.

- **Transport distance**:
  - **Description**: Transports a distance (defined by two points or a segment) from one plane to another using guides.
  - **Steps**:
    1. Activate the transport-distance tool.
    2. Select the first guide.
    3. Select the distance to transport (two points or a segment on the source plane).
    4. Select the destination reference point or guide.
  - **Result**: The distance is replicated on the target plane as explicit derived geometry.
  - **Purpose**: Enables explicit measurement transfer between projection planes.
  - **Dependency**: The transported distance updates if the source distance or guides change.

**Note**: Since guides automatically transport across BHL projections (appearing on both planes simultaneously), complex multi-plane transports are achieved by creating guides perpendicular to the relevant BHL projections.

These tools operate on 2D planes, HL, guides, and explicit 2D entities; they do not directly edit 3D geometry.

#### 3D Creation Toolbar (Derived from 2D)

**UI Details**: For toolbar structure, tool interaction patterns, error feedback for invalid 3D selections, and visual indicators, see:
- [ui-spec.md - Top Toolbar System](ui-spec.md#top-toolbar-system)
- [ui-spec.md - Toolbar Interaction Model](ui-spec.md#toolbar-interaction-model)

Contains tools to define 3D elements from existing 2D constructions. All operations require explicit selection of the required compatible projections/traces. These tools produce derived 3D geometry for spatial visualization; the 2D projections remain the source of truth.

**3D Point** tool:

- **Create 3D point from projections**:
  - **Description**: Defines a 3D point from two compatible 2D point projections on different planes.
  - **Steps**:
    1. Activate the 3D-point tool.
    2. Select a point on the first projection plane (e.g., `a_H` on `P_H`).
    3. Select the corresponding point on the second projection plane (e.g., `a_V` on `P_V`).
  - **Result**: A new 3D point entity is created with ID format `point3d_N` (e.g., `point3d_45`), label equals ID, and visualized in the 3D overlay.
  - **Validation Requirements**:
    - **MANDATORY**: The two selected points MUST be on different projection planes (same-plane selection is invalid)
    - **Geometric compatibility**: Points must be compatible according to dihedral projection rules (aligned perpendicular to hinge line)
  - **Visual Style**: Initially rendered wider/thicker than 2D elements (configurable in future)
  - **Infeasibility**: If projections are on same plane or geometrically incompatible, no 3D point is created, immediate non-modal feedback is provided, and no action entry is added to history.
  - **Dependency**: The 3D point updates if either 2D projection moves.
  - **No auto-projection**: System does NOT automatically create projections on other planes.

**3D Line** tool:

- **Create 3D line from projections**:
  - **Description**: Defines a 3D line from two compatible 2D line projections on different planes.
  - **Steps**:
    1. Activate the 3D-line tool.
    2. Select a 2D line on the first projection plane.
    3. Select the corresponding 2D line on the second projection plane.
  - **Result**: A new 3D line entity is created with ID format `line3d_N` (e.g., `line3d_12`), label equals ID, and visualized in the 3D overlay.
  - **Validation Requirements**:
    - **MANDATORY**: The two selected lines MUST be on different projection planes
    - **Geometric compatibility**: Lines must represent projections of the same 3D line according to dihedral rules
  - **Visual Style**: Initially rendered wider/thicker than 2D elements (configurable in future)
  - **Infeasibility**: If projections are on same plane or geometrically incompatible, no 3D line is created and feedback is provided.
  - **Dependency**: The 3D line updates if either 2D projection changes.
  - **No auto-projection**: System does NOT automatically create projections on other planes.

**3D Segment** tool:

- **Create 3D segment from projections**:
  - **Description**: Defines a 3D segment from two compatible 2D segment projections with corresponding endpoints.
  - **Steps**:
    1. Activate the 3D-segment tool.
    2. Select a 2D segment on the first projection plane.
    3. Select the corresponding 2D segment on the second projection plane.
  - **Result**: A new 3D segment entity is created with ID format `segment3d_N` (e.g., `segment3d_7`), label equals ID, and visualized in the 3D overlay.
  - **Validation Requirements**:
    - **MANDATORY**: The two selected segments MUST be on different projection planes
    - **Geometric compatibility**: Segments must represent projections of the same 3D segment
    - **Endpoint correspondence**: Endpoints must map consistently between projections
  - **Visual Style**: Initially rendered wider/thicker than 2D elements (configurable in future)
  - **Infeasibility**: If segments are on same plane, geometrically incompatible, or endpoints do not correspond, no 3D segment is created and feedback is provided.
  - **Dependency**: The 3D segment updates if either 2D projection changes.
  - **No auto-projection**: System does NOT automatically create projections on other planes.

**3D Plane** tool:

- **Create 3D plane from traces**:
  - **Description**: Defines a 3D plane from its traces (intersection lines) on two projection planes.
  - **Steps**:
    1. Activate the 3D-plane tool.
    2. Select the trace on the first projection plane (e.g., the horizontal trace).
    3. Select the trace on the second projection plane (e.g., the vertical trace).
  - **Result**: A new 3D plane entity is created with ID format `plane3d_N` (e.g., `plane3d_3`), label equals ID, and visualized in the 3D overlay as a bounded or semi-infinite surface.
  - **Validation Requirements**:
    - **MANDATORY**: The two selected traces MUST be on different projection planes
    - **Geometric compatibility**: Traces must be compatible according to dihedral projection rules (typically intersecting at hinge line)
  - **Visual Style**: Initially rendered wider/thicker than 2D elements (configurable in future)
  - **Infeasibility**: If traces are on same plane or incompatible, no 3D plane is created and feedback is provided.
  - **Dependency**: The 3D plane updates if either trace changes.
  - **No auto-projection**: System does NOT automatically create projections on other planes.

**General behavior for invalid 3D creation**:

If the selection does not define a valid 3D element:

- no element is created,
- the user receives immediate non-modal feedback (visual indicators, status message),
- the infeasibility is reflected visually in the panels (no modal error dialogs),
- no action entry is added to history (the invalid attempt is blocked and ignored).

### Left-Side Stacked Panels

**For detailed panel architecture, tree structures, interaction patterns, and visual design, see [ui-spec.md](ui-spec.md#left-panel-stack).**

All panels are located on the left side and are stackable and collapsible.

#### Constructive Actions Panel (Process Tree)

**Also called**: Process Tree Panel in ui-spec.md

**UI Details**: For complete panel architecture, tree structure with visual examples, node types (Subprocess/ActionGroup/Action), visibility controls, collapse/expand behavior, styling (gear icons, boxes, colors), and interaction patterns, see:
- [ui-spec.md - Process Tree Panel (Constructive Actions)](ui-spec.md#process-tree-panel-constructive-actions)
- [ui-spec.md - Panel Management](ui-spec.md#panel-management)
- [ui-spec.md - Tree Structure](ui-spec.md#tree-structure-1) (in Process Tree Panel section)
- [ui-spec.md - Node Types](ui-spec.md#node-types) (detailed Subprocess/ActionGroup/Action descriptions)
- [ui-spec.md - Visual Treatment](ui-spec.md#visual-treatment) (gear icons, boxes, color schemes)
- [ui-spec.md - Interactions](ui-spec.md#interactions-1) (in Process Tree Panel section)

Shows the history of performed actions, organized hierarchically:

- **Subprocesses**: Named containers for logically grouped actions, with visibility toggle (👁 eye icon)
- **ActionGroups**: Visual containers for auxiliary actions (auto-created points during construction)
  - No visibility toggle (inherit from parent subprocess)
  - Special visual treatment (gear icon ⚙, lighter styling, boxed layout)
  - Collapsible to show/hide auxiliary actions
  - Properties locked (no user editing)
- **Actions**: Individual construction operations

**Two types of visibility**:
1. **Drawing visibility**: Whether geometric elements appear in viewport (controlled by eye icon on subprocesses)
2. **Panel visibility**: Whether content is shown/hidden in action list (controlled by collapse/expand for both subprocesses and ActionGroups)

**Interaction**:
- Hover triggers unified dependency highlighting
- Auxiliary actions can be inspected individually
- Visual distinction between primary and auxiliary actions

#### Elements Panel

**UI Details**: For complete panel structure, tree hierarchy, grouping by planes, collapse/expand behavior, icons, styling, and interaction patterns, see:
- [ui-spec.md - World Elements Panel](ui-spec.md#world-elements-panel-geometric-entities)
- [ui-spec.md - Panel Management](ui-spec.md#panel-management)
- [ui-spec.md - Tree Structure](ui-spec.md#tree-structure) (in World Elements Panel section)
- [ui-spec.md - Interactions](ui-spec.md#interactions) (in World Elements Panel section)

Lists items in two main sections:

- **2D Elements**: Constructed 2D elements, grouped by projection plane and element type
  - Points, segments, lines, circles, guides
  - Grouped under their projection plane (P_H, P_V, etc.)
- **3D Elements**: Derived 3D elements, grouped by type
  - Points, lines, segments, planes
  - Includes projection planes (P_H, P_V, auxiliary planes)

**Interaction**:
- Hover triggers unified dependency highlighting
- Hovering a plane highlights its representation in both 2D and 3D views
- Click element to open properties dialog

### Dialogs and Controls

**UI Details**: For complete dialog specifications including layouts, field designs, button placements, modal behavior, keyboard shortcuts, and visual styling, see:
- [ui-spec.md - Dialogs and Modals](ui-spec.md#dialogs-and-modals)
- [ui-spec.md - Element Properties Dialog](ui-spec.md#element-properties-dialog)
- [ui-spec.md - Subprocess Properties Dialog](ui-spec.md#subprocess-properties-dialog)
- [ui-spec.md - Project Settings Dialog](ui-spec.md#project-settings-dialog)

#### Element Properties Dialog

Opened by clicking an element in the elements panel.

Allows changing visual style without changing geometry:

- color,
- line width,
- line style,
- visibility,
- reset visual inheritance.

Default and inheritance behavior:

- Style properties are **unset by default**.
- When unset, the effective style is inherited from the construction subprocess that contains the element.
- Setting a property on an element creates an explicit override.
- The dialog supports resetting overrides back to the inherited defaults.

### Visual Highlighting and Feedback

**UI Details**: For comprehensive specifications of cursor states, hover highlighting patterns, snap indicators, infeasibility markers, color schemes, animation timing, and all visual feedback mechanisms, see:
- [ui-spec.md - Viewport Interaction Modes](ui-spec.md#viewport-interaction-modes) (cursor feedback reference table)
- [ui-spec.md - Continuous Visual Feedback](ui-spec.md#continuous-visual-feedback) (in Toolbar Interaction Model)
- [ui-spec.md - Status and Feedback Overlays](ui-spec.md#status-and-feedback-overlays)
- [ui-spec.md - Unified Hover Highlighting](ui-spec.md#unified-hover-highlighting) (in World Elements Panel)
- [ui-spec.md - Visual Design Guidelines](ui-spec.md#visual-design-guidelines) (color palette, highlighting colors)

The UI uses visual cues to communicate structure and validity:

- focus element,
- direct ancestors,
- direct descendants,
- infeasible elements,
- dependencies of infeasible elements.

When hover highlighting is active, it is:

- immediate,
- temporary,
- non-destructive (does not change selection).

### Error Handling (Non-Modal)

**UI Details**: For specific error message formats, infeasibility indicators in panels and viewport, status bar messaging, tooltip content, and visual styling of invalid states, see:
- [ui-spec.md - Error Handling](ui-spec.md#error-handling) (in Keyboard Shortcuts section)
- [ui-spec.md - Status and Feedback Overlays](ui-spec.md#status-and-feedback-overlays)
- [ui-spec.md - Infeasibility Indicators](ui-spec.md#infeasibility-indicators) (in Status and Feedback Overlays)

- No modal error dialogs.
- Invalid/infeasible actions are reflected visually in panels and highlighting.
- The user corrects geometry directly by adjusting inputs.

### Accessibility and Usability Expectations

**UI Details**: For complete specifications of responsive behavior, minimum window sizes, panel collapse patterns, keyboard navigation, cursor conventions, tooltip design, and accessibility features, see:
- [ui-spec.md - Responsive Design Considerations](ui-spec.md#responsive-design-considerations)
- [ui-spec.md - Keyboard Shortcuts](ui-spec.md#keyboard-shortcuts)
- [ui-spec.md - Mouse/Cursor Conventions](ui-spec.md#mousecursor-conventions)
- [ui-spec.md - Tooltips](ui-spec.md#tooltips)
- [ui-spec.md - State Persistence](ui-spec.md#state-persistence)

- Clear iconography.
- Continuous visual feedback.
- Consistent interactions across panels.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Create a New Drawing or Open an Existing One (Priority: P1)

As a learner, I want to start a new drawing and reopen a previously saved drawing so that I can practice exercises over time and continue where I left off.

**Why this priority**: Without reliable project lifecycle (new/open/save), the app cannot support real learning workflows.

**Independent Test**: Can be tested by creating a new drawing, adding a few elements, saving, reopening, and verifying the same planes/elements/actions and view settings are restored.

**Acceptance Scenarios**:

1. **Given** the application is launched, **When** I sign in with Google, **Then** I see a startup dialog offering "Create New Project" or "Open Existing Project".
2. **Given** I choose "Create New Project" and enter a name, **When** the project is created, **Then** I get a clean workspace with at least two default projection planes and their hinge line, one plane is clearly marked as active, and the project is saved to my Google Drive "diedrico" folder.
3. **Given** I choose "Open Existing Project", **When** I select a project from the list, **Then** the workspace restores its planes, elements, action history, dependency relationships, and view settings from my Google Drive.
4. **Given** I make changes to a drawing, **When** the changes occur, **Then** the system persists them automatically to Google Drive without requiring an explicit save action (debounced 2 seconds after last change).

---

### User Story 2 - Build a 2D Dihedral Construction (Priority: P1)

As a learner, I want to create explicit 2D geometric constructions on a selected projection plane so that I can understand the step-by-step reasoning of dihedral drawing.

**Why this priority**: This is the minimal learning loop: create explicit primitives and see a construction evolve. Without this, the application has no educational value.

**Independent Test**: Can be tested by creating points/segments/lines/circles on the active plane, then modifying a base element and verifying dependent elements update or become infeasible.

**Acceptance Scenarios**:

1. **Given** an empty project, **When** I select an active projection plane and create two points then a segment between them, **Then** the points and segment appear on that plane and the creation is recorded as a constructive action.
2. **Given** an existing construction with dependencies, **When** I move a base point, **Then** dependent geometry updates automatically and any infeasible results are not drawn and are indicated as infeasible in the UI.
3. **Given** an active tool, **When** I pan and zoom, **Then** navigation works without cancelling the ongoing operation.
4. **Given** a segment already exists, **When** I click somewhere along the segment while a tool requests a point input, **Then** the system does not treat that click as a point-on-segment and instead requires selecting an existing explicit point or creating an explicit point entity first.
5. **Given** I choose a constrained-variant tool (e.g., a perpendicular line through a point), **When** I follow the requested inputs in order, **Then** the resulting geometry is created with the intended constraint and recorded as a single constructive action.
6. **Given** I attempt to complete a construction with inputs that make it infeasible, **When** the tool detects infeasibility, **Then** the system reports it immediately and does not create a new geometric element.
7. **Given** I attempt to complete a construction with invalid inputs, **When** the system reports the issue, **Then** the attempt does not create a new action entry in the action history.

---

### User Story 3 - Use Dihedral-Specific Guides and Transports (Priority: P2)

As a learner, I want to create hinge lines and guides and use them to transport points and distances between projection planes so that I can practice core dihedral procedures without hidden automation.

**Why this priority**: Dihedral drawing education depends on hinge lines (HL) and explicit transport operations; these are essential to the constructive process.

**Independent Test**: Can be tested by creating a guide from a hinge line and a point, transporting the point to the linked plane, and verifying the transported result is derived (not freehand) and tracked as an action.

**Acceptance Scenarios**:

1. **Given** two projection planes sharing a hinge line (HL) and a point on the active plane, **When** I create a guide using that HL and the point, **Then** a guide is created that belongs to both planes and is perpendicular to the HL.
2. **Given** a guide and a point on one plane, **When** I run the “transport point via guide” operation, **Then** the corresponding point appears on the other plane as a derived result.
3. **Given** two points (or a segment) defining a distance, **When** I transport that distance to another plane using the transport tools, **Then** the transported distance is created as an explicit construction and not by an approximate click.

---

### User Story 4 - Work with Broken Hinge Lines (BHL) (Priority: P2)

As a learner, I want to create 3D planes and see their broken hinge line (BHL) projections automatically appear on relevant projection planes, and create guides perpendicular to BHL projections that automatically transport across both planes, so that I can perform distance transports between arbitrary plane intersections.

**Why this priority**: BHLs are fundamental to dihedral projection practice. Most transport operations in real exercises occur between BHL projections, not between regular hinge lines. The automatic guide transport across BHL projections streamlines the classical workflow.

**Independent Test**: Can be tested by creating a 3D plane from traces, verifying its BHL projections appear on both projection planes, creating a guide perpendicular to one BHL projection, and verifying the guide automatically appears on the other plane's BHL projection.

**Acceptance Scenarios**:

1. **Given** two trace lines on different projection planes, **When** I create a 3D plane from those traces, **Then** the BHL projections (the plane's intersection lines with the projection planes) are automatically created as Element2D lines on the relevant projection planes.
2. **Given** a BHL projection visible on one projection plane, **When** I create a guide perpendicular to that BHL projection and passing through a point, **Then** the guide automatically appears on both planes where the BHL exists, perpendicular to the respective BHL projections.
3. **Given** guides created from a BHL, **When** I transport a point or distance using those guides, **Then** the transported geometry appears as derived elements with full dependency tracking, just like transport via regular hinge lines.
4. **Given** a 3D plane with BHL projections and guides, **When** I modify one of the defining traces, **Then** the 3D plane updates, the BHL projections recompute, and any guides perpendicular to the BHL automatically adjust on both planes.

---

### User Story 5 - Define 3D Elements from 2D Projections (Priority: P3)

As a learner, I want to define 3D points/lines/segments/planes from compatible 2D projections and view them in an auxiliary 3D view so that I can build spatial understanding while keeping 2D construction as the source of truth.

**Why this priority**: A read-only 3D view helps comprehension but must not replace the learning process; 3D is derived, not edited.

**Independent Test**: Can be tested by selecting compatible 2D projections to create a 3D point, observing it in the 3D view, and verifying 3D elements cannot be edited directly.

**Acceptance Scenarios**:

1. **Given** two compatible 2D projections of the same point on different planes, **When** I create a 3D point, **Then** the 3D point appears in the 3D view and is linked to its projections.
2. **Given** two incompatible 2D projections selected for a 3D element, **When** I attempt creation, **Then** no 3D element is created, I receive immediate non-modal feedback, and no new action entry is added to history.
3. **Given** the 3D view, **When** I rotate/pan/zoom it, **Then** the view changes but no geometry can be selected or edited.

---

### User Story 6 - Inspect the Process and Dependencies (Priority: P4)

As a learner, I want to review a clear history of constructive actions and explore dependencies by hover highlighting so that I can understand how each step depends on prior steps.

**Why this priority**: The educational value comes from making the constructive process visible and traceable, not just producing a final drawing.

**Independent Test**: Can be tested by performing a few actions, then hovering items in the action and element panels and verifying focus/ancestors/descendants highlights are consistent.

**Acceptance Scenarios**:

1. **Given** a project with multiple constructive actions, **When** I hover an action in the action panel, **Then** the focus element(s), direct inputs, and direct outputs are highlighted in the workspace.
2. **Given** the element panel, **When** I hover an element, **Then** the same highlight rules apply (focus, direct ancestors, direct descendants) without changing selection.
3. **Given** dependency-hover mode is enabled, **When** I move the cursor away, **Then** the hover highlight disappears and my selection remains unchanged.
4. **Given** an element in the element panel, **When** I click it, **Then** a properties dialog opens allowing visual style changes without changing geometry.

---

### Edge Cases

- Creating a construction that becomes infeasible after moving a dependency (infeasible result is not drawn; marked in panels).
- Attempting to create a new construction that is infeasible with the currently selected/entered inputs (blocked immediately; no new element created).
- Cascading infeasibility: a base change makes multiple downstream actions infeasible.
- Attempting to define a 3D element from incompatible projections.
- Attempting to click on an arbitrary location on a curve/segment (not an intersection) while a tool requires a point input: the click is not treated as point creation; user must create an explicit point entity using the appropriate point tool.
- Clicking on an intersection while a tool requires a point input: an intersection point is automatically created, recorded in history, and used for the tool.
- Derived vs generative projections: derived projections remain visually distinct and never appear as user-created primitives.
- Switching active plane: creation always occurs on the active plane; switching does not mutate existing geometry.
- Changing active plane mid-operation: the operation completes/cancels deterministically and does not create partial hidden results.
- Opening a drawing with infeasible actions already present: infeasible results are not drawn and are clearly indicated.
- Panning/zooming during a multi-step tool operation.
- Toggling plane visibility while a tool is active.
- Very small/very large zoom levels (elements remain interactable and legible).

### Common Dihedral Drawing Operations

This section documents how typical dihedral drawing operations are performed using the available tool combinations. All operations follow the principle of explicit construction with no implicit geometry (except for automatic intersection point creation).

**Creating a segment on a line**:
- **Option 1 (using intersections)**: Activate "Segment between existing points" and click on the intersections where the line crosses other elements. Intersection points are created automatically.
- **Option 2 (explicit points first)**: Use "Intersection point" tool to create points where the line intersects with other elements, then use "Segment between existing points" tool to connect them.
- The resulting segment is parametrically linked to the line through its endpoints.

**Finding the projection of a point on a line**:
1. Use "Perpendicular line through point" tool to create a perpendicular from the point to the target line.
2. Use "Intersection point" tool to find where the perpendicular intersects the target line.
3. The intersection point is the projection.

**Measuring and transferring distances**:
1. Use two points or a segment to define the distance on the source plane.
2. Use "Create guide from HL and point" to establish the transport guide.
3. Use "Transport point via guide" or "Transport distance" tools to move the distance to the target plane.
4. The transported geometry appears as explicit derived entities on the target plane.

**Creating a segment from line endpoints**:
1. Find the endpoints by intersecting the line with other elements using "Intersection point" tool.
2. Use "Segment between existing points" to create the segment.

**Creating parallel or perpendicular constructions**:
1. Ensure the required reference point exists (create it if needed using point tools).
2. Select the appropriate line variant tool ("Parallel line through point" or "Perpendicular line through point").
3. Select the reference line and the point.

**All operations emphasize**:
- **Explicit steps**: No hidden intermediate geometry.
- **Point reusability**: Points created for one purpose can be used in subsequent operations.
- **Dependency preservation**: Results update when base elements change.
- **Infeasibility visibility**: If a combination becomes invalid, the system marks it clearly rather than hiding or approximating.

### Low-Level Interaction Use Cases

These use cases cover primitive user actions and micro-interactions. They are intended to be testable as individual behaviors.

1. **Pan the 2D view**
  - **Given** the pointer is over the 2D view, **When** I hold `Shift` and drag, **Then** the 2D view pans without modifying geometry.

2. **Zoom the 2D view**
  - **Given** the pointer is over the 2D view, **When** I scroll the mouse wheel, **Then** the 2D view zooms without cancelling the active tool.

3. **Rotate/pan/zoom the 3D overlay**
  - **Given** the pointer is over the 3D overlay, **When** I drag / `Shift`+drag / scroll, **Then** the 3D camera updates and no geometry is created or edited.

4. **Select a single element in the 2D view**
  - **Given** there are multiple elements on the active plane, **When** I click an element, **Then** it becomes the current selection.

5. **Hover highlighting (when enabled)**
  - **Given** dependency-hover mode is enabled, **When** I hover an element (in the drawing or in a panel), **Then** the focus element, direct ancestors, and direct descendants are highlighted immediately and temporarily without changing selection.

6. **Hover highlighting (when disabled)**
  - **Given** dependency-hover mode is disabled, **When** I hover elements in panels, **Then** no dependency hover highlighting occurs.

7. **Open element properties from the Elements panel**
  - **Given** the Elements panel shows a listed item, **When** I click it, **Then** the element properties dialog opens for that item.

8. **Unset-by-default style inheritance**
  - **Given** an element has not had any style overrides set, **When** I view its properties, **Then** its style properties are shown as unset and its effective appearance is inherited from its containing subprocess.

9. **Set and reset a style override**
  - **Given** an element is inheriting its style, **When** I set an explicit color or line style in the properties dialog, **Then** the element uses that override; **And When** I reset inheritance, **Then** the override is removed and the element returns to inherited defaults.

10. **Elements panel grouping by nature**
  - **Given** multiple elements exist, **When** I open the Elements panel, **Then** items are grouped by nature within the 2D and 3D sections (e.g., points grouped together, lines grouped together).

11. **Planes and projection planes appear only under 3D**
  - **Given** projection planes exist, **When** I view the Elements panel, **Then** planes and projection planes are listed only under the 3D section (not under 2D).

12. **Hover a projection plane entry**
  - **Given** a projection plane is listed in the Elements panel under 3D, **When** I hover it, **Then** the corresponding plane representation is highlighted.

13. **Active plane selection affects creation only**
  - **Given** multiple planes are available, **When** I change the active plane, **Then** existing geometry is unchanged and subsequent 2D primitive creation happens on the newly active plane.

14. **Complete a multi-step tool successfully**
  - **Given** a multi-step tool is active, **When** I provide all required inputs in order, **Then** the resulting element(s) are created and recorded as one constructive action.

15. **Invalid-at-creation attempt is blocked and ignored**
  - **Given** a tool is ready to complete a new construction, **When** I provide inputs that do not define a valid result, **Then** no new element is created, I receive immediate non-modal feedback, and no new action entry is added to history.

16. **Automatic intersection point creation**
  - **Given** a tool requires a point input and two elements intersect, **When** I click on their intersection, **Then** an intersection point is automatically created, recorded as an auxiliary action within the main action, and used as input for the tool.
  - **Given** a tool requires a point input and I click on a segment away from any intersection or existing point, **Then** the click is not treated as a point-on-segment and the tool continues to require an explicit point entity.

17. **Automatic free point creation during construction**
  - **Given** a tool requires a point input (e.g., "Segment by two points"), **When** I click on empty space, **Then** a free point is automatically created at that location, recorded as an auxiliary action within the main action, and used as input for the tool.

18. **Hover highlighting of valid inputs**
  - **Given** a tool is active and awaiting input, **When** I move the cursor over an element that is a valid input, **Then** that element is visually highlighted without requiring a click.
  - **Given** a tool requires a point input and the cursor approaches an intersection, **When** the cursor is near the intersection, **Then** both intersecting elements are highlighted near the intersection and a marker appears at the intersection point.

19. **Point snapping for easier selection**
  - **Given** a tool requires a point input and an existing point is nearby, **When** I move the cursor within the snap radius of the point, **Then** the cursor visually snaps to the exact point location, the point is highlighted intensely, and clicking will select that point.
  - **Given** a tool requires a point input and the cursor is snapped to a point, **When** I move the cursor outside the snap radius, **Then** the snap is released and the cursor moves freely again.

20. **Auxiliary actions in the Constructive Actions Panel**
  - **Given** I create a segment by clicking on two empty locations, **When** I view the Constructive Actions Panel, **Then** I see one main action ("Create segment") with two nested auxiliary actions ("Create free point" for each endpoint), and I can expand/collapse to show/hide the auxiliary actions.

21. **3D element creation success**
  - **Given** compatible 2D projections are selected, **When** I run a 3D creation tool, **Then** the 3D element is created and visible in the 3D overlay.

22. **3D element creation invalid selection**
  - **Given** incompatible projections are selected, **When** I run a 3D creation tool, **Then** no 3D element is created and I receive immediate non-modal feedback.

23. **Autosave to Google Drive**
  - **Given** a project is open, **When** I create or modify geometry, **Then** the project is persisted automatically to Google Drive without an explicit save action (debounced 2 seconds after last change).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a primary 2D workspace where ALL projection planes are displayed SIMULTANEOUSLY in a dihedral configuration, with all elements on all planes visible at all times.
- **FR-002**: The system MUST allow selecting exactly one active projection plane; new 2D elements MUST be created on the active plane. The active plane MUST be visually emphasized (full intensity) while non-active planes MUST be de-emphasized (reduced opacity) but remain fully visible.
- **FR-003**: The system MUST support creating explicit 2D primitives on the active plane: point, segment, line, circle (arcs are optional).
- **FR-004**: The system MUST provide explicit tool variants for constrained constructions (e.g., perpendicular/parallel line through a point) without implicit geometry.
- **FR-005**: The system MUST support plane navigation in the 2D view: pan and zoom, always available even during an active tool.
- **FR-006**: The system MUST represent hinge lines (HL) between pairs of projection planes and treat HL as a line for geometric reasoning.
- **FR-007**: The system MUST support creating a guide from (HL, point on active plane) that is perpendicular to the HL and belongs to both planes.
- **FR-008**: The system MUST support transporting a point from one plane to the other via a guide, producing an explicit derived result.
- **FR-009**: The system MUST support transporting a distance (defined by two points or a segment) between planes via explicit transport operations.
- **FR-010**: The system MUST implement a parametric dependency model so that when a base element changes, all dependent results are recomputed.
- **FR-011**: The system MUST validate new constructions at completion-time; if the selected/entered inputs do not define a valid result, the system MUST report it immediately, MUST NOT create any new geometric output element, and MUST NOT add a new action entry to history.
- **FR-012**: The system MUST handle change-driven infeasibility during recomputation: if a previously valid construction becomes infeasible after an upstream change, the system MUST keep the construction/action in history, MUST not draw its outputs, and MUST indicate it as infeasible in the UI.
- **FR-013**: The system MUST record each tool execution as a constructive action visible to the user.
- **FR-013a**: When a tool automatically creates supporting geometry (free points at clicked locations or intersection points), these MUST be recorded as auxiliary actions nested within the main action and MUST be visible in the Constructive Actions Panel as expandable/collapsible nested items.
- **FR-014**: The system MUST provide a left-side action panel that shows constructive actions (hierarchical grouping supported).
- **FR-015**: The system MUST provide a left-side element panel listing 2D and 3D elements (hierarchical grouping supported).
- **FR-016**: When dependency-hover mode is enabled, hovering an action in the action panel or an element in the element panel MUST produce unified hover highlighting: focus element, direct ancestors (inputs), and direct descendants (outputs); the highlight MUST be immediate, temporary, MUST NOT modify selection, and MUST visually distinguish at least: focus, direct ancestors, direct descendants, infeasible elements, and dependencies of infeasible elements.
- **FR-017**: Clicking an element in the element panel MUST open a properties dialog to edit visual style (color, line width, line style, visibility) without altering geometry; style properties MUST be unset by default and inherit from the containing subprocess unless explicitly overridden.
- **FR-018**: The system MUST provide an auxiliary 3D view that is read-only and derived from the 2D construction.
- **FR-019**: The 3D view MUST support navigation (rotate, pan, zoom) but MUST NOT allow selecting or editing geometry.
- **FR-020**: The system MUST allow defining a 3D point from two compatible 2D projections.
- **FR-021**: The system MUST allow defining a 3D line/segment/plane only from explicitly selected compatible 2D projections/traces.
- **FR-022**: If 3D creation inputs are incompatible, the system MUST not create the 3D element and MUST provide immediate non-modal feedback.
- **FR-023**: The UI MUST NOT introduce implicit points on arbitrary locations on existing geometry; however, when a tool requires a point input and the user clicks on a visible intersection between elements, the system MUST automatically create an explicit intersection point entity, record it in the action history, and use it for the tool.
- **FR-024**: The system MUST avoid modal error dialogs for invalid constructions; invalidity/infeasibility MUST be communicated via visual indicators and panels.
- **FR-025**: The user interface text and all documentation MUST be in English.
- **FR-026**: The system MUST distinguish between user-created (generative) projections and derived projections and render them with different visual emphasis.
- **FR-027**: The system MUST automatically persist project changes to Google Drive without requiring the user to explicitly save. Changes are debounced (e.g., 2 seconds after last change) to minimize API calls.
- **FR-028**: The system MUST support opening an existing project and restoring planes, elements, actions, dependencies, and view settings.
- **FR-029**: The system MUST support creating a new project.
- **FR-030**: The system MUST provide a way to list available projects and choose one to open.
- **FR-031**: The system MUST allow configuring numeric precision used for displayed values and geometric calculations.
- **FR-032**: The system MUST allow toggling visibility of projection planes, hinge lines, and plane-associated 2D elements.
- **FR-033**: The system MUST support grouping constructive actions into subprocesses that can be expanded/collapsed.
- **FR-034**: Subprocesses MUST be able to influence visual style defaults (inheritance) for contained elements, while allowing per-element overrides.
- **FR-035**: The 3D view MUST allow toggling the display of (a) 2D elements shown on projection planes and (b) linking visuals between 3D elements and their 2D projections.
- **FR-036**: The system MUST provide a mode to enable/disable dependency-hover highlighting on actions and elements.
- **FR-037**: When a tool is active and awaiting input, the system MUST provide continuous visual feedback by highlighting elements that are valid inputs as the cursor moves over them; for intersections, both intersecting elements MUST be highlighted near the intersection point with a visual marker at the intersection location; for empty space, the cursor or canvas MUST indicate that clicking will create a free point.
- **FR-038**: The system MUST implement point snapping: when the cursor moves within a configurable snap radius of an existing point or intersection marker, the cursor MUST visually snap to that exact location and the target point MUST be highlighted, allowing the user to select the point without requiring exact cursor positioning; the snap radius SHOULD be appropriate for the current zoom level.
- **FR-039**: The system MUST provide a Selection Tool (pointer/arrow icon) in the toolbar that, when active, enables: (a) double-clicking any object to open its properties dialog, (b) dragging a directly-defined unlocked 2D point to reposition it with continuous parametric updates, and (c) dragging empty space to pan the viewport. The point move MUST be undoable/redoable, MUST NOT allow moving derived points, and MUST NOT allow moving points marked as locked.
- **FR-040**: The system MUST implement distance-adjusted hit-testing when multiple elements fall within the snap radius: after filtering by the active tool's selection mask, the system MUST treat points as small circles by subtracting their visual radius (~5 pixels) from the measured distance, then select the element with the smallest adjusted distance. This ensures that when a point lies on a line, the point is naturally preferred when nearby, while still allowing other elements to be selected if they are significantly closer.
- **FR-041**: The Circle Tool MUST snap to existing points for both center and circumference point selection: when the user clicks within the snap radius of an existing point during circumference point selection (second click), the system MUST use the existing point instead of creating a new one, maintaining consistent snapping behavior with center point selection (first click) and other construction tools.
- **FR-042**: Circles created by center and circumference point (Circle2DByCenterAndPoint) MUST update when either defining point moves: The system MUST track dependencies on BOTH the center point AND the circumference point, ensuring the circle realization updates automatically when either point is moved, maintaining the parametric behavior specified in §Parametric Behavior and Dependencies.
- **FR-043**: The system MUST provide a Parallel Line Tool that creates a line passing through a specified point and parallel to a reference line: when the user activates the tool, selects a reference line (or guide), and specifies a point (by clicking on an existing point, intersection, or empty space), the system MUST create a new Line2DParallelToLine element that remains parallel to the reference line and passes through the specified point, automatically updating when either the reference line or the point moves, maintaining the parametric behavior specified in §Parametric Behavior and Dependencies.
- **FR-044**: The system MUST provide a Perpendicular Line Tool that creates a line passing through a specified point and perpendicular to a reference line: when the user activates the tool, selects a reference line (or guide), and specifies a point (by clicking on an existing point, intersection, or empty space), the system MUST create a new Line2DPerpendicularToLine element that remains perpendicular to the reference line and passes through the specified point, automatically updating when either the reference line or the point moves, maintaining the parametric behavior specified in §Parametric Behavior and Dependencies.
- **FR-045**: The system MUST provide a Line Tangent to Circle Through Point Tool that creates a line tangent to a specified circle and passing through a specified point: when the user activates the tool, selects a circle, and specifies a point (by clicking on an existing point, intersection, or empty space), the system MUST automatically determine which of the two possible tangent lines to create based on the mouse click position relative to the circle's radius vector angle (following the indexing convention from §Intersection Point Indexing on Circles in data-model.md), and create a new Line2DTangentToCircleThroughPoint element. If the point is inside the circle or exactly on the circle, the system MUST report infeasibility immediately and MUST NOT create a line. The tangent line MUST automatically update when either the circle or the point moves, maintaining the parametric behavior specified in §Parametric Behavior and Dependencies.
- **FR-046**: The system MUST provide a Line Tangent to Circle Parallel to Line Tool that creates a line tangent to a specified circle and parallel to a specified reference line: when the user activates the tool, selects a circle, and selects a reference line (or guide), the system MUST automatically determine which of the two possible tangent lines to create based on the mouse click position relative to the circle's radius vector angle (following the indexing convention from §Intersection Point Indexing on Circles in data-model.md), and create a new Line2DTangentToCircleParallelToLine element. If the reference line intersects the circle (secant or tangent), the system MUST report infeasibility immediately and MUST NOT create a line. The tangent line MUST automatically update when either the circle or the reference line moves, maintaining the parametric behavior specified in §Parametric Behavior and Dependencies.

- **FR-047**: The system MUST implement hierarchical selection masks that respect the domain model's class hierarchy: when a tool specifies 'any-line' in its selection mask, the system MUST allow selection of any element that extends Line2D, including regular lines (Line2DByTwoPoints, Line2DParallel, Line2DPerpendicular), segments (Segment2DByPoints), guides (Guide2D, SiblingGuide2D), and half-hinge lines (HalfHingeLine2D). Additionally, tools MUST support flexible workflow ordering: the Parallel Line Tool, Perpendicular Line Tool, and Tangent Parallel Tool MUST accept input parameters in either order (point first then line, or line first then point), allowing users to work in their preferred sequence without constraining the construction workflow.

- **FR-048**: The system MUST implement a class-based selection mask architecture to enable type-safe, composable selection queries: the system MUST provide a SelectionMask base class with concrete implementations (TypeMask for exact type matching, HierarchyMask for type hierarchies, UnionMask for logical OR queries, IntersectionMask for logical AND queries) that replace string-based selection masks. The Paper.hitTest() method MUST accept SelectionMask class instances and use polymorphic matches() method dispatch for element type checking. All construction tools MUST use class-based masks through factory methods (SelectionMask.point(), SelectionMask.anyLine(), SelectionMask.union()) ensuring compile-time type safety and enabling complex selection patterns not possible with string literals.

- **FR-049**: The system MUST provide a declarative Tool Argument Collection Framework for construction tools that require multiple geometric inputs: tools MUST declare their required arguments through ToolArgumentSpec objects specifying argument name, selection mask, and optional validation functions. Tools MAY support multiple mutually-exclusive argument set combinations (ToolArgumentSet) to allow different construction methods (e.g., tangent line via circle+point OR circle+line). The framework MUST automatically handle any-order argument collection by maintaining viable argument sets as elements are selected, dynamically updating the selection mask as the union of all viable next arguments, and executing the construction when exactly one argument set is complete. The framework MUST provide real-time UI feedback showing the current construction method and remaining required arguments. Tools implementing this framework MUST inherit from ArgumentCollectorTool base class and implement getArgumentSets() to declare argument specifications and execute() to perform the construction for a completed argument set.

- **FR-050**: The system MUST organize construction tools into functional families where related tools are grouped under a single toolbar button with a dropdown menu. Each tool family MUST display the currently active sub-tool on the button face (icon + optional label). Clicking the button MUST activate the last-used sub-tool from that family. Clicking the dropdown arrow MUST show a menu of all sub-tools in the family. The system MUST remember the last-used sub-tool per family across tool selections and persist this preference. Tool families MUST group conceptually related construction methods (e.g., Point family: Free Point, Intersection Point; Line family: Line by Two Points, Parallel Line, Perpendicular Line, Tangent Lines). The toolbar organization MUST make user intent explicit by requiring selection of specific construction variants rather than inferring intent from context. [Phase 67 - Toolbar Behavior]

- **FR-051**: The system MUST implement consistent tool completion behavior based on tool usage patterns. Frequently-used tools (Point, Line, Segment, Circle) MUST remain active after successful operation completion (Option A: "stays active"), allowing immediate repetition of the same construction without reactivation. These tools MUST require explicit deactivation via ESC key, clicking a different tool, or selecting the Selection Tool. Infrequently-used or complex tools (Tangent, Intersection, Transport) SHOULD automatically return to Selection Tool after operation completion (Option B: "returns to neutral"). All tools within the same conceptual family MUST follow the same completion behavior pattern for consistency. The system MUST clearly document which completion behavior each tool uses in tool tooltips. [Phase 67 - Toolbar Behavior]

- **FR-052**: The system MUST provide a toolbar with icon-only buttons using professional SVG illustrations that combine visual metaphors with color-coding to teach construction method semantics: created elements MUST be rendered in blue (#2196F3), required argument elements in orange (#FF9800), and context elements in grey (#757575). All construction tool icons MUST illustrate both the created output and the required arguments in a single compact 24×24px illustration. The toolbar MUST use 40×40px icon-only buttons without text labels to maximize space efficiency while maintaining accessibility through tooltips and ARIA labels. Icons MUST be rendered as Vue components with proper Material Design styling, consistent stroke weights, and pedagogically meaningful color choices. [Phase 68 - Toolbar Icon-Only Design]

- **FR-053**: The system MUST provide a 3D visualization overlay that displays 2D elements positioned on their projection planes in 3D space: when enabled via display options, the 3D view MUST render all 2D elements (points, lines, segments, circles) at their correct 3D positions by transforming their 2D plane-local coordinates through the projection plane's 3D transformation matrix. The 3D view MUST use Three.js for rendering with proper depth testing, occlusion, and perspective camera. Each 2D element type MUST map to an appropriate 3D geometric primitive (points → spheres, lines → infinite line segments, segments → bounded line segments, circles → 3D curves on planes). The 3D visualization MUST update automatically when 2D elements change position or visibility. Elements MUST maintain visual hierarchy: projection plane surfaces rendered as semi-transparent rectangles, 2D elements on planes rendered with same colors and styles as 2D view but adjusted for 3D context, and active plane elements emphasized through stronger opacity. The 3D view MUST remain read-only: no element selection, creation, or editing allowed—purely for spatial understanding. [Phase 77 - 3D Visualization of 2D Elements on Planes]

- **FR-054**: The system MUST display coordinate values (u, v) along the viewport borders for main grid lines to provide numerical spatial orientation: coordinate labels MUST appear at the intersections of major grid lines with the viewport edges (top, bottom, left, right borders). U-coordinates (horizontal) MUST be displayed along the top and bottom edges; V-coordinates (vertical) MUST be displayed along the left and right edges. Labels MUST update dynamically as the user pans or zooms the viewport, showing only the coordinates visible within the current view. The coordinate display MUST respect the grid visibility toggle—labels only appear when the grid is visible. Typography MUST be clear and readable (minimum 10px font size) without obstructing the workspace. Labels MUST be positioned outside the drawable canvas area or use subtle backgrounds to ensure legibility over complex drawings. The coordinate values MUST reflect the plane-local (u,v) coordinate system, NOT canvas pixel coordinates. [Phase 78 - Grid Coordinate Labels]

- **FR-055**: The system MUST render the grid using the active projection plane's intrinsic coordinate system (u, v vectors), not arbitrary paper/canvas coordinates: the grid MUST be derived from the active plane's origin point (0, 0) and intrinsic u and v basis vectors, transformed through the plane's planeToPaper2D matrix to screen coordinates. Major grid lines MUST always be at multiples of powers of 10 (10^n where n is any integer, e.g., 0.1, 1, 10, 100, 1000), with the specific power chosen to maintain visual clarity at the current zoom level. Subdivisions between major lines MUST be exactly 2, 5, or 10, dividing each major interval into smaller cells. The subdivision count MUST be chosen to keep minor grid cells at or above a minimum pixel threshold (15 pixels), selecting the largest subdivision (10 > 5 > 2) that meets this requirement—this ensures maximum grid detail while preventing visual clutter. The algorithm MUST calculate minSpacing = minPixelsPerCell / zoom, then find the smallest value from the sequence (10^n/10, 10^n/5, 10^n/2) that is ≥ minSpacing, determining both the minor spacing and the corresponding major spacing (10^n). Major grid lines (at 10^n intervals) MUST be emphasized with darker color (#C0C0C0) compared to minor lines (#E0E0E0). Grid labels MUST display actual plane-local (u, v) coordinate values at major lines only, not transformed paper/canvas pixel coordinates. The plane's origin (0, 0) MUST be clearly visible when in viewport, marked by the intersection of u=0 and v=0 lines. The hinge line at v=0 MUST naturally align with horizontal grid lines on default planes. Each projection plane MUST show its own grid when active, derived from that plane's unique coordinate system and transformation matrices. The grid architecture MUST support future non-orthogonal planes where u, v vectors may be at arbitrary angles—transformation matrices already handle arbitrary orientations. [Phase 79 - Plane-Based Grid Coordinates]

- **FR-056**: The system MUST provide a Create Projection Plane Tool that allows users to create new projection planes by unfolding a 3D plane onto the paper using a trace line as the hinge: when the user activates the tool, the system MUST require sequential selection of (1) T1 hinge trace line on projection plane P1, (2) T2 other trace line on projection plane P2 (MUST be different from P1), and (3) T2' user-constructed line on P1 showing where T2 should appear in the new projection plane. The tool MUST validate that T1 and T2 define a valid 3D plane Q and that T2' is on the same plane as T1. The system MUST compute the transformation matrices (planeToPaper, planeTo3D, threeDToPlane) from the three input lines, with T2' serving dual purpose: (1) defining the orientation (which direction Q unfolds) and (2) enforcing the educational requirement that users must geometrically determine where T2' should be positioned through manual construction. If T2' position differs from the computed expected position by more than a tolerance threshold (1 pixel), the system MUST display a non-modal warning message but still execute the construction (pedagogical feedback, not blocking error). The created projection plane MUST appear on the canvas with grid rendering, MUST be added to the active plane selector, MUST share a HingeLine with P1 along T1, and MUST have all standard projection plane properties (transformation matrices, coordinate system). The system MUST validate that T1 and T2 are on different projection planes and that T2' is on the same plane as T1, reporting immediate non-modal feedback for invalid configurations without creating an action entry. All interaction MUST occur in the 2D paper view; the 3D view is for illustration only. [Phase 82 - Create Projection Plane Tool]
- **FR-057**: The system MUST support marking individual 2D and 3D elements with a visibility flag stored directly on the element (not in VisualStyle) to enable element hiding relationships where one element can hide another: when an element's visibility is set to false, the element MUST NOT render in either the 2D canvas (SvgCanvas) or the 3D view (ThreeView), while still remaining selectable and editable in the World Elements panel. The visibility property MUST be a direct property on Element2D and Element3D base classes (not in VisualStyle), MUST persist across sessions, MUST be undoable/redoable when changed, and MUST be controllable through a "Visibility" checkbox in the Element Properties dialog with tooltip text "Control whether this element is displayed in views". Elements with visibility=false MUST still participate in geometric computations and dependency tracking—only their visual representation is suppressed. The system MUST render hidden elements (visibility=false) with a distinctive marker (eye-slash icon or grayed-out text) in the World Elements panel to indicate their hidden state. When a user picks/selects an element location in the viewport that corresponds to a hidden element (visibility=false), the system MUST NOT offer that element as a valid selection target, effectively making hidden elements invisible to picking operations. Future element hiding relationships (where element A can programmatically hide element B) will leverage this domain-level visibility property. [Phase 83 - Element Visibility Property]

### Assumptions

- The MVP includes at least two default projection planes (Horizontal and Vertical) and their hinge line.
- Additional projection planes may be added later; this specification focuses on the minimum dihedral learning loop.
- The application is a web-based interactive tool; a backend service may be used for project persistence.
- The MVP does not attempt to “fix” user mistakes; it surfaces infeasibility instead.

### Key Entities *(include if feature involves data)*

- **Project**: A saved workspace containing planes, elements, actions, dependencies, and view settings.
- **ProjectionPlane**: A named 2D drawing surface that can be active/inactive and visible/hidden.
- **HingeLine (HL)**: The physical fold line (intersection) shared by two **projection planes**.
- **Broken HingeLine (BHL)**: The intersection line between two arbitrary 3D planes (not projection planes). Appears as projected Element2D lines on the relevant projection planes.
- **Guide**: A line perpendicular to an HL used for transports; belongs to both planes.
- **Element2D**: Point, segment, line, circle (and optionally arc) that belongs to one plane.
- **Element3D**: Derived 3D point/line/segment/plane defined explicitly from compatible 2D inputs.
- **ConstructiveAction**: A recorded operation that produces outputs from inputs and defines dependencies.
- **DependencyGraph**: The directed relationships between actions/elements enabling recomputation.
- **InfeasibilityState**: The status indicating an action/result cannot currently be computed.
- **VisualStyle**: User-editable, non-geometric styling properties with optional inheritance.
- **ViewState**: Pan/zoom state for 2D view, camera state for 3D view, visibility toggles.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A learner can complete a basic exercise (create 2D points/segment, create a guide, transport a point, define a 3D point, inspect dependencies) in under 10 minutes without external instructions.
- **SC-002**: For a typical exercise with up to 200 2D elements, 2D navigation (pan/zoom) and hover highlighting provide visible feedback within 200 ms.
- **SC-003**: Infeasible constructions are understandable: in a usability self-test, at least 90% of infeasible cases can be identified via panel/visual indicators without modal error dialogs.
- **SC-004**: Project persistence is reliable: after making changes, reopening the project restores the same number of planes/elements/actions and the same visibility states in 100% of trials on a reference test set.

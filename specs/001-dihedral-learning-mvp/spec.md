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
  - `P_H`: Horizontal plane
  - `P_V`: Vertical plane
- The system may include additional projection planes later (auxiliary, profile, etc.).
- The active plane affects only *where new elements are created*; changing the active plane does not modify existing geometry.

### Hinge Lines (HL)

A **hinge line** (HL) is the intersection line shared by two projection planes.

- Naming convention: `HL_XY` where `X` and `Y` are plane identifiers.
  - Example: `HL_HV` is the hinge line shared by `P_H` and `P_V` (the ground line).
- For geometric reasoning, hinge lines behave like regular 2D lines.

### Guides

A **guide** is a key dihedral learning construct:

- Created from:
  - a hinge line (HL), and
  - a point on the active plane.
- Result:
  - a line **perpendicular** to the selected HL,
  - belonging to **both** planes associated with that HL.

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

- has explicit inputs and outputs,
- participates in dependency recomputation,
- can be browsed in the UI (action history).

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

The full UI structure, tool groupings, and interaction rules are defined in **User Interface (Detailed)** below; that section is the source of truth.

At a conceptual level, the UI is designed so that:

- Tools are grouped by operation type and may offer **explicit variants** the user deliberately chooses.
- Constructive inputs are explicit (notably, **no implicit point-on-entity** inputs).
- Hover is a non-destructive inspection mechanism (unified dependency-hover highlighting when enabled).

### Naming Conventions (Visible in UI)

The application uses consistent naming to support learning:

- 2D elements use lowercase identifiers (e.g., `a`, `b`).
- 3D elements use uppercase identifiers (e.g., `A`, `B`).
- Projections use suffixes that indicate the plane (e.g., `A_H`, `A_V`).
- `P` and `HL` prefixes are reserved for projection planes and hinge lines.

## User Interface (Detailed)

This section describes what the user sees and how they interact with the UI. It is derived from `pre-spec-ui.md` and focuses on user-visible components and behaviors.

### Overall Layout

The interface is organized into four main areas:

1. **Top toolbars** (primary controls)
2. **Central 2D drawing area** (primary workspace)
3. **Auxiliary 3D view overlay** (read-only, for spatial understanding)
4. **Left-side stacked panels** (actions, elements)

The application is designed for mouse + keyboard use.

### Central 2D Drawing Area

The 2D view is the main work area where all constructive operations are performed.

- The 2D view is where constructions are performed on the active plane; projection plane surfaces are visualized in the 3D overlay.
- Exactly one plane is the **active plane** at all times.

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

The 3D view is displayed as a rectangular overlay on top of the 2D view (typically in a corner; positioning may be configurable).

Its purpose is exclusively visual:

- Allowed: rotate (drag), pan (`Shift` + drag), zoom (mouse wheel).
- Not allowed: select elements for editing; create or modify geometry.

**3D display options**:

The user can toggle (within the 3D overlay controls):

- showing 2D constructive elements on projection planes in the 3D view,
- showing linking visuals between 3D elements and their 2D projections (e.g., dashed connectors).

The 3D overlay controls are also where the user manages projection plane visibility (and related visibility such as hinge lines and plane-associated 2D elements).

### Top Toolbars

The top toolbars contain the primary user controls, grouped by operation type.

#### Toolbar Interaction Model

The toolbars follow a structured interaction model designed to make geometric reasoning explicit and unambiguous:

**Single active tool**:

- At any moment, exactly **one tool is active**.
- The active tool determines:
  - how mouse clicks are interpreted,
  - which element types can be selected,
  - which actions are allowed.
- While a tool is active, clicks are **not interpreted as generic selection**, but as inputs to complete the tool's operation.
- The active tool state must be:
  - clearly visible,
  - persistent until the operation is completed or cancelled.

**Tool families and organization**:

- Tools are grouped into **functional families**, each represented by a primary button.
- Each family contains multiple **sub-tools** that are conceptually related.
- Sub-tools are accessed via a dropdown menu associated with the button.
- The last sub-tool used may remain as the default for subsequent use.
- This approach keeps the toolbar compact while grouping similar operations and making user intent explicit.

**Sequential interaction flow**:

- Each tool defines an **explicit sequential flow** of steps.
- Each step expects a specific type of input:
  - selection of a point,
  - selection of a line,
  - numeric value entry,
  - etc.
- The system always knows:
  - the current step of the tool,
  - which inputs are valid at that step.
- The user cannot advance to the next step without correctly completing the previous one.

**Valid input restriction**:

- While a tool is active, only elements **valid** for the current step can be selected.
- Valid elements may be visually highlighted.
- Invalid elements are ignored or do not react to clicks.
- This behavior reduces errors and reinforces understanding of the geometric process.

**Continuous visual feedback**:

During interaction, the system provides **constant visual feedback**, including:

- **Hover highlighting of valid inputs**: When a tool is active and waiting for input, as the user moves the cursor over the drawing:
  - Elements that are valid inputs for the current step are visually highlighted (e.g., with a colored outline or glow).
  - **Point snapping**: When the cursor moves within a nearby area (snap radius) of an existing point, the cursor visually "snaps" to that point (e.g., the cursor jumps to the exact point location, and the point is highlighted more intensely). This allows the user to select the point without requiring exact cursor positioning.
  - **For intersections**: When the cursor approaches an intersection between elements, both intersecting elements are highlighted near the intersection point, and a visual marker (small circle or crosshair) appears at the intersection location, indicating it can be clicked to automatically create an intersection point. Snapping also applies to intersection markers.
  - **For empty space**: When the cursor is over empty space (not near any element or snap target), the cursor may change to indicate that clicking will create a free point at that location.
- Clear indication of the current step (e.g., "Select first point", "Select second point").
- Preview of the result when possible (e.g., a dynamic line preview following the cursor after the first point is selected; the preview snaps to follow snap targets).
- Brief status messages.

The feedback guides the user without automating decisions.

**Explicit result creation**:

Upon successfully completing all steps of a tool:

- the construction is created explicitly,
- it is recorded as a coherent and traceable action,
- corresponding dependencies are established.

No implicit entities are created, and no ambiguous constructions are completed.

**Completion and repetition**:

After completing an operation:

- the tool may remain active to allow repeating the same action,
- or it may return to a neutral state.

The behavior must be consistent and predictable for the user.

**Operation cancellation**:

The user can cancel a tool at any time:

- via an explicit cancellation action (e.g., a dedicated key),
- or by selecting a different tool.

When cancelled:

- partial selections are discarded,
- no entities are created,
- the system returns to a coherent state.

**Separation of navigation and construction**:

Navigation actions (pan, zoom) are conceptually separate from construction tools.

- Navigation can be available at any time.
- Using navigation does not cancel or alter the active tool.

This allows working with complex drawings without interrupting the construction flow.

**Absence of hidden inferences**:

The toolbar system **does not introduce implicit inferences**:

- No automatic points are created from approximate clicks.
- No arbitrary positions are combined with geometric constraints.
- Every entity used as input must exist explicitly.

Each construction reflects exactly the decisions made by the user.

**Pedagogical objective**:

This toolbar model is designed to:

- make geometric reasoning explicit,
- avoid ambiguities in interaction,
- reinforce the relationship between action and result,
- allow the user to mentally reconstruct the process followed.

The toolbars constitute an **interaction language**, not just a set of buttons.

**Constructive interaction constraint (key)**:

- Tools must not accept an arbitrary point-on-element as input unless that point already exists as an explicit 2D point entity.
- If a point on a segment/line/circle is needed (not at an intersection), the user must first create it via an explicit tool variant (e.g., point-on-element).
- **Point snapping**: When the cursor is within a snap radius of an existing point or intersection marker, the system snaps the cursor to that location, providing visual feedback that the point will be selected. This enhances usability without introducing implicit geometry.
- **Exception for intersections**: When a tool requires a point input and the user clicks on a visible intersection between two elements, the system automatically creates an explicit intersection point at that location and uses it for the tool. This point is recorded as an auxiliary action within the main action.
- **Exception for free points during construction**: When a tool requires a point input and the user clicks on empty space (not on or near any existing element or snap target), the system automatically creates a free point at that location and uses it for the tool. This point is recorded as an auxiliary action within the main action.
- The UI provides visual aids (highlighting of valid elements, snapping behavior, intersection indicators, cursor changes) to help users understand what will happen when they click.
- When a tool description states "Select a point" or "Click to place", this means:
  - **Select existing point**: Click on or near an existing point entity (snapping assists selection).
  - **Click on intersection**: Click on a visible intersection; the system creates an intersection point automatically as an auxiliary action.
  - **Click on empty space**: Click away from any element or snap target; the system creates a free point automatically as an auxiliary action.
  - It does NOT mean "click near an element to implicitly create a point on it" (except for intersections as noted above).

#### Active Plane Selector

- Shows available planes.
- Click a plane to make it the active plane.

Visual behavior:

- Elements on the active plane are rendered with higher intensity.
- Elements on other planes (when shown) are visually de-emphasized.

Changing the active plane:

- does not modify existing geometry,
- only affects where new 2D elements are created.

#### Navigation Toolbar

Provides explicit navigation controls (complementary to the always-available shortcuts):

- pan,
- optional “fit/reset view”.

#### 2D Drawing Toolbar (Primitives + Explicit Variants)

Contains tools for creating 2D primitives on the active plane. Tools may expose explicit variants (e.g., via a dropdown), and variants are never automatic: the user deliberately chooses the intended construction.

**Point** tool family:

- **Free point**:
  - **Description**: Creates a point at an arbitrary location on the active plane.
  - **Steps**: 
    1. Activate the free point tool.
    2. Click at the desired location in the 2D view.
  - **Result**: A new point entity is created at the clicked coordinates on the active plane.

- **Point on element**:
  - **Description**: Creates a point constrained to lie on an existing element (line, segment, or circle).
  - **Steps**:
    1. Activate the point-on-element tool.
    2. Select the host element (line/segment/circle).
    3. Click at the desired position along the element.
  - **Result**: A new point entity is created, constrained to remain on the host element.
  - **Dependency**: The point moves with the host element but can slide along it.

- **Intersection point**:
  - **Description**: Creates a point at the intersection of two elements.
  - **Steps**:
    1. Activate the intersection point tool.
    2. Select the first element.
    3. Select the second element.
  - **Result**: A new point entity is created at the intersection. If multiple intersections exist, the system may prompt for selection or create all intersection points.
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

**Circle** tool family:

- **Circle by center and point**:
  - **Description**: Creates a circle defined by its center and a point on the circumference.
  - **Steps**:
    1. Activate the circle-center-point tool.
    2. Specify the center point (click on existing point, intersection, or empty space).
    3. Specify a point on the circumference (click on existing point, intersection, or empty space).
  - **Result**: A new circle entity is created with the specified center and radius (distance from center to the second point). Any automatically created points are recorded as auxiliary actions.
  - **Dependency**: The circle updates if the center or the circumference point moves.

- **Circle by center and radius**:
  - **Description**: Creates a circle with a specified center and a numeric radius value.
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

Contains dihedral-specific tools related to hinge lines (HL), guides, and transport operations between projection planes.

**Guide** tool:

- **Create guide from HL and point**:
  - **Description**: Creates a guide line perpendicular to a hinge line and passing through a point on the active plane.
  - **Steps**:
    1. Activate the create-guide tool.
    2. Select a hinge line (HL).
    3. Specify a point on the active plane (click on existing point, intersection, or empty space).
  - **Result**: A new guide entity is created that:
    - is perpendicular to the selected HL,
    - passes through the specified point,
    - belongs to both projection planes associated with the HL.
  - Any automatically created point is recorded as an auxiliary action.
  - **Purpose**: Guides enable explicit transport of geometric information between planes.
  - **Dependency**: The guide updates if the HL or the defining point moves.

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

- **Chained transport**:
  - **Description**: Performs a transport operation through multiple planes using a sequence of hinge lines that share a common plane.
  - **Steps**:
    1. Activate the chained-transport tool.
    2. Select the first hinge line.
    3. Select the second hinge line (must share a plane with the first).
    4. Select the point or distance to transport.
  - **Result**: The geometry is transported through the intermediate plane to the final destination plane.
  - **Scope**: May involve auxiliary planes in later versions; MVP focuses on two-step chains.
  - **Purpose**: Supports classical chained transport constructions used in dihedral drawing exercises.

These tools operate on 2D planes, HL, guides, and explicit 2D entities; they do not directly edit 3D geometry.

#### 3D Creation Toolbar (Derived from 2D)

Contains tools to define 3D elements from existing 2D constructions. All operations require explicit selection of the required compatible projections/traces. These tools produce derived 3D geometry for spatial visualization; the 2D projections remain the source of truth.

**3D Point** tool:

- **Create 3D point from projections**:
  - **Description**: Defines a 3D point from two compatible 2D point projections on different planes.
  - **Steps**:
    1. Activate the 3D-point tool.
    2. Select a point on the first projection plane (e.g., `a_H` on `P_H`).
    3. Select the corresponding point on the second projection plane (e.g., `a_V` on `P_V`).
  - **Result**: A new 3D point entity (e.g., `A`) is created and visualized in the 3D overlay, linked to its 2D projections.
  - **Compatibility**: The selected 2D points must be geometrically compatible according to dihedral projection rules (e.g., aligned perpendicular to the hinge line).
  - **Infeasibility**: If the projections are incompatible, no 3D point is created, immediate non-modal feedback is provided, and no action entry is added to history.
  - **Dependency**: The 3D point updates if either 2D projection moves.

**3D Line** tool:

- **Create 3D line from projections**:
  - **Description**: Defines a 3D line from two compatible 2D line projections.
  - **Steps**:
    1. Activate the 3D-line tool.
    2. Select a 2D line on the first projection plane.
    3. Select the corresponding 2D line on the second projection plane.
  - **Result**: A new 3D line entity is created and visualized in the 3D overlay.
  - **Compatibility**: The 2D lines must represent projections of the same 3D line according to dihedral rules.
  - **Infeasibility**: If the projections are incompatible, no 3D line is created and feedback is provided.
  - **Dependency**: The 3D line updates if either 2D projection changes.

**3D Segment** tool:

- **Create 3D segment from projections**:
  - **Description**: Defines a 3D segment from two compatible 2D segment projections with corresponding endpoints.
  - **Steps**:
    1. Activate the 3D-segment tool.
    2. Select a 2D segment on the first projection plane.
    3. Select the corresponding 2D segment on the second projection plane.
  - **Result**: A new 3D segment entity is created and visualized in the 3D overlay.
  - **Compatibility**: The 2D segments must represent projections of the same 3D segment, and their endpoints must correspond correctly.
  - **Endpoint correspondence**: The system checks that endpoints map consistently between projections.
  - **Infeasibility**: If the segments are incompatible or endpoints do not correspond, no 3D segment is created and feedback is provided.
  - **Dependency**: The 3D segment updates if either 2D projection changes.

**3D Plane** tool:

- **Create 3D plane from traces**:
  - **Description**: Defines a 3D plane from its traces (intersection lines) on two projection planes.
  - **Steps**:
    1. Activate the 3D-plane tool.
    2. Select the trace on the first projection plane (e.g., the horizontal trace).
    3. Select the trace on the second projection plane (e.g., the vertical trace).
  - **Result**: A new 3D plane entity is created and visualized in the 3D overlay as a bounded or semi-infinite surface.
  - **Compatibility**: The traces must be compatible according to dihedral projection rules (typically intersecting at the hinge line).
  - **Infeasibility**: If the traces are incompatible, no 3D plane is created and feedback is provided.
  - **Dependency**: The 3D plane updates if either trace changes.

**General behavior for invalid 3D creation**:

If the selection does not define a valid 3D element:

- no element is created,
- the user receives immediate non-modal feedback (visual indicators, status message),
- the infeasibility is reflected visually in the panels (no modal error dialogs),
- no action entry is added to history (the invalid attempt is blocked and ignored).

### Left-Side Stacked Panels

All panels are located on the left side and are stackable and collapsible.

#### Constructive Actions Panel

- Shows the history of performed actions, organized hierarchically by subprocesses.
- **Auxiliary actions**: When a tool automatically creates supporting geometry (e.g., free points or intersection points during segment creation), these appear as nested auxiliary actions within the main action. For example:
  ```
  ▼ Create segment s1
    └─ Create free point p1 (auxiliary)
    └─ Create free point p2 (auxiliary)
  ```
- Allows expanding/collapsing subprocesses and individual actions to show/hide auxiliary actions.
- Hover behavior uses unified hover highlighting (focus element, direct ancestors, direct descendants).
- Auxiliary actions can be hovered and inspected individually, but are visually distinguished from primary actions (e.g., with indentation and different styling).

#### Elements Panel

- Lists items in two main sections:
  - **2D**: constructed 2D elements, grouped by nature (e.g., points, lines, segments, circles, guides).
  - **3D**: derived 3D elements, grouped by nature (e.g., points, lines, segments, planes), plus **projection planes**.
  - Types that do not make sense in 2D (notably planes and projection planes) MUST appear only under **3D**.
- Hover behavior is identical to the actions panel (unified hover highlighting).
- Hovering a plane entry highlights the corresponding plane representation.
- Clicking an item opens the element properties dialog.

### Dialogs and Controls

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

- No modal error dialogs.
- Invalid/infeasible actions are reflected visually in panels and highlighting.
- The user corrects geometry directly by adjusting inputs.

### Accessibility and Usability Expectations

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

1. **Given** the application is open, **When** I create a new drawing, **Then** I get a clean workspace with at least two default projection planes and their hinge line, and one plane is clearly marked as active.
2. **Given** I have an existing saved drawing, **When** I open it, **Then** the workspace restores its planes, elements, action history, dependency relationships, and view settings.
3. **Given** I make changes to a drawing, **When** the changes occur, **Then** the system persists them automatically without requiring an explicit save action.

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

### User Story 4 - Define 3D Elements from 2D Projections (Priority: P3)

As a learner, I want to define 3D points/lines/segments/planes from compatible 2D projections and view them in an auxiliary 3D view so that I can build spatial understanding while keeping 2D construction as the source of truth.

**Why this priority**: A read-only 3D view helps comprehension but must not replace the learning process; 3D is derived, not edited.

**Independent Test**: Can be tested by selecting compatible 2D projections to create a 3D point, observing it in the 3D view, and verifying 3D elements cannot be edited directly.

**Acceptance Scenarios**:

1. **Given** two compatible 2D projections of the same point on different planes, **When** I create a 3D point, **Then** the 3D point appears in the 3D view and is linked to its projections.
2. **Given** two incompatible 2D projections selected for a 3D element, **When** I attempt creation, **Then** no 3D element is created, I receive immediate non-modal feedback, and no new action entry is added to history.
3. **Given** the 3D view, **When** I rotate/pan/zoom it, **Then** the view changes but no geometry can be selected or edited.

---

### User Story 5 - Inspect the Process and Dependencies (Priority: P4)

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
- **Option 2 (explicit points first)**: Use "Intersection point" tool to create points where the line intersects with other elements (or use "Point on element" to create points directly on the line), then use "Segment between existing points" tool to connect them.
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

20. **3D element creation success**
  - **Given** compatible 2D projections are selected, **When** I run a 3D creation tool, **Then** the 3D element is created and visible in the 3D overlay.

21. **3D element creation invalid selection**
  - **Given** incompatible projections are selected, **When** I run a 3D creation tool, **Then** no 3D element is created and I receive immediate non-modal feedback.

22. **Autosave on change**
  - **Given** a project is open, **When** I create or modify geometry, **Then** the project is persisted automatically without an explicit save action.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a primary 2D workspace where multiple projection planes can be displayed.
- **FR-002**: The system MUST allow selecting exactly one active projection plane; new 2D elements MUST be created on the active plane.
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
- **FR-027**: The system MUST automatically persist project changes without requiring the user to explicitly save.
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

### Assumptions

- The MVP includes at least two default projection planes (Horizontal and Vertical) and their hinge line.
- Additional projection planes may be added later; this specification focuses on the minimum dihedral learning loop.
- The application is a web-based interactive tool; a backend service may be used for project persistence.
- The MVP does not attempt to “fix” user mistakes; it surfaces infeasibility instead.

### Key Entities *(include if feature involves data)*

- **Project**: A saved workspace containing planes, elements, actions, dependencies, and view settings.
- **ProjectionPlane**: A named 2D drawing surface that can be active/inactive and visible/hidden.
- **HingeLine (HL)**: The intersection line shared by two projection planes.
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

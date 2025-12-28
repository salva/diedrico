# User Interface Specification

**Version**: 1.0.0  
**Created**: 2025-12-28  
**Status**: Active

---

## Purpose and Scope

This document specifies the user interface architecture, layout, and interaction patterns for the Diedrico application. It describes the visual structure, component organization, and behavioral patterns that govern how users interact with the system.

**Relationship to Other Documents**:
- **spec.md**: Provides detailed tool behaviors, functional requirements, and user scenarios. This document references spec.md for specifics while focusing on UI structure and interaction patterns.
- **constitution.md**: Establishes architectural principles including pedagogical transparency and principle-based rendering, which directly influence UI design decisions.

**Key Architectural Principle**: The UI presents a **dynamic view** of the world data structures. All geometric elements, projection planes, guides, and relationships are rendered using geometric first principles derived from the world model. There is NO special-case rendering logic for specific planes or elements (except for initial world elements: P_H, P_V, origin O, which are created during initialization but thereafter treated as regular world elements).

---

## Overall Layout Architecture

The application interface is organized into five primary regions:

```
┌─────────────────────────────────────────────────────────────┐
│  Top Toolbars (Tool families, active plane, navigation)     │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                   │
│  Left    │                                                   │
│  Panel   │         Main Viewport (2D Drawing Area)          │
│  Stack   │         - All projection planes visible          │
│          │         - Active plane emphasized                 │
│  ┌────┐  │         - Dynamic grid                            │
│  │ W  │  │         - Pan/zoom always available              │
│  │ o  │  │                                                   │
│  │ r  │  │                                          ┌─────┐  │
│  │ l  │  │                                          │     │  │
│  │ d  │  │                                          │ 3D  │  │
│  ├────┤  │                                          │View │  │
│  │ P  │  │                                          │     │  │
│  │ r  │  │                                          └─────┘  │
│  │ o  │  │                                    (resizable,    │
│  │ c  │  │                                     movable)      │
│  │ e  │  │                                                   │
│  │ s  │  │                                                   │
│  │ s  │  │                                                   │
│  └────┘  │                                                   │
│          │                                                   │
└──────────┴──────────────────────────────────────────────────┘
```

### Layout Principles

1. **Fixed Component Positioning**:
   - Top toolbars: Always at top, full width
   - Left panel stack: Fixed to left edge, vertically stacked
   - Main viewport: Fills remaining space (center-right)
   - 3D view: Overlay on bottom-right corner of viewport (default)

2. **Responsive Behavior**:
   - Panels collapse to icons when horizontal space is limited
   - Toolbars may reorganize or use overflow menus on narrow screens
   - 3D view maintains aspect ratio during resize
   - Minimum viewport size enforced to ensure usability

3. **Visual Hierarchy**:
   - Main viewport is the visual focus (largest area)
   - Toolbars provide immediate access to primary actions
   - Left panels provide context and secondary controls
   - 3D view is auxiliary (helps understanding but not required for construction)

---

## Left Panel Stack

The left side of the interface contains a vertical stack of two panels. These panels provide access to the world state and construction history.

### Panel Management

- **Stacking**: Panels are arranged vertically, one above the other
- **Resizing**: A horizontal splitter between panels allows adjusting relative heights
- **Collapsing**: Each panel can be collapsed to a minimal state (title bar only) via a collapse button
- **Minimum Sizes**: Collapsed panel: ~30px height. Expanded panel: minimum 150px height
- **State Persistence**: Panel sizes and collapse states are saved per project

### World Elements Panel

**Purpose**: Lists all geometric entities in the world, organized by type and dimensionality.

**Tree Structure**:
```
▼ 2D Elements
  ▼ Points (5)
    • a_H, b_H, c_H, d_V, e_V
  ▼ Lines (3)
    • r1, r2, r3
  ▼ Segments (2)
    • s1, s2
  ▼ Circles (1)
    • c1
  ▼ Guides (2)
    • g1, g2
▼ 3D Elements
  ▼ Points (2)
    • A, B
  ▼ Lines (1)
    • L1
  ▼ Segments (1)
    • S1
  ▼ Planes (4)
    • P_H (horizontal projection plane)
    • P_V (vertical projection plane)
    • Pi1 (auxiliary plane)
    • Pi2 (auxiliary plane)
```

**Organization Rules**:
- **Two Main Sections**: 2D Elements, 3D Elements
- **Grouping by Nature**: Within each section, elements are grouped by type (points, lines, segments, circles, arcs, guides for 2D; points, lines, segments, planes for 3D)
- **Projection Planes**: Listed ONLY under 3D section (they are 3D geometric planes, even though they host 2D constructions)
- **Dynamic Counts**: Each group shows element count in parentheses
- **Alphabetical/Creation Order**: Within each group, elements sorted by creation time or alphabetically by name

**Interactions**:
- **Click**: Opens element properties dialog (see Dialogs section)
- **Hover**: Triggers unified hover highlighting (see Visual Feedback section below)
- **Right-Click** (future): Context menu for element operations
- **Drag** (future): Reorder or organize elements

**Visual Indicators**:
- **Infeasible elements**: Strikethrough text or red icon
- **Hidden elements**: Lighter/grayed text or eye-closed icon
- **Active plane elements**: May be marked with subtle badge or emphasis

**Rendering Principle**: This panel reflects the current state of `world.elements2D[]` and `world.elements3D[]`. All elements are displayed dynamically based on their existence in the world model. There is no hard-coded list of what appears here.

### Process Tree Panel (Constructive Actions)

**Purpose**: Shows the hierarchical construction history—the sequence of actions that built the current world state.

**Tree Structure** (example):
```
▼ 👁 Root Process
  ▼ 👁 Construction Phase 1
    ○ Create segment s1
    ▼ ⚙ Auxiliary (2 actions)       ← ActionGroup with special styling
      ⋅ Create free point a
      ⋅ Create free point b
    ○ Create circle c1
  ▼ 👁 Guide Setup
    ○ Create guide g1
    ○ Transport point via guide
  ▼ 👁 3D Elements
    ○ Create 3D point A
    ○ Create 3D line L1
```

**Node Types**:

1. **Subprocess** (container with name):
   - Has 👁 visibility toggle icon (controls drawing visibility of all descendant elements)
   - Can contain other Subprocesses or ActionGroups (mixed)
   - Has collapse/expand triangle (controls panel visibility)
   - Can be renamed by user
   - Defines default visual style inherited by contained elements

2. **ActionGroup** (container without user-visible name):
   - NO visibility toggle (inherits visibility from parent Subprocess)
   - Can contain only Actions (at least one)
   - Has collapse/expand triangle (controls panel visibility)
   - Two variants:
     - **Regular**: User-created groups, displayed with normal bullet (○)
     - **Auxiliary**: Auto-created for supporting geometry, displayed with gear icon (⚙), lighter color, possibly indented or boxed

3. **Action** (leaf node):
   - Represents single user operation or automatically-created supporting action
   - Displayed as single line with action description (e.g., "Create segment s1")
   - Bullet style may vary (○ for regular, ⋅ for auxiliary actions)
   - Cannot contain children

**Visual Treatment**:

- **Regular Subprocess**: 
  - Normal font weight
  - Eye icon for visibility toggle
  - Collapse triangle
  - User-editable name
  
- **ActionGroup (Regular)**:
  - Normal font weight
  - Simple bullet (○)
  - Collapse triangle
  - No name displayed (contents define the group)
  
- **ActionGroup (Auxiliary)**:
  - Lighter text color (#666 vs #000)
  - Gear icon (⚙) or special bullet
  - Collapse triangle
  - May show count when collapsed: "⚙ Auxiliary (2 actions)"
  - Visual grouping: subtle border, indentation, or background color
  - Properties locked (cannot edit or reorganize)

  - Visual grouping: subtle border, indentation, or background color
  - Properties locked (cannot edit or reorganize)

**Two Types of Visibility**:

1. **Drawing Visibility** (in the 2D/3D workspace):
   - Controlled by Subprocess eye icon (👁) only
   - Toggles whether geometric elements appear in viewport
   - Cascades down tree (hiding subprocess hides all descendant elements)
   - ActionGroups have NO independent control (inherit from parent)
   - State stored in: `subprocess.visible` field

2. **Panel Visibility** (in this panel UI):
   - Controlled by collapse/expand triangle (▼/▶)
   - Shows/hides nested content in this panel only
   - Independent from drawing visibility
   - Both Subprocesses and ActionGroups can collapse/expand
   - State stored in: `ViewState.panelCollapseState`

**Interactions**:
- **Click eye icon**: Toggle drawing visibility (Subprocess only)
- **Click triangle**: Toggle panel collapse/expand
- **Click name/description**: Select/focus that node
- **Hover**: Triggers unified hover highlighting
- **Double-click** (future): Rename Subprocess
- **Drag** (future): Reorganize tree structure

**Rendering Principle**: This panel reflects the current state of `world.processTree`. The tree structure is rendered dynamically by traversing the ProcessTree data structure. There is no hard-coded layout for specific subprocesses or actions.

### Unified Hover Highlighting

When hovering over items in EITHER panel (World Elements or Process Tree), the system provides **unified visual feedback** across the entire UI:

**Highlighting Categories**:
1. **Focus Element**: The hovered item itself (bold highlight)
2. **Direct Ancestors**: Elements/actions that this item depends on (subtle highlight, upstream indicators)
3. **Direct Descendants**: Elements/actions that depend on this item (subtle highlight, downstream indicators)
4. **Infeasible Elements**: If focus is infeasible, show propagation of infeasibility

**Visual Indicators**:
- Highlighted in both panels simultaneously
- Highlighted in viewport (geometry rendered with highlight color/thickness)
- Dependency lines or arrows may appear in panels (optional)
- Color coding: Focus (bright), ancestors (blue tint), descendants (green tint), infeasible (red)

**Behavior**:
- Immediate (no delay)
- Temporary (clears on mouse-out)
- Non-destructive (does not affect selection state)

---

## Top Toolbar System

The toolbar region at the top of the application provides access to all primary construction and manipulation tools.

### Toolbar Organization

The toolbars are organized into distinct groups, each focused on a specific category of operations:

```
┌──────────────────────────────────────────────────────────────┐
│ [File] [Active Plane: P_H ▼] │ [Point▼] [Segment▼] [Line▼]  │
│                                [Circle▼] [Arc▼]               │
│                                │ [Guide▼] [Transport▼]        │
│                                │ [3D Point▼] [3D Line▼] [...]│
│                                │ [Pan] [Zoom] [Fit]           │
└──────────────────────────────────────────────────────────────┘
```

**Groups** (left to right):

1. **File/Project Controls**: New, Open, Save, Export (basic project management)
2. **Active Plane Selector**: Dropdown showing current active plane and list of all available planes
3. **2D Drawing Tools**: Point, Segment, Line, Circle, Arc tools (each with sub-tool dropdowns)
4. **Dihedral Tools**: Guide, Transport tools (specific to multi-plane operations)
5. **3D Creation Tools**: 3D Point, 3D Line, 3D Segment, 3D Plane (derive 3D from 2D projections)
6. **Navigation Tools**: Pan, Zoom, Fit View (explicit navigation controls)

**Layout Behavior**:
- Single horizontal row on wide screens
- May wrap or use overflow menu ("More ⋮") on narrow screens
- Separators (│) between groups for visual organization
- Tool groups may collapse to single icon + dropdown on very narrow screens

### Toolbar Interaction Model

The toolbar system follows a structured interaction pattern designed to make geometric reasoning explicit and unambiguous. This model is detailed in the sections below and expanded further in spec.md.

#### Single Active Tool

At any moment, **exactly one tool is active**.

- The active tool determines:
  - How mouse clicks are interpreted in the viewport
  - Which element types can be selected
  - Which actions are allowed
- While a tool is active, clicks are **not interpreted as generic selection**, but as inputs to complete the tool's operation.

**Visual Indication**:
- Active tool button: Pressed/highlighted state (e.g., darker background, border, or check mark)
- Status bar message: "Step 1: Select first point" or similar
- Cursor change: May change to indicate expected input
- Valid elements: May be highlighted or have hover glow when tool expects them

**State Persistence**:
- Active tool state persists until:
  - Tool operation completes successfully
  - User explicitly cancels (ESC key or Cancel button)
  - User selects a different tool
- Tool does NOT deactivate when user navigates (pan/zoom)

#### Tool Families and Sub-Tools

Tools are grouped into **functional families**, each represented by a primary button with a dropdown menu:

**Example: Point Tool Family**
```
[Point ▼]
  ├─ Free Point
  ├─ Intersection Point
  ├─ Point on Element
  └─ Midpoint
```

**Behavior**:
- Click button: Activates the last-used sub-tool from that family
- Click dropdown arrow: Shows menu of all sub-tools in family
- Select sub-tool from menu: Activates that sub-tool and updates button face
- Button face shows currently active sub-tool (icon + optional label)

**Benefits**:
- Compact toolbar (fewer top-level buttons)
- Groups conceptually related operations
- Makes user intent explicit (user chooses specific variant)
- Last-used sub-tool becomes default for efficiency

#### Sequential Interaction Flow

Each tool defines an **explicit sequential flow** of steps:

1. **Tool Activation**: User selects tool from toolbar
2. **Step 1**: System prompts for first input (e.g., "Select first point")
3. **User Input**: User provides input (click, type value, select element)
4. **Validation**: System validates input
5. **Step 2**: If valid, system prompts for next input
6. **Repeat**: Continue until all steps completed
7. **Execution**: Create element, record action, provide feedback

**Key Characteristics**:
- Each step expects a **specific type of input** (point, line, numeric value, etc.)
- User **cannot skip steps** (must complete each in order)
- System always knows:
  - Current step number and total steps
  - What input type is expected
  - What inputs are valid at current step

**Visual Feedback During Flow**:
- Step indicator: "Step 2 of 3: Select second point"
- Preview: Dynamic preview of result (e.g., line following cursor after first point selected)
- Valid elements: Highlighted when cursor hovers (if applicable)
- Snap indicators: Visual feedback when cursor near valid snap targets

#### Valid Input Restriction

While a tool is active:
- **Only valid elements** for the current step can be selected
- Valid elements are visually indicated (hover glow, highlight outline)
- Invalid elements are **ignored** (no hover effect, click has no effect)
- This **prevents errors** and **reinforces learning** (users understand what inputs are geometrically valid)

**Example**: 
- Tool: "Parallel Line Through Point"
- Step 1: Select reference line → Only lines/segments respond to hover/click
- Step 2: Select point → Only points respond to hover/click

#### Continuous Visual Feedback

The system provides **constant feedback** during tool operation:

1. **Cursor Feedback**:
   - Changes shape based on context (crosshair, pointer, hand, etc.)
   - Snaps to valid targets within snap radius
   - Shows preview of action result

2. **Element Highlighting**:
   - Valid elements: Glow or outline on hover
   - Snap targets: Bright highlight when within snap radius
   - Intersection markers: Small circle/crosshair at intersection points

3. **Dynamic Preview**:
   - After first input: Show preview of final result following cursor
   - Preview updates in real-time as cursor moves
   - Preview snaps to valid targets (e.g., line preview snaps to existing points)

4. **Status Messages**:
   - Top of viewport or bottom status bar
   - Clear, brief instruction: "Step 2: Click to place second endpoint"
   - Updates immediately after each step

5. **Snap Indicators** (detailed):
   - **Point Snap**: When cursor within snap radius of existing point:
     - Cursor jumps to exact point location
     - Point highlighted with bright outline or glow
     - Color: #FF6B35 (orange) per spec
   - **Intersection Snap**: When cursor near intersection:
     - Both intersecting elements highlighted
     - Small marker (circle/crosshair) at intersection point
     - Clicking creates intersection point automatically
   - **Empty Space**: When cursor over empty area:
     - Normal crosshair cursor
     - Clicking creates free point at cursor location

**Pedagogical Value**: Feedback guides the user without making decisions for them. Users learn what inputs are valid and why.

#### Explicit Result Creation

Upon completing all tool steps successfully:

1. **Element Creation**: New element(s) created in world model
2. **Action Recording**: Action recorded in ProcessTree with all parameters and dependencies
3. **Auxiliary Actions**: Any auto-created supporting elements (intersection points, free points) recorded as nested auxiliary actions within ActionGroup
4. **Visual Confirmation**: New element(s) appear in viewport and panels
5. **Tool State**: Tool may remain active (for repetition) or return to neutral state (depending on tool design)

**No Implicit Entities**: The system never creates hidden or implicit elements. Every element exists explicitly in the world model and appears in the World Elements panel.

#### Completion and Repetition

After successful operation completion:

**Option A: Tool Remains Active** (for frequently repeated operations like points, segments):
- Tool stays active with same settings
- User can immediately perform same operation again
- Explicit deactivation required (ESC, select different tool, or explicit "Done" button)

**Option B: Tool Returns to Neutral** (for infrequent or complex operations):
- Tool deactivates automatically after completion
- Cursor returns to selection mode
- User must reactivate tool for another operation

**Consistency**: Each tool family has consistent behavior (all point tools use same pattern, all transport tools use same pattern, etc.)

#### Operation Cancellation

User can cancel active tool at any time:

**Cancel Methods**:
- Press `ESC` key (primary method)
- Click "Cancel" button in toolbar/status area (if visible)
- Click different tool (switches to new tool, cancels previous)

**Cancel Behavior**:
- Partial selections discarded
- No elements created
- No action recorded in history
- System returns to coherent state (previous tool or neutral state)
- Any preview graphics removed

**No Undo Needed**: Since no action was recorded, cancellation doesn't affect undo/redo stack.

#### Separation of Navigation and Construction

Navigation actions (pan, zoom, fit) are **conceptually separate** from construction tools:

**Always Available**:
- `Shift + Drag`: Pan
- `Mouse Wheel`: Zoom
- These work **even when a tool is active**

**Non-Interrupting**:
- Using navigation does NOT cancel active tool
- Tool state is preserved (current step, previous selections retained)
- After navigation, user continues where they left off

**Explicit Navigation Tools** (toolbar buttons):
- Provide same functionality for users who prefer buttons over shortcuts
- Also do not cancel active tool
- "Fit View" button resets zoom/pan to show all content

**Pedagogical Value**: Allows working on complex drawings without constant tool reactivation. Reduces frustration, maintains flow.

#### Absence of Hidden Inferences

The toolbar system **does not introduce implicit inferences**:

**What is NOT allowed**:
- Automatically creating points from approximate clicks near elements (unless at intersection)
- Combining arbitrary positions with geometric constraints silently
- "Fixing" user input to match geometric requirements
- Creating construction geometry without user awareness

**What IS allowed** (explicit exceptions, recorded as auxiliary actions):
1. **Intersection Point Auto-Creation**: Clicking visible intersection automatically creates intersection point (recorded in history)
2. **Free Point Auto-Creation**: Clicking empty space during point-expecting step automatically creates free point (recorded in history)

**Requirement**: All automatically created elements MUST appear as auxiliary actions in the ProcessTree, clearly distinguishing them from manually created primary elements.

**Pedagogical Value**: Every entity used as input must exist explicitly. Each construction reflects exactly the user's decisions. Students understand the complete dependency chain.

---

## Main Viewport (2D Drawing Area)

The main viewport is the primary work surface where all geometric constructions are performed and visualized.

### Dynamic Rendering Architecture

**Core Principle**: All viewport content is **dynamically derived** from the world data structures using geometric first principles. There is NO special-case rendering code for specific planes or elements.

**Rendering Pipeline**:
1. **World State**: Read current state from `world.planes[]`, `world.elements2D[]`, `world.elements3D[]`, `world.hingeLines[]`, `world.guides[]`
2. **Realization Computation**: For each element, compute current geometric realization using:
   - Element's defining relations (dependencies, construction parameters)
   - Realization cache (if valid) or recompute (if stale)
   - Geometric algorithms: intersection calculation, parallel construction, circle through points, etc.
3. **Coordinate Transformation**: Transform from plane intrinsic coordinates (u,v) to canvas pixel coordinates:
   - Apply `plane.transform_to_canvas` (2D affine matrix)
   - Apply `viewport_transform` (global pan/zoom)
4. **Rendering**: Create SVG primitives (paths, circles, points) from transformed coordinates
5. **Styling**: Apply visual styles based on:
   - Element's explicit style override (if any)
   - Inherited style from containing subprocess (if no override)
   - Default style (if no inheritance)
   - Active plane emphasis (full opacity vs. reduced opacity)

**Special Cases** (initial elements only):
- Projection planes `P_H` and `P_V`: Created during world initialization as `Plane3D` entities
- Origin point `O`: Created during world initialization as `Point3D` entity at (0, 0, 0)
- Hinge line `HL_HV`: Created during world initialization as intersection of P_H and P_V

**After initialization, these are treated like any other element**: same rendering pipeline, same geometric computations, no hard-coded paths.

**Scalability**: When auxiliary planes, profile planes, or custom projection planes are added, they work automatically through this architecture. No code changes required.

### Projection Plane Layout

**Multi-Plane Display**:
- **All projection planes are displayed simultaneously** in the viewport
- Default layout positions planes to represent dihedral (unfolded) configuration
- Planes arranged around shared hinge lines to create recognizable Monge layout

**Example Default Layout** (for P_H and P_V):
```
 ─────────────────── HL_HV (hinge line, horizontal)
         P_V                    P_H elements render here
      (vertical)                (coordinates transformed
      elements                   from plane's u,v space)
      render here
```

**Layout Properties** (stored in `ProjectionPlane.transform_to_canvas`):
- P_H positioned above hinge line (unfolded upward)
- P_V positioned below hinge line (unfolded downward)
- Transforms ensure proper spacing and prevent overlap
- Auxiliary planes positioned according to their geometric relationships

**Dynamic Addition of Planes**:
- When new projection plane created (auxiliary, profile), system computes `transform_to_canvas` based on:
  - Plane's geometric definition (`Plane3D`)
  - Plane's trace intersections with existing planes
  - Avoidance of overlap with existing planes
- No manual layout positioning required (derived from geometry)

### Active Plane System

**Active Plane Purpose**: Determines where new 2D elements are created.

**Visual Emphasis**:
- **Active plane elements**: Rendered at full intensity/opacity (100%)
- **Non-active plane elements**: Rendered with reduced opacity (50%) and potentially lighter colors
- **Hinge lines**: Always rendered at full intensity (they belong to multiple planes)
- **Plane surfaces** (in 3D view): Active plane may have subtle highlight

**Changing Active Plane**:
- Method: Click plane in Active Plane Selector dropdown (toolbar)
- Effect:
  - Previous active plane elements de-emphasized (opacity reduced)
  - New active plane elements emphasized (opacity increased)
  - No geometry modified
  - No planes hidden (all remain visible)
- Animation: Brief transition animation (opacity fade) for visual continuity

**Important**: Active plane affects ONLY visual emphasis and creation target. It does NOT control visibility (all planes always visible in MVP).

### Background Grid (Optional)

**Purpose**: Provides measurable visual reference for geometric construction.

**Grid Properties**:
- **Toggle**: Can be enabled/disabled (checkbox in view menu or toolbar)

**Grid Properties**:
- **Toggle**: Can be enabled/disabled (checkbox in view menu or toolbar)
- **Spacing**: Adapts to zoom level (e.g., 10 units at low zoom, 50 units at high zoom)
- **Visual Style**: Light gray lines (#E0E0E0 or similar), subtle to avoid interfering with geometry
- **Major Lines**: Every 5th or 10th line slightly emphasized (darker gray)
- **Coordinate Labels**: Optional tick marks or labels at regular intervals showing coordinate values
- **Axes**: Optional origin axes (X, Y) with arrow indicators

**Grid Behavior**:
- **Visual reference only**: Does NOT affect snapping or geometric computations
- **Dynamic**: Grid updates automatically during pan/zoom to maintain readable spacing
- **Per-Project**: Grid visibility preference saved with project
- **Coordinate System**: Grid aligned with active plane's intrinsic (u,v) coordinate system

**Rendering**: Grid is rendered as bottom-most SVG layer (drawn first, elements drawn on top).

### Navigation Controls

**Always-Available Shortcuts**:
- **Pan**: `Shift + Left Drag` (hold Shift, drag mouse)
- **Zoom**: `Mouse Wheel` (scroll up = zoom in, scroll down = zoom out)

**Toolbar Buttons** (for users who prefer explicit controls):
- **Pan Tool**: Click to activate, then drag without Shift key
- **Zoom In**: Click to zoom in one step
- **Zoom Out**: Click to zoom out one step
- **Fit View**: Click to reset zoom/pan to show all content

**Navigation Behavior**:
- Does NOT cancel active tool (construction continues after navigation)
- Does NOT modify geometry
- Affects only viewport transform (global pan/zoom matrix)
- Center of zoom: Mouse cursor position (zoom toward cursor)

**Zoom Limits**:
- Minimum zoom: Show all planes and elements (auto-computed)
- Maximum zoom: Close inspection level (e.g., 10,000% of default scale)

### Element Interaction

**Selection** (when no tool active):
- Click element: Select (highlight, properties panel updates)
- Click + Shift: Add to selection (multi-select)
- Click empty space: Deselect all
- Drag rectangle: Area selection (select all elements within rectangle)

**Hover Highlighting** (dependency mode):
- Enable via checkbox or toggle button
- Hover element: Triggers unified hover highlighting (see Left Panel section)
- Shows element's dependencies in panels and viewport
- Non-destructive (doesn't change selection)

**Element Properties**:
- Double-click element: Open properties dialog (quick access)
- Right-click element: Context menu with common actions

**During Tool Operation**:
- Selection behavior determined by active tool
- Valid elements highlighted on hover
- Invalid elements ignored
- Snap feedback provided (see Toolbar Interaction Model section)

### Status and Feedback Overlays

**Status Bar** (bottom of viewport or top, depending on design):
- Current tool and step: "Segment Tool: Step 2 of 2 - Click second endpoint"
- Cursor coordinates: "u=125.3, v=84.7 (Plane: P_H)"
- Selection info: "3 elements selected"
- Warnings: "Element s1 is infeasible (check dependencies)"

**Snap Indicators** (overlaid on viewport):
- Point snap: Orange circle (#FF6B35) around snapped point
- Intersection marker: Orange crosshair or circle at intersection
- Snap target distance: Optional small label showing distance

**Infeasibility Indicators** (overlaid on elements):
- Infeasible elements: Rendered with red tint, dashed stroke, or icon overlay
- Propagation: Descendants of infeasible elements also marked
- Hover: Tooltip or status message explaining infeasibility cause

---

## 3D View Overlay

The 3D view is a **read-only auxiliary visualization** that helps users understand the spatial relationships of the dihedral construction.

### Positioning and Layout

**Default Position**: Bottom-right corner of main viewport

**Overlay Properties**:
- Rendered as HTML `<div>` with CSS absolute positioning overlaid on viewport canvas
- Default size: ~300×300px (or 20% of viewport width/height, whichever is smaller)
- Semi-transparent title bar with minimize/close buttons
- Contains Three.js canvas for 3D rendering

**Visual Appearance**:
- Subtle border to distinguish from 2D viewport
- Semi-transparent background or solid depending on user preference
- Title bar: "3D View" with control icons
- Optional coordinate axes indicator (XYZ axes in corner)

### Resizing and Movement

**Resize**:
- Drag handles on corners and edges (standard window resize pattern)
- Minimum size: 150×150px
- Maximum size: 80% of main viewport dimensions
- Maintains aspect ratio: Optional (can be square or rectangular)
- Resize state saved per project

**Movement**:
- Drag from title bar to move
- Can be positioned anywhere over main viewport
- Snaps to corners/edges when close (magnetic snapping)
- Cannot be moved outside viewport bounds
- Position saved per project

**Collapse/Minimize**:
- Minimize button: Collapses to small icon in corner (title bar only visible)
- Click icon to restore
- Close button: Hides 3D view entirely (can be reopened from menu)

### Camera Controls

**Rotation** (primary interaction):
- **Left Drag**: Rotate camera around center (orbiting)
- Uses Three.js OrbitControls
- Center of rotation: Computed from visible elements (or origin if empty)
- Auto-updates when elements added/removed

**Pan**:
- **Shift + Left Drag**: Pan camera (translate view)
- Middle mouse drag: Alternative pan method

**Zoom**:
- **Mouse Wheel**: Zoom in/out
- Pinch gesture (if touchpad): Zoom
- Zoom limits: Prevent too close (clipping) or too far (elements too small)

**Reset View**:
- Button in 3D view controls or double-click canvas
- Resets camera to default position (isometric or similar)
- Auto-frames all visible elements

### Display Options

**Projection Plane Surfaces**:
- Toggle: Show/hide projection plane surfaces in 3D view
- Rendering: Semi-transparent rectangles or bounded regions
- Color: Match plane's assigned color, with transparency
- Active plane: May have subtle highlight

**2D Elements on Planes**:
- Toggle: Show/hide 2D constructive elements projected onto 3D plane surfaces
- Rendering: Elements rendered in their plane's 3D space using `plane.transform_to_3d`
- Style: May be lighter/thinner than 2D viewport rendering to avoid clutter

**3D Elements**:
- Always visible (primary purpose of 3D view)
- Points rendered as spheres or dots
- Lines rendered as infinite or bounded line segments
- Planes rendered as bounded rectangles or semi-infinite surfaces
- Segments rendered as line segments

**Linking Visuals**:
- Toggle: Show/hide dashed lines connecting 3D elements to their 2D projections
- Example: Dashed lines from 3D point A to its projections a_H and a_V
- Style: Thin dashed lines (#999 gray) for visual clarity without clutter

**Hinge Lines**:
- Rendered as prominent lines in 3D space
- Color: Distinct from other elements (e.g., dark blue)
- Always visible when projection planes visible

### 3D View Controls UI

**Control Panel** (inside 3D view, top-right or overlay):
- ☑ Show Planes
- ☑ Show 2D Elements
- ☑ Show Linking Visuals
- ☑ Show Grid (3D grid optional)
- [Reset Camera] button

**Interaction Restrictions**:
- **No selection**: Clicking elements in 3D view does NOT select them
- **No editing**: Cannot create, move, or modify geometry
- **Read-only**: Purely for visualization and understanding
- Clicking may show tooltips or labels (element names) but no interaction beyond that

**Pedagogical Purpose**: Helps students understand how 2D projections relate to 3D space. Provides spatial context without allowing direct 3D editing (which would bypass the learning process of constructing through projections).

---

## Dialogs and Modals

### Element Properties Dialog

**Trigger**: Click element in World Elements panel, or double-click element in viewport.

**Layout**:
- Modal dialog centered on screen
- Title: "Properties: [element name]"
- Sections: Geometry Info (read-only), Visual Style (editable)
- Buttons: Save, Cancel, Reset to Default

**Geometry Info Section** (read-only):
- Element type: "2D Point", "2D Segment", etc.
- Plane: Which projection plane it belongs to (for 2D elements)
- Coordinates or parameters: Display current realization data
- Dependencies: List of elements this depends on (links to dependency graph)
- Created by: Link to action in ProcessTree that created it

**Visual Style Section** (editable):
- **Color**: Color picker (hex input or palette)
- **Line Width**: Numeric input or slider (0.5 - 5.0 pixels)
- **Line Style**: Dropdown (Solid, Dashed, Dotted)
- **Visibility**: Checkbox (show/hide this element)
- **Reset**: Button to clear overrides and inherit from subprocess

**Style Inheritance**:
- Properties **unset by default** (grayed out or shown as "Inherit")
- When unset, effective style inherited from containing subprocess
- Setting a property creates explicit override (bold or marked with *)
- "Reset to Default" button clears override, returns to inheritance

**Save Behavior**:
- Click Save: Apply changes, close dialog
- Changes recorded as command (undoable)
- Viewport updates immediately to reflect style changes

### Subprocess Properties Dialog

**Trigger**: Right-click subprocess in ProcessTree panel, select "Properties" from context menu.

**Layout**:
- Modal dialog
- Title: "Subprocess Properties: [subprocess name]"
- Sections: Name (editable), Default Visual Style (editable), Visibility

**Name Section**:
- Text input: Change subprocess name
- Validation: Non-empty, unique within parent scope

**Default Visual Style Section**:
- Same controls as Element Properties dialog
- These styles are inherited by all child elements (unless overridden)
- Changing subprocess style updates all child elements that inherit (cascade)

**Visibility**:
- Checkbox: Show/hide all elements in this subprocess
- Cascade option: Apply to nested subprocesses as well

### Project Settings Dialog

**Trigger**: Menu → Settings, or keyboard shortcut.

**Sections**:
- Grid settings (visibility, spacing, style)
- Snap settings (enable/disable, snap radius)
- Default styles (default colors, line widths for new elements)
- 3D view settings (initial camera position, display options)
- Autosave settings (interval, location)

---

## Visual Design Guidelines

### Color Palette

**Element Colors** (defaults, can be overridden per element):
- Points: Black (#000000)
- Lines/Segments: Black (#000000)
- Circles/Arcs: Black (#000000)
- Guides: Gray (#333333), dashed
- Hinge Lines: Dark blue (#003366), solid
- Snap Indicators: Orange (#FF6B35)
- Infeasible Elements: Red tint overlay or red dashed outline

**Emphasis Colors**:
- Active plane emphasis: Full opacity (100%)
- Non-active plane de-emphasis: 50% opacity
- Hover highlight: Blue glow (#4A90E2, 20% opacity outline)
- Selection highlight: Blue (#0066CC, 2px outline)
- Dependency highlight: Green tint (#4CAF50, 20% opacity) for descendants, Blue tint (#2196F3, 20% opacity) for ancestors

**UI Colors**:
- Background: Light gray (#F5F5F5) for panels
- Panel headers: Medium gray (#E0E0E0)
- Text: Dark gray (#212121) for primary, medium gray (#757575) for secondary
- Borders: Light gray (#CCCCCC)

### Typography

**Font Family**: System fonts (sans-serif stack)
- Primary: "Inter", "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif
- Monospace (coordinates): "Fira Code", "Consolas", "Monaco", monospace

**Font Sizes**:
- Panel headers: 14px, bold
- Element names: 13px, regular
- Status text: 12px, regular
- Tooltips: 11px, regular
- Coordinates: 11px, monospace

### Spacing and Layout

**Panel Padding**: 8px internal padding
**Element Spacing**: 4px between list items
**Icon Size**: 16×16px for small icons, 24×24px for toolbar icons
**Button Padding**: 6px vertical, 12px horizontal
**Border Radius**: 4px for panels, 3px for buttons

### Iconography

**Consistent Icon System**:
- Outlined style (Material Design or similar)
- 24×24px for toolbar (with 4px padding)
- 16×16px for panel items
- Color: Inherit from context (usually dark gray)

**Common Icons**:
- Point: Small circle or dot
- Line: Diagonal line
- Segment: Short line with endpoints
- Circle: Ring
- Guide: Line with perpendicular marker
- Eye (visibility): Open eye = visible, closed eye = hidden
- Gear (auxiliary): Indicates auto-created supporting actions
- Triangle (collapse): Right-pointing = collapsed, down-pointing = expanded

---

## Accessibility and Usability

### Keyboard Navigation

- **Tab**: Navigate between UI elements
- **Arrow Keys**: Navigate lists/trees in panels
- **Enter**: Activate selected item
- **ESC**: Cancel active tool, close dialogs
- **Space**: Toggle checkboxes, expand/collapse tree nodes
- **Ctrl+Z / Cmd+Z**: Undo
- **Ctrl+Y / Cmd+Y**: Redo
- **Delete**: Delete selected element(s) (if allowed)

### Mouse/Cursor Conventions

- **Standard Pointer**: Hovering UI buttons/panels
- **Crosshair**: Creating geometry in viewport
- **Hand (Open)**: Pan mode
- **Hand (Closed)**: Actively panning
- **Resize Arrows**: Resizing panels or 3D view
- **Move (Four Arrows)**: Moving 3D view overlay

### Tooltips

- Appear on hover after ~500ms delay
- Concise text (1-2 lines max)
- Positioned near cursor, avoiding occlusion
- Dismisses on mouse move or click

### Error Handling

**Non-Modal Feedback** (principle):
- NO modal error dialogs for geometric infeasibility
- Use status messages, panel indicators, and visual highlighting instead

**Invalid Tool Input**:
- Status message: "Invalid selection - circle requires 3 non-collinear points"
- Input ignored (no action recorded)
- Tool remains active (user can retry)

**Infeasible Elements**:
- Marked in panels: Strikethrough, red icon
- Marked in viewport: Red tint, dashed outline
- Hover: Tooltip explaining cause ("Depends on infeasible element a")
- Panel message: "3 infeasible elements" (click to filter/highlight)

---

## Responsive Design Considerations

### Minimum Window Size

- Minimum width: 1024px (can work on smaller but with reduced usability)
- Minimum height: 768px

### Narrow Screen Behavior

- Panels: Collapse to icon bar (click icon to temporarily expand)
- Toolbars: Use overflow menu for less common tools
- 3D view: May auto-minimize to preserve viewport space

### Large Screen Behavior

- Panels: Can be wider, show more information
- Viewport: More working space
- 3D view: Can be larger without obscuring main work area

---

## State Persistence

The following UI state is saved per project and restored on project load:

- Active projection plane
- Panel sizes and collapse states
- 3D view size and position
- 3D view display options (show planes, show 2D elements, etc.)
- Grid visibility
- Hover highlighting mode enabled/disabled
- Zoom and pan state (optional, may reset to fit view on load)

---

## References and Related Documents

- **specs/001-dihedral-learning-mvp/spec.md**: Functional requirements, detailed tool behaviors, user scenarios
- **specs/001-dihedral-learning-mvp/data-model.md**: World data structures, element definitions, realization cache architecture
- **.specify/memory/constitution.md**: Architectural principles, including Principle VIII (Principle-Based Rendering)

---

**Version**: 1.0.0  
**Last Updated**: 2025-12-28

# Diedrico MVP - Implementation Pre-Plan

**Purpose**: Define development phases and features to implement in each phase  
**Input for**: speckit plan generation

---

## Phase 1: Basic World Data Structures

**Implement minimal data model to store points**

- World class to hold geometric elements
- Basic 2D Point class with x, y coordinates
- Point storage in World (array or map)

---

## Phase 2: Minimal UI Skeleton

**Create basic Vue.js application**

- Vue.js 3 + TypeScript setup
- App.vue with simple layout
- SVG canvas component (empty for now)
- Basic styling

---

## Phase 3: Render Fixed Elements

**Display the two projection planes and coordinate system**

- Add fixed plane boundaries to World (P_V, P_H)
- Render P_V and P_H as rectangles/lines in SVG
- Show origin point (O)
- Show hinge line (HL_HV)
- Basic coordinate transformation (world → SVG coordinates)

---

## Phase 4: Render Points

**Display points on the canvas**

- Render Point objects as SVG circles
- Apply basic styling (color, radius)

---

## Phase 5: Create Free Points

**Add tool to place points on canvas**

- Toolbar with single "Point" tool button
- Click handler on canvas
- Create Point at click coordinates
- Add Point to World
- Point appears immediately on canvas

---

## Phase 6: Basic Viewport Pan/Zoom

**Navigate the canvas**

- Pan with mouse drag
- Zoom with mouse wheel
- Update coordinate transformation

---

## Phase 7: Add 2D Lines

**Support line geometry**

- Line class (2D) with two endpoints
- Render lines as SVG line elements
- Store lines in World

---

## Phase 8: Line Creation Tool

**Tool to create lines between points**

- "Line" tool button in toolbar
- Select two existing points
- Create Line connecting them
- Point snapping (highlight nearby points)

---

## Phase 9: Add Process Tree

**Track construction history**

- ProcessTree data structure
- Action nodes for each operation (CreatePoint, CreateLine)
- Store actions in tree when operations execute

---

## Phase 10: Command Pattern

**Make operations undoable**

- Command interface
- CreatePointCommand, CreateLineCommand
- CommandStack for undo/redo
- Undo/Redo buttons and shortcuts (Ctrl+Z, Ctrl+Y)

---

## Phase 11: Add Segments

**Support segment geometry**

- Segment class (finite line with endpoints)
- Render as SVG path
- Segment creation tool

---

## Phase 12: Add Circles

**Support circle geometry**

- Circle class with center point and radius
- Render as SVG circle
- "Circle" tool (center + radius via drag or second point)

---

## Phase 13: Add Guides

**Support guide lines perpendicular to hinge**

- Guide class
- Guide creation tool (from HL and a point)
- Render guides as dashed lines
- Extend guides across viewport

---

## Phase 14: Line-Line Intersections

**Create intersection points**

- Intersection tool
- Select two lines
- Calculate intersection point
- Create point at intersection
- Handle parallel lines (no intersection)

---

## Phase 15: Point Transport via Guides

**Transport points between planes**

- Point transport tool
- Select source point and guide
- Calculate target point on opposite plane
- Create transported point

---

## Phase 16: Distance Transport

**Transport distances along guides**

- Distance transport tool
- Select segment (distance), guide, and target point
- Create point at transported distance

---

## Phase 17: More Intersection Types

**Expand intersection capabilities**

- Line-Circle intersections
- Circle-Circle intersections
- Handle multiple intersection points

---

## Phase 18: Actions Panel

**Show construction history in UI**

- Left sidebar panel
- List actions from ProcessTree
- Show action type and parameters
- Click action to highlight related objects

---

## Phase 19: Elements Panel

**Show all geometric objects**

- Right sidebar panel
- List points, lines, circles, guides
- Filter by type
- Click element to highlight on canvas

---

## Phase 20: Object Selection

**Select objects on canvas**

- Click to select objects
- Highlight selected objects
- Selection state management
- Multi-select with Ctrl+click

---

## Phase 21: Hover Highlighting

**Visual feedback on hover**

- Highlight objects under cursor
- Show object label on hover
- Different style from selection highlight

---

## Phase 22: Element Properties

**View and edit object properties**

- Properties panel/dialog
- Show coordinates, labels, visual styles
- Edit colors, stroke width, line style
- Apply changes to selected objects

---

## Phase 23: Dependency Tracking

**Track which objects depend on others**

- Store dependencies in ProcessTree
- Update dependent objects when sources change
- Show dependencies in UI (arrows/tree links)

---

## Phase 24: Infeasibility Detection

**Detect impossible operations**

- Check for invalid operations (e.g., parallel lines intersection)
- Mark infeasible actions in ProcessTree (red indicator)
- Cascade infeasibility to dependent objects
- Show error messages

---

## Phase 25: 3D View Panel

**Show 3D reconstruction**

- 3D view panel (simple isometric or Three.js)
- Display both planes in 3D
- Show 3D objects derived from projections
- Basic 3D rotation

---

## Phase 26: File Save/Load

**Persist projects**

- Serialize World to JSON
- Backend API for file storage
- Save/Load buttons
- Auto-save

---

## Phase 27: Additional UI Polish

**Improve user experience**

- Settings dialog (snap radius, grid, etc.)
- Keyboard shortcuts
- Fit-to-view
- Grid display
- Status bar with coordinate display

---


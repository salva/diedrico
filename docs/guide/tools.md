# Construction Tools

Diedrico provides 21 construction tools organized into 8 families. Select a tool family from the toolbar, then choose a specific tool from the dropdown.

## Selection Tool

**Shortcut**: `Esc`

The default tool. Click elements to select them, Shift+click for multi-select, click empty space to deselect.

## Point Family

### Free Point (`P`)

Click on the canvas to create a point at that position on the active projection plane.

### Intersection Point (`I`)

Click two intersecting elements (lines, circles, segments) to create a point at their intersection. For line-circle and circle-circle intersections, two intersection points are created (indexed 0 and 1).

## Line Family

### Line Through Two Points (`L`)

Click two points to create a line passing through both, extending infinitely.

### Parallel Line

Click a reference line, then click a point. Creates a line through the point, parallel to the reference line.

### Perpendicular Line

Click a reference line, then click a point. Creates a line through the point, perpendicular to the reference line.

### Tangent to Circle Through Point

Click a circle, then click a point outside the circle. Creates a tangent line from the point to the circle.

### Tangent to Circle Parallel to Line

Click a circle, then click a reference line. Creates a tangent line to the circle that is parallel to the reference line.

## Segment Family

### Segment (`S`)

Click two points to create a finite segment between them. Segments behave like lines for intersection purposes but have defined endpoints.

## Circle Family

### Circle (`C`)

Click a center point, then click a radius point. Creates a circle with the center at the first point and radius equal to the distance to the second point.

## Guide Family

### Guide (`G`)

Click a hinge line (or broken hinge line), then click a through-point. Creates a guide line perpendicular to the hinge, used for transporting distances between projection planes. Sibling guides are auto-created on the paired plane.

## 3D Elements Family

### 3D Point

Click two corresponding points on different projection planes. Reconstructs the 3D point from its 2D projections.

### 3D Line

Click two corresponding lines on different projection planes. Reconstructs the 3D line from its 2D projections.

### 3D Segment

Click two corresponding segments on different projection planes. Reconstructs the 3D segment, automatically resolving endpoint pairing.

### 3D Plane

Click three non-collinear 3D points. Defines a 3D plane through all three.

### Auxiliary Projection Plane

Click a trace line on an existing projection plane to create a new auxiliary projection plane folded along that trace.

## Examples Family

### Folding Plane Setup

Creates a standard setup with P_H, P_V, and the hinge line traces. Useful as a starting point for new constructions.

### Quick 3D Line

Creates a complete 3D line example from two predefined 2D line projections with a single click. Useful for testing the 3D view.

## Tool Behavior

- **Stay active**: Most tools remain active after creating an element, letting you create another immediately
- **Return to selection**: Example tools auto-return to the selection tool after executing
- **Keyboard shortcuts**: Single-key shortcuts (P, L, S, C, G, I, Esc) for quick tool switching
- **Argument collection**: Tools that require multiple picks show visual feedback for the current state

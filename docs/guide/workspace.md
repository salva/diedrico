# Workspace Overview

The Diedrico workspace consists of several coordinated panels that together provide a complete environment for dihedral projection constructions.

## Layout

```
┌─────────────────────────────────────────────────┐
│  Project Name          Toolbar                  │
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ Elements │          2D Canvas (SVG)             │
│  Panel   │                                      │
│          │     ┌──────────────┐                 │
├──────────┤     │   3D View    │                 │
│          │     │  (Three.js)  │                 │
│ Process  │     └──────────────┘                 │
│  Tree    │                                      │
│          │                                      │
├──────────┴──────────────────────────────────────┤
│  Status Bar                                     │
└─────────────────────────────────────────────────┘
```

## 2D Canvas

The primary construction area rendered with SVG. Features:

- **Pan** — Click and drag on empty space
- **Zoom** — Mouse wheel
- **Grid** — Snappable grid aligned to the active projection plane
- **Active plane** — Only one plane is active at a time; new elements are created on it
- **Hit testing** — Click on points, lines, circles to select or pick them during tool operations

All 2D geometric elements (points, lines, segments, circles, guides) are rendered here in plane-local coordinates, projected through the `planeToPaper2D` matrix to screen (paper) coordinates.

## 3D View

A floating Three.js overlay showing the spatial context:

- **Projection plane grids** — Semi-transparent grids for P_H, P_V, and auxiliary planes
- **3D elements** — Points (spheres), lines (infinite), segments (with endpoint spheres), planes (transparent meshes)
- **2D elements on planes** — Optionally shows 2D elements lifted onto their projection planes
- **Hinge lines** — Dashed lines where projection planes meet
- **Guide perpendicular planes** — Shown when a guide is selected (cyan mesh with gold intersection markers)

Controls:
- **Orbit** — Left-click drag
- **Zoom** — Scroll wheel
- **Pan** — Right-click drag

Display toggles: Show Planes, Show 2D Elements, Show Grid, Show Reference Axes.

## Elements Panel

Left sidebar listing all geometric elements organized by projection plane and element type:

- Point, Line, Segment, Circle, Guide groups per plane
- 3D Elements section (3D Points, Lines, Segments, Planes)
- Click an element to select it (highlights in canvas + 3D view)
- Element labels rendered with KaTeX (e.g., $A_1$, $L_2$, $P_H$)

## Process Tree

Shows the complete construction history as a tree of actions:

- **Subprocesses** — Group related actions (can be pushed/popped via stack)
- **Actions** — Individual construction steps with dynamic descriptions
- **Output flags** — Mark elements as subprocess outputs (★)
- **Encapsulation** — Hide intermediate steps in subprocesses
- Labels are clickable — clicking an element label in a description selects that element

## Toolbar

Top toolbar with:

- **Tool families** — Point, Line, Segment, Circle, Guide, 3D Elements, Examples
- **Plane selector** — Dropdown to switch active projection plane
- **Undo / Redo** buttons
- **Projection toggle** — Show/hide 3D element projections on 2D planes
- **Delete** — Remove selected elements (with cascade dependency deletion)

## Status Bar

Bottom bar showing contextual information about the current tool state and viewport coordinates.

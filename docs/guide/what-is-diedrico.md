# What is Diedrico?

Diedrico is an **interactive educational web application** for engineering students to learn and practice **dihedral (orthographic) projection** — the standard method for representing 3D objects through 2D views.

## Why Diedrico?

Unlike CAD software that hides the projection process, Diedrico emphasizes the **constructive process**:

- **Every operation is explicit** — you build geometric elements step by step
- **Every construction is traceable** — the Process Tree records what was built, from what, and in what order
- **Every element is parametric** — moving a parent point automatically updates all dependent elements
- **Everything is undoable** — experiment freely and roll back mistakes

## Core Concepts

### Dihedral Projection

In dihedral projection, a 3D object is represented by its projections onto two perpendicular planes:

- **P_H** (Horizontal plane) — the top view
- **P_V** (Vertical plane) — the front view

These planes are "unfolded" onto a single drawing sheet, connected by a **hinge line** (the line where the planes meet). Additional auxiliary projection planes can be created for complex geometries.

### The Workspace

| Component | Purpose |
|-----------|---------|
| **2D Canvas** (SVG) | Primary construction area — draw, select, and manipulate elements |
| **3D View** (Three.js) | Read-only spatial overview showing elements in true 3D |
| **Elements Panel** | Lists all elements organized by projection plane |
| **Process Tree** | Shows complete construction history with dependency tracking |
| **Toolbar** | Construction tools, undo/redo, view controls |

### Element Types

| Element | Description |
|---------|-------------|
| **Points** | Free points, intersection points (line-line, line-circle, circle-circle) |
| **Lines** | By two points, parallel, perpendicular, tangent to circle |
| **Segments** | Finite line between two endpoints |
| **Circles** | By center and radius point |
| **Guides** | Special lines for distance transport between projection planes |
| **3D Elements** | Points, lines, segments, and planes reconstructed from 2D projections |

## Technology Stack

- **Vue 3** + **TypeScript** — UI framework
- **Pinia** — State management
- **Three.js** — 3D visualization
- **D3.js** — SVG geometry helpers
- **KaTeX** — Mathematical label rendering
- **Vite** — Build tool and dev server
- **Vitest** + **Playwright** — Testing (1200+ tests)

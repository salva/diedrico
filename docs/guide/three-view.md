# 3D View

The 3D View panel provides an interactive Three.js-based visualization of your descriptive geometry constructions.

## Overview

The 3D view reconstructs the spatial relationships from your 2D projections. It shows:

- **Projection planes** as semi-transparent grids
- **Hinge lines** at the fold between paired planes
- **2D elements** rendered directly on their planes in 3D space
- **3D elements** (points, lines, segments, planes) reconstructed from projections
- **Reference axes** (X, Y, Z) for spatial orientation

## Display Options

Toggle visibility from the 3D View header:

| Option | Description |
|--------|-------------|
| Show Planes | Render projection plane grids |
| Show 2D Elements | Display 2D points, lines, circles on planes |
| Show Grid | Toggle the grid overlay on planes |
| Show Reference Axes | Show X/Y/Z axis indicators |
| Show Projected Elements | Overlay 3D element projections back onto planes |

## Navigation

- **Orbit**: Click and drag to rotate
- **Zoom**: Scroll wheel
- **Pan**: Right-click drag or Shift+click drag

The camera uses a perspective projection with OrbitControls.

## Rendering Details

### Projection Planes

Each `ProjectionPlane` is realized in 3D via its `planeTo3D` matrix (`Matrix4x3`), which maps 2D plane-intrinsic coordinates to 3D world coordinates. The default setup includes:

- **P_H** (horizontal) — the XZ plane (z = 0 in 3D)
- **P_V** (vertical) — the XY plane (y = 0 in 3D)

Auxiliary projection planes are folded along their trace lines.

### 2D Elements on Planes

The `Element2DRenderer3D` service transforms 2D element coordinates to 3D positions using `applyMatrix4x3()`:

- Points → small spheres (`SphereGeometry`)
- Lines → tubes extending across the plane
- Circles → tube-based rings

### 3D Elements

User-created 3D elements are rendered directly:

- **3D Points** → spheres at the reconstructed position
- **3D Lines** → tubes along the parametric direction
- **3D Segments** → tubes between start and end points
- **3D Planes** → semi-transparent rectangles with normal indicators

### Guide Perpendicular Planes

When a guide is selected, the 3D view displays a semi-transparent plane perpendicular to the guide in 3D space, along with intersection points where the plane crosses other 3D elements.

## Coordinate Systems

The 3D view uses a right-handed coordinate system:

- Conversion utilities (`domainToThreeJS`, `domainDirectionToThreeJS`) map domain Vector4 to Three.js Vector3
- Labels use CSS2DRenderer to overlay text in screen space

# Projection Planes

Projection planes are the fundamental surfaces on which 2D geometric constructions take place. Each plane represents a 2D coordinate system mapped to a specific orientation in 3D space.

## Default Planes

Every new project starts with two fixed projection planes:

| Plane | Name | 3D Orientation | Role |
|-------|------|---------------|------|
| **P_H** | Horizontal | XZ plane (y = 0) | Ground plane |
| **P_V** | Vertical | XY plane (x = 0) | Front plane |

These planes are connected by a **hinge line** at their intersection.

## Plane Types

### Fixed Projection Plane

The base planes (P_H, P_V) have pre-computed constant transformation matrices. They cannot be moved or deleted.

### Auxiliary Projection Plane

User-created planes folded along a trace line on an existing plane. Auxiliary planes enable multi-view constructions beyond the standard two-view setup.

To create one: select the **Auxiliary Projection Plane** tool and click a trace line on any existing plane.

## Element Ownership

Each projection plane **owns** its 2D elements:

- Points (`FreePoint2D`, intersection points)
- Lines (`Line2DByTwoPoints`, parallels, perpendiculars, tangents)
- Segments (`Segment2DByPoints`)
- Circles (`Circle2DByCenterAndPoint`)
- Half-hinge lines and guides

Elements are identified by **hierarchical IDs**: `{planeId}/{localId}` (e.g., `projPlane1/point2d5`).

## Coordinate Systems

Each projection plane uses a 2D intrinsic coordinate system `(u, v)`:

### Plane-Intrinsic → Paper

The `ProjectionPlaneRealization2D` provides:
- `planeToPaper2D` (`Matrix3`) — transforms plane `(u, v)` to paper (SVG canvas) coordinates
- `paperToPlane2D` (`Matrix3`) — inverse transform for mouse input

### Plane-Intrinsic → 3D

The `ProjectionPlaneRealization3D` provides:
- `planeTo3D` (`Matrix4x3`) — transforms plane `(u, v)` to 3D world `(x, y, z)`
- `threeDToPlane` (`Matrix3x4`) — projects 3D points back to the plane

## Active Plane

Only one projection plane is **active** at a time. The active plane:

- Receives new 2D elements from construction tools
- Is highlighted visually in both 2D and 3D views
- Determines which elements respond to mouse interactions

Switch the active plane by clicking on its region in the 2D canvas or using the plane selector.

## Visual Representation

In the **2D Canvas**, planes appear as regions separated by hinge line traces. Each plane has a distinct background color.

In the **3D View**, planes appear as semi-transparent grids with matching colors, positioned according to their 3D orientation.

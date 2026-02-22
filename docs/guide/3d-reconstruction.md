# 3D Reconstruction

Diedrico reconstructs 3D geometry from 2D projections — the core principle of descriptive geometry. You draw on projection planes, and the system computes the actual 3D positions.

## How It Works

Each 3D element stores a **definition** (what it is), not computed coordinates. The `realize3D(world)` method computes the actual geometry lazily:

1. Get the 2D element realizations (positions on each plane)
2. Get the plane's `planeTo3D` matrix
3. Transform 2D positions to 3D rays
4. Find the intersection or closest approach of those rays

## 3D Element Types

### Point3D

**From Projections** (`Point3DFromProjections`): Select two corresponding 2D points on different planes. The system:

1. Gets each point's 2D position via `realize2D()`
2. Gets each plane's `planeTo3D` matrix
3. Calls `reconstruct3DPointFromProjections()` to find the 3D position

**By Coordinates** (`Point3DByCoordinates`): Fixed positions used for system elements like the origin $(O)$.

**Realization**: `Point3DRealization3D` stores `position` as a `Vector4` $(x, y, z, 1)$.

### Line3D

Created from two corresponding 2D lines on different planes. The 3D line passes through their spatial intersection.

**Realization**: `Line3DRealization3D` stores `point` and `direction` as `Vector4`s. Parametric form: $P(t) = \text{point} + t \cdot \text{direction}$.

### Segment3D

Created from two corresponding 2D segments on different planes. The system automatically resolves endpoint pairing.

**Realization**: `Segment3DRealization3D` stores `startPoint` and `endPoint` as `Vector4`s.

### Plane3D

Created from three non-collinear 3D points. Defines a plane in 3D space.

**Realization**: `Plane3DRealization3D` stores `equation` as `Vector4` $(a, b, c, d)$ where $ax + by + cz + d = 0$.

## Feasibility

A realization can be **infeasible** if the input is geometrically impossible:

- Parallel projection lines that never intersect
- Collinear points for a plane definition
- Degenerate configurations

Infeasible elements propagate through the dependency graph — if a point is infeasible, any line depending on it becomes infeasible too.

## Homogeneous Coordinates

The system uses homogeneous coordinates consistently:

| Type | Representation |
|------|---------------|
| 2D Point | $(x, y, 1)$ — `Vector3` |
| 2D Direction | $(dx, dy, 0)$ — `Vector3` |
| 3D Point | $(x, y, z, 1)$ — `Vector4` |
| 3D Direction | $(dx, dy, dz, 0)$ — `Vector4` |

This convention allows a single `Line2DRealization2D` type to represent both infinite lines (point + direction with $z = 0$) and bounded segments (two endpoints with $z = 1$).

## Dependency Tracking

3D elements depend on their 2D projections, which in turn depend on construction inputs. The `DependencyGraph` tracks these relationships as a DAG (directed acyclic graph):

- `getAncestors(id)` — all elements this one depends on
- `getDescendants(id)` — all elements that depend on this one
- `topologicalSort()` — ordering for recomputation
- `propagateInfeasibility()` — marks node + descendants infeasible

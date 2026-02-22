# Domain Model

The domain model represents descriptive geometry concepts as TypeScript classes with lazy realization.

## Class Hierarchy

### Element (Base)

All geometric objects extend `Element`:

```
Element
├── id: string
├── label: string
├── visualStyle: VisualStyle
└── getDependencies(): string[]
```

### Element2D

2D elements live on a specific projection plane:

```
Element2D extends Element
├── planeId: string
└── realize2D(world): Element2DRealization2D
```

**Point types:**

| Class | Description |
|-------|-------------|
| `FreePoint2D` | User-placed point with `(u, v)` coordinates |
| `Point2DLineLineIntersection` | Intersection of two lines |
| `Point2DLineCircleIntersection` | Line-circle intersection (index 0 or 1) |
| `Point2DCircleCircleIntersection` | Circle-circle intersection (index 0 or 1) |
| `SiblingIntersectionPoint2D` | Corresponding intersection on paired plane |

**Line types:**

| Class | Description |
|-------|-------------|
| `Line2DByTwoPoints` | Line through two given points |
| `Line2DParallel` | Parallel to a reference line through a point |
| `Line2DPerpendicularToLine` | Perpendicular to a reference line through a point |
| `Line2DTangentToCircleThroughPoint` | Tangent from external point |
| `Line2DTangentToCircleParallelToLine` | Tangent parallel to a line |
| `Segment2DByPoints` | Finite segment between two points |
| `HalfHingeLine2D` | The 2D trace of a hinge line on a plane |
| `Guide2D` | Guide perpendicular to a hinge line |
| `SiblingGuide2D` | Auto-created sibling guide on paired plane |

**Circle types:**

| Class | Description |
|-------|-------------|
| `Circle2DByCenterAndPoint` | Circle from center and perimeter point |

### Element3D

3D elements reconstruct spatial geometry from projections:

```
Element3D extends Element
├── realize3D(world): Element3DRealization3D
└── getDependencies(): string[]
```

| Class | Description |
|-------|-------------|
| `Point3DByCoordinates` | Fixed 3D point (system elements) |
| `Point3DFromProjections` | Reconstructed from two 2D projections |
| `Line3D` | 3D line from two projection lines |
| `Segment3D` | 3D segment from two projection segments |
| `Plane3DFixed` | Fixed plane (P_H, P_V) |
| `HingeLine` | Fold line between two projection planes |

### World

The root container holding all geometry:

```
World
├── projectionPlanes: Map<string, ProjectionPlane>
├── hingeLines: Map<string, HingeLine>
├── planes3D: Map<string, Plane3D>
├── points3D / lines3D / segments3D: Map<string, ...>
├── realization caches (point2D, line2D, circle2D, ...)
├── getNextId(): number
├── markDirty(): void (observer notification)
└── subscribeToChanges(listener): unsubscribe
```

## Realization System

```
Realization
├── feasible: boolean
│
├── Element2DRealization2D
│   ├── Point2DRealization2D    → position: Vector3
│   ├── Line2DRealization2D     → point1, point2: Vector3
│   └── Circle2DRealization2D   → center: Vector3, radiusVector: Vector3
│
├── Element3DRealization3D
│   ├── Point3DRealization3D    → position: Vector4
│   ├── Line3DRealization3D     → point, direction: Vector4
│   ├── Segment3DRealization3D  → startPoint, endPoint: Vector4
│   └── Plane3DRealization3D    → equation: Vector4
│
├── ProjectionPlaneRealization2D → planeToPaper2D, paperToPlane2D: Matrix3
└── ProjectionPlaneRealization3D → planeTo3D: Matrix4x3, threeDToPlane: Matrix3x4
```

### Caching

The `World` maintains realization caches keyed by element ID. The cache lifecycle:

1. First access: `realize()` is called, result is cached
2. Subsequent access: cached result returned immediately
3. Invalidation: `invalidateRealization(id)` clears the cache entry
4. Dependency tracking marks transitive dependents for invalidation

## Dependency Graph

`DependencyGraph` is a DAG tracking element relationships:

- **Edges**: `A → B` means "B depends on A"
- **Cycle detection**: `addEdge()` rejects cycles
- **Traversal**: `getAncestors()`, `getDescendants()` via BFS
- **Ordering**: `topologicalSort()` for recomputation
- **Infeasibility**: `propagateInfeasibility()` cascades to all descendants

## Hierarchical IDs

Elements use two-level IDs: `{planeId}/{localId}`

```
projPlane1/point2d5    → Point #5 on projection plane 1
projPlane2/line2d3     → Line #3 on projection plane 2
```

`getContainerIdFromElementId(id)` extracts the plane ID. `World.getElement2D(id)` looks up the owning plane first, then the element.

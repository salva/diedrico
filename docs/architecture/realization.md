# Realization Architecture

The realization pattern is the core architectural innovation in Diedrico, separating **what an element is** (definition) from **where it is** (computed coordinates).

## Design Patterns

### Lazy Evaluation

Realizations are computed only when requested, not at element creation time. This avoids unnecessary computation for off-screen or unused elements.

### Memoization

After the first computation, the realization is cached in `World`'s realization maps. Subsequent access returns the same object without recomputing.

### Visitor Pattern

Elements call back into the `World` (acting as a `RealizationContext`) to request realizations of their dependencies. For example, a `Line2DByTwoPoints` requests the realized positions of its two defining points.

### Strategy Pattern

Each element type implements its own `realize()` method, encapsulating the specific computation logic.

## Realization Flow

```
world.getPoint2DRealization(id)
  → check realization cache
  → if miss:
      → point.realize2D(world)
        → (for intersection) world.getLine2DRealization(lineId)
        → compute geometry
        → return Point2DRealization2D
      → store in cache
  → return cached result
```

## Dual Realization

Many elements have **two** realization forms:

1. **2D Realization** — coordinates in the plane's intrinsic `(u, v)` system
2. **3D Realization** — coordinates in world `(x, y, z)` space

Projection planes themselves have dual realizations:
- `ProjectionPlaneRealization2D` — mapping to paper/SVG space
- `ProjectionPlaneRealization3D` — mapping to 3D scene space

## Cache Invalidation

When an element's definition changes (e.g., moving a free point):

1. The element's realization cache entry is deleted
2. The dependency graph identifies all transitive dependents
3. Dependent realizations are also invalidated
4. Next render cycle triggers fresh computation of affected elements

## Why This Matters

| Concern | Without Realization | With Realization |
|---------|-------------------|-----------------|
| **Undo/Redo** | Must snapshot coordinates | Just replay definitions |
| **Persistence** | Save massive state | Save compact definitions |
| **Performance** | Recompute everything | Recompute only dirty subtree |
| **Correctness** | Manual sync of coords | Always derived from definition |

For the full technical specification, see `frontend/REALIZATION_ARCHITECTURE.md` in the source.

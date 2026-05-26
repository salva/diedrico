# Domain model

The domain model lives under `frontend/src/domain`. It represents the geometric and process concepts that the application manipulates.

## Geometry

- `domain/world/World.ts` is the aggregate for projection planes, 2D elements, 3D elements, active plane, dependency graph, and element id generation.
- `domain/world/projectionPlane/*` defines fixed and auxiliary projection planes and per-plane element stores.
- `Point`, `Line`, `Segment`, `Circle`, `Guide`, hinge-line, and 3D element classes provide element definitions and realization methods.
- `domain/calculations/*` contains pure calculation helpers for coordinates, intersections, distances, and perpendiculars.

## Process and dependencies

- `domain/processTree/*` models construction actions, action groups, subprocesses, and process tree structure.
- `domain/world/DependencyGraph.ts` records element dependencies used for parametric recalculation and cascade visibility.
- Process-tree mutations are performed through command operations and application use cases, not by panels directly mutating stores.

## Realizations

Elements store definitions and compute realizations when supplied with the relevant world/plane context. Realizations are derived domain values used by presentation selectors and are not a separate persistence authority.

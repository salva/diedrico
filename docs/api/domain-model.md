# Domain model API

This reference describes current internal TypeScript modules, not a public network API.

- `frontend/src/domain/world/World.ts` is the central aggregate for projection planes, 2D/3D elements, active plane, dependency graph, and id generation.
- `frontend/src/domain/world/projectionPlane/*` defines projection plane contexts and element stores.
- `frontend/src/domain/world/{Point,Line,Segment,Circle,Guide,...}.ts` define geometric elements and realization behavior.
- `frontend/src/domain/processTree/*` defines construction actions, groups, subprocesses, and process tree structure.
- `frontend/src/domain/calculations/*` provides pure geometry calculations used by domain objects and use cases.

Consumers should prefer application use cases and presentation selectors over direct component-level domain mutation.

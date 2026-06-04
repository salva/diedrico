# Remaining Refactoring Plan

Date: 2026-06-04

## Review Conclusion

The first version of this plan proposed moving 3D construction from `World` into the existing `ConstructionService`. That is directionally correct, but not the cleanest long-term architecture.

It would reduce `World.ts`, but it would also turn `ConstructionService` into a large mixed service that owns:

- 2D projection-plane construction
- 3D reconstruction construction
- projection-plane creation
- hinge-line creation
- storage registration
- dependency registration
- ID generation
- label resolution

That is better than a god `World`, but it risks creating a god `ConstructionService`.

Given the project priority is clean architecture over backward compatibility or implementation effort, the better approach is more decisive:

1. Make `World` a state/store object only.
2. Move services out of `World` and into runtime/application ownership.
3. Give operations explicit service dependencies through `OperationContext`.
4. Split construction by concern instead of putting every factory into one service.

## Current Problem

After the concern-separation work, the worst remaining issue is `World.ts`:

| File | Lines |
| --- | ---: |
| `frontend/src/domain/world/World.ts` | 1085 |
| `frontend/src/domain/world/ConstructionService.ts` | 278 |
| `frontend/src/domain/world/RealizationService.ts` | 159 |

`World` still owns too much:

- Geometry maps and lookup methods
- 3D element storage methods
- projection-plane creation
- hinge-line creation
- fixed plane creation
- dependency registration/unregistration
- ID allocation
- label generation
- realization facade methods
- `ConstructionService`
- `RealizationService`
- `DependencyService`
- `ProcessTree`

The recent refactor separated caching, construction, and visibility, but `World` is still the service locator and mutation hub.

## Architectural Goal

`World` should become a plain domain state container:

```ts
class World {
  // geometry state only
  projectionPlanes: Map<string, ProjectionPlane>;
  planes3D: Map<string, Plane3D>;
  points3D: Map<string, Point3D>;
  lines3D: Map<string, Line3D>;
  segments3D: Map<string, Segment3DFromProjections>;
  hingeLines: Map<string, HingeLine>;

  // lookup/access only
  getProjectionPlaneById(id: string): ProjectionPlane | undefined;
  getPoint2D(id: string): Point2D | undefined;
  get3DPoint(id: string): Point3D | undefined;
  // etc.
}
```

Runtime services should be owned outside `World`:

```ts
interface OperationContext {
  readonly world: World;
  readonly processTree: ProcessTree;
  readonly dependencies: DependencyService;
  readonly ids: IdAllocator;
  readonly labels: LabelGenerator;
  readonly visibilityModel: VisibilityModel;
  readonly construction2D: ProjectionConstructionService;
  readonly construction3D: ReconstructionConstructionService;
  readonly planeConstruction: ProjectionPlaneConstructionService;
  readonly realizations: RealizationService;
}
```

The exact property names can change, but the ownership direction should not: `RuntimeSession` owns services; `World` owns state.

## Design Principles

1. `World` stores geometry state and exposes lookups. It does not construct, cache, register dependencies, allocate IDs, generate labels, or own application/runtime services.
2. Services are explicit dependencies in `OperationContext`, not hidden behind `world.getService()`.
3. Construction is split by domain concern: 2D projection construction, 3D reconstruction construction, and projection-plane/hinge construction.
4. Dependency registration is centralized in construction/removal services, not scattered through `World` methods.
5. Realization caching remains one concern in `RealizationService`, but the service is not owned by `World`.
6. Mutation ordering remains mandatory: invalidate realizations first, remove from storage second, unregister dependencies third.

---

## Phase D: Make RuntimeSession Own Domain Services

### Current State

`World` owns:

- `private dependencyService: DependencyService`
- `private realizationService: RealizationService`
- `private constructionService: ConstructionService`
- `readonly labelGenerator: LabelGenerator`
- `private idAllocator: WorldIdAllocator`
- `private processTree: ProcessTree`

Operations currently receive `OperationContext`, but still reach services through `context.world`.

### Target State

`RuntimeSession` owns service instances and builds one explicit `OperationContext`:

```ts
const operationContext: OperationContext = {
  world,
  processTree,
  dependencies,
  ids,
  labels,
  visibilityModel,
  construction2D,
  construction3D,
  planeConstruction,
  realizations,
};
```

`World` no longer constructs or exposes services.

### Changes

- Move `DependencyService`, `RealizationService`, `ConstructionService`, `WorldIdAllocator`, `LabelGenerator`, and `ProcessTree` ownership from `World` to `RuntimeSession` or a new `RuntimeDomainContext`.
- Extend `OperationContext` with these services.
- Update operations to use `context.construction2D`, `context.construction3D`, `context.dependencies`, etc.
- Keep transitional facade methods on `World` only temporarily inside this phase, then remove them before committing the phase.

### Result

This eliminates `World` as a service locator.

---

## Phase E: Split Construction Services by Concern

### Current State

`ConstructionService.ts` currently contains all 2D projection-plane factory methods. The earlier plan wanted to add all 3D construction and plane/hinge construction to it.

### Better Target State

Create separate services:

```text
ProjectionConstructionService
  - FreePoint2D
  - lines
  - segments
  - circles
  - guides
  - intersections
  - origin/half-hinge line 2D helpers

ReconstructionConstructionService
  - Point3DFromProjections
  - Line3DFromProjections
  - Segment3DFromProjections
  - Plane3DFromTraces

ProjectionPlaneConstructionService
  - Fixed 3D base planes
  - fixed projection planes
  - auxiliary projection planes
  - hinge lines
  - broken hinge-line entities
```

Do not keep one monolithic `ConstructionService`.

### Why This Is Cleaner

2D projection construction, 3D reconstruction, and projection-plane/hinge setup are different domains. They share ID/label/dependency infrastructure, but their construction rules and validation rules are different.

The shared dependencies should be passed in, not used as a reason to merge all construction into one class.

### Migration

- Rename current `ConstructionService` to `ProjectionConstructionService`.
- Move 3D operation construction logic from `Add3D*Op` into `ReconstructionConstructionService`.
- Move initialization/projection-plane/hinge creation from `World` into `ProjectionPlaneConstructionService`.
- Remove `world.getConstructionService()`.

---

## Phase F: Extract Storage Mutation Ports from World

### Current State

Construction and removal code needs to mutate maps inside `World`. Today that means `World` exposes methods like `add3DPoint`, `remove3DPoint`, `addProjectionPlane`, etc.

### Target State

`World` exposes narrow storage ports or package-level store methods. Construction services depend on those ports, not the whole `World`.

Example:

```ts
interface GeometryStore {
  putPoint3D(point: Point3D): void;
  deletePoint3D(id: string): boolean;
  getPoint3D(id: string): Point3D | undefined;
  putProjectionPlane(plane: ProjectionPlane): void;
  // etc.
}
```

This makes construction services testable without depending on the full `World` API.

### Naming Guidance

Avoid `add*` for pure storage. Use storage verbs:

- `putPoint3D`
- `deletePoint3D`
- `putProjectionPlane`
- `deleteProjectionPlane`

Reserve `add*` for construction methods that validate, allocate IDs, create objects, store, and register dependencies.

---

## Phase G: Move Dependency Registration Out of World

### Current State

Several `World` methods call:

```ts
this.dependencyService.registerNode(...)
this.dependencyService.unregisterNode(...)
```

This mixes storage with graph maintenance.

### Target State

Construction/removal services own dependency registration/unregistration. `World` just stores or deletes objects.

Removal services follow the required order:

```ts
realizations.invalidateElement(id, dependencies, world.projectionPlanes);
world.deletePoint3D(id);
dependencies.unregisterNode(id);
```

### Required Cleanup

- Delete `removeCircle2DGeneric` immediately. It has zero external callers.
- Remove `removePlane3DByIdForUndo` and `removeHingeLineByIdForUndo` indirections once callers use explicit removal services.
- Replace `world.getDependencyRegistrar()` and `world.getDependencyQuery()` with `context.dependencies`.

---

## Phase H: Remove ProcessTree from World

### Current State

Visibility was extracted, but `ProcessTree` still lives inside `World`. This means construction-history operations call:

```ts
context.world.getProcessTree()
```

That keeps construction history coupled to geometry state.

### Target State

`RuntimeSession` owns `ProcessTree`, same as `VisibilityModel`.

```ts
interface OperationContext {
  readonly world: World;
  readonly processTree: ProcessTree;
  readonly visibilityModel: VisibilityModel;
  // ...
}
```

Process-tree operations mutate `context.processTree`, not `context.world.getProcessTree()`.

Read models receive `{ world, processTree, visibilityModel, dependencies }` explicitly.

### Why

Geometry state and construction history are related, but not the same state. A geometry-only `World` is easier to understand and test.

---

## Phase I: RealizationService Ownership Cleanup

### Current State

`World` owns `RealizationService` and exposes facade methods like:

- `world.realizePoint2D(...)`
- `world.get3DPointRealization(...)`
- `world.getProjectionPlane2DRealization(...)`
- `world.invalidateRealization(...)`

This was acceptable as an intermediate architecture, but not final clean architecture.

### Target State

`RealizationService` is runtime-owned and used explicitly by presentation, tools, and operations through context/read ports.

`World` implements lookup contexts only, or a dedicated `WorldRealizationLookup` adapter is introduced.

### Migration

- Move realization service ownership to `RuntimeSession`.
- Update presentation/read-port creation to receive `realizations` explicitly.
- Remove realization facade methods from `World` after callers migrate.

---

## Final Target Architecture

```text
RuntimeSession
  owns:
    World                         // geometry state only
    ProcessTree                   // construction history only
    VisibilityModel               // presentation visibility state
    DependencyService             // dependency graph
    IdAllocator                   // IDs
    LabelGenerator                // labels
    RealizationService            // caches
    ProjectionConstructionService // 2D construction
    ReconstructionConstructionService // 3D construction
    ProjectionPlaneConstructionService // planes/hinges

Operations
  receive OperationContext
  call explicit services
  do not reach through World for services

World
  stores geometry maps
  exposes lookup/storage ports
  no factories
  no cache ownership
  no dependency graph ownership
  no process tree ownership
```

## Expected Outcome

| Metric | Current | Target |
| --- | ---: | ---: |
| `World.ts` lines | 1085 | ~350-500 |
| `ConstructionService.ts` lines | 278 | deleted/renamed/split |
| Service ownership | mostly `World` | `RuntimeSession` / explicit context |
| Process tree ownership | `World` | `RuntimeSession` |
| Realization ownership | `World` | `RuntimeSession` |
| Dependency graph ownership | `World` | `RuntimeSession` |
| Operations service access | `context.world.get...` | `context.service` |

## Execution Order

1. Delete dead code first: `removeCircle2DGeneric`.
2. Introduce explicit service fields in `OperationContext` while keeping `World` facades temporarily.
3. Split `ConstructionService` into the three construction services.
4. Move 3D construction into `ReconstructionConstructionService`.
5. Move plane/hinge initialization into `ProjectionPlaneConstructionService`.
6. Move `DependencyService`, `IdAllocator`, `LabelGenerator`, and `RealizationService` ownership out of `World`.
7. Move `ProcessTree` ownership out of `World`.
8. Remove transitional `World` service facades.
9. Rename or document `World` as geometry state only.

## Recommendation

Do not implement new features yet.

The cleanest next step is not simply adding 3D methods to the current `ConstructionService`. That is an incremental improvement but not the final architecture.

The better next step is to remove `World` as a service owner and split construction into focused services. This requires more work and touches more files, but it prevents the architecture from replacing one god object with another.

No backward-compatibility work is needed. No schema migration is needed unless operation descriptor shapes are intentionally changed.

# Concern Separation Design Plan

Date: 2026-06-04 (third review)

## Problem Statement

The current architecture mixes concerns within individual modules. This coupling makes code harder to understand, test, and modify. Three specific mixings stand out:

1. **Realization caching** is split across two ownership boundaries (plane-level 2D caches in `ProjectionPlaneElementStore`, world-level 3D caches in `RealizationStore`), and invalidation sweeps all planes instead of targeting affected elements.

2. **Construction orchestration** lives inside `ProjectionPlane` (15+ factory methods), mixing creation logic with identity, storage, and realization delegation.

3. **Visibility/presentation flags** (`showIntermediates`, `isOutput`, `isAuxiliary`, `defaultStyle`) are embedded inside `ProcessTree` domain data structures (`Subprocess`, `ActionGroup`, `ActionNode`), even though they control canvas rendering, not construction history.

The root cause in all three cases is the same: concerns that should be separate services or data structures are crammed into existing classes because those classes were the most convenient place to add them at the time.

## Design Principles

1. Each module should own exactly one concern.
2. Data structures should not carry presentation semantics.
3. Caches should be owned by one service with one invalidation strategy.
4. Factory methods should live near their callers (operations), not near their storage (aggregates).
5. The domain layer should not import presentation types or make visibility decisions.
6. Every mutation path (add and remove) must maintain dependency graph consistency, and invalidation must happen before dependency graph changes (unregister after invalidate).
7. Non-geometric runtime state that operations need should be accessible through an operation context, not embedded in domain objects.
8. Services that are internal implementation details of `World` should not be exposed as public fields; prefer facade methods on `World`.

---

## Phase A: Consolidate Realization Caching

### Current State

- **2D caches** (`pointRealizations`, `lineRealizations`, `circleRealizations`) live inside `ProjectionPlaneElementStore` (lines 18-20 of `ProjectionPlaneElementStore.ts`).
- **3D caches** (`point3D`, `line3D`, `segment3D`, `plane3D`, `projectionPlane2D`, `projectionPlane3D`) live inside `RealizationStore` (lines 5-10 of `RealizationStore.ts`).
- **Cache-or-compute logic** lives in `ProjectionPlaneRealizationHelpers.ts` --- three functions (`realizePoint2DWithCache`, `realizeLine2DWithCache`, `realizeCircle2DWithCache`) that take a cache interface and delegate to `element.realize2D(context)` on miss.
- **Invalidation** in `World.invalidateRealization()` and `World.invalidateLineRealization()` calls `DependencyService.invalidateCascade(elementId, callback)`, and the callback iterates **every projection plane** calling `plane.clearRealizationCaches(id)` even if the element does not belong to that plane.
- **Projection-plane matrix caches** are also cleared during element invalidation: when a `plane3DId` matches an invalidated element, `clearProjectionPlane3D` is called, and the invalidated element ID itself is checked against projection-plane IDs (since projection planes are also in the dependency graph).

### Target State

One `RealizationService` owns all realization caches (2D and 3D). `ProjectionPlaneElementStore` becomes pure element storage with no caches. Invalidation uses `DependencyService` to compute the affected set and clears only relevant entries in `RealizationService`, including projection-plane matrix caches for dependent planes.

### New File: `RealizationService.ts`

Location: `frontend/src/domain/world/RealizationService.ts`

```ts
export class RealizationService {
  // 2D caches, keyed by element ID (same keys as before,
  // but now owned centrally, not per-plane)
  private readonly point2D = new Map<string, Point2DRealization2D>();
  private readonly line2D = new Map<string, Line2DRealization2D>();
  private readonly circle2D = new Map<string, Circle2DRealization2D>();

  // 3D caches (moved from RealizationStore)
  private readonly point3D = new Map<string, Point3DRealization3D>();
  private readonly line3D = new Map<string, Line3DRealization3D>();
  private readonly segment3D = new Map<string, Segment3DRealization3D>();
  private readonly plane3D = new Map<string, Plane3DRealization3D>();

  // Projection-plane transformation caches (moved from RealizationStore)
  private readonly projectionPlane2D = new Map<string, ProjectionPlaneRealization2D>();
  private readonly projectionPlane3D = new Map<string, ProjectionPlaneRealization3D>();

  // Cache-or-compute: check cache, compute on miss, store result
  realizePoint2D(point: Point2D, context: ProjectionElementRealizationContext): Point2DRealization2D | undefined {
    const cached = this.point2D.get(point.id);
    if (cached) return cached;
    const realization = point.realize2D(context);
    if (realization) this.point2D.set(point.id, realization);
    return realization;
  }

  realizeLine2D(line: Line2D, context: ProjectionElementRealizationContext): Line2DRealization2D | undefined {
    const cached = this.line2D.get(line.id);
    if (cached) return cached;
    const realization = line.realize2D(context);
    if (realization) this.line2D.set(line.id, realization);
    return realization;
  }

  realizeCircle2D(circle: Circle2D, context: ProjectionElementRealizationContext): Circle2DRealization2D | undefined {
    const cached = this.circle2D.get(circle.id);
    if (cached) return cached;
    const realization = circle.realize2D(context);
    if (realization) this.circle2D.set(circle.id, realization);
    return realization;
  }

  // 3D cache-or-compute (moved from World.get3DPointRealization etc.)
  realizePoint3D(point: Point3D, context: ...): Point3DRealization3D | undefined { ... }
  realizeLine3D(line: Line3D, context: ...): Line3DRealization3D | undefined { ... }
  realizeSegment3D(segment: Segment3DFromProjections, context: ...): Segment3DRealization3D | undefined { ... }
  realizePlane3D(plane: Plane3D, context: ...): Plane3DRealization3D | undefined { ... }

  // Projection-plane matrix cache-or-compute (moved from World.getProjectionPlane2DRealization etc.)
  realizeProjectionPlane2D(plane: ProjectionPlane, context: ProjectionPlaneRealizationContext): ProjectionPlaneRealization2D | undefined { ... }
  realizeProjectionPlane3D(plane: ProjectionPlane, context: ProjectionPlaneRealizationContext): ProjectionPlaneRealization3D | undefined { ... }

  // Targeted invalidation using DependencyService
  // Element IDs: clear 2D + 3D caches for this element and all dependents
  // Projection-plane IDs: also clear matrix caches for projection planes whose
  // defining geometry (plane3DId, trace-line dependencies) was invalidated.
  invalidateElement(elementId: string, dependencyQuery: DependencyQueryPort, projectionPlanes: Map<string, ProjectionPlane>): string[] {
    const affectedIds = [elementId, ...dependencyQuery.getAllDependents(elementId)];
    for (const id of affectedIds) {
      this.point2D.delete(id);
      this.line2D.delete(id);
      this.circle2D.delete(id);
      this.point3D.delete(id);
      this.line3D.delete(id);
      this.segment3D.delete(id);
      this.plane3D.delete(id);
    }

    // Projection-plane matrix invalidation:
    // 1. If the invalidated element IS a projection-plane ID, clear its matrices.
    // 2. If any projection plane's plane3DId matches an invalidated element,
    //    clear that projection plane's matrices.
    // 3. If any projection plane is a dependent of the invalidated element
    //    (auxiliary planes depend on trace-line IDs), clear its matrices.
    for (const [projPlaneId, projPlane] of projectionPlanes) {
      const isInvalidateThisPlane =
        affectedIds.includes(projPlaneId) ||
        (projPlane.plane3DId != null && affectedIds.includes(projPlane.plane3DId)) ||
        projPlane.getDependencies().some(depId => affectedIds.includes(depId));
      if (isInvalidateThisPlane) {
        this.projectionPlane2D.delete(projPlaneId);
        this.projectionPlane3D.delete(projPlaneId);
      }
    }

    return affectedIds;
  }

  clear(): void { /* clear all maps */ }
}
```

Note: `invalidateElement` needs access to `projectionPlanes` because auxiliary projection planes depend on trace-line IDs tracked in the dependency graph, and projection planes reference `plane3DId` which links them to defining geometry. The current code handles these cases in `World.invalidateRealization()` (lines 454-465) with explicit `projPlane.plane3DId === id` checks. The new `RealizationService` method preserves this logic but makes it explicit.

### Changes to Existing Files

#### `ProjectionPlaneElementStore.ts`

Remove all cache maps and their accessors:

- Delete fields: `pointRealizations`, `lineRealizations`, `circleRealizations` (lines 18-20).
- Delete methods: `getPointRealization2D`, `setPointRealization2D`, `clearPointRealization2D`, `getLineRealization2D`, `setLineRealization2D`, `clearLineRealization2D`, `getCircleRealization2D`, `setCircleRealization2D`, `clearCircleRealization2D`, `clearRealizationCaches` (lines 47-93).
- Keep pure element storage: `points`, `lines`, `circles` maps and their `add`/`get`/`getAll`/`remove` methods.
- The `removePoint`/`removeLine`/`removeCircle` methods currently also clear the corresponding cache entry. After this change, callers must instead call `world.invalidateRealization(id)` (which delegates to the private `realizationService`). The store only removes from its own element map.

#### `ProjectionPlane.ts`

- Remove all cache facade methods: `getPointRealization2D`, `setPointRealization2D`, `clearPointRealization2D`, `getLineRealization2D`, `setLineRealization2D`, `clearLineRealization2D`, `getCircleRealization2D`, `setCircleRealization2D`, `clearCircleRealization2D`, `clearRealizationCaches(id)` (lines 144-269).
- Remove `realizePoint2D`, `realizeLine2D`, `realizeCircle2D` (lines 281-303). These delegate to the `*WithCache` helpers, which will now be called directly on `RealizationService`.
- Callers that previously called `plane.realizePoint2D(point, context)` should instead call `world.realizePoint2D(point, context)` via the new facade method on `World`.
- Callers that previously called `plane.clearRealizationCaches(id)` should instead call `world.invalidateRealization(id)`, which delegates to `realizationService.invalidateElement(...)`.

#### `ProjectionPlaneRealizationHelpers.ts`

- Delete this file entirely. The cache-or-compute logic moves into `RealizationService.realizePoint2D`, `RealizationService.realizeLine2D`, `RealizationService.realizeCircle2D`. The `PointRealizationCache`, `LineRealizationCache`, `CircleRealizationCache` interfaces are no longer needed --- `RealizationService` is both the cache and the computation orchestrator.

#### `RealizationStore.ts`

- The entire class is subsumed into `RealizationService`. Delete `RealizationStore.ts`. Update all import sites.
- `World.ts` currently holds `private realizations: RealizationStore`. Change to `private realizationService: RealizationService`. Do **not** expose `realizationService` as a public field. Instead, add facade methods on `World` that delegate to `RealizationService` (see below).

#### `World.ts`

- Remove `invalidateRealization(elementId)` and `invalidateLineRealization(lineId)` as currently implemented (they sweep all planes). Replace with a single method that delegates to `RealizationService`:
  ```ts
  invalidateRealization(elementId: string): string[] {
    return this.realizationService.invalidateElement(
      elementId,
      this.dependencyService,
      this.projectionPlanes
    );
  }
  ```
- Remove all references to `plane.clearRealizationCaches(id)`.
- The `invalidateLineRealization` method is currently identical to `invalidateRealization`. After consolidation, there is only one invalidation path. Delete `invalidateLineRealization` or make it delegate to `invalidateRealization`.
- The current `getProjectionPlane2DRealization()` and `get3DPointRealization()` etc. methods on `World` become thin delegations to `RealizationService` methods that also do cache-or-compute. These World methods can remain as convenience facades; they do not need removal.
- Add new facade methods for 2D realization so callers do not need direct access to `RealizationService`:
  ```ts
  realizePoint2D(point: Point2D, context: ProjectionElementRealizationContext): Point2DRealization2D | undefined {
    return this.realizationService.realizePoint2D(point, context);
  }
  realizeLine2D(line: Line2D, context: ProjectionElementRealizationContext): Line2DRealization2D | undefined {
    return this.realizationService.realizeLine2D(line, context);
  }
  realizeCircle2D(circle: Circle2D, context: ProjectionElementRealizationContext): Circle2DRealization2D | undefined {
    return this.realizationService.realizeCircle2D(circle, context);
  }
  ```
- Update `World.clear()` to call `this.realizationService.clear()` instead of `this.realizations.clear()`.

### Caller Impact

All callers of the removed facade methods need updating:

- **Canvas presentation** (`CanvasPresentationContext.ts` lines 61, 74, 99): currently calls `plane.realizePoint2D()`, `plane.realizeLine2D()`, `plane.realizeCircle2D()`. These should call `world.realizePoint2D(point, context)`, `world.realizeLine2D(line, context)`, `world.realizeCircle2D(circle, context)` via new facade methods on `World`. `RealizationService` stays private inside `World`.
- **Tool read ports** (`ToolInteractionReadPort.ts` line 13): `realizePoint2D(point)` is called in tool hit-testing. This must also be updated to use `world.realizePoint2D(point, context)`.
- **Tools** (`CircleTool.ts` lines 55-56, `TangentLineToCircleThroughPointTool.ts` lines 62, 103): call `context.readPort.realizePoint2D()`. The read-port adapter must delegate to `RealizationService`.
- **3D presentation** (`ThreePresentationContext.ts`, `ThreeReconstructedElementReadPort.ts`, `ThreeGuideReadPort.ts`): calls `world.get3DPointRealization()` etc. These delegate to `RealizationStore` already; internal delegate changes from `RealizationStore` to `RealizationService`. No caller changes needed if `World` keeps convenience methods.
- **Utility functions** (`arcGeometry.ts` line 53-54, `coordinateTransform.ts` line 102): call `world.getProjectionPlane2DRealization()`. Again, `World` convenience methods stay; internal change only.
- **Operations**: Some operations call `world.invalidateRealization()`. Implementation changes but caller signature stays the same.

### Test Impact

- The characterization tests in `projectionPlane.characterization.spec.ts` test `plane.realizePoint2D()` etc. These need adaptation to call `RealizationService` instead.
- The `ProjectionPlaneElementStore.test.ts` tests cache clearing. These need to test `RealizationService.invalidateElement()` instead.
- Integration tests for invalidation cascades should verify that only the affected element IDs are cleared, not all planes.
- Add specific tests for auxiliary-projection-plane matrix invalidation (when a trace-line dependency is invalidated, the auxiliary plane's matrices should be cleared).

### Migration Strategy

1. Create `RealizationService.ts` with all cache maps, cache-or-compute methods, and `invalidateElement()`.
2. Change `World` to construct `RealizationService` instead of `RealizationStore`.
3. Add convenience methods to `World` for `realizePoint2D`, `realizeLine2D`, `realizeCircle2D`, `realizeProjectionPlane2D`, etc. that delegate to `RealizationService`. This reduces caller changes to a minimum.
4. Update `World.invalidateRealization()` to use targeted invalidation via `RealizationService.invalidateElement()`.
5. Update all callers of `plane.realize*()` and `plane.get*Realization2D()` to go through `World` or `RealizationService`.
6. Remove cache fields and methods from `ProjectionPlaneElementStore`.
7. Remove cache facade methods and `realize*` methods from `ProjectionPlane`.
8. Delete `RealizationStore.ts` and `ProjectionPlaneRealizationHelpers.ts`.
9. Update tests.

### Mutation Ordering Rule

When removing an element, the order must be:

1. **Invalidate caches** for the element and its dependents (requires dependency graph still intact).
2. **Remove the element** from storage.
3. **Unregister the element** from the dependency graph.

This ordering is critical because `invalidateElement` calls `dependencyQuery.getAllDependents(elementId)`, which needs the node still registered. If unregistering happens first, dependents are orphaned and their caches stale.

Currently `World.invalidateRealization()` is called before removal in deletion operations, and `unregisterNode` is called by `removePoint(id, context)` inside `ProjectionPlaneElementStore`. After Phase A, cache invalidation moves to `RealizationService` and deletion operations must call `world.invalidateRealization(id)` explicitly before `plane.removePoint(id, context)`. After Phase B removes the context parameter from `removePoint`/`removeLine`/`removeCircle`, deletion operations must also call `world.getDependencyRegistrar().unregisterNode(id)` explicitly after removal, following the mutation ordering rule:

```ts
// Correct order in ConstructionService or deletion operation:
world.invalidateRealization(pointId);   // 1. Invalidate caches (needs dependency graph)
plane.removePoint(pointId);             // 2. Remove from storage
dependencyRegistrar.unregisterNode(pointId); // 3. Unregister from dependency graph
```

### Validation
- `npm run build` succeeds.
- No import of `RealizationStore` remains.
- No import of `ProjectionPlaneRealizationHelpers` remains from production code.
- `ProjectionPlaneElementStore` has no realization-related methods.
- Auxiliary-projection-plane matrix caches are cleared when trace-line dependencies are invalidated (specific test case).

---

## Phase B: Extract Construction from ProjectionPlane

### Current State

`ProjectionPlane.ts` is 934 lines. Of these, approximately 550 lines (lines 305-934) are factory methods and ID generators:

- `generatePoint2DId`, `generateLine2DId`, `generateSegment2DId`, `generateCircle2DId`, `generateGuide2DId` --- ID generation (5 methods)
- `addFreePoint2D`, `addLineLineIntersection`, `addLineCircleIntersection`, `addCircleCircleIntersection`, `addLine2DBetweenTwoPoints`, `addLine2DParallelToLine`, `addLine2DPerpendicularToLine`, `addLine2DTangentToCircleThroughPoint`, `addLine2DTangentToCircleParallelToLine`, `addSegment2DBetweenPoints`, `addCircle2DByCenterAndPoint`, `addGuide2D`, `addSiblingGuide2D`, `addSiblingIntersectionPoint`, `addOriginPoint2D`, `addHalfHingeLine2D` --- 16 factory methods

These methods all take a `ProjectionPlaneMutationContext` parameter that provides:
- `getNextId()` --- ID generation
- `generateDefaultLabel(id, type)` --- label generation
- `getDependencyRegistrar()` --- dependency registration
- `getLine2D(id)`, `getPlaneForElement(id)`, `getHingeLineById(id)` --- cross-plane lookups

This means the factory methods already receive all their external dependencies through the context parameter. They do not need to live on `ProjectionPlane` itself.

After Phase A, `ProjectionPlane` will also have lost its realization cache methods (saving ~90 lines). The remaining non-factory content will be:
- Identity fields (`id`, `name`, `type`, `isActive`, `isVisible`, `color`, `plane3DId`)
- Element storage accessors (`getPoint`, `getAllPoints`, `addPoint`, `removePoint`, etc.)
- Abstract realization methods (`realize2D`, `realize3D`)
- Clone method

### Target State

A `ConstructionService` owns all construction methods. `ProjectionPlane` becomes a lean aggregate root holding identity, element storage, and abstract realization.

### New File: `ConstructionService.ts`

Location: `frontend/src/domain/world/ConstructionService.ts`

The service takes a narrow context interface rather than concrete `World`. This keeps it testable and avoids circular dependency on the full `World` type.

```ts
export interface ConstructionContext {
  getNextId(): number;
  generateDefaultLabel(elementId: string, elementType: string): string;
  getDependencyRegistrar(): DependencyRegistrarPort;
  getLine2D(id: string): Line2D | undefined;
  getPlaneForElement(id: string): ProjectionPlane | undefined;
  getHingeLineById(id: string): HingeLine | undefined;
}

export class ConstructionService {
  constructor(private readonly context: ConstructionContext) {}

  addFreePoint2D(
    plane: ProjectionPlane,
    position: Vector3,
    id?: string,
    label?: string
  ): FreePoint2D {
    const planeId = requirePlaneId(plane.id, 'point');
    const elementId = resolveElementId(id, () => buildElementId(plane.id, `point2d${this.context.getNextId()}`));
    const resolvedLabel = resolveDefaultLabel(label, elementId, 'Point2D', this.context);
    const point = new FreePoint2D(elementId, position, planeId, resolvedLabel);
    plane.addPoint(point);
    this.context.getDependencyRegistrar().registerNode(point.id, point.getDependencies());
    return point;
  }

  // ... all other factory methods, with same signatures minus the context parameter
  // since ConstructionService has direct access to context
}
```

Key design decisions:

- `ConstructionService` receives a `ConstructionContext` interface in its constructor. This is similar to the current `ProjectionPlaneMutationContext` but extracted to a standalone interface. Individual factory methods no longer take a `world` / `context` parameter.
- `ProjectionPlane.addPoint(point)`, `ProjectionPlane.addLine(line)`, `ProjectionPlane.addCircle(circle)` remain on ProjectionPlane as simple storage operations. They no longer take a context parameter because dependency registration is done by `ConstructionService` immediately after the `addPoint` call.
- ID generation helpers (`generatePoint2DId`, etc.) move to `ConstructionService` since they use `context.getNextId()`.
- Validation helpers (`requireLocalPoint`, `requireLocalLine`, etc.) stay in `ProjectionPlaneElementCreation.ts`. ConstructionService uses `plane` as the `ProjectionPlaneElementLookup` parameter.
- **Dependency registration and unregistration are both handled by `ConstructionService`.** The current `ProjectionPlaneElementStore.addPoint(point, context)` registers dependencies, and `removePoint(id, context)` unregisters them. After extraction, `ConstructionService.addFreePoint2D` calls `registerNode` and the corresponding remove operation calls `unregisterNode`. This ensures add/remove symmetry: every add path that registers also has a corresponding remove path that unregisters.

### Dependency Registration Symmetry

Currently, `ProjectionPlaneElementStore` maintains add/remove symmetry:

- `addPoint(point, context)` calls `context.getDependencyRegistrar().registerNode(point.id, point.getDependencies())`
- `removePoint(id, context)` calls `context.getDependencyRegistrar().unregisterNode(id)`

After extraction, `ConstructionService` handles add, and **deletion operations handle remove**. Currently, deletion operations call the corresponding remove method with a context parameter: `RemovePoint2DOp` calls `plane.removePoint(id, world)`, `RemoveLine2DOp` calls `plane.removeLine(id, world)`, `RemoveCircle2DOp` calls `plane.removeCircle(id, world)`, and `RemoveGuide2DOp` calls `plane.removeGuide(id, world)`. Each of these passes `world` as context, triggering unregistration inside the store. After Phase B, these methods no longer take a context parameter, so deletion operations must call `unregisterNode` explicitly.

Correct pattern:

```ts
// Add path (in ConstructionService)
addFreePoint2D(plane, position): FreePoint2D {
  const point = new FreePoint2D(...);
  plane.addPoint(point);  // pure storage
  this.context.getDependencyRegistrar().registerNode(point.id, point.getDependencies());
  return point;
}

// Remove path (in deletion operations, following mutation ordering rule)
// RemovePoint2DOp.apply():
world.invalidateRealization(pointId);       // 1. Invalidate caches first (needs dependency graph intact)
plane.removePoint(pointId);                  // 2. Remove from storage (no context)
world.getDependencyRegistrar().unregisterNode(pointId); // 3. Unregister from dependency graph
```

`ConstructionService` may also provide convenience `remove*` methods that encapsulate this three-step pattern, or each deletion operation can follow the pattern directly. Either way, the ordering rule (invalidate, remove, unregister) must be followed consistently.

### Changes to Existing Files

#### `ProjectionPlane.ts`

Remove all factory methods and ID generators (lines 305-934). After removal, `ProjectionPlane` contains:

- Field declarations: `name`, `isActive`, `isVisible`, `color`, `plane3DId`, `elementStore`
- Constructor
- `clear()`
- Element storage delegation: `addPoint`, `getPoint`, `getAllPoints`, `removePoint`, etc. (these become simpler --- no `context` parameter for `addPoint`/`addLine`/`addCircle`; dependency registration is done by `ConstructionService` after creation)
- Abstract `realize2D(context)` and `realize3D(context)`
- Abstract `clone()`
- Abstract `getDependencies()`

The simplified `addPoint` no longer needs `ProjectionPlaneStoreMutationContext`:

```ts
addPoint(point: Point2D): void {
  if (!point.id) throw new Error('Cannot add point without ID');
  this.elementStore.addPoint(point);
}
```

#### `ProjectionPlaneElementStore.ts`

- `addPoint`, `addLine`, `addCircle` no longer take `ProjectionPlaneStoreMutationContext`.
- `removePoint`, `removeLine`, `removeCircle` no longer take `ProjectionPlaneStoreMutationContext` and no longer perform dependency unregistration.
- Remove the `ProjectionPlaneStoreMutationContext` interface entirely.
- Dependency registration and unregistration are done by `ConstructionService`.

#### `ProjectionPlaneContext.ts`

- Remove `ProjectionPlaneMutationContext` since construction is no longer done through ProjectionPlane.
- Keep `ProjectionElementLookupContext`, `ProjectionRealizationLookupContext`, `ProjectionElementRealizationContext` --- these are still needed for realization.
- Remove or simplify `ProjectionOwnerPlaneQuery` if it was only used by factory methods.
- Add `ConstructionContext` interface (defined in `ConstructionService.ts` or `ProjectionPlaneContext.ts`). This interface is essentially `ProjectionPlaneMutationContext` extracted and renamed, since it captures the same capabilities but is now consumed by `ConstructionService` instead of being passed as a parameter.

#### `ProjectionPlaneElementCreation.ts`

- Keep all validation helper functions. They are pure functions that take a `ProjectionPlaneElementLookup` and/or the new `ConstructionContext`. After this change, they take `ConstructionContext` or the narrower interfaces it exposes.
- `resolveDefaultLabel` currently takes `ProjectionPlaneMutationContext`. Update to take `ConstructionContext` directly.

#### Operation files

All operation files that currently call `plane.addFreePoint2D(position, world)` change to:

```ts
constructionService.addFreePoint2D(plane, position);
```

No `world` parameter is needed since `ConstructionService` already has it.

`ConstructionService` is obtained from the `RuntimeSession` (or `World`, depending on how operations receive their context). Operations currently receive `World` via `apply(world: World)`. They can obtain `ConstructionService` via `world.getConstructionService()` or via a new operation context parameter (see Phase C for a broader discussion of operation context).

#### `FixedProjectionPlane.ts` and `AuxiliaryProjectionPlane.ts`

- `clone()` method currently calls factory methods on the cloned plane. After extraction, `clone()` creates new instances with the same fields but does not validate or register dependencies. The validation and registration happen through `ConstructionService` when the clone is populated.

### Test Impact

- Tests that currently call `plane.addFreePoint2D(...)` need `ConstructionService` instances.
- Unit tests for factory validation (wrong dependencies, etc.) move to `ConstructionService` tests.
- Characterization tests for `ProjectionPlane` reduce in scope (only storage and realization, no construction).
- Add tests verifying that dependency registration and unregistration remain symmetric after extraction.

### Migration Strategy

1. Create `ConstructionContext` interface (extracted from `ProjectionPlaneMutationContext`), defined in `ConstructionService.ts` alongside the service that consumes it.
2. Create `ConstructionService` class implementing all factory methods, using `ConstructionContext` in its constructor.
3. Update `World` to implement `ConstructionContext` and expose `getConstructionService()`.
4. Update all operation files to use `ConstructionService` instead of `ProjectionPlane` factory methods.
5. Verify add/remove dependency symmetry: ensure every `registerNode` in `ConstructionService` has a corresponding `unregisterNode` in undo paths.
6. Simplify `ProjectionPlane.addPoint`/`addLine`/`addCircle` to remove context parameter; extract dependency registration call to `ConstructionService`.
7. Remove `ProjectionPlaneMutationContext` interface.
8. Remove factory methods from `ProjectionPlane`.
9. Move ID generation helpers into `ConstructionService`.
10. Simplify `clone()` in `FixedProjectionPlane` and `AuxiliaryProjectionPlane`.
11. Update all tests.

### Validation

- `npm run test` passes.
- `npm run build` succeeds.
- `ProjectionPlane.ts` shrinks from ~934 lines to ~250-300 lines.
- No import of `ProjectionPlaneMutationContext` from production code remains.
- Factory methods are not called on `ProjectionPlane` instances in production code.
- Every `registerNode` call in `ConstructionService` has a corresponding `unregisterNode` in deletion operations.
- Deletion operations follow the mutation ordering rule: invalidate, then remove, then unregister.
- `RemovePoint2DOp`, `RemoveLine2DOp`, `RemoveCircle2DOp`, `RemoveGuide2DOp` call `world.invalidateRealization(id)` before `plane.removeX(id)`, and call `world.getDependencyRegistrar().unregisterNode(id)` after removal.

---

## Phase C: Extract Visibility from ProcessTree

### Current State

`ProcessTree.ts` (562 lines) defines three node types that mix history structure with presentation semantics:

**`Subprocess`** (lines 32-42):
```ts
interface Subprocess extends ProcessNodeBase {
  type: 'subprocess';
  name: string;
  children: (Subprocess | ActionGroup)[];
  showIntermediates: boolean;   // <-- visibility flag
  isOutput: boolean;            // <-- visibility flag
  defaultStyle?: VisualStyle;   // <-- presentation
}
```

**`ActionGroup`** (lines 51-58):
```ts
interface ActionGroup extends ProcessNodeBase {
  type: 'actionGroup';
  children: (ActionNode | null)[];
  isAuxiliary: boolean;  // <-- visibility flag
  isOutput: boolean;     // <-- visibility flag
}
```

**`ActionNode`** (via `Action`, line 75-77):
```ts
interface ActionNode extends ProcessNodeBase, Action {
  type: 'action';
}
// Action.isOutput is also a visibility flag
```

**`Action`** (`Action.ts`, lines 10-14):
```ts
interface Action {
  elementId: string;
  description: string;
  isOutput: boolean;  // <-- visibility flag
}
```

The `styleService.resolveVisibility()` function (lines 57-110 of `styleService.ts`) traverses the ProcessTree, checks `showIntermediates` and `isOutput` flags, and determines whether an element should be visible on canvas. This is a presentation computation that reads domain data.

`ProcessTreeReadModel.ts` copies `showIntermediates`, `isOutput`, `isAuxiliary` into view models. `ProcessTreeNode.vue` renders based on these flags.

`ProcessTree` also has methods that mutate visibility directly:
- `toggleSubprocessEncapsulation(subprocessId)` --- mutates `showIntermediates` (line 237)
- `toggleOutput(nodeId)` --- mutates `isOutput` on any node type (line 248)

### Target State

`ProcessTree` becomes a pure construction-history tree. Visibility flags move to a separate `VisibilityModel` owned by the application layer.

### Operation Context Prerequisite

Currently, all operations implement `apply(world: World)`. If `VisibilityModel` lives in the application layer (outside `World`), operations cannot access it through `World` without violating layer boundaries.

**Decision**: Introduce an `OperationContext` that bundles the runtime objects operations need. This is a pre-requisite step before Phase C.

```ts
export interface OperationContext {
  world: World;
  visibilityModel: VisibilityModel;
  // Extended in future phases as needed
}
```

The `IOperation.apply()` signature changes from `apply(world: World)` to `apply(context: OperationContext)`. This is a mechanical change: every operation file and `Command.ts` need to pass `OperationContext` instead of `World`. The `World` property remains accessible for domain mutations; `VisibilityModel` is the new addition for visibility mutations.

`RuntimeSession` (or equivalent) constructs the `OperationContext` from its owned `World` and `VisibilityModel`.

This is the same pattern already used for `ChangeNotifier`: operations receive it through `Command`, not directly from `World`. `OperationContext` generalizes this approach.

### New File: `VisibilityModel.ts`

Location: `frontend/src/application/processTree/VisibilityModel.ts`

```ts
export interface NodeVisibility {
  showIntermediates?: boolean;   // Subprocess only
  isOutput?: boolean;            // Subprocess, ActionGroup, Action
  isAuxiliary?: boolean;         // ActionGroup only
  defaultStyle?: VisualStyle;    // Subprocess only
}

export class VisibilityModel {
  private nodeVisibility = new Map<string, NodeVisibility>();

  private defaultsForType(nodeType: ProcessNodeType): NodeVisibility {
    switch (nodeType) {
      case 'subprocess':
        return { showIntermediates: true, isOutput: true };
      case 'actionGroup':
        return { isOutput: true, isAuxiliary: false };
      case 'action':
        return { isOutput: true };
    }
  }

  get(nodeId: string, nodeType: ProcessNodeType): NodeVisibility {
    return this.nodeVisibility.get(nodeId) ?? this.defaultsForType(nodeType);
  }

  setShowIntermediates(subprocessId: string, value: boolean): void {
    const entry = this.getOrCreate(subprocessId);
    entry.showIntermediates = value;
  }

  toggleOutput(nodeId: string, nodeType: ProcessNodeType): void {
    const current = this.get(nodeId, nodeType);
    const entry = this.getOrCreate(nodeId);
    entry.isOutput = !current.isOutput;
  }

  setAuxiliary(groupId: string, value: boolean): void {
    const entry = this.getOrCreate(groupId);
    entry.isAuxiliary = value;
  }

  setDefaultStyle(nodeId: string, style: VisualStyle | undefined): void {
    const entry = this.getOrCreate(nodeId);
    entry.defaultStyle = style;
  }

  clear(): void { this.nodeVisibility.clear(); }
}
```

### New File: `OperationContext.ts`

Location: `frontend/src/commands/operations/OperationContext.ts`

```ts
import type { World } from '@/domain/world/World';
import type { VisibilityModel } from '@/application/processTree/VisibilityModel';

export interface OperationContext {
  readonly world: World;
  readonly visibilityModel: VisibilityModel;
}
```

### Changes to Existing Files

#### `IOperation.ts`

- Change `apply(world: World)` to `apply(context: OperationContext)`.
- Change `undo(world: World)` to `undo(context: OperationContext)`.
- Update `OperationResult` if it references `World`.

#### `Command.ts`

- `Command` currently holds `world: World` and passes it to operations. Change to hold `context: OperationContext` and pass it through.
- `CommandSnapshot` serialization is unaffected (it serializes descriptors, not world references).

#### All operation files

- Every operation's `apply(world)` and `undo(world)` changes to `apply(context)` and `undo(context)`.
- Access `world` via `context.world` and `visibilityModel` via `context.visibilityModel`.
- This is a mechanical find-and-replace for `world` -> `context.world`, plus explicit `visibilityModel` usage where needed.

#### `ProcessTree.ts`

- Remove `showIntermediates` from `Subprocess`. Default was `true`; `VisibilityModel` defaults to `true` for new subprocesses.
- Remove `isOutput` from `Subprocess`. Default was `true`; `VisibilityModel` defaults to `true`.
- Remove `defaultStyle` from `Subprocess`.
- Remove `isAuxiliary` from `ActionGroup`. Default was `false`; `VisibilityModel` defaults to `false`.
- Remove `isOutput` from `ActionGroup` and `ActionNode`/`Action`. Default was `true`; `VisibilityModel` defaults to `true`.
- Remove `toggleSubprocessEncapsulation()` method.
- Remove `toggleOutput()` method.
- **Add `findNodeById(nodeId: string): ProcessNode | undefined`** method to `ProcessTree`. This enables `ToggleOutputOp` and other operations to look up a node's type. Currently `ProcessTree` has `findSubprocessById` and `findAction` but no general node-by-ID lookup.
- `pushSubprocess()` and `addSubprocess()` no longer set `showIntermediates: true`, `isOutput: true`.

Pure `Subprocess`:
```ts
interface Subprocess extends ProcessNodeBase {
  type: 'subprocess';
  name: string;
  children: (Subprocess | ActionGroup)[];
}
```

Pure `ActionGroup`:
```ts
interface ActionGroup extends ProcessNodeBase {
  type: 'actionGroup';
  children: (ActionNode | null)[];
}
```

Pure `Action`:
```ts
interface Action {
  elementId: string;
  description: string;
}
```

#### `Action.ts`

- Remove `isOutput` from `Action` interface.
- `createAction()` no longer sets `isOutput: true`.

#### `styleService.ts`

- Change `resolveVisibility()` signature from `(element: Element, world: World)` to `(element: Element, tree: ProcessTree, visibilityModel: VisibilityModel)`. `world` is still needed indirectly via `tree`, but `styleService` should receive the tree and visibility model explicitly rather than reaching through `World`.
- The visibility traversal logic stays the same, but reads visibility flags from `VisibilityModel.get(nodeId, nodeType)` instead of from `ProcessNode` properties.
- The tree traversal for finding the path stays the same (the tree structure is still needed to determine ancestry).

#### `ProcessTreeReadModel.ts`

- Read `showIntermediates`, `isOutput`, `isAuxiliary` from `VisibilityModel` instead of from `Subprocess` / `ActionGroup` / `ActionNode`.
- This requires `VisibilityModel` to be available when building read models. Pass it through the constructor or build method.

#### `ProcessTreeNode.vue`

- Receive visibility data from `VisibilityModel` through the read model, not directly from tree nodes.

#### Operations that toggle visibility

Existing operations are modified to use `VisibilityModel` instead of `ProcessTree`:

- `ToggleEncapsulationOp`: currently calls `tree.toggleSubprocessEncapsulation(id)`. Change to `context.visibilityModel.setShowIntermediates(id, !context.visibilityModel.get(id, 'subprocess').showIntermediates)`.
- `ToggleOutputOp`: currently calls `tree.toggleOutput(nodeId)`. Change to `context.visibilityModel.toggleOutput(nodeId, nodeType)`. The operation needs to know the node type. **Add `ProcessTree.findNodeById(nodeId): ProcessNode | undefined`** so `ToggleOutputOp` can look up the type. Alternatively, include `nodeType` in the `ToggleOutput` descriptor. The `findNodeById` method is cleaner because it avoids enlarging descriptors and supports future operations that need node lookup.
- `ToggleEncapsulationOp` and `ToggleOutputOp` undo by toggling again (they are their own inverse). This works with `VisibilityModel.toggleOutput()` and `setShowIntermediates()` because toggling twice restores the original state.
- `defaultStyle` mutations: there is currently no `SetProcessNodeStyleOp` operation in the codebase. If `defaultStyle` is set only during initialization and never toggled by users, no operation is needed and it can default through `VisibilityModel.defaultsForType()`. If user-togglable `defaultStyle` is needed in the future, a `SetProcessNodeStyleOp` must be created.
- `isAuxiliary` mutations: there is currently no `SetAuxiliaryOp` or `ToggleAuxiliaryOp`. `isAuxiliary` is set at creation time in `AddProcessTreeActionGroupOp`. If `isAuxiliary` needs to be user-togglable later, a `ToggleAuxiliaryOp` must be created. For now, `isAuxiliary` defaults via `VisibilityModel.defaultsForType('actionGroup').isAuxiliary` and is set by the group-creation operation applying a visibility override if non-default.

`AddProcessTreeActionGroupOp` currently sets `isOutput` and `isAuxiliary` on the `ActionGroup` during `apply()`. After extraction, these flags are not set on the group. Instead, visibility defaults are applied automatically by `VisibilityModel.get()` returning defaults. If the group was created with non-default flags, the operation must also call `VisibilityModel` methods to set them. Since `isOutput` defaults to `true` and `isAuxiliary` defaults to `false`, and the current `createActionGroup()` defaults match, most groups need no explicit visibility overrides. Only groups with `isAuxiliary: true` (which currently never happens at creation time) or `isOutput: false` need an explicit `VisibilityModel` call.

`AddProcessTreeActionOp` currently includes `isOutput: this.action.isOutput` in serialization. After extraction, `Action.isOutput` no longer exists. The `isOutput` flag for actions is stored in `VisibilityModel`. See the persistence section below.

### Persistence Design

#### Current State

Currently, visibility flags are serialized in two places:

1. **`AddProcessTreeActionGroupOp.serialize()`** stores `isOutput: this.group.isOutput, isAuxiliary: this.group.isAuxiliary` in the operation descriptor. The restore function (`registerProcessTreeOperationDescriptors.ts` lines 32-33) sets these flags on the `ActionGroup`.

2. **`AddProcessTreeActionOp.serialize()`** stores `isOutput: this.action.isOutput` in the operation descriptor. The restore function (line 24) reads `isOutput: b(action, 'isOutput')` and passes it to `createAction()`.

3. **`PushSubprocessOp`** does NOT store `showIntermediates` or `isOutput` in its descriptor. It only stores `subprocessName` and `subprocessId`. Defaults in `ProcessTree.pushSubprocess()` set `showIntermediates: true, isOutput: true`.

4. **`ToggleEncapsulationOp`** and **`ToggleOutputOp`** are separate operations that toggle flags. They are replayed during load.

**Correction from earlier draft**: The earlier draft claimed `PushSubprocessDescriptor` stored `showIntermediates` and `isOutput`. This is incorrect. Current `PushSubprocessOp` only stores `subprocessName` and `subprocessId`. The visibility defaults come from `ProcessTree.pushSubprocess()`.

#### Migration Strategy

Visibility mutations (`ToggleEncapsulationOp`, `ToggleOutputOp`) remain as replayed commands. They mutate `VisibilityModel` instead of `ProcessTree`. This preserves undo/redo semantics: toggling visibility is a command like any other.

`AddProcessTreeActionGroupOp` and `AddProcessTreeActionOp` lose their `isOutput`/`isAuxiliary` fields from serialization. Instead:
- On replay, `AddProcessTreeActionGroupOp` creates the group and `VisibilityModel` defaults apply automatically (`isOutput: true, isAuxiliary: false`).
- If the group had been toggled before save, subsequent `ToggleOutputOp` commands in the command stream apply the toggled state. A hypothetical future `ToggleAuxiliaryOp` would handle `isAuxiliary` toggles if that feature is ever needed.

This means **no `VisibilityModel` snapshot is needed**. The command stream remains the single source of truth. Visibility state is entirely derivable from replaying commands, just as it is today. The only difference is which data structure the operations mutate (`VisibilityModel` instead of `ProcessTree` node properties).

**ProjectData schema change**: Remove `isOutput` and `isAuxiliary` from `AddProcessTreeActionGroupDescriptor` and `isOutput` from `AddProcessTreeActionDescriptor` action payloads. Bump `SCHEMA_VERSION` since these descriptors change shape. Since backward compatibility is not a constraint, no migration path for old project files is required. Old project files with the previous schema version will be rejected by `ProjectService.validateProjectData()` with a version mismatch error, which is the existing behavior for any schema change.

This approach avoids the dual-source-of-truth problem: visibility is not both snapshot-derived and command-derived. Commands are the canonical source. `toSnapshot()` and `fromSnapshot()` methods are not needed for persistence. They may be useful for runtime efficiency (e.g., rebuilding `VisibilityModel` state quickly after command replay), but this is an optimization that can be added later if needed.

### Migration Strategy

1. **Create `OperationContext` interface** with `world` and `visibilityModel` fields.
2. **Refactor `IOperation`** to `apply(context: OperationContext)` and `undo(context: OperationContext)`. This is a mechanical change across all operation files.
3. **Refactor `Command`** to hold `OperationContext` instead of `World`.
4. **Create `VisibilityModel` class** with `get`/`set`/`toggle` methods and default visibility values.
5. **Add `VisibilityModel` to `RuntimeSession`** (or equivalent) as an owned field, constructed alongside `World`.
6. **Wire `OperationContext` construction** in `RuntimeSession`: `{ world, visibilityModel }`.
7. **Move visibility mutations in operations** from `ProcessTree` to `VisibilityModel`:
   - `ToggleEncapsulationOp` mutates `visibilityModel` instead of `tree`.
   - `ToggleOutputOp` mutates `visibilityModel` instead of `tree`.
8. **Update `styleService.resolveVisibility()`** to accept `(element: Element, tree: ProcessTree, visibilityModel: VisibilityModel)` and read flags from `visibilityModel.get()` instead of tree node properties.
9. **Change `ProcessTreeReadModel`** to read from `VisibilityModel`.
10. **Remove visibility flags from `Subprocess`, `ActionGroup`, `ActionNode`, `Action`** once all readers and writers use `VisibilityModel`.
11. **Remove `toggleSubprocessEncapsulation()` and `toggleOutput()`** from `ProcessTree`. Add `findNodeById()` method.
12. **Remove `isOutput`/`isAuxiliary` from operation descriptors** (`AddProcessTreeActionGroupOp.serialize()`, `AddProcessTreeActionOp.serialize()`, `registerProcessTreeOperationDescriptors.ts`). Bump schema version. Old project files with the previous schema version will be rejected by `ProjectService.validateProjectData()` with a version mismatch error (existing behavior for any schema change).
13. **Update all tests.**

### Validation

- `npm run test` passes.
- `npm run build` succeeds.
- `ProcessTree.ts` no longer imports `VisualStyle` or contains `showIntermediates`, `isOutput`, `isAuxiliary`, `defaultStyle`.
- `Action.ts` no longer contains `isOutput`.
- `styleService.resolveVisibility()` produces the same results for all test cases.
- `ToggleEncapsulationOp` and `ToggleOutputOp` undo/redo correctly via `VisibilityModel`.
- Save and load round-trips produce identical visibility behavior.
- Old project files with previous schema version are rejected by `ProjectService.validateProjectData()` (this is the existing behavior for any schema change; no special migration code needed).
- `ToggleOutputOp` correctly resolves node type via `ProcessTree.findNodeById()`.
- Mutation ordering rule (invalidate before remove before unregister) is followed in all deletion operations.

---

## Execution Order

Phase A first, because:
- It makes Phase B easier (simpler `ProjectionPlane` after removing cache methods).
- It is independently testable.
- It fixes a real inefficiency (sweeping all planes on every invalidation).

Phase B second, because:
- It depends on Phase A for the simpler `ProjectionPlaneElementStore`.
- It is the largest change (touching every operation caller) but is mechanically straightforward.

Phase C last, because:
- It is fully independent of A and B.
- It touches the operation interface (`apply(world)` to `apply(context)`), which affects all operations.
- It modifies serialization schema, which requires careful migration testing.
- The `OperationContext` introduction can be done as a separate prep step before the visibility extraction itself.

### Prep Step: OperationContext Introduction (Phase C prerequisite)

Before Phase C's visibility extraction, introduce `OperationContext` as a mechanical refactor. This is a **wide but mechanical change** --- it touches every operation file, `Command.ts`, `CommandStack.ts`, `ProjectService.deserializeCommands()`, `RuntimeCommandProducer`, `initializeWorld()`, and all command factory files. It is safe because `OperationContext` just wraps `World` with one field, but it must be done carefully across all these sites:

1. Create `OperationContext` interface with `world: World` only (no `visibilityModel` yet).
2. Change `IOperation.apply(world)` to `apply(context)`, `undo(world)` to `undo(context)`.
3. Change `Command` constructor and `Command.restore()` to accept `OperationContext` instead of `World`.
4. Change `Command.addAndExecute()` and other `Command` methods to pass `context` to operations instead of `world`.
5. Update `CommandStack` if it passes `World` directly.
6. Update `ProjectService.deserializeCommands()` to construct `OperationContext` from `World`.
7. Update `RuntimeCommandProducer` and `initializeWorld()` to construct `OperationContext`.
8. All operations use `context.world` instead of `world`.
9. Verify all tests pass.

---

## Expected Outcome

| Metric | Before | After |
| --- | ---: | ---: |
| `ProjectionPlane.ts` lines | 934 | ~250-300 |
| `ProjectionPlaneElementStore.ts` lines | 94 | ~40 |
| `ProcessTree.ts` lines | 562 | ~350 |
| Cache invalidation sweep scope | All planes | Affected elements + affected projection planes |
| Visibility flag locations | 3 domain types + `ProcessTree` methods | 1 `VisibilityModel` class |
| Places where `ProjectionPlaneMutationContext` is needed | All construction callers | Removed (absorbed by `ConstructionContext`) |
| Operation interface | `apply(world: World)` | `apply(context: OperationContext)` |

After all three phases, the domain layer has clean separations:
- `ProjectionPlane` --- identity, element storage, realization delegates
- `ConstructionService` --- element creation orchestration
- `RealizationService` --- all caches, targeted invalidation
- `ProcessTree` --- pure history tree
- `VisibilityModel` --- presentation visibility rules
- `OperationContext` --- runtime context for operations (world + visibility model)

Each can be tested independently and evolved without cascading changes.
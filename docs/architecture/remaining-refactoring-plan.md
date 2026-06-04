# Remaining Refactoring Before Features

Date: 2026-06-04

## Problem

After the concern-separation work (Phases A-C), `World.ts` remains a 1085-line god object. It still owns 3D element construction, 3D element removal, plane/hinge construction, and several facade methods that should live elsewhere. Meanwhile, `ConstructionService` only handles 2D -- the four `Add3D*Op` operations bypass it and call `context.world.add3D*` directly. This asymmetry will block feature work (adding undo for 3D, auxiliary-plane strand lines, etc.) because every new feature reinforces the god-object pattern.

## Current File Sizes

| File | Lines | Target |
|---|---|---|
| `World.ts` | 1085 | ~500 |
| `ConstructionService.ts` | 278 | ~400 (with 3D methods) |
| `ProjectionPlane.ts` | 193 | (done) |
| `ProjectionPlaneElementStore.ts` | 46 | (done) |
| `ProcessTree.ts` | 486 | (done for now) |

## Design Principles

Same principles as the concern-separation plan:

1. Each module owns exactly one concern.
2. Factory methods live near their callers (operations), not near their storage.
3. `World` is a root container and facade, not a factory or god object.
4. Every add/remove path maintains mutation ordering: invalidate before remove before unregister.

---

## Phase D: Extract 3D Construction into ConstructionService

### Current State

`Add3DPointOp`, `Add3DLineOp`, `Add3DSegmentOp`, and `Add3DPlaneOp` all:
- Generate IDs via `context.world.generate3D*Id()`
- Generate labels via `context.world.generateDefaultLabel()`
- Construct domain objects inline (`new Point3DFromProjections(...)`, etc.)
- Call `context.world.add3D*(...)` for storage and dependency registration
- Call `context.world.invalidateRealization()` in their undo paths

`World.ts` contains these methods:
- `add3DPoint(point)` -- stores in `points3D` map, registers dependency
- `add3DLine(line)` -- stores in `lines3D` map, registers dependency
- `add3DSegment(segment)` -- stores in `segments3D` map, registers dependency
- `add3DPlane(plane)` -- stores in `planes3D` map, registers dependency
- `addPlane3DFixed(point, normal)` -- constructs `Plane3DFixed`, stores, registers
- `addHingeLine(hingeLine)` -- stores in `hingeLines` map, registers
- `addHingeLineEntity(hingeLine)` -- stores in `hingeLines` map (no registration)
- `addProjectionPlane(...)` -- constructs `FixedProjectionPlane`, stores, registers
- `remove3DPoint(id)` -- invalidate + delete + unregister
- `remove3DLine(id)` -- invalidate + delete + unregister
- `remove3DSegment(id)` -- invalidate + delete + unregister
- `remove3DPlane(id)` -- invalidate + delete + unregister
- `removePlane3DByIdForUndo(id)` -- delegates to `remove3DPlane`
- `removeCircle2DGeneric(id)` -- dead code, zero external callers
- `removeProjectionPlaneByIdForUndo(id)` -- invalidate + remove + unregister
- `removeHingeLineByIdForUndo(id)` -- remove from map

Plus validation helpers: `validateDifferentPlanes` duplicated across Point3D, Line3D, Segment3D, Plane3D.

### Target State

`ConstructionService` gains 3D construction methods. `World` retains only lean storage maps and facade accessors. Operations route through `ConstructionService`.

### New Methods on ConstructionService

```ts
// 3D element construction
add3DPoint(planeH: ProjectionPlane, planeV: ProjectionPlane, pointHId: string, pointVId: string, id?: string, label?: string): Point3DFromProjections
add3DLine(planeH: ProjectionPlane, planeV: ProjectionPlane, lineHId: string, lineVId: string, id?: string, label?: string): Line3DFromProjections
add3DSegment(planeH: ProjectionPlane, planeV: ProjectionPlane, segmentHId: string, segmentVId: string, id?: string, label?: string): Segment3DFromProjections
add3DPlane(traceLineHId: string, traceLineVId: string, planeHId: string, planeVId: string, id?: string, label?: string): Plane3DFromTraces
addPlane3DFixed(point: Vector4, normal: Vector4, id?: string, label?: string): Plane3DFixed
```

### Changes to Existing Files

#### `World.ts`

- Remove `add3DPoint`, `add3DLine`, `add3DSegment`, `add3DPlane`, `addPlane3DFixed`, `addHingeLine`, `addHingeLineEntity`, `addProjectionPlane`.
- Remove `removeCircle2DGeneric` (dead code, zero callers).
- Keep simple storage accessors: `get3DPoint`, `get3DLine`, `get3DSegment`, `get3DPlane`, `getAll3D*`, `points3D`, `lines3D`, `segments3D`, `planes3D` maps.
- Keep `remove3DPoint`, `remove3DLine`, `remove3DSegment`, `remove3DPlane` but simplify to: invalidate + map.delete + unregister. Or move to `ConstructionService` as `remove3D*` convenience methods.
- Keep `removeProjectionPlaneByIdForUndo`, `removeHingeLineByIdForUndo` as thin wrappers or move to `ConstructionService`.
- Keep ID generation methods (`generate3DPointId` etc.) temporarily, or move to `ConstructionService`.

#### `World.ts` removal methods -- mutation ordering

Current `remove3D*` methods already follow: invalidate, remove from map, unregister. This is correct. They can stay on `World` as thin convenience methods since they are analogous to the 2D removal operations that stayed on `World`. The key is that no construction logic remains on `World`.

#### `Add3DPointOp.ts`, `Add3DLineOp.ts`, `Add3DSegmentOp.ts`, `Add3DPlaneOp.ts`

- Replace `context.world.add3D*` with `context.world.getConstructionService().add3D*`.
- Replace `context.world.generate3D*Id()` with `context.world.getConstructionService().generate3D*Id()`.
- Replace inline `new Point3DFromProjections(...)` etc. with `ConstructionService` methods.
- Keep validation errors in `ConstructionService` methods, matching the 2D pattern.

#### `InitializationOps.ts`

- Currently calls `world.addProjectionPlane(...)`, `world.addHingeLine(...)`, `world.addPlane3DFixed(...)`.
- Change to `constructionService.addProjectionPlane(...)`, `constructionService.addHingeLine(...)`, `constructionService.addPlane3DFixed(...)`.
- `ConstructionService` must gain `addProjectionPlane` and `addHingeLine`.

#### `AddBrokenHingeLineOp.ts`

- Currently calls `world.addHingeLineEntity(halfHingeLine)`.
- Change to call through `ConstructionService`.

#### `ConstructionService.ts`

- Add `add3DPoint`, `add3DLine`, `add3DSegment`, `add3DPlane`, `addPlane3DFixed`, `addProjectionPlane`, `addHingeLine`, `addHingeLineEntity`.
- Add 3D ID generation: `generate3DPointId()`, `generate3DLineId()`, `generate3DSegmentId()`, `generate3DPlaneId()`.
- Move `validateDifferentPlanes` from duplicated static methods on domain types to `ConstructionService` or a shared validation helper.
- Each method: validate inputs, construct domain object, call `plane.addPoint()` / `world.add3DPoint()` for storage, register dependency.

#### Validation helpers

`validateDifferentPlanes` is duplicated identically in `Point3D.ts`, `Line3D.ts`, `Segment3D.ts`, and `Plane.ts`. Move to `ProjectionPlaneElementCreation.ts` or a new `ConstructionValidation.ts` next to `ConstructionService.ts`.

### Validation

- `npm run build` succeeds.
- `npm run test` passes.
- `World.ts` shrinks from ~1085 to ~500-600 lines.
- `ConstructionService.ts` grows from ~278 to ~400-450 lines.
- 3D operations route through `ConstructionService` like 2D operations.
- `removeCircle2DGeneric` is deleted.

### Expected Outcome

| Metric | Before | After |
|---|---|---|
| `World.ts` lines | 1085 | ~500-600 |
| `ConstructionService.ts` lines | 278 | ~400-450 |
| Dead code (`removeCircle2DGeneric`) | 1 method | 0 |
| 3D ops bypassing ConstructionService | 4 ops | 0 |
| `validateDifferentPlanes` duplications | 4 copies | 1 |

---

## Phase E: Clean Up World Mutations and Remaining Dead Code

These are smaller cleanups that should follow Phase D.

### E.1 Remove `removePlane3DByIdForUndo` / `removeHingeLineByIdForUndo` indirections

These `*ForUndo` methods on `World` are thin wrappers around `remove3DPlane` / map deletion. They add no value and hide the mutation ordering. Their callers (3D undo operations) should call the removal methods directly.

### E.2 Simplify `World.clear()`

Currently iterates planes and calls `plane.clear()`, then clears maps. After Phase A, `this.realizationService.clear()` is already called. Verify no redundant clearing.

### E.3 Consolidate 3D element storage accessors

`World` has `getAll3DPoints()`, `getAll3DLines()`, `getAll3DSegments()`, `getAll3DPlanes()` as separate methods. Consider whether a single generic accessor or direct map access is cleaner. Low priority.

### E.4 Extract `WorldIdAllocator` usage

`World.getNextId()`, `World.generate3DPointId()`, etc. delegate to `WorldIdAllocator`. After 3D construction moves to `ConstructionService`, most ID generation callers shift. Evaluate whether `WorldIdAllocator` should be owned by `ConstructionService` instead of `World`.

---

## Execution Order

Phase D first. It is the highest-value change:
- Removes the last category of god-object methods from `World`.
- Brings 3D construction in line with 2D construction architecture.
- Deletes dead code.
- Unblocks future 3D features (undo, strand construction, etc.).

Phase E items are optional and can be done opportunistically during feature work.

---

## Risk Assessment

- **Phase D is low risk**: it follows the identical pattern established in Phase B for 2D construction. The `ConstructionContext` interface already has `getLine2D()` and `getPlaneForElement()` which are sufficient for most 3D validation. 3D validation may need `getPoint3D()` or `getLine3D()` lookups -- add those to `ConstructionContext`.
- **No persistence changes**: 3D operation descriptors are unchanged. Only the operation implementation changes.
- **No schema version bump**: no descriptor shapes change.
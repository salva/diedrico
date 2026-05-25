# Proposal Direct — Wave 002: Split `ProjectionPlane.ts` around stable responsibilities

**Stage:** `cycle-002-fresh-scout-proposals`  
**Proposal type:** Direct implementation of the Wave 002 plan  
**Expected behavior change:** none; module/import structure and type contracts improve while geometric behavior remains equivalent.

## Summary

Split `frontend/src/domain/world/ProjectionPlane.ts` into focused projection-plane domain modules:

- realization value types,
- narrow realization/context contracts,
- base plane abstraction and element ownership/caches,
- fixed projection planes,
- auxiliary projection planes,
- optional plane construction helper mixins/functions only where needed to avoid leaving the base module as another god-module.

This is the most direct implementation because it keeps the current public plane API largely intact for operations/tests while deleting the all-in-one monolith and replacing broad `any` realization contexts with typed contracts.

## Current evidence

- `ProjectionPlane.ts` is still 1,797 lines and combines every target responsibility (`architecture-audit/cycle-002-split-projection-plane-domain-god-module/validation/read-only-scout.stdout.log`).
- Realization value types are embedded in the same file as every plane class (`frontend/src/domain/world/ProjectionPlane.ts:80-116`, `frontend/src/domain/world/ProjectionPlane.ts:126-162`).
- The base class owns element maps/caches (`frontend/src/domain/world/ProjectionPlane.ts:176-198`) and also performs optional `World` side effects in collection mutation methods (`frontend/src/domain/world/ProjectionPlane.ts:244-252`).
- The same class defines many construction helpers for points, lines, circles, guides, sibling helpers, and half-hinge lines (`frontend/src/domain/world/ProjectionPlane.ts:779-875`, `frontend/src/domain/world/ProjectionPlane.ts:938-1045`, `frontend/src/domain/world/ProjectionPlane.ts:1109-1145`, `frontend/src/domain/world/ProjectionPlane.ts:1150-1157`, `frontend/src/domain/world/ProjectionPlane.ts:1410-1413`).
- Abstract and concrete realization methods use `any` contexts (`frontend/src/domain/world/ProjectionPlane.ts:1428`, `frontend/src/domain/world/ProjectionPlane.ts:1436`, `frontend/src/domain/world/ProjectionPlane.ts:1578`, `frontend/src/domain/world/ProjectionPlane.ts:1600`, `frontend/src/domain/world/ProjectionPlane.ts:1689`, `frontend/src/domain/world/ProjectionPlane.ts:1747`).
- Fixed plane behavior is separable (`frontend/src/domain/world/ProjectionPlane.ts:1533-1615`), and auxiliary trace behavior is separable (`frontend/src/domain/world/ProjectionPlane.ts:1635-1797`).

## Target module layout

Create a projection-plane subdirectory and move the current responsibilities into focused files:

```text
frontend/src/domain/world/projectionPlane/
  ProjectionPlaneRealization.ts       # ProjectionPlaneRealization2D/3D value types
  ProjectionPlaneContext.ts           # typed realization + mutation context contracts
  ProjectionPlaneElementStore.ts      # element maps and realization-cache ownership helper
  ProjectionPlane.ts                  # abstract base plane; delegates storage to store/helper
  FixedProjectionPlane.ts             # fixed/base P_H/P_V planes
  AuxiliaryProjectionPlane.ts         # trace-driven auxiliary plane
  ProjectionPlaneConstruction.ts      # construction helpers extracted from base class, if needed
```

Import consumers should target the specific module they need, for example:

- `World.ts` imports `ProjectionPlane` from `./projectionPlane/ProjectionPlane`, realization types from `./projectionPlane/ProjectionPlaneRealization`, and `FixedProjectionPlane` from `./projectionPlane/FixedProjectionPlane`.
- `AddAuxiliaryProjectionPlaneOp.ts` imports `AuxiliaryProjectionPlane` from `@/domain/world/projectionPlane/AuxiliaryProjectionPlane`.
- Type-only consumers import `ProjectionPlane` from `@/domain/world/projectionPlane/ProjectionPlane`.

Do not create `frontend/src/domain/world/ProjectionPlane.ts` as a compatibility barrel unless review explicitly rejects direct import cleanup. The direct path deletes the old monolith.

## Contract changes

Introduce narrow contracts in `ProjectionPlaneContext.ts`:

```ts
export interface ProjectionPlaneRealizationContext {
  getLine2D(id: string): Line2D | undefined;
}

export interface ProjectionPlaneMutationContext extends ProjectionPlaneRealizationContext {
  getNextId(): number;
  generateDefaultLabel(elementId: string, elementType: string): string;
  getDependencyService(): DependencyRegistrar;
  markDirty(): void;
  getProjectionPlaneById(id: string): ProjectionPlane | undefined;
  getHingeLineById(id: string): HingeLine | undefined;
  getSiblingPlaneForIntersection(point: Point2D): string | undefined;
}
```

The exact method set should be derived mechanically from the extracted helper methods, but the principle is binding: replace `world: any` realization signatures with a named domain read context and replace `world?: import('./World').World` collection side-effect parameters with a named mutation/dependency context. `World` already satisfies these methods without adapter code.

Fixed planes should accept an unused optional typed context only if required for API symmetry:

```ts
realize2D(_context?: ProjectionPlaneRealizationContext): ProjectionPlaneRealization2D
realize3D(_context?: ProjectionPlaneRealizationContext): ProjectionPlaneRealization3D
```

Auxiliary planes should require the typed realization context because trace line lookup is necessary.

## Files to change

### Domain files

- Delete/split `frontend/src/domain/world/ProjectionPlane.ts`.
- Add `frontend/src/domain/world/projectionPlane/ProjectionPlaneRealization.ts`.
- Add `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`.
- Add `frontend/src/domain/world/projectionPlane/ProjectionPlaneElementStore.ts`.
- Add `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts`.
- Add `frontend/src/domain/world/projectionPlane/FixedProjectionPlane.ts`.
- Add `frontend/src/domain/world/projectionPlane/AuxiliaryProjectionPlane.ts`.
- Add `frontend/src/domain/world/projectionPlane/ProjectionPlaneConstruction.ts` only if keeping construction helpers as prototype methods would leave the base module too large.
- Update `frontend/src/domain/world/World.ts` imports and type references (`frontend/src/domain/world/World.ts:92`).
- Update any domain world barrel if it exports projection-plane symbols (`frontend/src/domain/world/index.ts`).

### Command/application consumers

- Update `frontend/src/commands/operations/world/AddAuxiliaryProjectionPlaneOp.ts` import for `AuxiliaryProjectionPlane` (`frontend/src/commands/operations/world/AddAuxiliaryProjectionPlaneOp.ts:21-24`).
- Update any operation/factory imports discovered by a full grep before implementation.

### Test consumers

- Update tests importing from `@/domain/world/ProjectionPlane` or relative `ProjectionPlane` paths.
- Replace stale `BaseProjectionPlane` test imports/types with `FixedProjectionPlane` or `ProjectionPlane` as appropriate. Current evidence shows `BaseProjectionPlane` appears in tests but is not exported by the current file (`architecture-audit/cycle-002-split-projection-plane-domain-god-module/validation/symbol-surfaces.stdout.log`; `frontend/tests/unit/projectionPlane.spec.ts:9`, `frontend/tests/unit/projectionPlane.spec.ts:180-183`).

## DELETE list

- Delete the old all-in-one `frontend/src/domain/world/ProjectionPlane.ts` file after replacement modules and imports are updated.
- Delete all `realize2D(world: any)` / `realize3D(world: any)` signatures in projection-plane classes addressed by this split.
- Delete stale `BaseProjectionPlane` imports/types in tests unless a real class with that name is intentionally introduced. Prefer not to introduce the class because current runtime class is `FixedProjectionPlane`.
- Delete any `ProjectionPlane.ts` compatibility barrel or re-export if it exists only to hide the old monolith.
- Delete auxiliary-plane `console.log` debug noise inside realization if not required by tests/behavior (`frontend/src/domain/world/ProjectionPlane.ts:1694-1697`, `frontend/src/domain/world/ProjectionPlane.ts:1710`, `frontend/src/domain/world/ProjectionPlane.ts:1719`, `frontend/src/domain/world/ProjectionPlane.ts:1763`). Keep explicit error reporting only if reviewed as user-meaningful or diagnostically necessary.
- Delete obsolete comments that claim a dual-storage migration period is active; the base class comment still says “Dual storage period” (`frontend/src/domain/world/ProjectionPlane.ts:167-171`) even though current ownership is `ProjectionPlane`.

## Implementation steps

1. Create the `projectionPlane/` subdirectory and move realization value types into `ProjectionPlaneRealization.ts` without behavior changes.
2. Define typed realization/mutation contexts in `ProjectionPlaneContext.ts` and update fixed/auxiliary/base signatures away from `any`.
3. Extract element maps and realization caches into `ProjectionPlaneElementStore.ts`; keep public methods on `ProjectionPlane` initially delegating to the store so operations/tests do not need broad behavior rewrites.
4. Move the abstract `ProjectionPlane` base into `projectionPlane/ProjectionPlane.ts` with metadata, storage delegation, shared backward-matrix helpers, and either delegated or mixed-in construction helper methods.
5. Move `FixedProjectionPlane` to `FixedProjectionPlane.ts`.
6. Move `AuxiliaryProjectionPlane` to `AuxiliaryProjectionPlane.ts` and replace `any` context plus debug logging as described.
7. Update imports in `World.ts`, `AddAuxiliaryProjectionPlaneOp.ts`, type collectors, services, and tests.
8. Remove old `frontend/src/domain/world/ProjectionPlane.ts` and verify grep shows no imports from it.
9. Add/update architecture or unit tests to assert no `frontend/src/domain/world/ProjectionPlane.ts` file remains and no projection-plane `realize2D/realize3D` signatures use `any`.

## Validation plan for implementation wave

Run and capture logs under `architecture-audit/cycle-002-split-projection-plane-domain-god-module/validation/`:

### Static/read-only checks before and after

- `grep -R "from ['\"]@/domain/world/ProjectionPlane['\"]\|from ['\"]./ProjectionPlane['\"]" -n frontend/src frontend/tests || true`
- `grep -R "realize[23]D(.*any\|world: any\|_world: any" -n frontend/src/domain/world/projectionPlane frontend/src/domain/world || true`
- `test ! -e frontend/src/domain/world/ProjectionPlane.ts && echo deleted`

### Focused Vitest

- `npm run test --workspace=frontend -- tests/unit/projectionPlane.spec.ts tests/unit/coordinateTransform.spec.ts tests/unit/utils/coordinateTransform.spec.ts tests/unit/domain/realizationCache.spec.ts`
- `npm run test --workspace=frontend -- tests/integration/worldInitialization.spec.ts tests/unit/commands/initializationOps.spec.ts`
- Guide/intersection coverage because construction helpers touch those paths:
  - `npm run test --workspace=frontend -- tests/unit/commands/factories/GuideSequenceFactory.spec.ts tests/unit/commands/factories/IntersectionSequenceFactory.spec.ts tests/integration/factories/AllFactories.spec.ts`

### Mandatory cadence

- `npm run lint`
- `npm run lint --workspace=frontend`
- focused Vitest above
- `npm run test`
- `npm run build`
- `npm run build --workspace=frontend`
- `npm run test:e2e --workspace=frontend`
- Live preview refresh on `0.0.0.0` and reachability probe.

Known pre-existing validation debt from Wave 001 (missing eslint, frontend build/e2e/tooling failures) must be reclassified in the implementation log if still present, but focused Wave 002 tests and grep checks must pass for attributable behavior.

## Risks

- **Construction helper extraction risk:** moving a large set of helper methods can accidentally change validation/order/ID behavior. Mitigation: first delegate behavior through a store/helper with minimal algorithm edits; rely on guide/intersection/world-initialization focused tests.
- **Context narrowing risk:** a too-small `ProjectionPlaneRealizationContext` could force ad hoc casts. Mitigation: derive the context from exact method usage and let `World` structurally satisfy it.
- **Test drift risk:** stale `BaseProjectionPlane` imports may already be broken under full test. Mitigation: update tests to current domain names (`FixedProjectionPlane` or abstract `ProjectionPlane`) rather than adding a compatibility alias.
- **Import churn risk:** many downstream files may indirectly reference projection-plane symbols. Mitigation: use grep plus TypeScript/test feedback and do not introduce a compatibility barrel unless review accepts it explicitly.

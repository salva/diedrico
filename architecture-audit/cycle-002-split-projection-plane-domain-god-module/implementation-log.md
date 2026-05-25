# Implementation log — Wave 002: Split projection-plane domain god-module

**Stage:** `cycle-002-implement-split-projection-plane-domain-god-module`  
**Task:** `t1-implement-wave-002-direct`  
**Decision implemented:** `architecture-audit/cycle-002-split-projection-plane-domain-god-module/decision.md` selected Proposal Direct with no blocking issues.  
**Implementation date:** 2026-05-25

## Summary

Implemented Proposal Direct only. The old all-in-one `frontend/src/domain/world/ProjectionPlane.ts` file was deleted and replaced with focused modules under `frontend/src/domain/world/projectionPlane/`. Behavior was preserved through direct extraction and delegation: the abstract `ProjectionPlane` keeps the existing plane API while delegating element/cached-realization ownership to `ProjectionPlaneElementStore`; fixed and auxiliary plane realization classes live in their own modules; realization value objects and typed contexts are separated.

No construction-service restructure was implemented.

## Source files changed

### Created

- `frontend/src/domain/world/projectionPlane/ProjectionPlaneRealization.ts` — extracted `ProjectionPlaneRealization2D` and `ProjectionPlaneRealization3D` value types.
- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts` — introduced named realization, element-realization, dependency-registration, and mutation context interfaces so projection-plane modules no longer import `World` for their contracts.
- `frontend/src/domain/world/projectionPlane/ProjectionPlaneElementStore.ts` — extracted point/line/circle ownership and per-plane realization-cache maps.
- `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts` — extracted abstract base plane, metadata, public element/construction API, realization-cache delegation, and shared backward-matrix helpers.
- `frontend/src/domain/world/projectionPlane/FixedProjectionPlane.ts` — extracted fixed P_H/P_V plane implementation with typed optional realization context.
- `frontend/src/domain/world/projectionPlane/AuxiliaryProjectionPlane.ts` — extracted auxiliary trace-driven plane implementation with typed realization context and removed debug `console.log` noise.

### Updated imports/call sites

- `frontend/src/domain/world/World.ts`
- `frontend/src/commands/operations/world/AddAuxiliaryProjectionPlaneOp.ts`
- `frontend/src/components/panels/ThreeView.vue`
- `frontend/src/domain/world/descriptors/Element3DDescriptors.ts`
- `frontend/src/domain/world/descriptors/registerDescriptors.ts`
- `frontend/src/services/Element2DRenderer3D.ts`
- `frontend/src/types/ToolArgumentCollector.ts`
- `frontend/tests/helpers/worldHelpers.ts`
- `frontend/tests/unit/domain/realizationCache.spec.ts`

### Updated tests

- `frontend/tests/unit/projectionPlane.spec.ts` — replaced stale `BaseProjectionPlane` import/types with `FixedProjectionPlane`; existing storage/cache tests cover the new store delegation surface.
- `frontend/tests/unit/coordinateTransform.spec.ts` — replaced stale `BaseProjectionPlane` import with `FixedProjectionPlane`.
- `frontend/tests/unit/utils/coordinateTransform.spec.ts` — replaced stale `BaseProjectionPlane` import with `FixedProjectionPlane`.
- `frontend/tests/unit/services/paperService.spec.ts` — replaced stale `BaseProjectionPlane` import with `FixedProjectionPlane`.
- `frontend/tests/unit/commands/initializationOps.spec.ts` — removed obsolete geometry arguments from `AddHalfHingeLine2DOp` calls; current operation constructor accepts projection-plane ID, hinge-line ID, and optional line ID.

## Deleted legacy surfaces

- Deleted `frontend/src/domain/world/ProjectionPlane.ts`.
- Deleted old imports from `@/domain/world/ProjectionPlane` and relative `./ProjectionPlane`/`../ProjectionPlane` in touched source/tests.
- Did **not** introduce a `BaseProjectionPlane` alias, `ProjectionPlane.ts` compatibility barrel, or compatibility wrapper.
- Removed `AddAuxiliaryProjectionPlaneOp` debug `console.log` statements in the touched auxiliary-plane creation path.
- Removed auxiliary-plane realization debug `console.log` statements while preserving error handling via existing `console.error` paths.
- Removed the obsolete “Dual storage period” comment with the old monolith.

## Type/contract changes

- Replaced projection-plane `realize2D(world: any)` / `realize3D(world: any)` signatures with `ProjectionPlaneRealizationContext` in the abstract base, fixed plane, and auxiliary plane.
- Replaced direct `import('./World').World` parameters in projection-plane per-element realization, ID-generation, and construction helper methods with `ProjectionPlaneMutationContext`.
- Replaced optional direct-`World` collection side-effect parameters with `ProjectionPlaneMutationContext` while leaving the accepted residual mutation-context coupling for future entity/workflow extraction.
- `World` continues to satisfy the context interfaces structurally; projection-plane modules do not import `World` for these contracts.

## Validation commands and captured logs

All commands were run from `/work/diedrico` with stdout/stderr captured under `architecture-audit/cycle-002-split-projection-plane-domain-god-module/validation/`.

### Static checks

- `grep -R "from ['\"]@/domain/world/ProjectionPlane['\"]\|from ['\"]./ProjectionPlane['\"]" -n frontend/src frontend/tests || true`
  - Final logs: `static-import-grep-final.stdout.log`, `static-import-grep-final.stderr.log`
  - Result: pass; final stdout empty.
- `grep -R "realize[23]D(.*any\|world: any\|_world: any" -n frontend/src/domain/world/projectionPlane frontend/src/domain/world || true`
  - Final logs: `static-any-grep-final.stdout.log`, `static-any-grep-final.stderr.log`
  - Result: pass for Wave 002 projection-plane classes; stdout reports pre-existing non-projection-plane `any` signatures in `Element3D.ts` and `Plane.ts` only.
- `test ! -e frontend/src/domain/world/ProjectionPlane.ts && echo deleted`
  - Final logs: `static-deleted-check-final.stdout.log`, `static-deleted-check-final.stderr.log`
  - Result: pass; stdout `deleted`.

### Focused Vitest

- `npm run test --workspace=frontend -- tests/unit/projectionPlane.spec.ts tests/unit/coordinateTransform.spec.ts tests/unit/utils/coordinateTransform.spec.ts tests/unit/domain/realizationCache.spec.ts`
  - Final logs: `focused-projection-plane-final.stdout.log`, `focused-projection-plane-final.stderr.log`
  - Result: pass; 4 files, 61 tests passed.
- `npm run test --workspace=frontend -- tests/integration/worldInitialization.spec.ts tests/unit/commands/initializationOps.spec.ts`
  - Final logs: `focused-initialization-final.stdout.log`, `focused-initialization-final.stderr.log`
  - Result: pass; 2 files, 32 tests passed, 1 skipped.
- `npm run test --workspace=frontend -- tests/unit/commands/factories/GuideSequenceFactory.spec.ts tests/unit/commands/factories/IntersectionSequenceFactory.spec.ts tests/integration/factories/AllFactories.spec.ts`
  - Final logs: `focused-guide-intersection-final.stdout.log`, `focused-guide-intersection-final.stderr.log`
  - Result: pass; 3 files, 11 tests passed, 4 skipped.

Earlier failed iteration logs are retained in the same validation directory and document transient extraction mistakes fixed before final validation.

## Residual risks and future-wave candidates

- The new `ProjectionPlaneMutationContext` still exposes mutation/dependency-registration side effects to plane construction helpers. This is the accepted W1 stepping stone from the decision; a future construction-workflow extraction can remove those helper workflows from the entity.
- The static `any` grep still reports pre-existing `any` signatures in `frontend/src/domain/world/Element3D.ts` and `frontend/src/domain/world/Plane.ts`. They are outside the projection-plane module split and should be considered future domain typing cleanup.
- Guide/intersection factory tests still emit existing `console.log` noise from factory code. This wave removed only the auxiliary-plane creation/realization debug logs required by the decision; broader debug-noise cleanup can be a separate wave if prioritized.

## Full validation / preview note

This implementation stage completed the Wave 002 focused validation required before review. The full mandatory cadence (`npm run lint`, full Vitest, build, e2e, and live preview refresh) remains for the dedicated `cycle-002-validation-and-preview-refresh` stage per the current stage assignment.

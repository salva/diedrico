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

## Mandatory validation and preview refresh — cycle-002-validation-and-preview-refresh

**Validation date:** 2026-05-25  
**Stage:** `cycle-002-validation-and-preview-refresh`  
**Task:** `t1-run-wave-002-validation-preview`

Full stdout/stderr for every command below was captured under `architecture-audit/cycle-002-split-projection-plane-domain-god-module/validation/`.

### Environment preparation

- `npm install`
  - Logs: `npm-install.stdout.log`, `npm-install.stderr.log`
  - Result: failed before dependency reification because root-owned files under `node_modules/@algolia/abtesting` could not be renamed (`EACCES`). This prevented repairing the missing lint dependency in-place.
  - Classification: environment/pre-existing workspace ownership issue, not attributable to Wave 002 source changes.
- `ls -la node_modules/.bin ...; ls -ld node_modules ...`
  - Logs: `environment-node-modules.stdout.log`, `environment-node-modules.stderr.log`
  - Result: confirms mixed root/salva ownership and missing `eslint` executable in `node_modules/.bin`.

### Static Wave 002 deletion/import/type checks

- Old monolith import grep:
  - Command: `grep -R "from ['\"]@/domain/world/ProjectionPlane['\"]\|from ['\"]./ProjectionPlane['\"]" -n frontend/src frontend/tests || true`
  - Logs: `static-import-grep-validation.stdout.log`, `static-import-grep-validation.stderr.log`
  - Result: pass; no remaining imports from the deleted monolith surface.
- Projection-plane `any` context grep:
  - Command: `grep -R "realize[23]D(.*any\|world: any\|_world: any" -n frontend/src/domain/world/projectionPlane frontend/src/domain/world || true`
  - Logs: `static-any-grep-validation.stdout.log`, `static-any-grep-validation.stderr.log`
  - Result: pass for Wave 002 projection-plane modules. Remaining matches are pre-existing outside the split module: `frontend/src/domain/world/Element3D.ts` and `frontend/src/domain/world/Plane.ts`.
- Deleted file check:
  - Command: `test ! -e frontend/src/domain/world/ProjectionPlane.ts && echo deleted`
  - Logs: `static-deleted-check-validation.stdout.log`, `static-deleted-check-validation.stderr.log`
  - Result: pass; stdout `deleted`.

### Lint

- `npm run lint`
  - Logs: `root-lint.stdout.log`, `root-lint.stderr.log`
  - Result: failed with `sh: 1: eslint: not found`.
  - Classification: environment/dependency installation issue. `package.json` delegates lint to the frontend workspace; the failure occurs before source linting and is not evidence of a Wave 002 source defect.
- `npm run lint --workspace=frontend`
  - Logs: `frontend-lint.stdout.log`, `frontend-lint.stderr.log`
  - Result: failed with `sh: 1: eslint: not found`.
  - Classification: same environment/dependency installation issue as root lint.

### Focused Wave 002 Vitest

- `npm run test --workspace=frontend -- tests/unit/projectionPlane.spec.ts tests/unit/coordinateTransform.spec.ts tests/unit/utils/coordinateTransform.spec.ts tests/unit/domain/realizationCache.spec.ts`
  - Logs: `focused-projection-plane-validation.stdout.log`, `focused-projection-plane-validation.stderr.log`
  - Result: pass; 4 files, 61 tests passed.
- `npm run test --workspace=frontend -- tests/integration/worldInitialization.spec.ts tests/unit/commands/initializationOps.spec.ts`
  - Logs: `focused-initialization-validation.stdout.log`, `focused-initialization-validation.stderr.log`
  - Result: pass; 2 files, 32 tests passed, 1 skipped.
- `npm run test --workspace=frontend -- tests/unit/commands/factories/GuideSequenceFactory.spec.ts tests/unit/commands/factories/IntersectionSequenceFactory.spec.ts tests/integration/factories/AllFactories.spec.ts`
  - Logs: `focused-guide-intersection-validation.stdout.log`, `focused-guide-intersection-validation.stderr.log`
  - Result: pass; 3 files, 11 tests passed, 4 skipped. Existing factory `console.log` noise remains outside this wave.

### Full tests

- `npm run test`
  - Logs: `root-full-vitest.stdout.log`, `root-full-vitest.stderr.log`
  - Result: failed in legacy/unfocused tests.
  - Evidence: `tests/integration/guide-creation.test.ts` imports missing `../../src/commands/operations/AddFreePoint2DOp`; `tests/unit/selectionMask.spec.ts` expected broad GuideTool line matching that current tool behavior rejects; `tests/unit/architecture/noCommandSubclasses.spec.ts` has a broken `path` default import; `tests/unit/calculations/intersections.spec.ts` expects `.x/.y/.z` fields from intersection realization objects; `tests/unit/components/propertiesDialog.spec.ts` receives no emitted `close/save`; `tests/unit/tools/GuideTool.test.ts` calls removed `tool.onMouseDown` API.
  - Classification: pre-existing/unrelated full-suite debt. The failure set is outside the Wave 002 projection-plane split and the focused projection-plane/world-initialization/factory coverage passed.
- `npm run test --workspace=backend`
  - Logs: `backend-test.stdout.log`, `backend-test.stderr.log`
  - Result: pass; 1 file, 15 tests passed.

### Builds

- `npm run build`
  - Logs: `root-build.stdout.log`, `root-build.stderr.log`
  - Result: failed in frontend `vue-tsc` before app source compilation: `Search string not found: "/supportedTSExtensions = .*(?=;)/"` under Node.js v24.15.0.
  - Classification: toolchain compatibility/environment issue (`vue-tsc`/TypeScript/Node), not attributable to Wave 002 source changes.
- `npm run build --workspace=frontend`
  - Logs: `frontend-build.stdout.log`, `frontend-build.stderr.log`
  - Result: same `vue-tsc` toolchain failure as root build.
  - Classification: toolchain compatibility/environment issue, not Wave 002-attributable.
- `npm run build --workspace=backend`
  - Logs: `backend-build.stdout.log`, `backend-build.stderr.log`
  - Result: pass; `tsc` completed.

### E2E / Playwright

- `npm run test:e2e --workspace=frontend`
  - Logs: `frontend-e2e.stdout.log`, `frontend-e2e.stderr.log`
  - Result: failed during Playwright test-file parsing before browser execution.
  - Evidence: syntax errors in `frontend/tests/e2e/keyboard-shortcuts.spec.ts` at line 267 and `frontend/tests/e2e/selection-mask.spec.ts` at line 188.
  - Classification: pre-existing malformed e2e test files unrelated to Wave 002 projection-plane module split.

### Live preview refresh

- Initial refresh attempt:
  - Logs: `preview-server.stdout.log`, `preview-server.stderr.log`, `preview-refresh-probe.stdout.log`, `preview-refresh-probe.stderr.log`, `preview-process-check.stdout.log`, `preview-process-check.stderr.log`
  - Result: started an additional Vite server on 5174 because an earlier Vite server still occupied 5173; both were reachable.
- Final refresh:
  - Command: stopped the duplicate Vite processes, then ran `npm run dev -- --host 0.0.0.0 --port 5173` from `frontend/` via `nohup`.
  - Logs: `preview-server-final.stdout.log`, `preview-server-final.stderr.log`, `preview-server-final.pid`, `preview-refresh-final-probe.stdout.log`, `preview-refresh-final-probe.stderr.log`
  - Result: pass. Probe returned `HTTP/1.1 200 OK` for `http://127.0.0.1:5173/`, and the process list shows Vite running with `--host 0.0.0.0 --port 5173`.

## Validation acceptance

Wave 002 validation is **accepted with classified residual validation debt**. The Wave 002-specific static checks and focused Vitest suites all passed, the deleted monolith remained deleted, and no remaining failure was attributable to the projection-plane module split. Mandatory root/frontend lint and build commands are currently blocked by workspace dependency/toolchain issues, full frontend Vitest fails in legacy tests outside Wave 002 scope, and Playwright e2e fails because malformed legacy e2e test files cannot parse. These residual issues should become future cleanup/validation-hardening work, but they do not reject Wave 002 because the attributable Wave 002 checks pass and the preview was successfully refreshed and probed.

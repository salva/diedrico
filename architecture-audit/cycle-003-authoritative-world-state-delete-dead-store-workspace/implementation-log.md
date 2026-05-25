# Implementation Log — Wave 003: Authoritative world state / delete dead store workspace

**Stage:** `cycle-003-implement-authoritative-world-state-delete-dead-store-workspace`  
**Decision implemented:** `architecture-audit/cycle-003-authoritative-world-state-delete-dead-store-workspace/decision.md`  
**Selected proposal:** Proposal Direct — delete legacy store/workspace geometry path.

## Scope confirmation

Implemented the selected direct cleanup only. This stage did **not** introduce a `worldViewQueries.ts` / `worldReadModel.ts` boundary, did **not** extract rendering selectors or tool controllers, and did **not** add replacement global debug access to the `World` instance.

## Source files changed

- `frontend/src/main.ts`
  - Removed development-only `window.dumpDependencies`, `window.traceInvalidation`, and `window.getWorld` helpers that dynamically imported `./stores/worldStore` and attempted to read the non-existent `worldStore.world` field.
- `frontend/tests/unit/architecture/deletedLegacyWorldStatePaths.spec.ts`
  - Added an architecture boundary test that scans active `frontend/src` and `frontend/tests` TypeScript/Vue files and fails on references to the deleted legacy world-state surfaces.
- `frontend/tests/e2e/basic-construction.spec.ts`
  - Reworded stale placeholder TODOs so they refer to future UI-driven `SvgCanvas` coverage instead of `Workspace2D` integration.
- `frontend/tests/e2e/distance-transport.spec.ts`
  - Reworded the stale `Workspace2D` transport TODO to future UI-driven `SvgCanvas` coverage.
- `frontend/tests/e2e/infeasibility.spec.ts`
  - Replaced the stale `ElementRenderer` prerequisite with a current-rendering-path prerequisite.

## Legacy surfaces deleted

Deleted with no compatibility barrels, re-export shims, adapter stores, or replacement debug-injection paths:

- `frontend/src/components/workspace/Workspace2D.vue`
- `frontend/src/components/workspace/ElementRenderer.vue`
- `frontend/src/composables/useSnapping.ts`
- `frontend/src/composables/useElementGeometry.ts`
- `frontend/src/stores/worldStore.ts`
- `frontend/src/components/dialogs/ElementPropertiesDialog.vue`
- `frontend/src/components/panels/ElementGroup.vue`
- `frontend/src/services/ValidationService.ts`
- `frontend/tests/integration/formatUtils.integration.spec.ts`
- `frontend/src/types/ElementTypes.ts`
- `frontend/tests/e2e/dynamic-planes.spec.ts`

Note: `frontend/tests/e2e/dynamic-planes.spec.ts` and its containing directory were root-owned in the working tree; the file was removed with `sudo rm -f` because deletion was explicitly required by the Wave 003 decision.

## Validation commands and logs

Logs are captured under `architecture-audit/cycle-003-authoritative-world-state-delete-dead-store-workspace/validation/`.

### Static/reference checks

- `pre-implementation-reference-scan.stdout.log` / `.stderr.log` — initial existence/reference scan. First attempt had a shell `printf` syntax issue and was rerun successfully.
- `post-partial-edit-reference-scan.stdout.log` / `.stderr.log` — confirmed the initial delete sweep was blocked only by root-owned `dynamic-planes.spec.ts` and showed remaining references before final cleanup.
- `permission-delete-dynamic-planes.stdout.log` / `.stderr.log` — captured ownership/permission diagnosis for the root-owned e2e file.
- `edit-delete-sweep-retry.stdout.log` / `.stderr.log` — completed explicit delete sweep and source/comment edits.
- `static-deletion-and-reference-check.stdout.log` / `.stderr.log` — required deletion checks passed for all files in the Wave 003 delete list; no e2e `getWorld`/`worldStore` references remained. The only forbidden-term hits are the intentional term list inside `frontend/tests/unit/architecture/deletedLegacyWorldStatePaths.spec.ts`.

### Focused Vitest

- `architecture-boundary-vitest.stdout.log` / `.stderr.log`
  - Command: `npm run test --workspace=frontend -- tests/unit/architecture/deletedLegacyWorldStatePaths.spec.ts`
  - Result: passed, 1 test.
- `focused-vitest-final.stdout.log` / `.stderr.log`
  - Command: `npm run test --workspace=frontend -- tests/unit/architecture/deletedLegacyWorldStatePaths.spec.ts tests/integration/worldInitialization.spec.ts tests/unit/projectionPlane.spec.ts tests/unit/domain/realizationCache.spec.ts tests/unit/domain/paperHitTesting.spec.ts tests/unit/services/paperService.spec.ts tests/unit/tools/pointTool.spec.ts tests/unit/tools/CircleTool.spec.ts tests/unit/commands/commandStack.spec.ts tests/unit/commands/updateFreePoint2DPositionOp.spec.ts tests/integration/projectService.cascadeDeletion.spec.ts`
  - Result: passed, 11 files, 143 tests passed, 1 skipped.
  - Coverage rationale: architecture boundary, world initialization, projection plane/cache behavior, Paper/hit-test adjacent behavior, point/circle tool construction, command stack undo/redo-adjacent behavior, free-point update/parametric-adjacent behavior, and deletion cascade behavior.

### Failed/diagnostic attempts during implementation

- `edit-delete-sweep.stdout.log` / `.stderr.log` — first delete sweep failed when removing root-owned `frontend/tests/e2e/dynamic-planes.spec.ts`; cleanup was retried after permission diagnosis.
- `focused-vitest.stdout.log` / `.stderr.log` and `focused-vitest-rerun.stdout.log` / `.stderr.log` — early focused Vitest attempts failed because the new architecture test shadowed/imported `node:path.join` incorrectly in the Vitest transform environment. The test was rewritten to match the existing architecture-test `require` style and then passed.

## Residual risks and validation debt

- Full mandatory cadence (`npm run lint`, full `npm run test`, root/frontend build, full Playwright e2e, live preview refresh) is intentionally left to the subsequent `cycle-003-validation-and-preview-refresh` stage per the current stage split. This implementation stage ran the required static deletion/import checks and focused Vitest coverage for touched behavior.
- Existing e2e placeholder specs remain placeholders in several files; Wave 003 only removed stale references to the deleted workspace/rendering path and deleted `dynamic-planes.spec.ts` instead of creating a debug-injection replacement.
- `DependencyService.traceInvalidation` remains in the domain layer and is not a legacy debug surface. It was not changed because the Wave 003 decision only deletes the `main.ts` helpers backed by `worldStore.world`.

## Candidate future waves / deferred work

- Rendering selectors/read-model/query boundary remains deferred to the planned rendering-selector wave; no query boundary was introduced here.
- Tool-controller/use-case extraction remains deferred to the planned tool/application wave.
- Future dynamic-plane e2e coverage, if needed, should be UI-driven against the active app path rather than console/debug injection.

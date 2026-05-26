# Implementation Log — Cycle 015 TypeScript Build Contracts

**Task:** `t1-implement-projection-world-split`  
**Status:** projection/world split implemented; frontend build still red on residual non-projection Wave 015 categories.  

## Fresh diff reconciliation

The implementation began by inspecting the dirty workspace and the binding artifacts for `cycle-015-projection-world-split-implementation`:

- `architecture-audit/cycle-015-typescript-build-contracts/projection-world-split/decision.md`
- `architecture-audit/cycle-015-typescript-build-contracts/projection-world-split/proposals/proposal-restructure.md`
- prior `architecture-audit/cycle-015-typescript-build-contracts/implementation-log.md`
- current build evidence captured at `validation/frontend-build.projection-world-prepatch.stdout` / `.stderr`
- scoped symbol scan captured at `validation/projection-world-symbol-scan.stdout` / `.stderr`

The working tree still contains many unrelated inherited dirty files and historical `.saivage/` / `architecture-audit/` artifacts. This task touched only the reviewed projection/world lane plus this implementation log and validation logs. Protected `frontend/src/components/panels/ActionsPanel.vue` and prior Wave 014 protected repairs were not modified.

## Source files changed in this implementation

- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`
- `frontend/src/domain/world/Element2D.ts`
- `frontend/src/domain/world/Point.ts`
- `frontend/src/domain/world/Line.ts`
- `frontend/src/domain/world/Circle.ts`
- `frontend/src/domain/world/Guide.ts`
- `frontend/src/domain/world/Segment.ts`
- `frontend/src/domain/world/HingeLine.ts`
- `frontend/src/domain/world/elements/BrokenHalfHingeLine2D.ts`
- `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts`
- `frontend/src/utils/projectionPlaneUtils.ts`
- `architecture-audit/cycle-015-typescript-build-contracts/implementation-log.md`

`frontend/src/domain/world/projectionPlane/AuxiliaryProjectionPlane.ts` was inspected and already consumed the narrow realization context; no final source edit was needed there.

## Contract boundaries selected

`ProjectionPlaneContext.ts` now names the reviewed ports rather than exposing concrete `World` or optional pseudo-World members:

- `ProjectionElementRealizationContext`: read-only element/projection lookup for `realize2D` and geometry utilities. It owns `getProjectionPlaneById`, `getPoint2D`, `getLine2D`, `getCircle2D`, projection-plane realization cache reads, 3D plane realization reads, hinge-line reads, and aggregate plane/hinge enumeration required by existing hinge/auxiliary realization logic.
- `ProjectionPlaneRealizationContext`: the projection-plane/auxiliary realization read port, currently an explicit alias/extension of the element realization reads required by auxiliary matrix computation.
- `ProjectionOwnerPlaneQuery`: named owner-plane query containing `getPlaneForElement(elementId)`.
- `ProjectionPlaneMutationContext`: mutation/id/dependency/dirty services plus the read-only realization ports and owner-plane query because current plane factory/mutation methods realize dependencies while adding/removing elements.

Element and utility APIs now depend on named ports instead of concrete `World` where appropriate. No context-to-`World` casts, compatibility overloads, `@ts-ignore`, `@ts-expect-error`, `as unknown as`, or tooling changes were introduced.

## World.getPlaneForElement outcome

Selected outcome: **public named owner-plane query**.

`World.getPlaneForElement(elementId)` remains public only as the implementation of `ProjectionOwnerPlaneQuery`. The sanctioned consumer in this lane is the projection-plane sibling/intersection creation path in `ProjectionPlane.addSiblingIntersectionPoint`, which asks the owner-plane query for the primary intersection's owning plane before creating the sibling point. It is not used to make projection contexts structurally compatible with `World`.

## Strict guard / invariant work

Build-cited strict undefined issues in the scoped lane were addressed with explicit fail-fast guards before dereference:

- `ProjectionPlane.ts`: line-line, line-circle, circle-circle, reference-line validation paths now check missing owner/dependency elements before calling `realize2D`.
- `Line.ts`: same-plane line and tangent constructors assert the containing projection plane before reading elements.
- `Circle.ts`: circle realization throws explicit invariant errors when its owning projection plane is missing.
- `Segment.ts`: segment realization throws an explicit invariant error when its owning projection plane is missing.
- `BrokenHalfHingeLine2D.ts`: replaced the inherited broad auxiliary-plane property cast with an `AuxiliaryProjectionPlane` instance guard before reading trace ids.

The inherited sibling-point bidirectional link in `ProjectionPlane.ts` was narrowed from `(primaryPoint as any).siblingPointId = ...` to direct assignment after the runtime type guard proves the point is one of the intersection point classes that owns `siblingPointId`.

## Validation evidence

All command output was captured under `architecture-audit/cycle-015-typescript-build-contracts/validation/`.

Pre/post build evidence:

- `frontend-build.projection-world-prepatch.stdout` / `.stderr` — build red with projection/world contract errors in `ProjectionPlane.ts`, `AuxiliaryProjectionPlane.ts`, `Circle.ts`, `Line.ts`, `Segment.ts`, and `HingeLine.ts` plus unrelated categories.
- `frontend-build.projection-world-midpatch.stdout` / `.stderr` — context-to-World assignability errors removed; strict scoped guard errors remained.
- `frontend-build.projection-world-postguards.stdout` / `.stderr` — projection/world scoped errors removed; build remained red on unrelated categories.
- `frontend-build.projection-world-final.stdout` / `.stderr` — after final cast cleanup, projection/world scoped errors remained absent; build still red only on residual non-projection Wave 015 categories.

Focused tests:

- `npm run test --workspace=frontend -- --run tests/unit/domain/projectionPlaneRealization.spec.ts tests/unit/projectionPlane.spec.ts` passed: `projection-world-focused-projection.stdout` / `.stderr` — 34 passed, 3 skipped.
- Initial process-tree command used stale paths and failed discovery: `projection-world-process-tree-identity.stdout` / `.stderr`; corrected immediately.
- `npm run test --workspace=frontend -- --run tests/unit/domain/guide.spec.ts tests/unit/commands/factories/GuideSequenceFactory.spec.ts tests/unit/utils/projectionPlaneUtils.spec.ts tests/unit/projectionPlaneMatrix.test.ts tests/unit/utils/guidePerpendicularPlane.spec.ts` passed: `projection-world-focused-guide-hinge-aux.stdout` / `.stderr` — 53 passed, 11 todo.
- `npm run test --workspace=frontend -- --run tests/unit/commands/factories/DeletionSequenceFactory.spec.ts tests/unit/processTree.spec.ts tests/unit/commands/removeElementOps.spec.ts` passed: `projection-world-process-tree-identity-rerun.stdout` / `.stderr` — 32 passed. This preserves the process-tree identity correction: deletion continues to dispatch authoritative action-node ids to `RemoveActionFromProcessTreeOp`, and undo/redo cascade tests pass.

Forbidden-pattern/protected-surface evidence:

- `projection-world-forbidden-pattern-scan.stdout` / `.stderr` recorded a scoped scan for suppressions/casts/World compatibility patterns. The only remaining matches are documentation comments mentioning “World context”; no forbidden suppressions, `as any`, context-to-World casts, compatibility overloads, or protected file edits were introduced by this task.

## Final frontend build categorization

`npm run build --workspace=frontend` is still red, so this log does **not** claim full Wave 015 completion. Projection/world scoped TypeScript errors from the decision file set are gone in the final build log. Residual errors are outside this decision lane and include:

- command/factory contract mismatches: `GuideSequenceFactory.ts`, `IntersectionSequenceFactory.ts`, `AddIntersectionPointOp.ts`, `AddLineOp.ts`, `UpdateElementStyleOp.ts`, `registerWorldOperationDescriptors.ts`;
- process/view-state operation issues: `PushSubprocessOp.ts`, `RenameSubprocessOp.ts`, `ViewStateOperations.ts`, `RemoveElementOps.ts`;
- UI/store/render DTO and protected panel categories: `NewProjectDialog.vue`, `PropertiesDialog.vue`, `ActionsPanel.vue`, `ElementTypeGroup.vue`, `ElementsPanel.vue`, `ProcessTreeNode.vue`, `PlaneSelector.vue`, `SvgCanvas.vue`;
- non-projection domain/service categories: `CoordinateTransform.ts`, `GeometryService.ts`, `GoogleDriveService.ts`, `ProjectService.ts`, `PlaneSequenceFactory.ts`.

These categories were intentionally not repaired in this implementation because the decision explicitly forbids unrelated Wave 015 category fixes.

## Legacy surfaces deleted / preserved

No source module, package file, tooling file, fixture, or documentation file was scheduled for deletion by this mini-cycle. The optional/duplicate context members were removed from the final context shape: the old optional `getPoint2D?` / `getCircle2D?` pattern is gone and callers now use required named read ports.

## Residual risks / next action

- The read-only element realization port is still broad because current hinge/auxiliary realization methods require projection realization caches, 3D plane realization lookup, hinge lookup, and aggregate plane/hinge enumeration. This is explicitly named rather than hidden behind concrete `World`, but a later architecture wave may split hinge/auxiliary realization into a more dedicated service.
- Full Wave 015 build closure remains blocked by the non-projection categories listed above.
- Live preview/full validation refresh remains for the later validation-and-preview stage after all TypeScript build-contract categories are closed.


## t1b correction — forbidden broad cast removal and evidence reconciliation

Task `t1b-correct-forbidden-cast-and-log` reconciled the remaining broad casts found in the scoped projection/world lane after the first implementation pass.

Source corrections:

- `frontend/src/domain/world/HingeLine.ts`: `HalfHingeLine2D` now stores the authoritative parent hinge-line id directly in its constructor. `clone()` no longer fabricates a partial `{ id } as HingeLine` object.
- `frontend/src/domain/world/elements/BrokenHalfHingeLine2D.ts`: `BrokenHalfHingeLine2D` now receives the authoritative broken hinge-line id and its `clone()` no longer fabricates `{ id } as BrokenHingeLine`.
- `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts`: half-hinge-line creation passes `hingeLine.id` to the id-based constructor.
- `frontend/src/commands/operations/world/AddBrokenHingeLineOp.ts`: broken half-hinge-line creation passes `brokenHingeLine.id`. The operation no longer writes/deletes `World.hingeLines` through `(world as any)`.
- `frontend/src/domain/world/World.ts`: added narrow `addHingeLineEntity(hingeLine)` and `removeHingeLine(id)` storage hooks for already-constructed specialized hinge-line entities. This avoids a broad private-storage cast without exposing the full `hingeLines` map or introducing a World-shaped adapter.

Forbidden-pattern evidence:

- `projection-world-forbidden-cast-after-command-api.stdout` / `.stderr` — scoped scan across projection plane files, element realization files, `BrokenHalfHingeLine2D.ts`, `AddBrokenHingeLineOp.ts`, and `World.ts`; no `as any`, `as unknown as`, TypeScript suppressions, context-to-World casts, or fabricated `HingeLine` / `BrokenHingeLine` casts remain in the corrected lane.

Validation evidence captured after the correction:

- `projection-world-cast-fix-focused-projection.stdout` / `.stderr` — projection-focused Vitest passed: 34 passed, 3 skipped.
- `projection-world-cast-fix-guide-hinge-aux.stdout` / `.stderr` — guide/hinge/auxiliary focused Vitest passed: 53 passed, 11 todo.
- `projection-world-cast-fix-process-tree-identity.stdout` / `.stderr` — process-tree deletion/undo regression passed: 32 passed.
- `projection-world-cast-fix-combined-focused.stdout` / `.stderr` — combined focused rerun passed: 119 passed, 3 skipped, 11 todo.
- `frontend-build.projection-world-cast-fix-final.stdout` / `.stderr` — `npm run build --workspace=frontend` remains red only on residual non-projection Wave 015 categories already separated in this log. No errors from `ProjectionPlane.ts`, `AuxiliaryProjectionPlane.ts`, `ProjectionPlaneContext.ts`, `Element2D.ts`, `Point.ts`, `Line.ts`, `Circle.ts`, `Guide.ts`, `Segment.ts`, `HingeLine.ts`, `BrokenHalfHingeLine2D.ts`, or `projectionPlaneUtils.ts` appear in the final build output.

Build residual categorization remains unchanged: command/factory contract mismatches, process/view-state operation issues, UI/store/render DTO and protected panel categories, and non-projection service/domain categories are still outside this projection/world decision lane and were not repaired here.

## t3 correction — reviewer blocker follow-up

Task `t3-correct-review-blockers` addressed Reviewer blocker 1 by adding explicit guard-path tests for the strict undefined/missing-owner behavior changed in the projection/world lane:

- `frontend/tests/unit/domain/point.spec.ts`: added `projection/world strict guard paths` coverage for line-line, line-circle, and circle-circle intersection points whose required owner elements are missing from the projection plane. Each test asserts the explicit invariant message emitted before any dependency dereference.
- `frontend/tests/unit/projectionPlane.spec.ts`: added `ProjectionPlane owner-plane guard paths` coverage for `ProjectionPlane.addSiblingIntersectionPoint()` when `ProjectionOwnerPlaneQuery.getPlaneForElement()` cannot find the primary intersection owner. The test asserts the explicit `Primary intersection point not found` error.

Validation evidence captured for this correction:

- `t3-guard-path-tests.stdout` / `.stderr` — targeted guard-path Vitest passed: `tests/unit/domain/point.spec.ts` and `tests/unit/projectionPlane.spec.ts`, 56 passed.
- `t3-combined-focused.stdout` / `.stderr` — combined focused projection/point/guide/auxiliary/process-tree rerun passed: 11 files, 148 passed, 3 skipped, 11 todo. This rerun includes the protected deletion/undo process-tree identity checks.
- `t3-forbidden-scope-scan.stdout` / `.stderr` — scoped forbidden-pattern scan found no suppressions, `as any`, `as unknown as`, context-to-World casts, or compatibility overloads. The only matches are the previously added `World.addHingeLineEntity` / `World.removeHingeLine` command-support API references.
- `frontend-build.t3-review-blockers.stdout` / `.stderr` — `npm run build --workspace=frontend` remains red only on the previously categorized residual non-projection Wave 015 build categories; no errors from `ProjectionPlane.ts`, `AuxiliaryProjectionPlane.ts`, `ProjectionPlaneContext.ts`, `Element2D.ts`, `Point.ts`, `Line.ts`, `Circle.ts`, `Guide.ts`, `Segment.ts`, `HingeLine.ts`, `BrokenHalfHingeLine2D.ts`, or `projectionPlaneUtils.ts` appear.

Reviewer blocker 2 was formalized as a scope-governance delta rather than hidden as an implementation exception. The minimal delta artifact at `projection-world-split/delta-command-hinge-storage.md` explicitly asks follow-up review to accept or reject the retained `AddBrokenHingeLineOp.ts` plus narrow `World.addHingeLineEntity()` / `World.removeHingeLine()` storage-hook expansion.

Rationale recorded in the delta: reverting only those edits would bring the stage back inside the originally listed files, but it would also restore the exact forbidden `(world as any).hingeLines` private-storage writes/deletes and the old object-shaped broken hinge-line parent path. Keeping the cast-removal fix entirely inside the originally listed projection/world element files is not honest because `AddBrokenHingeLineOp.ts` owns broken-hinge-line creation/undo storage and `World.hingeLines` is private. The delta does not claim automatic closure; it provides the required reviewed artifact so `t4-review-after-corrections` can explicitly accept the narrow command/storage extension or reject it and require a separate mini-cycle.

## t1 command/factory/operation descriptor lane — closure attempt

Task `t1-close-command-factory-operation-contracts` closed the residual command/factory/operation descriptor TypeScript build category called out after the projection/world lane.

### Command/factory ownership map and source changes

- `frontend/src/commands/factories/GuideSequenceFactory.ts`: resolved the `SiblingGuide2D`/`Guide2D` mismatch at the guide factory boundary. The primary guide is now runtime-narrowed to `Guide2D` before bidirectional sibling-link mutation, the sibling guide is runtime-narrowed to `SiblingGuide2D`, and no stale `throughPointId` field is restored onto sibling guides.
- `frontend/src/utils/arcGeometry.ts`: direct guide-helper owner dependency. `computeArcGeometry()` now accepts the real primary/sibling pair (`Guide2D`, `SiblingGuide2D`) and derives corresponding arc endpoints from each guide realization anchor instead of reading a nonexistent sibling `throughPointId` or using `as any`.
- `frontend/src/commands/factories/IntersectionSequenceFactory.ts`: aligned process-tree action creation to the current action creator contract. Stale constructor arguments (`planeId`, element ids, index) were deleted from action creator calls; output extraction now fails fast when operation results omit required ids.
- `frontend/src/commands/operations/world/AddIntersectionPointOp.ts` and `frontend/src/commands/operations/world/registerWorldOperationDescriptors.ts`: removed the unused line-line `index` payload from the legacy AddIntersection operation contract and descriptor restore path rather than preserving an unused compatibility field.
- `frontend/src/commands/operations/world/AddLineOp.ts`: fixed stale parallel/perpendicular line serializers by emitting `referenceLineId`/`throughPointId` instead of nonexistent tangent/circle fields. Tangent operations retain their circle/index serializers.
- `frontend/src/commands/operations/world/UpdateElementStyleOp.ts` and `frontend/src/commands/operations/world/registerWorldOperationDescriptors.ts`: made style lookup and serialization owned by the operation. Element lookup now uses the common `Element` base type instead of a `Point2D`-inferred variable; style descriptors use an explicit JSON `payload` with typed parse/serialize guards for `StyleProperties`.
- `frontend/src/services/factories/PlaneSequenceFactory.ts`: direct owner dependency. Replaced raw `JsonValue | undefined` output plumbing with local `requireStringOutput()` guards before passing ids into process-tree action factories.
- `frontend/tests/unit/commands/operations/operationRegistry.spec.ts`: updated AddIntersection descriptor round-trip expectations to the narrowed authoritative line-line payload without `index`.

No source modules, tests, fixtures, package/tooling files, UI/store/render DTO files, ProjectService/Google Drive files, ActionsPanel, or Wave 014 protected tests were deleted or modified in this lane. Stale fields deleted from current descriptors: `AddIntersectionPoint2D.index` and bogus `circleId`/`tangentIndex` reads from parallel/perpendicular line serializers.

### Validation evidence

All command output was captured under `architecture-audit/cycle-015-typescript-build-contracts/validation/`:

- `command-factory-prepatch-build.stdout` / `.stderr`: confirmed the assigned prepatch errors in `GuideSequenceFactory.ts`, `IntersectionSequenceFactory.ts`, `AddIntersectionPointOp.ts`, `AddLineOp.ts`, `UpdateElementStyleOp.ts`, `registerWorldOperationDescriptors.ts`, and `PlaneSequenceFactory.ts`.
- `command-factory-midpatch-build.stdout` / `.stderr`: verified the intersection, AddIntersection, AddLine, UpdateElementStyle, registerWorldOperationDescriptors, and PlaneSequenceFactory descriptor errors were removed; only the guide arc helper mismatch plus out-of-scope categories remained.
- `command-factory-postpatch-build.stdout` / `.stderr`: verified the guide arc helper mismatch was removed; only `PlaneSequenceFactory` output strictness plus out-of-scope categories remained.
- `command-factory-focused-tests.stdout` / `.stderr`: focused Vitest passed for `tests/unit/commands/factories/GuideSequenceFactory.spec.ts` and `tests/unit/commands/operations/operationRegistry.spec.ts` (`13 passed`).
- `command-factory-final-build.stdout` / `.stderr`: `npm run build --workspace=frontend` remains red, but none of the specified command/factory/operation descriptor files report errors. Remaining build failures are outside this lane: process/view-state operations (`PushSubprocessOp.ts`, `RenameSubprocessOp.ts`, `ViewStateOperations.ts`, `RemoveElementOps.ts`), UI/store/render DTO and protected panel categories (`NewProjectDialog.vue`, `PropertiesDialog.vue`, `ActionsPanel.vue`, `ElementTypeGroup.vue`, `ElementsPanel.vue`, `ProcessTreeNode.vue`, `PlaneSelector.vue`, `SvgCanvas.vue`), and non-command service/domain strictness (`CoordinateTransform.ts`, `GeometryService.ts`, `GoogleDriveService.ts`, `ProjectService.ts`).
- `command-factory-forbidden-scan.stdout` / `.stderr`: scoped scan over the touched lane found no `@ts-ignore`, `@ts-expect-error`, `as any`, or `as unknown as`.

### Protected-surface checks and residual risks

Completed projection/world lane files and the process-tree identity correction were not reopened by this task except for reading referenced artifacts and preserving existing behavior via focused tests. No ActionsPanel, broad UI/service, Google Drive, ProjectService, package/tooling, or Wave 014 protected file changes were made.

This task does not claim full Wave 015 completion because the frontend build is still red on out-of-scope categories listed above. The command/factory/operation descriptor category named by this stage is closed in the current build output.

Additional focused coverage was added for `UpdateElementStyle` typed JSON payload round-tripping in `frontend/tests/unit/commands/operations/operationRegistry.spec.ts`. The rerun evidence is `command-factory-focused-tests-rerun.stdout` / `.stderr`: focused Vitest passed (`14 passed`).

## t1 process/view-state operation lane — closure attempt

Task `t1-close-process-viewstate-operation-contracts` closed the residual process-tree/view-state operation TypeScript build category assigned after the command/factory lane.

### Process/view-state operation ownership map and source changes

- `frontend/src/commands/operations/processTree/PushSubprocessOp.ts`: deleted the stale private `subprocessId` constructor member. The optional replay id remains a constructor parameter only long enough to seed authoritative `outputs.subprocessId`, which is what `apply()` reuses when replaying/deserializing subprocess creation.
- `frontend/src/commands/operations/processTree/RenameSubprocessOp.ts`: normalized the not-found failure path to the current `OperationResult<JsonObject>` contract by returning explicit `outputs: {}` alongside the error.
- `frontend/src/commands/operations/viewState/ViewStateOperations.ts`: removed obsolete imports from nonexistent `../Command` and `../../types/CommandTypes` paths. The view-state operations now implement the current `IOperation` contract directly (`apply(world)`, `undo(world)`, `outputs`) and depend only on narrow view-store ports (`setActivePlane`, `updateView2D`, `setPlaneVisibility`). No compatibility module or legacy command operation interface was recreated.
- `frontend/src/commands/operations/world/RemoveElementOps.ts`: replaced the CommonJS `require('@/domain/world/Guide')` guard lookup with static `isGuide2D` / `isSiblingGuide2D` imports. Primary/sibling guide deletion and undo still store authoritative guide objects and sibling plane identity; direct sibling deletion is still rejected with the primary guide id.

No UI/panel DTO files, ActionsPanel, project dialogs, Google Drive, ProjectService, package/tooling files, projection/world lane files, command/factory lane files, or Wave 014 protected files were modified in this lane.

### Validation evidence

All command output was captured under `architecture-audit/cycle-015-typescript-build-contracts/validation/`:

- `process-viewstate-git-status.stdout` / `.stderr`: recorded the pre-edit dirty workspace status for scope awareness.
- `process-viewstate-symbol-scan.stdout` / `.stderr`: confirmed `ViewStateOperations.ts` was the only source consumer of the obsolete `Operation`/`CommandTypes` imports while current operation implementations use `IOperation`.
- `process-viewstate-focused-tests.stdout` / `.stderr`: initial focused run included `tests/unit/stores/viewStore.spec.ts`; process-tree and remove-element tests passed, while two stale viewStore expectations failed because current viewport state includes `threeViewOptions.showReferenceAxes`.
- `process-viewstate-focused-process-remove-tests.stdout` / `.stderr`: scoped process-tree/remove-element rerun passed (`tests/unit/processTree.spec.ts` and `tests/unit/commands/removeElementOps.spec.ts`, 24 passed). This preserves the deletion/undo identity regression covered by the remove-element command tests.
- `process-viewstate-build-postpatch.stdout` / `.stderr`: caught a local `JsonObject` output typing issue in the first `ViewStateOperations.ts` rewrite; fixed immediately by typing `outputs` as `JsonObject`.
- `process-viewstate-build-final.stdout` / `.stderr`: `npm run build --workspace=frontend` remains red, but no errors from `PushSubprocessOp.ts`, `RenameSubprocessOp.ts`, `ViewStateOperations.ts`, or `RemoveElementOps.ts` remain. Remaining build failures are outside this lane: project dialogs/properties, protected process-tree panels, element panels, plane selector, `SvgCanvas.vue`, `CoordinateTransform.ts`, `GeometryService.ts`, `GoogleDriveService.ts`, and `ProjectService.ts`.
- `process-viewstate-forbidden-scan.stdout` / `.stderr`: scoped scan over the four touched operation files found no `@ts-ignore`, `@ts-expect-error`, `as any`, `as unknown as`, or `require(`.

### Residual risks / next action

This task does not claim full Wave 015 completion because the frontend build remains red on unrelated UI/store/render DTO and service/domain strictness categories. The assigned process-tree/view-state operation build category is closed in the final build output. The stale `viewStore.spec.ts` expectations around `showReferenceAxes` are recorded as an existing test-data drift outside this lane; the scoped process-tree/remove-element identity tests pass.

## t3 process/view-state operation lane — direct ViewStateOperations test coverage

Task `t3-add-viewstate-operation-tests` resolved the reviewer blocker that the rewritten `ViewStateOperations` apply/undo behavior lacked direct focused tests.

### Source files changed

- `frontend/tests/unit/commands/viewStateOperations.spec.ts`: added direct Vitest coverage for the three rewritten view-state operation classes:
  - `SetActivePlaneOp` applies the after plane path, records `{ activePlanePath }` outputs, exposes constructor parameters, and undo restores the before plane path.
  - `UpdateView2DOp` applies the after 2D viewport state, records `{ updated: true }`, and undo restores the before state.
  - `TogglePlaneVisibilityOp` applies the after visibility value, records `{ visible }`, and undo restores the before visibility.
  - Invalid plane paths return an `OperationResult` failure with explicit empty `outputs` and do not call the view-store port.

No production source, projection/world lane file, command/factory lane file, UI/panel DTO file, service file, package/tooling file, Wave 014 protected file, or `ActionsPanel.vue` file was edited in this follow-up. No source module, fixture, or documentation file was deleted.

### Validation evidence

All command output was captured under `architecture-audit/cycle-015-typescript-build-contracts/validation/`:

- `t3-viewstate-operations-focused.stdout` / `.stderr`: `npm run test --workspace=frontend -- --run tests/unit/commands/viewStateOperations.spec.ts` passed, 1 file / 4 tests.
- `t3-process-remove-viewstate-combined.stdout` / `.stderr`: `npm run test --workspace=frontend -- --run tests/unit/processTree.spec.ts tests/unit/commands/removeElementOps.spec.ts tests/unit/commands/viewStateOperations.spec.ts` passed, 3 files / 28 tests. This keeps the process-tree identity deletion/undo regression in the same evidence set as the new direct ViewState coverage.
- `t3-viewstate-forbidden-scan.stdout` / `.stderr`: scoped scan over `frontend/tests/unit/commands/viewStateOperations.spec.ts` and `frontend/src/commands/operations/viewState/ViewStateOperations.ts` for `@ts-ignore`, `@ts-expect-error`, `as any`, `as unknown as`, and `require(` produced no matches. The grep command exited 1 because no forbidden pattern was found.
- `t3-viewstate-tests-frontend-build.stdout` / `.stderr`: `npm run build --workspace=frontend` remains red on out-of-scope UI/store/render DTO and service/domain strictness categories. The build output contains no errors from `PushSubprocessOp.ts`, `RenameSubprocessOp.ts`, `ViewStateOperations.ts`, `RemoveElementOps.ts`, or the new `viewStateOperations.spec.ts` test file.

### Residual categorization and stage status

The process/view-state operation lane now has direct passing tests for the rewritten view-state apply/undo contracts plus the earlier passing process-tree/remove-element identity coverage. Full Wave 015 completion is still not claimed because the frontend build remains red on residual categories outside this task scope, including `NewProjectDialog.vue`, `PropertiesDialog.vue`, `ActionsPanel.vue`, `ElementTypeGroup.vue`, `ElementsPanel.vue`, `ProcessTreeNode.vue`, `PlaneSelector.vue`, `SvgCanvas.vue`, `CoordinateTransform.ts`, `GeometryService.ts`, `GoogleDriveService.ts`, and `ProjectService.ts`.

## t1 UI/store/render DTO lane — closure attempt

Task `t1-close-ui-store-render-dto-errors` closed the residual UI/store/render DTO TypeScript build category assigned after the process/view-state lane.

### UI/store/render ownership map and source changes

- `frontend/src/components/dialogs/NewProjectDialog.vue`: deleted the stale direct `projectService` singleton import. The dialog now remains a UI event source and emits the requested project name for the app-shell/session owner to handle; it no longer reaches into the persistence service boundary.
- `frontend/src/components/dialogs/PropertiesDialog.vue`: replaced stale `Point2D.type` / broad dependency casts with current domain-class narrowing for intersection points, line-by-two-points, segments, center/point and three-point circles, and guides. Wave 014 close/save emit behavior was not changed.
- `frontend/src/components/panels/ActionsPanel.vue` and `frontend/src/domain/processTree/ProcessTree.ts`: aligned construction-history selection highlighting with the current `ActionNode` view. `ProcessTree.getAllActions()` now advertises the node ids it already returns at runtime, and `ActionsPanel` uses `World.getDependencyService()` instead of violating the private `dependencyService` field.
- `frontend/src/components/panels/ElementTypeGroup.vue` and `frontend/src/components/panels/ElementsPanel.vue`: deleted unused stale props/import/count locals and the wrong `Element2D` import from `Element.ts`; element grouping continues to use current plane/domain collections.
- `frontend/src/components/panels/ProcessTreeNode.vue`: deleted obsolete action `inputs`/`outputs` details and unused formatting helpers; subprocess rename paths are now guarded by the `subprocess` discriminator before reading `name`.
- `frontend/src/components/toolbars/PlaneSelector.vue`: removed unused reactive placeholders, made the injected world non-optional after the fail-fast guard, and guarded focused-plane keyboard selection.
- `frontend/src/components/workspace/SvgCanvas.vue`: aligned hover tooltip reads to `hoverState.value.temporary`, deleted stale `ProjectionPlane.getArc()` and unused render-transform helper reads, added active-plane guards before passing ids to hit-testing/tool/style paths, replaced primitive `.geometry` reads with current `Primitive` DTO fields, and replaced the inherited tool-status broad cast with a local structural type guard.

No Google Drive, CoordinateTransform, GeometryService, ProjectService strictness, package/tooling, projection/world, command/factory, or process/view-state operation repairs were made beyond the direct process-tree `ActionNode` return-type owner dependency required by `ActionsPanel`.

### Validation evidence

All command output was captured under `architecture-audit/cycle-015-typescript-build-contracts/validation/`:

- `ui-store-render-primitive-grep.stdout` / `.stderr`: located the authoritative primitive DTO definitions in `frontend/src/domain/presentation/Paper.ts` before fixing `SvgCanvas.fitToView()`.
- `ui-store-render-projectservice-grep.stdout` / `.stderr`: confirmed `NewProjectDialog.vue` was the stale direct `projectService.createProject()` UI consumer.
- `ui-store-render-source-patch.stdout` / `.stderr`, `ui-store-render-svgcanvas-patch.stdout` / `.stderr`, `ui-store-render-residual-patch.stdout` / `.stderr`, and `ui-store-render-cast-removal-patch.stdout` / `.stderr`: patch scripts used for the scoped UI/store/render changes.
- `ui-store-render-build-postpatch.stdout` / `.stderr`: first postpatch build removed most cited UI errors and exposed remaining local residuals in `ActionsPanel.vue`, `ProcessTreeNode.vue`, `PlaneSelector.vue`, and `SvgCanvas.vue`; those were fixed immediately.
- `ui-store-render-build-final.stdout` / `.stderr`: `npm run build --workspace=frontend` remained red only on out-of-scope service/domain categories after the cited UI/store/render errors were gone.
- `ui-store-render-focused-tests.stdout` / `.stderr`: initial focused run passed `processTree.spec.ts` and `viewStateOperations.spec.ts` but failed two pre-existing `viewStore.spec.ts` expectations because test fixtures still omit current `threeViewOptions.showReferenceAxes`.
- `ui-store-render-focused-tests-rerun.stdout` / `.stderr`: reran focused in-scope process-tree/view-state coverage without the known stale viewStore fixture; passed 2 files / 19 tests.
- `ui-store-render-forbidden-scan.stdout` / `.stderr`: found inherited broad casts in touched dialog/canvas files; those were removed.
- `ui-store-render-forbidden-scan-final.stdout` / `.stderr`: scoped scan over touched UI/process files found no `@ts-ignore`, `@ts-expect-error`, `as any`, `as unknown as`, private `dependencyService` reads, `getArc`, stale primitive `.geometry`, or stale `hoverHighlight.temporary` reads.
- `ui-store-render-build-after-cast-removal.stdout` / `.stderr`: final `npm run build --workspace=frontend` remained red only on `CoordinateTransform.ts`, `GeometryService.ts`, `GoogleDriveService.ts`, and `ProjectService.ts`; no errors from `NewProjectDialog.vue`, `PropertiesDialog.vue`, `ActionsPanel.vue`, `ElementTypeGroup.vue`, `ElementsPanel.vue`, `ProcessTreeNode.vue`, `PlaneSelector.vue`, `SvgCanvas.vue`, `useHoverHighlight.ts`, `processStore.ts`, or `viewStore.ts` remained.

### Residual categorization and protected-surface checks

The UI/store/render DTO lane is closed in the current build output. Full Wave 015 completion is still not claimed because frontend build remains red on out-of-scope non-UI service/domain strictness categories:

- `frontend/src/domain/calculations/CoordinateTransform.ts`: stale `Plane3DCoordinateSystem` import.
- `frontend/src/services/GeometryService.ts`: stale `lineLineIntersection` import and `Ok<unknown>` result typing.
- `frontend/src/services/GoogleDriveService.ts`: nullable string strictness in two request paths.
- `frontend/src/services/ProjectService.ts`: `record.nextElementId` possibly undefined after validation narrowing.

The known stale `frontend/tests/unit/stores/viewStore.spec.ts` expectations around `threeViewOptions.showReferenceAxes` remain outside this lane and were already observed in the prior process/view-state stage. Completed projection/world, command/factory, and process/view-state lanes were preserved; no deleted legacy source module, package file, tooling file, fixture, or broad renderer extraction was introduced.

## t2 UI/store/render DTO lane — validation/log finalization after reviewer blockers

Task `t2-correct-validation-log-finalization` addressed the `t9-review-stage` blockers by adding the missing validation evidence where commands are defined, recording exact stop conditions where validation cannot pass in the current tree, and making the UI/store/render DTO lane finalization explicit as a stage-scoped section. No production source, tests, package/tooling, service/domain strictness files, Google Drive files, ProjectService files, projection/world files, command/factory files, or process/view-state operation files were edited by this correction.

### Stage-scoped fixed/deleted status for cited UI/store/render owners

- `frontend/src/components/dialogs/NewProjectDialog.vue`: fixed. The stale direct `projectService` singleton import/use remains deleted; the dialog is a UI event source and does not repair broad ProjectService strictness.
- `frontend/src/components/dialogs/PropertiesDialog.vue`: fixed. Stale `Point2D.type`/dependency-shape reads were replaced in the UI lane; Wave 014 close/save emit behavior remains preserved.
- `frontend/src/components/panels/ActionsPanel.vue`: fixed. Selection highlighting consumes current process-tree action-node ids and public dependency-service access; no private `dependencyService` read or stale `Action.id` restoration remains.
- `frontend/src/components/panels/ElementTypeGroup.vue` and `frontend/src/components/panels/ElementsPanel.vue`: fixed/deleted stale assumptions. Unused count/import/constructor assumptions and wrong `Element2D` import path remain deleted.
- `frontend/src/components/panels/ProcessTreeNode.vue`: fixed/deleted stale assumptions. Obsolete action `inputs`/`outputs` UI details and unused formatting helpers remain deleted; subprocess name reads are discriminator-guarded.
- `frontend/src/components/toolbars/PlaneSelector.vue`: fixed. World access and focused-plane keyboard selection are guarded through the current store/view contracts rather than hidden by non-null assertions.
- `frontend/src/components/workspace/SvgCanvas.vue`: fixed. Hover temporary reads, removed `getArc`, active-plane guards, primitive DTO field reads, and the local tool-status guard remain aligned to current render/hover DTOs.
- Direct owner dependency `frontend/src/domain/processTree/ProcessTree.ts`: fixed. `getAllActions()` advertises the action-node ids it already returns at runtime for `ActionsPanel`; no process-tree redesign was introduced.
- Direct owner dependencies `frontend/src/composables/useHoverHighlight.ts`, `frontend/src/stores/processStore.ts`, and `frontend/src/stores/viewStore.ts`: no edits were required in the UI lane; final build evidence below contains no errors from these files.

No legacy source module, test fixture, package script, or documentation file was deleted by this finalization correction. The deleted legacy surfaces in this lane are stale reads/imports/UI details only, as listed above.

### Added validation evidence for reviewer blocker 1

Script discovery / undefined command documentation:

- `t2-ui-finalization-script-discovery.stdout` / `.stderr`: root scripts are `build`, `dev`, `dev:frontend`, `docs:*`, `lint`, `test`, `test:architecture`, `test:e2e`, and `test:frontend`; frontend scripts are `build`, `dev`, `lint`, `preview`, `test`, `test:architecture`, `test:e2e`, `test:e2e:headed`, `test:ui`, and `test:watch`; `backend/package.json` is missing, so there is no backend workspace lint/build/test/e2e command to run for this frontend-only lane.

Lint:

- `t2-ui-finalization-root-lint.stdout` / `.stderr`: `npm run lint` passed. It delegates to frontend architecture tests; 4 files / 11 tests passed.
- `t2-ui-finalization-frontend-lint.stdout` / `.stderr`: `npm run lint --workspace=frontend` passed. It ran the same architecture tests; 4 files / 11 tests passed.

Focused UI/store/render tests from the original UI lane remain the behavior evidence for the changed owners:

- `ui-store-render-focused-tests-rerun.stdout` / `.stderr`: `npm run test --workspace=frontend -- --run tests/unit/processTree.spec.ts tests/unit/commands/viewStateOperations.spec.ts` passed, 2 files / 19 tests. This covers the process-tree/action-node owner dependency and preserves the view-state operation contract the UI lane consumed.
- `ui-store-render-focused-tests.stdout` / `.stderr`: the broader attempted focused run including `tests/unit/stores/viewStore.spec.ts` still failed only on the pre-existing `threeViewOptions.showReferenceAxes` fixture drift, already categorized before this correction.

Full Vitest:

- `t2-ui-finalization-frontend-full-vitest.stdout` / `.stderr` and summary `t2-ui-finalization-frontend-full-vitest-summary.stdout` / `.stderr`: `npm run test --workspace=frontend` ran the full frontend Vitest suite. It failed on known non-UI-lane residuals: `tests/unit/services/ProjectService.roundTrip.spec.ts` style payload expectation drift and two `tests/unit/stores/viewStore.spec.ts` expectations missing `threeViewOptions.showReferenceAxes`. Summary: 2 failed files, 102 passed files, 1 skipped file; 3 failed tests, 1222 passed, 45 skipped, 11 todo.
- `t2-ui-finalization-root-full-vitest.stdout` / `.stderr` and summary `t2-ui-finalization-root-full-vitest-summary.stdout` / `.stderr`: `npm run test` delegates to the same frontend Vitest suite and failed on the same three known residual tests. This is a validation stop condition for full-wave closure, not evidence of remaining cited UI/store/render TypeScript errors.

Build:

- `t2-ui-finalization-frontend-build.stdout` / `.stderr`: `npm run build --workspace=frontend` remains red only on non-UI service/domain strictness categories: `CoordinateTransform.ts` stale `Plane3DCoordinateSystem` import, `GeometryService.ts` stale `lineLineIntersection` import and `Ok<unknown>` result typing, nullable string strictness in `GoogleDriveService.ts`, and `ProjectService.ts` possible undefined `record.nextElementId`. No errors from `NewProjectDialog.vue`, `PropertiesDialog.vue`, `ActionsPanel.vue`, `ElementTypeGroup.vue`, `ElementsPanel.vue`, `ProcessTreeNode.vue`, `PlaneSelector.vue`, `SvgCanvas.vue`, `useHoverHighlight.ts`, `processStore.ts`, or `viewStore.ts` are present.
- `t2-ui-finalization-root-build.stdout` / `.stderr`: `npm run build` delegates to the frontend build and fails on the same out-of-scope service/domain strictness categories. This lane still does not claim full Wave 015 completion.

E2E / Playwright:

- `t2-ui-finalization-frontend-e2e.stdout` / `.stderr` and summary `t2-ui-finalization-frontend-e2e-summary.stdout` / `.stderr`: `npm run test:e2e --workspace=frontend` started the Playwright web server and Vite reported `http://localhost:5173/`, then the suite failed because the Playwright Chromium executable is missing at `/home/salva/.cache/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-linux64/chrome-headless-shell`. The failure recommends `npx playwright install`. Summary tail reports 1 passed, 5 skipped, many chromium tests unable to launch.
- `t2-ui-finalization-root-e2e.stdout` / `.stderr` and summary `t2-ui-finalization-root-e2e-summary.stdout` / `.stderr`: `npm run test:e2e` delegates to frontend e2e and failed for the same missing Playwright browser executable. This is an environment/tooling stop condition; this correction did not alter package/tooling or install browsers because that is outside the requested log/validation-finalization task.

Live preview / reachability:

- `t2-ui-finalization-preview-probe.stdout` / `.stderr`: probed `http://127.0.0.1:5173/` and `http://127.0.0.1:4173/` after the e2e command exited. Neither endpoint was reachable. Playwright had launched a temporary Vite server on `localhost:5173` during the e2e run, but it was not a persistent preview and was not bound to `0.0.0.0`. Because the frontend build remains red on out-of-scope service/domain strictness categories and the finalization task is not the validation-and-preview-refresh stage, no successful live-preview refresh is claimed here.

### Protected-surface and forbidden-repair checks

- The UI/store/render finalization correction changed only `architecture-audit/cycle-015-typescript-build-contracts/implementation-log.md` and validation evidence files under `architecture-audit/cycle-015-typescript-build-contracts/validation/`.
- No `@ts-ignore`, `@ts-expect-error`, broad cast, compatibility shim, stale domain field restoration, non-null assertion hiding invalid state, alternate build path, or package/tooling change was introduced by this correction.
- Prior protected lanes remain preserved: projection/world, command/factory, and process/view-state operation source files were not edited; the UI lane source files from `t1-close-ui-store-render-dto-errors` were not reopened.
- Forbidden secret paths were not read; this correction used package scripts, validation logs, reviewer/task reports, and public source/audit artifacts only.

### Residual service/domain and validation stop conditions

The UI/store/render DTO TypeScript category remains closed in current build output, but the stage still must not claim full Wave 015 completion. Remaining blockers are outside this lane:

- Service/domain build strictness: `frontend/src/domain/calculations/CoordinateTransform.ts`, `frontend/src/services/GeometryService.ts`, `frontend/src/services/GoogleDriveService.ts`, and `frontend/src/services/ProjectService.ts`.
- Full Vitest residuals: `frontend/tests/unit/services/ProjectService.roundTrip.spec.ts` style payload expectation drift and `frontend/tests/unit/stores/viewStore.spec.ts` `threeViewOptions.showReferenceAxes` fixture drift.
- Playwright/e2e environment: missing Chromium browser executable; install/repair browser cache before expecting e2e pass.
- Persistent live preview: not refreshed successfully in this correction; the only observed server was Playwright's temporary localhost Vite web server, and post-run probes to 5173/4173 failed.

These stop conditions are now explicit for reviewer consumption. The corrected log satisfies the stage-scoped UI/store/render DTO finalization requirement without broadening the implementation into forbidden service/domain, tooling, or preview-management repairs.

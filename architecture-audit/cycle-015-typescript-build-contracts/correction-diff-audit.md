# Correction Diff Audit — Cycle 015 TypeScript Build Contracts

**Stage:** `cycle-015-correction-diff-audit-proposals`  
**Purpose:** audit the current uncommitted Wave 015 partial implementation before any further implementation/revert work.  
**Source/test/package/tooling edits in this stage:** none. This document is an audit/proposal artifact only.

## Evidence reviewed

- `.saivage/stages/cycle-015-implement-typescript-build-contracts/summary.json`
- `.saivage/stages/cycle-015-implement-typescript-build-contracts/reports/t2-review-failed-implementation.json`
- `architecture-audit/cycle-015-typescript-build-contracts/decision.md`
- `architecture-audit/cycle-015-typescript-build-contracts/reviews/round-01-review.md`
- `architecture-audit/cycle-015-typescript-build-contracts/implementation-log.md`
- `architecture-audit/cycle-015-typescript-build-contracts/validation/frontend-build.retry-pass2.stdout`
- focused current diff excerpts for the modified Wave 015 source files

The latest frontend build remains red. The most important correction blockers are:

1. **Projection-plane/world context lane is incomplete and internally inconsistent.** The retry build reports missing imports/methods and optional-method invocations in `Element2D.ts`, `HingeLine.ts`, `BrokenHalfHingeLine2D.ts`, `AuxiliaryProjectionPlane.ts`, and the projection-plane context types.
2. **Process-tree deletion identity is unsafe.** `DeletionSequenceFactory.ts` now derives an `actionKey` from `actions[0]?.elementId`, then passes that key to `RemoveActionFromProcessTreeOp(actionId)`, whose constructor and `ProcessTree.removeAction` path expect an action id, not an element id.
3. **The implementation log is stale relative to the actual current diff.** It lists only an early partial-edit set and does not inventory later retry edits in factories, operation output typing, panels, toolbar, stores, and services.

## Current modified source-file inventory and disposition

Dispositions mean:

- **keep:** safe, narrow, and should be retained unless later validation disproves it.
- **complete:** direction is plausibly correct but unfinished; follow-up implementation must finish it intentionally.
- **revert:** current edit is unsafe or outside the reviewed correction path and should be reverted in the implementation stage unless a new reviewed delta replaces it.
- **needs-review:** may be valid but requires focused review/validation before retention.

### App shell / service-port lane

| File | Current partial edit | Disposition | Rationale |
| --- | --- | --- | --- |
| `frontend/src/App.vue` | Passes `toolStore.currentToolStepMessage.value` into `StatusBar`. | keep | Narrow template contract fix for a cited build shape; no behavior redesign. Revalidate with frontend build. |
| `frontend/src/application/appShell/AppShellPorts.ts` | Changes `AuthStorePort.setAuthenticated` third parameter from `refreshToken?: string` to `expiry?: Date`. | keep | Matches the existing auth-store token-expiry contract noted by the implementation log. Revalidate with app-shell focused tests if present. |
| `frontend/src/components/dialogs/NewProjectDialog.vue` | Replaces `projectService` singleton import with `new ProjectService().createProject(...)`. | revert | Latest build still reports `Property createProject does not exist on type ProjectService`; this edit does not close the contract and risks instantiating service infrastructure ad hoc in a dialog. Follow-up should reconcile against the actual project-creation port/service owner, not create a local singleton replacement. |
| `frontend/src/stores/viewStore.ts` | Adds `showReferenceAxes: true` to three-view defaults. | keep | Narrow display-default completion for strict store shape. Verify with build and relevant view-store tests. |
| `frontend/src/composables/useHoverHighlight.ts` | Removes unused `Ref` import. | keep | Pure unused-import cleanup directly tied to build strictness. |

### Command descriptor / operation-output lane

| File | Current partial edit | Disposition | Rationale |
| --- | --- | --- | --- |
| `frontend/src/commands/operations/IOperation.ts` | Makes `IOperation` generic over descriptor and output object; `apply` returns `OperationResult<TOutputs>`. | complete | Direction matches the selected proposal's owner-boundary approach, but downstream operations/factories are only partially typed and build remains red. Follow-up must finish or narrow this contract consistently; no casts/suppressions. |
| `frontend/src/commands/Command.ts` | Makes `addAndExecute` preserve the concrete operation `apply` return type. | complete | Useful owner-boundary change for output typing; includes a local return cast to `ReturnType<...>`. Follow-up must verify this is type-preserving rather than hiding an error and should remove it if the operation contract can express the return directly. |
| `frontend/src/commands/operations/world/AddFreePointOp.ts` | Adds typed `pointId` output. | keep | Narrow operation-output typing that supports factory guards. Verify command/undo tests. |
| `frontend/src/commands/operations/world/AddLineLineIntersectionPoint2DOp.ts` | Adds typed `pointId` output. | keep | Same as above. |
| `frontend/src/commands/operations/world/AddLineCircleIntersectionPoint2DOp.ts` | Adds typed `pointId` output. | keep | Same as above. |
| `frontend/src/commands/operations/world/AddCircleCircleIntersectionPoint2DOp.ts` | Adds typed `pointId` output. | keep | Same as above. |
| `frontend/src/commands/operations/world/AddSiblingIntersectionPoint2DOp.ts` | Adds typed `pointId` output. | keep | Same as above. |
| `frontend/src/commands/factories/PointSequenceFactory.ts` | Guards missing `pointId` after `addAndExecute`. | keep | Honest runtime guard at factory boundary; should be covered by focused command tests. |
| `frontend/src/commands/factories/GuideSequenceFactory.ts` | Guards `guideId`/`siblingGuideId`; replaces broad sibling guide cast with `instanceof SiblingGuide2D`. | complete | Guarding operation outputs is good. However the retry build still reports `SiblingGuide2D` not assignable to `Guide2D` around arc geometry, so the guide type contract needs a narrow owner fix or the partial arc call needs rework. |
| `frontend/src/commands/factories/IntersectionSequenceFactory.ts` | Guards missing primary/sibling `pointId` outputs. | complete | Output guards are good, but retry build still reports constructor arity errors earlier in this file. Follow-up must reconcile operation constructor signatures instead of only guarding outputs. |

### Process-tree action model and deletion identity lane

| File | Current partial edit | Disposition | Rationale |
| --- | --- | --- | --- |
| `frontend/src/domain/processTree/ProcessTree.ts` | `traverseActions`/`findAction` now operate on `ActionNode` rather than minimal `Action`. | keep | Aligns lookup identity with the authoritative tree node carrying `id`; reviewer did not object to this direction. Add focused process-tree tests. |
| `frontend/src/domain/processTree/ActionGroup.ts` | Deletes duplicate local interface and re-exports `ProcessTree.ActionGroup` type through `ProcessTreeActionGroup`; factory creates current shape. | keep | Deletion-first convergence of duplicate contract; retain if imports build. |
| `frontend/src/stores/processStore.ts` | Replaces `ConstructiveAction` usage with `ActionNode`; adds null-tombstone guards. | keep | Matches current `ProcessTree` tombstone/action-node contract. Needs focused store/process-tree tests. |
| `frontend/src/components/panels/ActionItem.vue` | Deletes stale `infeasible`, `actionType`, `timestamp` UI reads and unused formatters. | keep | Correct deletion of obsolete `Action` fields rather than restoring legacy fields. |
| `frontend/src/components/panels/ActionGroupItem.vue` | Imports `ActionNode`/tree types; filters tombstones; uses non-null assertions in template. | complete | Direction is right, but `action!` template non-null assertions should be replaced with a computed filtered action-node list if feasible. It should not become a compatibility cast. |
| `frontend/src/commands/factories/DeletionSequenceFactory.ts` | Replaces per-action id collection with `const actionKey = actions[0]?.elementId ?? elementId` and passes key to `RemoveActionFromProcessTreeOp(actionId)`. | revert | Unsafe semantic regression. `RemoveActionFromProcessTreeOp` constructor parameter is `actionId`; its `apply` calls `processTree.removeAction(this.actionId)` and serializes `actionId`. Element ids are not action ids. Follow-up must restore action-node identity collection or change the operation contract in a reviewed way. |

### Projection-plane / world context lane

| File | Current partial edit | Disposition | Rationale |
| --- | --- | --- | --- |
| `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts` | Expands `ProjectionPlaneRealizationContext` with point/circle/plane realization/hinge-line methods; makes `ProjectionPlaneElementRealizationContext` an empty extension. | complete or revert | This is the central unfinished lane. Build errors show consumers need `get3DPlaneRealization` and `getAllProjectionPlanes`, while some newly added methods remain optional but are invoked as required. Either complete one named narrow context end-to-end or revert this lane before continuing. |
| `frontend/src/domain/world/Element2D.ts` | Changes abstract `realize2D` parameter to `ProjectionPlaneElementRealizationContext` but does not import that type; leaves `World` import unused. | complete | Build explicitly reports `Cannot find name ProjectionPlaneElementRealizationContext` and unused `World`. If lane is kept, add/import the context and align all subclasses. |
| `frontend/src/domain/world/Point.ts` | Changes `realize2D` signatures from `World` to `ProjectionPlaneElementRealizationContext`. | complete | Conceptually aligned with narrow realization context, but only safe if the context includes all required methods as non-optional and `ProjectionPlane`/`World` supply it. |
| `frontend/src/domain/world/Line.ts` | Changes `realize2D` signatures to the context type. | complete | Same as `Point.ts`; build still reports unrelated strict `plane` undefined errors requiring explicit guards. |
| `frontend/src/domain/world/Circle.ts` | Changes `realize2D` signatures to the context type. | complete | Same as above; build reports `plane` possibly undefined because the new context still returns optional planes and callers do not guard. |
| `frontend/src/domain/world/Guide.ts` | Changes guide/sibling guide realization and helper context to the context type. | complete | Build reports optional-context invocation risks; context must make required methods explicit or code must guard. |
| `frontend/src/domain/world/Segment.ts` | Changes `realize2D` signature to context type. | complete | Same as `Line.ts`; requires strict plane guard. |
| `frontend/src/domain/world/HingeLine.ts` | Changes half-hinge/hinge realization to context type. | complete | Build reports missing `get3DPlaneRealization` and `getAllProjectionPlanes`, plus optional `getHingeLineById` invocation. This is direct evidence that the context was expanded incompletely. |
| `frontend/src/domain/world/elements/BrokenHalfHingeLine2D.ts` | Changes realization signature to context type. | complete | Build reports optional methods invoked as required (`getHingeLineById`, `getProjectionPlane2DRealization`, `getAllHingeLines`). |
| `frontend/src/domain/world/World.ts` | Makes `getPlaneForElement` public. | needs-review | Decision forbids publicizing private methods solely for compiler shape compatibility. Keep only if a named mutation port truly owns this method; otherwise revert or expose through a narrower port. |
| `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts` | Current status list did not show a diff in the focused excerpt, but build reports strict optional lookup errors and unused import. | complete | Must be handled as owner strictness if still failing. Do not fold unrelated projection-plane redesign into this correction. |
| `frontend/src/domain/world/projectionPlane/AuxiliaryProjectionPlane.ts` | Current status list did not show a diff in the focused excerpt, but build reports `ProjectionPlaneRealizationContext` passed where `World` is required. | complete | Direct symptom of incomplete context migration; either change realization consumers to accept the named context or revert the context narrowing for this lane. |

### UI/store DTO and toolbar lane

| File | Current partial edit | Disposition | Rationale |
| --- | --- | --- | --- |
| `frontend/src/components/toolbars/MainToolbar.vue` | Replaces string tool ids with `TOOL_TYPE`/`ToolType`; uses `setTool`. | needs-review | May be a valid current tool-store contract fix, but it changes toolbar behavior by deleting `point-on-element` and `circle-center-radius` entries. Keep only if current tool-store explicitly lacks those tools and focused UI/tool tests cover it. |
| `frontend/src/components/panels/ElementTypeGroup.vue` | Removes unused `computed`, makes props anonymous, drops unused mouse-enter parameter. | keep | Narrow unused-symbol strictness cleanup. |

### Service/domain strictness lane

| File | Current partial edit | Disposition | Rationale |
| --- | --- | --- | --- |
| `frontend/src/services/GeometryService.ts` | Fixes import casing from `intersections` to `Intersections`. | complete | Corrects one build error, but retry build still reports `lineLineIntersection` is not exported and result typing is unknown. Follow-up must reconcile against actual calculation exports and result type contract. |

## Files listed as modified by git status but not fully covered above

The current status also includes modified historical Saivage/stage artifacts and older architecture-audit artifacts unrelated to this correction. They must not be touched by the correction implementation except for the required Cycle 015 correction artifacts and report. Source-control hygiene requires committing only the files modified by the active task and not reverting unrelated user/harness changes.

## Required follow-up implementation rules

1. Do **not** treat the current partial state as accepted. Start the correction implementation by reconciling these dispositions against a fresh `git diff`.
2. Revert or replace the unsafe `DeletionSequenceFactory.ts` element-id/action-id conflation before any completion claim.
3. For the projection-plane/world lane, choose exactly one reviewed path: complete a narrow named context end-to-end, or revert the lane and defer it to a separate mini-cycle. Do not mix local casts with partial context redesign.
4. Update `implementation-log.md` to match the actual retained/reverted diff before final validation.
5. Protect Wave 014 repairs and the prior ActionsPanel boundary exactly as `decision.md` requires.
6. No `@ts-ignore`, `@ts-expect-error`, blanket `any`, double-cast compatibility escape, tsconfig/package/build-script weakening, compatibility shim, arbitrary source cleanup, or unreviewed broad geometry redesign.

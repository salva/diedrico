# Correction Proposal Direct — Cycle 015 Partial Diff Closure

**Stage:** `cycle-015-correction-diff-audit-proposals`  
**Proposal type:** narrow correction of the current partial Wave 015 diff.  
**Implementation edits in this proposal stage:** none.

## Goal

Resume Wave 015 by reconciling the current uncommitted partial implementation instead of silently accepting it. The follow-up implementation should keep safe owner-boundary fixes, revert the unsafe process-tree identity edit, complete exactly one explicit projection-plane/world realization-context contract if feasible, update `implementation-log.md`, and rerun the build/test gates required before Wave 015 can continue.

## Files to keep as-is unless validation disproves them

- `frontend/src/App.vue` — `StatusBar` receives unwrapped `currentToolStepMessage`.
- `frontend/src/application/appShell/AppShellPorts.ts` — auth port uses the existing expiry-date meaning.
- `frontend/src/composables/useHoverHighlight.ts` — unused import removal.
- `frontend/src/stores/viewStore.ts` — completes the three-view display-default shape.
- `frontend/src/components/panels/ElementTypeGroup.vue` — unused strictness cleanup.
- `frontend/src/domain/processTree/ProcessTree.ts` — `findAction`/traversal return `ActionNode`.
- `frontend/src/domain/processTree/ActionGroup.ts` — duplicate local `ActionGroup` contract is deleted in favor of the authoritative `ProcessTree` type.
- `frontend/src/stores/processStore.ts` — process-store uses `ActionNode` and handles null tombstones.
- `frontend/src/components/panels/ActionItem.vue` — stale `Action` fields are deleted from rendering.
- Typed operation-output changes in:
  - `frontend/src/commands/operations/world/AddFreePointOp.ts`
  - `frontend/src/commands/operations/world/AddLineLineIntersectionPoint2DOp.ts`
  - `frontend/src/commands/operations/world/AddLineCircleIntersectionPoint2DOp.ts`
  - `frontend/src/commands/operations/world/AddCircleCircleIntersectionPoint2DOp.ts`
  - `frontend/src/commands/operations/world/AddSiblingIntersectionPoint2DOp.ts`
- Output guards in `frontend/src/commands/factories/PointSequenceFactory.ts`.

These retained edits are still subject to focused tests and a green `npm run build --workspace=frontend`. The follow-up implementation must begin by re-checking this list against a fresh current `git diff`; because the Wave 015 partial diff is mixed with unrelated dirty artifacts, no retained/complete/revert disposition may be assumed from stale status alone.

## Files to complete in the follow-up implementation

### Command output and descriptor boundary

- `frontend/src/commands/operations/IOperation.ts`
- `frontend/src/commands/Command.ts`
- `frontend/src/commands/factories/GuideSequenceFactory.ts`
- `frontend/src/commands/factories/IntersectionSequenceFactory.ts`
- Existing operation files directly cited by `frontend-build.retry-pass2.stdout`, including `AddLineOp.ts`, `UpdateElementStyleOp.ts`, `RenameSubprocessOp.ts`, and process/view-state operation imports.

Required completion:

1. Preserve concrete operation output types without broad compatibility casts.
2. Replace raw `JsonValue | undefined` plumbing with typed operation outputs or narrow guards at the owner boundary.
3. Fix the current constructor/signature mismatches in `IntersectionSequenceFactory.ts` by aligning with actual operation constructors, not by suppressing type checks.
4. If the `Command.addAndExecute` return cast is only compensating for an underspecified operation contract, improve the generic operation contract rather than widening to `any`.

### Projection-plane/world context boundary

Candidate files:

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
- `frontend/src/domain/world/projectionPlane/AuxiliaryProjectionPlane.ts`
- `frontend/src/domain/world/World.ts`

Required completion path:

1. Define one named realization context that exactly matches the methods required by 2D element realization, hinge-line realization, and auxiliary projection-plane realization.
2. Do not leave required methods optional when callers invoke them as mandatory. Either make them required on the relevant context or guard every optional call intentionally.
3. Import `ProjectionPlaneElementRealizationContext` in `Element2D.ts` if the lane is kept.
4. Reconcile method names currently split across `getProjectionPlane3DRealization`, build-required `get3DPlaneRealization`, and `getAllProjectionPlanes`.
5. Make `World` implement/supply that context intentionally. Do not publicize private methods only to satisfy structural compatibility; `World.getPlaneForElement` may remain public only if documented as the owner port for a current build error.
6. Add strict guards for `getProjectionPlaneById` returning undefined in `Point.ts`, `Line.ts`, `Circle.ts`, `Segment.ts`, and `ProjectionPlane.ts` where the build reports `possibly undefined`.
7. If these steps require redesign beyond the current build-error owner boundary, stop and use the restructure proposal's mini-cycle split instead. In particular, if implementation must choose between multiple conceptual owners beyond one narrow named read-only realization context (`World` as realization provider, `ProjectionPlane` as local provider, or a separate domain query port), do not continue inside the direct path; request a reviewed split before making that owner decision.

### Process-tree identity boundary

Candidate files:

- `frontend/src/commands/factories/DeletionSequenceFactory.ts`
- `frontend/src/commands/operations/processTree/ProcessTreeOperations.ts`
- `frontend/src/domain/processTree/ProcessTree.ts`
- focused tests under `frontend/tests/unit/commands/`, `frontend/tests/unit/processTree.spec.ts`, and/or `frontend/tests/unit/stores/processTreeStore.spec.ts`.

Required completion path:

1. Revert the current `actionKey = actions[0]?.elementId ?? elementId` change.
2. Build the deletion set from authoritative action-node ids returned by the process-tree lookup path.
3. Keep element ids only as payload/evidence about which world elements are deleted, never as ids passed to `RemoveActionFromProcessTreeOp(actionId)`. Group ids, element ids, subprocess ids, and inferred payload ids are explicitly forbidden substitutes for the `actionId` parameter.
4. Add/adjust at least one focused test proving that deleting an element removes the producing action by action-node id and that undo restores the same action node at the same group/index. The test must fail if an element id or group id is passed to `RemoveActionFromProcessTreeOp(actionId)`.

### UI/store/service strictness

- `frontend/src/components/toolbars/MainToolbar.vue` — keep the `TOOL_TYPE` alignment only if it preserves all current tool semantics; otherwise revert deleted tool entries and fix the type contract in the store owner.
- `frontend/src/components/panels/ActionGroupItem.vue` — replace template non-null assertions with a typed filtered list if feasible.
- `frontend/src/components/dialogs/NewProjectDialog.vue` — revert the ad hoc `new ProjectService()` usage unless the actual service owner exposes `createProject`; fix project creation through the application/service port boundary.
- `frontend/src/services/GeometryService.ts` — finish the calculation export/result type contract rather than only changing import casing.

## Explicit revert / delete list

The follow-up implementation should remove or replace these unsafe partial surfaces:

- Revert `frontend/src/commands/factories/DeletionSequenceFactory.ts` element-id/action-id conflation.
- Revert or replace `frontend/src/components/dialogs/NewProjectDialog.vue` local `new ProjectService().createProject(...)` if `ProjectService` still lacks that method.
- Revert projection-plane/world context changes if one coherent named context cannot be completed inside the reviewed build-error boundary.
- Remove any template non-null assertions or local casts introduced only to silence type errors when a typed computed/guard can own the boundary.
- Delete stale `Action` UI reads (`id` on minimal `Action`, `infeasible`, `infeasibilityReason`, `actionType`, `timestamp`, old `inputs`/`outputs`) rather than restoring those fields.

No source/test/package/tooling file is to be deleted wholesale by this correction unless a stale compatibility file is proven unused by static search and directly tied to the current build errors. At present, no whole-file deletion is proposed.

## Validation plan

Capture stdout/stderr under `architecture-audit/cycle-015-typescript-build-contracts/validation/` with stable names.

Required focused validation before any completion claim:

1. Fresh baseline/current build after reconciliation start:
   - `npm run build --workspace=frontend`
   - expected initially red until corrections are complete; save as `frontend-build.correction-start.*`.
2. Focused command/process-tree tests:
   - At the start of the implementation stage, inspect the root and frontend `package.json` scripts and pin the actual existing Vitest/package-script entrypoints in `implementation-log.md` before running tests.
   - Suggested target if supported: `npm run test --workspace=frontend -- --run frontend/tests/unit/commands/removeElementOps.spec.ts frontend/tests/unit/processTree.spec.ts frontend/tests/unit/stores/processTreeStore.spec.ts`
   - Adjust exact command only when the package scripts or existing test paths require it; cite the package-script/path evidence in `implementation-log.md` rather than leaving placeholder command forms.
3. Focused world/projection tests:
   - Pin actual existing projection/world/hinge-line/calculation test entrypoints from the test tree before implementation.
   - Suggested target if supported: `npm run test --workspace=frontend -- --run frontend/tests/unit/projectionPlane.spec.ts frontend/tests/unit/world frontend/tests/unit/calculations`
   - Include additional hinge-line/guide tests if existing paths cover them; if no existing path covers retained realization-context behavior, add a focused test in the nearest existing unit-test area.
4. Focused command-output/factory tests:
   - Pin actual command/factory test paths before implementation.
   - Suggested target if supported: `npm run test --workspace=frontend -- --run frontend/tests/unit/commands.spec.ts frontend/tests/unit/commandStack.spec.ts frontend/tests/unit/commands`
5. Final mandatory Wave 015 implementation gates after focused tests pass:
   - `npm run lint`
   - `npm run lint --workspace=frontend` where defined
   - full root Vitest where defined
   - full frontend Vitest where defined
   - `npm run build`
   - `npm run build --workspace=frontend` (must use existing `vue-tsc && vite build`)
   - root/frontend e2e where defined because frontend/UI/domain behavior is touched
6. Update live preview only in the later validation/preview stage, not in this proposal stage.

## Implementation-log reconciliation

Before final validation, update `architecture-audit/cycle-015-typescript-build-contracts/implementation-log.md` with:

- every Wave 015 source file retained, newly changed, completed, or reverted, reconciled against the fresh current partial diff;
- the audit disposition each file followed (`keep`, `complete`, `revert`, `needs-review`) and the reason if implementation deviated from the audit disposition;
- any already-modified working-tree files intentionally left untouched, with an explicit reason they were unrelated or protected;
- a kept/completed/reverted status for each six-boundary lane;
- explicit note that the unsafe deletion identity edit was corrected and that `RemoveActionFromProcessTreeOp(actionId)` receives action-node ids only;
- focused test command paths, the package-script/test-path discovery evidence used to choose them, and outcomes;
- frontend build rerun paths and outcome;
- per-file protected-surface entries for Wave 014 repaired files and `frontend/src/components/panels/ActionsPanel.vue`, including causal justification for every protected file touched and confirmation that untouched protected files were not used for opportunistic cleanup;
- confirmation that no suppressions, compatibility shims, broad casts, tooling weakening, package downgrades, or parallel build paths were introduced.

## Protection rules

- Protect Wave 014 repaired files and `frontend/src/components/panels/ActionsPanel.vue` exactly as `decision.md` states. They may be touched only for current build-cited failures and direct owner dependencies, with causal notes captured per file in `implementation-log.md`; do not use those areas for opportunistic cleanup or unrelated normalization.
- Do not modify `frontend/package.json`, tsconfig, build scripts, or package manager files to bypass type checking.
- Do not make arbitrary formatting/source cleanup outside the inventoried diff and current build log.
- Do not continue after a red focused test or red frontend build if the failure is attributable to the correction.

## Forbidden repairs

This correction path explicitly forbids:

- `@ts-ignore`, `@ts-expect-error`, skip/todo allowlists, blanket `any`, or `as unknown as` compatibility casts;
- compatibility shims that keep old and new contracts alive;
- restoring stale process-tree fields just to satisfy panels/stores;
- unreviewed broad geometry/projection-plane redesign;
- proceeding without reconciling `implementation-log.md` to the actual final diff;
- claiming completion without focused process-tree/world-context tests and a frontend build rerun.

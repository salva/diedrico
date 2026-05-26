# Correction Decision — Cycle 015 TypeScript Build Contracts

**Stage:** `cycle-015-correction-decision`  
**Wave:** 015 — TypeScript build contracts correction mini-cycle  
**Decision status:** correction review convergence complete.  
**Correction review result:** `correction-reviews/round-01-review.md` records **NO BLOCKING ISSUES after corrections**.  
**Selected correction path:** `correction-proposals/proposal-restructure.md`.  
**Source/test/package/tooling implementation edits in this decision stage:** none.

## Artifacts cited

- `architecture-audit/cycle-015-typescript-build-contracts/correction-diff-audit.md`
- `architecture-audit/cycle-015-typescript-build-contracts/correction-proposals/proposal-direct.md`
- `architecture-audit/cycle-015-typescript-build-contracts/correction-proposals/proposal-restructure.md`
- `architecture-audit/cycle-015-typescript-build-contracts/correction-reviews/round-01-review.md`
- `.saivage/stages/cycle-015-implement-typescript-build-contracts/summary.json`
- `architecture-audit/cycle-015-typescript-build-contracts/decision.md`
- `architecture-audit/cycle-015-typescript-build-contracts/reviews/round-01-review.md`
- `architecture-audit/cycle-015-typescript-build-contracts/validation/frontend-build.retry-pass2.stdout`

## Convergence basis

Wave 015 originally selected `proposals/proposal-restructure.md` to converge active frontend TypeScript build failures at owned boundaries instead of silencing individual call sites. The implementation stage then escalated: two implementation attempts left an uncommitted partial diff, failed to produce a green `npm run build --workspace=frontend`, did not supply mandatory focused behavior tests, and exposed two high-risk semantic regressions.

The correction diff audit identifies the current partial state and classifies it by disposition. The correction review initially raised proposal-document blockers, then rechecked the in-place corrected proposals and recorded **NO BLOCKING ISSUES after corrections**. The reviewer still recommends `correction-proposals/proposal-restructure.md` as the safer path because the projection-plane/world realization context and process-tree deletion identity lanes should not be buried inside another broad implementation retry.

## Selected correction alternative

Select `architecture-audit/cycle-015-typescript-build-contracts/correction-proposals/proposal-restructure.md` as the binding correction implementation path.

Rationale:

- It honors the Wave 015 expansion stop rule from `decision.md` after the failed implementation revealed semantic boundary decisions, not only compiler mismatches.
- It keeps safe build-contract convergence work available while requiring explicit stop/split criteria for the two dangerous lanes.
- It requires authoritative action-node identity for process-tree deletion and forbids substituting element ids, group ids, subprocess ids, or inferred payload ids into `RemoveActionFromProcessTreeOp(actionId)`.
- It requires one explicit, named projection-plane/world realization context if that lane is retained; otherwise the lane must be reverted/deferred to a reviewed mini-cycle.
- It binds concrete implementation-log reconciliation, focused validation command discovery, Wave 014 protection checks, and `ActionsPanel.vue` protection checks.

## Rejected/deferred alternative

`correction-proposals/proposal-direct.md` is acceptable after review corrections but is rejected as the primary correction path.

Rejected/deferred aspects:

- A single broad direct closure risks treating unresolved realization-context ownership and deletion identity semantics as ordinary retry cleanup.
- It is less protective against accidental structural typing, local casts, or hidden action-id/element-id regressions under pressure to make `vue-tsc` pass.

Incorporated aspects:

- It remains binding wherever it overlaps the selected route: direct-owner scope, explicit revert/replace list, projection-plane stop rule, deletion-identity proof requirement, focused validation discovery, protected-surface accounting, and forbidden-repair list.
- If the next implementation proves both high-risk lanes are genuinely small and satisfy all split decision criteria, it may complete them in the same correction implementation without a further mini-cycle. If any split criterion is triggered, implementation must stop and request the reviewed split route described below.

## Binding file-level dispositions for current partial diff

The next implementation must start by reconciling these dispositions against a fresh `git diff`. Because the current working tree is mixed with unrelated dirty artifacts, no file may be assumed accepted solely because it is already modified.

### Keep unless validation disproves

- `frontend/src/App.vue` — keep the narrow `StatusBar` `currentToolStepMessage` contract fix.
- `frontend/src/application/appShell/AppShellPorts.ts` — keep the auth port expiry-date contract alignment.
- `frontend/src/composables/useHoverHighlight.ts` — keep unused import removal.
- `frontend/src/stores/viewStore.ts` — keep `showReferenceAxes` display-default completion.
- `frontend/src/components/panels/ElementTypeGroup.vue` — keep unused-symbol strictness cleanup.
- `frontend/src/domain/processTree/ProcessTree.ts` — keep `ActionNode` traversal/find ownership if focused process-tree tests confirm identity semantics.
- `frontend/src/domain/processTree/ActionGroup.ts` — keep deletion of duplicate local `ActionGroup` contract if imports/build remain clean.
- `frontend/src/stores/processStore.ts` — keep `ActionNode` and null-tombstone handling if focused store/process-tree tests pass.
- `frontend/src/components/panels/ActionItem.vue` — keep deletion of stale `Action` UI fields; do not restore obsolete fields.
- `frontend/src/commands/operations/world/AddFreePointOp.ts` — keep typed `pointId` output.
- `frontend/src/commands/operations/world/AddLineLineIntersectionPoint2DOp.ts` — keep typed `pointId` output.
- `frontend/src/commands/operations/world/AddLineCircleIntersectionPoint2DOp.ts` — keep typed `pointId` output.
- `frontend/src/commands/operations/world/AddCircleCircleIntersectionPoint2DOp.ts` — keep typed `pointId` output.
- `frontend/src/commands/operations/world/AddSiblingIntersectionPoint2DOp.ts` — keep typed `pointId` output.
- `frontend/src/commands/factories/PointSequenceFactory.ts` — keep runtime guard for missing `pointId` at the factory boundary.

### Complete intentionally, or stop if completion exceeds reviewed scope

- `frontend/src/commands/operations/IOperation.ts` and `frontend/src/commands/Command.ts` — complete concrete operation-output typing without broad compatibility casts. If the current return cast hides an underspecified contract, improve the generic contract rather than widening to `any`.
- `frontend/src/commands/factories/GuideSequenceFactory.ts` — complete output guards and reconcile guide/sibling guide type ownership without local casts.
- `frontend/src/commands/factories/IntersectionSequenceFactory.ts` — complete constructor/signature alignment against actual operation owners, not by suppressing errors.
- Existing build-cited operation/import files including `AddLineOp.ts`, `UpdateElementStyleOp.ts`, `RenameSubprocessOp.ts`, and process/view-state operation imports — complete only where directly cited by current build errors or direct owner dependencies.
- `frontend/src/components/panels/ActionGroupItem.vue` — replace template non-null assertions with a typed filtered action-node list if feasible; do not restore stale `Action` fields.
- `frontend/src/services/GeometryService.ts` — complete calculation export/result typing rather than only changing import casing.
- `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts` and `frontend/src/domain/world/projectionPlane/AuxiliaryProjectionPlane.ts` — complete only inside the selected projection-plane/world lane rules below.

### Revert or replace before any completion claim

- `frontend/src/commands/factories/DeletionSequenceFactory.ts` — revert/replace the unsafe `actionKey = actions[0]?.elementId ?? elementId` logic. `RemoveActionFromProcessTreeOp(actionId)` must receive authoritative action-node ids only.
- `frontend/src/components/dialogs/NewProjectDialog.vue` — revert/replace ad hoc `new ProjectService().createProject(...)` unless the actual project creation owner exposes that method through the correct application/service port. Do not instantiate service infrastructure locally in the dialog to satisfy type checking.

### Needs review / gated retention

- Projection-plane/world context lane files are gated as a set: `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`, `frontend/src/domain/world/Element2D.ts`, `frontend/src/domain/world/Point.ts`, `frontend/src/domain/world/Line.ts`, `frontend/src/domain/world/Circle.ts`, `frontend/src/domain/world/Guide.ts`, `frontend/src/domain/world/Segment.ts`, `frontend/src/domain/world/HingeLine.ts`, `frontend/src/domain/world/elements/BrokenHalfHingeLine2D.ts`, `frontend/src/domain/world/World.ts`, `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts`, and `frontend/src/domain/world/projectionPlane/AuxiliaryProjectionPlane.ts`. Keep/complete only if one explicit named realization context can be completed end-to-end with no optional methods invoked as required, no structural-typing escape, and no public method exposure solely for compiler shape compatibility. Otherwise revert the lane and request the reviewed split mini-cycle.
- `frontend/src/domain/world/World.ts` public `getPlaneForElement` remains gated. It may stay public only if documented as the intentional owner port for current build-cited behavior; otherwise revert its visibility change.
- `frontend/src/components/toolbars/MainToolbar.vue` remains gated. Keep `TOOL_TYPE` alignment only if it preserves all current tool semantics and tests/inspection prove removed entries are not current tools. Otherwise revert deleted tool entries and fix the type contract at the store owner.

## Required correction implementation path

The next stage should be a follow-up correction implementation stage before returning to Wave 015 implementation/build closure. It must perform these steps in order:

1. Inspect fresh `git diff` and current package/test scripts without reading secret files.
2. Reconcile every current Wave 015 partial-diff file against this decision's keep/complete/revert/needs-review dispositions.
3. Correct the process-tree deletion identity issue before any completion claim.
4. For projection-plane/world, either complete one narrow named realization context end-to-end or stop and request the split mini-cycle described by `proposal-restructure.md`.
5. Update `architecture-audit/cycle-015-typescript-build-contracts/implementation-log.md` before final validation so it reflects the actual retained, completed, reverted, newly corrected, and intentionally untouched files.
6. Run focused validation and frontend build reruns with stable logs under `architecture-audit/cycle-015-typescript-build-contracts/validation/`.
7. Only after the correction implementation is green and logged should Wave 015 return to remaining TypeScript build-contract closure and then the full Wave 015 validation/preview path.

## Split mini-cycle stop conditions

Implementation must stop and request a reviewed split mini-cycle, not improvise inside the correction implementation, if any of these occur:

- Projection-plane/world completion requires choosing between multiple conceptual owners beyond one narrow named read-only realization context.
- Required context method names or optional-vs-required semantics cannot be made consistent without changing realization semantics.
- `World.getPlaneForElement` must be public only because of structural compatibility pressure.
- Process-tree deletion requires changing the `RemoveActionFromProcessTreeOp(actionId)` contract, group/action-node removal semantics, subprocess removal semantics, or an element-to-action index ownership model beyond a local bug fix.
- Focused tests reveal deletion/undo or projection-plane realization behavior divergence that cannot be fixed inside the reviewed owner boundary.
- The implementation cannot prove with a focused test that deleting an element removes the producing action by action-node id and undo restores the same action node at the same group/index.
- A fix would require package/tooling weakening, suppressions, compatibility shims, broad casts, arbitrary cleanup, or touching protected prior-wave surfaces without direct current-build causality.

## Validation requirements

The correction implementation must capture full stdout/stderr under `architecture-audit/cycle-015-typescript-build-contracts/validation/` with stable names and record the command, log path, and result in `implementation-log.md`.

Before implementation changes, pin actual scripts and test paths by inspecting root/frontend package scripts and the existing test tree. Suggested command forms may be adjusted only with package-script/path evidence in the log.

Minimum focused validation required before correction completion:

- command/process-tree deletion and undo behavior, including a test that fails if an element id, group id, subprocess id, or inferred payload id is passed as `RemoveActionFromProcessTreeOp(actionId)`;
- projection-plane/world/hinge-line realization behavior if the projection-plane/world lane is retained;
- command-output/factory behavior where typed outputs and runtime guards change behavior;
- `npm run build --workspace=frontend` on the active `vue-tsc && vite build` path after corrections;
- any focused app/service, UI/store, toolbar, or geometry-service tests needed by behavior-bearing retained changes.

After focused validation passes, the remaining Wave 015 implementation closure must still run the full Wave 015 cadence from `decision.md`: root/workspace lint where defined, root/frontend full Vitest where defined, root and frontend build, e2e/Playwright where defined, and later validation/preview refresh. Undefined scripts must be cited from package-script evidence rather than silently skipped.

## Implementation-log reconciliation requirements

`architecture-audit/cycle-015-typescript-build-contracts/implementation-log.md` must be reconciled before any completion claim and must include:

- every Wave 015 source file retained, completed, reverted, newly corrected, or intentionally left untouched relative to the fresh current partial diff;
- the audit disposition followed for each file and the reason for any deviation;
- any already-modified working-tree files intentionally left untouched, with the reason they are unrelated or protected;
- status for each correction lane: app shell/service ports, command descriptor/operation outputs, process-tree identity, projection-plane/world context, UI/store DTOs, and service/domain strictness;
- explicit confirmation that `DeletionSequenceFactory.ts` no longer passes element ids/group ids/subprocess ids/payload ids where `RemoveActionFromProcessTreeOp(actionId)` requires action-node ids;
- focused test command paths, package-script/test-path discovery evidence, validation log paths, and outcomes;
- frontend build rerun log paths and outcome;
- per-file causal notes for any Wave 014 repaired file or `frontend/src/components/panels/ActionsPanel.vue` touched;
- confirmation that no suppressions, compatibility shims, broad casts, package/tooling downgrades, alternate build paths, restored stale fields, or opportunistic cleanup were introduced.

## Protected surfaces

The Wave 014 repaired files named in `decision.md` and `frontend/src/components/panels/ActionsPanel.vue` remain protected. They may be touched only for current build-cited failures and direct owner dependencies, and every such touch must have a causal entry in `implementation-log.md`. These areas must not be used for opportunistic formatting, broad cleanup, UI workflow redesign, dependency-service redesign, or compatibility restoration.

Protected Wave 014 surfaces include:

- `frontend/tests/unit/calculations/intersections.spec.ts`
- `frontend/src/components/dialogs/PropertiesDialog.vue`
- `frontend/tests/unit/components/propertiesDialog.spec.ts`
- `frontend/tests/integration/guide-creation.test.ts`
- `frontend/tests/e2e/keyboard-shortcuts.spec.ts`
- `frontend/tests/e2e/selection-mask.spec.ts`
- `frontend/package.json` `vue-tsc` build-gate upgrade

## Forbidden repairs

The correction implementation must not introduce:

- `@ts-ignore`, `@ts-expect-error`, skipped tests, build allowlists, or TypeScript/tooling weakening;
- blanket `any`, broad `as any`, `as unknown as`, or structural-typing escape hatches;
- compatibility shims or dual old/new process-tree or realization-context paths;
- restored legacy `Action`/process-node fields solely to satisfy stale consumers;
- package-lock/package/tooling changes to bypass type checking;
- arbitrary source cleanup outside inventoried current build errors and direct owner dependencies;
- unreviewed broad geometry, projection-plane, persistence, rendering, command-controller, or UI workflow redesign.

## Accepted residual risks

- `proposal-restructure.md` may fragment correction work if split criteria are triggered, but that risk is accepted because it prevents semantic context/identity decisions from being hidden inside a failed implementation retry.
- Some currently modified files are safe to keep only after focused tests; until validation passes, their keep disposition is not a completion claim.
- The frontend build may remain red after high-risk lanes are corrected because remaining Wave 015 build-contract errors still need ordinary owner-boundary closure.

## Next stage recommendation

Proceed to a follow-up correction implementation stage before returning to Wave 015 implementation/build closure. The stage should use `correction-proposals/proposal-restructure.md`, this correction decision, and the original Wave 015 `decision.md` as binding constraints. If the correction implementation triggers any stop condition, schedule the relevant reviewed split mini-cycle for projection-plane/world realization context and/or process-tree deletion identity before continuing.

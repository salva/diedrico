# Correction Proposal Restructure — Split High-Risk Lanes Before Wave 015 Closure

**Stage:** `cycle-015-correction-diff-audit-proposals`  
**Proposal type:** evaluate whether the current partial diff requires reviewed sub-wave/mini-cycle splitting.  
**Implementation edits in this proposal stage:** none.

## Summary recommendation

The current partial diff contains two qualitatively different problem classes:

1. **Safe build-contract convergence edits** that can likely be completed directly: app-shell ports, operation-output typing, process-tree `ActionNode` ownership, stale action UI deletion, strict unused imports/defaults.
2. **High-risk conceptual boundary edits** that should not be silently finished inside an implementation retry: projection-plane/world realization context and deletion identity semantics.

This proposal recommends splitting the follow-up into a reviewed correction mini-cycle if either high-risk lane cannot be resolved by a small, explicit owner contract. The split is not a new broad wave; it is a bounded delta review required by the existing Cycle 015 decision's expansion stop rule.

## Split decision criteria

### Continue in one correction implementation only if all are true

- The projection-plane/world lane can define one narrow named realization context without changing the domain model beyond current `vue-tsc` owner errors.
- `World`, `ProjectionPlane`, `AuxiliaryProjectionPlane`, and element realization signatures can all consume/supply that context without structural-typing escapes.
- The process-tree deletion fix can be restored to action-node identity without changing the `RemoveActionFromProcessTreeOp(actionId)` contract.
- Focused process-tree and projection-plane tests can be added/run using existing test surfaces.
- `implementation-log.md` can be reconciled to the final diff before validation.

### Split into reviewed mini-cycle(s) if any are true

- Projection-plane/world context requires choosing between multiple conceptual owners (`World` as realization provider, `ProjectionPlane` as local realization provider, or a separate read-only domain query port).
- Required methods cannot be named consistently without changing realization semantics (`getProjectionPlane3DRealization` vs `get3DPlaneRealization`, `getAllProjectionPlanes`, hinge-line access, and optional-vs-required methods).
- Publicizing `World.getPlaneForElement` is needed only because of structural compatibility pressure rather than a named owner port.
- Deletion semantics require changing from action removal to group/action-node removal, subprocess removal, or element-to-action index ownership beyond a local bug fix.
- Existing focused tests reveal behavior divergence in deletion/undo or projection-plane realization.

## Proposed mini-cycle A: projection-plane/world realization context

### Scope

Only these files and direct tests:

- `frontend/src/domain/world/projectionPlane/ProjectionPlaneContext.ts`
- `frontend/src/domain/world/World.ts`
- `frontend/src/domain/world/projectionPlane/ProjectionPlane.ts`
- `frontend/src/domain/world/projectionPlane/AuxiliaryProjectionPlane.ts`
- `frontend/src/domain/world/Element2D.ts`
- `frontend/src/domain/world/Point.ts`
- `frontend/src/domain/world/Line.ts`
- `frontend/src/domain/world/Circle.ts`
- `frontend/src/domain/world/Guide.ts`
- `frontend/src/domain/world/Segment.ts`
- `frontend/src/domain/world/HingeLine.ts`
- `frontend/src/domain/world/elements/BrokenHalfHingeLine2D.ts`
- focused tests under `frontend/tests/unit/projectionPlane.spec.ts`, `frontend/tests/unit/world/`, and related calculation/hinge-line tests if present.

### Target outcome

A single explicit, named, read-only realization context replaces accidental `World` structural coupling for element/plane realization. The context has no optional methods that are required by callers. `World` supplies the context intentionally, and `ProjectionPlane`/`AuxiliaryProjectionPlane` use it consistently. Strict undefined plane/element lookups are guarded at the owner boundary with errors or infeasible realization results according to existing domain semantics.

### Files to keep/change/revert

- Keep signature changes from `World` to `ProjectionPlaneElementRealizationContext` only if the context is completed end-to-end.
- Change `ProjectionPlaneContext.ts` to express separate interfaces if needed, for example:
  - element-local realization lookup;
  - projection-plane realization lookup;
  - hinge-line lookup.
  These must be named contracts, not compatibility bags.
- Change `Element2D.ts` to import the context type if kept.
- Change `HingeLine.ts`/`BrokenHalfHingeLine2D.ts` to consume a context whose required methods match actual calls.
- Change `AuxiliaryProjectionPlane.ts` to stop passing a partial context where a full `World` is required, or change the callee contract honestly.
- Revert `World.getPlaneForElement` visibility if it is not part of the final named port.

### Explicit DELETE/revert list

- Delete the empty marker-only `ProjectionPlaneElementRealizationContext extends ProjectionPlaneRealizationContext {}` shape if it becomes a meaningless compatibility alias.
- Revert optional method declarations that are immediately invoked as required.
- Revert any public method exposure on `World` made solely to satisfy structural type compatibility.
- Delete casts/suppressions if any appear during implementation; they are not allowed.

### Validation for mini-cycle A

- `npm run test --workspace=frontend -- --run frontend/tests/unit/projectionPlane.spec.ts frontend/tests/unit/world frontend/tests/unit/calculations`
- Add focused tests if no existing test covers realization context behavior for hinge lines/guides/auxiliary planes.
- `npm run build --workspace=frontend` after the lane is completed; no projection-plane/world context errors may remain.

## Proposed mini-cycle B: process-tree deletion identity

### Scope

Only these files and direct tests:

- `frontend/src/commands/factories/DeletionSequenceFactory.ts`
- `frontend/src/commands/operations/processTree/ProcessTreeOperations.ts` only if operation contract changes are required
- `frontend/src/domain/processTree/ProcessTree.ts`
- `frontend/src/domain/processTree/ActionGroup.ts`
- `frontend/src/stores/processStore.ts`
- `frontend/src/components/panels/ActionItem.vue`
- `frontend/src/components/panels/ActionGroupItem.vue`
- focused tests under `frontend/tests/unit/commands/removeElementOps.spec.ts`, `frontend/tests/unit/processTree.spec.ts`, and `frontend/tests/unit/stores/processTreeStore.spec.ts`.

### Target outcome

Process-tree deletion uses authoritative action-node ids for process-tree tombstones, while element ids remain world-element identities only. Undo restores the exact removed action node at its stable group/index. Panels/stores consume `ActionNode` and tombstone-aware children without resurrecting stale `Action` fields.

### Files to keep/change/revert

- Keep `ProcessTree.findAction(): ActionNode | undefined` and `traverseActions(... ActionNode ...)` if tests confirm the current tree owns action ids.
- Keep `ActionGroup.ts` as an alias/factory around the authoritative `ProcessTree.ActionGroup` shape if imports remain clean.
- Keep `processStore.ts` null-tombstone guards and `ActionNode` usage.
- Keep `ActionItem.vue` stale-field deletion.
- Change `ActionGroupItem.vue` to avoid template non-null assertions if possible.
- Revert/replace `DeletionSequenceFactory.ts` `actionKey = actions[0]?.elementId ?? elementId`.

### Explicit DELETE/revert list

- Revert element-id-as-action-id logic in `DeletionSequenceFactory.ts`.
- Delete any attempt to restore old `Action.id` on the minimal action payload solely for UI or deletion compatibility.
- Delete stale panel assumptions about `Action.inputs`, `Action.outputs`, `Action.actionType`, `Action.timestamp`, `Action.infeasible`, and `Action.infeasibilityReason` unless the authoritative `ActionNode` contract still owns them.

### Validation for mini-cycle B

- `npm run test --workspace=frontend -- --run frontend/tests/unit/commands/removeElementOps.spec.ts frontend/tests/unit/processTree.spec.ts frontend/tests/unit/stores/processTreeStore.spec.ts`
- Add a focused test if existing `removeElementOps.spec.ts` does not assert that deleting an element removes the producing action by action-node id and undo restores the same action at the same index.
- `npm run build --workspace=frontend` must not report process-tree identity errors.

## Remaining direct Wave 015 closure after mini-cycle(s)

Once high-risk lanes are reviewed/resolved, resume normal Wave 015 implementation for the remaining red build categories:

- command descriptor/result strictness;
- `UpdateElementStyleOp` serialization/result typing;
- view-state operation import paths;
- UI/store DTO strictness including `SvgCanvas.vue`, `PlaneSelector.vue`, and `PropertiesDialog.vue` only for directly cited current errors;
- service/domain strictness (`GeometryService`, `GoogleDriveService`, `ProjectService`, plane sequence factory, etc.).

These remaining categories must still obey the original `decision.md` scope: direct current build errors and direct owner dependencies only.

## Validation plan for split route

Each mini-cycle must capture its focused validation logs under `architecture-audit/cycle-015-typescript-build-contracts/validation/` with names identifying the correction lane, for example:

- `process-tree-identity.focused.stdout/stderr`
- `projection-context.focused.stdout/stderr`
- `frontend-build.after-process-tree-correction.stdout/stderr`
- `frontend-build.after-projection-context-correction.stdout/stderr`

Before Wave 015 completion can be claimed, still run the full mandatory cadence from `decision.md`:

1. focused tests for every behavior-bearing changed boundary;
2. `npm run lint` at root and `npm run lint --workspace=frontend` where defined;
3. root and frontend full Vitest where defined;
4. `npm run build` and `npm run build --workspace=frontend`;
5. root/frontend e2e/Playwright where defined because frontend behavior is touched;
6. later validation/preview refresh stage with HTTP reachability and live Playwright smoke.

If a script is undefined, cite exact package-script evidence in `implementation-log.md` rather than silently skipping it.

## Protection rules

- Do not modify or revert Wave 014 repaired files unless a current build error directly cites them and the causal link is documented.
- Treat `frontend/src/components/panels/ActionsPanel.vue` as protected except for current build-cited process-tree contract errors and direct owner dependencies.
- Do not edit package/tooling/build configuration to bypass type checking.
- Do not mine or revive discarded stale audit conclusions.
- Do not commit broad geometry redesign, UI normalization, rendering extraction, persistence changes, or docs cleanup inside these correction mini-cycles.

## Forbidden repairs

The split route also forbids:

- suppressions (`@ts-ignore`, `@ts-expect-error`, skipped tests, build allowlists);
- broad `any`, `as unknown as`, or accidental structural-typing escape hatches;
- compatibility shims or dual old/new process-tree or realization-context paths;
- restoring legacy fields only to satisfy stale consumers;
- proceeding without reconciling `implementation-log.md` to the actual final retained/reverted diff;
- claiming completion without focused tests and a frontend build rerun.

## Decision requested from reviewer/manager

Review should choose one of two paths:

1. **Direct correction path:** allow a single implementation stage to finish/revert the current partial diff if the reviewer agrees the projection-plane context and deletion identity fixes are small enough.
2. **Split correction path:** require one or two reviewed mini-cycles for projection-plane/world context and/or process-tree deletion identity before returning to the remaining Wave 015 build closure.

If there is doubt, choose the split path. It better respects the Cycle 015 expansion stop rule and avoids burying semantic identity/context decisions inside a failed implementation retry.

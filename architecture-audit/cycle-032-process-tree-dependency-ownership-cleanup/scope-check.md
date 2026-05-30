# Cycle 032 Scope Check — Process-tree/dependency ownership cleanup

## Source-control reconciliation

Scoped pre-design status for Wave 005 paths was inspected before writing this artifact:

- `git status --short -- ...` showed pre-existing scoped dirt in `frontend/src/domain/processTree/ActionGroup.ts`, `frontend/src/stores/processStore.ts`, plus deleted e2e specs `frontend/tests/e2e/active-plane-shortcuts.spec.ts` and `frontend/tests/e2e/selection-mask.spec.ts`.
- `git diff --stat -- ...` showed `ActionGroup.ts` changed by 22 lines, `processStore.ts` changed by 20 lines, and the two e2e specs deleted.
- The `processStore.ts` pre-existing diff is type/null-safety churn inside an unused legacy Pinia store: it changes `ConstructiveAction` references to `ActionNode`, adds child null checks, and keeps the same exported `useProcessStore` surface. Current evidence still shows the store's only usage is its own export (`frontend/src/stores/processStore.ts:14`) and it still owns a parallel `CommandStack` plus process mutators (`frontend/src/stores/processStore.ts:7-18`, `:91-188`).
- These pre-existing dirty files were not normalized, reverted, staged, or incorporated as Cycle 032 implementation during this design correction. Cycle 031 also records the e2e deletions as pre-existing and not attributable to closure (`architecture-audit/cycle-031-command-undo-persistence-contract-cleanup/implementation-log.md:257-263`).

This design-only correction changes only `architecture-audit/cycle-032-process-tree-dependency-ownership-cleanup/**` and the stage report.

### Ownership decision for dirty `processStore.ts`

Cycle 032 may still own deletion of `frontend/src/stores/processStore.ts` despite its pre-existing dirty state, because the architectural target is to remove the entire unused parallel process-history store, not to preserve or merge the local edits inside it. The file is direct evidence of the remaining ownership smell: it defines a separate Pinia process store, a separate `CommandStack`, path-based process mutations, and the only remaining `addAction(` method in active source (`frontend/src/stores/processStore.ts:14-18`, `:91-188`). If implementation confirms the usage scan remains empty, deleting the whole file intentionally supersedes the pre-existing local edits and must be recorded in `implementation-log.md` as a Cycle 032-owned deletion of a pre-dirty file.

If implementation finds any active import, dynamic registration, or user-owned purpose for the dirty edits that cannot be cleanly attributed, Cycle 032 must stop for a reviewed delta or narrow the direct proposal by removing `processStore.ts` from the delete list. It must not silently absorb unrelated edits by rewriting the store in place.

## Wave validity and centrality

Wave 005 remains valid and next by centrality. The wave plan says it owns `ProcessTree.ts`, `Action.ts`, action creators, dependency graph/service modules, process-tree operations, `ActionsPanel.vue` only as needed, and focused process-tree/dependency/undo/panel tests (`architecture-audit/wave-plan.md:192-201`). Its target is still correct: ProcessTree should own construction history only; dependency queries should live in the single dependency boundary; UI panels should consume use-cases/typed process-tree commands (`architecture-audit/wave-plan.md:207-222`). Cycle 031 explicitly recommends fresh scouting Wave 005 next (`architecture-audit/cycle-031-command-undo-persistence-contract-cleanup/implementation-log.md:247-249`).

However, current source partially invalidates the old premise wording: `ProcessTree.addAction()` and `ProcessTree.getActionsDependingOnElement()` are already absent from active `ProcessTree.ts`; the only `addAction(` match is an unused legacy `processStore` action (`frontend/src/stores/processStore.ts:117`). Therefore Cycle 032 should not broaden to recreate old delete work. It should narrow Wave 005 to remaining ownership seams evidenced in current source.

## Current evidence

### ProcessTree construction-history ownership

`ProcessTree` currently defines tree node contracts and stack/history mutation methods in one domain module: root/subprocess/action group/action node shapes (`frontend/src/domain/processTree/ProcessTree.ts:11-44`), stack push/pop (`frontend/src/domain/processTree/ProcessTree.ts:96-140`), explicit group/action insertion (`frontend/src/domain/processTree/ProcessTree.ts:173-215`), history traversal and producer lookup (`frontend/src/domain/processTree/ProcessTree.ts:307-374`), tombstone removal/restoration (`frontend/src/domain/processTree/ProcessTree.ts:376-486`), and stack path/active queries (`frontend/src/domain/processTree/ProcessTree.ts:499-539`). This is construction-history state, not dependency graph ownership.

Remaining process-history smells inside scope:

- Console logging remains in domain mutation methods (`ProcessTree.ts:233-293`), which is not a dependency boundary issue but is routine debug leakage and can be deleted if touched.
- `ActionGroup.ts` is now a thin alias plus factory over the authoritative `ProcessTree.ActionGroup` contract (`frontend/src/domain/processTree/ActionGroup.ts:121-140` in the combined line capture), and it is dirty before this scout. Treat changes there as pre-existing unless implementation deliberately owns its cleanup.
- `ProcessTree.addSubprocess(parent?)` is still a non-stack insertion API (`ProcessTree.ts:152-171`) used by tests; it is not the deprecated `addAction()` path. It can remain unless a proposal deliberately narrows all active subprocess mutations to stack/use-case operations.

### Deprecated process APIs

Static scan found no active `ProcessTree.addAction()` or `getActionsDependingOnElement()` in `frontend/src/domain/processTree/ProcessTree.ts` or active callers. The only `addAction(` match is `frontend/src/stores/processStore.ts:117`, in an unused Pinia store that imports a separate process model and owns a parallel `CommandStack` (`frontend/src/stores/processStore.ts:1-18`, `:91-188`); static usage scan found only the store's own export. This file is already dirty before Cycle 032 implementation, but the dirt is inside the same unused legacy surface. Deletion remains in-scope if implementation records that it is deleting a pre-dirty file rather than adopting its edits; otherwise stop/narrow if ownership cannot be cleanly attributed.

### DependencyService overlap

The current dependency boundary has moved to `frontend/src/domain/world/DependencyService.ts`, not the old `frontend/src/services/DependencyService.ts` path. The old path does not exist. The current service owns dependency maps, registration/unregistration, dependency/dependent queries, cycle checks, deletion ordering, dependency summary, and invalidation cascade (`frontend/src/domain/world/DependencyService.ts:40-147`, `:201-287`, `:295-340`). Its constructor comment says the ProcessTree argument was removed and it is now managed by World via element interaction (`frontend/src/domain/world/DependencyService.ts:45-48`).

`Action.ts` still documents dependency lookup through `world.dependencyService.getDependencies(elementId)` (`frontend/src/domain/processTree/Action.ts:20-22`) but the `Action` data contract itself is only `elementId`, `description`, and `isOutput` (`frontend/src/domain/processTree/Action.ts:29-33`). Action creator comments also point dependency readers to DependencyService. This is acceptable ownership if comments remain accurate, but the wording should be normalized away from phase history and private-service phrasing.

`ProcessTreeReadModel.getRelatedActionIds()` explicitly joins construction history with `world.getDependencyService().getDependencies(action.elementId)` (`frontend/src/application/appShell/readModels/ProcessTreeReadModel.ts:20-28`). This is the current user-facing related-action/highlight query. It is outside ProcessTree and therefore respects the target ownership, but it still couples the read model to the whole `World` rather than a narrow process-history/dependency read port.

### Process-tree command operations

Active operations wrap ProcessTree mutations for undo/redo/persistence: add group/action (`AddProcessTreeActionGroupOp.ts:12-45`; `AddProcessTreeActionOp.ts:14-72`), push/pop (`PushSubprocessOp.ts:13-40`; `PopSubprocessOp.ts:13-39`), rename/toggle (`RenameSubprocessOp.ts:8-46`; `ToggleEncapsulationOp.ts:8-37`; `ToggleOutputOp.ts:8-37`), and action removal (`ProcessTreeOperations.ts:23-85`).

Two registered operations are dead/future placeholders: `RemoveActionGroupFromProcessTreeOp` and `RemoveSubprocessFromProcessTreeOp` return failure/throw `Not implemented`, are documented as future features, and are still registered for ProjectService round-trip tests (`frontend/src/commands/operations/processTree/ProcessTreeOperations.ts:88-162`; `frontend/src/commands/operations/processTree/registerProcessTreeOperationDescriptors.ts:41-43`; `frontend/tests/unit/services/ProjectService.roundTrip.spec.ts:203-218`). Under no-backcompat priorities, these should be deleted rather than preserved as serialized no-op/failure descriptors if no active behavior uses them.

### ActionsPanel command/process coupling

`ActionsPanel.vue` no longer imports `Command` or concrete process-tree operations. It injects `ProcessTreeReadInjectionKey` and `ProcessHistoryCommandInjectionKey` (`frontend/src/components/panels/ActionsPanel.vue:49-72`), renders a read model (`:29-45`, `:85-103`), and sends push/pop/toggle/rename intents through `processHistoryController` (`:211-245`). The panel already satisfies the Wave 005 target at the component boundary. The process-history use-case boundary still imports concrete process-tree operations and a `World` (`frontend/src/application/processHistory/ProcessHistoryUseCases.ts:40-113`), which is acceptable application-layer ownership for this wave unless the restructure path is selected.

### Command/undo/persistence implications after Cycle 031

Cycle 031 leaves ProjectService as current-schema command-stream orchestration with descriptor restoration/validation owned by OperationRegistry and operation registration modules. Therefore Wave 005 may remove process operation descriptors and tests only if it also removes their registry entries and no persisted current-schema command stream relies on them as active behavior. It must not introduce migrations, compatibility fallbacks, domain snapshot persistence, or ProjectService concrete operation imports.

### Tests/e2e surfaces

Focused surfaces include `frontend/tests/unit/processTree.spec.ts`, `frontend/tests/integration/processTree-stack.test.ts`, `frontend/tests/unit/application/panelToolbarIntentControllers.spec.ts`, `frontend/tests/unit/components/panelToolbarBehavior.spec.ts`, `frontend/tests/unit/services/ProjectService.roundTrip.spec.ts`, deletion/selection tests that set up process actions and DependencyService, and e2e current UI/keyboard flows. Existing tests already assert explicit action-group insertion rather than deprecated implicit `addAction()` (`frontend/tests/unit/processTree.spec.ts:24-78`) and process-history use cases with undo/redo (`frontend/tests/unit/application/panelToolbarIntentControllers.spec.ts:506-520` in captured output). Pre-existing deleted e2e specs remain dirty and must not be adopted by this wave.

## Selected bounded scope for implementation proposals

Cycle 032 should propose a bounded Wave 005 implementation that:

1. Treats absent `ProcessTree.addAction()` / `getActionsDependingOnElement()` as already deleted and proves absence with architecture/static tests.
2. Deletes the unused legacy `frontend/src/stores/processStore.ts` if implementation confirms no active imports beyond its own export; because the file is pre-dirty, the implementation log must explicitly state that Cycle 032 owns deletion of the whole unused file and is not preserving/merging the pre-existing local edits.
3. Deletes unimplemented future process operations and their registry/tests/docs entries: `RemoveActionGroupFromProcessTreeOp`, `RemoveSubprocessFromProcessTreeOp`, round-trip tests for them, README bullets, and exports/imports.
4. Normalizes remaining process/dependency comments and read-model seams without changing user behavior: ProcessTree remains construction history; DependencyService remains dependency graph; related-action calculation remains outside ProcessTree.
5. Optionally adds a narrow read-port seam for related-action lookup if it can be done without broad AppShell/RuntimeSession redesign; otherwise leave that to later UI/app-shell waves.

## Out of scope / stop conditions

Stop and request a reviewed wave-plan correction or delta proposal if implementation requires any of the following:

- Command descriptor redesign beyond deleting the dead process operation descriptors.
- ProjectService schema/replay migration, compatibility, domain snapshot persistence, or concrete operation imports.
- Rendering, CSS, canvas, 3D, Drive/auth, backend/docs/specs/package-tooling, validation-platform, or app-shell production composition redesign.
- Broad ActionsPanel feature changes; the component already consumes intents.
- Broad command-controller work belonging to Wave 006a/006b.
- Adoption/normalization of pre-existing dirty `ActionGroup.ts` or deleted e2e specs unless directly reviewed as in-scope. `processStore.ts` is the exception only if the selected proposal deletes the whole unused file after confirming no active imports and records the pre-dirty deletion attribution; otherwise dirty-store authorship uncertainty is a stop/narrow condition.

## Validation requirements for eventual implementation

Minimum implementation validation should capture logs under the cycle validation directory:

- Static scans proving absent `ProcessTree.addAction`, `ProcessTree.getActionsDependingOnElement`, unused `processStore`, and deleted unimplemented operation names.
- Focused Vitest: process tree unit, process-tree stack integration, panel toolbar/process-history use cases, ProjectService round-trip registry tests, deletion/selection dependency tests touched by removal.
- Root/frontend lint, full root/frontend Vitest, root/frontend build.
- Root/frontend Playwright e2e because process panel and undo/redo user flows are user-observable.
- Live preview refresh/probe preserving current UI and 3D overlay behavior; no 3D behavior should change.

## Protected surfaces and preservation requirements

Preserve Waves 024-031 outcomes: current-schema command-stream persistence; OperationRegistry descriptor boundary; command/undo public APIs; no ProjectService concrete operation imports; no migrations/backcompat. Preserve user-visible process panel push/pop/toggle/rename, related action highlighting, undo/redo, project save/open replay for active process operations, and current 2D/3D rendering/preview behavior.

# Wave 005 Proposal Direct — Delete deprecated process/dependency compatibility APIs, keep existing command boundary

## Summary

Implement the wave as planned with the smallest architecture-preserving cut: keep the existing command/operation model for construction-history mutations, delete deprecated process-tree APIs, delete the remaining `DependencyService` process-era compatibility shims, rewrite tests to use explicit action-group insertion and real dependency registration, and leave broad UI command-controller extraction to Wave 006. This proposal treats `ProcessTree` as the construction-history tree only and makes `DependencyService` the sole live dependency query/update boundary, with no no-op rebuild or action-dependency placeholders left behind.

## Target outcome

After implementation:

- `ProcessTree` exposes explicit construction-history operations: subprocess stack, action-group insertion/removal, action insertion into an existing group, action removal/restore, traversal, and presentation-oriented tree state.
- `ProcessTree` no longer exposes implicit group creation or dependency queries.
- `World` no longer proxies loose `any` action insertion to `ProcessTree.addAction()`.
- `DependencyService` keeps only real graph operations: node registration/unregistration, direct/transitive dependency/dependent queries, cycle detection, invalidation tracing, and debug graph export if still used.
- `DependencyService.rebuildDependencyMaps()` and `DependencyService.getActionDependencies()` are deleted rather than retained as no-op compatibility shims.
- Active tests no longer encode implicit action-group creation or process-action-derived dependency rebuild assumptions.
- Dependency lookups in deletion and user-facing paths use `World.getDependencyService()` / `DependencyService.getDependents()` or existing action-production queries where the question is construction-history provenance rather than geometric dependency.
- `ActionsPanel.vue` remains on its current command-operation construction path except for narrow edits needed to compile after deleted APIs or to remove misleading dependency/debug comments; the broader use-case/controller extraction is explicitly deferred to Wave 006.

## Files to change

### Domain

- `frontend/src/domain/processTree/ProcessTree.ts`
  - Delete `addAction(action, groupName?)` entirely (`ProcessTree.ts:143-154` current deprecated path).
  - Delete `getActionsDependingOnElement(elementId)` entirely (`ProcessTree.ts:401-412` current deprecated stub).
  - Keep `addActionGroup()`, `addActionToGroup()`, `removeActionGroup()`, `removeAction()`, `restoreAction()`, `getActionsProducingElement()`, traversal, stack, and presentation helpers.
  - Tighten comments to say dependency edges are not process-tree data; avoid phase-number comments.
- `frontend/src/domain/world/World.ts`
  - Delete `addAction(action: any, groupName?: string): any` proxy to the removed process-tree method (`World.ts:904-909`).
  - Keep `getProcessTree()` and `getDependencyService()` as separate world-owned accessors (`World.ts:892`, `World.ts:898`).
- `frontend/src/domain/world/DependencyService.ts`
  - Delete `rebuildDependencyMaps()` (`DependencyService.ts:130-131` current deprecated no-op).
  - Delete `getActionDependencies(_actionId)` (`DependencyService.ts:306-317` current process-era placeholder that returns `[]`).
  - Do not replace them with aliases, empty stubs, transitional wrappers, or barrels that preserve the old names.
  - Keep the active dependency graph API: `registerNode`, `unregisterNode`, `getDependencies`, `getDependents`, transitive traversal, cycle detection, invalidation tracing, and debug export if still used.
- `frontend/src/domain/processTree/Action.ts` and action creators under `frontend/src/domain/processTree/actions/`
  - Only edit if stale comments still imply actions own dependency edges; keep `Action` minimal and avoid adding dependency fields.

### Commands/operations

- `frontend/src/commands/operations/processTree/AddProcessTreeActionGroupOp.ts`
  - Keep as the explicit group-creation operation; adjust tests/comments only if needed.
- `frontend/src/commands/operations/processTree/AddProcessTreeActionOp.ts`
  - Keep requiring `groupId` and relying on pre-existing group lifecycle (`AddProcessTreeActionOp.ts:32-34`, `AddProcessTreeActionOp.ts:61-63`).
  - Ensure no fallback to implicit group creation is reintroduced.
- `frontend/src/commands/operations/processTree/registerProcessTreeOperationDescriptors.ts`
  - Update only if type/comment cleanup is needed after deleting deprecated APIs. Existing registry entries should continue to restore explicit group/action operations (`registerProcessTreeOperationDescriptors.ts:20-25`).
- `frontend/src/commands/factories/DeletionSequenceFactory.ts`
  - Replace direct test/setup assumptions if production code references deleted process-tree methods. Current production code uses `processTree.getActionsProducingElement(elementId)` for provenance (`DeletionSequenceFactory.ts:74-78`), which should remain because it is construction-history lookup, not dependency lookup.
  - If deletion-cascade behavior exposes hidden reliance on rebuild semantics, fix registration through `DependencyService`/projection-plane element registration rather than restoring `rebuildDependencyMaps()`.

### UI/panels

- `frontend/src/components/panels/ActionsPanel.vue`
  - Do **not** extract a process-history use-case/controller boundary in Wave 005; that is Wave 006 scope.
  - Keep direct process-tree operation imports as an accepted residual for Wave 006 unless a compile error from deleted APIs forces a tiny local adjustment.
  - If touched, remove references/comments suggesting dependencies come from process actions when the real query should use `world.getDependencyService().getDependents(elementId)`.
  - If touched, remove narrow debug/noisy process-tree logging that directly contradicts the cleaned boundary, but do not turn that cleanup into broader panel refactoring.
  - Keep current user-visible behavior for subprocess push/pop, rename, encapsulation/output toggles, and action lookup.

### Tests

- `frontend/tests/unit/processTree.spec.ts`
  - Delete or rewrite tests that call `tree.addAction(...)` (`processTree.spec.ts:36`, `:47`, `:59`, `:97`, `:115`, `:140`, `:161`, `:172`).
  - Replace with explicit `createActionGroup(...)`, `tree.addActionGroup(group)`, and `tree.addActionToGroup(action, group.id)` helper setup.
  - Delete skipped tests for `getActionsDependingOnElement()` (`processTree.spec.ts:179-189`) instead of preserving them as skipped compatibility tests.
- `frontend/tests/unit/commands/factories/DeletionSequenceFactory.spec.ts`
  - Replace setup calls to `world.getProcessTree().addAction(...)` (`DeletionSequenceFactory.spec.ts:55`, `:86-88`, `:125-127`, `:161-163`, `:194`, `:223-225`, `:256-258`, `:305-307`) with explicit group setup or operation-mediated setup through `AddProcessTreeActionGroupOp` + `AddProcessTreeActionOp`.
  - Remove no-op `rebuildDependencyMaps()` calls (`DeletionSequenceFactory.spec.ts:93`, `:132`, `:168`, `:264`, `:312`). If assertions need dependency edges, create them through real element registration or explicit `DependencyService.registerNode(...)` setup rather than a rebuild shortcut.
- `frontend/tests/unit/commands/removeElementOps.spec.ts`
  - Replace direct `world.getProcessTree().addAction(action)` setup (`removeElementOps.spec.ts:43`) with explicit action group setup.
  - Remove `rebuildDependencyMaps()` at `removeElementOps.spec.ts:132`; replace with real dependency registration if the assertion needs a dependency graph.
- Focused related tests: update `frontend/tests/integration/processTree-stack.test.ts`, `frontend/tests/unit/services/ProjectService.subprocess.spec.ts`, `frontend/tests/unit/services/ProjectService.roundTrip.spec.ts`, dependency-service tests, and operation registry tests only if compile/test failures show stale assumptions.

## Explicit DELETE list

- Delete `ProcessTree.addAction()` from `frontend/src/domain/processTree/ProcessTree.ts`.
- Delete `World.addAction()` from `frontend/src/domain/world/World.ts`.
- Delete `ProcessTree.getActionsDependingOnElement()` from `frontend/src/domain/processTree/ProcessTree.ts`.
- Delete `DependencyService.rebuildDependencyMaps()` from `frontend/src/domain/world/DependencyService.ts`.
- Delete `DependencyService.getActionDependencies()` from `frontend/src/domain/world/DependencyService.ts`.
- Delete all active test setup and assertions that rely on implicit action-group creation through `addAction()`.
- Delete all stale tests/call sites that call `rebuildDependencyMaps()` or `getActionDependencies()` as compatibility shortcuts.
- Delete skipped `getActionsDependingOnElement()` compatibility tests in `frontend/tests/unit/processTree.spec.ts`.
- Delete stale comments/phase-number notes that say process-tree actions contain dependency edges.
- Delete any fallback branch in process-tree operations that attempts to create missing action groups implicitly if found during implementation.
- Delete compatibility aliases, wrappers, barrels, or fixture helpers that preserve the removed method names.

## Explicit Wave 006 deferral

Wave 005 intentionally does **not** extract broad process-history use-cases from `ActionsPanel.vue` or remove its direct imports of process-tree operation classes. That work belongs with Wave 006's UI command-construction/use-case boundary so it can be solved consistently across `ActionsPanel.vue`, `SvgCanvas.vue`, toolbar/tool handlers, and related command construction surfaces. Wave 005 may touch `ActionsPanel.vue` only for narrow boundary-honesty cleanup needed by the deleted APIs: misleading dependency comments, debug logging, or compile fixes. Any new `frontend/src/application/processTree/*UseCases.ts` module would be a scope deviation requiring a mini-cycle.

## Expected behavior change

User-visible behavior should remain equivalent for construction history, undo/redo, subprocess stack navigation, action-group display, deletion cascade, persistence replay, and ActionsPanel interactions. Developer-facing behavior changes intentionally: code can no longer call `ProcessTree.addAction()` or `World.addAction()` to create an implicit group, code can no longer ask `ProcessTree` for dependency dependents, and code/tests can no longer call `DependencyService.rebuildDependencyMaps()` or `DependencyService.getActionDependencies()` as no-op compatibility hooks. Callers must use explicit action-group creation and the real `DependencyService` registration/query API.

## Validation plan for implementation wave

Run and capture all mandatory validation logs under `architecture-audit/cycle-005-process-tree-dependency-ownership/validation/`.

### Static deletion checks

- `rg -n "\.addAction\(|getActionsDependingOnElement|World\.addAction|ProcessTree\.addAction|rebuildDependencyMaps\(|getActionDependencies" frontend/src frontend/tests`
  - Expected: no active source/test calls to deleted methods. Any remaining `addActionToGroup`, `AddProcessTreeActionOp`, or generated log mentions must be manually classified and not preserve compatibility.
- `rg -n "addAction\(|getActionsDependingOnElement" frontend/src/domain/processTree/ProcessTree.ts frontend/src/domain/world/World.ts`
  - Expected: no deleted API definitions.
- `rg -n "rebuildDependencyMaps|getActionDependencies" frontend/src/domain/world/DependencyService.ts frontend/src frontend/tests`
  - Expected: no definitions, imports, tests, or fixture helpers remain.
- `rg -n "process-history use-case|processHistoryUseCases|application/processTree" frontend/src/components/panels/ActionsPanel.vue frontend/src/application frontend/tests || true`
  - Expected for Proposal Direct: no new use-case extraction was introduced; any hit must be justified as a reviewed scope deviation.

### Focused Vitest

- Process-tree insertion/group behavior: `npm run test --workspace=frontend -- tests/unit/processTree.spec.ts`.
- Subprocess stack behavior: `npm run test --workspace=frontend -- tests/integration/processTree-stack.test.ts tests/unit/services/ProjectService.subprocess.spec.ts`.
- Action-group/operation behavior: include `tests/unit/commands/initializeWorldCommand.spec.ts`, process-tree operation/registry tests if present, and factory tests touched by setup rewrites.
- Dependency update/deletion behavior without rebuild shims: `npm run test --workspace=frontend -- tests/unit/commands/factories/DeletionSequenceFactory.spec.ts tests/unit/commands/removeElementOps.spec.ts tests/integration/projectService.cascadeDeletion.spec.ts`.
- DependencyService graph behavior: run the focused dependency-service spec if present, or add/run a narrow unit test proving `registerNode()`/`unregisterNode()`/`getDependents()` cover the behavior formerly masked by `rebuildDependencyMaps()`.
- Undo/redo and persistence replay if descriptors/touched operations change: `tests/unit/commands/commandStack.spec.ts`, `tests/unit/services/ProjectService.roundTrip.spec.ts`, `tests/integration/projectService.determinism.spec.ts`.
- ActionsPanel behavior if touched: run its focused component test if present or add a minimal test for current subprocess/action rendering and command emissions. Do not add tests for a Wave 006 use-case extraction in this direct path.

### Full mandatory cadence

- `npm run lint` at root and `npm run lint --workspace=frontend` where defined.
- Focused Vitest commands above with stdout/stderr captured to stable files.
- Full Vitest: `npm run test` plus backend test if root does not cover backend.
- Builds: `npm run build`, `npm run build --workspace=frontend`, `npm run build --workspace=backend` where defined.
- E2E: `npm run test:e2e --workspace=frontend` because process tree and UI-adjacent behavior are user-facing. If current malformed e2e files still block execution, classify with log citations and add an implementation-log entry.
- Live preview refresh on `0.0.0.0` and reachability probe recorded in `implementation-log.md`.

## Risks

- Many tests still use deprecated `addAction()` as a fixture shortcut. Rewriting them carelessly could weaken coverage. Mitigation: add a local helper in tests that creates an explicit group and action through the public current API, not through a compatibility wrapper.
- Deletion/factory tests may reveal that some deletion logic still assumes dependency maps can be rebuilt from process actions. If so, route the behavior through `DependencyService` incremental registrations or projection-plane/world registration paths rather than reintroducing process-tree dependency scanning or a rebuild shim.
- ActionsPanel still directly constructs process-tree operations. Proposal Direct accepts this as a Wave 006 residual by design; it is not a Wave 005 blocker once deleted domain/dependency compatibility surfaces are gone.
- Existing repository validation debt remains from prior waves: missing `eslint`, `vue-tsc`/Node 24 build crash, stale full-suite tests, and malformed e2e specs. Implementation must still run and log the mandatory cadence, classifying non-attributable failures precisely.

## Residual issues intentionally deferred

- Full UI command-controller/use-case extraction for `ActionsPanel.vue`, `SvgCanvas.vue`, and `Toolbar.vue` belongs to Wave 006.
- Renaming `DependencyService` to a more domain-specific graph/query boundary is deferred; Wave 005 only deletes no-op compatibility methods and preserves the live dependency graph boundary.
- ProcessTree presentation-state separation (`ProcessTreeNode.vue`, `processTreeStore`) is outside this direct cleanup unless tests show direct coupling to the deleted APIs.

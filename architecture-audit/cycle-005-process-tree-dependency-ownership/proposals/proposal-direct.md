# Wave 005 Proposal Direct — Delete deprecated process APIs, keep existing command boundary

## Summary

Implement the wave as planned with the smallest architecture-preserving cut: keep the existing command/operation model for construction-history mutations, delete deprecated process-tree APIs, rewrite tests to use explicit action-group insertion, and leave broad UI command-controller extraction to Wave 006. This proposal treats `ProcessTree` as the construction-history tree only and makes `DependencyService` the sole dependency query boundary.

## Target outcome

After implementation:

- `ProcessTree` exposes explicit construction-history operations: subprocess stack, action-group insertion/removal, action insertion into an existing group, action removal/restore, traversal, and presentation-oriented tree state.
- `ProcessTree` no longer exposes implicit group creation or dependency queries.
- `World` no longer proxies loose `any` action insertion to `ProcessTree.addAction()`.
- Active tests no longer encode implicit action-group creation.
- Dependency lookups in deletion and user-facing paths use `World.getDependencyService()` / `DependencyService.getDependents()` or existing action-production queries where the question is construction-history provenance rather than geometric dependency.

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

### UI/panels

- `frontend/src/components/panels/ActionsPanel.vue`
  - Do not extract the full command-controller boundary here; that is Wave 006.
  - If touched, remove references/comments suggesting dependencies come from process actions when the real query should use `world.getDependencyService().getDependents(elementId)`.
  - Keep current user-visible behavior for subprocess push/pop, rename, encapsulation/output toggles, and action lookup. Direct operation imports remain an accepted residual for Wave 006 unless review chooses Proposal Restructure.

### Tests

- `frontend/tests/unit/processTree.spec.ts`
  - Delete or rewrite tests that call `tree.addAction(...)` (`processTree.spec.ts:36`, `:47`, `:59`, `:97`, `:115`, `:140`, `:161`, `:172`).
  - Replace with explicit `createActionGroup(...)`, `tree.addActionGroup(group)`, and `tree.addActionToGroup(action, group.id)` helper setup.
  - Delete skipped tests for `getActionsDependingOnElement()` (`processTree.spec.ts:179-189`) instead of preserving them as skipped compatibility tests.
- `frontend/tests/unit/commands/factories/DeletionSequenceFactory.spec.ts`
  - Replace setup calls to `world.getProcessTree().addAction(...)` (`DeletionSequenceFactory.spec.ts:55`, `:86-88`, `:125-127`, `:161-163`, `:194`, `:223-225`, `:256-258`, `:305-307`) with explicit group setup or operation-mediated setup through `AddProcessTreeActionGroupOp` + `AddProcessTreeActionOp`.
  - Remove no-op `rebuildDependencyMaps()` calls if the assertions can rely on incremental dependency registration through the world/planes.
- `frontend/tests/unit/commands/removeElementOps.spec.ts`
  - Replace direct `world.getProcessTree().addAction(action)` setup (`removeElementOps.spec.ts:43`) with explicit action group setup.
  - Re-evaluate `rebuildDependencyMaps()` call at `removeElementOps.spec.ts:132`; remove if obsolete.
- Focused related tests: update `frontend/tests/integration/processTree-stack.test.ts`, `frontend/tests/unit/services/ProjectService.subprocess.spec.ts`, `frontend/tests/unit/services/ProjectService.roundTrip.spec.ts`, and operation registry tests only if compile/test failures show stale assumptions.

## Explicit DELETE list

- Delete `ProcessTree.addAction()` from `frontend/src/domain/processTree/ProcessTree.ts`.
- Delete `World.addAction()` from `frontend/src/domain/world/World.ts`.
- Delete `ProcessTree.getActionsDependingOnElement()` from `frontend/src/domain/processTree/ProcessTree.ts`.
- Delete all active test setup and assertions that rely on implicit action-group creation through `addAction()`.
- Delete skipped `getActionsDependingOnElement()` compatibility tests in `frontend/tests/unit/processTree.spec.ts`.
- Delete stale comments/phase-number notes that say process-tree actions contain dependency edges.
- Delete any fallback branch in process-tree operations that attempts to create missing action groups implicitly if found during implementation.

## Expected behavior change

User-visible behavior should remain equivalent for construction history, undo/redo, subprocess stack navigation, action-group display, deletion cascade, persistence replay, and ActionsPanel interactions. Developer-facing behavior changes intentionally: code can no longer call `ProcessTree.addAction()` or `World.addAction()` to create an implicit group, and code can no longer ask `ProcessTree` for dependency dependents. Callers must use explicit action-group creation or `DependencyService`.

## Validation plan for implementation wave

Run and capture all mandatory validation logs under `architecture-audit/cycle-005-process-tree-dependency-ownership/validation/`.

### Static checks

- `rg -n "\.addAction\(|getActionsDependingOnElement|World\.addAction|ProcessTree\.addAction|rebuildDependencyMaps\(" frontend/src frontend/tests`
  - Expected: no active source calls to deleted methods; `rebuildDependencyMaps()` either gone or justified as a non-blocking residual if not included.
- `rg -n "addAction\(|getActionsDependingOnElement" frontend/src/domain/processTree/ProcessTree.ts frontend/src/domain/world/World.ts`
  - Expected: no deleted API definitions.

### Focused Vitest

- Process-tree insertion/group behavior: `npm run test --workspace=frontend -- tests/unit/processTree.spec.ts`
- Subprocess stack behavior: `npm run test --workspace=frontend -- tests/integration/processTree-stack.test.ts tests/unit/services/ProjectService.subprocess.spec.ts`
- Action-group/operation behavior: include `tests/unit/commands/initializeWorldCommand.spec.ts`, process-tree operation/registry tests if present, and factory tests touched by setup rewrites.
- Dependency update/deletion behavior: `npm run test --workspace=frontend -- tests/unit/commands/factories/DeletionSequenceFactory.spec.ts tests/unit/commands/removeElementOps.spec.ts tests/integration/projectService.cascadeDeletion.spec.ts`
- Undo/redo and persistence replay if descriptors/touched operations change: `tests/unit/commands/commandStack.spec.ts`, `tests/unit/services/ProjectService.roundTrip.spec.ts`, `tests/integration/projectService.determinism.spec.ts`.
- ActionsPanel behavior if touched: run its focused component test if present or add a minimal test for current subprocess/action rendering and command emissions.

### Full mandatory cadence

- `npm run lint` at root and `npm run lint --workspace=frontend` where defined.
- Full Vitest: `npm run test` plus backend test if root does not cover backend.
- Builds: `npm run build`, `npm run build --workspace=frontend`, `npm run build --workspace=backend` where defined.
- E2E: `npm run test:e2e --workspace=frontend` because process tree and UI-adjacent behavior are user-facing. If current malformed e2e files still block execution, classify with log citations and add an implementation-log entry.
- Live preview refresh on `0.0.0.0` and reachability probe.

## Risks

- Many tests still use deprecated `addAction()` as a fixture shortcut. Rewriting them carelessly could weaken coverage. Mitigation: add a local helper in tests that creates an explicit group and action through the public current API, not through a compatibility wrapper.
- Deletion/factory tests may reveal that some deletion logic still assumes dependency maps can be rebuilt from process actions. If so, route the behavior through `DependencyService` incremental registrations or escalate to Proposal Restructure rather than reintroducing process-tree dependency scanning.
- ActionsPanel still directly constructs process-tree operations. Proposal Direct accepts this as a Wave 006 residual; reviewers may consider it insufficient for the target outcome if they want an application use-case boundary now.
- Existing repository validation debt remains from prior waves: missing `eslint`, `vue-tsc`/Node 24 build crash, stale full-suite tests, and malformed e2e specs. Implementation must still run and log the mandatory cadence, classifying non-attributable failures precisely.

## Residual issues intentionally deferred

- Full UI command-controller extraction for `ActionsPanel.vue`, `SvgCanvas.vue`, and `Toolbar.vue` belongs to Wave 006.
- Renaming `DependencyService` to a more domain-specific graph/query boundary and deleting all no-op compatibility methods can be handled by Proposal Restructure or a follow-up cleanup if reviewers decide it exceeds this wave.
- ProcessTree presentation-state separation (`ProcessTreeNode.vue`, `processTreeStore`) is outside this direct cleanup unless tests show direct coupling to the deleted APIs.

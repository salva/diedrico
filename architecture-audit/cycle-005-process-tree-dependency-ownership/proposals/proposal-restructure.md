# Wave 005 Proposal Restructure — Extract process-history use-cases and harden dependency graph ownership

## Summary

This proposal asks whether the correct fix sits one conceptual layer above simple API deletion. Instead of only removing deprecated `ProcessTree` methods, it would introduce a narrow application/domain boundary for process-history mutations and dependency queries, then make UI and deletion code consume that boundary where Wave 005 touches them. The goal is to prevent `ProcessTree` from being used as a general service while avoiding a partial cleanup that leaves process/dependency ownership ambiguous.

This is intentionally more ambitious than Proposal Direct but still bounded to Wave 005: it does **not** extract the full canvas/tool command-controller architecture planned for Wave 006.

## Target outcome

After implementation:

- `ProcessTree` is a pure construction-history data structure with no implicit insertion API and no dependency-query API.
- A small process-history application boundary owns command construction for process-tree UI actions and explicit group/action insertion helpers used by factories/tests.
- `DependencyService` is the only geometric dependency query/update boundary; no process-era dependency rebuild/action-dependency methods remain.
- `ActionsPanel.vue` no longer imports concrete process-tree operations directly for the panel actions touched by this wave; it calls typed use-case functions instead.
- Tests set up process history through explicit process-history commands/use-cases rather than direct deprecated tree mutation.

## Conceptual design

### New/changed boundary

Create a narrow module such as `frontend/src/application/processTree/processHistoryUseCases.ts` (name negotiable in review) that exposes typed functions over `{ world, commandStack }` or narrower ports:

- `pushSubprocess(world, commandStack, input)`
- `popSubprocess(world, commandStack)`
- `renameSubprocess(world, commandStack, input)`
- `toggleSubprocessEncapsulation(world, commandStack, input)`
- `toggleOutput(world, commandStack, input)`
- `createActionGroupInCommand(command, groupId)` / `addActionToGroupInCommand(command, action, groupId)` only if factory duplication warrants it.

These functions would construct `Command` and process-tree operations outside Vue components. They should not grow into the general Wave 006 tool-controller layer; they are only the process-history panel/use-case seam.

### Dependency boundary hardening

Delete `ProcessTree.getActionsDependingOnElement()` and also delete `DependencyService` compatibility methods that imply dependency maps can be rebuilt from actions, especially:

- `DependencyService.rebuildDependencyMaps()` deprecated no-op (`frontend/src/domain/world/DependencyService.ts:130-131`).
- `DependencyService.getActionDependencies(_actionId)` process-era placeholder/comment block (`frontend/src/domain/world/DependencyService.ts:306-317`).

Tests that call `rebuildDependencyMaps()` should be rewritten to use actual world/plane element registration or to assert dependency state via explicit `registerNode()` setup in a `DependencyService` unit test. If a deletion/factory test depends on rebuild semantics, that is evidence of hidden process/dependency coupling and should be fixed in this wave.

## Files to change

### Domain

- `frontend/src/domain/processTree/ProcessTree.ts`
  - Delete `addAction(...)` and `getActionsDependingOnElement(...)`.
  - Keep construction-history APIs only.
- `frontend/src/domain/world/World.ts`
  - Delete loose `addAction(action: any, groupName?: string): any` proxy.
- `frontend/src/domain/world/DependencyService.ts`
  - Delete deprecated `rebuildDependencyMaps()` no-op and tests/call sites.
  - Delete deprecated action-dependency placeholder API if no active production caller exists.
  - Keep `registerNode`, `unregisterNode`, `getDependencies`, `getDependents`, transitive traversal, cycle detection, invalidation trace, and debug graph export if still used.
- `frontend/src/domain/processTree/Action.ts` and action creators
  - Remove comments that imply actions own dependency state; preserve producer/output metadata used by `getActionsProducingElement()` and display descriptions.

### Application/use-cases

- Create `frontend/src/application/processTree/processHistoryUseCases.ts` or equivalent.
  - Convert direct `ActionsPanel.vue` operation creation for push/pop/rename/toggle encapsulation/toggle output into typed use-case calls.
  - Keep command creation and `CommandStack.push()` outside the component.
  - Ensure use-cases are small and independently testable.

### Commands/operations/persistence

- Keep existing process-tree operation classes as mutation primitives:
  - `AddProcessTreeActionGroupOp.ts`
  - `AddProcessTreeActionOp.ts`
  - `PushSubprocessOp.ts`
  - `PopSubprocessOp.ts`
  - `RenameSubprocessOp.ts`
  - `ToggleEncapsulationOp.ts`
  - `ToggleOutputOp.ts`
  - `ProcessTreeOperations.ts`
- Update `registerProcessTreeOperationDescriptors.ts` only if removed methods affect descriptors or tests.
- Keep Wave 004 typed registry contract intact; no migration/backcompat branches.

### UI

- `frontend/src/components/panels/ActionsPanel.vue`
  - Remove direct imports of `PushSubprocessOp`, `PopSubprocessOp`, `RenameSubprocessOp`, `ToggleEncapsulationOp`, and `ToggleOutputOp` (`ActionsPanel.vue:56-60`).
  - Import the new process-history use-case functions instead.
  - Replace component methods that assemble `Command`/operations with use-case calls.
  - Keep the component responsible for rendering tree state and dispatching user intent only.
  - Remove noisy lifecycle `console.log` calls if touched because they are part of the same process-panel hygiene (`ActionsPanel.vue:88`, `:131`, `:143`, `:150`, `:167`, `:180`).

### Tests

- Add focused use-case tests for the new process-history application boundary.
- Rewrite `frontend/tests/unit/processTree.spec.ts` to explicit group/action APIs and delete skipped dependency-query tests.
- Rewrite deprecated setup in `frontend/tests/unit/commands/factories/DeletionSequenceFactory.spec.ts` and `frontend/tests/unit/commands/removeElementOps.spec.ts`.
- Update or add `ActionsPanel` tests to assert it calls the process-history use-case boundary or verifies behavior without importing concrete operations.
- Update dependency-service tests to cover incremental registration/dependents and to remove any expectation of process-action-derived rebuild behavior.

## Explicit DELETE list

- Delete `ProcessTree.addAction()`.
- Delete `World.addAction()`.
- Delete `ProcessTree.getActionsDependingOnElement()`.
- Delete `DependencyService.rebuildDependencyMaps()` if no reviewer-accepted production need remains.
- Delete `DependencyService.getActionDependencies()` compatibility placeholder if no active caller remains.
- Delete direct `ActionsPanel.vue` imports of concrete process-tree operation classes for subprocess/panel controls.
- Delete component methods in `ActionsPanel.vue` that only assemble process-tree command internals once replaced by use-cases.
- Delete skipped process-tree dependency-query tests and deprecated implicit action-group tests.
- Delete test fixture shortcuts that create process history through deprecated direct tree mutation.
- Delete compatibility shims, barrels, or aliases that preserve the old method names.

## Expected behavior change

User-visible behavior should remain equivalent: subprocess entry/exit, renaming, encapsulation, output toggles, process-tree rendering, undo/redo, deletion cascade, save/open replay, and ActionsPanel interactions should behave as before.

Architecture-facing behavior changes intentionally:

- UI no longer needs to know concrete process-tree operation classes for panel-level process-history actions.
- Dependency maps cannot be rebuilt from process actions; they are maintained by element registration in `DependencyService`.
- Tests and factories cannot rely on implicit action-group creation.

## Validation plan for implementation wave

Run and capture logs under `architecture-audit/cycle-005-process-tree-dependency-ownership/validation/`.

### Static architecture checks

- `rg -n "addAction\(|getActionsDependingOnElement|rebuildDependencyMaps|getActionDependencies" frontend/src frontend/tests`
  - Expected: deleted method definitions/calls absent. Any remaining `addActionToGroup` or `AddProcessTreeActionOp` names are allowed and should be manually checked.
- `rg -n "commands/operations/processTree/(PushSubprocessOp|PopSubprocessOp|RenameSubprocessOp|ToggleEncapsulationOp|ToggleOutputOp)" frontend/src/components/panels/ActionsPanel.vue frontend/src/components/panels`
  - Expected: no direct operation imports from ActionsPanel after use-case extraction.
- If a use-case module is added, add or update architecture tests only if not too broad for this wave; otherwise record as Wave 011 candidate.

### Focused tests

- Process-tree insertion/action-group behavior: `tests/unit/processTree.spec.ts`.
- Process-history use-case tests: new focused test file under `frontend/tests/unit/application/processTree/` or existing convention.
- Process-tree operation and subprocess behavior: `tests/integration/processTree-stack.test.ts`, `tests/unit/services/ProjectService.subprocess.spec.ts`, process-tree operation registry tests if present.
- Dependency update/deletion behavior: `tests/unit/domain/dependencyService.spec.ts` if present, `tests/unit/commands/factories/DeletionSequenceFactory.spec.ts`, `tests/unit/commands/removeElementOps.spec.ts`, `tests/integration/projectService.cascadeDeletion.spec.ts`.
- Undo/redo and persistence replay: `tests/unit/commands/commandStack.spec.ts`, `tests/unit/services/ProjectService.roundTrip.spec.ts`, `tests/integration/projectService.determinism.spec.ts` if descriptors/touched operations participate in save/open.
- ActionsPanel behavior: focused component test for push/pop/rename/toggle actions through the new boundary, or add one if none exists.

### Full mandatory cadence

- `npm run lint` root and frontend workspace where defined.
- Full Vitest: `npm run test`; backend test/build where root still does not cover backend.
- Builds: root, frontend, backend.
- Playwright e2e: `npm run test:e2e --workspace=frontend`; process tree and ActionsPanel behavior are user-facing. If current parse errors remain, classify with exact log evidence.
- Live preview refresh on `0.0.0.0` and reachability probe.

## Risks

- This proposal overlaps with Wave 006 by removing direct process-tree operation construction from `ActionsPanel.vue`. Mitigation: keep extraction limited to process-history panel actions; do not touch `SvgCanvas.vue`, toolbar, or tool command construction.
- Deleting `DependencyService.rebuildDependencyMaps()` may require rewriting stale tests that used it as a fixture convenience. If those tests reveal real missing dependency registration, fix the registration path rather than restoring a rebuild shim.
- Introducing a use-case module could create a new anemic wrapper if it merely renames existing component code. To avoid overfeaturism, keep functions small, typed, and covered by behavior tests.
- Existing validation debt from earlier waves can still block lint/build/e2e execution; implementation logs must distinguish attributable failures from known tooling/test corruption.

## Why this may be the better fix

Proposal Direct deletes the deprecated APIs but leaves the nearest active UI path (`ActionsPanel.vue`) importing concrete process-tree operations. The baseline and current scope both identify UI-to-operation imports as a cross-layer leak. Because this leak is concentrated in the same process-tree surface and can be fixed without broad canvas/tool controller work, Wave 005 may be the right moment to introduce a small process-history use-case seam.

## Why this may be too broad

Wave 006 is explicitly responsible for moving UI command construction into application use-cases/tool controllers. If reviewers want a clean wave boundary, deleting deprecated domain APIs and stale tests now may be enough; the ActionsPanel operation imports can then be handled together with the broader UI command-construction strategy in Wave 006.

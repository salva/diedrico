# Wave 005 Proposal Restructure — Higher-level use-case extraction considered, but too broad for Wave 005

## Summary

This proposal records the higher-level alternative considered for Wave 005: introducing a narrow application/domain boundary for process-history UI actions while deleting deprecated process/dependency APIs. After round-01 review, this proposal is intentionally positioned as a **rejected alternative for Wave 005 implementation** rather than the recommended path. Its dependency-boundary deletion insight is folded into Proposal Direct, but its mandatory `ActionsPanel.vue` process-history use-case extraction is deferred to Wave 006 because it crosses into the broader UI command-construction refactor.

The useful architectural observation remains: `ActionsPanel.vue` directly imports concrete process-tree operations and should eventually dispatch user intent through an application use-case/controller seam. The wave-ordering correction is that Wave 005 can achieve its central target—`ProcessTree` owns construction history only and `DependencyService` owns dependency graph queries—without introducing that UI seam now.

## Target outcome if this alternative were chosen

If intentionally selected despite the scope risk, implementation would produce:

- `ProcessTree` as a pure construction-history data structure with no implicit insertion API and no dependency-query API.
- `DependencyService` as the only geometric dependency query/update boundary, with no process-era rebuild/action-dependency placeholders.
- A small process-history application boundary that owns command construction for panel-level process-tree UI actions.
- `ActionsPanel.vue` no longer importing concrete process-tree operations directly for subprocess/panel controls.
- Tests setting up process history through explicit process-history commands/use-cases rather than deprecated direct tree mutation.

## Why this is not the recommended Wave 005 implementation

Round-01 review identified that the use-case extraction is architecturally plausible but poorly placed in the wave sequence:

- Wave 005's core objective is ownership cleanup inside process-tree/dependency domain boundaries: delete implicit process insertion, delete process-tree dependency queries, delete no-op dependency compatibility shims, and rewrite stale tests.
- Wave 006 is explicitly responsible for UI command-construction extraction across panels, tools, canvas, and toolbar surfaces. Extracting only `ActionsPanel.vue` now risks creating a one-off seam that Wave 006 must revisit or replace.
- The current `ActionsPanel.vue` direct operation imports are a real cross-layer leak, but they are not required to remove `ProcessTree.addAction()`, `World.addAction()`, `ProcessTree.getActionsDependingOnElement()`, `DependencyService.rebuildDependencyMaps()`, or `DependencyService.getActionDependencies()`.
- A partial use-case module could become an anemic wrapper around existing component code if introduced before the broader UI command-controller shape is designed.

Therefore, for Wave 005 this proposal should serve as decision context and future-Wave input, not as the implementation baseline. Any adoption of the use-case extraction in Wave 005 would be a deliberate scope expansion requiring decision sign-off.

## Conceptual design retained for Wave 006 consideration

A later Wave 006 design may create a module such as `frontend/src/application/processTree/processHistoryUseCases.ts` or a broader UI command-controller layer exposing typed functions over `{ world, commandStack }` or narrower ports:

- `pushSubprocess(world, commandStack, input)`
- `popSubprocess(world, commandStack)`
- `renameSubprocess(world, commandStack, input)`
- `toggleSubprocessEncapsulation(world, commandStack, input)`
- `toggleOutput(world, commandStack, input)`
- Explicit process-history setup helpers for tests only if they do not become production compatibility shims.

This later boundary should be solved alongside `SvgCanvas.vue`, toolbar/tool handlers, and other UI command-construction surfaces so it does not create a one-panel architecture.

## Dependency boundary hardening still belongs in Wave 005

The review agreed that deleting `DependencyService` compatibility shims belongs in Wave 005 and should not wait for this restructure alternative. Proposal Direct now includes this deletion.

Wave 005 should delete:

- `DependencyService.rebuildDependencyMaps()` deprecated no-op (`frontend/src/domain/world/DependencyService.ts:130-131`).
- `DependencyService.getActionDependencies(_actionId)` process-era placeholder/comment block (`frontend/src/domain/world/DependencyService.ts:306-317`).

Tests that call `rebuildDependencyMaps()` should be rewritten to use actual world/plane element registration or explicit `DependencyService.registerNode(...)` setup. If a deletion/factory test depends on rebuild semantics, that is evidence of hidden process/dependency coupling and should be fixed in Wave 005 through the real dependency graph boundary, not by retaining a compatibility shim.

## Files that this alternative would change if explicitly selected

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

### Application/use-cases — deferred to Wave 006 by default

- Potentially create `frontend/src/application/processTree/processHistoryUseCases.ts` or equivalent in Wave 006, not Wave 005 by default.
- Convert direct `ActionsPanel.vue` operation creation for push/pop/rename/toggle encapsulation/toggle output into typed use-case calls only if the Wave 005 decision explicitly accepts this broader alternative.
- Keep command creation and `CommandStack.push()` outside the component only in the accepted broader alternative.
- Avoid adding this module in the Proposal Direct path; its absence is expected for corrected Wave 005.

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

### UI — deferred to Wave 006 by default

- `frontend/src/components/panels/ActionsPanel.vue`
  - In the rejected restructure alternative, remove direct imports of `PushSubprocessOp`, `PopSubprocessOp`, `RenameSubprocessOp`, `ToggleEncapsulationOp`, and `ToggleOutputOp` (`ActionsPanel.vue:56-60`) and replace component command assembly with use-case calls.
  - In the recommended Wave 005 direct path, do not perform this extraction. Only narrow cleanup is allowed for misleading dependency comments, debug logging, or compile fallout from deleted APIs.
  - Keep the component's current user-visible behavior either way.

### Tests

- Required in both proposals:
  - Rewrite `frontend/tests/unit/processTree.spec.ts` to explicit group/action APIs and delete skipped dependency-query tests.
  - Rewrite deprecated setup in `frontend/tests/unit/commands/factories/DeletionSequenceFactory.spec.ts` and `frontend/tests/unit/commands/removeElementOps.spec.ts`.
  - Update dependency-service tests or add a narrow spec to cover incremental registration/dependents after deleting rebuild/action-dependency shims.
- Only if the restructure alternative is explicitly selected:
  - Add focused use-case tests for the new process-history application boundary.
  - Update or add `ActionsPanel` tests to assert behavior through the use-case boundary without importing concrete operations.

## Explicit DELETE list

### Wave 005 deletions retained regardless of proposal choice

- Delete `ProcessTree.addAction()`.
- Delete `World.addAction()`.
- Delete `ProcessTree.getActionsDependingOnElement()`.
- Delete `DependencyService.rebuildDependencyMaps()`.
- Delete `DependencyService.getActionDependencies()`.
- Delete skipped process-tree dependency-query tests and deprecated implicit action-group tests.
- Delete test fixture shortcuts that create process history through deprecated direct tree mutation.
- Delete compatibility shims, barrels, aliases, or fixture helpers that preserve the old method names.

### Additional deletions only if this broader alternative is explicitly selected

- Delete direct `ActionsPanel.vue` imports of concrete process-tree operation classes for subprocess/panel controls.
- Delete component methods in `ActionsPanel.vue` that only assemble process-tree command internals once replaced by use-cases.
- Delete focused component test assumptions that inspect concrete operation imports instead of user-visible/process-history behavior.

## Expected behavior change

User-visible behavior should remain equivalent: subprocess entry/exit, renaming, encapsulation, output toggles, process-tree rendering, undo/redo, deletion cascade, save/open replay, and ActionsPanel interactions should behave as before.

Architecture-facing behavior changes required for Wave 005 regardless of proposal choice:

- Dependency maps cannot be rebuilt from process actions; they are maintained by element registration in `DependencyService`.
- Tests and factories cannot rely on implicit action-group creation.
- Process-tree APIs no longer answer dependency questions.

Architecture-facing behavior that is **deferred to Wave 006** unless this proposal is explicitly selected:

- UI no longer knowing concrete process-tree operation classes for panel-level process-history actions.

## Validation plan for implementation wave

Run and capture logs under `architecture-audit/cycle-005-process-tree-dependency-ownership/validation/`.

### Static deletion checks

- `rg -n "\.addAction\(|getActionsDependingOnElement|rebuildDependencyMaps|getActionDependencies|World\.addAction|ProcessTree\.addAction" frontend/src frontend/tests`
  - Expected for Wave 005: deleted method definitions/calls absent. Any remaining `addActionToGroup` or `AddProcessTreeActionOp` names are allowed and should be manually checked.
- `rg -n "rebuildDependencyMaps|getActionDependencies" frontend/src/domain/world/DependencyService.ts frontend/src frontend/tests`
  - Expected: no compatibility shim definitions, imports, tests, or fixture helpers remain.
- `rg -n "commands/operations/processTree/(PushSubprocessOp|PopSubprocessOp|RenameSubprocessOp|ToggleEncapsulationOp|ToggleOutputOp)" frontend/src/components/panels/ActionsPanel.vue frontend/src/components/panels`
  - Expected only if this broader alternative is explicitly selected: no direct operation imports from `ActionsPanel.vue` after use-case extraction.
  - Expected for corrected Proposal Direct: hits may remain and must be recorded as Wave 006 residual, not a Wave 005 failure.
- If a use-case module is added in Wave 005, run `rg -n "processHistoryUseCases|application/processTree" frontend/src frontend/tests` and record the decision approval that allowed the scope expansion.

### Focused tests

- Process-tree insertion/action-group behavior: `npm run test --workspace=frontend -- tests/unit/processTree.spec.ts`.
- Process-tree operation and subprocess behavior: `tests/integration/processTree-stack.test.ts`, `tests/unit/services/ProjectService.subprocess.spec.ts`, process-tree operation registry tests if present.
- Dependency update/deletion behavior without rebuild shims: `tests/unit/domain/dependencyService.spec.ts` if present, `tests/unit/commands/factories/DeletionSequenceFactory.spec.ts`, `tests/unit/commands/removeElementOps.spec.ts`, `tests/integration/projectService.cascadeDeletion.spec.ts`.
- Undo/redo and persistence replay: `tests/unit/commands/commandStack.spec.ts`, `tests/unit/services/ProjectService.roundTrip.spec.ts`, `tests/integration/projectService.determinism.spec.ts` if descriptors/touched operations participate in save/open.
- ActionsPanel behavior if touched: focused component test for existing push/pop/rename/toggle behavior.
- Process-history use-case tests: only required if the broader alternative is explicitly selected and a new use-case module is added.

### Full mandatory cadence

- `npm run lint` root and frontend workspace where defined.
- Focused Vitest commands above with stdout/stderr captured to stable files.
- Full Vitest: `npm run test`; backend test/build where root still does not cover backend.
- Builds: root, frontend, backend.
- Playwright e2e: `npm run test:e2e --workspace=frontend`; process tree and ActionsPanel behavior are user-facing. If current parse errors remain, classify with exact log evidence.
- Live preview refresh on `0.0.0.0` and reachability probe recorded in `implementation-log.md`.

## Risks

- This proposal overlaps with Wave 006 by removing direct process-tree operation construction from `ActionsPanel.vue`. The corrected recommendation avoids that risk by deferring extraction.
- Deleting `DependencyService.rebuildDependencyMaps()` may require rewriting stale tests that used it as a fixture convenience. If those tests reveal real missing dependency registration, fix the registration path rather than restoring a rebuild shim.
- Introducing a use-case module could create a new anemic wrapper if it merely renames existing component code. This is the main reason the extraction should wait for Wave 006's broader UI command-construction design.
- Existing validation debt from earlier waves can still block lint/build/e2e execution; implementation logs must distinguish attributable failures from known tooling/test corruption.

## Why this may be the better long-term fix

Proposal Direct deletes the deprecated APIs but leaves the nearest active UI path (`ActionsPanel.vue`) importing concrete process-tree operations. The baseline and current scope both identify UI-to-operation imports as a cross-layer leak. A later Wave 006 should solve that leak with a consistent application/use-case or controller boundary, not by leaving it indefinitely.

## Why this is too broad for Wave 005

Wave 006 is explicitly responsible for moving UI command construction into application use-cases/tool controllers. Wave 005 can complete its central process-tree/dependency ownership cleanup by deleting deprecated domain/dependency APIs and stale tests now. Pulling `ActionsPanel.vue` use-case extraction into this wave would blend two waves, increase blast radius, and risk hidden implementation scope creep. Therefore this proposal should not be selected for Wave 005 unless the decision deliberately accepts that scope expansion.

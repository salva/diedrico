# Proposal Restructure — Promote panel/toolbar to presentation adapters over application shell controllers

## Summary

Solve the same direct command leaks one conceptual layer higher than the direct proposal: introduce a small application-shell command-intent boundary that covers process-history panel commands, toolbar history actions, and debug/example setup decisions together. This treats `ActionsPanel.vue` and `Toolbar.vue` as pure presentation adapters and reduces direct `CommandStack` injection into UI chrome. The proposal is broader than Proposal Direct but still excludes the completed Wave 006a canvas/tool controller path.

## Why consider restructuring higher?

Current evidence shows the leaks are not only “component imports an operation”:

- `ActionsPanel.vue` owns command construction, keyboard handling, process-tree subscriptions, related-action highlighting, and noisy logs in one component (`frontend/src/components/panels/ActionsPanel.vue:54-60`, `108-118`, `130-150`, `223-246`, `265-314`).
- `Toolbar.vue` mixes file/open emitted events, tool selection, undo/redo command-stack read/write, view toggles, global shortcuts, auth events, and Alt+E example construction (`frontend/src/components/toolbars/Toolbar.vue:150-173`, `205-245`, `248-305`, `327-339`).
- Wave 006a established `frontend/src/application/tools/CanvasToolController.ts:33-67` as a component-facing application controller pattern. A panel/toolbar shell controller could apply the same separation for UI chrome without inventing several small parallel adapters.

This may be the cleaner architecture if reviewers want to reduce UI chrome’s direct command-stack dependency now rather than defer it to Wave 009 App-shell services.

## Target outcome

- `ActionsPanel.vue` and `Toolbar.vue` receive render state and invoke typed intent callbacks only.
- A new application shell/controller module owns process-history mutation intents, history undo/redo intents, and the retained/deleted example setup decision.
- Component tests assert intent emission/render behavior; application tests assert command/use-case effects.
- The boundary is explicitly limited to panel/toolbar chrome so it does not reopen Wave 006a tool construction.

## Files to change

### Add

- `frontend/src/application/uiChrome/UiChromeIntents.ts`
  - Types for process-history mutation intents, toolbar history intents (`undo`, `redo`), optional example setup intent, and result/read-state DTOs.
- `frontend/src/application/uiChrome/UiChromeController.ts`
  - Application-facing controller composed from narrower use-cases.
  - Owns `CommandStack` read/write for toolbar undo/redo state and process-history command execution.
- `frontend/src/application/processHistory/ProcessHistoryUseCases.ts`
  - Same command/operation ownership as Proposal Direct, but consumed by `UiChromeController`.
- Optional retained example module: `frontend/src/application/examples/ProjectionPlaneExampleSetupUseCase.ts`.
- Optional selector/read-model module: `frontend/src/application/processHistory/ProcessHistoryReadModel.ts`
  - If implementation touches related-action highlighting, move `processTree.getAllActions()` + dependency lookup out of the component into a typed read-side helper.

### Modify

- `frontend/src/components/panels/ActionsPanel.vue`
  - Replace direct command imports/handlers with typed UI-chrome intent callbacks.
  - Optionally consume a `relatedActionIds` read-model helper instead of directly calling `world.dependencyService` if this can be done without expanding beyond 006b.
  - Delete routine debug logs.
- `frontend/src/components/toolbars/Toolbar.vue`
  - Replace direct `CommandStack` undo/redo calls with `UiChromeController.undo()` / `redo()` and read `canUndo/canRedo` from a shell/controller read model.
  - Delete or delegate Alt+E setup.
  - Keep file/open/auth/view/tool selection emits/stores unless moving them is trivial and directly tied to the controller boundary; do not turn this into full Wave 009 App-shell extraction.
- Dependency injection/composition point that currently provides `world`/`commandStack` to these components, only if needed to provide `UiChromeController` cleanly. Keep changes localized and avoid restructuring `App.vue` beyond controller creation/provision.
- `frontend/tests/**` for new controller/use-case/component behavior.

## Files/tests/docs/fixtures to DELETE

- Delete all concrete command/operation imports from `ActionsPanel.vue` and `Toolbar.vue` selected paths.
- Delete component-owned process-history command-assembly methods and toolbar example command-assembly method.
- Delete direct toolbar undo/redo `CommandStack` action calls if `UiChromeController` owns history intent execution in this proposal.
- Delete Alt+E entirely if classified as debug-only; otherwise delete component-level operation construction and retain only an application use-case.
- Delete noisy `ActionsPanel.vue` console logs in normal subscription/mount/update paths.
- Delete panel/toolbar tests that inspect command internals, stack concrete operations, or debug/example construction details.
- Delete compatibility shims and duplicate panel/toolbar factory layers.
- Do not delete or alter Wave 006a `SvgCanvas.vue`, `frontend/src/tools/**`, or canvas construction use-cases except for shared type imports if the controller composition requires them.

## Expected behavior change

- Process-tree panel behavior remains equivalent.
- Toolbar undo/redo remains equivalent but becomes application-controller-owned rather than component-owned.
- Alt+E is either intentionally removed as debug/testing-only or retained through a named application example setup use-case.
- UI chrome components become thinner and easier to move under Wave 009, but this proposal intentionally stops short of full `App.vue` project lifecycle/autosave/keyboard extraction.

## Risks

- This proposal may overlap with Wave 009 App shell services if it tries to move too much toolbar/file/auth/view behavior. The implementation must keep file/open/auth/view emits and stores unless directly necessary for command-intent cleanup.
- Moving undo/redo into a controller may require careful reactivity so `canUndo`/`canRedo` still update after stack changes; controller read state should subscribe to `CommandStack` or expose a small version/ref adapter.
- Introducing a broad `UiChromeController` could become a god-controller if it absorbs unrelated toolbar concerns. Keep process-history, history, and example setup as composable narrow use-cases behind the controller.
- If related-action highlighting is moved, dependency read-model extraction may touch dependency/process-tree read concerns outside the minimum command-construction leak. Treat that as optional and stop if it broadens too far.

## Validation plan

- Static architecture checks:
  - `ActionsPanel.vue` and `Toolbar.vue` have no imports from `@/commands/Command`, `@/commands/operations/**`, or command factories;
  - no `new Command`, `.addAndExecute(new ...Op`, or component `commandStack.push(cmd)` remains;
  - if restructuring undo/redo, no direct component `commandStack.undo()` / `redo()` remains in `Toolbar.vue`.
- Focused Vitest:
  - `uiChromeController` tests for process-history intents, undo/redo intents, canUndo/canRedo read state, and error/rollback behavior;
  - process-history use-case tests for push/pop/toggle/rename command-stack effects and undo/redo;
  - component tests for panel/toolbar render state plus emitted/delegated typed intents;
  - retained/deleted Alt+E behavior tests.
- Full mandatory cadence:
  - root/frontend lint where defined;
  - focused Vitest;
  - root and frontend full Vitest;
  - root/frontend build and backend build where included by workspace scripts;
  - frontend Playwright/e2e for panel process-history controls, toolbar undo/redo, tool selection shortcuts, and Alt+E absence/retained setup;
  - persistence replay/open-save if process-history or retained example serialization is touched;
  - live Playwright MCP smoke and live preview refresh/reachability probe.

## Recommendation

Prefer Proposal Direct unless review decides toolbar undo/redo direct `CommandStack` access must be closed in 006b rather than deferred to Wave 009. Proposal Restructure is architecturally cleaner for UI chrome but has a higher risk of drifting into App-shell extraction. If selected, the decision should explicitly cap the scope to process-history, history undo/redo, and Alt+E/example setup only.

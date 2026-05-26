# Wave 006b Implementation Log — Panel/toolbar command intents

## Scope implemented

Implemented the selected Proposal Direct from `decision.md` without reopening Wave 006a canvas/tool files and without beginning Wave 009 app-shell extraction.

## Source files changed

- `frontend/src/application/processHistory/ProcessHistoryIntents.ts` — added typed process-history requests/results/state and intent sink contract.
- `frontend/src/application/processHistory/ProcessHistoryUseCases.ts` — moved process-history `Command` creation, concrete process-tree operation instantiation, commit/rollback, and `CommandStack.push()` into application use-cases.
- `frontend/src/application/processHistory/ProcessHistoryController.ts` — added narrow Vue-facing controller/provider factory for ActionsPanel.
- `frontend/src/application/toolbar/ToolbarHistoryIntents.ts` — added typed toolbar history state/result/intent sink contract.
- `frontend/src/application/toolbar/ToolbarHistoryUseCases.ts` — moved toolbar history `canUndo`/`canRedo` reads and undo/redo execution into application use-cases.
- `frontend/src/application/toolbar/ToolbarHistoryController.ts` — added narrow Vue-facing controller/provider factory for Toolbar.
- `frontend/src/components/panels/ActionsPanel.vue` — removed component command/operation imports and direct `CommandStack.push()` paths; handlers now delegate typed process-history intents; routine mount/subscription/world-change console logs removed while read-side rendering/subscription behavior remains.
- `frontend/src/components/toolbars/Toolbar.vue` — removed component command-stack import/access for undo/redo; removed Alt+E debug/example shortcut and projection-plane setup command assembly; undo/redo state/actions now delegate to toolbar history controller.
- `frontend/tests/unit/application/panelToolbarIntentControllers.spec.ts` — added focused use-case/controller and static component-boundary regression tests.

## Explicit DELETE / retain completion

Deleted from `ActionsPanel.vue`:

- `Command` import.
- Concrete process-tree operation imports: `PushSubprocessOp`, `PopSubprocessOp`, `RenameSubprocessOp`, `ToggleEncapsulationOp`, `ToggleOutputOp`.
- Component-owned process-history command assembly methods and `commandStack.push(cmd)` paths.
- Routine `console.log` calls in initial mount, tree subscription, world-change, and refresh/update paths.

Retained in `ActionsPanel.vue`:

- Process-tree rendering/read model, selection highlighting, keyboard/button wiring, tree/world resubscription, auto-scroll, and active subprocess display.

Deleted from `Toolbar.vue`:

- `CommandStack`, `Command`, `World`, `Vector3`, `AddFreePoint2DOp`, and `AddLine2DByTwoPointsOp` imports.
- Direct component calls to `commandStack.canUndo()`, `commandStack.canRedo()`, `commandStack.undo()`, and `commandStack.redo()`.
- `addProjectionPlaneSetup()` and the Alt+E testing/example shortcut.

Retained in `Toolbar.vue`:

- Tool selection, file/open/save/auth/view events, grid/projection/view toggles, and presentation of undo/redo enabled state via a typed controller.

## Out-of-scope guards

- No changes made to `frontend/src/components/workspace/SvgCanvas.vue`.
- No changes made to `frontend/src/tools/**`.
- No changes made to `frontend/src/application/tools/**`.
- No broad UI-chrome/app-shell controller was introduced.

## Validation commands and logs

All logs are under `architecture-audit/cycle-006b-panel-toolbar-command-intents/validation/`.

| Command | Result | stdout | stderr | Notes |
| --- | --- | --- | --- | --- |
| `npm run test --workspace=frontend -- --run frontend/tests/unit/application/panelToolbarIntentControllers.spec.ts` | Failed | `focused-panel-toolbar-vitest.stdout.log` | `focused-panel-toolbar-vitest.stderr.log` | Command used a root-relative spec path while Vitest ran in `/work/diedrico/frontend`; no tests collected. Rerun with workspace-relative path. |
| `npm run test --workspace=frontend -- --run tests/unit/application/panelToolbarIntentControllers.spec.ts` | Failed then corrected | `focused-panel-toolbar-vitest-rerun.stdout.log` | `focused-panel-toolbar-vitest-rerun.stderr.log` | Initial assertions assumed an empty helper command stack; corrected tests to compare deltas because `createTestWorld()` seeds initialization history. |
| `npm run test --workspace=frontend -- --run tests/unit/application/panelToolbarIntentControllers.spec.ts` | Passed | `focused-panel-toolbar-vitest-final.stdout.log` | `focused-panel-toolbar-vitest-final.stderr.log` | 5/5 focused Wave 006b tests passed. |
| Static component command-boundary scan | Passed | `static-component-command-boundary.stdout.log` | `static-component-command-boundary.stderr.log` | Verified `ActionsPanel.vue` and `Toolbar.vue` no longer contain prohibited command/operation/direct stack patterns or Alt+E setup path. |
| `npm run build --workspace=frontend` | Failed, non-attributable environment/tooling blocker | `frontend-build.stdout.log` | `frontend-build.stderr.log` | `vue-tsc` crashes before project typecheck with `Search string not found: "/supportedTSExtensions = .*(?=;)/"` under Node.js v24.15.0. This is a known vue-tsc/TypeScript patch compatibility failure and occurs before Wave 006b source diagnostics. |
| `npm run lint --workspace=frontend` | Failed, non-attributable dependency/tooling blocker | `frontend-lint.stdout.log` | `frontend-lint.stderr.log` | Workspace lint script invokes `eslint`, but the binary is not installed/resolvable in this workspace (`sh: 1: eslint: not found`). |

## Residual risks

- Component behavior was covered by static boundary assertions and use-case behavior tests, but full Vue-mounted button/keyboard behavior and Playwright/e2e validation remain for the next validation stage.
- `ProcessTree` operation classes still contain routine `console.log` calls internally; Wave 006b only deleted noisy `ActionsPanel.vue` logging per decision. A future cleanup wave may remove domain/operation logging if desired.
- Build and lint could not complete due environment/tooling blockers unrelated to this implementation; next validation stage should classify or remediate those environment issues before full cadence sign-off.

## Candidate future waves observed

- Consider a focused cleanup of remaining `console.log` calls inside process-tree operations/domain methods if they are not useful exceptional diagnostics.
- Consider adding mounted component tests for ActionsPanel and Toolbar event wiring once the test harness has stable component mounting providers for Pinia, World, and CommandStack.

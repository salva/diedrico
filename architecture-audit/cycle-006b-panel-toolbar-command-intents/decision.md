# Wave 006b Decision — Panel/toolbar command-intent cleanup

**Stage:** `cycle-006b-decision`  
**Cycle:** `cycle-006b-panel-toolbar-command-intents`  
**Decision artifact:** `architecture-audit/cycle-006b-panel-toolbar-command-intents/decision.md`  
**Source-code changes in this stage:** none; this decision authorizes the next implementation stage only.

## Inputs cited

- Scope check: `architecture-audit/cycle-006b-panel-toolbar-command-intents/scope-check.md`
- Proposal selected: `architecture-audit/cycle-006b-panel-toolbar-command-intents/proposals/proposal-direct.md`
- Alternative considered: `architecture-audit/cycle-006b-panel-toolbar-command-intents/proposals/proposal-restructure.md`
- Review artifact: `architecture-audit/cycle-006b-panel-toolbar-command-intents/reviews/round-01-review.md`
- Current plan entry: `architecture-audit/wave-plan.md`, Wave 006b — Panel/toolbar command-intent cleanup

## Review convergence

Review convergence is complete after **round 01** with **NO BLOCKING ISSUES**.

`reviews/round-01-review.md` explicitly recommends **Proposal Direct** and records that it passes the target-outcome, architecture/code-quality, aggressive-deletion, overfeaturism, and validation-sufficiency checks. The reviewer identifies only manageable implementation risks around `ActionsPanel.vue` refresh/subscription behavior and `Toolbar.vue` undo/redo button state freshness.

No corrections round is required before implementation.

## Decision

Select **Proposal Direct — Panel/toolbar intent controllers with minimal application use-cases** for implementation.

The implementation must move the remaining panel/toolbar command leaks behind focused application-owned use-cases/controllers while keeping the completed Wave 006a canvas/tool controller path out of scope except for explicit interface reuse or unavoidable compile fallout.

## Why Proposal Direct wins

Proposal Direct is the smallest clean architectural move that satisfies Wave 006b:

- It removes `ActionsPanel.vue` direct `Command` and concrete process-tree operation construction.
- It removes `Toolbar.vue` direct command/operation construction and direct `CommandStack` undo/redo read/execution ownership.
- It introduces focused panel/toolbar application use-cases/controllers rather than a broader UI-chrome shell abstraction.
- It preserves the Wave 006a application-controller pattern without reopening `SvgCanvas.vue` or `frontend/src/tools/**`.
- It honors the project priority to delete debug/example surfaces rather than preserve them through compatibility shims.

## Rejected/deferred alternative

Reject/defer **Proposal Restructure — Promote panel/toolbar to presentation adapters over application shell controllers** for this cycle.

The restructure proposal is directionally valid but too broad for Wave 006b because a shared `UiChromeController` risks drifting into Wave 009 App-shell extraction. Its concerns should remain deferred unless a future reviewed wave deliberately extracts shell services. Wave 006b implementation must not absorb unrelated file/open/auth/view/tool-selection orchestration into a shell controller.

## Exact implementation scope

Implementation scope is limited to:

1. **Process-history panel intents/use-cases/controllers**
   - Add focused application modules for typed process-history requests/results.
   - Application code must own process-tree command creation, operation instantiation, validation/guard checks, commit/rollback, and `CommandStack.push()`.
   - `ActionsPanel.vue` must render state and delegate typed intents for push subprocess, pop subprocess, toggle encapsulation, toggle output, and rename subprocess.

2. **Toolbar history intents/use-cases/controllers**
   - Add focused application modules for typed toolbar history state and undo/redo requests/results.
   - Application code must own `CommandStack.canUndo()`, `canRedo()`, `undo()`, and `redo()` access for toolbar history behavior.
   - `Toolbar.vue` must render history state and delegate typed undo/redo intents; it must not directly access `CommandStack` for toolbar undo/redo.

3. **Toolbar Alt+E example/debug path**
   - Default decision: delete the Alt+E projection-plane example/debug shortcut and component-owned setup implementation because the current source labels it testing/example behavior.
   - Retention is allowed only if implementation finds review-supportable evidence that the shortcut is required user-facing behavior. If retained, it must move behind a named typed application use-case/controller and must not leave concrete operation imports in `Toolbar.vue`.

4. **ActionsPanel routine logging**
   - Remove noisy routine `console.log` calls in mount/subscription/world-change/update paths.
   - Retain only justified warning/error logging if needed for exceptional paths.

5. **Tests and architecture checks**
   - Add or update focused tests for the new use-cases/controllers and component delegation.
   - Add static checks that prevent regression to component-owned command internals.

## Explicit out-of-scope guard

Wave 006b implementation must **not** modify or reopen the completed Wave 006a canvas/tool controller extraction path except for explicit interface reuse or unavoidable compile fallout:

- `frontend/src/components/workspace/SvgCanvas.vue`
- `frontend/src/tools/**`
- `frontend/src/application/tools/**`
- canvas/tool construction use-cases already introduced by Wave 006a

If implementation discovers that broader Wave 006a surface changes are required, stop and run a reviewed mini-cycle before proceeding.

Wave 006b also must not begin Wave 009 App-shell extraction. File/open/auth/view/project lifecycle orchestration remains outside this cycle unless a minimal injection/composition adjustment is strictly necessary for the selected panel/toolbar controllers.

## Exact DELETE / retain list

### Delete from `ActionsPanel.vue`

- Delete imports of `Command`.
- Delete imports of concrete process-tree operations:
  - `PushSubprocessOp`
  - `PopSubprocessOp`
  - `RenameSubprocessOp`
  - `ToggleEncapsulationOp`
  - `ToggleOutputOp`
- Delete component-owned methods/branches that assemble process-history command internals.
- Delete component-owned `CommandStack.push(cmd)` paths for process-history mutations.
- Delete routine noisy `console.log` calls in mount, subscription, world-change, and refresh/update paths.
- Delete tests that assert `ActionsPanel.vue` uses concrete command/operation internals.

### Retain in `ActionsPanel.vue` unless implementation deliberately extracts a tiny read model

- Rendering of process history state.
- Keyboard/button wiring that now delegates typed intents.
- Process-tree subscription/refresh behavior needed to keep the panel current.
- Related-action highlighting as read-side behavior, unless a small selector/read-model extraction is needed without widening the wave.

### Delete from `Toolbar.vue`

- Delete imports of `Command`.
- Delete direct `CommandStack` import/injection/access for toolbar undo/redo reads and execution.
- Delete imports of `Vector3`, `AddFreePoint2DOp`, `AddLine2DByTwoPointsOp`, and any other concrete operation dependency used only by Alt+E/example setup.
- Delete `addProjectionPlaneSetup()` as component-owned command assembly.
- Delete the Alt+E shortcut and labels/docs if no user-facing retention evidence is found.
- Delete direct component calls to `commandStack.canUndo()`, `commandStack.canRedo()`, `commandStack.undo()`, and `commandStack.redo()`.
- Delete tests that depend on toolbar command internals or debug/example construction details.

### Retain in `Toolbar.vue`

- Tool selection UI and emitted tool-selection behavior.
- Grid/projection/view toggles.
- File/open/save/auth/view events that are not part of command-intent cleanup.
- Presentation rendering of undo/redo enabled state, sourced through the typed toolbar history controller/use-case rather than direct `CommandStack` access.

### Delete generally

- Compatibility shims that preserve old component command-assembly methods under new names.
- Duplicate panel/toolbar factory layers that parallel or obscure the Wave 006a application command/use-case boundary.
- Obsolete command-internals tests for panel/toolbar behavior; replace with use-case/controller tests and user-observable component/e2e coverage.

## Implementation constraints

- Introduce/use panel and toolbar application use-cases/controllers for command creation, validation orchestration, and command-stack execution.
- Keep modules narrow: process-history use-cases, toolbar-history use-cases, and optional retained example/setup use-case must not become a broad UI-chrome god-controller.
- Keep command lifecycle ownership in application code: create command, add/execute operations, commit, rollback on failure, and push to stack must not occur in Vue components.
- Rollback/error behavior must avoid stack pollution on failed process-history or retained setup operations.
- `ActionsPanel.vue` must not capture stale process-tree instances across `world.clear()` / world state resets; use-cases should depend on `World`/operations in a way that reads the current process tree.
- Toolbar undo/redo enabled state must refresh after history changes without exposing raw `CommandStack` execution to the component.
- Do not add compatibility branches for old Alt+E or old component methods.

## Accepted residual risks

- **ActionsPanel refresh risk:** replacing local direct command handlers may miss a `stackVersion` or subscription refresh. Accepted only with focused component/use-case tests and manual/e2e panel behavior validation.
- **Toolbar history-state freshness risk:** moving `canUndo`/`canRedo` behind a controller may stale button disabled state. Accepted only if implementation provides a narrow state query/subscription or equivalent reactive trigger and tests undo/redo availability transitions.
- **Alt+E deletion surprise risk:** a developer/test workflow may have used the debug/example shortcut. Accepted because aggressive deletion is preferred; implementation must remove active test/e2e/docs references or justify retention through a typed use-case.
- **Environment validation blockers:** known non-attributable validation blockers from Wave 006a may recur. They are not accepted as silent skips; implementation/validation logs must run the cadence and classify each failure precisely.

## Mandatory validation requirements for implementation

Implementation and validation stages must capture full stdout/stderr to stable files under `architecture-audit/cycle-006b-panel-toolbar-command-intents/validation/`.

### Focused/static validation

- Static architecture checks that `ActionsPanel.vue` and `Toolbar.vue` no longer import `Command`, concrete `frontend/src/commands/operations/**` modules, command factories, or construction-only `Vector3` paths.
- Static checks that the two components contain no `new Command`, `.addAndExecute(new ...Op`, `commandStack.push(cmd)`, `commandStack.undo()`, or `commandStack.redo()` paths.
- Focused process-history use-case/controller tests covering push subprocess, pop subprocess, toggle encapsulation, toggle output, rename subprocess, rollback/no-stack-pollution on failure, stack effects, and undo/redo behavior.
- Focused `ActionsPanel.vue` component tests proving button/keyboard handlers delegate typed process-history intents and preserve process-tree panel behavior.
- Focused toolbar-history use-case/controller tests covering `canUndo`, `canRedo`, undo execution, redo execution, no-op/error behavior, and state refresh.
- Focused `Toolbar.vue` behavior tests for tool selection, typed undo/redo intent delegation, undo/redo enabled state, grid/projection toggles, and Alt+E deletion or retained setup routing.
- Persistence replay/open-save validation if process-history serialization or retained example/setup serialization is touched.

### Full cadence

- `npm run lint` at the repository root and per workspace where defined, including frontend.
- Focused Vitest for touched modules and components.
- Full Vitest at the repository root and frontend workspace where defined.
- `npm run build` at the repository root and per workspace where defined, including frontend and backend if root scripts include it.
- `npm run test:e2e` / Playwright for process-tree panel behavior, toolbar behavior, undo/redo, and Alt+E absence or retained setup behavior because this wave touches frontend/user-observable behavior.
- Live application verification through Playwright MCP when available.
- Live preview refresh on `0.0.0.0` and reachability probe recorded in `implementation-log.md`.

If any validation step fails for reasons not attributable to the Wave 006b implementation, record the exact command, log path, error excerpt, root-cause classification, and why it is non-attributable. Do not omit mandatory cadence silently.

## Next implementation scope

Proceed to `cycle-006b-implement-panel-toolbar-command-intents` with Proposal Direct as the binding implementation plan. The implementer must create/update `implementation-log.md`, list changed source files, list all deleted legacy surfaces/tests/docs/fixtures, run the validation cadence above, and record residual issues for future waves.

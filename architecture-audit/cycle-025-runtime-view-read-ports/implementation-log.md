# Cycle 025 Implementation Log — Runtime view/read ports

## Source files changed

- `frontend/src/application/appShell/RuntimeViewPorts.ts` — added behavior-sized runtime view/read port contracts and DTOs.
- `frontend/src/application/appShell/RuntimeSession.ts` — kept concrete `World` private and added named canvas, process-tree, elements-panel, three-presentation, and active-plane selector ports; deleted `worldForView()`.
- `frontend/src/application/appShell/AppShellRuntime.ts` — stopped unwrapping/returning raw world; returns named read ports.
- `frontend/src/application/appShell/RuntimeInjectionKeys.ts` — deleted `WorldInjectionKey`; added typed named port injection keys.
- `frontend/src/App.vue` — replaced raw world provider with named port providers.
- `frontend/src/components/workspace/SvgCanvas.vue` — consumes `CanvasViewInjectionKey`, uses runtime canvas port for presentation, input transforms, hover labels, properties view model, screen-to-3D, subscriptions, and point-move sessions; command producer remains the command mutation path.
- `frontend/src/components/dialogs/PropertiesDialog.vue` — removed `World` prop/domain imports; renders a parent/runtime-prepared `PropertiesDialogViewModel` and preserves style-save payload behavior.
- `frontend/src/components/panels/ActionsPanel.vue` — consumes `ProcessTreeReadInjectionKey` for tree/read/related-action data; process-history commands remain on `ProcessHistoryCommandInjectionKey`.
- `frontend/src/components/panels/ProcessTreeNode.vue` — removed `world` prop and renders concrete `ProcessNodeViewModel` description/infeasibility/missing-element fields.
- `frontend/src/components/panels/ElementsPanel.vue` — consumes `ElementsPanelInjectionKey`, renders grouped DTOs, subscribes to changes, and toggles visibility through a named port intent.
- `frontend/src/components/panels/ThreeView.vue` — consumes `ThreePresentationInjectionKey` and no longer creates a three read port from injected world.
- `frontend/src/components/toolbars/PlaneSelector.vue` — consumes `ActivePlaneSelectorInjectionKey` and uses subscription instead of polling.
- Tests updated for the deleted raw-world seams and new port boundaries: `frontend/tests/unit/components/propertiesDialog.spec.ts`, `frontend/tests/unit/application/canvasToolControllers.spec.ts`, `frontend/tests/unit/components/panelToolbarBehavior.spec.ts`, `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts`, `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`.

## Legacy surfaces deleted/proven absent

- `RuntimeSession.worldForView()` deleted.
- `AppShellRuntime` no longer returns `world`.
- `App.vue` no longer provides `WorldInjectionKey`.
- `WorldInjectionKey` deleted from `RuntimeInjectionKeys.ts`.
- Scoped production consumers no longer call `inject(WorldInjectionKey)`.
- `PropertiesDialog.vue` no longer has a `world` prop or domain/world imports.
- `ProcessTreeNode.vue` no longer has a `world` prop, recursive world forwarding, `getActionDescriptionParts(..., world)`, `getElement2D`, `getElement3DById`, `getProjectionPlaneById`, `getDependencyService`, or `realize2D` calls.
- Component-local `createCanvasWorldReadPort(world)` and `createThreeWorldReadPort(world)` calls are absent; adapter construction is localized in `RuntimeSession`.
- Scoped component `world.getVersion()` polling is absent.

Static evidence:

- `validation/final-static-scan.stdout.log` contains only allowed implementation-local adapter factory definitions and `RuntimeSession.getVersion()` for autosave/session use; no production scoped raw-world injection/provider/call seam remains.
- `validation/final-process-tree-anti-facade-scan.stdout.log` is empty for Vue process-tree/read-port forbidden helper exposure.

## Protected-surface checks

No backend, docs/specs, package/tooling, persistence schema/replay, Drive/auth internals, command serialization/replay, or command-history semantics were modified. Command producer ports, `CommandHistoryPort`, undo/redo routing, autosave dirty/version behavior, and persistence handles remain in their existing boundaries.

## Validation log index

All logs are under `architecture-audit/cycle-025-runtime-view-read-ports/validation/`.

- Pre/post source-control evidence: `pre-status.*`, `pre-scoped-diff.*`, `post-status.*`, `final-scoped-diff.*`.
- Static scans: `pre-static-scan.*`, `final-static-scan.*`, `final-process-tree-anti-facade-scan.*`.
- Lint: `root-lint.*`, `frontend-lint.*` — passed.
- Focused Vitest: `focused-properties-dialog-vitest.*`, `focused-boundary-vitest.*`, `focused-appshell-three-vitest-03.*`, `focused-vitest.*` — passed.
- Full Vitest: `root-full-vitest-03.*`, `frontend-full-vitest-03.*` — passed.
- Build: `focused-build-03.*`, `root-build-03.*`, `frontend-build-03.*` — passed.
- E2E: `root-e2e-02.*` — passed.
- Live preview: `live-preview.*`, `live-preview-probe.*` — preview refreshed on `0.0.0.0:5173` and HTTP probe passed.
- Live smoke: initial script attempts `live-smoke*.log` documented import-resolution/ambiguous-selector smoke harness issues; corrected Playwright runner smoke `live-smoke-playwright-02.*` passed for canvas, elements panel, actions panel, 3D overlay, plane selector, and undo key smoke.

## Source-control hygiene

The worktree was broadly dirty before implementation; path-scoped status/diff evidence was captured before and after changes. This implementation touched only Cycle 025 source/test/audit-validation files and did not revert unrelated dirty files.

## Residual risks / next-wave candidates

- Canvas and three presentation ports still intentionally wrap existing domain-heavy adapters inside runtime/session; deeper realization-context cleanup remains a future wave candidate.
- Tool click context still includes raw `World` internally via `CanvasViewPort.invokeToolClick` because current tool interfaces require it. This does not expose `World` through Vue injection/props, but a later tool-context wave should eliminate the raw `World` from `ITool` if architecture priorities continue inward.
- Elements visibility remains a named view intent preserving current behavior, not a command-backed redesign; command-backed visibility may be a future centrality candidate.

## T3 correction — PropertiesDialog stale parent prop

Reviewer follow-up flagged a stale parent prop on the dialog invocation after `PropertiesDialog.vue` moved to the prepared `PropertiesDialogViewModel` contract. `frontend/src/components/workspace/SvgCanvas.vue` now removes the obsolete `:element-id="propertiesElementId"` binding and passes only `isOpen`, `viewModel`, and dialog events.

Refreshed focused evidence under `validation/`:

- `t3-static-properties-dialog-scan.*` — passed; proves the stale `:element-id="propertiesElementId"` binding is absent and the scoped dialog/canvas files do not reintroduce the raw-world dialog seam.
- `t3-focused-properties-dialog-vitest.*` — passed; 18 focused dialog tests passed.
- `t3-frontend-build.*` — passed; `vue-tsc && vite build` accepts the corrected parent/child props. Vite reported only the pre-existing large chunk warning.
- `t3-patch.*` / `t3-patch-retry.*` / `t3-properties-dialog-stale-prop-fix.*` — patch provenance; the first `python` command failed because `python` is unavailable, then the same source edit succeeded with `python3`.

No protected out-of-scope surfaces were modified for this correction.

## Validation-and-preview closure — cycle-025-validation-and-preview-refresh

**Wave 025 status: COMPLETE.**

Independent closure verification for `cycle-025-validation-and-preview-refresh` inspected the implementation summary/history, reviewer correction artifacts, current scoped git status/diff evidence, mandatory validation logs, current static seam scans, live preview reachability, and the current wave plan. No production source refactor, package/tooling churn, backend/docs/specs edits, persistence/replay changes, command-producer/history redesign, secret/config reads, or next-wave implementation was performed during closure.

### Closure evidence added

Additional closure logs were captured under `validation/`:

- `closure-scoped-status.*` — path-scoped status for Cycle 025 audit/report files plus scoped runtime/view source/test paths. It shows only closure-stage report/audit-review artifacts as untracked in the scoped set; no scoped production source drift was found during closure.
- `closure-static-scan.*` — current scan for deleted raw world view-read seams. Matches are limited to `RuntimeSession` private `world` ownership and `RuntimeSession.getVersion()` for session/autosave use; no `worldForView`, `WorldInjectionKey`, production `inject(WorldInjectionKey)`, production `provide(WorldInjectionKey)`, component-local `createCanvasWorldReadPort(world)`, component-local `createThreeWorldReadPort(world)`, component `world.getVersion()` polling, `PropertiesDialog.vue` raw-world prop/import, or `ProcessTreeNode.vue` raw-world prop seam was found.
- `closure-process-tree-anti-facade-scan.*` — empty scan for forbidden Vue-facing process-tree/world traversal helpers (`getElement2D`, `getElement3DById`, `getProjectionPlaneById`, `getDependencyService`, `realize2D`, `getActionDescriptionParts`, generic `getAll*`) on the scoped process-tree read surfaces.
- `closure-validation-log-tails.*` — closure index/tails for the green validation evidence listed below.
- `closure-live-preview-probe.*` — fresh HTTP probe against `http://127.0.0.1:5173/`, returning `HTTP/1.1 200 OK` and the Vite app shell.
- `closure-wave-plan-grep.*` — current wave-plan evidence confirming Wave 025 is the final existing plan entry and that its residual risks point inward to tool/context/read-adapter cleanup rather than authorizing source changes in this closure stage.

### Mandatory validation evidence accepted

The closure stage accepts the existing implementation/correction validation evidence as current green source evidence, supplemented by the closure scans/probe above:

- Root lint: `root-lint.*` — passed (architecture tests 11/11).
- Frontend lint: `frontend-lint.*` — passed (architecture tests 11/11).
- Focused Vitest: `focused-properties-dialog-vitest.*`, `focused-boundary-vitest.*`, `focused-appshell-three-vitest-03.*`, `focused-vitest.*` — passed.
- Reviewer correction validation: `t3-static-properties-dialog-scan.*`, `t3-focused-properties-dialog-vitest.*`, `t3-frontend-build.*` — passed after removing the stale parent dialog prop.
- Full Vitest: `root-full-vitest-03.*`, `frontend-full-vitest-03.*` — passed (110 files passed, 1 skipped; 1268 tests passed, 45 skipped, 11 todo).
- Build: `root-build-03.*`, `frontend-build-03.*` — passed; Vite reported only the pre-existing large chunk warning.
- E2E: `root-e2e-02.*` — passed (9/9 Playwright tests).
- Live smoke: `live-smoke-playwright-02.*` — passed (credential-free Cycle 025 smoke). Earlier `live-smoke*.log` failures are superseded as harness/import-resolution or ambiguous-selector issues, not accepted source failures.
- Live preview: `live-preview.*`, `live-preview-probe.*`, and fresh `closure-live-preview-probe.*` confirm the preview is reachable on the in-container dev server at `0.0.0.0:5173` / `127.0.0.1:5173` with HTTP 200.

### Runtime view/read-port closure assessment

- `RuntimeSession` privately owns the concrete `World` (`private readonly world = new World()`) and exposes named behavior-sized ports rather than a raw view world accessor.
- `RuntimeViewPorts.ts` defines typed, named contracts/DTOs for canvas, process tree, elements panel, three presentation, active-plane selection, and properties dialog view data; closure scans found no broad string-key catch-all provider or generic Vue-facing world facade.
- `RuntimeSession.worldForView()`, `AppShellRuntime.runtime.world`, `WorldInjectionKey`, `App.vue` raw-world provider, and scoped production `inject(WorldInjectionKey)` consumers remain absent.
- `PropertiesDialog.vue` renders the parent/runtime-prepared `PropertiesDialogViewModel`; the T3 correction removed the stale `:element-id="propertiesElementId"` parent prop and the focused build/typecheck passed.
- `ProcessTreeNode.vue` renders `ProcessNodeViewModel` data and no longer performs raw world/process-tree helper traversal.
- Command-producer ports, `commandHistoryPort` undo/redo routing, `ToolCommandSink` intent boundary, autosave/dirty signaling, persistence round-trip behavior, command serialization/replay, and domain realization internals were not broadened or redesigned by Wave 025 closure.

### Source-control reconciliation

The repository remains broadly dirty outside this closure task, consistent with prior stage history. Closure used path-scoped status/diff evidence and did not revert, normalize, or incorporate unrelated dirty files. Production source paths in the Wave 025 scope were not changed during validation closure; only audit validation logs, this implementation-log closure section, and the task report were written.

### Residual risks and next-wave recommendation

Residual inward seams are accepted as future-wave candidates, not Cycle 025 blockers:

- `CanvasViewPort.invokeToolClick` still supplies raw `World` internally because `ITool.ToolContext.world` remains the active tool interaction/read context. This is not exposed through Vue injection/props and should be handled by a future tool-context/read-port wave.
- Canvas and three presentation/read adapters still contain domain-heavy realization/read logic inside runtime/application adapter boundaries. A later wave should decide whether to narrow these adapters further or redesign realization contexts.
- Elements visibility remains a named port intent preserving current behavior rather than a command-backed domain/persistence redesign.

Because `architecture-audit/wave-plan.md` currently ends at Wave 025 and Wave 025 is now complete, the recommended next canonical stage is a **wave-plan-extension scout/proposal stage** for Wave 026, not implementation. Based on Wave 025 learnings and the current residual centrality, the proposed Wave 026 candidate should focus on eliminating the remaining raw `World` tool interaction context seam (`CanvasViewPort.invokeToolClick` / `ITool.ToolContext.world`) and/or narrowing the domain-heavy canvas/three read-adapter realization contexts, with bounded proposals deciding whether the right architectural cut is a tool-context read/intent port or a higher-level realization/read-context layer. This plan extension must go through the required bounded review convergence before any Wave 026 implementation.

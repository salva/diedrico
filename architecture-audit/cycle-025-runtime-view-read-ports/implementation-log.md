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

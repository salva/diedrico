# Proposal Direct — Replace concrete World injection with behavior-sized runtime view/read ports

## Summary

Implement Wave 025 directly at the app-shell/view boundary. Keep `RuntimeSession` as the owner of the concrete `World`, but stop returning/providing `World` to Vue descendants. Add named read/view ports created by `RuntimeSession`, provide them through typed injection keys, and update each current consumer to render/read through the port that matches its behavior.

This proposal intentionally does **not** redesign command producers, persistence, backend contracts, domain realization internals, renderer host lifecycles, package tooling, docs/specs, or Drive/auth behavior.

## Files to change

### App-shell/runtime

- `frontend/src/application/appShell/RuntimeSession.ts`
  - Add factories for behavior-sized ports:
    - `canvasViewPort()` for canvas presentation/input/labels/screen-to-3D/change notification.
    - `propertiesReadPort()` or a `properties` member on `canvasViewPort()` for the properties dialog's read-only geometry/style view data and existing save payload construction. This port may prepare style/default values and element metadata from the private `World`, but it must not expose `World`, raw elements, generic lookup helpers, or direct mutation methods to Vue.
    - `processTreeReadPort()` for process-tree root/read subscription, related-action lookup, and parent-prepared process-node view models containing description/infeasibility/read data.
    - `elementsPanelPort()` for grouped element-list DTOs, change subscription, and visibility toggle intent.
    - `threeViewReadPort()` or `threePresentationPort()` for three read models plus change subscription.
    - `activePlaneSelectorPort()` for projection-plane options, active-plane id/label, set-active-plane, and subscription. Reuse existing `activePlanePort()` internals where possible.
  - Delete `worldForView()` after all production consumers are moved.
- `frontend/src/application/appShell/AppShellRuntime.ts`
  - Stop calling `session.worldForView()`.
  - Initialize active-plane runtime state through `session.activePlanePort()`/selector port instead of direct `world.getActivePlaneId()`.
  - Return named read/view ports instead of `world`.
- `frontend/src/application/appShell/RuntimeInjectionKeys.ts`
  - Delete `WorldInjectionKey: InjectionKey<World>` or change away from concrete `World` only if no broad facade remains.
  - Add typed keys such as `CanvasViewInjectionKey`, `ProcessTreeReadInjectionKey`, `ElementsPanelInjectionKey`, `ThreePresentationInjectionKey`, and `ActivePlaneSelectorInjectionKey`.
- `frontend/src/App.vue`
  - Replace `provide(WorldInjectionKey, runtime.world)` with the named read/view port providers.

### Canvas

- `frontend/src/components/workspace/SvgCanvas.vue`
  - Replace `inject(WorldInjectionKey)` with `CanvasViewInjectionKey` plus existing `CanvasCommandProducerInjectionKey`.
  - Replace version polling with port subscription/invalidation.
  - Replace direct active-plane, plane transform enumeration, label lookup, `createCanvasWorldReadPort(worldForCanvas)`, and `screenTo3D(..., worldForCanvas)` with `canvasViewPort` methods.
  - Pass the properties dialog a narrow `propertiesReadPort`/`canvasViewPort.properties` contract instead of `:world="world"`.
  - Do not change tool command producer semantics; existing `ToolCommandSink` stays the command mutation path.
- `frontend/src/components/dialogs/PropertiesDialog.vue`
  - Include this file in Wave 025 scope because `SvgCanvas.vue` currently forwards the injected `World` as a prop and the dialog imports/uses `World` for element type, plane id, coordinates, dependencies, and placeholder style/default loading.
  - Delete the `world: World | null` prop and concrete domain imports from the dialog.
  - Accept a narrow properties/style read contract plus `elementId`, or accept parent-prepared `PropertiesDialogViewModel` data, with fields shaped for the current UI only: `elementLabel`, `elementType`, optional `planeId`, optional `coordinates`, `dependencies`, optional `createdBy`, current/default visual style values, and flags for editable style controls.
  - Keep the existing `save` event shape or a similarly narrow style-change intent payload; do not add direct domain mutation, command-history changes, or persistence semantics in this wave.
- `frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts`
  - Keep adapter construction inside runtime/session or a small application adapter, not inside Vue.
  - Narrow methods that can become DTO/query methods during this wave. Avoid returning raw `ProjectionPlane[]` if the selector can receive presentation/read DTOs without broad domain exposure.
- `frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts`
  - Accept narrowed read DTOs where practical while preserving render/query output behavior.
- `frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts`
  - Delete the `world as World` cast if the canvas read port supplies the visibility/process-tree behavior needed by `resolveVisibility`, or document a residual realization/visibility-domain issue if it cannot be removed without deeper domain redesign.

### Panels and toolbar

- `frontend/src/components/panels/ActionsPanel.vue`
  - Replace `WorldInjectionKey` with `ProcessTreeReadInjectionKey`.
  - Continue using `ProcessHistoryCommandInjectionKey` for process-history commands.
  - Subscribe to a process-tree read model from the port and pass parent-prepared node view models to `ProcessTreeNode` instead of `world`.
  - Use the port for related-action lookup from selected element ids; do not call `world.getDependencyService()` from Vue.
- `frontend/src/components/panels/ProcessTreeNode.vue`
  - Delete `world: World` prop and recursive `:world="world"` forwarding.
  - Replace `getActionDescriptionParts(..., world)`, infeasibility checks, and element lookups with concrete fields already present on each process-node view model.
  - The replacement shape should be behavior-level, not domain-root-like. A suitable `ProcessNodeViewModel` shape is:
    - structural fields needed for existing rendering and controls: `id`, `type`, `name` for subprocesses, `children`, `showIntermediates`, `isOutput`, `isAuxiliary`, and action `elementId` where highlight/selection behavior still needs it;
    - display fields for action rows: `descriptionParts: Array<{ type: 'text'; content: string } | { type: 'element'; content: string; elementId: string }>` prepared by the read port, `isInfeasible: boolean`, and `hideBecauseElementMissing: boolean` (or equivalent) so deleted/missing elements can suppress the row without child lookups;
    - optional label/reference data only when the template needs it, such as formatted element label text or dependency/reference ids already resolved for display.
  - Explicitly forbidden: generic `getElement2D`, `getElement3DById`, `getProjectionPlaneById`, `realize2D`, `getActionDescriptionParts(node, world)`, `getDependencyService`, `getAll*`, or other World-style traversal/helper methods on `ProcessTreeReadPort`, `ProcessNodeViewModel`, or props passed into `ProcessTreeNode.vue`. If implementation cannot prepare the above DTOs without such helpers, stop for a plan edit rather than smuggling a `World` facade into the process-tree port.
- `frontend/src/components/panels/ElementsPanel.vue`
  - Replace `WorldInjectionKey` with `ElementsPanelInjectionKey`.
  - Render grouped DTOs from the port.
  - Replace polling with port subscription.
  - Replace direct `visualStyle` mutation and `world.markDirty()` with a named visibility toggle method on the port.
- `frontend/src/components/panels/ThreeView.vue`
  - Replace `WorldInjectionKey` and component-local `createThreeWorldReadPort(world)` with `ThreePresentationInjectionKey` supplied by runtime.
  - Replace direct world subscription with port subscription/invalidation.
- `frontend/src/components/toolbars/PlaneSelector.vue`
  - Replace `WorldInjectionKey` with `ActivePlaneSelectorInjectionKey`.
  - Replace version polling with subscription.
  - Use port methods for options, active id/label, and selection.

### Tests likely to update/add

- `frontend/tests/unit/application/appShell/AppShellBoundary.test.ts`
- `frontend/tests/unit/application/appShell/AppShellRuntimeUseCases.test.ts`
- `frontend/tests/unit/components/panelToolbarBehavior.spec.ts`
- Canvas presentation/input focused tests under `frontend/tests/unit/application/` or component tests for `SvgCanvas.vue` if present.
- Focused dialog tests for `PropertiesDialog.vue` or its read-port adapter proving it renders geometry/style view data without a `World` prop/import and emits the same style-change intent payload.
- Focused process-tree tests proving `ActionsPanel.vue`/`ProcessTreeNode.vue` render description parts, hidden/missing elements, infeasible state, related-action state, collapse/edit controls, and highlight/selection behavior from view models without generic world traversal helpers.
- Add focused boundary/static tests proving production Vue components no longer inject concrete `World`.
- Update any tests that directly expected `runtime.world` or `WorldInjectionKey` in view consumers.

## Files/tests/docs/fixtures to DELETE

Delete, rather than wrap, these internal legacy surfaces if implementation confirms all consumers are moved:

- `RuntimeSession.worldForView()`.
- `AppShellRuntime` returned `world` field.
- `App.vue` `provide(WorldInjectionKey, runtime.world)`.
- `WorldInjectionKey: InjectionKey<World>` and its concrete `World` import.
- `inject(WorldInjectionKey)` in `SvgCanvas.vue`, `ActionsPanel.vue`, `ElementsPanel.vue`, `ThreeView.vue`, and `PlaneSelector.vue`.
- `PropertiesDialog.vue` `world: World | null` prop, `World` import, concrete domain-class imports used only for dialog read formatting, and `SvgCanvas.vue` `:world="world"` forwarding.
- `world` prop in `ProcessTreeNode.vue` and recursive `:world="world"` forwarding.
- Component-side 100ms polling of `world.getVersion()` in `SvgCanvas.vue`, `ElementsPanel.vue`, and `PlaneSelector.vue` where replaced by subscriptions.
- Vue-component calls to `createCanvasWorldReadPort(world)` and `createThreeWorldReadPort(world)`.
- `ElementsPanel.vue` `any` element formatting and concrete `instanceof` grouping once element-list DTOs cover it.
- Direct elements-panel `world.getElement2D(...) || getElement3DById(...) || getProjectionPlaneById(...)` visibility mutation plus `world.markDirty()`.
- Tests asserting concrete world injection/return remains available.
- Tests requiring `PropertiesDialog.vue` or `ProcessTreeNode.vue` to receive a concrete `World`.
- Any transitional broad facade or duplicate raw-world + port path created during implementation.

Do not delete command producers, command serialization/descriptors, persistence DTOs/schema/replay, `ProjectService`, backend, docs/specs, package scripts, Drive/auth code, validation-platform code, or broad domain realization internals in this wave.

## Expected behavior change

User-visible behavior should remain equivalent:

- Canvas rendering, hit testing, hover labels, point drag, properties dialog, screen-to-3D coordinate display, fit-to-view, tool flows, and viewport behavior remain the same.
- Actions panel still renders the process tree, highlights related actions/elements, supports push/pop/toggle/rename through existing command port, and preserves collapse/scroll behavior.
- Elements panel still lists 2D/3D elements, preserves section/plane collapse behavior, selection, highlight, and visibility toggles.
- Plane selector still lists projection planes, shows active plane, supports mouse/keyboard selection, and updates app active-plane state.
- Three view still refreshes from world changes, selection, and display option changes.
- Undo/redo remains routed through existing `CommandHistoryInjectionKey`; command-production ports from Wave 024 remain untouched.

Architectural behavior changes:

- View/rendering descendants no longer receive the mutable domain root.
- Runtime/session becomes the adapter boundary for read/view ports.
- Component invalidation becomes explicit subscriptions instead of polling concrete world versions.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| New ports become a renamed `World` facade | Keep each port behavior-sized and consumer-specific; reject methods that mirror generic world traversal unless localized in runtime adapters and scheduled for later. |
| Canvas input/rendering regressions | Focused tests for presentation model, hit query, active-plane transforms, point drag, hover labels, and screen-to-3D; e2e/live smoke on canvas flows. |
| Elements visibility should perhaps be command-backed | Do not redesign command/persistence semantics here. Keep a named application/view visibility intent that preserves current behavior; record future command-backed visibility candidate if needed. |
| Properties dialog appears small but currently imports `World` and domain subclasses directly | Include it in scope and replace the `World` prop with a narrow properties/style read contract or parent-prepared view model; keep style save as a narrow existing payload and stop rather than adding domain mutation/command semantics. |
| ProcessTreeNode needs domain-heavy descriptions/infeasibility | Require parent-prepared process-node view models with description parts, `isInfeasible`, and missing-element/hide flags; explicitly forbid generic world traversal helpers or world-like facades on the port. If those DTOs cannot be prepared without broad realization redesign, stop for plan edit rather than passing `World`. |
| Canvas/Three realization context remains domain-coupled | Localize raw `World` inside runtime/application adapters. Do not attempt full realization-context redesign inside this wave. |
| Broad dirty worktree | Use path-scoped diffs/status and do not revert unrelated files. |

## Validation plan

Capture logs under `architecture-audit/cycle-025-runtime-view-read-ports/validation/` during implementation.

1. Pre/post status and scoped diff logs.
2. Static scans proving absence of production `worldForView`, `WorldInjectionKey: InjectionKey<World>`, `inject(WorldInjectionKey)`, `provide(WorldInjectionKey)`, `PropertiesDialog.vue` `world: World` prop/import, `ProcessTreeNode.vue` `world` prop, component `world.getVersion()` polling for scoped consumers, component `createCanvasWorldReadPort(world)`, and component `createThreeWorldReadPort(world)`.
3. Static/boundary scans or tests proving process-tree read ports/view models do not expose generic world traversal methods such as `getElement2D`, `getElement3DById`, `getProjectionPlaneById`, `getDependencyService`, `getAll*`, or raw `realize2D` helpers to Vue.
4. Focused Vitest for app-shell runtime wiring/read ports, canvas presentation/input/hover/coordinate behavior, properties-dialog view-model/style payload behavior, process-tree panel read-model behavior, elements list/visibility behavior, plane selector read/write behavior, three-view refresh, and command-history regression.
5. Root and frontend `npm run lint` where scripts are defined.
6. Root and frontend full Vitest where scripts are defined.
7. Root and frontend `npm run build` where scripts are defined.
8. Root/frontend Playwright e2e because rendering/panels/properties dialog/plane selector/3D view are user-observable.
9. Live preview refresh on `0.0.0.0:5173`, HTTP 200 probe, and credential-free live Playwright smoke covering canvas render/hit/hover, properties dialog open/read/save-cancel smoke, elements visibility toggle, actions panel render, plane selector switch, 3D refresh, and undo/redo.

## No-backcompat rationale

`worldForView()` and `WorldInjectionKey<World>` are internal runtime wiring seams, not compatibility contracts. Keeping them alongside new read ports would preserve the exact architecture debt Wave 025 is meant to delete. `PropertiesDialog.vue` and `ProcessTreeNode.vue` are in scope because they currently receive raw world through props from scoped consumers, so leaving them on raw `World` would make the removal claim false. Update active production consumers/tests directly and remove the raw seam; do not keep shims, overloads, broad facades, or duplicate raw-world/port paths.

## Stop conditions for broader redesign

Stop and request a reviewed plan edit if implementation requires:

- changing command producer semantics, command descriptors, command serialization/replay, undo/redo, or `CommandStack`;
- changing persistence schema/replay, `ProjectService`, backend/frontend contracts, Drive/auth, docs/specs, package/tooling, or validation platform;
- redesigning domain realization contexts, process-tree ownership, element id semantics, or the application kernel;
- preserving a new catch-all `WorldViewFacade`, generic process-tree traversal facade, or properties-dialog raw-world pass-through because behavior-sized ports cannot cover current consumers.

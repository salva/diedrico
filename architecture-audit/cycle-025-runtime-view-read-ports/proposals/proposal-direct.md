# Proposal Direct — Replace concrete World injection with behavior-sized runtime view/read ports

## Summary

Implement Wave 025 directly at the app-shell/view boundary. Keep `RuntimeSession` as the owner of the concrete `World`, but stop returning/providing `World` to Vue descendants. Add named read/view ports created by `RuntimeSession`, provide them through typed injection keys, and update each current consumer to render/read through the port that matches its behavior.

This proposal intentionally does **not** redesign command producers, persistence, backend contracts, domain realization internals, renderer host lifecycles, package tooling, docs/specs, or Drive/auth behavior.

## Files to change

### App-shell/runtime

- `frontend/src/application/appShell/RuntimeSession.ts`
  - Add factories for behavior-sized ports:
    - `canvasViewPort()` for canvas presentation/input/labels/screen-to-3D/change notification/properties read seam.
    - `processTreeReadPort()` for process-tree root/read subscription, related-action lookup, node description/infeasibility read data.
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
  - Do not change tool command producer semantics; existing `ToolCommandSink` stays the command mutation path.
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
  - Pass DTO/read helpers to `ProcessTreeNode` instead of `world`.
- `frontend/src/components/panels/ProcessTreeNode.vue`
  - Delete `world: World` prop.
  - Replace `getActionDescriptionParts(..., world)`, infeasibility checks, and element lookups with DTO/read-model fields supplied by the process-tree read port or parent-prepared node view models.
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
- Add focused boundary/static tests proving production Vue components no longer inject concrete `World`.
- Update any tests that directly expected `runtime.world` or `WorldInjectionKey` in view consumers.

## Files/tests/docs/fixtures to DELETE

Delete, rather than wrap, these internal legacy surfaces if implementation confirms all consumers are moved:

- `RuntimeSession.worldForView()`.
- `AppShellRuntime` returned `world` field.
- `App.vue` `provide(WorldInjectionKey, runtime.world)`.
- `WorldInjectionKey: InjectionKey<World>` and its concrete `World` import.
- `inject(WorldInjectionKey)` in `SvgCanvas.vue`, `ActionsPanel.vue`, `ElementsPanel.vue`, `ThreeView.vue`, and `PlaneSelector.vue`.
- `world` prop in `ProcessTreeNode.vue` and recursive `:world="world"` forwarding.
- Component-side 100ms polling of `world.getVersion()` in `SvgCanvas.vue`, `ElementsPanel.vue`, and `PlaneSelector.vue` where replaced by subscriptions.
- Vue-component calls to `createCanvasWorldReadPort(world)` and `createThreeWorldReadPort(world)`.
- `ElementsPanel.vue` `any` element formatting and concrete `instanceof` grouping once element-list DTOs cover it.
- Direct elements-panel `world.getElement2D(...) || getElement3DById(...) || getProjectionPlaneById(...)` visibility mutation plus `world.markDirty()`.
- Tests asserting concrete world injection/return remains available.
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
| ProcessTreeNode needs domain-heavy descriptions/infeasibility | Prefer read-model data prepared by process-tree port. If infeasibility/description cannot be represented without broad realization redesign, keep that residual explicit and stop for plan edit rather than passing `World`. |
| Canvas/Three realization context remains domain-coupled | Localize raw `World` inside runtime/application adapters. Do not attempt full realization-context redesign inside this wave. |
| Broad dirty worktree | Use path-scoped diffs/status and do not revert unrelated files. |

## Validation plan

Capture logs under `architecture-audit/cycle-025-runtime-view-read-ports/validation/` during implementation.

1. Pre/post status and scoped diff logs.
2. Static scans proving absence of production `worldForView`, `WorldInjectionKey: InjectionKey<World>`, `inject(WorldInjectionKey)`, `provide(WorldInjectionKey)`, component `world.getVersion()` polling for scoped consumers, component `createCanvasWorldReadPort(world)`, and component `createThreeWorldReadPort(world)`.
3. Focused Vitest for app-shell runtime wiring/read ports, canvas presentation/input/hover/coordinate behavior, process-tree panel read behavior, elements list/visibility behavior, plane selector read/write behavior, three-view refresh, and command-history regression.
4. Root and frontend `npm run lint` where scripts are defined.
5. Root and frontend full Vitest where scripts are defined.
6. Root and frontend `npm run build` where scripts are defined.
7. Root/frontend Playwright e2e because rendering/panels/plane selector/3D view are user-observable.
8. Live preview refresh on `0.0.0.0:5173`, HTTP 200 probe, and credential-free live Playwright smoke covering canvas render/hit/hover, elements visibility toggle, actions panel render, plane selector switch, 3D refresh, and undo/redo.

## No-backcompat rationale

`worldForView()` and `WorldInjectionKey<World>` are internal runtime wiring seams, not compatibility contracts. Keeping them alongside new read ports would preserve the exact architecture debt Wave 025 is meant to delete. Update active production consumers/tests directly and remove the raw seam; do not keep shims, overloads, broad facades, or duplicate raw-world/port paths.

## Stop conditions for broader redesign

Stop and request a reviewed plan edit if implementation requires:

- changing command producer semantics, command descriptors, command serialization/replay, undo/redo, or `CommandStack`;
- changing persistence schema/replay, `ProjectService`, backend/frontend contracts, Drive/auth, docs/specs, package/tooling, or validation platform;
- redesigning domain realization contexts, process-tree ownership, element id semantics, or the application kernel;
- preserving a new catch-all `WorldViewFacade` because behavior-sized ports cannot cover current consumers.

# Cycle 025 Scope Check — Runtime view/read ports for rendering and panels

## Stage and source-control hygiene

This is a planning/scout artifact only. It does **not** implement Wave 025 and does not intentionally modify production source, tests, package/tooling, backend, specs, docs, Drive/auth, or secret/config files.

A bounded, filtered worktree sample was captured at `pre-scout-status.stdout.log`. The repository is broadly dirty before this scout: the sample includes many unrelated historical audit/stage artifacts, `.github`/`.specify` deletions, `.saivage` stage/report pathnames, and unrelated frontend source/test changes. The scoped diff sample for Wave 025 source paths reported only unrelated existing changes in `frontend/src/components/panels/ActionGroupItem.vue`, `frontend/src/components/panels/ActionItem.vue`, `frontend/src/domain/calculations/Intersections.ts`, and `frontend/src/domain/processTree/ActionGroup.ts`; this scout did not revert or depend on them.

Protected secret/config contents were not read. The status sample filtered protected auth/config/provider/env/token/credential/history pathnames where practical.

## Wave-plan entry reread

Wave 025 in `architecture-audit/wave-plan.md` defines the next central concern as replacing the residual runtime rendering/view read seam: `RuntimeSession.worldForView()`, `WorldInjectionKey: InjectionKey<World>`, and view descendants that receive the full mutable `World` for rendering, panels, active-plane reads/writes, process-tree reads, element labels, visibility, and change notification (`architecture-audit/wave-plan.md:1589-1702`; captured in `wave-025-entry.stdout.log`).

The entry explicitly excludes command producers, command descriptors, persistence schema/replay, `ProjectService` cleanup, domain realization redesign, backend/frontend contract work, Drive/auth/browser adapters, package/tooling, validation-platform hardening, docs/spec reconciliation, and debug/placeholder cleanup (`architecture-audit/wave-plan.md:1613-1617`, `:1658`, `:1670`, `:1695-1698`).

## Current-source evidence: runtime seam still exists

Static scan confirms the residual concrete-world view seam remains active and bounded:

- `RuntimeSession.worldForView(): World` returns the concrete private world (`frontend/src/application/appShell/RuntimeSession.ts:22-26`).
- `createAppShellRuntime` calls `session.worldForView()` and returns `world` in the runtime object (`frontend/src/application/appShell/AppShellRuntime.ts:15-17`, `:99-104`).
- `RuntimeInjectionKeys.ts` exports `WorldInjectionKey: InjectionKey<World>` (`frontend/src/application/appShell/RuntimeInjectionKeys.ts:1-8`).
- `App.vue` imports and provides `WorldInjectionKey` with `runtime.world` (`frontend/src/App.vue:106-113`, `:148`).
- Active production consumers are `SvgCanvas.vue`, `ActionsPanel.vue`, `ElementsPanel.vue`, `ThreeView.vue`, and `PlaneSelector.vue` (`world-read-seam-scan.stdout.log`).

This supports the Wave 025 premise: the command-producer seam removed by Wave 024 left a small but central concrete-world read seam in app-shell/view wiring.

## Consumer inventory and behavior classification

### `SvgCanvas.vue`

Evidence:

- Injects `WorldInjectionKey`, aliases it to `worldForCanvas`, and passes it to the properties dialog (`frontend/src/components/workspace/SvgCanvas.vue:130-136`, `:209`, `:411-416`).
- Polls `worldForCanvas.getVersion()` every 100ms to force rendering updates (`frontend/src/components/workspace/SvgCanvas.vue:223-232`, `:479-494`).
- Reads active plane from world (`frontend/src/components/workspace/SvgCanvas.vue:227-232`).
- Builds a canvas presentation read model with `createCanvasWorldReadPort(worldForCanvas)` (`frontend/src/components/workspace/SvgCanvas.vue:545-563`).
- Computes input transforms by enumerating projection planes and reading each plane's 2D realization (`frontend/src/components/workspace/SvgCanvas.vue:530-542`).
- Looks up element labels by traversing projection planes and concrete points/lines/circles (`frontend/src/components/workspace/SvgCanvas.vue:364-407`).
- Uses concrete world in tool context, point drag lookup, and `screenTo3D(...)` (`frontend/src/components/workspace/SvgCanvas.vue:744-753`, `:849-861`, `:1104-1113`).

Behavior needs:

1. Canvas presentation snapshot and query items.
2. Canvas input transform map and active-plane id.
3. Element label lookup for hover/tooltips.
4. Screen-to-3D coordinate support.
5. Properties dialog data/update seam.
6. Change notification without version polling.
7. Existing command-production port remains separate and should not be redesigned here.

### `ActionsPanel.vue` and `ProcessTreeNode.vue`

Evidence:

- `ActionsPanel.vue` injects both `WorldInjectionKey` and `ProcessHistoryCommandInjectionKey` (`frontend/src/components/panels/ActionsPanel.vue:52-74`).
- It initializes and refreshes `processTree` by calling `worldForProcessHistory.getProcessTree()` and subscribes both to the process tree and to world changes (`frontend/src/components/panels/ActionsPanel.vue:87-104`, `:148-177`).
- It passes the full `world` prop into recursive `ProcessTreeNode` (`frontend/src/components/panels/ActionsPanel.vue:30-38`).
- It computes related actions by calling `worldForProcessHistory.getDependencyService().getDependencies(...)` (`frontend/src/components/panels/ActionsPanel.vue:212-225`).
- `ProcessTreeNode.vue` requires `world: World`, uses `getElement2D`, `getElement3DById`, `getProjectionPlaneById`, `Element2D` checks, `element.realize2D(props.world)`, and `getActionDescriptionParts(props.node, props.world)` (`frontend/src/components/panels/ProcessTreeNode.vue:185-203`, `:244-267`, `:274-281`).

Behavior needs:

1. Process-tree read/subscription state and current tree root.
2. Process-history command intents already covered by existing command port.
3. Related-action lookup for current selection.
4. Node description/element-label data and infeasibility/read-model flags without child components receiving `World`.
5. Collapse/edit UI state remains local/store-backed and out of runtime read-port ownership.

### `ElementsPanel.vue`

Evidence:

- Injects `WorldInjectionKey` directly (`frontend/src/components/panels/ElementsPanel.vue:128-146`).
- Polls `world.getVersion()` every 100ms (`frontend/src/components/panels/ElementsPanel.vue:157-176`).
- Enumerates projection planes, plane points/lines/circles/guides, uses concrete `instanceof` checks, and formats elements through `any` helpers (`frontend/src/components/panels/ElementsPanel.vue:182-236`, `:270-312`).
- Enumerates 3D points/lines/segments/planes (`frontend/src/components/panels/ElementsPanel.vue:244-263`).
- Toggles visibility by directly retrieving concrete domain elements, mutating `visualStyle`, and calling `world.markDirty()` (`frontend/src/components/panels/ElementsPanel.vue:342-357`).

Behavior needs:

1. Element-list DTOs grouped for the panel.
2. Selection/highlight remains UI/store behavior.
3. Named visibility toggle intent/read port.
4. Change notification without polling.
5. Deletion of `any` formatting and component-side `instanceof` grouping if DTOs cover the behavior.

### `ThreeView.vue`

Evidence:

- Injects `WorldInjectionKey` directly (`frontend/src/components/panels/ThreeView.vue:29-43`).
- Creates `createThreeWorldReadPort(world)` inside the component (`frontend/src/components/panels/ThreeView.vue:42-44`).
- Subscribes directly to world changes for refresh (`frontend/src/components/panels/ThreeView.vue:58-60`).

Behavior needs:

1. Three-presentation read port supplied by runtime/app-shell, not constructed from an injected world.
2. Change subscription/invalidation.
3. Existing `ThreeViewRuntime` host/renderer lifecycle should not be redesigned.

### `PlaneSelector.vue`

Evidence:

- Injects `WorldInjectionKey` and narrows it to `World` (`frontend/src/components/toolbars/PlaneSelector.vue:53-61`).
- Polls `world.getVersion()` every 100ms (`frontend/src/components/toolbars/PlaneSelector.vue:68-83`).
- Lists projection planes, reads active plane id/label, and calls `world.setActivePlaneId(...)` (`frontend/src/components/toolbars/PlaneSelector.vue:95-112`, `:143-145`).

Behavior needs:

1. Active-plane selector options.
2. Active-plane read/write behavior.
3. Change notification without polling.
4. Keyboard/dropdown UI remains local component behavior.

## Current presentation adapters/selectors

Existing adapters are useful seams but still expose/consume raw domain objects:

- `CanvasWorldReadPort` returns `ProjectionPlane[]`, `Point3D[]`, `Line3D[]`, `Segment3D[]`, realization methods that take raw domain objects, and `ProcessTree`; its adapter is constructed from `World` (`frontend/src/application/canvasPresentation/CanvasWorldReadPort.ts:1-36`, `:38-70`).
- `CanvasPresentationSelector` iterates raw planes and plane-owned domain elements, uses concrete domain subclasses, and calls realization methods with raw objects (`frontend/src/application/canvasPresentation/CanvasPresentationSelector.ts:1-36`, `:47-86`, `:104-128`).
- `CanvasVisibilityPolicy` narrows to `Pick<World, 'getProcessTree'>` but casts back to `World` to call domain visibility resolution (`frontend/src/application/canvasPresentation/CanvasVisibilityPolicy.ts:1-8`).
- `ThreeWorldReadPort` already returns scene-facing read-model shapes, but its adapter still imports `World`, creates broad realization contexts, enumerates raw world collections, and performs domain class checks (`frontend/src/application/threePresentation/ThreeWorldReadPort.ts:1-12`, `:66-81`, `:83-174`).

Conclusion: adapters can be narrowed in this wave at the runtime/component seam, but full domain realization-context redesign would exceed the wave-plan guard.

## Selected bounded scope

Wave 025 should proceed without plan edit if proposals stay within these bounded concerns:

- Add behavior-sized runtime read/view ports and typed injection keys for canvas view data, process-tree panel reads, elements-panel list/visibility, three-view presentation/change, and active-plane selector behavior.
- Remove concrete `World` injection from production Vue descendants listed in the wave entry.
- Delete `RuntimeSession.worldForView()` and the `AppShellRuntime.world` return/provide path if all view consumers are ported.
- Narrow canvas/three read ports only where practical at adapter/component boundaries; do not redesign domain realization internals.
- Replace polling with existing world subscriptions exposed through ports where possible.

## Explicit out of scope / stop conditions

Stop and require a reviewed wave-plan edit if implementation evidence shows the selected design requires any of the following:

- Command producer, command descriptor, command serialization/replay, undo/redo, or `CommandStack` redesign.
- Persistence schema, ProjectService DTO/cast cleanup, Drive/auth/browser adapter behavior, backend/frontend contract changes, or docs/spec/package/tooling churn.
- Broad domain realization redesign, process-tree ownership redesign, element id model redesign, or application-kernel rewrite.
- Replacing existing canvas/three renderer host lifecycles or store architecture.
- Keeping a new `WorldViewFacade` that mirrors `World` methods as a compatibility layer.

## Premises assessment

The Wave 025 premise remains valid. No inspected source invalidates the wave-plan entry. The direct consumers and behavior needs match the reviewed plan extension, with one important scope clarification: `ProcessTreeNode.vue` is not an injector but receives `World` as a child prop from `ActionsPanel.vue`; any claim that panel world access is gone must include deleting that child prop and replacing its description/infeasibility reads with DTO/port data.

## DELETE-list candidates for implementation

- `RuntimeSession.worldForView()`.
- `AppShellRuntime` returned `world` field and `App.vue` `provide(WorldInjectionKey, runtime.world)`.
- `WorldInjectionKey: InjectionKey<World>` if no remaining production view descendant needs it.
- `inject(WorldInjectionKey)` in `SvgCanvas.vue`, `ActionsPanel.vue`, `ElementsPanel.vue`, `ThreeView.vue`, and `PlaneSelector.vue`.
- `world` prop in `ProcessTreeNode.vue` and recursive forwarding of that prop.
- Component-side version polling intervals in `SvgCanvas.vue`, `ElementsPanel.vue`, and `PlaneSelector.vue` where port subscriptions replace them.
- `createCanvasWorldReadPort(world)` and `createThreeWorldReadPort(world)` calls from Vue components.
- `ElementsPanel.vue` `any`/`instanceof` formatting and direct visibility mutation if replaced by DTOs/visibility intent.
- `CanvasVisibilityPolicy` cast from `Pick<World, 'getProcessTree'>` to `World` if visibility can be expressed via a proper read port.

## Validation requirements for the implementation stage

Minimum required validation for a future implementation:

1. Pre/post static scans for `worldForView`, `WorldInjectionKey`, `inject(WorldInjectionKey)`, `provide(WorldInjectionKey)`, component `world.getVersion()` polling, `createCanvasWorldReadPort(world)`, and `createThreeWorldReadPort(world)`.
2. Focused Vitest for app-shell runtime/read-port wiring, canvas presentation/input/hover/coordinate seams, process-tree panel read/related-action data, elements-panel DTO/visibility behavior, plane selector read/write behavior, and three-view refresh.
3. Root and frontend lint where scripts are defined.
4. Root and frontend full Vitest where scripts are defined.
5. Root and frontend build where scripts are defined.
6. Root/frontend Playwright e2e because canvas rendering, panels, plane selector, and 3D view are user-observable.
7. Live preview refresh on `0.0.0.0:5173`, HTTP 200 probe, and credential-free live smoke covering canvas render/hit/hover, elements visibility toggle, actions panel rendering, plane selector switching, 3D view refresh, and undo/redo regression through existing command-history port.

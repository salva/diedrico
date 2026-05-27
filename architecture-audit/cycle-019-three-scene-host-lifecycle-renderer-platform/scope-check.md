# Cycle 019 Scope Check — Three scene-host lifecycle and renderer platform boundary

## Stage and wave

- Stage: `cycle-019-fresh-scout-proposals`
- Wave: 019 — Three scene-host lifecycle and renderer platform boundary
- Nature of this stage: planning/scout only. No production source, tests, package metadata, backend, docs/spec, app-shell, command/undo, persistence, or tooling implementation is performed here.

## Workspace/status hygiene

- Full MCP `git_status` overflowed because the workspace contains substantial unrelated dirty/untracked work; this matches the Wave 018 closure warning about broad status volume.
- A task-scoped status was captured in `.saivage/stages/cycle-019-fresh-scout-proposals/status-focused-pre-artifacts.stdout`. Before these Cycle 019 artifacts were written, the focused paths showed only the current stage directory as untracked and no production-source diff for the Wave 019 source paths.
- Forbidden secret/config paths were not read. `.saivage/saivage.json`, auth profiles, env files, provider configs, OAuth/Drive credentials, and shell history were not accessed.

## Evidence inspected first

- Wave 019 plan entry was extracted to `.saivage/stages/cycle-019-fresh-scout-proposals/wave-019-entry.stdout` from `architecture-audit/wave-plan.md`.
- Wave 018 completion was read from `architecture-audit/cycle-018-domain-realization-context-boundary/implementation-log.md`. It marks Wave 018 complete and states that `CanvasWorldReadPort` and `ThreeWorldReadPort` now use explicit typed realization-context adapters rather than passing full `World` as the realization context.
- Wave 018 validation summary was read from `.saivage/stages/cycle-018-validation-and-preview-refresh/summary.json`. It recommends Cycle 019 as the next ordered wave and records green closure gates.
- The Cycle 018 plan-extension note was read from `architecture-audit/cycle-018-wave-plan-extension/plan-extension-note.md`. It explains why Wave 019 follows Wave 018: the 3D scene platform should consume stable typed realization/read outputs before later app-shell/backend/docs cleanup.
- Current source evidence and static scans were captured in `.saivage/stages/cycle-019-fresh-scout-proposals/source-three-scene-lifecycle-current.stdout` and `services-three-inventory.stdout`.

## Current source inventory for selected scope

### Vue shell responsibilities remain lifecycle/subscription oriented

`frontend/src/components/panels/ThreeView.vue` is no longer the old monolithic Three.js renderer, but it still owns component-to-runtime lifecycle and reactive subscriptions:

- It constructs the runtime directly: `const runtime = new ThreeViewRuntime();` (`frontend/src/components/panels/ThreeView.vue:44`).
- It delegates refresh to the runtime with read port, display options, and selected IDs (`frontend/src/components/panels/ThreeView.vue:48`).
- It delegates resize and mount (`frontend/src/components/panels/ThreeView.vue:50`, `frontend/src/components/panels/ThreeView.vue:54`).
- It owns the global resize listener (`frontend/src/components/panels/ThreeView.vue:56`).
- It subscribes to world changes and defines the unsubscribe closure (`frontend/src/components/panels/ThreeView.vue:59-60`).
- It creates watchers inside `onMounted` for render tick, selection, and display options (`frontend/src/components/panels/ThreeView.vue:62-64`).
- It removes the listener and disposes runtime on unmount (`frontend/src/components/panels/ThreeView.vue:69-70`).

This supports the Wave 019 premise: the shell should remain thin, but mount/unmount/watch/listener ownership is still an explicit boundary to document and test. The proposal should not move broad app-shell ownership into this wave.

### Runtime orchestration is hard-wired and not injectable/test-seamed

`frontend/src/rendering/threeView/ThreeViewRuntime.ts` currently owns a fixed composition of concrete collaborators:

- It instantiates `ThreeSceneHost` directly (`frontend/src/rendering/threeView/ThreeViewRuntime.ts:11`).
- It instantiates `ThreePresentationController` directly (`frontend/src/rendering/threeView/ThreeViewRuntime.ts:12`).
- It instantiates all active adapters directly: projection planes, planar elements, reconstructed elements, guides, and hinges (`frontend/src/rendering/threeView/ThreeViewRuntime.ts:13-17`).
- `refresh()` builds the presentation model and pushes adapter outputs into hard-coded registry group names (`frontend/src/rendering/threeView/ThreeViewRuntime.ts:21-27`).
- `dispose()` simply delegates to the host (`frontend/src/rendering/threeView/ThreeViewRuntime.ts:31`).

This is the central runtime seam for Cycle 019. Focused tests cannot replace the scene host/controller/adapters without real production collaborators, so the direct proposal should delete this implicit hard-wiring in favor of a small explicit composition boundary or constructor options.

### Scene host owns multiple platform resources in one class

`frontend/src/rendering/threeView/ThreeSceneHost.ts` concentrates low-level platform resources:

- Imports and owns Three.js, `OrbitControls`, `CSS2DRenderer`, and a registry (`frontend/src/rendering/threeView/ThreeSceneHost.ts:1-5`).
- Creates the scene and registry as public readonly fields (`frontend/src/rendering/threeView/ThreeSceneHost.ts:10-11`).
- Holds camera, WebGL renderer, CSS2D label renderer, controls, animation-frame id, and mount state (`frontend/src/rendering/threeView/ThreeSceneHost.ts:12-17`).
- On mount, configures scene background, camera aspect/defaults, camera up/lookAt, renderer, pixel ratio, CSS2D renderer styles, label DOM attachment, controls, lights, resize, and animation (`frontend/src/rendering/threeView/ThreeSceneHost.ts:20-52`).
- `resize()` updates camera aspect/projection and both WebGL/CSS2D renderer sizes (`frontend/src/rendering/threeView/ThreeSceneHost.ts:55-60`).
- `dispose()` cancels the animation frame if present, disposes the registry, controls, renderer, and removes the label renderer DOM element (`frontend/src/rendering/threeView/ThreeSceneHost.ts:62-67`).
- The animation loop is self-scheduling via `requestAnimationFrame`, updates controls, renders WebGL, and renders CSS2D labels (`frontend/src/rendering/threeView/ThreeSceneHost.ts:70-75`).

This confirms Wave 019 should focus on scene-host lifecycle/platform seams: animation ownership, renderer/CSS2D DOM ownership, controls lifecycle, lights/camera defaults, resize, and disposal.

### Registry disposal is active and already partially tested

`frontend/src/rendering/threeView/ThreeObjectRegistry.ts` owns scene group replacement and disposal:

- `replaceGroup()` disposes the old group, adds new objects to the scene, and stores the group (`frontend/src/rendering/threeView/ThreeObjectRegistry.ts:7-11`).
- `dispose()` disposes every group and clears the map (`frontend/src/rendering/threeView/ThreeObjectRegistry.ts:13-16`).
- `disposeGroup()` removes objects from the scene and calls `disposeObject()` (`frontend/src/rendering/threeView/ThreeObjectRegistry.ts:18-24`).
- `disposeObject()` traverses each object and disposes geometry/materials, including material arrays, and removes CSS2D object elements if present (`frontend/src/rendering/threeView/ThreeObjectRegistry.ts:28-36`).
- Existing focused coverage in `frontend/tests/unit/rendering/threeView/threeObjectRegistry.spec.ts` verifies grouped replacement, geometry/material disposal, and CSS2D label removal.

The registry is already a useful contract, but Cycle 019 should clarify whether adapter-created geometry/material/DOM ownership is exclusively transferred to this registry, then add any missing host/runtime coverage rather than replacing the registry wholesale.

### Scene adapters create owned Three.js objects from DTOs

Active scene adapters under `frontend/src/rendering/threeView/` create Three.js objects and assign `userData` from presentation DTOs:

- `ProjectionPlaneSceneAdapter.ts` creates line segments, plane surfaces, and delegates axes/labels to `AxisLabelSceneAdapter` (`frontend/src/rendering/threeView/ProjectionPlaneSceneAdapter.ts:5-28`).
- `PlanarElementSceneAdapter.ts` creates point spheres, circle tubes, and line/segment tubes with local material helper (`frontend/src/rendering/threeView/PlanarElementSceneAdapter.ts:5-27`).
- `ReconstructedElementSceneAdapter.ts` creates reconstructed points, planes, lines, and segment endpoint markers (`frontend/src/rendering/threeView/ReconstructedElementSceneAdapter.ts:5-35`).
- `GuideSceneAdapter.ts` creates guide planes and marker spheres (`frontend/src/rendering/threeView/GuideSceneAdapter.ts:5-23`).
- `HingeSceneAdapter.ts` creates dashed hinge lines and computes line distances (`frontend/src/rendering/threeView/HingeSceneAdapter.ts:5-13`).
- `AxisLabelSceneAdapter.ts` creates `ArrowHelper` axes and CSS2D labels, including DOM element creation (`frontend/src/rendering/threeView/AxisLabelSceneAdapter.ts:5-31`).

Static usage scan found `AxisLabelSceneAdapter` is active through `ProjectionPlaneSceneAdapter`, not dead. Therefore deletion of `AxisLabelSceneAdapter.ts` is not justified in this scout; it should be included in the adapter ownership contract unless implementation later proves a replacement makes it obsolete.

### Current read-port/domain-realization dependency no longer blocks Wave 019

`frontend/src/application/threePresentation/ThreeWorldReadPort.ts` now defines `createThreeRealizationContext(world)` (`frontend/src/application/threePresentation/ThreeWorldReadPort.ts:66`) and uses that typed context for 2D/3D realization calls (`frontend/src/application/threePresentation/ThreeWorldReadPort.ts:82`, `frontend/src/application/threePresentation/ThreeWorldReadPort.ts:101-103`, `frontend/src/application/threePresentation/ThreeWorldReadPort.ts:115`, `frontend/src/application/threePresentation/ThreeWorldReadPort.ts:134`). This aligns with Wave 018 completion and means Wave 019 does not need a wave-plan edit for residual full-`World`/`any` realization seams.

### Legacy service paths from the starting list are absent/out of scope

The starting points included `frontend/src/services/three/` and `frontend/src/services/`. Current inventory in `.saivage/stages/cycle-019-fresh-scout-proposals/services-three-inventory.stdout` shows `frontend/src/services/three` does not exist. Active services are `GeometryService.ts`, `GoogleDriveService.ts`, `InputService.ts`, `ProjectService.ts`, `SVGRenderer.ts`, and `services/factories/`. These are not part of the selected Wave 019 scene-host/runtime boundary and should remain out of scope.

## Selected bounded scope for Cycle 019 proposals

In scope for implementation proposals:

- `frontend/src/rendering/threeView/ThreeViewRuntime.ts`
- `frontend/src/rendering/threeView/ThreeSceneHost.ts`
- `frontend/src/rendering/threeView/ThreeObjectRegistry.ts`
- Active scene adapters under `frontend/src/rendering/threeView/` where their object ownership/disposal contract with the registry/host must be made explicit:
  - `ProjectionPlaneSceneAdapter.ts`
  - `PlanarElementSceneAdapter.ts`
  - `ReconstructedElementSceneAdapter.ts`
  - `GuideSceneAdapter.ts`
  - `HingeSceneAdapter.ts`
  - `AxisLabelSceneAdapter.ts`
- `frontend/src/components/panels/ThreeView.vue` only for thin shell mount/unmount/watch/listener composition if needed.
- Focused tests under `frontend/tests/unit/rendering/threeView/` and `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts`.
- Representative e2e/live 3D rendering checks during the later implementation/validation stage.

Out of scope:

- Domain realization contracts and read-port context design beyond verifying they do not block this wave.
- Canvas presentation selectors, overlay interaction redesign, 2D rendering selectors, command/undo, persistence, app-shell project lifecycle, backend stance, docs/spec reconciliation, validation-platform work, package/tooling churn, and broad UI redesign.
- `frontend/src/services/` cleanup; no active `frontend/src/services/three/` path exists.
- Any implementation source change during this scout/proposal stage.

## Premises and invalidated assumptions

Valid premises:

- Wave 018 completed, so Three presentation now consumes typed realization-context adapters instead of a raw full-`World` realization seam.
- `ThreeView.vue` is a thin shell compared with the baseline god component, so Cycle 019 should not recreate the old broad `ThreeView.vue` extraction objective. The center is the runtime/platform lifecycle boundary.
- The scene host still owns enough platform lifecycle concerns to justify a focused wave before later app-shell/backend/docs cleanup.
- `AxisLabelSceneAdapter.ts` is active through `ProjectionPlaneSceneAdapter`, so it is not an immediate delete candidate.

Invalidated/updated assumptions:

- Any premise that there is still a `frontend/src/services/three/` implementation to fold into this wave is invalid; the directory is absent.
- Any broad baseline premise that `ThreeView.vue` still owns low-level mesh/geometry creation is outdated. Mesh/geometry construction now lives in rendering adapters and scene host/platform modules.

Wave-plan edit required: none for this stage. The Wave 019 entry already states the correct current framing: runtime/platform lifecycle after Wave 018. The proposals align with it.

## DELETE list candidates for implementation proposals

- Delete implicit construction inside `ThreeViewRuntime` that prevents replacing the scene host, presentation controller, or adapters with focused test doubles.
- Delete any stale tests that mount `ThreeView.vue` only to assert low-level host/registry behavior, replacing them with runtime/host/registry tests. Current `threeViewShellBoundary.spec.ts` is shell-boundary coverage and should likely be updated rather than deleted.
- Delete renderer/label DOM ownership ambiguity by making CSS2D DOM attachment/removal and animation cancellation explicit and test-covered.
- Delete any duplicate or dead scene-host lifecycle helper discovered during implementation static scan. None is proven in this scout.
- Do not delete `AxisLabelSceneAdapter.ts` unless a future implementation replacement makes the active usage obsolete and tests prove no active import remains.
- Delete compatibility wrappers or broad "scene manager" facades if a proposal introduces them only to preserve the old all-in-one host shape.

## Validation requirements for the later implementation wave

Minimum validation cadence for implementation, with logs under `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/validation/`:

1. Pre-edit static scans for `ThreeView.vue` lifecycle/watch/listener responsibilities, `ThreeViewRuntime` hard-wired dependencies, `ThreeSceneHost` renderer/camera/controls/animation/disposal responsibilities, scene-adapter usage, and registry disposal behavior.
2. Focused Vitest for changed modules, expected command examples:
   - `npm run test --workspace=frontend -- tests/unit/rendering/threeView/threeObjectRegistry.spec.ts tests/unit/rendering/threeView/threeSceneAdapters.spec.ts`
   - Add/run new host/runtime lifecycle tests once introduced.
   - Run/update `tests/unit/components/panels/threeViewShellBoundary.spec.ts` if shell wiring changes.
3. Root and frontend lint: `npm run lint`; `npm run lint --workspace=frontend`.
4. Full root/frontend Vitest: `npm run test`; `npm run test --workspace=frontend`.
5. Root/frontend build: `npm run build`; `npm run build --workspace=frontend`.
6. Root/frontend Playwright e2e: `npm run test:e2e`; `npm run test:e2e --workspace=frontend` because 3D rendering/controls are user-observable.
7. Refresh live preview with `npm run dev --workspace=frontend -- --host 0.0.0.0`, capture HTTP 200 probe, and run focused live browser smoke for representative 3D view rendering and controls visibility/interaction.

## Stop conditions

Stop and request a reviewed plan edit or mini-cycle if any of the following becomes true during implementation:

- A residual domain realization/read-port `World`/`any` seam materially forces scene-host decisions.
- The fix requires broad app-shell ownership changes, command/undo changes, persistence/project lifecycle changes, package/tooling changes, backend work, docs/spec cleanup, or canvas presentation redesign.
- User-facing 3D interaction semantics must change beyond encoding the existing lifecycle/ownership contract.
- Registry disposal changes would require a deeper renderer-object lifetime redesign that cannot be safely bounded to the scene-host/runtime/adapter contract.

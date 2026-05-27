# Cycle 019 Scope Check — Three scene-host lifecycle and renderer platform boundary

## Stage and wave

- Stage: `cycle-019-fresh-scout-proposals-post-018`
- Wave: 019 — Three scene-host lifecycle and renderer platform boundary
- Stage nature: design/scout only. No production source, test, package, tooling, backend, docs/spec, persistence, command, canvas presentation, app-shell project lifecycle, or UI-feature implementation is performed here.

## Source-control reconciliation

Broad MCP `git_status` overflowed in this workspace, so this scout used path-scoped status/diff evidence captured under `.saivage/stages/cycle-019-fresh-scout-proposals-post-018/design-notes/`:

- `scoped-status.stdout`
- `scoped-diff.stdout`
- `scoped-diff-name-status.stdout`

Current scoped findings:

- The active Three rendering source paths inspected for this wave have no current path-scoped diff in this scout: `frontend/src/rendering/threeView/`, `frontend/src/components/panels/ThreeView.vue`, and `frontend/tests/e2e/current-ui-contract.spec.ts`.
- Pre-existing Cycle 019 audit/validation noise is present and out of scope for this design task: `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/implementation-log.md`, `validation/live-preview-server.stdout`, and several untracked validation status/diff logs.
- The known unrelated dirty production files remain out of scope and were not staged, reverted, incorporated, or relied on for proposed implementation:
  - `frontend/src/domain/calculations/Intersections.ts` — comment/reference cleanup only in scoped diff.
  - `frontend/src/domain/processTree/ActionGroup.ts` — ActionGroup contract alias/factory change in scoped diff.
- Secret/config paths were not read: no `.saivage/auth-profiles.json`, `.saivage/saivage.json`, env files, provider configs, tokens, Drive credentials, shell history, or keychain material.

## Wave-plan entry reread

`architecture-audit/wave-plan.md:1035-1114` defines Wave 019 as the Three runtime/platform boundary after Wave 018, scoped to:

- `ThreeViewRuntime.ts`, `ThreeSceneHost.ts`, `ThreeObjectRegistry.ts`, active `frontend/src/rendering/threeView/*SceneAdapter.ts`, `ThreeView.vue` only as a composition shell, and focused runtime/host/registry tests (`architecture-audit/wave-plan.md:1043-1054`).
- A guard against reopening domain realization, canvas presentation, app-shell project lifecycle, command/undo, persistence, backend, package/tooling, validation-platform, docs/spec, or broad UI redesign (`architecture-audit/wave-plan.md:1056-1060`).
- A target where Vue owns only component wiring; runtime owns presentation-model refresh to named renderer groups; scene host owns low-level renderer/camera/controls/animation resources behind testable ports; and registry/adapters have explicit object ownership/disposal contracts (`architecture-audit/wave-plan.md:1068-1070`).
- A delete discipline for implicit runtime hard-wiring, duplicate scene-host helpers/dead adapters, CSS2D/renderer/animation ownership ambiguity, stale Vue-mount tests for host details, compatibility wrappers, and broad scene-manager facades (`architecture-audit/wave-plan.md:1072-1079`).
- Mandatory validation with focused host/runtime/registry/adapter tests, full lint/test/build/e2e, live preview refresh, and browser evidence for representative 3D rendering/controls and overlay/canvas regression protection (`architecture-audit/wave-plan.md:1094-1102`).

Wave-plan edit status: **no reviewed plan edit is required before proposals**. Wave 018 closure states its realization/read-context boundary is complete and recommends Wave 019 as the next ordered wave; current source has typed Three presentation/read-context outputs and no evidence that renderer lifecycle must depend on full `World`/`any` realization seams. The current source does show that part of Wave 019's intended seam already exists; the proposals below therefore focus on whether to accept and harden the current direct shape or move one layer higher into a named platform composition module.

## Wave 018 and 3D interaction evidence

Wave 018 closure evidence from `architecture-audit/cycle-018-domain-realization-context-boundary/implementation-log.md` establishes that:

- `ProjectionElementRealizationContext` is narrowed to lookup/realization lookup and no longer carries broad collection traversal by default.
- `WorldRealizationContext.ts` is a tiny binder and does not expose a raw `getWorld()`/generic app-kernel/read-model facade.
- `ThreeRealizationContext` still receives collection providers from concern read ports instead of directly owning world traversal.
- No scene-host/OrbitControls/CSS/pointer behavior was changed during Wave 018.
- Root/frontend e2e closure passed including the 3D overlay pointer-boundary contract, and the refreshed live preview answered HTTP 200.

The Cycle 026 hotfix evidence in `architecture-audit/cycle-026-hotfix-3d-view-interaction-regression/implementation-log.md` remains a protected validation requirement. The root cause was app-shell overlay CSS `pointer-events: none`; the fix changed `.three-view-overlay` to `pointer-events: auto` and added e2e coverage proving overlay hit-testing and drag gestures do not pass through to the SVG canvas. Wave 019 must preserve this behavior and must not change scene-host/OrbitControls/CSS pointer behavior during this design-only stage.

## Current source inventory

Line-numbered current evidence for this scout is captured in `.saivage/stages/cycle-019-fresh-scout-proposals-post-018/design-notes/current-three-source-lines.stdout`.

### `ThreeView.vue` shell responsibilities

`frontend/src/components/panels/ThreeView.vue` is already a thin shell, but it still owns Vue/browser wiring:

- Imports `ThreeViewRuntime` and constructs a runtime (`frontend/src/components/panels/ThreeView.vue:32`, `:46`).
- Injects the Three presentation port and gets read ports (`frontend/src/components/panels/ThreeView.vue:41-45`).
- Builds runtime refresh input from read ports, display options, and selection (`frontend/src/components/panels/ThreeView.vue:49-52`).
- Mounts runtime and adds a global resize listener (`frontend/src/components/panels/ThreeView.vue:54-58`).
- Subscribes/unsubscribes world changes and creates watchers for render tick, selection, and display options (`frontend/src/components/panels/ThreeView.vue:60-66`, `:69-72`).
- Keeps controls/panel CSS local; `.three-controls` explicitly uses `pointer-events: auto` (`frontend/src/components/panels/ThreeView.vue:91-99`).

Scope decision: Vue shell wiring may be clarified or routed through a factory/composable only if it remains a shell. Do not move app-shell project lifecycle, stores, command/persistence, or canvas presentation into this wave.

### `ThreeViewRuntime` orchestration and current seams

`frontend/src/rendering/threeView/ThreeViewRuntime.ts` already has more explicit seams than the Wave 019 plan's older grounding text described:

- Runtime host, registry, controller, adapter, group, adapter collection, and options interfaces are present (`frontend/src/rendering/threeView/ThreeViewRuntime.ts:19-52`).
- The constructor accepts optional injected host/controller/adapters while defaulting to concrete production collaborators (`frontend/src/rendering/threeView/ThreeViewRuntime.ts:59-68`).
- `refresh()` builds a presentation model and replaces five named registry groups (`frontend/src/rendering/threeView/ThreeViewRuntime.ts:73-80`).
- `mount`, `resize`, and `dispose` delegate to the host (`frontend/src/rendering/threeView/ThreeViewRuntime.ts:71-83`).

Scope decision: the direct proposal should not pretend there is no injection seam. Remaining decisions are whether the default production composition should stay as constructor defaults or move to a single factory, whether group/adapters should remain explicit fields or be a typed registry, and whether tests/ownership comments are sufficient.

### `ThreeSceneHost` renderer/platform lifecycle

`frontend/src/rendering/threeView/ThreeSceneHost.ts` already has a testable platform port:

- Renderer, label renderer, controls, animation-frame, and pixel-ratio factories are represented by `ThreeSceneHostPlatform` (`frontend/src/rendering/threeView/ThreeSceneHost.ts:34-41`).
- Default platform creates WebGLRenderer, CSS2DRenderer, OrbitControls, and delegates to `window.requestAnimationFrame`, `window.cancelAnimationFrame`, and `window.devicePixelRatio` (`frontend/src/rendering/threeView/ThreeSceneHost.ts:47-55`).
- Host owns scene and registry (`frontend/src/rendering/threeView/ThreeSceneHost.ts:58-61`).
- `mount()` resets prior platform resources if mounted, configures scene background, camera, renderer, CSS2D label DOM, controls, lights, resize, and animation (`frontend/src/rendering/threeView/ThreeSceneHost.ts:73-104`).
- `resize()` owns camera aspect/projection and WebGL/CSS2D renderer sizing (`frontend/src/rendering/threeView/ThreeSceneHost.ts:107-114`).
- `dispose()` disposes registry and platform resources (`frontend/src/rendering/threeView/ThreeSceneHost.ts:117-134`).
- Animation is self-scheduling, updates controls, renders WebGL, and renders labels (`frontend/src/rendering/threeView/ThreeSceneHost.ts:137-143`).

Scope decision: implementation should not redesign OrbitControls behavior or CSS pointer handling. The host seam is sufficient for focused tests; residual work should be contract hardening or a small composition-module decision, not a renderer rewrite.

### `ThreeObjectRegistry` disposal behavior

`frontend/src/rendering/threeView/ThreeObjectRegistry.ts` is already the object lifetime owner:

- `replaceGroup()` disposes the previous group, adds new objects to the scene, and stores the replacement group (`frontend/src/rendering/threeView/ThreeObjectRegistry.ts:7-16`).
- `dispose()` disposes all known groups and clears the map (`frontend/src/rendering/threeView/ThreeObjectRegistry.ts:18-20`).
- `disposeGroup()` removes each object from the scene and calls `disposeObject()` (`frontend/src/rendering/threeView/ThreeObjectRegistry.ts:23-30`).
- `disposeObject()` traverses descendants, disposes geometry/material/material arrays, and removes CSS2D element DOM (`frontend/src/rendering/threeView/ThreeObjectRegistry.ts:33-42`).

Scope decision: preserve registry ownership. If tests reveal gaps, harden disposal idempotence and ownership comments; do not introduce parallel registries.

### Active scene adapters and material/geometry ownership

Active adapters create new Three.js objects from presentation DTOs and transfer them to the runtime/registry:

- `ProjectionPlaneSceneAdapter` creates grid `LineSegments`, plane surfaces, and delegates axes/labels to `AxisLabelSceneAdapter` (`frontend/src/rendering/threeView/ProjectionPlaneSceneAdapter.ts:5-35`).
- `PlanarElementSceneAdapter` creates planar point spheres, circle tubes, and line/segment tubes (`frontend/src/rendering/threeView/PlanarElementSceneAdapter.ts:4-27`).
- `ReconstructedElementSceneAdapter` creates reconstructed points, planes, lines, and segment endpoint markers (`frontend/src/rendering/threeView/ReconstructedElementSceneAdapter.ts:4-37`).
- `GuideSceneAdapter` creates guide planes and markers (`frontend/src/rendering/threeView/GuideSceneAdapter.ts:4-21`).
- `HingeSceneAdapter` creates dashed hinge lines and computes line distances (`frontend/src/rendering/threeView/HingeSceneAdapter.ts:4-14`).
- `AxisLabelSceneAdapter` creates `ArrowHelper` axes and CSS2D label objects with owned DOM elements (`frontend/src/rendering/threeView/AxisLabelSceneAdapter.ts:5-31`).

Static use: `AxisLabelSceneAdapter` is active through `ProjectionPlaneSceneAdapter` (`frontend/src/rendering/threeView/ProjectionPlaneSceneAdapter.ts:3`, `:6`, `:25-30`), so it is **not** currently a delete candidate.

### Current tests and coverage implications

Current test inventory already includes focused Wave 019-shaped tests:

- `frontend/tests/unit/rendering/threeView/threeViewRuntime.spec.ts` verifies injected host/controller/adapters, group replacement order, and mount/resize/dispose delegation.
- `frontend/tests/unit/rendering/threeView/threeSceneHost.spec.ts` verifies renderer/CSS2D DOM/controls/resize/animation lifecycle, disposal, and remount cleanup.
- `frontend/tests/unit/rendering/threeView/threeObjectRegistry.spec.ts` verifies grouped replacement, geometry/material disposal, CSS2D label removal, descendants, material arrays, and idempotent disposal.
- `frontend/tests/unit/rendering/threeView/threeSceneAdapters.spec.ts` verifies representative adapter object creation, but still uses broad `as any` DTO fixtures.
- `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts` verifies `ThreeView.vue` stays a shell and app overlay pointer events stay `auto`.
- `frontend/tests/e2e/current-ui-contract.spec.ts:89-117` protects the 3D overlay pointer-boundary regression: overlay visible, `pointer-events: auto`, `elementFromPoint` resolves under the overlay, and dragging the 3D overlay does not change the SVG `viewBox`.

Scope decision: current source may already satisfy much of Wave 019. Proposals should therefore be careful not to manufacture broad churn. Residual candidates are small: typed adapter fixtures, explicit production composition/factory ownership, and/or accepting current direct seams with validation.

## Selected bounded scope for proposals

In scope for reviewed Wave 019 implementation proposals:

- `frontend/src/rendering/threeView/ThreeViewRuntime.ts`
- `frontend/src/rendering/threeView/ThreeSceneHost.ts`
- `frontend/src/rendering/threeView/ThreeObjectRegistry.ts`
- Active scene adapters under `frontend/src/rendering/threeView/` only for ownership contract and typed test alignment:
  - `ProjectionPlaneSceneAdapter.ts`
  - `PlanarElementSceneAdapter.ts`
  - `ReconstructedElementSceneAdapter.ts`
  - `GuideSceneAdapter.ts`
  - `HingeSceneAdapter.ts`
  - `AxisLabelSceneAdapter.ts`
- `frontend/src/components/panels/ThreeView.vue` only if production runtime construction moves to an explicit factory/composition boundary or watcher cleanup remains shell-local.
- Focused tests under `frontend/tests/unit/rendering/threeView/` and `frontend/tests/unit/components/panels/threeViewShellBoundary.spec.ts`.
- `frontend/tests/e2e/current-ui-contract.spec.ts` only as protected validation evidence; no e2e rewrite in this design stage.

Out of scope:

- Domain realization/read-context contracts, Wave 018 context narrowing, canvas presentation selectors, SVG canvas presentation, app-shell project/session lifecycle, command/undo, persistence/project schema/replay, backend, Drive/auth, package/tooling, validation-platform, docs/spec, broad UI feature work, overlay CSS/OrbitControls behavior change, and unrelated dirty `Intersections.ts`/`ActionGroup.ts` work.

## Premise status

- **Valid:** Wave 019 remains the right next architectural topic if the project is replaying the plan from post-Wave-018 state: Three scene-host lifecycle is central and user-observable, and it depends on stable realization/read outputs from Wave 018.
- **Updated:** Current source already contains runtime injection, a scene-host platform port, registry disposal tests, and host/runtime focused tests. The proposal set must account for this and avoid duplicating work.
- **Not invalidated:** No evidence shows domain realization/read-context assumptions still force renderer decisions. No wave-plan edit is required merely to proceed to review of the proposals.
- **Potential manager decision point:** If the Manager determines that the current source and existing tests are already the result of an unclosed Wave 019 implementation, the next corrective stage should reconcile/validate/close the existing Cycle 019 work rather than dispatching new implementation. This design task does not edit production source to resolve that orchestration mismatch.

## DELETE candidates

Delete during implementation only if the selected reviewed proposal requires it:

- Default runtime composition hidden in `ThreeViewRuntime` if replaced by a single explicit production factory/composition module.
- Any compatibility wrapper that preserves both old implicit composition and new explicit composition as parallel production APIs.
- Broad `as any` adapter test fixtures where typed DTO fixtures can express the active adapter contract.
- Stale tests that mount `ThreeView.vue` to inspect host/registry internals now covered by runtime/host/registry unit tests.
- Duplicate/dead scene-host lifecycle helpers or dead adapter exports found by implementation static scan.

Do **not** delete `AxisLabelSceneAdapter.ts` in the current evidence state; it is active. Do not delete docs/spec/backend/package/tooling files in this wave.

## Validation requirements for later implementation/closure

All validation logs must be captured under `architecture-audit/cycle-019-three-scene-host-lifecycle-renderer-platform/validation/`:

1. Pre/post static scans for Vue lifecycle/watch/listener responsibilities, runtime composition/default wiring, host platform resources, registry disposal, active scene-adapter usage, test `as any` fixtures, and protected overlay pointer-boundary tests.
2. Focused Vitest for `threeViewRuntime`, `threeSceneHost`, `threeObjectRegistry`, `threeSceneAdapters`, and `threeViewShellBoundary`.
3. Root/frontend lint where defined.
4. Full root/frontend Vitest.
5. Root/frontend build.
6. Root/frontend Playwright e2e because 3D rendering/controls are user-observable, including `current-ui-contract.spec.ts` overlay pointer-boundary coverage.
7. Live preview refresh bound to `0.0.0.0:5173`, HTTP 200 reachability probe, and browser smoke proving representative 3D rendering/controls remain visible and the overlay still owns pointer interaction.

## Stop conditions

Stop and request a reviewed plan edit or mini-cycle if implementation requires:

- Reopening Wave 018 domain realization/read-context contracts or introducing raw `World`/`any` realization seams.
- Moving app-shell project lifecycle, stores, command/undo, persistence/project-service, backend, Drive/auth, package/tooling, validation-platform, docs/spec, or canvas presentation into the wave.
- Changing user-visible OrbitControls behavior, overlay CSS/pointer semantics, 3D option semantics, or canvas interaction behavior rather than preserving current behavior.
- Replacing the registry ownership model with parallel object lifetime paths.
- Touching the unrelated dirty `frontend/src/domain/calculations/Intersections.ts` or `frontend/src/domain/processTree/ActionGroup.ts` for compile/test success.
